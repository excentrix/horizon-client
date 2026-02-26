"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  hqApi,
  type HQPlatformStats,
  type HQOrgPerformance,
  type HQRiskRetention,
  type HQEducatorEffectiveness,
  type Organization,
  type GlobalUser,
  type SupportTicket,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Globe,
  LayoutDashboard,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Users,
  XCircle,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════

const TIER_COLORS: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  growth: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};
const TIER_PIE_COLORS = ["#71717a", "#3b82f6", "#a855f7", "#f59e0b"];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-500/20 text-zinc-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  resolved: "bg-green-500/20 text-green-400",
  closed: "bg-zinc-500/20 text-zinc-400",
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

function StatCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
      <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accent ?? "bg-primary/10")}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════

function OverviewTab({
  stats,
  orgPerformance,
  riskRetention,
  educatorEffectiveness,
}: {
  stats: HQPlatformStats | null;
  orgPerformance: HQOrgPerformance[] | null;
  riskRetention: HQRiskRetention | null;
  educatorEffectiveness: HQEducatorEffectiveness[] | null;
}) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tierData = Object.entries(stats.organizations.by_tier).map(([tier, count]) => ({
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    value: count,
  }));

  const userBreakdown = [
    { name: "Students", count: stats.users.students },
    { name: "Educators", count: stats.users.educators },
    { name: "Others", count: stats.users.total - stats.users.students - stats.users.educators },
  ];

  const topOrgPerformance = (orgPerformance ?? []).slice(0, 8);
  const riskMixData = riskRetention
    ? [
        { name: "Low", value: riskRetention.risk_mix.low, color: "#22c55e" },
        { name: "Medium", value: riskRetention.risk_mix.medium, color: "#f59e0b" },
        { name: "High", value: riskRetention.risk_mix.high, color: "#ef4444" },
      ]
    : [];

  const exportOrgPerformance = () => {
    if (!orgPerformance) return;
    const lines = [
      ["org_name", "plan_tier", "total_students", "avg_progress", "at_risk_ratio", "engagement_delta", "inactive_7d"],
      ...orgPerformance.map((org) => [
        org.org_name,
        org.plan_tier,
        String(org.total_students),
        String(org.avg_progress),
        String(org.at_risk_ratio),
        String(org.engagement_delta),
        String(org.inactive_7d),
      ]),
    ];
    const csv = lines.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hq_org_performance.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportEducatorEffectiveness = () => {
    if (!educatorEffectiveness) return;
    const lines = [
      ["educator", "organization", "students", "avg_progress", "at_risk", "interventions_14d"],
      ...educatorEffectiveness.map((row) => [
        row.educator_name,
        row.org_name,
        String(row.students),
        String(row.avg_progress),
        String(row.at_risk),
        String(row.interventions_14d),
      ]),
    ];
    const csv = lines.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hq_educator_effectiveness.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.users.total.toLocaleString()} sub={`+${stats.users.new_last_7_days} this week`} accent="bg-blue-500/10" />
        <StatCard icon={Building2} label="Active Institutions" value={stats.organizations.active} sub={`of ${stats.organizations.total} total`} accent="bg-purple-500/10" />
        <StatCard icon={Ticket} label="Open Support Tickets" value={stats.tickets.open} sub={stats.tickets.critical > 0 ? `${stats.tickets.critical} critical` : "All good"} accent={stats.tickets.critical > 0 ? "bg-red-500/10" : "bg-green-500/10"} />
        <StatCard icon={TrendingUp} label="Active Plans" value={stats.plans.active.toLocaleString()} sub={`${stats.plans.completed} completed`} accent="bg-emerald-500/10" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User breakdown bar */}
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4" /> User Breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={userBreakdown} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [v, "Users"]} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tier pie */}
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4" /> Institutions by Plan Tier</p>
          {tierData.length === 0 ? (
            <div className="flex h-[180px] items-center justify-center text-muted-foreground text-sm">No institutions yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {tierData.map((_, i) => (
                    <Cell key={i} fill={TIER_PIE_COLORS[i % TIER_PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick health */}
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4" /> Platform Health</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Active Users</p>
            <p className="text-lg font-bold text-emerald-400">{Math.round((stats.users.active / Math.max(stats.users.total, 1)) * 100)}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Active Orgs</p>
            <p className="text-lg font-bold text-emerald-400">{Math.round((stats.organizations.active / Math.max(stats.organizations.total, 1)) * 100)}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Tickets Resolved</p>
            <p className="text-lg font-bold text-emerald-400">{Math.round(((stats.tickets.total - stats.tickets.open) / Math.max(stats.tickets.total, 1)) * 100)}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Critical Open</p>
            <p className={cn("text-lg font-bold", stats.tickets.critical > 0 ? "text-red-400" : "text-emerald-400")}>
              {stats.tickets.critical}
            </p>
          </div>
        </div>
      </div>

      {/* Institution Performance */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Institution Performance</p>
          <Button size="sm" variant="outline" onClick={exportOrgPerformance} disabled={!orgPerformance || orgPerformance.length === 0}>
            Export CSV
          </Button>
        </div>
        {orgPerformance && orgPerformance.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-2">Average Progress by Institution</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topOrgPerformance} margin={{ left: -20 }}>
                  <XAxis dataKey="org_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="avg_progress" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-2">At-Risk Ratio (%) by Institution</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topOrgPerformance} margin={{ left: -20 }}>
                  <XAxis dataKey="org_name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="at_risk_ratio" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No institution performance data available.</div>
        )}
      </div>

      {/* Risk & Retention */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <p className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Risk & Retention</p>
        {riskRetention ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-2">Risk Mix</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={riskMixData} dataKey="value" nameKey="name" outerRadius={70}>
                    {riskMixData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-2">Inactivity Buckets</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskRetention.inactivity_buckets}>
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={45} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground mb-2">Top Declining Institutions</p>
              <div className="space-y-2 text-sm">
                {riskRetention.top_declining_orgs.length === 0 ? (
                  <div className="text-muted-foreground">No declines detected.</div>
                ) : (
                  riskRetention.top_declining_orgs.map((org) => (
                    <div key={org.org_id} className="flex items-center justify-between">
                      <span>{org.org_name}</span>
                      <span className="text-xs text-muted-foreground">{org.engagement_delta}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Risk retention data is loading.</div>
        )}
      </div>

      {/* Educator Effectiveness */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Educator Effectiveness</p>
          <Button size="sm" variant="outline" onClick={exportEducatorEffectiveness} disabled={!educatorEffectiveness || educatorEffectiveness.length === 0}>
            Export CSV
          </Button>
        </div>
        {educatorEffectiveness && educatorEffectiveness.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Educator</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Organization</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Students</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Avg Progress</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">At Risk</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Interventions (14d)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {educatorEffectiveness.slice(0, 10).map((row) => (
                  <tr key={row.educator_id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{row.educator_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{row.org_name}</td>
                    <td className="px-4 py-2">{row.students}</td>
                    <td className="px-4 py-2">{row.avg_progress}%</td>
                    <td className="px-4 py-2">{row.at_risk}</td>
                    <td className="px-4 py-2">{row.interventions_14d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No educator effectiveness data available.</div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// INSTITUTIONS TAB
// ══════════════════════════════════════════════════════════════════

function OrgDetailDrawer({
  org, onClose, onUpdate,
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
        {/* Status */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <span className="text-sm font-medium">Account Status</span>
          <Button
            variant={form.is_active ? "default" : "destructive"}
            size="sm"
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
          >
            {form.is_active ? <><ToggleRight className="h-4 w-4 mr-1" /> Active</> : <><ToggleLeft className="h-4 w-4 mr-1" /> Suspended</>}
          </Button>
        </div>

        {/* Plan tier */}
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

        {/* Quotas */}
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

        {/* Usage */}
        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Usage</p>
          <UsageBar used={org.cohort_count} max={form.max_cohorts} label="Cohorts" />
          <UsageBar used={org.student_count} max={form.max_cohorts * form.max_students_per_cohort} label="Total Students" />
          <UsageBar used={org.educator_count} max={form.max_educators} label="Educators" />
        </div>

        {/* Contact + notes */}
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to provision institution";
      toast.error(message);
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
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["max_cohorts", "Max Cohorts"],
              ["max_students_per_cohort", "Students/Cohort"],
              ["max_educators", "Max Educators"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <Input
                type="number"
                min={1}
                className="mt-1"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
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

function InstitutionsTab() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showProvision, setShowProvision] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hqApi.listOrganizations({ search, tier: tierFilter || undefined, page });
      setOrgs(data.results);
      setTotal(data.count);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [search, tierFilter, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search institutions..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-1">
          {["", "free", "starter", "growth", "enterprise"].map((t) => (
            <Button key={t} size="sm" variant={tierFilter === t ? "default" : "ghost"} onClick={() => { setTierFilter(t); setPage(1); }} className="capitalize">{t || "All"}</Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowProvision(true)}>
          <Plus className="h-4 w-4 mr-1" /> Provision
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{total} institution{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : orgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Building2 className="h-10 w-10 opacity-30" />
          <p>No institutions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedOrg(org)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{org.name}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", TIER_COLORS[org.plan_tier] ?? "bg-muted")}>{org.plan_tier}</span>
                    {!org.is_active && <span className="rounded-full bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-medium">Suspended</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{org.domain || org.contact_email || org.slug}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span className="hidden sm:block">{org.cohort_count}/{org.max_cohorts} cohorts</span>
                  <span className="hidden md:block">{org.student_count} students</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <UsageBar used={org.cohort_count} max={org.max_cohorts} label="Cohorts" />
                <UsageBar used={org.student_count} max={org.max_cohorts * org.max_students_per_cohort} label="Students" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 25 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">Page {page} of {Math.ceil(total / 25)}</span>
          <Button variant="ghost" size="sm" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {/* Org detail dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={(o) => !o && setSelectedOrg(null)}>
        {selectedOrg && (
          <OrgDetailDrawer
            org={selectedOrg}
            onClose={() => setSelectedOrg(null)}
            onUpdate={(updated) => {
              setOrgs((prev) => prev.map((o) => o.id === updated.id ? updated : o));
              setSelectedOrg(null);
            }}
          />
        )}
      </Dialog>

      {/* Provision dialog */}
      <Dialog open={showProvision} onOpenChange={setShowProvision}>
        {showProvision && <ProvisionOrgDialog onClose={() => setShowProvision(false)} onCreated={load} />}
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════════════

function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hqApi.listUsers({ search, user_type: typeFilter || undefined, is_active: activeFilter || undefined, page });
      setUsers(data.results);
      setTotal(data.count);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [search, typeFilter, activeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u: GlobalUser) => {
    setActionLoading(u.id);
    try {
      const updated = await hqApi.updateUser(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      toast.success(updated.is_active ? "User reactivated" : "User deactivated");
    } catch {
      toast.error("Failed to update user");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStaff = async (u: GlobalUser) => {
    setActionLoading(u.id);
    try {
      const updated = await hqApi.updateUser(u.id, { is_staff: !u.is_staff });
      setUsers((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      toast.success(`Staff access ${updated.is_staff ? "granted" : "revoked"}`);
    } catch {
      toast.error("Failed to update user");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by email, name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-1">
          {["", "student", "educator", "admin"].map((t) => (
            <Button key={t} size="sm" variant={typeFilter === t ? "default" : "ghost"} onClick={() => { setTypeFilter(t); setPage(1); }} className="capitalize">{t || "All"}</Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={activeFilter === "" ? "default" : "ghost"} onClick={() => { setActiveFilter(""); setPage(1); }}>All</Button>
          <Button size="sm" variant={activeFilter === "true" ? "default" : "ghost"} onClick={() => { setActiveFilter("true"); setPage(1); }}>Active</Button>
          <Button size="sm" variant={activeFilter === "false" ? "default" : "ghost"} onClick={() => { setActiveFilter("false"); setPage(1); }}>Inactive</Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{total} user{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3">Flags</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className={cn("border-t transition-colors", i % 2 === 0 ? "bg-card" : "bg-muted/10", !u.is_active && "opacity-50")}>
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[180px]">{u.full_name || u.username || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell capitalize text-muted-foreground">{u.user_type}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.is_superuser && <Badge variant="destructive" className="text-[10px] py-0">Superuser</Badge>}
                        {u.is_staff && !u.is_superuser && <Badge variant="secondary" className="text-[10px] py-0">Staff</Badge>}
                        {!u.is_active && <Badge variant="outline" className="text-[10px] py-0 border-red-500/50 text-red-400">Inactive</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">You</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === u.id}>
                              {actionLoading === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleActive(u)}>
                              {u.is_active ? <XCircle className="h-4 w-4 mr-2 text-red-400" /> : <CheckCircle className="h-4 w-4 mr-2 text-green-400" />}
                              {u.is_active ? "Deactivate" : "Reactivate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStaff(u)}>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              {u.is_staff ? "Revoke Staff" : "Grant Staff"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No users found.</div>
          )}
        </div>
      )}

      {total > 25 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">Page {page} of {Math.ceil(total / 25)}</span>
          <Button variant="ghost" size="sm" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUPPORT QUEUE TAB
// ══════════════════════════════════════════════════════════════════

function SupportQueueTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hqApi.getSupportTickets({ status: statusFilter || undefined, priority: priorityFilter || undefined, page });
      setTickets(data.results);
      setTotal(data.count);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [statusFilter, priorityFilter, page]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updated = await hqApi.updateTicket(ticketId, { status: newStatus as SupportTicket["status"] });
      setTickets((prev) => prev.map((t) => t.id === ticketId ? updated : t));
      toast.success("Ticket updated");
    } catch {
      toast.error("Failed to update ticket");
    }
  };

  const resolveTicket = async (ticketId: string) => {
    setResolving(ticketId);
    try {
      const updated = await hqApi.resolveTicket(ticketId, "Resolved by HQ team.");
      setTickets((prev) => prev.map((t) => t.id === ticketId ? updated : t));
      toast.success("Ticket resolved");
    } catch {
      toast.error("Failed to resolve ticket");
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {["", "open", "in_progress", "resolved", "closed"].map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "ghost"} onClick={() => { setStatusFilter(s); setPage(1); }} className="capitalize">
              {s ? s.replace("_", " ") : "All"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {["", "critical", "high", "medium", "low"].map((p) => (
            <Button key={p} size="sm" variant={priorityFilter === p ? "secondary" : "ghost"} onClick={() => { setPriorityFilter(p); setPage(1); }} className="capitalize">
              {p || "Any priority"}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{total} ticket{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <CheckCircle className="h-10 w-10 opacity-30" />
          <p>No tickets match current filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const expanded = expandedId === ticket.id;
            return (
              <div key={ticket.id} className="rounded-xl border bg-card overflow-hidden">
                <div
                  className="p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedId(expanded ? null : ticket.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", PRIORITY_COLORS[ticket.priority])}>
                        {ticket.priority}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", STATUS_COLORS[ticket.status])}>
                        {ticket.status.replace("_", " ")}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{ticket.ticket_type}</Badge>
                    </div>
                    <p className="font-medium truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ticket.user_email} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ticket.status === "open" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); resolveTicket(ticket.id); }}
                        disabled={resolving === ticket.id}
                      >
                        {resolving === ticket.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                        Resolve
                      </Button>
                    )}
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
                    <p className="text-sm">{ticket.description}</p>
                    {ticket.resolution_notes && (
                      <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-400">
                        <span className="font-medium">Resolution: </span>{ticket.resolution_notes}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {["open", "in_progress", "resolved", "closed"].map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={ticket.status === s ? "default" : "ghost"}
                          className="capitalize text-xs"
                          onClick={() => updateStatus(ticket.id, s)}
                        >
                          {s.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 25 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">Page {page} of {Math.ceil(total / 25)}</span>
          <Button variant="ghost" size="sm" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROOT PAGE
// ══════════════════════════════════════════════════════════════════

type Tab = "overview" | "institutions" | "users" | "support";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "institutions", label: "Institutions", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "support", label: "Support Queue", icon: Ticket },
];

export default function MasterHQPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<HQPlatformStats | null>(null);
  const [orgPerformance, setOrgPerformance] = useState<HQOrgPerformance[] | null>(null);
  const [riskRetention, setRiskRetention] = useState<HQRiskRetention | null>(null);
  const [educatorEffectiveness, setEducatorEffectiveness] = useState<HQEducatorEffectiveness[] | null>(null);

  useEffect(() => {
    if (user && !user.is_superuser) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    hqApi.getPlatformStats().then(setStats).catch(() => {});
    hqApi.getOrgPerformance().then(setOrgPerformance).catch(() => {});
    hqApi.getRiskRetention().then(setRiskRetention).catch(() => {});
    hqApi.getEducatorEffectiveness().then(setEducatorEffectiveness).catch(() => {});
  }, []);

  if (!user?.is_superuser) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-3">
        <Lock className="h-6 w-6" /> Access restricted to Horizon superusers.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Master HQ</h1>
              <p className="text-sm text-muted-foreground">Global platform administration</p>
            </div>
          </div>
        </div>
        {stats && (
          <div className="flex gap-3 flex-wrap">
            {stats.tickets.critical > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {stats.tickets.critical} critical ticket{stats.tickets.critical !== 1 ? "s" : ""}
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              {stats.users.total.toLocaleString()} total users
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
            {/* Notification badge */}
            {id === "support" && stats && stats.tickets.open > 0 && (
              <span className="rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] leading-none">
                {stats.tickets.open}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <OverviewTab
            stats={stats}
            orgPerformance={orgPerformance}
            riskRetention={riskRetention}
            educatorEffectiveness={educatorEffectiveness}
          />
        )}
        {activeTab === "institutions" && <InstitutionsTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "support" && <SupportQueueTab />}
      </div>
    </div>
  );
}
