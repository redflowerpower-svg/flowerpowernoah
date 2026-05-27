const activities = [
  {
    title: 'Snorkelling',
    desc: 'Explore vibrant coral reefs and tropical fish in the crystal-clear waters surrounding Koh Phayam. Equipment is available locally.',
    image: 'https://images.pexels.com/photos/1179213/pexels-photo-1179213.jpeg?auto=compress&cs=tinysrgb&w=800',
    best: 'Nov – Apr',
  },
  {
    title: 'Sea Canoeing',
    desc: 'Paddle along secluded coastlines, explore hidden coves, and discover mangrove channels at your own pace.',
    image: 'https://images.pexels.com/photos/1497585/pexels-photo-1497585.jpeg?auto=compress&cs=tinysrgb&w=800',
    best: 'Year-round',
  },
  {
    title: 'Fishing',
    desc: 'Join local fishermen or rent a boat independently. The waters around Ranong are rich in sea bass, snapper, and more.',
    image: 'https://images.pexels.com/photos/1034022/pexels-photo-1034022.jpeg?auto=compress&cs=tinysrgb&w=800',
    best: 'Year-round',
  },
];

const islandFacts = [
  { label: 'Distance to beach', value: '~150 m' },
  { label: 'Ferry from Ranong', value: '~1.5 hours' },
  { label: 'Island status', value: 'Mostly undeveloped' },
  { label: 'Province', value: 'Ranong, Thailand' },
];

export default function ActivitiesSection() {
  return (
    <section className="py-24" style={{ background: '#faf9f7' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.4em] uppercase text-amber-600 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Koh Phayam Island
          </p>
          <h2
            className="text-stone-800 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
          >
            Adventures at Your Doorstep
          </h2>
          <div className="w-12 h-px bg-amber-500 mx-auto mb-6" />
          <p className="text-stone-500 text-sm max-w-xl mx-auto leading-relaxed">
            Koh Phayam is one of Thailand's last truly unspoiled islands — no full moon parties, no high-rises, just raw natural beauty.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {activities.map((a, i) => (
            <div key={i} className="group overflow-hidden bg-white border border-stone-100 hover:shadow-xl transition-shadow duration-400">
              <div className="relative h-60 overflow-hidden">
                <img
                  src={a.image}
                  alt={a.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-end justify-between">
                    <h3
                      className="text-white text-xl"
                      style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 400 }}
                    >
                      {a.title}
                    </h3>
                    <span className="text-xs text-amber-300 bg-black/30 px-2 py-1 backdrop-blur-sm border border-amber-400/30">
                      {a.best}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-stone-500 leading-relaxed">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Island quick facts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stone-200 border border-stone-200">
          {islandFacts.map((f, i) => (
            <div key={i} className="bg-white p-7 text-center">
              <p
                className="text-stone-800 mb-1"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem', fontWeight: 400 }}
              >
                {f.value}
              </p>
              <p className="text-xs text-stone-400 uppercase tracking-wide">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
