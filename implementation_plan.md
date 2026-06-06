# StreamWithMe — HTML → React + Full Backend

## Overview

Convert the existing 3-page HTML prototype (`main.html`) into a **full-stack React + TypeScript app** with a **Node.js/Express/Socket.IO backend**. The HTML prototype contains three screens: Landing Page, Admin Dashboard, and Viewing Room. All existing UI/design must be preserved 1:1.

## Architecture

```
streamwithme/
├── frontend/          ← React + TypeScript + Tailwind CSS (Vite)
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.tsx       (Hero, Features, Footer)
│       │   ├── AdminDashboard.tsx    (Room controls, participants)
│       │   └── ViewingRoom.tsx       (Video player + chat sidebar)
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── ChatPanel.tsx
│       │   ├── ParticipantList.tsx
│       │   ├── VideoPlayer.tsx
│       │   ├── PermissionToggles.tsx
│       │   └── VoiceControls.tsx
│       ├── hooks/
│       │   ├── useSocket.ts          (Socket.IO connection)
│       │   ├── useWebRTC.ts          (Peer streaming logic)
│       │   ├── useRoom.ts            (Room state)
│       │   └── useSync.ts            (Playback sync)
│       ├── context/
│       │   └── RoomContext.tsx       (Global room state)
│       ├── services/
│       │   └── api.ts                (REST API calls)
│       └── App.tsx                   (Router: / | /room/:id | /admin/:id)
│
└── backend/           ← Node.js + Express + Socket.IO
    └── src/
        ├── server.ts                 (Express + Socket.IO entrypoint)
        ├── rooms/
        │   ├── RoomManager.ts        (In-memory room store)
        │   └── Room.ts               (Room model)
        ├── signaling/
        │   └── WebRTCSignaling.ts    (offer/answer/ice relay)
        ├── socket/
        │   └── handlers.ts           (All Socket.IO event handlers)
        └── routes/
            └── api.ts                (REST: create room, join room)
```

## Proposed Changes

---

### Frontend — New React Project

#### [NEW] `frontend/` — Vite + React + TypeScript + Tailwind

Bootstrap with `npx create-vite@latest frontend -- --template react-ts`

**Pages** (converted from 3 HTML sections):
- `/` — Landing Page (Hero + Features + Footer)
- `/room/:roomId` — Viewing Room (video player + chat sidebar)
- `/admin/:roomId` — Admin Dashboard (participants + permissions)

**Key React conversions:**
- All `class=` → `className=`
- Tailwind config replicated in `tailwind.config.ts`
- Custom CSS (`.glass-panel`, `.glow-primary`, etc.) in `index.css`
- Material Symbols font in `index.html`
- Scroll effects / micro-animations → `useEffect` hooks
- Button hover → React state or CSS-only
- Static chat messages → dynamic from Socket.IO
- Static participants → dynamic from Socket.IO

---

### Backend — New Node.js Server

#### [NEW] `backend/src/server.ts`
Express + Socket.IO server on port 3001. Handles:
- HTTP REST routes for room creation/joining
- Socket.IO event relay for: chat, sync, voice signaling, WebRTC

#### [NEW] `backend/src/rooms/RoomManager.ts`
In-memory `Map<roomId, Room>`. Rooms auto-expire when host disconnects.

#### [NEW] `backend/src/rooms/Room.ts`
Room model: `{ id, hostId, participants[], chatHistory[], permissions, createdAt }`

#### [NEW] `backend/src/signaling/WebRTCSignaling.ts`
Relay `offer`, `answer`, `ice-candidate` events between peers for both:
1. **Video streaming** — host streams local file via WebRTC `MediaSource` / `createObjectURL`
2. **Voice chat** — peer-to-peer audio tracks

#### [NEW] `backend/src/socket/handlers.ts`
All Socket.IO event handlers:
- `room:create` → generate room code, store, return invite link
- `room:join` → validate code, add participant, broadcast join
- `room:leave` / disconnect → clean up, broadcast leave
- `chat:message` → broadcast to room with timestamp
- `sync:play`, `sync:pause`, `sync:seek`, `sync:speed` → broadcast to all peers
- `voice:offer`, `voice:answer`, `voice:ice` → relay WebRTC signals
- `stream:offer`, `stream:answer`, `stream:ice` → relay host stream
- `participant:remove` (admin only) → kick participant
- `room:end` (host only) → destroy room, disconnect all

#### [NEW] `backend/src/routes/api.ts`
REST endpoints:
- `POST /api/rooms` — create room
- `GET /api/rooms/:id` — get room info
- `POST /api/rooms/:id/join` — validate & join

---

### Frontend Hooks & Services

#### [NEW] `useSocket.ts`
Wraps Socket.IO client connection with auto-reconnect.

#### [NEW] `useWebRTC.ts`
- Host: reads local File → creates MediaStream → streams via RTCPeerConnection
- Guest: receives stream → feeds into `<video>` element

#### [NEW] `useSync.ts`
- Listens for sync events from Socket.IO
- Applies play/pause/seek to video element
- Drift correction: compares server timestamp → seeks if >500ms off

#### [NEW] `useRoom.ts`
Manages room state: participants, permissions, chat messages.

---

## Real-Time Event Flow

```
Host picks file → createObjectURL → MediaStream → RTCPeerConnection offer
  → signaling server (Socket.IO) → guests receive answer
  → guests render <video srcObject={stream} />

Host presses play → sync:play { timestamp, serverTime }
  → all guests: videoRef.play() + drift correction

Chat message → chat:message { user, text, timestamp }
  → broadcast to room → append to chat state
```

## Verification Plan

### Automated
- `npm run build` — TypeScript compile check (frontend + backend)
- ESLint — no type errors

### Manual
1. Open `/` — Landing page renders identically to HTML prototype
2. Click "Create Room" → navigates to `/admin/:id`, room code generated
3. Open `/room/:id` in a second browser tab → joins as guest
4. Host selects a `.mp4` file → streams to guest via WebRTC
5. Host presses play → guest video syncs within 1s
6. Chat message sent → appears in both tabs in real time
7. Host ends session → guest redirected to landing page

## Open Questions

> [!IMPORTANT]
> **Video file streaming approach**: The browser's `getUserMedia` / `captureStream()` API can stream a local `<video>` element playing a local file. This avoids any server upload. Should I use this approach (simpler, works in-browser) or a direct WebRTC data channel stream?

> [!NOTE]
> The backend will run on `localhost:3001` and the frontend on `localhost:5173` for local development. CORS will be configured accordingly. Do you plan to deploy this? If so, I can add Docker + deployment instructions.
