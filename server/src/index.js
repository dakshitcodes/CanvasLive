import app from './app.js';
import { initializeFirebase } from './config/firebase.js';

// Vercel detects this default Express export and runs it as a Function.
// Firebase initialization is safe to call during cold starts and is reused
// when the Function instance remains warm.
initializeFirebase();

export default app;
