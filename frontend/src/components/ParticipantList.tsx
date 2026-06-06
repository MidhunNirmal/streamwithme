// ParticipantList — displays all participants with mic/speaking status

import type { Participant } from '../types';

interface ParticipantListProps {
  participants: Participant[];
  myId: string;
  isHost: boolean;
  onRemove?: (id: string) => void;
  onMuteMic?: (id: string, muted: boolean) => void;
}

const AVATAR_COLORS = ['#d0bcff', '#4cd7f6', '#bec6e0', '#a078ff', '#03b5d3', '#ffb4ab'];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export default function ParticipantList({
  participants,
  myId,
  isHost,
  onRemove,
}: ParticipantListProps) {
  return (
    <div className="flex-grow overflow-y-auto custom-scrollbar divide-y divide-white/5">
      {participants.map(p => (
        <div
          key={p.id}
          className="flex items-center justify-between p-6 hover:bg-white/5 transition-all"
        >
          {/* Avatar + Info */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold select-none flex-shrink-0 ${
                p.isSpeaking ? 'speaking-indicator' : ''
              }`}
              style={{
                borderColor: p.isHost ? '#d0bcff' : 'rgba(255,255,255,0.1)',
                background: `${getAvatarColor(p.id)}20`,
                color: getAvatarColor(p.id),
              }}
            >
              {p.username[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-[#dce1fb] flex items-center gap-2">
                {p.username}
                {p.isHost && (
                  <span className="text-[10px] font-semibold text-[#d0bcff] uppercase tracking-widest px-1.5 bg-[#d0bcff]/10 rounded">
                    HOST
                  </span>
                )}
                {p.id === myId && (
                  <span className="text-[10px] text-[#cbc3d7]/60">(you)</span>
                )}
              </p>
              <p className="text-xs text-[#cbc3d7]/60">
                {p.isSpeaking ? '🎙 Speaking' : p.isMuted ? 'Muted' : 'Listening'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Mic indicator */}
            <span
              className={`material-symbols-outlined text-lg ${
                p.isMuted ? 'text-[#cbc3d7]/40' : p.isSpeaking ? 'text-[#4cd7f6]' : 'text-[#cbc3d7]'
              }`}
              style={{ fontSize: '20px' }}
            >
              {p.isMuted ? 'mic_off' : 'mic'}
            </span>

            {/* Admin controls — host can remove others */}
            {isHost && !p.isHost && p.id !== myId && (
              <button
                onClick={() => onRemove?.(p.id)}
                className="p-1 text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-lg transition-all"
                title="Remove participant"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>block</span>
              </button>
            )}
          </div>
        </div>
      ))}

      {participants.length === 0 && (
        <div className="p-8 text-center text-[#cbc3d7]/40 text-sm">
          No participants yet.
        </div>
      )}
    </div>
  );
}
