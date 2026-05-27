// Struttura immagini con classi span responsive: su mobile layout semplice,
// su md+ si attiva il layout masonry a 4 colonne con span differenziati
const images = [
  {
    src: 'https://images.pexels.com/photos/1450360/pexels-photo-1450360.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Tropical beach Koh Phayam',
    spanMd: 'md:col-span-2 md:row-span-2',
  },
  {
    src: 'https://images.pexels.com/photos/2476632/pexels-photo-2476632.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Bungalow in nature',
    spanMd: 'md:col-span-1 md:row-span-1',
  },
  {
    src: 'https://images.pexels.com/photos/905847/pexels-photo-905847.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Authentic pizza',
    spanMd: 'md:col-span-1 md:row-span-1',
  },
  {
    src: 'https://images.pexels.com/photos/1179213/pexels-photo-1179213.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Snorkelling',
    spanMd: 'md:col-span-1 md:row-span-1',
  },
  {
    src: 'https://images.pexels.com/photos/3997989/pexels-photo-3997989.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Spa massage',
    spanMd: 'md:col-span-1 md:row-span-1',
  },
  {
    src: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
    alt: 'Italian food',
    spanMd: 'md:col-span-2 md:row-span-1',
  },
  {
    src: 'https://images.pexels.com/photos/2029665/pexels-photo-2029665.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Villa exterior',
    spanMd: 'md:col-span-1 md:row-span-1',
  },
  {
    src: 'https://images.pexels.com/photos/1497585/pexels-photo-1497585.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Sea canoeing',
    spanMd: 'md:col-span-1 md:row-span-1',
  },
];

export default function GallerySection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-xs tracking-[0.4em] uppercase text-amber-600 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Photo Gallery
          </p>
          <h2
            className="text-stone-800 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
          >
            Life at Flower Power
          </h2>
          <div className="w-12 h-px bg-amber-500 mx-auto" />
        </div>

        {/* Griglia mobile: 2 colonne con aspect-ratio naturale; md+: 4 colonne con layout masonry */}
        <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-3 gap-2 md:gap-3 md:h-[700px]">
          {images.map((img, i) => (
            <div
              key={i}
              className={`${img.spanMd} overflow-hidden group cursor-pointer aspect-square md:aspect-auto`}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          ))}
        </div>

        <div className="text-center mt-6 md:mt-8">
          <a
            href="https://www.instagram.com/flowerpowerphayam"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-stone-500 hover:text-amber-600 transition-colors border-b border-stone-200 hover:border-amber-400 pb-1"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Follow @flowerpowerphayam on Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
