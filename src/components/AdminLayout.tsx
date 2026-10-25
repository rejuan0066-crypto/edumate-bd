import { createContext, useContext, ReactNode, useRef, useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import BackButton from './BackButton';
import AdminPageWithTabs from './AdminPageWithTabs';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useIsEmbedded } from '@/contexts/EmbeddedContext';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { isAdminRole } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { useMenuSettings, MenuItemConfig } from '@/hooks/useMenuSettings';
import { useThemeSettings } from '@/hooks/useThemeSettings';
import { useSidebarSections } from '@/hooks/useSidebarSections';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useReceiptStatusRealtime } from '@/hooks/useReceiptStatusRealtime';
import { useCurrentStaff } from '@/hooks/useCurrentStaff';
import LanguageToggle from './LanguageToggle';
import BijoyToggle from './BijoyToggle';
import NotificationPanel from './NotificationPanel';
import DarkModeToggle from './DarkModeToggle';
import { preloadRouteChunk } from '@/lib/routePreload';
import MobileBottomNav from './MobileBottomNav';
import { runStaffDeduplicationSync } from '@/lib/staffDeduplicationSync';
import { formatStaffName } from '@/lib/nameFormatter';
import {
  LayoutDashboard, Users, UserCog, BookOpen, FileText, Bell,
  CreditCard, Settings, Globe, GraduationCap, Menu, X, LogOut,
  ChevronRight, Layers, Receipt, Heart, ReceiptText, FileSignature,
  FilePlus, FileCheck, Tag, Wrench, UserCircle, ChevronDown, FileBox,
  Blocks, FlaskConical, CalendarDays, ShieldCheck, BarChart3, KeyRound, Palette,
  ListOrdered, Home, Image, Mail, Phone, MapPin, Star, Award, Clock, Folder, LayoutGrid,
  HardDrive, MessageSquare, Wallet, UserPlus, Camera, Search, Maximize2, MoreVertical,
  CalendarClock, ClipboardList, Crown, HardHat, Briefcase, Smartphone, ArrowLeft,
  type LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Users, UserCog, BookOpen, FileText, Bell,
  CreditCard, Settings, Globe, GraduationCap, Heart, Layers,
  Receipt, ReceiptText, FileSignature, FilePlus, FileCheck, Tag,
  Wrench, Blocks, FlaskConical, CalendarDays, ShieldCheck, BarChart3,
  KeyRound, Palette, ListOrdered, UserCircle, FileBox, Home,
  Image, Mail, Phone, MapPin, Star, Award, Clock, Folder, LayoutGrid, HardDrive, MessageSquare, Wallet, UserPlus, Camera,
  CalendarClock, ClipboardList, Crown, HardHat, Briefcase, Smartphone,
};

const MENU_SCROLL_STORAGE_KEYS = {
  desktop: 'admin-layout-menu-scroll-desktop',
  mobile: 'admin-layout-menu-scroll-mobile',
} as const;

import { AdminLayoutNestingContext } from '@/contexts/AdminLayoutNestingContext';

type MenuItem = {
  path: string;
  label: string;
  icon: any;
  group?: string;
  children?: { path: string; label: string; icon: any }[];
};

const dedupeMenuEntries = <T extends { path: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalizedPath = item.path.trim();
    if (seen.has(normalizedPath)) return false;
    seen.add(normalizedPath);
    return true;
  });
};

const dedupeTopLevelMenuItems = (items: MenuItem[]) => {
  const byPath = new Map<string, MenuItem>();

  for (const item of items) {
    const normalizedPath = item.path.trim();
    const existing = byPath.get(normalizedPath);

    if (!existing) {
      byPath.set(normalizedPath, item);
      continue;
    }

    const existingChildCount = existing.children?.length ?? 0;
    const nextChildCount = item.children?.length ?? 0;

    if (nextChildCount > existingChildCount) {
      byPath.set(normalizedPath, item);
    }
  }

  return items.filter((item) => byPath.get(item.path.trim()) === item);
};

