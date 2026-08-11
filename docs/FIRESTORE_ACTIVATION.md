# Firestore Service Activation Guide

## Overview

Firestore service is now fully activated in the backend. The application automatically uses Firestore for all document and user operations when credentials are configured, with automatic fallback to in-memory storage for development.

---

## Activation Steps

### Step 1: Configure Firebase Credentials

Update `server/.env`:

```env
# Firebase Admin SDK Credentials
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

# Disable dev mode to activate Firestore
AUTH_DEV_MODE=false
```

### Step 2: Verify Firestore Connection

Start the backend server:

```bash
cd server
npm run dev
```

Check console output for Firestore initialization:

```
✓ [Firebase] Admin SDK initialized
✓ [Firestore] Connected and ready
```

### Step 3: Initialize Collections (First Time Only)

Run the initialization script to create the collection structure:

```bash
cd server
node scripts/firestore-init.js
```

Output:

```
🚀 Initializing Firestore collections...

📝 Creating users collection...
   ✓ Created user: user1@example.com

📄 Creating documents collection...
   ✓ Created document: Welcome Document

✅ Collections initialized successfully!
```

### Step 4: Update Frontend (Optional)

To sync frontend authentication with Firestore:

Update `client/.env`:

```env
VITE_AUTH_DEV_MODE=false
```

---

## Activated Services

### Document Service

The `documentService` now fully operates with Firestore:

#### Methods

| Method | Description | Firestore | Memory |
|--------|-------------|-----------|--------|
| `listByUser()` | Get user's documents | ✅ Optimized queries | ✅ Fallback |
| `getById()` | Get single document | ✅ Direct lookup | ✅ Fallback |
| `create()` | Create new document | ✅ Atomic write | ✅ Fallback |
| `update()` | Update title/content | ✅ Versioned | ✅ Fallback |
| `delete()` | Delete document | ✅ Batch delete | ✅ Fallback |
| `rename()` | Rename document | ✅ Atomic update | ✅ Fallback |
| `getVersions()` | Get version history | ✅ Subcollection query | ✅ Fallback |
| `restoreVersion()` | Restore old version | ✅ Atomic restore | ✅ Fallback |
| `getRaw()` | Get document (socket) | ✅ Real-time sync | ✅ Fallback |
| `applyContent()` | Apply editor changes | ✅ Direct update | ✅ Fallback |
| `addCollaborator()` | Add collaborator | ✅ Array union | ✅ Fallback |
| `removeCollaborator()` | Remove collaborator | ✅ Array remove | ✅ Fallback |

### User Service

The `userService` now fully operates with Firestore:

#### Methods

| Method | Description | Firestore | Memory |
|--------|-------------|-----------|--------|
| `upsertFromAuth()` | Create/update from Firebase Auth | ✅ Merge update | ✅ Fallback |
| `getProfile()` | Get user profile | ✅ Direct lookup | ✅ Fallback |
| `updateProfile()` | Update profile | ✅ Merge update | ✅ Fallback |
| `getProfiles()` | Get multiple profiles | ✅ Batch query | ✅ Fallback |

---

## API Endpoints

### Documents

#### List Documents
```
GET /api/documents
Query: ?search=query&limit=50
Response: { success: true, data: [...], count: 10 }
```

#### Create Document
```
POST /api/documents
Body: { title: "New Doc" }
Response: { success: true, data: {...} }
```

#### Get Document
```
GET /api/documents/:id
Response: { success: true, data: {...} }
```

#### Update Document
```
PATCH /api/documents/:id
Body: { title: "Updated", content: "..." }
Response: { success: true, data: {...} }
```

#### Rename Document
```
PATCH /api/documents/:id/rename
Body: { title: "New Title" }
Response: { success: true, data: {...} }
```

#### Delete Document
```
DELETE /api/documents/:id
Response: { success: true, data: { id, deleted: true } }
```

### Version History

#### Get Version History
```
GET /api/documents/:id/versions
Response: { success: true, data: [{id, content, editedBy, createdAt}, ...] }
```

#### Restore Version
```
POST /api/documents/:id/versions/:versionId/restore
Response: { success: true, data: {...} }
```

### Collaborators

#### Add Collaborator
```
POST /api/documents/:id/collaborators
Body: {
  userId: "user-123",
  email: "user@example.com",
  role: "editor"  // or "viewer"
}
Response: { success: true, data: {...} }
```

#### Remove Collaborator
```
DELETE /api/documents/:id/collaborators/:collaboratorId
Response: { success: true, data: {...} }
```

---

## Firestore Features Enabled

### ✅ Real-time Collaboration
- Live document updates via WebSockets
- Real-time presence tracking
- Automatic version history

### ✅ Access Control
- Security rules enforce permissions
- Owner-only operations
- Role-based collaborator access

### ✅ Version History
- Immutable version snapshots
- Easy rollback capability
- Audit trail of changes

### ✅ Scalability
- Database-level sorting & filtering
- Efficient batch operations
- Optimized queries with indexes

### ✅ Data Persistence
- Automatic data backup
- Firebase-managed infrastructure
- Multi-region replication

