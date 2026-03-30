import { useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export const EdenCTA = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Personas Refs
  const carouselRef = useRef<HTMLDivElement>(null);
  const personasRef = useRef<HTMLDivElement[]>([]);

  // Footer Refs
  const footerRef = useRef<HTMLElement>(null);
  const footerBgRef = useRef<HTMLDivElement>(null);

  const personas = [
    { name: "Designers", color: "bg-[#F1DECF]", img: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&q=80&w=600" },
    { name: "Founders", color: "bg-[#D6E0D9]", img: "https://images.unsplash.com/photo-1556761175-5973dc0f32d7?auto=format&fit=crop&q=80&w=600" },
    { name: "Engineers", color: "bg-[#E6DBED]", img: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=600" },
    { name: "Writers", color: "bg-[#F5EEDC]", img: "https://images.unsplash.com/photo-1455390582262-044cdead27c8?auto=format&fit=crop&q=80&w=600" },
  ];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      
      // 1. Personas Staggered Entrance
      gsap.fromTo(
        personasRef.current,
        { y: 100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: "power3.out",
          duration: 1,
          scrollTrigger: {
            trigger: carouselRef.current,
            start: "top 80%",
          }
        }
      );

      // 2. Footer Deep Parallax Zoom
      // Scales the massive background from 1 to 1.15 as you scroll into the footer
      gsap.fromTo(
        footerBgRef.current,
        { scale: 1 },
        {
          scale: 1.15,
          ease: "none",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          }
        }
      );

    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-full bg-[#08130E] text-[#F5F4F0]">
      
      {/* 6. User Personas Carousel */}
      <div className="py-24 border-t border-white/5">
         <div className="px-6 md:px-12 mb-12">
            <h2 className="text-4xl md:text-5xl tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Built for the<br/>curious minds.</h2>
         </div>
         
         {/* Snap Scrolling Container */}
         <div 
           ref={carouselRef} 
           className="w-full flex gap-6 px-6 md:px-12 pb-12 overflow-x-auto snap-x snap-mandatory"
           style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
         >
            {/* Hide webkit scrollbar but preserve functionality */}
            <style dangerouslySetInnerHTML={{__html: `::-webkit-scrollbar { display: none; }`}} />

            {personas.map((persona, i) => (
               <div 
                 key={persona.name}
                 ref={el => { if(el) personasRef.current[i] = el; }}
                 className="flex-none w-[300px] md:w-[400px] h-[450px] rounded-[32px] overflow-hidden snap-center group will-change-transform"
               >
                  {/* Top Pastel Half */}
                  <div className={cn("w-full h-[40%] p-8 flex items-end", persona.color)}>
                     <h3 className="text-2xl font-bold text-[#08130E] tracking-tight">{persona.name}</h3>
                  </div>
                  {/* Bottom Image Half */}
                  <div className="w-full h-[60%] relative overflow-hidden">
                     <img 
                       src={persona.img} 
                       alt={persona.name} 
                       className="w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                     />
                     <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* 7. Footer Depth Parallax */}
      <footer ref={footerRef} className="relative w-full h-screen min-h-[600px] overflow-hidden flex items-center justify-center">
         
         {/* The Massive UI Background Grid */}
         {/* It sits behind the text and scales up on scroll */}
         <div 
           ref={footerBgRef}
           className="absolute inset-[-10%] w-[120%] h-[120%] pointer-events-none opacity-20 z-0 origin-center will-change-transform bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#08130E] via-[#08130E]/80 to-[#08130E] z-10" />

         <div className="relative z-20 text-center px-6 max-w-[800px] mx-auto mt-20">
            <h2 className="text-6xl md:text-8xl tracking-tight leading-[1] mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              Experience<br/>Eden Today.
            </h2>
            <p className="text-lg md:text-xl text-[#F5F4F0]/60 mb-10 max-w-[400px] mx-auto font-sans">
              Join thousands of creatives mapping their minds and organizing their lives.
            </p>
            
            <Link to="/upload" className="inline-flex items-center gap-2 px-8 py-4 bg-[#7EE787] text-[#08130E] rounded-full font-bold text-[16px] hover:bg-white hover:scale-105 transition-all duration-300">
              Sign Up Now <ArrowRight className="w-5 h-5" />
            </Link>
         </div>
         
         {/* Minimal Real Footer Links at very bottom */}
         <div className="absolute bottom-6 w-full px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 z-20 overflow-hidden">
            <span className="text-sm font-bold text-white/40" style={{ fontFamily: "'Playfair Display', serif" }}>Sortifi © 2026</span>
            <div className="flex items-center gap-6 text-[13px] text-white/40">
               <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
               <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
               <span className="hover:text-white cursor-pointer transition-colors">Twitter</span>
            </div>
         </div>
         
      </footer>
    </div>
  );
};
