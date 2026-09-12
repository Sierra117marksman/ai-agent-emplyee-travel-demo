import React from 'react';
import Link from 'next/link';
import { Compass, Phone, ShieldCheck, Sparkles, LayoutDashboard } from 'lucide-react';

export default function TravelHeader() {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Top micro-bar */}
      <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-indigo-900/60 text-xs py-1.5 px-4 text-center border-b border-slate-800/60 flex items-center justify-center gap-4 text-slate-300">
        <span className="flex items-center gap-1.5 font-medium text-teal-300">
          <Sparkles className="w-3.5 h-3.5" /> Handcrafted Private Journeys
        </span>
        <span className="hidden md:inline text-slate-600">•</span>
        <span className="hidden md:inline">24/7 Concierge Support across 18 Global Destinations</span>
        <span className="hidden md:inline text-slate-600">•</span>
        <span className="flex items-center gap-1 text-amber-300 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" /> 100% Refundable ₹2,000 Booking Tokens
        </span>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              Wanderlust <span className="text-teal-400 font-serif italic">Journeys</span>
            </div>
            <div className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
              Curated by Webshastraa Travel Lab
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link href="#packages" className="hover:text-teal-400 transition-colors">
            Featured Packages
          </Link>
          <Link href="#destinations" className="hover:text-teal-400 transition-colors">
            Destinations
          </Link>
          <Link href="#why-us" className="hover:text-teal-400 transition-colors">
            Why Us
          </Link>
          <Link href="#reviews" className="hover:text-teal-400 transition-colors">
            Traveler Stories
          </Link>
        </nav>

        {/* Right action group */}
        <div className="flex items-center gap-3">
          <a
            href="tel:+919876543210"
            className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-teal-400" />
            <span>+91 98765 43210</span>
          </a>

          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-600/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Agency CRM</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
