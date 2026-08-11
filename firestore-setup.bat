@echo off
REM Firestore Setup Quick Commands (Windows)
REM Run these commands to set up Firestore for the collaborative document editor

echo.
echo 🚀 Firestore Setup Quick Start
echo ================================
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Firebase CLI not found. Install it first:
    echo    npm install -g firebase-tools
    echo    firebase login
    exit /b 1
)

echo ✓ Firebase CLI is installed
echo.

REM Set project
set PROJECT_ID=%1
if "%PROJECT_ID%"=="" (
    echo Usage: firestore-setup.bat ^<PROJECT_ID^>
    echo Example: firestore-setup.bat my-project-id
    exit /b 1
)

echo 📝 Setting Firebase project to: %PROJECT_ID%
echo.
call firebase use %PROJECT_ID%
if errorlevel 1 exit /b 1

echo.
echo 📋 Available commands:
echo.

echo 1️⃣  Deploy Firestore Security Rules:
echo    firebase deploy --only firestore:rules
echo.

echo 2️⃣  Deploy Firestore Indexes:
echo    firebase deploy --only firestore:indexes
echo.

echo 3️⃣  Deploy Both Rules ^& Indexes:
echo    firebase deploy --only firestore
echo.

echo 4️⃣  Deploy Everything (including hosting):
echo    firebase deploy
echo.

echo 5️⃣  Start Local Emulator (for development):
echo    firebase emulators:start
echo.

echo 6️⃣  Initialize Sample Data:
echo    cd server ^&^& node scripts/firestore-init.js
echo.

echo.
echo 📚 Documentation:
echo    See docs\FIRESTORE_SETUP.md for detailed instructions
