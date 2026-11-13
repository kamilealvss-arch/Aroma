import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Coffee,
  ShoppingBag,
  ShoppingCart,
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
  SlidersHorizontal,
  Clock,
  Flame,
  Trash2,
  Edit3,
  User,
  MapPin,
} from 'lucide-react';
import { Product, Order, PaymentMethod } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import { OrderReceiptModal } from './OrderReceiptModal.tsx';
import {
  ProductDetailModal,
  ConfiguredCartItem,
  getProductAvailableAddons,
  ProductAddonOption,
} from './ProductDetailModal.tsx';
import { GourmetCutoutImage } from './GourmetCutoutImage.tsx';
import { getAllSubcategoriesForCategory } from './ProductModal.tsx';

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

const computeItemUnitPrice = (
  product: Product,
  selectedSize?: string,
  selectedAddons?: Array<{ id: string; name: string; price: number }>
): number => {
  let basePrice = Number(product.price) || 0;

  if (selectedSize) {
    if (product.hasSizes && product.sizes && product.sizes.length > 0) {
      const found = product.sizes.find((s) => s.name === selectedSize);
      if (found) basePrice = Number(found.price) || 0;
    } else {
      const category = product.category || '';
      const name = product.name?.toLowerCase() || '';
      const isBeverage =
        category === 'Cafés Especiais' ||
        category === 'Bebidas Geladas' ||
        name.includes('café') ||
        name.includes('cappuccino') ||
        name.includes('latte') ||
        name.includes('chá');

      if (isBeverage) {
        if (selectedSize === 'Small' || selectedSize === 'Pequeno') basePrice = Number((basePrice * 0.85).toFixed(2));
        else if (selectedSize === 'Medium' || selectedSize === 'Médio') basePrice = basePrice;
        else if (selectedSize === 'Large' || selectedSize === 'Grande') basePrice = Number((basePrice * 1.35).toFixed(2));
      } else {
        if (selectedSize === 'Combo Duplo') basePrice = Number((basePrice * 1.85).toFixed(2));
      }
    }
  }

  const addonsTotal = (selectedAddons || []).reduce(
    (sum, a) => sum + (Number(a.price) || 0),
    0
  );

  return Number((basePrice + addonsTotal).toFixed(2));
};

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
  selectedSubcategory?: string;
  onSelectSubcategory?: (subcategory: string) => void;
  onBackToAdmin?: () => void;
}

interface HorizontalCategoryRowProps {
  category: string;
  products: Product[];
  renderCard: (product: Product, isHorizontal?: boolean) => React.ReactNode;
  onSelectCategory: (category: string) => void;
  onSelectSubcategory?: (category: string, subcategory: string) => void;
}

