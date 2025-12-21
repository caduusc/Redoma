import React from 'react';
import { Provider } from '../types';
import { Tag } from 'lucide-react';

interface ProviderCardProps {
  provider: Provider;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-6 flex flex-col h-full group">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 group-hover:bg-redoma-light transition-colors">
          <span className="text-xl font-bold text-redoma-dark">
            {provider.name.charAt(0)}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider mb-1">
            aproximadamente {provider.cashbackPercent}% Revertido
          </span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            {provider.category}
          </span>
        </div>
      </div>

      <h3 className="font-bold text-slate-800 text-lg mb-2 group-hover:text-redoma-dark transition-colors">
        {provider.name}
      </h3>

      <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
        {provider.description}
      </p>

      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50">
        <p className="text-[10px] text-slate-400 font-medium leading-tight">
          <Tag size={10} className="inline mr-1 text-redoma-steel" />
          {provider.revenueShareText}
        </p>
      </div>
    </div>
  );
};

export default ProviderCard;
