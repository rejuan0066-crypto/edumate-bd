import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const TYPE_ICONS: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

const TYPE_COLORS: Record<string, string> = {
  info: 'text-primary bg-primary/10',
  warning: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  success: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  error: 'text-destructive bg-destructive/10',
};

const NotificationPanel = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return bn ? 'এইমাত্র' : 'Just now';
    if (mins < 60) return bn ? `${mins} মিনিট আগে` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return bn ? `${hrs} ঘন্টা আগে` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return bn ? `${days} দিন আগে` : `${days}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">
            {bn ? 'নোটিফিকেশন' : 'Notifications'}
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">{unreadCount} {bn ? 'নতুন' : 'new'}</Badge>
            )}
          </h3>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => markAllAsRead.mutate()}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              {bn ? 'সব পড়া হয়েছে' : 'Mark all read'}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              {bn ? 'কোনো নোটিফিকেশন নেই' : 'No notifications'}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => {
                const Icon = TYPE_ICONS[n.type] || Info;
                const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.info;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                    onClick={() => {
                      if (!n.is_read) markAsRead.mutate(n.id);
                      if (n.link) { navigate(n.link); setOpen(false); }
                    }}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>
                        {bn ? (n.title_bn || n.title) : n.title}
                      </p>
                      {(n.message || n.message_bn) && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {bn ? (n.message_bn || n.message) : n.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.created_at)}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!n.is_read && (
                        <button
                          onClick={e => { e.stopPropagation(); markAsRead.mutate(n.id); }}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground"
                          title={bn ? 'পড়া হয়েছে' : 'Mark as read'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title={bn ? 'মুছুন' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPanel;
