import { useState } from 'react';

interface Props {
  onSelectVillage: () => void;
  onSelectPizza: () => void;
}

export default function SplitScreen({ onSelectVillage, onSelectPizza }: Props) {
  const [hovered, setHovered] = useState<'none' | 'village' | 'pizza'>('none');

  const villageExpanded = hovered === 'village';
  const pizzaExpanded = hovered === 'pizza';

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      {/* Village Panel */}
      <div
        className="relative flex-1 overflow-hidden cursor-pointer group"
        style={{
          flex: villageExpanded ? '1.6' : pizzaExpanded ? '0.4' : '1',
          transition: 'flex 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={() => setHovered('village')}
        onMouseLeave={() => setHovered('none')}
        onClick={onSelectVillage}
      >
        {/* Background image */}
        <img
          src="https://images.pexels.com/photos/1440727/pexels-photo-1440727.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Flower Power Farm Village"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: villageExpanded ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: villageExpanded
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%)',
            transition: 'background 0.7s ease',
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-8 text-center">
          {/* Flower divider top */}
          <div className="mb-6 opacity-70">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
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
          </div>

          <p
            className="text-xs tracking-[0.35em] uppercase mb-3 font-light"
            style={{ fontFamily: 'Inter, sans-serif', opacity: 0.85 }}
          >
            Koh Phayam · Thailand
          </p>

          <h1
            className="leading-tight mb-4"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 300,
              fontSize: villageExpanded ? '3.5rem' : '2.8rem',
              transition: 'font-size 0.7s ease',
              lineHeight: 1.1,
            }}
          >
            Flower Power<br />
            <em>Farm Village & Spa</em>
          </h1>

          <div
            className="w-12 h-px bg-white mx-auto mb-4"
            style={{ opacity: 0.5 }}
          />

          <p
            className="text-sm tracking-widest uppercase font-light mb-8"
            style={{ opacity: 0.75 }}
          >
            Villas · Bungalows · Spa · Restaurant
          </p>

          <button
            className="px-8 py-3 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
            onClick={onSelectVillage}
          >
            Explore Village
          </button>
        </div>

        {/* Side label when compressed */}
        {pizzaExpanded && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: pizzaExpanded ? 1 : 0, transition: 'opacity 0.4s ease' }}
          >
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
      </div>

      {/* Divider */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: '2px', background: 'rgba(255,255,255,0.4)' }}>
        <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-20" style={{ position: 'absolute' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" fill="#78716c" />
          </svg>
        </div>
      </div>

      {/* Pizza Panel */}
      <div
        className="relative flex-1 overflow-hidden cursor-pointer group"
        style={{
          flex: pizzaExpanded ? '1.6' : villageExpanded ? '0.4' : '1',
          transition: 'flex 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={() => setHovered('pizza')}
        onMouseLeave={() => setHovered('none')}
        onClick={onSelectPizza}
      >
        {/* Background image */}
        <img
          src="https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Flower Power Pizza"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: pizzaExpanded ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: pizzaExpanded
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%)',
            transition: 'background 0.7s ease',
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-8 text-center">
          {/* Pizza icon */}
          <div className="mb-6 opacity-70">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4 L36 34 L4 34 Z" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="20" cy="18" r="2" fill="white" opacity="0.8" />
              <circle cx="14" cy="26" r="1.5" fill="white" opacity="0.8" />
              <circle cx="26" cy="26" r="1.5" fill="white" opacity="0.8" />
              <path d="M4 34 L36 34" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>

          <p
            className="text-xs tracking-[0.35em] uppercase mb-3 font-light"
            style={{ fontFamily: 'Inter, sans-serif', opacity: 0.85 }}
          >
            Ranong · Thailand
          </p>

          <h1
            className="leading-tight mb-4"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 300,
              fontSize: pizzaExpanded ? '3.5rem' : '2.8rem',
              transition: 'font-size 0.7s ease',
              lineHeight: 1.1,
            }}
          >
            Flower Power<br />
            <em>Pizza Ranong</em>
          </h1>

          <div
            className="w-12 h-px bg-white mx-auto mb-4"
            style={{ opacity: 0.5 }}
          />

          <p
            className="text-sm tracking-widest uppercase font-light mb-8"
            style={{ opacity: 0.75 }}
          >
            Authentic Italian · Open Daily
          </p>

          <button
            className="px-8 py-3 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
            onClick={onSelectPizza}
          >
            See Our Menu
          </button>
        </div>

        {/* Side label when compressed */}
        {villageExpanded && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: villageExpanded ? 1 : 0, transition: 'opacity 0.4s ease' }}
          >
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
      </div>
    </div>
  );
}
