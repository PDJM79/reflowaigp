import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor, Bell, Lock, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationPreferences, type EmailFrequency } from '@/hooks/useNotificationPreferences';

type Theme = "light" | "dark" | "system";

export default function Settings() {
  const [theme, setTheme] = useState<Theme>("system");
  const { preferences, loading, updatePreferences } = useNotificationPreferences();

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

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
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
          <Button variant="outline" className="w-full justify-start">
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