const getIcon = (name: string): LucideIcon => ICON_MAP[name] || FileBox;

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const isEmbedded = useIsEmbedded();
  const isNestedAdminLayout = useContext(AdminLayoutNestingContext);
  const { t, language } = useLanguage();
  const { signOut, role, user } = useAuth();
  const { canView, hasUserPermission } = usePermissions();
  const isAdmin = isAdminRole(role);
  const location = useLocation();
  const navigate = useNavigate();
  const { menuConfig } = useMenuSettings();
  // Live toast notifications for receipt status changes (admins and staff with receipt permissions only)
  const canAccessReceipts = isAdmin || canView('/admin/fee-receipts') || canView('/admin/receipt-audit');
  useReceiptStatusRealtime(canAccessReceipts);
  const { theme: adminTheme } = useThemeSettings();
  const { sections: sidebarSections } = useSidebarSections();
  const { settings: websiteSettings } = useWebsiteSettings();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [, startNavTransition] = useTransition();
  const desktopMenuRef = useRef<HTMLElement | null>(null);
  const mobileMenuRef = useRef<HTMLElement | null>(null);
  const menuScrollPositionsRef = useRef({ desktop: 0, mobile: 0 });
  const lastPathRef = useRef<string>('');

  // Fetch staff record for sidebar avatar (shared lookup: user_id → email fallback + auto-link)
  const { data: sidebarStaffPhoto } = useCurrentStaff();

  // Background deduplication sync for staff names (e.g. Maulana Farhan, duplicate rows)
  useEffect(() => {
    if (isAdmin) {
      runStaffDeduplicationSync().catch(() => {});
    }
  }, [isAdmin]);

  const { data: sidebarProfile } = useQuery({
    queryKey: ['sidebar-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name, avatar_url, phone').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const sidebarDisplayName = (sidebarStaffPhoto?.name_bn || sidebarStaffPhoto?.name_en)
    ? formatStaffName(sidebarStaffPhoto.name_bn, sidebarStaffPhoto.name_en, language === 'bn')
    : (sidebarProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User');
  const sidebarAvatar = sidebarStaffPhoto?.photo_url || sidebarProfile?.avatar_url || '';

  // Apply default theme mode from settings
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (!stored && adminTheme.defaultThemeMode !== 'system') {
      if (adminTheme.defaultThemeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [adminTheme.defaultThemeMode]);

  // Compute dynamic styles from theme
  const sidebarWidthMap = { narrow: 'w-[200px]', default: 'w-[260px]', wide: 'w-[300px]' };
  const sidebarWidthClass = sidebarWidthMap[adminTheme.sidebarWidth] || 'w-[260px]';
  const sidebarWidthPxMap = { narrow: 200, default: 260, wide: 300 };
  const expandedSidebarWidth = sidebarWidthPxMap[adminTheme.sidebarWidth] || 260;
  const collapsedSidebarWidth = 64;
  const desktopSidebarWidth = sidebarOpen ? expandedSidebarWidth : collapsedSidebarWidth;
  const iconSizeMap = { small: 'w-[18px] h-[18px]', medium: 'w-5 h-5', large: 'w-[22px] h-[22px]' };
  const iconSizeClass = iconSizeMap[adminTheme.sidebarIconSize] || 'w-5 h-5';
  const headerHeightMap = { compact: 'py-1.5', default: 'py-2.5', tall: 'py-4' };
  const headerPadClass = headerHeightMap[adminTheme.headerHeight] || 'py-2.5';
  const mobileHeaderOffsetMap = {
    compact: 'pt-[calc(env(safe-area-inset-top)+3.75rem)]',
    default: 'pt-[calc(env(safe-area-inset-top)+4.25rem)]',
    tall: 'pt-[calc(env(safe-area-inset-top)+5rem)]',
  };
  const mobileHeaderOffsetClass = mobileHeaderOffsetMap[adminTheme.headerHeight] || 'pt-[calc(env(safe-area-inset-top)+4.25rem)]';
  const desktopHeaderOffsetMap = {
    compact: 'lg:pt-14',
    default: 'lg:pt-16',
    tall: 'lg:pt-20',
  };
  const desktopHeaderOffsetClass = desktopHeaderOffsetMap[adminTheme.headerHeight] || 'lg:pt-16';
  const headerTopPaddingMap = { compact: '0.375rem', default: '0.625rem', tall: '1rem' };
  const headerTopPadding = headerTopPaddingMap[adminTheme.headerHeight] || '0.625rem';

  const sidebarStyle: React.CSSProperties = {
    ...(adminTheme.sidebarBgColor ? { backgroundColor: adminTheme.sidebarBgColor } : {}),
    ...(adminTheme.sidebarTextColor ? { color: adminTheme.sidebarTextColor } : {}),
  };
  const headerStyle: React.CSSProperties = {
    boxShadow: 'var(--shadow-soft)',
    ...(adminTheme.headerBgColor ? { backgroundColor: adminTheme.headerBgColor } : {}),
    ...(adminTheme.headerTextColor ? { color: adminTheme.headerTextColor } : {}),
  };

  // Check if user can see a menu path
  const canAccessPath = useCallback((path: string): boolean => {
    if (isAdmin) return true;
    const basePath = path.split('?')[0];
    // Internal messaging is available to every signed-in user
    if (basePath === '/admin' || basePath === '/admin/profile' || basePath === '/admin/messages') return true;
    return canView(basePath);
  }, [isAdmin, canView]);

  const toggleGroup = (key: string) => {
    setOpenMenuId(prev => (prev === key ? null : key));
  };

  const persistMenuScroll = (mobile: boolean, scrollTop: number) => {
    const storageKey = mobile ? MENU_SCROLL_STORAGE_KEYS.mobile : MENU_SCROLL_STORAGE_KEYS.desktop;
    menuScrollPositionsRef.current[mobile ? 'mobile' : 'desktop'] = scrollTop;
    window.sessionStorage.setItem(storageKey, String(scrollTop));
  };

  const restoreMenuScroll = (element: HTMLElement | null, mobile: boolean) => {
    if (!element) return;
    const storageKey = mobile ? MENU_SCROLL_STORAGE_KEYS.mobile : MENU_SCROLL_STORAGE_KEYS.desktop;
    const savedScrollTop = window.sessionStorage.getItem(storageKey);
    const fallbackScrollTop = menuScrollPositionsRef.current[mobile ? 'mobile' : 'desktop'];
    const scrollTop = savedScrollTop ? Number(savedScrollTop) : fallbackScrollTop;
    element.scrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;
  };

  useEffect(() => {
    restoreMenuScroll(desktopMenuRef.current, false);
    restoreMenuScroll(mobileMenuRef.current, true);
  }, []);


  // Fetch published custom forms for dynamic menu
  const { data: publishedForms = [] } = useQuery({
    queryKey: ['published-custom-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_forms')
        .select('*')
        .neq('publish_to', 'none')
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const canAccessParent = useCallback((item: MenuItemConfig): boolean => {
    if (isAdmin) return true;
    if (item.children && item.children.length > 0) {
      const hasAccessibleChild = item.children.some(c => c.visible && !c.tab_of && canAccessPath(c.path));
      if (hasAccessibleChild) return true;
      if (item.path && item.path !== '#' && canAccessPath(item.path)) {
        return true;
      }
      return false;
    }
    return canAccessPath(item.path);
  }, [isAdmin, canAccessPath]);

  const configToMenuItem = useCallback((cfg: MenuItemConfig): MenuItem => {
    const children = dedupeMenuEntries(
      (cfg.children ?? [])
        .filter(c => c.visible && !c.tab_of && canAccessPath(c.path))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({
          path: c.path,
          label: language === 'bn' ? c.label_bn : c.label_en,
          icon: getIcon(c.icon),
        }))
    );

    return {
      path: cfg.path,
      label: language === 'bn' ? cfg.label_bn : cfg.label_en,
      icon: getIcon(cfg.icon),
      children: children.length > 0 ? children : undefined,
    };
  }, [canAccessPath, language]);

  const menuItems: MenuItem[] = useMemo(() => {
    const baseMenuItems: MenuItem[] = dedupeTopLevelMenuItems(
      menuConfig.sidebar
        .filter(item => item.visible && !item.tab_of && canAccessParent(item))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(configToMenuItem)
    );

    const items: MenuItem[] = baseMenuItems.map(item => {
      const subForms = dedupeMenuEntries(
        publishedForms
          .filter(f => f.publish_to === 'sub_menu' && f.parent_menu === item.path && (isAdmin || canAccessPath(`/admin/custom/${f.menu_slug}`)))
          .map(f => ({
            path: `/admin/custom/${f.menu_slug}`,
            label: language === 'bn' ? f.name_bn : f.name,
            icon: FileBox,
          }))
      );

      if (subForms.length > 0) {
        const existingChildren = item.children || [];
        return { ...item, children: dedupeMenuEntries([...existingChildren, ...subForms]) };
      }
      return item;
    });

    dedupeMenuEntries(
      publishedForms
        .filter(f => f.publish_to === 'main_menu' && (isAdmin || canAccessPath(`/admin/custom/${f.menu_slug}`)))
        .map(f => ({
          path: `/admin/custom/${f.menu_slug}`,
          label: language === 'bn' ? f.name_bn : f.name,
          icon: FileBox,
        }))
    ).forEach(f => {
      const settingsIdx = items.findIndex(m => m.path === '/admin/settings');
      if (items.some(m => m.path === f.path)) return;
      if (settingsIdx !== -1) {
        items.splice(settingsIdx, 0, f);
      } else {
        items.push(f);
      }
    });

    return items;
  }, [menuConfig.sidebar, publishedForms, language, canAccessParent, configToMenuItem, isAdmin, canAccessPath]);

  // Auto-open parent of active child ONLY on actual route navigation (never overrides user clicks)
  useEffect(() => {
    const currentFullPath = location.pathname + location.search;
    if (lastPathRef.current === currentFullPath) return;
    lastPathRef.current = currentFullPath;

    const activeParent = menuItems.find(item =>
      item.children?.some(c => {
        const [cPath, cSearch] = c.path.split('?');
        return cSearch
          ? location.pathname === cPath && location.search === `?${cSearch}`
          : location.pathname === c.path;
      })
    );
    if (activeParent?.path) {
      setOpenMenuId(activeParent.path);
    }
  }, [location.pathname, location.search, menuItems]);


  // When embedded or already inside an admin shell, render only the page content
  if (isEmbedded || isNestedAdminLayout) {
    return (
      <AdminLayoutNestingContext.Provider value={true}>
        {children}
      </AdminLayoutNestingContext.Provider>
    );
  }

  // Group menu items by category using dynamic sidebar sections
  const getGroupInfo = (path: string): { label: string; color?: string; bgColor?: string } | null => {
    for (const sec of sidebarSections) {
      if (sec.menuPaths.includes(path)) {
        return {
          label: language === 'bn' ? sec.labelBn : sec.labelEn,
          color: sec.color || undefined,
          bgColor: sec.bgColor || undefined,
        };
      }
    }
    return null;
  };

  const currentPageLabel = (() => {
    const fullPath = location.pathname + location.search;
    for (const item of menuItems) {
      if (item.path === location.pathname || item.path === fullPath) return item.label;
      const child = item.children?.find(c => {
        const [cPath, cSearch] = c.path.split('?');
        return cSearch ? (location.pathname === cPath && location.search === '?' + cSearch) : location.pathname === c.path;
      });
      if (child) return child.label;
    }
    return t('dashboard');
  })();

  const renderSidebar = (mobile = false) => (
    <aside key={mobile ? 'mobile' : 'desktop'} className={`${mobile ? 'fixed inset-0 z-50' : 'hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex'} flex`}>
      {mobile && (
        <div
          className="flex-1 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div
        className={`${mobile ? 'w-[280px] max-w-[85vw] animate-in slide-in-from-left duration-300' : sidebarOpen ? sidebarWidthClass : 'w-16'} sidebar-glass flex flex-col h-[100dvh] max-h-[100dvh] transition-all duration-500 ${mobile ? 'order-first shadow-2xl' : ''}`}
        style={sidebarStyle}
      >
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3 border-b border-sidebar-border/30 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0 shadow-lg shadow-sidebar-primary/25 overflow-hidden">
            {(websiteSettings.favicon_url || websiteSettings.logo_url) ? (
              <img
                src={websiteSettings.favicon_url || websiteSettings.logo_url}
                alt="Logo"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = 'true';
                    img.src = '/loader-logo.png';
                  }
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-sidebar-primary-foreground">
                {(language === 'bn' ? websiteSettings.institution_name : (websiteSettings.institution_name_en || websiteSettings.institution_name))?.charAt(0) || 'E'}
              </span>
            )}
          </div>
          {(sidebarOpen || mobile) && (
            <div className="overflow-hidden flex-1 min-w-0">
              <h2
                className="text-sm font-bold text-sidebar-foreground truncate leading-relaxed block max-w-full"
                title={language === 'bn' ? websiteSettings.institution_name : (websiteSettings.institution_name_en || websiteSettings.institution_name)}
                style={{ whiteSpace: 'nowrap', overflowWrap: 'anywhere' }}
              >
                {language === 'bn' ? websiteSettings.institution_name : (websiteSettings.institution_name_en || websiteSettings.institution_name)}
              </h2>
              <p className="text-[11px] text-sidebar-foreground/50 leading-relaxed truncate">{language === 'bn' ? 'ম্যানেজমেন্ট সিস্টেম' : 'Management System'}</p>
            </div>
          )}
          {mobile && (
            <button onClick={() => setMobileSidebarOpen(false)} className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground shrink-0">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu - scrollable area */}
        <nav
          ref={(element) => restoreMenuScroll(element, mobile)}
          onScroll={(event) => persistMenuScroll(mobile, event.currentTarget.scrollTop)}
          className="flex-1 min-h-0 py-3 px-3 space-y-0.5 overflow-y-auto overscroll-contain sidebar-scrollbar select-none cursor-default"
          style={{ scrollbarGutter: 'stable' }}
          data-current-path={location.pathname}
        >
          {(() => {
            let lastGroup = '';
            return menuItems.map((item) => {
              const currentFullPath = location.pathname + location.search;
              const isDirectActive = location.pathname === item.path || currentFullPath === item.path;
              const hasChildren = item.children && item.children.length > 0;
              const hasActiveChild = hasChildren && item.children!.some(c => {
                const [cPath, cSearch] = c.path.split('?');
                return cSearch ? (location.pathname === cPath && location.search === '?' + cSearch) : location.pathname === c.path;
              });
              const isActive = isDirectActive && !hasActiveChild;
              const isGroupOpen = openMenuId === item.path;
              const groupInfo = getGroupInfo(item.path);
              const groupLabel = groupInfo?.label || '';
              const showGroupLabel = groupLabel && groupLabel !== lastGroup;
              if (groupLabel) lastGroup = groupLabel;

              const effectClass = adminTheme.sidebarClickEffect && adminTheme.sidebarClickEffect !== 'none' ? `click-${adminTheme.sidebarClickEffect}` : '';

              return (
                <div key={item.path}>
                  {showGroupLabel && (
                    <div
                      className="sidebar-group-label"
                      style={{
                        ...(groupInfo?.color ? { color: groupInfo.color } : {}),
                        ...(groupInfo?.bgColor ? { backgroundColor: groupInfo.bgColor + '15', borderRadius: '6px', marginLeft: '-4px', marginRight: '-4px', paddingLeft: '16px' } : {}),
                      }}
                    >
                      {groupLabel}
                    </div>
                  )}

                  {hasChildren ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (sidebarOpen || mobile) {
                            toggleGroup(item.path);
                          } else {
                            // collapsed sidebar: navigate to parent page
                            if (mobile) setMobileSidebarOpen(false);
                            if (adminTheme.sidebarStableNav) {
                              startNavTransition(() => navigate(item.path));
                            } else {
                              navigate(item.path);
                            }
                          }
                        }}
                        className={`sidebar-item w-full text-left ${effectClass} ${isActive ? 'active' : ''} ${hasActiveChild ? 'has-active-child' : ''} ${isGroupOpen ? 'group-open' : ''}`}
                        title={!sidebarOpen && !mobile ? item.label : undefined}
                      >
                        <item.icon className="sidebar-icon w-[18px] h-[18px] shrink-0" />
                        {(sidebarOpen || mobile) && <span className="truncate flex-1">{item.label}</span>}
                        {(sidebarOpen || mobile) && (
                          <ChevronDown className={`sidebar-chevron w-3.5 h-3.5 shrink-0 ml-auto ${isGroupOpen ? 'open' : ''}`} />
                        )}
                      </button>

                      {/* Accordion submenu — parent's own page injected as first item */}
                      <div className={`sidebar-submenu-slide ${isGroupOpen ? 'sidebar-submenu-open' : ''}`}>
                        <div className="sidebar-submenu-container">
                          {/* Parent's own page as first sub-item only if accessible, valid, and not already in children */}
                          {(() => {
                            if (!item.path || item.path === '#' || !canAccessPath(item.path)) return null;
                            if (item.children?.some(c => c.path === item.path)) return null;
                            const parentActive = isDirectActive && !hasActiveChild;
                            return (
                              <Link
                                key={`__parent_${item.path}`}
                                to={item.path}
                                onMouseEnter={() => preloadRouteChunk(item.path)}
                                onFocus={() => preloadRouteChunk(item.path)}
                                onTouchStart={() => preloadRouteChunk(item.path)}
                                onClick={(e) => {
                                  if (mobile) setMobileSidebarOpen(false);
                                  if (adminTheme.sidebarStableNav) {
                                    e.preventDefault();
                                    startNavTransition(() => navigate(item.path));
                                  }
                                }}
                                className={`sidebar-sub-item ${parentActive ? 'active' : ''}`}
                              >
                                <item.icon className="sidebar-icon w-4 h-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            );
                          })()}
                          {item.children!.map(child => {
                            const [childPathname, childSearch] = child.path.split('?');
                            const childActive = childSearch
                              ? (location.pathname === childPathname && location.search === '?' + childSearch)
                              : location.pathname === child.path;
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                onMouseEnter={() => preloadRouteChunk(child.path)}
                                onFocus={() => preloadRouteChunk(child.path)}
                                onTouchStart={() => preloadRouteChunk(child.path)}
                                onClick={() => { if (mobile) setMobileSidebarOpen(false); }}
                                className={`sidebar-sub-item ${childActive ? 'active' : ''}`}
                              >
                                <child.icon className="sidebar-icon w-4 h-4 shrink-0" />
                                <span className="truncate">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      onMouseEnter={() => preloadRouteChunk(item.path)}
                      onFocus={() => preloadRouteChunk(item.path)}
                      onTouchStart={() => preloadRouteChunk(item.path)}
                      onClick={(e) => {
                        if (mobile) setMobileSidebarOpen(false);
                        if (adminTheme.sidebarStableNav) {
                          e.preventDefault();
                          startNavTransition(() => navigate(item.path));
                        }
                      }}
                      className={`sidebar-item ${effectClass} ${isActive ? 'active' : ''}`}
                      title={!sidebarOpen && !mobile ? item.label : undefined}
                    >
                      <item.icon className="sidebar-icon w-[18px] h-[18px] shrink-0" />
                      {(sidebarOpen || mobile) && <span className="truncate">{item.label}</span>}
                      {isActive && (sidebarOpen || mobile) && <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-100" />}
                    </Link>
                  )}
                </div>
              );
            });
          })()}
        </nav>

        {/* Bottom - user profile + logout */}
        {(sidebarOpen || mobile) && (
          <div className="px-2 py-1.5 border-t border-white/8 shrink-0">
            <div className="flex items-center gap-2 px-1.5 py-1 rounded-lg bg-white/5 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10">
                {sidebarAvatar ? (
                  <img src={sidebarAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-sidebar-primary-foreground">
                    {sidebarDisplayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 leading-none">
                <p className="text-[11px] font-semibold text-sidebar-foreground truncate">
                  {sidebarDisplayName}
                </p>
                <span className="text-[9px] text-sidebar-foreground/55 truncate block mt-0.5">{(() => {
                  // Prefer the linked staff designation (actual job title) over generic role label
                  if (sidebarStaffPhoto?.designation) return sidebarStaffPhoto.designation;
                  const roleLabels: Record<string, { bn: string; en: string }> = {
                    super_admin: { bn: 'সুপার অ্যাডমিন', en: 'Super Admin' },
                    admin: { bn: 'অ্যাডমিন', en: 'Admin' },
                    teacher: { bn: 'শিক্ষক', en: 'Teacher' },
                    staff: { bn: 'স্টাফ', en: 'Staff' },
                    accountant: { bn: 'হিসাবরক্ষক', en: 'Accountant' },
                  };
                  const r = roleLabels[role || ''] || { bn: role || '', en: role || '' };
                  return language === 'bn' ? r.bn : r.en;
                })()}</span>
              </div>
              <button
                onClick={async () => { await signOut(); navigate('/login'); }}
                className="p-1 rounded-md hover:bg-destructive/20 text-sidebar-foreground/50 hover:text-destructive transition-all"
                title={language === 'bn' ? 'লগআউট' : 'Logout'}
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <AdminLayoutNestingContext.Provider value={true}>
      <div className="min-h-screen bg-transparent w-full overflow-x-auto" style={{ ['--admin-sidebar-width' as string]: `${desktopSidebarWidth}px` }}>
        {renderSidebar(false)}
        {mobileSidebarOpen && renderSidebar(true)}

        <div className={`flex min-h-screen flex-col ${mobileHeaderOffsetClass} ${desktopHeaderOffsetClass} lg:ml-[var(--admin-sidebar-width)]`}>
          {/* Top bar */}
          <header className={`admin-header-glass px-3 sm:px-4 lg:px-6 ${headerPadClass} fixed top-0 right-0 left-0 lg:left-[var(--admin-sidebar-width)] z-40 flex items-center justify-between gap-2`} style={{ ...headerStyle, boxShadow: undefined, fontSize: 'var(--header-font-size, 13px)', paddingTop: `calc(env(safe-area-inset-top) + ${headerTopPadding})` }}>
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <button onClick={() => { if (window.innerWidth < 1024) setMobileSidebarOpen(true); else setSidebarOpen(!sidebarOpen); }} className="min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl hover:bg-secondary/60 active:scale-95 transition-all duration-200 shrink-0" aria-label="Toggle menu">
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
              {location.pathname !== '/admin' && (
                <button
                  onClick={() => navigate(-1)}
                  className="lg:hidden p-1.5 rounded-xl hover:bg-secondary/60 active:scale-95 text-muted-foreground hover:text-foreground shrink-0 transition-transform"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {/* Page label in header */}
              <span className="text-xs sm:text-sm font-semibold text-foreground/90 truncate max-w-[150px] sm:max-w-none">{currentPageLabel}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Search */}
              {adminTheme.headerShowSearch && (
                <div className="hidden md:flex items-center gap-2 bg-card rounded-xl px-3 py-1.5 text-xs text-foreground font-medium min-w-[200px] border border-border shadow-xs">
                  <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{language === 'bn' ? 'শিক্ষার্থী, শিক্ষক, ক্লাস খুঁজুন...' : 'Search students, teachers...'}</span>
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                    Ctrl+K
                  </kbd>
                </div>
              )}
              <DarkModeToggle />
              <NotificationPanel />
              <div className="hidden sm:flex items-center gap-1.5"><BijoyToggle /><LanguageToggle /></div>
              <Link to="/" className="hidden sm:inline-flex p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title={t('home')}>
                <Globe className="w-5 h-5" />
              </Link>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-2.5 sm:px-6 md:px-8 pb-24 lg:pb-10 pt-2 sm:pt-4 w-full max-w-[1536px] mx-auto">
            <BackButton position="top" />
            {/* Modern SaaS Content Container */}
            <div className="admin-page-card rounded-xl sm:rounded-2xl bg-card border border-border p-3.5 sm:p-6 lg:p-7 min-h-[65vh] w-full shadow-xs">
              <div className="w-full min-w-0">
                <AdminPageWithTabs>{children}</AdminPageWithTabs>
              </div>
            </div>
            <BackButton position="bottom" />
          </main>
        </div>

        {/* Floating Mobile Bottom Navigation Bar for phones & tablets */}
        <MobileBottomNav onOpenMenu={() => setMobileSidebarOpen(true)} canAccessPath={canAccessPath} />
      </div>
    </AdminLayoutNestingContext.Provider>
  );
};

export default AdminLayout;
