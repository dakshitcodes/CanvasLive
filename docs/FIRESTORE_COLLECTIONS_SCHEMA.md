# Firestore Collections Schema Reference

## Overview

This document provides detailed schema definitions for all Firestore collections used in the collaborative document editor.

---

## 1. Collection: `users`

Stores user profiles and metadata.

### Path
```
users/{uid}
```

### Document Structure
```typescript
interface User {
  uid: string;                    // User ID (Firebase Auth UID)
  email: string;                  // Email address
  displayName: string;            // Display name
  photoURL: string | null;        // Profile picture URL
  createdAt: Timestamp;           // Account creation time
  updatedAt: Timestamp;           // Last profile update
}
```

### Example Document
```json
{
  "uid": "user-123",
  "email": "alice@example.com",
  "displayName": "Alice Johnson",
  "photoURL": "https://example.com/photo.jpg",
  "createdAt": "2024-08-11T10:30:00Z",
  "updatedAt": "2024-08-11T15:45:00Z"
}
```

### Indexes
- None required (document ID is the UID)

### Security Rules
- Users can read/write only their own document
- Backend service account can verify users

### Usage Examples
```javascript
// Get user profile
const userDoc = await db.collection('users').doc(uid).get();
const user = userDoc.data();

// Create/Update user (from Firebase Auth)
await db.collection('users').doc(uid).set({
  uid,
  email,
  displayName,
  photoURL,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });
```

---

## 2. Collection: `documents`

Stores document metadata and content.

### Path
```
documents/{docId}
```

### Document Structure
```typescript
interface Document {
  id: string;                     // Document ID (unique)
  title: string;                  // Document title
  content: string;                // Document content (TipTap JSON)
  ownerId: string;                // Owner's user ID
  collaborators: Collaborator[];  // List of collaborators
  memberIds: string[];            // Array of all user IDs (owner + collaborators)
  role: 'owner' | 'editor' | 'viewer';  // Current user's role
  isArchived: boolean;            // Archive status
  version: number;                // Current version number
  lastEditedBy: string;           // UID of last editor
  createdAt: Timestamp;           // Creation time
  updatedAt: Timestamp;           // Last modification time
}

interface Collaborator {
  userId: string;                 // Collaborator's user ID
  email: string;                  // Collaborator's email
  role: 'editor' | 'viewer';      // Collaborator's role
  joinedAt: Timestamp;            // When they were added
}
```

### Example Document
```json
{
  "id": "doc-123",
  "title": "Project Proposal",
  "content": "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Project details...\"}]}]}",
  "ownerId": "user-123",
  "collaborators": [
    {
      "userId": "user-456",
      "email": "bob@example.com",
      "role": "editor",
      "joinedAt": "2024-08-11T12:00:00Z"
    },
    {
      "userId": "user-789",
      "email": "charlie@example.com",
      "role": "viewer",
      "joinedAt": "2024-08-11T13:00:00Z"
    }
  ],
  "memberIds": ["user-123", "user-456", "user-789"],
  "role": "owner",
  "isArchived": false,
  "version": 5,
  "lastEditedBy": "user-456",
  "createdAt": "2024-08-10T10:00:00Z",
  "updatedAt": "2024-08-11T16:30:00Z"
}
```

### Indexes
Required composite indexes:

| Fields | Order |
|--------|-------|
| `ownerId`, `updatedAt` | Asc, Desc |
| `memberIds` (Contains), `updatedAt` | Asc, Desc |
| `ownerId`, `isArchived`, `updatedAt` | Asc, Asc, Desc |

### Security Rules
- **Create**: Only authenticated users who are setting themselves as owner
- **Read**: Allowed for document owner and collaborators (in memberIds)
- **Update**: Allowed for document owner and editors
- **Delete**: Allowed for document owner only

### Usage Examples
```javascript
// Get document
const docRef = await db.collection('documents').doc(docId).get();
const doc = docRef.data();

// List user's documents (as owner)
const ownerDocs = await db
  .collection('documents')
  .where('ownerId', '==', userId)
  .orderBy('updatedAt', 'desc')
  .limit(50)
  .get();

// List documents where user is a collaborator
const memberDocs = await db
  .collection('documents')
  .where('memberIds', 'array-contains', userId)
  .orderBy('updatedAt', 'desc')
  .get();

// Add collaborator
await db.collection('documents').doc(docId).update({
  collaborators: admin.firestore.FieldValue.arrayUnion({
    userId: newUserId,
    email: newUserEmail,
    role: 'editor',
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
  }),
  memberIds: admin.firestore.FieldValue.arrayUnion(newUserId),
});

// Update document content
await db.collection('documents').doc(docId).update({
  content: newContent,
  version: admin.firestore.FieldValue.increment(1),
  lastEditedBy: userId,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

---

## 3. Subcollection: `documents/{docId}/versions`

Stores version history for each document (immutable audit trail).

### Path
```
documents/{docId}/versions/{versionId}
```

### Document Structure
```typescript
interface DocumentVersion {
  id: string;                     // Version ID (v-{version}-{timestamp})
  documentId: string;             // Parent document ID
  version: number;                // Version number
  title: string;                  // Document title at this version
  content: string;                // Document content at this version (TipTap JSON)
  editedBy: string;               // User ID who created this version
  createdAt: Timestamp;           // When this version was created
}
```

### Example Document
```json
{
  "id": "v-5-1691750400000",
  "documentId": "doc-123",
  "version": 5,
  "title": "Project Proposal",
  "content": "{\"type\":\"doc\",\"content\":[...]}",
  "editedBy": "user-456",
  "createdAt": "2024-08-11T16:30:00Z"
}
```

### Indexes
- None required (subcollection of documents)

### Security Rules
- **Create**: Allowed for document owner and editors
- **Read**: Allowed for all collaborators (document access inherited from parent)
- **Update**: Not allowed (immutable)
- **Delete**: Allowed for document owner only

### Usage Examples
```javascript
// Get version history
const versionsRef = db.collection('documents').doc(docId).collection('versions');
const versionDocs = await versionsRef
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get();

