"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/LogoutButton";
import UploadModal from "@/components/UploadModal";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log(user);
    console.log(error);

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    const adminRole = user.app_metadata?.role;

    console.log("ROLE:", adminRole);

    setRole(adminRole ?? "");

    if (adminRole !== "admin") {
      router.push("/");
      return;
    }

    setAuthorized(true);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-3">
        <h1 className="text-3xl font-bold text-red-500">
          Not Authorized
        </h1>

        <p>User ID</p>
        <code>{userId}</code>

        <p>Role</p>
        <code>{role}</code>

        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">
          Admin Dashboard
        </h1>

        <LogoutButton />
      </div>

      <div className="grid grid-cols-3 gap-6">

        <button
          onClick={() => setShowUpload(true)}
          className="rounded-xl bg-brand-500 p-10"
        >
          Upload PDF
        </button>

        <button className="rounded-xl bg-zinc-800 p-10">
          Upload CSV
        </button>

        <button className="rounded-xl bg-zinc-800 p-10">
          Manage Exams
        </button>

      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onComplete={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}