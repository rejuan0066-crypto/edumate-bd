import { useState, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  level = 1,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  level?: 1 | 2;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap',
      level === 1
        ? active
          ? 'bg-primary/10 border-primary text-primary shadow-sm'
          : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
        : active
          ? 'bg-primary/10 border-primary text-primary shadow-sm'
          : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    )}
  >
    {Icon && <Icon className={cn('w-4 h-4', level === 2 && 'w-4 h-4')} />}
    {label}
  </button>
);

const TabContainer = ({ groups, tabs, paramKey = 'tab', childParamKey = 'sub', className }: TabContainerProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Single-level mode ──
  if (tabs && !groups) {
    const activeId = searchParams.get(paramKey) || tabs[0]?.id || '';
    const activeTab = tabs.find(t => t.id === activeId) || tabs[0];

    const setActive = (id: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(paramKey, id);
      setSearchParams(next, { replace: true });
    };

    return (
      <div className={cn('w-full', className)}>
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map(t => (
            <TabButton
              key={t.id}
              active={activeTab?.id === t.id}
              onClick={() => setActive(t.id)}
              icon={t.icon}
              label={t.label}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab?.id} variants={tabVariants} initial="initial" animate="animate" exit="exit">
            {activeTab?.content}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── Multi-level mode ──
  if (!groups) return null;

  const activeGroupId = searchParams.get(paramKey) || groups[0]?.id || '';
  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  const childTabs = activeGroup?.tabs || [];
  const activeChildId = searchParams.get(childParamKey) || childTabs[0]?.id || '';
  const activeChild = childTabs.find(t => t.id === activeChildId) || childTabs[0];

  const setGroup = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(paramKey, id);
    next.delete(childParamKey);
    setSearchParams(next, { replace: true });
  };

  const setChild = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(childParamKey, id);
    setSearchParams(next, { replace: true });
  };

  const content = childTabs.length > 0 ? activeChild?.content : activeGroup?.content;

  return (
    <div className={cn('w-full', className)}>
      {/* Level-1 tabs */}
      <div className="flex flex-wrap gap-2 mb-3">
        {groups.map(g => (
          <TabButton
            key={g.id}
            active={activeGroup?.id === g.id}
            onClick={() => setGroup(g.id)}
            icon={g.icon}
            label={g.label}
            level={1}
          />
        ))}
      </div>

      {/* Level-2 tabs */}
      {childTabs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pl-1">
          {childTabs.map(t => (
            <TabButton
              key={t.id}
              active={activeChild?.id === t.id}
              onClick={() => setChild(t.id)}
              icon={t.icon}
              label={t.label}
              level={2}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={`${activeGroup?.id}-${activeChild?.id}`} variants={tabVariants} initial="initial" animate="animate" exit="exit">
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TabContainer;
