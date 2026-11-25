import { useEffect, useId, useRef, useState } from 'react';
import { CATEGORIES } from '../lib/categories';

type Props = {
  selected: string[]; // category ids; empty means all
  onChange: (selected: string[]) => void;
};

// What the button says: nothing checked is "All categories", one or two are named, more are counted.
function buttonText(selected: string[]): string {
  if (selected.length === 0) return 'All categories';
  if (selected.length > 2) return `${selected.length} categories`;
  return CATEGORIES.filter((c) => selected.includes(c.id))
    .map((c) => c.label)
    .join(', ');
}

export default function CategoryFilter({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  function toggleCategory(id: string, checked: boolean) {
    // Reported in the order of the list, not in the order of the clicks.
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(CATEGORIES.filter((c) => next.has(c.id)).map((c) => c.id));
  }

  return (
    <div
      ref={rootRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        {buttonText(selected)}
      </button>

      {open && (
        <div id={panelId}>
          <fieldset>
            <legend>Categories</legend>
            {CATEGORIES.map((category) => (
              <div key={category.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(category.id)}
                    onChange={(e) => toggleCategory(category.id, e.target.checked)}
                  />{' '}
                  {category.label}
                </label>
              </div>
            ))}
          </fieldset>
          <button type="button" disabled={selected.length === 0} onClick={() => onChange([])}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
