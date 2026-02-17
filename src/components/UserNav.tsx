"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function UserNav() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <a
        href="/login"
        className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors border border-gray-700"
      >
        Sign In
      </a>
    );
  }

  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email;
  const image = user.user_metadata?.avatar_url;

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        <span className="text-xs font-medium text-white">{name}</span>
        <button
          onClick={handleSignOut}
          className="text-[10px] text-gray-400 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
      {image && (
        <img
          src={image}
          alt={name || "User"}
          className="w-8 h-8 rounded-full border border-gray-700"
        />
      )}
    </div>
  );
}
