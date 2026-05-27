import { useState } from 'react';

interface Props {
  onSelectVillage: () => void;
  onSelectPizza: () => void;
}

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
  const [activePanel, setActivePanel] = useState<'none' | 'village' | 'pizza'>('none');

  const villageExpanded = activePanel === 'village';
  const pizzaExpanded = activePanel === 'pizza';

  const villageFlex = villageExpanded ? '1.6' : pizzaExpanded ? '0.4' : '1';
  const pizzaFlex = pizzaExpanded ? '1.6' : villageExpanded ? '0.4' : '1';

  const handleVillageTouch = () => {
    if (activePanel === 'village') {
      onSelectVillage();
    } else {
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
          backgroundColor: '#4a5a2e',
        }}
        onMouseEnter={() => setActivePanel('village')}
        onMouseLeave={() => setActivePanel('none')}
        onClick={onSelectVillage}
        onTouchStart={e => { e.preventDefault(); handleVillageTouch(); }}
      >
        {/* Sfondo radiale per dare profondita */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, #6b7f3a 0%, #3a4820 60%, #2a3415 100%)',
          }}
        />

        {/* Logo come elemento visivo dominante */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: villageExpanded ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <img
            src="/FP_04_-_LOGO_OFFICIAL_HD.png"
            alt="Flower Power Farm Village"
            style={{
              width: 'min(75%, 420px)',
              height: 'auto',
              objectFit: 'contain',
              opacity: pizzaExpanded ? 0.4 : 0.92,
              transition: 'opacity 0.5s ease',
              filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.45))',
            }}
          />
        </div>

        {/* CTA in basso */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 md:pb-10"
          style={{
            opacity: pizzaExpanded ? 0 : 1,
            transition: 'opacity 0.4s ease',
            background: 'linear-gradient(to top, rgba(42,52,21,0.85) 0%, transparent 100%)',
            paddingTop: '48px',
          }}
        >
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3 font-light"
            style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.75)' }}
          >
            Koh Phayam · Thailand
          </p>
          <button
            className="px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 active:bg-white active:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Explore Village
          </button>
          {villageExpanded && (
            <p className="mt-3 text-xs opacity-50 md:hidden" style={{ fontFamily: 'Inter, sans-serif', color: 'white' }}>
              Tap again to enter
            </p>
          )}
        </div>

        {/* Etichetta verticale quando compresso — solo desktop */}
        {pizzaExpanded && (
          <div className="absolute inset-0 items-center justify-center hidden md:flex">
            <span
              className="text-white text-sm tracking-[0.3em] uppercase"
              style={{ writingMode: 'vertical-rl', fontFamily: 'Inter, sans-serif', fontWeight: 300, opacity: 0.7 }}
            >
              Village & Spa
            </span>
          </div>
        )}

        {/* Freccia direzionale su mobile quando compresso */}
        {pizzaExpanded && (
          <div className="absolute inset-0 flex items-center justify-center md:hidden">
            <TouchHint direction="up" />
          </div>
        )}
      </div>

      {/* ── Divisore (linea + cerchio) ── */}
      <div className="relative z-10 flex items-center justify-center flex-shrink-0">
        <div
          className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2"
          style={{ width: '2px', background: 'rgba(255,255,255,0.35)' }}
        />
        <div
          className="block md:hidden absolute inset-x-0 top-1/2 -translate-y-1/2"
          style={{ height: '2px', background: 'rgba(255,255,255,0.35)' }}
        />
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
          backgroundColor: '#2c2a24',
        }}
        onMouseEnter={() => setActivePanel('pizza')}
        onMouseLeave={() => setActivePanel('none')}
        onClick={onSelectPizza}
        onTouchStart={e => { e.preventDefault(); handlePizzaTouch(); }}
      >
        {/* Sfondo radiale */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, #4a4538 0%, #2c2820 60%, #1a1810 100%)',
          }}
        />

        {/* Logo come elemento visivo dominante */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: pizzaExpanded ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <img
            src="/Flower_Power_Pizza_-_HotSpring.png"
            alt="Flower Power Pizza Ranong"
            style={{
              width: 'min(75%, 420px)',
              height: 'auto',
              objectFit: 'contain',
              opacity: villageExpanded ? 0.4 : 0.92,
              transition: 'opacity 0.5s ease',
              filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))',
            }}
          />
        </div>

        {/* CTA in basso */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 md:pb-10"
          style={{
            opacity: villageExpanded ? 0 : 1,
            transition: 'opacity 0.4s ease',
            background: 'linear-gradient(to top, rgba(26,24,16,0.85) 0%, transparent 100%)',
            paddingTop: '48px',
          }}
        >
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3 font-light"
            style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.75)' }}
          >
            Ranong · Thailand
          </p>
          <button
            className="px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 active:bg-white active:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            See Our Menu
          </button>
          {pizzaExpanded && (
            <p className="mt-3 text-xs opacity-50 md:hidden" style={{ fontFamily: 'Inter, sans-serif', color: 'white' }}>
              Tap again to enter
            </p>
          )}
        </div>

        {/* Etichetta verticale quando compresso — solo desktop */}
        {villageExpanded && (
          <div className="absolute inset-0 items-center justify-center hidden md:flex">
            <span
              className="text-white text-sm tracking-[0.3em] uppercase"
              style={{ writingMode: 'vertical-rl', fontFamily: 'Inter, sans-serif', fontWeight: 300, opacity: 0.7 }}
            >
              Pizza Ranong
            </span>
          </div>
        )}

        {/* Freccia direzionale su mobile quando compresso */}
        {villageExpanded && (
          <div className="absolute inset-0 flex items-center justify-center md:hidden">
            <TouchHint direction="down" />
          </div>
        )}
      </div>
    </div>
  );
}
