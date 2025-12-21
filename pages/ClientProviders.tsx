
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProviders } from '../context/ProviderContext';
import ChatLayout from '../components/ChatLayout';
import ProviderCard from '../components/ProviderCard';
import ProviderFilters from '../components/ProviderFilters';
import { ArrowLeft, LayoutGrid, Info } from 'lucide-react';

const ClientProviders: React.FC = () => {
  const navigate = useNavigate();
  const { getActiveProviders } = useProviders();
  const communityId = localStorage.getItem('redoma_client_cid');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const providers = getActiveProviders();
  
  const categories = useMemo(() => {
    return Array.from(new Set(providers.map(p => p.category)));
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'all' || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [providers, search, category]);

  return (
    <div className="min-h-screen bg-redoma-light">
      <header className="bg-redoma-dark text-white py-12 px-6 relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-redoma-glow/10 rounded-full blur-[100px]" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <button 
            onClick={() => navigate('/client/start')}
            className="flex items-center gap-2 text-redoma-glow hover:text-white transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          
          <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Ecosystem de Benefícios</h1>
          <p className="text-redoma-glow/80 max-w-2xl text-lg font-medium leading-relaxed">
            Sua comunidade gera impacto. Utilize os parceiros credenciados Redoma e gere receita automática para a sua comunidade.
          </p>
          
          <div className="mt-8 inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              Comunidade: <span className="text-redoma-star ml-1">{communityId || 'Identificação Pendente'}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!communityId && (
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4 mb-8">
            <Info className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-amber-800 mb-1">ID da Comunidade não encontrado</h4>
              <p className="text-amber-700 text-sm mb-4">Para garantir que os benefícios sejam creditados corretamente, informe o ID da sua comunidade primeiro.</p>
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

        {filteredProviders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <LayoutGrid size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Nenhum parceiro encontrado</h3>
            <p className="text-slate-300 text-sm mt-2">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map(p => (
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
