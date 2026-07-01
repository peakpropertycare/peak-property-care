import { supabase } from "./supabaseClient";

/**
 * Mimics the old Claude-artifact window.storage API (get/set/delete by key,
 * JSON string values) so the rest of the app's logic didn't need to change.
 * Everyone using this app shares the same Supabase project, so all data
 * syncs across every device and every team member automatically.
 */
export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { key, value: JSON.stringify(data.value) };
  },

  async set(key, value) {
    const parsed = JSON.parse(value);
    // Check if row exists so we update (not insert a duplicate)
    const { data: existing } = await supabase.from("app_storage").select("key").eq("key", key).maybeSingle();
    const { error } = existing
      ? await supabase.from("app_storage").update({ value: parsed, updated_at: new Date().toISOString() }).eq("key", key)
      : await supabase.from("app_storage").insert({ key, value: parsed, updated_at: new Date().toISOString() });
    if (error) {
      console.error("storage.set failed", error);
      return null;
    }
    return { key, value };
  },

  async delete(key) {
    const { error } = await supabase.from("app_storage").delete().eq("key", key);
    if (error) {
      console.error("storage.delete failed", error);
      return null;
    }
    return { key, deleted: true };
  },
};
