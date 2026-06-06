// useVoice — WebRTC-based voice chat (similar to Discord)
// Supports push-to-talk and always-on modes

import { useRef, useCallback, useEffect, useState } from 'react';
import socket from '../services/socket';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useVoice(roomId: string | undefined) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Get microphone access ─────────────────────────────────────────────────
  const joinVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      // Mute by default
      stream.getAudioTracks().forEach(t => { t.enabled = false; });

      // Set up audio analyser for speaking detection
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      source.connect(analyserRef.current);

      setIsConnected(true);
      socket.emit('voice:startSession');
      console.log('[Voice] Microphone connected');
    } catch (e) {
      console.warn('[Voice] Microphone access denied:', e);
    }
  }, []);

  // ── Speaking detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !analyserRef.current) return;

    let wasSpeaking = false;
    speakingTimerRef.current = setInterval(() => {
      if (!analyserRef.current || isMuted) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const speaking = avg > 15;

      if (speaking !== wasSpeaking) {
        wasSpeaking = speaking;
        socket.emit('voice:speaking', { isSpeaking: speaking });
      }
    }, 100);

    return () => {
      if (speakingTimerRef.current) clearInterval(speakingTimerRef.current);
    };
  }, [isConnected, isMuted]);

  // ── Create voice peer connection ────────────────────────────────────────
  const createVoicePeer = useCallback((peerId: string): RTCPeerConnection => {
    const existing = peerConnections.current.get(peerId);
    if (existing && existing.signalingState !== 'closed') return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('voice:ice', { targetId: peerId, candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      // Attach remote audio to page
      document.querySelector(`[data-peer-audio="${peerId}"]`)?.remove();
      const audioEl = document.createElement('audio');
      audioEl.srcObject = e.streams[0] || new MediaStream([e.track]);
      audioEl.autoplay = true;
      audioEl.setAttribute('data-peer-audio', peerId);
      document.body.appendChild(audioEl);
    };

    // Add local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }

    peerConnections.current.set(peerId, pc);
    return pc;
  }, []);

  // ── Signal handlers ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const handleStartSession = async ({ fromId }: { fromId: string }) => {
      if (!localStreamRef.current) return;
      const pc = createVoicePeer(fromId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voice:offer', { targetId: fromId, offer });
    };

    const handleOffer = async ({ fromId, offer }: { fromId: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createVoicePeer(fromId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice:answer', { targetId: fromId, answer });
    };

    const handleAnswer = async ({ fromId, answer }: { fromId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(fromId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIce = async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(fromId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    };

    socket.on('voice:startSession', handleStartSession);
    socket.on('voice:offer', handleOffer);
    socket.on('voice:answer', handleAnswer);
    socket.on('voice:ice', handleIce);

    return () => {
      socket.off('voice:startSession', handleStartSession);
      socket.off('voice:offer', handleOffer);
      socket.off('voice:answer', handleAnswer);
      socket.off('voice:ice', handleIce);
    };
  }, [roomId, createVoicePeer]);

  // ── Mute / Unmute ────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
    socket.emit('voice:mute', { isMuted: newMuted });
  }, [isMuted]);

  // ── Push to talk ─────────────────────────────────────────────────────────
  const startPTT = useCallback(() => {
    if (!isPushToTalk) return;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = true; });
    socket.emit('voice:mute', { isMuted: false });
  }, [isPushToTalk]);

  const stopPTT = useCallback(() => {
    if (!isPushToTalk) return;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
    socket.emit('voice:mute', { isMuted: true });
  }, [isPushToTalk]);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      // Remove any audio elements we added
      document.querySelectorAll('[data-peer-audio]').forEach(el => el.remove());
      if (speakingTimerRef.current) clearInterval(speakingTimerRef.current);
    };
  }, []);

  return {
    isMuted,
    isPushToTalk,
    isConnected,
    joinVoice,
    toggleMute,
    setIsPushToTalk,
    startPTT,
    stopPTT,
  };
}
