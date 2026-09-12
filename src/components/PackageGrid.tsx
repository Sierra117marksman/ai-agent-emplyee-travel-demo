'use client';

import React, { useState } from 'react';
import { TRAVEL_PACKAGES, TravelPackage } from '@/lib/packages';
import { Clock, Star, Check, Sparkles, ArrowRight, MapPin } from 'lucide-react';

interface PackageGridProps {
  onSelectPackageForArjun: (pkg: TravelPackage) => void;
}

export default function PackageGrid({ onSelectPackageForArjun }: PackageGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Experiences' },
    { id: 'honeymoon', label: 'Honeymoon & Romantic' },
    { id: 'luxury', label: 'Ultra Luxury' },
    { id: 'adventure', label: 'Adventure & Islands' },
    { id: 'relaxed', label: 'Scenic & Relaxed' }
  ];

  const filteredPackages =
    selectedCategory === 'all'
      ? TRAVEL_PACKAGES
      : TRAVEL_PACKAGES.filter((p) => p.category === selectedCategory);

  return (
    <section id="packages" className="py-20 bg-slate-900 border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950 border border-teal-800 text-teal-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Official 2026 Curated Portfolio</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Featured Luxury Itineraries
            </h2>
            <p className="mt-2 text-slate-400 text-base max-w-2xl">
              Every package is fully customizable. Secure your selected departure dates today with a refundable{' '}
              <strong className="text-white font-medium">₹2,000 booking token</strong>.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Package Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all hover:shadow-2xl hover:shadow-teal-950/40 flex flex-col group"
            >
              {/* Card Header Gradient Banner */}
              <div className={`h-40 bg-gradient-to-br ${pkg.gradient} p-6 flex flex-col justify-between relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/40 text-white backdrop-blur-sm border border-white/10">
                    {pkg.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-black/40 text-amber-300 backdrop-blur-sm border border-white/10">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{pkg.rating.toFixed(1)}</span>
                    <span className="text-white/70 font-normal">({pkg.reviewsCount})</span>
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium mb-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-300" />
                    <span>{pkg.destination}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white leading-snug drop-shadow-sm">
                    {pkg.title}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-4 pb-4 border-b border-slate-850">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>{pkg.duration}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-teal-400">Private Villa & Cab</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-5">
                    {pkg.description}
                  </p>

                  <div className="space-y-2 mb-6">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Itinerary Highlights:
                    </div>
                    {pkg.highlights.map((highlight, hIdx) => (
                      <div key={hIdx} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Pricing & Action Footer */}
                <div className="pt-5 border-t border-slate-850 mt-4">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Starting From</div>
                      <div className="text-2xl font-black text-white flex items-baseline gap-1">
                        ₹{pkg.pricePerPerson.toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-slate-400">/person</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold text-teal-400 uppercase">Token Reservation</div>
                      <div className="text-sm font-bold text-teal-300">₹2,000 Only</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectPackageForArjun(pkg)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-sm shadow-md shadow-teal-500/20 hover:brightness-110 active:scale-98 transition-all"
                  >
                    <span>Reserve with Arjun</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
