import { useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { preloadRouteChunk } from '@/lib/routePreload';
import {
  LayoutDashboard,
  Users,
  Wallet,
  ClipboardList,
  Menu,
  Award,
  MessageSquare,
  Bell,
  CalendarClock,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  canAccessPath?: (path: string) => boolean;
}

interface NavCandidate {
  path: string;
  labelBn: string;
  labelEn: string;
  icon: LucideIcon;
  matches: (pathname: string) => boolean;
}

export const MobileBottomNav = ({ onOpenMenu, canAccessPath }: MobileBottomNavProps) => {
  const location = useLocation();
  const { language } = useLanguage();
  const bn = language === 'bn';

  // Check path accessibility
  const isAccessible = (path: string) => {
    if (!canAccessPath) return true;
    return canAccessPath(path);
  };

  // Primary navigation candidates in order of priority (হাজিরা removed from mobile bottom nav per request)
  const candidates: NavCandidate[] = [
    {
      path: '/admin',
      labelBn: 'হোম',
      labelEn: 'Home',
      icon: LayoutDashboard,
      matches: (p) => p === '/admin' || p === '/admin/',
    },
    {
      path: '/admin/students',
      labelBn: 'শিক্ষার্থী',
      labelEn: 'Students',
      icon: Users,
      matches: (p) => p.startsWith('/admin/students'),
    },
    {
      path: '/admin/expenses',
      labelBn: 'হিসাব',
      labelEn: 'Accounts',
      icon: Wallet,
      matches: (p) => p.startsWith('/admin/expenses') || p.startsWith('/admin/fees') || p.startsWith('/admin/salary'),
    },
    {
      path: '/admin/results',
      labelBn: 'ফলাফল',
      labelEn: 'Results',
      icon: Award,
      matches: (p) => p.startsWith('/admin/results'),
    },
    {
      path: '/admin/routine',
      labelBn: 'রুটিন',
      labelEn: 'Routine',
      icon: CalendarClock,
      matches: (p) => p.startsWith('/admin/routine'),
    },
    {
      path: '/admin/messages',
      labelBn: 'মেসেজ',
      labelEn: 'Messages',
      icon: MessageSquare,
      matches: (p) => p.startsWith('/admin/messages'),
    },
    {
      path: '/admin/notices',
      labelBn: 'নোটিশ',
      labelEn: 'Notices',
      icon: Bell,
      matches: (p) => p.startsWith('/admin/notices'),
    },
    {
      path: '/admin/profile',
      labelBn: 'প্রোফাইল',
      labelEn: 'Profile',
      icon: UserCircle,
      matches: (p) => p.startsWith('/admin/profile'),
    },
  ];

  // Pick up to 3 permitted tabs (Dashboard always first, then next 2 accessible) + 1 Menu button = total 4 spacious tabs
  const accessibleItems: NavCandidate[] = [];
  const dashboardItem = candidates[0];
  accessibleItems.push(dashboardItem);

  for (let i = 1; i < candidates.length && accessibleItems.length < 3; i++) {
    const item = candidates[i];
    if (isAccessible(item.path)) {
      accessibleItems.push(item);
    }
  }

  const handleTouchFeedback = () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(10);
      }
    } catch {
      // ignore
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 dark:bg-card/90 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)] pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1 px-2 select-none"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {accessibleItems.map((item) => {
          const isActive = item.matches(location.pathname);
          const Icon = item.icon;
          const label = bn ? item.labelBn : item.labelEn;

          return (
            <Link
              key={item.path}
              to={item.path}
              onTouchStart={() => {
                preloadRouteChunk(item.path);
                handleTouchFeedback();
              }}
              onMouseEnter={() => preloadRouteChunk(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[50px] rounded-xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground/80 hover:text-foreground'
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-primary/15 text-primary shadow-xs' : 'text-current'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[10px] sm:text-xs mt-0.5 tracking-tight truncate max-w-[84px] text-center ${isActive ? 'font-bold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* 5th button is always Menu toggle */}
        <button
          type="button"
          onClick={() => {
            handleTouchFeedback();
            onOpenMenu();
          }}
          aria-label={bn ? 'মেনু খুলুন' : 'Open Menu'}
          className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[50px] rounded-xl transition-all duration-200 active:scale-90 text-muted-foreground/80 hover:text-foreground"
        >
          <div className="flex items-center justify-center w-10 h-7 rounded-full transition-all text-current">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">
            {bn ? 'মেনু' : 'Menu'}
          </span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
