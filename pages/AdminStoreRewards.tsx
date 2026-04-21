import React, { useState } from 'react';
import { useStoreRewards } from '../context/StoreRewardsContext';
import AdminLayout from '../components/AdminLayout';
import { StoreItem } from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { uploadStoreItemImage } from '../lib/uploadStoreItemImage';

type StoreItemFormData = {
  name: string;
  brand: string;
  description: string;
  image_url: string | null;
  value_brl: number;
  required_points: number;
  category: string;
  sort_order: number;
  isActive: boolean;
};

const emptyForm = (): StoreItemFormData => ({
  name: '',
  brand: '',
  description: '',
  image_url: null,
  value_brl: 0,
  required_points: 0,
  category: '',
  sort_order: 0,
  isActive: true,
});

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none bg-slate-50/50 text-[16px] text-slate-800';

const AdminStoreRewards: React.FC = () => {
  const { items, addItem, updateItem, deleteItem, toggleActive } = useStoreRewards();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [formData, setFormData] = useState<StoreItemFormData>(emptyForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const itemsSorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const resetForm = () => {
    setFormData(emptyForm());
    setImageFile(null);
    setImagePreview(null);
    setEditingItem(null);
  };

  const handleOpenModal = (item: StoreItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        brand: item.brand,
        description: item.description ?? '',
        image_url: item.image_url ?? null,
        value_brl: item.value_brl,
        required_points: item.required_points,
        category: item.category ?? '',
        sort_order: item.sort_order ?? 0,
        isActive: item.isActive,
      });
      setImageFile(null);
      setImagePreview(item.image_url ?? null);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleValueChange = (raw: string) => {
    const brl = parseFloat(raw || '0');
    setFormData((prev) => ({
      ...prev,
      value_brl: brl,
      required_points: Math.round(brl * 100),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalImageUrl: string | null = formData.image_url ?? null;

      if (imageFile) {
        const { publicUrl } = await uploadStoreItemImage({
          file: imageFile,
          itemId: editingItem?.id,
        });
        finalImageUrl = publicUrl;
      }

      const payload = { ...formData, image_url: finalImageUrl };

      if (editingItem) {
        await updateItem(editingItem.id, payload as Partial<StoreItem>);
      } else {
        await addItem(payload as Omit<StoreItem, 'id' | 'createdAt' | 'updatedAt'>);
      }

      handleClose();
    } catch (err) {
      console.error('[AdminStoreRewards handleSubmit]', err);
      alert('Erro ao salvar item. Veja o console para detalhes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout activeTab="store">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Redoma Store</h2>
          <p className="text-slate-400 text-sm mt-1">
            Cadastre os itens que os membros poderão resgatar com seus Impact Points.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-redoma-dark text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-redoma-dark/10"
        >
          <Plus size={18} />
          Novo Item
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* MOBILE */}
        <div className="block md:hidden divide-y divide-slate-100">
          {itemsSorted.map((item) => (
            <div key={item.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p>
                    <p className="text-[11px] text-slate-400">{item.brand}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    item.isActive
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                >
                  {item.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {item.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                  {item.category || 'Sem categoria'}
                </span>
                <span className="font-bold text-slate-700">
                  {item.required_points.toLocaleString('pt-BR')} pts •{' '}
                  R$ {item.value_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => toggleActive(item.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-500 bg-slate-50 active:scale-[0.98] transition-all"
                >
                  <Power size={14} />
                  {item.isActive ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleOpenModal(item)}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-3 py-2 rounded-xl border border-blue-100 text-blue-600 bg-blue-50 active:scale-[0.98] transition-all"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Excluir este item da store?')) deleteItem(item.id);
                  }}
                  className="w-10 inline-flex items-center justify-center rounded-xl border border-red-100 text-red-500 bg-red-50 active:scale-[0.98] transition-all"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {itemsSorted.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhum item cadastrado ainda.
            </div>
          )}
        </div>

        {/* DESKTOP */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Item
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Categoria
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Valor / Pontos
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
              {itemsSorted.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-9 h-9 rounded-lg object-cover bg-white border border-slate-100"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                          {item.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-700 text-sm">{item.name}</p>
                        <p className="text-xs text-slate-400">{item.brand}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {item.category || '—'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 text-sm">
                      {item.required_points.toLocaleString('pt-BR')} pts
                    </p>
                    <p className="text-xs text-slate-400">
                      R$ {item.value_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        item.isActive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {item.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {item.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => toggleActive(item.id)}
                      className="p-2 text-slate-400 hover:text-redoma-steel transition-colors"
                      title="Alternar Status"
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Excluir este item da store?')) deleteItem(item.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {itemsSorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400">
                    Nenhum item cadastrado ainda.
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
                {editingItem ? 'Editar Item' : 'Novo Item da Store'}
              </h3>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="px-6 py-6 md:px-8 md:py-8 grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Imagem */}
              <div className="md:col-span-2 flex items-center gap-4">
                {imagePreview || formData.image_url ? (
                  <img
                    src={imagePreview || (formData.image_url as string)}
                    alt="Prévia"
                    className="w-14 h-14 rounded-2xl object-cover bg-slate-100 border border-slate-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <ImageIcon size={24} />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Imagem do Item (opcional)
                  </label>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="text-[11px]" />
                  <span className="text-[10px] text-slate-400">PNG ou JPG, preferencialmente quadrado, até ~2MB.</span>
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Nome do Item
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Marca */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Marca / Fornecedor
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amazon, iFood..."
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Categoria */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Categoria (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gift Card, Alimentação..."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Descrição (opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Valor em BRL */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.value_brl || ''}
                  onChange={(e) => handleValueChange(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Pontos necessários */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Pontos Necessários
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.required_points || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, required_points: parseInt(e.target.value || '0', 10) })
                  }
                  className={inputCls}
                />
                <span className="text-[10px] text-slate-400">
                  Auto-calculado: R$ × 100 (1 ponto = R$ 0,01)
                </span>
              </div>

              {/* Ordem */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value || '0', 10) })
                  }
                  className={inputCls}
                />
              </div>

              {/* Ativo */}
              <div className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 accent-redoma-dark"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-600 cursor-pointer">
                  Item ativo (visível na store)
                </label>
              </div>

              {/* Botões */}
              <div className="md:col-span-2 pt-4 flex flex-col md:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest bg-redoma-dark text-white hover:bg-slate-800 transition-all shadow-xl shadow-redoma-dark/20 disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Criar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminStoreRewards;
