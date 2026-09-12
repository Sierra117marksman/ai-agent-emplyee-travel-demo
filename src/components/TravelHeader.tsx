import React from 'react';
import Link from 'next/link';
import { Compass, Phone, ShieldCheck, Sparkles, LayoutDashboard } from 'lucide-react';

export default function TravelHeader() {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Top micro-bar */}
      <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-indigo-900/60 text-[10px] sm:text-xs py-1 px-3 sm:px-4 text-center border-b border-slate-800/60 flex items-center justify-center gap-2 sm:gap-4 text-slate-300">
        <span className="flex items-center gap-1 font-medium text-teal-300 whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-teal-400" />
          <span className="hidden sm:inline">Handcrafted Private Journeys</span>
          <span className="sm:hidden">Handcrafted Escapes</span>
        </span>
        <span className="hidden md:inline text-slate-600">•</span>
        <span className="hidden md:inline">24/7 Concierge Support across 18 Global Destinations</span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1 text-amber-300 font-semibold whitespace-nowrap">
          <ShieldCheck className="w-3 h-3" />
          <span>100% Refundable ₹2,000 Token</span>
        </span>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-1">
              Wanderlust <span className="text-teal-400 font-serif italic">Journeys</span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
              Curated by Webshastraa Lab
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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile phone button */}
          <a
            href="tel:+918000012345"
            aria-label="Call concierge"
            className="sm:hidden flex w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-teal-400 items-center justify-center hover:bg-slate-800 active:scale-95 transition-all"
          >
            <Phone className="w-4 h-4" />
          </a>

          {/* Desktop phone pill */}
          <a
            href="tel:+918000012345"
            className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-teal-400" />
            <span>+91 80000 12345</span>
          </a>

          <Link
            href="/admin"
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-600/20 hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
          >
            <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Agency CRM</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
