import { Check, Clock } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

const units = [
  {
    type: 'Bungalow',
    count: 5,
    image: 'https://images.pexels.com/photos/2476632/pexels-photo-2476632.jpeg?auto=compress&cs=tinysrgb&w=800',
    desc: 'Cosy, fully private bungalows nestled among tropical gardens. Perfect for couples seeking seclusion and nature.',
    features: ['Private bathroom', 'Hot shower', 'Outdoor terrace', 'Garden views'],
    tag: 'Most Popular',
  },
  {
    type: 'Villa',
    count: 4,
    image: 'https://images.pexels.com/photos/2029665/pexels-photo-2029665.jpeg?auto=compress&cs=tinysrgb&w=800',
    desc: 'Spacious, premium villas with elevated comfort for families or guests wanting extra space and privacy.',
    features: ['Private bathroom', 'Hot shower', 'Living area', 'Pool access'],
    tag: 'Premium',
  },
  {
    type: 'Room',
    count: 8,
    image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800',
    desc: 'Comfortable guesthouse-style rooms, ideal for solo travellers or budget-conscious guests who want a great base.',
    features: ['Private bathroom', 'Hot shower', 'WiFi included', 'Daily housekeeping'],
    tag: 'Great Value',
  },
];

export default function AccommodationsSection({ onNavigate }: Props) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.4em] uppercase text-amber-600 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Where You Stay
          </p>
          <h2
            className="text-stone-800 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
          >
            17 Units Across Three Categories
          </h2>
          <div className="w-12 h-px bg-amber-500 mx-auto mb-6" />
          <p className="text-stone-500 text-sm max-w-xl mx-auto leading-relaxed">
            Every unit includes a private bathroom with hot shower. All guests enjoy pool access, free WiFi, and our on-site restaurant.
          </p>
        </div>

        {/* Check-in info */}
        <div className="flex flex-wrap justify-center gap-8 mb-14 p-6 bg-stone-50 border border-stone-100">
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-amber-600" />
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Check-in</p>
              <p className="text-sm text-stone-700 font-medium">13:00 – 21:30</p>
            </div>
          </div>
          <div className="w-px bg-stone-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <Clock size={16} className="text-amber-600" />
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Check-out</p>
              <p className="text-sm text-stone-700 font-medium">By 11:00</p>
            </div>
          </div>
          <div className="w-px bg-stone-200 hidden sm:block" />
          <div className="flex items-center gap-3">
            <Check size={16} className="text-amber-600" />
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide">Direct Booking</p>
              <p className="text-sm text-stone-700 font-medium">10% Off All OTAs</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {units.map((unit, i) => (
            <div key={i} className="group overflow-hidden border border-stone-100 hover:border-amber-200 hover:shadow-xl transition-all duration-400">
              <div className="relative h-56 overflow-hidden">
                <img
                  src={unit.image}
                  alt={unit.type}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
                />
                <span
                  className="absolute top-4 right-4 bg-amber-600 text-white text-xs px-3 py-1 tracking-wide uppercase"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {unit.tag}
                </span>
              </div>
              <div className="p-7">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="text-stone-800"
                    style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.5rem', fontWeight: 400 }}
                  >
                    {unit.type}
                  </h3>
                  <span className="text-xs text-stone-400 bg-stone-50 border border-stone-100 px-3 py-1">
                    {unit.count} units
                  </span>
                </div>
                <p className="text-sm text-stone-500 leading-relaxed mb-5">{unit.desc}</p>
                <ul className="space-y-2 mb-6">
                  {unit.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-stone-500">
                      <Check size={12} className="text-amber-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => onNavigate('contact')}
                  className="w-full py-3 border border-stone-300 text-stone-600 text-xs tracking-[0.15em] uppercase hover:border-amber-500 hover:text-amber-600 transition-all duration-300"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
