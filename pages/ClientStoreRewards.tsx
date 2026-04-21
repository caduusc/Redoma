import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Star, AlertCircle, Loader2, ShoppingBag } from 'lucide-react';
import { supabasePublic } from '../lib/supabase';
import { StoreItem } from '../types';
import Logo from '../components/Logo';

interface RedeemFeedback {
  itemId: string;
  type: 'sufficient' | 'insufficient';
  deficit?: number;
}

const ClientStoreRewards: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<StoreItem[]>([]);
  const [availablePoints, setAvailablePoints] = useState<number>(0);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [feedback, setFeedback] = useState<RedeemFeedback | null>(null);

  const phoneNormalized = localStorage.getItem('redoma_phone');
  const fullName = localStorage.getItem('redoma_full_name');

  useEffect(() => {
    const fetchPoints = async () => {
      if (!phoneNormalized) {
        setLoadingPoints(false);
        return;
      }

      try {
        const { data } = await supabasePublic.rpc('get_impact_points_dashboard', {
          p_phone_normalized: phoneNormalized,
          p_full_name: fullName,
        });

        if (data?.summary?.available_points != null) {
          setAvailablePoints(data.summary.available_points);
        }
      } catch (err) {
        console.error('[ClientStoreRewards] fetchPoints error', err);
      } finally {
        setLoadingPoints(false);
      }
    };

    const fetchItems = async () => {
      try {
        const { data, error } = await supabasePublic
          .from('store_items')
          .select('*')
          .eq('isActive', true)
          .order('sort_order', { ascending: true });

        if (!error && data) setItems(data as StoreItem[]);
      } catch (err) {
        console.error('[ClientStoreRewards] fetchItems error', err);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchPoints();
    fetchItems();
  }, []);

  const handleRedeem = (item: StoreItem) => {
    const deficit = item.required_points - availablePoints;
    if (deficit > 0) {
      setFeedback({ itemId: item.id, type: 'insufficient', deficit });
    } else {
      setFeedback({ itemId: item.id, type: 'sufficient' });
    }
  };

  const loading = loadingPoints || loadingItems;

  return (
    <div className="min-h-screen bg-redoma-light">
      {/* Header */}
      <header className="bg-redoma-dark text-white py-12 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-redoma-glow/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-redoma-glow hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <div className="flex items-center gap-4 mb-4">
            <Logo size={36} />
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Redoma Store</h1>
              <p className="text-redoma-glow/80 text-sm font-medium">
                Resgate seus Impact Points por benefícios exclusivos
              </p>
            </div>
          </div>

          {/* Saldo do usuário */}
          <div className="mt-6 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
            <Star size={16} className="text-amber-300" />
            {loadingPoints ? (
              <span className="text-sm font-medium text-white/70">Carregando saldo...</span>
            ) : !phoneNormalized ? (
              <span className="text-sm font-medium text-white/70">Faça login para ver seu saldo</span>
            ) : (
              <span className="text-sm font-bold text-white">
                Seu saldo:{' '}
                <span className="text-amber-300">
                  {availablePoints.toLocaleString('pt-BR')} pontos
                </span>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!phoneNormalized && (
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4 mb-8">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-amber-800 mb-1">Identificação necessária</h4>
              <p className="text-amber-700 text-sm mb-4">
                Para verificar seu saldo e resgatar itens, informe seus dados primeiro.
              </p>
              <button
                onClick={() => navigate('/client/start')}
                className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-md"
              >
                Ir para o início
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-10">
            <Loader2 className="animate-spin" size={16} />
            Carregando itens...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">
              Nenhum item disponível
            </h3>
            <p className="text-slate-300 text-sm mt-2">Em breve novos itens serão adicionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const itemFeedback = feedback?.itemId === item.id ? feedback : null;
              const canRedeem = availablePoints >= item.required_points;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Imagem */}
                  <div className="h-44 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Gift size={40} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {item.brand}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    {item.category && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-redoma-steel">
                        {item.category}
                      </span>
                    )}

                    <div>
                      <h3 className="font-bold text-slate-800 text-base leading-tight">{item.name}</h3>
                      <p className="text-sm text-slate-400 font-medium">{item.brand}</p>
                    </div>

                    {item.description && (
                      <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                    )}

                    {/* Valor */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Valor
                        </p>
                        <p className="text-lg font-extrabold text-slate-800">
                          R$ {item.value_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Pontos
                        </p>
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400" />
                          <p className="text-lg font-extrabold text-amber-500">
                            {item.required_points.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Feedback inline */}
                    {itemFeedback && (
                      <div
                        className={`rounded-xl p-3 text-sm font-medium leading-snug ${
                          itemFeedback.type === 'sufficient'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {itemFeedback.type === 'sufficient' ? (
                          <>
                            <span className="font-bold">Saldo suficiente!</span> O resgate estará
                            disponível em breve.
                          </>
                        ) : (
                          <>
                            <span className="font-bold">
                              Faltam {itemFeedback.deficit!.toLocaleString('pt-BR')} pontos
                            </span>{' '}
                            para resgatar este item.
                          </>
                        )}
                      </div>
                    )}

                    {/* Botão */}
                    <button
                      onClick={() => handleRedeem(item)}
                      disabled={!phoneNormalized}
                      className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                        !phoneNormalized
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : canRedeem
                          ? 'bg-redoma-dark text-white hover:bg-slate-800 shadow-lg shadow-redoma-dark/10'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {!phoneNormalized
                        ? 'Faça login'
                        : canRedeem
                        ? 'Resgatar'
                        : 'Ver quanto falta'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="mt-20 pt-8 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">
            Redoma Store &copy; 2025 · 1 ponto = R$ 0,01
          </p>
        </footer>
      </main>
    </div>
  );
};

export default ClientStoreRewards;