const HorizontalCategoryRow: React.FC<HorizontalCategoryRowProps> = ({
  category,
  products,
  renderCard,
  onSelectCategory,
  onSelectSubcategory,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const rowSubcategories = useMemo(() => {
    return getAllSubcategoriesForCategory(category, products);
  }, [category, products]);

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
          <span className="hidden sm:inline-block text-[11px] font-bold text-[#820b28] bg-[#820b28]/10 px-2.5 py-0.5 rounded-full border border-[#820b28]/20">
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

      {/* Subcategorias da Categoria */}
      {rowSubcategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 mr-1">
            Subcategorias:
          </span>
          {rowSubcategories.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => onSelectSubcategory ? onSelectSubcategory(category, sub) : onSelectCategory(category)}
              className="text-[10.5px] font-semibold text-stone-600 bg-stone-100 hover:bg-[#820b28] hover:text-white px-2.5 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              {sub}
            </button>
          ))}
        </div>
      )}

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
  selectedSubcategory = 'ALL',
  onSelectSubcategory,
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
    if (onSelectSubcategory) {
      onSelectSubcategory('ALL');
    }
    setSelectedSubcategoryFilter('ALL');
  };

  const [cartItems, setCartItems] = useState<DetailedCartItem[]>([]);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProductSizes, setSelectedProductSizes] = useState<{ [productId: string]: string }>({});
  const [favorites, setFavorites] = useState<{ [productId: string]: boolean }>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('João Silva');
  const [tableOrTakeaway, setTableOrTakeaway] = useState('Mesa 04');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment'>('cart');
  const [editingNoteCartKey, setEditingNoteCartKey] = useState<string | null>(null);
  const [editingAddonsCartKey, setEditingAddonsCartKey] = useState<string | null>(null);
  const [tempItemNote, setTempItemNote] = useState<string>('');
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

  const currentSubcategory =
    selectedSubcategory !== undefined && onSelectSubcategory
      ? selectedSubcategory
      : selectedSubcategoryFilter;

  const handleSubcategorySelect = (sub: string) => {
    if (onSelectSubcategory) {
      onSelectSubcategory(sub);
    }
    setSelectedSubcategoryFilter(sub);
  };

  useEffect(() => {
    setSelectedSubcategoryFilter('ALL');
  }, [activeCategory]);

  // Lista de subcategorias existentes na categoria ativa
  const subcategoriesInActiveCategory = useMemo(() => {
    if (activeCategory === 'HOME' || activeCategory === 'ALL') return [];
    return getAllSubcategoriesForCategory(activeCategory, activeProducts);
  }, [activeCategory, activeProducts]);

  // Produtos filtrados pela categoria e subcategoria selecionada
  const filteredProducts = activeProducts.filter((p) => {
    if (activeCategory === 'ALL') return true;
    const matchesCat = p.category === activeCategory;
    const matchesSub =
      currentSubcategory === 'ALL' || p.subcategory === currentSubcategory;
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
    setCartItems((prev) => {
      const next = prev.filter((item) => item.cartKey !== cartKey);
      if (next.length === 0) {
        setIsCheckoutOpen(false);
        setCheckoutStep('cart');
      }
      return next;
    });
  };

  const handleUpdateItemQty = (cartKey: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.cartKey !== cartKey) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stockQuantity) {
            alert(`Quantidade máxima disponível em estoque atingida (${item.product.stockQuantity} un.)`);
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter((item): item is DetailedCartItem => item !== null)
    );
  };

  const handleStartEditItemNote = (cartKey: string, currentNote: string = '') => {
    setEditingNoteCartKey(cartKey);
    setTempItemNote(currentNote);
  };

  const handleSaveItemNote = (cartKey: string, noteText: string) => {
    const trimmed = noteText.trim();
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartKey !== cartKey) return item;
        return {
          ...item,
          notes: trimmed || undefined,
        };
      })
    );
    setEditingNoteCartKey(null);
    setTempItemNote('');
  };

  const handleProceedToPayment = () => {
    if (cartItemCount === 0) return;
    if (!customerName.trim()) {
      setErrorMessage('Por favor, informe seu nome para identificação do pedido.');
      return;
    }
    setErrorMessage(null);
    setCheckoutStep('payment');
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutStep('cart');
    setEditingNoteCartKey(null);
    setEditingAddonsCartKey(null);
    setErrorMessage(null);
  };

  const handleRemoveAddonFromItem = (cartKey: string, addonId: string) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartKey !== cartKey) return item;
        const updatedAddons = (item.selectedAddons || []).filter((a) => a.id !== addonId);
        const newUnitPrice = computeItemUnitPrice(item.product, item.selectedSize, updatedAddons);
        return {
          ...item,
          selectedAddons: updatedAddons,
          unitPrice: newUnitPrice,
        };
      })
    );
  };

  const handleToggleAddonOnItem = (cartKey: string, addon: ProductAddonOption) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartKey !== cartKey) return item;
        const currentAddons = item.selectedAddons || [];
        const exists = currentAddons.some((a) => a.id === addon.id);
        const updatedAddons = exists
          ? currentAddons.filter((a) => a.id !== addon.id)
          : [...currentAddons, { id: addon.id, name: addon.name, price: addon.price }];

        const newUnitPrice = computeItemUnitPrice(item.product, item.selectedSize, updatedAddons);
        return {
          ...item,
          selectedAddons: updatedAddons,
          unitPrice: newUnitPrice,
        };
      })
    );
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

  const handleFinishOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cartItemCount === 0) return;

    if (!customerName.trim()) {
      setCheckoutStep('cart');
      setErrorMessage('Por favor, informe seu nome.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const itemsPayload = cartItems.map((item) => {
      const addonNames = item.selectedAddons?.map((a) => a.name) || [];
      return {
        productId: item.productId,
        quantity: item.quantity,
        selectedSize: item.selectedSize || undefined,
        selectedAddons: addonNames.length > 0 ? addonNames : undefined,
        addons: item.selectedAddons?.map((a) => ({ name: a.name, price: a.price })),
        unitPrice: item.unitPrice,
        notes: item.notes?.trim() || undefined,
      };
    });

    let consumptionType: Order['consumptionType'] = 'MESA';
    const tableLower = tableOrTakeaway.toLowerCase();
    if (tableLower.includes('levar')) consumptionType = 'LEVAR';
    else if (tableLower.includes('delivery')) consumptionType = 'DELIVERY';
    else if (tableLower.includes('balcão') || tableLower.includes('balcao')) consumptionType = 'BALCAO';

    try {
      const newOrder = await onCreateOrder({
        customerName: customerName.trim(),
        tableOrTakeaway,
        consumptionType,
        paymentMethod,
        items: itemsPayload,
      });

      setOrderConfirmed(newOrder);
      setActiveTrackingOrder(newOrder);
      setCartItems([]);
      setIsCheckoutOpen(false);
      setCheckoutStep('cart');
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
      subcategories: getAllSubcategoriesForCategory('Cafés Especiais', activeProducts),
    },
    {
      id: 'Salgados Artesanais',
      label: 'Salgados Artesanais',
      icon: UtensilsCrossed,
      circleBg: 'bg-[#7e8b60]',
      borderHover: 'hover:border-[#7e8b60]',
      desc: 'Pães de queijo da Canastra, croissants franceses folhados e quiches.',
      count: activeProducts.filter((p) => p.category === 'Salgados Artesanais').length,
      subcategories: getAllSubcategoriesForCategory('Salgados Artesanais', activeProducts),
    },
    {
      id: 'Doces & Bolos',
      label: 'Doces & Bolos',
      icon: Cake,
      circleBg: 'bg-[#820b28]',
      borderHover: 'hover:border-[#820b28]',
      desc: 'Tortas holandesas cremosas, bolos caseiros e brigadeiros belgas.',
      count: activeProducts.filter((p) => p.category === 'Doces & Bolos').length,
      subcategories: getAllSubcategoriesForCategory('Doces & Bolos', activeProducts),
    },
    {
      id: 'Bebidas Geladas',
      label: 'Bebidas Geladas',
      icon: GlassWater,
      circleBg: 'bg-[#7e8b60]',
      borderHover: 'hover:border-[#7e8b60]',
      desc: 'Iced caramel macchiato, cold brew artesanal e refrescos especiais.',
      count: activeProducts.filter((p) => p.category === 'Bebidas Geladas').length,
      subcategories: getAllSubcategoriesForCategory('Bebidas Geladas', activeProducts),
    },
    {
      id: 'Combos & Brunch',
      label: 'Combos & Brunch',
      icon: Package,
      circleBg: 'bg-[#924529]',
      borderHover: 'hover:border-[#924529]',
      desc: 'Combos completos para café da manhã ou tarde com economia e sabor.',
      count: activeProducts.filter((p) => p.category === 'Combos & Brunch').length,
      subcategories: getAllSubcategoriesForCategory('Combos & Brunch', activeProducts),
    },
    {
      id: 'ALL',
      label: 'Todos os Itens',
      icon: ShoppingBag,
      circleBg: 'bg-[#820b28]',
      borderHover: 'hover:border-[#820b28]',
      desc: 'Explore todo o cardápio artesanal em uma única lista completa.',
      count: activeProducts.length,
      subcategories: [],
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

                    {/* Subcategorias da Categoria no Card */}
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap gap-1.5">
                        {cat.subcategories.map((sub: string) => (
                          <span
                            key={sub}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCategorySelect(cat.id);
                              handleSubcategorySelect(sub);
                            }}
                            className="text-[10.5px] font-semibold text-stone-600 bg-stone-100/90 hover:bg-[#820b28] hover:text-white px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}
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
            <div className="space-y-4">
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
                {currentSubcategory !== 'ALL' && (
                  <>
                    <span>/</span>
                    <span className="text-stone-600 font-semibold">{currentSubcategory}</span>
                  </>
                )}
              </nav>

              {/* Título com Fonte Amarego */}
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-normal text-[#35312F] tracking-tight"
                  style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
                >
                  {activeCategory === 'ALL' ? 'Todos os Sabores Artesanais' : activeCategory}
                </h1>

                <p className="text-xs text-stone-500 mt-1">
                  {activeCategory === 'ALL'
                    ? `Mostrando ${activeProducts.length} delícias divididas por categoria horizontal. Arraste para o lado para explorar!`
                    : `Mostrando ${filteredProducts.length} ${
                        filteredProducts.length === 1 ? 'delícia disponível' : 'delícias disponíveis'
                      }${currentSubcategory !== 'ALL' ? ` em "${currentSubcategory}"` : ''}.`}
                </p>
              </div>

              {/* ========================================================
                  BARRA DE FILTRO DE SUBCATEGORIAS (ONDE O USUÁRIO CIRCULOU)
                 ======================================================== */}
              {activeCategory !== 'ALL' && subcategoriesInActiveCategory.length > 0 && (
                <div className="pt-4 border-t border-stone-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-stone-600">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#820b28]" />
                      <span>Filtrar por Subcategoria:</span>
                    </div>
                    {currentSubcategory !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => handleSubcategorySelect('ALL')}
                        className="text-xs font-semibold text-[#820b28] hover:underline cursor-pointer flex items-center space-x-1"
                      >
                        <span>Mostrar Todas ({activeProducts.filter((p) => p.category === activeCategory).length})</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
                    <button
                      type="button"
                      onClick={() => handleSubcategorySelect('ALL')}
                      className={`h-9 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 flex items-center space-x-2 shadow-2xs ${
                        currentSubcategory === 'ALL'
                          ? 'bg-[#820b28] text-white shadow-md ring-2 ring-[#820b28]/20 scale-[1.02]'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      <span>Todos</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          currentSubcategory === 'ALL'
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {activeProducts.filter((p) => p.category === activeCategory).length}
                      </span>
                    </button>

                    {subcategoriesInActiveCategory.map((sub: string) => {
                      const count = activeProducts.filter(
                        (p) => p.category === activeCategory && p.subcategory === sub
                      ).length;
                      const isSubActive = currentSubcategory === sub;

                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleSubcategorySelect(sub)}
                          className={`h-9 px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 flex items-center space-x-2 shadow-2xs ${
                            isSubActive
                              ? 'bg-[#820b28] text-white shadow-md ring-2 ring-[#820b28]/20 scale-[1.02]'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          <span>{sub}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              isSubActive
                                ? 'bg-white/20 text-white'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
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
                    onSelectSubcategory={(cat, sub) => {
                      handleCategorySelect(cat);
                      handleSubcategorySelect(sub);
                    }}
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
                      onSelectSubcategory={(cat, sub) => {
                        handleCategorySelect(cat);
                        handleSubcategorySelect(sub);
                      }}
                    />
                  );
                })}
            </div>
          ) : (
            /* ========================================================
                SUB-CENÁRIO B: CATEGORIA ESPECÍFICA (GRID DIRETO COM FILTRAGEM DINÂMICA)
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
                  Nenhum produto cadastrado nesta subcategoria
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  A subcategoria "{currentSubcategory}" ainda não possui produtos ativos no cardápio.
                </p>
                <button
                  type="button"
                  onClick={() => handleSubcategorySelect('ALL')}
                  className="px-5 py-2.5 bg-[#820b28] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#631a09] transition cursor-pointer"
                >
                  Ver todos os produtos de {activeCategory}
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Barra Flutuante de Carrinho de Compras - Estilo Pílula Vinho Oficial */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 w-auto max-w-[94vw] z-40 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-r from-[#5a0c20] via-[#6a0e28] to-[#4e091b] p-1.5 sm:p-2 pl-2 sm:pl-2.5 pr-2 sm:pr-2.5 rounded-full shadow-[0_12px_28px_rgba(40,4,12,0.40)] border border-white/15 flex items-center">
            
            {/* Círculo do Carrinho com Badge Numérico */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#f6efdd] flex items-center justify-center shadow-inner">
                <ShoppingCart className="w-5 h-5 text-[#5a0c20] stroke-[2.2]" />
              </div>
              {/* Badge do Contador de Itens */}
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-b from-[#820b28] to-[#420612] text-white font-bold text-[11px] flex items-center justify-center shadow-md ring-2 ring-[#5a0c20]">
                {cartItemCount}
              </div>
            </div>

            {/* Divisor Vertical 1 */}
            <div className="h-7 w-[1px] bg-white/20 mx-2.5 sm:mx-3 shrink-0" />

            {/* Informações: Qtd de Itens e Valor Total */}
            <div className="min-w-0 pr-1">
              <span className="text-[10px] font-bold text-[#f6efdd]/85 uppercase tracking-wider block leading-tight">
                {cartItemCount === 1 ? '1 ITEM' : `${cartItemCount} ITENS`}
              </span>
              <span className="text-base sm:text-lg font-black text-white tracking-tight leading-none block mt-0.5">
                {formatCurrencyBRL(cartTotal)}
              </span>
            </div>

            {/* Divisor Vertical 2 */}
            <div className="h-7 w-[1px] bg-white/20 mx-2.5 sm:mx-3 shrink-0" />

            {/* Botão Pílula Claro "Ver Pedido →" */}
            <button
              type="button"
              onClick={() => {
                setCheckoutStep('cart');
                setIsCheckoutOpen(true);
              }}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#f6efdd] hover:bg-[#ede3cc] active:scale-95 text-[#5a0c20] rounded-full text-xs font-extrabold shadow-md transition-all duration-200 flex items-center space-x-1.5 shrink-0 cursor-pointer"
            >
              <span>Ver Pedido</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Checkout / Carrinho de Compras em 2 Etapas (Tela Cheia no Mobile) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-stone-950/70 sm:backdrop-blur-xs overflow-hidden sm:overflow-y-auto">
          <div className="bg-[#FAF8F5] w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-stone-200/90 overflow-hidden animate-in fade-in sm:zoom-in-95 my-0 sm:my-6 flex flex-col">
            
            {/* Cabeçalho do Modal Listrado Oficial Aroma (Toldo / Tendinha da Notinha) */}
            <div 
              className="relative px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between shrink-0 shadow-xs z-20 border-b border-stone-200/60"
              style={{
                backgroundColor: '#f6efdd',
                backgroundImage: `
                  repeating-linear-gradient(
                    90deg,
                    #f6efdd 0px,
                    #f6efdd 28px,
                    #822B3B 28px,
                    #822B3B 56px
                  )
                `,
              }}
            >
              {/* Filete verde oliva no topo igual ao da notinha */}
              <div 
                className="absolute top-0 left-0 right-0 h-[4px] pointer-events-none"
                style={{ backgroundColor: '#7f8c61' }}
              />

              {/* Voltinhas da Tendinha na parte inferior do cabeçalho */}
              <div className="absolute -bottom-[10px] left-0 right-0 h-[10px] overflow-hidden leading-none z-10 pointer-events-none">
                <svg className="w-full h-[10px] block" preserveAspectRatio="none">
                  <defs>
                    <pattern id="cart-header-scallop" width="56" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 0,0 L 28,0 C 28,7 21,10 14,10 C 7,10 0,7 0,0 Z" fill="#f6efdd" />
                      <path d="M 28,0 L 56,0 C 56,7 49,10 42,10 C 35,10 28,7 28,0 Z" fill="#822B3B" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="10" fill="url(#cart-header-scallop)" />
                </svg>
              </div>

              {/* Card Flutuante de Identificação do Pedido */}
              <div className="relative z-20 flex items-center space-x-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-sm border border-stone-200/80">
                {checkoutStep === 'payment' && (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('cart')}
                    className="p-1 text-stone-600 hover:text-stone-950 rounded-lg hover:bg-stone-100 transition mr-0.5 cursor-pointer"
                    title="Voltar ao carrinho"
                  >
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#231b15] leading-tight">
                    {checkoutStep === 'cart' ? 'Meu Pedido' : 'Forma de Pagamento'}
                  </h3>
                  <div className="flex items-center space-x-1 text-[10px] text-stone-500 font-medium">
                    <span className={checkoutStep === 'cart' ? 'text-[#820b28] font-bold' : 'text-stone-600'}>
                      1. Itens ({cartItemCount})
                    </span>
                    <span>•</span>
                    <span className={checkoutStep === 'payment' ? 'text-[#820b28] font-bold' : 'text-stone-400'}>
                      2. Pagamento
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de Fechar */}
              <button
                type="button"
                onClick={handleCloseCheckout}
                className="relative z-20 p-2 text-stone-700 hover:text-stone-900 bg-white/95 backdrop-blur-md rounded-full shadow-sm hover:bg-white border border-stone-200/80 transition cursor-pointer"
                title="Fechar carrinho"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Mensagem de Erro se houver */}
            {errorMessage && (
              <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* ===================== ETAPA 1: REVISÃO DO CARRINHO ===================== */}
            {checkoutStep === 'cart' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Lista de Itens do Pedido */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Itens Selecionados ({cartItemCount})
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Personalize ou ajuste quantidades
                    </span>
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-2xl border border-stone-200/80 p-6 space-y-2">
                      <Coffee className="w-8 h-8 text-stone-300 mx-auto" />
                      <p className="text-xs font-semibold text-stone-600">Seu carrinho está vazio.</p>
                      <button
                        type="button"
                        onClick={handleCloseCheckout}
                        className="text-xs text-[#820b28] font-bold hover:underline"
                      >
                        Continuar explorando o cardápio
                      </button>
                    </div>
                  ) : (
                    cartItems.map((item) => (
                      <div
                        key={item.cartKey}
                        className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-2xs space-y-2.5 hover:border-[#820b28]/30 transition"
                      >
                        {/* Linha Superior: Imagem Redondinha / Sem fundo + Título + Preço + Exclusão */}
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                            {item.product.cutoutImageUrl ? (
                              <div className="w-full h-full flex items-center justify-center p-0.5">
                                <GourmetCutoutImage
                                  src={item.product.cutoutImageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)]"
                                />
                              </div>
                            ) : item.product.imageUrl ? (
                              <div className="w-full h-full rounded-full overflow-hidden shadow-sm border-2 border-white bg-white flex items-center justify-center">
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-full rounded-full bg-[#f6efdd] flex items-center justify-center text-[#c68e5b]">
                                <Coffee className="w-6 h-6" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1.5">
                              <h4 className="font-bold text-xs sm:text-sm text-[#231b15] leading-snug truncate">
                                {item.product.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleRemoveCartItem(item.cartKey)}
                                className="text-stone-300 hover:text-rose-600 p-1 transition rounded-lg hover:bg-rose-50 shrink-0"
                                title="Remover item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Tamanho (se houver) */}
                            {item.selectedSize && (
                              <div className="mt-1">
                                <span className="text-[10px] font-semibold text-[#820b28] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60 inline-flex items-center gap-1">
                                  <span className="text-stone-400 font-normal">Tamanho:</span> {item.selectedSize}
                                </span>
                              </div>
                            )}

                            {/* Lista de Adicionais: Um embaixo do outro */}
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                                  Adicionais selecionados:
                                </span>
                                <div className="space-y-1">
                                  {item.selectedAddons.map((addon) => (
                                    <div
                                      key={addon.id}
                                      className="flex items-center justify-between py-1 px-2.5 bg-stone-50/90 hover:bg-stone-100 rounded-lg border border-stone-200/70 text-xs transition group"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[#820b28] font-bold text-xs shrink-0">+</span>
                                        <span className="text-stone-700 font-medium truncate">
                                          {addon.name}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-[11px] font-bold text-[#820b28]">
                                          {addon.price > 0 ? `+${formatCurrencyBRL(addon.price)}` : 'Grátis'}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAddonFromItem(item.cartKey, addon.id)}
                                          className="text-stone-300 group-hover:text-stone-400 hover:!text-rose-600 p-0.5 transition rounded hover:bg-rose-50 cursor-pointer"
                                          title={`Remover ${addon.name}`}
                                        >
                                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Botão para Adicionar / Editar Adicionais */}
                            <div className="mt-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingAddonsCartKey(editingAddonsCartKey === item.cartKey ? null : item.cartKey)
                                }
                                className="text-[10px] text-[#820b28] hover:text-[#631a09] font-bold bg-[#820b28]/5 hover:bg-[#820b28]/10 border border-[#820b28]/20 px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
                                title="Adicionar ou alterar complementos"
                              >
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                                <span>
                                  {item.selectedAddons && item.selectedAddons.length > 0 ? 'Adicionar mais complementos' : 'Adicionar complementos'}
                                </span>
                              </button>
                            </div>

                            {/* Gaveta compacta de seleção de adicionais */}
                            {editingAddonsCartKey === item.cartKey && (
                              <div className="mt-2 p-2.5 bg-[#FAF8F5] border border-stone-200/80 rounded-xl space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                    Adicionais disponíveis
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingAddonsCartKey(null)}
                                    className="text-[10px] text-stone-400 hover:text-stone-700 font-medium cursor-pointer"
                                  >
                                    Concluir ✕
                                  </button>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                  {getProductAvailableAddons(item.product).map((addon) => {
                                    const isSelected = item.selectedAddons?.some((a) => a.id === addon.id);
                                    return (
                                      <button
                                        key={addon.id}
                                        type="button"
                                        onClick={() => handleToggleAddonOnItem(item.cartKey, addon)}
                                        className={`text-[10px] sm:text-[11px] px-2.5 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 cursor-pointer ${
                                          isSelected
                                            ? 'bg-[#820b28] text-white border-[#820b28] shadow-2xs'
                                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                                        }`}
                                      >
                                        <span>{addon.name}</span>
                                        <span
                                          className={`text-[10px] font-bold ${
                                            isSelected ? 'text-rose-100' : 'text-[#820b28]'
                                          }`}
                                        >
                                          {addon.price > 0 ? `+${formatCurrencyBRL(addon.price)}` : 'Grátis'}
                                        </span>
                                        {isSelected ? (
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        ) : (
                                          <Plus className="w-3 h-3" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Observação Individual do Item para o Barista */}
                        <div className="pt-1 border-t border-stone-100">
                          {editingNoteCartKey === item.cartKey ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="text"
                                autoFocus
                                value={tempItemNote}
                                onChange={(e) => setTempItemNote(e.target.value)}
                                placeholder="Ex: Sem açúcar, bem quente, leite morno..."
                                className="flex-1 text-xs px-2.5 py-1.5 border border-[#820b28]/50 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#820b28]"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveItemNote(item.cartKey, tempItemNote);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveItemNote(item.cartKey, tempItemNote)}
                                className="px-2.5 py-1.5 bg-[#820b28] text-white text-[11px] font-bold rounded-lg hover:bg-[#631a09] transition"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNoteCartKey(null)}
                                className="px-2 py-1.5 text-stone-500 hover:text-stone-800 text-[11px] font-medium"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : item.notes ? (
                            <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 rounded-lg px-2.5 py-1 text-xs">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="font-bold text-[#820b28] text-[10px] uppercase shrink-0">Obs:</span>
                                <span className="text-stone-700 truncate font-medium">{item.notes}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartEditItemNote(item.cartKey, item.notes || '')}
                                className="text-stone-400 hover:text-[#820b28] p-1 ml-1 transition shrink-0"
                                title="Editar observação deste item"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEditItemNote(item.cartKey, '')}
                              className="text-[11px] text-[#820b28] hover:text-[#631a09] font-medium flex items-center gap-1 transition py-0.5"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Observação para o barista</span>
                            </button>
                          )}
                        </div>

                        {/* Linha Inferior: Controle de Quantidade [- 1 +] e Preço */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="inline-flex items-center bg-stone-100 rounded-xl p-1 gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.cartKey, -1)}
                              className="w-7 h-7 rounded-lg bg-white text-stone-700 shadow-2xs flex items-center justify-center hover:bg-stone-50 active:scale-95 transition cursor-pointer"
                              title="Diminuir quantidade"
                            >
                              <Minus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                            <span className="w-7 text-center font-bold text-xs text-stone-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.cartKey, 1)}
                              disabled={item.quantity >= item.product.stockQuantity}
                              className="w-7 h-7 rounded-lg bg-[#820b28] text-white shadow-2xs flex items-center justify-center hover:bg-[#631a09] active:scale-95 transition disabled:opacity-40 cursor-pointer"
                              title="Aumentar quantidade"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-extrabold text-[#231b15]">
                              {formatCurrencyBRL(item.unitPrice * item.quantity)}
                            </span>
                            {item.quantity > 1 && (
                              <span className="block text-[10px] text-stone-400">
                                {formatCurrencyBRL(item.unitPrice)} un.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bloco de Identificação & Local de Atendimento */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                    Identificação do Atendimento
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Seu Nome *
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Ex: Beatriz Lima"
                          className="w-full pl-8 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#820b28] focus:outline-none bg-stone-50/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Local de Atendimento *
                      </label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={tableOrTakeaway}
                          onChange={(e) => setTableOrTakeaway(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-[#820b28] focus:outline-none bg-stone-50/50"
                        >
                          <option value="Mesa 01">Mesa 01 (Salão)</option>
                          <option value="Mesa 02">Mesa 02 (Salão)</option>
                          <option value="Mesa 03">Mesa 03 (Jardim)</option>
                          <option value="Mesa 04">Mesa 04 (Varanda)</option>
                          <option value="Balcão / Viagem">Balcão / Retirada Rápida</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== ETAPA 2: FORMA DE PAGAMENTO ===================== */}
            {checkoutStep === 'payment' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Resumo Compacto do Pedido */}
                <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-stone-400 block font-medium uppercase tracking-wider">
                      Pedido para
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-[#231b15]">
                      {customerName || 'Cliente Balcão'} • <span className="text-[#820b28]">{tableOrTakeaway}</span>
                    </h4>
                    <span className="text-[11px] text-stone-500">
                      {cartItemCount} {cartItemCount === 1 ? 'item selecionado' : 'itens selecionados'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block font-medium uppercase tracking-wider">
                      Total
                    </span>
                    <span className="text-lg font-black text-[#231b15]">
                      {formatCurrencyBRL(cartTotal)}
                    </span>
                  </div>
                </div>

                {/* Seleção da Forma de Pagamento */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Como deseja pagar?
                  </label>

                  <div className="space-y-2.5">
                    {/* Opção 1: PIX */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PIX')}
                      className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        paymentMethod === 'PIX'
                          ? 'bg-white border-[#820b28] ring-2 ring-[#820b28]/20 shadow-xs'
                          : 'bg-white/70 border-stone-200/80 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            paymentMethod === 'PIX'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs sm:text-sm text-[#231b15]">
                              PIX Instantâneo
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Aprovação Imediata
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 block mt-0.5">
                            QR Code e Chave Copia e Cola no comprovante
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                          paymentMethod === 'PIX'
                            ? 'border-[#820b28] bg-[#820b28] text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {paymentMethod === 'PIX' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Opção 2: Cartão de Crédito / Débito */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Cartão de Crédito')}
                      className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        paymentMethod === 'Cartão de Crédito'
                          ? 'bg-white border-[#820b28] ring-2 ring-[#820b28]/20 shadow-xs'
                          : 'bg-white/70 border-stone-200/80 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            paymentMethod === 'Cartão de Crédito'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-[#231b15] block">
                            Cartão (Crédito ou Débito)
                          </span>
                          <span className="text-[11px] text-stone-500 block mt-0.5">
                            Pagamento na maquininha sem contato ao receber
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                          paymentMethod === 'Cartão de Crédito'
                            ? 'border-[#820b28] bg-[#820b28] text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {paymentMethod === 'Cartão de Crédito' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>

                    {/* Opção 3: Dinheiro */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('Dinheiro')}
                      className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        paymentMethod === 'Dinheiro'
                          ? 'bg-white border-[#820b28] ring-2 ring-[#820b28]/20 shadow-xs'
                          : 'bg-white/70 border-stone-200/80 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            paymentMethod === 'Dinheiro'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-[#231b15] block">
                            Dinheiro
                          </span>
                          <span className="text-[11px] text-stone-500 block mt-0.5">
                            Pagamento no caixa ou na entrega
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                          paymentMethod === 'Dinheiro'
                            ? 'border-[#820b28] bg-[#820b28] text-white'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {paymentMethod === 'Dinheiro' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé Fixo do Modal */}
            <div className="p-4 sm:p-5 pb-7 sm:pb-5 bg-white border-t border-stone-200/80 flex items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-[11px] text-stone-400 block font-medium uppercase tracking-wider">
                  Total a Pagar
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#231b15] tracking-tight">
                  {formatCurrencyBRL(cartTotal)}
                </span>
              </div>

              {checkoutStep === 'cart' ? (
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={cartItemCount === 0}
                  className="px-6 py-3 bg-[#820b28] hover:bg-[#631a09] active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-[#820b28]/25 transition flex items-center space-x-2 disabled:opacity-40 cursor-pointer"
                >
                  <span>Avançar para Pagamento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFinishOrder()}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-[#820b28] hover:bg-[#631a09] active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-[#820b28]/25 transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Registrando Pedido...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Confirmar Pedido</span>
                    </>
                  )}
                </button>
              )}
            </div>

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
          setCheckoutStep('cart');
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
          setCheckoutStep('cart');
          setIsCheckoutOpen(true);
        }}
      />
    </div>
  );
};
