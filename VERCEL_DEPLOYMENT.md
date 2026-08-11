# Deploying CanvasLive to Vercel

Deploy this repository as **two Vercel projects** from the same Git repository:

| Project | Root Directory | Framework |
| :-- | :-- | :-- |
| Web client | `client` | Vite |
| API | `server` | Express |

## 1. Deploy the API

1. In Vercel, create a new project from this repository and set its **Root Directory** to `server`.
2. Leave the build and output settings at their detected defaults. The `src/index.js` entry point exports the Express application for Vercel.
3. Add these environment variables to both **Preview** and **Production** as appropriate:

```env
NODE_ENV=production
AUTH_DEV_MODE=false
CLIENT_URL=https://your-client-project.vercel.app
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-service-account-private-key
```

4. Deploy, then record the API URL, for example `https://your-api-project.vercel.app`.

## 2. Deploy the client

1. Create a second Vercel project from the same repository and set its **Root Directory** to `client`.
2. Vercel detects Vite. Use `npm run build` as the build command and `dist` as the output directory if the values are not filled automatically.
3. Add the following environment variables. Values prefixed with `VITE_` are bundled into the browser, so never put secrets in them.

```env
VITE_API_URL=https://your-api-project.vercel.app/api/v1
VITE_SOCKET_URL=https://your-realtime-service.example
VITE_AUTH_DEV_MODE=false
VITE_FIREBASE_API_KEY=your-public-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4. Deploy the client. Update the API project's `CLIENT_URL` with the final client URL and redeploy the API.

## Firebase configuration

Before production deployment, enable **Email/Password** and **Google** under Firebase Authentication's Sign-in method settings. Add your Vercel client URL under Firebase Authentication's authorized domains.

## Real-time collaboration

Vercel Functions support WebSockets, but Socket.IO room and presence state must be shared between function instances for a dependable multi-user experience. The current Socket.IO server is suitable for local development. For production real-time collaboration, host the Socket.IO service on a persistent Node host or replace its in-memory room state with a shared adapter and store (for example, Redis) before setting `VITE_SOCKET_URL`.

## Verify

- Visit `https://your-api-project.vercel.app/api/v1/health` and confirm a healthy response.
- Sign in through the client using Firebase Authentication.
- Confirm that the API's `CLIENT_URL` exactly matches the deployed client origin.
