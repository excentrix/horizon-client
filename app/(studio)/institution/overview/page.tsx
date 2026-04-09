"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  hqApi,
  type Organization,
  type InviteAuditLog,
  type SupportTicket,
  type HQOrgPerformance,
  type HQRiskRetention,
  type HQEducatorEffectiveness,
} from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  Activity,
  Users,
  Zap,
  Building2,
  Loader2,
  Search,
  Plus,
  Ticket,
  FileText,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useInstitutionCohort } from "../_lib/useInstitutionCohort";
import { useInstitutionScope } from "../_lib/useInstitutionScope";

const RISK_COLORS: Record<"low" | "medium" | "high", string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  growth: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-400" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={pct >= 90 ? "text-red-400 font-medium" : ""}>{used}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type ProvisionOrgForm = {
  name: string;
  slug: string;
  domain: string;
  contact_email: string;
  plan_tier: "free" | "starter" | "growth" | "enterprise";
  max_cohorts: number;
  max_students_per_cohort: number;
  max_educators: number;
};

function OrgDetailDrawer({
  org,
  onClose,
  onUpdate,
}: {
  org: Organization;
  onClose: () => void;
  onUpdate: (updated: Organization) => void;
}) {
  const [form, setForm] = useState({
    plan_tier: org.plan_tier,
    max_cohorts: org.max_cohorts,
    max_students_per_cohort: org.max_students_per_cohort,
    max_educators: org.max_educators,
    contact_email: org.contact_email,
    notes: org.notes,
    is_active: org.is_active,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await hqApi.updateOrganization(org.id, form);
      onUpdate(updated);
      toast.success("Institution updated");
      onClose();
    } catch {
      toast.error("Failed to update institution");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> {org.name}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm font-medium">Account Status</span>
          <Button
            variant={form.is_active ? "default" : "destructive"}
            size="sm"
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
          >
            {form.is_active ? "Active" : "Suspended"}
          </Button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Plan Tier</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {(["free", "starter", "growth", "enterprise"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={form.plan_tier === t ? "default" : "outline"}
                onClick={() => setForm((f) => ({ ...f, plan_tier: t }))}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Quotas</label>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Max Cohorts</p>
              <Input
                type="number"
                min={1}
                value={form.max_cohorts}
                onChange={(e) => setForm((f) => ({ ...f, max_cohorts: Number(e.target.value) }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Students/Cohort</p>
              <Input
                type="number"
                min={1}
                value={form.max_students_per_cohort}
                onChange={(e) => setForm((f) => ({ ...f, max_students_per_cohort: Number(e.target.value) }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Max Educators</p>
              <Input
                type="number"
                min={1}
                value={form.max_educators}
                onChange={(e) => setForm((f) => ({ ...f, max_educators: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Usage</p>
          <UsageBar used={org.cohort_count} max={form.max_cohorts} label="Cohorts" />
          <UsageBar used={org.student_count} max={form.max_cohorts * form.max_students_per_cohort} label="Total Students" />
          <UsageBar used={org.educator_count} max={form.max_educators} label="Educators" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Contact Email</label>
          <Input
            className="mt-1"
            value={form.contact_email}
            onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Internal Notes</label>
          <textarea
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ProvisionOrgDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<ProvisionOrgForm>({
    name: "",
    slug: "",
    domain: "",
    contact_email: "",
    plan_tier: "starter",
    max_cohorts: 5,
    max_students_per_cohort: 50,
    max_educators: 3,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name || !form.slug) return toast.error("Name and slug are required");
    setSaving(true);
    try {
      await hqApi.createOrganization(form);
      toast.success(`${form.name} provisioned`);
      onCreated();
      onClose();
    } catch {
      toast.error("Failed to provision institution");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Provision Institution</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        {(
          [
            { key: "name", label: "Institution Name", placeholder: "Acme University" },
            { key: "slug", label: "Slug (URL key)", placeholder: "acme-univ" },
            { key: "domain", label: "Email Domain", placeholder: "acme.edu" },
            { key: "contact_email", label: "Contact Email", placeholder: "admin@acme.edu" },
          ] as const
        ).map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-muted-foreground">{label}</label>
            <Input
              className="mt-1"
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div>
          <label className="text-xs text-muted-foreground">Plan Tier</label>
          <div className="flex gap-2 mt-1 flex-wrap">
            {(["free", "starter", "growth", "enterprise"] as const).map((t) => (
              <Button key={t} size="sm" variant={form.plan_tier === t ? "default" : "outline"} onClick={() => setForm((f) => ({ ...f, plan_tier: t }))} className="capitalize">{t}</Button>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Provision
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SuperuserInstitutionOverviewPage() {
  const { selectedOrgId, setSelectedOrgId } = useInstitutionScope();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showProvision, setShowProvision] = useState(false);

  const [workspaceOrg, setWorkspaceOrg] = useState<Organization | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [inviteLogs, setInviteLogs] = useState<InviteAuditLog[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [criticalOpenCount, setCriticalOpenCount] = useState(0);
  const [userTotals, setUserTotals] = useState({ total: 0, students: 0, educators: 0, inactive: 0 });

  const [orgPerformance, setOrgPerformance] = useState<HQOrgPerformance[] | null>(null);
  const [riskRetention, setRiskRetention] = useState<HQRiskRetention | null>(null);
  const [educatorEffectiveness, setEducatorEffectiveness] = useState<HQEducatorEffectiveness[] | null>(null);

  const loadOrgs = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await hqApi.listOrganizations({ search, tier: tierFilter || undefined, page, page_size: 25 });
      setOrgs(data.results);
      setTotal(data.count);
    } catch {
      toast.error("Failed to load institutions");
    } finally {
      setLoadingList(false);
    }
  }, [search, tierFilter, page]);

  const loadWorkspace = useCallback(async () => {
    if (!selectedOrgId) {
      setWorkspaceOrg(null);
      setInviteLogs([]);
      setRecentTickets([]);
      setOpenTicketCount(0);
      setCriticalOpenCount(0);
      setUserTotals({ total: 0, students: 0, educators: 0, inactive: 0 });
      return;
    }

    setWorkspaceLoading(true);
    try {
      const [
        org,
        inviteData,
        recentData,
        openData,
        criticalData,
        allUsers,
        students,
        educators,
        inactive,
      ] = await Promise.all([
        hqApi.getOrganization(selectedOrgId),
        hqApi.getInviteAuditLog({ org: selectedOrgId, page: 1, page_size: 6 }),
        hqApi.getSupportTickets({ org: selectedOrgId, page: 1, page_size: 6 }),
        hqApi.getSupportTickets({ org: selectedOrgId, status: "open", page: 1, page_size: 1 }),
        hqApi.getSupportTickets({ org: selectedOrgId, status: "open", priority: "critical", page: 1, page_size: 1 }),
        hqApi.listUsers({ org: selectedOrgId, page: 1, page_size: 1 }),
        hqApi.listUsers({ org: selectedOrgId, user_type: "student", page: 1, page_size: 1 }),
        hqApi.listUsers({ org: selectedOrgId, user_type: "educator", page: 1, page_size: 1 }),
        hqApi.listUsers({ org: selectedOrgId, is_active: "false", page: 1, page_size: 1 }),
      ]);

      setWorkspaceOrg(org);
      setInviteLogs(inviteData.results);
      setRecentTickets(recentData.results);
      setOpenTicketCount(openData.count);
      setCriticalOpenCount(criticalData.count);
      setUserTotals({
        total: allUsers.count,
        students: students.count,
        educators: educators.count,
        inactive: inactive.count,
      });
    } catch {
      toast.error("Failed to load institution workspace");
    } finally {
      setWorkspaceLoading(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  useEffect(() => {
    hqApi.getOrgPerformance().then(setOrgPerformance).catch(() => {});
    hqApi.getRiskRetention().then(setRiskRetention).catch(() => {});
    hqApi.getEducatorEffectiveness().then(setEducatorEffectiveness).catch(() => {});
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const performance = (orgPerformance ?? []).find((item) => item.org_id === selectedOrgId) ?? null;
  const riskRow = (riskRetention?.top_declining_orgs ?? []).find((item) => item.org_id === selectedOrgId) ?? null;
  const orgEducators = (educatorEffectiveness ?? [])
    .filter((row) => row.org_id === selectedOrgId)
    .sort((a, b) => b.students - a.students)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {!selectedOrgId ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Pick an institution from the selector above</p>
          <p className="text-sm text-muted-foreground mt-1">Once selected, all controls and analytics are shown here.</p>
        </div>
      ) : workspaceLoading && !workspaceOrg ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : workspaceOrg ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold">{workspaceOrg.name}</h2>
                  <Badge className={cn("border capitalize", TIER_COLORS[workspaceOrg.plan_tier] ?? "")}>{workspaceOrg.plan_tier}</Badge>
                  <Badge variant={workspaceOrg.is_active ? "secondary" : "destructive"}>
                    {workspaceOrg.is_active ? "Active" : "Suspended"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{workspaceOrg.domain || "No domain"} · {workspaceOrg.contact_email || "No contact"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedOrg(workspaceOrg)}>Manage Institution</Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Users</p>
                  <p className="text-2xl font-semibold">{userTotals.total}</p>
                  <p className="text-xs text-muted-foreground">{userTotals.students} students</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Inactive Users</p>
                  <p className="text-2xl font-semibold">{userTotals.inactive}</p>
                  <p className="text-xs text-muted-foreground">{userTotals.educators} educators</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Open Tickets</p>
                  <p className="text-2xl font-semibold">{openTicketCount}</p>
                  <p className="text-xs text-muted-foreground">{criticalOpenCount} critical</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-semibold">{performance?.avg_progress ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">At risk {performance?.at_risk_ratio ?? 0}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">Capacity & Quota</p>
                <UsageBar used={workspaceOrg.cohort_count} max={workspaceOrg.max_cohorts} label="Cohorts" />
                <UsageBar used={workspaceOrg.student_count} max={workspaceOrg.max_cohorts * workspaceOrg.max_students_per_cohort} label="Students" />
                <UsageBar used={workspaceOrg.educator_count} max={workspaceOrg.max_educators} label="Educators" />
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">Risk & Momentum</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[11px] text-muted-foreground">At Risk</p>
                    <p className="font-semibold">{performance?.at_risk_ratio ?? 0}%</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[11px] text-muted-foreground">Inactive 7d</p>
                    <p className="font-semibold">{performance?.inactive_7d ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[11px] text-muted-foreground">Engagement Delta</p>
                    <p className={cn("font-semibold", (performance?.engagement_delta ?? 0) < 0 ? "text-red-400" : "text-emerald-400")}>{performance?.engagement_delta ?? 0}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {riskRow
                    ? `Flagged in declining list (engagement delta ${riskRow.engagement_delta}).`
                    : "No active decline alert from risk-retention stream."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Invite Audit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inviteLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invite activity yet.</p>
                ) : inviteLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border bg-muted/20 p-2">
                    <p className="text-sm font-medium truncate">{log.email}</p>
                    <p className="text-xs text-muted-foreground">{log.result} · {new Date(log.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Ticket className="h-4 w-4" /> Support Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentTickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No support tickets.</p>
                ) : recentTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border bg-muted/20 p-2">
                    <p className="text-sm font-medium truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">{ticket.status.replace("_", " ")} · {ticket.priority} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Educator Effectiveness</CardTitle>
            </CardHeader>
            <CardContent>
              {orgEducators.length === 0 ? (
                <p className="text-sm text-muted-foreground">No educator rows for this institution yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="text-left px-3 py-2">Educator</th>
                        <th className="text-left px-3 py-2">Students</th>
                        <th className="text-left px-3 py-2">Avg Progress</th>
                        <th className="text-left px-3 py-2">At Risk</th>
                        <th className="text-left px-3 py-2">Interventions (14d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgEducators.map((row) => (
                        <tr key={row.educator_id} className="border-t">
                          <td className="px-3 py-2">{row.educator_name}</td>
                          <td className="px-3 py-2">{row.students}</td>
                          <td className="px-3 py-2">{row.avg_progress}%</td>
                          <td className="px-3 py-2">{row.at_risk}</td>
                          <td className="px-3 py-2">{row.interventions_14d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Institution Registry</p>
            <p className="text-sm text-muted-foreground">Provision institutions, tune plan tiers, and manage quota caps.</p>
          </div>
          <Button size="sm" onClick={() => setShowProvision(true)}>
            <Plus className="h-4 w-4 mr-1" /> Provision
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search institutions..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex gap-1">
            {["", "free", "starter", "growth", "enterprise"].map((t) => (
              <Button key={t} size="sm" variant={tierFilter === t ? "default" : "ghost"} onClick={() => { setTierFilter(t); setPage(1); }} className="capitalize">{t || "All"}</Button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{total} institution{total !== 1 ? "s" : ""}</p>

        {loadingList ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {orgs.map((org) => (
              <div key={org.id} className="rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button className="font-semibold truncate hover:underline" onClick={() => setSelectedOrgId(org.id)}>{org.name}</button>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", TIER_COLORS[org.plan_tier] ?? "bg-muted")}>{org.plan_tier}</span>
                      {!org.is_active && <span className="rounded-full bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-medium">Suspended</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{org.domain || org.contact_email || org.slug}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedOrg(org)}>Manage</Button>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <UsageBar used={org.cohort_count} max={org.max_cohorts} label="Cohorts" />
                  <UsageBar used={org.student_count} max={org.max_cohorts * org.max_students_per_cohort} label="Students" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedOrg} onOpenChange={(open) => !open && setSelectedOrg(null)}>
        {selectedOrg && (
          <OrgDetailDrawer
            org={selectedOrg}
            onClose={() => setSelectedOrg(null)}
            onUpdate={(updated) => {
              setOrgs((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              if (workspaceOrg?.id === updated.id) setWorkspaceOrg(updated);
              setSelectedOrg(null);
            }}
          />
        )}
      </Dialog>

      <Dialog open={showProvision} onOpenChange={setShowProvision}>
        {showProvision && <ProvisionOrgDialog onClose={() => setShowProvision(false)} onCreated={loadOrgs} />}
      </Dialog>
    </div>
  );
}

function InstitutionCohortAnalyticsPage() {
  const { user } = useAuth();
  const { cohorts, selectedCohort, setSelectedCohort, dashboard, loading } = useInstitutionCohort();

  const studentCount = dashboard?.total_students ?? 0;

  const avgProgress = useMemo(() => {
    if (!dashboard || dashboard.total_students === 0) return 0;
    const total = dashboard.students.reduce((acc, s) => acc + s.plan_progress, 0);
    return Math.round(total / dashboard.total_students);
  }, [dashboard]);

  const atRiskCount = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.students.filter((s) => s.risk_flags.length > 0).length;
  }, [dashboard]);

  const inactiveOver7 = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.students.filter((s) => (s.days_inactive ?? 0) > 7).length;
  }, [dashboard]);

  const engagementDelta = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.students.reduce((acc, s) => acc + (s.engagement_last_7 - s.engagement_prev_7), 0);
  }, [dashboard]);

  const progressBuckets = useMemo(() => {
    if (!dashboard) return [] as { range: string; count: number }[];
    const buckets = [
      { range: "0-20%", count: 0 },
      { range: "21-40%", count: 0 },
      { range: "41-60%", count: 0 },
      { range: "61-80%", count: 0 },
      { range: "81-100%", count: 0 },
    ];
    dashboard.students.forEach((s) => {
      const p = s.plan_progress;
      if (p <= 20) buckets[0].count += 1;
      else if (p <= 40) buckets[1].count += 1;
      else if (p <= 60) buckets[2].count += 1;
      else if (p <= 80) buckets[3].count += 1;
      else buckets[4].count += 1;
    });
    return buckets;
  }, [dashboard]);

  const riskDistribution = useMemo(() => {
    if (!dashboard) return [] as { name: string; value: number; color: string }[];
    let noRisk = 0;
    let atRisk = 0;
    dashboard.students.forEach((student) => {
      if (student.risk_flags.length === 0) noRisk += 1;
      else atRisk += 1;
    });
    return [
      { name: "On Track", value: noRisk, color: "#10b981" },
      { name: "At Risk", value: atRisk, color: "#ef4444" },
    ];
  }, [dashboard]);

  const riskLevelMix = useMemo(() => {
    if (!dashboard) return [] as { level: string; count: number; fill: string }[];
    const counts = dashboard.students.reduce(
      (acc, student) => {
        acc[student.risk_level] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 } as Record<"low" | "medium" | "high", number>
    );
    return [
      { level: "Low", count: counts.low, fill: RISK_COLORS.low },
      { level: "Medium", count: counts.medium, fill: RISK_COLORS.medium },
      { level: "High", count: counts.high, fill: RISK_COLORS.high },
    ];
  }, [dashboard]);

  const inactivityBuckets = useMemo(() => {
    if (!dashboard) return [] as { range: string; count: number }[];
    const buckets = [
      { range: "0-2 days", count: 0 },
      { range: "3-7 days", count: 0 },
      { range: "8-14 days", count: 0 },
      { range: "15+ days", count: 0 },
    ];
    dashboard.students.forEach((s) => {
      const days = s.days_inactive ?? 0;
      if (days <= 2) buckets[0].count += 1;
      else if (days <= 7) buckets[1].count += 1;
      else if (days <= 14) buckets[2].count += 1;
      else buckets[3].count += 1;
    });
    return buckets;
  }, [dashboard]);

  const engagementTrendMix = useMemo(() => {
    if (!dashboard) return [] as { trend: string; count: number }[];
    const counts = { up: 0, down: 0, flat: 0 };
    dashboard.students.forEach((s) => {
      counts[s.engagement_trend] += 1;
    });
    return [
      { trend: "Up", count: counts.up },
      { trend: "Flat", count: counts.flat },
      { trend: "Down", count: counts.down },
    ];
  }, [dashboard]);

  const skillGapBars = useMemo(() => {
    if (!dashboard) return [] as { gap: string; count: number }[];
    const counter = new Map<string, number>();
    dashboard.students.forEach((student) => {
      if (!student.top_skill_gap) return;
      counter.set(student.top_skill_gap, (counter.get(student.top_skill_gap) || 0) + 1);
    });
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([gap, count]) => ({ gap, count }));
  }, [dashboard]);

  const scatterLow = useMemo(() => {
    if (!dashboard) return [] as { progress: number; engagement: number; name: string }[];
    return dashboard.students
      .filter((s) => s.risk_level === "low")
      .map((s) => ({ progress: s.plan_progress, engagement: s.engagement_last_7, name: s.name }));
  }, [dashboard]);

  const scatterMedium = useMemo(() => {
    if (!dashboard) return [] as { progress: number; engagement: number; name: string }[];
    return dashboard.students
      .filter((s) => s.risk_level === "medium")
      .map((s) => ({ progress: s.plan_progress, engagement: s.engagement_last_7, name: s.name }));
  }, [dashboard]);

  const scatterHigh = useMemo(() => {
    if (!dashboard) return [] as { progress: number; engagement: number; name: string }[];
    return dashboard.students
      .filter((s) => s.risk_level === "high")
      .map((s) => ({ progress: s.plan_progress, engagement: s.engagement_last_7, name: s.name }));
  }, [dashboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user?.user_type === "admin" ? "Institution Admin" : "Educator Intelligence"}
          </h1>
          <p className="text-muted-foreground mt-1">
            High fidelity cohort diagnostics, risk breakdowns, and engagement signals.
          </p>
        </div>
        <Select value={selectedCohort || ""} onValueChange={setSelectedCohort}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select a cohort" />
          </SelectTrigger>
          <SelectContent>
            {cohorts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading || !dashboard ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Enrollment</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentCount}</div>
                <p className="text-xs text-muted-foreground">Active students in cohort</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">At-Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{atRiskCount}</div>
                <p className="text-xs text-muted-foreground">Students with risk flags</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgProgress}%</div>
                <p className="text-xs text-muted-foreground">Plan completion average</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Engagement Delta</CardTitle>
                <Zap className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagementDelta >= 0 ? `+${engagementDelta}` : engagementDelta}</div>
                <p className="text-xs text-muted-foreground">7-day vs previous 7-day</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Progress Distribution</CardTitle>
                <CardDescription>Shows how many learners are clustered at each completion band.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressBuckets}>
                    <XAxis dataKey="range" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Overview</CardTitle>
                <CardDescription>Quick split between on-track and at-risk learners.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskDistribution} innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`risk-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Mix</CardTitle>
                <CardDescription>Breakdown by low, medium, and high risk.</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskLevelMix} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="level" type="category" width={60} />
                    <Tooltip />
                    <Bar dataKey="count">
                      {riskLevelMix.map((entry) => (
                        <Cell key={entry.level} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Inactivity Buckets</CardTitle>
                <CardDescription>Who needs a check-in based on last activity.</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inactivityBuckets}>
                    <XAxis dataKey="range" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trend Mix</CardTitle>
                <CardDescription>Is cohort momentum rising or fading?</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementTrendMix}>
                    <XAxis dataKey="trend" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement vs Progress</CardTitle>
                <CardDescription>Each dot is a student. High engagement + low progress needs curriculum review.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <XAxis type="number" dataKey="progress" unit="%" name="Progress" />
                    <YAxis type="number" dataKey="engagement" name="Engagement" />
                    <ZAxis range={[60, 60]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Legend />
                    <Scatter name="Low Risk" data={scatterLow} fill={RISK_COLORS.low} />
                    <Scatter name="Medium Risk" data={scatterMedium} fill={RISK_COLORS.medium} />
                    <Scatter name="High Risk" data={scatterHigh} fill={RISK_COLORS.high} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Skill Gaps</CardTitle>
                <CardDescription>Most frequent gaps that need targeted remediation.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                {skillGapBars.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No skill gap data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skillGapBars} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="gap" type="category" width={120} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Actionable Focus</CardTitle>
              <CardDescription>Immediate cohort priorities for next mentor cycle.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {inactiveOver7 > 0 && (
                <Badge variant="destructive">{inactiveOver7} students inactive for 7+ days</Badge>
              )}
              {atRiskCount > 0 && (
                <Badge variant="secondary">{atRiskCount} students flagged for intervention</Badge>
              )}
              <Badge variant="outline">Average completion {avgProgress}%</Badge>
              <Badge variant="outline">Cohort momentum {engagementDelta >= 0 ? "up" : "down"}</Badge>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function InstitutionOverviewPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Institution 360</h1>
        <p className="text-muted-foreground mt-1">
          Unified institution analytics, operations, governance controls, and provisioning.
        </p>
      </div>
      {user?.is_superuser ? <SuperuserInstitutionOverviewPage /> : <InstitutionCohortAnalyticsPage />}
    </div>
  );
}
