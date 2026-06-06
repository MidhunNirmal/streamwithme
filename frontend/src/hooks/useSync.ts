// useSync — synchronized video playback across all participants
// Uses server timestamps to correct drift automatically

import { useEffect, useRef, useCallback, useState } from 'react';
import socket from '../services/socket';
import type { SyncState } from '../types';

const DRIFT_THRESHOLD_MS = 500; // seek if drift exceeds 500ms

function canSeek(video: HTMLVideoElement): boolean {
  return Number.isFinite(video.duration) && video.duration > 0;
}

interface UseSyncProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isHost: boolean;
  canControl: boolean;
}

export function useSync({ videoRef, isHost, canControl }: UseSyncProps) {
  const isSyncingRef = useRef(false); // prevent sync feedback loops

  // Synced state for guests (since MediaStream duration is Infinity and currentTime starts at 0)
  const [syncedTime, setSyncedTime] = useState(0);
  const [syncedDuration, setSyncedDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const lastUpdateRef = useRef<number>(Date.now());
  const lastTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const playbackRateRef = useRef<number>(1);
  const durationRef = useRef<number>(0);

  // Sync state values to refs for the interpolation interval
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    durationRef.current = syncedDuration;
  }, [syncedDuration]);

  const updateSyncedState = useCallback((time: number, playing: boolean, rate: number, serverTime?: number) => {
    const now = Date.now();
    const networkDelay = serverTime ? (now - serverTime) / 1000 : 0;
    const correctedTime = time + (playing ? networkDelay * rate : 0);

    lastTimeRef.current = correctedTime;
    lastUpdateRef.current = now;
    
    setIsPlaying(playing);
    setPlaybackRate(rate);
    setSyncedTime(correctedTime);
  }, []);

  // Interpolation tick for guests to keep their progress bar updating smoothly
  useEffect(() => {
    if (isHost) return;

    const interval = setInterval(() => {
      if (isPlayingRef.current) {
        const elapsed = (Date.now() - lastUpdateRef.current) / 1000;
        const newTime = lastTimeRef.current + elapsed * playbackRateRef.current;
        const duration = durationRef.current;
        const clampedTime = duration > 0 ? Math.min(newTime, duration) : newTime;
        setSyncedTime(clampedTime);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isHost]);

  // Apply remote sync state to local video element
  const applySync = useCallback((state: SyncState & { serverTime?: number }) => {
    const video = videoRef.current;
    if (!video || isSyncingRef.current) return;

    isSyncingRef.current = true;

    // Calculate drift: account for network latency using server timestamp
    const networkDelay = state.serverTime ? (Date.now() - state.serverTime) / 1000 : 0;
    const expectedTime = state.currentTime + networkDelay;

    if (state.isPlaying) {
      const drift = Math.abs(video.currentTime - expectedTime);
      if (canSeek(video) && drift > DRIFT_THRESHOLD_MS / 1000) {
        video.currentTime = expectedTime;
      }
      video.playbackRate = state.playbackRate || 1;
      video.play().catch(() => {});
    } else {
      video.pause();
      const drift = Math.abs(video.currentTime - state.currentTime);
      if (canSeek(video) && drift > DRIFT_THRESHOLD_MS / 1000) {
        video.currentTime = state.currentTime;
      }
    }

    // Also update our local synced state
    updateSyncedState(state.currentTime, state.isPlaying, state.playbackRate || 1, state.serverTime);
    if (state.duration !== undefined) {
      setSyncedDuration(state.duration);
    }

    setTimeout(() => { isSyncingRef.current = false; }, 300);
  }, [videoRef, updateSyncedState]);

  useEffect(() => {
    // ── Incoming sync events from other participants ──────────────────────────
    const handlePlay = (data: { currentTime: number; serverTime: number }) => {
      const video = videoRef.current;
      if (!video || isSyncingRef.current) return;
      applySync({ isPlaying: true, currentTime: data.currentTime, playbackRate: playbackRateRef.current, lastUpdated: Date.now(), updatedBy: '', serverTime: data.serverTime });
    };

    const handlePause = (data: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video || isSyncingRef.current) return;
      isSyncingRef.current = true;
      video.pause();
      if (canSeek(video)) video.currentTime = data.currentTime;
      updateSyncedState(data.currentTime, false, playbackRateRef.current);
      setTimeout(() => { isSyncingRef.current = false; }, 300);
    };

    const handleSeek = (data: { currentTime: number; serverTime: number }) => {
      const video = videoRef.current;
      if (!video || isSyncingRef.current) return;
      isSyncingRef.current = true;
      if (canSeek(video)) video.currentTime = data.currentTime;
      updateSyncedState(data.currentTime, isPlayingRef.current, playbackRateRef.current, data.serverTime);
      setTimeout(() => { isSyncingRef.current = false; }, 300);
    };

    const handleSpeed = (data: { playbackRate: number }) => {
      const video = videoRef.current;
      if (video) video.playbackRate = data.playbackRate;
      setPlaybackRate(data.playbackRate);
    };

    const handleState = (state: SyncState & { serverTime: number }) => {
      applySync(state);
    };

    const handleDuration = (data: { duration: number }) => {
      setSyncedDuration(data.duration);
    };

    socket.on('sync:play', handlePlay);
    socket.on('sync:pause', handlePause);
    socket.on('sync:seek', handleSeek);
    socket.on('sync:speed', handleSpeed);
    socket.on('sync:state', handleState);
    socket.on('sync:duration', handleDuration);

    return () => {
      socket.off('sync:play', handlePlay);
      socket.off('sync:pause', handlePause);
      socket.off('sync:seek', handleSeek);
      socket.off('sync:speed', handleSpeed);
      socket.off('sync:state', handleState);
      socket.off('sync:duration', handleDuration);
    };
  }, [videoRef, applySync, updateSyncedState]);

  // ── Outgoing sync events (only when user has control permission) ─────────────
  const emitPlay = useCallback(() => {
    if (!canControl) return;
    const video = videoRef.current;
    if (!video) return;
    socket.emit('sync:play', { currentTime: isHost && Number.isFinite(video.currentTime) ? video.currentTime : syncedTime });
  }, [videoRef, canControl, isHost, syncedTime]);

  const emitPause = useCallback(() => {
    if (!canControl) return;
    const video = videoRef.current;
    if (!video) return;
    socket.emit('sync:pause', { currentTime: isHost && Number.isFinite(video.currentTime) ? video.currentTime : syncedTime });
  }, [videoRef, canControl, isHost, syncedTime]);

  const emitSeek = useCallback((time: number) => {
    if (!canControl) return;
    const cleanTime = Number.isFinite(time) ? Math.max(0, time) : 0;
    socket.emit('sync:seek', { currentTime: cleanTime });
    if (!isHost) {
      updateSyncedState(cleanTime, isPlayingRef.current, playbackRateRef.current);
    }
  }, [canControl, isHost, updateSyncedState]);

  const emitSpeed = useCallback((rate: number) => {
    if (!canControl) return;
    socket.emit('sync:speed', { playbackRate: rate });
  }, [canControl]);

  const emitDuration = useCallback((duration: number) => {
    if (!canControl) return;
    socket.emit('sync:duration', { duration: Number.isFinite(duration) ? Math.max(0, duration) : 0 });
    setSyncedDuration(duration);
  }, [canControl]);

  // Request current state from server (on join)
  const requestState = useCallback(() => {
    socket.emit('sync:requestState');
  }, []);

  return {
    emitPlay,
    emitPause,
    emitSeek,
    emitSpeed,
    emitDuration,
    requestState,
    syncedTime,
    syncedDuration,
    isPlaying,
  };
}
