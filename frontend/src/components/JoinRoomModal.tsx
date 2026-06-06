// JoinRoomModal — enter invite code or paste invite link

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectAndEmit } from '../services/socket';

interface JoinRoomModalProps {
  onClose: () => void;
}

function extractInviteCode(value: string): string {
  const trimmed = value.trim();
  const joinMatch = trimmed.match(/\/join\/([A-Za-z0-9]{6})/);
  return (joinMatch?.[1] ?? trimmed).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export default function JoinRoomModal({ onClose }: JoinRoomModalProps) {
  const [code, setCode] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('swm_username') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = () => {
    const trimCode = extractInviteCode(code);
    const trimName = username.trim() || `Viewer_${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    if (!trimCode) {
      setError('Please enter a room code.');
      return;
    }

    setLoading(true);
    setError('');
    localStorage.setItem('swm_username', trimName);

    connectAndEmit('room:join', { code: trimCode, username: trimName }, (res: any) => {
      setLoading(false);
      if (res.success) {
        navigate(`/room/${res.roomId}`, { state: { room: res.room, isHost: false } });
        onClose();
      } else {
        setError(res.error || 'Could not join room. Check the code and try again.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-panel rounded-2xl shadow-2xl"
        style={{ width: '480px', maxWidth: 'calc(100vw - 32px)', padding: '40px' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-[#d0bcff] font-['Montserrat'] mb-2">Join a Room</h2>
        <p className="text-[#cbc3d7] text-sm mb-6">Enter the 6-character invite code shared by the host.</p>

        <input
          className="w-full bg-[#070d1f] border border-white/10 rounded-xl px-4 py-3 text-[#dce1fb] outline-none focus:ring-2 focus:ring-[#4cd7f6] transition-all mb-3 uppercase tracking-widest font-bold text-center text-xl placeholder:text-[#cbc3d7]/40 placeholder:tracking-normal placeholder:font-normal placeholder:text-base"
          placeholder="Room Code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          autoFocus
        />
        <input
          className="w-full bg-[#070d1f] border border-white/10 rounded-xl px-4 py-3 text-[#dce1fb] outline-none focus:ring-2 focus:ring-[#4cd7f6] transition-all mb-4"
          placeholder="Your name"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />

        {error && (
          <p className="text-[#ffb4ab] text-sm mb-3 text-center">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-[#cbc3d7] hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            id="join-room-confirm"
            onClick={handleJoin}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#4cd7f6] text-[#003640] font-bold hover:brightness-110 transition-all glow-cyan disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
