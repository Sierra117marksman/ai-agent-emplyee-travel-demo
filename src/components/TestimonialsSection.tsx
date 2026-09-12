import React from 'react';
import { Star, Quote, CheckCircle } from 'lucide-react';

export default function TestimonialsSection() {
  const reviews = [
    {
      name: 'Pooja & Sameer Verma',
      trip: 'Bali Romantic Villa Escape (5D/4N)',
      date: 'Traveled August 2026',
      quote:
        'We started chatting with Arjun at 11 PM on a Sunday. By 11:15 PM, we had our exact Ubud private pool villa confirmed with just a ₹2,000 token. Next morning, our advisor called with flight options. Absolutely flawless experience!',
      rating: 5
    },
    {
      name: 'Aditya Mehta & Family',
      trip: 'Kashmir Valley & Houseboat Bliss (6D/5N)',
      date: 'Traveled July 2026',
      quote:
        'The Dal Lake houseboat and Gulmarg Gondola Phase 2 were handled without standing in a single tourist line. Arjun Patel made booking so effortless compared to traditional agencies.',
      rating: 5
    },
    {
      name: 'Neha Kapoor',
      trip: 'Dubai Luxury Dunes & Sky Lounge (5D/4N)',
      date: 'Traveled June 2026',
      quote:
        'From the VIP Desert Safari to the Burj Khalifa private lounge, everything matched the exact itinerary Arjun shared in the chat. Truly 5-star personalized hospitality!',
      rating: 5
    }
  ];

  return (
    <section id="reviews" className="py-20 bg-slate-950 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">Verified Travelers</div>
          <h2 className="text-3xl font-extrabold text-white">Moments That Stay Forever</h2>
          <p className="mt-3 text-slate-400 text-sm">
            Real stories from couples and families who planned and booked their journeys through Wanderlust Journeys.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((r, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 flex flex-col justify-between shadow-xl relative"
            >
              <Quote className="w-8 h-8 text-teal-500/20 absolute top-6 right-6 pointer-events-none" />

              <div>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(r.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-6 italic">
                  &ldquo;{r.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>{r.name}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                  <div className="text-[11px] text-teal-300 font-medium">{r.trip}</div>
                </div>
                <div className="text-[10px] text-slate-500">{r.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
