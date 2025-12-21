
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Login fictício
    localStorage.setItem('redoma_admin_session', 'true');
    navigate('/admin/providers');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/5">
        <div className="p-10 border-b border-slate-50 text-center bg-slate-50/50">
          <Logo size={48} className="mb-4" />
          <h1 className="text-xl font-bold text-redoma-dark tracking-tight">Redoma Central Control</h1>
          <p className="text-slate-400 text-[10px] mt-1 font-extrabold uppercase tracking-[0.2em]">Gestão de Ecossistema</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Usuário Admin</label>
            <input
              type="email"
              placeholder="admin@redoma.tech"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-redoma-dark focus:outline-none transition-all bg-slate-50/50"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chave de Acesso</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-redoma-dark focus:outline-none transition-all bg-slate-50/50"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-redoma-dark text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98] uppercase tracking-widest text-xs"
          >
            Acessar Painel Master
          </button>
        </form>
      </div>
      <button 
        onClick={() => navigate('/client/start')}
        className="mt-8 text-slate-500 font-bold hover:text-white transition-colors text-xs uppercase tracking-widest"
      >
        Sair do Ambiente Seguro
      </button>
    </div>
  );
};

export default AdminLogin;
