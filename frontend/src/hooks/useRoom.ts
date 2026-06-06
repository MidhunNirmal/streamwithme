// useRoom — manages room state (participants, permissions, chat)

import { useState, useEffect, useCallback } from 'react';
import socket from '../services/socket';
import type { ChatMessage, Participant, RoomInfo, RoomPermissions } from '../types';

export function useRoom() {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [permissions, setPermissions] = useState<RoomPermissions>({
    allowProgressControl: true,
    allowChat: true,
    allowMic: false,
  });
  const [myId, setMyId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (socket.id) setMyId(socket.id);
    const handleConnect = () => setMyId(socket.id ?? '');
    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, []);

  // Initialize room state from server response
  const initRoom = useCallback((roomData: RoomInfo, amHost: boolean) => {
    setRoom(roomData);
    setParticipants(roomData.participants);
    setChatMessages(roomData.chatHistory || []);
    setPermissions(roomData.permissions);
    setIsHost(amHost);
  }, []);

  useEffect(() => {
    // New participant joined
    const handleParticipantJoined = ({ participant }: { participant: Participant }) => {
      setParticipants(prev => {
        if (prev.find(p => p.id === participant.id)) return prev;
        return [...prev, participant];
      });
    };

    // Participant left
    const handleParticipantLeft = ({ participantId }: { participantId: string }) => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    };

    // New chat message
    const handleChatMessage = (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    };

    // Permissions updated
    const handlePermissionsUpdated = (perms: RoomPermissions) => {
      setPermissions(perms);
    };

    // Voice status updates
    const handleSpeaking = ({ participantId, isSpeaking }: { participantId: string; isSpeaking: boolean }) => {
      setParticipants(prev =>
        prev.map(p => p.id === participantId ? { ...p, isSpeaking } : p)
      );
    };

    const handleMute = ({ participantId, isMuted }: { participantId: string; isMuted: boolean }) => {
      setParticipants(prev =>
        prev.map(p => p.id === participantId ? { ...p, isMuted } : p)
      );
    };

    socket.on('room:participantJoined', handleParticipantJoined);
    socket.on('room:participantLeft', handleParticipantLeft);
    socket.on('chat:message', handleChatMessage);
    socket.on('room:permissionsUpdated', handlePermissionsUpdated);
    socket.on('voice:speaking', handleSpeaking);
    socket.on('voice:mute', handleMute);

    return () => {
      socket.off('room:participantJoined', handleParticipantJoined);
      socket.off('room:participantLeft', handleParticipantLeft);
      socket.off('chat:message', handleChatMessage);
      socket.off('room:permissionsUpdated', handlePermissionsUpdated);
      socket.off('voice:speaking', handleSpeaking);
      socket.off('voice:mute', handleMute);
    };
  }, []);

  const sendMessage = useCallback((text: string) => {
    socket.emit('chat:message', { text });
  }, []);

  const removeParticipant = useCallback((targetId: string) => {
    socket.emit('admin:removeParticipant', { targetId });
  }, []);

  const updatePermissions = useCallback((perms: Partial<RoomPermissions>) => {
    socket.emit('admin:setPermissions', perms);
    setPermissions(prev => ({ ...prev, ...perms }));
  }, []);

  const endRoom = useCallback(() => {
    socket.emit('admin:endRoom');
  }, []);

  return {
    room,
    participants,
    chatMessages,
    permissions,
    myId,
    isHost,
    initRoom,
    sendMessage,
    removeParticipant,
    updatePermissions,
    endRoom,
  };
}
