## Part 3: Create Firestore Collections

This guide walks you through setting up Firestore collections for the collaborative document editor.

### Collections Structure

```
firestore/
├── users/{uid}
│   ├── uid: string
│   ├── email: string
│   ├── displayName: string
│   ├── photoURL: string | null
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
├── documents/{docId}
│   ├── id: string
│   ├── title: string
│   ├── content: string (TipTap JSON)
│   ├── ownerId: string
│   ├── collaborators: array[{userId, email, role, joinedAt}]
│   ├── memberIds: array[string]
│   ├── role: string (owner|editor|viewer)
│   ├── isArchived: boolean
│   ├── version: number
│   ├── lastEditedBy: string
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│
└── documents/{docId}/versions/{versionId}
    ├── id: string
    ├── documentId: string
    ├── version: number
    ├── title: string
    ├── content: string
    ├── editedBy: string
    └── createdAt: timestamp
```

---

## Step 1: Enable Firestore in Firebase Project

### 1.1 Create Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** from the left menu
4. Click **Create Database**
5. Choose a region (e.g., `us-east1`)
6. Start in **Production Mode** (security rules will be configured)
7. Click **Create**

### 1.2 Create Indexes
Firestore indexes optimize queries for better performance.

#### Index 1: Documents by Owner
- **Collection**: documents
- **Fields**: 
  - `ownerId` (Ascending)
  - `updatedAt` (Descending)

#### Index 2: Documents by Members
- **Collection**: documents
- **Fields**:
  - `memberIds` (Contains)
  - `updatedAt` (Descending)

#### Index 3: Documents with Archive Status
- **Collection**: documents
- **Fields**:
  - `ownerId` (Ascending)
  - `isArchived` (Ascending)
  - `updatedAt` (Descending)

You can also create these indexes programmatically or let Firestore auto-generate them when you run queries.

---

## Step 2: Apply Security Rules

### 2.1 Deploy Security Rules
1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the default rules with the content from `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

Or manually copy the rules from [firestore.rules](../firestore.rules) into the Firebase Console.

### Key Security Features
- ✅ Users can only access their own profile
- ✅ Only document owner can manage collaborators
- ✅ Collaborators can read/edit documents based on role
- ✅ Version history is immutable (audit trail)
- ✅ Versions are tied to document access rules

---

## Step 3: Initialize Collections

### Option A: Using the Initialization Script (Recommended)

#### 3.1 Verify Backend Credentials
Ensure your `server/.env` has valid Firebase credentials:

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
AUTH_DEV_MODE=false
```

#### 3.2 Run Initialization Script
```bash
cd server
node scripts/firestore-init.js
```

**Output:**
```
🚀 Initializing Firestore collections...

📝 Creating users collection...
   ✓ Created user: user1@example.com
   ✓ Created user: user2@example.com

📄 Creating documents collection...
   ✓ Created document: Welcome Document
   📜 Creating versions subcollection for doc-1...
      ✓ Created version: v-1-1

✅ Collections initialized successfully!
```

#### 3.3 Keep Sample Data (Optional)
By default, the script creates sample data and deletes it after 5 seconds. To keep the sample data:

```bash
cd server
KEEP_SAMPLE_DATA=true node scripts/firestore-init.js
```

### Option B: Manual Collection Creation via Firebase Console

#### 3.1 Create users Collection
1. In Firestore Console, click **+ Start collection**
2. **Collection ID**: `users`
3. **Document ID**: (auto-generated)
4. Add fields:
   ```json
   {
     "uid": "string",
     "email": "string",
     "displayName": "string",
     "photoURL": "string | null",
     "createdAt": "timestamp",
     "updatedAt": "timestamp"
   }
   ```

#### 3.2 Create documents Collection
1. Click **+ Add collection**
2. **Collection ID**: `documents`
3. Add fields:
   ```json
   {
     "id": "string",
     "title": "string",
     "content": "string",
     "ownerId": "string",
     "collaborators": "array[{userId: string, email: string, role: string, joinedAt: timestamp}]",
     "memberIds": "array[string]",
     "role": "string",
     "isArchived": "boolean",
     "version": "number",
     "lastEditedBy": "string",
     "createdAt": "timestamp",
     "updatedAt": "timestamp"
   }
   ```

#### 3.3 Create versions Subcollection
1. In a document under `documents/{docId}`, click **+ Add collection**
2. **Subcollection ID**: `versions`
3. Add fields:
   ```json
   {
     "id": "string",
     "documentId": "string",
     "version": "number",
     "title": "string",
     "content": "string",
     "editedBy": "string",
     "createdAt": "timestamp"
   }
   ```

