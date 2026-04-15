import React from 'react';
import { Gift, Lock } from 'lucide-react';

export const RewardsComingSoonCard: React.FC = () => {
  return (
    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center relative overflow-hidden group">
      <div className="absolute top-2 right-4">
        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-slate-200 shadow-sm">
          <Lock size={10} className="text-slate-400" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Em breve</span>
        </div>
      </div>

      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:rotate-6 transition-transform">
        <Gift size={32} className="text-slate-300" />
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-2">Benefícios em breve</h3>
      <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto">
        Em breve será possível trocar seus pontos por vantagens exclusivas dentro da experiência Redoma.
      </p>
      
      <div className="mt-6 flex justify-center gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-8 h-1 bg-slate-200 rounded-full" />
        ))}
      </div>
    </div>
  );
};
