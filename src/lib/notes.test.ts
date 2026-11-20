import { describe, expect, it } from "vitest";
import { INITIAL_NOTES, isBoardId, isNotes } from "./notes";

const valid = { id: "a", text: "Hi", color: "pink", x: 0, y: 0, width: 200, height: 200 };

describe("isNotes", () => {
  it("accepts the initial notes and an empty board", () => {
    expect(isNotes(INITIAL_NOTES)).toBe(true);
    expect(isNotes([])).toBe(true);
  });

  it.each([
    ["an unknown color", { ...valid, color: "purple" }],
    ["a negative position", { ...valid, x: -1 }],
    ["a size below the minimum", { ...valid, width: 10 }],
    ["a non-finite number", { ...valid, height: Infinity }],
    ["a missing text", { ...valid, text: undefined }],
  ])("rejects a note with %s", (_, note) => {
    expect(isNotes([note])).toBe(false);
  });

  it("rejects duplicate ids", () => {
    expect(isNotes([valid, { ...valid }])).toBe(false);
  });

  it("rejects values that are not arrays", () => {
    expect(isNotes(null)).toBe(false);
    expect(isNotes({ 0: valid })).toBe(false);
  });
});

describe("isBoardId", () => {
  it("accepts UUIDs only", () => {
    expect(isBoardId("6f1c2a5e-8d3b-4c7a-9e21-0b5d4f3a2c19")).toBe(true);
    expect(isBoardId("../etc/passwd")).toBe(false);
    expect(isBoardId(42)).toBe(false);
  });
});
