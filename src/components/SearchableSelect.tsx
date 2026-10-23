import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
  aliases?: string[];
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  groups?: { key: string; label: string }[];
  allowCustom?: boolean;
  customLabel?: string;
}

const SearchableSelect = ({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled,
  className,
  groups,
  allowCustom = false,
  customLabel = 'Add',
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const filtered = search
    ? options.filter(o => {
        const q = search.toLowerCase();
        return (
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          (o.aliases && o.aliases.some(a => a.toLowerCase().includes(q)))
        );
      })
    : options;

  const selectedOption = options.find(o =>
    o.value === value ||
    o.label === value ||
    (o.aliases && o.aliases.includes(value))
  );
  const selectedLabel = selectedOption?.label || (value && !selectedOption ? value : undefined);

  const showAddCustom = allowCustom && search.trim().length > 0 && !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase() || o.value.toLowerCase() === search.trim().toLowerCase());

  const handleAddCustom = () => {
    onValueChange(search.trim());
    setOpen(false);
  };

  const renderOptions = () => {
    if (groups && groups.length > 0) {
      return groups.map(g => {
        const groupOptions = filtered.filter(o => o.group === g.key);
        if (groupOptions.length === 0) return null;
        return (
          <div key={g.key}>
            <div className="px-2 py-1.5 text-xs font-bold text-primary select-none">{g.label}</div>
            {groupOptions.map(o => (
              <OptionItem key={o.value} option={o} selected={value === o.value} onSelect={() => { onValueChange(o.value); setOpen(false); }} />
            ))}
          </div>
        );
      });
    }
    return filtered.map(o => (
      <OptionItem key={o.value} option={o} selected={value === o.value} onSelect={() => { onValueChange(o.value); setOpen(false); }} />
    ));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !selectedLabel && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)] z-[9999]"
        align="start"
        side="bottom"
        avoidCollisions
        collisionPadding={8}
        onWheel={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        onPointerDownOutside={e => e.stopPropagation()}
      >
        <div className="flex items-center border-b px-2">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-0 shadow-none focus-visible:ring-0 text-sm"
          />
        </div>
        <div className="max-h-[40vh] min-h-[120px] overflow-y-auto overscroll-contain touch-pan-y p-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {showAddCustom && (
            <button
              type="button"
              onClick={handleAddCustom}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-3 pr-2 text-sm outline-none hover:bg-primary/10 hover:text-primary text-primary font-medium gap-2"
            >
              <Plus className="h-4 w-4" />
              {customLabel}: "{search.trim()}"
            </button>
          )}
          {filtered.length === 0 && !showAddCustom ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              কোনো ফলাফল নেই
            </div>
          ) : (
            renderOptions()
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const OptionItem = ({ option, selected, onSelect }: { option: SelectOption; selected: boolean; onSelect: () => void }) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
      selected && 'bg-accent'
    )}
  >
    {selected && (
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Check className="h-4 w-4" />
      </span>
    )}
    {option.label}
  </button>
);

export default SearchableSelect;
