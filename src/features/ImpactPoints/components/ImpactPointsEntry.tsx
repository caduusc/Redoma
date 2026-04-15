import React from 'react';
import { Star, ChevronRight } from 'lucide-react';

interface ImpactPointsEntryProps {
  points: number;
  onClick: () => void;
}

export const ImpactPointsEntry: React.FC<ImpactPointsEntryProps> = ({ points, onClick }) => {
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