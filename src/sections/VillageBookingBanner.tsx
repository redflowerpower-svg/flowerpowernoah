interface Props {
  onNavigate: (page: string) => void;
}

export default function VillageBookingBanner({ onNavigate }: Props) {
  return (
    <section
      className="relative py-20 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #c5a572 0%, transparent 50%), radial-gradient(circle at 80% 50%, #78716c 0%, transparent 50%)',
        }}
      />
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <p className="text-xs tracking-[0.4em] uppercase text-amber-500 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
          Exclusive Offer
        </p>
        <h2
          className="text-white mb-4"
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
        >
          Save 10% by Booking Direct
        </h2>
        <div className="w-10 h-px bg-amber-500 mx-auto mb-6" />
        <p className="text-stone-300 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
          Skip the middleman. Book your stay directly with us and receive a 10% discount compared to all online travel agencies — guaranteed.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => onNavigate('contact')}
            className="px-10 py-3.5 bg-amber-600 text-white text-xs tracking-[0.2em] uppercase hover:bg-amber-700 transition-colors duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Book Directly
          </button>
          <button
            onClick={() => onNavigate('accommodations')}
            className="px-10 py-3.5 border border-stone-600 text-stone-300 text-xs tracking-[0.2em] uppercase hover:border-amber-500 hover:text-amber-400 transition-all duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            View Rooms
          </button>
        </div>
      </div>
    </section>
  );
}
