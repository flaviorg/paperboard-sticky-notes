import { MIN_HEIGHT, MIN_WIDTH, type Note } from "./notes";

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Point & Size;
export type Bounds = { left: number; top: number; right: number; bottom: number };

export type Handle = "move" | "resize";
/** What a pointer gesture does: draw a new note, or move/resize an existing one. */
export type Action = { kind: "draw" } | { kind: Handle; note: Note };

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Computes the rectangle produced by a gesture from `start` to `end`.
 * All coordinates are canvas pixels; `bounds` is the canvas size, so the result never leaves it.
 */
export function getRect(action: Action, start: Point, end: Point, bounds: Size): Rect {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (action.kind === "draw") {
    // Drawing works in any direction: the start point is one corner, the pointer the opposite one.
    const width = Math.max(MIN_WIDTH, Math.abs(clamp(end.x, 0, bounds.width) - start.x));
    const height = Math.max(MIN_HEIGHT, Math.abs(clamp(end.y, 0, bounds.height) - start.y));
    return {
      x: clamp(dx < 0 ? start.x - width : start.x, 0, bounds.width - width),
      y: clamp(dy < 0 ? start.y - height : start.y, 0, bounds.height - height),
      width,
      height,
    };
  }

  const { x, y, width, height } = action.note;
  if (action.kind === "resize") {
    return {
      x,
      y,
      width: clamp(width + dx, MIN_WIDTH, bounds.width - x),
      height: clamp(height + dy, MIN_HEIGHT, bounds.height - y),
    };
  }
  return {
    x: clamp(x + dx, 0, bounds.width - width),
    y: clamp(y + dy, 0, bounds.height - height),
    width,
    height,
  };
}

export function sameRect(a: Rect, b: Rect) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function containsPoint(bounds: Bounds, point: Point) {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  );
}
