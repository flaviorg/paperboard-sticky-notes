import { describe, expect, it } from "vitest";
import { containsPoint, getRect, sameRect, type Action } from "./geometry";
import { MIN_HEIGHT, MIN_WIDTH, type Note } from "./notes";

const bounds = { width: 1000, height: 800 };
const note: Note = { id: "n", text: "", color: "yellow", x: 100, y: 100, width: 200, height: 150 };
const draw: Action = { kind: "draw" };

describe("getRect: draw", () => {
  it("uses the drag start and end as opposite corners", () => {
    expect(getRect(draw, { x: 50, y: 60 }, { x: 350, y: 300 }, bounds)).toEqual({
      x: 50,
      y: 60,
      width: 300,
      height: 240,
    });
  });

  it("supports drawing up and to the left", () => {
    expect(getRect(draw, { x: 400, y: 400 }, { x: 100, y: 150 }, bounds)).toEqual({
      x: 100,
      y: 150,
      width: 300,
      height: 250,
    });
  });

  it("enforces the minimum note size", () => {
    const rect = getRect(draw, { x: 50, y: 50 }, { x: 60, y: 55 }, bounds);
    expect(rect.width).toBe(MIN_WIDTH);
    expect(rect.height).toBe(MIN_HEIGHT);
  });

  it("keeps a minimum-size note inside the canvas near the edge", () => {
    const rect = getRect(draw, { x: 990, y: 790 }, { x: 995, y: 795 }, bounds);
    expect(rect.x + rect.width).toBeLessThanOrEqual(bounds.width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(bounds.height);
  });
});

describe("getRect: move", () => {
  const move: Action = { kind: "move", note };

  it("moves by the pointer delta and keeps the size", () => {
    expect(getRect(move, { x: 10, y: 10 }, { x: 50, y: -5 }, bounds)).toEqual({
      x: 140,
      y: 85,
      width: 200,
      height: 150,
    });
  });

  it("stops at the canvas edges", () => {
    expect(getRect(move, { x: 0, y: 0 }, { x: -500, y: 2000 }, bounds)).toMatchObject({
      x: 0,
      y: bounds.height - note.height,
    });
  });
});

describe("getRect: resize", () => {
  const resize: Action = { kind: "resize", note };

  it("changes the size and keeps the origin", () => {
    expect(getRect(resize, { x: 0, y: 0 }, { x: 30, y: 40 }, bounds)).toEqual({
      x: 100,
      y: 100,
      width: 230,
      height: 190,
    });
  });

  it("clamps between the minimum size and the canvas edge", () => {
    expect(getRect(resize, { x: 0, y: 0 }, { x: -1000, y: 5000 }, bounds)).toMatchObject({
      width: MIN_WIDTH,
      height: bounds.height - note.y,
    });
  });
});

describe("helpers", () => {
  it("compares rectangles by value", () => {
    expect(sameRect(note, { x: 100, y: 100, width: 200, height: 150 })).toBe(true);
    expect(sameRect(note, { x: 101, y: 100, width: 200, height: 150 })).toBe(false);
  });

  it("includes the edges when hit-testing", () => {
    const box = { left: 10, top: 10, right: 20, bottom: 20 };
    expect(containsPoint(box, { x: 10, y: 20 })).toBe(true);
    expect(containsPoint(box, { x: 21, y: 15 })).toBe(false);
  });
});
