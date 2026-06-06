// AdminDashboard — host control panel: participants, permissions, stream stats

import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import socket, { connectAndEmit } from '../services/socket';
import { useRoom } from '../hooks/useRoom';
import PermissionToggles from '../components/PermissionToggles';
import ParticipantList from '../components/ParticipantList';
import type { RoomInfo } from '../types';

export default function AdminDashboard() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const initAttemptedRef = useRef(false);

  const {
    room, participants, chatMessages, permissions,
    myId, isHost, initRoom, removeParticipant, updatePermissions, endRoom,
  } = useRoom();

  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const state = location.state as { room: RoomInfo; isHost: boolean } | null;
    if (state?.room) {
      initRoom(state.room, state.isHost);
    } else if (roomId) {
      const username = localStorage.getItem('swm_username') || 'Host';
      connectAndEmit('room:create', { username }, (res: any) => {
        if (res.success) {
          initRoom(res.room, true);
          navigate(`/admin/${res.roomId}`, { replace: true, state: { room: res.room, isHost: true } });
        } else {
          navigate('/');
        }
      });
    }
  }, [roomId, location.state, initRoom, navigate]);

  useEffect(() => {
    const handleRoomEnded = () => navigate('/');
    socket.on('room:ended', handleRoomEnded);
    return () => { socket.off('room:ended', handleRoomEnded); };
  }, [navigate]);

  const handleCopy = () => {
    if (!room) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${room.inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndSession = () => {
    if (confirm('End the session for all participants?')) {
      endRoom();
      navigate('/');
    }
  };

  const handleLeave = () => {
    socket.emit('room:leave');
    navigate('/');
  };

  // Simulated stream stats (replace with real metrics if wired)
  const stats = { source: 'Dynamic CDN (4K)', bandwidth: '24.5 Mbps', bufferHealth: 75 };

  return (
    <div className="bg-[#020617] text-[#dce1fb] min-h-screen">
      {/* ── Top Nav ───────────────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-12 h-[72px] bg-[#0c1324]/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-8">
          <a href="/" className="text-2xl font-['Montserrat'] font-bold text-[#d0bcff] tracking-tighter">
            StreamWithMe
          </a>
          <nav className="hidden md:flex gap-6">
            {['Browse', 'Watch Parties', 'Friends'].map(link => (
              <a key={link} href="/" className="text-[#cbc3d7] hover:text-[#dce1fb] transition-colors text-sm">{link}</a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-1.5 rounded-full border border-[#d0bcff] text-[#d0bcff] text-xs font-semibold hover:bg-[#a078ff]/20 transition-all scale-95 active:scale-90 glow-purple">
            Join Room
          </button>
          <button className="px-6 py-1.5 rounded-full bg-[#d0bcff] text-[#3c0091] text-xs font-semibold hover:brightness-110 transition-all scale-95 active:scale-90 glow-purple">
            Create Room
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 ml-3 bg-[#23293c] flex items-center justify-center text-[#d0bcff] text-sm font-bold">
            {(localStorage.getItem('swm_username') || 'H')[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── Right Sidebar ─────────────────────────────────────────────────── */}
      <aside className="fixed right-0 top-0 h-full flex flex-col pt-[72px] bg-[#23293c]/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl w-[360px] z-40">
        <div className="p-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#d0bcff]/20 flex items-center justify-center border border-[#d0bcff]/30">
            <span className="material-symbols-outlined text-[#d0bcff]">movie</span>
          </div>
          <div>
            <h3 className="text-2xl font-['Montserrat'] text-[#d0bcff] leading-none font-semibold">Movie Night</h3>
            <p className="text-sm text-[#cbc3d7]/70">{participants.length} Members Active</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {[
            { icon: 'chat', label: 'Messages', action: () => navigate(`/room/${room?.id ?? roomId}`, { state: room ? { room, isHost: true } : undefined }) },
            { icon: 'group', label: 'Participants', action: () => {} },
            { icon: 'settings', label: 'Settings', active: true, action: () => {} },
            { icon: 'history', label: 'History', action: () => {} },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 p-3 text-sm transition-all rounded-lg ${
                item.active
                  ? 'text-[#d0bcff] font-bold bg-[#d0bcff]/10'
                  : 'text-[#cbc3d7] hover:text-[#dce1fb] hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-6 border-t border-white/5 flex flex-col gap-3">
          <button className="w-full flex items-center gap-3 p-3 text-sm text-[#cbc3d7] hover:text-[#dce1fb] transition-all">
            <span className="material-symbols-outlined">help</span>
            <span>Help</span>
          </button>
          <button
            onClick={handleLeave}
            className="w-full flex items-center gap-3 p-3 text-sm text-[#ffb4ab] hover:bg-[#ffb4ab]/10 transition-all rounded-lg"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Leave</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="pt-[100px] pr-[360px] pl-6 pb-6 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Dashboard Header */}
          <div className="flex justify-between items-end mb-20">
            <div>
              <h1 className="text-[48px] font-['Montserrat'] font-bold text-[#d0bcff] tracking-tight leading-none">
                Admin Dashboard
              </h1>
              <p className="text-lg text-[#cbc3d7] max-w-xl mt-2">
                Configure your private screening environment and manage audience permissions in real-time.
              </p>
            </div>
            <div className="flex gap-3">
              {/* Invite Code Badge */}
              {room?.inviteCode && (
                <div className="glass-panel px-6 py-3 rounded-xl text-center">
                  <p className="text-xs text-[#cbc3d7] mb-1">Room Code</p>
                  <p className="text-2xl font-bold font-mono text-[#d0bcff] tracking-widest">{room.inviteCode}</p>
                </div>
              )}
              <button
                id="copyInvite"
                onClick={handleCopy}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4cd7f6] text-[#003640] font-['Montserrat'] font-semibold hover:brightness-110 transition-all glow-cyan scale-95 active:scale-90"
              >
                <span className="material-symbols-outlined">{copied ? 'check_circle' : 'link'}</span>
                <span>{copied ? 'Copied!' : 'Copy Invite Link'}</span>
              </button>
              <button
                id="end-session-btn"
                onClick={handleEndSession}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#93000a] text-[#ffdad6] border border-[#ffb4ab]/20 font-['Montserrat'] font-semibold hover:bg-[#ffb4ab] hover:text-[#690005] transition-all scale-95 active:scale-90"
              >
                <span className="material-symbols-outlined">power_settings_new</span>
                <span>End Session</span>
              </button>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Participants List (8 cols) */}
            <div className="col-span-8 glass-panel rounded-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-2xl font-['Montserrat'] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4cd7f6]">groups</span>
                  Participants
                </h2>
                <span className="px-3 py-1 bg-[#2e3447] rounded-full text-xs font-semibold text-[#4cd7f6]">
                  {participants.length} ONLINE
                </span>
              </div>
              <ParticipantList
                participants={participants}
                myId={myId}
                isHost={isHost}
                onRemove={removeParticipant}
              />
            </div>

            {/* Right column (4 cols) */}
            <div className="col-span-4 space-y-6">
              {/* Permissions */}
              <div className="glass-panel rounded-xl p-6">
                <h2 className="text-2xl font-['Montserrat'] font-semibold flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-[#d0bcff]">security</span>
                  Permissions
                </h2>
                <PermissionToggles permissions={permissions} onChange={updatePermissions} />
              </div>

              {/* Stream Stats */}
              <div className="glass-panel rounded-xl p-6 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#d0bcff]/10 to-transparent pointer-events-none transition-opacity group-hover:opacity-100" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#cbc3d7] mb-4">Current Stream</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm opacity-60">Source</span>
                    <span className="text-sm font-bold text-[#4cd7f6]">{stats.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm opacity-60">Bandwidth</span>
                    <span className="text-sm font-bold text-[#4cd7f6]">{stats.bandwidth}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm opacity-60">Participants</span>
                    <span className="text-sm font-bold text-[#4cd7f6]">{participants.length}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-4">
                    <div
                      className="bg-[#4cd7f6] h-full glow-cyan transition-all duration-1000"
                      style={{ width: `${stats.bufferHealth}%` }}
                    />
                  </div>
                  <p className="text-xs text-right text-[#cbc3d7]/60">Buffer: {stats.bufferHealth}%</p>
                </div>

                {/* Go to viewing room */}
                <button
                  onClick={() => navigate(`/room/${room?.id ?? roomId}`, { state: room ? { room, isHost: true } : undefined })}
                  className="mt-6 w-full py-3 bg-[#d0bcff]/10 border border-[#d0bcff]/20 text-[#d0bcff] rounded-xl text-sm font-bold hover:bg-[#d0bcff]/20 transition-all"
                >
                  Open Viewing Room
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
