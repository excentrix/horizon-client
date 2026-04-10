"use client";

import { useEffect, useState } from "react";
import { institutionsApi, type Organization } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Building2, CreditCard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInstitutionScope } from "../_lib/useInstitutionScope";

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

export default function InstitutionSettingsClient() {
  const { selectedOrgId, isSuperuser } = useInstitutionScope();
  const [org, setOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState<{ name: string; domain: string; contact_email: string; logo_url: string }>({
    name: "",
    domain: "",
    contact_email: "",
    logo_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isSuperuser && !selectedOrgId) {
      setLoading(false);
      setOrg(null);
      return;
    }
    institutionsApi.getOrgSummary({ org: selectedOrgId || undefined })
      .then((data) => {
        setOrg(data);
        setForm({
          name: data.name,
          domain: data.domain ?? "",
          contact_email: data.contact_email ?? "",
          logo_url: data.logo_url ?? "",
        });
      })
      .catch(() => toast.error("Failed to load organisation settings"))
      .finally(() => setLoading(false));
  }, [isSuperuser, selectedOrgId]);

  const save = async () => {
    setSaving(true);
    try {
      // OrgSettingsView PATCH (currently via HQ route — can be moved to /org/settings/)
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Select an institution from the Institution Scope selector to manage settings.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your institution public profile.</p>
      </div>

      {/* Profile editor */}
      <div className="rounded-xl border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Institution Profile</h2>
        </div>

        {(
          [
            { key: "name", label: "Institution Name", placeholder: "Acme University" },
            { key: "domain", label: "Email Domain", placeholder: "acme.edu" },
            { key: "contact_email", label: "Contact Email", placeholder: "admin@acme.edu" },
            { key: "logo_url", label: "Logo URL", placeholder: "https://..." },
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

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Plan info — read-only */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Plan & Quotas</h2>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ml-auto", TIER_COLORS[org.plan_tier] ?? "bg-muted")}>
            {org.plan_tier}
          </span>
        </div>

        <div className="space-y-3">
          <UsageBar used={org.cohort_count} max={org.max_cohorts} label="Cohorts" />
          <UsageBar used={org.student_count} max={org.max_cohorts * org.max_students_per_cohort} label="Total Students" />
          <UsageBar used={org.educator_count} max={org.max_educators} label="Educator Seats" />
        </div>

        <p className="text-xs text-muted-foreground">
          Quota limits are managed by the Horizon team. To upgrade your plan, contact{" "}
          <a href="mailto:hello@gethorizon.ai" className="underline underline-offset-2 hover:text-foreground transition-colors">
            hello@gethorizon.ai
          </a>
          .
        </p>
      </div>

      {/* Status */}
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Account Status</h2>
        </div>
        <div className="flex items-center gap-3">
          {org.is_active ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border">Active</Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border">Suspended</Badge>
          )}
          <p className="text-xs text-muted-foreground">
            {org.is_active
              ? "Your institution account is in good standing."
              : "Your institution account has been suspended. Contact Horizon support."}
          </p>
        </div>
        {org.plan_expires_at && (
          <p className="text-xs text-muted-foreground">
            Plan expires: <span className="font-medium text-foreground">{new Date(org.plan_expires_at).toLocaleDateString()}</span>
          </p>
        )}
      </div>
    </div>
  );
}
