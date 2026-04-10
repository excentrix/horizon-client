"use client";

import { useCallback, useEffect, useState } from "react";
import { institutionsApi, type OrgUser } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Loader2,
  MoreVertical,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInstitutionScope } from "../_lib/useInstitutionScope";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  educator: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  student: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "educator" | "admin">("student");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setSaving(true);
    try {
      toast.info("Use the Invites tab CSV to bulk-add students, or contact the admin to add by email.");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add Member</DialogTitle>
      </DialogHeader>
      <div className="py-2 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Email Address</label>
          <Input className="mt-1" type="email" placeholder="user@institution.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Role</label>
          <div className="flex gap-2 mt-1">
            {(["student", "educator", "admin"] as const).map((r) => (
              <Button key={r} size="sm" variant={role === r ? "default" : "outline"} onClick={() => setRole(r)} className="capitalize">{r}</Button>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving || !email}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function InstitutionMembersClient() {
  const { selectedOrgId, isSuperuser } = useInstitutionScope();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    if (isSuperuser && !selectedOrgId) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await institutionsApi.listOrgUsers({ role: roleFilter || undefined, org: selectedOrgId || undefined });
      setUsers(data);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [isSuperuser, roleFilter, selectedOrgId]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
  );

  const updateUser = async (userId: string, payload: { role?: string; is_active?: boolean }) => {
    setActionLoading(userId);
    try {
      await institutionsApi.updateOrgUser(userId, { ...payload, org: selectedOrgId || undefined });
      toast.success("Member updated");
      load();
    } catch {
      toast.error("Failed to update member");
    } finally {
      setActionLoading(null);
    }
  };

  const sendPasswordReset = async (userId: string) => {
    setActionLoading(userId);
    try {
      await institutionsApi.resetOrgUserPassword(userId, { org: selectedOrgId || undefined });
      toast.success("Password reset email sent");
    } catch {
      toast.error("Failed to send password reset");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {isSuperuser && !selectedOrgId ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Select an institution from the Institution Scope selector to manage members.
        </div>
      ) : null}
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage roles, access, and cohort assignments.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} disabled={isSuperuser && !selectedOrgId}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Member
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {["", "student", "educator", "admin"].map((r) => (
            <Button key={r} size="sm" variant={roleFilter === r ? "default" : "ghost"} onClick={() => setRoleFilter(r)} className="capitalize">
              {r || "All"}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} member{filtered.length !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Member</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Cohorts</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Last Active</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={cn("border-t transition-colors", i % 2 === 0 ? "bg-card" : "bg-muted/10", !u.is_active && "opacity-50")}>
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[200px]">{u.name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", ROLE_COLORS[u.role] ?? "bg-muted")}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {u.cohorts?.length > 0 ? u.cohorts.map((c) => c.name).join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                    {u.last_activity ? new Date(u.last_activity).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === u.id}>
                          {actionLoading === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.role !== "educator" && (
                          <DropdownMenuItem onClick={() => updateUser(u.id, { role: "educator" })}>
                            <Shield className="h-4 w-4 mr-2" /> Promote to Educator
                          </DropdownMenuItem>
                        )}
                        {u.role !== "student" && (
                          <DropdownMenuItem onClick={() => updateUser(u.id, { role: "student" })}>
                            <UserMinus className="h-4 w-4 mr-2" /> Demote to Student
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => updateUser(u.id, { is_active: !u.is_active })}>
                          {u.is_active ? <><XCircle className="h-4 w-4 mr-2 text-red-400" /> Deactivate</> : <><CheckCircle className="h-4 w-4 mr-2 text-green-400" /> Reactivate</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sendPasswordReset(u.id)}>
                          <Shield className="h-4 w-4 mr-2" /> Send Password Reset
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No members found.</div>
          )}
        </div>
      )}

      <Dialog open={showAdd && !(isSuperuser && !selectedOrgId)} onOpenChange={setShowAdd}>
        {showAdd && <AddMemberDialog onClose={() => setShowAdd(false)} />}
      </Dialog>
    </div>
  );
}
