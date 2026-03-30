import { useRef, useLayoutEffect, useState, useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { Link2, Sparkles, Youtube, CheckCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export const EdenUseCases = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Canvas Refs
  const canvasSectionRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement[]>([]);
  const line1Ref = useRef<SVGPathElement>(null);
  const line2Ref = useRef<SVGPathElement>(null);
  const aiNodeRef = useRef<HTMLDivElement>(null);
  const aiTextRef = useRef<HTMLSpanElement>(null);

  // Bento Box Refs
  const bentoGridRef = useRef<HTMLDivElement>(null);
  const bentoCardsRef = useRef<HTMLDivElement[]>([]);

  // AI State
  const [aiState, setAiState] = useState<"typing" | "loading" | "done">("typing");

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {

      // Canvas Pinning Wipe
      // We pin the canvas section so the user scrolls to draw the lines and pop nodes
      const canvasTl = gsap.timeline({
        scrollTrigger: {
          trigger: canvasSectionRef.current,
          start: "top top",
          end: "+=1500", // pin duration
          pin: true,
          scrub: 1,
        }
      });

      // Initially hide nodes
      gsap.set(nodesRef.current, { scale: 0, opacity: 0 });
      gsap.set(aiNodeRef.current, { scale: 0, opacity: 0 });

      // Draw SVG Lines setup
      if (line1Ref.current && line2Ref.current) {
        const l1Len = line1Ref.current.getTotalLength();
        const l2Len = line2Ref.current.getTotalLength();
        
        gsap.set(line1Ref.current, { strokeDasharray: l1Len, strokeDashoffset: l1Len });
        gsap.set(line2Ref.current, { strokeDasharray: l2Len, strokeDashoffset: l2Len });

        // Node 1 (Center)
        canvasTl.to(nodesRef.current[0], { scale: 1, opacity: 1, ease: "back.out(1.7)", duration: 0.5 })
          // Draw Line 1
          .to(line1Ref.current, { strokeDashoffset: 0, ease: "none", duration: 1 })
          // Node 2 (Top Left)
          .to(nodesRef.current[1], { scale: 1, opacity: 1, ease: "back.out(1.7)", duration: 0.5 })
          // Draw Line 2
          .to(line2Ref.current, { strokeDashoffset: 0, ease: "none", duration: 1 })
          // AI Node (Bottom Right)
          .to(aiNodeRef.current, { scale: 1, opacity: 1, ease: "back.out(1.7)", duration: 0.5, onComplete: startAiSimulation });
      }

      // Bento Box Entrance
      gsap.set(bentoCardsRef.current, {
        transformPerspective: 1000,
        rotationX: 15,
        y: 50,
        opacity: 0
      });

      gsap.to(bentoCardsRef.current, {
        rotationX: 0,
        y: 0,
        opacity: 1,
        stagger: 0.1,
        ease: "power3.out",
        duration: 1,
        scrollTrigger: {
          trigger: bentoGridRef.current,
          start: "top 80%",
        }
      });

    }, containerRef);
    return () => ctx.revert();
  }, []);

  // AI Generation Simulation
  const startAiSimulation = () => {
    // 1. Typing Phase
    const textToType = "Create an engaging YouTube script...";
    setAiState("typing");
    let currentText = "";
    let i = 0;
    
    // Quick typing effect
    const typeInterval = setInterval(() => {
      currentText += textToType.charAt(i);
      if (aiTextRef.current) aiTextRef.current.innerText = currentText;
      i++;
      if (i >= textToType.length) {
        clearInterval(typeInterval);
        setTimeout(() => setAiState("loading"), 500); // Wait, then load
      }
    }, 40);
  };

  useEffect(() => {
    if (aiState === "loading") {
      setTimeout(() => setAiState("done"), 2000); // 2 seconds of shimmering loading
    }
  }, [aiState]);

  // Bento Box Mouse Tracking Glow
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardElement: HTMLDivElement | null) => {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardElement.style.setProperty("--mouse-x", `${x}px`);
    cardElement.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div ref={containerRef} className="w-full relative z-30">
      
      {/* 4. Canvas Wipe Section */}
      {/* Wipe from Dark Green #08130E to Off-white #F5F4F0 instantly as it reaches top */}
      <div className="w-full bg-[#08130E] transition-colors duration-1000">
        <div ref={canvasSectionRef} className="w-full min-h-screen bg-[#F5F4F0] text-[#08130E] py-20 relative overflow-hidden flex flex-col items-center">
          
          <div className="text-center z-10 sticky top-20 px-6">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              A Studio For Creation.
            </h2>
            <p className="text-xl text-[#08130E]/60 max-w-[600px] mx-auto font-sans">
              Drag, drop, and map out your thoughts spatially. No rigid directories.
            </p>
          </div>

          {/* Node Map Area */}
          <div className="relative w-full max-w-[1200px] h-[600px] mt-20">
             
             {/* SVG Connectors */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ overflow: 'visible' }}>
               <path ref={line1Ref} d="M 600,300 Q 400,100 300,150" fill="none" stroke="#D1CEC7" strokeWidth="4" strokeLinecap="round" />
               <path ref={line2Ref} d="M 600,300 Q 800,200 900,400" fill="none" stroke="#D1CEC7" strokeWidth="4" strokeLinecap="round" />
             </svg>

             {/* Center Node (Project Brief) */}
             <div ref={el => { if (el) nodesRef.current[0] = el; }} className="absolute top-[250px] left-[550px] w-64 bg-white rounded-2xl shadow-xl p-4 z-10 border border-[#D1CEC7]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded bg-[#1B3B2B]/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#1B3B2B]" />
                  </div>
                  <h4 className="font-bold text-[14px]">Q3 Campaign Brief</h4>
                </div>
                <p className="text-[12px] text-gray-500 leading-snug">The core brief outlining the autumn product launch strategy.</p>
             </div>

             {/* Top Left Node (Reference Material) */}
             <div ref={el => { if (el) nodesRef.current[1] = el; }} className="absolute top-[100px] left-[200px] w-56 bg-white rounded-2xl shadow-xl p-4 z-10 border border-[#D1CEC7]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded bg-[#C93C37]/10 flex items-center justify-center">
                    <Link2 className="w-4 h-4 text-[#C93C37]" />
                  </div>
                  <h4 className="font-bold text-[14px]">Moodboard Ref</h4>
                </div>
                <img src="https://images.unsplash.com/photo-1542273917363-3b1817f69a56?auto=format&fit=crop&q=80&w=400" alt="Ref" className="w-full h-24 object-cover rounded-lg mt-2 grayscale hover:grayscale-0 transition-all" />
             </div>

             {/* Bottom Right AI Node */}
             <div ref={aiNodeRef} className="absolute top-[350px] left-[800px] w-[320px] bg-white rounded-2xl shadow-xl p-4 z-10 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                  </div>
                  <h4 className="font-bold text-[14px]">Sortifi AI</h4>
                </div>

                <div className="w-full bg-[#F5F4F0] rounded-xl p-3 min-h-[40px] text-[13px] text-gray-700 font-medium">
                  {aiState === "typing" && (
                    <span ref={aiTextRef} className="border-r-2 border-primary pr-1"></span>
                  )}
                  {aiState === "loading" && (
                    <div className="w-full h-[150px] rounded-lg overflow-hidden relative" style={{ background: 'linear-gradient(90deg, #F0EFEA 25%, #E8E7E2 50%, #F0EFEA 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite linear' }} >
                      <style dangerouslySetInnerHTML={{__html: `
                        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                      `}} />
                    </div>
                  )}
                  {aiState === "done" && (
                    <div className="space-y-2 opacity-0 animate-in fade-in fill-mode-forwards duration-500">
                       <p className="font-bold text-gray-900 mb-2">Generated Video Outline:</p>
                       <div className="flex items-start gap-2 text-xs text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5"/> Hook (0:00-0:15)</div>
                       <div className="flex items-start gap-2 text-xs text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5"/> Problem State (0:15-1:00)</div>
                       <div className="flex items-start gap-2 text-xs text-gray-600"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5"/> Reveal Solution (1:00-2:30)</div>
                    </div>
                  )}
                </div>
             </div>

          </div>
        </div>
      </div>

      {/* 5. Bento Box Features Grid */}
      <div className="w-full bg-[#08130E] py-32 px-6">
         <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16">
               <h2 className="text-4xl md:text-5xl font-bold text-[#F5F4F0] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Everything you need.</h2>
               <p className="text-[#F5F4F0]/60">Built natively, heavily optimized.</p>
            </div>

            {/* CSS Grid: 12 Columns */}
            <div ref={bentoGridRef} className="grid grid-cols-1 md:grid-cols-12 auto-rows-[300px] md:auto-rows-[360px] gap-6">
              
              {/* Card 1 (Span 8) */}
              <div 
                ref={el => { if(el) bentoCardsRef.current[0] = el; }}
                onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                className="group md:col-span-8 bg-[#122019] border border-white/5 rounded-3xl p-8 relative overflow-hidden will-change-transform"
              >
                 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%)' }} />
                 <h3 className="text-2xl font-bold text-white mb-2">Universal Search</h3>
                 <p className="text-white/50 text-sm max-w-[300px]">Find any document across your entire logical sphere with hybrid intent detection.</p>
                 <div className="absolute bottom-6 right-6 w-3/4 h-48 bg-[#08130E] border border-white/10 rounded-2xl shadow-2xl p-4 translate-y-8 group-hover:translate-y-4 transition-transform duration-500">
                    <div className="flex gap-2">
                       <span className="px-2 py-1 bg-white/10 rounded text-xs text-white">Intent: Document Retrieval</span>
                    </div>
                 </div>
              </div>

              {/* Card 2 (Span 4) */}
              <div 
                ref={el => { if(el) bentoCardsRef.current[1] = el; }}
                onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                className="group md:col-span-4 bg-[#122019] border border-white/5 rounded-3xl p-8 relative overflow-hidden will-change-transform"
              >
                 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(163, 184, 173,0.1), transparent 40%)' }} />
                 <h3 className="text-2xl font-bold text-white mb-2">Automated Tags</h3>
                 <p className="text-white/50 text-sm">Sortifi AI reads and categorizes your work silently.</p>
                 <div className="absolute bottom-6 left-8 flex gap-2 flex-wrap max-w-[80%]">
                    {["Finance", "Invoices", "Q3", "Legal", "Marketing", "Drafts"].map((tag, i) => (
                      <span key={tag} className="px-3 py-1 bg-[#1B3B2B] text-[#A3B8AD] rounded-full text-xs font-semibold scale-90 group-hover:scale-100 transition-transform duration-300 delay-[${i * 50}ms]">
                        {tag}
                      </span>
                    ))}
                 </div>
              </div>

               {/* Card 3 (Span 4) */}
               <div 
                ref={el => { if(el) bentoCardsRef.current[2] = el; }}
                onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                className="group md:col-span-4 bg-[#122019] border border-white/5 rounded-3xl p-8 relative overflow-hidden will-change-transform"
              >
                 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%)' }} />
                 <h3 className="text-2xl font-bold text-white mb-2">Smart Folders</h3>
                 <p className="text-white/50 text-sm">Folders that organize themselves.</p>
              </div>

              {/* Card 4 (Span 8) */}
              <div 
                ref={el => { if(el) bentoCardsRef.current[3] = el; }}
                onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                className="group md:col-span-8 bg-[#122019] border border-white/5 rounded-3xl p-8 relative overflow-hidden will-change-transform"
              >
                 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%)' }} />
                 <h3 className="text-2xl font-bold text-white mb-2">Infinite Visual Canvas</h3>
                 <p className="text-white/50 text-sm max-w-[300px]">Because creativity isn't linear.</p>
                 <div className="absolute bottom-[-20%] right-[-10%] w-[120%] h-[120%] rounded-full opacity-10 blur-3xl scale-95 group-hover:scale-100 transition-transform duration-700 bg-white" />
              </div>

            </div>
         </div>
      </div>
    </div>
  );
};
