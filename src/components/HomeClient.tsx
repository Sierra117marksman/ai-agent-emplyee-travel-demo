'use client';

import React, { useState, useRef } from 'react';
import { TravelPackage } from '@/lib/packages';
import TravelHeader from '@/components/TravelHeader';
import HeroBanner from '@/components/HeroBanner';
import PackageGrid from '@/components/PackageGrid';
import TestimonialsSection from '@/components/TestimonialsSection';
import TravelFooter from '@/components/TravelFooter';
import ArjunChatWidget, { ArjunChatWidgetRef } from '@/components/ArjunChatWidget';

export default function HomeClient() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const arjunRef = useRef<ArjunChatWidgetRef>(null);

  const handleOpenWithPrompt = (prompt: string) => {
    setIsChatOpen(true);
    setTimeout(() => {
      arjunRef.current?.sendMessage(prompt);
    }, 50);
  };

  const handleSelectPackage = (pkg: TravelPackage) => {
    setIsChatOpen(true);
    setTimeout(() => {
      arjunRef.current?.selectPackage(pkg);
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <TravelHeader />
      <main className="flex-1">
        <HeroBanner onOpenArjunWithPrompt={handleOpenWithPrompt} />
        <PackageGrid onSelectPackageForArjun={handleSelectPackage} />
        <TestimonialsSection />
      </main>
      <TravelFooter />

      {/* Floating Autonomous Sales Agent Widget */}
      <ArjunChatWidget
        ref={arjunRef}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((prev) => !prev)}
      />
    </div>
  );
}
