import React from 'react';
import Link from 'next/link';
import { Compass, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export default function TravelFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white">Wanderlust Journeys</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bespoke luxury holidays, private villa escapes, and curated Himalayan expeditions powered by autonomous
              travel sales intelligence.
            </p>
            <div className="flex items-center gap-1.5 text-teal-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Razorpay Verified Payment Gateway</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Popular Escapes</div>
            <ul className="space-y-2">
              <li>
                <Link href="#packages" className="hover:text-teal-400 transition-colors">
                  Bali Romantic Villa (5D/4N)
                </Link>
              </li>
              <li>
                <Link href="#packages" className="hover:text-teal-400 transition-colors">
                  Kashmir Valley Bliss (6D/5N)
                </Link>
              </li>
              <li>
                <Link href="#packages" className="hover:text-teal-400 transition-colors">
                  Dubai Luxury Desert (5D/4N)
                </Link>
              </li>
              <li>
                <Link href="#packages" className="hover:text-teal-400 transition-colors">
                  Maldives Lagoon Villas (4D/3N)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Agency & Portal</div>
            <ul className="space-y-2">
              <li>
                <Link href="/admin" className="text-teal-400 hover:underline font-semibold flex items-center gap-1">
                  <span>Agency CRM & Booking Desk</span>
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Arjun Patel Sales AI Engine</span>
              </li>
              <li>
                <span className="text-slate-400">₹2,000 Refund Policy</span>
              </li>
              <li>
                <span className="text-slate-400">Terms of Service & Privacy</span>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Concierge Desk</div>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-teal-400" />
                <span>+91 98765 43210 (24x7 Priority)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-teal-400" />
                <span>concierge@wanderlustjourneys.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                <span>Level 4, Webshastraa Travel Tower, Bandra Kurla Complex, Mumbai</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>© 2026 Wanderlust Journeys. All rights reserved. Powered by Webshastraa AI.</div>
          <div className="flex items-center gap-6">
            <span>Razorpay Test Gateway Mode Active</span>
            <span>Server Enforced Token (₹2,000 INR)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
