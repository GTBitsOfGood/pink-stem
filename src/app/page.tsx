import { redirect } from "next/navigation";

/** The proxy normally sends `/` to the right landing page first; this is the fallback. */
export default function RootPage() {
  redirect("/events");
}
