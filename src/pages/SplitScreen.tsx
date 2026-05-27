import { useState } from 'react';

interface Props {
  onSelectVillage: () => void;
  onSelectPizza: () => void;
}

function FlowerSvg() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="4" fill="white" />
      <ellipse cx="20" cy="10" rx="3" ry="7" fill="white" opacity="0.7" />
      <ellipse cx="20" cy="30" rx="3" ry="7" fill="white" opacity="0.7" />
      <ellipse cx="10" cy="20" rx="7" ry="3" fill="white" opacity="0.7" />
      <ellipse cx="30" cy="20" rx="7" ry="3" fill="white" opacity="0.7" />
      <ellipse cx="13" cy="13" rx="3" ry="7" fill="white" opacity="0.5" transform="rotate(-45 13 13)" />
      <ellipse cx="27" cy="27" rx="3" ry="7" fill="white" opacity="0.5" transform="rotate(-45 27 27)" />
      <ellipse cx="27" cy="13" rx="3" ry="7" fill="white" opacity="0.5" transform="rotate(45 27 13)" />
      <ellipse cx="13" cy="27" rx="3" ry="7" fill="white" opacity="0.5" transform="rotate(45 13 27)" />
    </svg>
  );
}

function PizzaSvg() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
      <path d="M20 4 L36 34 L4 34 Z" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="18" r="2" fill="white" opacity="0.8" />
      <circle cx="14" cy="26" r="1.5" fill="white" opacity="0.8" />
      <circle cx="26" cy="26" r="1.5" fill="white" opacity="0.8" />
      <path d="M4 34 L36 34" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

