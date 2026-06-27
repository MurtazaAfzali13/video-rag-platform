"use client";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-black overflow-y-auto">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
    </main>
  );
}
