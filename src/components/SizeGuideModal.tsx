import { X } from 'lucide-react';
import { useState } from 'react';

interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
  category?: string;
}

const UPPER_ROWS = [
  { size: 'S', chest: '108 / 42.5', length: '68 / 26.8', shoulder: '52 / 20.5' },
  { size: 'M', chest: '114 / 44.9', length: '70.5 / 27.8', shoulder: '54 / 21.3' },
  { size: 'L', chest: '120 / 47.2', length: '73 / 28.7', shoulder: '56 / 22.0' },
  { size: 'XL', chest: '126 / 49.6', length: '75.5 / 29.7', shoulder: '58 / 22.8' },
  { size: 'XXL', chest: '132 / 52.0', length: '77.5 / 30.5', shoulder: '60 / 23.6' },
];

const BOTTOMS_ROWS = [
  { size: 'S', chest: '74–78 / 29–31', length: '101 / 39.8', shoulder: '34 / 13.4' },
  { size: 'M', chest: '80–84 / 31–33', length: '103 / 40.5', shoulder: '35.5 / 14.0' },
  { size: 'L', chest: '86–90 / 34–35', length: '105 / 41.3', shoulder: '37 / 14.6' },
  { size: 'XL', chest: '92–96 / 36–38', length: '107 / 42.1', shoulder: '38.5 / 15.2' },
  { size: 'XXL', chest: '98–102 / 39–40', length: '108 / 42.5', shoulder: '40 / 15.7' },
];

export function SizeGuideModal({ open, onClose, category }: SizeGuideModalProps) {
  const [tab, setTab] = useState<'tops' | 'bottoms'>(category === 'bottoms' ? 'bottoms' : 'tops');

  if (!open) return null;

  const rows = tab === 'bottoms' ? BOTTOMS_ROWS : UPPER_ROWS;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1F2A1C]/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Wicked Size Guide"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#F7F5EF] border border-[#C5D1B8] rounded-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#CFD9C3]">
          <h2 className="font-display text-xl font-bold text-[#1F2A1C]">Garment Size Guide (cm / in)</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="p-2 rounded-md hover:bg-[#E7ECE0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => setTab('tops')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              tab === 'tops' ? 'bg-[#9CAF88] text-[#1F2A1C]' : 'bg-[#E7ECE0] text-[#4D5A48]'
            }`}
          >
            Tees, Shirts, Kurtas &amp; Hoodies
          </button>
          <button
            type="button"
            onClick={() => setTab('bottoms')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              tab === 'bottoms' ? 'bg-[#9CAF88] text-[#1F2A1C]' : 'bg-[#E7ECE0] text-[#4D5A48]'
            }`}
          >
            Bottoms
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#C5D1B8] text-[#4D5A48]">
                <th className="py-2.5 font-medium">Size</th>
                <th className="py-2.5 font-medium">{tab === 'bottoms' ? 'Waist' : 'Chest'}</th>
                <th className="py-2.5 font-medium">Length</th>
                <th className="py-2.5 font-medium">{tab === 'bottoms' ? 'Thigh' : 'Shoulder'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CFD9C3] tabular-nums">
              {rows.map((r) => (
                <tr key={r.size}>
                  <td className="py-2.5 font-semibold">{r.size}</td>
                  <td className="py-2.5">{r.chest}</td>
                  <td className="py-2.5">{r.length}</td>
                  <td className="py-2.5">{r.shoulder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-[#4D5A48] mt-4">
          All Wicked tops are cut on relaxed/boxy blocks. Take your usual size for an intentional architectural drape, or size down one for a closer fit. Free 7-day size exchange on all orders.
        </p>
      </div>
    </div>
  );
}
