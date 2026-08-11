# Firestore Service - Quick Reference

## Configuration

### Enable Firestore

**`.env` Configuration:**
```env
# Backend (server/.env)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
AUTH_DEV_MODE=false
```

### Verify Connection

```bash
cd server
npm run dev
```

Look for:
```
✓ [Firebase] Admin SDK initialized
```

---

## Collaborator Management

### Add Collaborator

```javascript
// Request
POST /api/documents/{docId}/collaborators
Content-Type: application/json
Authorization: Bearer {token}

{
  "userId": "user-456",
  "email": "collaborator@example.com",
  "role": "editor"    // or "viewer"
}

// Response
{
  "success": true,
  "data": {
    "id": "doc-123",
    "collaborators": [
      {
        "userId": "user-456",
        "email": "collaborator@example.com",
        "role": "editor",
        "joinedAt": "2024-08-11T16:30:00Z"
      }
    ],
    "memberIds": ["user-123", "user-456"]
  }
}
```

### Remove Collaborator

```javascript
// Request
DELETE /api/documents/{docId}/collaborators/{collaboratorId}
Authorization: Bearer {token}

// Response
{
  "success": true,
  "data": {
    "id": "doc-123",
    "collaborators": [],
    "memberIds": ["user-123"]
  }
}
```

---

## Service Methods

### Document Service

#### List User's Documents
```javascript
const docs = await documentService.listByUser(userId, {
  search: 'project',  // optional
  limit: 50           // optional, default 50
});
```

#### Get Document
```javascript
const doc = await documentService.getById(docId, userId);
// Returns: { id, title, content, ownerId, collaborators, role, ... }
```

#### Create Document
```javascript
const doc = await documentService.create(userId, {
  title: 'New Document'
});
```

#### Update Document
```javascript
const doc = await documentService.update(docId, userId, {
  title: 'Updated Title',
  content: '{tiptap_json}'
});
```

#### Delete Document
```javascript
const result = await documentService.delete(docId, userId);
// Returns: { id, deleted: true }
```

#### Add Collaborator
```javascript
const doc = await documentService.addCollaborator(docId, userId, {
  userId: 'collaborator-id',
  email: 'user@example.com',
  role: 'editor'  // or 'viewer'
});
```

#### Remove Collaborator
```javascript
const doc = await documentService.removeCollaborator(docId, userId, collaboratorId);
```

#### Get Version History
```javascript
const versions = await documentService.getVersions(docId, userId);
// Returns: [{ id, content, editedBy, createdAt }, ...]
```

#### Restore Version
```javascript
const doc = await documentService.restoreVersion(docId, userId, versionId);
```

---

## User Service

#### Get User Profile
```javascript
const user = await userService.getProfile(uid);
// Returns: { uid, email, displayName, photoURL, createdAt, updatedAt }
```

#### Update User Profile
```javascript
const user = await userService.updateProfile(uid, {
  displayName: 'New Name',
  photoURL: 'https://...'
});
```

#### Get Multiple Profiles
```javascript
const users = await userService.getProfiles(['uid-1', 'uid-2', 'uid-3']);
```

---

## Permission Model

### Roles

| Role | Read | Write | Delete | Manage |
|------|------|-------|--------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

### Access Control

```javascript
// Automatically enforced in service layer
if (role === 'owner') {
  // Can edit, delete, manage collaborators
}
if (role === 'editor') {
  // Can edit content
}
if (role === 'viewer') {
  // Read-only access
}
if (!role) {
  // No access
}
```

---

## Error Codes

| Error | Status | Cause |
|-------|--------|-------|
| `ERR_NOT_FOUND` | 404 | Document or user not found |
| `ERR_FORBIDDEN` | 403 | Access denied / permission issue |
| `ERR_BAD_REQUEST` | 400 | Invalid input or operation |
| `ERR_INTERNAL` | 500 | Firestore or server error |

---

## Firestore Queries

### Get User's Documents

```javascript
// As owner
db.collection('documents')
  .where('ownerId', '==', userId)
  .orderBy('updatedAt', 'desc')
  .limit(50)
  .get()

// As collaborator
db.collection('documents')
  .where('memberIds', 'array-contains', userId)
  .orderBy('updatedAt', 'desc')
  .get()
```

### Get Document with Versions

```javascript
// Get document
const doc = await db.collection('documents').doc(docId).get();

// Get versions
const versions = await db
  .collection('documents').doc(docId)
  .collection('versions')
  .orderBy('createdAt', 'desc')
  .get();
```

---

## Testing

### Test Add Collaborator

```bash
curl -X POST http://localhost:3000/api/documents/doc-123/collaborators \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "user-456",
    "email": "test@example.com",
    "role": "editor"
  }'
```

### Test Remove Collaborator

```bash
curl -X DELETE http://localhost:3000/api/documents/doc-123/collaborators/user-456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Fallback Behavior

When Firestore is not connected:

- All operations use in-memory store
- Same API interface
- Data lost on restart
- Perfect for development

To disable Firestore fallback (dev mode):
```env
AUTH_DEV_MODE=true
```

---

## Performance Tips

1. **Use `orderBy` at database level** - queries return pre-sorted results
2. **Use composite indexes** - speeds up complex queries
3. **Batch operations** - atomic updates prevent conflicts
4. **Limit results** - use `limit()` to reduce data transfer
5. **Cache user profiles** - call `getProfiles()` for multiple users

---

## Monitoring

### Check Firestore Usage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. **Firestore Database** → **Stats**
4. Monitor:
   - Read operations
   - Write operations
   - Delete operations
   - Data storage

### Enable Logging

Set `DEBUG=*` environment variable:
```bash
DEBUG=* npm run dev
```

---

## Troubleshooting

### "Firestore is not connected"

Check:
1. `.env` has valid credentials
2. `AUTH_DEV_MODE=false`
3. Service account has Firestore permissions
4. Network connectivity to Firebase

### "Permission denied"

Check:
1. User is authenticated
2. User has correct role
3. Firestore security rules
4. User's UID matches document access

### Slow Queries

Check:
1. Composite indexes created
2. `orderBy` uses indexed fields
3. Reduce result limit
4. Check Firestore metrics

---

## Related Documentation

- [FIRESTORE_ACTIVATION.md](./FIRESTORE_ACTIVATION.md) - Full activation guide
- [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) - Collection setup
- [FIRESTORE_COLLECTIONS_SCHEMA.md](./FIRESTORE_COLLECTIONS_SCHEMA.md) - Schema reference
- [firestore.rules](../firestore.rules) - Security rules
