import React, { useState } from 'react';
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
  Clock,
  Flame,
} from 'lucide-react';
import { Product, ProductCategory, Order, PaymentMethod } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

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
    items: Array<{ productId: string; quantity: number }>;
  }) => Promise<Order>;
  onOrderSuccess: () => void;
}

export const ClientMenuView: React.FC<ClientMenuViewProps> = ({
  products,
  orders = [],
  onCreateOrder,
  onOrderSuccess,
}) => {
  // Apenas produtos ATIVOS são exibidos para o cliente (cumpre o Requisito 4 de Exclusão Lógica!)
  const activeProducts = products.filter((p) => p.status === 'ativo');

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('João Silva');
  const [tableOrTakeaway, setTableOrTakeaway] = useState('Mesa 04');
  const [orderNotes, setOrderNotes] = useState('S/ Açúcar por favor, bem quente!');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<Order | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categories = Array.from(new Set(activeProducts.map((p) => p.category)));

  const filteredProducts = activeProducts.filter((p) => {
    if (selectedCategory === 'ALL') return true;
    return p.category === selectedCategory;
  });

  const cartItemCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const cartTotal = Object.entries(cart).reduce((sum, [pId, qty]) => {
    const prod = activeProducts.find((p) => p.id === pId);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);

  const handleAddToCart = (product: Product) => {
    // Se estiver esgotado (estoque <= 0), bloqueia
    if (product.stockQuantity <= 0) return;

    const currentQty = cart[product.id] || 0;
    if (currentQty >= product.stockQuantity) {
      alert(`Quantidade máxima disponível em estoque atingida (${product.stockQuantity} un.)`);
      return;
    }

    setCart((prev) => ({
      ...prev,
      [product.id]: currentQty + 1,
    }));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[productId] > 1) {
        next[productId] -= 1;
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const handleFinishOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItemCount === 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const itemsPayload = Object.entries(cart).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

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
      setCart({});
      setIsCheckoutOpen(false);
      onOrderSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string | null>(null);

  const activeOrders = orders.filter((o) => o.status !== 'entregue' && o.status !== 'cancelado');

  // Pedido em acompanhamento em tempo real sincronizado com a tela do barista
  const liveOrder = activeTrackingOrderId
    ? orders.find((o) => o.id === activeTrackingOrderId) || null
    : activeTrackingOrder
    ? orders.find((o) => o.id === activeTrackingOrder.id) || activeTrackingOrder
    : orders.find((o) => o.customerName.toLowerCase() === customerName.toLowerCase() && o.status !== 'entregue' && o.status !== 'cancelado') || activeOrders[0] || null;

  // Notificação sonora quando o barista finaliza o pedido (vai para 'pronto')
  const previousStatusRef = React.useRef<string | undefined>(liveOrder?.status);
  React.useEffect(() => {
    if (liveOrder && previousStatusRef.current && previousStatusRef.current !== 'pronto' && liveOrder.status === 'pronto') {
      try {
        import('../utils/sound.ts').then((mod) => mod.playChimeSound());
      } catch (e) {
        console.debug('Som indisponível:', e);
      }
    }
    previousStatusRef.current = liveOrder?.status;
  }, [liveOrder?.status]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* CARD DE ACOMPANHAMENTO EM TEMPO REAL (Celular do Cliente) */}
      {liveOrder && (
        <div className="bg-white rounded-3xl p-5 border-2 border-amber-500 shadow-xl overflow-hidden animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                  liveOrder.status === 'pronto'
                    ? 'bg-emerald-600 animate-bounce'
                    : liveOrder.status === 'preparando'
                    ? 'bg-amber-600'
                    : 'bg-stone-700'
                }`}
              >
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-stone-900 text-sm">
                    Pedido #{liveOrder.orderNumber}
                  </span>
                  <span className="text-[10px] bg-stone-900 text-amber-300 font-extrabold px-2 py-0.5 rounded-md uppercase">
                    {liveOrder.tableOrTakeaway}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-xs text-stone-500">
                    Cliente: <strong>{liveOrder.customerName}</strong> • {liveOrder.items.length} itens
                  </span>
                  {activeOrders.length > 1 && (
                    <select
                      value={liveOrder.id}
                      onChange={(e) => setActiveTrackingOrderId(e.target.value)}
                      className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 rounded-lg px-2 py-0.5 cursor-pointer hover:bg-amber-100 transition"
                      title="Alternar pedido para acompanhar na tela"
                    >
                      {activeOrders.map((ord) => (
                        <option key={ord.id} value={ord.id}>
                          #{ord.orderNumber} - {ord.customerName} ({ord.status.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Status Visual com Animação para o Cliente */}
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              {liveOrder.status === 'recebido' && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  <span>1. Pedido Recebido (Na fila do barista)</span>
                </span>
              )}
              {liveOrder.status === 'preparando' && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1.5 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-amber-700" />
                  <span>2. Seu pedido está sendo preparado pelo barista!</span>
                </span>
              )}
              {liveOrder.status === 'pronto' && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-md flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>3. SEU PEDIDO ESTÁ PRONTO! Retire no balcão 🎉</span>
                </span>
              )}
              {liveOrder.status === 'entregue' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
                  Pedido Entregue • Bom Apetite!
                </span>
              )}
            </div>
          </div>

          {/* Observações Registradas */}
          {liveOrder.notes && (
            <div className="mt-2.5 text-xs text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 flex items-center space-x-1.5">
              <strong>Sua Observação:</strong>
              <span className="font-bold">{liveOrder.notes}</span>
            </div>
          )}
        </div>
      )}

      {/* Banner de Boas-vindas ao Cardápio */}
      <div className="relative rounded-3xl overflow-hidden bg-stone-900 text-white p-6 sm:p-8 shadow-xl border border-stone-800">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#b45309_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative z-10 max-w-2xl">
          <span className="text-amber-400 text-xs font-bold uppercase tracking-widest bg-amber-950/80 border border-amber-600/40 px-3 py-1 rounded-full inline-block mb-3">
            Cardápio Digital Oficial • Experiência Gourmet
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-amber-50 leading-tight">
            Sabores artesanais preparados no momento exato do seu pedido.
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Selecione suas delícias favoritas. Ao confirmar, o pedido cai instantaneamente na tela do barista e o estoque atualiza automaticamente!
          </p>
        </div>
      </div>

      {/* Categorias */}
      <div className="sticky top-20 z-30 bg-stone-50/95 backdrop-blur-md py-2 border-b border-stone-200">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-300'
            }`}
          >
            Todos os Itens ({activeProducts.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Produtos do Cardápio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((product) => {
          const isOutOfStock = product.stockQuantity <= 0; // Regra de Estoque Zero (RF04)
          const inCartQty = cart[product.id] || 0;

          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl border transition overflow-hidden flex flex-col justify-between shadow-xs ${
                isOutOfStock
                  ? 'border-stone-200 bg-stone-50/60 opacity-80'
                  : 'border-stone-200 hover:shadow-lg hover:border-amber-400/50'
              }`}
            >
              <div>
                {/* Foto do Produto */}
                <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className={`w-full h-full object-cover transition duration-300 ${
                      isOutOfStock ? 'grayscale-70' : 'hover:scale-105'
                    }`}
                  />

                  {/* Badge de Categoria */}
                  <span className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {product.category}
                  </span>

                  {/* ⭐ REQUISITO 19 (RF04): Se estoque == 0, exibe automaticamente como Esgotado */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-[1px] flex items-center justify-center p-4">
                      <span className="bg-rose-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg border border-white/20">
                        Esgotado no Momento
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-stone-900 text-sm leading-snug">
                      {product.name}
                    </h3>
                    <span className="text-base font-extrabold text-amber-900 shrink-0">
                      {formatCurrencyBRL(product.price)}
                    </span>
                  </div>

                  <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Botões de Ação do Cliente */}
              <div className="p-4 pt-0">
                {isOutOfStock ? (
                  /* Botão Bloqueado para Produto Esgotado (RF04) */
                  <button
                    disabled
                    className="w-full py-2 bg-stone-200 text-stone-500 rounded-xl text-xs font-bold cursor-not-allowed text-center"
                  >
                    Produto Indisponível
                  </button>
                ) : inCartQty > 0 ? (
                  /* Seletor de Quantidade */
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-1">
                    <button
                      onClick={() => handleRemoveFromCart(product.id)}
                      className="w-8 h-8 rounded-lg bg-white text-stone-800 shadow-xs flex items-center justify-center font-bold hover:bg-stone-100 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-extrabold text-amber-950">
                      {inCartQty} no carrinho
                    </span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={inCartQty >= product.stockQuantity}
                      className="w-8 h-8 rounded-lg bg-amber-600 text-white shadow-xs flex items-center justify-center font-bold hover:bg-amber-700 transition disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Botão Adicionar */
                  <button
                    onClick={() => handleAddToCart(product)}
                    aria-label={`Adicionar ${product.name} ao Pedido`}
                    data-testid={`add-to-cart-${product.id}`}
                    className="w-full py-2 bg-stone-900 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar ao Pedido</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra Flutuante de Carrinho de Compras */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 animate-in slide-in-from-bottom-6">
          <div className="bg-stone-900 text-white p-3.5 rounded-2xl shadow-2xl border border-stone-700 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center font-bold text-white shadow-md">
                {cartItemCount}
              </div>
              <div>
                <span className="text-xs text-stone-400 block font-medium">
                  Total do seu pedido:
                </span>
                <span className="text-base font-extrabold text-amber-100">
                  {formatCurrencyBRL(cartTotal)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-amber-900/30"
            >
              <span>Ver Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Checkout / Fechar Pedido */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-amber-100">
                  Finalizar Pedido do Café
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
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
                {Object.entries(cart).map(([productId, quantity]) => {
                  const product = activeProducts.find((p) => p.id === productId);
                  if (!product) return null;
                  return (
                    <div
                      key={productId}
                      className="flex items-center justify-between text-xs py-1.5"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {quantity}x
                        </span>
                        <span className="font-semibold text-stone-800">
                          {product.name}
                        </span>
                      </div>
                      <span className="font-bold text-stone-900">
                        {formatCurrencyBRL(product.price * quantity)}
                      </span>
                    </div>
                  );
                })}
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
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Local de Atendimento *
                  </label>
                  <select
                    value={tableOrTakeaway}
                    onChange={(e) => setTableOrTakeaway(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="Mesa 01">Mesa 01 (Salão)</option>
                    <option value="Mesa 02">Mesa 02 (Salão)</option>
                    <option value="Mesa 03">Mesa 03 (Jardim)</option>
                    <option value="Mesa 04">Mesa 04 (Varanda)</option>
                    <option value="Balcão / Viagem">Balcão / Retirada Rápida</option>
                  </select>
                </div>
              </div>

              {/* Observações Cruciais (Requisito 2: S/ Açúcar, Leite sem lactose, etc.) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1">
                    <span className="text-rose-600">⚠️</span>
                    <span>Observações para o Barista (Requisito Crucial)</span>
                  </label>
                  <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Aparece em destaque na comanda
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Ex: (S/ Açúcar), (Leite sem lactose), (Aquecer bem)..."
                  className="w-full px-3 py-2 text-xs font-bold text-rose-900 bg-rose-50/40 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                />

                {/* Atalhos Rápidos de Observação */}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[
                    'S/ Açúcar',
                    'Leite sem lactose',
                    'Aquecer bem',
                    'Caprichar na canela',
                    'Café bem quente',
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => {
                        if (!orderNotes.includes(preset)) {
                          setOrderNotes((prev) => (prev ? `${prev}, ${preset}` : preset));
                        }
                      }}
                      className="text-[10px] font-bold bg-stone-100 hover:bg-rose-100 hover:text-rose-800 text-stone-700 px-2 py-0.5 rounded-lg border border-stone-200 transition"
                    >
                      + {preset}
                    </button>
                  ))}
                  {orderNotes && (
                    <button
                      type="button"
                      onClick={() => setOrderNotes('')}
                      className="text-[10px] text-stone-400 hover:text-stone-600 underline ml-1"
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
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition ${
                      paymentMethod === 'PIX'
                        ? 'bg-amber-50 border-amber-600 text-amber-950 ring-2 ring-amber-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-1 text-emerald-600" />
                    <span>PIX Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cartão de Crédito')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition ${
                      paymentMethod === 'Cartão de Crédito'
                        ? 'bg-amber-50 border-amber-600 text-amber-950 ring-2 ring-amber-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1 text-sky-600" />
                    <span>Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Dinheiro')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition ${
                      paymentMethod === 'Dinheiro'
                        ? 'bg-amber-50 border-amber-600 text-amber-950 ring-2 ring-amber-500/20'
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
                Ao clicar em confirmar, o pedido é registrado e o sistema <strong>subtrai automaticamente os itens do estoque</strong> (Requisito 5 & RF04).
              </div>

              {/* Total e Botão */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <div>
                  <span className="text-[11px] text-stone-400 block font-medium">
                    Total a Pagar
                  </span>
                  <span className="text-xl font-extrabold text-stone-900">
                    {formatCurrencyBRL(cartTotal)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-900/30 transition flex items-center space-x-1.5 disabled:opacity-50"
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

      {/* Modal de Pedido Confirmado com Sucesso */}
      {orderConfirmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-md">
              <Check className="w-8 h-8" />
            </div>

            <span className="text-[10px] uppercase tracking-widest text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Pedido Enviado para a Cozinha
            </span>

            <h3 className="text-xl font-extrabold text-stone-900 mt-2">
              Pedido #{orderConfirmed.orderNumber}
            </h3>

            <p className="text-xs text-stone-500 mt-1">
              Obrigado, <strong>{orderConfirmed.customerName}</strong>! Seu pedido para <strong>{orderConfirmed.tableOrTakeaway}</strong> já está sendo preparado.
            </p>

            <div className="mt-4 p-3 bg-stone-50 rounded-xl text-left text-xs border border-stone-200">
              <div className="font-bold text-stone-700 mb-1">Resumo:</div>
              {orderConfirmed.items.map((it) => (
                <div key={it.productId} className="flex justify-between text-[11px] text-stone-600">
                  <span>{it.quantity}x {it.productName}</span>
                  <span>{formatCurrencyBRL(it.subtotal)}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-stone-200 flex justify-between font-extrabold text-stone-900">
                <span>Total:</span>
                <span>{formatCurrencyBRL(orderConfirmed.totalAmount)}</span>
              </div>
            </div>

            <button
              onClick={() => setOrderConfirmed(null)}
              className="mt-5 w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shadow-md"
            >
              Fazer Outro Pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
