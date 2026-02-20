"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSecurityCookies, getSecurityHeaders } from "@/lib/client-security";

type ApiError = {
  error?: string;
};

export default function HomePage() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"create" | "join" | null>(null);
  const [createRoomName, setCreateRoomName] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    ensureSecurityCookies();
    const cachedName = window.localStorage.getItem("pair-display-name") ?? "";
    if (cachedName) {
      setCreateDisplayName(cachedName);
      setJoinDisplayName(cachedName);
    }
  }, []);

  async function handleCreateRoom(event: FormEvent) {
    event.preventDefault();
    setCreateError("");
    setIsCreating(true);
    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders()
        },
        body: JSON.stringify({
          roomName: createRoomName,
          displayName: createDisplayName,
          password: createPassword
        })
      });
      const data = (await response.json()) as { roomId?: string } & ApiError;
      if (!response.ok || !data.roomId) {
        setCreateError(data.error ?? "Could not create room.");
        return;
      }
      window.localStorage.setItem("pair-display-name", createDisplayName.trim());
      router.push(`/room/${data.roomId}`);
    } catch {
      setCreateError("Could not create room.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinRoom(event: FormEvent) {
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
          roomId: joinRoomId,
          displayName: joinDisplayName,
          password: joinPassword
        })
      });
      const data = (await response.json()) as { roomId?: string } & ApiError;
      if (!response.ok || !data.roomId) {
        setJoinError(data.error ?? "Could not join room.");
        return;
      }
      window.localStorage.setItem("pair-display-name", joinDisplayName.trim());
      router.push(`/room/${data.roomId}`);
    } catch {
      setJoinError("Could not join room.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-[#05060a] px-4 pb-16 pt-4 text-white"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_-10%,rgba(255,109,26,0.14),transparent_40%),radial-gradient(circle_at_78%_18%,rgba(63,95,255,0.16),transparent_38%),linear-gradient(180deg,#08090f_0%,#06070b_100%)]" />

      <div className="relative mx-auto w-full max-w-[1380px]">
        <header className="mb-4 flex items-center justify-between rounded-2xl border border-white/15 bg-black/70 px-4 py-3 backdrop-blur-xl">
          <span className="text-xl font-semibold tracking-tight">Pair Studio</span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-white/20 bg-[#12141c] px-3 py-1.5 text-sm text-[#d2d4df] hover:border-white/35"
              onClick={() => {
                setCreateError("");
                setActiveModal("create");
              }}
              type="button"
            >
              Create Room
            </button>
            <button
              className="rounded-lg border border-[#ff6d1a] bg-gradient-to-r from-[#ff7b20] to-[#ff4e1a] px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() => {
                setJoinError("");
                setActiveModal("join");
              }}
              type="button"
            >
              Join Room
            </button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#080a11]/85 px-6 py-12 shadow-[0_24px_80px_rgba(0,0,0,0.6)] md:px-10 md:py-14" id="product">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_20%,rgba(255,90,20,0.22),transparent_35%),radial-gradient(circle_at_76%_34%,rgba(67,111,255,0.22),transparent_34%)]" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-[#e7e8f0] md:text-6xl">
                Realtime pair-programming
                <span className="block bg-gradient-to-r from-[#ffad42] via-[#ff7f2f] to-[#ff5a1f] bg-clip-text text-transparent">
                  for technical teams
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[#babdca]">
                Ship faster with one collaborative room for code, whiteboard, execution, and AI. Invite teammates instantly and keep everyone in sync.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  className="rounded-xl border border-[#ff6d1a] bg-gradient-to-r from-[#ff7b20] to-[#ff4e1a] px-6 py-3 text-sm font-semibold text-white"
                  onClick={() => {
                    setCreateError("");
                    setActiveModal("create");
                  }}
                  type="button"
                >
                  Create room
                </button>
                <button
                  className="rounded-xl border border-white/20 bg-[#11131a] px-6 py-3 text-sm font-semibold text-[#d4d6e1] hover:border-white/35"
                  onClick={() => {
                    setJoinError("");
                    setActiveModal("join");
                  }}
                  type="button"
                >
                  Join room
                </button>
              </div>
            </div>

            <div className="relative h-[360px] rounded-2xl border border-white/10 bg-[#06070c] p-4">
              <div className="absolute right-10 top-8 h-56 w-28 rotate-12 rounded-xl border border-[#ffaf78]/40 bg-[linear-gradient(160deg,#ff5d1a_0%,#ff9c58_42%,#1b2cb6_100%)] opacity-90 shadow-[0_0_70px_rgba(255,106,31,0.35)]" />
              <div className="absolute inset-x-8 bottom-10 h-16 rounded-full bg-[radial-gradient(circle,rgba(255,120,45,0.45),rgba(76,94,255,0.14),transparent_72%)] blur-2xl" />
              <div className="absolute left-4 right-4 top-4 rounded-xl border border-white/10 bg-[#0f121b]/80 px-3 py-2 text-xs text-[#afb3c4]">
                Live room preview
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3" id="use-cases">
          <div className="rounded-2xl border border-white/10 bg-[#0c0f16]/90 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9ea3b8]">Use Case</p>
            <h3 className="mt-2 text-lg font-semibold">Live Interviews</h3>
            <p className="mt-2 text-sm leading-6 text-[#b8bccb]">
              Interviewers and candidates share one coding room with synced editor, runtime output, and whiteboard.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0c0f16]/90 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9ea3b8]">Use Case</p>
            <h3 className="mt-2 text-lg font-semibold">Incident Response</h3>
            <p className="mt-2 text-sm leading-6 text-[#b8bccb]">
              Spin up a secure room, coordinate debugging steps, and run snippets while everyone follows in realtime.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0c0f16]/90 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9ea3b8]">Use Case</p>
            <h3 className="mt-2 text-lg font-semibold">Mentoring & Onboarding</h3>
            <p className="mt-2 text-sm leading-6 text-[#b8bccb]">
              Teach architecture and code patterns in one place with collaborative drawing and guided edits.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#090b12]/90 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#9ea3b8]">Security & Access</p>
              <h2 className="mt-2 text-3xl font-semibold">Built for private collaboration</h2>
              <ul className="mt-4 space-y-3 text-sm text-[#bcc0cf]">
                <li>Optional room passwords before join</li>
                <li>Room access tickets validated server-side</li>
                <li>CSRF-protected API endpoints</li>
                <li>Per-user presence and join notifications</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0f121a] p-5">
              <h3 className="text-lg font-semibold text-white">Access flow</h3>
              <ol className="mt-3 space-y-2 text-sm text-[#bcc0cf]">
                <li>1. User enters room ID and optional password</li>
                <li>2. Server validates room access</li>
                <li>3. Room ticket cookie is issued</li>
                <li>4. Liveblocks auth is scoped to this room</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#0b0d14]/90 p-6 md:p-8" id="docs">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9ea3b8]">FAQ</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#10131b] p-4">
              <p className="font-semibold">Do users need an account?</p>
              <p className="mt-2 text-sm text-[#b8bccb]">No. They join with a display name and valid room access.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#10131b] p-4">
              <p className="font-semibold">Can rooms be password-protected?</p>
              <p className="mt-2 text-sm text-[#b8bccb]">Yes. Passwords are optional at creation and required on join.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#10131b] p-4">
              <p className="font-semibold">Is collaboration realtime?</p>
              <p className="mt-2 text-sm text-[#b8bccb]">Editor and whiteboard updates sync instantly through Liveblocks.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#10131b] p-4">
              <p className="font-semibold">Can we run code inside the room?</p>
              <p className="mt-2 text-sm text-[#b8bccb]">Yes. Use the runtime picker and execute directly from the workspace.</p>
            </div>
          </div>
        </section>

        <section className="mb-4 mt-5 rounded-3xl border border-[#ff6d1a]/35 bg-gradient-to-r from-[#1a0f0b] via-[#121419] to-[#0f1220] p-7 md:p-9">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-semibold text-white">Ready to launch your room?</h2>
              <p className="mt-2 text-sm text-[#c5c8d5]">Create a private collaborative session in under 10 seconds.</p>
            </div>
            <div className="flex gap-3">
              <button
                className="rounded-xl border border-[#ff6d1a] bg-gradient-to-r from-[#ff7b20] to-[#ff4e1a] px-6 py-3 text-sm font-semibold text-white"
                onClick={() => {
                  setCreateError("");
                  setActiveModal("create");
                }}
                type="button"
              >
                Create Room
              </button>
              <button
                className="rounded-xl border border-white/20 bg-[#11131a] px-6 py-3 text-sm font-semibold text-[#d4d6e1]"
                onClick={() => {
                  setJoinError("");
                  setActiveModal("join");
                }}
                type="button"
              >
                Join Room
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2" id="community">
          <div className="rounded-2xl border border-white/10 bg-[#0c0f16]/90 p-6">
            <h3 className="text-xl font-semibold">Community</h3>
            <p className="mt-2 text-sm text-[#b8bccb]">
              Share templates, collaborate on workflows, and improve onboarding patterns with your team.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0c0f16]/90 p-6">
            <h3 className="text-xl font-semibold">Support</h3>
            <p className="mt-2 text-sm text-[#b8bccb]">
              Built for pair sessions, incident calls, and interview loops with realtime visibility.
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-[#0c0f16]/90 p-6" id="pricing">
          <h3 className="text-xl font-semibold">Pricing</h3>
          <p className="mt-2 text-sm text-[#b8bccb]">
            Start with private rooms and scale to team workflows. Use Create Room to start your first session.
          </p>
        </section>
      </div>

      <div
        aria-hidden={activeModal === null}
        className={`fixed inset-0 z-40 bg-[#04040a]/80 transition-opacity ${activeModal ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setActiveModal(null)}
      />

      <div
        className={`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-[#0f121a]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all ${activeModal ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
      >
        {activeModal === "create" ? (
          <form onSubmit={handleCreateRoom}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create Room</h2>
              <button className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-[#d2d5e2]" onClick={() => setActiveModal(null)} type="button">
                Close
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a9adbd]">Room Name</label>
              <input className="w-full rounded-xl border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white outline-none focus:border-[#ff6d1a]/70" onChange={(event) => setCreateRoomName(event.target.value)} placeholder="Design Review" required value={createRoomName} />
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a9adbd]">Display Name</label>
              <input className="w-full rounded-xl border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white outline-none focus:border-[#ff6d1a]/70" onChange={(event) => setCreateDisplayName(event.target.value)} placeholder="Alex" required value={createDisplayName} />
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a9adbd]">Password (optional)</label>
              <input className="w-full rounded-xl border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white outline-none focus:border-[#ff6d1a]/70" onChange={(event) => setCreatePassword(event.target.value)} placeholder="••••••••" type="password" value={createPassword} />
            </div>
            {createError ? <p className="mt-3 text-sm text-[#ff9aa9]">{createError}</p> : null}
            <button className="mt-4 w-full rounded-xl border border-[#ff6d1a] bg-gradient-to-r from-[#ff7b20] to-[#ff4e1a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isCreating} type="submit">
              {isCreating ? "Creating..." : "Create and Enter"}
            </button>
          </form>
        ) : null}

        {activeModal === "join" ? (
          <form onSubmit={handleJoinRoom}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Join Room</h2>
              <button className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-[#d2d5e2]" onClick={() => setActiveModal(null)} type="button">
                Close
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a9adbd]">Room ID</label>
              <input className="w-full rounded-xl border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white outline-none focus:border-[#ff6d1a]/70" onChange={(event) => setJoinRoomId(event.target.value)} placeholder="design-review-57f2d3aa" required value={joinRoomId} />
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a9adbd]">Display Name</label>
              <input className="w-full rounded-xl border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white outline-none focus:border-[#ff6d1a]/70" onChange={(event) => setJoinDisplayName(event.target.value)} placeholder="Alex" required value={joinDisplayName} />
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#a9adbd]">Room Password (if required)</label>
              <input className="w-full rounded-xl border border-white/15 bg-[#0a0d14] px-3 py-2 text-sm text-white outline-none focus:border-[#ff6d1a]/70" onChange={(event) => setJoinPassword(event.target.value)} placeholder="••••••••" type="password" value={joinPassword} />
            </div>
            {joinError ? <p className="mt-3 text-sm text-[#ff9aa9]">{joinError}</p> : null}
            <button className="mt-4 w-full rounded-xl border border-[#ff6d1a] bg-gradient-to-r from-[#ff7b20] to-[#ff4e1a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isJoining} type="submit">
              {isJoining ? "Joining..." : "Join Room"}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
