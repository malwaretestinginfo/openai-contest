export type Presence = {
  cursor: { x: number; y: number } | null;
  selectedTool: "pen" | "eraser";
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
};

export type Storage = {
  strokes: WhiteboardStroke[];
  tasks: TaskItem[];
  sessionNote: string;
  runHistory: RunHistoryEntry[];
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
