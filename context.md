# StreamWithMe — Project Context & Code Directory

This document provides a comprehensive technical reference for the **StreamWithMe** codebase, outlining the architecture, the purpose of each file, and detailing specific editing guidelines for future development.

---

## 🏗️ Project Architecture Map

```text
streamwithme/
├── backend/                       ← Node.js + Express + Socket.IO server
│   ├── src/
│   │   ├── server.ts              (HTTP server entry point, WebSockets configuration)
│   │   ├── rooms/
│   │   │   ├── Room.ts            (Data models for Room, Participant, and SyncState)
│   │   │   └── RoomManager.ts     (In-memory storage & lifecycle manager for watch rooms)
│   │   ├── routes/
│   │   │   └── api.ts             (REST endpoints: health check and room status resolving)
│   │   └── socket/
│   │       └── handlers.ts        (WebSocket events handling: chat, sync, WebRTC relays)
│   ├── tsconfig.json
│   └── package.json
│
└── frontend/                      ← React + TypeScript + Vite + Tailwind CSS (v4) web client
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.tsx    (App homepage / lobby, room creation entry point)
    │   │   ├── ViewingRoom.tsx    (The video-watching, voice-chatting, and texting panel)
    │   │   └── AdminDashboard.tsx (Host settings: permission toggles, audience control)
    │   ├── components/
    │   │   ├── Navbar.tsx         (Global navbar + Modal handlers)
    │   │   ├── JoinRoomModal.tsx  (Overlay modal for inputting invite code)
    │   │   ├── VideoPlayer.tsx    (HTML5 player container + WebRTC track wrapper + custom controls)
    │   │   ├── ChatPanel.tsx      (Sidebar messaging feed)
    │   │   ├── ParticipantList.tsx(User directory showing mic activity and host controls)
    │   │   └── PermissionToggles.tsx (Admin dashboard switch controls)
    │   ├── hooks/
    │   │   ├── useSocket.ts       (Status tracking of connection to Socket.IO)
    │   │   ├── useRoom.ts         (Synchronizes participants, chat history, permissions)
    │   │   ├── useSync.ts         (Synchronized player events with network delay alignment)
    │   │   ├── useWebRTC.ts       (Host peer-to-peer screen capture & streaming relays)
    │   │   └── useVoice.ts        (Peer-to-peer audio nodes + analyser-based speech detection)
    │   ├── services/
    │   │   ├── socket.ts          (Global Socket.IO client singleton + connectAndEmit helper)
    │   │   └── api.ts             (REST client helpers)
    │   ├── types/
    │   │   └── index.ts           (Shared TypeScript interface definitions)
    │   ├── App.tsx                (Route registration & joining redirect router)
    │   ├── main.tsx               (Vite entrypoint)
    │   └── index.css              (Tailwind imports & global custom style design tokens)
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## 📂 Backend File Directory

### `backend/src/`

#### 📄 [server.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/backend/src/server.ts)
*   **Purpose**: The entry point for the backend server. Bootstraps an Express HTTP server integrated with a Socket.IO WebSocket server.
*   **Key Responsibilities**:
    *   Configures CORS settings to accept incoming requests from the frontend client.
    *   Registers REST API routes and ties WebSocket connections to the custom event handlers.
    *   Increases `maxHttpBufferSize` to `10MB` to handle the payload sizes of WebRTC signaling.
*   **Editing Tips**: If CORS or proxy problems occur, adjust `FRONTEND_URL`. If you add new middleware, do it before registering `apiRouter`.

---

### `backend/src/rooms/`

#### 📄 [Room.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/backend/src/rooms/Room.ts)
*   **Purpose**: Contains the data classes, structures, and schemas representing a Watch Room, its Participants, and its SyncState.
*   **Key Responsibilities**:
    *   Defines interfaces for `Participant`, `ChatMessage`, `RoomPermissions`, and `SyncState`.
    *   Implements the `Room` class containing methods to add/remove users, store the last 200 chat messages, and update playback synchronization.
*   **Editing Tips**: To add new attributes (e.g., custom avatars, user roles, secondary permissions), append them to the constructor and corresponding type interfaces here first.

#### 📄 [RoomManager.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/backend/src/rooms/RoomManager.ts)
*   **Purpose**: An in-memory store containing all active Watch Rooms. Acts as a singleton manager.
*   **Key Responsibilities**:
    *   Generates unique, clean, 6-character uppercase alphanumeric room invite codes (e.g. `HJK234`).
    *   Provides lookup helpers: resolving rooms by ID, invite code, or participant Socket ID.
    *   Handles room destruction (`deleteRoom`) when the host leaves or disconnects.
*   **Editing Tips**: If switching to Redis or MongoDB for session persistence, replace the local `private rooms` map inside `RoomManager` with a database client.

---

### `backend/src/routes/`

#### 📄 [api.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/backend/src/routes/api.ts)
*   **Purpose**: Exposes HTTP REST routes for standard querying operations.
*   **Key Endpoints**:
    *   `GET /api/health` — Basic health check containing active room counts.
    *   `GET /api/rooms/:id` — Retreives details for a specific room ID.
    *   `GET /api/rooms/code/:code` — Resolves an invite code back to a roomId.
*   **Editing Tips**: Add any new administrative check routes or room password validations here.

---

### `backend/src/socket/`

#### 📄 [handlers.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/backend/src/socket/handlers.ts)
*   **Purpose**: The central nervous system of the backend's real-time features. Handles all incoming WebSocket events.
*   **Key Responsibilities**:
    *   **Room Lifecycle**: Handles `room:create`, `room:join`, and connection cleanup (`disconnect`).
    *   **Text Chat**: Distributes messages through `chat:message` and pushes system announcements.
    *   **Playback Sync**: Relays video play (`sync:play`), pause (`sync:pause`), seek (`sync:seek`), and playback speed (`sync:speed`) changes.
    *   **WebRTC Relays**: Transparently pipes video stream signals (`stream:offer`, `stream:answer`, `stream:ice`) and voice signals (`voice:offer`, `voice:answer`, `voice:ice`) to targeting sockets.
*   **Editing Tips**: When adding a new feature that communicates in real-time, register the listener inside `registerSocketHandlers(io, socket)` and broadcast updates using `socket.to(roomId).emit(...)`.

---

## 📂 Frontend File Directory

### `frontend/src/`

#### 📄 [App.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/App.tsx)
*   **Purpose**: App router setup using `react-router-dom`. Includes a custom `JoinRedirect` helper component to handle joining a room via a sharing link (e.g. `/join/ABCDEF`).
*   **Editing Tips**: Add any global route-based components (like a modal provider) here.

#### 📄 [index.css](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/index.css)
*   **Purpose**: Custom styling tokens built with Tailwind v4. Defines typography (Montserrat & Inter), shadows, glassmorphism panels, speaking indicators, and custom scrollbars.
*   **Editing Tips**: Update the `@theme` block if you want to alter the default color palettes, sizing rules, or border radius constants.

#### 📄 [types/index.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/types/index.ts)
*   **Purpose**: TypeScript definitions used across the React client. Strictly mirrors the data models of the backend.

---

### `frontend/src/services/`

#### 📄 [socket.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/services/socket.ts)
*   **Purpose**: Holds the Socket.IO client connection singleton.
*   **Key Functions**:
    *   `connectAndEmit`: A vital helper that prevents connection race conditions by checking `socket.connected` and queuing emits until the connection is fully established.
*   **Editing Tips**: Use `connectAndEmit` for initialization events (like joining a room) to prevent silent payload dropouts on initial render.

#### 📄 [api.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/services/api.ts)
*   **Purpose**: Client-side fetch helpers targeting the backend REST endpoints.

---

### `frontend/src/hooks/`

#### 📄 [useSocket.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/hooks/useSocket.ts)
*   **Purpose**: Tracks and exposes the connection status of the global Socket (`connecting` | `connected` | `disconnected` | `error`).

#### 📄 [useRoom.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/hooks/useRoom.ts)
*   **Purpose**: Syncs global room details, chat history lists, active viewer directories, and admin permissions into reactive local state.
*   **Editing Tips**: When adding new fields to room configuration, update the listeners for `room:participantJoined`, `room:participantLeft`, and `chat:message` in this hook.

#### 📄 [useSync.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/hooks/useSync.ts)
*   **Purpose**: Ensures all users see the video at the exact same millisecond.
*   **Key Responsibilities**:
    *   Computes and corrects latency drift: `networkDelay = (Date.now() - state.serverTime) / 1000`. If local time drifts by more than `500ms`, it triggers a silent seek to sync.
    *   Exposes helpers (`emitPlay`, `emitPause`, `emitSeek`, `emitSpeed`) which emit changes only if the user has controls permission.
*   **Editing Tips**: If seeking feels too aggressive, you can adjust the `DRIFT_THRESHOLD_MS` constant.

#### 📄 [useWebRTC.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/hooks/useWebRTC.ts)
*   **Purpose**: Orchestrates the zero-upload video streaming layout.
*   **Key Responsibilities**:
    *   **Host**: Plays the file inside a hidden video element and runs `captureStream()` to get track nodes, adding them to an `RTCPeerConnection` for each guest.
    *   **Guest**: Establishes a peer connection, listens to track arrivals via `ontrack`, and pipes the incoming stream directly into a `<video>` element's `srcObject`.
*   **Editing Tips**: If peer connections fail to handshake, check the `ICE_SERVERS` config array.

#### 📄 [useVoice.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/hooks/useVoice.ts)
*   **Purpose**: Built-in WebRTC-based voice channel supporting push-to-talk and voice activation modes.
*   **Key Responsibilities**:
    *   Requests browser microphone permission and sets up an `AudioContext` and `AnalyserNode` to compute volume frequencies.
    *   Triggers `voice:speaking` events to notify the room when a user's vocal volume threshold is exceeded.
    *   Sets up per-peer audio streaming connections and appends virtual `<audio>` tags to the DOM.
*   **Editing Tips**: Adjust the `speaking = avg > 15` threshold if voice indicators are too sensitive or not sensitive enough.

---

### `frontend/src/pages/`

#### 📄 [LandingPage.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/pages/LandingPage.tsx)
*   **Purpose**: The lobby page containing the intro, features, and the primary "Create Room" / "Join Room" buttons.

#### 📄 [AdminDashboard.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/pages/AdminDashboard.tsx)
*   **Purpose**: The dashboard page for the Host. Shows participant grids, toggles for chat/mic permissions, connection health charts, and allows the host to kick users or end rooms.

#### 📄 [ViewingRoom.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/pages/ViewingRoom.tsx)
*   **Purpose**: The central watch party container.
*   **Key Layout Elements**:
    *   **Video Section (Left)**: Side-by-side flex layout displaying `<VideoPlayer />` and the Room Info metadata block. Takes `flex-grow` width (`100vw - 360px`).
    *   **Sidebar Section (Right)**: Standard flex column child (`w-[360px] overflow-hidden`) containing tab switches for Chat (`<ChatPanel />`), Users (`<ParticipantList />`), Settings, and History.

---

### `frontend/src/components/`

#### 📄 [Navbar.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/components/Navbar.tsx)
*   **Purpose**: The main application navbar. Manages local username states and creates/triggers the join and create room overlay dialogs.

#### 📄 [JoinRoomModal.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/components/JoinRoomModal.tsx)
*   **Purpose**: Small glassmorphic modal overlays allowing users to enter a 6-character room code to join watch parties.

#### 📄 [VideoPlayer.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/components/VideoPlayer.tsx)
*   **Purpose**: Handles video rendering and encapsulates playback control indicators (Play/Pause, volume sliders, timeline seekbars, fullscreen triggers). Handles file picking logic for hosts.

#### 📄 [ChatPanel.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/components/ChatPanel.tsx)
*   **Purpose**: Renders chat messages, participant labels, message input fields, and emoji/attachment buttons.

#### 📄 [ParticipantList.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/components/ParticipantList.tsx)
*   **Purpose**: Displays users, mic mute icons, speaking animations, and administrative moderation buttons (e.g. Kick).

#### 📄 [PermissionToggles.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/components/PermissionToggles.tsx)
*   **Purpose**: Simple custom toggles used in the Admin Dashboard to toggle room privileges.

---

## 🛠️ Key Real-Time Flows

### 1. WebRTC Video Flow
```text
[Host File Selected] 
    ↓
