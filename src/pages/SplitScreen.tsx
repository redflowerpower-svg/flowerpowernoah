import { useState, useCallback, useRef, useEffect } from 'react';

interface Props {
  onSelectVillage: () => void;
  onSelectPizza: () => void;
}

export default function SplitScreen({ onSelectVillage, onSelectPizza }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [userMoved, setUserMoved] = useState(false);
  const [activePanel, setActivePanel] = useState<'none' | 'village' | 'pizza'>('none');

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartPos = useRef(0);
  const hasDragged = useRef(false);

  const handleTouchDetect = useCallback(() => setIsMobile(true), []);

  const computeRatio = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isHoriz = window.innerWidth >= 768;
    const raw = isHoriz
      ? (clientX - rect.left) / rect.width
      : (clientY - rect.top) / rect.height;
    setSplitRatio(Math.max(0.1, Math.min(0.9, raw)));
    setUserMoved(true);
  }, []);

  // Current divider fraction (0..1) for rendering the fixed overlay
  const getDividerFraction = useCallback(() => {
    if (userMoved) return splitRatio;
    const expandRatio = 1.6;
    const collapseRatio = 0.4;
    if (activePanel === 'village') return expandRatio / (expandRatio + 1);
    if (activePanel === 'pizza') return collapseRatio / (collapseRatio + 1);
    return 0.5;
  }, [userMoved, splitRatio, activePanel]);

  // Touch on the whole container: detect if finger starts near divider line
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const GRAB_ZONE = 30;

    const onTouchStart = (e: TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const isHoriz = window.innerWidth >= 768;
      const fraction = getDividerFraction();
      const dividerPx = isHoriz
        ? rect.left + rect.width * fraction
        : rect.top + rect.height * fraction;
      const touchPos = isHoriz ? e.touches[0].clientX : e.touches[0].clientY;

      if (Math.abs(touchPos - dividerPx) <= GRAB_ZONE) {
        isDragging.current = true;
        hasDragged.current = false;
        dragStartPos.current = touchPos;
      } else {
        isDragging.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const isHoriz = window.innerWidth >= 768;
      const pos = isHoriz ? e.touches[0].clientX : e.touches[0].clientY;
      if (Math.abs(pos - dragStartPos.current) > 5) {
        hasDragged.current = true;
      }
      e.preventDefault();
      computeRatio(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchEnd = () => {
      isDragging.current = false;
      // Reset so the next tap on a logo works correctly
      hasDragged.current = false;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [computeRatio, getDividerFraction]);

  // Mouse drag (desktop)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      hasDragged.current = true;
      computeRatio(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      hasDragged.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [computeRatio]);

  // Flex values
  let villageFlex: string;
  let pizzaFlex: string;
  if (userMoved) {
    villageFlex = String(splitRatio);
    pizzaFlex = String(1 - splitRatio);
  } else {
    const expandRatio = isMobile ? '2.4' : '1.6';
    const collapseRatio = isMobile ? '0.25' : '0.4';
    villageFlex = activePanel === 'village' ? expandRatio : activePanel === 'pizza' ? collapseRatio : '1';
    pizzaFlex = activePanel === 'pizza' ? expandRatio : activePanel === 'village' ? collapseRatio : '1';
  }

  const villageExpanded = !userMoved && activePanel === 'village';
  const pizzaExpanded = !userMoved && activePanel === 'pizza';

  // Panel handlers — always reset userMoved so automatic animation works
  const handleVillageMouseEnter = () => {
    if (isMobile || isDragging.current) return;
    setUserMoved(false);
    setActivePanel('village');
  };
  const handlePizzaMouseEnter = () => {
    if (isMobile || isDragging.current) return;
    setUserMoved(false);
    setActivePanel('pizza');
  };
  const handleMouseLeave = () => {
    if (isMobile || isDragging.current) return;
    setActivePanel('none');
  };

  const handleVillageClick = () => {
    if (!isMobile && !hasDragged.current) onSelectVillage();
  };
  const handlePizzaClick = () => {
    if (!isMobile && !hasDragged.current) onSelectPizza();
  };

  // Mobile tap on panel: first tap expands, second tap navigates
  const handleVillageTouch = (e: React.TouchEvent) => {
    if (isDragging.current) return;
    e.preventDefault();
    if (activePanel === 'village') {
      onSelectVillage();
    } else {
      setUserMoved(false);
      setActivePanel('village');
    }
  };
  const handlePizzaTouch = (e: React.TouchEvent) => {
    if (isDragging.current) return;
    e.preventDefault();
    if (activePanel === 'pizza') {
      onSelectPizza();
    } else {
      setUserMoved(false);
      setActivePanel('pizza');
    }
  };

  const transition = isDragging.current ? 'none' : 'flex 0.7s cubic-bezier(0.4, 0, 0.2, 1)';

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    hasDragged.current = false;
    dragStartPos.current = e.clientX;
  };

  // Divider fraction for the fixed overlay position
  const fraction = getDividerFraction();
  const dividerLineStyle: React.CSSProperties = isMobile
    ? { top: `${fraction * 100}%`, left: 0, width: '100%', height: '1px' }
    : { left: `${fraction * 100}%`, top: 0, width: '1px', height: '100%' };
  const dividerCircleStyle: React.CSSProperties = isMobile
    ? { top: `${fraction * 100}%`, left: '50%', transform: 'translate(-50%, -50%)' }
    : { left: `${fraction * 100}%`, top: '50%', transform: 'translate(-50%, -50%)' };
  const grabStripStyle: React.CSSProperties = isMobile
    ? { top: `${fraction * 100}%`, left: 0, width: '100%', height: '44px', transform: 'translateY(-50%)', cursor: 'ns-resize' }
    : { left: `${fraction * 100}%`, top: 0, width: '44px', height: '100%', transform: 'translateX(-50%)', cursor: 'ew-resize' };
  const arrowsDesktopStyle: React.CSSProperties = {
    left: `${fraction * 100}%`, top: '50%', transform: 'translate(-50%, -50%)',
  };
  const arrowsMobileStyle: React.CSSProperties = {
    top: `${fraction * 100}%`, left: '50%', transform: 'translate(-50%, -50%)',
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col md:flex-row overflow-hidden select-none"
      onTouchStart={handleTouchDetect}
    >
      {/* Village panel */}
      <div
        className="relative overflow-hidden"
        style={{ flex: villageFlex, transition, backgroundColor: '#4a5a2e', cursor: isMobile ? 'default' : 'pointer' }}
        onMouseEnter={handleVillageMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleVillageClick}
        onTouchEnd={handleVillageTouch}
      >
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #6b7f3a 0%, #3a4820 60%, #2a3415 100%)' }} />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: villageExpanded ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <img
            src="/FP_04_-_LOGO_OFFICIAL_HD.png"
            alt="Flower Power Farm Village"
            draggable={false}
            style={{ width: 'min(75%, 420px)', height: 'auto', objectFit: 'contain', opacity: pizzaExpanded ? 0.25 : 0.92, transition: 'opacity 0.5s ease', filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.45))', pointerEvents: 'none' }}
          />
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 md:pb-10"
          style={{ opacity: pizzaExpanded ? 0 : 1, pointerEvents: pizzaExpanded ? 'none' : 'auto', transition: 'opacity 0.4s ease', background: 'linear-gradient(to top, rgba(42,52,21,0.85) 0%, transparent 100%)', paddingTop: '48px' }}
        >
          <p className="text-xs tracking-[0.3em] uppercase mb-3 font-light" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.75)' }}>Koh Phayam · Thailand</p>
          <button className="hidden md:block px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 transition-all duration-300" style={{ fontFamily: 'Inter, sans-serif' }}>Explore Village</button>
          {villageExpanded && isMobile && (
            <button className="md:hidden px-10 py-3 bg-white text-stone-800 text-sm tracking-[0.2em] uppercase font-semibold shadow-lg" style={{ fontFamily: 'Inter, sans-serif', animation: 'pulse-cta 1.8s ease-in-out infinite' }}>Tap to Enter</button>
          )}
          {!villageExpanded && isMobile && (
            <button className="md:hidden px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>Explore Village</button>
          )}
        </div>
        {pizzaExpanded && (
          <div className="absolute inset-0 items-center justify-center hidden md:flex">
            <span className="text-white text-sm tracking-[0.3em] uppercase" style={{ writingMode: 'vertical-rl', fontFamily: 'Inter, sans-serif', fontWeight: 300, opacity: 0.5 }}>Village & Spa</span>
          </div>
        )}
      </div>

      {/* Pizza panel */}
      <div
        className="relative overflow-hidden"
        style={{ flex: pizzaFlex, transition, backgroundColor: '#2c2a24', cursor: isMobile ? 'default' : 'pointer' }}
        onMouseEnter={handlePizzaMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handlePizzaClick}
        onTouchEnd={handlePizzaTouch}
      >
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #4a4538 0%, #2c2820 60%, #1a1810 100%)' }} />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: pizzaExpanded ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <img
            src="/Flower_Power_Pizza_-_HotSpring.png"
            alt="Flower Power Pizza Ranong"
            draggable={false}
            style={{ width: 'min(75%, 420px)', height: 'auto', objectFit: 'contain', opacity: villageExpanded ? 0.25 : 0.92, transition: 'opacity 0.5s ease', filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))', pointerEvents: 'none' }}
          />
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-8 md:pb-10"
          style={{ opacity: villageExpanded ? 0 : 1, pointerEvents: villageExpanded ? 'none' : 'auto', transition: 'opacity 0.4s ease', background: 'linear-gradient(to top, rgba(26,24,16,0.85) 0%, transparent 100%)', paddingTop: '48px' }}
        >
          <p className="text-xs tracking-[0.3em] uppercase mb-3 font-light" style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.75)' }}>Ranong · Thailand</p>
          <button className="hidden md:block px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 transition-all duration-300" style={{ fontFamily: 'Inter, sans-serif' }}>See Our Menu</button>
          {pizzaExpanded && isMobile && (
            <button className="md:hidden px-10 py-3 bg-white text-stone-800 text-sm tracking-[0.2em] uppercase font-semibold shadow-lg" style={{ fontFamily: 'Inter, sans-serif', animation: 'pulse-cta 1.8s ease-in-out infinite' }}>Tap to Enter</button>
          )}
          {!pizzaExpanded && isMobile && (
            <button className="md:hidden px-7 py-2.5 border border-white text-white text-xs tracking-[0.2em] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>See Our Menu</button>
          )}
        </div>
        {villageExpanded && (
          <div className="absolute inset-0 items-center justify-center hidden md:flex">
            <span className="text-white text-sm tracking-[0.3em] uppercase" style={{ writingMode: 'vertical-rl', fontFamily: 'Inter, sans-serif', fontWeight: 300, opacity: 0.5 }}>Pizza Ranong</span>
          </div>
        )}
      </div>

      {/* Divider overlay — fixed to viewport so circle is always centered */}
      <div
        className="fixed inset-0 z-20 pointer-events-none"
        style={{ background: 'transparent' }}
      >
        {/* 1px visible line */}
        <div
          className="absolute pointer-events-none"
          style={{ ...dividerLineStyle, background: 'rgba(255,255,255,0.3)', transition: isDragging.current ? 'none' : 'top 0.7s cubic-bezier(0.4,0,0.2,1), left 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        />

        {/* Invisible grab strip — pointer-events:auto */}
        <div
          className="absolute pointer-events-auto"
          style={{ ...grabStripStyle, background: 'transparent' }}
          onMouseDown={handleDividerMouseDown}
        />

        {/* Circle handle */}
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            ...dividerCircleStyle,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.5)',
            background: 'rgba(15,15,15,0.6)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 14px rgba(0,0,0,0.45)',
            transition: isDragging.current ? 'none' : 'top 0.7s cubic-bezier(0.4,0,0.2,1), left 0.7s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.75)' }} />
        </div>

        {/* Desktop arrows */}
        <svg
          className="absolute pointer-events-none hidden md:block"
          width="44" height="14" viewBox="0 0 44 14" fill="none"
          style={{ ...arrowsDesktopStyle, opacity: 0.4, transition: isDragging.current ? 'none' : 'left 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        >
          <path d="M15 7 L5 7 M5 7 L9 4 M5 7 L9 10" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M29 7 L39 7 M39 7 L35 4 M39 7 L35 10" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Mobile arrows */}
        <svg
          className="absolute pointer-events-none block md:hidden"
          width="14" height="44" viewBox="0 0 14 44" fill="none"
          style={{ ...arrowsMobileStyle, opacity: 0.4, transition: isDragging.current ? 'none' : 'top 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        >
          <path d="M7 15 L7 5 M7 5 L4 9 M7 5 L10 9" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 29 L7 39 M7 39 L4 35 M7 39 L10 35" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <style>{`
        @keyframes pulse-cta {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(0.97); }
        }
      `}</style>
    </div>
  );
}
