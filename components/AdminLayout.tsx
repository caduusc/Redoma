
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, LayoutDashboard, Briefcase } from 'lucide-react';
import Logo from './Logo';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'providers';
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('redoma_admin_session');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-redoma-dark text-white hidden lg:flex flex-col">
        <div className="p-8 border-b border-white/5">
          <Logo size={40} className="mb-4" />
          <h2 className="text-lg font-bold tracking-tight">Redoma Admin</h2>
          <p className="text-[10px] text-redoma-glow font-bold uppercase tracking-widest mt-1 opacity-60">Portal de Gestão</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button 
            onClick={() => navigate('/agent/inbox')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <LayoutDashboard size={18} />
            Inbox de Suporte
          </button>
          <button 
            onClick={() => navigate('/admin/providers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'providers' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Briefcase size={18} />
            Gerenciar Fornecedores
          </button>
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8">
          <h1 className="font-bold text-slate-800">
            {activeTab === 'providers' ? 'Catálogo de Fornecedores' : 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Settings size={14} className="text-slate-400" />
             </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
