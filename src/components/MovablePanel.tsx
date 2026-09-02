import { CSSProperties, PointerEvent, ReactNode, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

type MovablePanelProps = {
  children: ReactNode;
  className: string;
  defaultPosition: Point;
  id: string;
  label: string;
};

const storagePrefix = "jarvis.panel-layout.v1.";

function clamp(point: Point) {
  return {
    x: Math.max(8, Math.min(point.x, window.innerWidth - 56)),
    y: Math.max(8, Math.min(point.y, window.innerHeight - 56)),
  };
}

function loadPosition(id: string, fallback: Point) {
  try {
    const saved = window.localStorage.getItem(`${storagePrefix}${id}`);
    if (!saved) return fallback;
    const position = JSON.parse(saved) as Point;
    return Number.isFinite(position.x) && Number.isFinite(position.y) ? clamp(position) : fallback;
  } catch {
    return fallback;
  }
}

export function MovablePanel({ children, className, defaultPosition, id, label }: MovablePanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragOrigin = useRef<Point | null>(null);
  const [position, setPosition] = useState(() => loadPosition(id, defaultPosition));

  useEffect(() => {
    const onResize = () => setPosition((current) => clamp(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function fixPosition() {
    try {
      window.localStorage.setItem(`${storagePrefix}${id}`, JSON.stringify(position));
    } catch {
      // Storage can be unavailable in private browsing; the fixed position still works for this session.
    }
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const isInteractive = target.closest('button, input, select, a');
    if (isInteractive) return;

    dragOrigin.current = { x: event.clientX - position.x, y: event.clientY - position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (!dragOrigin.current) return;
    setPosition(clamp({ x: event.clientX - dragOrigin.current.x, y: event.clientY - dragOrigin.current.y }));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragOrigin.current) {
      dragOrigin.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      fixPosition();
    }
  }

  return (
    <div
      ref={panelRef}
      className={`movable-panel ${className}`}
      style={{ "--panel-x": `${position.x}px`, "--panel-y": `${position.y}px`, cursor: "grab" } as CSSProperties}
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-label={label}
    >
      {children}
    </div>
  );
}
