'use client';

import { Component, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { HeroFallback } from './HeroFallback';

const BikeCanvas = dynamic(() => import('./BikeCanvas'), { ssr: false });

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? <HeroFallback /> : this.props.children;
  }
}

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

// The three headline "beats" the camera sequence moves through.
const BEATS = [
  ['RIDE', 'YOUR CITY'],
  ['BUILT FOR', 'EVERY STREET'],
  ['AFFORDABLE', '& HONEST'],
];

export default function BikeHero() {
  const progress = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);
  const [can3d, setCan3d] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [active, setActive] = useState(true); // pause the render loop when off-screen

  useEffect(() => {
    setMounted(true);
    setCan3d(webglOk());
    setCinematic(
      window.matchMedia('(min-width: 820px) and (prefers-reduced-motion: no-preference)').matches,
    );
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // GSAP: pin the hero and drive both the camera (via `progress`) and the
  // crossfading headlines across a longer scroll. Desktop + motion only.
  useLayoutEffect(() => {
    if (!mounted) return;
    let mm: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const media = gsap.matchMedia();
      media.add('(min-width: 820px) and (prefers-reduced-motion: no-preference)', () => {
        const trigger = sectionRef.current;
        const beats = beatRefs.current.filter(Boolean) as HTMLDivElement[];

        const st = ScrollTrigger.create({
          trigger,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            progress.current = self.progress;
          },
        });

        // Headline crossfade timeline, scrubbed over the same range.
        gsap.set(beats[0], { opacity: 1, yPercent: 0 });
        gsap.set(beats.slice(1), { opacity: 0, yPercent: 30 });
        const tl = gsap.timeline({
          scrollTrigger: { trigger, start: 'top top', end: '+=220%', scrub: 1 },
        });
        tl.to(beats[0], { opacity: 0, yPercent: -30, duration: 0.14 }, 0.26)
          .fromTo(beats[1], { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, duration: 0.14 }, 0.3)
          .to(beats[1], { opacity: 0, yPercent: -30, duration: 0.14 }, 0.58)
          .fromTo(beats[2], { opacity: 0, yPercent: 30 }, { opacity: 1, yPercent: 0, duration: 0.14 }, 0.62);

        return () => {
          st.kill();
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });
      mm = media;
    })();

    return () => {
      cancelled = true;
      mm?.revert();
    };
  }, [mounted]);

  return (
    <section ref={sectionRef} className="rc-hero" aria-label="Raju Cycles">
      <div className="rc-hero-stage">
        <div className="rc-hero-backdrop" aria-hidden="true" />
        <div className="rc-hero-canvas">
          {mounted && can3d ? (
            <CanvasBoundary onError={() => setCan3d(false)}>
              <BikeCanvas progress={progress} cinematic={cinematic} active={active} />
            </CanvasBoundary>
          ) : (
            <HeroFallback />
          )}
        </div>

        {/* Persistent eyebrow */}
        <div className="rc-hero-top container">
          <span className="rc-hero-eyebrow">Kanpur · est. for the everyday rider</span>
        </div>

        {/* Crossfading headline beats (stacked; on mobile only the first shows) */}
        <div className="rc-hero-beats container">
          {BEATS.map((lines, i) => (
            <div
              className={`rc-hero-title ${cinematic ? 'is-beat' : ''} ${i === 0 ? 'is-first' : ''}`}
              key={i}
              ref={(el) => {
                beatRefs.current[i] = el;
              }}
              aria-hidden={i === 0 ? undefined : true}
            >
              <span>{lines[0]}</span>
              <span className="rc-hero-title-accent">{lines[1]}</span>
            </div>
          ))}
        </div>

        {/* Persistent lede + CTA — always reachable */}
        <div className="rc-hero-copy container">
          <p className="rc-hero-lede">
            Affordable, honest bicycles — built for commutes, weekends and first rides. The hero bike
            is a brand visual, not a listing.
          </p>
          <div className="rc-hero-actions">
            <Link href="/shop" className="rc-btn rc-btn--gold">
              Explore All Bicycles
            </Link>
            <Link href="/shop?sort=price-asc" className="rc-btn rc-btn--ghost-light">
              Budget picks
            </Link>
          </div>
        </div>

        <div className="rc-hero-scroll" aria-hidden="true">
          <span>Scroll</span>
          <i />
        </div>
      </div>
    </section>
  );
}
