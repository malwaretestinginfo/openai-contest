"use client";

import { ClientSideSuspense, LiveblocksProvider, RoomProvider } from "@liveblocks/react/suspense";
import { LiveList } from "@liveblocks/client";
import type { RunHistoryEntry, SessionEvent, TaskItem, WhiteboardStroke } from "@/liveblocks.config";
import WorkspaceShell from "@/components/workspace-shell";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ensureSecurityCookies, getSecurityHeaders } from "@/lib/client-security";

type RoomViewProps = {
  roomId: string;
};

type RoomInfoResponse = {
  exists: boolean;
  roomName?: string;
  requiresPassword?: boolean;
};

type AccessResponse = {
  authorized: boolean;
  displayName?: string;
};

export default function RoomView({ roomId }: RoomViewProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "join-required" | "not-found">("loading");
  const [roomName, setRoomName] = useState<string>(roomId);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    ensureSecurityCookies();
    const cachedName = window.localStorage.getItem("pair-display-name") ?? "";
    if (cachedName) {
      setDisplayName(cachedName);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveAccess() {
      try {
        const infoResponse = await fetch(`/api/rooms/info?roomId=${encodeURIComponent(roomId)}`, {
          method: "GET",
          headers: { ...getSecurityHeaders() }
        });

        if (!infoResponse.ok) {
          if (!cancelled) {
            setStatus("not-found");
          }
          return;
        }

        const info = (await infoResponse.json()) as RoomInfoResponse;
        if (!info.exists) {
          if (!cancelled) {
            setStatus("not-found");
          }
          return;
        }

        if (!cancelled) {
          setRoomName(info.roomName ?? roomId);
          setRequiresPassword(Boolean(info.requiresPassword));
        }

        const accessResponse = await fetch(`/api/rooms/access?roomId=${encodeURIComponent(roomId)}`, {
          method: "GET",
          headers: { ...getSecurityHeaders() }
        });

        if (!accessResponse.ok) {
          if (!cancelled) {
            setStatus("join-required");
          }
          return;
        }

        const access = (await accessResponse.json()) as AccessResponse;
        if (!cancelled) {
          if (access.displayName) {
            setDisplayName(access.displayName);
          }
          setStatus(access.authorized ? "ready" : "join-required");
        }
      } catch {
        if (!cancelled) {
          setStatus("join-required");
        }
      }
    }

    resolveAccess();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  async function joinRoom(event: FormEvent) {
    event.preventDefault();
    setJoinError("");
    setIsJoining(true);

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders()
        },
        body: JSON.stringify({
          roomId,
          displayName,
          password
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setJoinError(data.error ?? "Could not join room.");
        return;
      }

      window.localStorage.setItem("pair-display-name", displayName.trim());
      setStatus("ready");
    } catch {
      setJoinError("Could not join room.");
    } finally {
      setIsJoining(false);
    }
  }

  const authEndpoint = useMemo(
    () => async (room?: string) => {
      const response = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders()
        },
        body: JSON.stringify({ room: room ?? roomId })
      });

      if (!response.ok) {
        throw new Error("Liveblocks auth failed");
      }

      return await response.json();
    },
    [roomId]
  );

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-sm text-white/70">
        Loading room...
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="flex h-screen items-center justify-center bg-black p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/20 bg-black p-6 text-center">
          <h1 className="text-xl font-semibold">Room not found</h1>
          <p className="mt-2 text-sm text-white/70">Create this room first from the home page.</p>
          <a className="mt-4 inline-block rounded-lg border border-white bg-white px-4 py-2 text-sm font-semibold text-black" href="/">
            Go to home
          </a>
        </div>
      </div>
    );
  }

  if (status === "join-required") {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#060510] p-4 text-[#f2f0ff]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(130,95,255,0.24),transparent_42%),radial-gradient(circle_at_82%_18%,rgba(85,130,255,0.14),transparent_40%),linear-gradient(180deg,#0d0b1e_0%,#080711_100%)]" />
        <form
          className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#110d24]/75 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          onSubmit={joinRoom}
        >
          <h1 className="text-xl font-semibold text-[#f1ecff]">{roomName}</h1>
          <p className="mt-1 text-sm text-[#b8addf]">Enter your details to join this room.</p>
          <div className="mt-4 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#b8addf]">Display Name</label>
            <input
              className="w-full rounded-xl border border-white/15 bg-[#0f0c20]/90 px-3 py-2 text-sm text-[#efeaff] outline-none focus:border-[#8f6bff]/60"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Alex"
              required
              value={displayName}
            />
          </div>
          {requiresPassword ? (
            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#b8addf]">Room Password</label>
              <input
                className="w-full rounded-xl border border-white/15 bg-[#0f0c20]/90 px-3 py-2 text-sm text-[#efeaff] outline-none focus:border-[#8f6bff]/60"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
          ) : null}
          {joinError ? <p className="mt-3 text-sm text-[#ffb8cc]">{joinError}</p> : null}
          <button
            className="mt-4 w-full rounded-xl border border-[#8f6bff] bg-[#7e57f2] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(126,87,242,0.4)] transition hover:bg-[#8a67ff] disabled:opacity-60"
            disabled={isJoining}
            type="submit"
          >
            {isJoining ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <LiveblocksProvider authEndpoint={authEndpoint}>
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
          cursorContext: null,
          editorCursorLine: null,
          editorCursorColumn: null,
          selectedTool: "pen"
        }}
        initialStorage={{
          strokes: new LiveList<WhiteboardStroke>([]),
          tasks: new LiveList<TaskItem>([]),
          sessionNote: "",
          runHistory: new LiveList<RunHistoryEntry>([]),
          sessionEvents: new LiveList<SessionEvent>([])
        }}
      >
        <ClientSideSuspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-black text-sm text-white/70">
              Connecting to room...
            </div>
          }
        >
          <WorkspaceShell roomId={roomId} roomName={roomName} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
