import { Clock, UtensilsCrossed } from 'lucide-react';

const menu = [
  {
    category: 'Breakfast',
    items: [
      { name: 'Italian Colazione', desc: 'Espresso, cornetto, fresh orange juice — the authentic Italian morning start.' },
      { name: 'Full English / Irish Breakfast', desc: 'Eggs, bacon, sausages, toast, tomato, and beans for a hearty start.' },
      { name: 'Fresh Fruit Platter', desc: 'Seasonal tropical fruits — mango, papaya, pineapple, and more.' },
    ],
  },
  {
    category: 'Pizza',
    items: [
      { name: 'Margherita', desc: 'San Marzano tomato, fresh fior di latte, basil, extra virgin olive oil.' },
      { name: 'Diavola', desc: 'Spicy salami, mozzarella, tomato, chilli.' },
      { name: 'Quattro Stagioni', desc: 'Artichoke, ham, mushrooms, olives — four seasons on one pizza.' },
      { name: 'Vegetariana', desc: 'Seasonal grilled vegetables, mozzarella, fresh tomato.' },
    ],
  },
  {
    category: 'Pasta & Mains',
    items: [
      { name: 'Spaghetti al Pomodoro', desc: 'Classic tomato sauce with fresh basil and parmesan.' },
      { name: 'Penne all\'Arrabbiata', desc: 'Spicy tomato and garlic sauce — Roman tradition.' },
      { name: 'Risotto ai Funghi', desc: 'Creamy arborio rice with forest mushrooms and white wine.' },
      { name: 'Branzino al Forno', desc: 'Oven-baked sea bass, herbs, lemon, and capers.' },
    ],
  },
];

export default function RestaurantSection() {
  return (
    <section className="py-24 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-amber-600 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              Authentic Italian Cuisine
            </p>
            <h2
              className="text-stone-800 mb-5"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 300, lineHeight: 1.1 }}
            >
              Italy on the<br /><em>shores of Koh Phayam</em>
            </h2>
            <div className="w-10 h-px bg-amber-500 mb-6" />
            <p className="text-stone-500 text-sm leading-relaxed mb-6">
              Our restaurant serves 100% authentic Italian cuisine — from wood-fired pizza to handmade pasta and classic mains. Open daily for breakfast, lunch, and dinner all year round.
            </p>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <Clock size={14} className="text-amber-600" />
                <span>08:00 – 21:15 daily</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <UtensilsCrossed size={14} className="text-amber-600" />
                <span>Breakfast · Lunch · Dinner</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="Italian cuisine"
              className="w-full h-72 object-cover"
            />
            <img
              src="https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=400"
              alt="Wood fired pizza"
              className="absolute -bottom-8 -left-8 w-40 h-40 object-cover border-4 border-white shadow-xl hidden lg:block"
            />
          </div>
        </div>

        {/* Menu highlights */}
        <div className="mt-16">
          <h3
            className="text-center text-stone-700 mb-10"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.8rem', fontWeight: 300 }}
          >
            Menu Highlights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {menu.map((cat, i) => (
              <div key={i} className="bg-white p-8 border border-stone-100">
                <h4
                  className="text-amber-700 mb-5 pb-3 border-b border-stone-100"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.1rem', fontWeight: 400, letterSpacing: '0.05em' }}
                >
                  {cat.category}
                </h4>
                <ul className="space-y-5">
                  {cat.items.map((item, j) => (
                    <li key={j}>
                      <p className="text-stone-800 text-sm font-medium mb-0.5">{item.name}</p>
                      <p className="text-stone-400 text-xs leading-relaxed">{item.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-stone-400 text-xs mt-8 italic">
            Menu items are indicative. Seasonal availability may vary. Ask our team for daily specials.
          </p>
        </div>
      </div>
    </section>
  );
}
