import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface Notification {
  id: string;
  notification_type: string;
  priority: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications - filtered by user_id which is already role-aware
  // Notifications are created with specific user_id targets based on their role/capabilities
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id || !user?.practiceId) return [];

      const res = await fetch(
        `/api/practices/${user.practiceId}/users/${user.id}/notifications`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`Failed to fetch notifications (${res.status})`);
      const rows = await res.json() as any[];
      // Map API camelCase (read_at timestamp) -> this component's shape.
      return rows.map((n) => ({
        id: n.id,
        notification_type: n.notificationType ?? n.notification_type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        action_url: n.actionUrl ?? n.action_url ?? null,
        is_read: !!(n.readAt ?? n.read_at),
        created_at: n.createdAt ?? n.created_at,
      })) as Notification[];
    },
    enabled: !!user?.id && !!user?.practiceId,
    refetchInterval: 60000, // Refetch every minute
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(
        `/api/practices/${user!.practiceId}/notifications/${notificationId}/read`,
        { method: 'PATCH', credentials: 'include' },
      );
      if (!res.ok) throw new Error(`Failed to mark read (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user?.practiceId) return;
      const res = await fetch(
        `/api/practices/${user.practiceId}/users/${user.id}/notifications/read-all`,
        { method: 'PATCH', credentials: 'include' },
      );
      if (!res.ok) throw new Error(`Failed to mark all read (${res.status})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {notification.action_url ? (
                    <Link to={notification.action_url} className="block">
                      <NotificationContent notification={notification} getPriorityColor={getPriorityColor} />
                    </Link>
                  ) : (
                    <NotificationContent notification={notification} getPriorityColor={getPriorityColor} />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationContent({ 
  notification, 
  getPriorityColor 
}: { 
  notification: Notification;
  getPriorityColor: (priority: string) => string;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="font-medium text-sm">{notification.title}</span>
        <Badge className={`${getPriorityColor(notification.priority)} text-xs`}>
          {notification.priority}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
      </span>
    </>
  );
}
