"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Sparkles } from "lucide-react";
import {
  addSocialCompetitor,
  removeSocialCompetitor,
  analyzeSocialProfile,
  discoverSocialCompetitors,
} from "@/lib/actions/social-intelligence";
import type { SocialProfile, SocialCompetitor } from "@/types";

interface CompetitorsTabProps {
  profile: SocialProfile;
  competitors: SocialCompetitor[];
  profileId: string;
}

export function CompetitorsTab({ profile, competitors, profileId }: CompetitorsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addSocialCompetitor(profileId, formData);
      if ("error" in result) setAddError(result.error);
      else setShowAdd(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await removeSocialCompetitor(id);
    });
  }

  function handleBenchmark() {
    startTransition(async () => {
      await analyzeSocialProfile(profileId, "competitors");
    });
  }

  function handleDiscover() {
    setStatusMsg(null);
    startTransition(async () => {
      const result = await discoverSocialCompetitors(profileId);
      if ("error" in result) {
        setStatusMsg(result.error);
      } else {
        setStatusMsg(`Discovered ${result.added} competitors.`);
      }
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">Competitor Benchmarking</h3>
          <p className="text-sm text-ink-secondary">
            Compare @{profile.handle} against competitors on {profile.platform}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDiscover} disabled={isPending}>
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            {isPending ? "Discovering..." : "Discover Competitors"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Manually
          </Button>
          {competitors.length > 0 && (
            <Button size="sm" onClick={handleBenchmark} disabled={isPending}>
              {isPending ? "Analyzing..." : "Run Benchmark"}
            </Button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className={`border px-4 py-2 text-sm ${
          statusMsg.includes("Discovered")
            ? "border-editorial-green/30 bg-editorial-green/10 text-editorial-green"
            : "border-editorial-red/30 bg-editorial-red/10 text-editorial-red"
        }`}>
          {statusMsg}
          <button onClick={() => setStatusMsg(null)} className="ml-4 text-xs underline">
            dismiss
          </button>
        </div>
      )}

      {/* Your profile row */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="success">You</Badge>
              <span className="font-mono text-sm font-medium text-ink">@{profile.handle}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-right">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  Followers
                </span>
                <p className="font-mono font-medium text-ink">
                  {profile.followers_count.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  Engagement
                </span>
                <p className="font-mono font-medium text-ink">
                  {profile.engagement_rate != null ? `${profile.engagement_rate}%` : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitor rows */}
      {competitors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-ink-muted">
              No competitors added yet. Add competitors to benchmark your performance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {competitors.map((comp) => {
            const followerDiff = comp.followers_count
              ? comp.followers_count - profile.followers_count
              : null;

            return (
              <Card key={comp.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-ink">
                        @{comp.handle}
                      </span>
                      {comp.display_name && (
                        <span className="text-sm text-ink-muted">{comp.display_name}</span>
                      )}
                      {comp.niche && <Badge variant="muted">{comp.niche}</Badge>}
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                          Followers
                        </span>
                        <p className="font-mono font-medium text-ink">
                          {comp.followers_count?.toLocaleString() ?? "—"}
                        </p>
                        {followerDiff !== null && (
                          <span
                            className={`font-mono text-[10px] ${
                              followerDiff > 0
                                ? "text-editorial-red"
                                : "text-editorial-green"
                            }`}
                          >
                            {followerDiff > 0 ? "+" : ""}
                            {followerDiff.toLocaleString()} vs you
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                          Engagement
                        </span>
                        <p className="font-mono font-medium text-ink">
                          {comp.engagement_rate ?? "—"}%
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(comp.id)}
                        className="text-ink-muted hover:text-editorial-red"
                        title="Remove competitor"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add competitor dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
            <DialogDescription>
              Add a {profile.platform} competitor to benchmark against.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                Handle
              </label>
              <Input name="handle" placeholder="@competitor" required />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                Display Name
              </label>
              <Input name="display_name" placeholder="Name (optional)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                  Followers
                </label>
                <Input name="followers_count" type="number" placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                  Engagement %
                </label>
                <Input name="engagement_rate" type="number" step="0.01" placeholder="3.5" />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
                Niche
              </label>
              <Input name="niche" placeholder="e.g. fitness, tech" />
            </div>

            {addError && <p className="text-sm text-editorial-red">{addError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding..." : "Add Competitor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
