import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { ShowcaseData } from '../../types';

interface Showcase360ViewerProps {
  config: ShowcaseData['spin360'];
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function build24WebpFrames(
  sources: ShowcaseData['spin360']['angleSources'],
  customFrames?: string[]
): Promise<HTMLImageElement[]> {
  if (customFrames && customFrames.length >= 12) {
    return Promise.all(customFrames.map((url) => loadImg(url)));
  }

  const [front, right, back] = await Promise.all([
    loadImg(sources.front),
    loadImg(sources.right),
    loadImg(sources.back),
  ]);

  const w = 540;
  const h = 720;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!ctx) return [front, right, back];

  const totalFrames = 24;
  const frames: HTMLImageElement[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const angle = (i / totalFrames) * Math.PI * 2;
    const deg = (i / totalFrames) * 360;

    ctx.fillStyle = '#F7F5EF';
    ctx.fillRect(0, 0, w, h);

    // Determine primary & secondary studio angle images and cylindrical perspective
    let primary = front;
    let secondary = right;
    let blend = 0;
    let flipPrimary = false;
    let flipSecondary = false;

    if (deg < 90) {
      primary = front;
      secondary = right;
      blend = deg / 90;
    } else if (deg < 180) {
      primary = right;
      secondary = back;
      blend = (deg - 90) / 90;
    } else if (deg < 270) {
      primary = back;
      secondary = right;
      flipSecondary = true;
      blend = (deg - 180) / 90;
    } else {
      primary = right;
      flipPrimary = true;
      secondary = front;
      blend = (deg - 270) / 90;
    }

    const drawPerspective = (img: HTMLImageElement, alpha: number, mirror: boolean, squashX: number) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2, h / 2);
      ctx.scale((mirror ? -1 : 1) * Math.max(0.78, squashX), 1);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    };

    const squashA = 0.85 + 0.15 * Math.abs(Math.cos(angle));
    const squashB = 0.85 + 0.15 * Math.abs(Math.sin(angle));

    drawPerspective(primary, 1 - blend, flipPrimary, squashA);
    drawPerspective(secondary, blend, flipSecondary, squashB);

    const blob = await new Promise<Blob | null>((res) => off.toBlob(res, 'image/webp', 0.86));
    const frameUrl = blob ? URL.createObjectURL(blob) : off.toDataURL('image/webp', 0.86);
    const frameImg = await loadImg(frameUrl);
    frames.push(frameImg);
  }

  return frames;
}

