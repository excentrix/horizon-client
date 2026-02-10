"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPushManager } from "@/lib/push-notifications";
import { http } from "@/lib/http-client";

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  task_reminders: boolean;
  streak_alerts: boolean;
  achievements: boolean;
  weekly_recap: boolean;
  daily_digest: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [pushSubscribing, setPushSubscribing] = useState(false);
  const [pushUnsubscribing, setPushUnsubscribing] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPushSupport();
  }, []);

  const checkPushSupport = async () => {
    const pushManager = getPushManager();
    const supported = pushManager.isSupported();
    setPushSupported(supported);
    
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    if (supported) {
      // Check if already subscribed
      const subscription = await pushManager.getSubscription();
      setPushSubscription(subscription);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await http.get("/api/notifications/preferences/");
      setPreferences(response.data);
    } catch (error) {
      console.error("Failed to load preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!preferences) return;

    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    try {
      setSaving(true);
      await http.patch("/api/notifications/preferences/", { [key]: value });
      
      toast.success("Notification preferences updated");
    } catch (error) {
      console.error("Failed to update preferences:", error);
      
      // Revert on error
      setPreferences(preferences);
      
      toast.error("Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribePush = async () => {
    if (!pushSupported) {
      toast.error("Push notifications are not supported in this browser");
      return;
    }

    setPushSubscribing(true);

    try {
      const pushManager = getPushManager();
      
      // Request permission and subscribe
      const subscription = await pushManager.subscribe();
      
      if (subscription) {
        setPushSubscription(subscription);
        toast.success("You'll now receive push notifications");
      } else {
        toast.error("Could not subscribe to push notifications. Permission may have been denied.");
        
        // Disable push if subscription failed
        if (preferences) {
          await updatePreference("push_enabled", false);
        }
      }
    } catch (error) {
      console.error("Push subscription error:", error);
      toast.error("Failed to subscribe to push notifications");
      
      // Disable push on error
      if (preferences) {
        await updatePreference("push_enabled", false);
      }
    } finally {
      setPushSubscribing(false);
    }
  };

  const handleUnsubscribePush = async () => {
    setPushUnsubscribing(true);

    try {
      const pushManager = getPushManager();
      const success = await pushManager.unsubscribe();
      
      if (success) {
        setPushSubscription(null);
        await updatePreference("push_enabled", false);
        
        toast.success("You'll no longer receive push notifications on this device");
      } else {
        toast.error("Failed to unsubscribe from push notifications");
      }
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      toast.error("Failed to unsubscribe from push notifications");
    } finally {
      setPushUnsubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
          <div className="h-40 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Failed to load notification preferences</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage how and when you receive notifications
        </p>
      </div>

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_enabled">Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email_enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => updatePreference("email_enabled", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push_enabled">Push Notifications</Label>
              <p className="text-sm text-gray-500">
                {pushSubscription 
                  ? `Subscribed on this device` 
                  : preferences.push_enabled
                    ? 'Enable to receive browser notifications'
                    : 'Disabled - enable to subscribe'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pushSubscription ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnsubscribePush}
                  disabled={pushUnsubscribing}
                >
                  {pushUnsubscribing ? 'Unsubscribing...' : 'Unsubscribe'}
                </Button>
              ) : (
                <Switch
                  id="push_enabled"
                  checked={preferences.push_enabled}
                  onCheckedChange={async (checked) => {
                    await updatePreference("push_enabled", checked);
                    if (checked) {
                      // Auto-trigger subscription
                      await handleSubscribePush();
                    }
                  }}
                  disabled={saving || pushSubscribing}
                />
              )}
            </div>
          </div>

          {!pushSupported && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
              ⚠️ Push notifications are not supported in this browser
              {isIOS && ' (iOS Safari does not support web push)'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>What to Notify About</CardTitle>
          <CardDescription>
            Choose which events you want to be notified about
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="task_reminders">Task Reminders</Label>
              <p className="text-sm text-gray-500">
                Get reminded 15 minutes before scheduled tasks
              </p>
            </div>
            <Switch
              id="task_reminders"
              checked={preferences.task_reminders}
              onCheckedChange={(checked) => updatePreference("task_reminders", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="streak_alerts">Streak Alerts</Label>
              <p className="text-sm text-gray-500">
                Get notified at 8pm if your streak is at risk
              </p>
            </div>
            <Switch
              id="streak_alerts"
              checked={preferences.streak_alerts}
              onCheckedChange={(checked) => updatePreference("streak_alerts", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="achievements">Achievement Celebrations</Label>
              <p className="text-sm text-gray-500">
                Get notified when you earn badges or reach milestones
              </p>
            </div>
            <Switch
              id="achievements"
              checked={preferences.achievements}
              onCheckedChange={(checked) => updatePreference("achievements", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly_recap">Weekly Recap</Label>
              <p className="text-sm text-gray-500">
                Receive a summary of your progress every Sunday at 6pm
              </p>
            </div>
            <Switch
              id="weekly_recap"
              checked={preferences.weekly_recap}
              onCheckedChange={(checked) => updatePreference("weekly_recap", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="daily_digest">Daily Digest</Label>
              <p className="text-sm text-gray-500">
                Get a morning briefing at 8am with today&apos;s tasks
              </p>
            </div>
            <Switch
              id="daily_digest"
              checked={preferences.daily_digest}
              onCheckedChange={(checked) => updatePreference("daily_digest", checked)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours - Future enhancement */}
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle>Quiet Hours (Coming Soon)</CardTitle>
          <CardDescription>
            Set times when you don&apos;t want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Feature coming soon. For now, notifications respect standard quiet hours (10pm - 8am).
          </p>
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle>Test Notifications</CardTitle>
          <CardDescription>
            Send yourself a test notification to see how it looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            Send Test Email (requires Resend API key)
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-gray-500">
          Changes are saved automatically
        </p>
        {saving && (
          <p className="text-sm text-blue-600">Saving...</p>
        )}
      </div>
    </div>
  );
}
