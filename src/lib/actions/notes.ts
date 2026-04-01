"use server";

import { createClient } from "@/lib/supabase/server";

interface NoteItem {
  id: string;
  text: string;
  checked: boolean;
}

interface NotepadData {
  notes: string;
  checklist: NoteItem[];
}

/**
 * Load the authenticated user's notepad data from the database.
 */
export async function loadUserNotes(): Promise<NotepadData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { notes: "", checklist: [] };

  const { data } = await supabase
    .from("user_notes")
    .select("notes, checklist")
    .eq("user_id", user.id)
    .single();

  if (!data) return { notes: "", checklist: [] };

  return {
    notes: data.notes ?? "",
    checklist: (data.checklist as NoteItem[]) ?? [],
  };
}

/**
 * Save the authenticated user's notepad data to the database.
 */
export async function saveUserNotes(
  notepadData: NotepadData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("user_notes").upsert(
    {
      user_id: user.id,
      notes: notepadData.notes,
      checklist: notepadData.checklist as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: error.message };
  return {};
}
