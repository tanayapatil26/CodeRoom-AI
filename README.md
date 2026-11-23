# CodeRoom AI

**A real-time collaborative coding workspace with an AI coding copilot.**

CodeRoom AI lets developers create shared coding rooms, edit files together, communicate in real time, preview browser-based projects, and ask an AI assistant to explain, debug, refactor, or generate code.

> **Project status:** Core application flows are implemented in the source code. Local installation, production builds, end-to-end collaboration, and deployment still need to be verified in the target environment. See [Verification checklist](#verification-checklist) before treating any feature as production-ready.

## Highlights

- **Collaborative editor:** Monaco Editor with Yjs document synchronization and live awareness/cursors.
- **Rooms and roles:** Create rooms, invite collaborators, and distinguish hosts, collaborators, and read-only viewers.
- **Real-time communication:** Room chat, typing indicators, participant presence, and activity notifications with Socket.IO.
- **AI coding copilot:** Explain, fix, refactor, optimize, review, generate, and chat actions with Gemini or OpenAI streaming support.
- **Browser preview:** Preview HTML/CSS/JavaScript projects in a sandboxed iframe and inspect captured console output.
- **Persistence:** MongoDB models for users, rooms, files, Yjs document state, messages, and AI history.
- **Security foundations:** JWT authentication, password hashing, request validation, rate limiting, Helmet, and room-membership checks.

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Zustand, Tailwind CSS |
| Editor | Monaco Editor, Yjs, y-monaco |
| Real-time | Socket.IO, WebSockets, y-websocket |
| Backend | Node.js 18+, Express 4 |
| Database | MongoDB, Mongoose |
| AI | Gemini API or OpenAI API (server-side) |
| Security | JWT, bcryptjs, Zod, Helmet, express-rate-limit |

## Architecture

```text
                          ┌─────────────────────────────┐
                          │       React + Vite          │
                          │ Monaco Editor / Room UI     │
                          └──────────────┬──────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                 REST API            Socket.IO           Yjs WebSocket
                 /api/*              /socket.io           /yjs/:fileId
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                          ┌──────────────▼──────────────┐
                          │       Express Server        │
                          │ Auth / Rooms / Files / AI   │
                          └───────┬──────────────┬───────┘
                                  │              │
                              MongoDB       Gemini / OpenAI
```

**Why both Socket.IO and Yjs?** Socket.IO handles application events such as chat, presence, typing, and notifications. Yjs handles concurrent document edits using CRDT synchronization, which helps multiple collaborators converge on the same document state.

## Getting started

### Prerequisites

- Node.js 18 or newer (Node.js 20 LTS is a good choice).
- npm.
- MongoDB running locally or a MongoDB Atlas connection string.
- An API key for Gemini or OpenAI to use the AI copilot. The editor and room features can be explored without configuring an AI provider, but AI requests will not work.

### 1. Clone the repository

```bash
git clone https://github.com/tanayapatil26/CodeRoom-AI.git
cd CodeRoom-AI
```

### 2. Configure the backend

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and set the values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/coderoom
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
AI_MAX_PROMPT_CHARS=12000
```

Use a long, unique secret for `JWT_SECRET`. Keep real credentials only in your local `.env` file or your hosting provider's secret manager. Never commit them.

Start the backend:

```bash
npm run dev
```

The API listens on `http://localhost:5000` by default. Check `http://localhost:5000/api/health` for the health response.

### 3. Configure and start the frontend

Open a second terminal from the repository root:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). In development, Vite proxies `/api`, `/socket.io`, and `/yjs` to the backend on port 5000.

### 4. Try collaboration

1. Create an account in one browser window.
2. Create a coding room and copy its invite code or link.
3. Open a second browser profile or an incognito window and create a second account.
4. Join the room from the second account.
5. Edit the same file from both windows and check whether updates and cursors synchronize.
6. Try room chat, the preview, and AI actions after configuring an AI API key.

## Environment variables

