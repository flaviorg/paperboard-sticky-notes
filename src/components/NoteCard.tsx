import { memo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Action, Handle, Rect } from "@/lib/geometry";
import { NOTE_COLORS, type Note } from "@/lib/notes";
import { Icon } from "./Icon";

/** Board operations a note can trigger. The board keeps this object referentially stable. */
export type NoteActions = {
  select: (id: string) => void;
  edit: (id: string | null) => void;
  update: (id: string, patch: Partial<Omit<Note, "id">>) => void;
  remove: (id: string) => void;
  startGesture: (event: PointerEvent<HTMLElement>, action: Action) => void;
  /** Moves or resizes a note by one keyboard step in the given direction. */
  nudge: (note: Note, handle: Handle, dx: number, dy: number) => void;
};

type Props = {
  note: Note;
  /** Where the note is drawn: its stored geometry, or the live preview while it is dragged. */
  rect: Rect;
  /** Position in the stacking order; higher layers are drawn on top. */
  layer: number;
  selected: boolean;
  dragging: boolean;
  overTrash: boolean;
  editing: boolean;
  actions: NoteActions;
};

const arrows: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export const NoteCard = memo(function NoteCard({
  note,
  rect,
  layer,
  selected,
  dragging,
  overTrash,
  editing,
  actions,
}: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const colorButton = useRef<HTMLButtonElement>(null);
  const textButton = useRef<HTMLButtonElement>(null);
  const [title, ...lines] = note.text.split("\n");
  const label = title.trim().slice(0, 60) || "Untitled note";

  function nudge(event: KeyboardEvent<HTMLButtonElement>, handle: Handle) {
    const direction = arrows[event.key];
    if (!direction) return;
    event.preventDefault();
    actions.nudge(note, handle, direction[0], direction[1]);
  }

  return (
    <article
      className="note-card"
      aria-label={label}
      data-color={note.color}
      data-selected={selected}
      data-dragging={dragging}
      data-over-trash={overTrash}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        zIndex: layer + 1,
      }}
      onPointerDownCapture={() => actions.select(note.id)}
    >
      <div className="note-toolbar">
        <button
          type="button"
          className="note-grip"
          aria-label={`Move ${label}`}
          title="Drag to move · Arrow keys move by 10 pixels"
          onPointerDown={(event) => actions.startGesture(event, { kind: "move", note })}
          onKeyDown={(event) => nudge(event, "move")}
        >
          <Icon name="grip" />
        </button>
        <div
          className="note-color-controls"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setPaletteOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setPaletteOpen(false);
              colorButton.current?.focus();
            }
          }}
        >
          <button
            type="button"
            ref={colorButton}
            className="note-color-toggle"
            aria-label={`Change color of ${label}`}
            aria-expanded={paletteOpen}
            title="Change color"
            onClick={() => {
              actions.select(note.id);
              setPaletteOpen(!paletteOpen);
            }}
          >
            <Icon name="palette" />
          </button>
          {paletteOpen && (
            <div className="color-picker" role="group" aria-label="Note color">
              {NOTE_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  className="color-swatch"
                  data-color={color}
                  aria-label={color}
                  title={color}
                  aria-pressed={note.color === color}
                  onClick={() => {
                    actions.update(note.id, { color });
                    setPaletteOpen(false);
                    colorButton.current?.focus();
                  }}
                >
                  {note.color === color && <Icon name="check" size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="note-delete"
          title="Delete note"
          aria-label={`Delete ${label}`}
          onClick={() => actions.remove(note.id)}
        >
          <Icon name="trash" />
        </button>
      </div>
      {editing ? (
        <textarea
          className="note-text"
          aria-label="Note text"
          placeholder="Write a note…"
          autoFocus
          value={note.text}
          onChange={(event) => actions.update(note.id, { text: event.target.value })}
          onBlur={() => actions.edit(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              actions.edit(null);
              requestAnimationFrame(() => textButton.current?.focus());
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="note-body"
          ref={textButton}
          aria-label={`Edit ${label}`}
          onClick={() => {
            actions.select(note.id);
            actions.edit(note.id);
          }}
        >
          <span className="note-title">{title || (note.text ? " " : "Write a note…")}</span>
          {lines.length > 0 && (
            <span className="note-description">{lines.join("\n").replace(/^\n/, "")}</span>
          )}
        </button>
      )}
      <button
        type="button"
        className="note-resize"
        aria-label={`Resize ${label}`}
        title="Drag to resize · Arrow keys resize by 10 pixels"
        onPointerDown={(event) => actions.startGesture(event, { kind: "resize", note })}
        onKeyDown={(event) => nudge(event, "resize")}
      >
        <Icon name="resize" size={14} />
      </button>
    </article>
  );
});
