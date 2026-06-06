// Socket.IO event handlers — all real-time logic lives here

import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { roomManager } from '../rooms/RoomManager';
import { ChatMessage, Participant, Room, RoomPermissions } from '../rooms/Room';

function getRoomPayload(room: Room) {
  return {
    id: room.id,
    inviteCode: room.inviteCode,
    participants: room.getParticipantsArray(),
    permissions: room.permissions,
    sync: room.sync,
    chatHistory: room.chatHistory,
  };
}

function normalizedUsername(value: string | undefined, fallback: string): string {
  const username = (value || fallback).trim().slice(0, 30);
  return username || fallback;
}

export function registerSocketHandlers(io: Server, socket: Socket): void {
  const log = (event: string, data?: unknown) =>
    console.log(`[Socket ${socket.id}] ${event}`, data ?? '');

  // ─── ROOM: CREATE ──────────────────────────────────────────────────────────
  socket.on('room:create', (payload: { username: string }, callback: Function) => {
    const existingRoom = roomManager.getRoomByParticipantId(socket.id);
    if (existingRoom) {
      handleLeave(socket, io);
    }

    const username = normalizedUsername(payload?.username, 'Host');
    const room = roomManager.createRoom(socket.id, username);
    socket.join(room.id);
    log('room:create', { roomId: room.id, code: room.inviteCode });

    callback({
      success: true,
      roomId: room.id,
      inviteCode: room.inviteCode,
      room: getRoomPayload(room),
    });
  });

  // ─── ROOM: JOIN ────────────────────────────────────────────────────────────
  socket.on('room:join', (payload: { code?: string; roomId?: string; username: string }, callback: Function) => {
    const username = normalizedUsername(payload?.username, 'Viewer');

    // Support both invite code and direct room ID
    const room = payload.code
      ? roomManager.getRoomByCode(payload.code)
      : payload.roomId
      ? roomManager.getRoomById(payload.roomId)
      : undefined;

    if (!room) {
      return callback({ success: false, error: 'Room not found or has ended.' });
    }

    const existingRoom = roomManager.getRoomByParticipantId(socket.id);
    if (existingRoom?.id === room.id) {
      return callback({
        success: true,
        roomId: room.id,
        inviteCode: room.inviteCode,
        room: getRoomPayload(room),
      });
    }
    if (existingRoom) {
      handleLeave(socket, io);
    }

    const participant: Participant = {
      id: socket.id,
      username,
      isHost: false,
      isMuted: true,
      isSpeaking: false,
      joinedAt: Date.now(),
    };

    room.addParticipant(participant);
    socket.join(room.id);

    // Notify all others in the room
    socket.to(room.id).emit('room:participantJoined', { participant });

    // Send a system chat message
    const joinMsg: ChatMessage = {
      id: uuidv4(),
      participantId: 'system',
      username: 'System',
      text: `${username} joined the room`,
      timestamp: Date.now(),
    };
    room.addChatMessage(joinMsg);
    io.to(room.id).emit('chat:message', joinMsg);

    log('room:join', { roomId: room.id, username });

    callback({
      success: true,
      roomId: room.id,
      inviteCode: room.inviteCode,
      room: getRoomPayload(room),
    });
  });

  // ─── ROOM: LEAVE ───────────────────────────────────────────────────────────
  socket.on('room:leave', () => handleLeave(socket, io));
  socket.on('disconnect', () => handleLeave(socket, io));

  // ─── CHAT: MESSAGE ─────────────────────────────────────────────────────────
  socket.on('chat:message', (payload: { text: string }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;
    if (!room.permissions.allowChat) {
      if (!participant.isHost) return; // only host can chat when disabled
    }

    const msg: ChatMessage = {
      id: uuidv4(),
      participantId: socket.id,
      username: participant.username,
      text: (payload.text || '').trim().slice(0, 500),
      timestamp: Date.now(),
    };

    if (!msg.text) return;

    room.addChatMessage(msg);
    io.to(room.id).emit('chat:message', msg);
    log('chat:message', msg.text.slice(0, 40));
  });

  // ─── SYNC: PLAY / PAUSE / SEEK / SPEED ────────────────────────────────────
  const requireHostOrPermission = (room: ReturnType<typeof roomManager.getRoomById>) => {
    if (!room) return false;
    const p = room.participants.get(socket.id);
    if (!p) return false;
    return p.isHost || room.permissions.allowProgressControl;
  };

  socket.on('sync:play', (payload: { currentTime: number }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room || !requireHostOrPermission(room)) return;
    const currentTime = Number.isFinite(payload.currentTime) ? Math.max(0, payload.currentTime) : 0;

    room.updateSync({ isPlaying: true, currentTime, updatedBy: socket.id });
    socket.to(room.id).emit('sync:play', {
      currentTime,
      serverTime: Date.now(),
      updatedBy: socket.id,
    });
    log('sync:play', currentTime);
  });

  socket.on('sync:pause', (payload: { currentTime: number }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room || !requireHostOrPermission(room)) return;
    const currentTime = Number.isFinite(payload.currentTime) ? Math.max(0, payload.currentTime) : 0;

    room.updateSync({ isPlaying: false, currentTime, updatedBy: socket.id });
    socket.to(room.id).emit('sync:pause', {
      currentTime,
      serverTime: Date.now(),
    });
    log('sync:pause', currentTime);
  });

  socket.on('sync:seek', (payload: { currentTime: number }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room || !requireHostOrPermission(room)) return;
    const currentTime = Number.isFinite(payload.currentTime) ? Math.max(0, payload.currentTime) : 0;

    room.updateSync({ currentTime, updatedBy: socket.id });
    socket.to(room.id).emit('sync:seek', {
      currentTime,
      serverTime: Date.now(),
    });
    log('sync:seek', currentTime);
  });

  socket.on('sync:speed', (payload: { playbackRate: number }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room || !requireHostOrPermission(room)) return;

    const rate = Math.min(Math.max(payload.playbackRate, 0.25), 4);
    room.updateSync({ playbackRate: rate, updatedBy: socket.id });
    socket.to(room.id).emit('sync:speed', { playbackRate: rate });
    log('sync:speed', rate);
  });

  socket.on('sync:duration', (payload: { duration: number }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room || !requireHostOrPermission(room)) return;
    const duration = Number.isFinite(payload.duration) ? Math.max(0, payload.duration) : 0;

    room.updateSync({ duration, updatedBy: socket.id });
    socket.to(room.id).emit('sync:duration', { duration });
    log('sync:duration', duration);
  });


  // ─── WEBRTC SIGNALING: VIDEO STREAM ───────────────────────────────────────
  // Host → Viewer relay for the video stream (host's local file captureStream)
  socket.on('stream:offer', (payload: { targetId: string; offer: Record<string, unknown> }) => {
    log('stream:offer → ', payload.targetId);
    io.to(payload.targetId).emit('stream:offer', {
      fromId: socket.id,
      offer: payload.offer,
    });
  });

  socket.on('stream:answer', (payload: { targetId: string; answer: Record<string, unknown> }) => {
    log('stream:answer → ', payload.targetId);
    io.to(payload.targetId).emit('stream:answer', {
      fromId: socket.id,
      answer: payload.answer,
    });
  });

  socket.on('stream:ice', (payload: { targetId: string; candidate: Record<string, unknown> }) => {
    io.to(payload.targetId).emit('stream:ice', {
      fromId: socket.id,
      candidate: payload.candidate,
    });
  });

  socket.on('stream:requestReconnect', () => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room) return;
    io.to(room.hostId).emit('stream:requestReconnect', { guestId: socket.id });
    log('stream:requestReconnect', `from guest ${socket.id} to host ${room.hostId}`);
  });

  // ─── WEBRTC SIGNALING: VOICE CHAT ─────────────────────────────────────────
  socket.on('voice:offer', (payload: { targetId: string; offer: Record<string, unknown> }) => {
    log('voice:offer → ', payload.targetId);
    io.to(payload.targetId).emit('voice:offer', {
      fromId: socket.id,
      offer: payload.offer,
    });
  });

  socket.on('voice:answer', (payload: { targetId: string; answer: Record<string, unknown> }) => {
    io.to(payload.targetId).emit('voice:answer', {
      fromId: socket.id,
      answer: payload.answer,
    });
  });

  socket.on('voice:ice', (payload: { targetId: string; candidate: Record<string, unknown> }) => {
    io.to(payload.targetId).emit('voice:ice', {
      fromId: socket.id,
      candidate: payload.candidate,
    });
  });

  // Host triggers this to tell all guests to initiate voice with them
  socket.on('voice:startSession', () => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room) return;
    socket.to(room.id).emit('voice:startSession', { fromId: socket.id });
  });

  // ─── VOICE: STATUS ─────────────────────────────────────────────────────────
  socket.on('voice:speaking', (payload: { isSpeaking: boolean }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room) return;
    const p = room.participants.get(socket.id);
    if (p) p.isSpeaking = payload.isSpeaking;
    socket.to(room.id).emit('voice:speaking', { participantId: socket.id, isSpeaking: payload.isSpeaking });
  });

  socket.on('voice:mute', (payload: { isMuted: boolean }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room) return;
    const p = room.participants.get(socket.id);
    if (p) p.isMuted = payload.isMuted;
    io.to(room.id).emit('voice:mute', { participantId: socket.id, isMuted: payload.isMuted });
  });

  // ─── ADMIN: REMOVE PARTICIPANT ────────────────────────────────────────────
  socket.on('admin:removeParticipant', (payload: { targetId: string }) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room || room.hostId !== socket.id) return; // host only

    const target = room.participants.get(payload.targetId);
    if (!target) return;

    room.removeParticipant(payload.targetId);
    io.sockets.sockets.get(payload.targetId)?.leave(room.id);
    io.to(payload.targetId).emit('room:kicked', { reason: 'Removed by host' });
    io.to(room.id).emit('room:participantLeft', { participantId: payload.targetId });
    log('admin:removeParticipant', payload.targetId);
  });

  // ─── ADMIN: UPDATE PERMISSIONS ────────────────────────────────────────────
  socket.on('admin:setPermissions', (payload: Partial<RoomPermissions>) => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room || room.hostId !== socket.id) return;

    room.permissions = {
      allowProgressControl: payload.allowProgressControl ?? room.permissions.allowProgressControl,
      allowChat: payload.allowChat ?? room.permissions.allowChat,
      allowMic: payload.allowMic ?? room.permissions.allowMic,
    };
    io.to(room.id).emit('room:permissionsUpdated', room.permissions);
    log('admin:setPermissions', room.permissions);
  });

  // ─── ADMIN: END ROOM ──────────────────────────────────────────────────────
  socket.on('admin:endRoom', () => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room || room.hostId !== socket.id) return;

    io.to(room.id).emit('room:ended', { message: 'The host has ended the session.' });
    // Disconnect all sockets from the room
    io.in(room.id).socketsLeave(room.id);
    roomManager.deleteRoom(room.id);
    log('admin:endRoom');
  });

  // ─── SYNC: REQUEST STATE (guest asking current position) ──────────────────
  socket.on('sync:requestState', () => {
    const room = roomManager.getRoomByParticipantId(socket.id);
    if (!room) return;
    socket.emit('sync:state', { ...room.sync, serverTime: Date.now() });
  });
}

// ─── LEAVE HELPER ──────────────────────────────────────────────────────────────
function handleLeave(socket: Socket, io: Server): void {
  const room = roomManager.getRoomByParticipantId(socket.id);
  if (!room) return;

  const participant = room.removeParticipant(socket.id);
  if (!participant) return;

  console.log(`[Socket ${socket.id}] left room ${room.id}`);
  socket.leave(room.id);

  // If host left → end the room
  if (room.hostId === socket.id) {
    io.to(room.id).emit('room:ended', { message: 'The host has left. Session ended.' });
    io.in(room.id).socketsLeave(room.id);
    roomManager.deleteRoom(room.id);
    return;
  }

  // Otherwise just notify others
  const leaveMsg: ChatMessage = {
    id: uuidv4(),
    participantId: 'system',
    username: 'System',
    text: `${participant.username} left the room`,
    timestamp: Date.now(),
  };
  room.addChatMessage(leaveMsg);
  io.to(room.id).emit('chat:message', leaveMsg);
  io.to(room.id).emit('room:participantLeft', { participantId: socket.id });
}