// Indicatore chevron per suggerire all'utente mobile di toccare il pannello
function TouchHint({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="opacity-50"
      style={{ transform: direction === 'up' ? 'rotate(180deg)' : 'none' }}
    >
      <path d="M4 7 L10 13 L16 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SplitScreen({ onSelectVillage, onSelectPizza }: Props) {
  // Stato unificato per hover desktop e touch mobile
  const [activePanel, setActivePanel] = useState<'none' | 'village' | 'pizza'>('none');

  const villageExpanded = activePanel === 'village';
  const pizzaExpanded = activePanel === 'pizza';

  // Proporzioni flex identiche su desktop (hover) e mobile (touch)
  const villageFlex = villageExpanded ? '1.6' : pizzaExpanded ? '0.4' : '1';
  const pizzaFlex = pizzaExpanded ? '1.6' : villageExpanded ? '0.4' : '1';

  const handleVillageTouch = () => {
    if (activePanel === 'village') {
      // Secondo tap: naviga
      onSelectVillage();
    } else {
      // Primo tap: espandi pannello
      setActivePanel('village');
    }
  };

  const handlePizzaTouch = () => {
    if (activePanel === 'pizza') {
      onSelectPizza();
    } else {
      setActivePanel('pizza');
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row overflow-hidden">

      {/* ── Pannello Village ── */}
      <div
        className="relative overflow-hidden cursor-pointer"
        style={{
          flex: villageFlex,
          transition: 'flex 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        // Desktop: hover
        onMouseEnter={() => setActivePanel('village')}
        onMouseLeave={() => setActivePanel('none')}
        onClick={onSelectVillage}
        // Mobile: tap gestito separatamente per evitare doppio-fire con onClick
        onTouchStart={e => { e.preventDefault(); handleVillageTouch(); }}
      >
        <img
          src="https://images.pexels.com/photos/1440727/pexels-photo-1440727.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Flower Power Farm Village"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: villageExpanded ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: villageExpanded
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%)',
            transition: 'background 0.7s ease',
          }}
        />

        {/* Contenuto centrato — visibile quando il pannello e espanso o neutro */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-white px-6 md:px-8 text-center"
          style={{
            opacity: pizzaExpanded ? 0 : 1,
            transition: 'opacity 0.4s ease',
            pointerEvents: pizzaExpanded ? 'none' : 'auto',
          }}
        >
          <div className="mb-4 md:mb-6 opacity-70">
            <FlowerSvg />
          </div>

          <p
            className="text-xs tracking-[0.35em] uppercase mb-2 md:mb-3 font-light"
            style={{ fontFamily: 'Inter, sans-serif', opacity: 0.85 }}
          >
            Koh Phayam · Thailand
          </p>

          <h1
            className="leading-tight mb-3 md:mb-4"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 300,
              fontSize: villageExpanded ? 'clamp(2rem, 5vw, 3.5rem)' : 'clamp(1.6rem, 4vw, 2.8rem)',
              transition: 'font-size 0.7s ease',
              lineHeight: 1.1,
            }}
          >
            Flower Power<br />
            <em>Farm Village & Spa</em>
          </h1>

          <div className="w-10 md:w-12 h-px bg-white mx-auto mb-3 md:mb-4" style={{ opacity: 0.5 }} />

          <p
            className="text-xs md:text-sm tracking-widest uppercase font-light mb-5 md:mb-8"
            style={{ opacity: 0.75 }}
          >
            Villas · Bungalows · Spa · Restaurant
          </p>

          <button
            className="px-6 md:px-8 py-2.5 md:py-3 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 active:bg-white active:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Explore Village
          </button>

          {/* Hint tocca ancora su mobile quando il pannello e gia espanso */}
          {villageExpanded && (
            <p className="mt-3 text-white text-xs opacity-50 md:hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
              Tap again to enter
            </p>
          )}
        </div>

        {/* Etichetta verticale quando il pannello e compresso — solo desktop */}
        {pizzaExpanded && (
          <div className="absolute inset-0 items-center justify-center hidden md:flex">
            <span
              className="text-white text-sm tracking-[0.3em] uppercase"
              style={{
                writingMode: 'vertical-rl',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 300,
                opacity: 0.8,
              }}
            >
              Village & Spa
            </span>
          </div>
        )}

        {/* Su mobile: freccia direzionale quando il pannello e compresso */}
        {pizzaExpanded && (
          <div className="absolute inset-0 flex items-center justify-center md:hidden">
            <TouchHint direction="up" />
          </div>
        )}
      </div>

      {/* ── Divisore (linea + cerchio) ── */}
      {/* Desktop: verticale | Mobile: orizzontale. Si muove con i pannelli grazie al flex. */}
      <div
        className="relative z-10 flex items-center justify-center flex-shrink-0"
        style={{
          // Desktop: striscia verticale da 2px; Mobile: striscia orizzontale da 2px
          width: undefined,
        }}
      >
        {/* Linea verticale (desktop) */}
        <div
          className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2"
          style={{ width: '2px', background: 'rgba(255,255,255,0.4)' }}
        />
        {/* Linea orizzontale (mobile) */}
        <div
          className="block md:hidden absolute inset-x-0 top-1/2 -translate-y-1/2"
          style={{ height: '2px', background: 'rgba(255,255,255,0.4)' }}
        />
        {/* Cerchio centrale */}
        <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-20 relative">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" fill="#78716c" />
          </svg>
        </div>
      </div>

      {/* ── Pannello Pizza ── */}
      <div
        className="relative overflow-hidden cursor-pointer"
        style={{
          flex: pizzaFlex,
          transition: 'flex 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={() => setActivePanel('pizza')}
        onMouseLeave={() => setActivePanel('none')}
        onClick={onSelectPizza}
        onTouchStart={e => { e.preventDefault(); handlePizzaTouch(); }}
      >
        <img
          src="https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Flower Power Pizza"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: pizzaExpanded ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: pizzaExpanded
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%)',
            transition: 'background 0.7s ease',
          }}
        />

        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-white px-6 md:px-8 text-center"
          style={{
            opacity: villageExpanded ? 0 : 1,
            transition: 'opacity 0.4s ease',
            pointerEvents: villageExpanded ? 'none' : 'auto',
          }}
        >
          <div className="mb-4 md:mb-6 opacity-70">
            <PizzaSvg />
          </div>

          <p
            className="text-xs tracking-[0.35em] uppercase mb-2 md:mb-3 font-light"
            style={{ fontFamily: 'Inter, sans-serif', opacity: 0.85 }}
          >
            Ranong · Thailand
          </p>

          <h1
            className="leading-tight mb-3 md:mb-4"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 300,
              fontSize: pizzaExpanded ? 'clamp(2rem, 5vw, 3.5rem)' : 'clamp(1.6rem, 4vw, 2.8rem)',
              transition: 'font-size 0.7s ease',
              lineHeight: 1.1,
            }}
          >
            Flower Power<br />
            <em>Pizza Ranong</em>
          </h1>

          <div className="w-10 md:w-12 h-px bg-white mx-auto mb-3 md:mb-4" style={{ opacity: 0.5 }} />

          <p
            className="text-xs md:text-sm tracking-widest uppercase font-light mb-5 md:mb-8"
            style={{ opacity: 0.75 }}
          >
            Authentic Italian · Open Daily
          </p>

          <button
            className="px-6 md:px-8 py-2.5 md:py-3 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 active:bg-white active:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            See Our Menu
          </button>

          {pizzaExpanded && (
            <p className="mt-3 text-white text-xs opacity-50 md:hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
              Tap again to enter
            </p>
          )}
        </div>

        {/* Etichetta verticale quando compresso — solo desktop */}
        {villageExpanded && (
          <div className="absolute inset-0 items-center justify-center hidden md:flex">
            <span
              className="text-white text-sm tracking-[0.3em] uppercase"
              style={{
                writingMode: 'vertical-rl',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 300,
                opacity: 0.8,
              }}
            >
              Pizza Ranong
            </span>
          </div>
        )}

        {/* Su mobile: freccia direzionale quando il pannello e compresso */}
        {villageExpanded && (
          <div className="absolute inset-0 flex items-center justify-center md:hidden">
            <TouchHint direction="down" />
          </div>
        )}
      </div>
    </div>
  );
}
