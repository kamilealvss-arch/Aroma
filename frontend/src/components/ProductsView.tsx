import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle,
  EyeOff,
  Package,
  Info,
  Coffee,
  ArrowUpDown,
  X,
  AlertTriangle,
  ArrowDownCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import { Product } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import { ProductModal, DEFAULT_CATEGORIES } from './ProductModal.tsx';

const CUSTOM_CATEGORIES_KEY = 'aroma_custom_product_categories_v1';

interface ProductsViewProps {
  products: Product[];
  onCreateProduct: (data: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onSoftDeleteProduct: (id: string) => Promise<void>;
  onRestoreProduct: (id: string) => Promise<void>;
}

type ProductSortOption =
  | 'NAME_ASC'
  | 'PRICE_DESC'
  | 'PRICE_ASC'
  | 'MARGIN_DESC'
  | 'STOCK_ASC';

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onCreateProduct,
  onUpdateProduct,
  onSoftDeleteProduct,
  onRestoreProduct,
}) => {
  // Filtros e ordenação
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ativo' | 'inativo' | 'ALERTA'>('ALL');
  const [sortBy, setSortBy] = useState<ProductSortOption>('NAME_ASC');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(9);

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal de Confirmação de Exclusão Lógica (Desativação)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Categorias personalizadas salvas pelo usuário
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAddingCategoryTab, setIsAddingCategoryTab] = useState(false);
  const [newCategoryTabName, setNewCategoryTabName] = useState('');

  const handleCreateCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    setCustomCategories((prev) => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleConfirmCategoryTab = () => {
    const trimmed = newCategoryTabName.trim();
    if (!trimmed) return;
    handleCreateCategory(trimmed);
    setSelectedCategory(trimmed);
    setNewCategoryTabName('');
    setIsAddingCategoryTab(false);
  };

  // Resetar página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedStatus, sortBy, itemsPerPage, viewMode]);

  // Métricas e contadores
  const categories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category), ...customCategories])
  );
  const totalCount = products.length;
  const activeProducts = products.filter((p) => p.status === 'ativo');
  const activeCount = activeProducts.length;
  const inactiveCount = products.filter((p) => p.status === 'inativo').length;
  const alertStockCount = activeProducts.filter(
    (p) => p.stockQuantity <= p.minStockThreshold
  ).length;

  // Filtragem
  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategory === 'ALL' || p.category === selectedCategory;

    let matchesStatus = true;
    if (selectedStatus === 'ativo') matchesStatus = p.status === 'ativo';
    else if (selectedStatus === 'inativo') matchesStatus = p.status === 'inativo';
    else if (selectedStatus === 'ALERTA') {
      matchesStatus = p.status === 'ativo' && p.stockQuantity <= p.minStockThreshold;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Ordenação
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Manter ativos antes de inativos quando estiver em ALL, exceto se filtrado
    if (selectedStatus === 'ALL' && a.status !== b.status) {
      return a.status === 'ativo' ? -1 : 1;
    }
    if (sortBy === 'NAME_ASC') {
      return a.name.localeCompare(b.name, 'pt-BR');
    }
    if (sortBy === 'PRICE_DESC') {
      return b.price - a.price;
    }
    if (sortBy === 'PRICE_ASC') {
      return a.price - b.price;
    }
    if (sortBy === 'MARGIN_DESC') {
      const marginA = a.price > 0 ? (a.price - a.costPrice) / a.price : 0;
      const marginB = b.price > 0 ? (b.price - b.costPrice) / b.price : 0;
      return marginB - marginA;
    }
    if (sortBy === 'STOCK_ASC') {
      return a.stockQuantity - b.stockQuantity;
    }
    return 0;
  });

  // Paginação
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, sortedProducts.length);
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  const hasActiveFilters =
    search !== '' ||
    selectedCategory !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    sortBy !== 'NAME_ASC';

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSortBy('NAME_ASC');
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (data: Partial<Product>) => {
    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, data);
    } else {
      await onCreateProduct(data);
    }
  };

  const handleConfirmSoftDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await onSoftDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-5 text-[#35312F]"
      style={{ zoom: 1.05 }}
    >
      {/* 1. Cabeçalho da Página: Minimalista, Elegante e Profissional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-100">
        <div className="space-y-0.5">
          {/* Breadcrumb Discreto */}
          <nav className="flex items-center space-x-1.5 text-xs text-stone-400 font-medium">
            <span className="hover:text-[#35312F] transition">Cardápio</span>
            <span>/</span>
            <span className="text-[#850D2C] font-semibold">
              {selectedCategory === 'ALL' ? 'Catálogo de Produtos' : selectedCategory}
            </span>
          </nav>

          {/* Título com Fonte Amarego da Identidade */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            <h1
              className="text-2xl sm:text-3xl font-normal text-[#35312F] tracking-tight"
              style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
            >
              Catálogo de Produtos
            </h1>
          </div>

          {/* Subtítulo Curto */}
          <p className="text-xs text-stone-500">
            Gerencie itens do cardápio digital, preços, margens de lucro e disponibilidade com preservação de histórico.
          </p>
        </div>

        {/* Botão Principal "Cadastrar Produto" em Vinho Escuro (#850D2C) */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 h-8.5 px-4 rounded-full text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] shadow-xs transition cursor-pointer"
            title="Adicionar novo produto ao cardápio"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Cadastrar produto</span>
          </button>
        </div>
      </div>

      {/* 2. Abas de Categorias Refinadas (Mesmo padrão de Abas de Estoque e Analytics) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 pb-0.5">
        <div className="inline-flex flex-wrap p-1 bg-stone-100/90 rounded-2xl border border-stone-200/80 gap-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition duration-150 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F] hover:bg-white/60'
            }`}
          >
            <Coffee
              className={`w-3.5 h-3.5 shrink-0 ${
                selectedCategory === 'ALL' ? 'text-white' : 'text-stone-400'
              }`}
            />
            <span>Todas</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold leading-none transition ${
                selectedCategory === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-200/80 text-stone-600'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#850D2C] text-white shadow-2xs'
                    : 'text-stone-600 hover:text-[#35312F] hover:bg-white/60'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none transition ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-200/80 text-stone-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Botão / Input para Criar Nova Categoria diretamente na barra */}
          {!isAddingCategoryTab ? (
            <button
              type="button"
              onClick={() => setIsAddingCategoryTab(true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#850D2C] hover:bg-white/70 transition cursor-pointer"
              title="Criar uma nova categoria de produtos"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova categoria</span>
            </button>
          ) : (
            <div className="inline-flex items-center space-x-1 pl-1.5 pr-1 py-0.5 bg-white rounded-xl border border-[#850D2C]/40 shadow-2xs">
              <input
                type="text"
                autoFocus
                value={newCategoryTabName}
                onChange={(e) => setNewCategoryTabName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmCategoryTab();
                  } else if (e.key === 'Escape') {
                    setIsAddingCategoryTab(false);
                    setNewCategoryTabName('');
                  }
                }}
                placeholder="Nome da categoria..."
                className="w-32 px-1.5 py-1 text-xs text-[#35312F] placeholder-stone-400 focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={handleConfirmCategoryTab}
                disabled={!newCategoryTabName.trim()}
                className="p-1 rounded-lg bg-[#850D2C] text-white hover:bg-[#6e0a24] disabled:opacity-40 transition cursor-pointer"
                title="Confirmar nova categoria"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategoryTab(false);
                  setNewCategoryTabName('');
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                title="Cancelar"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Alternador de Visualização: Grade vs Tabela */}
        <div className="inline-flex p-1 bg-stone-100/90 rounded-xl border border-stone-200/80">
          <button
            type="button"
            onClick={() => setViewMode('GRID')}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'GRID'
                ? 'bg-white text-[#35312F] shadow-2xs'
                : 'text-stone-500 hover:text-[#35312F]'
            }`}
            title="Visualização em cards com fotos"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grade</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-white text-[#35312F] shadow-2xs'
                : 'text-stone-500 hover:text-[#35312F]'
            }`}
            title="Visualização em lista compacta"
          >
            <List className="w-3.5 h-3.5" />
            <span>Lista</span>
          </button>
        </div>
      </div>

      {/* 3. Barra de Filtros: Dimensões Padronizadas (h-8), Chips Compactos e Busca */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 pt-0.5">
        {/* Lado Esquerdo: Chips de Status Compactos */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedStatus('ALL')}
            className={`h-8 px-3 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer ${
              selectedStatus === 'ALL'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>Todos</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                selectedStatus === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-200/70 text-stone-600'
              }`}
            >
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('ativo')}
            className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
              selectedStatus === 'ativo'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>No Cardápio</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                selectedStatus === 'ativo'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#858F6D]/20 text-[#4c543c]'
              }`}
            >
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('inativo')}
            className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
              selectedStatus === 'inativo'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>Inativos</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                selectedStatus === 'inativo'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100/70 text-[#850D2C]'
              }`}
            >
              {inactiveCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('ALERTA')}
            className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
              selectedStatus === 'ALERTA'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>Estoque Baixo / Esgotado</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                selectedStatus === 'ALERTA'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100/70 text-[#924529]'
              }`}
            >
              {alertStockCount}
            </span>
          </button>
        </div>

        {/* Lado Direito: Ordenação, Pesquisa Compacta e Botão Limpar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ProductSortOption)}
              className="h-8 rounded-full border border-stone-200 pl-7 pr-7 text-xs bg-stone-50 text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition appearance-none cursor-pointer"
              title="Critério de ordenação dos produtos"
            >
              <option value="NAME_ASC">Nome (A - Z)</option>
              <option value="PRICE_DESC">Maior preço 1º</option>
              <option value="PRICE_ASC">Menor preço 1º</option>
              <option value="MARGIN_DESC">Maior margem 1º</option>
              <option value="STOCK_ASC">Menor estoque 1º</option>
            </select>
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
              <ArrowUpDown className="w-3 h-3" />
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar produto ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs rounded-full border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:bg-white focus:outline-none transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center space-x-1 h-8 px-2.5 text-xs text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition shrink-0 cursor-pointer"
              title="Restaurar visualização padrão"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Listagem de Produtos: Modo Grade (Cards) ou Modo Lista (Tabela) */}
      {paginatedProducts.length === 0 ? (
        <div className="rounded-2xl border border-stone-200/80 bg-[#F9F7F3]/50 py-14 px-4 text-center">
          <Package className="w-9 h-9 text-stone-300 mx-auto mb-2.5" />
          <h3 className="font-semibold text-[#35312F] text-sm">
            Nenhum produto encontrado
          </h3>
          <p className="text-xs text-stone-400 mt-0.5 max-w-sm mx-auto">
            Tente ajustar os termos de busca, mudar os filtros selecionados ou cadastrar um novo item.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#850D2C] bg-rose-50 border border-[#850D2C]/20 hover:bg-rose-100 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar todos os filtros</span>
            </button>
          )}
        </div>
      ) : viewMode === 'GRID' ? (
        /* ======================= VISUALIZAÇÃO EM GRADE (CARD RETANGULAR VERMELHO AROMA #820b28) ======================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProducts.map((product) => {
            const isInactive = product.status === 'inativo';
            const isOutOfStock = product.stockQuantity <= 0;
            const isLowStock =
              product.stockQuantity > 0 &&
              product.stockQuantity <= product.minStockThreshold;
            const profit = Math.max(0, product.price - product.costPrice);
            const marginPercent =
              product.price > 0
                ? Math.round(((product.price - product.costPrice) / product.price) * 100)
                : 0;
            const isTransparentCutout =
              product.imageUrl.startsWith('data:image/png') ||
              product.imageUrl.startsWith('data:image/webp');

            return (
              <div
                key={product.id}
                className={`bg-[#820b28] rounded-[28px] p-3.5 sm:p-4 border border-[#680920] shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between text-white group min-h-[460px] ${
                  isInactive ? 'opacity-75 grayscale-30' : ''
                }`}
              >
                {/* 1. Moldura Retangular de Imagem com Preço no Canto Superior Direito (Idêntico ao 10$) */}
                <div className="relative h-60 w-full rounded-[22px] overflow-hidden bg-[#F9F7F3] flex flex-col justify-between shadow-inner">
                  {/* Categoria Badge no topo esquerdo da foto */}
                  <div className="p-3 z-10 flex items-center justify-between">
                    <span className="bg-stone-900/75 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-2xs">
                      {product.category}
                    </span>
                    {isInactive && (
                      <span className="bg-stone-800 text-stone-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>

                  {/* Valor em Cima no Canto Superior Direito (Idêntico à Imagem de Referência) */}
                  <div className="absolute top-0 right-0 z-20 bg-[#820b28] text-white pl-4 pr-3.5 pt-1.5 pb-2 rounded-bl-[20px] flex items-center justify-center shadow-xs">
                    <span className="text-sm sm:text-base font-black tracking-tight">
                      {formatCurrencyBRL(product.price)}
                    </span>
                  </div>

                  {/* Imagem Centralizada com Escala e Proporção Padronizadas */}
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    {isTransparentCutout ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className={`w-44 h-44 object-contain drop-shadow-[0_14px_18px_rgba(53,49,47,0.22)] transition duration-500 group-hover:scale-105 ${
                          isInactive ? 'grayscale-60' : ''
                        }`}
                      />
                    ) : (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className={`w-full h-full object-cover transition duration-500 group-hover:scale-105 ${
                          isInactive ? 'grayscale-60' : ''
                        }`}
                      />
                    )}
                  </div>

                  {/* Faixa Inferior da Moldura com Status e Estoque */}
                  <div
                    className={`w-full py-1.5 px-3 text-center text-[10px] font-bold tracking-wider uppercase z-10 transition ${
                      isInactive
                        ? 'bg-stone-800/90 text-stone-300'
                        : isOutOfStock
                        ? 'bg-[#58071c]/95 text-rose-200'
                        : isLowStock
                        ? 'bg-[#924529]/95 text-amber-200'
                        : 'bg-black/45 backdrop-blur-xs text-white'
                    }`}
                  >
                    {isInactive
                      ? `Inativo • Estoque: ${product.stockQuantity} un.`
                      : isOutOfStock
                      ? 'Esgotado • 0 un. disponíveis'
                      : isLowStock
                      ? `Repor • Restam ${product.stockQuantity} un. (mín. ${product.minStockThreshold})`
                      : `No Cardápio • ${product.stockQuantity} un. disponíveis`}
                  </div>
                </div>

                {/* 2. Informações Inferiores (Nome, Ações "Editar ↗" e Pílulas de Ingredientes/Métricas) */}
                <div className="pt-3 pb-1 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    {/* Linha com Nome do Produto e Link de Ação (Estilo "Order Now ↗") */}
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-extrabold text-white text-base leading-tight truncate">
                        {product.name}
                      </h3>

                      <div className="flex items-center space-x-2 shrink-0">
                        {isInactive ? (
                          <button
                            type="button"
                            onClick={() => onRestoreProduct(product.id)}
                            className="inline-flex items-center space-x-0.5 text-xs font-bold text-emerald-300 hover:text-white underline underline-offset-4 transition cursor-pointer"
                            title="Reativar produto no cardápio"
                          >
                            <span>Reativar</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(product)}
                              className="inline-flex items-center space-x-0.5 text-xs font-bold text-white hover:text-amber-200 underline underline-offset-4 transition cursor-pointer"
                              title="Editar preço, foto ou parâmetros do produto"
                            >
                              <span>Editar</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="text-[10px] font-medium text-white/60 hover:text-rose-200 transition cursor-pointer"
                              title="Desativar do cardápio"
                            >
                              Desativar
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-white/75 mt-1 line-clamp-1 leading-relaxed">
                      {product.description || 'Preparo artesanal com insumos selecionados.'}
                    </p>
                  </div>

                  {/* Pílulas Inferiores com Métricas (Idêntico aos chips [Matcha] [Ice Cubes] da imagem) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-white/15 text-white text-[10px] font-semibold">
                      {product.category}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                        isOutOfStock
                          ? 'bg-rose-950/60 text-rose-200 border border-rose-500/30'
                          : isLowStock
                          ? 'bg-amber-950/60 text-amber-200 border border-amber-500/30'
                          : 'bg-white/15 text-white'
                      }`}
                    >
                      Estoque: {product.stockQuantity} un.
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/15 text-white/90 text-[10px] font-semibold">
                      Custo: {formatCurrencyBRL(product.costPrice)}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-400/20 text-emerald-200 text-[10px] font-semibold">
                      Margem: {marginPercent}% ({formatCurrencyBRL(profit)})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================= VISUALIZAÇÃO EM LISTA (TABELA PADRONIZADA) ======================= */
        <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-semibold text-stone-600">Produto</th>
                  <th className="py-3 px-4 font-semibold text-stone-600">Categoria</th>
                  <th className="py-3 px-4 font-semibold text-stone-600">Preço Venda</th>
                  <th className="py-3 px-4 font-semibold text-stone-600">Custo / Margem</th>
                  <th className="py-3 px-4 font-semibold text-stone-600">Estoque</th>
                  <th className="py-3 px-4 font-semibold text-stone-600">Status</th>
                  <th className="py-3 px-4 text-right font-semibold text-stone-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {paginatedProducts.map((product) => {
                  const isInactive = product.status === 'inativo';
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock =
                    product.stockQuantity > 0 &&
                    product.stockQuantity <= product.minStockThreshold;
                  const marginPercent =
                    product.price > 0
                      ? Math.round(((product.price - product.costPrice) / product.price) * 100)
                      : 0;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors duration-150 hover:bg-[#F9F7F3]/70 ${
                        isInactive ? 'opacity-70 bg-stone-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 align-middle">
                        <div className="flex items-center space-x-3">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className={`w-9 h-9 rounded-xl object-cover shrink-0 border border-stone-200/80 shadow-2xs ${
                              isInactive ? 'grayscale-60' : ''
                            }`}
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-[#35312F] block text-xs truncate max-w-[220px]">
                              {product.name}
                            </span>
                            <span className="text-[11px] text-stone-400 font-normal block truncate max-w-[240px]">
                              {product.description}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 align-middle">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">
                          {product.category}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 align-middle font-bold text-[#850D2C] text-xs">
                        {formatCurrencyBRL(product.price)}
                      </td>

                      <td className="py-2.5 px-4 align-middle">
                        <div className="text-xs text-stone-600">
                          {formatCurrencyBRL(product.costPrice)}{' '}
                          <span className="text-[10px] font-semibold text-[#4c543c] bg-[#858F6D]/15 px-1.5 py-0.2 rounded-full ml-1">
                            {marginPercent}%
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-4 align-middle">
                        <span
                          className={`font-semibold text-xs ${
                            isOutOfStock
                              ? 'text-[#850D2C]'
                              : isLowStock
                              ? 'text-[#924529]'
                              : 'text-[#35312F]'
                          }`}
                        >
                          {product.stockQuantity} un.
                        </span>
                      </td>

                      <td className="py-2.5 px-4 align-middle">
                        {isInactive ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-[#850D2C] border border-[#850D2C]/20">
                            <EyeOff className="w-3 h-3 text-[#850D2C]" />
                            <span>Inativo</span>
                          </span>
                        ) : isOutOfStock ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-[#850D2C] border border-[#850D2C]/20">
                            <ArrowDownCircle className="w-3 h-3 text-[#850D2C]" />
                            <span>Esgotado</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-[#924529] border border-[#924529]/20">
                            <AlertTriangle className="w-3 h-3 text-[#924529]" />
                            <span>Repor</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#858F6D]/10 text-[#4c543c] border border-[#858F6D]/20">
                            <CheckCircle className="w-3 h-3 text-[#858F6D]" />
                            <span>Ativo</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-right align-middle">
                        {isInactive ? (
                          <button
                            type="button"
                            onClick={() => onRestoreProduct(product.id)}
                            className="inline-flex items-center space-x-1 h-7 px-2.5 bg-[#858F6D] hover:bg-[#6e7759] text-white rounded-lg text-xs font-medium transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reativar</span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(product)}
                              className="h-7 px-2.5 bg-white hover:bg-stone-50 text-[#35312F] rounded-lg text-xs font-medium border border-stone-200 transition inline-flex items-center space-x-1 shadow-2xs cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3 text-[#924529]" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              className="h-7 px-2 bg-white hover:bg-rose-50 text-stone-400 hover:text-[#850D2C] rounded-lg text-xs border border-stone-200 transition cursor-pointer"
                              title="Desativar produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Rodapé com Paginação e Seletor de Quantidade por Página (Idêntico ao Estoque) */}
      <div className="p-3 bg-[#F9F7F3] rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-stone-500 px-4">
        <div>
          <span>
            Exibindo{' '}
            <strong className="text-[#35312F] font-semibold">
              {sortedProducts.length === 0 ? 0 : startIndex + 1}–{endIndex}
            </strong>{' '}
            de <strong className="text-[#35312F] font-semibold">{sortedProducts.length}</strong> produtos
            {filteredProducts.length !== totalCount && (
              <span className="text-stone-400"> (filtrados de {totalCount})</span>
            )}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-stone-500">
            <span className="text-[11px]">Itens:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="h-7 rounded-lg border border-stone-200 bg-white px-2 text-xs text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none cursor-pointer"
              title="Quantidade de produtos por página"
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-7 w-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= safePage - 1 && pageNum <= safePage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      safePage === pageNum
                        ? 'bg-[#850D2C] text-white shadow-2xs'
                        : 'bg-white hover:bg-stone-50 border border-stone-200 text-stone-600'
                    }`}
                    title={`Ir para página ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                );
              }
              if (pageNum === safePage - 2 || pageNum === safePage + 2) {
                return (
                  <span key={pageNum} className="px-1 text-stone-400">
                    ...
                  </span>
                );
              }
              return null;
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="h-7 w-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Próxima página"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={editingProduct}
        categories={categories}
        onCreateCategory={handleCreateCategory}
      />

      {/* Modal de Confirmação: Exclusão Lógica (Desativação Segura) */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-[#850D2C]/10 text-[#850D2C] flex items-center justify-center shrink-0 border border-[#850D2C]/20">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#35312F]">
                  Desativar produto do cardápio?
                </h3>
                <span className="text-xs text-stone-400">
                  Exclusão lógica com preservação de histórico
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-3 p-2.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <img
                src={productToDelete.imageUrl}
                alt={productToDelete.name}
                className="w-11 h-11 rounded-xl object-cover border border-stone-200 shrink-0"
              />
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#35312F] block truncate">
                  {productToDelete.name}
                </span>
                <span className="text-[11px] text-stone-500">
                  {productToDelete.category} • {formatCurrencyBRL(productToDelete.price)}
                </span>
              </div>
            </div>

            <div className="mt-3.5 p-3 bg-[#F9F7F3] border border-stone-200/80 rounded-xl space-y-1 text-[11px] text-stone-600">
              <div className="flex items-center space-x-1.5 font-semibold text-[#35312F]">
                <Info className="w-3.5 h-3.5 text-[#850D2C]" />
                <span>Preservação de integridade dos dados:</span>
              </div>
              <p className="leading-relaxed">
                O item terá seu status alterado para <strong>inativo</strong>, deixando de aparecer no cardápio do cliente sem apagar registros de pedidos e relatórios financeiros anteriores.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-[#35312F] rounded-xl hover:bg-stone-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Desativando...' : 'Confirmar Desativação'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
