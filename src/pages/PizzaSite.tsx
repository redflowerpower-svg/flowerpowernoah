import { useState, useEffect } from 'react';
import { ArrowLeft, Menu, X, Clock, Phone, Mail, MapPin, Instagram, Facebook, Star, ShoppingCart } from 'lucide-react';
import DeliveryMenu from '../pizza/pages/DeliveryMenu';
import { useCartStore } from '../pizza/store/cartStore';

interface Props {
  onBack: () => void;
}

type PizzaPage = 'home' | 'menu' | 'order' | 'about' | 'contact';

const pizzaMenu = [
  {
    category: 'Antipasti',
    items: [
      { name: 'Bruschetta al Pomodoro', desc: 'Toasted sourdough, ripe tomato, basil, extra virgin olive oil' },
      { name: 'Tagliere Misto', desc: 'Selection of Italian cured meats, cheese, olives, and grissini' },
      { name: 'Caprese', desc: 'Buffalo mozzarella, heritage tomato, fresh basil, olive oil' },
    ],
  },
  {
    category: 'Pizza',
    items: [
      { name: 'Margherita', desc: 'San Marzano tomato, fior di latte, fresh basil, olive oil' },
      { name: 'Marinara', desc: 'Tomato, garlic, oregano, extra virgin olive oil — the original' },
      { name: 'Diavola', desc: 'Spicy Calabrian salami, mozzarella, tomato, chilli' },
      { name: 'Quattro Formaggi', desc: 'Mozzarella, gorgonzola, taleggio, parmesan' },
      { name: 'Prosciutto e Funghi', desc: 'Prosciutto cotto, champignon mushrooms, mozzarella, tomato' },
      { name: 'Vegetariana', desc: 'Grilled courgette, roasted peppers, aubergine, mozzarella' },
      { name: 'Quattro Stagioni', desc: 'Artichoke, ham, mushrooms, black olives — four seasons' },
      { name: 'Salmone', desc: 'Smoked salmon, capers, cream cheese, red onion' },
    ],
  },
  {
    category: 'Pasta',
    items: [
      { name: 'Spaghetti Carbonara', desc: 'Guanciale, egg yolk, pecorino romano, black pepper' },
      { name: "Penne all'Arrabbiata", desc: 'Spicy tomato, garlic, parsley — classic Roman' },
      { name: 'Rigatoni al Ragù', desc: 'Slow-cooked beef and pork ragù, parmesan' },
      { name: 'Linguine allo Scoglio', desc: 'Mixed seafood, cherry tomato, white wine, garlic' },
    ],
  },
  {
    category: 'Dolci',
    items: [
      { name: 'Tiramisù', desc: 'Classic recipe — mascarpone, espresso, ladyfingers, cocoa' },
      { name: 'Panna Cotta', desc: 'Vanilla cream, seasonal berry coulis' },
      { name: 'Gelato Artigianale', desc: "Ask our team for today's flavours" },
    ],
  },
];

