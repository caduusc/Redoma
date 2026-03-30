import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabasePublic } from '../lib/supabase';
import Logo from '../components/Logo';
import { ArrowLeft, Loader2, Search, Users } from 'lucide-react';

type CommunityRow = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  logo_url?: string | null;
  isActive: boolean;
};

const ClientCommunities: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchCommunities = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabasePublic
          .from('communities')
          .select('id, name, slug, description, logo_url, isActive')
          .eq('isActive', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('[ClientCommunities] fetch error', error);
          setCommunities([]);
          return;
        }

        setCommunities((data || []) as CommunityRow[]);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const getPublicId = (c: CommunityRow) => (c.slug && c.slug.trim() ? c.slug : c.id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;

    return communities.filter((c) => {
      const hay = `${c.name} ${c.slug || ''} ${c.id} ${c.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [communities, query]);

  const handleChooseCommunity = (publicId: string) => {
    navigate(`/client/start?community=${encodeURIComponent(publicId)}`);
  };

  return (
    <div className="min-h-screen bg-redoma-light flex flex-col items-center justify-start p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-redoma-steel/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-redoma-steel/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl shadow-redoma-dark/5 overflow-hidden relative z-10 border border-slate-100">
        <div className="p-10 bg-redoma-dark text-white text-center relative">
          <button
            type="button"
            onClick={() => navigate('/client/start')}
            className="absolute left-6 top-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-redoma-glow hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>

          <Logo size={70} className="mb-6 drop-shadow-xl mx-auto" />

          <h1 className="text-3xl font-bold tracking-tight">Comunidades & Projetos</h1>

          <p className="text-redoma-glow text-sm mt-3 font-medium">
            Escolha uma comunidade abaixo e siga direto para o atendimento.
          </p>
        </div>

        <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30">
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou descrição..."
              className="w-full outline-none text-sm text-slate-700 placeholder:text-slate-300"
            />
          </div>
        </div>

        <div className="p-10 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-redoma-steel" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              Catálogo completo
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              Carregando comunidades...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma comunidade encontrada com esse filtro.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {filtered.map((c) => {
                const publicId = getPublicId(c);

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-redoma-steel/40 hover:bg-redoma-steel/5 transition flex flex-col h-full"
                  >
                    <h2 className="font-extrabold text-slate-800 text-lg leading-tight mb-4">
                      {c.name}
                    </h2>

                    <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-5 flex-1">
                      <div className="flex flex-col items-center md:items-start">
                        {c.logo_url ? (
                          <img
                            src={c.logo_url}
                            alt={c.name}
                            className="w-32 h-32 rounded-2xl object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="w-32 h-32 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-3xl font-bold">
                            {c.name?.charAt(0) || 'C'}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {c.description ? (
                          <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
                        ) : (
                          <p className="text-xs text-slate-400 leading-relaxed">Sem descrição.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto pt-5">
                      <button
                        type="button"
                        onClick={() => handleChooseCommunity(publicId)}
                        className="w-full px-4 py-3 rounded-2xl bg-redoma-dark text-white font-bold text-[10px] uppercase tracking-widest hover:bg-redoma-navy transition"
                      >
                        Apoiar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-10 pb-6 pt-0 flex justify-between items-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400">Catálogo público (apenas comunidades ativas).</p>

          <button
            type="button"
            onClick={() => navigate('/client/start')}
            className="text-[10px] text-redoma-steel font-bold hover:text-redoma-dark uppercase tracking-widest"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientCommunities;