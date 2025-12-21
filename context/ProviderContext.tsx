
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Provider } from '../types';
import { supabase } from '../lib/supabase';

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
    isActive: true
  },
  {
    name: 'Shopee',
    type: 'ecommerce',
    category: 'Varejo',
    description: 'Ofertas incríveis e cupons de frete grátis todos os dias.',
    cashbackPercent: 5.0,
    revenueShareText: 'Ajude sua comunidade comprando na Shopee.',
    link: 'https://shopee.com.br',
    isActive: true
  },
  {
    name: 'Redoma Reformas',
    type: 'service',
    category: 'Manutenção',
    description: 'Serviços especializados de pintura e elétrica.',
    cashbackPercent: 5.0,
    revenueShareText: 'Serviço premium com benefício direto para a comunidade.',
    link: '#',
    isActive: true
  }
];

export const ProviderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      const { data } = await supabase.from('providers').select('*');
      
      if (data && data.length > 0) {
        setProviders(data);
      } else {
        // Seed if empty
        const { data: seeded } = await supabase.from('providers').insert(
          SEED_PROVIDERS.map(p => ({
            ...p,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))
        ).select();
        if (seeded) setProviders(seeded);
      }
    };

    fetchProviders();

    // Subscribe to provider changes
    const subscription = supabase
      .channel('providers_channel')
      .on('postgres_changes', { event: '*', table: 'providers' }, () => {
        // Refresh full list on any change for simplicity in admin CRUD
        supabase.from('providers').select('*').then(({ data }) => {
          if (data) setProviders(data);
        });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const addProvider = async (p: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newP = {
      ...p,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await supabase.from('providers').insert([newP]);
  };

  const updateProvider = async (id: string, p: Partial<Provider>) => {
    await supabase
      .from('providers')
      .update({ ...p, updatedAt: new Date().toISOString() })
      .eq('id', id);
  };

  const deleteProvider = async (id: string) => {
    await supabase.from('providers').delete().eq('id', id);
  };

  const toggleActive = async (id: string) => {
    const p = providers.find(item => item.id === id);
    if (p) {
      await updateProvider(id, { isActive: !p.isActive });
    }
  };

  const getActiveProviders = () => providers.filter(p => p.isActive);

  return (
    <ProviderContext.Provider value={{
      providers, addProvider, updateProvider, deleteProvider, toggleActive, getActiveProviders
    }}>
      {children}
    </ProviderContext.Provider>
  );
};

export const useProviders = () => {
  const context = useContext(ProviderContext);
  if (!context) throw new Error('useProviders must be used within a ProviderProvider');
  return context;
};
