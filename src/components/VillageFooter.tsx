import { Phone, Mail, Instagram, Facebook, MapPin } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function VillageFooter({ onNavigate }: Props) {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Brand */}
        <div>
          <div
            className="text-white text-lg font-light tracking-wider italic mb-3"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            Flower Power Farm Village & Spa
          </div>
          <p className="text-sm text-stone-400 leading-relaxed mb-4">
            One of Thailand's last unspoiled islands. A sanctuary of nature, comfort, and authentic Italian flavour.
          </p>
          <div className="flex items-start gap-2 text-sm text-stone-400">
            <MapPin size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <span>14/32 Moo 1, Than Boun, Koh Phayam,<br />Ranong 85000, Thailand</span>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="text-white text-xs tracking-[0.25em] uppercase mb-5">Explore</h4>
          <ul className="space-y-3">
            {[
              { label: 'Accommodations', id: 'accommodations' },
              { label: 'Restaurant & Menu', id: 'restaurant' },
              { label: 'Spa & Treatments', id: 'spa' },
              { label: 'Activities', id: 'activities' },
              { label: 'Photo Gallery', id: 'gallery' },
              { label: 'Contact Us', id: 'contact' },
            ].map(item => (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className="text-sm text-stone-400 hover:text-amber-500 transition-colors duration-200"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white text-xs tracking-[0.25em] uppercase mb-5">Contact</h4>
          <div className="space-y-3 mb-6">
            <a
              href="tel:+66958825573"
              className="flex items-center gap-3 text-sm text-stone-400 hover:text-amber-500 transition-colors"
            >
              <Phone size={14} className="text-amber-600" />
              +66 95 882 5573
            </a>
            <a
              href="mailto:flowerpowerphayam@gmail.com"
              className="flex items-center gap-3 text-sm text-stone-400 hover:text-amber-500 transition-colors"
            >
              <Mail size={14} className="text-amber-600" />
              flowerpowerphayam@gmail.com
            </a>
          </div>
          {/* Icone social con area touch minima di 44x44px come da linee guida mobile */}
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/flowerpowerphayam"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 border border-stone-700 flex items-center justify-center hover:border-amber-600 hover:text-amber-500 transition-all duration-200 text-stone-400"
            >
              <Instagram size={16} />
            </a>
            <a
              href="https://www.facebook.com/flowerpowerphayam"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 border border-stone-700 flex items-center justify-center hover:border-amber-600 hover:text-amber-500 transition-all duration-200 text-stone-400"
            >
              <Facebook size={16} />
            </a>
          </div>

          <div className="mt-6 p-4 border border-amber-800 bg-amber-950 bg-opacity-30 rounded">
            <p className="text-xs text-amber-400 tracking-wide font-medium mb-1">Direct Booking Offer</p>
            <p className="text-xs text-stone-400">Book directly and save 10% vs. all online travel agencies.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-800 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-600">
            © {new Date().getFullYear()} Flower Power Farm Village & Spa · Koh Phayam, Thailand
          </p>
          <div className="flex items-center gap-1 text-xs text-stone-600">
            <span className="text-amber-700">EN</span>
            <span>·</span>
            <span>IT</span>
            <span>·</span>
            <span>TH</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
