import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export interface AutocompleteOption {
  id: string;
  code: string;
  label: string;
  subtitle?: string;
  badge?: string;
  color?: string;
}

interface AutocompleteCellProps {
  value: string; // The display label or code
  selectedId: string;
  options: AutocompleteOption[];
  placeholder?: string;
  hasError?: boolean;
  errorMessage?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  onChange: (option: AutocompleteOption | null, rawText: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}

export const AutocompleteCell: React.FC<AutocompleteCellProps> = ({
  value,
  selectedId,
  options,
  placeholder = 'Nhập...',
  hasError = false,
  errorMessage,
  autoFocus = false,
  inputRef: externalRef,
  onChange,
  onKeyDown,
  onBlur,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const internalRef = useRef<HTMLInputElement>(null);
  const activeInputRef = externalRef || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputText(value);
  }, [value]);

  // Filter options based on typed input
  const filteredOptions = React.useMemo(() => {
    if (!inputText || !inputText.trim()) return options.slice(0, 15);
    const q = inputText.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.code.toLowerCase().includes(q) ||
        opt.label.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [options, inputText]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectOption = (opt: AutocompleteOption) => {
    setInputText(opt.label);
    setIsOpen(false);
    onChange(opt, opt.label);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    setIsOpen(true);

    // Direct exact match
    const exactMatch = options.find(
      (opt) => opt.code.toLowerCase() === val.trim().toLowerCase() || opt.label.toLowerCase() === val.trim().toLowerCase()
    );
    onChange(exactMatch || null, val);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
        return;
      }
      if (e.key === 'Enter') {
        if (filteredOptions.length > 0 && highlightedIndex >= 0) {
          e.preventDefault();
          const selected = filteredOptions[highlightedIndex];
          handleSelectOption(selected);
          // pass keydown to parent for cell navigation
          if (onKeyDown) onKeyDown(e);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center">
      <input
        ref={activeInputRef}
        type="text"
        value={inputText}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleCellKeyDown}
        onBlur={() => {
          if (onBlur) onBlur();
        }}
        className={clsx(
          'w-full h-full px-2.5 py-1.5 bg-transparent text-xs text-white placeholder-slate-500 font-medium focus:outline-none transition-all',
          hasError && 'bg-rose-950/30 text-rose-300 ring-1 ring-inset ring-rose-500'
        )}
      />

      {/* Error Tooltip */}
      {hasError && errorMessage && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-rose-400 font-medium bg-rose-950 px-1 py-0.5 rounded border border-rose-800/80 pointer-events-none">
          {errorMessage}
        </span>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 py-1 divide-y divide-slate-800/60 backdrop-blur-md">
          {filteredOptions.map((opt, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const isSelected = opt.id === selectedId;

            return (
              <div
                key={opt.id}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur before select
                  handleSelectOption(opt);
                }}
                className={clsx(
                  'px-3 py-1.5 cursor-pointer flex items-center justify-between text-xs transition-colors',
                  isHighlighted ? 'bg-brand-600/30 text-white' : 'text-slate-300 hover:bg-slate-800/80',
                  isSelected && 'font-semibold text-brand-300'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  <span className="font-mono font-bold text-slate-200">{opt.code}</span>
                  <span className="truncate text-slate-300">{opt.label}</span>
                </div>
                {opt.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                    {opt.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
