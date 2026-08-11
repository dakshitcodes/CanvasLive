import admin from 'firebase-admin';
import { createUserPayload } from '../models/user.model.js';
import {
  getUsersCollection,
  isFirestoreConnected,
} from './firestore.placeholder.js';

// In-memory store (fallback when Firestore is not connected)
const users = new Map();

/**
 * User Service - Handles user profile operations
 * Automatically uses Firestore when available, falls back to in-memory store
 */
export const userService = {
  /**
   * Create or update user from Firebase authentication token
   * Called after successful authentication
   */
  async upsertFromAuth(decodedToken) {
    const now = new Date().toISOString();
    const payload = createUserPayload({
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || decodedToken.displayName,
      photoURL: decodedToken.picture || decodedToken.photoURL,
      createdAt: now,
    });

    if (isFirestoreConnected()) {
      try {
        const userRef = getUsersCollection().doc(payload.uid);
        const snapshot = await userRef.get();
        const existing = snapshot.exists ? snapshot.data() : null;
        const data = {
          ...existing,
          ...payload,
          createdAt: existing?.createdAt || payload.createdAt,
          updatedAt: now,
        };
        await userRef.set(data, { merge: true });
        return data;
      } catch (error) {
        // Silently fall back to in-memory store on Firestore error
        console.warn('Firestore upsertFromAuth failed, using in-memory fallback:', error.message);
        // Continue with in-memory fallback below
      }
    }

    // Fallback: In-memory store
    const existing = users.get(payload.uid);
    const data = {
      ...existing,
      ...payload,
      createdAt: existing?.createdAt || payload.createdAt,
      updatedAt: now,
    };
    users.set(payload.uid, data);
    return data;
  },

  /**
   * Get user profile by UID
   */
  async getProfile(uid) {
    if (isFirestoreConnected()) {
      try {
        const snapshot = await getUsersCollection().doc(uid).get();
        return snapshot.exists ? snapshot.data() : null;
      } catch (error) {
        console.error('Firestore getProfile error:', error);
        return null;
      }
    }

    // Fallback: In-memory store
    return users.get(uid) || null;
  },

  /**
   * Update user profile
   */
  async updateProfile(uid, updates) {
    if (!updates || Object.keys(updates).length === 0) {
      return this.getProfile(uid);
    }

    const now = new Date().toISOString();

    if (isFirestoreConnected()) {
      try {
        const userRef = getUsersCollection().doc(uid);
        const snapshot = await userRef.get();
        if (!snapshot.exists) return null;

        const data = {
          ...snapshot.data(),
          ...updates,
          updatedAt: now,
        };
        await userRef.set(data, { merge: true });
        return data;
      } catch (error) {
        console.error('Firestore updateProfile error:', error);
        throw new Error('Failed to update user profile');
      }
    }

    // Fallback: In-memory store
    const user = users.get(uid);
    if (!user) return null;

    const updated = {
      ...user,
      ...updates,
      updatedAt: now,
    };
    users.set(uid, updated);
    return updated;
  },

  /**
   * Get multiple user profiles by UIDs
   */
  async getProfiles(uids) {
    if (!uids || uids.length === 0) return [];

    if (isFirestoreConnected()) {
      try {
        const usersCollection = getUsersCollection();
        // Firestore 'in' query has a limit of 10 items
        const chunks = [];
        for (let i = 0; i < uids.length; i += 10) {
          chunks.push(uids.slice(i, i + 10));
        }

        const results = {};
        await Promise.all(
          chunks.map((chunk) =>
            usersCollection
              .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
              .get()
              .then((snapshot) => {
                snapshot.forEach((doc) => {
                  results[doc.id] = doc.data();
                });
              }),
          ),
        );

        return Object.values(results);
      } catch (error) {
        console.error('Firestore getProfiles error:', error);
        return [];
      }
    }

    // Fallback: In-memory store
    return uids
      .map((uid) => users.get(uid))
      .filter((user) => user !== undefined);
  },
};

export default userService;
