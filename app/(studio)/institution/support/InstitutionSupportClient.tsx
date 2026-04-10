"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { institutionsApi, OrgUser } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useInstitutionScope } from "../_lib/useInstitutionScope";

const ROLE_OPTIONS = ["admin", "educator", "student"] as const;

export default function InstitutionSupportClient() {
  const { user } = useAuth();
  const { selectedOrgId, isSuperuser } = useInstitutionScope();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    institutionsApi
      .listOrgUsers({ org: selectedOrgId || undefined })
      .then((data) => setUsers(data))
      .catch((err) => telemetry.error("Failed to load org users", { err }))
      .finally(() => setLoading(false));
  }, [selectedOrgId]);

  useEffect(() => {
    if ((user?.user_type !== "admin" && !user?.is_superuser) || (isSuperuser && !selectedOrgId)) return;
    refresh();
  }, [isSuperuser, refresh, selectedOrgId, user?.is_superuser, user?.user_type]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const updated = await institutionsApi.updateOrgUser(userId, { role, org: selectedOrgId || undefined });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
      telemetry.toastSuccess("Role updated");
    } catch (err) {
      telemetry.toastError("Role update failed");
      telemetry.error("Role update failed", { err });
    }
  };

  const handleActiveToggle = async (target: OrgUser) => {
    try {
      const updated = await institutionsApi.updateOrgUser(target.id, { is_active: !target.is_active, org: selectedOrgId || undefined });
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, is_active: updated.is_active } : u)));
      telemetry.toastSuccess("Account status updated");
    } catch (err) {
      telemetry.toastError("Account update failed");
      telemetry.error("Account update failed", { err });
    }
  };

  const handleReset = async (userId: string) => {
    try {
      await institutionsApi.resetOrgUserPassword(userId, { org: selectedOrgId || undefined });
      telemetry.toastSuccess("Password reset email sent");
    } catch (err) {
      telemetry.toastError("Password reset failed");
      telemetry.error("Password reset failed", { err });
    }
  };

  if (user?.user_type !== "admin" && !user?.is_superuser) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Account Support</CardTitle>
            <CardDescription>Only institution admins can access account support tools.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {isSuperuser && !selectedOrgId ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Select an institution from the Institution Scope selector to access support tools.
          </CardContent>
        </Card>
      ) : null}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Support</h1>
        <p className="text-muted-foreground mt-1">Manage roles, account status, and password resets.</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Organization Accounts</CardTitle>
              <CardDescription>Search users and perform support actions.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground animate-pulse">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Cohorts</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td>
                    </tr>
                  ) : (
                    filtered.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Select value={u.role} onValueChange={(value) => handleRoleChange(u.id, value)}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.is_active ? "outline" : "destructive"}>
                            {u.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.cohorts.length ? u.cohorts.map((c) => c.name).join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleReset(u.id)}>
                            Reset Password
                          </Button>
                          <Button size="sm" variant={u.is_active ? "secondary" : "outline"} onClick={() => handleActiveToggle(u)}>
                            {u.is_active ? "Disable" : "Enable"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
