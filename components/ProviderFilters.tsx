
import React from 'react';
import { Search, Filter } from 'lucide-react';

interface ProviderFiltersProps {
  search: string;
  setSearch: (s: string) => void;
  category: string;
  setCategory: (c: string) => void;
  categories: string[];
}

const ProviderFilters: React.FC<ProviderFiltersProps> = ({ search, setSearch, category, setCategory, categories }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar fornecedor ou serviço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none transition-all text-sm bg-white"
        />
      </div>
      
      <div className="flex gap-2">
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="pl-10 pr-8 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-redoma-steel focus:outline-none transition-all text-sm bg-white appearance-none min-w-[160px]"
          >
            <option value="all">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ProviderFilters;
