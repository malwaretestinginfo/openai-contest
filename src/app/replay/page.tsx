"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

type ReplayPayload = {
  roomId: string;
  roomName: string;
  createdAt: number;
  participants: string[];
  tasks: Array<{ id: string; title: string; status: string; assignee: string }>;
  runHistory: Array<{ id: string; language: string; preview: string; createdAt: number; ok: boolean }>;
  events: Array<{ id: string; type: string; actor: string; text: string; createdAt: number }>;
  note: string;
};

function decodePayload(raw: string | null): ReplayPayload | null {
  if (!raw) {
    return null;
  }
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
    return JSON.parse(json) as ReplayPayload;
  } catch {
    return null;
  }
}

export default function ReplayPage() {
  const searchParams = useSearchParams();
  const payload = useMemo(() => decodePayload(searchParams.get("data")), [searchParams]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl font-semibold">Read-only Session Replay</h1>
        {!payload ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            Invalid or missing replay data.
          </p>
        ) : (
          <>
            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-zinc-300">
                Room: <span className="font-semibold text-white">{payload.roomName}</span>
              </p>
              <p className="text-sm text-zinc-300">
                Created: {new Date(payload.createdAt).toLocaleString()}
              </p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-2 text-sm font-semibold">Participants</h2>
              <div className="flex flex-wrap gap-2">
                {payload.participants.map((participant) => (
                  <span className="rounded-full border border-white/20 px-2 py-1 text-xs" key={participant}>
                    {participant}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-2 text-sm font-semibold">Tasks</h2>
              <div className="space-y-2">
                {payload.tasks.map((task) => (
                  <div className="rounded-lg border border-white/10 p-2 text-xs" key={task.id}>
                    {task.title} - {task.status} - {task.assignee || "unassigned"}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-2 text-sm font-semibold">Runs</h2>
              <div className="space-y-2">
                {payload.runHistory.map((run) => (
                  <div className="rounded-lg border border-white/10 p-2 text-xs" key={run.id}>
                    [{new Date(run.createdAt).toLocaleTimeString()}] {run.language} - {run.ok ? "ok" : "error"} -{" "}
                    {run.preview}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-2 text-sm font-semibold">Session Events</h2>
              <div className="space-y-1">
                {payload.events.map((event) => (
                  <p className="text-xs text-zinc-300" key={event.id}>
                    [{new Date(event.createdAt).toLocaleTimeString()}] {event.type} - {event.actor}: {event.text}
                  </p>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-2 text-sm font-semibold">Notes</h2>
              <p className="whitespace-pre-wrap text-xs text-zinc-300">{payload.note || "(empty)"}</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

