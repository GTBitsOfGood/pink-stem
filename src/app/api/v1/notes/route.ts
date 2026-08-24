import NoteService from "@/services/note";
import { cacheControlMiddleware } from "@/middleware/cache-control";
import { withErrorHandler } from "@/utils/withErrorHandler";
import { NextRequest, NextResponse } from "next/server";

export const GET = withErrorHandler<Record<string, never>>(
  async (req: NextRequest) => {
    const notes = await NoteService.getAllNotes();

    const headers = cacheControlMiddleware(req);
    return NextResponse.json(notes, { status: 200, headers });
  }
);

export const POST = withErrorHandler<Record<string, never>>(
  async (req: NextRequest) => {
    const { title, body } = await req.json();

    const note = await NoteService.createNote(title, body);

    return NextResponse.json(note, { status: 201 });
  }
);
