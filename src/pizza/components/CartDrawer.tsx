import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore, calcItemTotal } from '../store/cartStore';

interface Props {
  onCheckout: () => void;
}

export default function CartDrawer({ onCheckout }: Props) {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotal } = useCartStore();
  const total = getTotal();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={closeCart}
        />
      )}

      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col w-full max-w-[420px]"
        style={{
          background: '#1c1917',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-red-500" />
            <span className="text-white text-sm tracking-widest uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
              Your Order
            </span>
            {items.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-700 flex items-center justify-center text-white text-xs">
                {items.length}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="text-stone-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag size={36} className="text-stone-700 mx-auto mb-4" />
              <p className="text-stone-500 text-sm">Your cart is empty</p>
              <p className="text-stone-600 text-xs mt-1">Add items from our menu</p>
            </div>
          ) : (
            items.map((item) => {
              const lineTotal = calcItemTotal(item);
              return (
                <div key={item.cartId} className="border border-stone-800 p-4">
                  <div className="flex gap-3">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white text-sm" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1rem' }}>
                            {item.name}
                          </p>
                          <p className="text-stone-500 text-xs">{item.nameTh}</p>
                        </div>
                        <button onClick={() => removeItem(item.cartId)} className="text-stone-600 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {item.selectedVariant && (
                        <p className="text-stone-500 text-xs mt-1">
                          {item.selectedVariant.name}
                          {item.selectedVariant.priceModifier > 0 && ` +${item.selectedVariant.priceModifier}฿`}
                        </p>
                      )}

                      {item.selectedExtras.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.selectedExtras.map((e) => (
                            <p key={e.id} className="text-stone-600 text-xs">
                              + {e.name} {e.price > 0 ? `+${e.price}฿` : ''}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                            className="w-6 h-6 border border-stone-700 flex items-center justify-center text-stone-400 hover:border-red-700 hover:text-red-400 transition-all"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="text-white text-xs w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                            className="w-6 h-6 border border-stone-700 flex items-center justify-center text-stone-400 hover:border-red-700 hover:text-red-400 transition-all"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <p className="text-red-400 text-sm">{lineTotal} ฿</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-stone-800 px-4 sm:px-6 py-5 space-y-4">
            <div className="flex justify-between items-center gap-2">
              <span className="text-stone-400 text-xs uppercase tracking-widest flex-shrink-0" style={{ fontFamily: 'Inter, sans-serif' }}>
                Total
              </span>
              <span className="text-white text-lg font-light text-right" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                {total} ฿
              </span>
            </div>
            <button
              onClick={() => { closeCart(); onCheckout(); }}
              className="w-full py-4 bg-red-700 text-white text-xs tracking-widest uppercase hover:bg-red-800 transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Proceed to Checkout
            </button>
            <p className="text-center text-stone-600 text-xs">
              Payment via PromptPay · Photo confirmation required
            </p>
          </div>
        )}
      </div>
    </>
  );
}
