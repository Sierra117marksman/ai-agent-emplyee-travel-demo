'use client';

import React from 'react';
import { Sparkles, ArrowRight, Shield, Award, Users, Star, MessageSquareQuote } from 'lucide-react';

interface HeroBannerProps {
  onOpenArjunWithPrompt: (prompt: string) => void;
}

export default function HeroBanner({ onOpenArjunWithPrompt }: HeroBannerProps) {
  const quickSearches = [
    { label: '🏝️ Bali Honeymoon under ₹50k', prompt: 'I want a honeymoon trip to Bali, around ₹50k per person for 2 people.' },
    { label: '🏔️ Kashmir Valley & Dal Lake', prompt: 'Looking for a romantic Kashmir trip with Gulmarg and houseboat for 2 people.' },
    { label: '✨ Dubai Luxury & Desert Dunes', prompt: 'We are planning a 5-day luxury Dubai vacation for our family.' },
    { label: '🌴 Kerala Backwaters & Munnar', prompt: 'Interested in Kerala tea gardens and private houseboat cruise.' }
  ];

  return (
    <section className="relative overflow-hidden bg-slate-950 pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-teal-500/15 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/80 border border-teal-800/80 text-teal-300 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Meet Arjun Patel • Autonomous Travel Sales Specialist</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12]">
            Escape the ordinary.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-400 to-amber-300 font-serif italic">
              Bespoke journeys
            </span>{' '}
            tailored to your dream.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed">
            Stop waiting days for generic travel agent quotes. Chat live with{' '}
            <strong className="text-white font-semibold">Arjun Patel</strong>, discover tailored private villa
            itineraries matching your exact budget, and secure your booking with a refundable{' '}
            <span className="text-teal-400 font-semibold underline decoration-teal-500/50 underline-offset-4">
              ₹2,000 booking token
            </span>
            .
          </p>

          {/* Main CTA Group */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              type="button"
              onClick={() => onOpenArjunWithPrompt('Hi Arjun, I want help planning an unforgettable vacation. What packages do you recommend?')}
              className="inline-flex items-center justify-center gap-3 px-7 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-base shadow-xl shadow-teal-500/25 hover:shadow-teal-500/40 hover:brightness-110 active:scale-98 transition-all"
            >
              <MessageSquareQuote className="w-5 h-5" />
              <span>Chat with Arjun to Plan Trip</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#packages"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold text-base hover:bg-slate-850 hover:border-slate-700 transition-colors"
            >
              <span>Explore 2026 Catalog</span>
            </a>
          </div>

          {/* Quick Instant Prompt Chips */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span>Popular Itinerary Requests:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickSearches.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onOpenArjunWithPrompt(item.prompt)}
                  className="text-xs font-medium px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-teal-300 hover:border-teal-700/60 hover:bg-slate-850 transition-all text-left"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trust Badges Ribbon */}
        <div className="mt-14 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">100% Refundable</div>
              <div className="text-xs text-slate-400">₹2,000 Token Safety Guarantee</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">4.9 / 5.0 Rating</div>
              <div className="text-xs text-slate-400">From 1,200+ Verified Couples</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Verified Villas</div>
              <div className="text-xs text-slate-400">Curated 5-Star Boutique Stays</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Human Advisor Sign-Off</div>
              <div className="text-xs text-slate-400">Flight & Visa Hand-Holding</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
