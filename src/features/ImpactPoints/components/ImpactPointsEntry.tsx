import React, { useEffect, useRef, useState } from 'react';
import { Star, ChevronRight, CircleHelp } from 'lucide-react';

interface ImpactPointsEntryProps {
  points: number;
  onClick: () => void;
}

export const ImpactPointsEntry: React.FC<ImpactPointsEntryProps> = ({ points, onClick }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!tooltipRef.current) return;
      if (!tooltipRef.current.contains(event.target as Node)) {
        setTooltipOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInfoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setTooltipOpen((prev) => !prev);
  };

  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md hover:border-redoma-steel/30 transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-redoma-dark flex items-center justify-center text-redoma-star shadow-inner shrink-0">
          <Star size={20} fill="currentColor" />
        </div>

        <div className="text-left min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Seu Impacto
            </p>

            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-amber-700">
              Beta
            </span>

            <div ref={tooltipRef} className="relative flex items-center">
              <button
                type="button"
                aria-label="O que é Impact Points?"
                onClick={handleInfoClick}
                onMouseEnter={() => setTooltipOpen(true)}
                onMouseLeave={() => setTooltipOpen(false)}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:text-redoma-dark hover:border-redoma-steel/40 transition"
              >
                <CircleHelp size={12} />
              </button>

              <div
                className={`absolute left-0 top-7 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl text-[11px] leading-relaxed text-slate-600 normal-case tracking-normal font-medium transition-all ${
                  tooltipOpen
                    ? 'opacity-100 visible translate-y-0'
                    : 'opacity-0 invisible -translate-y-1'
                }`}
              >
                Impact Points são pontos que você acumula ao interagir com a Redoma e apoiar comunidades. Eles poderão ser trocados por benefícios na Redoma Store.
              </div>
            </div>
          </div>

          <p className="text-sm font-bold text-slate-800">
            Impact Points —{' '}
            <span className="text-redoma-dark">{points.toLocaleString('pt-BR')} pts</span>
          </p>
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-slate-300 group-hover:text-redoma-steel group-hover:translate-x-1 transition-all shrink-0"
      />
    </button>
  );
};