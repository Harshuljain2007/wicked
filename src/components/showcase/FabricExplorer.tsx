import { useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { ShowcaseData } from '../../types';

interface FabricExplorerProps {
  fabricExplorer: ShowcaseData['fabricExplorer'];
}

export function FabricExplorer({ fabricExplorer }: FabricExplorerProps) {
  const { shouldSimplify } = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [lensActive, setLensActive] = useState(false);
  const [coords, setCoords] = useState({ xPct: 50, yPct: 50, px: 0, py: 0 });
  const [selectedNote, setSelectedNote] = useState(fabricExplorer.notes[0]?.id || 'f1');

  const updatePointer = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    setCoords({
      xPct: (relX / rect.width) * 100,
      yPct: (relY / rect.height) * 100,
      px: relX,
      py: relY,
    });
  };

  return (
    <div className="bg-[#FCFBF7] border border-[#C5D1B8] rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
      <div
        ref={containerRef}
        onMouseEnter={(e) => {
          setLensActive(true);
          updatePointer(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => updatePointer(e.clientX, e.clientY)}
        onMouseLeave={() => setLensActive(false)}
        onTouchStart={(e) => {
          if (e.touches[0]) {
            setLensActive(true);
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) {
            updatePointer(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => setLensActive(false)}
        className="lg:col-span-7 relative aspect-[4/3] bg-[#E7ECE0] overflow-hidden cursor-crosshair select-none touch-none"
      >
        <img
          src={fabricExplorer.imageUrl}
          alt={fabricExplorer.title}
          width={960}
          height={720}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />

        {!shouldSimplify && lensActive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 w-36 h-36 rounded-full border-2 border-[#F7F5EF] shadow-lg"
            style={{
              transform: `translate3d(${coords.px - 72}px, ${coords.py - 72}px, 0)`,
              backgroundImage: `url(${fabricExplorer.imageUrl})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '240% 240%',
              backgroundPosition: `${coords.xPct}% ${coords.yPct}%`,
            }}
          />
        )}

        <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-[#F7F5EF]/95 border border-[#C5D1B8] rounded-md text-xs font-medium text-[#1F2A1C]">
          {shouldSimplify
            ? 'Macro Textile View'
            : 'Hover or press-and-hold to inspect 2.4× weave'}
        </div>
      </div>

      <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#C5D1B8]">
        <div>
          <p className="text-xs font-medium text-[#4D5A48]">Interactive 04 · Fabric Explorer</p>
          <h3 className="font-display text-2xl sm:text-3xl font-bold mt-1">{fabricExplorer.title}</h3>
          <p className="text-sm text-[#4D5A48] mt-2">{fabricExplorer.subtitle}</p>

          <div className="mt-5 space-y-3">
            {fabricExplorer.notes.map((note) => {
              const active = note.id === selectedNote;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedNote(note.id)}
                  className={`w-full text-left p-4 rounded-md border transition-colors ${
                    active
                      ? 'bg-[#9CAF88] border-[#1F2A1C] text-[#1F2A1C]'
                      : 'bg-[#F7F5EF] border-[#C5D1B8] text-[#1F2A1C] hover:bg-[#E7ECE0]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-base">{note.title}</span>
                    <span className="text-xs font-mono font-semibold tabular-nums">{note.gsm}</span>
                  </div>
                  <p className="text-xs mt-1.5 opacity-90">{note.weave}</p>
                  <p className="text-xs mt-1 font-medium">Care: {note.care}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
