"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { http } from "@/lib/http-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Lock, Bell, FileText, ChevronRight, Save, Loader2,
  Building2, GraduationCap, Globe, Github, Linkedin,
} from "lucide-react";

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Lock },
  { id: "resume",  label: "Resume & Career", icon: FileText },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ─── Profile tab ─────────────────────────────────────────────────────────────
function ProfileTab() {
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    http.get("/auth/profile/").then((r) => setProfile(r.data)).catch(() =>
      toast.error("Failed to load profile")
    );
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await http.patch("/auth/profile/", {
        first_name: profile.first_name,
        last_name: profile.last_name,
        full_name: profile.full_name,
        university: profile.university,
        major: profile.major,
        year: profile.year,
        graduation_year: profile.graduation_year,
        career_goals: profile.career_goals,
        phone_number: profile.phone_number,
      });
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <SkeletonCard lines={6} />;

  const initials = ((profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "")).toUpperCase() || profile.username?.[0]?.toUpperCase() || "?";

  return (
    <div className="space-y-6">
      {/* Avatar row */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Your avatar shown across Horizon</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="h-20 w-20 text-xl">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="font-medium">{profile.full_name || `${profile.first_name} ${profile.last_name}`.trim() || profile.username}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <Badge variant="outline" className="text-xs">{profile.user_type ?? "student"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name">
            <Input value={profile.first_name ?? ""} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
          </Field>
          <Field label="Last Name">
            <Input value={profile.last_name ?? ""} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <Input value={profile.email ?? ""} disabled className="opacity-60 cursor-not-allowed" />
            <p className="text-xs text-muted-foreground mt-1">Email is managed by your auth provider</p>
          </Field>
          <Field label="Phone Number" className="sm:col-span-2">
            <Input value={profile.phone_number ?? ""} onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })} placeholder="+91 98765 43210" />
          </Field>
        </CardContent>
      </Card>

      {/* Academic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Academic Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="University" className="sm:col-span-2">
            <Input
              value={profile.university ?? ""}
              onChange={(e) => setProfile({ ...profile, university: e.target.value })}
              placeholder="MIT, IIT Bombay…"
            />
          </Field>
          <Field label="Major / Branch">
            <Input value={profile.major ?? ""} onChange={(e) => setProfile({ ...profile, major: e.target.value })} placeholder="Computer Science" />
          </Field>
          <Field label="Year">
            <Select value={profile.year ?? ""} onValueChange={(v) => setProfile({ ...profile, year: v })}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {["freshman","sophomore","junior","senior","graduate","other"].map((y) => (
                  <SelectItem key={y} value={y}>{y.charAt(0).toUpperCase() + y.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Graduation Year">
            <Input type="number" value={profile.graduation_year ?? ""} onChange={(e) => setProfile({ ...profile, graduation_year: parseInt(e.target.value) || null })} placeholder="2026" />
          </Field>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader><CardTitle>Career Goals</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={profile.career_goals ?? ""}
            onChange={(e) => setProfile({ ...profile, career_goals: e.target.value })}
            placeholder="Describe your career aspirations, what you want to achieve, and the type of roles you're targeting…"
          />
        </CardContent>
      </Card>

      <SaveBar onSave={save} saving={saving} />
    </div>
  );
}

// ─── Account / password tab ──────────────────────────────────────────────────
function AccountTab() {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    if (form.new_password !== form.confirm_password) {
      toast.error("New passwords don't match");
      return;
    }
    if (form.new_password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await http.post("/auth/password/change/", form);
      toast.success("Password changed successfully");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Use a strong password with a mix of letters, numbers, and symbols</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <Field label="Current Password">
            <Input type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
          </Field>
          <Separator />
          <Field label="New Password">
            <Input type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
          </Field>
          <Field label="Confirm New Password">
            <Input type="password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} />
          </Field>
          <Button onClick={changePassword} disabled={saving || !form.current_password || !form.new_password}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Changing…</> : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" disabled>
            Delete Account (contact support)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Resume tab ───────────────────────────────────────────────────────────────
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api").replace(/\/api\/?$/, "");

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function ResumeTab() {
  const [profile, setProfile] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    http.get("/auth/profile/detail/").then((r) => setProfile(r.data)).catch(() => {});
  }, []);

  if (!profile) return <SkeletonCard lines={3} />;

  const resumeUrl = resolveMediaUrl(profile.resume_url);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>Used by your AI mentors to personalise your learning plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resumeUrl ? (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">Resume on file</p>
                {profile.resume_parsed_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Parsed {new Date(profile.resume_parsed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer">View</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={resumeUrl} download>Download</a>
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
          )}

          <Button variant="outline" asChild>
            <a href="/onboarding">Re-run onboarding (upload new resume)</a>
          </Button>
        </CardContent>
      </Card>

      {profile.skills?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Parsed Skills</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s: string, i: number) => (
                <Badge key={i} variant="secondary">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Work Experience & Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="LinkedIn" className="sm:col-span-2">
            <div className="relative">
              <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={profile.linkedin_url ?? ""} readOnly placeholder="https://linkedin.com/in/yourname" />
            </div>
          </Field>
          <Field label="GitHub" className="sm:col-span-2">
            <div className="relative">
              <Github className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={profile.github_url ?? ""} readOnly placeholder="https://github.com/yourname" />
            </div>
          </Field>
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            These are synced from your public portfolio settings.{" "}
            <a href="/settings/portfolio" className="underline text-primary">Edit in Portfolio Settings →</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Notification tab (inline — wraps existing logic) ────────────────────────
function NotificationTab() {
  const [prefs, setPrefs] = useState<Record<string, any> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    http.get("/notifications/preferences/").then((r) => setPrefs(r.data)).catch(() =>
      toast.error("Could not load notification preferences")
    );
  }, []);

  const toggle = async (key: string, val: boolean) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    setSaving(true);
    try {
      await http.patch("/notifications/preferences/", { [key]: val });
    } catch {
      setPrefs(prefs);
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) return <SkeletonCard lines={5} />;

  const switches: { key: string; label: string; description: string }[] = [
    { key: "email_enabled", label: "Email Notifications", description: "Receive notifications via email" },
    { key: "task_reminders", label: "Task Reminders", description: "15-minute reminders before scheduled tasks" },
    { key: "streak_alerts", label: "Streak Alerts", description: "Notified at 8pm if your streak is at risk" },
    { key: "achievements", label: "Achievement Celebrations", description: "Badges and milestone notifications" },
    { key: "weekly_recap", label: "Weekly Recap", description: "Sunday 6pm progress summary" },
    { key: "daily_digest", label: "Daily Digest", description: "Morning briefing at 8am" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Changes save automatically</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {switches.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <button
              role="switch"
              aria-checked={!!prefs[key]}
              onClick={() => toggle(key, !prefs[key])}
              disabled={saving}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50",
                prefs[key] ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform", prefs[key] ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onSave} disabled={saving}>
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
      </Button>
    </div>
  );
}

function SkeletonCard({ lines }: { lines: number }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────
function SettingsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") as TabId) ?? "profile";

  const setTab = (id: TabId) => router.replace(`/settings?tab=${id}`);

  return (
    <div className="container max-w-5xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile, account, and preferences</p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar nav */}
        <nav className="md:w-52 shrink-0">
          <div className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  tab === id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {tab === id && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
              </button>
            ))}

            <Separator className="my-2" />

            <a
              href="/settings/portfolio"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Globe className="h-4 w-4 shrink-0" />
              Public Portfolio
              <ChevronRight className="ml-auto h-3.5 w-3.5" />
            </a>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === "profile"       && <ProfileTab />}
          {tab === "account"       && <AccountTab />}
          {tab === "resume"        && <ResumeTab />}
          {tab === "notifications" && <NotificationTab />}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="container max-w-5xl py-8 animate-pulse"><div className="h-8 w-48 rounded bg-muted" /></div>}>
      <SettingsInner />
    </Suspense>
  );
}
