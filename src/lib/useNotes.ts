"use client";

import { useEffect, useRef, useState } from "react";
import { INITIAL_NOTES, isBoardId, isNotes, type Note } from "./notes";

type SaveStatus = "loading" | "saving" | "saved" | "local" | "error";
type SaveResult = { notes: Note[]; status: "saved" | "local" | "error" };

const BOARD_KEY = "paperboard:board";
const notesKey = (id: string) => `paperboard:notes:${id}`;
const apiPath = (id: string) => `/api/boards/${id}`;

async function openBoard(): Promise<{ id: string; notes: Note[] }> {
  let id: string | null = null;
  try {
    id = localStorage.getItem(BOARD_KEY);
    if (isBoardId(id)) {
      const cached: unknown = JSON.parse(localStorage.getItem(notesKey(id)) ?? "null");
      if (isNotes(cached)) return { id, notes: cached };
    }
  } catch {
    // A blocked store or malformed snapshot must not prevent opening the board.
  }

  if (isBoardId(id)) {
    try {
      const response = await fetch(apiPath(id), {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const remote: unknown = await response.json();
        if (isNotes(remote)) return { id, notes: remote };
      }
    } catch {
      // If neither copy can be read, start a fresh board without overwriting the old one.
    }
  }
  return { id: crypto.randomUUID(), notes: INITIAL_NOTES };
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [lastSave, setLastSave] = useState<SaveResult | null>(null);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    openBoard().then((board) => {
      if (active) {
        setNotes(board.notes);
        setId(board.id);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const url = apiPath(id);
    const body = JSON.stringify(notes);
    let localSaved = false;
    try {
      localStorage.setItem(notesKey(id), body);
      localStorage.setItem(BOARD_KEY, id);
      localSaved = true;
    } catch {
      // Keep edits available in memory and still try the REST copy.
    }

    let current = true;
    async function save() {
      if (!current) return;
      try {
        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error("Save failed");
        if (current) setLastSave({ notes, status: localSaved ? "saved" : "error" });
      } catch {
        if (current) setLastSave({ notes, status: localSaved ? "local" : "error" });
      }
    }

    // Serialize requests: a slow PUT must finish before a newer snapshot is sent.
    const enqueue = () => {
      queue.current = queue.current.then(save);
    };
    const timer = window.setTimeout(enqueue, 350);
    window.addEventListener("online", enqueue);
    return () => {
      current = false;
      window.clearTimeout(timer);
      window.removeEventListener("online", enqueue);
    };
  }, [id, notes]);

  let status: SaveStatus = "loading";
  if (id) status = lastSave?.notes === notes ? lastSave.status : "saving";
  return { notes, setNotes, ready: id !== null, status };
}
