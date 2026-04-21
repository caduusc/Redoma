import React from 'react';
import { Gift, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StoreEntryCardProps {
  availablePoints: number;
}

export const StoreEntryCard: React.FC<StoreEntryCardProps> = ({ availablePoints }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/client/store')}
      className="w-full text-left bg-redoma-dark rounded-[2rem] p-6 relative overflow-hidden group hover:bg-slate-800 transition-colors"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Gift size={20} className="text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-redoma-glow/70">
              Redoma Store
            </span>
          </div>

          <h3 className="text-white font-bold text-lg leading-tight mb-1">
            Resgate seus pontos
          </h3>
          <p className="text-redoma-glow/70 text-sm leading-relaxed">
            Troque seus Impact Points por benefícios exclusivos.
          </p>

          <div className="mt-4 flex items-center gap-1.5">
            <Star size={14} className="text-amber-400" />
            <span className="text-sm font-bold text-white">
              {availablePoints.toLocaleString('pt-BR')}{' '}
              <span className="font-normal text-redoma-glow/70">pontos disponíveis</span>
            </span>
          </div>
        </div>

        <div className="shrink-0 w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors mt-1">
          <ArrowRight size={18} className="text-white" />
        </div>
      </div>
    </button>
  );
};
