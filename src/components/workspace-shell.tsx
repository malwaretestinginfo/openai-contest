"use client";

import AiAssistantPanel from "@/components/ai-assistant-panel";
import MonacoEditorPanel from "@/components/monaco-editor-panel";
import WhiteboardCanvas from "@/components/whiteboard-canvas";
import { getSecurityHeaders } from "@/lib/client-security";
import { useBroadcastEvent, useEventListener, useMutation, useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type EditorBridge = {
  getText: () => string;
  setText: (text: string) => void;
  addIntellisense: (label: string, kind: string, detail: string, insertText: string) => void;
};

type WorkspaceShellProps = {
  roomId: string;
  roomName?: string;
};

type MainTab = "whiteboard" | "code";
type UtilityTab = "backups" | "session" | "runner" | "chat" | "tasks" | "notes" | "history";
type EditorLanguage =
  | "python"
  | "javascript"
  | "typescript"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "go"
  | "rust"
  | "php"
  | "swift"
  | "kotlin"
  | "ruby"
  | "dart"
  | "r"
  | "sql"
  | "html"
  | "css"
  | "bash"
  | "powershell"
  | "scala"
  | "haskell"
  | "elixir"
  | "erlang"
  | "lua"
  | "matlab"
  | "objectivec"
  | "vbnet"
  | "vba"
  | "fsharp"
  | "perl"
  | "groovy"
  | "clojure"
  | "julia"
  | "assembly"
  | "cobol"
  | "fortran"
  | "ada"
  | "lisp"
  | "prolog"
  | "scratch"
  | "solidity"
  | "apex"
  | "plsql"
  | "abap"
  | "gdscript"
  | "qsharp"
  | "nim"
  | "crystal"
  | "rescript";
type CodeSnapshot = {
  id: string;
  createdAt: number;
  label: string;
  code: string;
};

type RunResult = {
  ok: boolean;
  exitCode: number;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  error?: string;
};

type JoinNotice = {
  id: string;
  text: string;
};

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  createdAt: number;
};

type TaskItem = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
  createdBy: string;
  createdAt: number;
};

type RunHistoryEntry = {
  id: string;
  language: string;
  ranBy: string;
  ok: boolean;
  exitCode: number;
  createdAt: number;
  preview: string;
};

function icon(path: string) {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" width="16">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LANGUAGE_OPTIONS: Array<{ value: EditorLanguage; label: string }> = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "ruby", label: "Ruby" },
  { value: "dart", label: "Dart" },
  { value: "r", label: "R" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "bash", label: "Shell (Bash)" },
  { value: "powershell", label: "PowerShell" },
  { value: "scala", label: "Scala" },
  { value: "haskell", label: "Haskell" },
  { value: "elixir", label: "Elixir" },
  { value: "erlang", label: "Erlang" },
  { value: "lua", label: "Lua" },
  { value: "matlab", label: "MATLAB" },
  { value: "objectivec", label: "Objective-C" },
  { value: "vbnet", label: "VB.NET" },
  { value: "vba", label: "VBA" },
  { value: "fsharp", label: "F#" },
  { value: "perl", label: "Perl" },
  { value: "groovy", label: "Groovy" },
  { value: "clojure", label: "Clojure" },
  { value: "julia", label: "Julia" },
  { value: "assembly", label: "Assembly" },
  { value: "cobol", label: "COBOL" },
  { value: "fortran", label: "Fortran" },
  { value: "ada", label: "Ada" },
  { value: "lisp", label: "Lisp" },
  { value: "prolog", label: "Prolog" },
  { value: "scratch", label: "Scratch" },
  { value: "solidity", label: "Solidity" },
  { value: "apex", label: "Apex" },
  { value: "plsql", label: "PL/SQL" },
  { value: "abap", label: "ABAP" },
  { value: "gdscript", label: "GDScript" },
  { value: "qsharp", label: "Q#" },
  { value: "nim", label: "Nim" },
  { value: "crystal", label: "Crystal" },
  { value: "rescript", label: "ReasonML / ReScript" }
];