### Server

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP server port (default: `5000`). |
| `MONGODB_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWTs. Use a unique high-entropy value. |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `7d`). |
| `CLIENT_ORIGIN` | No | Comma-separated allowed frontend origins. Defaults to the local Vite origin. |
| `AI_PROVIDER` | No | `gemini` (default) or `openai`. |
| `GEMINI_API_KEY` | For Gemini | Gemini API key. |
| `GEMINI_MODEL` | No | Gemini model name. |
| `OPENAI_API_KEY` | For OpenAI | OpenAI API key. |
| `OPENAI_MODEL` | No | OpenAI model name. |
| `AI_MAX_PROMPT_CHARS` | No | Maximum selected-code/context size used by the AI route. |

### Client

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Deployment only | Public base URL of the backend API. |
| `VITE_SOCKET_URL` | Deployment only | Backend origin used by Socket.IO. |
| `VITE_WS_URL` | Deployment only | Yjs WebSocket endpoint, for example `wss://api.example.com/yjs`. |

Vite exposes `VITE_*` values to the browser. **Never put private API keys or database credentials in client environment variables.**

## Repository structure

```text
coderoom-ai/
├── client/
│   ├── src/
│   │   ├── components/   # Editor, chat, AI panel, preview, participants
│   │   ├── hooks/        # Per-file Yjs document/provider lifecycle
│   │   ├── lib/          # API, sockets, preview runner, UI helpers
│   │   ├── pages/        # Landing, auth, dashboard, join, room
│   │   └── store/        # Auth and toast state
│   └── .env.example
├── server/
│   ├── src/
│   │   ├── config/      # MongoDB connection
│   │   ├── middleware/  # Authentication, validation, rate limits
│   │   ├── models/      # Mongoose models
│   │   ├── routes/      # Auth, rooms, files, AI APIs
│   │   ├── services/    # AI provider, room access, starter files
│   │   ├── socket/      # Socket.IO events and presence
│   │   └── yjs/         # WebSocket sync and document registry
│   └── .env.example
├── CONTRIBUTING.md
├── LICENSE
├── README.md
└── SECURITY.md
```

## Deployment overview

A typical deployment uses:

- **MongoDB:** MongoDB Atlas.
- **Backend:** A Node.js host that supports persistent WebSocket connections (for example, Render or Railway).
- **Frontend:** Vercel or Netlify.

Deployment checklist:

1. Set the production `MONGODB_URI` and a unique `JWT_SECRET` in the backend environment.
2. Set `CLIENT_ORIGIN` to the exact deployed frontend origin(s), without a trailing slash unless required by the host configuration.
3. Set `VITE_API_URL` and `VITE_SOCKET_URL` to the backend origin, and `VITE_WS_URL` to its `/yjs` WebSocket endpoint.
4. Configure the frontend host to rewrite client-side routes to `index.html`.
5. Use HTTPS/WSS and verify that the hosting provider supports WebSocket upgrades and long-lived connections.
6. Test room collaboration with two separately authenticated users after deployment.

Free hosting tiers may sleep when idle. Wake-up delays can affect the first API or WebSocket connection, so test the live demo shortly before sharing it with recruiters.

## Verification checklist

The repository should not be described as production-ready until these checks pass in the target environment.

- [ ] Install backend and frontend dependencies successfully.
- [ ] Start the backend and confirm `/api/health` responds.
- [ ] Build the frontend with `npm run build`.
- [ ] Register, sign in, refresh the page, and sign out.
- [ ] Create a room, join it from a second account, and test host/collaborator/viewer permissions.
- [ ] Edit the same file from two browser sessions and verify synchronization after reconnecting.
- [ ] Test chat, participant presence, typing indicators, and notifications.
- [ ] Test HTML/CSS/JavaScript preview and inspect console/runtime errors.
- [ ] Test AI actions with the configured provider and verify streaming/error handling.
- [ ] Check that secrets are absent from the Git history and production frontend bundle.
- [ ] Deploy and test the public application over HTTPS/WSS.

## Current limitations and next improvements

- Automated unit, integration, and browser-based end-to-end tests still need to be added.
- Version history and restore are not currently included.
- The preview currently targets browser-based HTML/CSS/JavaScript rather than a full Node.js runtime.
- Rate limiting is in-memory; a shared store such as Redis is preferable for horizontally scaled deployments.
- Large rooms and large multi-file projects need load/performance testing.

## Security

Read [SECURITY.md](SECURITY.md) before deploying or reporting a vulnerability. Do not execute untrusted code outside the provided preview sandbox, and do not commit credentials.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
