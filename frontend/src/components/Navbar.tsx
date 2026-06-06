// Navbar — top navigation bar, exact match to HTML prototype

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket, { connectAndEmit } from '../services/socket';
import JoinRoomModal from './JoinRoomModal';

interface NavbarProps {
  activePage?: 'browse' | 'parties' | 'friends';
}

export default function Navbar({ activePage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState('');
  const [hostName, setHostName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('swm_username');
    if (stored) setUsername(stored);

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCreateRoom = () => {
    const name = hostName.trim() || `Host_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    localStorage.setItem('swm_username', name);
    setShowCreate(false);
    connectAndEmit('room:create', { username: name }, (res: any) => {
      if (res.success) {
        navigate(`/admin/${res.roomId}`, { state: { room: res.room, isHost: true } });
      } else {
        alert(res.error || 'Failed to create room. Is the backend running?');
      }
    });
  };

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 flex justify-between items-center px-12 h-[72px] backdrop-blur-xl border-b border-white/10 shadow-lg transition-all duration-300 ${
          scrolled ? 'bg-[#0c1324]/95' : 'bg-[#0c1324]/80'
        }`}
      >
        {/* Logo + Nav */}
        <div className="flex items-center gap-6">
          <a href="/" className="text-2xl font-bold text-[#d0bcff] tracking-tighter font-['Montserrat'] select-none">
            StreamWithMe
          </a>
          <nav className="hidden md:flex items-center gap-6 ml-20">
            <a
              href="/"
              className={`text-base transition-colors ${activePage === 'browse' ? 'text-[#4cd7f6] border-b-2 border-[#4cd7f6] pb-1' : 'text-[#cbc3d7] hover:text-[#dce1fb]'}`}
            >
              Browse
            </a>
            <a
              href="/"
              className={`text-base transition-colors ${activePage === 'parties' ? 'text-[#4cd7f6] border-b-2 border-[#4cd7f6] pb-1' : 'text-[#cbc3d7] hover:text-[#dce1fb]'}`}
            >
              Watch Parties
            </a>
            <a
              href="/"
              className={`text-base transition-colors ${activePage === 'friends' ? 'text-[#4cd7f6] border-b-2 border-[#4cd7f6] pb-1' : 'text-[#cbc3d7] hover:text-[#dce1fb]'}`}
            >
              Friends
            </a>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            id="nav-join-room"
            onClick={() => setShowJoin(true)}
            className="px-6 py-1 rounded-lg text-xs font-semibold text-[#dce1fb] hover:bg-[#a078ff]/20 transition-all duration-300 active:scale-95 border border-[#d0bcff]/30"
          >
            Join Room
          </button>
          <button
            id="nav-create-room"
            onClick={() => setShowCreate(true)}
            className="bg-[#d0bcff] text-[#3c0091] px-6 py-1 rounded-lg text-xs font-bold glow-primary transition-all duration-300 active:scale-95 hover:brightness-110"
          >
            Create Room
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 ml-3 bg-[#23293c] flex items-center justify-center text-[#d0bcff] text-xs font-bold select-none">
            {username ? username[0].toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* Create Room Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div
            className="glass-panel rounded-2xl shadow-2xl"
            style={{ width: '480px', maxWidth: 'calc(100vw - 32px)', padding: '40px' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-[#d0bcff] font-['Montserrat'] mb-2">Create a Room</h2>
            <p className="text-[#cbc3d7] text-sm mb-6">Pick a username to host your watch party.</p>
            <input
              className="w-full bg-[#070d1f] border border-white/10 rounded-xl px-4 py-3 text-[#dce1fb] outline-none focus:ring-2 focus:ring-[#d0bcff] transition-all mb-4"
              placeholder="Your name (e.g. Alex)"
              value={hostName}
              onChange={e => setHostName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-[#cbc3d7] hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                id="create-room-confirm"
                onClick={handleCreateRoom}
                className="flex-1 py-3 rounded-xl bg-[#d0bcff] text-[#3c0091] font-bold hover:brightness-110 transition-all glow-primary"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}
    </>
  );
}
