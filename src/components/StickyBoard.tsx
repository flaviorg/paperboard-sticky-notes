"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  clamp,
  containsPoint,
  getRect,
  sameRect,
  type Action,
  type Handle,
  type Point,
  type Rect,
} from "@/lib/geometry";
import type { Note } from "@/lib/notes";
import { useNotes } from "@/lib/useNotes";
import { Icon } from "./Icon";
import { NoteCard, type NoteActions } from "./NoteCard";

type Gesture = Action & { pointerId: number; start: Point };
/** The live rectangle shown while a gesture is in progress; `id` is null while drawing. */
type Preview = { id: string | null; rect: Rect; overTrash: boolean };

const NEW_NOTE_SIZE = { width: 240, height: 190 };
/** Pointer travel below this distance is treated as a click, not a drawing. */
const DRAW_THRESHOLD = 6;
const NUDGE_STEP = 10;

const statusLabels = {
  loading: "Loading board…",
  saving: "Saving…",
  saved: "All changes saved",
  local: "Saved on this device",
  error: "Local storage unavailable",
};

// All geometry stays in canvas pixels, independent of page or canvas scrolling.
function canvasPoint(event: PointerEvent, canvas: HTMLDivElement): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.round(event.clientX - rect.left), y: Math.round(event.clientY - rect.top) };
}

function canvasSize(canvas: HTMLDivElement) {
  return { width: canvas.clientWidth, height: canvas.clientHeight };
}

