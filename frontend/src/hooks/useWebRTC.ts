// useWebRTC — WebRTC video streaming
// Host: captures local video file stream → sends to all guests
// Guest: receives stream → renders in <video> element

import { useRef, useCallback, useEffect } from 'react';
import socket from '../services/socket';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const prioritizeHEVC = (pc: RTCPeerConnection) => {
  try {
    const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
    if (videoTransceiver && 'setCodecPreferences' in RTCRtpReceiver) {
      const capabilities = RTCRtpReceiver.getCapabilities('video');
      if (capabilities && capabilities.codecs) {
        const codecs = [...capabilities.codecs];
        // Sort HEVC/H.265 to the very top
        codecs.sort((a, b) => {
          const isAHEVC = /h265|hevc/i.test(a.mimeType);
          const isBHEVC = /h265|hevc/i.test(b.mimeType);
          if (isAHEVC && !isBHEVC) return -1;
          if (!isAHEVC && isBHEVC) return 1;
          return 0;
        });
        
        // Only set preferences if HEVC is actually present, otherwise preserve default preferences
        const hasHEVC = codecs.some(c => /h265|hevc/i.test(c.mimeType));
        if (hasHEVC) {
          videoTransceiver.setCodecPreferences(codecs);
          console.log('[WebRTC] HEVC supported and prioritized. Preferred codecs:', codecs.map(c => c.mimeType).slice(0, 3));
        } else {
          console.log('[WebRTC] HEVC not supported by this browser. Defaulting to standard codecs.');
        }
      }
    } else {
      console.log('[WebRTC] setCodecPreferences is not supported by this browser.');
    }
  } catch (err) {
    console.warn('[WebRTC] Failed to prioritize HEVC codec:', err);
  }
};