function monacoLanguageFor(language: EditorLanguage): string {
  switch (language) {
    case "python":
      return "python";
    case "javascript":
      return "javascript";
    case "typescript":
      return "typescript";
    case "java":
      return "java";
    case "c":
    case "cpp":
    case "objectivec":
      return "cpp";
    case "csharp":
      return "csharp";
    case "go":
      return "go";
    case "rust":
      return "rust";
    case "php":
      return "php";
    case "swift":
      return "swift";
    case "kotlin":
      return "kotlin";
    case "ruby":
      return "ruby";
    case "dart":
      return "dart";
    case "r":
      return "r";
    case "sql":
    case "plsql":
      return "sql";
    case "html":
      return "html";
    case "css":
      return "css";
    case "bash":
      return "shell";
    case "powershell":
      return "powershell";
    case "scala":
      return "scala";
    case "haskell":
      return "haskell";
    case "lua":
      return "lua";
    case "perl":
      return "perl";
    case "clojure":
      return "clojure";
    default:
      return "plaintext";
  }
}

function normalizeToolText(input: string) {
  let value = input.trim();

  // Try to decode double-encoded JSON string payloads.
  for (let i = 0; i < 2; i += 1) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed === "string") {
        value = parsed;
        continue;
      }
    } catch {
      break;
    }
    break;
  }

  // Fallback for raw escaped sequences like "\\n" delivered as plain text.
  if (!value.includes("\n") && /\\n|\\r|\\t/.test(value)) {
    value = value
      .replace(/\\r/g, "\r")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
  }

  return value;
}

