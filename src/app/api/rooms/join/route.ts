import { NextRequest, NextResponse } from "next/server";
import { verifyApiSecurity } from "@/lib/api-security";
import { joinRoom } from "@/lib/room-registry";

const ROOM_TICKET_COOKIE = "__room_ticket";

export async function POST(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  const body = await request.json();
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const joined = joinRoom({ roomId, displayName, password });
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

