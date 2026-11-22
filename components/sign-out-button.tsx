"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:border-sand hover:text-ink"
    >
      Sign out
    </button>
  );
}
