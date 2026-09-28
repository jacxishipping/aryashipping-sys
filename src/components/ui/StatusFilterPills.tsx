'use client';

interface StatusOption {
  value: string;
  label: string;
  count?: number;
  color?: string;
}

interface StatusFilterPillsProps {
  options: StatusOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  className?: string;
}

export function StatusFilterPills({
  options,
  selectedValue,
  onSelect,
  className = '',
}: StatusFilterPillsProps) {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none ${className}`}>
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              isSelected
                ? 'bg-[var(--accent-gold)] text-black shadow-sm ring-2 ring-[var(--accent-gold)]/20'
                : 'border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:border-[var(--accent-gold)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--background)]'
            }`}
          >
            {option.color && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: isSelected ? '#000000' : option.color }}
              />
            )}
            <span>{option.label}</span>
            {typeof option.count === 'number' && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isSelected ? 'bg-black/15 text-black' : 'bg-[var(--background)] text-[var(--text-secondary)]'
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default StatusFilterPills;
