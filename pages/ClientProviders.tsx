import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabasePublic } from '../lib/supabase';
import ProviderCard from '../components/ProviderCard';
import ProviderFilters from '../components/ProviderFilters';
import { ArrowLeft, LayoutGrid, Info, Loader2 } from 'lucide-react';
import { Provider } from '../types';

const ClientProviders: React.FC = () => {
  const navigate = useNavigate();
  const communityId = localStorage.getItem('redoma_client_cid');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabasePublic
          .from('providers')
          .select('*')
          .eq('isActive', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('[ClientProviders] fetch error', error);
          setProviders([]);
          return;
        }

        setProviders((data || []) as Provider[]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(providers.map((p) => p.category)));
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [providers, search, category]);

  return (
    <div className="min-h-screen bg-redoma-light">
      <header className="bg-redoma-dark text-white py-12 px-6 relative overflow-hidden">
        {/* Enhanced Visual Effect Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <style>
            {`
              @keyframes banner-orbit {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes banner-pulse {
                0%, 100% { opacity: 0.3; transform: scale(0.9); }
                50% { opacity: 0.7; transform: scale(1.1); }
              }
              .banner-animate-orbit { animation: banner-orbit 60s linear infinite; transform-origin: center; }
              .banner-animate-pulse { animation: banner-pulse 5s ease-in-out infinite; }
            `}
          </style>

          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-redoma-glow/10 rounded-full blur-[120px]" />

          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
          >
            <g className="banner-animate-orbit">
              <ellipse
                cx="50"
                cy="50"
                rx="60"
                ry="20"
                stroke="white"
                strokeWidth="0.1"
                fill="none"
                transform="rotate(-15 50 50)"
              />
              <ellipse
                cx="50"
                cy="50"
                rx="50"
                ry="35"
                stroke="white"
                strokeWidth="0.05"
                fill="none"
                transform="rotate(20 50 50)"
              />
              <circle cx="10" cy="20" r="1" fill="#F4F4DC" className="banner-animate-pulse" />
              <circle
                cx="90"
                cy="80"
                r="0.8"
                fill="#F4F4DC"
                className="banner-animate-pulse"
                style={{ animationDelay: '2s' }}
              />
              <circle
                cx="30"
                cy="85"
                r="1.2"
                fill="#F4F4DC"
                className="banner-animate-pulse"
                style={{ animationDelay: '3.5s' }}
              />
              <circle cx="70" cy="15" r="0.5" fill="#F4F4DC" />
              <circle
                cx="85"
                cy="40"
                r="1.5"
                fill="#F4F4DC"
                className="banner-animate-pulse"
                style={{ animationDelay: '1s' }}
              />
            </g>
          </svg>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <button
            onClick={() => navigate('/client/start')}
            className="flex items-center gap-2 text-redoma-glow hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Ecossistema de Benefícios</h1>
          <p className="text-redoma-glow/80 max-w-2xl text-lg font-medium leading-relaxed">
            Utilize os parceiros credenciados Redoma e gere receita automática para a sua comunidade.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!communityId && (
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4 mb-8">
            <Info className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-amber-800 mb-1">ID da Comunidade não encontrado</h4>
              <p className="text-amber-700 text-sm mb-4">
                Para garantir que os benefícios sejam creditados corretamente, informe o ID da sua
                comunidade primeiro.
              </p>
              <button
                onClick={() => navigate('/client/start')}
                className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-md"
              >
                Configurar Comunidade
              </button>
            </div>
          </div>
        )}

        <ProviderFilters
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          categories={categories}
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-10">
            <Loader2 className="animate-spin" size={16} />
            Carregando parceiros...
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <LayoutGrid size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">
              Nenhum parceiro encontrado
            </h3>
            <p className="text-slate-300 text-sm mt-2">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}

        <footer className="mt-20 pt-8 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">
            Programa de Vantagens Redoma &copy; 2025
          </p>
        </footer>
      </main>
    </div>
  );
};

export default ClientProviders;