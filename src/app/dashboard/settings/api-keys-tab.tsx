"use client";

import { useState, useTransition } from "react";
import { Key, Plus, Copy, Trash2, Loader2, Check, Shield } from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
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
import { EmptyState } from "@/components/shared/empty-state";
import { createApiKey, revokeApiKey, type ApiKeyPublic } from "@/lib/actions/api-keys";

const AVAILABLE_SCOPES = [
  { id: "projects:read", label: "Projects (read)" },
  { id: "keywords:read", label: "Keywords (read)" },
  { id: "backlinks:read", label: "Backlinks (read)" },
  { id: "audit:read", label: "Site Audit (read)" },
  { id: "predictions:read", label: "Predictions (read)" },
  { id: "entities:read", label: "Entities (read)" },
  { id: "visibility:read", label: "AI Visibility (read)" },
  { id: "*", label: "Full Access (all scopes)" },
];

interface ApiKeysTabProps {
  initialKeys: ApiKeyPublic[];
}

export function ApiKeysTab({ initialKeys }: ApiKeysTabProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["projects:read", "keywords:read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newKeyName.trim()) {
      setError("Name is required.");
      return;
    }
    if (newKeyScopes.length === 0) {
      setError("Select at least one scope.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createApiKey(newKeyName.trim(), newKeyScopes);
      if ("error" in result) {
        setError(result.error);
      } else {
        setCreatedKey(result.key);
        // Refresh the list by adding the new key to local state
        setKeys((prev) => [
          {
            id: crypto.randomUUID(),
            name: newKeyName.trim(),
            key_prefix: result.keyPrefix,
            scopes: newKeyScopes,
            expires_at: null,
            last_used_at: null,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    });
  }

  function handleRevoke(keyId: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await revokeApiKey(keyId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
      }
    });
  }

  function handleCopy() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function toggleScope(scope: string) {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function closeDialog() {
    setShowCreate(false);
    setCreatedKey(null);
    setNewKeyName("");
    setNewKeyScopes(["projects:read", "keywords:read"]);
    setError(null);
  }

  const activeKeys = keys.filter((k) => k.is_active);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <ColumnHeader
          title="API Keys"
          subtitle="Manage API keys for programmatic access to your data"
        />
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          Create API Key
        </Button>
      </div>

      {activeKeys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API Keys"
          description="Create an API key to access your SEO data programmatically via the REST API."
          actionLabel="Create API Key"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="flex flex-col">
          {activeKeys.map((key, i) => (
            <div
              key={key.id}
              className={`flex items-start gap-4 py-4 ${
                i < activeKeys.length - 1 ? "border-b border-rule" : ""
              }`}
            >
              <Key size={16} className="mt-0.5 shrink-0 text-ink-muted" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-sm font-bold text-ink">{key.name}</span>
                  <code className="bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                    {key.key_prefix}...
                  </code>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {key.scopes.map((scope) => (
                    <Badge key={scope} variant="muted">
                      {scope}
                    </Badge>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-4 text-[10px] text-ink-muted">
                  <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                  {key.last_used_at && (
                    <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                  )}
                  {key.expires_at && (
                    <span>Expires {new Date(key.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-ink-muted hover:text-editorial-red"
                title="Revoke"
                onClick={() => handleRevoke(key.id)}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* API Usage Info */}
      <div className="border-t border-rule pt-4">
        <h4 className="font-serif text-sm font-bold text-ink">API Endpoint</h4>
        <code className="mt-2 block bg-surface-raised px-4 py-3 font-mono text-xs text-ink-secondary">
          {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/
        </code>
        <p className="mt-2 text-xs text-ink-muted">
          Include your API key in the Authorization header: <code className="font-mono">Bearer rp_xxx...</code>
        </p>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdKey ? "API Key Created" : "Create API Key"}</DialogTitle>
            <DialogDescription>
              {createdKey
                ? "Copy your API key now. It will not be shown again."
                : "Generate a new API key for programmatic access."}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="p-5">
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto bg-surface-raised px-4 py-3 font-mono text-xs text-ink">
                  {createdKey}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <p className="mt-3 text-xs text-editorial-red">
                Save this key securely — it cannot be retrieved after closing this dialog.
              </p>
              <DialogFooter className="mt-4 border-t-0 px-0 pb-0">
                <Button variant="primary" size="md" onClick={closeDialog}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-5">
              {error && (
                <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
                  {error}
                </div>
              )}
              <Input
                label="Key Name"
                placeholder="Production API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Scopes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label
                      key={scope.id}
                      className="flex cursor-pointer items-center gap-2 border border-rule px-3 py-2 text-xs hover:bg-surface-raised"
                    >
                      <input
                        type="checkbox"
                        checked={newKeyScopes.includes(scope.id)}
                        onChange={() => toggleScope(scope.id)}
                        className="accent-editorial-red"
                      />
                      <Shield size={10} className="text-ink-muted" />
                      {scope.label}
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter className="border-t-0 px-0 pb-0">
                <Button variant="secondary" size="md" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreate}
                  loading={isPending}
                >
                  Create Key
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
