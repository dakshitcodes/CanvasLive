# CanvasLive

> Real-time collaborative document editor with multi-user editing, role-based access control, authentication, and persistent document storage.

## Overview

CanvasLive is a full-stack collaborative document editing platform that allows multiple users to work on documents in real time.

The application uses a React frontend with a Node.js/Express backend. Real-time communication is handled using Socket.IO, while Firebase is used for authentication and persistent document storage.

## Features

### Document Management

- Create documents
- Edit document content
- Rename documents
- Delete documents
- Persistent document storage
- Version history
- Restore previous document versions

### Real-Time Collaboration

- Multiple users can edit a document simultaneously
- Real-time document updates using Socket.IO
- Document-specific Socket.IO rooms
- Online user presence
- Typing indicators
- Debounced document saving
- Automatic persistence of document changes

### Role-Based Access Control

| Role       | View | Edit | Delete | Manage Collaborators |
| :--------- | :--: | :--: | :----: | :------------------: |
| **Owner**  |  ✅  |  ✅  |   ✅   |          ✅          |
| **Editor** |  ✅  |  ✅  |   ❌   |          ❌          |
| **Viewer** |  ✅  |  ❌  |   ❌   |          ❌          |

### Authentication

- Firebase Authentication
- Firebase Admin SDK for server-side authentication
- Protected API routes
- Authenticated Socket.IO connections
- Document-level access control

### Version History

Documents support version history, allowing users to view previous versions and restore a selected version.

