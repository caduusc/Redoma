import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

const AgentLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase login error:', error);
        alert(`Erro ao fazer login: ${error.message}`);
        return;
      }

      // Sanity check
      if (!data.session) {
        alert('Não foi possível criar sessão. Tente novamente.');
        return;
      }

      // Agora existe sessão/token (vai aparecer no Storage)
      navigate('/agent/inbox');
    } catch (err) {
      console.error('Unexpected login error:', err);
      alert('Erro inesperado ao fazer login. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-redoma-light flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-redoma-dark/5 overflow-hidden border border-slate-100">
        <div className="p-10 border-b border-slate-50 text-center bg-slate-50/30">
          <Logo size={48} className="mb-4" />
          <h1 className="text-xl font-bold text-redoma-dark tracking-tight">Redoma Admin</h1>
          <p className="text-slate-400 text-[10px] mt-1 font-extrabold uppercase tracking-[0.2em]">
            Painel do Atendente
          </p>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              E-mail Corporativo
            </label>
            <input
              type="email"
              placeholder="atendente@redoma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-redoma-dark focus:outline-none transition-all bg-slate-50/50"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Senha de Acesso
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-redoma-dark focus:outline-none transition-all bg-slate-50/50"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-redoma-dark text-white font-bold py-4 rounded-2xl hover:bg-redoma-navy transition-all shadow-xl active:scale-[0.98] uppercase tracking-widest text-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>

      <button
        onClick={() => navigate('/client/start')}
        className="mt-8 text-redoma-steel font-bold hover:text-redoma-dark transition-colors text-xs uppercase tracking-widest"
      >
        Voltar para Site Principal
      </button>
    </div>
  );
};

export default AgentLogin;
