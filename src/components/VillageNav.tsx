import { useState, useEffect } from 'react';
import { Menu, X, ArrowLeft } from 'lucide-react';

interface Props {
  onBack: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { label: 'Home', id: 'home' },
  { label: 'Accommodations', id: 'accommodations' },
  { label: 'Restaurant', id: 'restaurant' },
  { label: 'Spa', id: 'spa' },
  { label: 'Activities', id: 'activities' },
  { label: 'Gallery', id: 'gallery' },
  { label: 'Contact', id: 'contact' },
];

export default function VillageNav({ onBack, activePage, onNavigate }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
          boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs tracking-widest uppercase transition-colors duration-200 hover:opacity-70"
            style={{ color: scrolled ? '#78716c' : 'rgba(255,255,255,0.8)' }}
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Home</span>
          </button>

          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="absolute left-1/2 -translate-x-1/2 text-center"
          >
            <div
              className="text-sm font-light tracking-[0.2em] uppercase leading-tight transition-colors duration-300"
              style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                color: scrolled ? '#44403c' : 'white',
                fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
              }}
            >
              Flower Power
              <br />
              <span className="italic">Farm Village & Spa</span>
            </div>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-7">
            {navItems.filter(i => i.id !== 'home').map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="text-xs tracking-widest uppercase transition-all duration-200 hover:opacity-70 pb-0.5"
                style={{
                  color: scrolled ? (activePage === item.id ? '#44403c' : '#78716c') : 'rgba(255,255,255,0.85)',
                  borderBottom: activePage === item.id ? `1px solid ${scrolled ? '#c5a572' : 'rgba(255,255,255,0.6)'}` : '1px solid transparent',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Mobile menu */}
          <button
            className="lg:hidden transition-colors duration-200"
            style={{ color: scrolled ? '#44403c' : 'white' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-stone-900 bg-opacity-97 flex flex-col items-center justify-center">
          {/* Pulsante di chiusura con area touch adeguata */}
          <button
            className="absolute top-4 right-5 text-white w-11 h-11 flex items-center justify-center"
            onClick={() => setMenuOpen(false)}
            aria-label="Chiudi menu"
          >
            <X size={24} />
          </button>
          <div className="flex flex-col items-center gap-7 px-6 w-full max-w-xs">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMenuOpen(false); }}
                className="text-white text-xl tracking-[0.25em] uppercase font-light hover:opacity-60 transition-opacity py-1 w-full text-center"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
