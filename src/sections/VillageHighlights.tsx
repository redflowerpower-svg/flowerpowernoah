import { Wifi, ParkingCircle, Waves, Utensils, Sparkles, PawPrint } from 'lucide-react';

const highlights = [
  {
    icon: Utensils,
    title: '100% Italian Restaurant',
    desc: 'Authentic pizza, pasta, and Italian classics served daily from 8:00 to 21:15.',
  },
  {
    icon: Waves,
    title: 'Swimming Pool',
    desc: 'Relax by the pool, surrounded by tropical nature, steps from your bungalow.',
  },
  {
    icon: Sparkles,
    title: 'Spa & Massage',
    desc: 'Traditional Thai massage and spa treatments available during high season.',
  },
  {
    icon: Wifi,
    title: 'Free WiFi & Parking',
    desc: 'Complimentary high-speed WiFi and private parking throughout the property.',
  },
  {
    icon: PawPrint,
    title: 'Pets Welcome',
    desc: 'We love four-legged guests. Confirm details at the time of your booking.',
  },
  {
    icon: ParkingCircle,
    title: 'Open All Year',
    desc: 'Unlike many island resorts, we stay open year-round for your convenience.',
  },
];

export default function VillageHighlights() {
  return (
    <section className="py-24 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.4em] uppercase text-amber-600 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Why Choose Us
          </p>
          <h2
            className="text-stone-800 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
          >
            A Complete Island Escape
          </h2>
          <div className="w-12 h-px bg-amber-500 mx-auto" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {highlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <div
                key={i}
                className="group p-8 bg-white border border-stone-100 hover:border-amber-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-amber-50 group-hover:bg-amber-100 transition-colors duration-300 mb-5">
                  <Icon size={20} className="text-amber-600" />
                </div>
                <h3
                  className="text-stone-800 mb-3"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.2rem', fontWeight: 400 }}
                >
                  {h.title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed">{h.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
