import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Minus,
  Percent,
  Check,
  AlertCircle,
  TrendingUp,
  Search,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { Product, ComboItemConfig } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import { GourmetCutoutImage } from './GourmetCutoutImage.tsx';

interface ComboBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSaveCombo: (comboData: Partial<Product>) => Promise<void>;
  comboToEdit?: Product | null;
}

const FALLBACK_COMBO_IMAGE =
  'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80';

export const ComboBuilderModal: React.FC<ComboBuilderModalProps> = ({
  isOpen,
  onClose,
  products,
  onSaveCombo,
  comboToEdit,
}) => {
  // Apenas produtos individuais ativos (exclui outros combos para evitar redundância)
  const availableProducts = useMemo(
    () => products.filter((p) => p.status === 'ativo' && !p.isCombo && p.category !== 'Combos & Brunch'),
    [products]
  );

  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Itens selecionados no combo: { [productId]: quantity }
  const [itemQuantities, setItemQuantities] = useState<{ [productId: string]: number }>(() => {
    if (comboToEdit && comboToEdit.comboItems) {
      const initial: { [productId: string]: number } = {};
      comboToEdit.comboItems.forEach((ci) => {
        initial[ci.productId] = ci.quantity;
      });
      return initial;
    }
    return {};
  });

  const [name, setName] = useState(comboToEdit?.name || '');
  const [description, setDescription] = useState(comboToEdit?.description || '');

  // Controle de imagem: upload do dispositivo ou foto automática de um dos itens
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customUploadedImageUrl, setCustomUploadedImageUrl] = useState<string | null>(() => {
    if (!comboToEdit) return null;
    const isFromItem = comboToEdit.comboItems?.some(
      (ci) => products.find((p) => p.id === ci.productId)?.imageUrl === comboToEdit.imageUrl
    );
    if (!isFromItem && comboToEdit.imageUrl) {
      return comboToEdit.imageUrl;
    }
    return null;
  });

  const [selectedProductImageId, setSelectedProductImageId] = useState<string | null>(() => {
    if (!comboToEdit) return null;
    const matchingItem = comboToEdit.comboItems?.find(
      (ci) => products.find((p) => p.id === ci.productId)?.imageUrl === comboToEdit.imageUrl
    );
    return matchingItem ? matchingItem.productId : null;
  });

  const [discountPercent, setDiscountPercent] = useState<number>(() => {
    if (comboToEdit?.discountPercentage !== undefined) return comboToEdit.discountPercentage;
    return 15; // 15% OFF padrão
  });
  const [customPrice, setCustomPrice] = useState<string>(
    comboToEdit ? comboToEdit.price.toFixed(2) : ''
  );
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza formulário ao abrir ou alterar comboToEdit
  useEffect(() => {
    if (!isOpen) return;

    if (comboToEdit) {
      setName(comboToEdit.name || '');
      setDescription(comboToEdit.description || '');
      setCustomPrice(comboToEdit.price ? comboToEdit.price.toFixed(2) : '');
      setIsManualPrice(false);
      setDiscountPercent(comboToEdit.discountPercentage ?? 15);

      const initialQtys: { [productId: string]: number } = {};
      comboToEdit.comboItems?.forEach((ci) => {
        initialQtys[ci.productId] = ci.quantity;
      });
      setItemQuantities(initialQtys);

      const matchingItem = comboToEdit.comboItems?.find(
        (ci) => products.find((p) => p.id === ci.productId)?.imageUrl === comboToEdit.imageUrl
      );

      if (matchingItem) {
        setSelectedProductImageId(matchingItem.productId);
        setCustomUploadedImageUrl(null);
      } else {
        setCustomUploadedImageUrl(comboToEdit.imageUrl || null);
        setSelectedProductImageId(null);
      }
    } else {
      setName('');
      setDescription('');
      setCustomPrice('');
      setIsManualPrice(false);
      setDiscountPercent(15);
      setItemQuantities({});
      setCustomUploadedImageUrl(null);
      setSelectedProductImageId(null);
      setError(null);
    }
  }, [isOpen, comboToEdit, products]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lista dos itens selecionados com dados completos
  const selectedItemsList = useMemo(() => {
    return Object.entries(itemQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const prod = products.find((p) => p.id === productId);
        return {
          productId,
          product: prod,
          quantity,
          unitPrice: prod?.price || 0,
          costPrice: prod?.costPrice || 0,
        };
      })
      .filter((item) => item.product !== undefined);
  }, [itemQuantities, products]);

  // Cálculos Financeiros
  const originalSumPrice = useMemo(() => {
    return selectedItemsList.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [selectedItemsList]);

  const totalCostPrice = useMemo(() => {
    return selectedItemsList.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  }, [selectedItemsList]);

  // Preço final calculado ou manual
  const calculatedPrice = useMemo(() => {
    if (isManualPrice && customPrice) {
      return Math.max(0, parseFloat(customPrice) || 0);
    }
    return Math.max(0, originalSumPrice * (1 - discountPercent / 100));
  }, [isManualPrice, customPrice, originalSumPrice, discountPercent]);

  const savings = Math.max(0, originalSumPrice - calculatedPrice);
  const effectiveDiscountPercent =
    originalSumPrice > 0 ? (savings / originalSumPrice) * 100 : 0;
  const profit = calculatedPrice - totalCostPrice;
  const profitMargin = calculatedPrice > 0 ? (profit / calculatedPrice) * 100 : 0;

  // Estoque estimado baseado no menor estoque dos produtos selecionados
  const estimatedComboStock = useMemo(() => {
    if (selectedItemsList.length === 0) return 0;
    const limits = selectedItemsList.map((item) =>
      Math.floor((item.product?.stockQuantity || 0) / item.quantity)
    );
    return Math.max(0, Math.min(...limits));
  }, [selectedItemsList]);

  // Produto do combo que fornecerá a foto (escolhido manualmente ou o primeiro da lista automaticamente)
  const effectiveProductForImage = useMemo(() => {
    if (selectedProductImageId) {
      const found = selectedItemsList.find((i) => i.productId === selectedProductImageId);
      if (found) return found.product;
    }
    // Caso padrão: seleciona automaticamente o primeiro produto que compõe o combo
    return selectedItemsList[0]?.product;
  }, [selectedItemsList, selectedProductImageId]);

  // URL final efetiva da foto do combo:
  // 1. Imagem enviada pelo usuário (prioridade máxima)
  // 2. Imagem do produto selecionado ou do 1º produto do combo (automático)
  // 3. Imagem padrão de fallback
  const effectiveImageUrl = useMemo(() => {
    if (customUploadedImageUrl) return customUploadedImageUrl;
    if (effectiveProductForImage?.imageUrl) return effectiveProductForImage.imageUrl;
    return FALLBACK_COMBO_IMAGE;
  }, [customUploadedImageUrl, effectiveProductForImage]);

  // Imagem recortada sem fundo (se vier do produto que possui cutout)
  const effectiveCutoutImageUrl = useMemo(() => {
    if (customUploadedImageUrl) return undefined;
    return effectiveProductForImage?.cutoutImageUrl;
  }, [customUploadedImageUrl, effectiveProductForImage]);

  // Upload de Imagem do Usuário
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      e.target.value = '';
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultDataUrl = reader.result as string;
      setCustomUploadedImageUrl(resultDataUrl);
      setSelectedProductImageId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearCustomUpload = () => {
    setCustomUploadedImageUrl(null);
    setSelectedProductImageId(null);
  };

  // Manipulação de Quantidades
  const handleSetQuantity = (productId: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Aplicação de desconto pré-definido
  const handleApplyPresetDiscount = (percent: number) => {
    setIsManualPrice(false);
    setDiscountPercent(percent);
    setCustomPrice((originalSumPrice * (1 - percent / 100)).toFixed(2));
  };

  // Envio / Salvamento do Combo
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemsList.length === 0) {
      setError('Selecione pelo menos um produto para compor o combo.');
      return;
    }
    if (!name.trim()) {
      setError('Por favor, informe um nome para o combo.');
      return;
    }
    if (calculatedPrice <= 0) {
      setError('O preço final do combo deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const comboItemsPayload: ComboItemConfig[] = selectedItemsList.map((item) => ({
      productId: item.productId,
      productName: item.product?.name || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.costPrice,
    }));

    try {
      await onSaveCombo({
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(calculatedPrice.toFixed(2)),
        costPrice: Number(totalCostPrice.toFixed(2)),
        category: 'Combos & Brunch',
        imageUrl: effectiveImageUrl.trim() || FALLBACK_COMBO_IMAGE,
        cutoutImageUrl: effectiveCutoutImageUrl || undefined,
        stockQuantity: estimatedComboStock,
        minStockThreshold: 5,
        status: 'ativo',
        isCombo: true,
        comboItems: comboItemsPayload,
        originalComboPrice: Number(originalSumPrice.toFixed(2)),
        discountPercentage: Math.round(effectiveDiscountPercent),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar combo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const categories = Array.from(new Set(availableProducts.map((p) => p.category)));

  const filteredAvailable = availableProducts.filter((p) => {
    const matchesCategory =
      selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-[#fcfbf9] text-[#35312F] font-sans overflow-hidden animate-in fade-in duration-150"
    >
      {/* Cabeçalho do Modal em Largura Total da Janela */}
      <div className="w-full px-6 sm:px-10 py-4 bg-[#820b28] text-white flex items-center justify-between shrink-0 shadow-md">
        <div>
          <h2
            className="text-xl sm:text-2xl font-normal tracking-tight text-white leading-tight"
            style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
          >
            {comboToEdit ? 'Editar Combo Promocional' : 'Criador de Combos Gourmet'}
          </h2>
          <p className="text-xs text-white/80 mt-0.5">
            Selecione produtos individuais, defina descontos e monte ofertas exclusivas.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full text-white/80 hover:text-white hover:bg-white/15 flex items-center justify-center transition cursor-pointer"
          title="Fechar tela inteira (ESC)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mx-6 sm:mx-10 mt-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center space-x-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Corpo do Criador de Combos em Tela Inteira */}
      <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ========================================================
                COLUNA ESQUERDA (7 colunas): Seleção de Produtos do Cardápio
               ======================================================== */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  1. Selecionar Produtos do Cardápio
                </h3>
                <span className="text-[11px] text-stone-500 font-medium">
                  {selectedItemsList.length}{' '}
                  {selectedItemsList.length === 1 ? 'item selecionado' : 'itens selecionados'}
                </span>
              </div>

              {/* Barra de Busca e Filtro de Categoria */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produto por nome..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#820b28] focus:outline-none bg-white shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedCategoryFilter === 'ALL'
                        ? 'bg-[#820b28] text-white shadow-xs'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-[#820b28] text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista Scrollável de Produtos Disponíveis */}
              <div className="space-y-2.5 max-h-[calc(100vh-310px)] overflow-y-auto pr-1.5">
                {filteredAvailable.map((product) => {
                  const qty = itemQuantities[product.id] || 0;
                  const isSelected = qty > 0;

                  return (
                    <div
                      key={product.id}
                      className={`p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-stone-100 shrink-0 overflow-hidden flex items-center justify-center border border-stone-200/80 p-0.5">
                          <GourmetCutoutImage
                            src={product.cutoutImageUrl || product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 truncate">
                            {product.category}
                          </div>
                          <div className="text-xs font-bold text-stone-900 truncate">
                            {product.name}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-stone-500">
                            <span className="font-extrabold text-stone-900">
                              {formatCurrencyBRL(product.price)}
                            </span>
                            <span>•</span>
                            <span>Estoque: {product.stockQuantity} un.</span>
                          </div>
                        </div>
                      </div>

                      {/* Controle de Quantidade */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {qty > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetQuantity(product.id, -1)}
                            className="w-7 h-7 rounded-full bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 flex items-center justify-center transition shadow-2xs cursor-pointer"
                            title="Diminuir"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <span
                          className={`w-7 text-center text-xs font-extrabold ${
                            qty > 0 ? 'text-[#820b28]' : 'text-stone-400'
                          }`}
                        >
                          {qty}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleSetQuantity(product.id, 1)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-2xs cursor-pointer ${
                            qty > 0
                              ? 'bg-[#820b28] text-white hover:bg-[#631a09]'
                              : 'bg-stone-900 text-white hover:bg-[#820b28]'
                          }`}
                          title="Adicionar ao combo"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                COLUNA DIREITA (5 colunas): Cálculos, Desconto & Configuração
               ======================================================== */}
            <div className="lg:col-span-5 space-y-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                2. Precificação & Inteligência
              </h3>

              {/* Card de Resumo de Preços */}
              <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Soma dos Itens Avulsos:</span>
                  <span className="font-bold text-stone-800 line-through">
                    {formatCurrencyBRL(originalSumPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Custo Total de Produção:</span>
                  <span className="font-medium text-stone-600">
                    {formatCurrencyBRL(totalCostPrice)}
                  </span>
                </div>

                {/* Seletor de Desconto Promocional */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                    <span className="flex items-center space-x-1">
                      <Percent className="w-3.5 h-3.5 text-[#820b28]" />
                      <span>Desconto Promocional:</span>
                    </span>
                    <span className="text-[#820b28]">{Math.round(effectiveDiscountPercent)}% OFF</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplyPresetDiscount(pct)}
                        className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          !isManualPrice && discountPercent === pct
                            ? 'bg-[#820b28] text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {pct === 0 ? '0%' : `-${pct}%`}
                      </button>
                    ))}
                  </div>

                  {/* Preço Manual Opcional */}
                  <div className="pt-1 flex items-center space-x-2">
                    <label className="text-[11px] font-bold text-stone-600 shrink-0">
                      Preço Final (R$):
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={isManualPrice ? customPrice : calculatedPrice.toFixed(2)}
                      onChange={(e) => {
                        setIsManualPrice(true);
                        setCustomPrice(e.target.value);
                      }}
                      className="w-full px-2.5 py-1 text-xs font-black text-stone-900 border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#820b28] focus:outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Métricas de Economia e Lucro */}
                <div className="pt-2 border-t border-stone-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl">
                    <span>Economia para o cliente:</span>
                    <span>{formatCurrencyBRL(savings)}</span>
                  </div>

                  <div className="flex items-center justify-between text-stone-700 font-bold bg-stone-100 px-2.5 py-1 rounded-xl">
                    <span className="flex items-center space-x-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Lucro por Combo:</span>
                    </span>
                    <span className="text-emerald-700">
                      {formatCurrencyBRL(profit)} ({Math.round(profitMargin)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                    <span>Estoque estimado disponível:</span>
                    <span className="font-extrabold text-[#820b28]">
                      {estimatedComboStock} combos
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações Básicas do Combo */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Nome do Combo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Combo Café Especial & Croissant"
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#820b28] focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Descrição & Itens Inclusos
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o que vem no combo e seus diferenciais..."
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#820b28] focus:outline-none resize-none bg-white"
                  />
                </div>

                {/* Foto do Combo */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                      Foto do Combo
                    </label>
                    <span className="text-[10px] text-stone-500 font-medium">
                      {customUploadedImageUrl ? (
                        <span className="text-[#820b28] font-bold">✨ Foto enviada</span>
                      ) : effectiveProductForImage ? (
                        <span className="text-emerald-700 font-semibold">
                          ⚡ Automático: {effectiveProductForImage.name}
                        </span>
                      ) : (
                        'Padrão'
                      )}
                    </span>
                  </div>

                  {/* 1. Upload de Foto Personalizada */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />

                    {customUploadedImageUrl ? (
                      <div className="flex items-center justify-between p-2 rounded-2xl border-2 border-[#820b28] bg-rose-50/40">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={customUploadedImageUrl}
                            alt="Foto do Combo Enviada"
                            className="w-12 h-12 rounded-xl object-cover border border-stone-200 shadow-xs"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-stone-900">Foto Enviada</span>
                              <span className="bg-[#820b28] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                Ativa
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-500 block">
                              Imagem personalizada carregada
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 text-[11px] font-bold text-stone-700 bg-white hover:bg-stone-100 rounded-lg border border-stone-200 transition cursor-pointer"
                          >
                            Trocar
                          </button>
                          <button
                            type="button"
                            onClick={handleClearCustomUpload}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Remover foto personalizada e voltar para automática"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-dashed border-stone-300 hover:border-[#820b28] rounded-xl text-stone-700 hover:text-[#820b28] hover:bg-rose-50/30 transition cursor-pointer text-xs font-bold"
                      >
                        <Upload className="w-3.5 h-3.5 text-stone-500" />
                        <span>Enviar imagem do combo...</span>
                      </button>
                    )}
                  </div>

                  {/* 2. Fotos Automáticas dos Produtos que Compõem o Combo */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      {selectedItemsList.length > 0
                        ? 'Ou use a foto de um dos itens do combo:'
                        : 'Foto dos produtos do combo (Automático):'}
                    </span>

                    {selectedItemsList.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {selectedItemsList.map((item) => {
                          const isThisActive =
                            !customUploadedImageUrl &&
                            (selectedProductImageId === item.productId ||
                              (!selectedProductImageId &&
                                selectedItemsList[0]?.productId === item.productId));

                          return (
                            <button
                              key={item.productId}
                              type="button"
                              onClick={() => {
                                setCustomUploadedImageUrl(null);
                                setSelectedProductImageId(item.productId);
                              }}
                              className={`relative rounded-xl p-1.5 border-2 transition cursor-pointer text-left flex flex-col items-center bg-white ${
                                isThisActive
                                  ? 'border-[#820b28] ring-2 ring-[#820b28]/20 bg-rose-50/20'
                                  : 'border-stone-200 hover:border-stone-300'
                              }`}
                            >
                              <div className="w-full h-11 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
                                <img
                                  src={item.product?.imageUrl}
                                  alt={item.product?.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-stone-800 line-clamp-1 w-full text-center mt-1">
                                {item.product?.name}
                              </span>

                              {isThisActive && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-[#820b28] rounded-full flex items-center justify-center text-white shadow-xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                              )}

                              {!selectedProductImageId &&
                                selectedItemsList[0]?.productId === item.productId &&
                                !customUploadedImageUrl && (
                                  <span className="absolute bottom-1 bg-stone-900/75 text-white text-[8px] font-extrabold px-1 rounded-sm">
                                    Auto
                                  </span>
                                )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-400 italic bg-stone-50 p-2 rounded-xl border border-stone-200/60">
                        Adicione produtos ao lado para usar a foto deles automaticamente no combo.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Fixo no final da janela */}
        <div className="w-full bg-white border-t border-stone-200/90 px-6 sm:px-10 py-4 flex items-center justify-between shrink-0 shadow-lg z-10">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[11px] text-stone-400 block font-medium">Preço Final do Combo</span>
              <span className="text-2xl sm:text-3xl font-black text-stone-900">
                {formatCurrencyBRL(calculatedPrice)}
              </span>
            </div>
            {effectiveDiscountPercent > 0 && (
              <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-[#820b28]">
                {Math.round(effectiveDiscountPercent)}% OFF
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || selectedItemsList.length === 0}
              className="px-7 py-2.5 bg-[#820b28] hover:bg-[#631a09] text-white rounded-full text-xs font-bold shadow-md transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Salvando Combo...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Combo no Cardápio</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
