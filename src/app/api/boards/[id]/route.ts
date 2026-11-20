import { isBoardId, isNotes, type Note } from "@/lib/notes";

// This mock lives in one server process. The browser keeps its own durable copy.
const boards = new Map<string, Note[]>();
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!isBoardId(id)) return new Response(null, { status: 400 });
  const notes = boards.get(id);
  if (!notes) return new Response(null, { status: 404 });
  return Response.json(notes, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request, { params }: Context) {
  const { id } = await params;
  if (!isBoardId(id)) return new Response(null, { status: 400 });
  const notes: unknown = await request.json().catch(() => null);
  if (!isNotes(notes)) return new Response(null, { status: 400 });

  boards.set(id, notes);
  return new Response(null, { status: 204 });
}
