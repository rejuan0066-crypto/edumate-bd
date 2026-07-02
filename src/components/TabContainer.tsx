import { useState, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

export interface TabGroupItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  tabs?: TabItem[];
  content?: ReactNode;
}

interface TabContainerProps {
  /** Level-1 tabs (parent groups). If only one level needed, use `tabs` instead. */
  groups?: TabGroupItem[];
  /** Simple single-level tabs */
  tabs?: TabItem[];
  /** URL search-param key for persistence (default: "tab") */
  paramKey?: string;
  /** Optional second param key for child tabs */
  childParamKey?: string;
  className?: string;
}

const tabVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

/**
 * Floating segmented control button with sliding indicator (via layoutId).
 * level 1 = primary pill (larger, bolder), level 2 = subtle secondary pill.
 */
const SegButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  level = 1,
  layoutId,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  level?: 1 | 2;
  layoutId: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      level === 1 ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-[13px]',
      active
        ? 'text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-primary/5',
    )}
  >
    {active && (
      <motion.span
        layoutId={layoutId}
        className={cn(
          'absolute inset-0 rounded-full',
          level === 1
            ? 'bg-gradient-to-r from-primary to-primary/85 shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.45)]'
            : 'bg-gradient-to-r from-primary/95 to-primary/80 shadow-[0_3px_10px_-2px_hsl(var(--primary)/0.35)]',
        )}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      />
    )}
    <span className="relative z-10 flex items-center gap-2">
      {Icon && <Icon className={cn(level === 1 ? 'w-4 h-4' : 'w-3.5 h-3.5', 'shrink-0')} strokeWidth={1.75} />}
      <span>{label}</span>
    </span>
  </button>
);

/**
 * Glassmorphism container for floating segmented tabs.
 * Horizontally scrollable on small screens, sleek bar on desktop.
 */
const SegContainer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'inline-flex items-center gap-1 p-1.5 rounded-full max-w-full overflow-x-auto',
      'border border-border/30',
      'bg-gradient-to-r from-muted/70 via-muted/40 to-muted/70',
      'backdrop-blur-xl',
      'shadow-[inset_0_1px_0_hsl(var(--background)/0.4),0_2px_12px_-4px_hsl(var(--foreground)/0.08)]',
      '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
      className,
    )}
  >
    {children}
  </div>
);

const TabContainer = ({ groups, tabs, paramKey = 'tab', childParamKey = 'sub', className }: TabContainerProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Single-level mode ──
  if (tabs && !groups) {
    const activeId = searchParams.get(paramKey) || '';
    const activeTab = activeId ? tabs.find(t => t.id === activeId) : null;

    const toggleTab = (id: string) => {
      const next = new URLSearchParams(searchParams);
      if (activeId === id) {
        next.delete(paramKey);
      } else {
        next.set(paramKey, id);
      }
      setSearchParams(next, { replace: true });
    };

    return (
      <div className={cn('w-full', className)}>
        <div className="sticky top-0 z-20 mb-4 py-2 -mx-1 px-1">
          <LayoutGroup id={`tabs-${paramKey}`}>
            <SegContainer>
              {tabs.map(t => (
                <SegButton
                  key={t.id}
                  active={activeTab?.id === t.id}
                  onClick={() => toggleTab(t.id)}
                  icon={t.icon}
                  label={t.label}
                  layoutId={`seg-bg-${paramKey}`}
                />
              ))}
            </SegContainer>
          </LayoutGroup>
        </div>
        <AnimatePresence mode="wait">
          {activeTab && (
            <motion.div key={activeTab.id} variants={tabVariants} initial="initial" animate="animate" exit="exit">
              {activeTab.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Multi-level mode ──
  if (!groups) return null;

  const activeGroupId = searchParams.get(paramKey) || '';
  const activeGroup = activeGroupId ? groups.find(g => g.id === activeGroupId) : null;
  const childTabs = activeGroup?.tabs || [];
  const activeChildId = searchParams.get(childParamKey) || '';
  const activeChild = activeChildId ? childTabs.find(t => t.id === activeChildId) : null;

  const toggleGroup = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (activeGroupId === id) {
      next.delete(paramKey);
      next.delete(childParamKey);
    } else {
      next.set(paramKey, id);
      next.delete(childParamKey);
    }
    setSearchParams(next, { replace: true });
  };

  const toggleChild = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (activeChildId === id) {
      next.delete(childParamKey);
    } else {
      next.set(childParamKey, id);
    }
    setSearchParams(next, { replace: true });
  };

  const content = activeGroup ? (childTabs.length > 0 ? activeChild?.content : activeGroup?.content) : null;

  return (
    <div className={cn('w-full', className)}>
      {/* Level-1 floating segmented bar */}
      <div className="sticky top-0 z-20 mb-3 py-2 -mx-1 px-1">
        <LayoutGroup id={`tabs-${paramKey}-l1`}>
          <SegContainer>
            {groups.map(g => (
              <SegButton
                key={g.id}
                active={activeGroup?.id === g.id}
                onClick={() => toggleGroup(g.id)}
                icon={g.icon}
                label={g.label}
                level={1}
                layoutId={`seg-bg-${paramKey}-l1`}
              />
            ))}
          </SegContainer>
        </LayoutGroup>
      </div>

      {/* Level-2 floating sub bar */}
      {activeGroup && childTabs.length > 0 && (
        <div className="sticky top-[60px] z-[19] mb-4 py-2 -mx-1 px-1">
          <LayoutGroup id={`tabs-${paramKey}-l2`}>
            <SegContainer className="bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40">
              {childTabs.map(t => (
                <SegButton
                  key={t.id}
                  active={activeChild?.id === t.id}
                  onClick={() => toggleChild(t.id)}
                  icon={t.icon}
                  label={t.label}
                  level={2}
                  layoutId={`seg-bg-${paramKey}-l2`}
                />
              ))}
            </SegContainer>
          </LayoutGroup>
        </div>
      )}

      <AnimatePresence mode="wait">
        {content && (
          <motion.div key={`${activeGroup?.id}-${activeChild?.id}`} variants={tabVariants} initial="initial" animate="animate" exit="exit">
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TabContainer;
