import { useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";

export const EdenHero = () => {
  const wordsRef = useRef<HTMLSpanElement[]>([]);
  const heroRef = useRef<HTMLDivElement>(null);
  const words = ["Thinking", "Writing", "Brand"];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Setup initial states
      gsap.set(wordsRef.current.slice(1), { yPercent: 100, opacity: 0 });
      gsap.set(wordsRef.current[0], { yPercent: 0, opacity: 1 });

      const tl = gsap.timeline({ repeat: -1 });
      const duration = 0.8;
      const stagger = 2.5; // time each word stays on screen

      words.forEach((_, i) => {
        const nextI = (i + 1) % words.length;

        tl.to(
          wordsRef.current[i],
          {
            yPercent: -100,
            opacity: 0,
            duration,
            ease: "power4.inOut", // Closest to cubic-bezier(0.76, 0, 0.24, 1) without CustomEase
          },
          `+=${stagger}`
        ).to(
          wordsRef.current[nextI],
          {
            yPercent: 0,
            opacity: 1,
            duration,
            ease: "power4.inOut",
          },
          `<`
        );
      });
    }, heroRef);

    return () => ctx.revert(); // cleanup
  }, []);

  return (
    <div ref={heroRef} className="relative w-full overflow-hidden bg-[#08130E] text-[#F5F4F0] selection:bg-[#F5F4F0]/30">
      {/* Navbar with blur */}
      <nav className="fixed top-0 left-0 w-full z-[100] px-6 py-5 border-b border-white/5 bg-[#08130E]/60 backdrop-blur-md transition-all duration-300">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Sortifi</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-white/70">
            <Link to="#" className="hover:text-white transition-colors">Product</Link>
            <Link to="#" className="hover:text-white transition-colors">Resources</Link>
            <Link to="#" className="hover:text-white transition-colors">Company</Link>
            <Link to="#" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-[13px] font-medium text-white/70 hover:text-white transition-colors">Log In</Link>
            <Link to="/dashboard" className="px-4 py-2 bg-[#F5F4F0] text-[#08130E] text-[13px] font-semibold rounded-full hover:bg-white hover:scale-105 transition-all duration-300">
              Start Building
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center pt-24 px-6 z-10 w-full mx-auto max-w-[1400px]">
        <div className="max-w-[1000px] mx-auto text-center will-change-transform z-20 translate-y-[-10vh]">
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-normal leading-[1.1] tracking-tight mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
            A space for your <br />
            <span className="inline-flex overflow-hidden relative min-w-[200px] md:min-w-[400px] h-[1.2em] align-bottom">
              {words.map((word, i) => (
                <span
                  key={word}
                  ref={(el) => {
                    if (el) wordsRef.current[i] = el;
                  }}
                  className="absolute inset-0 flex items-center justify-center italic opacity-0 will-change-transform text-[#A3B8AD]"
                >
                  {word}
                </span>
              ))}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 max-w-[500px] mx-auto leading-relaxed mb-10 tracking-tight font-sans">
            Organize everything visually. Connect notes, files, and tasks on an infinite canvas built for creative minds.
          </p>

          <Link to="/upload" className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#F5F4F0] text-[#08130E] rounded-full font-bold text-[14px] hover:bg-white hover:scale-105 transition-all duration-300">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bottom UI Peek Anchor */}
        <div className="absolute -bottom-[10vh] left-1/2 -translate-x-1/2 w-full max-w-[1200px] px-6 pointer-events-none z-0">
          <div className="w-full aspect-[16/9] rounded-[24px] bg-[#1A2521] border border-white/5 shadow-2xl overflow-hidden relative opacity-70">
             {/* Mock UI Structure inside peek */}
             <div className="p-4 border-b border-white/5 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
             </div>
             <div className="p-8">
                <div className="w-1/3 h-6 bg-white/5 rounded-md mb-4" />
                <div className="w-full h-3 bg-white/5 rounded-sm mb-2" />
                <div className="w-2/3 h-3 bg-white/5 rounded-sm" />
             </div>
          </div>
          {/* Fading gradient to blend the peek into the dark root */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#08130E] via-[#08130E]/50 to-transparent" />
        </div>
      </section>
    </div>
  );
};
