"use client";


import FeaturesSection from "@/components/FeaturesSection";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import PricingSection from "@/components/PricingSection";


export default function Home() {
  return (
    <main className="min-h-screen bg-black">
  
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
    
    </main>
  );
}