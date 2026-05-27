import { Phone, Mail, Instagram, Facebook, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', checkin: '', checkout: '', guests: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Booking Enquiry from ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nCheck-in: ${form.checkin}\nCheck-out: ${form.checkout}\nGuests: ${form.guests}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:flowerpowerphayam@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <section className="py-16 md:py-24 bg-stone-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.4em] uppercase text-amber-600 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Get in Touch
          </p>
          <h2
            className="text-stone-800 mb-4"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300 }}
          >
            Book Your Stay Direct
          </h2>
          <div className="w-12 h-px bg-amber-500 mx-auto mb-5" />
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            Book directly with us for a guaranteed 10% saving over all online travel agencies.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact info */}
          <div>
            <h3
              className="text-stone-700 mb-7"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.5rem', fontWeight: 300 }}
            >
              Contact Information
            </h3>
            <div className="space-y-5 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-amber-50 flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-0.5">Address</p>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    14/32 Moo 1, Than Boun,<br />Koh Phayam, Amphoe Muang,<br />Ranong 85000, Thailand
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-amber-50 flex items-center justify-center shrink-0">
                  <Phone size={15} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-0.5">Phone / WhatsApp</p>
                  <a href="tel:+66958825573" className="text-sm text-amber-600 hover:text-amber-700">
                    +66 95 882 5573
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-amber-50 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-0.5">Email</p>
                  <a href="mailto:flowerpowerphayam@gmail.com" className="text-sm text-amber-600 hover:text-amber-700">
                    flowerpowerphayam@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 bg-amber-50 flex items-center justify-center shrink-0">
                  <Clock size={15} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-0.5">Check-in / Check-out</p>
                  <p className="text-sm text-stone-500">Check-in: 13:00 – 21:30 · Check-out: 11:00</p>
                </div>
              </div>
            </div>

            <h4 className="text-stone-600 text-xs tracking-widest uppercase mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
              Follow Us
            </h4>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/flowerpowerphayam"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 text-stone-600 text-xs hover:border-amber-400 hover:text-amber-600 transition-all"
              >
                <Instagram size={14} />
                @flowerpowerphayam
              </a>
              <a
                href="https://www.facebook.com/flowerpowerphayam"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 border border-stone-200 text-stone-600 text-xs hover:border-amber-400 hover:text-amber-600 transition-all"
              >
                <Facebook size={14} />
                Facebook
              </a>
            </div>
          </div>

          {/* Booking form */}
          <div className="bg-white p-4 sm:p-8 border border-stone-100">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-12 h-12 bg-amber-50 flex items-center justify-center mb-4">
                  <Mail size={20} className="text-amber-600" />
                </div>
                <h3
                  className="text-stone-800 mb-2"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem' }}
                >
                  Enquiry Sent!
                </h3>
                <p className="text-sm text-stone-500">We'll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3
                  className="text-stone-700 mb-6"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem', fontWeight: 300 }}
                >
                  Send a Booking Enquiry
                </h3>
                {/* Due colonne solo da sm in su per evitare campi troppo stretti su mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-400 uppercase tracking-wide block mb-1.5">Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-stone-200 px-3.5 py-2.5 text-sm text-stone-700 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 uppercase tracking-wide block mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-stone-200 px-3.5 py-2.5 text-sm text-stone-700 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-400 uppercase tracking-wide block mb-1.5">Check-in</label>
                    <input
                      type="date"
                      value={form.checkin}
                      onChange={e => setForm(f => ({ ...f, checkin: e.target.value }))}
                      className="w-full border border-stone-200 px-3.5 py-2.5 text-sm text-stone-700 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 uppercase tracking-wide block mb-1.5">Check-out</label>
                    <input
                      type="date"
                      value={form.checkout}
                      onChange={e => setForm(f => ({ ...f, checkout: e.target.value }))}
                      className="w-full border border-stone-200 px-3.5 py-2.5 text-sm text-stone-700 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-stone-400 uppercase tracking-wide block mb-1.5">Number of Guests</label>
                  <select
                    value={form.guests}
                    onChange={e => setForm(f => ({ ...f, guests: e.target.value }))}
                    className="w-full border border-stone-200 px-3.5 py-2.5 text-sm text-stone-700 focus:outline-none focus:border-amber-400 transition-colors bg-white"
                  >
                    <option value="">Select</option>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-400 uppercase tracking-wide block mb-1.5">Message</label>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Any special requests or questions..."
                    className="w-full border border-stone-200 px-3.5 py-2.5 text-sm text-stone-700 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-600 text-white text-xs tracking-[0.2em] uppercase hover:bg-amber-700 transition-colors duration-300"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Send Enquiry (10% Direct Discount)
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
