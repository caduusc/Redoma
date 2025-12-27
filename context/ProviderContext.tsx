import React, { createContext, useContext, useState, useEffect } from 'react';
import { Provider } from '../types';
import { supabaseMaster } from '../lib/supabase';

interface ProviderContextType {
  providers: Provider[];
  addProvider: (provider: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProvider: (id: string, provider: Partial<Provider>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  getActiveProviders: () => Provider[];
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

const SEED_PROVIDERS: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Mercado Livre',
    type: 'ecommerce',
    category: 'Varejo',
    description: 'Tudo o que você precisa com entrega rápida e segura.',
    cashbackPercent: 5.0,
    revenueShareText: 'Parte do valor retorna para o fundo da sua comunidade.',
    link: 'https://www.mercadolivre.com.br',
    logo_url: null,
    isActive: true,
  },
  {
    name: 'Shopee',
    type: 'ecommerce',
    category: 'Varejo',
    description: 'Ofertas incríveis e cupons de frete grátis todos os dias.',
    cashbackPercent: 5.0,
    revenueShareText: 'Ajude sua comunidade comprando na Shopee.',
    link: 'https://shopee.com.br',
    logo_url: null,
    isActive: true,
  },
  {
    name: 'Redoma Reformas',
    type: 'service',
    category: 'Manutenção',
    description: 'Serviços especializados de pintura e elétrica.',
    cashbackPercent: 5.0,
    revenueShareText: 'Serviço premium com benefício direto para a comunidade.',
    link: '#',
    logo_url: null,
    isActive: true,
  },
];

export const ProviderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    let subscription: any;

    const fetchProviders = async () => {
      const { data, error } = await supabaseMaster.from('providers').select('*');

      if (error) {
        console.error('[ProviderContext fetch providers]', error);
        return;
      }

      if (data && data.length > 0) {
        setProviders(data as Provider[]);
        return;
      }

      // Seed se tabela estiver vazia
      const { data: seeded, error: seedErr } = await supabaseMaster
        .from('providers')
        .insert(
          SEED_PROVIDERS.map((p) => ({
            ...p,
            id:
              typeof crypto !== 'undefined' &&
              'randomUUID' in crypto &&
              crypto.randomUUID()
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2, 11),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        )
        .select();

      if (seedErr) {
        console.error('[ProviderContext seed providers]', seedErr);
        return;
      }

      if (seeded) setProviders(seeded as Provider[]);
    };

    fetchProviders();

    // Realtime: qualquer mudança em providers -> refetch
    subscription = supabaseMaster
      .channel('providers_channel')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'providers' },
        async () => {
          const { data, error } = await supabaseMaster.from('providers').select('*');
          if (!error && data) setProviders(data as Provider[]);
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const addProvider = async (p: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newP: Provider = {
      ...p,
      id:
        typeof crypto !== 'undefined' &&
        'randomUUID' in crypto &&
        crypto.randomUUID()
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabaseMaster.from('providers').insert([newP]);
    if (error) console.error('[ProviderContext addProvider]', error);
  };

  const updateProvider = async (id: string, p: Partial<Provider>) => {
    const { error } = await supabaseMaster
      .from('providers')
      .update({ ...p, updatedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error('[ProviderContext updateProvider]', error);
  };

  const deleteProvider = async (id: string) => {
    const { error } = await supabaseMaster.from('providers').delete().eq('id', id);
    if (error) console.error('[ProviderContext deleteProvider]', error);
  };

  const toggleActive = async (id: string) => {
    const p = providers.find((item) => item.id === id);
    if (p) {
      await updateProvider(id, { isActive: !p.isActive });
    }
  };

  const getActiveProviders = () => providers.filter((p) => p.isActive);

  return (
    <ProviderContext.Provider
      value={{ providers, addProvider, updateProvider, deleteProvider, toggleActive, getActiveProviders }}
    >
      {children}
    </ProviderContext.Provider>
  );
};

export const useProviders = () => {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProviders must be used within a ProviderProvider');
  }
  return context;
};