function PizzaNav({ activePage, onNavigate, onBack }: { activePage: PizzaPage; onNavigate: (p: PizzaPage) => void; onBack: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const cartCount = useCartStore((s) => s.getCount());
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(28,25,23,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs tracking-widest uppercase transition-opacity hover:opacity-60"
            style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter, sans-serif' }}
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="absolute left-1/2 -translate-x-1/2 text-center"
          >
            <div
              className="leading-tight"
              style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontWeight: 300,
                fontSize: '0.75rem',
                color: 'white',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              Flower Power
              <br />
              <em style={{ fontSize: '0.7rem' }}>Pizza Ranong</em>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-6">
            {(['home', 'menu', 'order', 'about', 'contact'] as PizzaPage[]).map(p => (
              <button
                key={p}
                onClick={() => onNavigate(p)}
                className="text-xs tracking-widest uppercase transition-opacity hover:opacity-60 capitalize"
                style={{
                  color: p === 'order' ? '#fca5a5' : 'rgba(255,255,255,0.8)',
                  fontFamily: 'Inter, sans-serif',
                  borderBottom: activePage === p ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                  paddingBottom: '2px',
                }}
              >
                {p === 'order' ? 'Order' : p}
              </button>
            ))}
            {cartCount > 0 && (
              <button
                onClick={openCart}
                className="relative flex items-center text-white hover:text-red-400 transition-colors"
              >
                <ShoppingCart size={18} />
                <span
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white"
                  style={{ fontSize: '9px' }}
                >
                  {cartCount}
                </span>
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center gap-3">
            {cartCount > 0 && (
              <button onClick={openCart} className="relative text-white">
                <ShoppingCart size={18} />
                <span
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white"
                  style={{ fontSize: '9px' }}
                >
                  {cartCount}
                </span>
              </button>
            )}
            <button className="text-white" onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center" style={{ background: '#1c1917' }}>
          <button className="absolute top-5 right-6 text-white" onClick={() => setOpen(false)}>
            <X size={24} />
          </button>
          {(['home', 'menu', 'order', 'about', 'contact'] as PizzaPage[]).map(p => (
            <button
              key={p}
              onClick={() => { onNavigate(p); setOpen(false); }}
              className="text-xl tracking-widest uppercase my-4 capitalize font-light hover:opacity-60 transition-opacity"
              style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                color: p === 'order' ? '#fca5a5' : 'white',
              }}
            >
              {p === 'order' ? 'Order Online' : p}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function PizzaHero({ onNavigate }: { onNavigate: (p: PizzaPage) => void }) {
  return (
    <section className="relative h-screen min-h-[600px] overflow-hidden">
      <img
        src="https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=1920"
        alt="Flower Power Pizza Ranong"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
        <p
          className="text-xs tracking-[0.45em] uppercase mb-5 animate-fade-in-up"
          style={{ fontFamily: 'Inter, sans-serif', opacity: 0.75, animationDelay: '0.1s' }}
        >
          Ranong · Thailand
        </p>
        <h1
          className="mb-4 animate-fade-in-up"
          style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontWeight: 300,
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            lineHeight: 1.05,
            animationDelay: '0.2s',
          }}
        >
          Flower Power<br />
          <em>Pizza Ranong</em>
        </h1>
        <div className="w-16 h-px bg-white mx-auto mb-5 animate-fade-in-up" style={{ opacity: 0.4, animationDelay: '0.35s' }} />
        <p
          className="text-sm tracking-[0.2em] uppercase font-light mb-10 animate-fade-in-up"
          style={{ opacity: 0.7, animationDelay: '0.45s', fontFamily: 'Inter, sans-serif' }}
        >
          Authentic Italian · Open Daily 08:00 – 21:15
        </p>
        <div className="flex gap-4 flex-wrap justify-center animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <button
            onClick={() => onNavigate('order')}
            className="px-9 py-3.5 bg-red-700 text-white text-xs tracking-[0.2em] uppercase hover:bg-red-800 transition-colors duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Order Online
          </button>
          <button
            onClick={() => onNavigate('menu')}
            className="px-9 py-3.5 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            View Menu
          </button>
        </div>
      </div>
    </section>
  );
}

function PizzaMenuPage() {
  return (
    <section className="pt-24 pb-20 bg-stone-950 min-h-screen">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.4em] uppercase text-red-500 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Flower Power Pizza Ranong
          </p>
          <h2
            className="text-white mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 300 }}
          >
            Our Menu
          </h2>
          <div className="w-12 h-px bg-red-700 mx-auto mb-5" />
          <p className="text-stone-400 text-sm">Open daily 08:00 – 21:15 · Breakfast, Lunch & Dinner</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {pizzaMenu.map((cat, i) => (
            <div key={i} className="border border-stone-800 p-8">
              <h3
                className="text-red-500 mb-6 pb-4 border-b border-stone-800"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.2rem', fontWeight: 400, letterSpacing: '0.08em' }}
              >
                {cat.category}
              </h3>
              <ul className="space-y-5">
                {cat.items.map((item, j) => (
                  <li key={j}>
                    <p className="text-white text-sm font-medium mb-0.5">{item.name}</p>
                    <p className="text-stone-500 text-xs leading-relaxed">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-stone-600 text-xs mt-10 italic">
          All our pizzas are made with authentic Italian dough, San Marzano tomatoes, and imported cheeses.
        </p>
      </div>
    </section>
  );
}

function PizzaAboutPage() {
  return (
    <section className="pt-24 pb-20 bg-stone-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.4em] uppercase text-red-500 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Our Story
          </p>
          <h2
            className="text-white mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
          >
            Italian Heart, Thai Soul
          </h2>
          <div className="w-12 h-px bg-red-700 mx-auto" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-14">
          <img
            src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="Italian cooking"
            className="w-full h-72 object-cover"
          />
          <div>
            <p className="text-stone-300 text-sm leading-relaxed mb-4">
              Flower Power Pizza Ranong brings the flavours of Italy to the heart of Ranong Province. Born from the same passion that created the Flower Power Farm Village & Spa on Koh Phayam, our pizzeria is a celebration of authentic Italian food craftsmanship.
            </p>
            <p className="text-stone-400 text-sm leading-relaxed mb-6">
              Every pizza is made with imported Italian flour, slow-fermented dough, and the finest ingredients shipped directly from Italy.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Open', value: 'All year round' },
                { label: 'Hours', value: '08:00 – 21:15' },
                { label: 'Meals', value: 'Breakfast · Lunch · Dinner' },
                { label: 'Cuisine', value: '100% Italian' },
              ].map((f, i) => (
                <div key={i} className="border border-stone-800 p-4">
                  <p className="text-stone-500 text-xs mb-1">{f.label}</p>
                  <p className="text-white text-sm">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "Best pizza I've had outside of Naples. The dough is perfect, light yet crispy.", author: 'Marco V.' },
            { quote: 'Incredible to find this level of authentic Italian food in Ranong. Highly recommended!', author: 'Sarah L.' },
            { quote: "The carbonara is outstanding. This is the real thing, not a Thai-Italian fusion.", author: 'Giovanni R.' },
          ].map((r, i) => (
            <div key={i} className="border border-stone-800 p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={12} className="text-amber-500 fill-amber-500" />
                ))}
              </div>
              <p className="text-stone-300 text-sm italic leading-relaxed mb-3">"{r.quote}"</p>
              <p className="text-stone-500 text-xs">— {r.author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PizzaContactPage() {
  return (
    <section className="pt-24 pb-20 bg-stone-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.4em] uppercase text-red-500 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Visit Us
          </p>
          <h2
            className="text-white mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
          >
            Find Flower Power Pizza
          </h2>
          <div className="w-12 h-px bg-red-700 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-stone-800 p-8 space-y-6">
            {[
              { Icon: MapPin, label: 'Location', value: 'Ranong Province, Thailand', sub: 'Ask us for exact directions' },
              { Icon: Clock, label: 'Opening Hours', value: 'Daily · 08:00 – 21:15', sub: 'Open all year round' },
            ].map(({ Icon, label, value, sub }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-9 h-9 bg-red-900 bg-opacity-40 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-red-500" />
                </div>
                <div>
                  <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-white text-sm">{value}</p>
                  <p className="text-stone-500 text-xs mt-1">{sub}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 bg-red-900 bg-opacity-40 flex items-center justify-center shrink-0">
                <Phone size={15} className="text-red-500" />
              </div>
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Phone</p>
                <a href="tel:+66958825573" className="text-red-400 text-sm hover:text-red-300 transition-colors">
                  +66 95 882 5573
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 bg-red-900 bg-opacity-40 flex items-center justify-center shrink-0">
                <Mail size={15} className="text-red-500" />
              </div>
              <div>
                <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Email</p>
                <a href="mailto:flowerpowerphayam@gmail.com" className="text-red-400 text-sm hover:text-red-300 transition-colors">
                  flowerpowerphayam@gmail.com
                </a>
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <a href="https://www.instagram.com/flowerpowerphayam" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 border border-stone-700 text-stone-400 text-xs hover:border-red-700 hover:text-red-400 transition-all">
                <Instagram size={14} /> Instagram
              </a>
              <a href="https://www.facebook.com/flowerpowerphayam" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 border border-stone-700 text-stone-400 text-xs hover:border-red-700 hover:text-red-400 transition-all">
                <Facebook size={14} /> Facebook
              </a>
            </div>
          </div>
          <img
            src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="Inside Flower Power Pizza"
            className="w-full object-cover"
            style={{ minHeight: '300px' }}
          />
        </div>
      </div>
    </section>
  );
}

function PizzaHomePage({ onNavigate }: { onNavigate: (p: PizzaPage) => void }) {
  return (
    <>
      <PizzaHero onNavigate={onNavigate} />

      <section className="py-16 bg-stone-900">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-stone-800">
          {[
            { label: '100% Italian', sub: 'Every ingredient sourced with care' },
            { label: 'Daily Fresh', sub: 'Dough made fresh every morning' },
            { label: 'Open All Year', sub: 'Breakfast through dinner daily' },
            { label: 'Order Online', sub: 'Delivery & pickup available' },
          ].map((f, i) => (
            <div key={i} className="bg-stone-900 p-7 text-center">
              <p className="text-white mb-1.5" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.2rem', fontWeight: 400 }}>
                {f.label}
              </p>
              <p className="text-stone-500 text-xs">{f.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-stone-950">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.4em] uppercase text-red-500 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
              Our Specialties
            </p>
            <h2 className="text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}>
              From Naples to Ranong
            </h2>
            <div className="w-12 h-px bg-red-700 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Pizza Napoletana', desc: 'Hand-stretched dough, slow-fermented 48 hours, topped with the finest Italian ingredients.', img: 'https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { title: 'Pasta Artigianale', desc: 'Classic Roman and Northern Italian pasta dishes made from scratch with imported Italian pasta.', img: 'https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=600' },
              { title: 'Italian Breakfast', desc: 'Start your day the Italian way — espresso, freshly baked cornetti, and seasonal fruit.', img: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600' },
            ].map((item, i) => (
              <div key={i} className="group overflow-hidden border border-stone-800 hover:border-red-900 transition-colors duration-300">
                <div className="h-52 overflow-hidden">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6">
                  <h3 className="text-white mb-2" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.2rem', fontWeight: 400 }}>
                    {item.title}
                  </h3>
                  <p className="text-stone-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10 flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => onNavigate('order')}
              className="px-10 py-3.5 bg-red-700 text-white text-xs tracking-[0.2em] uppercase hover:bg-red-800 transition-colors duration-300"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Order Online
            </button>
            <button
              onClick={() => onNavigate('menu')}
              className="px-10 py-3.5 border border-red-800 text-red-400 text-xs tracking-[0.2em] uppercase hover:bg-red-900 hover:text-white transition-all duration-300"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Full Menu
            </button>
          </div>
        </div>
      </section>

      <section className="py-14 bg-red-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h3 className="text-white mb-3" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2rem', fontWeight: 300 }}>
            Come taste <em>the real Italy</em>
          </h3>
          <p className="text-red-200 text-sm mb-6">Open daily · 08:00 – 21:15 · Ranong Province, Thailand</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="tel:+66958825573"
              className="inline-block px-8 py-3 border border-red-300 text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-red-800 transition-all duration-300"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Call +66 95 882 5573
            </a>
            <button onClick={() => onNavigate('order')}
              className="inline-block px-8 py-3 bg-white text-red-800 text-xs tracking-[0.2em] uppercase hover:bg-red-100 transition-all duration-300"
              style={{ fontFamily: 'Inter, sans-serif' }}>
              Order Now
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export default function PizzaSite({ onBack }: Props) {
  const [activePage, setActivePage] = useState<PizzaPage>('home');

  const navigate = (page: PizzaPage) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePage]);

  const renderPage = () => {
    switch (activePage) {
      case 'menu': return <PizzaMenuPage />;
      case 'order': return <DeliveryMenu />;
      case 'about': return <PizzaAboutPage />;
      case 'contact': return <PizzaContactPage />;
      default: return <PizzaHomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#1c1917' }}>
      <PizzaNav activePage={activePage} onNavigate={navigate} onBack={onBack} />
      <main>{renderPage()}</main>

      <footer className="bg-stone-950 border-t border-stone-900 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-stone-500 text-sm italic" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Flower Power Pizza Ranong
          </div>
          <div className="flex gap-6">
            {(['home', 'menu', 'order', 'about', 'contact'] as PizzaPage[]).map(p => (
              <button key={p} onClick={() => navigate(p)}
                className="text-xs text-stone-600 uppercase tracking-wide hover:text-red-400 transition-colors capitalize">
                {p}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-700">© {new Date().getFullYear()} Flower Power · Ranong, Thailand</p>
        </div>
      </footer>
    </div>
  );
}
