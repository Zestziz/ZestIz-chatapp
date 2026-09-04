# 💬 ZestIz — Real-Time Chat & Social Messaging Platform

> A modern, full-stack real-time chat application engineered with **React 19**, **Node.js**, **Express**, **MongoDB**, **Socket.IO**, **Clerk Auth**, **Tailwind CSS**, **HeroUI**, and **Zustand**.

🌐 **Live Demo:** [https://zestiz-chatapp.onrender.com/](https://zestiz-chatapp.onrender.com/)

## 🚀 Latest Features & Updates (September 2026)

### Recent Improvements
- **Enhanced Message Editing:** Now supports editing messages with media attachments (text portion remains editable)
- **Fixed Mobile UI Stacking:** Resolved z-index issues where chat elements overlapped context menus and action overlays
- **Improved Touch Interactions:** Better long-press gesture handling with proper event isolation using React 19 portals

### Core Features
- **Message Editing & Deletion:** Edit sent messages (including those with attachments) or delete them with proper audit trails
- **Emoji Reactions:** Add reactions to any message for quick feedback
- **Voice Message Support:** Send and receive high-quality voice messages with waveform playback
- **User Mentions:** Tag users with @mentions for targeted notifications
- **Read Receipts & Delivery Status:** Track message delivery and read status with timestamps
- **Unread Message Counts:** Automatic tracking across conversations and groups
- **Advanced Message Search:** Full-text search with regex support in conversations
- **Browser Notifications:** Smart background notifications for new messages
- **Typing Indicators:** Real-time typing feedback with optional sound effects
- **Message Replies:** Threaded conversations with message quoting
- **Enhanced Group Management:** Improved admin controls, member roles, and group updates

---

## 📖 Overview

**ZestIz** is a high-performance, real-time messaging and social connection platform. Designed with a dark-first aesthetic and fluid micro-animations, it delivers instant one-to-one and group messaging, granular messaging privacy controls, an interactive friend request system, mutual friend tracking, and rich collaborative features including polls, pinned messages, media sharing, and advanced messaging capabilities.

---

## ✨ Key Features

### 💬 Real-Time Messaging
- **Instant Delivery:** Sub-millisecond message transit powered by **Socket.IO** with delivery and read status indicators.
- **Live Online Presence:** Real-time online/offline status indicators with active typing display.
- **Media & Voice Messages:** Seamless image, video, and voice message sharing backed by **ImageKit** with automatic transcoding.
- **Message Editing & Deletion:** Edit sent messages or delete them with timestamps showing edit history and deletion markers.
- **Message Reactions:** Add emoji reactions to any message for quick feedback and engagement.
- **Message Replies & Threading:** Quote and respond to specific messages within conversations to maintain context and clarity.
- **User Mentions:** Tag users with @mentions to highlight specific recipients and send targeted notifications.
- **Typing Indicators:** See when others are typing with real-time feedback and optional keyboard sound effects.
- **Read Receipts:** Track message delivery, read status, and delivery timestamps with granular precision.
- **Unread Message Counts:** Automatic tracking and display of unread message indicators across conversations.
- **Browser Notifications:** Smart background notifications for new messages when the app is minimized or in the background.
- **Group Chats:** Create and manage group conversations with multiple members, admin controls, and member management.

### 👥 Friend Request & Connection System
- **Send & Cancel Requests:** Send friend invitations directly from user cards or search results, with the ability to cancel sent requests.
- **Accept / Reject:** Fast management of incoming friend requests with real-time notifications.
- **Friends List:** Dedicated tab showing active friends with live status indicators and quick-chat actions.
- **Mutual Friends:** Dynamic computation and display of mutual friends count between users.
- **Unfriend Support:** One-click removal of friends with immediate real-time state synchronization.
- **Real-Time Notifications:** Instant updates for friend requests, acceptances, cancellations, and removals across all connected devices.

### 🚫 Block & Unblock System
- **Block Users:** Prevent unwanted interactions by blocking users from chat header menu or user list.
- **Unblock Users:** Easily unblock previously blocked users from the dedicated Blocked Users panel.
- **Privacy Enforcement:** Blocked users are automatically removed from friends list, cannot send messages, and are hidden from search results and conversations.
- **Real-Time Sync:** Socket.IO events instantly update both users' states when blocking/unblocking occurs.
- **Blocked Users Panel:** Dedicated UI panel in Friends tab to view and manage blocked users.

### 🛡️ Messaging Privacy Controls
- **Granular Restrictions:** Toggle between **Everyone** and **Friends Only** direct messaging.
- **Server-Side Enforcement:** Message delivery is strictly validated before saving and routing (returns `403 Forbidden` if sender is unauthorized).
- **Segmented Control UI:** Modern pill toggle with micro-animations and intuitive status indicators.

### 📌 Advanced Message Features
- **Pinned Messages:** Pin up to 10 important messages per conversation for quick reference. Group admins and message creators control pins in group chats.
- **Message Search:** Full-text search across group messages with regex support for finding specific content.
- **Message Replies:** Quote specific messages when responding to maintain conversation context and clarity.
- **Pinned Messages Panel:** Dedicated UI panel to view and manage all pinned messages with timestamps and author information.

### 📊 Interactive Polls
- **Create Polls:** Compose polls with questions (up to 240 characters) and 2-8 options (up to 120 chars each).
- **Real-Time Voting:** Cast and change votes instantly with live updates to all participants.
- **Poll Management:** Close polls to prevent further voting; only poll creators and group admins can close polls.
- **Validation & Uniqueness:** Automatic validation ensures unique options and proper formatting.
- **Broadcast Updates:** All poll changes broadcast instantly via Socket.IO to all conversation participants.

### 👥 Group Chat Management
- **Create Groups:** Form group conversations with connected friends, with optional group profile pictures.
- **Admin Controls:** Group owners and admins can manage members, update group details, and promote members to admin roles.
- **Member Management:** Add or remove members with eligibility checks to ensure valid connections.
- **Group Search:** Search messages within group conversations to find specific content quickly.
- **Ownership Transfer:** Group owners can transfer ownership to another admin before leaving.
- **Group Updates:** Real-time synchronization of group changes across all members' sessions.

### 🎨 Modern UI & Customization
- **Theme Presets:** Select from tailored color themes with ZestIz's purple/blue/cyan visual identity.
- **Chat Wallpapers:** Personalize chat backdrops with customizable wallpaper patterns.
- **Responsive Layout:** Optimized for desktop, tablet, and mobile views with collapsible sidebars and touch-friendly controls.
- **HeroUI & Tailwind CSS:** Accessible, accessible UI components with smooth state transitions.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 (Vite)
- **State Management:** Zustand (with persistence middleware)
- **UI Components & Styling:** HeroUI, Tailwind CSS 4, Lucide React
- **Authentication:** Clerk React
- **Real-Time Client:** Socket.IO Client
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
- **Validation:** Comprehensive server-side validation for all user inputs and operations

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
• Users: Core profiles, friend lists, blocked users, privacy settings
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
│   │   │   ├── message.controller.js     # Messages & privacy enforcement
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
│   │   └── index.js                      # Server entry point
│   └── package.json
│
├── frontend/
│   ├── public/                           # Static assets, wallpapers, typing sounds
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                     # Auth cards, headers, hero components
│   │   │   ├── chat/                     # Chat window, bubbles, input, sidebar, rows, header, media players
│   │   │   ├── friends/                  # Friends list, requests panel, privacy toggle, blocked panel
│   │   │   ├── profile/                  # User profile modal with editing capabilities
│   │   │   ├── AppLogo.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── WallpaperPicker.jsx
│   │   │   ├── AvatarWithOnlineIndicator.jsx
│   │   │   ├── ThemePresetPicker.jsx
│   │   │   ├── PageLoader.jsx
│   │   │   ├── MessageAudio.jsx          # Voice message player with waveform
│   │   │   ├── MessageVideo.jsx          # Video message player
│   │   │   ├── CreateGroupModal.jsx      # Group creation interface
│   │   │   ├── GroupDetailsModal.jsx     # Group management modal
│   │   │   ├── PinnedMessagesPanel.jsx   # Pinned messages browser
│   │   │   ├── NoConversationPlaceholder.jsx
│   │   │   ├── ConversationRow.jsx
│   │   │   └── UserRow.jsx
│   │   ├── hooks/
│   │   │   ├── useKeyboardSound.js       # Interactive typing sound effects
│   │   │   ├── useMediaQuery.js          # Responsive breakpoint detection
│   │   │   └── useScrollToBottom.js      # Auto-scroll for new messages
│   │   │   ├── context/
│   │   │   ├── theme.js                  # Theme configuration and presets
│   │   │   ├── ThemeContext.jsx          # Theme switching with persistence
│   │   │   ├── wallpaper.js              # Wallpaper pattern definitions
│   │   │   └── WallpaperContext.jsx      # Wallpaper selection context
│   │   ├── data/
│   │   │   ├── herouiThemePresets.js     # Custom HeroUI theme configurations
│   │   │   └── wallpapers.js             # Wallpaper pattern and color data
│   │   ├── lib/
│   │   │   ├── axios.js                  # Axios instance with auth headers
│   │   │   ├── imagekit.js               # ImageKit upload utilities
│   │   │   └── utils.js                  # Formatting and utility functions
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx              # Authentication landing page
│   │   │   └── ChatPage.jsx              # Main chat interface with routing
│   │   ├── store/
│   │   │   ├── useAuthStore.js           # Auth state, online users, socket connections
│   │   │   ├── useChatStore.js           # Messages, conversations, groups, UI state, media handling
│   │   │   └── useFriendStore.js         # Friends, requests, blocked users, privacy, real-time sync
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
| `GET` | `/api/messages/:id` | Fetch message history with a specific user |
| `GET` | `/api/messages/search/:userId` | Search messages with a user using regex queries |
| `GET` | `/api/messages/pinned/:userId` | Get pinned messages for a private conversation |
| `POST` | `/api/messages/send/:id` | Send a text or media message (enforces privacy permissions) |
| `POST` | `/api/messages/:id/read` | Mark all messages in a conversation as read |
| `POST` | `/api/messages/:messageId/reaction` | Add or remove emoji reactions to a message |
| `PATCH` | `/api/messages/:messageId` | Edit an existing message text |
| `DELETE` | `/api/messages/:messageId` | Delete a message (soft delete with tombstone) |
| `POST` | `/api/messages/:messageId/poll/vote` | Vote on a poll option |
| `PATCH` | `/api/messages/:messageId/poll/close` | Close a poll to prevent further voting |
| `PATCH` | `/api/messages/:messageId/pin` | Pin or unpin a message |

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

### 👥 Groups (`/api/groups`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/groups` | List all groups the user is a member of |
| `POST` | `/api/groups` | Create a new group with connected friends |
| `GET` | `/api/groups/:groupId/messages` | Fetch message history for a group |
| `POST` | `/api/groups/:groupId/messages` | Send a message to a group |
| `POST` | `/api/groups/:groupId/messages/search` | Search messages within a group |
| `PUT` | `/api/groups/:groupId` | Update group name or profile picture (admins only) |
| `PUT` | `/api/groups/:groupId/members` | Manage group members (add/remove/leave) |
| `PUT` | `/api/groups/:groupId/admins/:userId` | Promote a member to admin (owner only) |

### 📊 Polls (`/api/polls`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/polls/private/:id` | Create a poll in a private conversation |
| `POST` | `/api/polls/group/:groupId` | Create a poll in a group |
| `POST` | `/api/polls/:messageId/vote` | Vote on a poll option |
| `POST` | `/api/polls/:messageId/close` | Close a poll (creator or group admin only) |

### 📌 Pinned Messages (`/api/pins`)
| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/pins/:messageId` | Pin or unpin a message (supports optional groupId for group pins) |
| `GET` | `/api/pins/user/:userId` | Get pinned messages for a private conversation |
| `GET` | `/api/pins/group/:groupId` | Get pinned messages for a group |

### ⚡ Socket.IO Events
- **Client to Server:** `connection`, `disconnect`, `typing`, `stopTyping`, `groupTyping`, `groupStopTyping`
- **Server to Client:**
  - `getOnlineUsers`: Broadcasts list of active user IDs.
  - `newMessage`: Emits incoming chat messages to recipient with full metadata.
  - `messageDelivered`: Notifies sender that message was delivered to recipient.
  - `messagesRead`: Notifies sender when recipient reads messages.
  - `messageReactionUpdated`: Broadcasts emoji reaction changes to all participants.
  - `messageUpdated`: Notifies when a message is edited with new content.
  - `messageDeleted`: Notifies when a message is deleted (soft delete with timestamp).
  - `newGroupMessage`: Emits new messages to all group members with full context.
  - `groupUpdated`: Notifies group members of updates (name, members, admins, profile picture).
  - `groupRemoved`: Notifies user when removed from a group.
  - `groupTyping`: Displays who is typing in group conversations.
  - `groupStopTyping`: Clears typing indicator in group conversations.
  - `newFriendRequest`: Notifies recipient of new friend invitations.
  - `friendRequestAccepted`: Alerts sender that request was accepted.
  - `friendRequestCancelled`: Notifies target when an invitation is cancelled.
  - `friendRemoved`: Updates client when unfriended.
  - `userBlocked`: Notifies user that they have been blocked.
  - `pollUpdated`: Broadcasts poll changes (votes, closes) to all participants.
  - `messagePinUpdated`: Notifies conversation participants of pin/unpin events.
  - `userMentioned`: Alerts user when they are mentioned in a message with browser notification.

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
