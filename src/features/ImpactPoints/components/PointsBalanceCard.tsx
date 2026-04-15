import React from 'react';
import { Star, Clock3 } from 'lucide-react';
import { motion } from 'motion/react';

interface PointsBalanceCardProps {
  availablePoints: number;
  pendingPoints?: number;
}

export const PointsBalanceCard: React.FC<PointsBalanceCardProps> = ({
  availablePoints,
  pendingPoints = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-redoma-dark rounded-[2rem] p-8 text-white shadow-2xl shadow-redoma-dark/20"
    >
      <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-redoma-steel/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-redoma-glow/10 rounded-full blur-2xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-redoma-star/20 rounded-lg">
            <Star size={16} className="text-redoma-star" fill="currentColor" />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-redoma-glow">
            Saldo atual
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <h2 className="text-5xl font-black tracking-tighter">
            {availablePoints.toLocaleString('pt-BR')}
          </h2>
          <span className="text-lg font-medium text-redoma-glow/80">pontos</span>
        </div>

        <p className="text-sm text-redoma-glow/80 leading-relaxed max-w-[260px]">
          Você acumulou pontos por apoiar comunidades e interagir com a plataforma.
        </p>

        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-redoma-glow/70">Disponíveis</span>
            <span className="font-bold text-white">
              {availablePoints.toLocaleString('pt-BR')} pts
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-redoma-glow/70">
              <Clock3 size={12} />
              Pendentes
            </span>
            <span className="font-bold text-white">
              {pendingPoints.toLocaleString('pt-BR')} pts
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};