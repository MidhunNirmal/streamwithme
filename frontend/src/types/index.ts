// Shared TypeScript types mirroring backend Room model

export interface Participant {
  id: string;
  username: string;
  isHost: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

export interface ChatMessage {
  id: string;
  participantId: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface RoomPermissions {
  allowProgressControl: boolean;
  allowChat: boolean;
  allowMic: boolean;
}

export interface SyncState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  lastUpdated: number;
  updatedBy: string;
  serverTime?: number;
  duration?: number;
}

export interface RoomInfo {
  id: string;
  inviteCode: string;
  participants: Participant[];
  permissions: RoomPermissions;
  sync: SyncState;
  chatHistory: ChatMessage[];
}
