import { Suspense } from "react";
import ReplayClient from "@/app/replay/replay-client";

function ReplayFallback() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl font-semibold">Read-only Session Replay</h1>
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
          Loading replay...
        </p>
      </div>
    </main>
  );
}

export default function ReplayPage() {
  return (
    <Suspense fallback={<ReplayFallback />}>
      <ReplayClient />
    </Suspense>
  );
}
