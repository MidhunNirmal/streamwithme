// VideoPlayer — the main video player with overlay controls
// Host: plays local file; Guest: shows WebRTC stream

import { useRef, useState, useCallback, useEffect } from 'react';
import { useSync } from '../hooks/useSync';

interface VideoPlayerProps {
  isHost: boolean;
  canControl: boolean;
  onFileSelected?: (file: File) => void;
  streamRef?: React.RefObject<HTMLVideoElement | null>;
  onResync?: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'LIVE';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoPlayer({ isHost, canControl, onFileSelected, streamRef, onResync }: VideoPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = streamRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasMedia, setHasMedia] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const {
    emitPlay,
    emitPause,
    emitSeek,
    emitSpeed: _emitSpeed,
    emitDuration,
    requestState,
    syncedTime,
    syncedDuration,
    isPlaying: syncedIsPlaying,
  } = useSync({
    videoRef: videoRef as React.RefObject<HTMLVideoElement | null>,
    isHost,
    canControl,
  });

  const activeCurrentTime = isHost ? currentTime : syncedTime;
  const activeDuration = isHost ? duration : syncedDuration;
  const activeIsPlaying = isHost ? isPlaying : syncedIsPlaying;

  const hasFiniteDuration = Number.isFinite(activeDuration) && activeDuration > 0;

  // Host emits duration when video metadata is loaded
  useEffect(() => {
    if (isHost && duration > 0) {
      emitDuration(duration);
    }
  }, [isHost, duration, emitDuration]);

  // Request sync state when joining
  useEffect(() => {
    if (!isHost) {
      setTimeout(requestState, 1000);
    }
  }, [isHost, requestState]);

  // Hide controls after inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || !canControl) return;

    if (isHost) {
      if (video.paused) {
        video.play().catch(() => {});
        emitPlay();
        setIsPlaying(true);
      } else {
        video.pause();
        emitPause();
        setIsPlaying(false);
      }
    } else {
      if (activeIsPlaying) {
        emitPause();
      } else {
        emitPlay();
      }
    }
  }, [videoRef, canControl, isHost, activeIsPlaying, emitPlay, emitPause]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canControl) return;
    const video = videoRef.current;
    if (!video || !hasFiniteDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newTime = pct * activeDuration;
    if (isHost) {
      video.currentTime = newTime;
    }
    emitSeek(newTime);
  }, [videoRef, activeDuration, hasFiniteDuration, canControl, emitSeek, isHost]);

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const vol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [videoRef]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // File picker for host
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const video = videoRef.current;
    if (video) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);
      video.src = objectUrlRef.current;
      video.load();
      setHasMedia(true);
    }
    onFileSelected?.(file);
  }, [videoRef, onFileSelected]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video max-w-6xl rounded-xl overflow-hidden shadow-2xl video-glow group"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      {/* Video element */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="w-full h-full object-contain bg-black"
        autoPlay
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration ?? 0);
          setHasMedia(true);
        }}
        onCanPlay={() => setHasMedia(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        playsInline
      />

      {/* Host: file picker overlay (when no video loaded) */}
      {isHost && !hasMedia && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070d1f] text-center">
          <span className="material-symbols-outlined text-[#d0bcff] mb-4" style={{ fontSize: '64px' }}>movie</span>
          <p className="text-lg font-bold text-[#dce1fb] mb-2 font-['Montserrat']">Select a video file</p>
          <p className="text-sm text-[#cbc3d7] mb-6">Supports MP4, MKV, MOV, WebM</p>
          <button
            id="select-video-btn"
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-3 bg-[#d0bcff] text-[#3c0091] rounded-xl font-bold glow-primary hover:brightness-110 transition-all"
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/x-matroska,video/quicktime,video/webm,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Guest: waiting overlay */}
      {!isHost && !hasMedia && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070d1f]">
          <div className="w-16 h-16 border-4 border-[#d0bcff]/30 border-t-[#d0bcff] rounded-full animate-spin mb-4" />
          <p className="text-[#cbc3d7] text-sm">Waiting for host to start streaming…</p>
        </div>
      )}

      {/* Floating Controls Overlay */}
      <div
        className={`absolute bottom-6 left-6 right-6 flex flex-col gap-3 p-6 glass-panel rounded-xl transition-all duration-500 ${
          showControls || !activeIsPlaying ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div
          className="relative w-full h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer group/progress"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#4cd7f6] active-glow transition-all"
            style={{ width: `${hasFiniteDuration ? (activeCurrentTime / activeDuration) * 100 : 0}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#4cd7f6] rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `${hasFiniteDuration ? (activeCurrentTime / activeDuration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Play/Pause */}
            <button
              id="play-pause-btn"
              onClick={handlePlayPause}
              className={`hover:text-[#4cd7f6] transition-colors ${!canControl ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {activeIsPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="hover:text-[#4cd7f6] transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                </span>
              </button>
              <div
                className="w-24 h-1 bg-white/20 rounded-full cursor-pointer"
                onClick={handleVolumeChange}
              >
                <div
                  className="h-full bg-[#dce1fb] rounded-full"
                  style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                />
              </div>
            </div>

            {/* Timestamps */}
            <span className="text-xs text-[#cbc3d7] ml-3 font-mono">
              {hasFiniteDuration ? `${formatTime(activeCurrentTime)} / ${formatTime(activeDuration)}` : 'LIVE'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {!isHost && onResync && (
              <button
                id="resync-stream-btn"
                onClick={onResync}
                className="flex items-center gap-1 bg-[#d0bcff]/10 hover:bg-[#d0bcff]/20 text-[#d0bcff] border border-[#d0bcff]/20 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-all cursor-pointer"
                title="Resync video stream if screen is black or frozen"
              >
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>sync</span>
                <span>Resync</span>
              </button>
            )}
            <button className="hover:text-[#4cd7f6] transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>closed_caption</span>
            </button>
            <button className="hover:text-[#4cd7f6] transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>settings</span>
            </button>
            <button
              id="fullscreen-btn"
              onClick={toggleFullscreen}
              className="hover:text-[#4cd7f6] transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
