import RoomView from "./room-view";

type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = await params;
  return <RoomView roomId={roomId} />;
}
