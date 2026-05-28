import { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import type { MenuItem, ExtraOption, Variant } from '../data/menuData';
import { useCartStore } from '../store/cartStore';

interface Props {
  item: MenuItem;
  onClose: () => void;
}

export default function ProductModal({ item, onClose }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(item.variants?.[0] ?? null);
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);
  const [quantity, setQuantity] = useState(1);

  const variantMod = selectedVariant?.priceModifier ?? 0;
  const extrasTotal = selectedExtras.reduce((s, e) => s + e.price, 0);
  const unitPrice = item.price + variantMod + extrasTotal;
  const totalPrice = unitPrice * quantity;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleExtra = (extra: ExtraOption) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const handleAdd = () => {
    addItem({
      productId: item.id,
      name: item.name,
      nameTh: item.nameTh,
      quantity,
      basePrice: item.price,
      selectedVariant,
      selectedExtras,
      image: item.image,
    });
    onClose();
    openCart();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-lg bg-stone-900 sm:rounded-none overflow-hidden"
        style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="relative h-48 sm:h-56 flex-shrink-0 overflow-hidden">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black bg-opacity-50 flex items-center justify-center text-white hover:bg-opacity-80 transition-all"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-4 left-4">
            <p className="text-white font-light" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.5rem' }}>
              {item.name}
            </p>
            <p className="text-stone-300 text-xs mt-0.5">{item.nameTh}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <p className="text-stone-400 text-sm leading-relaxed">{item.description}</p>
          <p className="text-stone-500 text-xs">{item.descriptionTh}</p>

          {item.variants && item.variants.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-400 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                Size / ขนาด
              </p>
              <div className="flex gap-2 flex-wrap">
                {item.variants.map((v) => {
                  const active = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className="px-4 py-2 text-xs transition-all duration-150"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        border: active ? '1px solid #b91c1c' : '1px solid rgba(255,255,255,0.15)',
                        background: active ? 'rgba(185,28,28,0.15)' : 'transparent',
                        color: active ? '#fca5a5' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {v.name}
                      {v.priceModifier > 0 && <span className="ml-1 text-stone-400">+{v.priceModifier}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {item.extras && item.extras.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-400 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                Extras / เพิ่มเติม
              </p>
              <div className="space-y-2">
                {item.extras.map((extra) => {
                  const checked = !!selectedExtras.find((e) => e.id === extra.id);
                  return (
                    <button
                      key={extra.id}
                      onClick={() => toggleExtra(extra)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-150"
                      style={{
                        border: checked ? '1px solid #b91c1c' : '1px solid rgba(255,255,255,0.1)',
                        background: checked ? 'rgba(185,28,28,0.1)' : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
                          style={{
                            border: checked ? '1px solid #b91c1c' : '1px solid rgba(255,255,255,0.3)',
                            background: checked ? '#b91c1c' : 'transparent',
                          }}
                        >
                          {checked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <span className="text-white text-sm">{extra.name}</span>
                          <span className="text-stone-500 text-xs ml-2">{extra.nameTh}</span>
                        </div>
                      </div>
                      {extra.price > 0 ? (
                        <span className="text-red-400 text-sm font-light">+{extra.price} ฿</span>
                      ) : (
                        <span className="text-stone-500 text-xs">Free</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-5 border-t border-stone-800 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 border border-stone-700 flex items-center justify-center text-stone-400 hover:border-red-700 hover:text-red-400 transition-all"
            >
              <Minus size={14} />
            </button>
            <span className="text-white w-6 text-center text-sm">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 border border-stone-700 flex items-center justify-center text-stone-400 hover:border-red-700 hover:text-red-400 transition-all"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 flex items-center justify-between px-5 py-3 bg-red-700 text-white text-xs tracking-widest uppercase hover:bg-red-800 transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={14} />
              Add to Cart
            </span>
            <span className="font-light">{totalPrice} ฿</span>
          </button>
        </div>
      </div>
    </div>
  );
}
