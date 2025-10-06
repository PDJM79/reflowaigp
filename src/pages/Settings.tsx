import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<string>('system');
  const [language, setLanguage] = useState<string>(i18n.language);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'system';
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const applyTheme = (newTheme: string) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    toast.success('Theme updated');
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('app-language', newLanguage);
    toast.success('Language updated');
  };

  const handleSave = () => {
    localStorage.setItem('email-notifications', emailNotifications.toString());
    toast.success(t('settings.save'));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">Customize your experience</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.theme')}</CardTitle>
          <CardDescription>Select your preferred theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('light')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Sun className="h-6 w-6" />
              <span>{t('settings.light')}</span>
            </Button>
            
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('dark')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Moon className="h-6 w-6" />
              <span>{t('settings.dark')}</span>
            </Button>
            
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('system')}
              className="flex flex-col items-center gap-2 h-auto py-4"
            >
              <Monitor className="h-6 w-6" />
              <span>{t('settings.system')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
          <CardDescription>Choose your preferred language</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('settings.english')}</SelectItem>
              <SelectItem value="cy">{t('settings.welsh')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.notifications')}</CardTitle>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">{t('settings.email_notifications')}</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for due tasks and reminders
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>{t('common.save')}</Button>
      </div>
    </div>
  );
}
