import { ChevronDown } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function VillageHero({ onNavigate }: Props) {
  return (
    <section className="relative h-screen min-h-[600px] overflow-hidden">
      {/* Background */}
      <img
        src="https://images.pexels.com/photos/1450360/pexels-photo-1450360.jpeg?auto=compress&cs=tinysrgb&w=1920"
        alt="Koh Phayam paradise"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 100%)' }} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
        <p
          className="text-xs tracking-[0.45em] uppercase mb-5 animate-fade-in-up"
          style={{ fontFamily: 'Inter, sans-serif', opacity: 0.8, animationDelay: '0.1s' }}
        >
          Koh Phayam · Ranong Province · Thailand
        </p>

        <h1
          className="mb-5 animate-fade-in-up"
          style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontWeight: 300,
            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
            lineHeight: 1.05,
            animationDelay: '0.25s',
          }}
        >
          Flower Power<br />
          <em>Farm Village & Spa</em>
        </h1>

        <div className="w-16 h-px bg-white mx-auto mb-5 animate-fade-in-up" style={{ opacity: 0.45, animationDelay: '0.35s' }} />

        <p
          className="text-sm tracking-[0.25em] uppercase font-light mb-10 animate-fade-in-up"
          style={{ opacity: 0.75, animationDelay: '0.45s', fontFamily: 'Inter, sans-serif' }}
        >
          Restaurant · Spa · Villas · Bungalows
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <button
            onClick={() => onNavigate('accommodations')}
            className="px-9 py-3.5 bg-amber-600 text-white text-xs tracking-[0.2em] uppercase hover:bg-amber-700 transition-colors duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Book Your Stay
          </button>
          <button
            onClick={() => onNavigate('restaurant')}
            className="px-9 py-3.5 border border-white text-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-800 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            View Menu
          </button>
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-8 flex flex-col items-center gap-1">
          <span className="text-xs tracking-widest uppercase text-white opacity-50" style={{ fontFamily: 'Inter, sans-serif' }}>
            Discover
          </span>
          <ChevronDown size={18} className="text-white opacity-50 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
