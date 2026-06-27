"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">

      <form
        onSubmit={login}
        className="w-full max-w-md bg-zinc-900 p-8 rounded-xl space-y-4"
      >

        <h1 className="text-3xl font-bold text-white">
          Admin Login
        </h1>

        <input
          className="w-full p-3 rounded bg-zinc-800 text-white"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          className="w-full p-3 rounded bg-zinc-800 text-white"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full bg-brand-500 py-3 rounded text-white font-bold"
        >
          {loading ? "Signing in..." : "Login"}
        </button>

      </form>

    </div>
  );
}