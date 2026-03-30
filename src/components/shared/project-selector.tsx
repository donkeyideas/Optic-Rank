"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
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

interface ProjectSelectorProps {
  projects: Project[];
}

export function ProjectSelector({ projects }: ProjectSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const active = projects.find((p) => p.is_active) ?? projects[0];

  if (!projects.length) return null;
  if (projects.length === 1) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-surface-cream/70">
        <Globe size={12} />
        {active?.name}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-auto border-0 bg-transparent px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-surface-cream/70 hover:bg-surface-cream/10 hover:text-surface-cream"
        disabled={isPending}
      >
        <Globe size={12} className="mr-1" />
        {isPending ? "Switching..." : active?.name ?? "Select Project"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        <DropdownMenuLabel>Your Projects</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            disabled={project.is_active}
            onClick={() => {
              if (project.is_active) return;
              startTransition(async () => {
                await switchProject(project.id);
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
  );
}
