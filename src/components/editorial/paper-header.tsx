"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { switchProject } from "@/lib/actions/projects";

interface Project {
  id: string;
  name: string;
  domain: string | null;
  is_active: boolean;
}

export interface PaperHeaderProps {
  /** Date line text, e.g. "Saturday, March 15, 2026" */
  dateLine: string;
  /** The main title — defaults to active project name */
  title: string;
  /** The portion of the title to render in editorial red */
  accentText?: string;
  /** Italic tagline below the title */
  tagline?: string;
  /** Projects for the switcher dropdown */
  projects?: Project[];
  className?: string;
}

export function PaperHeader({
  dateLine,
  title,
  accentText,
  tagline,
  projects,
  className,
}: PaperHeaderProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const hasMultipleProjects = projects && projects.length > 1;

  function renderTitle() {
    if (!accentText) {
      return <>{title}</>;
    }

    const idx = title.indexOf(accentText);
    if (idx === -1) {
      return <>{title}</>;
    }

    const before = title.slice(0, idx);
    const after = title.slice(idx + accentText.length);

    return (
      <>
        {before}
        <span className="text-editorial-red">{accentText}</span>
        {after}
      </>
    );
  }

  return (
    <header
      className={cn(
        "border-b-4 border-double border-rule-dark bg-surface-card px-4 sm:px-6 pb-4 sm:pb-5 pt-4 sm:pt-6 text-center",
        className,
      )}
    >
      {/* Date line */}
      <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-muted">
        {dateLine}
      </p>

      {/* Title — with project switcher if multiple projects */}
      {hasMultipleProjects ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "group mx-auto h-auto border-0 bg-transparent p-0 font-serif text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] font-black leading-none tracking-tight text-ink",
              "inline-flex items-center gap-2 hover:bg-transparent hover:text-ink/80 transition-colors",
              "[&>svg]:h-6 [&>svg]:w-6 [&>svg]:animate-bounce [&>svg]:text-editorial-red",
              isPending && "opacity-60",
            )}
          >
            {isPending ? "Switching…" : renderTitle()}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[260px]">
            <DropdownMenuLabel>Switch Project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                disabled={project.is_active}
                onClick={() => {
                  if (project.is_active) return;
                  startTransition(async () => {
                    await switchProject(project.id);
                    router.push("/dashboard");
                    router.refresh();
                  });
                }}
                className={project.is_active ? "font-bold" : ""}
              >
                <span className="flex flex-col">
                  <span className="text-[13px]">
                    {project.name}
                    {project.is_active && (
                      <span className="ml-2 text-[10px] text-editorial-green">Active</span>
                    )}
                  </span>
                  {project.domain && (
                    <span className="text-[10px] text-ink-muted">{project.domain}</span>
                  )}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <h1 className="font-serif text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] font-black leading-none tracking-tight text-ink">
          {renderTitle()}
        </h1>
      )}

      {/* Tagline */}
      {tagline && (
        <p className="mt-3 font-serif text-[13px] sm:text-[15px] italic text-ink-muted">
          {tagline}
        </p>
      )}
    </header>
  );
}
