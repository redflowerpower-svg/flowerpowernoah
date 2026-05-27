import { useState, useCallback } from 'react';

interface Props {
  onSelectVillage: () => void;
  onSelectPizza: () => void;
}

export default function SplitScreen({ onSelectVillage, onSelectPizza }: Props) {
  const [activePanel, setActivePanel] = useState<'none' | 'village' | 'pizza'>('none');
  const [isMobile, setIsMobile] = useState(false);

  // Detect touch capability on first interaction
  const handleTouchDetect = useCallback(() => {
    setIsMobile(true);
  }, []);

  const villageExpanded = activePanel === 'village';
  const pizzaExpanded = activePanel === 'pizza';

  // Mobile uses more extreme ratios to give logo room to breathe
  const expandRatio = isMobile ? '2.4' : '1.6';
  const collapseRatio = isMobile ? '0.25' : '0.4';

  const villageFlex = villageExpanded ? expandRatio : pizzaExpanded ? collapseRatio : '1';
  const pizzaFlex = pizzaExpanded ? expandRatio : villageExpanded ? collapseRatio : '1';

  // Desktop: click always navigates (hover already expanded the panel)
  const handleVillageClick = () => {
    if (!isMobile) onSelectVillage();
  };
  const handlePizzaClick = () => {
    if (!isMobile) onSelectPizza();
  };

  // Mobile: first tap = expand, second tap = navigate
  const handleVillageTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    if (activePanel === 'village') {
      onSelectVillage();
    } else {
      setActivePanel('village');
    }
  };
  const handlePizzaTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    if (activePanel === 'pizza') {
      onSelectPizza();
    } else {
      setActivePanel('pizza');
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col md:flex-row overflow-hidden"
      onTouchStart={handleTouchDetect}
    >

      {/* ── Pannello Village ── */}
      <div
        className="relative overflow-hidden"
        style={{
          flex: villageFlex,
          transition: 'flex 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: '#4a5a2e',
          cursor: isMobile ? 'default' : 'pointer',
        }}
        onMouseEnter={() => { if (!isMobile) setActivePanel('village'); }}
        onMouseLeave={() => { if (!isMobile) setActivePanel('none'); }}
        onClick={handleVillageClick}
        onTouchStart={handleVillageTouch}
      >
        {/* Sfondo radiale */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, #6b7f3a 0%, #3a4820 60%, #2a3415 100%)',
          }}
        />

        {/* Logo dominante centrato */}
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
              opacity: pizzaExpanded ? 0.25 : 0.92,
              transition: 'opacity 0.5s ease',
              filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.45))',
            }}
          />
        </div>

        {/* CTA in basso — nascosto se l'altro pannello e espanso */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 md:pb-10"
          style={{
            opacity: pizzaExpanded ? 0 : 1,
            pointerEvents: pizzaExpanded ? 'none' : 'auto',
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

          {/* Desktop CTA */}
          <button
            className="hidden md:block px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Explore Village
          </button>

          {/* Mobile CTA — pulsante prominente solo quando espanso */}
          {villageExpanded && isMobile && (
            <button
              className="md:hidden px-10 py-3 bg-white text-stone-800 text-sm tracking-[0.2em] uppercase font-semibold shadow-lg"
              style={{
                fontFamily: 'Inter, sans-serif',
                animation: 'pulse-cta 1.8s ease-in-out infinite',
              }}
            >
              Tap to Enter
            </button>
          )}

          {/* Bottone placeholder su mobile quando NON espanso */}
          {!villageExpanded && isMobile && (
            <button
              className="md:hidden px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Explore Village
            </button>
          )}
        </div>

        {/* Striscia verticale col nome quando compresso su desktop */}
        {pizzaExpanded && (
          <div className="absolute inset-0 items-center justify-center hidden md:flex">
            <span
              className="text-white text-sm tracking-[0.3em] uppercase"
              style={{ writingMode: 'vertical-rl', fontFamily: 'Inter, sans-serif', fontWeight: 300, opacity: 0.5 }}
            >
              Village & Spa
            </span>
          </div>
        )}
      </div>

      {/* ── Divisore ── */}
      <div
        className="relative z-10 flex items-center justify-center flex-shrink-0"
        style={{ pointerEvents: 'none' }}
      >
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
        className="relative overflow-hidden"
        style={{
          flex: pizzaFlex,
          transition: 'flex 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: '#2c2a24',
          cursor: isMobile ? 'default' : 'pointer',
        }}
        onMouseEnter={() => { if (!isMobile) setActivePanel('pizza'); }}
        onMouseLeave={() => { if (!isMobile) setActivePanel('none'); }}
        onClick={handlePizzaClick}
        onTouchStart={handlePizzaTouch}
      >
        {/* Sfondo radiale */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, #4a4538 0%, #2c2820 60%, #1a1810 100%)',
          }}
        />

        {/* Logo dominante centrato */}
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
              opacity: villageExpanded ? 0.25 : 0.92,
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
            pointerEvents: villageExpanded ? 'none' : 'auto',
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

          {/* Desktop CTA */}
          <button
            className="hidden md:block px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            See Our Menu
          </button>

          {/* Mobile CTA — pulsante prominente solo quando espanso */}
          {pizzaExpanded && isMobile && (
            <button
              className="md:hidden px-10 py-3 bg-white text-stone-800 text-sm tracking-[0.2em] uppercase font-semibold shadow-lg"
              style={{
                fontFamily: 'Inter, sans-serif',
                animation: 'pulse-cta 1.8s ease-in-out infinite',
              }}
            >
              Tap to Enter
            </button>
          )}

          {/* Bottone placeholder su mobile quando NON espanso */}
          {!pizzaExpanded && isMobile && (
            <button
              className="md:hidden px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              See Our Menu
            </button>
          )}
        </div>

        {/* Striscia verticale col nome quando compresso su desktop */}
        {villageExpanded && (
          <div className="absolute inset-0 items-center justify-center hidden md:flex">
            <span
              className="text-white text-sm tracking-[0.3em] uppercase"
              style={{ writingMode: 'vertical-rl', fontFamily: 'Inter, sans-serif', fontWeight: 300, opacity: 0.5 }}
            >
              Pizza Ranong
            </span>
          </div>
        )}
      </div>

      {/* Keyframes per il pulsante "Tap to Enter" */}
      <style>{`
        @keyframes pulse-cta {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(0.97); }
        }
      `}</style>
    </div>
  );
}
