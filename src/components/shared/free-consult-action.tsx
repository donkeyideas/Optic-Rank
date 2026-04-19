"use client";

import { CalendarCheck } from "lucide-react";

const CONSULT_URL = "https://calendar.app.google/KnxHbsHZiUEA1HZ77";

export function FreeConsultAction() {
  return (
    <a
      href={CONSULT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="relative flex items-center gap-1.5 rounded-none border border-editorial-green/40 bg-editorial-green/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-editorial-green transition-colors hover:bg-editorial-green/20 hover:border-editorial-green/60 animate-pulse hover:animate-none"
    >
      <CalendarCheck size={12} strokeWidth={2} />
      <span className="hidden sm:inline">Free Consult</span>
    </a>
  );
}
