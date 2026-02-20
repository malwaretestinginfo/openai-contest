"use client";

import { PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useMyPresence, useOthers, useStorage } from "@liveblocks/react/suspense";
import type { WhiteboardElementType, WhiteboardPoint, WhiteboardStroke } from "@/liveblocks.config";

type WhiteboardCanvasProps = {
  className?: string;
  onStrokeCommitted?: () => void;
};

type ToolMode = WhiteboardElementType | "eraser" | "pan";

function icon(path: string) {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" width="16">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function drawElement(ctx: CanvasRenderingContext2D, element: WhiteboardStroke) {
  if (element.points.length === 0) {
    return;
  }

  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (element.type === "freehand") {
    ctx.beginPath();
    ctx.moveTo(element.points[0].x, element.points[0].y);
    for (let i = 1; i < element.points.length; i += 1) {
      ctx.lineTo(element.points[i].x, element.points[i].y);
    }
    ctx.stroke();
    return;
  }

  const start = element.points[0];
  const end = element.points[element.points.length - 1];
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  ctx.beginPath();
  if (element.type === "line") {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
  } else if (element.type === "rect") {
    ctx.rect(x, y, w, h);
  } else if (element.type === "ellipse") {
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(1, w / 2), Math.max(1, h / 2), 0, 0, Math.PI * 2);
  }
  ctx.stroke();
}

