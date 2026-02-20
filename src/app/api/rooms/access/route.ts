import { NextRequest, NextResponse } from "next/server";
import { verifyApiSecurity } from "@/lib/api-security";
import { validateRoomAccess } from "@/lib/room-registry";

const ROOM_TICKET_COOKIE = "__room_ticket";

export async function GET(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  const roomId = request.nextUrl.searchParams.get("roomId") ?? "";
  const token = request.cookies.get(ROOM_TICKET_COOKIE)?.value;
  const access = validateRoomAccess(token, roomId);

  if (!access) {
    return NextResponse.json({ authorized: false }, { status: 401 });
  }

  return NextResponse.json({
    authorized: true,
    displayName: access.displayName
  });
}

