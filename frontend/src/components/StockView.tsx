import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  ArrowDownCircle,
  Sliders,
  Filter,
  X,
  RotateCcw,
  ArrowUpDown,
  Plus,
  Minus,
  AlertCircle,
  Clock,
  Coffee,
  Boxes,
  Scale,
  Wheat,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Product, StockAlert, Ingredient, IngredientCategory, IngredientUnit } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import { IngredientsBasketIcon } from './icons/IngredientsBasketIcon.tsx';

interface StockViewProps {
  products: Product[];
  ingredients?: Ingredient[];
  alerts: StockAlert[];
  onAdjustStock: (productId: string, newStock: number, reason?: string) => Promise<void>;
  onAdjustIngredientStock?: (ingredientId: string, newStock: number, reason?: string) => Promise<void>;
  onCreateIngredient?: (data: Omit<Ingredient, 'id' | 'updatedAt'>) => Promise<void | Ingredient>;
  onRefresh: () => void;
}

type SortOption = 'CRITICALITY' | 'NAME_ASC' | 'STOCK_ASC' | 'STOCK_DESC';

export const StockView: React.FC<StockViewProps> = ({
  products,
  ingredients = [],
  alerts,
  onAdjustStock,
  onAdjustIngredientStock,
  onCreateIngredient,
  onRefresh,
}) => {
  // Controle de Aba Ativa: Cardápio vs Insumos
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'INGREDIENTS'>('PRODUCTS');

  // ================= ESTADOS DO ESTOQUE DE PRODUTOS =================
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ESGOTADO' | 'BAIXO' | 'NORMAL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('CRITICALITY');
  const [productPage, setProductPage] = useState<number>(1);
  const [productPerPage, setProductPerPage] = useState<number>(8);

  // Modal de Ajuste Manual de Produtos
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Reposição de fornecedor');
  const [isSaving, setIsSaving] = useState(false);

  // Modal de Confirmação Segura para Zerar Produto
  const [productToZero, setProductToZero] = useState<Product | null>(null);
  const [isZeroing, setIsZeroing] = useState(false);
  const [restockedProductId, setRestockedProductId] = useState<string | null>(null);

  // ================= ESTADOS DO ESTOQUE DE INGREDIENTES =================
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [ingredientFilter, setIngredientFilter] = useState<'ALL' | 'ESGOTADO' | 'BAIXO' | 'NORMAL'>('ALL');
  const [selectedIngredientCategory, setSelectedIngredientCategory] = useState<string>('ALL');
  const [ingredientSortBy, setIngredientSortBy] = useState<SortOption>('CRITICALITY');
  const [ingredientPage, setIngredientPage] = useState<number>(1);
  const [ingredientPerPage, setIngredientPerPage] = useState<number>(8);

  // Modal de Ajuste Manual de Ingredientes
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [newIngredientStock, setNewIngredientStock] = useState<number>(0);
  const [ingredientAdjustReason, setIngredientAdjustReason] = useState<string>('Compra de fornecedor');
  const [isSavingIngredient, setIsSavingIngredient] = useState(false);
  const [restockedIngredientId, setRestockedIngredientId] = useState<string | null>(null);

  // Modal de Cadastro de Novo Ingrediente / Insumo
  const [isCreateIngredientOpen, setIsCreateIngredientOpen] = useState(false);
  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState<IngredientCategory>('Grãos & Pós');
  const [newIngUnit, setNewIngUnit] = useState<IngredientUnit>('kg');
  const [newIngStock, setNewIngStock] = useState<string>('10');
  const [newIngMinStock, setNewIngMinStock] = useState<string>('5');
  const [newIngCost, setNewIngCost] = useState<string>('0');
  const [newIngSupplier, setNewIngSupplier] = useState('');
  const [isCreatingIngredient, setIsCreatingIngredient] = useState(false);
  const [createIngredientError, setCreateIngredientError] = useState<string | null>(null);

  // Estados gerais visuais
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  });

  // Resetar páginas ao alterar filtros de produtos
  useEffect(() => {
    setProductPage(1);
  }, [search, filter, selectedCategory, sortBy, productPerPage]);

  // Resetar páginas ao alterar filtros de ingredientes
  useEffect(() => {
    setIngredientPage(1);
  }, [ingredientSearch, ingredientFilter, selectedIngredientCategory, ingredientSortBy, ingredientPerPage]);

  // ================= DADOS E CÁLCULOS: PRODUTOS =================
  const activeProducts = products.filter((p) => p.status === 'ativo');
  const categories = Array.from(new Set(activeProducts.map((p) => p.category)));

  const totalActive = activeProducts.length;
  const lowStockCount = activeProducts.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold
  ).length;
  const outOfStockCount = activeProducts.filter((p) => p.stockQuantity <= 0).length;
  const normalStockCount = activeProducts.filter(
    (p) => p.stockQuantity > p.minStockThreshold
  ).length;

  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || p.category === selectedCategory;

    const isOutOfStock = p.stockQuantity <= 0;
    const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold;
    const isNormal = p.stockQuantity > p.minStockThreshold;

    let matchesStatus = true;
    if (filter === 'ESGOTADO') matchesStatus = isOutOfStock;
    else if (filter === 'BAIXO') matchesStatus = isLow;
    else if (filter === 'NORMAL') matchesStatus = isNormal;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'CRITICALITY') {
      const getPriority = (p: Product) => {
        if (p.stockQuantity <= 0) return 1;
        if (p.stockQuantity <= p.minStockThreshold) return 2;
        return 3;
      };
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return (
        a.stockQuantity / Math.max(a.minStockThreshold, 1) -
        b.stockQuantity / Math.max(b.minStockThreshold, 1)
      );
    }
    if (sortBy === 'NAME_ASC') {
      return a.name.localeCompare(b.name, 'pt-BR');
    }
    if (sortBy === 'STOCK_ASC') {
      return a.stockQuantity - b.stockQuantity;
    }
    if (sortBy === 'STOCK_DESC') {
      return b.stockQuantity - a.stockQuantity;
    }
    return 0;
  });

  // Paginação de Produtos
  const totalProductPages = Math.max(1, Math.ceil(sortedProducts.length / productPerPage));
  const safeProductPage = Math.min(productPage, totalProductPages);
  const productStartIndex = (safeProductPage - 1) * productPerPage;
  const productEndIndex = Math.min(productStartIndex + productPerPage, sortedProducts.length);
  const paginatedProducts = sortedProducts.slice(productStartIndex, productEndIndex);

  const hasActiveProductFilters =
    search !== '' || selectedCategory !== 'ALL' || filter !== 'ALL' || sortBy !== 'CRITICALITY';

  const handleClearProductFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setFilter('ALL');
    setSortBy('CRITICALITY');
  };

  // ================= DADOS E CÁLCULOS: INGREDIENTES =================
  const ingredientCategories = Array.from(new Set(ingredients.map((i) => i.category)));
  const totalIngredients = ingredients.length;
  const lowStockIngredients = ingredients.filter(
    (i) => i.currentStock > 0 && i.currentStock <= i.minStockThreshold
  ).length;
  const outOfStockIngredients = ingredients.filter((i) => i.currentStock <= 0).length;
  const normalStockIngredients = ingredients.filter(
    (i) => i.currentStock > i.minStockThreshold
  ).length;

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch =
      ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()) ||
      ing.category.toLowerCase().includes(ingredientSearch.toLowerCase()) ||
      (ing.supplier && ing.supplier.toLowerCase().includes(ingredientSearch.toLowerCase()));
    const matchesCategory =
      selectedIngredientCategory === 'ALL' || ing.category === selectedIngredientCategory;

    const isOutOfStock = ing.currentStock <= 0;
    const isLow = ing.currentStock > 0 && ing.currentStock <= ing.minStockThreshold;
    const isNormal = ing.currentStock > ing.minStockThreshold;

    let matchesStatus = true;
    if (ingredientFilter === 'ESGOTADO') matchesStatus = isOutOfStock;
    else if (ingredientFilter === 'BAIXO') matchesStatus = isLow;
    else if (ingredientFilter === 'NORMAL') matchesStatus = isNormal;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const sortedIngredients = [...filteredIngredients].sort((a, b) => {
    if (ingredientSortBy === 'CRITICALITY') {
      const getPriority = (i: Ingredient) => {
        if (i.currentStock <= 0) return 1;
        if (i.currentStock <= i.minStockThreshold) return 2;
        return 3;
      };
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return (
        a.currentStock / Math.max(a.minStockThreshold, 1) -
        b.currentStock / Math.max(b.minStockThreshold, 1)
      );
    }
    if (ingredientSortBy === 'NAME_ASC') {
      return a.name.localeCompare(b.name, 'pt-BR');
    }
    if (ingredientSortBy === 'STOCK_ASC') {
      return a.currentStock - b.currentStock;
    }
    if (ingredientSortBy === 'STOCK_DESC') {
      return b.currentStock - a.currentStock;
    }
    return 0;
  });

  // Paginação de Ingredientes
  const totalIngredientPages = Math.max(1, Math.ceil(sortedIngredients.length / ingredientPerPage));
  const safeIngredientPage = Math.min(ingredientPage, totalIngredientPages);
  const ingredientStartIndex = (safeIngredientPage - 1) * ingredientPerPage;
  const ingredientEndIndex = Math.min(ingredientStartIndex + ingredientPerPage, sortedIngredients.length);
  const paginatedIngredients = sortedIngredients.slice(ingredientStartIndex, ingredientEndIndex);

  const hasActiveIngredientFilters =
    ingredientSearch !== '' ||
    selectedIngredientCategory !== 'ALL' ||
    ingredientFilter !== 'ALL' ||
    ingredientSortBy !== 'CRITICALITY';

  const handleClearIngredientFilters = () => {
    setIngredientSearch('');
    setSelectedIngredientCategory('ALL');
    setIngredientFilter('ALL');
    setIngredientSortBy('CRITICALITY');
  };

  // ================= AÇÕES COMUNS =================
  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Ações de Produtos
  const handleOpenAdjustModal = (product: Product, defaultAdd?: number) => {
    setSelectedProduct(product);
    setNewStockValue(defaultAdd ? product.stockQuantity + defaultAdd : product.stockQuantity);
    setAdjustReason(defaultAdd ? `Entrada de reposição de +${defaultAdd} unidades` : 'Contagem física de inventário');
  };

  const handleSaveStock = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);
    try {
      await onAdjustStock(selectedProduct.id, newStockValue, adjustReason);
      setSelectedProduct(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdd = async (product: Product, qty: number) => {
    setRestockedProductId(product.id);
    try {
      await onAdjustStock(
        product.id,
        product.stockQuantity + qty,
        `Reposição rápida de balcão (+${qty} un.)`
      );
    } finally {
      setTimeout(() => setRestockedProductId(null), 1200);
    }
  };

  const handleConfirmZeroStock = async () => {
    if (!productToZero) return;
    setIsZeroing(true);
    try {
      await onAdjustStock(
        productToZero.id,
        0,
        'Zerar estoque para demonstração do produto Esgotado no cardápio do cliente (RF04)'
      );
      setProductToZero(null);
    } finally {
      setIsZeroing(false);
    }
  };

  // Ações de Ingredientes
  const handleOpenIngredientModal = (ing: Ingredient, defaultAdd?: number) => {
    setSelectedIngredient(ing);
    setNewIngredientStock(defaultAdd ? ing.currentStock + defaultAdd : ing.currentStock);
    setIngredientAdjustReason(defaultAdd ? `Entrada de reposição de +${defaultAdd} ${ing.unit}` : 'Contagem física de estoque de insumos');
  };

  const handleSaveIngredientStock = async () => {
    if (!selectedIngredient || !onAdjustIngredientStock) return;
    setIsSavingIngredient(true);
    try {
      await onAdjustIngredientStock(selectedIngredient.id, newIngredientStock, ingredientAdjustReason);
      setSelectedIngredient(null);
    } finally {
      setIsSavingIngredient(false);
    }
  };

  const handleQuickAddIngredient = async (ing: Ingredient, qty: number) => {
    if (!onAdjustIngredientStock) return;
    setRestockedIngredientId(ing.id);
    try {
      await onAdjustIngredientStock(
        ing.id,
        ing.currentStock + qty,
        `Entrada rápida de insumo (+${qty} ${ing.unit})`
      );
    } finally {
      setTimeout(() => setRestockedIngredientId(null), 1200);
    }
  };

  // Helper de formatação de estoque com unidade
  const formatIngredientQuantity = (qty: number, unit: string) => {
    if (unit === 'un') {
      return `${Math.round(qty)} un.`;
    }
    return `${qty.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}`;
  };

  const handleOpenCreateIngredient = () => {
    setNewIngName('');
    setNewIngCategory('Grãos & Pós');
    setNewIngUnit('kg');
    setNewIngStock('10');
    setNewIngMinStock('5');
    setNewIngCost('0');
    setNewIngSupplier('');
    setCreateIngredientError(null);
    setIsCreateIngredientOpen(true);
  };

  const handleSaveNewIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName.trim()) {
      setCreateIngredientError('Informe o nome do insumo ou matéria-prima.');
      return;
    }

    setIsCreatingIngredient(true);
    setCreateIngredientError(null);
    try {
      if (onCreateIngredient) {
        await onCreateIngredient({
          name: newIngName.trim(),
          category: newIngCategory,
          unit: newIngUnit,
          currentStock: Math.max(0, parseFloat(newIngStock) || 0),
          minStockThreshold: Math.max(0, parseFloat(newIngMinStock) || 0),
          costPerUnit: Math.max(0, parseFloat(newIngCost) || 0),
          supplier: newIngSupplier.trim() || undefined,
        });
      }
      setIsCreateIngredientOpen(false);
    } catch (err: any) {
      setCreateIngredientError(err.message || 'Erro ao cadastrar insumo');
    } finally {
      setIsCreatingIngredient(false);
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
            <span className="hover:text-[#35312F] transition">Estoque</span>
            <span>/</span>
            <span className="text-[#850D2C] font-semibold">
              {activeTab === 'PRODUCTS' ? 'Produtos do Cardápio' : 'Ingredientes & Insumos'}
            </span>
          </nav>

          {/* Título com Fonte Amarego da Identidade */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            <h1
              className="text-2xl sm:text-3xl font-normal text-[#35312F] tracking-tight"
              style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
            >
              Controle de Estoque
            </h1>
          </div>

          {/* Subtítulo Curto e Timestamp da Última Atualização */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            <span>
              {activeTab === 'PRODUCTS'
                ? 'Acompanhe seus produtos e gerencie suas reposições.'
                : 'Monitore matérias-primas essenciais, insumos de preparo e embalagens.'}
            </span>
            <span className="inline-flex items-center space-x-1 text-stone-400">
              <Clock className="w-3 h-3 text-stone-400" />
              <span>Última atualização: Hoje às {lastUpdatedTime}</span>
            </span>
          </div>
        </div>

        {/* Botão Principal "Atualizar estoque" em Vinho Escuro (#850D2C) com Estado de Loading */}
        <div className="self-start sm:self-center shrink-0">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="inline-flex items-center space-x-2 h-8.5 px-4 rounded-full text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] disabled:opacity-75 shadow-xs transition"
            title="Atualizar dados de estoque em tempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Atualizando...' : 'Atualizar estoque'}</span>
          </button>
        </div>
      </div>

      {/* 2. Abas de Navegação Refinadas: Vinho apenas para indicar a aba ativa */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 pb-0.5">
        <div className="inline-flex p-1 bg-stone-100/90 rounded-2xl border border-stone-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTS')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition duration-150 ${
              activeTab === 'PRODUCTS'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F] hover:bg-white/60'
            }`}
            title="Visualizar estoque de produtos do cardápio digital"
          >
            <Coffee className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'PRODUCTS' ? 'text-white' : 'text-stone-400'}`} />
            <span>Produtos do Cardápio</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold leading-none transition ${
                activeTab === 'PRODUCTS'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-200/80 text-stone-600'
              }`}
            >
              {totalActive}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INGREDIENTS')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition duration-150 ${
              activeTab === 'INGREDIENTS'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F] hover:bg-white/60'
            }`}
            title="Visualizar estoque de insumos e matérias-primas"
          >
            <IngredientsBasketIcon className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'INGREDIENTS' ? 'text-white' : 'text-stone-400'}`} />
            <span>Ingredientes & Insumos</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold leading-none transition ${
                activeTab === 'INGREDIENTS'
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-200/80 text-stone-600'
              }`}
            >
              {totalIngredients}
            </span>
          </button>
        </div>

        {activeTab === 'INGREDIENTS' ? (
          <button
            type="button"
            onClick={handleOpenCreateIngredient}
            className="inline-flex items-center space-x-1.5 h-8 px-4 rounded-full text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] shadow-xs transition active:scale-95"
            title="Cadastrar novo insumo ou matéria-prima"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Insumo</span>
          </button>
        ) : (
          <span className="text-xs text-stone-400 hidden sm:inline">
            Itens finais comercializados diretamente no cardápio
          </span>
        )}
      </div>

      {/* ======================= ABA 1: PRODUTOS DO CARDÁPIO ======================= */}
      {activeTab === 'PRODUCTS' && (
        <>
          {/* 1. Cards de Indicadores: Bordas Cinza-Claro Padronizadas, Altura Reduzida e Números em Destaque */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1: Itens Monitorados */}
            <div
              onClick={() => setFilter('ALL')}
              className={`cursor-pointer p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs group ${
                filter === 'ALL'
                  ? 'border-stone-400 ring-1 ring-stone-300'
                  : 'border-stone-200/80 hover:border-stone-400'
              }`}
              title="Filtrar todos os produtos monitorados"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-stone-600 border border-stone-200">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Itens monitorados</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                    Total
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {totalActive}{' '}
                  <span className="text-xs font-normal text-stone-400">produtos</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">
                Ativos e catalogados para venda direta
              </p>
            </div>

            {/* Card 2: Nível de Reposição */}
            <div
              onClick={() => setFilter('BAIXO')}
              className={`cursor-pointer p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs group ${
                filter === 'BAIXO'
                  ? 'border-stone-400 ring-1 ring-stone-300'
                  : 'border-stone-200/80 hover:border-stone-400'
              }`}
              title="Filtrar produtos no nível de reposição"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-[#924529] border border-stone-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Nível de reposição</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#924529] bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                    Atenção
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {lowStockCount}{' '}
                  <span className="text-xs font-normal text-stone-400">produtos</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">
                Abaixo ou no limite mínimo recomendado
              </p>
            </div>

            {/* Card 3: Esgotados no Cardápio (Borda Cinza-Claro Padronizada - Sem Borda Vermelha Excessiva) */}
            <div
              onClick={() => setFilter('ESGOTADO')}
              className={`cursor-pointer p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs group ${
                filter === 'ESGOTADO'
                  ? 'border-stone-400 ring-1 ring-stone-300'
                  : 'border-stone-200/80 hover:border-stone-400'
              }`}
              title="Filtrar produtos esgotados no cardápio"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-[#850D2C] border border-stone-200">
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Esgotados no cardápio</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#850D2C] bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                    Crítico
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {outOfStockCount}{' '}
                  <span className="text-xs font-normal text-stone-400">produtos</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">
                Bloqueados automaticamente para venda no cliente
              </p>
            </div>
          </div>

          {/* 3. Barra de Filtros: Perfeitamente Alinhada e Estruturada */}
          <div className="space-y-2.5 pt-0.5">
            {/* Linha 1: Chips de Status de Estoque */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`h-8 px-3 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                    filter === 'ALL'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                  }`}
                  title="Mostrar todos os produtos ativos"
                >
                  <span>Todos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      filter === 'ALL' ? 'bg-white/20 text-white' : 'bg-stone-200/70 text-stone-600'
                    }`}
                  >
                    {totalActive}
                  </span>
                </button>

                <button
                  onClick={() => setFilter('NORMAL')}
                  className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 whitespace-nowrap ${
                    filter === 'NORMAL'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                  }`}
                  title="Filtrar produtos com estoque normal"
                >
                  <span>Abastecidos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      filter === 'NORMAL' ? 'bg-white/20 text-white' : 'bg-stone-200/70 text-stone-600'
                    }`}
                  >
                    {normalStockCount}
                  </span>
                </button>

                <button
                  onClick={() => setFilter('BAIXO')}
                  className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 whitespace-nowrap ${
                    filter === 'BAIXO'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                  }`}
                  title="Filtrar produtos no nível de reposição"
                >
                  <span>Repor</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      filter === 'BAIXO' ? 'bg-white/20 text-white' : 'bg-amber-100/70 text-[#924529]'
                    }`}
                  >
                    {lowStockCount}
                  </span>
                </button>

                <button
                  onClick={() => setFilter('ESGOTADO')}
                  className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 whitespace-nowrap ${
                    filter === 'ESGOTADO'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                  }`}
                  title="Filtrar produtos esgotados no cardápio"
                >
                  <span>Esgotados</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      filter === 'ESGOTADO' ? 'bg-white/20 text-white' : 'bg-rose-100/70 text-[#850D2C]'
                    }`}
                  >
                    {outOfStockCount}
                  </span>
                </button>
              </div>

              {/* Botão Limpar Filtros Quando Ativo */}
              {hasActiveProductFilters && (
                <button
                  onClick={handleClearProductFilters}
                  className="inline-flex items-center space-x-1 h-8 px-2.5 text-xs text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition shrink-0"
                  title="Restaurar visualização padrão"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Limpar filtros</span>
                </button>
              )}
            </div>

            {/* Linha 2: Busca, Categoria e Ordenação Perfeitamente Alinhadas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar produto ou categoria..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 text-xs rounded-full border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:bg-white focus:outline-none transition"
                  title="Digite para pesquisar em tempo real"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Dropdown de Categorias */}
              <div className="relative shrink-0 sm:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-auto h-8 rounded-full border border-stone-200 pl-3 pr-7 text-xs bg-stone-50 text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition appearance-none cursor-pointer"
                  title="Filtrar por categoria de cardápio"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Filter className="w-3 h-3" />
                </div>
              </div>

              {/* Dropdown de Ordenação */}
              <div className="relative shrink-0 sm:w-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full sm:w-auto h-8 rounded-full border border-stone-200 pl-7 pr-7 text-xs bg-stone-50 text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition appearance-none cursor-pointer"
                  title="Critério de ordenação da tabela"
                >
                  <option value="CRITICALITY">Criticidade (Esgotados 1º)</option>
                  <option value="NAME_ASC">Nome (A - Z)</option>
                  <option value="STOCK_ASC">Menor estoque 1º</option>
                  <option value="STOCK_DESC">Maior estoque 1º</option>
                </select>
                <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Tabela de Produtos: Cabeçalho Bege Claro, Alinhamento Preciso e Hover Sutil */}
          <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4 font-semibold text-stone-600">Produto</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Categoria</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Estoque Atual</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Limite Mínimo</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Status</th>
                    <th className="py-3 px-4 text-center font-semibold text-stone-600">Reposição Rápida</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Ajuste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                        <p className="text-sm font-semibold text-[#35312F]">Nenhum produto encontrado</p>
                        <p className="text-xs text-stone-400 mt-0.5">Tente ajustar seus termos de pesquisa ou filtros selecionados.</p>
                        {hasActiveProductFilters && (
                          <button
                            onClick={handleClearProductFilters}
                            className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium text-[#850D2C] bg-rose-50 border border-[#850D2C]/20 hover:bg-rose-100 transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Limpar todos os filtros</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => {
                      const isOutOfStock = product.stockQuantity <= 0;
                      const isLow =
                        product.stockQuantity > 0 &&
                        product.stockQuantity <= product.minStockThreshold;

                      const targetScale = Math.max(product.minStockThreshold * 2.5, 20);
                      const stockPercent = Math.min(
                        100,
                        Math.max(0, Math.round((product.stockQuantity / targetScale) * 100))
                      );

                      const isRecentlyRestocked = restockedProductId === product.id;

                      return (
                        <tr
                          key={product.id}
                          className={`transition-colors duration-150 ${
                            isRecentlyRestocked
                              ? 'bg-stone-50'
                              : 'hover:bg-[#F9F7F3]/70'
                          }`}
                        >
                          {/* Produto: Miniatura + Nome + Preço */}
                          <td className="py-2.5 px-4 align-middle">
                            <div className="flex items-center space-x-3">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-9 h-9 rounded-xl object-cover shrink-0 border border-stone-200/80 shadow-2xs"
                                loading="lazy"
                              />
                              <div>
                                <span className="font-semibold text-[#35312F] block text-xs">
                                  {product.name}
                                </span>
                                <span className="text-[11px] text-stone-400 font-normal">
                                  Preço: {formatCurrencyBRL(product.price)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Categoria */}
                          <td className="py-2.5 px-4 text-stone-500 font-medium text-xs align-middle">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px]">
                              {product.category}
                            </span>
                          </td>

                          {/* Estoque Atual com Barra Mais Fina e Elegante (h-1) */}
                          <td className="py-2.5 px-4 align-middle">
                            <div className="space-y-1">
                              <span
                                className={`text-sm font-semibold block ${
                                  isOutOfStock
                                    ? 'text-[#850D2C]'
                                    : isLow
                                    ? 'text-[#924529]'
                                    : 'text-[#35312F]'
                                }`}
                              >
                                {product.stockQuantity}{' '}
                                <span className="text-xs font-normal text-stone-400">un.</span>
                              </span>

                              {/* Barra fina minimalista */}
                              <div className="w-24 h-1 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isOutOfStock
                                      ? 'w-0'
                                      : isLow
                                      ? 'bg-[#924529]'
                                      : 'bg-[#858F6D]'
                                  }`}
                                  style={{ width: `${isOutOfStock ? 0 : Math.max(stockPercent, 8)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Limite Mínimo */}
                          <td className="py-2.5 px-4 text-stone-500 font-normal text-xs align-middle">
                            {product.minStockThreshold}{' '}
                            <span className="text-[11px] text-stone-400">un.</span>
                          </td>

                          {/* Status: Badges Pequenos e Discretos */}
                          <td className="py-2.5 px-4 align-middle">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-[#850D2C] border border-[#850D2C]/20">
                                <ArrowDownCircle className="w-3 h-3 text-[#850D2C]" />
                                <span>Esgotado</span>
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-[#924529] border border-[#924529]/20">
                                <AlertTriangle className="w-3 h-3 text-[#924529]" />
                                <span>Repor</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#858F6D]/10 text-[#4c543c] border border-[#858F6D]/20">
                                <CheckCircle className="w-3 h-3 text-[#858F6D]" />
                                <span>Abastecido</span>
                              </span>
                            )}
                          </td>

                          {/* Reposição Rápida Padronizada */}
                          <td className="py-2.5 px-4 text-center align-middle whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => handleQuickAdd(product, 10)}
                                className="h-7 px-2.5 min-w-[44px] inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-stone-50 text-[#35312F] rounded-lg text-xs font-medium border border-stone-200 transition active:scale-95 shadow-2xs leading-none"
                                title="Adicionar +10 unidades ao estoque físico"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => handleQuickAdd(product, 25)}
                                className="h-7 px-2.5 min-w-[44px] inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-stone-50 text-[#35312F] rounded-lg text-xs font-medium border border-stone-200 transition active:scale-95 shadow-2xs leading-none"
                                title="Adicionar +25 unidades ao estoque físico"
                              >
                                +25
                              </button>
                              {product.stockQuantity > 0 && (
                                <button
                                  onClick={() => setProductToZero(product)}
                                  className="h-7 px-2 bg-white hover:bg-rose-50 text-stone-400 hover:text-[#850D2C] rounded-lg text-[10px] font-medium border border-stone-200 transition"
                                  title="Zerar estoque para testar exibição como Esgotado"
                                >
                                  Zerar
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Ajuste Manual */}
                          <td className="py-2.5 px-4 text-right align-middle">
                            <button
                              onClick={() => handleOpenAdjustModal(product)}
                              className="p-1.5 bg-white hover:bg-stone-50 text-stone-500 hover:text-[#35312F] rounded-xl border border-stone-200 transition shadow-2xs"
                              title="Ajuste manual de estoque com justificativa auditada"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. Rodapé com Paginação e Seletor de Quantidade por Página */}
            <div className="p-3 bg-[#F9F7F3] border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-stone-500 px-4">
              {/* Quantidade Exibida */}
              <div>
                <span>
                  Exibindo{' '}
                  <strong className="text-[#35312F] font-semibold">
                    {sortedProducts.length === 0 ? 0 : productStartIndex + 1}–{productEndIndex}
                  </strong>{' '}
                  de <strong className="text-[#35312F] font-semibold">{sortedProducts.length}</strong> produtos
                  {filteredProducts.length !== activeProducts.length && (
                    <span className="text-stone-400"> (filtrados de {totalActive})</span>
                  )}
                </span>
              </div>

              {/* Seletor de Itens por Página & Controles de Paginação */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-stone-500">
                  <span className="text-[11px]">Itens:</span>
                  <select
                    value={productPerPage}
                    onChange={(e) => setProductPerPage(Number(e.target.value))}
                    className="h-7 rounded-lg border border-stone-200 bg-white px-2 text-xs text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none cursor-pointer"
                    title="Quantidade de produtos por página"
                  >
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Botões de Página */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={safeProductPage <= 1}
                    className="h-7 w-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalProductPages }, (_, i) => i + 1).map((pageNum) => {
                    // Limitar exibição caso haja muitas páginas
                    if (
                      pageNum === 1 ||
                      pageNum === totalProductPages ||
                      (pageNum >= safeProductPage - 1 && pageNum <= safeProductPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setProductPage(pageNum)}
                          className={`h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition ${
                            safeProductPage === pageNum
                              ? 'bg-[#850D2C] text-white shadow-2xs'
                              : 'bg-white hover:bg-stone-50 border border-stone-200 text-stone-600'
                          }`}
                          title={`Ir para página ${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === safeProductPage - 2 || pageNum === safeProductPage + 2) {
                      return (
                        <span key={pageNum} className="px-1 text-stone-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                    disabled={safeProductPage >= totalProductPages}
                    className="h-7 w-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Próxima página"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================= ABA 2: INGREDIENTES & INSUMOS ======================= */}
      {activeTab === 'INGREDIENTS' && (
        <>
          {/* Cards de Indicadores de Ingredientes: Altura Reduzida e Bordas Padronizadas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Card 1: Insumos Monitorados */}
            <div
              onClick={() => setIngredientFilter('ALL')}
              className={`cursor-pointer p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs group ${
                ingredientFilter === 'ALL'
                  ? 'border-stone-400 ring-1 ring-stone-300'
                  : 'border-stone-200/80 hover:border-stone-400'
              }`}
              title="Filtrar todas as matérias-primas e insumos"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-stone-600 border border-stone-200">
                      <Boxes className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Insumos monitorados</span>
                  </div>
                  <span className="text-[10px] font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                    Total
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {totalIngredients}{' '}
                  <span className="text-xs font-normal text-stone-400">itens</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">
                Grãos, laticínios, panificação e embalagens
              </p>
            </div>

            {/* Card 2: Necessitam Compra / Reposição */}
            <div
              onClick={() => setIngredientFilter('BAIXO')}
              className={`cursor-pointer p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs group ${
                ingredientFilter === 'BAIXO'
                  ? 'border-stone-400 ring-1 ring-stone-300'
                  : 'border-stone-200/80 hover:border-stone-400'
              }`}
              title="Filtrar insumos que necessitam compra"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-[#924529] border border-stone-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Necessitam compra</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#924529] bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                    Atenção
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {lowStockIngredients}{' '}
                  <span className="text-xs font-normal text-stone-400">insumos</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">
                Atingiram ou estão abaixo do estoque de segurança
              </p>
            </div>

            {/* Card 3: Insumos Esgotados (Borda Cinza-Claro Padronizada) */}
            <div
              onClick={() => setIngredientFilter('ESGOTADO')}
              className={`cursor-pointer p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs group ${
                ingredientFilter === 'ESGOTADO'
                  ? 'border-stone-400 ring-1 ring-stone-300'
                  : 'border-stone-200/80 hover:border-stone-400'
              }`}
              title="Filtrar insumos totalmente esgotados"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-[#850D2C] border border-stone-200">
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Insumos esgotados</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#850D2C] bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                    Crítico
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {outOfStockIngredients}{' '}
                  <span className="text-xs font-normal text-stone-400">insumos</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">
                Produção ou atendimento interrompidos por falta de insumo
              </p>
            </div>
          </div>

          {/* Barra de Ferramentas de Ingredientes: Perfeitamente Alinhada e Estruturada */}
          <div className="space-y-2.5 pt-0.5">
            {/* Linha 1: Chips de Status de Insumos */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setIngredientFilter('ALL')}
                  className={`h-8 px-3 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 whitespace-nowrap ${
                    ingredientFilter === 'ALL'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                  }`}
                  title="Mostrar todos os insumos"
                >
                  <span>Todos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      ingredientFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-stone-200/70 text-stone-600'
                    }`}
                  >
                    {totalIngredients}
                  </span>
                </button>

                <button
                  onClick={() => setIngredientFilter('NORMAL')}
                  className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 whitespace-nowrap ${
                    ingredientFilter === 'NORMAL'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                  }`}
                  title="Filtrar insumos com estoque normal"
                >
                  <span>Abastecidos</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      ingredientFilter === 'NORMAL' ? 'bg-white/20 text-white' : 'bg-stone-200/70 text-stone-600'
                    }`}
                  >
                    {normalStockIngredients}
                  </span>
                </button>

                <button
                  onClick={() => setIngredientFilter('BAIXO')}
                  className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 whitespace-nowrap ${
                    ingredientFilter === 'BAIXO'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                  }`}
                  title="Filtrar insumos que necessitam reposição"
                >
                  <span>Comprar</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      ingredientFilter === 'BAIXO' ? 'bg-white/20 text-white' : 'bg-amber-100/70 text-[#924529]'
                    }`}
                  >
                    {lowStockIngredients}
                  </span>
                </button>

                <button
                  onClick={() => setIngredientFilter('ESGOTADO')}
                  className={`h-8 px-3 rounded-full text-xs font-medium transition flex items-center space-x-1.5 whitespace-nowrap ${
                    ingredientFilter === 'ESGOTADO'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                  }`}
                  title="Filtrar insumos esgotados"
                >
                  <span>Esgotados</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      ingredientFilter === 'ESGOTADO' ? 'bg-white/20 text-white' : 'bg-rose-100/70 text-[#850D2C]'
                    }`}
                  >
                    {outOfStockIngredients}
                  </span>
                </button>
              </div>

              {/* Botão Limpar Filtros de Insumos Quando Ativo */}
              {hasActiveIngredientFilters && (
                <button
                  onClick={handleClearIngredientFilters}
                  className="inline-flex items-center space-x-1 h-8 px-2.5 text-xs text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition shrink-0"
                  title="Restaurar visualização padrão"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Limpar filtros</span>
                </button>
              )}
            </div>

            {/* Linha 2: Busca, Categoria e Ordenação Perfeitamente Alinhadas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar insumo ou fornecedor..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 text-xs rounded-full border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:bg-white focus:outline-none transition"
                  title="Digite para pesquisar insumos em tempo real"
                />
                {ingredientSearch && (
                  <button
                    onClick={() => setIngredientSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Dropdown de Categorias de Insumos */}
              <div className="relative shrink-0 sm:w-auto">
                <select
                  value={selectedIngredientCategory}
                  onChange={(e) => setSelectedIngredientCategory(e.target.value)}
                  className="w-full sm:w-auto h-8 rounded-full border border-stone-200 pl-3 pr-7 text-xs bg-stone-50 text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition appearance-none cursor-pointer"
                  title="Filtrar insumos por categoria"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {ingredientCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <Filter className="w-3 h-3" />
                </div>
              </div>

              {/* Dropdown de Ordenação de Insumos */}
              <div className="relative shrink-0 sm:w-auto">
                <select
                  value={ingredientSortBy}
                  onChange={(e) => setIngredientSortBy(e.target.value as SortOption)}
                  className="w-full sm:w-auto h-8 rounded-full border border-stone-200 pl-7 pr-7 text-xs bg-stone-50 text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition appearance-none cursor-pointer"
                  title="Critério de ordenação da tabela de insumos"
                >
                  <option value="CRITICALITY">Criticidade (Esgotados 1º)</option>
                  <option value="NAME_ASC">Nome (A - Z)</option>
                  <option value="STOCK_ASC">Menor estoque 1º</option>
                  <option value="STOCK_DESC">Maior estoque 1º</option>
                </select>
                <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400">
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Insumos & Matérias-Primas: Cabeçalho Bege Claro e Alinhamento Preciso */}
          <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4 font-semibold text-stone-600">Insumo / Matéria-Prima</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Categoria</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Estoque Atual</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Mínimo de Segurança</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Status</th>
                    <th className="py-3 px-4 text-center font-semibold text-stone-600">Entrada Rápida</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Ajuste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {paginatedIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-400">
                        <Boxes className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                        <p className="text-sm font-semibold text-[#35312F]">Nenhum insumo encontrado</p>
                        <p className="text-xs text-stone-400 mt-0.5">Tente ajustar seus termos de pesquisa ou cadastre um novo insumo.</p>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={handleOpenCreateIngredient}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] shadow-xs transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Cadastrar Novo Insumo</span>
                          </button>
                          {hasActiveIngredientFilters && (
                            <button
                              onClick={handleClearIngredientFilters}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Limpar todos os filtros</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedIngredients.map((ing) => {
                      const isOutOfStock = ing.currentStock <= 0;
                      const isLow =
                        ing.currentStock > 0 &&
                        ing.currentStock <= ing.minStockThreshold;

                      const targetScale = Math.max(ing.minStockThreshold * 2.5, 10);
                      const stockPercent = Math.min(
                        100,
                        Math.max(0, Math.round((ing.currentStock / targetScale) * 100))
                      );

                      const isRecentlyRestocked = restockedIngredientId === ing.id;

                      // Valores de entrada rápida padronizados
                      const quick1 = ing.unit === 'un' ? 20 : ing.unit === 'g' || ing.unit === 'ml' ? 500 : 5;
                      const quick2 = ing.unit === 'un' ? 50 : ing.unit === 'g' || ing.unit === 'ml' ? 1000 : 10;

                      return (
                        <tr
                          key={ing.id}
                          className={`transition-colors duration-150 ${
                            isRecentlyRestocked
                              ? 'bg-stone-50'
                              : 'hover:bg-[#F9F7F3]/70'
                          }`}
                        >
                          {/* Insumo + Fornecedor + Custo Unitário */}
                          <td className="py-2.5 px-4 align-middle">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 border border-stone-200 shrink-0">
                                {ing.category === 'Laticínios' ? (
                                  <IngredientsBasketIcon className="w-4 h-4 text-stone-500" />
                                ) : ing.category === 'Panificação & Doces' ? (
                                  <Wheat className="w-4 h-4 text-stone-500" />
                                ) : ing.category === 'Grãos & Pós' ? (
                                  <Coffee className="w-4 h-4 text-stone-500" />
                                ) : (
                                  <Boxes className="w-4 h-4 text-stone-500" />
                                )}
                              </div>
                              <div>
                                <span className="font-semibold text-[#35312F] block text-xs">
                                  {ing.name}
                                </span>
                                <div className="flex items-center space-x-2 text-[11px] text-stone-400 font-normal">
                                  {ing.supplier && <span>Fornec: {ing.supplier}</span>}
                                  {ing.supplier && <span>•</span>}
                                  <span>Custo: {formatCurrencyBRL(ing.costPerUnit)}/{ing.unit}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Categoria */}
                          <td className="py-2.5 px-4 text-stone-500 font-medium text-xs align-middle">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px]">
                              {ing.category}
                            </span>
                          </td>

                          {/* Estoque Atual com Barra Mais Fina e Elegante */}
                          <td className="py-2.5 px-4 align-middle">
                            <div className="space-y-1">
                              <span
                                className={`text-sm font-semibold block ${
                                  isOutOfStock
                                    ? 'text-[#850D2C]'
                                    : isLow
                                    ? 'text-[#924529]'
                                    : 'text-[#35312F]'
                                }`}
                              >
                                {formatIngredientQuantity(ing.currentStock, ing.unit)}
                              </span>

                              <div className="w-24 h-1 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isOutOfStock
                                      ? 'w-0'
                                      : isLow
                                      ? 'bg-[#924529]'
                                      : 'bg-[#858F6D]'
                                  }`}
                                  style={{ width: `${isOutOfStock ? 0 : Math.max(stockPercent, 8)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Limite Mínimo */}
                          <td className="py-2.5 px-4 text-stone-500 font-normal text-xs align-middle">
                            {formatIngredientQuantity(ing.minStockThreshold, ing.unit)}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-4 align-middle">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-[#850D2C] border border-[#850D2C]/20">
                                <ArrowDownCircle className="w-3 h-3 text-[#850D2C]" />
                                <span>Esgotado</span>
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-[#924529] border border-[#924529]/20">
                                <AlertTriangle className="w-3 h-3 text-[#924529]" />
                                <span>Comprar</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#858F6D]/10 text-[#4c543c] border border-[#858F6D]/20">
                                <CheckCircle className="w-3 h-3 text-[#858F6D]" />
                                <span>Abastecido</span>
                              </span>
                            )}
                          </td>

                          {/* Entrada Rápida Padronizada */}
                          <td className="py-2.5 px-4 text-center align-middle whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => handleQuickAddIngredient(ing, quick1)}
                                className="h-7 px-2.5 min-w-[56px] inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-stone-50 text-[#35312F] rounded-lg text-xs font-medium border border-stone-200 transition active:scale-95 shadow-2xs leading-none"
                                title={`Adicionar +${quick1} ${ing.unit} ao estoque físico`}
                              >
                                +{quick1} {ing.unit}
                              </button>
                              <button
                                onClick={() => handleQuickAddIngredient(ing, quick2)}
                                className="h-7 px-2.5 min-w-[56px] inline-flex items-center justify-center whitespace-nowrap bg-white hover:bg-stone-50 text-[#35312F] rounded-lg text-xs font-medium border border-stone-200 transition active:scale-95 shadow-2xs leading-none"
                                title={`Adicionar +${quick2} ${ing.unit} ao estoque físico`}
                              >
                                +{quick2} {ing.unit}
                              </button>
                            </div>
                          </td>

                          {/* Ajuste Manual */}
                          <td className="py-2.5 px-4 text-right align-middle">
                            <button
                              onClick={() => handleOpenIngredientModal(ing)}
                              className="p-1.5 bg-white hover:bg-stone-50 text-stone-500 hover:text-[#35312F] rounded-xl border border-stone-200 transition shadow-2xs"
                              title="Ajuste manual de insumo com justificativa auditada"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé da tabela de insumos com Paginação */}
            <div className="p-3 bg-[#F9F7F3] border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-stone-500 px-4">
              <div>
                <span>
                  Exibindo{' '}
                  <strong className="text-[#35312F] font-semibold">
                    {sortedIngredients.length === 0 ? 0 : ingredientStartIndex + 1}–{ingredientEndIndex}
                  </strong>{' '}
                  de <strong className="text-[#35312F] font-semibold">{sortedIngredients.length}</strong> insumos monitorados
                  {filteredIngredients.length !== ingredients.length && (
                    <span className="text-stone-400"> (filtrados de {totalIngredients})</span>
                  )}
                </span>
              </div>

              {/* Seletor de Itens por Página & Controles de Paginação */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-stone-500">
                  <span className="text-[11px]">Itens:</span>
                  <select
                    value={ingredientPerPage}
                    onChange={(e) => setIngredientPerPage(Number(e.target.value))}
                    className="h-7 rounded-lg border border-stone-200 bg-white px-2 text-xs text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none cursor-pointer"
                    title="Quantidade de insumos por página"
                  >
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Botões de Página */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIngredientPage((p) => Math.max(1, p - 1))}
                    disabled={safeIngredientPage <= 1}
                    className="h-7 w-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {Array.from({ length: totalIngredientPages }, (_, i) => i + 1).map((pageNum) => {
                    if (
                      pageNum === 1 ||
                      pageNum === totalIngredientPages ||
                      (pageNum >= safeIngredientPage - 1 && pageNum <= safeIngredientPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setIngredientPage(pageNum)}
                          className={`h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition ${
                            safeIngredientPage === pageNum
                              ? 'bg-[#850D2C] text-white shadow-2xs'
                              : 'bg-white hover:bg-stone-50 border border-stone-200 text-stone-600'
                          }`}
                          title={`Ir para página ${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === safeIngredientPage - 2 || pageNum === safeIngredientPage + 2) {
                      return (
                        <span key={pageNum} className="px-1 text-stone-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() => setIngredientPage((p) => Math.min(totalIngredientPages, p + 1))}
                    disabled={safeIngredientPage >= totalIngredientPages}
                    className="h-7 w-7 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Próxima página"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================= MODAIS ======================= */}

      {/* Modal de Ajuste de Produto (Cardápio) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
              />
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Ajustar Estoque de "{selectedProduct.name}"
                </h3>
                <span className="text-xs text-stone-500">
                  Estoque atual: <strong>{selectedProduct.stockQuantity} un.</strong> • Limite mínimo: <strong>{selectedProduct.minStockThreshold} un.</strong>
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nova Quantidade em Estoque
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setNewStockValue((v) => Math.max(0, v - 1))}
                    className="p-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 transition"
                    title="Diminuir 1 unidade"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={newStockValue}
                    onChange={(e) => setNewStockValue(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 px-3.5 py-2.5 text-center text-lg font-extrabold text-stone-900 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#850D2C] focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setNewStockValue((v) => v + 1)}
                    className="p-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 transition"
                    title="Aumentar 1 unidade"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                  Motivo / Justificativa (Auditoria)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Recebimento de carga de fornecedor, contagem física..."
                  className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Reposição de fornecedor', 'Contagem física', 'Ajuste por perda / avaria'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustReason(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#F9F7F3] rounded-xl text-[11px] text-stone-600 border border-stone-200/80 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#850D2C] mt-0.5" />
                <span>
                  Esta alteração será registrada com nome do usuário, data e justificativa na aba <strong>Auditoria de Segurança</strong>.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-[#35312F] rounded-xl hover:bg-stone-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveStock}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] rounded-xl shadow-xs transition"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Novo Estoque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ajuste de Insumo / Matéria-Prima */}
      {selectedIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 border border-stone-200 shrink-0">
                <IngredientsBasketIcon className="w-6 h-6 text-stone-600" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Ajustar Estoque de "{selectedIngredient.name}"
                </h3>
                <span className="text-xs text-stone-500">
                  Estoque atual: <strong>{formatIngredientQuantity(selectedIngredient.currentStock, selectedIngredient.unit)}</strong> • Mínimo: <strong>{formatIngredientQuantity(selectedIngredient.minStockThreshold, selectedIngredient.unit)}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nova Quantidade ({selectedIngredient.unit})
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const step = selectedIngredient.unit === 'un' ? 1 : 0.5;
                      setNewIngredientStock((v) => Math.max(0, Number((v - step).toFixed(2))));
                    }}
                    className="p-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 transition"
                    title={`Diminuir ${selectedIngredient.unit === 'un' ? 1 : 0.5} ${selectedIngredient.unit}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    step={selectedIngredient.unit === 'un' ? '1' : '0.1'}
                    min="0"
                    value={newIngredientStock}
                    onChange={(e) => setNewIngredientStock(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3.5 py-2.5 text-center text-lg font-extrabold text-stone-900 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#850D2C] focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const step = selectedIngredient.unit === 'un' ? 1 : 0.5;
                      setNewIngredientStock((v) => Number((v + step).toFixed(2)));
                    }}
                    className="p-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 transition"
                    title={`Aumentar ${selectedIngredient.unit === 'un' ? 1 : 0.5} ${selectedIngredient.unit}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                  Motivo / Justificativa (Auditoria)
                </label>
                <input
                  type="text"
                  value={ingredientAdjustReason}
                  onChange={(e) => setIngredientAdjustReason(e.target.value)}
                  placeholder="Ex: Nota fiscal nº 4810, contagem física mensal..."
                  className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    'Compra de fornecedor',
                    'Contagem física mensal',
                    'Perda / Desperdício / Vencimento',
                    'Consumo extraordinário na produção',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setIngredientAdjustReason(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-[#F9F7F3] rounded-xl text-[11px] text-stone-600 border border-stone-200/80 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#850D2C] mt-0.5" />
                <span>
                  O ajuste de matéria-prima é auditado e refletirá imediatamente no saldo disponível e nos relatórios de custo da cafeteria.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedIngredient(null)}
                  disabled={isSavingIngredient}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-[#35312F] rounded-xl hover:bg-stone-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveIngredientStock}
                  disabled={isSavingIngredient}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] rounded-xl shadow-xs transition"
                >
                  {isSavingIngredient ? 'Salvando...' : 'Salvar Novo Estoque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Segura para Zerar Produto */}
      {productToZero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-xl border border-stone-200 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-rose-50 text-[#850D2C] rounded-2xl border border-[#850D2C]/20">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-[#35312F] text-sm">
                  Zerar Estoque para Teste?
                </h3>
                <span className="text-xs text-stone-500">
                  {productToZero.name}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              O estoque deste item será alterado para <strong>0 un.</strong> para demonstrar que o sistema bloqueia automaticamente pedidos de produtos esgotados no cardápio do cliente (RF04).
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setProductToZero(null)}
                disabled={isZeroing}
                className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-[#35312F] rounded-xl hover:bg-stone-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmZeroStock}
                disabled={isZeroing}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] rounded-xl shadow-xs transition"
              >
                {isZeroing ? 'Zerando...' : 'Confirmar Zerar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Cadastro de Novo Insumo / Matéria-Prima */}
      {isCreateIngredientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 p-6 sm:p-7 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#850D2C]/10 flex items-center justify-center text-[#850D2C] shrink-0 border border-[#850D2C]/20">
                  <IngredientsBasketIcon className="w-5 h-5 text-[#850D2C]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#35312F] text-base">
                    Cadastrar Insumo / Matéria-Prima
                  </h3>
                  <p className="text-xs text-stone-400">
                    Controle de estoque físico, limite mínimo e custo unitário
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateIngredientOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário de Cadastro */}
            <form onSubmit={handleSaveNewIngredient} className="mt-5 space-y-4">
              {createIngredientError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-[#850D2C] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#850D2C]" />
                  <span>{createIngredientError}</span>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                  Nome do Insumo / Matéria-Prima *
                </label>
                <input
                  type="text"
                  required
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  placeholder="Ex: Café Especial Mogiana, Farinha de Trigo, Leite Integral..."
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
                />
              </div>

              {/* Categoria e Unidade de Medida */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                    Categoria *
                  </label>
                  <select
                    value={newIngCategory}
                    onChange={(e) => setNewIngCategory(e.target.value as IngredientCategory)}
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] font-medium focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition cursor-pointer"
                  >
                    <option value="Grãos & Pós">Grãos & Pós</option>
                    <option value="Laticínios">Laticínios</option>
                    <option value="Panificação & Doces">Panificação & Doces</option>
                    <option value="Mercearia & Adoçantes">Mercearia & Adoçantes</option>
                    <option value="Embalagens & Descartáveis">Embalagens & Descartáveis</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                    Unidade de Medida *
                  </label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value as IngredientUnit)}
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] font-medium focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition cursor-pointer"
                  >
                    <option value="kg">kg (Quilogramas)</option>
                    <option value="g">g (Gramas)</option>
                    <option value="L">L (Litros)</option>
                    <option value="ml">ml (Mililitros)</option>
                    <option value="un">un (Unidades)</option>
                  </select>
                </div>
              </div>

              {/* Estoque Inicial e Limite Mínimo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                    Estoque Inicial ({newIngUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                    Limite Mínimo ({newIngUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newIngMinStock}
                    onChange={(e) => setNewIngMinStock(e.target.value)}
                    placeholder="5"
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition font-semibold"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    Dispara alerta de reposição quando estoque ≤ limite.
                  </span>
                </div>
              </div>

              {/* Custo Unitário e Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                    Custo por {newIngUnit} (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newIngCost}
                    onChange={(e) => setNewIngCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                    Fornecedor / Distribuidor
                  </label>
                  <input
                    type="text"
                    value={newIngSupplier}
                    onChange={(e) => setNewIngSupplier(e.target.value)}
                    placeholder="Ex: Moinho Paulista, BioAlimentos..."
                    className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Dica */}
              <div className="p-3 bg-[#F9F7F3] rounded-xl text-[11px] text-stone-600 border border-stone-200/80 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#850D2C] mt-0.5" />
                <span>
                  O novo insumo entrará imediatamente no controle de estoque com rastreamento auditado para inventário e cálculo de reposição.
                </span>
              </div>

              {/* Ações */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateIngredientOpen(false)}
                  disabled={isCreatingIngredient}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-[#35312F] rounded-xl hover:bg-stone-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingIngredient}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] rounded-xl shadow-xs transition inline-flex items-center space-x-1.5 disabled:opacity-75"
                >
                  {isCreatingIngredient ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Cadastrar Insumo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
