import React, { useState } from 'react';
import { useProviders } from '../context/ProviderContext';
import AdminLayout from '../components/AdminLayout';
import { Provider } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { uploadProviderLogo } from '../lib/uploadProviderLogo';

type ProviderFormData = {
  name: string;
  type: Provider['type'];
  category: string;
  description: string;
  cashbackPercent: number;
  revenueShareText: string;
  link: string;
  isActive: boolean;
  // 👇 segue o nome da coluna do banco
  logo_url?: string | null;
};

const AdminProviders: React.FC = () => {
  const { providers, addProvider, updateProvider, deleteProvider, toggleActive } = useProviders();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    type: 'ecommerce',
    category: '',
    description: '',
    cashbackPercent: 0,
    revenueShareText: '',
    link: '',
    isActive: true,
    logo_url: null,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const providersSorted = [...providers].sort((a, b) => a.name.localeCompare(b.name));

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'ecommerce',
      category: '',
      description: '',
      cashbackPercent: 0,
      revenueShareText: '',
      link: '',
      isActive: true,
      logo_url: null,
    });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleOpenModal = (p: Provider | null = null) => {
    if (p) {
      setEditingProvider(p);
      setFormData({
        name: p.name,
        type: p.type,
        category: p.category,
        description: p.description,
        cashbackPercent: p.cashbackPercent,
        revenueShareText: p.revenueShareText,
        link: p.link,
        isActive: p.isActive,
        logo_url: p.logo_url ?? null,
      });
      setLogoFile(null);
      setLogoPreview(p.logo_url ?? null);
    } else {
      setEditingProvider(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let finalLogoUrl: string | null = formData.logo_url ?? null;

      // Upload da logo é opcional
      if (logoFile) {
        try {
          const { publicUrl } = await uploadProviderLogo({
            file: logoFile,
            providerId: editingProvider?.id,
          });
          finalLogoUrl = publicUrl;
        } catch (logoErr) {
          console.error('[AdminProviders] erro ao fazer upload da logo', logoErr);
          // se quiser, pode dar um alert aqui
        }
      }

      const payload: ProviderFormData = {
        ...formData,
        logo_url: finalLogoUrl,
      };

      if (editingProvider) {
        await updateProvider(editingProvider.id, payload as any);
      } else {
        await addProvider(payload as any);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('[AdminProviders handleSubmit] error ao salvar provider', err);
      alert('Erro ao salvar fornecedor. Tente novamente.');
    }
  };

  return (
    <AdminLayout activeTab="providers">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Parceiros</h2>
          <p className="text-slate-400 text-sm mt-1">
            Cadastre e gerencie os parceiros que oferecem benefícios à rede.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-redoma-dark text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-redoma-dark/10"
        >
          <Plus size={18} />
          Novo Fornecedor
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* MOBILE: cards empilhados */}
        <div className="block md:hidden divide-y divide-slate-100">
          {providersSorted.map((p) => (
            <div key={p.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {p.logo_url ? (
                    <img
                      src={p.logo_url}
                      alt={p.name}
                      className="w-9 h-9 rounded-xl object-cover bg-white border border-slate-100"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                      {p.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{p.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {p.type === 'ecommerce'
                        ? 'E-commerce'
                        : p.type === 'service'
                        ? 'Serviços'
                        : 'Outros'}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    p.isActive
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {p.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {p.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                  {p.category || 'Sem categoria'}
                </span>
                <span className="font-bold text-emerald-600">
                  {p.cashbackPercent}% cashback
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => toggleActive(p.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-500 bg-slate-50 active:scale-[0.98] transition-all"
                >
                  <Power size={14} />
                  {p.isActive ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleOpenModal(p)}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-2 rounded-xl border border-blue-100 text-blue-600 bg-blue-50 active:scale-[0.98] transition-all"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Excluir fornecedor?')) deleteProvider(p.id);
                  }}
                  className="w-10 inline-flex items-center justify-center rounded-xl border border-red-100 text-red-500 bg-red-50 active:scale-[0.98] transition-all"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {providersSorted.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhum fornecedor cadastrado ainda.
            </div>
          )}
        </div>

        {/* DESKTOP: tabela tradicional */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Nome
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Categoria
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Cashback %
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {providersSorted.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.logo_url ? (
                        <img
                          src={p.logo_url}
                          alt={p.name}
                          className="w-8 h-8 rounded-lg object-cover bg-white border border-slate-100"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-bold text-slate-700">{p.name}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {p.category}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-bold text-emerald-600 text-sm">
                    {p.cashbackPercent}%
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        p.isActive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {p.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {p.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => toggleActive(p.id)}
                      className="p-2 text-slate-400 hover:text-redoma-steel transition-colors"
                      title="Alternar Status"
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Excluir fornecedor?')) deleteProvider(p.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {providersSorted.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-xs text-slate-400"
                  >
                    Nenhum fornecedor cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full md:max-w-2xl max-h-[90vh] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-y-auto border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="px-6 py-6 md:px-8 md:py-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">
                {editingProvider ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="px-6 py-6 md:px-8 md:py-8 grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Logo */}
              <div className="md:col-span-2 flex items-center gap-4">
                {logoPreview || formData.logo_url ? (
                  <img
                    src={logoPreview || (formData.logo_url as string)}
                    alt="Prévia da logo"
                    className="w-14 h-14 rounded-2xl object-cover bg-slate-100 border border-slate-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <ImageIcon size={24} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Logo do Fornecedor (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="text-[11px]"
                  />
                  <span className="text-[10px] text-slate-400">
                    PNG ou JPG, de preferência quadrado, até ~2MB.
                  </span>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Nome do Fornecedor
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none bg-slate-50/50 text-[16px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none bg-slate-50/50 text-[16px]"
                >
                  <option value="ecommerce">E-commerce</option>
                  <option value="service">Serviços</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Categoria
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Varejo, Tecnologia..."
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none bg-slate-50/50 text-[16px]"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Breve Descrição
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none bg-slate-50/50 text-[16px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Cashback (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.cashbackPercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cashbackPercent: parseFloat(e.target.value || '0'),
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none bg-slate-50/50 text-[16px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Link de Acesso (URL)
                </label>
                <input
                  type="url"
                  placeholder="Opcional"
                  value={formData.link}
                  onChange={(e) =>
                    setFormData({ ...formData, link: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none bg-slate-50/50 text-[16px]"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Texto de Impacto (Revenue Share)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Parte do valor retorna para o seu condomínio..."
                  value={formData.revenueShareText}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      revenueShareText: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none bg-slate-50/50 text-[16px]"
                />
              </div>

              <div className="md:col-span-2 pt-4 flex flex-col md:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest bg-redoma-dark text-white hover:bg-slate-800 transition-all shadow-xl shadow-redoma-dark/20"
                >
                  {editingProvider ? 'Salvar Alterações' : 'Criar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProviders;
