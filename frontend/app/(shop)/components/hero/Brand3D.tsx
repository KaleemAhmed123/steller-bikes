'use client';

import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { HeroFallback } from './HeroFallback';

const BrandCanvas = dynamic(() => import('./BrandCanvas'), { ssr: false });

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

// A brand "turntable" moment lower on the page. The canvas only mounts while the
// section is near the viewport, so it isn't rendering off-screen alongside the hero.
export default function Brand3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [can3d, setCan3d] = useState(true);

  useEffect(() => {
    setCan3d(webglOk());
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="rc-section rc-section--dark rc-brand3d" data-reveal>
      <div className="container rc-brand3d-grid">
        <div className="rc-brand3d-copy">
          <span className="rc-eyebrow" style={{ ['--rc-accent' as string]: '#6b8cff' }}>
            The Raju Cycles look
          </span>
          <h2 className="rc-sec-title">Engineered to look as good as it rides.</h2>
          <p className="rc-sec-blurb rc-sec-blurb--light">
            Clean lines, honest value. Spin it, then go find the real thing — every bike in the
            catalogue is a working, buyable listing.
          </p>
          <Link href="/shop" className="rc-btn rc-btn--gold">
            Shop the range
          </Link>
        </div>

        <div className="rc-brand3d-stage" ref={ref}>
          {visible && can3d ? (
            <CanvasBoundary onError={() => setCan3d(false)}>
              <BrandCanvas />
            </CanvasBoundary>
          ) : (
            <div className="rc-brand3d-fallback" style={{ color: 'rgba(255,255,255,0.14)' }}>
              <HeroFallback />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