---

## Step 4: Verify Firestore Connection

### 4.1 Update Backend Environment
Ensure your `server/.env` has:

```env
AUTH_DEV_MODE=false
```

This disables the in-memory store and enables Firestore.

### 4.2 Test Connection
Start the backend server:

```bash
cd server
npm run dev
```

Check the console output:
```
✓ [Firebase] Admin SDK initialized
✓ Firestore is connected
```

### 4.3 Test Frontend (Optional)
Update `client/.env`:

```env
VITE_AUTH_DEV_MODE=false
```

Start the frontend:
```bash
cd client
npm run dev
```

---

## Step 5: Create Compound Indexes (If Needed)

If you run queries combining multiple fields, Firestore will prompt you to create indexes.

### Auto-Index Creation
1. The first time you run a complex query, Firestore will suggest an index
2. Click the link in the error message to create it automatically

### Manual Index Creation
1. Go to **Firestore Database** → **Indexes**
2. Click **Create Index**
3. Add fields and sort order
4. Click **Create**

### Common Indexes for This App
| Query | Fields |
|-------|--------|
| Documents by owner (sorted by date) | `ownerId` (Asc), `updatedAt` (Desc) |
| Documents by member (sorted by date) | `memberIds` (Contains), `updatedAt` (Desc) |
| Owner documents (archived filter) | `ownerId` (Asc), `isArchived` (Asc), `updatedAt` (Desc) |

---

## Step 6: Troubleshooting

### Issue: "Firestore is not connected"
**Solution**: 
- Check that `AUTH_DEV_MODE=false` in `server/.env`
- Verify Firebase credentials are valid
- Check Firebase Admin SDK initialization logs

### Issue: "Permission denied" errors
**Solution**:
- Verify security rules in Firestore Console
- Ensure user is authenticated
- Check that user has correct role/permissions

### Issue: "Missing or insufficient permissions"
**Solution**:
- Review the security rules in [firestore.rules](../firestore.rules)
- Ensure the user's UID matches the document's `ownerId` or is in `memberIds`
- Check role-based permissions (owner vs editor vs viewer)

### Issue: Indexes not created automatically
**Solution**:
- Run a complex query and follow the error message link
- Or manually create indexes from [Step 5](#step-5-create-compound-indexes-if-needed)

---

## Step 7: Data Migration (If Upgrading)

If you already have data in the in-memory store, migrate it to Firestore:

```bash
cd server
node scripts/migrate-to-firestore.js  # (Create this script if needed)
```

---

## Next Steps

✅ Collections are created and secured  
✅ Backend can write/read from Firestore  
✅ Version history is tracked automatically  

You can now:
- 📝 Create documents
- 👥 Add collaborators
- 🔄 Track version history
- 🔐 Use role-based access control
- 🌍 Scale with Firebase

---

## Firestore Best Practices

1. **Denormalization**: Store frequently accessed data (like `memberIds`) at the document level to avoid subcollection queries
2. **Indexing**: Index commonly queried fields to improve performance
3. **Archive Pattern**: Use `isArchived` field instead of deleting documents
4. **Version Snapshots**: Keep immutable version records for audit trails
5. **Real-time Listeners**: Use Firestore real-time listeners for collaborative features
6. **Batched Writes**: Use batch writes for atomic multi-document updates

---

## Firestore API Reference

### Service Methods (Already Implemented)
- `userService.upsertFromAuth(decodedToken)` - Create/update user
- `userService.getProfile(uid)` - Get user profile
- `documentService.listByUser(userId, options)` - List user's documents
- `documentService.getDocumentById(docId, userId)` - Get document details
- `documentService.createDocument(data)` - Create new document
- `documentService.updateDocument(docId, data)` - Update document
- `documentService.deleteDocument(docId, userId)` - Delete document
- `documentService.addCollaborator(docId, collaborator)` - Add collaborator
- `documentService.removeCollaborator(docId, userId)` - Remove collaborator
- `documentService.getVersionHistory(docId, userId)` - Get version history

All methods automatically use Firestore when available and fall back to in-memory store when needed.

---

## Related Files

- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Frontend & Backend Firebase setup
- [firestore.rules](../firestore.rules) - Security rules
- [server/scripts/firestore-init.js](../server/scripts/firestore-init.js) - Initialization script
- [server/src/services/firestore.placeholder.js](../server/src/services/firestore.placeholder.js) - Firestore helpers
- [server/src/services/user.service.js](../server/src/services/user.service.js) - User operations
- [server/src/services/document.service.js](../server/src/services/document.service.js) - Document operations
