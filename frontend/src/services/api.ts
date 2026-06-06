// REST API helper

const BASE = '/api';

export async function fetchRoom(roomId: string) {
  const res = await fetch(`${BASE}/rooms/${roomId}`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  if (!res.ok) throw new Error('Room not found');
  return res.json();
}

export async function resolveInviteCode(code: string) {
  const res = await fetch(`${BASE}/rooms/code/${code}`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });
  if (!res.ok) throw new Error('Invalid invite code');
  return res.json();
}
