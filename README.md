# 💬 ZestIz — Real-Time Chat & Social Messaging Platform

> A modern, full-stack real-time chat application engineered with **React 19**, **Node.js**, **Express**, **MongoDB**, **Socket.IO**, **Clerk Auth**, **Tailwind CSS 4**, **HeroUI**, and **Zustand**.

🌐 **Live Demo:** [https://zestiz-chatapp.onrender.com/](https://zestiz-chatapp.onrender.com/)

## 🚀 Latest Features & Updates (September 2026)

- **Rebuilt Group Chat Architecture:** Full-screen mobile bottom sheets (`100dvh`), multi-admin permission hierarchy (peer admins can kick/demote each other, owner is completely untouchable), seamless ownership transfer flows, and auto-cleanup on exit.
- **Full-Screen Media Lightbox:** Interactive modal with pan-and-drag, mouse-wheel zoom, mobile pinch-to-zoom, and floating glassmorphic toolbar controls for seamless media viewing.
- **Touch Gestures & Mobile Experience:** Native long-press (hold 750–1000ms) with haptic feedback to delete/clear chats; continuous keyboard focus retention during messaging.
- **Reaction Inspector:** Interactive viewer modal displaying user profiles and avatars for each emoji reaction in real time.
- **Conversation Management ("Delete for Me"):** Clear chat history for direct and group conversations with `$addToSet: deletedFor` backend persistence ensuring state isolation between users.
- **High-Performance Caching & SWR:** Zustand store-level dictionary caching (`messagesByChatId`), ImageKit CDN dynamic transformations, pure WebSocket transport (`transports: ['websocket']`), and zero-latency optimistic UI messaging.

---

## 📖 Overview

**ZestIz** is a high-performance, real-time messaging and social connection platform. Designed with a dark-first aesthetic, fluid micro-animations, and uncompromised mobile ergonomics, it delivers instant one-to-one and group messaging, granular messaging privacy controls, an interactive friend request system, and rich collaborative features including polls, pinned messages, and seamless media sharing.

---

## ✨ Key Features

### 💬 Real-Time Messaging & Performance
- **Zero-Latency Delivery:** Sub-millisecond message transit powered by **Socket.IO** pure WebSocket transport with delivery/read receipts.
- **Live Online Presence:** Real-time online/offline status indicators with active typing display.
- **Message Editing & Deletion:** Edit sent messages or delete them securely with proper audit trails and timestamps.
- **Browser Notifications:** Smart background notifications for new messages when the app is minimized.

### 👥 Group Chat & Sovereign Management
- **Hierarchical Roles:** Complete multi-admin structure. The sovereign owner holds ultimate control, while promoted admins can kick, demote, or manage other members. 
- **Ownership Transfer:** Owners can seamlessly transfer ultimate ownership to another member before leaving a group.
- **Real-Time Sync:** Debounced member search and instant payload broadcasting for name, avatar, and role synchronization across all connected clients.

### 👆 Touch & Mobile Ergonomics
- **Dynamic Viewports:** Interfaces responsive to mobile constraints utilizing `100dvh` and safe-area padding (`pb-safe`) for edge-to-edge screens.
- **Native Gestures:** Custom `useLongPress` hooks to activate native-feeling touch-and-hold menus (like long-press to delete a conversation).
- **Scroll Containment:** Perfected focus rendering where inputs don't blur unexpectedly when scrolling on mobile. 

### 🖼️ Interactive Media & Attachments
- **Full-Screen Lightbox:** High-performance, zoomable, and draggable full-screen image previews with a dynamic glassmorphic overlay.
- **On-the-Fly Optimization:** Backend seamlessly integrated with ImageKit CDN for automatic thumbnail compression, transcoding, and rapid delivery of images, audio, and video messages.

### 🚫 Privacy, Connections & Blocking
- **Messaging Privacy:** Toggle between **Everyone** and **Friends Only** (server-enforced with `403` status drops).
- **Blocking System:** Full bidirectional blocking preventing interactions, hiding search results, and triggering live disconnection events.
- **Friends Graph:** Sophisticated friend request architecture determining mutual connections out of the box.

### 📌 Interactive Elements
- **Emoji Reactions & Inspector:** React to anything. Check exactly who reacted with what emoji via the bottom-sheet Reaction Inspector.
- **Live Polls:** Real-time polling with secure vote state broadcasting and creator-only closing rights.
- **Pinned Messages:** Up to 10 persistent pinned messages per conversation managed via dedicated fly-out panels.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 (Vite)
- **State Management:** Zustand (with persistence middleware & dictionary catching)
- **UI Components & Styling:** HeroUI, Tailwind CSS 4, Lucide React
- **Authentication:** Clerk React
- **Real-Time Client:** Socket.IO Client (Pure WebSocket)
- **HTTP Client:** Axios
- **Notifications:** React Hot Toast

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Database & ODM:** MongoDB, Mongoose 9
- **Authentication & Webhooks:** Clerk Express SDK
- **WebSockets:** Socket.IO
- **File & Media Handling:** Multer, ImageKit Node.js SDK
- **Scheduled Tasks:** Cron

### Deployment & DevOps
- **Hosting:** Render
- **Containerization:** Multi-stage Docker build

---

## 🏗️ Architecture

ZestIz uses a modular full-stack architecture with separated backend and frontend packages, designed for seamless containerized monolithic deployment in production.

```text
Browser Client (React 19 / Zustand / HeroUI)
   │
   ├── Clerk Authentication ──────────────────────────┐
   │                                                 │
   ├── REST API Requests (Axios) ──────────────────┐  │
   │                                               ▼  ▼
   └── WebSockets (Socket.IO-Client) ──────► Express API Server
                                                   │
                  ┌──────────────────────────────────┼───────────────────────────────────┐
                  ▼                                  ▼                                   ▼
         MongoDB Atlas                        ImageKit CDN                     Clerk Webhooks
   (Users, Friends, Messages, Groups)    (Chat Media Assets)           (User Lifecycle Sync)

Database Schema Highlights:
• Users: Core profiles, friend lists, blocked users, privacy settings, online status
• Messages: Chat history, polls, replies, pins, reactions, edits, deletions, read receipts
• Groups: Group metadata, members, admins, ownership, profile pictures
• Polls: Embedded within messages with voting data and user participation tracking
```

---

## 📁 Project Structure

```text
ZestIz/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js        # Auth state verification
│   │   │   ├── friend.controller.js      # Friend requests, mutual count, privacy, block/unblock
│   │   │   ├── group.controller.js       # Group creation, management, member roles
│   │   │   ├── message.controller.js     # Messages, conversation clearing & privacy
│   │   │   ├── pin.controller.js         # Message pinning functionality
│   │   │   └── poll.controller.js        # Poll creation, voting, closing
│   │   ├── lib/
│   │   │   ├── cron.js                   # Scheduled background tasks
│   │   │   ├── db.js                     # MongoDB connection handler
│   │   │   ├── imagekit.js               # Media upload utilities
│   │   │   └── socket.js                 # Socket.IO connection & user socket map
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js        # Clerk JWT verification & user attach
│   │   │   └── upload.middleware.js      # Multer file handling
│   │   ├── models/
│   │   │   ├── group.model.js            # Group chat schema with members, admins, owner
│   │   │   ├── message.model.js          # Chat message schema (text, media, polls, pins, replies)
│   │   │   └── user.model.js             # User, friends, requests, blocked users, privacy schema
│   │   ├── routes/
│   │   │   ├── auth.route.js             # Auth endpoints
│   │   │   ├── friend.route.js           # Friend management & block/unblock endpoints
│   │   │   ├── group.route.js            # Group CRUD and member management endpoints
│   │   │   └── message.route.js          # Chat & conversation endpoints
│   │   ├── webhooks/
│   │   │   └── clerk.webhook.js          # Clerk webhook sync handler
│   │   └── index.js                      # Server entry point (Global crash protection)
│   └── package.json
│
├── frontend/
│   ├── public/                           # Static assets, wallpapers, typing sounds
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                     # Auth cards, headers, hero components
│   │   │   ├── chat/                     # Chat window, bubbles, input, sidebar, rows, header
│   │   │   │   ├── CreateGroupModal.jsx
│   │   │   │   ├── GroupDetailsModal.jsx
│   │   │   │   ├── ImageViewerModal.jsx       # Full-screen touch-enabled media lightbox
│   │   │   │   ├── DeleteConversationModal.jsx # Conversation clearing interface
│   │   │   │   ├── ReactionDetailsModal.jsx   # Emoji reaction inspector
│   │   │   │   ├── PinnedMessagesPanel.jsx
│   │   │   │   ├── MessageAudio.jsx           # Voice message player with waveform
│   │   │   │   └── MessageVideo.jsx
│   │   │   ├── friends/                  # Friends list, requests panel, blocked panel
│   │   │   ├── profile/                  # User profile modal with editing capabilities
│   │   │   ├── AppLogo.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   └── WallpaperPicker.jsx
│   │   ├── hooks/
│   │   │   ├── useKeyboardSound.js       # Interactive typing sound effects
│   │   │   ├── useMediaQuery.js          # Responsive breakpoint detection
│   │   │   ├── useLongPress.js           # Native touch-and-hold gestures
│   │   │   └── useScrollToBottom.js      # Auto-scroll for new messages
│   │   ├── context/
│   │   │   ├── ThemeContext.jsx          # Theme switching with persistence
│   │   │   └── WallpaperContext.jsx      # Wallpaper selection context
│   │   ├── data/
│   │   │   ├── herouiThemePresets.js     # Custom HeroUI theme configurations
│   │   │   └── wallpapers.js             # Wallpaper pattern and color data
│   │   ├── lib/
│   │   │   ├── axios.js                  # Axios instance with auth headers
│   │   │   ├── imagekit.js               # ImageKit optimization and blob utilities
│   │   │   └── utils.js                  # Formatting and utility functions
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx              # Authentication landing page
│   │   │   └── ChatPage.jsx              # Main chat interface with routing
│   │   ├── store/
│   │   │   ├── useAuthStore.js           # Auth state, online users, socket connections
│   │   │   ├── useChatStore.js           # Messages dictionary cache, UI loops
│   │   │   └── useFriendStore.js         # Friends, requests, blocked users
│   │   ├── App.jsx                       # Main app component with routing
│   │   └── main.jsx                      # Entry point with Clerk auth provider
│   └── package.json
│
├── Dockerfile                            # Production multi-stage build definition
└── README.md
```

---

## 🔌 API Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/check` | Returns authenticated user profile and privacy settings |

### 💬 Messages (`/api/messages`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/messages/users` | List all system users for discovery |
| `GET` | `/api/messages/conversations` | List existing conversations with latest message and unread counts |
| `DELETE` | `/api/messages/conversations/:targetUserId` | Clear entire 1-on-1 chat history for current user |
| `GET` | `/api/messages/:id` | Fetch message history with a specific user |
| `GET` | `/api/messages/search/:userId` | Search messages with a user using regex queries |
| `GET` | `/api/messages/pinned/:userId` | Get pinned messages for a private conversation |
| `POST` | `/api/messages/send/:id` | Send a text or media message (enforces privacy permissions) |
| `POST` | `/api/messages/:id/read` | Mark all messages in a conversation as read |
| `POST` | `/api/messages/:messageId/reaction` | Add or remove emoji reactions to a message |
| `PATCH` | `/api/messages/:messageId` | Edit an existing message text |
| `DELETE` | `/api/messages/:messageId` | Delete a message (soft delete with tombstone) |

### 👥 Groups (`/api/groups`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/groups` | List all groups the user is a member of |
| `POST` | `/api/groups` | Create a new group with connected friends |
| `GET` | `/api/groups/:groupId/messages` | Fetch message history for a group |
| `DELETE`| `/api/groups/:groupId/messages/clear` | Clear group chat messages history for current user |
| `POST` | `/api/groups/:groupId/messages` | Send a message to a group |
| `POST` | `/api/groups/:groupId/messages/search` | Search messages within a group |
| `PUT` | `/api/groups/:groupId` | Update group name or profile picture (admins only) |
| `POST` | `/api/groups/:groupId/members` | Manage group members and transfer sovereign ownership |
| `PATCH`| `/api/groups/:groupId/members/:userId/role`| Toggle multi-admin promote/demote (owner/admin only) |

*(Note: Ownership transfer and member additions are routed via the unified `POST /members` endpoint in the backend, while role toggling happens via the `PATCH /role` endpoint.)*

### 👥 Friends & Privacy (`/api/friends`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/friends` | Get list of confirmed friends |
| `GET` | `/api/friends/pending` | Get incoming and outgoing pending friend requests |
| `GET` | `/api/friends/blocked` | Get list of blocked users |
| `GET` | `/api/friends/mutual/:id` | Compute mutual friends count with target user |
| `POST` | `/api/friends/request/:id` | Send a friend request |
| `POST` | `/api/friends/accept/:id` | Accept an incoming friend request |
| `POST` | `/api/friends/reject/:id` | Reject an incoming friend request |
| `POST` | `/api/friends/cancel/:id` | Cancel a sent friend request |
| `POST` | `/api/friends/remove/:id` | Unfriend a user |
| `POST` | `/api/friends/block/:id` | Block a user (removes from friends, clears requests) |
| `POST` | `/api/friends/unblock/:id` | Unblock a previously blocked user |
| `PUT` | `/api/friends/privacy` | Update message privacy (`everyone` \| `friends_only`) |

### 📊 Polls (`/api/polls`) & 📌 Pins (`/api/pins`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/polls/private/:id` | Create a poll in a private conversation |
| `POST` | `/api/polls/group/:groupId` | Create a poll in a group |
| `POST` | `/api/polls/:messageId/vote` | Vote on a poll |
| `PATCH`| `/api/polls/:messageId/close` | Close a poll |
| `PUT` | `/api/pins/:messageId` | Pin or unpin a message |

### ⚡ Socket.IO Events
- **Client to Server:** `connection`, `disconnect`, `typing`, `stopTyping`, `groupTyping`, `groupStopTyping`
- **Server to Client:**
  - `getOnlineUsers`: Broadcasts list of active user IDs.
  - `newMessage`: Emits incoming chat messages to recipient. Dynamically triggers instant sidebar conversation insertion for first-time contacts.
  - `messageReactionUpdated`: Reactively tracks emoji updates, broadcasting emoji removals and additions sequentially for immediate DOM updates.
  - `messageDelivered` / `messagesRead`: Read receipt tracking.
  - `messageUpdated` / `messageDeleted`: Real-time editing and deletion markers.
  - `newGroupMessage`: Broadcasts to all group members.
  - `groupUpdated` / `groupRemoved`: Name, role, membership, and ownership sync dynamically.
  - `newFriendRequest` / `friendRequestAccepted` / `friendRequestCancelled` / `friendRemoved`: Full friend lifecycle sync via sockets.
  - `userBlocked`: Immediate access revocation payload.
  - `pollUpdated`: Vote and close events synchronized.
  - `messagePinUpdated`: Notifies of pin/unpin events.
  - `userMentioned`: Alerts user when mentioned.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account or local MongoDB instance
- [Clerk](https://clerk.com/) account for user authentication
- [ImageKit](https://imagekit.io/) account for media uploads

---

### Installation & Local Setup

#### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/ZestIz-chatapp.git
cd ZestIz-chatapp
```

#### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=3000
FRONTEND_URL=http://localhost:5173

MONGO_URI=your_mongodb_connection_string

CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SIGNING_SECRET=your_clerk_webhook_signing_secret

IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
```

Start the backend development server:
```bash
npm run dev
```

#### 3. Frontend Setup
Open a new terminal tab and navigate to `frontend/`:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

Start the Vite development server:
```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🐳 Production Deployment

ZestIz includes a multi-stage Docker build that compiles the React 19 frontend into static assets served directly by the Express backend.

### Docker Build
```bash
docker build \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key \
  -t zestiz-chatapp .
```

### Docker Run
```bash
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e MONGO_URI=your_mongodb_connection_string \
  -e CLERK_SECRET_KEY=your_clerk_secret_key \
  -e CLERK_WEBHOOK_SIGNING_SECRET=your_clerk_webhook_signing_secret \
  -e IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key \
  zestiz-chatapp
```

### Render Deployment
1. Connect your GitHub repository to [Render](https://render.com/).
2. Select **Web Service** using the Docker runtime.
3. Configure your environment variables in the Render dashboard.
4. Supply `VITE_CLERK_PUBLISHABLE_KEY` as a build argument.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

---

## 👨‍💻 Author

Developed with ❤️ by **ZestIz Team**.  
*Connect. Chat. Stay close.*
