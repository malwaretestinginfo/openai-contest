import { NextRequest, NextResponse } from "next/server";
import { verifyApiSecurity } from "@/lib/api-security";
import { getRoomSummary } from "@/lib/room-registry";

export async function GET(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  const roomId = request.nextUrl.searchParams.get("roomId") ?? "";
  const summary = getRoomSummary(roomId);
  if (!summary) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }

  return NextResponse.json({
    exists: true,
    roomId: summary.roomId,
    roomName: summary.roomName,
    requiresPassword: summary.requiresPassword
  });
}