---

## Query Optimization

### Automatic Firestore Optimizations

The service automatically uses optimal Firestore queries:

**1. List User Documents**
```javascript
// Fetches with orderBy at database level
where('ownerId', '==', userId).orderBy('updatedAt', 'desc').limit(50)
where('memberIds', 'array-contains', userId).orderBy('updatedAt', 'desc').limit(50)
```

**2. Document Access Control**
```javascript
// Single document fetch
getDocumentRef(docId).get()
```

**3. Batch Operations**
```javascript
// Atomic delete with all versions
batch.delete(versionRef)
batch.delete(documentRef)
batch.commit()
```

### Manual Query Examples

Query documents owned by a user:

```javascript
const snapshot = await db
  .collection('documents')
  .where('ownerId', '==', userId)
  .orderBy('updatedAt', 'desc')
  .get();
```

Query documents where user is a collaborator:

```javascript
const snapshot = await db
  .collection('documents')
  .where('memberIds', 'array-contains', userId)
  .orderBy('updatedAt', 'desc')
  .get();
```

---

## Error Handling

All service methods include comprehensive error handling:

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Document not found` | Document ID is invalid or deleted | Verify document ID exists |
| `Access denied` | User doesn't have permission | Check user's role in document |
| `Viewer cannot edit` | User has viewer role | Request editor access from owner |
| `Only the owner can...` | Only owner can perform action | Contact document owner |
| `Firestore is not connected` | Firebase credentials invalid | Check `.env` credentials |

### Error Responses

```javascript
// Standard error format
{
  code: 'ERR_CODE',
  message: 'Human-readable error',
  status: 403
}
```

---

## Monitoring & Debugging

### Enable Debug Logging

Update `server/src/services/document.service.js` to see detailed logs:

```javascript
console.log('[Firestore] Query:', query);
console.log('[Firestore] Result:', snapshot.docs.length, 'documents');
```

### Monitor Firestore Usage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. **Firestore Database** → **Stats**
4. View:
   - Read operations
   - Write operations
   - Data storage
   - Network bandwidth

### Performance Tracking

Check operation latency:

```javascript
const start = Date.now();
const doc = await documentService.getById(docId, userId);
console.log(`Operation took ${Date.now() - start}ms`);
```

---

## Deployment

### Production Checklist

Before deploying to production:

- ✅ Firebase credentials configured in production environment
- ✅ Firestore collections created and indexed
- ✅ Security rules deployed
- ✅ Firestore backup enabled
- ✅ Usage quotas reviewed
- ✅ Error logging configured
- ✅ Performance testing completed

### Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### Deploy Indexes

```bash
firebase deploy --only firestore:indexes
```

### Full Deployment

```bash
firebase deploy
```

---

## Troubleshooting

### Firestore Not Connected

**Symptom**: `[Firebase] Admin SDK not configured`

**Solution**:
1. Verify `.env` has correct credentials
2. Check `AUTH_DEV_MODE=false`
3. Restart backend server
4. Check Firebase Admin SDK initialization logs

### Permission Errors

**Symptom**: `Missing or insufficient permissions`

**Solution**:
1. Verify security rules in Firebase Console
2. Check user authentication status
3. Ensure user's UID matches expected format
4. Review access control logic

### Slow Queries

**Symptom**: Queries taking >1 second

**Solution**:
1. Check that composite indexes are created
2. Verify `orderBy` uses indexed fields
3. Reduce query result limit
4. Enable query logging to diagnose

### Version Conflicts

**Symptom**: Version history showing duplicates

**Solution**:
1. Check that `createVersionSnapshot()` is called only once
2. Verify batch operations are atomic
3. Monitor Firestore write operations

---

## Performance Benchmarks

Typical operation latencies (with indexes):

| Operation | Latency | Notes |
|-----------|---------|-------|
| Get document | 10-50ms | Direct lookup |
| List documents | 50-200ms | With sorting |
| Create document | 20-100ms | Includes version |
| Update content | 30-150ms | Versioned update |
| Delete document | 50-200ms | Batch delete with versions |
| Get versions | 30-100ms | Subcollection query |

---

## Next Steps

1. **Test in Development**
   - Run the backend with Firestore
   - Create and edit documents
   - Add/remove collaborators
   - Check version history

2. **Monitor Performance**
   - Watch Firestore metrics
   - Identify slow queries
   - Create missing indexes

3. **Deploy to Production**
   - Set up production Firebase project
   - Configure environment variables
   - Deploy security rules and indexes
   - Enable backups

4. **Scale Collaboration Features**
   - Real-time presence
   - Live cursor tracking
   - Conflict resolution
   - Presence notifications

---

## Related Documentation

- [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) - Collection initialization guide
- [FIRESTORE_COLLECTIONS_SCHEMA.md](./FIRESTORE_COLLECTIONS_SCHEMA.md) - Schema reference
- [firestore.rules](../firestore.rules) - Security rules
- [server/src/services/document.service.js](../server/src/services/document.service.js) - Implementation
- [server/src/services/user.service.js](../server/src/services/user.service.js) - User operations