![CanvasLive Version History](https://github.com/dakshitcodes/CanvasLive/blob/main/image.png)

---

## Tech Stack & Badges

<p align="center">
  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  </a>
  <a href="https://vite.dev/">
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  </a>
  <a href="https://expressjs.com/">
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  </a>
  <a href="https://socket.io/">
    <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
  </a>
  <a href="https://firebase.google.com/">
    <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  </a>
  <a href="https://tailwindcss.com/">
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </a>
</p>

| Technology                  | Purpose                                           |
| :-------------------------- | :------------------------------------------------ |
| **React 19**                | Component-based frontend UI                       |
| **Vite**                    | Frontend development and production build tooling |
| **TipTap**                  | Rich-text document editor                         |
| **Tailwind CSS**            | Responsive utility-first styling                  |
| **Express.js**              | REST API backend                                  |
| **Node.js**                 | Backend runtime                                   |
| **Socket.IO**               | Real-time collaboration and presence              |
| **Firebase Authentication** | User authentication                               |
| **Firebase Admin SDK**      | Server-side authentication and Firebase access    |
| **Cloud Firestore**         | Persistent document and version storage           |
| **Axios**                   | HTTP client for API communication                 |
| **Lucide React**            | UI icons                                          |
| **Vercel**                  | Frontend hosting                                  |
| **Render**                  | Backend hosting                                   |
| **Git / GitHub**            | Version control and source management             |

---

## Architecture

```text
                        ┌──────────────────────┐
                        │    React Frontend    │
                        │     React + TipTap   │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                REST API                    Socket.IO
                    │                             │
                    ▼                             ▼
            ┌────────────────────────────────────────────┐
            │             Express Backend                │
            │                                            │
            │   REST API + Socket.IO Collaboration Layer │
            └──────────────────────┬─────────────────────┘
                                   │
                                   ▼
                            ┌──────────────────┐
                            │ Cloud Firestore  │
                            │                  │
                            │   Documents      │
                            │   Versions       │
                            └──────────────────┘

                           Firebase Authentication
                                    │
                                    ▼
                             User Authentication
```

## Real-Time Editing Flow

```text
User edits document
        │
        ▼
      TipTap
        │
        ▼
    Socket.IO
        │
        ├──────────────► Other collaborators
        │
        ▼
 Debounced document save
        │
        ▼
     DOC_SAVE
        │
        ▼
 Document Service
        │
        ▼
    Firestore
```

Real-time updates and persistence are handled separately:

```text
DOC_UPDATE
    │
    └──► Broadcast update to connected collaborators


DOC_SAVE
    │
    └──► Persist document content in Firestore
```

---

## Project Structure

```text
CanvasLive/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── dashboard/
│   │   │   └── editor/
│   │   ├── config/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── services/
│   │       ├── api/
│   │       └── socket/
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
│
├── vercel.json
├── package.json
└── README.md
```

---

## API

### Health

| Method | Endpoint         | Description      |
| :----- | :--------------- | :--------------- |
| `GET`  | `/api/v1/health` | API health check |

### Documents

| Method   | Endpoint                       | Description                                       |
| :------- | :----------------------------- | :------------------------------------------------ |
| `GET`    | `/api/v1/documents`            | Get documents available to the authenticated user |
| `GET`    | `/api/v1/documents/:id`        | Get a specific document                           |
| `POST`   | `/api/v1/documents`            | Create a document                                 |
| `PUT`    | `/api/v1/documents/:id`        | Update document content                           |
| `PATCH`  | `/api/v1/documents/:id/rename` | Rename a document                                 |
| `DELETE` | `/api/v1/documents/:id`        | Delete a document                                 |

### Collaborators

| Method   | Endpoint                                              | Description           |
| :------- | :---------------------------------------------------- | :-------------------- |
| `POST`   | `/api/v1/documents/:id/collaborators`                 | Add a collaborator    |
| `DELETE` | `/api/v1/documents/:id/collaborators/:collaboratorId` | Remove a collaborator |

### Versions

| Method | Endpoint                                            | Description                |
| :----- | :-------------------------------------------------- | :------------------------- |
| `GET`  | `/api/v1/documents/:id/versions`                    | Get document versions      |
| `POST` | `/api/v1/documents/:id/versions/:versionId/restore` | Restore a document version |

---

## Socket.IO Events

### Client → Server

| Event             | Description                          |
| :---------------- | :----------------------------------- |
| `DOC_JOIN`        | Join a document collaboration room   |
| `DOC_LEAVE`       | Leave a document collaboration room  |
| `DOC_UPDATE`      | Send a real-time document update     |
| `DOC_SAVE`        | Persist the current document content |
| `TYPING_START`    | Indicate that a user started typing  |
| `TYPING_STOP`     | Indicate that a user stopped typing  |
| `PRESENCE_UPDATE` | Update user presence                 |

### Server → Client

| Event             | Description                                |
| :---------------- | :----------------------------------------- |
| `DOC_JOINED`      | Confirmation that a user joined a document |
| `DOC_UPDATED`     | Broadcast document update                  |
| `DOC_SAVED`       | Document save notification                 |
| `PRESENCE_UPDATE` | Updated user presence                      |
| `TYPING_UPDATE`   | Updated typing status                      |
| `ERROR`           | Socket error notification                  |

### Collaboration Rooms

Each document uses a dedicated Socket.IO room:

```text
doc:<documentId>
```

This keeps real-time updates scoped to users collaborating on the same document.

---

## Local Development

### Prerequisites

- Node.js 18+
- npm
- Firebase project
- Firebase Authentication enabled
- Cloud Firestore enabled

### Clone the Repository

```bash
git clone https://github.com/dakshitcodes/CanvasLive.git
cd CanvasLive
```

### Install Dependencies

```bash
npm run install:all
```

### Server Environment Variables

Create the server environment configuration with:

```env
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:5173
AUTH_DEV_MODE=false

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"
```

### Client Environment Variables

```env
VITE_API_URL=http://localhost:5001/api/v1
VITE_SOCKET_URL=http://localhost:5001
```

> Never commit environment files or Firebase service-account credentials to the repository.

### Run the Application

```bash
npm run dev
```

The development setup runs:

```text
Frontend → http://localhost:5173
Backend  → http://localhost:5001
```

---

## Production

| Component      | Technology              |
| :------------- | :---------------------- |
| Frontend       | Vercel                  |
| Backend        | Render                  |
| Database       | Cloud Firestore         |
| Authentication | Firebase Authentication |

Production environment variables are configured through the respective deployment platforms.

---

## Security

CanvasLive includes several application-level security measures:

- Firebase Authentication
- Firebase Admin SDK token verification
- Protected API routes
- Role-based access control
- Authenticated Socket.IO connections
- Document-level access control
- Helmet
- CORS configuration
- Request validation using `express-validator`
- Viewer permissions prevent document modification and saving

---

## Key Engineering Decisions

### Real-Time Updates vs Persistence

Real-time document updates are sent through Socket.IO, while document persistence is handled separately through debounced saves.

This allows collaborators to receive updates immediately without writing every individual keystroke directly to the database.

### Document-Specific Socket.IO Rooms

Each document has its own Socket.IO room:

```text
doc:<documentId>
```

This ensures that real-time document events are sent to the relevant collaborators.

### Debounced Autosave

Document changes are saved using a debounced persistence mechanism rather than writing to Firestore for every individual editor interaction.

---

## Deployment

The application is deployed using separate frontend and backend services:

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Cloud Firestore
- **Authentication:** Firebase Authentication

Firestore indexes are maintained through:

```text
firestore.indexes.json
```

---

## Future Improvements

The following features are planned improvements and are **not represented as currently implemented**:

- Improved cursor synchronization
- Comments and mentions
- Shareable document links
- Notifications
- Offline editing
- Document search
- Activity history
- Advanced conflict resolution
- Automated testing
- CI/CD

---
