export const NOTE_COLORS = ["yellow", "pink", "blue", "green"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export const MIN_WIDTH = 160;
export const MIN_HEIGHT = 128;

export type Note = {
  id: string;
  text: string;
  color: NoteColor;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const INITIAL_NOTES: Note[] = [
  {
    id: "first-thought",
    text: "A little room to think\n\nOne idea per note. Click this text to make it your own.",
    color: "yellow",
    x: 54,
    y: 66,
    width: 256,
    height: 220,
  },
  {
    id: "move-things",
    text: "Try a new arrangement\n\nGrab the top of a note to move it. Pull its corner to resize.",
    color: "pink",
    x: 358,
    y: 170,
    width: 232,
    height: 205,
  },
  {
    id: "next-idea",
    text: "What’s next?\n\nDrag across an empty spot to make space for another idea.",
    color: "blue",
    x: 633,
    y: 56,
    width: 235,
    height: 210,
  },
];

export function isBoardId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)
  );
}

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) return false;
  const note = value as Record<string, unknown>;
  return (
    typeof note.id === "string" &&
    note.id.length > 0 &&
    typeof note.text === "string" &&
    NOTE_COLORS.some((color) => color === note.color) &&
    validSize(note.x, 0) &&
    validSize(note.y, 0) &&
    validSize(note.width, MIN_WIDTH) &&
    validSize(note.height, MIN_HEIGHT)
  );
}

function validSize(value: unknown, minimum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum;
}

export function isNotes(value: unknown): value is Note[] {
  return (
    Array.isArray(value) &&
    value.every(isNote) &&
    new Set(value.map((note) => note.id)).size === value.length
  );
}
