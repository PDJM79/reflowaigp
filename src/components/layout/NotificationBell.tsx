import { useEffect, useState } from 'react';
import { Bell, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type Notification = {
  id: string;
  title: string;
  message: string;
  priority: string;
  action_url: string | null;
  created_at: string;
  is_read: boolean;
};

type PolicyNotification = {
  id: string;
  title: string;
  version: string;
  days_overdue: number;
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [policyNotifications, setPolicyNotifications] = useState<PolicyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [policyCount, setPolicyCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchPolicyNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'policy_acknowledgments',
        },
        () => {
          fetchPolicyNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchPolicyNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      const [policiesRes, acknowledgementsRes] = await Promise.all([
        supabase.from('policy_documents').select('id, title, version, effective_from').eq('practice_id', userData.practice_id).eq('is_active', true),
        supabase.from('policy_acknowledgments').select('policy_id, version_acknowledged').eq('user_id', userData.id)
      ]);

      if (!policiesRes.data) return;

      const acknowledgedMap = new Map((acknowledgementsRes.data || []).map(a => [`${a.policy_id}-${a.version_acknowledged}`, true]));

      const unacknowledged: PolicyNotification[] = policiesRes.data
        .filter(p => !acknowledgedMap.has(`${p.id}-${p.version}`))
        .map(p => ({
          id: p.id,
          title: p.title || 'Untitled Policy',
          version: p.version || '1.0',
          days_overdue: Math.floor((Date.now() - new Date(p.effective_from || 0).getTime()) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => b.days_overdue - a.days_overdue)
        .slice(0, 5);

      setPolicyNotifications(unacknowledged);
      setPolicyCount(unacknowledged.length);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    fetchNotifications();
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
    }
    setOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      default:
        return 'bg-blue-500';
    }
  };

  const totalNotifications = unreadCount + policyCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            <h4 className="font-semibold">Notifications</h4>
            
            {/* Policy Notifications Section */}
            {policyNotifications.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Policies Needing Acknowledgment</span>
                  <Badge variant="destructive" className="ml-auto">
                    {policyCount}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {policyNotifications.map((policy) => (
                    <div
                      key={policy.id}
                      className="p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                      onClick={() => {
                        navigate('/policies');
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {policy.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Version {policy.version}
                            {policy.days_overdue > 0 && (
                              <span className="text-destructive ml-1">
                                • {policy.days_overdue} days overdue
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {policyNotifications.length > 0 && notifications.length > 0 && (
              <Separator />
            )}

            {/* System Notifications Section */}
            {notifications.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Bell className="h-4 w-4" />
                  <span>System Notifications</span>
                </div>
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                        !notification.is_read ? 'bg-accent/50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {policyNotifications.length === 0 && notifications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notifications
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
