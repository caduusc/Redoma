import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Community } from '../types';
import { useCommunities } from '../context/CommunityContext';
import { uploadCommunityLogo } from '../lib/uploadCommunityLogo';
import { Plus, Edit2, Trash2, Power, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type CommunityFormData = {
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  isActive: boolean;
};

const AdminCommunities: React.FC = () => {
  const { communities, addCommunity, updateCommunity, deleteCommunity, toggleActive } =
    useCommunities();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);

  const [formData, setFormData] = useState<CommunityFormData>({
    name: '',
    slug: '',
    description: '',
    logo_url: null,
    isActive: true,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const communitiesSorted = [...communities].sort((a, b) => a.name.localeCompare(b.name));

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      logo_url: null,
      isActive: true,
    });
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleOpenModal = (c: Community | null = null) => {
    if (c) {
      setEditingCommunity(c);
      setFormData({
        name: c.name,
        slug: (c.slug ?? '').toString(),
        description: c.description ?? '',
        logo_url: c.logo_url ?? null,
        isActive: c.isActive,
      });
      setLogoFile(null);
      setLogoPreview(c.logo_url ?? null);
    } else {
      setEditingCommunity(null);
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Envie apenas imagens.');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);

      const name = formData.name.trim();
      const slug = formData.slug.trim().toLowerCase();

      if (!name) {
        alert('Informe o nome.');
        return;
      }
      if (!slug) {
        alert('Informe o slug (ex: unidos-somos-fortes).');
        return;
      }

      // IMPORTANTE:
      // - Para subir logo no create, precisamos de um id.
      // - Então: primeiro cria/atualiza, depois (se tiver arquivo) faz upload e atualiza logo_url.
      if (!editingCommunity) {
        // CREATE primeiro
        const created = await addCommunity({
          ...formData,
          name,
          slug,
          logo_url: null,
        } as any);

        // Se seu addCommunity NÃO retorna a comunidade criada, ajuste seu context para retornar.
        // Fallback: tenta pegar pelo slug na lista depois.
        const createdId =
          (created as any)?.id ||
          communities.find((c) => (c.slug || '').toLowerCase() === slug)?.id ||
          null;

        if (logoFile && createdId) {
          const publicUrl = await uploadCommunityLogo(logoFile, createdId);

          await updateCommunity(createdId, {
            ...formData,
            name,
            slug,
            logo_url: publicUrl,
          } as any);
        } else if (logoFile && !createdId) {
          alert(
            'Comunidade criada, mas não consegui recuperar o ID para subir a logo. Reabra e edite para enviar a logo.'
          );
        }
      } else {
        // UPDATE (se tiver logo, faz upload usando o id existente)
        let finalLogoUrl: string | null = formData.logo_url ?? null;

        if (logoFile) {
          const publicUrl = await uploadCommunityLogo(logoFile, editingCommunity.id);
          finalLogoUrl = publicUrl;
        }

        await updateCommunity(editingCommunity.id, {
          ...formData,
          name,
          slug,
          logo_url: finalLogoUrl,
        } as any);
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('[AdminCommunities handleSubmit] erro ao salvar comunidade', err);
      alert('Erro ao salvar comunidade (logo ou dados). Veja o console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout activeTab="communities">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Comunidades</h2>
          <p className="text-slate-400 text-sm mt-1">Cadastre e gerencie as comunidades da rede.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="bg-redoma-dark text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-redoma-dark/10"
        >
          <Plus size={18} />
          Nova Comunidade
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* MOBILE */}
        <div className="block md:hidden divide-y divide-slate-100">
          {communitiesSorted.map((c) => (
            <div key={c.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {c.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt={c.name}
                      className="w-9 h-9 rounded-xl object-cover bg-white border border-slate-100"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                      {c.name.charAt(0)}
                    </div>
                  )}

                  <div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{c.name}</p>
                    <p className="text-[11px] text-slate-400">{c.slug || '-'}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    c.isActive
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {c.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {c.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {c.description ? (
                <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => toggleActive(c.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-500 bg-slate-50 active:scale-[0.98] transition-all"
                >
                  <Power size={14} />
                  {c.isActive ? 'Desativar' : 'Ativar'}
                </button>

                <button
                  onClick={() => handleOpenModal(c)}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-2 rounded-xl border border-blue-100 text-blue-600 bg-blue-50 active:scale-[0.98] transition-all"
                >
                  <Edit2 size={14} />
                  Editar
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Excluir comunidade?')) deleteCommunity(c.id);
                  }}
                  className="w-10 inline-flex items-center justify-center rounded-xl border border-red-100 text-red-500 bg-red-50 active:scale-[0.98] transition-all"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {communitiesSorted.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhuma comunidade cadastrada ainda.
            </div>
          )}
        </div>

        {/* DESKTOP */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Nome
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Slug
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
              {communitiesSorted.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        <img
                          src={c.logo_url}
                          alt={c.name}
                          className="w-9 h-9 rounded-xl object-cover bg-white border border-slate-100"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                        {c.description ? (
                          <p className="text-[11px] text-slate-400 line-clamp-1">{c.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-600 font-semibold">{c.slug || '-'}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${
                        c.isActive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {c.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {c.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(c.id)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all"
                        title={c.isActive ? 'Desativar' : 'Ativar'}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenModal(c)}
                        className="px-3 py-2 rounded-xl border border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Excluir comunidade?')) deleteCommunity(c.id);
                        }}
                        className="px-3 py-2 rounded-xl border border-red-100 text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {communitiesSorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-xs text-slate-400">
                    Nenhuma comunidade cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-800">
                {editingCommunity ? 'Editar Comunidade' : 'Nova Comunidade'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Cadastre nome, slug e (opcional) logo/descrição.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Nome
                  </label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-redoma-steel focus:outline-none"
                    placeholder="Ex: Instituto Luz"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Slug
                  </label>
                  <input
                    value={formData.slug}
                    onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-redoma-steel focus:outline-none"
                    placeholder="ex: instituto-luz"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Descrição (opcional)
                </label>
                <textarea
                  value={formData.description ?? ''}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-redoma-steel focus:outline-none min-h-[90px]"
                  placeholder="Ex: Comunidade de apoio social e renda colaborativa."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Logo (opcional)
                  </label>
                  <input type="file" accept="image/*" onChange={handleLogoChange} />
                  {!editingCommunity && logoFile ? (
                    <p className="text-[10px] text-slate-400 mt-2">
                      A logo será enviada após salvar a comunidade (precisamos do ID).
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="preview"
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold">
                      {formData.name?.charAt(0) || 'C'}
                    </div>
                  )}

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                    />
                    Ativa
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest disabled:opacity-70"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-2xl bg-redoma-dark text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCommunities;
