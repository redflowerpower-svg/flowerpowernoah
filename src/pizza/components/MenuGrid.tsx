import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { MenuItem } from '../data/menuData';
import ProductModal from './ProductModal';

interface Props {
  items: MenuItem[];
}

export default function MenuGrid({ items }: Props) {
  const [selected, setSelected] = useState<MenuItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group border border-stone-800 hover:border-stone-700 transition-all duration-300 cursor-pointer"
            onClick={() => setSelected(item)}
          >
            <div className="relative h-44 overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.35)' }}
              >
                <div className="w-10 h-10 bg-red-700 flex items-center justify-center">
                  <Plus size={20} className="text-white" />
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-light leading-snug" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.05rem' }}>
                    {item.name}
                  </p>
                  <p className="text-stone-500 text-xs mt-0.5">{item.nameTh}</p>
                </div>
                <p className="text-red-400 text-sm font-light flex-shrink-0 mt-0.5">{item.price} ฿</p>
              </div>
              <p className="text-stone-500 text-xs leading-relaxed line-clamp-2 mt-2">{item.description}</p>
              {(item.extras?.length || item.variants?.length) ? (
                <p className="text-xs text-stone-600 mt-2 italic">
                  {item.variants?.length ? 'Size options · ' : ''}
                  {item.extras?.length ? `${item.extras.length} extras available` : ''}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {selected && <ProductModal item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
