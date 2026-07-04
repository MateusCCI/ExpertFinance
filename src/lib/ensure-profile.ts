import { supabase } from "./supabase";

let profileEnsured = false;

export async function ensureProfile() {
  if (profileEnsured) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    await supabase
      .from("profiles")
      .insert({ id: user.id, name: user.email?.split("@")[0] ?? "Usuário", email: user.email });
  }

  profileEnsured = true;
}
