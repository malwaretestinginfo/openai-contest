import { createHash, randomBytes } from "crypto";

export type RoomSummary = {
  roomId: string;
  roomName: string;
  requiresPassword: boolean;
  createdAt: number;
};

type RoomRecord = {
  roomId: string;
  roomName: string;
  passwordHash?: string;
  createdAt: number;
};

type AccessTicket = {
  token: string;
  roomId: string;
  displayName: string;
  color: string;
  expiresAt: number;
};

const rooms = new Map<string, RoomRecord>();
const tickets = new Map<string, AccessTicket>();
const TICKET_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function cleanExpiredTickets() {
  const now = Date.now();
  for (const [token, ticket] of tickets.entries()) {
    if (ticket.expiresAt <= now) {
      tickets.delete(token);
    }
  }
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function randomColor() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
}

export function normalizeRoomId(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export function createRoom(params: { roomId: string; roomName: string; password?: string }) {
  const roomId = normalizeRoomId(params.roomId);
  const roomName = params.roomName.trim().slice(0, 80);

  if (!roomId) {
    return { ok: false as const, error: "Room ID is required." };
  }

  if (!roomName) {
    return { ok: false as const, error: "Room name is required." };
  }

  if (rooms.has(roomId)) {
    return { ok: false as const, error: "Room already exists." };
  }

  const password = params.password?.trim() ?? "";
  rooms.set(roomId, {
    roomId,
    roomName,
    passwordHash: password ? hashPassword(password) : undefined,
    createdAt: Date.now()
  });

  return { ok: true as const, roomId };
}

export function getRoomSummary(roomIdInput: string): RoomSummary | null {
  const roomId = normalizeRoomId(roomIdInput);
  const room = rooms.get(roomId);
  if (!room) {
    return null;
  }

  return {
    roomId: room.roomId,
    roomName: room.roomName,
    requiresPassword: Boolean(room.passwordHash),
    createdAt: room.createdAt
  };
}

export function joinRoom(params: { roomId: string; displayName: string; password?: string }) {
  cleanExpiredTickets();
  const roomId = normalizeRoomId(params.roomId);
  const room = rooms.get(roomId);

  if (!room) {
    return { ok: false as const, error: "Room not found." };
  }

  const password = params.password?.trim() ?? "";
  if (room.passwordHash && hashPassword(password) !== room.passwordHash) {
    return { ok: false as const, error: "Invalid room password." };
  }

  const displayName = params.displayName.trim().slice(0, 40);
  if (!displayName) {
    return { ok: false as const, error: "Display name is required." };
  }

  const token = randomBytes(24).toString("hex");
  const ticket: AccessTicket = {
    token,
    roomId,
    displayName,
    color: randomColor(),
    expiresAt: Date.now() + TICKET_TTL_MS
  };
  tickets.set(token, ticket);

  return {
    ok: true as const,
    ticket,
    room: {
      roomId: room.roomId,
      roomName: room.roomName
    }
  };
}

export function validateRoomAccess(token: string | undefined, roomIdInput: string) {
  cleanExpiredTickets();
  if (!token) {
    return null;
  }

  const roomId = normalizeRoomId(roomIdInput);
  const ticket = tickets.get(token);
  if (!ticket) {
    return null;
  }
  if (ticket.roomId !== roomId) {
    return null;
  }
  if (ticket.expiresAt <= Date.now()) {
    tickets.delete(token);
    return null;
  }
  return ticket;
}

