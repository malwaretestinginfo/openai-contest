import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";

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
  ticketId: string;
  roomId: string;
  displayName: string;
  color: string;
  expiresAt: number;
};

const TICKET_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const TICKET_VERSION = 1;

type AccessTicketPayload = {
  v: number;
  jti: string;
  roomId: string;
  displayName: string;
  color: string;
  exp: number;
};

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function randomColor() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getTicketSecret() {
  return process.env.ROOM_TICKET_SECRET || process.env.LIVEBLOCKS_SECRET_KEY || "";
}

function signTicketPayload(payloadBase64: string, secret: string) {
  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

function createAccessToken(payload: AccessTicketPayload) {
  const secret = getTicketSecret();
  if (!secret) {
    return null;
  }

  const payloadBase64 = toBase64Url(JSON.stringify(payload));
  const signature = signTicketPayload(payloadBase64, secret);
  return `${payloadBase64}.${signature}`;
}

function parseAccessToken(token: string | undefined): AccessTicketPayload | null {
  if (!token) {
    return null;
  }

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return null;
  }

  const secret = getTicketSecret();
  if (!secret) {
    return null;
  }

  const expectedSignature = signTicketPayload(payloadBase64, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payloadBase64)) as AccessTicketPayload;
    if (parsed.v !== TICKET_VERSION) {
      return null;
    }
    if (typeof parsed.jti !== "string" || !parsed.jti) {
      return null;
    }
    if (typeof parsed.roomId !== "string" || !parsed.roomId) {
      return null;
    }
    if (typeof parsed.displayName !== "string" || !parsed.displayName) {
      return null;
    }
    if (typeof parsed.color !== "string" || !parsed.color) {
      return null;
    }
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
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

async function getRoomById(roomId: string): Promise<RoomRecord | null> {
  const db = await getDb();
  const result = await db.query<{
    room_id: string;
    room_name: string;
    password_hash: string | null;
    created_at: string | number;
  }>("SELECT room_id, room_name, password_hash, created_at FROM rooms WHERE room_id = $1", [roomId]);

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    roomId: row.room_id,
    roomName: row.room_name,
    passwordHash: row.password_hash ?? undefined,
    createdAt: Number(row.created_at)
  };
}

export async function createRoom(params: { roomId: string; roomName: string; password?: string }) {
  const roomId = normalizeRoomId(params.roomId);
  const roomName = params.roomName.trim().slice(0, 80);

  if (!roomId) {
    return { ok: false as const, error: "Room ID is required." };
  }

  if (!roomName) {
    return { ok: false as const, error: "Room name is required." };
  }

  const password = params.password?.trim() ?? "";
  const passwordHash = password ? hashPassword(password) : undefined;
  const createdAt = Date.now();
  const db = await getDb();

  try {
    await db.query(
      "INSERT INTO rooms (room_id, room_name, password_hash, created_at) VALUES ($1, $2, $3, $4)",
      [roomId, roomName, passwordHash ?? null, createdAt]
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return { ok: false as const, error: "Room already exists." };
    }
    throw error;
  }

  return { ok: true as const, roomId };
}

export async function getRoomSummary(roomIdInput: string): Promise<RoomSummary | null> {
  const roomId = normalizeRoomId(roomIdInput);
  const room = await getRoomById(roomId);
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

export async function joinRoom(params: { roomId: string; displayName: string; password?: string }) {
  const roomId = normalizeRoomId(params.roomId);
  const room = await getRoomById(roomId);

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

  const ticketId = randomBytes(16).toString("hex");
  const expiresAt = Date.now() + TICKET_TTL_MS;
  const color = randomColor();
  const payload: AccessTicketPayload = {
    v: TICKET_VERSION,
    jti: ticketId,
    roomId,
    displayName,
    color,
    exp: expiresAt
  };
  const token = createAccessToken(payload);
  if (!token) {
    return { ok: false as const, error: "Room ticket secret is missing." };
  }

  const ticket: AccessTicket = {
    token,
    ticketId,
    roomId,
    displayName,
    color,
    expiresAt
  };

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
  const roomId = normalizeRoomId(roomIdInput);
  const payload = parseAccessToken(token);
  if (!payload) {
    return null;
  }
  if (payload.roomId !== roomId) {
    return null;
  }
  if (payload.exp <= Date.now()) {
    return null;
  }

  return {
    token: token as string,
    ticketId: payload.jti,
    roomId: payload.roomId,
    displayName: payload.displayName,
    color: payload.color,
    expiresAt: payload.exp
  };
}
