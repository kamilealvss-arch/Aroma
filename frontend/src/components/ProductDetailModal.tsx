import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Product } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import { GourmetCutoutImage } from './GourmetCutoutImage.tsx';

export interface ProductAddonOption {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface ConfiguredCartItem {
  product: Product;
  selectedSize?: string;
  selectedAddons: ProductAddonOption[];
  quantity: number;
  notes?: string;
  unitPrice: number;
}

interface ProductDetailModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onAddToCart: (configured: ConfiguredCartItem) => void;
  onBuyNow?: (configured: ConfiguredCartItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  cartItemCount?: number;
  onOpenCart?: () => void;
}

// Adicionais padrão de acordo com a categoria
const COFFEE_ADDONS: ProductAddonOption[] = [
  { id: 'chantilly', name: 'Chantilly Artesanal', price: 3.0 },
  { id: 'caramelo', name: 'Calda de Caramelo Salgado', price: 2.5 },
  { id: 'shot_extra', name: 'Shot Extra de Espresso', price: 4.0 },
  { id: 'leite_vegetal', name: 'Leite Sem Lactose / Vegetal', price: 3.5 },
  { id: 'canela', name: 'Canela em Pó & Cacau Belga', price: 0.0 },
  { id: 'chocolate', name: 'Gotas de Chocolate Belga', price: 3.0 },
];

const FOOD_ADDONS: ProductAddonOption[] = [
  { id: 'aquecer', name: 'Aquecer no Forno / Tostado', price: 0.0 },
  { id: 'geleia', name: 'Geléia Artesanal de Frutas', price: 3.5 },
  { id: 'requeijao', name: 'Requeijão Cremoso Extra', price: 3.5 },
  { id: 'parmesao', name: 'Parmesão Ralado Maçaricado', price: 4.0 },
  { id: 'brigadeiro', name: 'Cobertura Extra de Brigadeiro', price: 4.0 },
];

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  isFavorite = false,
  onToggleFavorite,
  cartItemCount = 0,
  onOpenCart,
}) => {
  const [selectedSizeName, setSelectedSizeName] = useState<string>('');
  const [selectedAddons, setSelectedAddons] = useState<ProductAddonOption[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isAboutExpanded, setIsAboutExpanded] = useState<boolean>(false);
  const [isAddedSuccess, setIsAddedSuccess] = useState<boolean>(false);

  // Determina tamanhos disponíveis
  const availableSizes = useMemo(() => {
    if (!product) return [];
    if (product.hasSizes && product.sizes && product.sizes.length > 0) {
      return product.sizes.map((s) => ({
        name: s.name || 'Padrão',
        price: Number(s.price) || 0,
        volumeLabel: s.name?.match(/\((.*?)\)/)?.[1] || s.name || '',
      }));
    }

    const category = product.category || '';
    const name = product.name?.toLowerCase() || '';
    const isBeverage =
      category === 'Cafés Especiais' ||
      category === 'Bebidas Geladas' ||
      name.includes('café') ||
      name.includes('cappuccino') ||
      name.includes('latte') ||
      name.includes('chá');

    const basePrice = Number(product.price) || 0;

    if (isBeverage) {
      return [
        {
          name: 'Small',
          price: Number((basePrice * 0.85).toFixed(2)),
          volumeLabel: '160 ml',
        },
        {
          name: 'Medium',
          price: basePrice,
          volumeLabel: '250 ml',
        },
        {
          name: 'Large',
          price: Number((basePrice * 1.35).toFixed(2)),
          volumeLabel: '350 ml',
        },
      ];
    }

    return [
      {
        name: 'Individual',
        price: basePrice,
        volumeLabel: '1 un.',
      },
      {
        name: 'Combo Duplo',
        price: Number((basePrice * 1.85).toFixed(2)),
        volumeLabel: '2 un.',
      },
    ];
  }, [product]);

  // Determina adicionais disponíveis (definido no topo para respeitar as regras dos Hooks do React)
  const availableAddons: ProductAddonOption[] = useMemo(() => {
    if (!product) return [];

    // Se o produto possuir adicionais específicos cadastrados pelo administrador
    if (product.hasAddons && product.addons && product.addons.length > 0) {
      return product.addons.map((a) => ({
        id: a.id || (a.name || '').toLowerCase().replace(/\s+/g, '_'),
        name: a.name || 'Adicional',
        price: Number(a.price) || 0,
      }));
    }

    // Caso contrário, oferece os adicionais pré-configurados inteligentes para a categoria
    const category = product.category || '';
    const name = product.name?.toLowerCase() || '';
    const isBeverage =
      category === 'Cafés Especiais' ||
      category === 'Bebidas Geladas' ||
      name.includes('café') ||
      name.includes('latte') ||
      name.includes('cappuccino');

    return isBeverage ? COFFEE_ADDONS : FOOD_ADDONS;
  }, [product]);

  // Redefine estados quando o produto mudar
  useEffect(() => {
    if (product && availableSizes.length > 0) {
      const defaultSize =
        availableSizes.find(
          (s) => (s.name || '').toLowerCase().includes('small') || (s.name || '').toLowerCase().includes('p (')
        ) || availableSizes[0];
      setSelectedSizeName(defaultSize ? defaultSize.name : availableSizes[0].name);
      setSelectedAddons([]);
      setQuantity(1);
      setNotes('');
      setIsAboutExpanded(false);
      setIsAddedSuccess(false);
    }
  }, [product, availableSizes]);

  // Bloqueia scroll do fundo e fecha com tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const currentSizeOption =
    availableSizes.find((s) => s.name === selectedSizeName) || availableSizes[0];

  const basePrice = currentSizeOption ? currentSizeOption.price : (Number(product.price) || 0);
  const addonsTotal = selectedAddons.reduce((acc, a) => acc + (Number(a.price) || 0), 0);
  const unitPrice = basePrice + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const toggleAddon = (addon: ProductAddonOption) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const handleDecreaseQty = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncreaseQty = () => {
    setQuantity((prev) => {
      if (prev >= product.stockQuantity) return prev;
      return prev + 1;
    });
  };

  const buildConfiguredItem = (): ConfiguredCartItem => ({
    product,
    selectedSize: currentSizeOption ? currentSizeOption.name : undefined,
    selectedAddons,
    quantity,
    notes: notes.trim() || undefined,
    unitPrice,
  });

  const handleAdd = () => {
    onAddToCart(buildConfiguredItem());
    setIsAddedSuccess(true);
    setTimeout(() => {
      setIsAddedSuccess(false);
      onClose();
    }, 550);
  };

  const volumeDisplay = currentSizeOption ? currentSizeOption.volumeLabel : '160 ml';

  return (
    /* TELA CHEIA (FULLSCREEN): Ocupa 100% da viewport */
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#faf9f6] text-[#2c2420] overflow-y-auto overflow-x-hidden animate-in fade-in duration-200"
    >
      <div className="relative min-h-screen max-w-2xl mx-auto flex flex-col justify-between pb-28">
        <div>
          {/* ===================== TOPO ESCURO EM DEGRADÊ COM CURVATURA ===================== */}
          {/* Note: overflow-visible para permitir que o prato do café ultrapasse e saia da borda do card! */}
          <div className="relative bg-gradient-to-b from-[#24130b] via-[#331c11] to-[#3f2418] pt-6 pb-20 sm:pb-24 px-6 sm:px-10 rounded-b-[52px] sm:rounded-b-[64px] shadow-md overflow-visible">
            {/* Barra de Navegação Superior (Voltar) */}
            <div className="relative z-30 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                aria-label="Voltar ao cardápio"
                className="w-12 h-12 rounded-full border border-white/30 bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition cursor-pointer shadow-md"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.4]" />
              </button>
            </div>

            {/* ========================================================================= */}
            {/* O ITEM FLUTUANDO SOBRE A BORDA DO CARD SUPERIOR E INFERIOR                */}
            {/* ========================================================================= */}
            <div className="relative z-20 flex justify-center -mb-28 sm:-mb-36 mt-4 sm:mt-6">
              <div className="relative w-64 h-64 sm:w-76 sm:h-76 md:w-80 md:h-80 flex items-center justify-center">
                {(() => {
                  const displayImage = product.cutoutImageUrl || product.imageUrl || '';
                  const isCutout =
                    Boolean(product.cutoutImageUrl) ||
                    (typeof displayImage === 'string' &&
                      (displayImage.startsWith('data:image/png') ||
                        displayImage.startsWith('data:image/webp') ||
                        displayImage.endsWith('.png') ||
                        displayImage.endsWith('.webp')));

                  if (isCutout) {
                    return (
                      <div className="w-full h-full flex items-center justify-center filter drop-shadow-[0_24px_38px_rgba(0,0,0,0.38)]">
                        <GourmetCutoutImage
                          src={displayImage}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="w-full h-full rounded-full bg-[#fbf9f6] border-[6px] sm:border-[8px] border-[#ede8e1] shadow-[0_28px_45px_rgba(0,0,0,0.38),0_12px_22px_rgba(0,0,0,0.18)] overflow-hidden flex items-center justify-center p-1.5">
                      <img
                        src={displayImage}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ===================== CONTEÚDO PRINCIPAL (BRANCO / CREME) ===================== */}
          {/* pt-32 para compensar o café que transborda e sai da borda do card superior */}
          <div className="px-6 sm:px-10 pt-32 sm:pt-40 space-y-6">
            
            {/* Badge de Avaliação (Estrela + 4.8) posicionado logo abaixo do prato */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-1.5 bg-[#f4ebe1] text-[#935e32] px-3.5 py-1.5 rounded-full text-xs font-extrabold shadow-2xs">
                <Star className="w-4 h-4 fill-[#d97706] text-[#d97706]" />
                <span className="text-sm">4.8</span>
                <span className="text-stone-400 font-medium text-xs ml-1">(140+ avaliações)</span>
              </div>

              {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
                <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  Últimas {product.stockQuantity} un.
                </span>
              )}
            </div>

            {/* Nome do Produto & Preço (Layout idêntico à imagem de referência) */}
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="font-extrabold text-2xl sm:text-3xl md:text-4xl text-[#231b15] tracking-tight leading-tight">
                {product.name}
              </h1>
              <div className="text-2xl sm:text-3xl font-black text-[#231b15] shrink-0 tracking-tight">
                {formatCurrencyBRL(unitPrice)}
              </div>
            </div>

            {/* ===================== SELEÇÃO DE TAMANHO (COFFEE SIZE) ===================== */}
            <div className="space-y-2.5">
              <span className="text-sm font-bold text-[#231b15] block">Coffee size</span>
              <div className="grid grid-cols-3 gap-3">
                {availableSizes.map((sz) => {
                  const isSelected = sz.name === selectedSizeName;
                  return (
                    <button
                      key={sz.name}
                      type="button"
                      onClick={() => setSelectedSizeName(sz.name)}
                      className={`py-3.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 text-center cursor-pointer flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-[#850D2C] text-white shadow-md shadow-[#850D2C]/30 scale-[1.02]'
                          : 'bg-[#f4f3ef] text-stone-600 hover:bg-stone-200/80'
                      }`}
                    >
                      <span className="capitalize">{sz.name}</span>
                      <span
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? 'text-rose-100 font-medium' : 'text-stone-400'
                        }`}
                      >
                        {sz.volumeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ===================== ADICIONAIS & PERSONALIZAÇÃO ===================== */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#231b15] flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-[#850D2C]" />
                  <span>Adicionais & Personalização</span>
                </span>
                <span className="text-xs text-stone-400 font-medium">Opcional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableAddons.map((addon) => {
                  const isChecked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon)}
                      className={`p-3 rounded-2xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-[#850D2C]/5 border-[#850D2C] text-[#2c1d11] ring-1 ring-[#850D2C]/30 shadow-xs'
                          : 'bg-[#f8f7f4] border-stone-200/80 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition ${
                            isChecked ? 'bg-[#850D2C] text-white' : 'bg-stone-200 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span className="font-semibold text-xs leading-tight">{addon.name}</span>
                      </div>
                      <span
                        className={`text-xs font-extrabold shrink-0 ${
                          isChecked ? 'text-[#850D2C]' : 'text-stone-500'
                        }`}
                      >
                        {addon.price > 0 ? `+${formatCurrencyBRL(addon.price)}` : 'Grátis'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observação / Preferência para o Barista */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-stone-700 block">
                Observação especial para o Barista
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Sem açúcar, bem quente, leite morno..."
                className="w-full px-4 py-2.5 text-xs sm:text-sm border border-stone-200 bg-white rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#850D2C]"
              />
            </div>

            {/* ===================== SOBRE (ABOUT) ===================== */}
            <div className="space-y-1.5 pt-1">
              <span className="text-sm font-bold text-[#231b15] block">About</span>
              <p
                className={`text-xs sm:text-sm text-stone-500 leading-relaxed transition-all ${
                  isAboutExpanded ? '' : 'line-clamp-2'
                }`}
              >
                {product.description ||
                  'Cappuccino is combined with several ounces of steamed milk to create a rich, creamy beverage that has a more distinct espresso taste and velvet texture.'}
              </p>
              <button
                type="button"
                onClick={() => setIsAboutExpanded((prev) => !prev)}
                className="text-xs font-bold text-[#850D2C] hover:text-[#6e0a24] transition inline-flex items-center space-x-1 cursor-pointer"
              >
                <span>{isAboutExpanded ? 'Ver menos' : 'Read more'}</span>
                {isAboutExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* ===================== VOLUME & QUANTIDADE ===================== */}
            <div className="flex items-center justify-between pt-3 pb-4 border-t border-stone-200/80">
              <div className="flex items-center space-x-2.5">
                <span className="text-xs sm:text-sm text-stone-400 font-medium">Volume</span>
                <span className="text-sm sm:text-base font-extrabold text-[#231b15]">
                  {volumeDisplay}
                </span>
              </div>

              {/* Seletor de Quantidade idêntico ao modelo da imagem: [ - ] 2 [ + ] */}
              <div className="inline-flex items-center space-x-4 bg-[#f4f3ef] border border-stone-200/80 rounded-full px-4 py-2 shadow-2xs">
                <button
                  type="button"
                  onClick={handleDecreaseQty}
                  disabled={quantity <= 1}
                  aria-label="Diminuir quantidade"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-stone-700 hover:bg-white active:scale-90 transition disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-4 h-4 stroke-[2.5]" />
                </button>

                <span className="text-base font-black text-stone-900 min-w-5 text-center">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={handleIncreaseQty}
                  disabled={quantity >= product.stockQuantity}
                  aria-label="Aumentar quantidade"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-stone-700 hover:bg-white active:scale-90 transition disabled:opacity-30 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== BARRA INFERIOR FIXA DE AÇÃO ===================== */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#faf9f6]/95 backdrop-blur-md px-6 py-4 border-t border-stone-200/80 z-40">
          <div className="max-w-2xl mx-auto flex items-center space-x-4">
            {/* Botão de Sacola / Carrinho com Badge */}
            <button
              type="button"
              onClick={() => {
                if (onOpenCart) onOpenCart();
                else onClose();
              }}
              aria-label="Ver sacola de pedidos"
              className="relative w-14 h-14 rounded-full bg-[#f4f3ee] border border-stone-200 flex items-center justify-center text-stone-800 hover:bg-stone-200 active:scale-95 transition cursor-pointer shadow-xs shrink-0"
            >
              <ShoppingBag className="w-6 h-6 stroke-[2]" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#850D2C] text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Botão Principal de Adicionar / Comprar agora */}
            <button
              type="button"
              onClick={handleAdd}
              disabled={product.stockQuantity <= 0}
              className={`flex-1 py-4 px-8 rounded-full font-bold text-sm sm:text-base text-white transition-all shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer ${
                isAddedSuccess
                  ? 'bg-emerald-600 shadow-emerald-900/20'
                  : 'bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] shadow-[#850D2C]/30'
              }`}
            >
              {isAddedSuccess ? (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>Adicionado com Sucesso!</span>
                </>
              ) : (
                <>
                  <span>Buy now</span>
                  <span className="opacity-60">•</span>
                  <span>{formatCurrencyBRL(totalPrice)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
