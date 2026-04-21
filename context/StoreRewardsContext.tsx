import React, { createContext, useContext, useEffect, useState } from 'react';
import { StoreItem } from '../types';
import { supabaseMaster } from '../lib/supabase';

interface StoreRewardsContextType {
  items: StoreItem[];
  addItem: (item: Omit<StoreItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<StoreItem | null>;
  updateItem: (id: string, item: Partial<StoreItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  getActiveItems: () => StoreItem[];
}

const StoreRewardsContext = createContext<StoreRewardsContextType | undefined>(undefined);

const SEED_ITEMS: Omit<StoreItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Voucher Gift Card',
    brand: 'Amazon',
    description: 'Vale-presente para usar em qualquer compra na Amazon.',
    image_url: null,
    value_brl: 50,
    required_points: 5000,
    category: 'Gift Card',
    sort_order: 1,
    isActive: true,
  },
  {
    name: 'Crédito de Entrega',
    brand: 'iFood',
    description: 'Crédito para pedidos de refeição no iFood.',
    image_url: null,
    value_brl: 30,
    required_points: 3000,
    category: 'Alimentação',
    sort_order: 2,
    isActive: true,
  },
];

const genId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

export const StoreRewardsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<StoreItem[]>([]);

  useEffect(() => {
    let subscription: any;

    const fetchItems = async () => {
      const { data, error } = await supabaseMaster.from('store_items').select('*');

      if (error) {
        console.error('[StoreRewardsContext fetch]', error);
        return;
      }

      if (data && data.length > 0) {
        setItems(data as StoreItem[]);
        return;
      }

      if ((import.meta as any).env?.PROD) {
        console.warn('[StoreRewardsContext] tabela vazia em produção — seed bloqueado');
        return;
      }

      const { data: seeded, error: seedErr } = await supabaseMaster
        .from('store_items')
        .insert(
          SEED_ITEMS.map((s) => ({
            ...s,
            id: genId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        )
        .select();

      if (seedErr) {
        console.error('[StoreRewardsContext seed]', seedErr);
        return;
      }

      if (seeded) setItems(seeded as StoreItem[]);
    };

    fetchItems();

    subscription = supabaseMaster
      .channel('store_items_channel')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'store_items' },
        async () => {
          const { data, error } = await supabaseMaster.from('store_items').select('*');
          if (!error && data) setItems(data as StoreItem[]);
        }
      )
      .subscribe();

    return () => subscription?.unsubscribe?.();
  }, []);

  const addItem = async (
    item: Omit<StoreItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StoreItem | null> => {
    const newItem: StoreItem = {
      ...item,
      id: genId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseMaster
      .from('store_items')
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error('[StoreRewardsContext addItem]', error);
      return null;
    }

    return data as StoreItem;
  };

  const updateItem = async (id: string, item: Partial<StoreItem>) => {
    const { error } = await supabaseMaster
      .from('store_items')
      .update({ ...item, updatedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error('[StoreRewardsContext updateItem]', error);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabaseMaster.from('store_items').delete().eq('id', id);
    if (error) console.error('[StoreRewardsContext deleteItem]', error);
  };

  const toggleActive = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) await updateItem(id, { isActive: !item.isActive });
  };

  const getActiveItems = () =>
    [...items].filter((i) => i.isActive).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <StoreRewardsContext.Provider
      value={{ items, addItem, updateItem, deleteItem, toggleActive, getActiveItems }}
    >
      {children}
    </StoreRewardsContext.Provider>
  );
};

export const useStoreRewards = () => {
  const context = useContext(StoreRewardsContext);
  if (!context) throw new Error('useStoreRewards must be used within a StoreRewardsProvider');
  return context;
};