interface UseWebRTCProps {
  isHost: boolean;
  roomId: string | undefined;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useWebRTC({ isHost, roomId, localVideoRef, remoteVideoRef }: UseWebRTCProps) {
  // Map of peerId → RTCPeerConnection (host manages one per guest)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const objectUrlRef = useRef<string | null>(null);

  const flushPendingIce = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queued = pendingIceCandidates.current.get(peerId) ?? [];
    pendingIceCandidates.current.delete(peerId);
    for (const candidate of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    }
  }, []);

  // ── Create a peer connection for a specific remote ────────────────────────
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const existing = peerConnections.current.get(peerId);
    if (existing && existing.signalingState !== 'closed') return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('stream:ice', { targetId: peerId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      // Guest: display the incoming stream
      if (!isHost && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0] || new MediaStream([e.track]);
        remoteVideoRef.current.play().catch(err => console.warn('[WebRTC] play error:', err));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        peerConnections.current.delete(peerId);
      }
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [isHost, remoteVideoRef]);

  // ── HOST: Load local file and start streaming ─────────────────────────────
  const startHostStream = useCallback(async (_file: File) => {
    if (!isHost) return;

    const video = localVideoRef.current as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    if (!video) {
      console.error('[WebRTC] localVideoRef is null');
      return;
    }

    // VideoPlayer already set video.src and called video.load().
    // We MUST wait until the browser has buffered enough data to play.
    if (video.readyState < 3 /* HAVE_FUTURE_DATA */) {
      console.log('[WebRTC] Video not ready (readyState=' + video.readyState + '), waiting for canplay…');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('Timed out waiting for video canplay'));
        }, 15_000);

        const cleanup = () => {
          clearTimeout(timeout);
          video.removeEventListener('canplay', onReady);
          video.removeEventListener('error', onErr);
        };
        const onReady = () => { cleanup(); resolve(); };
        const onErr = () => { cleanup(); reject(new Error('Video load error')); };

        video.addEventListener('canplay', onReady, { once: true });
        video.addEventListener('error', onErr, { once: true });
      }).catch(err => {
        console.warn('[WebRTC]', err.message);
      });
    }

    // Ensure the video is actually playing — captureStream needs active playback
    if (video.paused) {
      try {
        await video.play();
      } catch (err) {
        console.warn('[WebRTC] video.play() failed:', err);
      }
    }

    // Brief pause so the browser populates the captured tracks
    await new Promise(r => setTimeout(r, 300));

    // Capture stream from the playing video element
    const captureFn = video.captureStream || video.mozCaptureStream;
    if (!captureFn) {
      console.error('[WebRTC] captureStream API not supported by this browser');
      return;
    }

    let stream = captureFn.call(video) as MediaStream;

    // Retry if no tracks yet (race between load and capture)
    if (stream.getTracks().length === 0) {
      console.warn('[WebRTC] captureStream returned 0 tracks, retrying in 1s…');
      await new Promise(r => setTimeout(r, 1000));
      stream = captureFn.call(video) as MediaStream;
    }

    if (stream.getTracks().length === 0) {
      console.error('[WebRTC] captureStream still has 0 tracks after retry — aborting');
      return;
    }

    localStreamRef.current = stream;
    console.log(
      '[WebRTC] Host stream captured:',
      stream.getTracks().map(t => `${t.kind}(${t.readyState})`)
    );
  }, [isHost, localVideoRef]);

  // ── HOST: Offer stream to a new guest ────────────────────────────────────
  const offerStreamToGuest = useCallback(async (guestId: string) => {
    if (!isHost) {
      console.log('[WebRTC] offerStreamToGuest: not host, skipping');
      return;
    }
    if (!localStreamRef.current) {
      console.warn('[WebRTC] offerStreamToGuest: no local stream captured yet');
      return;
    }
    if (localStreamRef.current.getTracks().length === 0) {
      console.warn('[WebRTC] offerStreamToGuest: local stream has 0 tracks');
      return;
    }

    const pc = createPeerConnection(guestId);

    // Add all local tracks
    const existingTrackIds = new Set(pc.getSenders().map(sender => sender.track?.id).filter(Boolean));
    localStreamRef.current.getTracks().forEach(track => {
      if (!existingTrackIds.has(track.id)) {
        pc.addTrack(track, localStreamRef.current!);
      }
    });

    // Prioritize HEVC/H.265 if supported
    prioritizeHEVC(pc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('stream:offer', { targetId: guestId, offer });
    console.log('[WebRTC] Offer sent to', guestId, 'with', localStreamRef.current.getTracks().length, 'tracks');
  }, [isHost, createPeerConnection]);

  // ── Signal event handlers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    // HOST: receives answer from guest
    const handleAnswer = async ({ fromId, answer }: { fromId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(fromId);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingIce(fromId, pc);
        console.log('[WebRTC] Answer received from', fromId);
      } catch (e) {
        console.error('[WebRTC] setRemoteDescription error', e);
      }
    };

    // GUEST: receives offer from host, creates answer
    const handleOffer = async ({ fromId, offer }: { fromId: string; offer: RTCSessionDescriptionInit }) => {
      if (isHost) return;
      const pc = createPeerConnection(fromId);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingIce(fromId, pc);
      
      // Prioritize HEVC/H.265 if supported
      prioritizeHEVC(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('stream:answer', { targetId: fromId, answer });
      console.log('[WebRTC] Answer sent to host', fromId);
    };

    // Both: handle ICE candidates
    const handleIce = async ({ fromId, candidate }: { fromId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(fromId);
      if (!pc || !pc.remoteDescription) {
        const queued = pendingIceCandidates.current.get(fromId) ?? [];
        queued.push(candidate);
        pendingIceCandidates.current.set(fromId, queued);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        // ignore
      }
    };

    // HOST: new guest joined — offer them the stream
    const handleParticipantJoined = ({ participant }: { participant: { id: string } }) => {
      console.log('[WebRTC] participantJoined event:', participant.id,
        'isHost:', isHost, 'hasStream:', !!localStreamRef.current,
        'tracks:', localStreamRef.current?.getTracks().length ?? 0);

      if (!isHost) return;

      const tryOffer = (attemptsLeft: number) => {
        if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
          console.log('[WebRTC] Offering stream to new guest', participant.id);
          offerStreamToGuest(participant.id);
        } else if (attemptsLeft > 0) {
          console.log('[WebRTC] Stream not ready, retrying in 2s… (', attemptsLeft, 'left)');
          setTimeout(() => tryOffer(attemptsLeft - 1), 2000);
        } else {
          console.warn('[WebRTC] Gave up offering stream to', participant.id, '— stream never became ready');
        }
      };

      // Start trying after a short delay (give captureStream time to finish)
      setTimeout(() => tryOffer(5), 500);
    };

    // HOST: receives reconnect request from guest
    const handleRequestReconnect = ({ guestId }: { guestId: string }) => {
      if (!isHost) return;
      console.log('[WebRTC] Reconnect requested by guest:', guestId);

      const pc = peerConnections.current.get(guestId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(guestId);
      }

      offerStreamToGuest(guestId);
    };

    socket.on('stream:answer', handleAnswer);
    socket.on('stream:offer', handleOffer);
    socket.on('stream:ice', handleIce);
    socket.on('room:participantJoined', handleParticipantJoined);
    socket.on('stream:requestReconnect', handleRequestReconnect);

    return () => {
      socket.off('stream:answer', handleAnswer);
      socket.off('stream:offer', handleOffer);
      socket.off('stream:ice', handleIce);
      socket.off('room:participantJoined', handleParticipantJoined);
      socket.off('stream:requestReconnect', handleRequestReconnect);
    };
  }, [roomId, isHost, createPeerConnection, offerStreamToGuest, flushPendingIce]);

  // GUEST: request a fresh stream offer from host
  const resyncStream = useCallback(() => {
    if (isHost) return;
    console.log('[WebRTC] Requesting stream reconnect from host...');
    // Clear local peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    // Signal host to re-offer
    socket.emit('stream:requestReconnect');
  }, [isHost]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return { startHostStream, offerStreamToGuest, resyncStream };
}
