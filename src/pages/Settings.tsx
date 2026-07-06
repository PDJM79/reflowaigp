import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor, Bell, Lock, User, Mail, Shield, ShieldCheck, ShieldOff, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/ui/back-button';
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationPreferences, type EmailFrequency } from '@/hooks/useNotificationPreferences';
import { useAuth } from '@/hooks/useAuth';
import { MFASetupDialog } from '@/components/auth/MFASetupDialog';
import { DisableMFADialog } from '@/components/auth/DisableMFADialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Theme = "light" | "dark" | "system";

type RegulatoryBody = 'england' | 'wales' | 'scotland' | 'northern_ireland';
interface PracticeSettings {
  regulatoryBody: RegulatoryBody | null;
  timezone: string;
  isDispensing: boolean;
  isBranch: boolean;
}
const REGULATORY_BODIES: { value: RegulatoryBody; label: string }[] = [
  { value: 'england', label: 'England (CQC)' },
  { value: 'wales', label: 'Wales (HIW)' },
  { value: 'scotland', label: 'Scotland (HIS)' },
  { value: 'northern_ireland', label: 'Northern Ireland (RQIA)' },
];

export default function Settings() {
  const [theme, setTheme] = useState<Theme>("system");
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [showMfaDisable, setShowMfaDisable] = useState(false);
  const [userData, setUserData] = useState<{ id: string; email: string } | null>(null);

  // Practice settings (practice managers only)
  const isPracticeManager = !!user?.isPracticeManager;
  const [practiceSettings, setPracticeSettings] = useState<PracticeSettings | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceSaving, setPracticeSaving] = useState(false);

  // Phase 5: per-module scheduling toggles (opt-in, default off).
  const [scheduling, setScheduling] = useState<{ cleaning_scheduling_enabled: boolean; fridge_scheduling_enabled: boolean }>({
    cleaning_scheduling_enabled: false,
    fridge_scheduling_enabled: false,
  });
  const [schedulingSaving, setSchedulingSaving] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMfaStatus();
    }
  }, [user]);

  useEffect(() => {
    if (isPracticeManager && user?.practiceId) {
      fetchPracticeSettings();
      fetchSchedulingSettings();
    }
  }, [isPracticeManager, user?.practiceId]);

  const fetchSchedulingSettings = async () => {
    if (!user?.practiceId) return;
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/scheduling-settings`, { credentials: 'include' });
      if (res.ok) setScheduling(await res.json());
    } catch (error) {
      console.error('Error loading scheduling settings:', error);
    }
  };

  const toggleScheduling = async (key: 'cleaning_scheduling_enabled' | 'fridge_scheduling_enabled', value: boolean) => {
    if (!user?.practiceId) return;
    const previous = scheduling;
    setScheduling({ ...scheduling, [key]: value }); // optimistic
    setSchedulingSaving(key);
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/scheduling-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setScheduling(await res.json());
      toast.success('Scheduling settings updated');
    } catch (error) {
      setScheduling(previous); // revert on failure
      toast.error('Could not update scheduling settings');
    } finally {
      setSchedulingSaving(null);
    }
  };

  const fetchPracticeSettings = async () => {
    if (!user?.practiceId) return;
    setPracticeLoading(true);
    try {
      const res = await fetch(`/api/practices/${user.practiceId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load practice settings');
      const p = await res.json();
      setPracticeSettings({
        regulatoryBody: p.regulatoryBody ?? null,
        timezone: p.timezone ?? 'Europe/London',
        isDispensing: !!p.isDispensing,
        isBranch: !!p.isBranch,
      });
    } catch (error) {
      console.error('Error loading practice settings:', error);
      toast.error('Could not load practice settings');
    } finally {
      setPracticeLoading(false);
    }
  };

  const savePracticeSettings = async () => {
    if (!user?.practiceId || !practiceSettings) return;
    setPracticeSaving(true);
    try {
      const res = await fetch(`/api/practices/${user.practiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          regulatoryBody: practiceSettings.regulatoryBody,
          timezone: practiceSettings.timezone.trim() || 'Europe/London',
          isDispensing: practiceSettings.isDispensing,
          isBranch: practiceSettings.isBranch,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(typeof err?.error === 'string' ? err.error : 'Failed to save');
      }
      toast.success('Practice settings saved');
    } catch (error) {
      console.error('Error saving practice settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save practice settings');
    } finally {
      setPracticeSaving(false);
    }
  };

  const fetchMfaStatus = async () => {
    setMfaLoading(true);
    try {
      const res = await fetch(`/api/practices/${user?.practiceId}/users/${user?.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch MFA status (${res.status})`);
      const data = await res.json();
      setMfaEnabled((data?.mfaEnabled ?? data?.mfa_enabled) || false);
      setUserData({ id: data.id, email: user?.email || '' });
    } catch (error) {
      console.error('Error fetching MFA status:', error);
    } finally {
      setMfaLoading(false);
    }
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BackButton />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your application preferences and account settings
        </p>
      </div>

      {/* Practice Settings (practice managers only) */}
      {isPracticeManager && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Practice Settings
            </CardTitle>
            <CardDescription>
              Home nation, timezone and practice type. These determine which curated
              compliance logbooks apply to your practice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {practiceLoading || !practiceSettings ? (
              <p className="text-sm text-muted-foreground">Loading practice settings…</p>
            ) : (
              <>
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="regulatory-body">Regulatory body (home nation)</Label>
                  <Select
                    value={practiceSettings.regulatoryBody ?? 'unset'}
                    onValueChange={(v) =>
                      setPracticeSettings((s) => s && {
                        ...s,
                        regulatoryBody: v === 'unset' ? null : (v as RegulatoryBody),
                      })
                    }
                  >
                    <SelectTrigger id="regulatory-body">
                      <SelectValue placeholder="Select regulatory body" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not set</SelectItem>
                      {REGULATORY_BODIES.map((rb) => (
                        <SelectItem key={rb.value} value={rb.value}>{rb.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controls which nation's compliance requirements apply.
                  </p>
                </div>

                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={practiceSettings.timezone}
                    onChange={(e) =>
                      setPracticeSettings((s) => s && { ...s, timezone: e.target.value })
                    }
                    placeholder="Europe/London"
                  />
                  <p className="text-xs text-muted-foreground">
                    IANA timezone used for scheduling (default Europe/London).
                  </p>
                </div>

                <div className="flex items-center justify-between max-w-sm">
                  <div>
                    <Label htmlFor="is-dispensing">Dispensing practice</Label>
                    <p className="text-xs text-muted-foreground">
                      Enables dispensing-specific logbooks.
                    </p>
                  </div>
                  <Switch
                    id="is-dispensing"
                    checked={practiceSettings.isDispensing}
                    onCheckedChange={(checked) =>
                      setPracticeSettings((s) => s && { ...s, isDispensing: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between max-w-sm">
                  <div>
                    <Label htmlFor="is-branch">Branch surgery</Label>
                    <p className="text-xs text-muted-foreground">
                      Enables branch-specific logbooks.
                    </p>
                  </div>
                  <Switch
                    id="is-branch"
                    checked={practiceSettings.isBranch}
                    onCheckedChange={(checked) =>
                      setPracticeSettings((s) => s && { ...s, isBranch: checked })
                    }
                  />
                </div>

                <Button onClick={savePracticeSettings} disabled={practiceSaving}>
                  {practiceSaving ? 'Saving…' : 'Save practice settings'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Module Scheduling (practice managers only) — Phase 5 opt-in toggles */}
      {isPracticeManager && (
        <Card>
          <CardHeader>
            <CardTitle>Automated scheduling</CardTitle>
            <CardDescription>
              Generate daily task occurrences for these modules so they appear in each person's My Day. Off by default.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="cleaning-scheduling" className="text-base">Cleaning schedules</Label>
                <p className="text-sm text-muted-foreground">Auto-generate cleaning-task occurrences per zone on their frequency.</p>
                {!scheduling.cleaning_scheduling_enabled && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Off — cleaning occurrences are not generated and won't appear in My Day or dashboards.
                  </p>
                )}
              </div>
              <Switch
                id="cleaning-scheduling"
                checked={scheduling.cleaning_scheduling_enabled}
                disabled={schedulingSaving === 'cleaning_scheduling_enabled'}
                onCheckedChange={(v) => toggleScheduling('cleaning_scheduling_enabled', v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="fridge-scheduling" className="text-base">Fridge temperature checks</Label>
                <p className="text-sm text-muted-foreground">Auto-generate "Record temperature" occurrences per fridge; breaches raise a remedial task.</p>
                {!scheduling.fridge_scheduling_enabled && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Off — fridge occurrences are not generated and won't appear in My Day or dashboards.
                  </p>
                )}
              </div>
              <Switch
                id="fridge-scheduling"
                checked={scheduling.fridge_scheduling_enabled}
                disabled={schedulingSaving === 'fridge_scheduling_enabled'}
                onCheckedChange={(v) => toggleScheduling('fridge_scheduling_enabled', v)}
              />
            </div>

            {/* Why some menu items or occurrences may not appear — no silent vanishing. */}
            <div className="rounded-md border border-muted bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Why don't I see some menu items or scheduled tasks?</p>
              <p>
                Menu items appear based on your <span className="font-medium">role capabilities</span> — items you
                cannot action are hidden for you.
              </p>
              <p>
                Scheduled occurrences only appear when the module above is <span className="font-medium">on</span>.
                {' '}Currently off:{' '}
                <span className="font-medium">
                  {[
                    !scheduling.cleaning_scheduling_enabled && 'Cleaning',
                    !scheduling.fridge_scheduling_enabled && 'Fridge',
                  ].filter(Boolean).join(', ') || 'none — both modules are on'}
                </span>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customise the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-base">Theme</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how the application looks, or sync with your system settings
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => handleThemeChange("light")}
                className="h-auto flex-col gap-2 p-4"
              >
                <Sun className="h-6 w-6" />
                <span>Light</span>
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => handleThemeChange("dark")}
                className="h-auto flex-col gap-2 p-4"
              >
                <Moon className="h-6 w-6" />
                <span>Dark</span>
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                onClick={() => handleThemeChange("system")}
                className="h-auto flex-col gap-2 p-4"
              >
                <Monitor className="h-6 w-6" />
                <span>System</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <Label className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Notification Frequency
                  </Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose how often you want to receive email notifications
                  </p>
                  <Select
                    value={preferences?.email_frequency || 'immediate'}
                    onValueChange={(value: EmailFrequency) => 
                      updatePreferences({ email_frequency: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate - As they happen</SelectItem>
                      <SelectItem value="daily">Daily Digest - Once per day</SelectItem>
                      <SelectItem value="weekly">Weekly Digest - Once per week</SelectItem>
                      <SelectItem value="none">None - No email notifications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications in the notification bell
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.in_app_enabled ?? true}
                    onCheckedChange={(checked) => 
                      updatePreferences({ in_app_enabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Policy Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders for unacknowledged policies
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.policy_reminders ?? true}
                    onCheckedChange={(checked) => 
                      updatePreferences({ policy_reminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label className="text-base">Task Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for new tasks and updates
                    </p>
                  </div>
                  <Switch
                    checked={preferences?.task_notifications ?? true}
                    onCheckedChange={(checked) => 
                      updatePreferences({ task_notifications: checked })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {mfaEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-base">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mfaLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              ) : mfaEnabled ? (
                <>
                  <Badge variant="default" className="bg-green-600">Enabled</Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowMfaDisable(true)}
                  >
                    Disable
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowMfaSetup(true)}
                >
                  Enable MFA
                </Button>
              )}
            </div>
          </div>

          <Button variant="outline" className="w-full justify-start">
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>
            Manage your account settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      {/* MFA Dialogs */}
      {userData && (
        <>
          <MFASetupDialog
            open={showMfaSetup}
            onOpenChange={setShowMfaSetup}
            userEmail={userData.email}
            onSuccess={() => {
              setMfaEnabled(true);
              fetchMfaStatus();
            }}
          />
          <DisableMFADialog
            open={showMfaDisable}
            onOpenChange={setShowMfaDisable}
            userId={userData.id}
            userEmail={userData.email}
            onSuccess={() => {
              setMfaEnabled(false);
              fetchMfaStatus();
            }}
          />
        </>
      )}
    </div>
  );
}
