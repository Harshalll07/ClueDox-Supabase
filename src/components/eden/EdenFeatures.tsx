import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { Layout, MessageSquare, Briefcase, FileText, Zap, Link } from "lucide-react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export const EdenFeatures = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Manifesto Refs
  const appImageRef = useRef<HTMLDivElement>(null);
  const manifestoTextRef = useRef<HTMLDivElement>(null);
  const paragraphsRef = useRef<HTMLParagraphElement[]>([]);
  
  // Integrations Orbit Refs
  const orbitContainerRef = useRef<HTMLDivElement>(null);
  const iconsRef = useRef<HTMLDivElement[]>([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      
      // 1. App Reveal Parallax (scrubbed)
      // The image translates slightly upwards as you scroll down
      gsap.to(appImageRef.current, {
        yPercent: -10, // ~ -0.1 ratio
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        }
      });

      // 2. Manifesto Staggered Paragraph Reveal
      gsap.fromTo(
        paragraphsRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.2,
          ease: "power2.out",
          duration: 1,
          scrollTrigger: {
            trigger: manifestoTextRef.current,
            start: "top 85%", // Triggers when the top of the text block is 85% down the viewport
          }
        }
      );

      // 3. Integrations Orbit Magnet Reveal (Scrubbed)
      // Initial state pushed outwards and scaled 0
      gsap.set(iconsRef.current, { 
        scale: 0, 
        xPercent: (i) => i % 2 === 0 ? -100 : 100, 
        yPercent: (i) => i < 2 ? -100 : 100 
      });

      gsap.to(iconsRef.current, {
        scale: 1,
        xPercent: 0,
        yPercent: 0,
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: orbitContainerRef.current,
          start: "top 80%",
          end: "center center",
          scrub: 1, // 1 second smoothing makes it feel magnetic and heavy
        }
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="bg-[#08130E] text-[#F5F4F0] relative z-20 pb-40">
      
      {/* App Image Parallax Area */}
      <div className="max-w-[1200px] mx-auto px-6 pt-32 mb-24 relative z-20">
         <div 
           ref={appImageRef}
           className="w-full aspect-[16/9] md:aspect-[21/9] rounded-[24px] bg-[#122019] border border-white/5 overflow-hidden"
           style={{ boxShadow: '0px 40px 80px rgba(0,0,0,0.5)' }}
         >
           <div className="w-full h-10 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#33463D]" />
              <div className="w-3 h-3 rounded-full bg-[#33463D]" />
              <div className="w-3 h-3 rounded-full bg-[#33463D]" />
           </div>
           
           {/* Abstract Editor App Layout Mockup */}
           <div className="flex bg-[#08130E] h-full">
              <div className="w-64 border-r border-white/5 p-6 space-y-4">
                 <div className="w-full h-8 bg-white/5 rounded-md" />
                 <div className="w-3/4 h-4 bg-white/5 rounded-sm" />
                 <div className="w-1/2 h-4 bg-white/5 rounded-sm" />
              </div>
              <div className="flex-1 p-10 space-y-6">
                 <div className="w-1/3 h-10 bg-white/5 rounded-md mb-8" />
                 <div className="max-w-2xl space-y-4">
                   <div className="w-full h-4 bg-white/5 rounded-sm" />
                   <div className="w-full h-4 bg-white/5 rounded-sm" />
                   <div className="w-4/5 h-4 bg-white/5 rounded-sm" />
                 </div>
              </div>
           </div>
         </div>
      </div>

      {/* Manifesto Text */}
      <div ref={manifestoTextRef} className="max-w-[800px] mx-auto px-6 text-center space-y-8 mb-40">
        {[
          "We all get stuck. Our ideas scatter across a dozen different apps, buried in noisy chat threads or lost in endless document folders.",
          "We believed there had to be a better way to capture thought. Not a rigid database, not a chaotic whiteboard, but a fluid space that adapts to how your brain actually works.",
          "Sortifi is the realization of that belief. A single canvas where your team's knowledge naturally connects, organizes itself, and becomes instantly useful."
        ].map((sentence, i) => (
          <p 
            key={i} 
            ref={(el) => { if (el) paragraphsRef.current[i] = el; }}
            className={cn(
               "text-xl md:text-3xl leading-snug tracking-tight font-medium max-w-[65ch] mx-auto",
               i === 0 ? "text-white" : "text-white/40"
            )}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {sentence}
          </p>
        ))}
      </div>

      {/* Integrations Orbit */}
      <div ref={orbitContainerRef} className="relative w-full max-w-[1000px] mx-auto min-h-[600px] flex items-center justify-center py-20 overflow-hidden">
        
        {/* Central Phone Mockup */}
        <div className="relative w-[280px] h-[580px] bg-[#122019] rounded-[40px] border-4 border-[#33463D] shadow-2xl z-10 overflow-hidden flex flex-col pointer-events-none">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#33463D] rounded-b-xl z-20" /> {/* Notch */}
           
           {/* Infinitely Looping Inner Scroll animation */}
           <div className="flex-1 w-full bg-[#08130E] pt-12 p-4 relative overflow-hidden">
             
             <style dangerouslySetInnerHTML={{__html: `
               @keyframes phone-scroll {
                 0% { transform: translateY(0); }
                 100% { transform: translateY(-50%); }
               }
               .animate-phone-scroll {
                 animation: phone-scroll 20s linear infinite;
               }
             `}} />
             
             <div className="animate-phone-scroll space-y-4">
                {/* Loop content twice to ensure seamless infinite scroll visually */}
                <span>
                  {[1,2,3,4,5,6].map(i => (
                     <div key={`a-${i}`} className="w-full bg-[#122019] border border-white/5 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-white/10" />
                           <div className="flex-1 h-3 bg-white/10 rounded-sm" />
                        </div>
                        <div className="w-full h-16 bg-white/5 rounded-lg" />
                     </div>
                  ))}
                  {[1,2,3,4,5,6].map(i => (
                     <div key={`b-${i}`} className="w-full bg-[#122019] border border-white/5 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full bg-white/10" />
                           <div className="flex-1 h-3 bg-white/10 rounded-sm" />
                        </div>
                        <div className="w-full h-16 bg-white/5 rounded-lg" />
                     </div>
                  ))}
                </span>
             </div>
           </div>
        </div>

        {/* Orbiting Icons */}
        <div className="absolute inset-0 z-0">
           {/* Notion-ish icon */}
           <div ref={el => { if (el) iconsRef.current[0] = el; }} className="absolute top-[20%] left-[15%] md:left-[25%] p-4 bg-[#122019] border border-white/10 rounded-2xl shadow-xl">
              <FileText className="w-8 h-8 text-white/80" />
           </div>
           
           {/* Slack-ish icon */}
           <div ref={el => { if (el) iconsRef.current[1] = el; }} className="absolute top-[15%] right-[15%] md:right-[25%] p-4 bg-[#122019] border border-white/10 rounded-2xl shadow-xl">
              <MessageSquare className="w-8 h-8 text-[#A3B8AD]" />
           </div>
           
             {/* Figma-ish icon */}
             <div ref={el => { if (el) iconsRef.current[2] = el; }} className="absolute bottom-[20%] left-[10%] md:left-[20%] p-4 bg-[#122019] border border-white/10 rounded-2xl shadow-xl">
              <Layout className="w-8 h-8 text-white/50" />
           </div>
           
             {/* Zapier-ish icon */}
             <div ref={el => { if (el) iconsRef.current[3] = el; }} className="absolute bottom-[25%] right-[10%] md:right-[20%] p-4 bg-[#122019] border border-white/10 rounded-2xl shadow-xl">
              <Zap className="w-8 h-8 text-yellow-500/80" />
           </div>
        </div>

        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-20 text-center w-full">
           <h2 className="text-3xl md:text-5xl tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
             Connect your world.
           </h2>
           <p className="text-white/60 font-sans tracking-tight">Syncs endlessly with everything you already use.</p>
        </div>

      </div>

    </div>
  );
};
