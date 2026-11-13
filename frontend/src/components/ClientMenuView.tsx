import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Coffee,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  AlertCircle,
  X,
  Sparkles,
  QrCode,
  CreditCard,
  Banknote,
  ArrowRight,
  ArrowLeft,
  UtensilsCrossed,
  Cake,
  GlassWater,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Product, Order, PaymentMethod } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import { OrderReceiptModal } from './OrderReceiptModal.tsx';
import { ProductDetailModal, ConfiguredCartItem } from './ProductDetailModal.tsx';
import { GourmetCutoutImage } from './GourmetCutoutImage.tsx';

export interface DetailedCartItem {
  cartKey: string;
  productId: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedAddons?: Array<{ id: string; name: string; price: number }>;
  notes?: string;
  unitPrice: number;
}

interface ClientMenuViewProps {
  products: Product[];
  orders?: Order[];
  onCreateOrder: (data: {
    customerName: string;
    customerPhone?: string;
    tableOrTakeaway: string;
    consumptionType?: Order['consumptionType'];
    notes?: string;
    paymentMethod: PaymentMethod;
    items: Array<{
      productId: string;
      quantity: number;
      notes?: string;
      selectedSize?: string;
      selectedAddons?: string[];
      addons?: Array<{ name: string; price: number }>;
      unitPrice?: number;
    }>;
  }) => Promise<Order>;
  onOrderSuccess: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onBackToAdmin?: () => void;
}

interface HorizontalCategoryRowProps {
  category: string;
  products: Product[];
  renderCard: (product: Product, isHorizontal?: boolean) => React.ReactNode;
  onSelectCategory: (category: string) => void;
}

