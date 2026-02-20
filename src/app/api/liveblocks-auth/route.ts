import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { verifyApiSecurity } from "@/lib/api-security";
import { validateRoomAccess } from "@/lib/room-registry";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || ""
});
const ROOM_TICKET_COOKIE = "__room_ticket";

export async function POST(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return NextResponse.json(
      { error: "LIVEBLOCKS_SECRET_KEY is missing" },
      { status: 500 }
    );
  }

  const { room } = await request.json();
  const roomId = typeof room === "string" ? room : "";
  const ticketToken = request.cookies.get(ROOM_TICKET_COOKIE)?.value;
  const access = validateRoomAccess(ticketToken, roomId);
  if (!access) {
    return NextResponse.json({ error: "Room access denied" }, { status: 401 });
  }

  const userId = "user-" + access.ticketId;
  const name = access.displayName;
  const color = access.color;

  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, color }
  });

  session.allow(roomId, session.FULL_ACCESS);
  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}
