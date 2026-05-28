import { useRef } from 'react';
import type { MenuCategory } from '../data/menuData';

interface Props {
  categories: MenuCategory[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function CategoryTabs({ categories, activeId, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="sticky top-16 z-30 bg-stone-950 border-b border-stone-800">
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto px-4 py-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((cat) => {
          const active = cat.id === activeId;
          return (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs tracking-wider uppercase transition-all duration-200"
              style={{
                fontFamily: 'Inter, sans-serif',
                background: active ? '#b91c1c' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                border: active ? '1px solid #b91c1c' : '1px solid rgba(255,255,255,0.1)',
                letterSpacing: '0.08em',
              }}
            >
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.name}</span>
              <span className="sm:hidden">{cat.nameTh}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
