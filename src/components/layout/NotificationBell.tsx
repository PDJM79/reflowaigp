import { useEffect, useState } from 'react';
import { Bell, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type Notification = {
  id: string;
  title: string;
  message: string;
  priority: string;
  actionUrl: string | null;
  createdAt: string;
  isRead: boolean;
};

type PolicyNotification = {
  id: string;
  title: string;
  version: string;
  days_overdue: number;
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [policyNotifications, setPolicyNotifications] = useState<PolicyNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [policyCount, setPolicyCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user?.practiceId && user?.id) {
      fetchNotifications();
      fetchPolicyNotifications();

      const interval = setInterval(() => {
        fetchNotifications();
        fetchPolicyNotifications();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [user?.practiceId, user?.id]);

  const fetchNotifications = async () => {
    if (!user?.practiceId || !user?.id) return;

    try {
      const response = await fetch(`/api/practices/${user.practiceId}/users/${user.id}/notifications/unread`, {
        credentials: 'include',
      });

      if (!response.ok) return;

      const data = await response.json();
      const items = (data || []).slice(0, 10);
      setNotifications(items);
      setUnreadCount(items.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchPolicyNotifications = async () => {
    if (!user?.practiceId) return;

    try {
      const response = await fetch(`/api/practices/${user.practiceId}/policies`, {
        credentials: 'include',
      });

      if (!response.ok) return;

      const policiesData = await response.json();

      if (!policiesData || policiesData.length === 0) {
        setPolicyNotifications([]);
        setPolicyCount(0);
        return;
      }

      const activePolicies = (policiesData || []).filter((p: any) => 
        p.status === 'active' || p.isActive
      );

      const unacknowledged: PolicyNotification[] = activePolicies
        .slice(0, 5)
        .map((p: any) => ({
          id: p.id,
          title: p.title || 'Untitled Policy',
          version: p.version || '1.0',
          days_overdue: Math.floor((Date.now() - new Date(p.effectiveFrom || p.effective_from || 0).getTime()) / (1000 * 60 * 60 * 24))
        }));

      setPolicyNotifications(unacknowledged);
      setPolicyCount(unacknowledged.length);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.practiceId) return;

    try {
      await fetch(`/api/practices/${user.practiceId}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });

      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
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
            
            {policyNotifications.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Policies Needing Acknowledgement</span>
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
                        !notification.isRead ? 'bg-accent/50' : ''
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
                        {!notification.isRead && (
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