export default function WhiteboardCanvas({ className, onStrokeCommitted }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [{}, setMyPresence] = useMyPresence();
  const others = useOthers();

  const [tool, setTool] = useState<ToolMode>("freehand");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [draftPoints, setDraftPoints] = useState<WhiteboardPoint[]>([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);

  const strokes = useStorage((root) => root.strokes ?? []);
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([]);

  const pushStroke = useMutation(({ storage }, stroke: WhiteboardStroke) => {
    const current = storage.get("strokes");
    if (current) {
      current.push(stroke);
    }
  }, []);

  const setAllStrokes = useMutation(({ storage }, next: WhiteboardStroke[]) => {
    const current = storage.get("strokes");
    if (current) {
      current.clear();
      for (const stroke of next) {
        current.push(stroke);
      }
    } else {
      storage.set("strokes", next);
    }
  }, []);

  const clearStrokes = useMutation(({ storage }) => {
    storage.get("strokes")?.clear();
  }, []);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const data = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = data;
    link.download = `whiteboard-${Date.now()}.png`;
    link.click();
  }, []);

  const toWorldPoint = useCallback(
    (event: PointerEvent<HTMLCanvasElement>): WhiteboardPoint => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return { x: 0, y: 0 };
      }
      const rect = canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      return {
        x: (localX - pan.x) / zoom,
        y: (localY - pan.y) / zoom
      };
    },
    [pan.x, pan.y, zoom]
  );

  const currentColor = useMemo(() => (tool === "eraser" ? "#000000" : color), [color, tool]);
  const currentWidth = useMemo(() => (tool === "eraser" ? Math.max(18, size * 3) : size), [size, tool]);
  const currentShape = useMemo<WhiteboardElementType>(() => {
    if (tool === "line" || tool === "rect" || tool === "ellipse") {
      return tool;
    }
    return "freehand";
  }, [tool]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    for (const stroke of strokes) {
      drawElement(ctx, stroke);
    }

    if (draftPoints.length > 0) {
      drawElement(ctx, {
        id: "draft",
        type: currentShape,
        color: currentColor,
        width: currentWidth,
        points: draftPoints
      });
    }

    ctx.restore();
  }, [currentColor, currentShape, currentWidth, draftPoints, pan.x, pan.y, strokes, zoom]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) {
      return;
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrapper.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      redraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    resize();
    return () => observer.disconnect();
  }, [redraw]);

  const commitDraft = useCallback(() => {
    if (draftPoints.length === 0) {
      return;
    }
    pushStroke({
      id: crypto.randomUUID(),
      type: currentShape,
      color: currentColor,
      width: currentWidth,
      points: draftPoints
    });
    setRedoStack([]);
    setDraftPoints([]);
    onStrokeCommitted?.();
  }, [currentColor, currentShape, currentWidth, draftPoints, onStrokeCommitted, pushStroke]);

  useEffect(() => {
    const mappedTool =
      tool === "freehand" ? "pen" : tool === "eraser" ? "eraser" : tool === "line" ? "line" : tool === "rect" ? "rect" : tool === "ellipse" ? "ellipse" : "pan";
    setMyPresence({
      selectedTool: mappedTool
    });
  }, [setMyPresence, tool]);

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#120f2a]/65 px-2.5 py-2 backdrop-blur-2xl">
        {[
          { key: "freehand", title: "Draw", icon: icon("M4 19c4-6 8-8 16-14") },
          { key: "line", title: "Line", icon: icon("M4 20L20 4") },
          { key: "rect", title: "Rect", icon: icon("M4 5h16v14H4z") },
          { key: "ellipse", title: "Ellipse", icon: icon("M4 12a8 6 0 1016 0a8 6 0 10-16 0") },
          { key: "eraser", title: "Eraser", icon: icon("M7 14l6-6 4 4-6 6H7z") },
          { key: "pan", title: "Pan", icon: icon("M12 2v20M2 12h20") }
        ].map((entry) => (
          <button
            className={`rounded-xl p-2 transition-all ${
              tool === entry.key
                ? "border border-[#8f6bff] bg-[#7e57f2] text-white shadow-[0_8px_20px_rgba(126,87,242,0.4)]"
                : "border border-white/10 text-[#e2dcff] hover:border-[#8f6bff]/55 hover:bg-[#1a1533]"
            }`}
            key={entry.key}
            onClick={() => setTool(entry.key as ToolMode)}
            title={entry.title}
            type="button"
          >
            {entry.icon}
          </button>
        ))}

        <input
          className="ml-1 h-8 w-8 cursor-pointer rounded-xl border border-white/15 bg-[#0f0c20] p-0"
          onChange={(event) => setColor(event.target.value)}
          title="Color"
          type="color"
          value={color}
        />
        <input
          className="w-20 accent-[#8f6bff]"
          max={16}
          min={1}
          onChange={(event) => setSize(Number(event.target.value))}
          title="Width"
          type="range"
          value={size}
        />

        <button
          className="rounded-xl border border-white/10 p-2 text-[#e2dcff] transition-colors hover:border-[#8f6bff]/55 hover:bg-[#1a1533]"
          onClick={() => {
            if (strokes.length === 0) {
              return;
            }
            const last = strokes[strokes.length - 1];
            setRedoStack((prev) => [...prev, last]);
            setAllStrokes(strokes.slice(0, -1));
          }}
          title="Undo"
          type="button"
        >
          {icon("M10 6L4 12l6 6M20 12H5")}
        </button>
        <button
          className="rounded-xl border border-white/10 p-2 text-[#e2dcff] transition-colors hover:border-[#8f6bff]/55 hover:bg-[#1a1533]"
          onClick={() => {
            if (redoStack.length === 0) {
              return;
            }
            const last = redoStack[redoStack.length - 1];
            setRedoStack((prev) => prev.slice(0, -1));
            setAllStrokes([...strokes, last]);
          }}
          title="Redo"
          type="button"
        >
          {icon("M14 6l6 6-6 6M4 12h15")}
        </button>
        <button
          className="ml-auto rounded-xl border border-white/10 p-2 text-[#e2dcff] transition-colors hover:border-[#8f6bff]/55 hover:bg-[#1a1533]"
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setZoom(1);
          }}
          title="Reset View"
          type="button"
        >
          {icon("M4 12a8 8 0 108-8M4 4v5h5")}
        </button>
        <button
          className="rounded-xl border border-white/10 p-2 text-[#e2dcff] transition-colors hover:border-[#8f6bff]/55 hover:bg-[#1a1533]"
          onClick={exportPng}
          title="Export PNG"
          type="button"
        >
          {icon("M12 3v12M7 10l5 5 5-5M4 21h16")}
        </button>
        <button
          className="rounded-xl border border-white/10 p-2 text-[#e2dcff] transition-colors hover:border-[#8f6bff]/55 hover:bg-[#1a1533]"
          onClick={() => clearStrokes()}
          title="Clear"
          type="button"
        >
          {icon("M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12")}
        </button>
      </div>

      <div className="relative h-full w-full" ref={wrapperRef}>
        <canvas
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setMyPresence({
              cursorContext: "whiteboard",
              cursor: { x: event.clientX, y: event.clientY },
              editorCursorLine: null,
              editorCursorColumn: null
            });
            if (tool === "pan" || event.button === 1) {
              setIsPanning(true);
              setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
              return;
            }
            setIsDrawing(true);
            const point = toWorldPoint(event);
            setDraftPoints([point]);
          }}
          onPointerMove={(event) => {
            setMyPresence({
              cursorContext: "whiteboard",
              cursor: { x: event.clientX, y: event.clientY }
            });
            if (isPanning && panStart) {
              setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y });
              return;
            }
            if (!isDrawing) {
              return;
            }
            const point = toWorldPoint(event);
            setDraftPoints((prev) => {
              if (tool === "line" || tool === "rect" || tool === "ellipse") {
                return [prev[0], point];
              }
              return [...prev, point];
            });
          }}
          onPointerUp={() => {
            setMyPresence({
              cursorContext: "whiteboard"
            });
            if (isPanning) {
              setIsPanning(false);
              setPanStart(null);
              return;
            }
            if (isDrawing) {
              commitDraft();
            }
            setIsDrawing(false);
          }}
          onWheel={(event) => {
            event.preventDefault();
            const step = event.deltaY < 0 ? 1.08 : 0.92;
            setZoom((prev) => Math.max(0.3, Math.min(3, prev * step)));
          }}
          onPointerLeave={() => {
            setMyPresence({
              cursorContext: null,
              cursor: null
            });
          }}
          ref={canvasRef}
        />
        {others.map((other) => {
          if (other.presence.cursorContext !== "whiteboard" || !other.presence.cursor) {
            return null;
          }
          const color = other.info?.color ?? "#ffffff";
          return (
            <div
              className="pointer-events-none absolute left-0 top-0 z-20"
              key={other.connectionId}
              style={{ transform: `translate(${other.presence.cursor.x}px, ${other.presence.cursor.y}px)` }}
            >
              <div
                className="h-2.5 w-2.5 rounded-full border border-black/30"
                style={{ backgroundColor: color }}
              />
              <div className="mt-1 rounded-md border border-white/15 bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                {other.info?.name ?? `User ${other.connectionId}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
