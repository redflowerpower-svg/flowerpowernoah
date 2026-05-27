import { Calendar } from 'lucide-react';

const treatments = [
  {
    name: 'Traditional Thai Massage',
    duration: '60 / 90 min',
    desc: 'Ancient healing techniques combining acupressure, assisted yoga postures, and rhythmic massage to restore balance.',
    image: 'https://images.pexels.com/photos/3997989/pexels-photo-3997989.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    name: 'Relaxing Aromatherapy',
    duration: '60 / 90 min',
    desc: 'Warm essential oils blended with gentle Swedish massage techniques for deep relaxation and stress relief.',
    image: 'https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    name: 'Hot Stone Therapy',
    duration: '90 min',
    desc: 'Smooth volcanic stones heated and placed on key energy points to release deep muscle tension and calm the mind.',
    image: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    name: 'Head & Shoulder Massage',
    duration: '30 / 45 min',
    desc: 'Focused relief for neck, shoulders, and scalp — perfect after a long journey or a day of activities.',
    image: 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

export default function SpaSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-5">
          <p className="text-xs tracking-[0.4em] uppercase text-amber-600 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Spa & Wellness
          </p>
          <h2
            className="text-stone-800 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
          >
            Restore. Breathe. <em>Renew.</em>
          </h2>
          <div className="w-12 h-px bg-amber-500 mx-auto mb-5" />
          <p className="text-stone-500 text-sm max-w-lg mx-auto leading-relaxed">
            Our spa opens during high season — December through April — when the island is at its most magical.
          </p>
        </div>

        <div className="flex justify-center mb-14">
          <div className="flex items-center gap-3 text-sm bg-amber-50 border border-amber-100 px-6 py-3 text-amber-800">
            <Calendar size={15} />
            <span>High season only: December – April</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {treatments.map((t, i) => (
            <div key={i} className="group overflow-hidden border border-stone-100 hover:shadow-lg transition-shadow duration-400">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-3 left-4 text-white text-xs px-2 py-1 bg-black/30 backdrop-blur-sm border border-white/20">
                  {t.duration}
                </span>
              </div>
              <div className="p-5">
                <h3
                  className="text-stone-800 mb-2"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.1rem', fontWeight: 400 }}
                >
                  {t.name}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 bg-stone-50 border border-stone-100 text-center max-w-2xl mx-auto">
          <p className="text-sm text-stone-600 leading-relaxed mb-5">
            Spa reservations are recommended in advance. Contact us directly to arrange your treatments alongside your stay.
          </p>
          <a
            href="mailto:flowerpowerphayam@gmail.com"
            className="inline-block px-8 py-3 bg-amber-600 text-white text-xs tracking-[0.2em] uppercase hover:bg-amber-700 transition-colors duration-300"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Reserve a Treatment
          </a>
        </div>
      </div>
    </section>
  );
}
