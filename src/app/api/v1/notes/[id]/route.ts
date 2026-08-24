import NoteService from "@/services/note";
import { cacheControlMiddleware } from "@/middleware/cache-control";
import { withErrorHandler } from "@/utils/withErrorHandler";
import { NextRequest, NextResponse } from "next/server";

export const GET = withErrorHandler<{ id: string }>(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const note = await NoteService.getNote(params.id);

    const headers = cacheControlMiddleware(req);
    return NextResponse.json(note, { status: 200, headers });
  }
);

export const PATCH = withErrorHandler<{ id: string }>(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    const { title, body } = await req.json();

    const note = await NoteService.updateNote(params.id, title, body);

    return NextResponse.json(note, { status: 200 });
  }
);

export const DELETE = withErrorHandler<{ id: string }>(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    await NoteService.deleteNote(params.id);

    return new NextResponse(null, { status: 204 });
  }
);
