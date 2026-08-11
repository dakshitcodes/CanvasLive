#!/bin/bash

# Firestore Setup Quick Commands
# Run these commands to set up Firestore for the collaborative document editor

echo "🚀 Firestore Setup Quick Start"
echo "================================\n"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install it first:"
    echo "   npm install -g firebase-tools"
    echo "   firebase login"
    exit 1
fi

echo "✓ Firebase CLI is installed\n"

# Set project
PROJECT_ID=${1:-}
if [ -z "$PROJECT_ID" ]; then
    echo "Usage: ./firestore-setup.sh <PROJECT_ID>"
    echo "Example: ./firestore-setup.sh my-project-id"
    exit 1
fi

echo "📝 Setting Firebase project to: $PROJECT_ID\n"
firebase use "$PROJECT_ID" || exit 1

echo "\n📋 Available commands:\n"

echo "1️⃣  Deploy Firestore Security Rules:"
echo "   firebase deploy --only firestore:rules\n"

echo "2️⃣  Deploy Firestore Indexes:"
echo "   firebase deploy --only firestore:indexes\n"

echo "3️⃣  Deploy Both Rules & Indexes:"
echo "   firebase deploy --only firestore\n"

echo "4️⃣  Deploy Everything (including hosting):"
echo "   firebase deploy\n"

echo "5️⃣  Start Local Emulator (for development):"
echo "   firebase emulators:start\n"

echo "6️⃣  Initialize Sample Data:"
echo "   cd server && node scripts/firestore-init.js\n"

echo "\n📚 Documentation:"
echo "   See docs/FIRESTORE_SETUP.md for detailed instructions"
