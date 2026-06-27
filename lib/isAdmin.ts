import { createServerClient } from "./supabase";

export async function isAdmin(userId: string) {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role === "admin";
}