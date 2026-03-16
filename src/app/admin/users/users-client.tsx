"use client";

import { useState } from "react";
import { Users, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  system_role: string | null;
  created_at: string;
  organizations: {
    name: string;
    plan: string;
  } | null;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function planBadgeVariant(plan: string) {
  switch (plan) {
    case "business":
      return "default" as const;
    case "pro":
      return "danger" as const;
    case "starter":
      return "info" as const;
    default:
      return "muted" as const;
  }
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "superadmin":
      return "danger" as const;
    case "admin":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AdminUsersClient({
  users,
  totalCount,
}: {
  users: UserRow[];
  totalCount: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((user) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.full_name ?? "").toLowerCase().includes(q) ||
      (user.email ?? "").toLowerCase().includes(q) ||
      (user.organizations?.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink">
          User Management
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          View, search, and manage all registered users across the platform.
        </p>
      </div>

      {/* ================================================================
          STATS
          ================================================================ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-start justify-between p-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Total Users
              </p>
              <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
                {totalCount.toLocaleString()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
              <Users size={18} strokeWidth={1.5} className="text-ink-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          SEARCH TOOLBAR
          ================================================================ */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search by name, email, or organization..."
            prefixIcon={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ================================================================
          USERS TABLE
          ================================================================ */}
      {users.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="No Users Yet"
            description="No users have registered on the platform yet. Users will appear here as they sign up."
          />
        </div>
      ) : (
        <>
          <Card className="mt-6">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center font-sans text-sm text-ink-muted"
                      >
                        No users match your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-sans font-medium text-ink">
                          {user.full_name ?? "Unknown"}
                        </TableCell>
                        <TableCell className="text-ink-secondary">
                          {user.email ?? "N/A"}
                        </TableCell>
                        <TableCell className="font-sans text-ink-secondary">
                          {user.organizations?.name ?? "No org"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={planBadgeVariant(
                              user.organizations?.plan ?? "free"
                            )}
                          >
                            {user.organizations?.plan ?? "free"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-sans text-ink-secondary">
                          {user.role ?? "member"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={roleBadgeVariant(
                              user.system_role ?? "user"
                            )}
                          >
                            {user.system_role ?? "user"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-ink-muted">
                          {formatDate(user.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Result count */}
          <p className="mt-3 text-xs text-ink-muted">
            Showing {filteredUsers.length} of {totalCount} users
          </p>
        </>
      )}
    </div>
  );
}