export default function StickyBoard() {
  const { notes, setNotes, ready, status } = useNotes();
  const canvas = useRef<HTMLDivElement>(null);
  const trash = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Callbacks handed to notes are stable, so a memoized NoteCard re-renders only when its own
  // props change. During a drag that is just the note being dragged.
  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      // The array order is the stacking order: moving a note to the end brings it to the front.
      setNotes((current) => {
        const note = current.find((item) => item.id === id);
        if (!note || current[current.length - 1] === note) return current;
        return [...current.filter((item) => item.id !== id), note];
      });
    },
    [setNotes],
  );

  const update = useCallback(
    (id: string, patch: Partial<Omit<Note, "id">>) => {
      setNotes((current) => current.map((note) => (note.id === id ? { ...note, ...patch } : note)));
    },
    [setNotes],
  );

  const remove = useCallback(
    (id: string) => {
      setNotes((current) => current.filter((note) => note.id !== id));
      setEditingId((current) => (current === id ? null : current));
      setSelectedId((current) => (current === id ? null : current));
    },
    [setNotes],
  );

  const cancelGesture = useCallback(() => {
    const active = gesture.current;
    gesture.current = null;
    setPreview(null);
    if (active && canvas.current?.hasPointerCapture(active.pointerId)) {
      canvas.current.releasePointerCapture(active.pointerId);
    }
  }, []);

  const startGesture = useCallback(
    (event: PointerEvent<HTMLElement>, action: Action) => {
      if (!ready || !canvas.current || !event.isPrimary || event.button !== 0 || gesture.current)
        return;
      if (action.kind === "draw" && event.target !== canvas.current) return;
      // preventDefault stops text selection and native dragging, but also the browser's own
      // focus change, so leave any text field explicitly. Focusing the handle instead would
      // make Chromium draw a keyboard focus ring during a mouse drag.
      event.preventDefault();
      event.stopPropagation();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      setEditingId(null);
      if (action.kind === "draw") setSelectedId(null);
      const start = canvasPoint(event, canvas.current);
      gesture.current = { ...action, start, pointerId: event.pointerId };
      // Capturing on the canvas keeps pointer events flowing even outside it, e.g. over the trash.
      canvas.current.setPointerCapture(event.pointerId);
    },
    [ready],
  );

  const nudge = useCallback(
    (note: Note, kind: Handle, dx: number, dy: number) => {
      if (!canvas.current) return;
      select(note.id);
      const end = { x: dx * NUDGE_STEP, y: dy * NUDGE_STEP };
      update(note.id, getRect({ kind, note }, { x: 0, y: 0 }, end, canvasSize(canvas.current)));
    },
    [select, update],
  );

  const actions = useMemo<NoteActions>(
    () => ({ select, update, remove, edit: setEditingId, startGesture, nudge }),
    [select, update, remove, startGesture, nudge],
  );

  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && gesture.current) cancelGesture();
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [cancelGesture]);

  function create(rect: Rect) {
    const id = crypto.randomUUID();
    setNotes((current) => [...current, { id, ...rect, text: "", color: "yellow" }]);
    setSelectedId(id);
    setEditingId(id);
  }

  function addFromButton() {
    if (!ready || !canvas.current || !scrollArea.current) return;
    const { width, height } = canvasSize(canvas.current);
    // Cascade new notes so repeated clicks do not stack them exactly on top of each other.
    const offset = 24 + (notes.length % 6) * 22;
    create({
      x: clamp(scrollArea.current.scrollLeft + offset, 0, width - NEW_NOTE_SIZE.width),
      y: clamp(scrollArea.current.scrollTop + offset, 0, height - NEW_NOTE_SIZE.height),
      ...NEW_NOTE_SIZE,
    });
  }

  function dragPreview(event: PointerEvent, active: Gesture): Preview {
    const surface = canvas.current!;
    const end = canvasPoint(event, surface);
    const trashBounds = trash.current?.getBoundingClientRect();
    return {
      id: active.kind === "draw" ? null : active.note.id,
      rect: getRect(active, active.start, end, canvasSize(surface)),
      overTrash:
        active.kind === "move" &&
        trashBounds !== undefined &&
        containsPoint(trashBounds, { x: event.clientX, y: event.clientY }),
    };
  }

  function moveGesture(event: PointerEvent) {
    const active = gesture.current;
    if (active?.pointerId === event.pointerId) setPreview(dragPreview(event, active));
  }

  function finishGesture(event: PointerEvent) {
    const active = gesture.current;
    if (!active || !canvas.current || active.pointerId !== event.pointerId) return;
    const { rect, overTrash } = dragPreview(event, active);
    cancelGesture();
    if (active.kind === "draw") {
      // A click on empty space only deselects.
      const end = canvasPoint(event, canvas.current);
      if (Math.hypot(end.x - active.start.x, end.y - active.start.y) >= DRAW_THRESHOLD) create(rect);
    } else if (overTrash) {
      remove(active.note.id);
    } else if (!sameRect(rect, active.note)) {
      update(active.note.id, rect);
    }
  }

  // Keep the DOM order stable when a note is raised, preserving focus and tab order.
  const cards = useMemo(
    () =>
      notes
        .map((note, layer) => ({ note, layer }))
        .sort((a, b) => a.note.id.localeCompare(b.note.id)),
    [notes],
  );
  // The canvas grows to fit every note, so notes are never cut off when the window shrinks.
  const contentWidth = notes.reduce((width, note) => Math.max(width, note.x + note.width), 920);
  const contentHeight = notes.reduce((height, note) => Math.max(height, note.y + note.height), 560);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Icon name="brand" size={31} />
            <span>Paperboard</span>
          </div>
          <span className="save-status" role="status" data-status={status}>
            <Icon
              name={
                status === "error"
                  ? "alert"
                  : status === "saving" || status === "loading"
                    ? "loading"
                    : "cloud"
              }
              size={16}
            />
            {statusLabels[status]}
          </span>
        </div>
      </header>
      <section className="workspace" aria-labelledby="board-title">
        <div className="workspace-heading">
          <div className="board-title">
            <div className="title-row">
              <h1 id="board-title">My pinboard</h1>
              <span className="board-count">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            </div>
            <p className="board-subtitle">Drag on the board to create a note.</p>
          </div>
          <button type="button" className="new-note" disabled={!ready} onClick={addFromButton}>
            <Icon name="plus" />
            <span>New note</span>
          </button>
        </div>
        <div className="board-frame">
          <div className="board-scroll" ref={scrollArea}>
            <div
              ref={canvas}
              className="board-canvas"
              tabIndex={-1}
              role="region"
              aria-label="Sticky notes board"
              style={{ minWidth: contentWidth, height: contentHeight }}
              onPointerDown={(event) => startGesture(event, { kind: "draw" })}
              onPointerMove={moveGesture}
              onPointerUp={finishGesture}
              onPointerCancel={(event) => {
                if (gesture.current?.pointerId === event.pointerId) cancelGesture();
              }}
              onLostPointerCapture={(event) => {
                if (gesture.current?.pointerId === event.pointerId) cancelGesture();
              }}
            >
              {cards.map(({ note, layer }) => {
                const active = preview?.id === note.id ? preview : null;
                return (
                  <NoteCard
                    key={note.id}
                    note={note}
                    rect={active?.rect ?? note}
                    layer={layer}
                    selected={selectedId === note.id}
                    dragging={active !== null}
                    overTrash={active?.overTrash ?? false}
                    editing={editingId === note.id}
                    actions={actions}
                  />
                );
              })}
              {preview && preview.id === null && (
                <div
                  className="selection-box"
                  aria-hidden="true"
                  style={{
                    left: preview.rect.x,
                    top: preview.rect.y,
                    width: preview.rect.width,
                    height: preview.rect.height,
                  }}
                />
              )}
            </div>
          </div>
          <footer className="board-footer">
            <p className="board-hint">
              <Icon name="cursor" size={16} />
              Click a note to edit
            </p>
            <div className="trash-zone" ref={trash} data-active={Boolean(preview?.overTrash)}>
              <Icon name="trash" size={16} />
              Drag here to delete
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
