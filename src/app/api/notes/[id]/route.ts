import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import Note from "@/models/Note";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const note = await Note.findById(params.id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const data = await req.json();
  const note = await Note.findByIdAndUpdate(params.id, data, { new: true });
  return NextResponse.json(note);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  await Note.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
