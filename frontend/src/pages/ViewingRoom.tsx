// ViewingRoom — full watch party screen: video + chat/participants sidebar

import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import socket, { connectAndEmit } from '../services/socket';
import { useRoom } from '../hooks/useRoom';
import { useWebRTC } from '../hooks/useWebRTC';
import { useVoice } from '../hooks/useVoice';
import VideoPlayer from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';
import ParticipantList from '../components/ParticipantList';
import type { RoomInfo } from '../types';

type SidebarTab = 'messages' | 'participants' | 'settings' | 'history';

export default function ViewingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SidebarTab>('messages');
  const [copied, setCopied] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const initAttemptedRef = useRef(false);

  const {
    room, participants, chatMessages, permissions,
    myId, isHost, initRoom, sendMessage, removeParticipant,
  } = useRoom();

  const { startHostStream, offerStreamToGuest, resyncStream } = useWebRTC({
    isHost,
    roomId,
    localVideoRef,
    remoteVideoRef,
  });

  const voice = useVoice(roomId);
  const canControl = isHost || permissions.allowProgressControl;

  // Initialize room from navigation state or reconnect
  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    const state = location.state as { room: RoomInfo; isHost: boolean } | null;

    if (state?.room) {
      initRoom(state.room, state.isHost);
    } else if (roomId) {
      // Rejoin on page refresh
      const storedName = localStorage.getItem('swm_username') || 'Viewer';
      connectAndEmit('room:join', { roomId, username: storedName }, (res: any) => {
        if (res.success) {
          initRoom(res.room, false);
        } else {
          navigate('/');
        }
      });
    }
  }, [roomId, location.state, initRoom, navigate]);

  // Listen for room end / kick
  useEffect(() => {
    const handleRoomEnded = () => navigate('/');
    const handleRoomKicked = () => navigate('/');

    socket.on('room:ended', handleRoomEnded);
    socket.on('room:kicked', handleRoomKicked);
    return () => {
      socket.off('room:ended', handleRoomEnded);
      socket.off('room:kicked', handleRoomKicked);
    };
  }, [navigate]);

  const handleFileSelected = async (file: File) => {
    await startHostStream(file);
    // Offer the stream to each existing participant
    participants.forEach(p => {
      if (!p.isHost) offerStreamToGuest(p.id);
    });
  };

  const handleCopyInvite = () => {
    if (!room) return;
    const url = `${window.location.origin}/join/${room.inviteCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('room:leave');
    navigate('/');
  };

  const tabs: { id: SidebarTab; icon: string; label: string }[] = [
    { id: 'messages', icon: 'chat', label: 'Messages' },
    { id: 'participants', icon: 'group', label: 'Participants' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
    { id: 'history', icon: 'history', label: 'History' },
  ];

  // Active viewer count
  const viewerCount = participants.length;
  const hostParticipant = participants.find(p => p.isHost);

  return (
    <div className="bg-[#0c1324] text-[#dce1fb] h-screen overflow-hidden flex flex-col">
      {/* ── Top Navigation ────────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-12 h-[72px] bg-[#0c1324]/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-8">
          <a href="/" className="text-2xl font-['Montserrat'] font-bold text-[#d0bcff] tracking-tighter">
            StreamWithMe
          </a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/" className="text-[#cbc3d7] hover:text-[#dce1fb] transition-colors text-sm">Browse</a>
            <a href="/" className="text-[#4cd7f6] border-b-2 border-[#4cd7f6] pb-1 text-sm">Watch Parties</a>
            <a href="/" className="text-[#cbc3d7] hover:text-[#dce1fb] transition-colors text-sm">Friends</a>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={handleLeaveRoom}
              className="px-6 py-2 rounded-xl font-bold border border-[#958ea0] hover:bg-[#2e3447] transition-all scale-95 active:scale-90 text-sm"
            >
              Leave Room
            </button>
          </div>
          <div className="w-10 h-10 rounded-full border border-[#d0bcff]/20 bg-[#23293c] flex items-center justify-center text-[#d0bcff] text-sm font-bold select-none">
            {(localStorage.getItem('swm_username') || 'U')[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <main className="flex h-screen pt-[72px] overflow-hidden">

        {/* ── Video Section ─────────────────────────────────────────────── */}
        <section className="flex-grow relative flex flex-col justify-center items-center bg-[#070d1f] p-6 lg:p-12">

          <VideoPlayer
            isHost={isHost}
            canControl={canControl}
            onFileSelected={handleFileSelected}
            streamRef={isHost ? localVideoRef : remoteVideoRef}
            onResync={resyncStream}
          />

          {/* Room Info Bar */}
          <div className="w-full max-w-6xl mt-6 flex justify-between items-center px-2">
            <div className="flex flex-col">
              <h2 className="text-2xl font-['Montserrat'] font-semibold text-[#dce1fb]">
                {room?.id ? 'Movie Night' : 'Watch Party'}
              </h2>
              <p className="text-[#cbc3d7] text-sm">
                Hosted by {hostParticipant?.username ?? '...'} · {viewerCount} viewer{viewerCount !== 1 ? 's' : ''} active
              </p>
            </div>
            <div className="flex items-center gap-6">
              <button
                id="invite-friends-btn"
                onClick={handleCopyInvite}
                className="flex items-center gap-2 text-[#4cd7f6] hover:text-[#acedff] transition-colors font-bold text-sm"
              >
                <span className="material-symbols-outlined">{copied ? 'check_circle' : 'link'}</span>
                <span>{copied ? 'Copied!' : 'Invite Friends'}</span>
              </button>
              {room?.inviteCode && (
                <span className="glass-panel px-4 py-1.5 rounded-full text-xs font-bold tracking-widest text-[#d0bcff]">
                  CODE: {room.inviteCode}
                </span>
              )}
              {/* Avatar stack */}
              <div className="flex -space-x-3">
                {participants.slice(0, 4).map((p, i) => (
                  <div
                    key={p.id}
                    className="w-8 h-8 rounded-full border-2 border-[#0c1324] flex items-center justify-center text-xs font-bold"
                    style={{ background: ['#d0bcff', '#4cd7f6', '#bec6e0', '#a078ff'][i % 4] + '30', color: ['#d0bcff', '#4cd7f6', '#bec6e0', '#a078ff'][i % 4], zIndex: 4 - i }}
                  >
                    {p.username[0]?.toUpperCase()}
                  </div>
                ))}
                {participants.length > 4 && (
                  <div className="w-8 h-8 rounded-full border-2 border-[#0c1324] bg-[#23293c] flex items-center justify-center text-[10px] font-bold">
                    +{participants.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-[360px] h-full flex flex-col bg-[#23293c]/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-40 shrink-0 overflow-hidden">

          {/* Sidebar Header */}
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#d0bcff]/20 flex items-center justify-center border border-[#d0bcff]/30">
                <span className="material-symbols-outlined text-[#d0bcff]">movie</span>
              </div>
              <div>
                <h3 className="font-bold text-[#dce1fb] text-sm">Movie Night</h3>
                <p className="text-xs text-[#4cd7f6]">{viewerCount} Members Active</p>
              </div>
            </div>
            <button
              onClick={handleCopyInvite}
              className="px-3 py-1.5 bg-[#d0bcff]/10 text-[#d0bcff] rounded-lg font-bold text-xs hover:bg-[#d0bcff]/20 transition-all"
            >
              {copied ? 'Copied!' : 'Invite'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-2 bg-[#070d1f]/50 mx-6 my-3 rounded-xl">
            {tabs.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex flex-col items-center justify-center rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'text-[#d0bcff] font-bold bg-[#d0bcff]/10'
                    : 'text-[#cbc3d7] hover:text-[#dce1fb] hover:bg-white/5'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', fontVariationSettings: activeTab === tab.id ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'messages' && (
            <ChatPanel messages={chatMessages} myId={myId} onSendMessage={sendMessage} />
          )}

          {activeTab === 'participants' && (
            <ParticipantList
              participants={participants}
              myId={myId}
              isHost={isHost}
              onRemove={removeParticipant}
            />
          )}

          {activeTab === 'settings' && (
            <div className="flex-grow p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Voice Controls */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#cbc3d7] mb-4">Voice Chat</h3>
                <div className="space-y-3">
                  {!voice.isConnected ? (
                    <button
                      onClick={voice.joinVoice}
                      className="w-full py-3 bg-[#4cd7f6]/20 border border-[#4cd7f6]/30 text-[#4cd7f6] rounded-xl font-bold text-sm hover:bg-[#4cd7f6]/30 transition-all"
                    >
                      Join Voice Chat
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={voice.toggleMute}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                          voice.isMuted
                            ? 'bg-[#ffb4ab]/20 border border-[#ffb4ab]/30 text-[#ffb4ab]'
                            : 'bg-[#4cd7f6]/20 border border-[#4cd7f6]/30 text-[#4cd7f6]'
                        }`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {voice.isMuted ? 'mic_off' : 'mic'}
                        </span>
                        {voice.isMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <div className="flex items-center justify-between p-3 bg-[#151b2d] rounded-lg border border-white/5">
                        <span className="text-sm text-[#dce1fb]">Push to Talk</span>
                        <button
                          onClick={() => voice.setIsPushToTalk(v => !v)}
                          className={`toggle-track ${voice.isPushToTalk ? 'checked' : ''}`}
                        >
                          <span className="toggle-thumb" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#cbc3d7] mb-4">Room Code</h3>
                <div className="glass-panel rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-[#d0bcff] tracking-widest font-mono">{room?.inviteCode ?? '------'}</p>
                  <p className="text-xs text-[#cbc3d7] mt-2">Share this code with friends to join</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex-grow flex items-center justify-center text-[#cbc3d7]/40 text-sm">
              Watch history coming soon.
            </div>
          )}

          {/* Sidebar Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
            <button className="flex items-center gap-2 text-[#cbc3d7] hover:text-[#dce1fb] transition-colors text-xs">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>help</span>
              <span>Help</span>
            </button>
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-2 text-[#ffb4ab] hover:text-[#ffdad6] transition-colors text-xs"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
              <span>Leave Room</span>
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
