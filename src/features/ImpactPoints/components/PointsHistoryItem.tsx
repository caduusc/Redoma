import React from 'react';
import { ShoppingBag, Zap, RefreshCw, Share2, Plus } from 'lucide-react';
import { ImpactPointAction } from '../types';

interface PointsHistoryItemProps {
  action: ImpactPointAction;
}

export const PointsHistoryItem: React.FC<PointsHistoryItemProps> = ({ action }) => {
  const getIcon = () => {
    switch (action.type) {
      case 'purchase':
        return <ShoppingBag size={16} />;
      case 'engagement':
        return <Zap size={16} />;
      case 'recurring':
        return <RefreshCw size={16} />;
      case 'share':
        return <Share2 size={16} />;
      default:
        return <Zap size={16} />;
    }
  };

  const getIconBg = () => {
    switch (action.type) {
      case 'purchase':
        return 'bg-emerald-50 text-emerald-600';
      case 'engagement':
        return 'bg-amber-50 text-amber-600';
      case 'recurring':
        return 'bg-blue-50 text-blue-600';
      case 'share':
        return 'bg-purple-50 text-purple-600';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getIconBg()} transition-transform group-hover:scale-110`}
      >
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3 mb-1">
          <h4 className="text-sm font-bold text-slate-800 leading-tight">
            {action.title}
          </h4>

          <div className="flex items-center text-emerald-600 font-black text-sm shrink-0">
            <Plus size={12} strokeWidth={3} />
            <span>{action.points}</span>
          </div>
        </div>

        {action.description ? (
          <p className="text-xs text-slate-500 leading-relaxed mb-2">
            {action.description}
          </p>
        ) : null}

        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          {new Date(action.date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
};