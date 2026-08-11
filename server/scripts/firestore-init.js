/**
 * Firestore Collections Initialization Script
 * 
 * This script initializes the Firestore collections with the proper structure:
 * - users/{uid} - User profiles
 * - documents/{docId} - Document metadata and content
 * - documents/{docId}/versions/{versionId} - Version history
 * 
 * Usage:
 *   node scripts/firestore-init.js
 * 
 * Prerequisites:
 *   - Firebase Admin SDK initialized with valid credentials
 *   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('❌ Error: Missing Firebase credentials in .env');
  console.error('Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

// Initialize Firebase Admin
const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY,
  }),
});

const db = admin.firestore();

/**
 * Initialize Firestore collections
 */
async function initializeCollections() {
  try {
    console.log('🚀 Initializing Firestore collections...\n');

    // Create sample data
    const sampleUsers = {
      'user-1': {
        uid: 'user-1',
        email: 'user1@example.com',
        displayName: 'User One',
        photoURL: null,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      'user-2': {
        uid: 'user-2',
        email: 'user2@example.com',
        displayName: 'User Two',
        photoURL: null,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      },
    };

    const sampleDocuments = {
      'doc-1': {
        id: 'doc-1',
        title: 'Welcome Document',
        content: '<p>Welcome to the collaborative document editor!</p>',
        ownerId: 'user-1',
        collaborators: [
          {
            userId: 'user-2',
            email: 'user2@example.com',
            role: 'editor',
            joinedAt: admin.firestore.Timestamp.now(),
          },
        ],
        memberIds: ['user-1', 'user-2'],
        role: 'owner',
        isArchived: false,
        version: 1,
        lastEditedBy: 'user-1',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      },
    };

    const sampleVersions = {
      'doc-1': [
        {
          id: 'v-1-1',
          documentId: 'doc-1',
          version: 1,
          title: 'Welcome Document',
          content: '<p>Welcome to the collaborative document editor!</p>',
          editedBy: 'user-1',
          createdAt: admin.firestore.Timestamp.now(),
        },
      ],
    };

    // 1. Initialize Users Collection
    console.log('📝 Creating users collection...');
    for (const [uid, userData] of Object.entries(sampleUsers)) {
      await db.collection('users').doc(uid).set(userData, { merge: true });
      console.log(`   ✓ Created user: ${userData.email}`);
    }

    // 2. Initialize Documents Collection
    console.log('\n📄 Creating documents collection...');
    for (const [docId, docData] of Object.entries(sampleDocuments)) {
      await db.collection('documents').doc(docId).set(docData, { merge: true });
      console.log(`   ✓ Created document: ${docData.title}`);

      // 3. Initialize Versions Subcollection
      if (sampleVersions[docId]) {
        console.log(`   📜 Creating versions subcollection for ${docId}...`);
        for (const version of sampleVersions[docId]) {
          await db
            .collection('documents')
            .doc(docId)
            .collection('versions')
            .doc(version.id)
            .set(version, { merge: true });
          console.log(`      ✓ Created version: ${version.id}`);
        }
      }
    }

    console.log('\n✅ Collections initialized successfully!\n');
    console.log('Created collections:');
    console.log('  • users/ (User profiles)');
    console.log('  • documents/ (Document metadata)');
    console.log('  • documents/{docId}/versions/ (Version history)\n');

    // Print summary
    console.log('Summary:');
    console.log(`  Users: ${Object.keys(sampleUsers).length}`);
    console.log(`  Documents: ${Object.keys(sampleDocuments).length}`);
    console.log(`  Total versions: ${Object.values(sampleVersions).reduce((sum, v) => sum + v.length, 0)}`);

    // Delete sample data if KEEP_SAMPLE_DATA is not set
    if (!process.env.KEEP_SAMPLE_DATA) {
      console.log('\n⚠️  Running in demo mode (sample data will be deleted after 5 seconds)');
      console.log('Set KEEP_SAMPLE_DATA=true to keep sample data.\n');

      await new Promise((resolve) => setTimeout(resolve, 5000));

      console.log('🗑️  Deleting sample data...');
      for (const uid of Object.keys(sampleUsers)) {
        await db.collection('users').doc(uid).delete();
        console.log(`   ✓ Deleted user: ${uid}`);
      }

      for (const docId of Object.keys(sampleDocuments)) {
        const versionsSnapshot = await db
          .collection('documents')
          .doc(docId)
          .collection('versions')
          .get();
        for (const doc of versionsSnapshot.docs) {
          await doc.ref.delete();
        }
        await db.collection('documents').doc(docId).delete();
        console.log(`   ✓ Deleted document: ${docId}`);
      }

      console.log('\n✅ Sample data cleaned up. Collections structure is ready.\n');
    }
  } catch (error) {
    console.error('❌ Error initializing Firestore:', error.message);
    process.exit(1);
  } finally {
    await firebaseApp.delete();
  }
}

// Run initialization
initializeCollections();