const HorizontalCategoryRow: React.FC<HorizontalCategoryRowProps> = ({
  category,
  products,
  renderCard,
  onSelectCategory,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Arraste com o mouse
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [products]);

  const scrollByAmount = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="space-y-2 pt-2">
      {/* Cabeçalho da Linha com Título e Controles */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
        <div className="flex items-center space-x-3">
          <h2
            className="text-xl sm:text-2xl font-normal text-[#35312F] tracking-tight"
            style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
          >
            {category}
          </h2>
          <span className="text-[11px] font-bold text-[#820b28] bg-[#820b28]/10 px-2.5 py-0.5 rounded-full border border-[#820b28]/20">
            {products.length} {products.length === 1 ? 'opção' : 'opções'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Botões de Navegação Horizontal */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => scrollByAmount(-330)}
              disabled={!canScrollLeft}
              className="w-8 h-8 rounded-full bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition shadow-2xs cursor-pointer"
              title="Rolar para a esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount(330)}
              disabled={!canScrollRight}
              className="w-8 h-8 rounded-full bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition shadow-2xs cursor-pointer"
              title="Rolar para a direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectCategory(category)}
            className="text-xs font-bold text-[#820b28] hover:underline cursor-pointer flex items-center space-x-1 pl-1"
          >
            <span>Ver tudo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fileira Horizontal Arrastável */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="flex items-stretch space-x-6 overflow-x-auto scrollbar-none pt-20 pb-6 px-1 cursor-grab active:cursor-grabbing select-none scroll-smooth"
        style={{ scrollSnapType: 'x proximity' }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[285px] sm:w-[315px] shrink-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            {renderCard(product, true)}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ClientMenuView: React.FC<ClientMenuViewProps> = ({
  products,
  orders = [],
  onCreateOrder,
  onOrderSuccess,
  selectedCategory = 'HOME',
  onSelectCategory,
  onBackToAdmin,
}) => {
  // Apenas produtos ATIVOS são exibidos para o cliente (cumpre o Requisito 4 de Exclusão Lógica!)
  const activeProducts = products.filter((p) => p.status === 'ativo');

  const [internalCategory, setInternalCategory] = useState<string>('HOME');
  const activeCategory = selectedCategory !== undefined ? selectedCategory : internalCategory;

  const handleCategorySelect = (cat: string) => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    } else {
      setInternalCategory(cat);
    }
  };

  const [cartItems, setCartItems] = useState<DetailedCartItem[]>([]);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProductSizes, setSelectedProductSizes] = useState<{ [productId: string]: string }>({});
  const [favorites, setFavorites] = useState<{ [productId: string]: boolean }>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('João Silva');
  const [tableOrTakeaway, setTableOrTakeaway] = useState('Mesa 04');
  const [orderNotes, setOrderNotes] = useState('S/ Açúcar por favor, bem quente!');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<Order | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeOrders = orders.filter((o) => o.status !== 'entregue' && o.status !== 'cancelado');

  // Pedido em acompanhamento em tempo real sincronizado com a tela do barista
  const liveOrder = activeTrackingOrderId
    ? orders.find((o) => o.id === activeTrackingOrderId) || null
    : activeTrackingOrder
    ? orders.find((o) => o.id === activeTrackingOrder.id) || activeTrackingOrder
    : orders.find((o) => o.customerName.toLowerCase() === customerName.toLowerCase() && o.status !== 'entregue' && o.status !== 'cancelado') || activeOrders[0] || null;

  // Notificação sonora quando o barista finaliza o pedido (vai para 'pronto')
  const previousStatusRef = useRef<string | undefined>(liveOrder?.status);
  useEffect(() => {
    if (liveOrder && previousStatusRef.current && previousStatusRef.current !== 'pronto' && liveOrder.status === 'pronto') {
      try {
        import('../utils/sound.ts').then((mod) => mod.playChimeSound());
      } catch (e) {
        console.debug('Som indisponível:', e);
      }
    }
    previousStatusRef.current = liveOrder?.status;
  }, [liveOrder?.status]);

  // Subcategoria ativa para filtro no cardápio
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    setSelectedSubcategoryFilter('ALL');
  }, [activeCategory]);

  // Lista de subcategorias existentes na categoria ativa
  const subcategoriesInActiveCategory = useMemo(() => {
    if (activeCategory === 'HOME' || activeCategory === 'ALL') return [];
    const prods = activeProducts.filter((p) => p.category === activeCategory);
    return Array.from(
      new Set(prods.map((p) => p.subcategory).filter((s): s is string => Boolean(s)))
    );
  }, [activeCategory, activeProducts]);

  // Produtos filtrados pela categoria e subcategoria selecionada
  const filteredProducts = activeProducts.filter((p) => {
    if (activeCategory === 'ALL') return true;
    const matchesCat = p.category === activeCategory;
    const matchesSub =
      selectedSubcategoryFilter === 'ALL' || p.subcategory === selectedSubcategoryFilter;
    return matchesCat && matchesSub;
  });

  // Especial da Semana (destaque do Cappuccino Italiano ou primeiro café gourmet)
  const specialProduct =
    activeProducts.find((p) => p.id === 'prod_cappuccino') ||
    activeProducts.find((p) => p.category === 'Cafés Especiais') ||
    activeProducts[0];

  // Combos & Brunch disponíveis
  const comboProducts = activeProducts.filter((p) => p.category === 'Combos & Brunch');

  // Mais pedidos para a Home
  const topFavorites = activeProducts
    .filter((p) => p.id !== specialProduct?.id)
    .slice(0, 3);

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Abre a tela de detalhes do produto
  const handleOpenProductDetail = (product: Product) => {
    if (product.stockQuantity <= 0) return;
    setSelectedProductForDetail(product);
    setIsDetailModalOpen(true);
  };

  // Adiciona item customizado a partir do Modal Gourmet de Detalhes
  const handleAddFromDetailModal = (configured: ConfiguredCartItem) => {
    const sortedAddonIds = [...configured.selectedAddons].map((a) => a.id).sort().join('_');
    const sizeKey = configured.selectedSize || 'default';
    const notesKey = configured.notes || '';
    const cartKey = `${configured.product.id}__${sizeKey}__${sortedAddonIds}__${notesKey}`;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.cartKey === cartKey);
      if (existingIdx !== -1) {
        const currentQty = prev[existingIdx].quantity;
        const newQty = currentQty + configured.quantity;
        if (newQty > configured.product.stockQuantity) {
          alert(`Quantidade máxima disponível em estoque atingida (${configured.product.stockQuantity} un.)`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
        };
        return updated;
      }
      return [
        ...prev,
        {
          cartKey,
          productId: configured.product.id,
          product: configured.product,
          quantity: configured.quantity,
          selectedSize: configured.selectedSize,
          selectedAddons: configured.selectedAddons,
          notes: configured.notes,
          unitPrice: configured.unitPrice,
        },
      ];
    });
  };

  const handleRemoveCartItem = (cartKey: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const handleDecreaseProductQty = (productId: string) => {
    setCartItems((prev) => {
      const targetIdx = prev.map((item, idx) => ({ item, idx })).filter((x) => x.item.productId === productId).pop()?.idx;
      if (targetIdx === undefined) return prev;
      const target = prev[targetIdx];
      if (target.quantity > 1) {
        const updated = [...prev];
        updated[targetIdx] = { ...target, quantity: target.quantity - 1 };
        return updated;
      } else {
        return prev.filter((_, idx) => idx !== targetIdx);
      }
    });
  };

  const handleFinishOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItemCount === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const itemsPayload = cartItems.map((item) => {
      const addonSummary =
        item.selectedAddons && item.selectedAddons.length > 0
          ? `Adicionais: ${item.selectedAddons.map((a) => a.name).join(', ')}`
          : '';
      const combinedNotes = [addonSummary, item.notes].filter(Boolean).join(' | ');

      return {
        productId: item.productId,
        quantity: item.quantity,
        selectedSize: item.selectedSize || undefined,
        selectedAddons: item.selectedAddons?.map((a) => a.name),
        addons: item.selectedAddons?.map((a) => ({ name: a.name, price: a.price })),
        unitPrice: item.unitPrice,
        notes: combinedNotes || undefined,
      };
    });

    let consumptionType: Order['consumptionType'] = 'MESA';
    const tableLower = tableOrTakeaway.toLowerCase();
    if (tableLower.includes('levar')) consumptionType = 'LEVAR';
    else if (tableLower.includes('delivery')) consumptionType = 'DELIVERY';
    else if (tableLower.includes('balcão')) consumptionType = 'BALCAO';

    try {
      const newOrder = await onCreateOrder({
        customerName: customerName.trim() || 'Cliente Balcão',
        tableOrTakeaway,
        consumptionType,
        notes: orderNotes.trim() || undefined,
        paymentMethod,
        items: itemsPayload,
      });

      setOrderConfirmed(newOrder);
      setActiveTrackingOrder(newOrder);
      setCartItems([]);
      setIsCheckoutOpen(false);
      onOrderSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Configuração das Categorias Gerais para a Landing Page
  const generalCategories = [
    {
      id: 'Cafés Especiais',
      label: 'Cafés Especiais',
      icon: Coffee,
      circleBg: 'bg-[#924529]',
      borderHover: 'hover:border-[#924529]',
      desc: 'Grãos 100% arábica da Mogiana, expressos encorpados e métodos filtrados.',
      count: activeProducts.filter((p) => p.category === 'Cafés Especiais').length,
    },
    {
      id: 'Salgados Artesanais',
      label: 'Salgados Artesanais',
      icon: UtensilsCrossed,
      circleBg: 'bg-[#7e8b60]',
      borderHover: 'hover:border-[#7e8b60]',
      desc: 'Pães de queijo da Canastra, croissants franceses folhados e quiches.',
      count: activeProducts.filter((p) => p.category === 'Salgados Artesanais').length,
    },
    {
      id: 'Doces & Bolos',
      label: 'Doces & Bolos',
      icon: Cake,
      circleBg: 'bg-[#820b28]',
      borderHover: 'hover:border-[#820b28]',
      desc: 'Tortas holandesas cremosas, bolos caseiros e brigadeiros belgas.',
      count: activeProducts.filter((p) => p.category === 'Doces & Bolos').length,
    },
    {
      id: 'Bebidas Geladas',
      label: 'Bebidas Geladas',
      icon: GlassWater,
      circleBg: 'bg-[#7e8b60]',
      borderHover: 'hover:border-[#7e8b60]',
      desc: 'Iced caramel macchiato, cold brew artesanal e refrescos especiais.',
      count: activeProducts.filter((p) => p.category === 'Bebidas Geladas').length,
    },
    {
      id: 'Combos & Brunch',
      label: 'Combos & Brunch',
      icon: Package,
      circleBg: 'bg-[#924529]',
      borderHover: 'hover:border-[#924529]',
      desc: 'Combos completos para café da manhã ou tarde com economia e sabor.',
      count: activeProducts.filter((p) => p.category === 'Combos & Brunch').length,
    },
    {
      id: 'ALL',
      label: 'Todos os Itens',
      icon: ShoppingBag,
      circleBg: 'bg-[#820b28]',
      borderHover: 'hover:border-[#820b28]',
      desc: 'Explore todo o cardápio artesanal em uma única lista completa.',
      count: activeProducts.length,
    },
  ];

  // Ordem de apresentação das categorias na visualização horizontal de TODOS
  const categoryOrder = [
    'Cafés Especiais',
    'Salgados Artesanais',
    'Doces & Bolos',
    'Bebidas Geladas',
    'Combos & Brunch',
  ];

  // Helper para renderizar card padrão de produto
  const renderProductCard = (product: Product, isHorizontal = false) => {
    const isOutOfStock = product.stockQuantity <= 0;
    const cardImage = product.cutoutImageUrl || product.imageUrl || '';
    const isTransparentCutout =
      Boolean(product.cutoutImageUrl) ||
      (typeof cardImage === 'string' &&
        (cardImage.startsWith('data:image/png') || cardImage.startsWith('data:image/webp')));

    const hasSizes = !!(product.hasSizes && product.sizes && product.sizes.length > 0);
    const currentSizeName =
      selectedProductSizes[product.id] || (hasSizes ? product.sizes![0].name : undefined);
    const currentSizeOption = hasSizes
      ? product.sizes!.find((s) => s.name === currentSizeName) || product.sizes![0]
      : undefined;
    const activePrice = currentSizeOption ? currentSizeOption.price : product.price;

    const inCartQty = cartItems
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    return (
      <div
        key={product.id}
        className={`relative bg-white rounded-[34px] pt-24 sm:pt-28 pb-5 px-5 sm:px-6 border border-stone-200/90 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${
          isHorizontal ? 'h-full min-h-[390px]' : ''
        } ${isOutOfStock ? 'opacity-80' : ''}`}
      >
        {/* 1. Imagem Flutuante: Metade para fora do card */}
        <div
          onClick={() => !isOutOfStock && handleOpenProductDetail(product)}
          className={`absolute -top-14 sm:-top-16 left-1/2 -translate-x-1/2 w-38 h-38 sm:w-42 sm:h-42 z-20 flex items-center justify-center ${
            !isOutOfStock ? 'cursor-pointer' : ''
          }`}
          title={!isOutOfStock ? `Personalizar ${product.name}` : undefined}
        >
          {isTransparentCutout ? (
            <div className="w-full h-full flex items-center justify-center p-0.5">
              <GourmetCutoutImage
                src={cardImage}
                alt={product.name}
                className={`w-full h-full object-contain scale-95 sm:scale-100 drop-shadow-[0_14px_20px_rgba(0,0,0,0.20)] ${
                  isOutOfStock ? 'grayscale-70' : ''
                }`}
              />
            </div>
          ) : (
            <div className="w-full h-full rounded-full overflow-hidden shadow-lg border-[3.5px] border-white bg-white flex items-center justify-center">
              <img
                src={cardImage}
                alt={product.name}
                className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale-70' : ''}`}
              />
            </div>
          )}

          {isOutOfStock && (
            <span className="absolute bottom-1 bg-[#850D2C] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
              Esgotado
            </span>
          )}
        </div>

        {/* 2. Informações do Produto */}
        <div className="space-y-1.5 pt-4 sm:pt-5 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {product.subcategory ? `${product.category} • ${product.subcategory}` : product.category}
            </span>
            {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
              <span className="text-[10px] font-semibold text-[#924529] bg-amber-50 px-2 py-0.5 rounded-full">
                Últimas {product.stockQuantity} un.
              </span>
            )}
          </div>

          <h3
            onClick={() => !isOutOfStock && handleOpenProductDetail(product)}
            className={`font-extrabold text-stone-950 text-lg leading-tight tracking-tight ${
              !isOutOfStock ? 'cursor-pointer hover:text-[#c58d59] transition' : ''
            }`}
          >
            {product.name}
          </h3>

          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed min-h-[2.25rem]">
            {product.description || 'Preparo artesanal com insumos selecionados.'}
          </p>

          {/* Opções de Tamanho */}
          {hasSizes && (
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                Escolha o tamanho:
              </span>
              <div className="flex flex-wrap gap-1">
                {product.sizes!.map((sz) => {
                  const isSelected = sz.name === currentSizeName;
                  return (
                    <button
                      key={sz.name}
                      type="button"
                      onClick={() =>
                        setSelectedProductSizes((prev) => ({
                          ...prev,
                          [product.id]: sz.name,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <span>{sz.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Rodapé do Card: Preço + Ação */}
        <div className="pt-4 mt-2 border-t border-stone-100/80 flex items-center justify-between gap-3">
          <div className="text-lg font-black text-stone-950 tracking-tight">
            {formatCurrencyBRL(activePrice)}
          </div>

          {isOutOfStock ? (
            <button
              disabled
              className="h-11 px-4 bg-stone-100 text-stone-400 rounded-full text-xs font-semibold cursor-not-allowed"
            >
              Indisponível
            </button>
          ) : inCartQty > 0 ? (
            <div className="h-11 inline-flex items-center space-x-2 bg-stone-100 rounded-full px-2 shadow-2xs">
              <button
                type="button"
                onClick={() => handleDecreaseProductQty(product.id)}
                className="w-8 h-8 rounded-full bg-white text-stone-900 shadow-2xs flex items-center justify-center font-bold hover:bg-stone-50 transition cursor-pointer"
                title="Diminuir quantidade"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-extrabold text-stone-900 px-1">{inCartQty}</span>
              <button
                type="button"
                onClick={() => handleOpenProductDetail(product)}
                disabled={inCartQty >= product.stockQuantity}
                className="w-8 h-8 rounded-full bg-[#c58d59] text-white shadow-2xs flex items-center justify-center font-bold hover:bg-[#b07842] transition disabled:opacity-40 cursor-pointer"
                title="Personalizar e adicionar mais"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenProductDetail(product)}
              aria-label={`Personalizar e adicionar ${product.name} ao Pedido`}
              className="w-11 h-11 rounded-full bg-stone-950 hover:bg-[#c58d59] active:scale-95 text-white flex items-center justify-center shadow-md transition cursor-pointer"
              title="Personalizar e adicionar"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* ========================================================
          CENÁRIO 1: PÁGINA INICIAL DO CARDÁPIO (activeCategory === 'HOME')
         ======================================================== */}
      {activeCategory === 'HOME' ? (
        <div className="space-y-8">
          {/* Cabeçalho de Boas-Vindas */}
          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 text-[#35312F]">
            <div className="space-y-1">
              <nav className="flex items-center space-x-1.5 text-xs text-stone-400 font-medium">
                <span>Cardápio Digital</span>
                <span>/</span>
                <span className="text-[#850D2C] font-semibold">Experiência Gourmet</span>
              </nav>
              <h1
                className="text-2xl sm:text-3xl font-normal text-[#35312F] tracking-tight"
                style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
              >
                Sabores Artesanais & Cardápio
              </h1>
              <p className="text-xs text-stone-500">
                Navegue pelas categorias na lateral ou escolha os destaques selecionados da semana.
              </p>
            </div>
          </div>

          {/* 1. SEÇÃO "ESPECIAL DA SEMANA" (HERO HIGHLIGHT) */}
          {specialProduct && (
            <div className="relative overflow-hidden bg-gradient-to-br from-[#820b28] via-[#924529] to-[#5a1202] rounded-[36px] p-7 sm:p-10 text-white shadow-xl border border-white/10">
              {/* Círculo decorativo de iluminação suave */}
              <div
                className="pointer-events-none absolute -right-16 -top-16 w-80 h-80 bg-white/10 rounded-full blur-2xl"
                aria-hidden="true"
              />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Lado Esquerdo: Textos do Especial */}
                <div className="space-y-4 max-w-xl text-center md:text-left">
                  <h2
                    className="text-3xl sm:text-5xl font-normal tracking-tight text-white leading-tight"
                    style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
                  >
                    {specialProduct.name}
                  </h2>

                  <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed font-light">
                    {specialProduct.description ||
                      'Expresso encorpado, leite vaporizado com microespuma sedosa, cacau belga e canela em pó.'}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#fcd34d] tracking-tight">
                      {formatCurrencyBRL(specialProduct.price)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenProductDetail(specialProduct)}
                      className="px-6 py-3 bg-white text-[#820b28] hover:bg-amber-50 active:scale-95 rounded-full text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Pedir Especial da Semana</span>
                    </button>
                  </div>
                </div>

                {/* Lado Direito: Prato Flutuante com Recorte Gourmet */}
                <div
                  onClick={() => handleOpenProductDetail(specialProduct)}
                  className="relative shrink-0 w-52 h-52 sm:w-64 sm:h-64 cursor-pointer group flex items-center justify-center"
                  title={`Personalizar ${specialProduct.name}`}
                >
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative w-full h-full flex items-center justify-center">
                    <GourmetCutoutImage
                      src={specialProduct.cutoutImageUrl || specialProduct.imageUrl}
                      alt={specialProduct.name}
                      className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)] group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. SEÇÃO "CATEGORIAS GERAIS" (GRID INTERATIVO) */}
          <div className="space-y-4">
            <div className="flex items-end justify-between border-b border-stone-200/80 pb-3">
              <div>
                <h2
                  className="text-2xl font-normal text-[#35312F]"
                  style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
                >
                  Categorias Gerais
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Clique para navegar diretamente pelos sabores artesanais do cardápio
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCategorySelect('ALL')}
                className="text-xs font-bold text-[#820b28] hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>Ver tudo ({activeProducts.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generalCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`bg-white rounded-[26px] p-5 border border-stone-200/80 shadow-xs hover:shadow-md ${cat.borderHover} transition-all duration-200 cursor-pointer flex flex-col justify-between group`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`w-12 h-12 rounded-2xl ${cat.circleBg} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-6 h-6 stroke-[2]" />
                      </div>
                      <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full group-hover:bg-[#820b28] group-hover:text-white transition-colors">
                        {cat.count} {cat.count === 1 ? 'item' : 'itens'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1">
                      <h3 className="font-extrabold text-stone-900 text-base group-hover:text-[#820b28] transition-colors flex items-center justify-between">
                        <span>{cat.label}</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#820b28]" />
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. SEÇÃO "COMBOS & BRUNCH" */}
          {comboProducts.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <div>
                  <h2
                    className="text-2xl font-normal text-[#35312F]"
                    style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
                  >
                    Combos & Brunch Especial
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Combinações completas com o melhor café, salgado e doce artesanal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCategorySelect('Combos & Brunch')}
                  className="text-xs font-bold text-[#820b28] hover:underline cursor-pointer flex items-center space-x-1"
                >
                  <span>Explorar Combos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {comboProducts.map((combo) => (
                  <div
                    key={combo.id}
                    className="bg-white rounded-[30px] p-6 border border-stone-200/90 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row items-center gap-5 justify-between"
                  >
                    <div className="w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
                      <GourmetCutoutImage
                        src={combo.cutoutImageUrl || combo.imageUrl}
                        alt={combo.name}
                        className="w-full h-full object-contain drop-shadow-md hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#924529] bg-amber-50 px-2.5 py-0.5 rounded-full">
                        Combo Completo
                      </span>
                      <h3 className="font-extrabold text-stone-900 text-lg leading-snug">
                        {combo.name}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-2">
                        {combo.description}
                      </p>
                      <div className="pt-2 flex items-center justify-between gap-3">
                        <span className="text-xl font-black text-stone-950">
                          {formatCurrencyBRL(combo.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenProductDetail(combo)}
                          className="px-4 py-2 bg-stone-950 hover:bg-[#820b28] text-white rounded-full text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Pedir Combo</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SEÇÃO "MAIS PEDIDOS DO CAFÉ" */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
              <div>
                <h2
                  className="text-2xl font-normal text-[#35312F]"
                  style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
                >
                  Mais Pedidos da Cafeteria
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Os favoritos dos nossos clientes preparados na hora
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCategorySelect('ALL')}
                className="text-xs font-bold text-[#820b28] hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>Ver cardápio completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-24 pt-20">
              {topFavorites.map((product) => renderProductCard(product))}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
            CENÁRIO 2: LISTA DE PRODUTOS (activeCategory !== 'HOME')
           ======================================================== */
        <div className="space-y-6">
          {/* Cabeçalho da Categoria */}
          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 text-[#35312F]">
            <div className="space-y-1">
              {/* Breadcrumb Navegável */}
              <nav className="flex items-center space-x-1.5 text-xs text-stone-400 font-medium">
                <button
                  type="button"
                  onClick={() => handleCategorySelect('HOME')}
                  className="hover:text-[#820b28] font-bold transition cursor-pointer"
                >
                  Cardápio Início
                </button>
                <span>/</span>
                <span className="text-[#850D2C] font-semibold">
                  {activeCategory === 'ALL' ? 'Todos os Itens' : activeCategory}
                </span>
                {selectedSubcategoryFilter !== 'ALL' && (
                  <>
                    <span>/</span>
                    <span className="text-stone-600 font-semibold">{selectedSubcategoryFilter}</span>
                  </>
                )}
              </nav>

              {/* Título com Fonte Amarego */}
              <h1
                className="text-2xl sm:text-3xl font-normal text-[#35312F] tracking-tight"
                style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
              >
                {activeCategory === 'ALL' ? 'Todos os Sabores Artesanais' : activeCategory}
              </h1>

              <p className="text-xs text-stone-500">
                {activeCategory === 'ALL'
                  ? `Mostrando ${activeProducts.length} delícias divididas por categoria horizontal. Arraste para o lado para explorar!`
                  : `Mostrando ${filteredProducts.length} ${
                      filteredProducts.length === 1 ? 'delícia disponível' : 'delícias disponíveis'
                    }.`}
              </p>

              {/* Pílulas de Subcategorias da Categoria Selecionada */}
              {activeCategory !== 'ALL' && subcategoriesInActiveCategory.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategoryFilter('ALL')}
                    className={`h-7 px-3.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 ${
                      selectedSubcategoryFilter === 'ALL'
                        ? 'bg-[#820b28] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Todos
                  </button>
                  {subcategoriesInActiveCategory.map((sub: string) => {
                    const count = activeProducts.filter(
                      (p) => p.category === activeCategory && p.subcategory === sub
                    ).length;
                    const isSubActive = selectedSubcategoryFilter === sub;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSelectedSubcategoryFilter(sub)}
                        className={`h-7 px-3.5 rounded-full text-xs font-medium transition cursor-pointer shrink-0 inline-flex items-center space-x-1.5 ${
                          isSubActive
                            ? 'bg-[#820b28] text-white shadow-xs'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <span>{sub}</span>
                        {count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSubActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              SUB-CENÁRIO A: activeCategory === 'ALL'
              ARRUMADO POR COLUNAS NA HORIZONTAL POR CATEGORIA (ARRASTAR PARA O LADO)
             ======================================================== */}
          {activeCategory === 'ALL' ? (
            <div className="space-y-12">
              {categoryOrder.map((catName) => {
                const categoryProducts = activeProducts.filter((p) => p.category === catName);
                if (categoryProducts.length === 0) return null;
                return (
                  <HorizontalCategoryRow
                    key={catName}
                    category={catName}
                    products={categoryProducts}
                    renderCard={renderProductCard}
                    onSelectCategory={handleCategorySelect}
                  />
                );
              })}

              {/* Categorias adicionais não listadas na ordem padrão */}
              {Array.from(new Set(activeProducts.map((p) => p.category)))
                .filter((cat) => !categoryOrder.includes(cat))
                .map((catName) => {
                  const categoryProducts = activeProducts.filter((p) => p.category === catName);
                  if (categoryProducts.length === 0) return null;
                  return (
                    <HorizontalCategoryRow
                      key={catName}
                      category={catName}
                      products={categoryProducts}
                      renderCard={renderProductCard}
                      onSelectCategory={handleCategorySelect}
                    />
                  );
                })}
            </div>
          ) : (
            /* ========================================================
                SUB-CENÁRIO B: CATEGORIA ESPECÍFICA (GRID TRADICIONAL COMPLETO)
               ======================================================== */
            filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-24 pt-20">
                {filteredProducts.map((product) => renderProductCard(product))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/80 space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-[#924529] mx-auto flex items-center justify-center">
                  <Coffee className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-stone-800">
                  Nenhum produto encontrado nesta categoria
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Todos os itens desta categoria podem estar inativos ou fora de estoque no momento.
                </p>
                <button
                  type="button"
                  onClick={() => handleCategorySelect('HOME')}
                  className="px-5 py-2.5 bg-[#820b28] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#631a09] transition cursor-pointer"
                >
                  Voltar à Página Inicial do Cardápio
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* ========================================================
          BARRA FLUTUANTE DE CARRINHO DE COMPRAS
         ======================================================== */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 animate-in slide-in-from-bottom-6">
          <div className="bg-stone-900 text-white p-3.5 rounded-2xl shadow-2xl border border-stone-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#820b28] flex items-center justify-center font-bold text-white shadow-md">
                {cartItemCount}
              </div>
              <div>
                <span className="text-xs text-stone-400 block font-medium">Total do seu pedido:</span>
                <span className="text-base font-extrabold text-amber-100">
                  {formatCurrencyBRL(cartTotal)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 py-2 bg-[#820b28] hover:bg-[#631a09] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-rose-950/40 cursor-pointer"
            >
              <span>Ver Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE CHECKOUT / FINALIZAR PEDIDO
         ======================================================== */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-amber-100">Finalizar Pedido do Café</h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleFinishOrder} className="p-6 space-y-4">
              {/* Itens do Pedido */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                  Itens Selecionados
                </span>
                {cartItems.map((item) => (
                  <div
                    key={item.cartKey}
                    className="flex items-start justify-between text-xs py-2 border-b border-stone-50"
                  >
                    <div className="flex items-start space-x-2">
                      <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0 mt-0.5">
                        {item.quantity}x
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-stone-800">{item.product.name}</span>
                        {item.selectedSize && (
                          <span className="text-[10px] text-amber-800 font-medium">
                            Tamanho: {item.selectedSize}
                          </span>
                        )}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <span className="text-[10px] text-stone-500">
                            + {item.selectedAddons.map((a) => a.name).join(', ')}
                          </span>
                        )}
                        {item.notes && (
                          <span className="text-[10px] text-rose-700 font-medium">
                            Obs: {item.notes}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-bold text-stone-900">
                        {formatCurrencyBRL(item.unitPrice * item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.cartKey)}
                        className="text-stone-400 hover:text-rose-600 p-0.5 transition cursor-pointer"
                        title="Remover item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Informações do Cliente & Local */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Seu Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Beatriz Lima"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#820b28] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Local de Atendimento *
                  </label>
                  <select
                    value={tableOrTakeaway}
                    onChange={(e) => setTableOrTakeaway(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#820b28] focus:outline-none bg-white"
                  >
                    <option value="Mesa 01">Mesa 01 (Salão)</option>
                    <option value="Mesa 02">Mesa 02 (Salão)</option>
                    <option value="Mesa 03">Mesa 03 (Jardim)</option>
                    <option value="Mesa 04">Mesa 04 (Varanda)</option>
                    <option value="Balcão / Viagem">Balcão / Retirada Rápida</option>
                  </select>
                </div>
              </div>

              {/* Observações Cruciais */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1">
                    <span className="text-rose-600">⚠️</span>
                    <span>Observações para o Barista (Requisito Crucial)</span>
                  </label>
                  <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Aparece na comanda
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Ex: (S/ Açúcar), (Leite sem lactose), (Aquecer bem)..."
                  className="w-full px-3 py-2 text-xs font-bold text-rose-900 bg-rose-50/40 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                />

                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {['S/ Açúcar', 'Leite sem lactose', 'Aquecer bem', 'Caprichar na canela', 'Café bem quente'].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => {
                        if (!orderNotes.includes(preset)) {
                          setOrderNotes((prev) => (prev ? `${prev}, ${preset}` : preset));
                        }
                      }}
                      className="text-[10px] font-bold bg-stone-100 hover:bg-rose-100 hover:text-rose-800 text-stone-700 px-2 py-0.5 rounded-lg border border-stone-200 transition cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                  {orderNotes && (
                    <button
                      type="button"
                      onClick={() => setOrderNotes('')}
                      className="text-[10px] text-stone-400 hover:text-stone-600 underline ml-1 cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                      paymentMethod === 'PIX'
                        ? 'bg-amber-50 border-[#820b28] text-[#820b28] ring-2 ring-[#820b28]/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-1 text-emerald-600" />
                    <span>PIX Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cartão de Crédito')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                      paymentMethod === 'Cartão de Crédito'
                        ? 'bg-amber-50 border-[#820b28] text-[#820b28] ring-2 ring-[#820b28]/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1 text-sky-600" />
                    <span>Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Dinheiro')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                      paymentMethod === 'Dinheiro'
                        ? 'bg-amber-50 border-[#820b28] text-[#820b28] ring-2 ring-[#820b28]/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-1 text-amber-700" />
                    <span>Dinheiro</span>
                  </button>
                </div>
              </div>

              {/* Destaque da Regra de Negócio */}
              <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-500 border border-stone-200">
                Ao clicar em confirmar, o pedido é registrado e o sistema{' '}
                <strong>subtrai automaticamente os itens do estoque</strong> (Requisito 5 & RF04).
              </div>

              {/* Total e Botão */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <div>
                  <span className="text-[11px] text-stone-400 block font-medium">Total a Pagar</span>
                  <span className="text-xl font-extrabold text-stone-900">
                    {formatCurrencyBRL(cartTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#820b28] hover:bg-[#631a09] text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Enviando...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar Pedido</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Interativo com Simulação de Impressora Térmica e Comprovante do Pedido */}
      {orderConfirmed && (
        <OrderReceiptModal
          order={orderConfirmed}
          onClose={() => setOrderConfirmed(null)}
          onTrackOrder={(orderId) => {
            setActiveTrackingOrderId(orderId);
            setOrderConfirmed(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Modal Gourmet de Detalhes do Produto (Tamanho, Adicionais, Quantidade) */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        product={selectedProductForDetail}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={handleAddFromDetailModal}
        onBuyNow={(configured) => {
          handleAddFromDetailModal(configured);
          setIsDetailModalOpen(false);
          setIsCheckoutOpen(true);
        }}
        isFavorite={selectedProductForDetail ? !!favorites[selectedProductForDetail.id] : false}
        onToggleFavorite={(pid) =>
          setFavorites((prev) => ({
            ...prev,
            [pid]: !prev[pid],
          }))
        }
        cartItemCount={cartItemCount}
        onOpenCart={() => {
          setIsDetailModalOpen(false);
          setIsCheckoutOpen(true);
        }}
      />
    </div>
  );
};