export default function WorkspaceShell({ roomId, roomName }: WorkspaceShellProps) {
  const editorBridgeRef = useRef<EditorBridge | null>(null);
  const seenConnectionIdsRef = useRef<Set<number>>(new Set());
  const hasInitializedParticipantsRef = useRef(false);
  const [activeTab, setActiveTab] = useState<MainTab>("whiteboard");
  const [utilityTab, setUtilityTab] = useState<UtilityTab>("runner");
  const [splitView, setSplitView] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [showUtility, setShowUtility] = useState(true);
  const [editorLanguage, setEditorLanguage] = useState<EditorLanguage>("python");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [snapshots, setSnapshots] = useState<CodeSnapshot[]>([]);
  const [stats, setStats] = useState({ lines: 0, chars: 0 });
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [joinNotices, setJoinNotices] = useState<JoinNotice[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [taskInput, setTaskInput] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const others = useOthers();
  const me = useSelf();
  const broadcastEvent = useBroadcastEvent();
  const snapshotStorageKey = `pair-room-${roomId}-snapshots`;
  const tasks = useStorage((root) => root.tasks ?? []);
  const sessionNote = useStorage((root) => root.sessionNote ?? "");
  const runHistory = useStorage((root) => root.runHistory ?? []);

  const runTool = useCallback(async (tool: string, args: Record<string, unknown>) => {
    if (tool === "tools.list") {
      return "Available tools: tools.list, editor.getText, editor.setText, editor.addIntellisense";
    }

    const bridge = editorBridgeRef.current;
    if (!bridge) {
      return "Editor is not ready yet.";
    }

    if (tool === "editor.getText") {
      return bridge.getText();
    }

    if (tool === "editor.setText") {
      const text = typeof args.text === "string" ? normalizeToolText(args.text) : "";
      bridge.setText(text);
      return "Editor text updated.";
    }

    if (tool === "editor.addIntellisense") {
      const label = typeof args.label === "string" ? args.label : "";
      const kind = typeof args.kind === "string" ? args.kind : "Text";
      const detail = typeof args.detail === "string" ? args.detail : "";
      const insertText = typeof args.insertText === "string" ? args.insertText : label;
      bridge.addIntellisense(label, kind, detail, insertText);
      return `Intellisense entry added: ${label}`;
    }

    return `Unknown tool: ${tool}`;
  }, []);

  const onlineCount = useMemo(() => others.length + (me ? 1 : 0), [me, others.length]);
  const participantRows = useMemo(() => {
    const selfRow = me
      ? [
          {
            id: `self-${me.connectionId}`,
            name: me.info?.name ?? "You",
            color: me.info?.color ?? "#8f6bff",
            isYou: true
          }
        ]
      : [];
    const otherRows = others.map((other) => ({
      id: `other-${other.connectionId}`,
      name: other.info?.name ?? `User ${other.connectionId}`,
      color: other.info?.color ?? "#7e57f2",
      isYou: false
    }));
    return [...selfRow, ...otherRows];
  }, [me, others]);
  const canSendChat = chatInput.trim().length > 0;
  const canAddTask = taskInput.trim().length > 0;

  const addTask = useMutation(({ storage }, payload: { title: string; assignee: string; createdBy: string }) => {
    const current = storage.get("tasks") ?? [];
    const next: TaskItem = {
      id: crypto.randomUUID(),
      title: payload.title,
      status: "todo",
      assignee: payload.assignee,
      createdBy: payload.createdBy,
      createdAt: Date.now()
    };
    storage.set("tasks", [...current, next]);
  }, []);

  const cycleTaskStatus = useMutation(({ storage }, taskId: string) => {
    const current = storage.get("tasks") ?? [];
    const next = current.map((task) => {
      if (task.id !== taskId) {
        return task;
      }
      const status: TaskItem["status"] =
        task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
      return { ...task, status };
    });
    storage.set("tasks", next);
  }, []);

  const deleteTask = useMutation(({ storage }, taskId: string) => {
    const current = storage.get("tasks") ?? [];
    storage.set(
      "tasks",
      current.filter((task) => task.id !== taskId)
    );
  }, []);

  const updateSessionNote = useMutation(({ storage }, value: string) => {
    storage.set("sessionNote", value);
  }, []);

  const appendRunHistory = useMutation(({ storage }, entry: RunHistoryEntry) => {
    const current = storage.get("runHistory") ?? [];
    storage.set("runHistory", [...current, entry].slice(-120));
  }, []);

  const copyInviteLink = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (!url) {
      return;
    }
    await navigator.clipboard.writeText(url);
  }, []);

  const showWhiteboard = splitView || activeTab === "whiteboard";
  const showCode = splitView || activeTab === "code";

  const persistSnapshots = useCallback(
    (next: CodeSnapshot[]) => {
      setSnapshots(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(snapshotStorageKey, JSON.stringify(next));
      }
    },
    [snapshotStorageKey]
  );

  const createSnapshot = useCallback(() => {
    const bridge = editorBridgeRef.current;
    if (!bridge) {
      return;
    }
    const code = bridge.getText();
    const next: CodeSnapshot[] = [
      {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        label: `Snapshot ${new Date().toLocaleTimeString()}`,
        code
      },
      ...snapshots
    ].slice(0, 20);
    persistSnapshots(next);
  }, [persistSnapshots, snapshots]);

  const runCode = useCallback(async () => {
    const bridge = editorBridgeRef.current;
    if (!bridge) {
      return;
    }

    setIsRunning(true);
    setRunResult(null);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders()
        },
        body: JSON.stringify({
          language: editorLanguage,
          code: bridge.getText()
        })
      });

      const data = (await response.json()) as RunResult;
      setRunResult(data);
      setShowUtility(true);
      setUtilityTab("runner");
      appendRunHistory({
        id: crypto.randomUUID(),
        language: editorLanguage,
        ranBy: me?.info?.name ?? "Unknown",
        ok: data.ok,
        exitCode: data.exitCode,
        createdAt: Date.now(),
        preview: (data.stdout || data.stderr || data.error || "").slice(0, 180) || "(No output)"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runner error.";
      setRunResult({
        ok: false,
        exitCode: 1,
        timedOut: false,
        stdout: "",
        stderr: message
      });
      appendRunHistory({
        id: crypto.randomUUID(),
        language: editorLanguage,
        ranBy: me?.info?.name ?? "Unknown",
        ok: false,
        exitCode: 1,
        createdAt: Date.now(),
        preview: message.slice(0, 180)
      });
    } finally {
      setIsRunning(false);
    }
  }, [appendRunHistory, editorLanguage, me?.info?.name]);

  const exportSessionSummary = useCallback(() => {
    const participantText = participantRows.map((p) => `- ${p.name}${p.isYou ? " (you)" : ""}`).join("\n");
    const taskText = tasks
      .map((task) => `- [${task.status}] ${task.title} (assignee: ${task.assignee || "unassigned"})`)
      .join("\n");
    const runText = runHistory
      .slice(-20)
      .map((run) => `- ${new Date(run.createdAt).toLocaleTimeString()} ${run.language} by ${run.ranBy} -> ${run.ok ? "ok" : "error"} (${run.exitCode})`)
      .join("\n");
    const content = [
      `Room: ${roomName ?? roomId}`,
      "",
      "Participants:",
      participantText || "- none",
      "",
      "Tasks:",
      taskText || "- none",
      "",
      "Session Notes:",
      noteDraft.trim() || "(empty)",
      "",
      "Recent Runs:",
      runText || "- none"
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `session-summary-${roomId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [noteDraft, participantRows, roomId, roomName, runHistory, tasks]);

  const sendChatMessage = useCallback(() => {
    const text = chatInput.trim();
    if (!text) {
      return;
    }
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      sender: me?.info?.name ?? "You",
      text,
      createdAt: Date.now()
    };
    broadcastEvent({
      type: "chat-message",
      id: message.id,
      sender: message.sender,
      text: message.text,
      createdAt: message.createdAt
    });
    setChatMessages((prev) => [...prev, message].slice(-100));
    setChatInput("");
  }, [broadcastEvent, chatInput, me?.info?.name]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(snapshotStorageKey);
      const parsed = raw ? (JSON.parse(raw) as CodeSnapshot[]) : [];
      setSnapshots(parsed);
    } catch {
      setSnapshots([]);
    }
  }, [snapshotStorageKey]);

  useEffect(() => {
    setNoteDraft(sessionNote);
  }, [sessionNote]);

  useEventListener(({ event }) => {
    if (event.type !== "chat-message") {
      return;
    }
    setChatMessages((prev) => {
      if (prev.some((item) => item.id === event.id)) {
        return prev;
      }
      return [...prev, event].slice(-100);
    });
    if (utilityTab !== "chat") {
      setUnreadCount((prev) => prev + 1);
    }
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
      const bridge = editorBridgeRef.current;
      if (!bridge) {
        return;
      }
      const code = bridge.getText();
      const lines = code.length === 0 ? 0 : code.split("\n").length;
      const chars = code.length;
      setStats({ lines, chars });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const previous = seenConnectionIdsRef.current;
    const current = new Set<number>();
    if (me) {
      current.add(me.connectionId);
    }
    for (const other of others) {
      current.add(other.connectionId);
      if (hasInitializedParticipantsRef.current && !previous.has(other.connectionId)) {
        const name = other.info?.name ?? `User ${other.connectionId}`;
        const notice: JoinNotice = {
          id: crypto.randomUUID(),
          text: `${name} joined the room`
        };
        setJoinNotices((prev) => [notice, ...prev].slice(0, 4));
        window.setTimeout(() => {
          setJoinNotices((prev) => prev.filter((item) => item.id !== notice.id));
        }, 4500);
      }
    }
    seenConnectionIdsRef.current = current;
    if (!hasInitializedParticipantsRef.current) {
      hasInitializedParticipantsRef.current = true;
    }
  }, [me, others]);

  useEffect(() => {
    if (utilityTab === "chat") {
      setUnreadCount(0);
    }
  }, [utilityTab]);

  useEffect(() => {
    const hideLiveblocksBadge = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("a, div, span, button"));

      for (const element of candidates) {
        const text = (element.textContent || "").toLowerCase();
        const href = (element as HTMLAnchorElement).href?.toLowerCase?.() || "";
        const matchesText = text.includes("powered by") && text.includes("liveblocks");
        const matchesHref = href.includes("liveblocks.io");

        if (!matchesText && !matchesHref) {
          continue;
        }

        let target: HTMLElement | null = element;
        while (target?.parentElement) {
          const style = window.getComputedStyle(target);
          if (style.position === "fixed") {
            break;
          }
          target = target.parentElement;
        }

        if (!target) {
          target = element;
        }

        target.style.display = "none";
        target.style.visibility = "hidden";
        target.style.opacity = "0";
        target.style.pointerEvents = "none";
      }
    };

    hideLiveblocksBadge();
    const observer = new MutationObserver(() => hideLiveblocksBadge());
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(hideLiveblocksBadge, 800);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative h-screen overflow-hidden bg-[#0b0b0c] p-4 text-zinc-100">
      <header className="relative mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111214] p-2.5">
        <button
          className={`rounded-xl p-2.5 transition-all ${
            activeTab === "whiteboard"
              ? "border border-white bg-white text-black"
              : "border border-white/15 bg-black/30 text-zinc-200 hover:border-white/40"
          }`}
          onClick={() => {
            setSplitView(false);
            setActiveTab("whiteboard");
          }}
          title="Whiteboard"
          type="button"
        >
          <Image alt="Whiteboard" className={activeTab === "whiteboard" ? "" : "invert"} height={16} src="/icons/whiteboard-icon.svg" width={16} />
        </button>
        <button
          className={`rounded-xl p-2.5 transition-all ${
            activeTab === "code"
              ? "border border-white bg-white text-black"
              : "border border-white/15 bg-black/30 text-zinc-200 hover:border-white/40"
          }`}
          onClick={() => {
            setSplitView(false);
            setActiveTab("code");
          }}
          title="Code"
          type="button"
        >
          <Image alt="Code" className={activeTab === "code" ? "" : "invert"} height={16} src="/icons/code-icon.svg" width={16} />
        </button>
        <button
          className={`rounded-xl p-2.5 transition-all ${
            splitView
              ? "border border-white bg-white text-black"
              : "border border-white/15 bg-black/30 text-zinc-200 hover:border-white/40"
          }`}
          onClick={() => setSplitView((prev) => !prev)}
          title="Split View"
          type="button"
        >
          {icon("M3 5h18v14H3zM12 5v14")}
        </button>
        <button
          className={`rounded-xl p-2.5 transition-all ${
            showUtility
              ? "border border-white bg-white text-black"
              : "border border-white/15 bg-black/30 text-zinc-200 hover:border-white/40"
          }`}
          onClick={() => setShowUtility((prev) => !prev)}
          title="Control Center"
          type="button"
        >
          {icon("M4 5h16v4H4zM4 11h10v4H4zM4 17h7v2H4z")}
        </button>
        {showCode && (
          <>
            <select
              className="ml-2 max-w-[220px] rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-zinc-100 outline-none transition-colors hover:border-white/40"
              onChange={(event) => setEditorLanguage(event.target.value as EditorLanguage)}
              value={editorLanguage}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="rounded-xl border border-white bg-white px-3 py-2 text-xs font-bold text-black transition disabled:opacity-60"
              disabled={isRunning}
              onClick={runCode}
              title="Run current code"
              type="button"
            >
              {isRunning ? "Running..." : "Run"}
            </button>
          </>
        )}
        <div className="ml-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-zinc-300" title="Room">
          Room: <span className="font-semibold text-zinc-100">{roomName ?? roomId}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-zinc-300" title="Online">
          Online: <span className="font-semibold text-zinc-100">{onlineCount}</span>
        </div>
        <button
          className="ml-auto rounded-xl border border-white bg-white p-2.5 text-black transition"
          onClick={copyInviteLink}
          title="Copy invite link"
          type="button"
        >
          {icon("M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L11 5M14 11a5 5 0 00-7.07 0L4.81 13.12a5 5 0 107.07 7.07L13 19")}
        </button>
      </header>

      <main className="relative h-[calc(100%-4.8rem)]">
        <div className={`grid h-full gap-4 pr-0 transition-all duration-300 ${splitView ? "grid-cols-2" : "grid-cols-1"} ${showUtility ? "md:pr-[342px]" : ""}`}>
          {showWhiteboard && (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1012]">
              <WhiteboardCanvas className="h-full w-full" />
            </section>
          )}
          {showCode && (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1012]">
              <MonacoEditorPanel
                language={monacoLanguageFor(editorLanguage)}
                onReady={(api) => {
                  editorBridgeRef.current = {
                    getText: api.getText,
                    setText: api.setText,
                    addIntellisense: api.addIntellisense
                  };
                }}
              />
            </section>
          )}
        </div>

        <aside
          className={`absolute right-0 top-0 z-20 h-full w-full max-w-[328px] rounded-2xl border border-white/10 bg-[#111214]/95 p-3.5 backdrop-blur-xl transition-all duration-300 ${
            showUtility ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-8 opacity-0"
          }`}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              className={`rounded-xl px-2 py-2 text-xs transition-all ${
                utilityTab === "runner"
                  ? "border border-white bg-white text-black"
                  : "border border-white/15 text-zinc-300 hover:border-white/40"
              }`}
              onClick={() => setUtilityTab("runner")}
              type="button"
            >
              Runner
            </button>
            <button
              className={`rounded-xl px-2 py-2 text-xs transition-all ${
                utilityTab === "backups"
                  ? "border border-white bg-white text-black"
                  : "border border-white/15 text-zinc-300 hover:border-white/40"
              }`}
              onClick={() => setUtilityTab("backups")}
              type="button"
            >
              Backups
            </button>
            <button
              className={`rounded-xl px-2 py-2 text-xs transition-all ${
                utilityTab === "session"
                  ? "border border-white bg-white text-black"
                  : "border border-white/15 text-zinc-300 hover:border-white/40"
              }`}
              onClick={() => setUtilityTab("session")}
              type="button"
            >
              Session
            </button>
            <button
              className={`rounded-xl px-2 py-2 text-xs transition-all ${
                utilityTab === "chat"
                  ? "border border-white bg-white text-black"
                  : "border border-white/15 text-zinc-300 hover:border-white/40"
              }`}
              onClick={() => setUtilityTab("chat")}
              type="button"
            >
              Chat{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
            <button
              className={`rounded-xl px-2 py-2 text-xs transition-all ${
                utilityTab === "tasks"
                  ? "border border-white bg-white text-black"
                  : "border border-white/15 text-zinc-300 hover:border-white/40"
              }`}
              onClick={() => setUtilityTab("tasks")}
              type="button"
            >
              Tasks
            </button>
            <button
              className={`rounded-xl px-2 py-2 text-xs transition-all ${
                utilityTab === "notes"
                  ? "border border-white bg-white text-black"
                  : "border border-white/15 text-zinc-300 hover:border-white/40"
              }`}
              onClick={() => setUtilityTab("notes")}
              type="button"
            >
              Notes
            </button>
            <button
              className={`rounded-xl px-2 py-2 text-xs transition-all ${
                utilityTab === "history"
                  ? "border border-white bg-white text-black"
                  : "border border-white/15 text-zinc-300 hover:border-white/40"
              }`}
              onClick={() => setUtilityTab("history")}
              type="button"
            >
              Runs
            </button>
          </div>

          {utilityTab === "runner" && (
              <div className="space-y-2">
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5 text-xs">
                <p className="text-zinc-400">Runtime</p>
                <p className="font-semibold text-zinc-100">
                  {LANGUAGE_OPTIONS.find((x) => x.value === editorLanguage)?.label ?? editorLanguage}
                </p>
              </div>
              <button
                className="w-full rounded-xl border border-white bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-60"
                disabled={isRunning}
                onClick={runCode}
                type="button"
              >
                {isRunning ? "Running..." : "Run current code"}
              </button>
              <div className="max-h-[58vh] overflow-auto rounded-xl border border-white/10 bg-black/25 p-2.5 font-mono text-[11px] whitespace-pre-wrap text-zinc-100">
                {runResult ? (
                  <>
                    <div className="mb-2 text-white/70">
                      status={runResult.ok ? "ok" : "error"} exit={runResult.exitCode}
                      {runResult.timedOut ? " timeout=true" : ""}
                    </div>
                    {runResult.error ? <div className="text-white/80">{runResult.error}</div> : null}
                    {runResult.stdout ? <div className="mb-2 text-white">{runResult.stdout}</div> : null}
                    {runResult.stderr ? <div className="text-white/80">{runResult.stderr}</div> : null}
                    {!runResult.stdout && !runResult.stderr && !runResult.error ? (
                      <div className="text-zinc-500">(No output)</div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-zinc-500">No run output yet.</div>
                )}
              </div>
            </div>
          )}

          {utilityTab === "backups" && (
            <div className="space-y-2">
              <button className="w-full rounded-xl border border-white bg-white px-3 py-2 text-xs font-semibold text-black" onClick={createSnapshot} type="button">
                Save snapshot
              </button>
              <div className="max-h-[55vh] space-y-2 overflow-auto">
                {snapshots.length === 0 ? (
                  <p className="text-xs text-white/60">No snapshots yet.</p>
                ) : (
                  snapshots.map((snapshot) => (
                    <div className="rounded-xl border border-white/10 bg-black/25 p-2.5" key={snapshot.id}>
                      <p className="mb-2 text-xs text-zinc-100">{snapshot.label}</p>
                      <div className="flex gap-2">
                        <button
                          className="flex-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-zinc-100 hover:border-white/40"
                          onClick={() => editorBridgeRef.current?.setText(snapshot.code)}
                          type="button"
                        >
                          Restore
                        </button>
                        <button
                          className="flex-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-zinc-100 hover:border-white/40"
                          onClick={() => persistSnapshots(snapshots.filter((s) => s.id !== snapshot.id))}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {utilityTab === "session" && (
            <div className="space-y-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <p className="text-zinc-400">Uptime</p>
                <p className="text-sm font-semibold text-zinc-100">{Math.floor(uptimeSeconds / 60)}m {uptimeSeconds % 60}s</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <p className="text-zinc-400">Code Stats</p>
                <p className="text-sm font-semibold text-zinc-100">{stats.lines} lines · {stats.chars} chars</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <p className="text-zinc-400">Collaborators</p>
                <p className="text-sm font-semibold text-zinc-100">{onlineCount} online</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5">
                <p className="mb-2 text-zinc-400">Participants</p>
                <div className="space-y-1.5">
                  {participantRows.map((participant) => (
                    <div className="flex items-center justify-between rounded-lg border border-white/10 px-2 py-1.5" key={participant.id}>
                      <span className="flex items-center gap-2 text-xs text-zinc-100">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: participant.color }}
                        />
                        {participant.name}
                      </span>
                      {participant.isYou ? <span className="text-[10px] text-zinc-500">you</span> : null}
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-zinc-100 transition-colors hover:border-white/40"
                onClick={() => setIsAiOpen(true)}
                type="button"
              >
                Open AI
              </button>
            </div>
          )}

          {utilityTab === "chat" && (
            <div className="flex h-[calc(100%-2.5rem)] flex-col">
              <div className="mb-2 rounded-xl border border-white/10 bg-black/25 px-2.5 py-2 text-xs text-zinc-400">
                Room chat for fast coordination during coding sessions.
              </div>
              <div className="mb-2 flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-2.5">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-zinc-500">No messages yet.</p>
                ) : (
                  chatMessages.map((message) => (
                    <div className="rounded-lg border border-white/10 bg-black/35 px-2 py-1.5" key={message.id}>
                      <p className="text-[11px] font-semibold text-zinc-100">{message.sender}</p>
                      <p className="text-xs text-zinc-300">{message.text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-white/40"
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  placeholder="Type message..."
                  value={chatInput}
                />
                <button
                  className="rounded-xl border border-white bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                  disabled={!canSendChat}
                  onClick={sendChatMessage}
                  type="button"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {utilityTab === "tasks" && (
            <div className="flex h-[calc(100%-2.5rem)] flex-col">
              <div className="mb-2 flex gap-2">
                <input
                  className="w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-white/40"
                  onChange={(event) => setTaskInput(event.target.value)}
                  placeholder="Add task..."
                  value={taskInput}
                />
                <input
                  className="w-[110px] rounded-xl border border-white/15 bg-black/35 px-2 py-2 text-xs text-zinc-100 outline-none focus:border-white/40"
                  onChange={(event) => setAssigneeInput(event.target.value)}
                  placeholder="Assignee"
                  value={assigneeInput}
                />
                <button
                  className="rounded-xl border border-white bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                  disabled={!canAddTask}
                  onClick={() => {
                    addTask({
                      title: taskInput.trim(),
                      assignee: assigneeInput.trim(),
                      createdBy: me?.info?.name ?? "Unknown"
                    });
                    setTaskInput("");
                    setAssigneeInput("");
                  }}
                  type="button"
                >
                  Add
                </button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-2.5">
                {tasks.length === 0 ? (
                  <p className="text-xs text-zinc-500">No tasks yet.</p>
                ) : (
                  tasks.map((task) => (
                    <div className="rounded-lg border border-white/10 bg-black/35 p-2" key={task.id}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-100">{task.title}</p>
                        <button
                          className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:border-white/40"
                          onClick={() => deleteTask(task.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="mb-2 text-[10px] text-zinc-400">
                        status={task.status} · assignee={task.assignee || "unassigned"} · by {task.createdBy}
                      </p>
                      <button
                        className="rounded border border-white/15 px-2 py-1 text-[10px] text-zinc-200 hover:border-white/40"
                        onClick={() => cycleTaskStatus(task.id)}
                        type="button"
                      >
                        Change status
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {utilityTab === "notes" && (
            <div className="flex h-[calc(100%-2.5rem)] flex-col">
              <textarea
                className="flex-1 resize-none rounded-xl border border-white/15 bg-black/35 p-3 text-xs text-zinc-100 outline-none focus:border-white/40"
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Shared session notes..."
                value={noteDraft}
              />
              <div className="mt-2 flex gap-2">
                <button
                  className="w-full rounded-xl border border-white bg-white px-3 py-2 text-xs font-semibold text-black"
                  onClick={() => updateSessionNote(noteDraft)}
                  type="button"
                >
                  Save shared notes
                </button>
                <button
                  className="w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-white/40"
                  onClick={exportSessionSummary}
                  type="button"
                >
                  Export summary
                </button>
              </div>
            </div>
          )}

          {utilityTab === "history" && (
            <div className="flex h-[calc(100%-2.5rem)] flex-col">
              <div className="mb-2 rounded-xl border border-white/10 bg-black/25 px-2.5 py-2 text-xs text-zinc-400">
                Shared run history for this room.
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-2.5">
                {runHistory.length === 0 ? (
                  <p className="text-xs text-zinc-500">No runs yet.</p>
                ) : (
                  [...runHistory]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((entry) => (
                      <div className="rounded-lg border border-white/10 bg-black/35 p-2" key={entry.id}>
                        <p className="text-xs font-semibold text-zinc-100">
                          {entry.language} · {entry.ok ? "ok" : "error"} · exit {entry.exitCode}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {new Date(entry.createdAt).toLocaleTimeString()} by {entry.ranBy}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-300">{entry.preview}</p>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}
        </aside>
      </main>

      <button
        className="absolute bottom-6 right-6 z-40 rounded-full border border-white bg-white p-3.5 text-black transition-transform hover:scale-105"
        onClick={() => setIsAiOpen(true)}
        title="AI Assistant"
        type="button"
      >
        <Image alt="AI" height={18} src="/icons/ai-icon.svg" width={18} />
      </button>

      <div
        aria-hidden={!isAiOpen}
        className={`absolute inset-0 z-40 bg-black/70 transition-opacity duration-300 ${isAiOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setIsAiOpen(false)}
      />

      <aside
        className={`absolute right-2 top-2 z-50 h-[calc(100%-1rem)] w-[calc(100%-1rem)] max-w-xl rounded-2xl border border-white/10 bg-[#111214]/95 backdrop-blur-xl transition-transform duration-300 ${
          isAiOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">AI Assistant</h2>
          <button
            className="rounded-xl border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-zinc-100 hover:border-white/40"
            onClick={() => setIsAiOpen(false)}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="h-[calc(100%-3.25rem)] p-3">
          <AiAssistantPanel runTool={runTool} />
        </div>
      </aside>

      <div className="pointer-events-none absolute right-6 top-20 z-50 flex w-[320px] flex-col gap-2">
        {joinNotices.map((notice) => (
          <div
            className="rounded-xl border border-white/15 bg-[#151618] px-3 py-2 text-xs text-zinc-100 backdrop-blur-xl"
            key={notice.id}
          >
            {notice.text}
          </div>
        ))}
      </div>
    </div>
  );
}
