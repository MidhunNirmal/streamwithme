// RoomManager — singleton in-memory store for all active rooms

import { v4 as uuidv4 } from 'uuid';
import { Room } from './Room';

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private inviteCodeToRoomId: Map<string, string> = new Map();

  /** Generate a 6-character uppercase invite code */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // Ensure uniqueness
    if (this.inviteCodeToRoomId.has(code)) {
      return this.generateInviteCode();
    }
    return code;
  }

  createRoom(hostId: string, hostUsername: string): Room {
    const id = uuidv4();
    const inviteCode = this.generateInviteCode();
    const room = new Room(id, hostId, hostUsername, inviteCode);
    this.rooms.set(id, room);
    this.inviteCodeToRoomId.set(inviteCode, id);
    console.log(`[RoomManager] Room created: ${id} (code: ${inviteCode}) by ${hostUsername}`);
    return room;
  }

  getRoomById(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getRoomByCode(code: string): Room | undefined {
    const id = this.inviteCodeToRoomId.get(code.toUpperCase());
    if (!id) return undefined;
    return this.rooms.get(id);
  }

  /** Find which room a socket is currently in */
  getRoomByParticipantId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.participants.has(socketId)) return room;
    }
    return undefined;
  }

  deleteRoom(id: string): void {
    const room = this.rooms.get(id);
    if (room) {
      this.inviteCodeToRoomId.delete(room.inviteCode);
      this.rooms.delete(id);
      console.log(`[RoomManager] Room deleted: ${id}`);
    }
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}

// Export as singleton
export const roomManager = new RoomManager();
