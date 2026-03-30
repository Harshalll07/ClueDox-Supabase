import { EdenHero } from "@/components/eden/EdenHero";
import { EdenFeatures } from "@/components/eden/EdenFeatures";
import { EdenUseCases } from "@/components/eden/EdenUseCases";
import { EdenCTA } from "@/components/eden/EdenCTA";
import { LenisProvider } from "@/components/LenisProvider";

const EdenHomePage = () => {
  return (
    <LenisProvider>
      <main className="bg-[#08130E] min-h-screen text-[#F5F4F0] font-sans selection:bg-[#F5F4F0]/30 selection:text-white">
        <EdenHero />
        <EdenFeatures />
        <EdenUseCases />
        <EdenCTA />
      </main>
    </LenisProvider>
  );
};

export default EdenHomePage;
