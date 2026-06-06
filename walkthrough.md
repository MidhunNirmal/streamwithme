# StreamWithMe — Implementation Walkthrough

## What Was Built

The HTML prototype (`main.html`) has been fully converted to a **React + TypeScript** app with a complete **Node.js backend**.

---

## Project Structure

```
streamwithme/
├── frontend/                    ← React + TypeScript + Vite + Tailwind v4
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx  (/, hero + features + footer)
│   │   │   ├── ViewingRoom.tsx  (/room/:roomId)
│   │   │   └── AdminDashboard.tsx (/admin/:roomId)
│   │   ├── components/
│   │   │   ├── Navbar.tsx        (top nav + create/join modals)
│   │   │   ├── JoinRoomModal.tsx (invite code entry)
│   │   │   ├── VideoPlayer.tsx   (video + sync controls)
│   │   │   ├── ChatPanel.tsx     (real-time chat feed)
│   │   │   ├── ParticipantList.tsx
│   │   │   └── PermissionToggles.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts     (connection lifecycle)
│   │   │   ├── useRoom.ts       (participants, chat, permissions)
│   │   │   ├── useSync.ts       (playback sync with drift correction)
│   │   │   ├── useWebRTC.ts     (video streaming)
│   │   │   └── useVoice.ts      (voice chat + speaking detection)
│   │   ├── services/
│   │   │   ├── socket.ts        (Socket.IO singleton)
│   │   │   └── api.ts           (REST helpers)
│   │   └── types/index.ts       (shared TypeScript types)
│
└── backend/                     ← Node.js + Express + Socket.IO
    └── src/
        ├── server.ts            (main entry point, port 3001)
        ├── rooms/
        │   ├── Room.ts          (room model)
        │   └── RoomManager.ts   (in-memory singleton store)
        ├── socket/
        │   └── handlers.ts      (all Socket.IO events)
        └── routes/
            └── api.ts           (REST endpoints)
```

---

## How to Run

### Terminal 1 — Backend
```bash
cd streamwithme/backend
npm run dev
# → Running on http://localhost:3001
```

### Terminal 2 — Frontend
```bash
cd streamwithme/frontend
npm run dev
# → Running on http://localhost:5174
```

---

## User Flow

### Host Flow
1. Visit `/` → click **Create Room**
2. Enter your name → room created, redirected to `/admin/:roomId`
3. Share the **6-character invite code** or copy invite link
4. Click **Open Viewing Room** → go to `/room/:roomId`
5. Click **Choose File** → pick a local MP4/MKV/MOV/WebM
6. Video starts playing — all guests receive the stream via WebRTC

### Guest Flow
1. Visit `/` → click **Join Room**
2. Enter the 6-character code and a display name
3. Redirected to `/room/:roomId`
4. See the video stream from the host
5. Chat in real-time, participate in voice chat

---

## Socket.IO Events Reference

| Event | Direction | Description |
|---|---|---|
| `room:create` | Client→Server | Create a room (host only) |
| `room:join` | Client→Server | Join by code or roomId |
| `room:leave` | Client→Server | Leave room |
| `room:ended` | Server→Client | Room destroyed (host left) |
| `room:kicked` | Server→Client | Participant was removed |
| `room:participantJoined` | Server→All | New viewer joined |
| `room:participantLeft` | Server→All | Viewer left |
| `room:permissionsUpdated` | Server→All | Permissions changed |
| `chat:message` | Both | Send/receive chat message |
| `sync:play` | Both | Play event with timestamp |
| `sync:pause` | Both | Pause event with timestamp |
| `sync:seek` | Both | Seek event |
| `sync:speed` | Both | Playback speed change |
| `sync:requestState` | Client→Server | Request current playback state |
| `sync:state` | Server→Client | Current playback state |
| `stream:offer/answer/ice` | Both | WebRTC signaling for video |
| `voice:offer/answer/ice` | Both | WebRTC signaling for voice |
| `voice:startSession` | Client→Server | Start voice with peers |
| `voice:speaking` | Both | Speaking indicator |
| `voice:mute` | Both | Mute status |
| `admin:removeParticipant` | Client→Server | Host removes a viewer |
| `admin:setPermissions` | Client→Server | Host updates permissions |
| `admin:endRoom` | Client→Server | Host ends session |

---

## REST API

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Server health check |
| `/api/rooms/:id` | GET | Get room info by ID |
| `/api/rooms/code/:code` | GET | Resolve invite code → room ID |

---

## Key Technical Decisions

- **Video streaming**: Host's local `<video>` element uses `captureStream()` → WebRTC `RTCPeerConnection` → guests receive stream. No file is uploaded anywhere.
- **Sync drift correction**: Server timestamps embedded in sync events. If local time drifts >500ms from expected, video seeks automatically.
- **Voice chat**: Per-peer WebRTC audio connections. `AudioContext` + `AnalyserNode` detect speaking (avg frequency > threshold).
- **Room cleanup**: Host disconnect → room deleted, all guests notified and redirected.
- **No auth**: Temporary usernames stored in `localStorage`. Rooms are invite-code-only.

> [!NOTE]
> The `@tailwindcss/vite` plugin (Tailwind v4) is used instead of the traditional PostCSS config. All design tokens are defined using `@theme` in `index.css`.

---

## UI Alignment and Spacing Fixes

Several UI layout and styling issues were corrected to perfectly match the original `main.html` design:

