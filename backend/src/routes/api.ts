// REST API routes for room management

import { Router, Request, Response } from 'express';
import { roomManager } from '../rooms/RoomManager';

const router = Router();

// GET /api/health
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount(), timestamp: Date.now() });
});

// GET /api/rooms/:id — get room info (for page refresh / direct link)
router.get('/rooms/:id', (req: Request, res: Response) => {
  const room = roomManager.getRoomById(req.params.id as string);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    id: room.id,
    inviteCode: room.inviteCode,
    participantCount: room.participants.size,
    permissions: room.permissions,
    sync: room.sync,
    createdAt: room.createdAt,
  });
});

// GET /api/rooms/code/:code — resolve invite code → room ID
router.get('/rooms/code/:code', (req: Request, res: Response) => {
  const room = roomManager.getRoomByCode(req.params.code as string);
  if (!room) {
    return res.status(404).json({ error: 'Invalid invite code' });
  }
  res.json({ roomId: room.id, inviteCode: room.inviteCode });
});

export default router;
