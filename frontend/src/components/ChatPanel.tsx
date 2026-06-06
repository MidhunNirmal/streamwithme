// ChatPanel — real-time glassmorphic chat sidebar matching the HTML prototype

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  myId: string;
  onSendMessage: (text: string) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getUserColor(participantId: string): string {
  if (participantId === 'system') return '#cbc3d7';
  const colors = ['#d0bcff', '#4cd7f6', '#bec6e0', '#a078ff', '#03b5d3'];
  let hash = 0;
  for (let i = 0; i < participantId.length; i++) hash = (hash + participantId.charCodeAt(i)) % colors.length;
  return colors[hash];
}

export default function ChatPanel({ messages, myId, onSendMessage }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Feed */}
      <div
        ref={feedRef}
        className="flex-grow overflow-y-auto px-6 py-3 space-y-6 custom-scrollbar"
      >
        {messages.map(msg => (
          <div key={msg.id} className="flex flex-col gap-1">
            {msg.participantId === 'system' ? (
              <div className="text-center">
                <span className="text-xs text-[#cbc3d7]/60 bg-white/5 px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold"
                    style={{ color: getUserColor(msg.participantId) }}
                  >
                    {msg.username}
                  </span>
                  {msg.participantId === myId && (
                    <span className="text-[10px] bg-[#d0bcff]/20 text-[#d0bcff] px-1.5 rounded uppercase tracking-wider">
                      You
                    </span>
                  )}
                  <span className="text-[10px] text-[#cbc3d7]/60">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="p-3 glass-panel rounded-xl rounded-tl-none text-sm text-[#dce1fb] leading-relaxed">
                  {msg.text}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-6 border-t border-white/5 bg-[#191f31]/50">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            id="chat-input"
            className="w-full bg-[#070d1f] border border-white/10 rounded-xl px-6 py-3 focus:ring-2 focus:ring-[#4cd7f6] focus:border-transparent outline-none transition-all placeholder:text-[#cbc3d7]/50 text-sm text-[#dce1fb]"
            placeholder="Type a message..."
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            id="chat-send-btn"
            onClick={handleSend}
            className="absolute right-3 text-[#4cd7f6] hover:scale-110 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <div className="flex items-center gap-6 mt-3 px-1">
          <button className="text-[#cbc3d7] hover:text-[#dce1fb] transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mood</span>
          </button>
          <button className="text-[#cbc3d7] hover:text-[#dce1fb] transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>gif_box</span>
          </button>
          <button className="text-[#cbc3d7] hover:text-[#dce1fb] transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>attachment</span>
          </button>
        </div>
      </div>
    </>
  );
}