1. **Sidebar Layout & Overlap Resolution**:
   - Converted the right sidebar in [ViewingRoom.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/pages/ViewingRoom.tsx) from an absolute `fixed` overlay to a standard flex container child.
   - This ensures the main video player section shrinks correctly to fit `100vw - 360px` width, preventing the sidebar from overlapping or obscuring the video controls, room info bar, copy code badge, and avatar stack.
   - Removed duplicate `pt-[72px]` padding from the sidebar as the flex layout naturally places it below the header.
   - Added `overflow-hidden` to the sidebar container so that the chat feed (which has `flex-grow overflow-y-auto`) handles the scroll correctly instead of pushing the footer down and cutting it off.

2. **Sidebar Color & Readability Typo Fixes**:
   - Replaced all instances of `text-[#22293d]` (which was a dark theme background color mistakenly used for text) with `text-[#cbc3d7]` (a light grayish-purple).
   - This fixes the visibility of inactive sidebar tabs (Participants, Settings, History) and the bottom "Help" button in both [ViewingRoom.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/pages/ViewingRoom.tsx) and [AdminDashboard.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/pages/AdminDashboard.tsx).

### Screenshots

#### Viewing Room
![Viewing Room Layout](C:/Users/midhu/.gemini/antigravity-ide/brain/bde4ce56-daa3-4153-8a27-1cb2acd446bd/viewing_room_alignment_1780763081599.png)

#### Admin Dashboard
![Admin Dashboard Layout](C:/Users/midhu/.gemini/antigravity-ide/brain/bde4ce56-daa3-4153-8a27-1cb2acd446bd/admin_dashboard_full_1780763051937.png)

---

## Guest Progress Bar & Timeline Fix

A critical bug was fixed where the Guest/Viewer's progress bar was showing `LIVE` (or `0:00 / LIVE`) and could not be clicked to seek.

### Root Cause
Since the guest receives the video as a live WebRTC `MediaStream` (srcObject), the browser's video element treats it as a live feed:
- `video.duration` is `Infinity`.
- `video.currentTime` counts from 0 when connected, independent of the actual movie.
- The UI checks `Number.isFinite(duration)` before showing the progress bar, showing `LIVE` instead.
- Seeking is disabled on WebRTC media streams since you cannot directly seek them (`video.currentTime = newTime` fails).

### Solution Implemented

1. **Duration Synchronization**:
   - Added `duration` to the shared `SyncState` interface in both [Room.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/backend/src/rooms/Room.ts) and [index.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/types/index.ts).
   - Added a `sync:duration` handler to the backend [handlers.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/backend/src/socket/handlers.ts) to update and broadcast the total video duration to the room.
   - When the Host loads the video, they calculate the local file's duration and emit a `sync:duration` event.

2. **Guest Playhead Interpolation**:
   - Created a local timeline state in [useSync.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/hooks/useSync.ts) for guests (`syncedTime`, `syncedDuration`, `isPlaying`, `playbackRate`).
   - For guests, a 250ms periodic timer calculates the correct position: `lastSyncedTime + (elapsedTimeSinceLastSync * playbackRate)`.
   - Incoming seek/play/pause socket events reset this playhead and apply network-latency correction (using `serverTime`).

3. **Control Routing & Seek Actions**:
   - Updated [VideoPlayer.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/components/VideoPlayer.tsx) to read from `syncedTime` and `syncedDuration` when the user is a guest.
   - The progress bar and timestamps display the correct synced values (e.g., `0:15 / 2:30`) instead of `LIVE`.
   - When a guest seeks (if permitted), the client emits `sync:seek` to the server. The Host receives the event and seeks their local video file. The WebRTC stream immediately captures the new frames and sends them to all guests, while the guests' local timelines jump to the new position.

4. **"Resync" Stream Reconnection**:
   - Added a **"Resync"** button to the [VideoPlayer.tsx](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/components/VideoPlayer.tsx) controls row, visible only to guests.
   - Clicking this triggers `resyncStream()` in [useWebRTC.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/hooks/useWebRTC.ts), which closes the local peer connection and emits `stream:requestReconnect`.
   - The backend relays this request to the Host's socket.
   - The Host receives the event, cleans up their old peer connection with that guest, and calls `offerStreamToGuest` to negotiate a fresh, clean WebRTC stream, resolving any black screens or frozen feeds on the fly.

---

## H.265/HEVC Video Encoding Support

We added H.265/HEVC encoding preference to the WebRTC video stream to provide high-quality stream compression when supported by both devices.

### Implementation Details
1. **Helper Function `prioritizeHEVC`**:
   - Created a helper function in [useWebRTC.ts](file:///c:/Users/midhu/OneDrive/Desktop/streamwithme/frontend/src/hooks/useWebRTC.ts) that checks the browser's video encoding and decoding capabilities via `RTCRtpReceiver.getCapabilities('video')`.
   - If any codec with mimetype matching `/h265|hevc/i` is available, we sort the codecs array so that HEVC is placed at the top of the list.
   - It then sets the transceiver's codec preferences to this sorted array via `setCodecPreferences`.

2. **Integration on Host & Guest**:
   - **Host side**: Prioritizes HEVC codecs in the transceiver after adding the local stream tracks but before generating the SDP Offer.
   - **Guest side**: Prioritizes HEVC codecs on the incoming video transceiver after setting the Remote Description (Offer) but before creating the SDP Answer.

3. **Automatic Fallback**:
   - If either the host browser or the guest browser does not support HEVC (e.g. Firefox, or Chrome without OS-level extensions), the HEVC codec is simply omitted from the capabilities list, and the WebRTC engine automatically falls back to negotiating standard codecs like `H.264` or `VP8`.



