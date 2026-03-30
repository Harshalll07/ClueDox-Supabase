// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from "@/integrations/supabase/client";
import './CluedoxLandingPage.css';

gsap.registerPlugin(ScrollTrigger);

import './waitlist.css';

export default function CluedoxLandingPage() {
  const navigate = useNavigate();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const solutionRef = useRef<HTMLElement>(null);
  const words = React.useMemo(() => ["Memory", "Meaning", "Content", "Context", "Dates"], []);
  const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
  const [currentText, setCurrentText] = React.useState("Memory");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = React.useState(false);
  const [waitlistStatus, setWaitlistStatus] = React.useState<'idle' | 'submitting' | 'success'>('idle');
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [waitlistError, setWaitlistError] = React.useState('');
  const [showScrollTop, setShowScrollTop] = React.useState(false);

  React.useEffect(() => {
    document.title = "Cluedox - Intelligent File Management for Indian Professionals";

    const description = document.createElement('meta');
    description.name = "description";
    description.content = "Cluedox organises every document you own automatically. Search by meaning, get expiry reminders, and never lose a file again. Built for Indian professionals.";
    document.head.appendChild(description);

    const favicon = document.createElement('link');
    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = "https://cdn-icons-png.flaticon.com/512/3767/3767084.png"; // Placeholder 32x32 PNG icon
    document.head.appendChild(favicon);

    const trackVisitor = async () => {
      try {
        await supabase.rpc('increment_visitor_count');
      } catch (err) {
        console.error('Visitor tracking failed:', err);
      }
    };
    trackVisitor();

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.head.removeChild(description);
      document.head.removeChild(favicon);
    };
  }, []);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistError('');
    setWaitlistStatus('submitting');

    try {
      const { error } = await supabase.from('waitlist_entries').insert([{ name, email }]);
      if (error) {
        if (error.code === '23505') {
          throw new Error('This email is already on the waitlist.');
        }
        throw new Error(error.message || 'Something went wrong.');
      }
      setWaitlistStatus('success');
    } catch (err: any) {
      setWaitlistError(err.message);
      setWaitlistStatus('idle');
    }
  };

  React.useEffect(() => {
    let timer;
    const currentFullWord = words[currentWordIndex];
    if (isDeleting) {
      if (currentText === "") {
        setIsDeleting(false);
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
      } else {
        timer = setTimeout(() => {
          setCurrentText(prev => prev.slice(0, -1));
        }, 50);
      }
    } else {
      if (currentText === currentFullWord) {
        timer = setTimeout(() => setIsDeleting(true), 2000);
      } else {
        timer = setTimeout(() => {
          setCurrentText(currentFullWord.substring(0, currentText.length + 1));
        }, 100);
      }
    }
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words]);

  useGSAP(() => {

    /* ── PARTICLES ── */
    const initParticles = () => {
      const canvas = document.getElementById('particles-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let W: number, H: number, dots: any[] = [];

      const resize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = document.body.scrollHeight;
        dots = [];
        for (let i = 0; i < 180; i++) {
          dots.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.15 + 0.05 });
        }
        drawDots();
      };

      const drawDots = () => {
        ctx.clearRect(0, 0, W, H);
        dots.forEach(d => {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${d.o})`;
          ctx.fill();
        });
      };

      resize();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    };
    /* ── PARTICLES ── */
    const particleCleanup = initParticles();

    /* ── NAVBAR SCROLL ── */
    const navbar = document.getElementById('navbar');
    const handleNavbarScroll = () => {
      if (!navbar) return;
      if (window.scrollY > 60) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    };
    window.addEventListener('scroll', handleNavbarScroll, { passive: true });

    /* ── MASTER HERO TIMELINE ── */
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    gsap.fromTo('#navbar',
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.1 }
    );

    tl.to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.8 }, "+=0.2")
      .to('.hero-heading', { opacity: 1, duration: 0.8 }, "-=0.4")
      .to('.hero-sub', { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
      .to('.hero-actions', { opacity: 1, y: 0, duration: 0.8 }, "-=0.6")
      .fromTo('.hero-bg-frames .hbf-card',
        { opacity: 0, scale: 0.9 },
        { opacity: 0.5, scale: 1, stagger: 0.08, duration: 0.8 }, "-=0.8")
      .fromTo('#product-window',
        { opacity: 0, y: 60, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'expo.out' },
        "-=0.6"
      )
      .fromTo('.pw-sidebar .pw-sb-item',
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, stagger: 0.04, duration: 0.4, ease: 'power2.out' },
        "-=0.8"
      )
      .fromTo('.pw-file-card',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.04, duration: 0.5, ease: 'power2.out' },
        "-=0.6"
      );

    /* ── PRODUCT WINDOW CONTINUOUS FLOATING ── */
    gsap.to('#product-window', {
      y: "-=12",
      duration: 4,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: 2.5
    });

    /* ── FAINT CARDS ANIMATION ── */
    gsap.to('.hero-bg-frames .hbf-card', {
      y: -20,
      ease: 'sine.inOut',
      duration: 3,
      stagger: {
        each: 0.4,
        yoyo: true,
        repeat: -1
      }
    });

    /* ── NARRATIVE PARAGRAPHS ── */
    gsap.utils.toArray('.narrative-p').forEach(el => {
      gsap.to(el, {
        scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 50%', scrub: false },
        opacity: 1, y: 0, duration: 0.7, ease: 'power2.out'
      });
    });

    /* ══ WIRE ANIMATION (RESPONSIVE) ══ */
    const mm = gsap.matchMedia();

    /* ── WORD SLIDERS (DYNAMIC WIDTH) ── */
    const initWordSliders = () => {
      const sliders = document.querySelectorAll('.word-slider');
      sliders.forEach(slider => {
        const inner = slider.querySelector('.word-slider-inner') as HTMLElement;
        const words = Array.from(inner.querySelectorAll('.ws-word')) as HTMLElement[];
        if (words.length <= 1) return;

        const tl = gsap.timeline({ repeat: -1 });

        // Build loop
        for (let i = 0; i < words.length - 1; i++) {
          const nextWord = words[i + 1];

          tl.to({}, { duration: 1.8 }) // Wait on current
            .to(inner, {
              y: `-${(i + 1) * 1.1}em`,
              duration: 0.9,
              ease: "power3.inOut"
            })
            .to(slider, {
              width: () => words[i + 1].offsetWidth,
              duration: 0.9,
              ease: "power3.inOut"
            }, "<");
        }

        // Loop reset
        tl.to({}, { duration: 1.8 })
          .set(inner, { y: "0" })
          .set(slider, { width: () => words[0].offsetWidth });
      });
    };

    // Delay slightly to ensure fonts are ready for width measurement
    setTimeout(initWordSliders, 200);

    mm.add("(min-width: 1025px)", () => {
      const wireAnimWrapper = () => {
        /* ── CONFIG ── */
        const WCARDS = [
          { id: 'wcA', sc: { l: 4, t: 45 }, gc: { l: 2, t: 10 }, sr: -4, gr: -2 },
          { id: 'wcB', sc: { l: 67, t: 38 }, gc: { l: 59, t: 12 }, sr: 5, gr: 3 },
          { id: 'wcC', sc: { l: 7, t: 75 }, gc: { l: 24, t: 14 }, sr: 3, gr: 1 },
          { id: 'wcD', sc: { l: 63, t: 70 }, gc: { l: 78, t: 9 }, sr: -4, gr: -2 },
          { id: 'wcE', sc: { l: 36, t: 85 }, gc: { l: 42, t: 9 }, sr: 2, gr: 0 },
        ];
        const QUERY = 'Find my insurance renewal document';

        const wstage = document.getElementById('wire-stage');
        const wsbox = document.getElementById('wsbox');
        const wcA = document.getElementById('wcA');
        const compact = document.getElementById('wcA-compact');
        const expanded = document.getElementById('wcA-expanded');
        const wtoast = document.getElementById('wtoast');
        const wcur = document.getElementById('wcur');
        const whead = document.getElementById('wire-heading');

        const WP = {
          A: [document.getElementById('wpA'), document.getElementById('wpAg')],
          B: [document.getElementById('wpB'), document.getElementById('wpBg')],
          C: [document.getElementById('wpC'), document.getElementById('wpCg')],
          D: [document.getElementById('wpD'), document.getElementById('wpDg')],
          E: [document.getElementById('wpE'), document.getElementById('wpEg')],
          V: [document.getElementById('wpV'), document.getElementById('wpVg')],
        };

        if (!wstage || !wsbox || !wcA) return;

        const vw = p => p / 100 * window.innerWidth;
        const vh = p => p / 100 * window.innerHeight;
        const cl = (v, a, b) => Math.min(b, Math.max(a, v));
        const pr = (p, a, b) => cl((p - a) / (b - a), 0, 1);
        const eo = t => 1 - Math.pow(1 - t, 3);
        const ei = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const lp = (a, b, t) => a + (b - a) * t;

        function rel(el: HTMLElement | null) {
          if (!el) return { t: 0, l: 0, cx: 0, cy: 0, bcx: 0, tcx: 0, h: 0, w: 0 };
          const t = el.offsetTop;
          const l = el.offsetLeft;
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          return {
            t, l, w, h,
            cx: l + w / 2,
            cy: t + h / 2,
            bcx: l + w / 2, bcy: t + h,
            tcx: l + w / 2, tcy: t,
          };
        }

        function sv(x, y) {
          if (!wstage) return { x, y };
          return { x: x / wstage.clientWidth * 1440, y: y / wstage.clientHeight * 900 };
        }

        function cubic(x1, y1, x2, y2) {
          const dy = y2 - y1, dx = x2 - x1;
          return `M${x1},${y1} C${x1 + dx * .05},${y1 + dy * .58} ${x2 - dx * .05},${y2 - dy * .58} ${x2},${y2}`;
        }

        function setPath(el, d) {
          if (!el) return 0;
          el.setAttribute('d', d);
          const L = el.getTotalLength ? el.getTotalLength() : 600;
          el.setAttribute('stroke-dasharray', L);
          return L;
        }

        function draw(el, frac, L) {
          if (!el) return;
          el.setAttribute('stroke-dashoffset', L * (1 - cl(frac, 0, 1)));
        }

        let cA_gatheredTop = 0, cA_gatheredLeft = 0;

        function placeAll() {
          WCARDS.forEach(c => {
            const cardEl = document.getElementById(c.id);
            if (!cardEl) return;
            gsap.set(cardEl, {
              left: vw(c.sc.l), top: vh(c.sc.t),
              rotation: c.sr, opacity: 1, x: 0, y: 0,
              width: '', height: '',
            });
          });

          const sbW = Math.min(500, window.innerWidth * 0.84);
          gsap.set(wsbox, {
            left: (window.innerWidth - sbW) / 2,
            top: vh(42),
            width: sbW, opacity: 0, scale: 0.92,
          });

          if (expanded) { expanded.style.display = 'none'; expanded.style.opacity = '0'; }
          if (compact) { compact.style.display = 'block'; compact.style.opacity = '1'; }

          Object.values(WP).forEach(([g, gg]) => {
            if (!g || !gg) return;
            g.style.opacity = '0';
            gg.style.opacity = '0';
            const Lg = parseFloat(g.getAttribute('stroke-dasharray')) || 999;
            const Lgg = parseFloat(gg.getAttribute('stroke-dasharray')) || 999;
            g.setAttribute('stroke-dashoffset', Lg);
            gg.setAttribute('stroke-dashoffset', Lgg);
          });
          gsap.set(wtoast, { opacity: 0 });
        }

        const floats = [];
        function startFloat() {
          WCARDS.forEach((c, i) => {
            const cardEl = document.getElementById(c.id);
            if (!cardEl) return;
            const t = gsap.to(cardEl, {
              y: '-=9', duration: 2.0 + i * .38,
              repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * .3,
            });
            floats.push(t);
          });
        }

        const locked = { A: false, B: false, C: false, D: false, E: false };

        function updateWires(slideP) {
          const sbR = rel(wsbox);
          const sbTopSV = sv(sbR.tcx, sbR.tcy);

          const BEkeys = ['B', 'C', 'D', 'E'] as const;
          BEkeys.forEach(k => {
            const idx = { B: 1, C: 2, D: 3, E: 4 }[k];
            const er = rel(document.getElementById(WCARDS[idx].id));
            const s = sv(er.bcx, er.bcy);
            const d = cubic(s.x, s.y, sbTopSV.x, sbTopSV.y);
            const L = setPath(WP[k][0], d);
            setPath(WP[k][1], d);
            if (!locked[k]) {
              draw(WP[k][0], 0, L);
            } else if (WP[k][0] && WP[k][1]) {
              WP[k][0].setAttribute('stroke-dashoffset', '0');
              WP[k][1].setAttribute('stroke-dashoffset', '0');
              WP[k][0].style.opacity = '1';
              WP[k][1].style.opacity = '1';
            }
          });

          const erA = rel(wcA);
          const sA = sv(erA.bcx, erA.bcy);
          const dA = cubic(sA.x, sA.y, sbTopSV.x, sbTopSV.y);
          const LA = setPath(WP.A[0], dA);
          setPath(WP.A[1], dA);

          if (locked.A && WP.A[0] && WP.A[1]) {
            WP.A[0].setAttribute('stroke-dashoffset', '0');
            WP.A[1].setAttribute('stroke-dashoffset', '0');
            WP.A[0].style.opacity = '1';
            WP.A[1].style.opacity = '1';
          }
        }

        function drive(p) {
          const headP = eo(pr(p, 0, 0.15));
          if (whead) gsap.set(whead, { opacity: 1 - headP, y: -40 * headP });

          WCARDS.forEach((c, i) => {
            const el = document.getElementById(c.id);
            if (!el) return;
            const ms = 0.08 + i * 0.022;
            const me = 0.32 + i * 0.008;
            const mp = ei(pr(p, ms, me));
            const curL = lp(vw(c.sc.l), vw(c.gc.l), mp);
            const curT = lp(vh(c.sc.t), vh(c.gc.t), mp);
            const curR = lp(c.sr, c.gr, mp);
            if (i === 0 && pr(p, 0.78, 0.98) > 0) return;
            gsap.set(el, { left: curL, top: curT, rotation: curR });
            if (i === 0 && mp > 0.98) {
              const r = rel(el);
              cA_gatheredTop = r.t;
              cA_gatheredLeft = r.l;
            }
          });

          const slideP = eo(pr(p, 0.78, 0.98));
          updateWires(slideP);

          const wireOrder = ['B', 'C', 'D', 'E', 'A'] as const;
          wireOrder.forEach((k, i) => {
            const ws = 0.30 + i * 0.032;
            const we = ws + 0.14;
            const wp = pr(p, ws, we);
            if (!locked[k] && WP[k][0] && WP[k][1]) {
              const L = parseFloat(WP[k][0].getAttribute('stroke-dasharray')) || 600;
              draw(WP[k][0], wp, L);
              WP[k][0].style.opacity = wp > 0 ? '1' : '0';
              const gp = eo(pr(p, we - 0.01, we + 0.05));
              WP[k][1].style.opacity = String(gp);
              if (gp > 0) WP[k][1].setAttribute('stroke-dashoffset', '0');
              if (wp >= 1 && gp >= 1) locked[k] = true;
            }
            const idx = { A: 0, B: 1, C: 2, D: 3, E: 4 }[k];
            const cardEl = document.getElementById(WCARDS[idx].id);
            if (cardEl) {
              if (pr(p, ws, we) > 0.85) cardEl.classList.add('wired');
              else cardEl.classList.remove('wired');
            }
          });

          const sbP = eo(pr(p, 0.50, 0.62));
          gsap.set(wsbox, { opacity: sbP, scale: 0.92 + sbP * 0.08 });
          const dotT = wsbox.querySelector('.wdot-t') as HTMLElement;
          if (dotT) dotT.style.opacity = sbP > 0.65 ? '1' : '0';

          const typP = pr(p, 0.62, 0.78);
          const typedEl = document.getElementById('wtyped');
          if (typedEl) {
            if (typP > 0 && typP < 1) {
              typedEl.textContent = QUERY.slice(0, Math.floor(typP * QUERY.length));
              wcur.classList.add('on');
            } else if (typP <= 0) {
              typedEl.textContent = '';
              wcur.classList.remove('on');
            } else {
              typedEl.textContent = QUERY;
              wcur.classList.remove('on');
            }
          }
          const dotB = wsbox.querySelector('.wdot-b') as HTMLElement;
          if (dotB) dotB.style.opacity = typP >= 1 ? '1' : '0';

          if (slideP > 0) {
            const sbR = rel(wsbox);
            const endTop = sbR.bcy + 28;
            const endLeft = (wstage.clientWidth - Math.min(460, wstage.clientWidth * 0.84)) / 2;
            const endW = Math.min(460, wstage.clientWidth * 0.84);
            const cANow = rel(wcA);
            const curTop = lp(cA_gatheredTop || cANow.t, endTop, slideP);
            const curLeft = lp(cA_gatheredLeft || cANow.l, endLeft, slideP);
            const curW = lp(202, endW, slideP);
            gsap.set(wcA, { top: curTop, left: curLeft, width: curW, rotation: lp(-2, 0, slideP) });
            const crossP = eo(pr(slideP, 0.25, 0.75));
            if (compact) compact.style.opacity = String(1 - crossP);
            if (expanded) { expanded.style.display = 'block'; expanded.style.opacity = String(crossP); }
            floats.forEach(t => t.pause());
            gsap.set(wcA, { y: 0 });
          } else {
            if (compact) compact.style.opacity = '1';
            if (expanded) expanded.style.display = 'none';
          }

          const toastP = eo(pr(p, 0.88, 0.95));
          if (toastP > 0) {
            const sbR = rel(wsbox);
            const cardAR = rel(wcA);
            const midY = (sbR.bcy + cardAR.t) / 2 - 16;
            gsap.set(wtoast, { opacity: toastP, top: midY, bottom: 'auto', left: '50%', x: '-50%', y: 8 * (1 - toastP) });
          } else {
            gsap.set(wtoast, { opacity: 0 });
          }
        }

        const initWireAnim = () => {
          placeAll();
          startFloat();
          ScrollTrigger.create({
            trigger: '#how-it-works',
            start: 'top top',
            end: 'bottom bottom',
            pin: '#wire-stage',
            pinSpacing: false,
            scrub: 7.5,
            onUpdate(self) { drive(self.progress); },
          });
        };

        initWireAnim();
        const handleWireResize = () => { placeAll(); ScrollTrigger.refresh(); };
        window.addEventListener('resize', handleWireResize);
        return () => window.removeEventListener('resize', handleWireResize);
      };

      const cleanup = wireAnimWrapper();
      return () => cleanup && cleanup();
    });

    mm.add("(max-width: 1024px)", () => {
      const wstage = document.getElementById('wire-stage');
      const wsbox = document.getElementById('wsbox');
      const wcA = document.getElementById('wcA');
      const compact = document.getElementById('wcA-compact');
      const expanded = document.getElementById('wcA-expanded');
      const wtyped = document.getElementById('wtyped');
      const QUERY = 'Find my insurance renewal document';

      const WP = {
        A: [document.getElementById('wpA'), document.getElementById('wpAg')],
        B: [document.getElementById('wpB'), document.getElementById('wpBg')],
        C: [document.getElementById('wpC'), document.getElementById('wpCg')],
        D: [document.getElementById('wpD'), document.getElementById('wpDg')],
        E: [document.getElementById('wpE'), document.getElementById('wpEg')],
      };

      if (!wstage || !wsbox || !wcA) return;

      const initMobile = () => {
        const isSmall = window.innerWidth < 480;
        const centerX = wstage.clientWidth / 2;

        // Final state settings
        gsap.set('.wcard', { opacity: 1, rotation: 0, x: 0, y: 0, scale: 1 });
        gsap.set('#wsbox', { opacity: 1, scale: 1 });
        if (compact) compact.style.display = 'none';
        if (expanded) { expanded.style.display = 'block'; expanded.style.opacity = '1'; }
        if (wtyped) wtyped.textContent = QUERY;

        // Positioning
        const startTop = 200;
        const cardW = isSmall ? 180 : 200;
        const cardH = 110;
        const gap = 16;

        if (isSmall) {
          // 1-column stack for phones
          gsap.set('#wcB', { left: centerX - cardW / 2 - 125, top: startTop });
          gsap.set('#wcC', { left: centerX - cardW / 2 - 100, top: startTop + cardH + gap + 20 });
          gsap.set('#wcD', { left: centerX - cardW / 2 + 90, top: startTop + (cardH + gap) * 2 - 200 });
          gsap.set('#wcE', { left: centerX - cardW / 2 + 100, top: startTop + (cardH + gap) * 3 - 170 });
        } else {
          // 2-column grid for tablets
          const gridW = (cardW * 2) + gap;
          gsap.set('#wcB', { left: centerX - gridW / 2, top: startTop });
          gsap.set('#wcC', { left: centerX + gap / 2, top: startTop });
          gsap.set('#wcD', { left: centerX - gridW / 2, top: startTop + cardH + gap - 200 });
          gsap.set('#wcE', { left: centerX + gap / 2, top: startTop + cardH + gap });
        }

        const boxTop = isSmall ? startTop + (cardH + gap) * 4 + 60 : startTop + (cardH + gap) * 2 + 60;
        const sbW = Math.min(500, wstage.clientWidth * 0.9);
        gsap.set('#wsbox', { left: (wstage.clientWidth - sbW) / 2, top: boxTop - 100, width: sbW });

        const resultTop = boxTop + 340;
        const expW = Math.min(460, wstage.clientWidth * 0.9);
        gsap.set('#wcA', { left: (wstage.clientWidth - expW + 100) / 2, top: resultTop, width: expW });

        // Draw Wires
        setTimeout(() => {
          const rel = (el) => {
            const t = el.offsetTop, l = el.offsetLeft, w = el.offsetWidth, h = el.offsetHeight;
            return { bcx: l + w / 2, bcy: t + h, tcx: l + w / 2, tcy: t };
          };
          const sv = (x, y) => ({ x: x / wstage.clientWidth * 1440, y: y / wstage.clientHeight * 900 });
          const cubic = (x1, y1, x2, y2) => {
            const dy = y2 - y1, dx = x2 - x1;
            return `M${x1},${y1} C${x1 + dx * .05},${y1 + dy * .58} ${x2 - dx * .05},${y2 - dy * .58} ${x2},${y2}`;
          };

          const sbR = rel(wsbox);
          const sbTopSV = sv(sbR.tcx, sbR.tcy);

          ['B', 'C', 'D', 'E'].forEach(k => {
            const card = document.getElementById('wc' + k);
            if (!card) return;
            const r = rel(card);
            const s = sv(r.bcx, r.bcy);
            const d = cubic(s.x, s.y, sbTopSV.x, sbTopSV.y);
            WP[k][0].setAttribute('d', d);
            WP[k][1].setAttribute('d', d);
            WP[k][0].style.opacity = '1';
            WP[k][1].style.opacity = '1';
            WP[k][0].setAttribute('stroke-dashoffset', '0');
            WP[k][1].setAttribute('stroke-dashoffset', '0');
            card.classList.add('wired');
          });

          // Result wire
          const rA = rel(wcA);
          const sA = sv(rA.tcx, rA.tcy);
          const sbBotSV = sv(sbR.bcx, sbR.bcy);
          const dA = cubic(sbBotSV.x, sbBotSV.y, sA.x, sA.y);
          const wpV = [document.getElementById('wpV'), document.getElementById('wpVg')];
          if (wpV[0] && wpV[1]) {
            wpV[0].setAttribute('d', dA); wpV[1].setAttribute('d', dA);
            wpV[0].style.opacity = '1'; wpV[1].style.opacity = '1';
            wpV[0].setAttribute('stroke-dashoffset', '0'); wpV[1].setAttribute('stroke-dashoffset', '0');
          }
        }, 100);
      };

      initMobile();
      window.addEventListener('resize', initMobile);
      return () => window.removeEventListener('resize', initMobile);
    });

    /* ── CAPTURE ── */
    gsap.to('#capture-left', {
      scrollTrigger: { trigger: '#capture', start: 'top 75%' },
      opacity: 1, x: 0, duration: 0.7, ease: 'power2.out'
    });
    gsap.to('#capture-right', {
      scrollTrigger: { trigger: '#capture', start: 'top 75%' },
      opacity: 1, x: 0, duration: 0.7, delay: 0.15, ease: 'power2.out'
    });

    /* ── FEATURES QUOTE ── */
    gsap.to('#features-quote', {
      scrollTrigger: { trigger: '#features-quote', start: 'top 80%' },
      opacity: 1, y: 0, duration: 0.6, ease: 'power2.out'
    });
    gsap.to('#features-cta', {
      scrollTrigger: { trigger: '#features-cta', start: 'top 85%' },
      opacity: 1, y: 0, duration: 0.5, ease: 'power2.out'
    });
    gsap.utils.toArray('#feat-grid .feat-card, #feat-grid-3 .feat-card').forEach((el, i) => {
      gsap.to(el, {
        scrollTrigger: { trigger: '#feat-grid', start: 'top 80%' },
        opacity: 1, y: 0, duration: 0.5, delay: el.dataset.delay ? el.dataset.delay / 1000 : i * 0.08, ease: 'power2.out'
      });
    });
    gsap.utils.toArray('#feat-grid-3 .feat-card').forEach((el, i) => {
      gsap.to(el, {
        scrollTrigger: { trigger: '#feat-grid-3', start: 'top 85%' },
        opacity: 1, y: 0, duration: 0.5, delay: i * 0.08, ease: 'power2.out'
      });
    });

    /* ── WHO HEADING ── */
    gsap.to('#who-heading', {
      scrollTrigger: { trigger: '#who-heading', start: 'top 80%' },
      opacity: 1, y: 0, duration: 0.7, ease: 'power2.out'
    });

    /* ── CAROUSEL CLONING (BUG-05, BUG-06, BUG-17) ── */
    const cloneItems = (trackId) => {
      const track = document.getElementById(trackId);
      if (!track || track.dataset.cloned) return;
      const children = Array.from(track.children);
      children.forEach(child => {
        const clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
      track.dataset.cloned = "true";
    };

    cloneItems('carousel-track');
    cloneItems('marquee-inner');
    cloneItems('fg-row-1');
    cloneItems('fg-row-2');
    cloneItems('fg-row-3');

    gsap.utils.toArray('.testi-row').forEach(row => {
      const r = row as HTMLElement;
      if (r.dataset.cloned) return;
      const children = Array.from(r.children);
      children.forEach(child => {
        const clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        r.appendChild(clone);
      });
      r.dataset.cloned = "true";
    });

    /* ── SECURITY GRID ── */
    gsap.utils.toArray('#security-grid .sec-card').forEach((el, i) => {
      gsap.to(el, {
        scrollTrigger: { trigger: '#security-grid', start: 'top 80%' },
        opacity: 1, y: 0, duration: 0.5, delay: i * 0.08, ease: 'power2.out'
      });
    });

    /* ── ROADMAP ── */
    gsap.utils.toArray('#roadmap-track .roadmap-item').forEach((el, i) => {
      gsap.to(el, {
        scrollTrigger: { trigger: el, start: 'top 80%' },
        opacity: 1, x: 0, duration: 0.6, ease: 'power2.out'
      });
    });

    /* ── PRICING ── */
    gsap.utils.toArray('#pricing-grid .price-card').forEach((el, i) => {
      gsap.to(el, {
        scrollTrigger: { trigger: '#pricing-grid', start: 'top 80%' },
        opacity: 1, y: 0, duration: 0.5, delay: el.dataset.delay ? el.dataset.delay / 1000 : 0, ease: 'power2.out'
      });
    });

    /* ── FINAL CTA ── */
    gsap.to('#final-cta', {
      scrollTrigger: { trigger: '#final-cta', start: 'top 80%' },
      opacity: 1, y: 0, duration: 0.7, ease: 'power2.out'
    });

    /* ── SCROLL REFRESH ── */
    const handleScrollRefresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', handleScrollRefresh);

    // Initial refresh after a short delay to allow React to settle
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
    /* ── SOLUTION CARD ANIMATIONS ── */
    gsap.to(".solution-card", {
      scrollTrigger: {
        trigger: ".solution-card",
        start: "top 80%",
      },
      y: 0,
      scale: 1,
      opacity: 1,
      duration: 0.8,
      ease: "power3.out",
    });

    gsap.to(".section-eyebrow, .solution-heading, .solution-sub, .solution-check", {
      scrollTrigger: {
        trigger: ".solution-card",
        start: "top 75%",
      },
      y: 0,
      opacity: 1,
      stagger: 0.1,
      duration: 0.6,
      ease: "power2.out",
    });
    gsap.to(".terminal-line", {
      scrollTrigger: {
        trigger: ".terminal",
        start: "top 80%",
      },
      opacity: 1,
      x: 0,
      stagger: 0.35,
      duration: 0.2,
      ease: "none",
    });

    gsap.to(".fgm-item", {
      scrollTrigger: {
        trigger: "#fgm",
        start: "top 85%",
      },
      y: 0,
      opacity: 1,
      stagger: 0.1,
      duration: 0.6,
      ease: "power2.out",
    });

    return () => {
      window.removeEventListener('scroll', handleNavbarScroll);
      window.removeEventListener('load', handleScrollRefresh);
      particleCleanup && (particleCleanup as any)();
    };
  }, { dependencies: [], scope: containerRef }); // consolidated into first hook

  return (
    <div className="Cluedox-landing-page" ref={containerRef}>
      <nav id="navbar">
        <a href="#" className="nav-logo">
          <div className="nav-logo-icon">📁</div>
          Cluedox
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#security">Security</a></li>
          <li><a href="#roadmap">Roadmap</a></li>
        </ul>
        <div className="nav-actions">
          <button className="nav-login" onClick={() => navigate('/login')}>Log In</button>
          <button className="nav-cta" onClick={() => navigate('/login')}>Get Started Free</button>
        </div>
      </nav>
      <section id="hero">

        <div className="hero-bg-frames" id="hero-bg-frames">
          <div className="hbf-card hbf-doc hbf-c1">
            <div className="hbf-doc-top"><span>Q4 Tax Report</span><span style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'rgba(255,255,255,0.7)', }}>2hr</span></div>
            <div className="hbf-doc-body">
              SUMMARY OF Q4 TAX OBLIGATIONS<br /><br />Total revenue: ₹1,450,000<br />Deductions applied: ₹320,000<br />Net taxable income: ₹1,130,000<br /><br />Please review the attached schedule for GST calculations.
            </div>
          </div>
          <div className="hbf-card hbf-c2">
            <div className="hbf-folder-icon" style={{ color: '#fff', opacity: 0.8 }}>📁</div>
          </div>
          <div className="hbf-card hbf-doc hbf-c3">
            <div className="hbf-doc-top"><span>Client Contract</span><span style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'rgba(255,255,255,0.7)', }}>1d</span></div>
            <div className="hbf-doc-body">
              AGREEMENT BETWEEN PARTIES<br /><br />This agreement ensures both parties are legally bound to deliver the software architecture as specified in Annexure A.<br /><br />Confidentiality terms remain active for 24 months.
            </div>
          </div>
          <div className="hbf-card hbf-c4">
            <div className="hbf-folder-icon" style={{ color: '#fff', opacity: 0.8 }}>📁</div><div className="hbf-badge" style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', }}>5hr</div>
          </div>
          <div className="hbf-card hbf-c5">
            <div className="hbf-doc-top"><span>Newsletter Draft</span><span style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'rgba(255,255,255,0.7)', }}>5hr</span></div>
            <div className="hbf-doc-body">
              Most skills will be irrelevant in 10 years.<br /><br />That is, unless you completely change how you think about success.<br /><br />Because if you are a high agency individual, that doesn't matter. You didn't focus your mind, preventing you from learning outside of that focus, on the status of a high paying job or degree. You have a vision, and you understand that in today's world, you can acquire any skill.
            </div>
          </div>
        </div>

        <p className="hero-eyebrow" style={{ position: 'relative', zIndex: '10', }}>✦ <span>Early Access — Intelligent File Management</span></p>
        <h1 className="hero-heading" id="hero-heading" style={{ position: 'relative', zIndex: '10' }}>
          Search any file by {currentText}<span className="cursor-blink" style={{ fontWeight: 300, display: 'inline-block' }}></span>
        </h1>
        <p className="hero-sub" style={{ position: 'relative', zIndex: '10', }}>Cluedox <strong>securely organises every document you own</strong> — automatically. Search by meaning, find what you need instantly, never lose a file again.</p>
        <div className="hero-actions" style={{ zIndex: '10', }}>
          <button onClick={() => navigate('/login')} className="btn-primary hero-main-cta">Get Started Free →</button>
          <a href="#features" className="btn-ghost" style={{ borderWidth: '2px' }}>Explore Features ↓</a>
        </div>

        <div className="hero-bottom-glow"></div>
      </section>
      <div id="product-window">
        <div className="pw-titlebar">
          <div className="pw-dots">
            <div className="pw-dot pw-dot-r"></div>
            <div className="pw-dot pw-dot-y"></div>
            <div className="pw-dot pw-dot-g"></div>
          </div>
          <span className="pw-breadcrumb">🏠 My Workspace</span>
        </div>
        <div className="pw-body">
          <div className="pw-sidebar">
            <div className="pw-sb-logo">
              <div className="pw-sb-logo-icon">📁</div>
              <span className="pw-sb-logo-name">Cluedox</span>
            </div>
            <div className="pw-sb-section">
              <div className="pw-sb-item active"><span className="pw-sb-item-icon">🏠</span><span className="pw-sb-item-text">Home</span></div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">⭐</span><span className="pw-sb-item-text">Starred</span></div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">🕐</span><span className="pw-sb-item-text">Recent</span></div>
            </div>
            <div className="pw-sb-section">
              <div className="pw-sb-label">Smart Folders</div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">📋</span><span className="pw-sb-item-text">Legal</span></div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">💰</span><span className="pw-sb-item-text">Finance</span></div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">🏥</span><span className="pw-sb-item-text">Medical</span></div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">📁</span><span className="pw-sb-item-text">Personal</span></div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">🏢</span><span className="pw-sb-item-text">Business</span></div>
            </div>
            <div className="pw-sb-section">
              <div className="pw-sb-label">Shared</div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">👥</span><span className="pw-sb-item-text">Team Folder</span></div>
              <div className="pw-sb-item"><span className="pw-sb-item-icon">🔗</span><span className="pw-sb-item-text">Shared Links</span></div>
            </div>
          </div>
          <div className="pw-main">
            <div className="pw-banner">
              <div className="pw-banner-pattern"></div>
              <div className="pw-banner-text">📁 My Workspace — 4,502 files organised</div>
            </div>
            <div className="pw-content">
              <div className="pw-search">
                <span>🔍</span>
                <input type="text" placeholder="Search anything... 'GST invoices from March'" readOnly />
                <span style={{ fontSize: '11px', color: 'rgba(10,31,20,0.3)', fontFamily: 'var(--sans)', }}>9 modes</span>
              </div>
              <div className="pw-tabs">
                <span className="pw-tab active" style={{ color: 'black' }}>All Files</span>
                <span className="pw-tab">PDFs</span>
                <span className="pw-tab">📋 Legal</span>
                <span className="pw-tab">💰 Finance</span>
                <span className="pw-tab">⏰ Expiring</span>
                <span className="pw-tab">👥 Shared</span>
              </div>
              <div className="pw-section-title" style={{ color: 'black' }}>Recent Files</div>
              <div className="pw-grid">
                <div className="pw-file-card">
                  <div className="pw-file-thumb" style={{ background: '#fdecea', }}>📋</div>
                  <div className="pw-file-name">insurance_policy.pdf</div>
                  <div className="pw-file-meta">⏰ 30 days</div>
                </div>
                <div className="pw-file-card">
                  <div className="pw-file-thumb" style={{ background: '#e8f0f8', }}>📊</div>
                  <div className="pw-file-name">gst_q4_2025.xlsx</div>
                  <div className="pw-file-meta">Finance · GST</div>
                </div>
                <div className="pw-file-card">
                  <div className="pw-file-thumb" style={{ background: '#f0f7f3', }}>📝</div>
                  <div className="pw-file-name">vendor_agreement.pdf</div>
                  <div className="pw-file-meta">Legal · Contract</div>
                </div>
                <div className="pw-file-card">
                  <div className="pw-file-thumb" style={{ background: '#fdf4ff', }}>🏥</div>
                  <div className="pw-file-name">health_report.pdf</div>
                  <div className="pw-file-meta">Medical · 2025</div>
                </div>
                <div className="pw-file-card">
                  <div className="pw-file-thumb" style={{ background: '#fff7ed', }}>📄</div>
                  <div className="pw-file-name">pan_card_scan.jpg</div>
                  <div className="pw-file-meta">Identity · KYC</div>
                </div>
                <div className="pw-file-card">
                  <div className="pw-file-thumb" style={{ background: '#e8f5ee', }}>💼</div>
                  <div className="pw-file-name">client_contract_v3.pdf</div>
                  <div className="pw-file-meta">Legal · Active</div>
                </div>
                <div className="pw-file-card">
                  <div className="pw-file-thumb" style={{ background: '#eff6ff', }}>🧾</div>
                  <div className="pw-file-name">invoice_march.pdf</div>
                  <div className="pw-file-meta">Finance · Invoice</div>
                </div>
                <div className="pw-file-card">
                  <div className="pw-file-thumb" style={{ background: '#f5f5f5', }}>🏦</div>
                  <div className="pw-file-name">bank_statement_q1.pdf</div>
                  <div className="pw-file-meta">Finance · Bank</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <section id="solution" ref={solutionRef}>
        <div className="solution-card" id="solution-card">
          <div className="section-eyebrow" style={{ justifyContent: 'center', }}>✦ THE SOLUTION</div>
          <h2 className="solution-heading">Cluedox securely organises your files.</h2>
          <p className="solution-sub">The moment you upload a document, Cluedox securely categorises it — letting you find what you need by meaning, not just filename.</p>
          <div className="solution-checks">
            <span className="solution-check">Auto-tagging</span>
            <span className="solution-check">Smart summaries</span>
            <span className="solution-check">Expiry reminders</span>
            <span className="solution-check">Semantic search</span>
            <span className="solution-check">Doc Chat</span>
            <span className="solution-check">Secure file sharing</span>
          </div>

          <div className="terminal">
            <div className="terminal-line arrow">File uploaded: insurance_policy.pdf</div>
            <div className="terminal-line arrow">Organising document securely...</div>
            <div className="terminal-line check">Categorised as: Insurance Policy</div>
            <div className="terminal-line check">Smart Tags: Insurance · Health · Renewal · 2025</div>
            <div className="terminal-line check">Important date found: 14 March 2026</div>
            <div className="terminal-line clock">Reminder set: 30 days before expiry</div>
            <div className="terminal-line arrow">File is now searchable as:</div>
            <div className="terminal-line search">"health insurance", "renewal", "March 2026"</div>
          </div>

          {/* <div className="solution-cta-area">
            <button onClick={() => setIsWaitlistOpen(true)} className="btn-outline-white" style={{ border: '1px solid rgba(0,0,0,0.15)', background: 'transparent', color: 'var(--text-dark)', padding: '12px 28px', borderRadius: '999px', cursor: 'pointer', fontSize: '15px' }}>Join Waiting List</button>
          </div> */}

          <div className="feature-grid-mini" id="fgm">
            <div className="fgm-item">
              <div className="fgm-icon">💬</div>
              <div className="fgm-title">Ask Your Documents</div>
              <div className="fgm-body">Ask questions naturally. "What's the renewal date on my insurance?" — instant answer, exact document.</div>
            </div>
            <div className="fgm-item">
              <div className="fgm-icon">⏰</div>
              <div className="fgm-title">Smart Expiry Reminders</div>
              <div className="fgm-body">Cluedox detects expiry dates and sets reminders automatically. Never miss a renewal or deadline.</div>
            </div>
            <div className="fgm-item">
              <div className="fgm-icon">🔗</div>
              <div className="fgm-title">Secure File Sharing</div>
              <div className="fgm-body">Time-limited links that auto-expire. Set view-once mode for sensitive documents. You control everything.</div>
            </div>
            <div className="fgm-item">
              <div className="fgm-icon">📁</div>
              <div className="fgm-title">Smart Auto-Folders</div>
              <div className="fgm-body">Invoices, legal, medical, personal — Cluedox organises automatically. Custom tags keep everything in place.</div>
            </div>
            <div className="fgm-item">
              <div className="fgm-icon">👥</div>
              <div className="fgm-title">Secure File Sharing</div>
              <div className="fgm-body">Share files with time-limited links that auto-expire. Set view-once mode for sensitive documents. You control everything.</div>
            </div>
            <div className="fgm-item">
              <div className="fgm-icon">☁️</div>
              <div className="fgm-title">Google Drive Import</div>
              <div className="fgm-body">Connect Google Drive to import and export seamlessly. Your existing documents, now with Cluedox intelligence.</div>
            </div>
          </div>

          <div className="marquee-section">
            <div className="marquee-label">Works with your existing tools:</div>
            <div className="marquee-track">
              <div className="marquee-inner" id="marquee-inner">
                {[
                  { name: 'Google Drive', url: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg' },
                  { name: 'WhatsApp', url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
                  { name: 'Zoho', text: 'Zoho', color: '#DE2F32' },
                  { name: 'Tally', text: 'Tally', color: '#16365E' },
                ].map((tool, idx) => (
                  <div key={idx} className="marquee-icon" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)', padding: tool.text ? '8px' : '10px' }}>
                    {tool.text ? (
                      <span style={{ color: tool.color, fontFamily: 'sans-serif', fontWeight: 900, fontSize: tool.name === 'Zoho' ? '12px' : '13px', letterSpacing: '-0.5px' }}>{tool.text}</span>
                    ) : (
                      <img src={tool.url} alt={tool.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div id="how-it-works">
        <div id="wire-stage">

          <svg id="wire-svg" viewBox="0 0 1440 900" preserveAspectRatio="none">
            <defs>
              <filter id="wglow"><feGaussianBlur stdDeviation="2.5" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
              <filter id="wglow2"><feGaussianBlur stdDeviation="4" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
            </defs>
            <path id="wpA" fill="none" stroke="rgba(155,151,143,0.55)" strokeWidth="1.5" strokeLinecap="round" />
            <path id="wpB" fill="none" stroke="rgba(155,151,143,0.55)" strokeWidth="1.5" strokeLinecap="round" />
            <path id="wpC" fill="none" stroke="rgba(155,151,143,0.55)" strokeWidth="1.5" strokeLinecap="round" />
            <path id="wpD" fill="none" stroke="rgba(155,151,143,0.55)" strokeWidth="1.5" strokeLinecap="round" />
            <path id="wpE" fill="none" stroke="rgba(155,151,143,0.55)" strokeWidth="1.5" strokeLinecap="round" />
            <path id="wpAg" fill="none" stroke="#000000ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#wglow)" />
            <path id="wpBg" fill="none" stroke="#000000ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#wglow)" />
            <path id="wpCg" fill="none" stroke="#000000ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#wglow)" />
            <path id="wpDg" fill="none" stroke="#000000ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#wglow)" />
            <path id="wpEg" fill="none" stroke="#000000ff" strokeWidth="1.8" strokeLinecap="round" filter="url(#wglow)" />
            <path id="wpV" fill="none" stroke="rgba(155,151,143,0.55)" strokeWidth="1.5" strokeLinecap="round" />
            <path id="wpVg" fill="none" stroke="#000000ff" strokeWidth="2" strokeLinecap="round" filter="url(#wglow2)" />
          </svg>

          <div id="wire-heading">
            <div className="wh-eyebrow">✦ HOW IT WORKS</div>
            <h2 className="wh-h1">Your mess of files,<br />sorted in seconds.</h2>
            <p className="wh-sub">Drop anything — Cluedox connects the dots automatically.</p>
          </div>

          <div className="wcard" id="wcA" style={{ width: '202px', }}>
            <div className="wcdot"></div>
            <div id="wcA-compact">
              <div className="wfname"><div className="wficon" style={{ background: '#fee2e2', color: "black", }}>📋</div>insurance_policy.pdf</div>
              <div className="wlines"><div className="wln f"></div><div className="wln m"></div><div className="wln s"></div></div>
              <div className="wtags"><span className="wtag wtb">Insurance</span><span className="wtag wtg">Health</span><span className="wtag wto">⏰ 30d</span></div>
            </div>
            <div id="wcA-expanded" style={{ display: 'none', opacity: '0', }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: '0', }}>📋</div>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '12.5px', fontWeight: '500', color: '#0d1910', }}>insurance_policy.pdf</div>
                    <div style={{ fontSize: '11px', color: 'rgba(13,25,16,.38)', marginTop: '2px', }}>Uploaded 3 Jan 2025 · 2.4 MB · PDF</div>
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', background: '#e4f5ec', color: '#2d6a45', padding: '4px 11px', borderRadius: '999px', fontFamily: 'var(--sans)', whiteSpace: 'nowrap', }}>✓ Matched</span>
              </div>
              <div style={{ background: '#f7f6f1', borderRadius: '10px', padding: '13px 15px', marginBottom: '12px', }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: '700', color: 'rgba(13,25,16,.33)', marginBottom: '7px', fontFamily: 'var(--sans)', }}>AI Summary</div>
                <div style={{ fontSize: '12.5px', color: 'rgba(13,25,16,.7)', lineHeight: '1.65', fontFamily: 'var(--sans)', fontWeight: '300', }}>This is a <strong style={{ color: '#0d1910', fontWeight: '600', background: 'rgba(45,106,69,.1)', padding: '0 3px', borderRadius: '3px', }}>health insurance policy</strong> with Star Health. Sum insured: <strong style={{ color: '#0d1910', fontWeight: '600', background: 'rgba(45,106,69,.1)', padding: '0 3px', borderRadius: '3px', }}>₹40,00,000</strong>. Valid until <strong style={{ color: '#0d1910', fontWeight: '600', background: 'rgba(45,106,69,.1)', padding: '0 3px', borderRadius: '3px', }}>14 March 2026</strong> — renewal due in 30 days.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '7px', marginBottom: '12px', }}>
                <div style={{ background: '#f7f6f1', borderRadius: '8px', padding: '9px 11px', }}><div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: '700', color: 'rgba(13,25,16,.33)', marginBottom: '3px', fontFamily: 'var(--sans)', }}>Renewal Date</div><div style={{ fontSize: '12px', fontWeight: '600', color: '#b91c1c', fontFamily: 'var(--sans)', }}>14 Mar 2026</div></div>
                <div style={{ background: '#f7f6f1', borderRadius: '8px', padding: '9px 11px', }}><div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: '700', color: 'rgba(13,25,16,.33)', marginBottom: '3px', fontFamily: 'var(--sans)', }}>Sum Insured</div><div style={{ fontSize: '12px', fontWeight: '600', color: '#0d1910', fontFamily: 'var(--sans)', }}>₹40,00,000</div></div>
                <div style={{ background: '#f7f6f1', borderRadius: '8px', padding: '9px 11px', }}><div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: '700', color: 'rgba(13,25,16,.33)', marginBottom: '3px', fontFamily: 'var(--sans)', }}>Days Left</div><div style={{ fontSize: '12px', fontWeight: '600', color: '#b91c1c', fontFamily: 'var(--sans)', }}>30 days</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', }}><span className="wtag wtb">Insurance</span><span className="wtag wtg">Health</span><span className="wtag wto">⏰ Renew Soon</span></div>
                <button style={{ fontSize: '12px', fontWeight: '600', color: '#2d6a45', background: 'none', border: '1.5px solid rgba(45,106,69,.24)', borderRadius: '999px', padding: '6px 16px', cursor: 'pointer', fontFamily: 'var(--sans)', }}>Open File →</button>
              </div>
            </div>
          </div>

          <div className="wcard" id="wcB" style={{ width: '196px', }}><div className="wcdot"></div><div className="wfname"><div className="wficon" style={{ background: '#e4eef8', }}>📝</div>vendor_agreement.pdf</div><div className="wlines"><div className="wln m"></div><div className="wln f"></div><div className="wln s"></div></div><div className="wtags"><span className="wtag wtb">Legal</span><span className="wtag wtg">Active</span></div></div>
          <div className="wcard" id="wcC" style={{ width: '190px', }}><div className="wcdot"></div><div className="wfname"><div className="wficon" style={{ background: '#e4f5ec', }}>📊</div>gst_march_2025.xlsx</div><div className="wlines"><div className="wln f"></div><div className="wln s"></div></div><div className="wtags"><span className="wtag wtg">GST</span><span className="wtag wtb">Finance</span><span className="wtag wtn">Q1 2025</span></div></div>
          <div className="wcard" id="wcD" style={{ width: '205px', }}><div className="wcdot"></div><div className="wfname"><div className="wficon" style={{ background: '#f3e8ff', }}>📄</div>employment_contract.pdf</div><div className="wlines"><div className="wln f"></div><div className="wln m"></div><div className="wln f"></div></div><div className="wtags"><span className="wtag wtp">HR</span><span className="wtag wtb">Legal</span></div></div>
          <div className="wcard" id="wcE" style={{ width: '184px', }}><div className="wcdot"></div><div className="wfname"><div className="wficon" style={{ background: '#fef3e2', }}>🏥</div>health_report.pdf</div><div className="wlines"><div className="wln m"></div><div className="wln s"></div></div><div className="wtags"><span className="wtag wto">Medical</span><span className="wtag wtb">2025</span></div></div>

          <div id="wsbox">
            <div className="wdot-t"></div><div className="wdot-b"></div>
            <div className="wsb-head"><div className="wsb-logo">📁</div><div><div className="wsb-t">Cluedox Intelligence</div><div className="wsb-s">5 files connected · searching...</div></div></div>
            <div className="wsb-chips">
              <span className="wchip"><span className="wchipdot" style={{ background: '#e05c5c', }}></span>insurance_policy.pdf</span>
              <span className="wchip"><span className="wchipdot" style={{ background: '#4a90d9', }}></span>vendor_agreement.pdf</span>
              <span className="wchip"><span className="wchipdot" style={{ background: '#000000ff', }}></span>gst_march_2025.xlsx</span>
              <span className="wchip" style={{ opacity: '.45', }}>+2 more</span>
            </div>
            <div className="wsb-input"><span id="wtyped"></span><span id="wcur"></span></div>
            <div className="wsb-foot"><div className="wsb-icons"><div className="wibtn">📎</div><div className="wibtn">+</div><div className="wibtn">≡</div></div><button className="wsbtn"><span className="wspulse"></span> Search</button></div>
          </div>

          <div id="wtoast"><span className="wtpulse"></span>✦ 1 match found — insurance_policy.pdf</div>

        </div>
      </div>
      <section id="capture">
        <div className="capture-inner">
          <div className="capture-left" id="capture-left">
            <div className="section-eyebrow">✦ CAPTURE</div>
            <h2 className="capture-heading">
              Upload
              <span className="word-slider">
                <span className="word-slider-inner">
                  <span className="ws-word">Anything.</span>
                  <span className="ws-word">Docs.</span>
                  <span className="ws-word">PDFs.</span>
                  <span className="ws-word">Receipts.</span>
                  <span className="ws-word">Images.</span>
                  <span className="ws-word">Anything.</span>
                </span>
              </span>
              <br />
              Remember Everything.
            </h2>
          </div>
          <div className="capture-right" id="capture-right">
            <div className="capture-feature">
              <div className="cf-icon">📤</div>
              <div className="cf-title">Drop From Any Device</div>
              <div className="cf-body">Upload from your phone, desktop, or tablet. PDF, photo, scan, DOCX — Cluedox handles every format instantly.</div>
            </div>
            <div className="capture-feature">
              <div className="cf-icon">🔤</div>
              <div className="cf-title">Automatic Transcription</div>
              <div className="cf-body">Every file you add is automatically transcribed and made searchable. Scanned documents, images, PDFs — all indexed.</div>
            </div>
            <div className="capture-feature">
              <div className="cf-icon">☁️</div>
              <div className="cf-title">Google Drive Import</div>
              <div className="cf-body">Connect Google Drive to import existing documents seamlessly. Your old files, now with Cluedox intelligence.</div>
            </div>
          </div>
        </div>
      </section>
      <section id="features">
        <div className="features-inner">
          <div className="section-eyebrow" style={{ justifyContent: 'center', marginBottom: '20px', }}>✦ CORE FEATURES</div>
          <p className="features-quote" id="features-quote">"If AI could handle your filing, how much time would you have for the <em>work that actually matters?</em>"</p>
          <div className="nav-actions flex justify-center mb-20 mt-20">
            <button className="btn-primary hero-main-cta" onClick={() => navigate('/login')}>Get Started Free</button>
          </div>

          <div className="feature-cards-grid" id="feat-grid">
            <div className="feat-card feat-card-large" data-delay="0">
              <div className="feat-card-icon">🔍</div>
              <div className="feat-card-title">9 Search Modes</div>
              <div className="feat-card-body">Most tools give you one way to search. Cluedox gives you nine — keyword, semantic, natural language, tag, date, entity, type, summary, AI chat.</div>
              <div className="feat-card-screen">
                <div className="search-grid-mini">
                  <div className="sgm-item"><div className="sgm-icon">🔑</div><div className="sgm-name">Keyword</div><div className="sgm-desc">Inside file content</div></div>
                  <div className="sgm-item"><div className="sgm-icon">💬</div><div className="sgm-name">Natural Language</div><div className="sgm-desc">Type normally</div></div>
                  <div className="sgm-item"><div className="sgm-icon">🧠</div><div className="sgm-name">Semantic</div><div className="sgm-desc">Finds meaning</div></div>
                  <div className="sgm-item"><div className="sgm-icon">🤖</div><div className="sgm-name">AI Chat</div><div className="sgm-desc">Conversational</div></div>
                </div>
              </div>
            </div>

            <div className="feat-card feat-card-large" data-delay="80">
              <div className="feat-card-icon">🔐</div>
              <div className="feat-card-title">Privacy-First Security</div>
              <div className="feat-card-body">AES-256 encryption at rest, TLS 1.3 in transit. Zero-knowledge architecture — our team cannot access your files. Your data never trains any AI model.</div>
              <div className="feat-card-screen">
                <div className="ms-group-label">Security Status</div>
                <div className="ms-item active"><div className="ms-item-dot" style={{ background: '#101411ff', }}></div><span className="ms-item-name">AES-256 Encryption Active</span></div>
                <div className="ms-item"><div className="ms-item-dot" style={{ background: '#101411ff', }}></div><span className="ms-item-name">TLS 1.3 In Transit</span></div>
                <div className="ms-item"><div className="ms-item-dot" style={{ background: '#101411ff', }}></div><span className="ms-item-name">Zero-Knowledge Architecture</span></div>
                <div className="ms-item"><div className="ms-item-dot" style={{ background: '#101411ff', }}></div><span className="ms-item-name">DPDP 2023 Compliant</span></div>
              </div>
            </div>
          </div>

          <div className="feature-cards-row3" id="feat-grid-3">
            <div className="feat-card" data-delay="0">
              <div className="feat-card-icon">📊</div>
              <div className="feat-card-title">Document Comparison</div>
              <div className="feat-card-body">Compare two documents side-by-side to spot changes in contracts, policies, and agreements instantly.</div>
            </div>
            <div className="feat-card" data-delay="80">
              <div className="feat-card-icon">📤</div>
              <div className="feat-card-title">Secure File Sharing</div>
              <div className="feat-card-body">Share files with time-limited links that auto-expire. Set view-once mode for sensitive documents.</div>
            </div>
            <div className="feat-card" data-delay="160">
              <div className="feat-card-icon">👥</div>
              <div className="feat-card-title">Team Collaboration</div>
              <div className="feat-card-body">Create teams, shared folders, and collaborate with role-based access. Every member sees only what they should.</div>
            </div>
          </div>
        </div>
      </section>
      <section id="who">
        <div className="section-eyebrow" style={{ justifyContent: 'center', }}>✦ WHO'S CLUEDOX FOR</div>
        <h2 className="who-heading" id="who-heading">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}> For
              <span className="word-slider">
                <span className="word-slider-inner">
                  <span className="ws-word">Students</span>
                  <span className="ws-word">Teachers</span>
                  <span className="ws-word">Professionals</span>
                  <span className="ws-word">Freelancers</span>
                  <span className="ws-word">Founders</span>
                  <span className="ws-word">People</span>
                  <span className="ws-word">Students</span>
                </span>
              </span>who</div>
          </div>
          <div style={{ marginTop: '0.1em' }}> work with documents and can't afford to lose them.</div>
        </h2>

        <div id="carousel-wrapper">
          <div id="carousel-pinned">
            <div className="carousel-track-outer">
              <div className="carousel-track" id="carousel-track">
                <div className="audience-card ac-freelancer">
                  <div className="ac-label">USE CASE</div>
                  <div className="ac-title">Free­lancers</div>
                  <div className="ac-body">Client contracts, invoices, project files — auto-organised.</div>
                  <div className="ac-tags">
                    <span className="ac-tag">Invoices</span>
                    <span className="ac-tag">Contracts</span>
                    <span className="ac-tag">Projects</span>
                  </div>
                  <div className="ac-screen">
                    <div className="ac-screen-inner">
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(10,31,20,0.8)', marginBottom: '8px', fontFamily: 'var(--sans)', }}>Smart Folders</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', }}>
                        <div style={{ background: 'rgba(10,31,20,0.06)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.7)', }}>📋 client_acme_contract.pdf</div>
                        <div style={{ background: 'rgba(10,31,20,0.06)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.7)', }}>🧾 invoice_march_2025.pdf</div>
                        <div style={{ background: 'rgba(200,100,50,0.1)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.7)', }}>⏰ contract_renewal_due.pdf</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="audience-card ac-business">
                  <div className="ac-label">USE CASE</div>
                  <div className="ac-title">Small Biz</div>
                  <div className="ac-body">GST documents, vendor agreements, employee files — always compliant.</div>
                  <div className="ac-tags">
                    <span className="ac-tag">GST</span>
                    <span className="ac-tag">Agreements</span>
                    <span className="ac-tag">Compliance</span>
                  </div>
                  <div className="ac-screen">
                    <div className="ac-screen-inner">
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(10,31,20,0.8)', marginBottom: '8px', fontFamily: 'var(--sans)', }}>Compliance Dashboard</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', }}>
                        <div style={{ background: 'rgba(10,31,20,0.06)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.7)', }}>📊 gst_q4_2025.xlsx <span style={{ float: 'right', color: 'green', }}>✓</span></div>
                        <div style={{ background: 'rgba(10,31,20,0.06)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.7)', }}>📋 vendor_agmt_ravi.pdf <span style={{ float: 'right', color: 'green', }}>✓</span></div>
                        <div style={{ background: 'rgba(245,166,35,0.15)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.7)', }}>⚠️ tds_filing_due.pdf</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="audience-card ac-legal">
                  <div className="ac-label">USE CASE</div>
                  <div className="ac-title">CA & Legal</div>
                  <div className="ac-body">Case files, compliance docs, renewal deadlines — automated.</div>
                  <div className="ac-tags">
                    <span className="ac-tag">Legal</span>
                    <span className="ac-tag">Tax</span>
                    <span className="ac-tag">Deadlines</span>
                  </div>
                  <div className="ac-screen">
                    <div className="ac-screen-inner" style={{ background: 'rgba(255,255,255,0.8)', }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dark)', marginBottom: '8px', fontFamily: 'var(--sans)', }}>Deadline Tracker</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', }}>
                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>⏰ ITR Filing — 7 days</div>
                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>📋 Audit Report — 14 days</div>
                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>🔐 License Renewal — 30 days</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="audience-card ac-healthcare">
                  <div className="ac-label">USE CASE</div>
                  <div className="ac-title">Health­care</div>
                  <div className="ac-body">Patient records, insurance docs, license renewals — organised and secure.</div>
                  <div className="ac-tags">
                    <span className="ac-tag">Records</span>
                    <span className="ac-tag">Insurance</span>
                    <span className="ac-tag">Licenses</span>
                  </div>
                  <div className="ac-screen">
                    <div className="ac-screen-inner" style={{ background: 'rgba(255,255,255,0.6)', }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dark)', marginBottom: '8px', fontFamily: 'var(--sans)', }}>Clinic Documents</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', }}>
                        <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>🏥 consent_form_pk.pdf</div>
                        <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>🔐 medical_license.pdf</div>
                        <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>💊 insurance_claim.pdf</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="audience-card ac-students">
                  <div className="ac-label">USE CASE</div>
                  <div className="ac-title">Students</div>
                  <div className="ac-body">Papers, notes, references, thesis drafts — intelligently organised.</div>
                  <div className="ac-tags">
                    <span className="ac-tag">Research</span>
                    <span className="ac-tag">Notes</span>
                    <span className="ac-tag">References</span>
                  </div>
                  <div className="ac-screen">
                    <div className="ac-screen-inner" style={{ background: 'rgba(255,255,255,0.6)', }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--dark)', marginBottom: '8px', fontFamily: 'var(--sans)', }}>Thesis Research</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', }}>
                        <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>📚 paper_ml_2024.pdf</div>
                        <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>📝 thesis_draft_v4.docx</div>
                        <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', fontFamily: 'var(--sans)', color: 'rgba(10,31,20,0.8)', }}>🔗 iit_reference_list.pdf</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="security">
        <div className="security-inner">
          <div className="section-eyebrow">✦ SECURITY & PRIVACY</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px,5vw,58px)', color: 'black', marginTop: '12px', maxWidth: '600px', lineHeight: '1.1', }}>Your data is sacred.<br />We treat it that way.</h2>
          <p style={{ fontSize: '16px', color: 'rgba(0, 0, 0, 0.5)', maxWidth: '540px', marginTop: '16px', lineHeight: '1.65', fontWeight: '300', }}>Cluedox is built privacy-first from the ground up. We don't sell your data, never share it with advertisers, and never use your files to train AI models.</p>
          <div className="security-grid" id="security-grid">
            <div className="sec-card"><div className="sec-card-icon">🔒</div><div className="sec-card-title">AES-256 + TLS 1.3</div><div className="sec-card-body">Military-grade encryption at rest and in transit. Your files are always protected.</div></div>
            <div className="sec-card"><div className="sec-card-icon">🛡️</div><div className="sec-card-title">Zero Knowledge</div><div className="sec-card-body">Our team physically cannot access your file contents. Only you hold the keys — by design.</div></div>
            <div className="sec-card"><div className="sec-card-icon">🚫</div><div className="sec-card-title">No Data Trading</div><div className="sec-card-body">Your data is never sold, shared with third parties, or used for advertising. Ever.</div></div>
            <div className="sec-card"><div className="sec-card-icon">🤖</div><div className="sec-card-title">AI Privacy</div><div className="sec-card-body">Cluedox processes your files in real-time securely. Your content never trains any AI model.</div></div>
            <div className="sec-card"><div className="sec-card-icon">
              <svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="16" rx="2" fill="#FF9933" />
                <rect y="5.33334" width="24" height="5.33333" fill="white" />
                <rect y="10.6667" width="24" height="5.33333" fill="#138808" />
                <circle cx="12" cy="8" r="2" stroke="#000080" strokeWidth="0.5" />
              </svg>
            </div><div className="sec-card-title">DPDP 2023 Ready</div><div className="sec-card-body">Built for India's Digital Personal Data Protection Act 2023 from day one.</div></div>
            <div className="sec-card"><div className="sec-card-icon">🗑️</div><div className="sec-card-title">Right to Delete</div><div className="sec-card-body">Delete your account and all data is permanently wiped within 30 days. No hidden copies.</div></div>
          </div>
        </div>
      </section>
      <section id="testimonials">
        <div style={{ textAlign: 'center', padding: '80px 0 48px', }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center', marginBottom: '16px', }}>✦ WHAT PEOPLE SAY</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px,4vw,52px)', color: '#1a1a1a', }}>Trusted by early testers across India.</h2>
        </div>
        <div className="testi-rows">
          <div className="testi-row testi-row-1">
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"I used to spend 30 minutes every morning hunting for client contracts. Cluedox found everything in under 2 seconds."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#2d6a45', }}>RK</div><div><div className="testi-name">Rahul Khedekar</div><div className="testi-role">Freelance Consultant · Pune</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"The auto-reminder for our insurance renewals alone is worth it. We almost missed a ₹40L policy renewal."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#7f8fbd', }}>PR</div><div><div className="testi-name">Priya Rawat</div><div className="testi-role">CA · Mumbai</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"Our clinic now manages all patient consent forms through Cluedox. What used to take an hour takes 5 minutes."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#b08faf', }}>DP</div><div><div className="testi-name">Dr. Deepa Pillai</div><div className="testi-role">Healthcare Clinic · Bangalore</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"The natural language search understood 'GST invoices from March' perfectly. It just works."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#c4617a', }}>AS</div><div><div className="testi-name">Arjun Shah</div><div className="testi-role">SMB Owner · Ahmedabad</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★☆</div><p className="testi-quote">"Cluedox's semantic search found papers relevant to my thesis that I'd completely forgotten I had."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#8aaa8a', }}>NJ</div><div><div className="testi-name">Neha Joshi</div><div className="testi-role">PhD Researcher · IIT Delhi</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"Cluedox's expiry detection smartly flags renewals weeks before. It's like having a personal filing assistant."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#c8b99a', }}>VM</div><div><div className="testi-name">Vikram Mehta</div><div className="testi-role">Legal Firm Partner · Delhi</div></div></div></div>
          </div>
          <div className="testi-row testi-row-2">
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"The natural language search understood 'GST invoices from March' perfectly."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#c4617a', }}>AS</div><div><div className="testi-name">Arjun Shah</div><div className="testi-role">SMB Owner · Ahmedabad</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★☆</div><p className="testi-quote">"Cluedox's semantic search found papers relevant to my thesis that I'd completely forgotten I had."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#8aaa8a', }}>NJ</div><div><div className="testi-name">Neha Joshi</div><div className="testi-role">PhD Researcher · IIT Delhi</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"We almost missed a ₹40L policy renewal. Cluedox's reminders saved us. Incredible product."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#7f8fbd', }}>PR</div><div><div className="testi-name">Priya Rawat</div><div className="testi-role">CA · Mumbai</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"Cluedox's expiry detection smartly flags renewals weeks before. Like a personal filing assistant."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#c8b99a', }}>VM</div><div><div className="testi-name">Vikram Mehta</div><div className="testi-role">Legal Firm Partner · Delhi</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"What used to take an hour takes 5 minutes. Cluedox is essential for our clinic operations."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#b08faf', }}>DP</div><div><div className="testi-name">Dr. Deepa Pillai</div><div className="testi-role">Healthcare Clinic · Bangalore</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"Found everything in under 2 seconds. The auto-tagging is frighteningly accurate."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#2d6a45', }}>RK</div><div><div className="testi-name">Rahul Khedekar</div><div className="testi-role">Freelance Consultant · Pune</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"The natural language search understood 'GST invoices from March' perfectly."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#c4617a', }}>AS</div><div><div className="testi-name">Arjun Shah</div><div className="testi-role">SMB Owner · Ahmedabad</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★☆</div><p className="testi-quote">"Cluedox's semantic search found papers relevant to my thesis that I'd completely forgotten I had."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#8aaa8a', }}>NJ</div><div><div className="testi-name">Neha Joshi</div><div className="testi-role">PhD Researcher · IIT Delhi</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"We almost missed a ₹40L policy renewal. Cluedox's reminders saved us. Incredible product."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#7f8fbd', }}>PR</div><div><div className="testi-name">Priya Rawat</div><div className="testi-role">CA · Mumbai</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"Cluedox's expiry detection smartly flags renewals weeks before. Like a personal filing assistant."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#c8b99a', }}>VM</div><div><div className="testi-name">Vikram Mehta</div><div className="testi-role">Legal Firm Partner · Delhi</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"What used to take an hour takes 5 minutes. Cluedox is essential for our clinic operations."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#b08faf', }}>DP</div><div><div className="testi-name">Dr. Deepa Pillai</div><div className="testi-role">Healthcare Clinic · Bangalore</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">"Found everything in under 2 seconds. The auto-tagging is frighteningly accurate."</p><div className="testi-author"><div className="testi-avatar" style={{ background: '#2d6a45', }}>RK</div><div><div className="testi-name">Rahul Khedekar</div><div className="testi-role">Freelance Consultant · Pune</div></div></div></div>
          </div>
        </div>
      </section>
      <section id="roadmap">
        <div className="roadmap-inner">
          <div className="section-eyebrow">✦ ROADMAP</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px,5vw,56px)', color: '#1a1a1a', marginTop: '12px', lineHeight: '1.1', }}>Where we're going.</h2>
          <div className="roadmap-track" id="roadmap-track">
            <div className="roadmap-item">
              <div className="rm-dot-col">
                <div className="rm-dot active"></div>
                <div className="rm-quarter">Q2<br />2026</div>
              </div>
              <div className="rm-content">
                <div className="rm-version">V1.0 — Launch</div>
                <div className="rm-title">Web App · AI Engine · 9 Search Modes</div>
                <div className="rm-body">Auto-reminders · Doc chat · Teams · Google Drive · Secure sharing · Smart folders · Full DPDP compliance</div>
                <span className="rm-badge rm-badge-live">✓ Now Live</span>
              </div>
            </div>
            <div className="roadmap-item">
              <div className="rm-dot-col">
                <div className="rm-dot"></div>
                <div className="rm-quarter">Q3–Q4<br />2026</div>
              </div>
              <div className="rm-content">
                <div className="rm-version">V2.0 — Intelligence</div>
                <div className="rm-title">Voice Search · Contract Risk Detection</div>
                <div className="rm-body">Document timeline view · Android & iOS apps · Desktop agent · Semantic search upgrade</div>
                <span className="rm-badge rm-badge-dev">In Development</span>
              </div>
            </div>
            <div className="roadmap-item">
              <div className="rm-dot-col">
                <div className="rm-dot"></div>
                <div className="rm-quarter">2027</div>
              </div>
              <div className="rm-content">
                <div className="rm-version">V3.0 — Enterprise</div>
                <div className="rm-title">White-label · On-premise · SOC 2</div>
                <div className="rm-body">Compliance packs · On-premise deployment · SOC 2 certification · Custom AI models</div>
                <span className="rm-badge rm-badge-planned">Planned</span>
              </div>
            </div>
            <div className="roadmap-item">
              <div className="rm-dot-col">
                <div className="rm-dot"></div>
                <div className="rm-quarter">2027–28</div>
              </div>
              <div className="rm-content">
                <div className="rm-version">V4.0 — Platform</div>
                <div className="rm-title">Workflow Automation · 22 Indian Languages</div>
                <div className="rm-body">API marketplace · Third-party integrations (Tally, Zoho, WhatsApp) · Vernacular AI for all Indian languages</div>
                <span className="rm-badge rm-badge-planned">Future</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div id="footer-gallery">
        <div className="marquee-label" style={{ textAlign: 'center', marginBottom: '24px', color: 'rgba(0,0,0,0.5)', fontSize: '14px' }}>Live Activity Preview · How Cluedox works in real-time</div>
        <div className="fg-rows">
          <div className="fg-row fg-row-1" id="fg-row-1">
            <div className="fg-item"><span className="fgi-icon">📋</span><span className="fgi-text">insurance_policy.pdf · Categorised</span></div>
            <div className="fg-item"><span className="fgi-icon">📊</span><span className="fgi-text">gst_march_2025.xlsx · Tagged</span></div>
            <div className="fg-item"><span className="fgi-icon">⏰</span><span className="fgi-text">Renewal reminder set · 30 days</span></div>
            <div className="fg-item"><span className="fgi-icon">🔍</span><span className="fgi-text">Search: "health insurance"</span></div>
            <div className="fg-item"><span className="fgi-icon">📝</span><span className="fgi-text">employment_contract.pdf · Legal</span></div>
            <div className="fg-item"><span className="fgi-icon">🔐</span><span className="fgi-text">AES-256 encryption · Active</span></div>
            <div className="fg-item"><span className="fgi-icon">👥</span><span className="fgi-text">Team folder shared · 3 members</span></div>
          </div>
          <div className="fg-row fg-row-2" id="fg-row-2">
            <div className="fg-item"><span className="fgi-icon">🧾</span><span className="fgi-text">invoice_q1.pdf · Finance</span></div>
            <div className="fg-item"><span className="fgi-icon">💬</span><span className="fgi-text">"What's my renewal date?" · Answered</span></div>
            <div className="fg-item"><span className="fgi-icon">📁</span><span className="fgi-text">Smart folder created · Medical</span></div>
            <div className="fg-item"><span className="fgi-icon">🇮🇳</span><span className="fgi-text">DPDP 2023 · Compliant</span></div>
            <div className="fg-item"><span className="fgi-icon">☁️</span><span className="fgi-text">Google Drive synced · 842 files</span></div>
            <div className="fg-item"><span className="fgi-icon">📊</span><span className="fgi-text">vendor_agreement.pdf · Compared</span></div>
            <div className="fg-item"><span className="fgi-icon">🔗</span><span className="fgi-text">Secure link · Expires 24hr</span></div>
          </div>
          <div className="fg-row fg-row-3" id="fg-row-3">
            <div className="fg-item"><span className="fgi-icon">🏥</span><span className="fgi-text">health_report.pdf · Medical</span></div>
            <div className="fg-item"><span className="fgi-icon">✓</span><span className="fgi-text">Tagged: GST · Compliance · 2025</span></div>
            <div className="fg-item"><span className="fgi-icon">📋</span><span className="fgi-text">4,502 files organised intelligently</span></div>
            <div className="fg-item"><span className="fgi-icon">⚡</span><span className="fgi-text">Search time: 0.3 seconds</span></div>
            <div className="fg-item"><span className="fgi-icon">🛡️</span><span className="fgi-text">Zero-knowledge architecture</span></div>
            <div className="fg-item"><span className="fgi-icon">🤖</span><span className="fgi-text">AI Chat · V4.0 · Coming 2027</span></div>
          </div>
        </div>
      </div>
      <section style={{ background: 'var(--dark)', padding: '0 0 0', position: 'relative', zIndex: '1', }}>
        <div id="final-cta">
          <div className="fc-badge">✓ EARLY ACCESS</div>
          <h2 className="fc-heading">Start managing your documents intelligently — for free.</h2>
          <p className="fc-sub">Join thousands of Indian professionals using Cluedox. Your data stays private — always.</p>
          <div className="fc-actions">
            <button onClick={() => navigate('/login')} className="btn-primary hero-main-cta" style={{ transform: 'scale(1.1)' }}>Get Started Now →</button>
            <a href="mailto:founders@cluedox.in" className="btn-ghost" style={{ borderWidth: '2px' }}>founders@cluedox.in</a>
          </div>
          <p className="fc-fine">No credit card required · Free plan available · Cancel anytime · <a href="#privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy Policy</a></p>
        </div>
      </section>
      <footer>
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo"><div className="footer-logo-icon">📁</div>Cluedox</div>
            <p className="footer-tagline">Intelligent File Management, Reimagined</p>
            <p className="footer-loc-tag">📍 Pune, India</p>
            <div className="footer-socials">
              <a href="https://twitter.com/cluedox" target="_blank" rel="noopener noreferrer" className="footer-social">𝕏</a>
              <a href="mailto:founders@cluedox.in" className="footer-social">✉</a>
            </div>
          </div>
          <div className="footer-links">
            <div>
              <div className="footer-col-title">Product</div>
              <ul className="footer-col-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#security">Security</a></li>
                <li><a href="#roadmap">Roadmap</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Legal & Support</div>
              <ul className="footer-col-links">
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="mailto:support@cluedox.in">Help & Support</a></li>
                <li><a href="mailto:founders@cluedox.in">founders@cluedox.in</a></li>
                <li><a href="https://twitter.com/cluedox">Twitter / X</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="footer-copy">© 2026 Cluedox. All rights reserved.</span>
          <span className="footer-loc">Built in Pune 🇮🇳</span>
        </div>
      </footer>

      {
        isWaitlistOpen && (
          <div className="waitlist-modal-overlay">
            <div className="waitlist-modal">
              <button className="waitlist-close" onClick={() => setIsWaitlistOpen(false)}>×</button>
              {waitlistStatus === 'success' ? (
                <div className="waitlist-success">
                  <div className="waitlist-success-icon">✨</div>
                  <h3>You're on the list!</h3>
                  <p>We'll notify you as soon as Cluedox launches.</p>
                  <button className="btn-primary" style={{ width: '100%' }} onClick={() => setIsWaitlistOpen(false)}>Close</button>
                </div>
              ) : (
                <form className="waitlist-form" onSubmit={handleJoinWaitlist}>
                  <div className="waitlist-header">
                    <span className="waitlist-eyebrow">Coming Soon</span>
                    <h2>Join the Waitlist</h2>
                    <p>Be the first to know when we launch and get early access.</p>
                  </div>
                  {waitlistError && <div style={{ color: '#ff5f57', fontSize: '13px', marginBottom: '16px', textAlign: 'center', fontWeight: '500' }}>{waitlistError}</div>}
                  <div className="waitlist-input-group">
                    <label>Full Name</label>
                    <input type="text" required placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="waitlist-input-group">
                    <label>Email Address</label>
                    <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary waitlist-submit" disabled={waitlistStatus === 'submitting'}>
                    {waitlistStatus === 'submitting' ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )
      }

      {
        showScrollTop && (
          <button
            className="scroll-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ↑
          </button>
        )
      }
    </div >
  );
}