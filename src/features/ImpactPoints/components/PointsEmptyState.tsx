import React from 'react';
import { Star, ArrowRight } from 'lucide-react';

export const PointsEmptyState: React.FC = () => {
  return (
    <div className="py-12 px-6 text-center">
      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
        <Star size={40} className="text-slate-200" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Sua jornada começa aqui</h3>
      <p className="text-sm text-slate-500 mb-8 max-w-[260px] mx-auto">
        Você ainda não possui Impact Points. Comece a apoiar causas para acumular pontos e gerar impacto.
      </p>
      <button className="inline-flex items-center gap-2 bg-redoma-dark text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-redoma-navy transition-all shadow-lg shadow-redoma-dark/10">
        Explorar Causas
        <ArrowRight size={14} />
      </button>
    </div>
  );
};
