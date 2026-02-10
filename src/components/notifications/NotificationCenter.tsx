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
  notificationType: string;
  priority: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.practiceId, user?.id],
    queryFn: async () => {
      if (!user?.practiceId || !user?.id) return [];
      
      const response = await fetch(`/api/practices/${user.practiceId}/users/${user.id}/notifications`, {
        credentials: 'include',
      });

      if (!response.ok) return [];
      const data = await response.json();
      return (data || []).slice(0, 20) as Notification[];
    },
    enabled: !!user?.practiceId && !!user?.id,
    refetchInterval: 60000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.practiceId) return;

      const response = await fetch(`/api/practices/${user.practiceId}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to mark as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.practiceId || !user?.id) return;

      const response = await fetch(`/api/practices/${user.practiceId}/users/${user.id}/notifications/read-all`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to mark all as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

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
    if (!notification.isRead) {
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
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-accent/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {notification.actionUrl ? (
                    <Link to={notification.actionUrl} className="block">
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
        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
      </span>
    </>
  );
}