Play in hidden video 
    ↓
captureStream() → MediaStream
    ↓
For each guest: 
   pc = new RTCPeerConnection()
   pc.addTrack(stream)
   pc.createOffer()
   socket.emit('stream:offer', offer)
    ↓
[Signaling Relay Server]
    ↓
[Guest]
   pc = new RTCPeerConnection()
   pc.setRemoteDescription(offer)
   pc.createAnswer()
   socket.emit('stream:answer', answer)
   pc.ontrack = (event) => video.srcObject = event.streams[0]
```

### 2. Time Synchronization Flow
```text
[Participant triggers Play/Pause/Seek]
    ↓
Emit 'sync:play/pause/seek' + { currentTime }
    ↓
[Server]
Appends serverTime (Date.now())
Broadcasts to room
    ↓
[Other Participants]
Calculates networkDelay = (currentClientTime - serverTime) / 1000
Computes expectedTime = currentTime + networkDelay
If drift > 500ms:
    Sets video.currentTime = expectedTime
Executes video.play() or video.pause()
```

---

## 💡 Important Coding Guidelines & Gotchas

1.  **Tailwind v4 theme colors**:
    Always rely on CSS variables or design tokens defined inside `@theme` block in `index.css`. Avoid hardcoding absolute colors (e.g., standard Tailwind colors like `bg-red-500` or arbitrary hexes) if there's a theme variable configured for it.
2.  **Connection Handshake Lifecycles**:
    Vite's hot-module-replacement (HMR) and React's double-render in strict mode can trigger connection instabilities. Always use the `connectAndEmit` method from [socket.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/services/socket.ts) when emitting messages immediately upon mounting a component.
3.  **Sidebar Flex constraints**:
    Never style the sidebar as `fixed` inside the `ViewingRoom.tsx` page layout. It must remain a normal flex column child with `shrink-0` and `overflow-hidden` so it sits side-by-side with the video container, ensuring that no element overlap or sidebar cutoffs occur.
4.  **Browser Media Rules**:
    Browsers forbid autoplaying video or audio with sound without user interaction. The `useVoice` hook handles this by muting by default when joining, and `useSync` handles play catch exceptions cleanly.
