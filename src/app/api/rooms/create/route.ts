import { NextRequest, NextResponse } from "next/server";
import { verifyApiSecurity } from "@/lib/api-security";
import { createRoom, joinRoom, normalizeRoomId } from "@/lib/room-registry";

const ROOM_TICKET_COOKIE = "__room_ticket";

function generateRoomIdFromName(name: string) {
  const base = normalizeRoomId(name).slice(0, 28) || "private-room";
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${base}-${random}`;
}

export async function POST(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  const body = await request.json();
  const roomName = typeof body?.roomName === "string" ? body.roomName : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName : "";
  const roomPassword = typeof body?.password === "string" ? body.password : "";
  const requestedRoomId = typeof body?.roomId === "string" ? body.roomId : "";
  const roomId = requestedRoomId ? normalizeRoomId(requestedRoomId) : generateRoomIdFromName(roomName);

  const created = await createRoom({
    roomId,
    roomName,
    password: roomPassword
  });

  if (!created.ok) {
    return NextResponse.json({ error: created.error }, { status: 400 });
  }

  const joined = await joinRoom({
    roomId: created.roomId,
    displayName,
    password: roomPassword
  });

  if (!joined.ok) {
    return NextResponse.json({ error: joined.error }, { status: 400 });
  }

  const response = NextResponse.json({
    roomId: joined.room.roomId,
    roomName: joined.room.roomName
  });

  response.cookies.set(ROOM_TICKET_COOKIE, joined.ticket.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
