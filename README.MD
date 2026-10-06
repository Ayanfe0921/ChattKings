# ChattKings

ChattKings is a real-time chat and social workspace built with React, Express, MongoDB, Clerk, and Socket.IO. It supports private and group conversations, media sharing, voice and video calls, posts, quotes, countdowns, and chat customization.

## Features

- Clerk authentication with user profiles synchronized to MongoDB.
- Real-time one-to-one messaging, read status, replies, reactions, pins, stickers, and media messages.
- Group chats with member management and group message history.
- A shared group task board with real-time task updates.
- Group polls with up to six options and one vote per member; members can change their vote.
- Downloadable JSON exports for private and group conversation history.
- Contacts can be blocked at any time. Blocking prevents messages in both directions.
- A user can report another account while blocking it. Ten reports from ten distinct ChattKings accounts automatically suspend the reported account. Repeat reports from the same account count once. A suspended account is denied access to authenticated backend routes and must register with a different email address to create another account.
- Conversations and messages are stored in MongoDB. Signing out does not delete them; signing back in and opening a conversation loads its saved history. Messages deleted by a user or deleted for everyone follow the deletion behavior selected in chat.
- Socket.IO presence, chat updates, and voice/video call signaling.
- Posts, quotes, AI chat, countdowns and reminders, media streaks, themes, and wallpapers.
- Optional ImageKit storage for chat media.

## Requirements

- Node.js 20 or newer
- MongoDB
- Clerk application credentials
- ImageKit credentials for image, video, and audio uploads

## Configuration

Create `back-end/.env`:

```env
PORT=3001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/chattkings
FRONTEND_URL=http://localhost:5173
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SIGNING_SECRET=your_clerk_webhook_signing_secret
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
```

Configure the Clerk React publishable key in the frontend's Clerk setup. Set `VITE_SERVER_URL` in `front-end/.env` if the backend is not available at the development default `http://localhost:3001`:

```env
VITE_SERVER_URL=http://localhost:3001
```

In Clerk, configure the webhook endpoint as `https://YOUR_BACKEND/api/webhooks/clerk` and subscribe to `user.created`, `user.updated`, and `user.deleted`. The webhook signing secret is `CLERK_WEBHOOK_SIGNING_SECRET`.

## Run locally

Install dependencies in both applications:

```sh
cd back-end
npm install
npm run dev
```

In another terminal:

```sh
cd front-end
npm install
npm run dev
```

Open the Vite URL printed in the frontend terminal. The backend health check is available at `/health`.

## Production build

Build the frontend and backend:

```sh
cd front-end
npm run build
cd ../back-end
npm run build
npm start
```

The backend serves the built frontend from `front-end/dist` when deployed with the repository's directory layout. Configure the production `FRONTEND_URL`, Clerk keys, MongoDB URI, and any media provider credentials in the deployment environment.

## Project layout

```text
back-end/
  src/controllers/  HTTP handlers and application logic
  src/models/       Mongoose data models
  src/routs/        Express API routes
  src/middleware/   Authentication and upload middleware
  src/lib/          Database, Socket.IO, and service helpers
front-end/
  src/components/   Chat, authentication, and shared UI
  src/pages/        Main application pages
  src/store/        Zustand application state
```

## Account reports and suspensions

Selecting **Block** alone blocks that contact without submitting a report. Selecting **Also report to ChattKings** submits one report associated with the reporter's account. The backend enforces one report per reporter/target pair and suspends the target once ten unique reports exist. Suspension is checked on authenticated API requests, so an existing Clerk session cannot continue using the ChattKings API. A new account requires a different email because user email addresses are unique in the application database.

## Message history

Private and group messages are persisted in MongoDB. The frontend also caches recently loaded conversations for offline access, while the server remains the source of truth when online. Signing out does not remove server-side message history.

## Further product work

- Add end-to-end encryption with clear multi-device key recovery so only conversation members can read private messages.
- Add encrypted message backups and retention controls. Conversation export is available now; end-to-end encryption is not yet implemented.
- Build stronger safety tooling around reports: moderator review, appeal handling, and protection against coordinated or mistaken reports.
- Add shared plans to group conversations; polls and the shared task board are available now.
- Expand accessibility and low-bandwidth support with keyboard navigation and voice-note transcripts. Data saver is available in chat and uses smaller media previews with deferred video loading.