export function Showcase360Viewer({ config }: Showcase360ViewerProps) {
  const { shouldSimplify } = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [inView, setInView] = useState(false);
  const [framesReady, setFramesReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [frameIndexDisplay, setFrameIndexDisplay] = useState(0);

  const framesRef = useRef<HTMLImageElement[]>([]);
  const frameFloatRef = useRef(0);
  const velocityRef = useRef(0.08); // Autoplay on load
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const pinchDistRef = useRef<number | null>(null);
  const zoomRef = useRef(1);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Lazy load & build 24 WebP frames only when scrolled into view
  useEffect(() => {
    if (!inView || shouldSimplify || framesRef.current.length > 0) return;
    let cancelled = false;
    build24WebpFrames(config.angleSources, config.customFrames)
      .then((imgs) => {
        if (!cancelled) {
          framesRef.current = imgs;
          setFramesReady(true);
        }
      })
      .catch(() => {
        // Fallback remains visible if WebP generation fails
      });
    return () => {
      cancelled = true;
    };
  }, [inView, shouldSimplify, config]);

  // Animation loop with requestAnimationFrame; pauses when tab hidden or offscreen
  useEffect(() => {
    if (!inView || !framesReady || shouldSimplify) return;
    let rafId = 0;

    const renderLoop = () => {
      if (document.visibilityState === 'visible') {
        const frames = framesRef.current;
        const canvas = canvasRef.current;
        if (frames.length > 0 && canvas) {
          if (!draggingRef.current) {
            if (!hasInteracted) {
              // Gentle autoplay on load
              frameFloatRef.current = (frameFloatRef.current + 0.09) % frames.length;
            } else if (Math.abs(velocityRef.current) > 0.005) {
              frameFloatRef.current =
                (frameFloatRef.current + velocityRef.current + frames.length) % frames.length;
              velocityRef.current *= 0.93;
            }
          }

          const idx = Math.floor(frameFloatRef.current) % frames.length;
          const img = frames[idx];
          const ctx = canvas.getContext('2d');
          if (ctx && img) {
            const z = zoomRef.current;
            const cw = canvas.width;
            const ch = canvas.height;
            ctx.fillStyle = '#F7F5EF';
            ctx.fillRect(0, 0, cw, ch);
            const dw = cw * z;
            const dh = ch * z;
            ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
          }
          setFrameIndexDisplay(idx);
        }
      }
      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [inView, framesReady, shouldSimplify, hasInteracted]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = true;
    setHasInteracted(true);
    lastXRef.current = e.clientX;
    velocityRef.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current || framesRef.current.length === 0) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    const step = dx * 0.085;
    const len = framesRef.current.length;
    frameFloatRef.current = (frameFloatRef.current + step + len) % len;
    velocityRef.current = step;
  }, []);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((z) => Math.min(2.4, Math.max(1, Number((z - e.deltaY * 0.0015).toFixed(2)))));
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchDistRef.current !== null) {
        const ratio = dist / pinchDistRef.current;
        setZoom((z) => Math.min(2.4, Math.max(1, Number((z * ratio).toFixed(2)))));
      }
      pinchDistRef.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchDistRef.current = null;
  }, []);

  if (shouldSimplify) {
    return (
      <div ref={containerRef} className="bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg p-6">
        <div className="mb-4">
          <h3 className="font-display text-2xl font-bold">{config.title}</h3>
          <p className="text-sm text-[#4D5A48] mt-1">Static multi-angle studio gallery (reduced-motion mode).</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <img
            src={config.angleSources.front}
            alt="Front studio angle"
            width={540}
            height={720}
            loading="lazy"
            className="w-full aspect-[3/4] object-cover rounded-md border border-[#C5D1B8]"
            referrerPolicy="no-referrer"
          />
          <img
            src={config.angleSources.right}
            alt="Side profile studio angle"
            width={540}
            height={720}
            loading="lazy"
            className="w-full aspect-[3/4] object-cover rounded-md border border-[#C5D1B8]"
            referrerPolicy="no-referrer"
          />
          <img
            src={config.angleSources.back}
            alt="Back studio angle"
            width={540}
            height={720}
            loading="lazy"
            className="w-full aspect-[3/4] object-cover rounded-md border border-[#C5D1B8]"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
    >
      <div className="lg:col-span-7 relative bg-[#F7F5EF] flex items-center justify-center min-h-[440px]">
        {/* Small/instant first-frame placeholder shown while 24 WebP sequence builds */}
        {!framesReady && (
          <img
            src={config.angleSources.front}
            alt={config.title}
            width={540}
            height={720}
            className="w-full max-w-md aspect-[3/4] object-cover"
            referrerPolicy="no-referrer"
          />
        )}

        <canvas
          ref={canvasRef}
          width={540}
          height={720}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label="360-degree interactive garment viewer. Drag left or right to rotate."
          className={`w-full max-w-md aspect-[3/4] touch-pan-y cursor-grab active:cursor-grabbing ${
            framesReady ? 'block' : 'hidden'
          }`}
        />

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
          <div className="px-3 py-1.5 bg-[#F7F5EF]/95 border border-[#C5D1B8] rounded-md text-xs font-medium text-[#1F2A1C] inline-flex items-center gap-2 pointer-events-auto">
            <RotateCw className="w-3.5 h-3.5" />
            <span>
              {hasInteracted ? `Frame ${frameIndexDisplay + 1} / 24` : 'Drag or swipe 360°'}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#F7F5EF]/95 border border-[#C5D1B8] rounded-md p-1 pointer-events-auto">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.3).toFixed(2))))}
              aria-label="Zoom out"
              className="p-1.5 rounded hover:bg-[#E7ECE0]"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-1.5 tabular-nums">{zoom.toFixed(1)}x</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.3).toFixed(2))))}
              aria-label="Zoom in"
              className="p-1.5 rounded hover:bg-[#E7ECE0]"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-[#E7ECE0]/50 border-t lg:border-t-0 lg:border-l border-[#C5D1B8]">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">Interactive 01 · 24 WebP Frames</p>
          <h3 className="font-display text-2xl sm:text-3xl font-bold mt-2 text-[#1F2A1C]">
            {config.title}
          </h3>
          <p className="text-sm text-[#4D5A48] mt-3 leading-relaxed">{config.subtitle}</p>

          <dl className="mt-6 space-y-3 text-sm border-t border-[#C5D1B8] pt-5">
            <div className="flex justify-between">
              <dt className="text-[#4D5A48]">Garment</dt>
              <dd className="font-semibold">Monolith 420 GSM Hoodie</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#4D5A48]">Fabric</dt>
              <dd className="font-semibold">Diagonal Loopback Terry</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#4D5A48]">Controls</dt>
              <dd className="font-semibold">Drag inertia · Pinch/scroll zoom</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 pt-4 border-t border-[#C5D1B8] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setHasInteracted(false);
              setZoom(1);
            }}
            className="px-4 py-2 text-sm font-semibold bg-[#9CAF88] text-[#1F2A1C] rounded-md hover:bg-[#8EA379] transition-colors"
          >
            Reset Orbit
          </button>
          <a
            href="/product/monolith-420gsm-sage-hoodie"
            className="text-sm font-semibold underline text-[#1F2A1C]"
          >
            View Product
          </a>
        </div>
      </div>
    </div>
  );
}
