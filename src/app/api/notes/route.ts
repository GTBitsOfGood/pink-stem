import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Note from "@/models/Note";

export async function GET() {
  await dbConnect();
  const notes = await Note.find().sort({ createdAt: -1 });
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  await dbConnect();
  const { title, body } = await req.json();
  const note = await Note.create({ title, body });
  return NextResponse.json(note, { status: 201 });
}
