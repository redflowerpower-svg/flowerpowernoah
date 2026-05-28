import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { menuData } from '../data/menuData';
import CategoryTabs from '../components/CategoryTabs';
import MenuGrid from '../components/MenuGrid';
import CartDrawer from '../components/CartDrawer';
import CheckoutFlow from '../components/CheckoutFlow';
import { useCartStore } from '../store/cartStore';

export default function DeliveryMenu() {
  const [activeCategoryId, setActiveCategoryId] = useState(menuData[0].id);
  const [showCheckout, setShowCheckout] = useState(false);
  const { getCount, getTotal, openCart } = useCartStore();
  const count = getCount();
  const total = getTotal();

  const activeCategory = menuData.find((c) => c.id === activeCategoryId) ?? menuData[0];

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="pt-16 px-6 pb-4" style={{ background: '#1c1917' }}>
        <div className="max-w-6xl mx-auto pt-6">
          <p className="text-xs tracking-[0.4em] uppercase text-red-500 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            Online Order · Delivery & Pickup
          </p>
          <h2 className="text-white font-light" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
            Order Online
          </h2>
          <p className="text-stone-500 text-sm mt-1">สั่งซื้อออนไลน์ · จัดส่งหรือรับที่ร้าน</p>
        </div>
      </div>

      <CategoryTabs categories={menuData} activeId={activeCategoryId} onChange={setActiveCategoryId} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h3 className="text-white font-light" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem' }}>
            {activeCategory.name}
            <span className="text-stone-500 text-sm ml-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              {activeCategory.nameTh}
            </span>
          </h3>
          <div className="w-8 h-px bg-red-800 mt-2" />
        </div>
        <MenuGrid items={activeCategory.items} />
      </div>

      {count > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 px-4">
          <button
            onClick={openCart}
            className="flex items-center gap-4 px-6 py-4 bg-red-700 text-white shadow-2xl hover:bg-red-800 transition-all duration-300"
            style={{ minWidth: '280px', maxWidth: '420px', width: '100%' }}
          >
            <div className="flex items-center gap-2 flex-1">
              <ShoppingCart size={18} />
              <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                {count} {count === 1 ? 'item' : 'items'} in cart
              </span>
            </div>
            <span className="font-light">{total} ฿</span>
          </button>
        </div>
      )}

      <CartDrawer onCheckout={() => setShowCheckout(true)} />

      {showCheckout && (
        <CheckoutFlow onClose={() => setShowCheckout(false)} onSuccess={() => setShowCheckout(false)} />
      )}

      {count > 0 && <div className="h-24" />}
    </div>
  );
}
