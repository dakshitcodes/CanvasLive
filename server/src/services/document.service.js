import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, canPerform } from '../constants/roles.js';
import { createDocumentPayload, createVersionSnapshot } from '../models/document.model.js';
import {
  COLLECTIONS,
  getDocumentsCollection,
  getDocumentRef,
  getFirestoreDb,
  getVersionsCollection,
  isFirestoreConnected,
} from './firestore.placeholder.js';

// In-memory store (fallback when Firestore is not connected)
const documents = new Map();
const versionHistory = new Map();

function getVersions(docId) {
  if (!versionHistory.has(docId)) {
    versionHistory.set(docId, []);
  }
  return versionHistory.get(docId);
}

function prepareDocumentResponse(doc, userId) {
  return {
    ...doc,
    role:
      doc.ownerId === userId
        ? ROLES.OWNER
        : doc.collaborators?.find((c) => c.userId === userId)?.role || ROLES.VIEWER,
  };
}

async function fetchDocumentSnapshot(docId) {
  const docRef = getDocumentRef(docId);
  return docRef.get();
}

/**
 * Document Service - Handles all document operations
 * Automatically uses Firestore when available, falls back to in-memory store
 */
export const documentService = {
  /**
   * List all documents for a user (as owner or collaborator)
   * Fetches documents sorted by most recently updated, with optional search
   */
  async listByUser(userId, { search = '', limit = 50 } = {}) {
    const query = search.toLowerCase().trim();
    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);

    if (isFirestoreConnected()) {
      try {
        const documentsById = new Map();
        const docsCollection = getDocumentsCollection();

        // Fetch documents where user is owner or collaborator
        // Use orderBy with limit for efficiency at database level
        const [ownerSnapshot, memberSnapshot] = await Promise.all([
          docsCollection
            .where('ownerId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .limit(limitNum)
            .get(),
          docsCollection
            .where('memberIds', 'array-contains', userId)
            .orderBy('updatedAt', 'desc')
            .limit(limitNum)
            .get(),
        ]);

        // Combine results (avoid duplicates)
        ownerSnapshot.forEach((docSnap) => {
          documentsById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
        memberSnapshot.forEach((docSnap) => {
          documentsById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });

        // Filter by search, sort by date, apply limit
        const items = Array.from(documentsById.values())
          .filter((doc) => !query || doc.title.toLowerCase().includes(query))
          .sort((a, b) => {
            const dateA = a.updatedAt instanceof admin.firestore.Timestamp
              ? a.updatedAt.toDate()
              : new Date(a.updatedAt);
            const dateB = b.updatedAt instanceof admin.firestore.Timestamp
              ? b.updatedAt.toDate()
              : new Date(b.updatedAt);
            return dateB - dateA;
          })
          .slice(0, limitNum)
          .map((doc) => prepareDocumentResponse(doc, userId));

        return items;
      } catch (error) {
        // Silently fall back to in-memory store on Firestore error
        console.warn('Firestore listByUser failed, using in-memory fallback:', error.message);
        // Continue with in-memory fallback below
      }
    }

    // Fallback: In-memory store
    const items = Array.from(documents.values())
      .filter(
        (doc) =>
          doc.ownerId === userId ||
          doc.collaborators.some((c) => c.userId === userId),
      )
      .filter((doc) => !query || doc.title.toLowerCase().includes(query))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, limitNum)
      .map((doc) => prepareDocumentResponse(doc, userId));

    return items;
  },

  /**
   * Get a single document by ID with access control
   */
  async getById(docId, userId) {
    if (isFirestoreConnected()) {
      try {
        const snapshot = await fetchDocumentSnapshot(docId);
        if (!snapshot.exists) throw ApiError.notFound('Document not found');
        const doc = { id: snapshot.id, ...snapshot.data() };
        const role = this.resolveRole(doc, userId);
        if (!role) throw ApiError.forbidden('You do not have access to this document');
        return { ...doc, role };
      } catch (error) {
        if (error.code === 'ERR_NOT_FOUND' || error.code === 'ERR_FORBIDDEN') throw error;
        // Silently fall back to in-memory store on Firestore error
        console.warn('Firestore getById failed, using in-memory fallback:', error.message);
        // Continue with in-memory fallback below
      }
    }

    // Fallback: In-memory store
    const doc = documents.get(docId);
    if (!doc) throw ApiError.notFound('Document not found');
    const role = this.resolveRole(doc, userId);
    if (!role) throw ApiError.forbidden('You do not have access to this document');
    return { ...doc, role };
  },

  /**
   * Determine user's role for a document
   */
  resolveRole(doc, userId) {
    if (doc.ownerId === userId) return ROLES.OWNER;
    const collab = doc.collaborators?.find((c) => c.userId === userId);
    return collab?.role || null;
  },

  /**
   * Create a new document
   */
  async create(userId, { title } = {}) {
    const id = uuidv4();
    const doc = createDocumentPayload({
      id,
      title: title || 'Untitled Document',
      ownerId: userId,
      role: ROLES.OWNER,
    });

    if (isFirestoreConnected()) {
      try {
        const docRef = getDocumentRef(id);
        await docRef.set(doc);
        
        // Create initial version snapshot
        const version = createVersionSnapshot(doc, userId);
        await getVersionsCollection(id).doc(version.id).set(version);
        
        return { ...doc, role: ROLES.OWNER };
      } catch (error) {
        // Silently fall back to in-memory store on Firestore error
        console.warn('Firestore create failed, using in-memory fallback:', error.message);
        // Continue with in-memory fallback below
      }
    }

    // Fallback: In-memory store
    documents.set(id, doc);
    getVersions(id).push(createVersionSnapshot(doc, userId));
    return { ...doc, role: ROLES.OWNER };
  },

  /**
   * Update document (title and/or content)
   */
  async update(docId, userId, updates) {
    if (!updates || Object.keys(updates).length === 0) {
      throw ApiError.badRequest('No updates provided');
    }

    const now = new Date().toISOString();

    if (isFirestoreConnected()) {
      try {
        const snapshot = await fetchDocumentSnapshot(docId);
        if (!snapshot.exists) throw ApiError.notFound('Document not found');
        
        const doc = { id: snapshot.id, ...snapshot.data() };
        const role = this.resolveRole(doc, userId);
        
        // Check write permission
        if (!canPerform(role, 'write')) {
          throw ApiError.forbidden('You do not have permission to edit this document');
        }

        const changes = {};

        // Handle title update
        if (updates.title !== undefined) {
          if (typeof updates.title !== 'string' || updates.title.trim().length === 0) {
            throw ApiError.badRequest('Title must be a non-empty string');
          }
          changes.title = updates.title.trim();
        }

        // Handle content update (create version snapshot)
        let versionSnapshot = null;
        if (updates.content !== undefined) {
          changes.content = updates.content;
          changes.version = (doc.version || 0) + 1;
          versionSnapshot = createVersionSnapshot({ ...doc, ...changes }, userId);
        }

        changes.updatedAt = now;
        changes.lastEditedBy = userId;

        // Update document
        await getDocumentRef(docId).update(changes);

        // Create version snapshot if content changed
        if (versionSnapshot) {
          await getVersionsCollection(docId).doc(versionSnapshot.id).set(versionSnapshot);
        }

        return { ...doc, ...changes, role };
      } catch (error) {
        if (error.code?.startsWith('ERR_')) throw error;
        // Silently fall back to in-memory store on Firestore error
        console.warn('Firestore update failed, using in-memory fallback:', error.message);
        // Continue with in-memory fallback below
      }
    }

    // Fallback: In-memory store
    const doc = documents.get(docId);
    if (!doc) throw ApiError.notFound('Document not found');
    
    const role = this.resolveRole(doc, userId);
    if (!canPerform(role, 'write')) {
      throw ApiError.forbidden('You do not have permission to edit this document');
    }

    if (updates.title !== undefined) {
      if (typeof updates.title !== 'string' || updates.title.trim().length === 0) {
        throw ApiError.badRequest('Title must be a non-empty string');
      }
      doc.title = updates.title.trim();
    }

    if (updates.content !== undefined) {
      doc.content = updates.content;
      doc.version += 1;
      getVersions(docId).push(createVersionSnapshot(doc, userId));
    }

    doc.updatedAt = now;
    doc.lastEditedBy = userId;
    documents.set(docId, doc);
    return { ...doc, role };
  },

  /**
   * Rename document (convenience method)
   */
  async rename(docId, userId, title) {
    return this.update(docId, userId, { title });
  },

  /**
   * Delete document and all associated version history
   */
  async delete(docId, userId) {
    if (isFirestoreConnected()) {
      try {
        const snapshot = await fetchDocumentSnapshot(docId);
        if (!snapshot.exists) throw ApiError.notFound('Document not found');
        
        const doc = { id: snapshot.id, ...snapshot.data() };
        const role = this.resolveRole(doc, userId);
        
        // Only owner can delete
        if (!canPerform(role, 'delete')) {
          throw ApiError.forbidden('Only the owner can delete this document');
        }

        // Use batch to atomically delete document and all versions
        const db = getFirestoreDb();
        const batch = db.batch();

        // Delete all version snapshots
        const versionsSnapshot = await getVersionsCollection(docId).get();
        versionsSnapshot.forEach((versionDoc) => batch.delete(versionDoc.ref));

        // Delete the document itself
        batch.delete(getDocumentRef(docId));

        await batch.commit();

        return { id: docId, deleted: true };
      } catch (error) {
        if (error.code?.startsWith('ERR_')) throw error;
        // Silently fall back to in-memory store on Firestore error
        console.warn('Firestore delete failed, using in-memory fallback:', error.message);
        // Continue with in-memory fallback below
      }
    }

    // Fallback: In-memory store
    const doc = documents.get(docId);
    if (!doc) throw ApiError.notFound('Document not found');
    
    const role = this.resolveRole(doc, userId);
    if (!canPerform(role, 'delete')) {
      throw ApiError.forbidden('Only the owner can delete this document');
    }

    documents.delete(docId);
    versionHistory.delete(docId);
    return { id: docId, deleted: true };
  },

  /**
   * Get version history for a document
   */
  async getVersions(docId, userId) {
    // Verify user has access to document
    await this.getById(docId, userId);

    if (isFirestoreConnected()) {
      try {
        const snapshot = await getVersionsCollection(docId)
          .orderBy('createdAt', 'desc')
          .get();
        return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      } catch (error) {
        console.error('Firestore getVersions error:', error);
        throw ApiError.internal('Failed to fetch version history');
      }
    }

    // Fallback: In-memory store
    return getVersions(docId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Restore document from a specific version
   */
  async restoreVersion(docId, userId, versionId) {
    const doc = await this.getById(docId, userId);
    const role = doc.role;

    // Only editors and owners can restore versions
    if (!canPerform(role, 'write')) {
      throw ApiError.forbidden('You do not have permission to restore versions');
    }

    if (isFirestoreConnected()) {
      try {
        const versionSnapshot = await getVersionsCollection(docId).doc(versionId).get();
        if (!versionSnapshot.exists) throw ApiError.notFound('Version not found');
        
        const version = { id: versionSnapshot.id, ...versionSnapshot.data() };
        
        // Restore by creating a new version with the old content
        return this.update(docId, userId, {
          content: version.content,
          title: version.title,
        });
      } catch (error) {
        if (error.code?.startsWith('ERR_')) throw error;
        console.error('Firestore restoreVersion error:', error);
        throw ApiError.internal('Failed to restore version');
      }
    }

    // Fallback: In-memory store
    const versions = getVersions(docId);
    const snapshot = versions.find((v) => v.id === versionId);
    if (!snapshot) throw ApiError.notFound('Version not found');

    return this.update(docId, userId, {
      content: snapshot.content,
      title: snapshot.title,
    });
  },

  /**
   * Get raw document (used by socket layer for live sync)
   * Used for real-time collaborative editing
   */
  async getRaw(docId) {
    if (isFirestoreConnected()) {
      try {
        const snapshot = await fetchDocumentSnapshot(docId);
        return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
      } catch (error) {
        console.error('Firestore getRaw error:', error);
        return null;
      }
    }

    // Fallback: In-memory store
    return documents.get(docId) || null;
  },

  /**
   * Apply content changes (used for live sync updates)
   */
  async applyContent(docId, userId, content) {
    const now = new Date().toISOString();

    if (isFirestoreConnected()) {
      try {
        const snapshot = await fetchDocumentSnapshot(docId);
        if (!snapshot.exists) return null;

        const doc = { id: snapshot.id, ...snapshot.data() };
        const role = this.resolveRole(doc, userId);

        // Check write permission
        if (!canPerform(role, 'write')) return null;

        const updates = {
          content,
          updatedAt: now,
          lastEditedBy: userId,
        };

        await getDocumentRef(docId).update(updates);
        return { ...doc, ...updates };
      } catch (error) {
        console.error('Firestore applyContent error:', error);
        return null;
      }
    }

    // Fallback: In-memory store
    const doc = documents.get(docId);
    if (!doc) return null;

    const role = this.resolveRole(doc, userId);
    if (!canPerform(role, 'write')) return null;

    doc.content = content;
    doc.updatedAt = now;
    doc.lastEditedBy = userId;
    documents.set(docId, doc);
    return doc;
  },

  /**
   * Add a collaborator to a document
   */
  async addCollaborator(docId, userId, collaborator) {
    if (!collaborator || !collaborator.userId || !collaborator.email || !collaborator.role) {
      throw ApiError.badRequest('Collaborator must have userId, email, and role');
    }

    if (![ROLES.EDITOR, ROLES.VIEWER].includes(collaborator.role)) {
      throw ApiError.badRequest(`Role must be ${ROLES.EDITOR} or ${ROLES.VIEWER}`);
    }

    if (isFirestoreConnected()) {
      try {
        const snapshot = await fetchDocumentSnapshot(docId);
        if (!snapshot.exists) throw ApiError.notFound('Document not found');

        const doc = { id: snapshot.id, ...snapshot.data() };
        const role = this.resolveRole(doc, userId);

        // Only owner can add collaborators
        if (role !== ROLES.OWNER) {
          throw ApiError.forbidden('Only the owner can add collaborators');
        }

        // Prevent adding owner as collaborator
        if (collaborator.userId === doc.ownerId) {
          throw ApiError.badRequest('Cannot add owner as collaborator');
        }

        // Check if already a collaborator
        if (doc.memberIds?.includes(collaborator.userId)) {
          throw ApiError.badRequest('User is already a collaborator');
        }

        const now = new Date().toISOString();
        const updates = {
          collaborators: admin.firestore.FieldValue.arrayUnion({
            userId: collaborator.userId,
            email: collaborator.email,
            role: collaborator.role,
            joinedAt: now,
          }),
          memberIds: admin.firestore.FieldValue.arrayUnion(collaborator.userId),
          updatedAt: now,
        };

        await getDocumentRef(docId).update(updates);

        return {
          ...doc,
          collaborators: [
            ...(doc.collaborators || []),
            {
              userId: collaborator.userId,
              email: collaborator.email,
              role: collaborator.role,
              joinedAt: now,
            },
          ],
          memberIds: [...(doc.memberIds || []), collaborator.userId],
        };
      } catch (error) {
        if (error.code?.startsWith('ERR_')) throw error;
        console.error('Firestore addCollaborator error:', error);
        throw ApiError.internal('Failed to add collaborator');
      }
    }

    // Fallback: In-memory store
    const doc = documents.get(docId);
    if (!doc) throw ApiError.notFound('Document not found');

    const role = this.resolveRole(doc, userId);
    if (role !== ROLES.OWNER) {
      throw ApiError.forbidden('Only the owner can add collaborators');
    }

    if (collaborator.userId === doc.ownerId) {
      throw ApiError.badRequest('Cannot add owner as collaborator');
    }

    if (doc.memberIds?.includes(collaborator.userId)) {
      throw ApiError.badRequest('User is already a collaborator');
    }

    const now = new Date().toISOString();
    doc.collaborators.push({
      userId: collaborator.userId,
      email: collaborator.email,
      role: collaborator.role,
      joinedAt: now,
    });
    if (!doc.memberIds) doc.memberIds = [];
    doc.memberIds.push(collaborator.userId);
    doc.updatedAt = now;

    documents.set(docId, doc);
    return doc;
  },

  /**
   * Remove a collaborator from a document
   */
  async removeCollaborator(docId, userId, collaboratorId) {
    if (!collaboratorId) {
      throw ApiError.badRequest('Collaborator ID is required');
    }

    if (isFirestoreConnected()) {
      try {
        const snapshot = await fetchDocumentSnapshot(docId);
        if (!snapshot.exists) throw ApiError.notFound('Document not found');

        const doc = { id: snapshot.id, ...snapshot.data() };
        const role = this.resolveRole(doc, userId);

        // Only owner can remove collaborators
        if (role !== ROLES.OWNER) {
          throw ApiError.forbidden('Only the owner can remove collaborators');
        }

        // Verify collaborator exists
        if (!doc.memberIds?.includes(collaboratorId)) {
          throw ApiError.notFound('Collaborator not found');
        }

        const now = new Date().toISOString();
        const updatedCollaborators = (doc.collaborators || []).filter(
          (c) => c.userId !== collaboratorId,
        );

        const updates = {
          collaborators: updatedCollaborators,
          memberIds: admin.firestore.FieldValue.arrayRemove(collaboratorId),
          updatedAt: now,
        };

        await getDocumentRef(docId).update(updates);

        return {
          ...doc,
          collaborators: updatedCollaborators,
          memberIds: (doc.memberIds || []).filter((id) => id !== collaboratorId),
        };
      } catch (error) {
        if (error.code?.startsWith('ERR_')) throw error;
        console.error('Firestore removeCollaborator error:', error);
        throw ApiError.internal('Failed to remove collaborator');
      }
    }

    // Fallback: In-memory store
    const doc = documents.get(docId);
    if (!doc) throw ApiError.notFound('Document not found');

    const role = this.resolveRole(doc, userId);
    if (role !== ROLES.OWNER) {
      throw ApiError.forbidden('Only the owner can remove collaborators');
    }

    if (!doc.memberIds?.includes(collaboratorId)) {
      throw ApiError.notFound('Collaborator not found');
    }

    doc.collaborators = doc.collaborators.filter((c) => c.userId !== collaboratorId);
    doc.memberIds = doc.memberIds.filter((id) => id !== collaboratorId);
    doc.updatedAt = new Date().toISOString();

    documents.set(docId, doc);
    return doc;
  },
};

export default documentService;
