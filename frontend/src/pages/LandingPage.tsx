// Landing Page — exact conversion of the HTML prototype

import { useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=80';

export default function LandingPage() {
  const glowRef = useRef<HTMLDivElement>(null);

  // Ambient cursor glow effect
  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    const handleMouseMove = (e: MouseEvent) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="selection:bg-[#d0bcff] selection:text-[#3c0091]">
      {/* Ambient glow */}
      <div
        ref={glowRef}
        className="fixed pointer-events-none z-[1]"
        style={{
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(208,188,255,0.04) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          transition: 'opacity 1s',
        }}
      />

      <Navbar activePage="browse" />

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-[72px] overflow-hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1324]/20 via-[#0c1324]/60 to-[#0c1324] z-10" />
          <img
            src={HERO_IMAGE}
            alt="Cinematic theater experience"
            className="w-full h-full object-cover scale-105"
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 container mx-auto px-6 text-center max-w-4xl">
          <span className="inline-block px-3 py-1 mb-6 bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 text-[#4cd7f6] rounded-full text-xs font-semibold uppercase tracking-widest">
            Experience the Future
          </span>
          <h1 className="text-[32px] md:text-[48px] font-['Montserrat'] font-bold mb-6 text-[#dce1fb] leading-none">
            Stream Together,<br />
            <span className="text-[#d0bcff]">Anywhere In The World.</span>
          </h1>
          <p className="text-lg text-[#cbc3d7] mb-20 max-w-2xl mx-auto leading-relaxed">
            High-fidelity synchronized playback for movies, shows, and live events.
            Bring your friends into your own private digital cinema with zero latency.
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <button
              id="hero-start-room"
              onClick={() => document.getElementById('nav-create-room')?.click()}
              className="w-full md:w-auto px-20 py-6 bg-[#d0bcff] text-[#3c0091] rounded-xl text-2xl font-['Montserrat'] font-bold glow-primary transform hover:-translate-y-1 transition-all active:scale-95"
            >
              Start a Room
            </button>
            <button
              id="hero-join-link"
              onClick={() => document.getElementById('nav-join-room')?.click()}
              className="w-full md:w-auto px-20 py-6 glass-panel text-[#dce1fb] rounded-xl text-2xl font-['Montserrat'] border border-white/20 hover:bg-white/10 transition-all active:scale-95"
            >
              Join with Link
            </button>
          </div>
          <div className="mt-20 flex items-center justify-center gap-12 opacity-60">
            <span className="text-xs font-semibold tracking-widest uppercase">Works With</span>
            <div className="flex gap-6 grayscale brightness-200">
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>movie</span>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>live_tv</span>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>stadium</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Bento Grid ───────────────────────────────────────────── */}
      <section className="py-20 container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-2xl md:text-2xl font-['Montserrat'] font-bold text-[#dce1fb] mb-2">
            Premium Co-Watching
          </h2>
          <div className="h-1 w-24 bg-[#4cd7f6] mx-auto rounded-full" />
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: 'sync',
              color: '#4cd7f6',
              borderColor: 'border-l-[#4cd7f6]',
              bg: 'bg-[#4cd7f6]/20',
              title: 'Synchronized Playback',
              desc: 'Our proprietary sync engine ensures everyone is on the same frame, down to the millisecond. No more "3, 2, 1, play!" countdowns.',
            },
            {
              icon: 'chat',
              color: '#d0bcff',
              borderColor: 'border-l-[#d0bcff]',
              bg: 'bg-[#d0bcff]/20',
              title: 'Instant Chat',
              desc: 'Real-time glassmorphic chat overlay with rich media support, custom emojis, and reactive badges for your community.',
            },
            {
              icon: 'admin_panel_settings',
              color: '#bec6e0',
              borderColor: 'border-l-[#bec6e0]',
              bg: 'bg-[#bec6e0]/20',
              title: 'Admin Control',
              desc: 'Granular permissions to manage who can play, pause, or invite. Keep your watch party safe and smooth with ease.',
            },
          ].map(f => (
            <div
              key={f.title}
              className={`glass-panel p-6 rounded-xl hover:bg-[#23293c]/50 transition-all group border-l-4 ${f.borderColor}`}
            >
              <div className={`w-6 h-6 rounded-lg ${f.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                style={{ color: f.color, padding: '20px' }}>
                <span className="material-symbols-outlined">{f.icon}</span>
              </div>
              <h3 className="text-xl font-['Montserrat'] font-semibold text-[#dce1fb] mb-3">{f.title}</h3>
              <p className="text-[#cbc3d7] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Host Like a Pro */}
        <div className="mt-20 glass-panel rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
          <div className="p-20 flex flex-col justify-center">
            <h2 className="text-[32px] md:text-[48px] font-['Montserrat'] font-bold text-[#dce1fb] leading-tight mb-6">
              Host like a Pro.
            </h2>
            <p className="text-lg text-[#cbc3d7] mb-6 leading-relaxed">
              Everything you need to manage a room of 2 or 2,000. Integrated audio
              conferencing and high-def screen sharing included.
            </p>
            <ul className="space-y-3 mb-20">
              {['4K Ultra HD Support', 'Low Latency Audio', 'Private & Secure Rooms'].map(feat => (
                <li key={feat} className="flex items-center gap-3 text-[#4cd7f6]">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="text-sm text-[#dce1fb]">{feat}</span>
                </li>
              ))}
            </ul>
            <button
              id="explore-controls-btn"
              onClick={() => document.getElementById('nav-create-room')?.click()}
              className="bg-[#4cd7f6] text-[#003640] px-20 py-3 rounded-lg text-xl font-['Montserrat'] font-bold glow-secondary hover:brightness-110 transition-all self-start"
            >
              Explore Controls
            </button>
          </div>
          <div className="relative min-h-[400px] bg-gradient-to-br from-[#d0bcff]/10 to-[#4cd7f6]/10 flex items-center justify-center">
            {/* Dashboard preview illustration */}
            <div className="glass-panel rounded-2xl p-6 m-8 w-full max-w-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#4cd7f6] live-dot" />
                <span className="text-xs text-[#dce1fb] font-semibold">Live: Movie Night</span>
                <span className="ml-auto text-xs text-[#cbc3d7]">4 Active</span>
              </div>
              {['Alex (Host)', 'Sarah Chen', 'Marcus K.', 'Elena G.'].map((name, i) => (
                <div key={name} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: ['#d0bcff', '#4cd7f6', '#bec6e0', '#a078ff'][i] + '20', color: ['#d0bcff', '#4cd7f6', '#bec6e0', '#a078ff'][i] }}
                  >
                    {name[0]}
                  </div>
                  <span className="text-xs text-[#dce1fb]">{name}</span>
                  <span className="ml-auto material-symbols-outlined text-[#4cd7f6]" style={{ fontSize: '14px' }}>mic</span>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c1324] to-transparent hidden md:block" />
          </div>
        </div>
      </section>

      {/* ── Floating Chat Preview ─────────────────────────────────────────── */}
      <div className="fixed bottom-20 left-6 w-[360px] glass-panel p-6 rounded-xl hidden xl:block shadow-2xl opacity-90 hover:opacity-100 transition-opacity z-30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#4cd7f6] live-dot" />
            <span className="text-xs font-semibold text-[#dce1fb]">Live: Movie Night</span>
          </div>
          <span className="text-xs text-[#cbc3d7]">4 Active</span>
        </div>
        <div className="space-y-3 mb-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#191f31] flex-shrink-0" />
            <div className="flex-1 bg-[#23293c]/50 p-3 rounded-lg rounded-tl-none">
              <p className="text-xs">That scene was insane! 🍿</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#d0bcff]/20 border border-[#d0bcff]/20 flex-shrink-0" />
            <div className="flex-1 bg-[#d0bcff]/10 p-3 rounded-lg rounded-tl-none">
              <p className="text-xs text-[#d0bcff]">Admin: Starting next episode in 10s...</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <input
            className="w-full bg-[#070d1f] border-none rounded-lg text-sm px-3 py-2 focus:ring-1 focus:ring-[#4cd7f6] text-[#dce1fb] outline-none"
            placeholder="Say something..."
            type="text"
            readOnly
          />
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#cbc3d7] cursor-pointer">
            send
          </span>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#070d1f] py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-20">
            <div>
              <span className="text-2xl font-['Montserrat'] font-bold text-[#d0bcff] tracking-tighter">
                StreamWithMe
              </span>
              <p className="text-sm text-[#cbc3d7] mt-3">Redefining the digital cinematic experience.</p>
            </div>
            <div className="flex gap-20">
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-[#dce1fb] uppercase tracking-wider">Platform</span>
                <a href="#" className="text-sm text-[#cbc3d7] hover:text-[#4cd7f6] transition-colors">Browse</a>
                <a href="#" className="text-sm text-[#cbc3d7] hover:text-[#4cd7f6] transition-colors">Community</a>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-[#dce1fb] uppercase tracking-wider">Support</span>
                <a href="#" className="text-sm text-[#cbc3d7] hover:text-[#4cd7f6] transition-colors">Help Center</a>
                <a href="#" className="text-sm text-[#cbc3d7] hover:text-[#4cd7f6] transition-colors">Terms</a>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40">
            <span className="text-xs">© 2024 StreamWithMe Inc. All rights reserved.</span>
            <div className="flex gap-6">
              <span className="material-symbols-outlined">public</span>
              <span className="material-symbols-outlined">shield</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
