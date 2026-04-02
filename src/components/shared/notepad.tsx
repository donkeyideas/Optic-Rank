"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StickyNote, X, Plus, Trash2, Check, Copy, Cloud, CloudOff } from "lucide-react";
import { loadUserNotes, saveUserNotes } from "@/lib/actions/notes";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface NoteItem {
  id: string;
  text: string;
  checked: boolean;
}

interface NotepadData {
  notes: string;
  checklist: NoteItem[];
}

const STORAGE_KEY = "opticrank-notepad";
const SAVE_DEBOUNCE_MS = 1500;

function loadLocal(): NotepadData {
  if (typeof window === "undefined") return { notes: "", checklist: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { notes: "", checklist: [] };
}

function saveLocal(data: NotepadData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function Notepad() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"notes" | "checklist">("notes");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<NoteItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState<boolean | null>(null); // null=loading, true=synced, false=error
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const dirty = useRef(false); // tracks whether there are unsaved changes
  const latestData = useRef<NotepadData>({ notes: "", checklist: [] });

  // Keep latestData ref in sync with state
  useEffect(() => {
    latestData.current = { notes, checklist };
  }, [notes, checklist]);

  // Flush any pending save to Supabase immediately (fire-and-forget)
  const flushSave = useCallback(async () => {
    if (!dirty.current || !initialized.current) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    dirty.current = false;
    try {
      const result = await saveUserNotes(latestData.current);
      setSynced(!result.error);
    } catch {
      setSynced(false);
    }
  }, []);

  // Load from DB on mount, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Show localStorage data immediately for fast UX
      const local = loadLocal();
      if (!initialized.current) {
        setNotes(local.notes);
        setChecklist(local.checklist);
      }

      // Then fetch from DB — DB is the source of truth
      try {
        const remote = await loadUserNotes();
        if (cancelled) return;
        const hasRemoteData = remote.notes !== "" || remote.checklist.length > 0;
        if (hasRemoteData) {
          setNotes(remote.notes);
          setChecklist(remote.checklist);
          saveLocal(remote); // update local cache
          setSynced(true);
        } else if (local.notes || local.checklist.length > 0) {
          // First time: push existing local notes to DB
          const result = await saveUserNotes(local);
          setSynced(!result.error);
        } else {
          setSynced(true);
        }
      } catch {
        setSynced(false); // offline — local-only mode
      }
      initialized.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced save to DB + immediate save to localStorage
  useEffect(() => {
    if (!initialized.current) return;
    const data: NotepadData = { notes, checklist };
    saveLocal(data);
    dirty.current = true;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      dirty.current = false;
      try {
        const result = await saveUserNotes(data);
        setSynced(!result.error);
      } catch {
        setSynced(false);
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [notes, checklist]);

  // Flush save on page hide / beforeunload to prevent data loss
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSave();
      }
    };
    const handleBeforeUnload = () => {
      flushSave();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Flush on unmount (e.g. navigating away within the SPA)
      flushSave();
    };
  }, [flushSave]);

  const addChecklistItem = useCallback(() => {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, checked: false },
    ]);
    setNewItem("");
    inputRef.current?.focus();
  }, [newItem]);

  const toggleItem = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearChecked = useCallback(() => {
    setChecklist((prev) => prev.filter((item) => !item.checked));
  }, []);

  const copyAll = useCallback(() => {
    let text = "";
    if (tab === "notes") {
      text = notes;
    } else {
      text = checklist
        .map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.text}`)
        .join("\n");
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [tab, notes, checklist]);

  const checkedCount = checklist.filter((i) => i.checked).length;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center bg-ink text-surface-cream shadow-lg transition-all hover:bg-ink/90 active:scale-95"
        title="Open Notepad"
      >
        {open ? <X size={20} /> : <StickyNote size={20} />}
      </button>

      {/* Notepad panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex w-[360px] max-h-[520px] flex-col border border-rule bg-surface-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule bg-ink px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-surface-cream">
                Notepad
              </span>
              {synced === true && (
                <span title="Synced across devices"><Cloud size={11} className="text-editorial-green" /></span>
              )}
              {synced === false && (
                <span title="Local only — sync failed"><CloudOff size={11} className="text-editorial-red" /></span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyAll}
                className="flex items-center gap-1 text-[10px] font-medium text-surface-cream/70 transition-colors hover:text-surface-cream"
                title="Copy to clipboard"
              >
                {copied ? <Check size={12} className="text-editorial-green" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-surface-cream/70 transition-colors hover:text-surface-cream"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-rule">
            <button
              onClick={() => setTab("notes")}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                tab === "notes"
                  ? "border-b-2 border-editorial-red text-editorial-red"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setTab("checklist")}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
                tab === "checklist"
                  ? "border-b-2 border-editorial-red text-editorial-red"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Checklist
              {checklist.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center bg-ink/10 px-1 text-[9px] font-bold text-ink">
                  {checkedCount}/{checklist.length}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {tab === "notes" ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your notes here...&#10;&#10;Paste links, ideas, reminders — anything you need to remember while working."
                className="h-[340px] w-full resize-none border-0 bg-transparent px-4 py-3 font-sans text-[13px] leading-relaxed text-ink placeholder:text-ink-muted/60 focus:outline-none"
              />
            ) : (
              <div className="flex flex-col">
                {/* Add item input */}
                <div className="flex items-center gap-2 border-b border-rule px-4 py-2.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addChecklistItem();
                    }}
                    placeholder="Add a task..."
                    className="flex-1 bg-transparent font-sans text-[13px] text-ink placeholder:text-ink-muted/60 focus:outline-none"
                  />
                  <button
                    onClick={addChecklistItem}
                    disabled={!newItem.trim()}
                    className="flex h-6 w-6 items-center justify-center bg-editorial-red text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-30"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Checklist items */}
                <div className="max-h-[280px] overflow-y-auto">
                  {checklist.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[12px] text-ink-muted">
                      No tasks yet. Add one above.
                    </div>
                  ) : (
                    checklist.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2 border-b border-rule/50 px-4 py-2 transition-colors hover:bg-surface-raised"
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
                            item.checked
                              ? "border-editorial-green bg-editorial-green text-white"
                              : "border-rule hover:border-editorial-red"
                          }`}
                        >
                          {item.checked && <Check size={10} strokeWidth={3} />}
                        </button>
                        <span
                          className={`flex-1 font-sans text-[13px] ${
                            item.checked
                              ? "text-ink-muted line-through"
                              : "text-ink"
                          }`}
                        >
                          {item.text}
                        </span>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="opacity-0 transition-opacity group-hover:opacity-100 text-ink-muted hover:text-editorial-red"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Clear checked */}
                {checkedCount > 0 && (
                  <div className="border-t border-rule px-4 py-2">
                    <button
                      onClick={clearChecked}
                      className="text-[11px] font-semibold text-editorial-red transition-colors hover:text-editorial-red/80"
                    >
                      Clear {checkedCount} completed
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
