import React, { useEffect, useState } from 'react';
import { ArrowLeft, History, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import Logo from '../../../components/Logo';
import { supabasePublic } from '../../../lib/supabase';
import { PointsBalanceCard } from './components/PointsBalanceCard';
import { PointsHistoryItem } from './components/PointsHistoryItem';
import { PointsEmptyState } from './components/PointsEmptyState';
import { RewardsComingSoonCard } from './components/RewardsComingSoonCard';
import type {
  ImpactPointAction,
  ImpactPointsDashboardResponse,
  ImpactPointsSummary,
} from './types';

interface ImpactPointsPageProps {
  onBack: () => void;
}

const ImpactPointsPage: React.FC<ImpactPointsPageProps> = ({ onBack }) => {
  const [summary, setSummary] = useState<ImpactPointsSummary | null>(null);
  const [history, setHistory] = useState<ImpactPointAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImpactPoints = async () => {
      try {
        setLoading(true);
        setError(null);

        const phoneNormalized = localStorage.getItem('redoma_phone');
        const fullName = localStorage.getItem('redoma_full_name');

        if (!phoneNormalized) {
          setError('Não foi possível identificar seu telefone para carregar seus pontos.');
          return;
        }

        const { data, error } = await supabasePublic.rpc('get_impact_points_dashboard', {
          p_phone_normalized: phoneNormalized,
          p_full_name: fullName,
        });

        if (error) {
          console.error('[ImpactPointsPage] rpc error', error);
          setError('Não foi possível carregar seus Impact Points.');
          return;
        }

        const payload = data as ImpactPointsDashboardResponse | null;

        if (!payload?.summary) {
          setError('Não foi possível carregar seus dados de pontos.');
          return;
        }

        setSummary(payload.summary);
        setHistory(payload.history || []);
      } catch (err) {
        console.error('[ImpactPointsPage] unexpected error', err);
        setError('Ocorreu um erro ao carregar seus pontos.');
      } finally {
        setLoading(false);
      }
    };

    fetchImpactPoints();
  }, []);

  const hasPoints = (summary?.available_points || 0) > 0 || history.length > 0;

  return (
    <div className="min-h-screen bg-redoma-light pb-12">
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <Logo size={32} />
        <div className="w-9" />
      </header>

      <main className="max-w-md mx-auto px-6 pt-8 space-y-8">
          <section>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Impact Points
            </h1>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-700">
              Beta
            </span>
          </div>

          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Acompanhe seu impacto e veja quantos pontos você acumulou.
          </p>
        </section>

        {loading ? (
          <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm flex items-center justify-center gap-3 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span>Carregando seus pontos...</span>
          </div>
        ) : error ? (
          <div className="bg-white rounded-[2rem] border border-red-100 p-6 shadow-sm flex items-start gap-3 text-red-600">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <section>
              <PointsBalanceCard
                availablePoints={summary?.available_points || 0}
                pendingPoints={summary?.pending_points || 0}
              />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <History size={18} className="text-redoma-steel" />
                  <h3 className="text-base">Histórico de acúmulo</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {history.length} ações
                </span>
              </div>

              {!hasPoints ? (
                <PointsEmptyState />
              ) : (
                <div className="bg-white rounded-[2rem] border border-slate-100 p-2 shadow-sm">
                  <div className="divide-y divide-slate-50">
                    {history.map((action, index) => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.06 }}
                      >
                        <PointsHistoryItem action={action} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="pt-4">
              <RewardsComingSoonCard />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default ImpactPointsPage;