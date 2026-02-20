import { LiveList } from "@liveblocks/client";

export type Presence = {
  cursor: { x: number; y: number } | null;
  cursorContext: "whiteboard" | "editor" | null;
  editorCursorLine: number | null;
  editorCursorColumn: number | null;
  selectedTool: "pen" | "eraser" | "line" | "rect" | "ellipse" | "pan";
};

export type WhiteboardPoint = {
  x: number;
  y: number;
};

export type WhiteboardElementType = "freehand" | "line" | "rect" | "ellipse";

export type WhiteboardStroke = {
  id: string;
  type: WhiteboardElementType;
  color: string;
  width: number;
  points: WhiteboardPoint[];
};

export type TaskItem = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
  createdBy: string;
  createdAt: number;
};

export type RunHistoryEntry = {
  id: string;
  language: string;
  ranBy: string;
  ok: boolean;
  exitCode: number;
  createdAt: number;
  preview: string;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type SessionEvent = {
  id: string;
  type: "join" | "chat" | "run" | "task" | "whiteboard" | "ai";
  actor: string;
  text: string;
  createdAt: number;
};

export type Storage = {
  strokes: LiveList<WhiteboardStroke>;
  tasks: LiveList<TaskItem>;
  sessionNote: string;
  runHistory: LiveList<RunHistoryEntry>;
  sessionEvents: LiveList<SessionEvent>;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
  };
};

export type RoomEvent =
  | {
      type: "chat-message";
      id: string;
      sender: string;
      text: string;
      createdAt: number;
    };

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: Storage;
    UserMeta: UserMeta;
    RoomEvent: RoomEvent;
  }
}

export {};