const versions = versionDocs.docs.map(doc => doc.data());

// Get specific version
const versionDoc = await versionsRef.doc(versionId).get();
const version = versionDoc.data();

// Create new version (after document update)
await db.collection('documents').doc(docId).collection('versions').add({
  id: `v-${newVersion}-${Date.now()}`,
  documentId: docId,
  version: newVersion,
  title: doc.title,
  content: doc.content,
  editedBy: userId,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});

// Restore from version
const versionSnapshot = await versionsRef.doc(versionId).get();
const { title, content } = versionSnapshot.data();
await db.collection('documents').doc(docId).update({
  title,
  content,
  version: admin.firestore.FieldValue.increment(1),
  lastEditedBy: userId,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

---

## Collection Relationships

```
┌─────────────────────────────────────────────────────┐
│ users/{uid}                                         │
│ ├─ uid (Primary Key)                               │
│ └─ email, displayName, photoURL, timestamps        │
└──────────────┬──────────────────────────────────────┘
               │ owns/collaborates
               │
┌──────────────▼──────────────────────────────────────┐
│ documents/{docId}                                   │
│ ├─ ownerId → users/{uid}                           │
│ ├─ collaborators[].userId → users/{uid}            │
│ ├─ memberIds[] → users/{uid}                       │
│ └─ lastEditedBy → users/{uid}                      │
│                                                     │
│    └─ documents/{docId}/versions/{versionId}      │
│       ├─ editedBy → users/{uid}                   │
│       └─ content (immutable snapshot)             │
└─────────────────────────────────────────────────────┘
```

---

## Query Patterns

### 1. List all documents for a user
```javascript
// As owner
const ownerDocs = await db
  .collection('documents')
  .where('ownerId', '==', userId)
  .orderBy('updatedAt', 'desc')
  .get();

// As collaborator
const memberDocs = await db
  .collection('documents')
  .where('memberIds', 'array-contains', userId)
  .orderBy('updatedAt', 'desc')
  .get();

// Both (owner + collaborator)
const allDocs = await Promise.all([
  db.collection('documents').where('ownerId', '==', userId).orderBy('updatedAt', 'desc').get(),
  db.collection('documents').where('memberIds', 'array-contains', userId).orderBy('updatedAt', 'desc').get(),
]);
```

### 2. Get document with full access check
```javascript
const docRef = db.collection('documents').doc(docId);
const docSnapshot = await docRef.get();
const doc = docSnapshot.data();

const isOwner = doc.ownerId === userId;
const isCollaborator = doc.memberIds.includes(userId);

if (!isOwner && !isCollaborator) {
  throw new Error('Access denied');
}
```

### 3. Get version history with pagination
```javascript
const versionsRef = db.collection('documents').doc(docId).collection('versions');

let query = versionsRef.orderBy('createdAt', 'desc').limit(20);

// First page
let snapshot = await query.get();
let versions = snapshot.docs.map(d => d.data());

// Next page
if (snapshot.docs.length === 20) {
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  query = versionsRef
    .orderBy('createdAt', 'desc')
    .startAfter(lastDoc)
    .limit(20);
  snapshot = await query.get();
  versions = snapshot.docs.map(d => d.data());
}
```

### 4. Search documents by title (substring search)
```javascript
// Note: For full-text search, use Atlas Search or client-side filtering
const allDocs = await db.collection('documents').get();
const results = allDocs.docs
  .map(d => d.data())
  .filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (doc.ownerId === userId || doc.memberIds.includes(userId))
  );
```

---

## Best Practices

### ✅ DO
- Store `memberIds` array for quick access checks
- Use server timestamps for audit trails
- Keep versions immutable
- Denormalize frequently accessed data
- Index commonly queried fields
- Use subcollections for scalable document versions

### ❌ DON'T
- Store large binary data in documents (use Cloud Storage)
- Create unlimited nested subcollections
- Store unindexed arrays without careful consideration
- Skip security rules (always enforce access control)
- Delete version history without archival

---

## Firestore Limits

| Aspect | Limit |
|--------|-------|
| Document size | 1 MB |
| Document writes per second | 1 per document |
| Nested depth | Subcollections only (documents/{id}/subcollection) |
| Field count | 20,000 fields per document |
| Array elements | No hard limit, but affects document size |

---

## Data Types

| Field | Type | Example |
|-------|------|---------|
| `uid`, `id`, `email` | String | `"user-123"` |
| `version`, `createdAt` | Timestamp | `admin.firestore.Timestamp.now()` |
| `collaborators`, `memberIds` | Array | `["user-1", "user-2"]` |
| `isArchived` | Boolean | `false` |
| `content` | String (JSON) | `"{...}"` |

---

## Related Files

- [firestore.rules](../../firestore.rules) - Security rules
- [firestore.indexes.json](../../firestore.indexes.json) - Index configuration
- [server/src/services/document.service.js](../../server/src/services/document.service.js) - Document operations
- [server/src/services/user.service.js](../../server/src/services/user.service.js) - User operations
