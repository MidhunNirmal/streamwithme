// Room model — in-memory representation of a watch party

export interface Participant {
  id: string;          // socket.id
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
  currentTime: number;      // seconds
  playbackRate: number;
  lastUpdated: number;      // server timestamp ms
  updatedBy: string;        // socket.id of last controller
  duration?: number;        // total duration in seconds
}

export class Room {
  public id: string;
  public hostId: string;
  public participants: Map<string, Participant>;
  public chatHistory: ChatMessage[];
  public permissions: RoomPermissions;
  public sync: SyncState;
  public createdAt: number;
  public inviteCode: string;  // 6-char alphanumeric

  constructor(id: string, hostId: string, hostUsername: string, inviteCode: string) {
    this.id = id;
    this.hostId = hostId;
    this.inviteCode = inviteCode;
    this.createdAt = Date.now();
    this.chatHistory = [];
    this.permissions = {
      allowProgressControl: true,
      allowChat: true,
      allowMic: false,
    };
    this.sync = {
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1,
      lastUpdated: Date.now(),
      updatedBy: hostId,
    };
    this.participants = new Map();
    this.participants.set(hostId, {
      id: hostId,
      username: hostUsername,
      isHost: true,
      isMuted: false,
      isSpeaking: false,
      joinedAt: Date.now(),
    });
  }

  addParticipant(participant: Participant): void {
    this.participants.set(participant.id, participant);
  }

  removeParticipant(socketId: string): Participant | undefined {
    const p = this.participants.get(socketId);
    this.participants.delete(socketId);
    return p;
  }

  getParticipantsArray(): Participant[] {
    return Array.from(this.participants.values());
  }

  addChatMessage(msg: ChatMessage): void {
    this.chatHistory.push(msg);
    // Keep last 200 messages
    if (this.chatHistory.length > 200) {
      this.chatHistory.shift();
    }
  }

  updateSync(state: Partial<SyncState>): void {
    this.sync = { ...this.sync, ...state, lastUpdated: Date.now() };
  }
}
