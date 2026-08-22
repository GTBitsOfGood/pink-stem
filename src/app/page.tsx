"use client";

import { useEffect, useState } from "react";

type Note = { _id: string; title: string; body: string };

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    const res = await fetch("/api/notes");
    setNotes(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setTitle("");
    setBody("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main style={{ maxWidth: 640, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Notes</h1>
      <form onSubmit={add} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" />
        <button type="submit">Add</button>
      </form>
      <ul style={{ display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
        {notes.map((n) => (
          <li key={n._id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6 }}>
            <strong>{n.title}</strong>
            <p>{n.body}</p>
            <button onClick={() => remove(n._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
