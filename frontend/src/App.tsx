import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import LandingPage from './pages/LandingPage';
import ViewingRoom from './pages/ViewingRoom';
import AdminDashboard from './pages/AdminDashboard';
import { connectAndEmit } from './services/socket';
import { useNavigate } from 'react-router-dom';

// Join via invite link: /join/ABC123
function JoinRedirect() {
  const navigate = useNavigate();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    const code = window.location.pathname.split('/join/')[1];
    if (!code) { navigate('/'); return; }

    const username = localStorage.getItem('swm_username') ||
      `Viewer_${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    connectAndEmit('room:join', { code: code.toUpperCase(), username }, (res: any) => {
      if (res.success) {
        navigate(`/room/${res.roomId}`, { state: { room: res.room, isHost: false } });
      } else {
        navigate('/');
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0c1324] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#d0bcff]/30 border-t-[#d0bcff] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#cbc3d7]">Joining room…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/room/:roomId" element={<ViewingRoom />} />
        <Route path="/admin/:roomId" element={<AdminDashboard />} />
        <Route path="/join/:code" element={<JoinRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
