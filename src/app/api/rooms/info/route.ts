import { NextRequest, NextResponse } from "next/server";
import { verifyApiSecurity } from "@/lib/api-security";
import { getRoomSummary, normalizeRoomId, validateRoomAccess } from "@/lib/room-registry";

const ROOM_TICKET_COOKIE = "__room_ticket";

export async function GET(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  const roomId = request.nextUrl.searchParams.get("roomId") ?? "";
  const summary = getRoomSummary(roomId);
  if (!summary) {
    const normalizedRoomId = normalizeRoomId(roomId);
    if (!normalizedRoomId) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    const token = request.cookies.get(ROOM_TICKET_COOKIE)?.value;
    const access = validateRoomAccess(token, normalizedRoomId);
    if (!access) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    // In serverless environments, in-memory room metadata can be lost between requests.
    // If the user has a valid signed room ticket, we still allow the route to load.
    return NextResponse.json({
      exists: true,
      roomId: normalizedRoomId,
      roomName: normalizedRoomId,
      requiresPassword: false
    });
  }

  return NextResponse.json({
    exists: true,
    roomId: summary.roomId,
    roomName: summary.roomName,
    requiresPassword: summary.requiresPassword
  });
}
