import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  PlusCircle,
  CheckCircle,
  ChefHat,
  ArrowRight,
  Play,
  Check,
  User,
} from 'lucide-react';
import {
  DailyDashboardMetrics,
  DaySalesSummary,
  StockAlert,
  Order,
} from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

// Ícones de consumo (mesmos utilizados no KDS)
import levarIcon from '../assets/icons/levar.png';
import mesaIcon from '../assets/icons/mesa.png';
import balcaoIcon from '../assets/icons/balcao.png';
import deliveryIcon from '../assets/icons/delivery.png';

interface DashboardViewProps {
  metrics: DailyDashboardMetrics;
  last7Days: DaySalesSummary[];
  alerts: StockAlert[];
  recentOrders: Order[];
  onQuickRestock: (productId: string, quantityToAdd: number) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  onNavigateToTab: (tab: 'kanban' | 'products' | 'stock' | 'reports' | 'audit') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  last7Days,
  alerts,
  recentOrders,
  onQuickRestock,
  onUpdateOrderStatus,
  onNavigateToTab,
}) => {
  const [restockQty, setRestockQty] = useState<{ [key: string]: number }>({});
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const revenues = last7Days.map((d) => d.revenue);
  const maxRevenue7Days = Math.max(...revenues, 100);
  const minRevenue7Days = Math.min(...revenues, 0);
  const total7DaysRevenue = last7Days.reduce((acc, d) => acc + d.revenue, 0);
  const total7DaysOrders = last7Days.reduce((acc, d) => acc + d.ordersCount, 0);
  const avg7DaysRevenue = last7Days.length > 0 ? total7DaysRevenue / last7Days.length : 0;

  const handleRestock = (productId: string) => {
    const qty = restockQty[productId] || 20;
    onQuickRestock(productId, qty);
    setRestockQty((prev) => ({ ...prev, [productId]: 20 }));
  };

  // Cálculo de coordenadas suaves (Curva Bézier) para o gráfico de área SVG
  const chartWidth = 640;
  const chartHeight = 170;
  const padX = 36;
  const padTop = 28;
  const padBottom = 18;
  const usableWidth = chartWidth - padX * 2;
  const usableHeight = chartHeight - padTop - padBottom;

  // Escala dinâmica para valorizar a variação entre os dias
  const lowerBound = Math.max(0, minRevenue7Days * 0.65);
  const range = Math.max(maxRevenue7Days - lowerBound, 50);

  const points = last7Days.map((item, idx) => {
    const x =
      last7Days.length > 1
        ? padX + (idx / (last7Days.length - 1)) * usableWidth
        : chartWidth / 2;
    const normalized = Math.min(1, Math.max(0, (item.revenue - lowerBound) / range));
    const y = padTop + usableHeight - normalized * usableHeight;
    return { x, y, item, isToday: idx === last7Days.length - 1 };
  });

  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cpy1 = p0.y;
      const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
      const cpy2 = p1.y;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(points);
  const baselineY = padTop + usableHeight;
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
      : '';

  // Renderizador do Ícone de Consumo idêntico ao KDS
  const renderConsumptionBadge = (order: Order) => {
    const type = order.consumptionType || 'MESA';

    switch (type) {
      case 'MESA': {
        const match = order.tableOrTakeaway?.match(/\d+/);
        const tableNumber = match ? match[0] : (order.tableOrTakeaway || '');
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border bg-[#c68e5b]/20 text-[#631a09] border-[#c68e5b]/45 text-xs font-black tracking-tight shrink-0 shadow-2xs"
            title={tableNumber ? `Mesa ${tableNumber}` : 'Mesa'}
          >
            <img src={mesaIcon} alt="Mesa" className="w-5 h-5 object-contain shrink-0" />
            <span>{tableNumber}</span>
          </span>
        );
      }
      case 'LEVAR':
        return (
          <span
            className="inline-flex items-center justify-center p-1 rounded-md border bg-[#924529]/15 border-[#924529]/40 shadow-2xs shrink-0"
            title="Para Levar"
          >
            <img src={levarIcon} alt="Para Levar" className="w-5 h-5 object-contain" />
          </span>
        );
      case 'DELIVERY':
        return (
          <span
            className="inline-flex items-center justify-center p-1 rounded-md border bg-[#820b28]/15 border-[#820b28]/35 shadow-2xs shrink-0"
            title="Delivery"
          >
            <img src={deliveryIcon} alt="Delivery" className="w-5 h-5 object-contain" />
          </span>
        );
      case 'BALCAO':
        return (
          <span
            className="inline-flex items-center justify-center p-1 rounded-md border bg-[#7e8b60]/20 border-[#7e8b60]/45 shadow-2xs shrink-0"
            title="Balcão"
          >
            <img src={balcaoIcon} alt="Balcão" className="w-5.5 h-5.5 object-contain" />
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-[#f6efdd] text-[#631a09] border-[#c68e5b]/40 text-[10px] font-extrabold">
            {order.tableOrTakeaway}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-[32px] sm:rounded-[40px] p-5 sm:p-8 shadow-sm border border-stone-200/80 space-y-6">
      {/* Top Header com fonte Amarego e pílula de ação */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-amarego font-normal text-2xl sm:text-3xl text-stone-900 tracking-wide">
              Painel Geral da Cafeteria
            </h1>
            <span className="inline-flex items-center gap-1.5 font-medium text-stone-500 bg-stone-100/80 px-2.5 py-0.5 rounded-full border border-stone-200/80 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7e8b60]" />
              {metrics.todayOrdersCount} {metrics.todayOrdersCount === 1 ? 'pedido hoje' : 'pedidos hoje'}
            </span>
          </div>

          {/* Atalho rápido no topo direito */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab('stock')}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Package className="w-3.5 h-3.5 text-[#924529]" />
              <span>Gerenciar Estoque</span>
            </button>
          </div>
        </div>

        {/* 4 Cards de Métricas Principais com a estética de cards do KDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Faturamento do Dia */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 border-t-4 border-t-[#7e8b60] shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Faturamento do Dia
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#7e8b60]/15 text-[#7e8b60] border border-[#7e8b60]/25 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {formatCurrencyBRL(metrics.todayRevenue)}
              </div>
              <div className="flex items-center space-x-1 text-xs text-[#7e8b60] font-semibold mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Lucro est.: {formatCurrencyBRL(metrics.todayProfit)}</span>
              </div>
            </div>
          </div>

          {/* Quantidade de Pedidos Hoje */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 border-t-4 border-t-[#c68e5b] shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Pedidos Hoje
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#c68e5b]/15 text-[#924529] border border-[#c68e5b]/30 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {metrics.todayOrdersCount} pedidos
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Com baixa de estoque em tempo real
              </p>
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 border-t-4 border-t-[#924529] shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Ticket Médio
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#924529]/12 text-[#924529] border border-[#924529]/25 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {formatCurrencyBRL(metrics.todayAverageTicket)}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Gasto médio por cliente atendido
              </p>
            </div>
          </div>

          {/* Avisos de Estoque (Suavizado nas cores do projeto) */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 border-t-4 border-t-[#631a09] shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Estoque em Alerta
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#631a09]/10 text-[#631a09] border border-[#631a09]/20 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {alerts.length} {alerts.length === 1 ? 'item' : 'itens'}
              </div>
              <p className="text-xs text-[#924529] font-medium mt-1">
                {metrics.outOfStockCount} esgotado(s) • {metrics.lowStockAlertsCount} em reposição
              </p>
            </div>
          </div>
        </div>

        {/* Grid Central: Gráfico de Vendas 7 Dias & Avisos de Estoque Baixo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Coluna 1: Gráfico de Vendas nos Últimos 7 Dias (Fundo Branco + Degradê Vermelho) */}
          <div className="lg:col-span-7 rounded-3xl border bg-white border-stone-200/90 shadow-xs p-5 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-stone-100">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#820b28]" />
                  <h3 className="font-extrabold text-stone-900 text-sm tracking-tight">
                    Vendas nos Últimos 7 Dias
                  </h3>
                </div>
                <button
                  onClick={() => onNavigateToTab('reports')}
                  className="text-xs font-bold text-[#820b28] bg-white hover:bg-[#820b28]/[0.05] px-3 py-1 rounded-full border border-[#820b28]/25 shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                >
                  <span>Relatório Detalhado</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-stone-500 mb-3.5 font-medium">
                Evolução diária de faturamento e volume de comandas na semana
              </p>
            </div>

            {/* Área Interna com Mini-Métricas Brancas + Gráfico de Linha/Área em Degradê Vermelho */}
            <div className="space-y-4">
              {/* Mini resumo do período no topo do gráfico (Fundo Branco) */}
              <div className="grid grid-cols-3 gap-2.5 pb-3.5 border-b border-stone-100">
                <div className="bg-white border border-stone-200/80 rounded-xl px-3 py-2 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Acumulado 7 Dias
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-stone-900">
                    {formatCurrencyBRL(total7DaysRevenue)}
                  </span>
                </div>

                <div className="bg-white border border-stone-200/80 rounded-xl px-3 py-2 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Média Diária
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-stone-900">
                    {formatCurrencyBRL(avg7DaysRevenue)}
                  </span>
                </div>

                <div className="bg-white border border-stone-200/80 rounded-xl px-3 py-2 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Volume Semanal
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-stone-900">
                    {total7DaysOrders} pedidos
                  </span>
                </div>
              </div>

              {/* Área do Gráfico SVG com Curva Bézier e Degradê apenas em Vermelho (#820b28) */}
              <div className="relative pt-1">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-44 overflow-visible"
                  aria-label="Gráfico de evolução de vendas nos últimos 7 dias"
                >
                  <defs>
                    <linearGradient id="aromaAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#820b28" stopOpacity="0.26" />
                      <stop offset="60%" stopColor="#820b28" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#820b28" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Linhas horizontais tracejadas de referência */}
                  {[0, 0.5, 1].map((ratio, i) => {
                    const y = padTop + ratio * usableHeight;
                    return (
                      <line
                        key={i}
                        x1={padX - 10}
                        y1={y}
                        x2={chartWidth - padX + 10}
                        y2={y}
                        stroke="#e7e5e4"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Preenchimento em gradiente vermelho sob a curva */}
                  {areaPath && <path d={areaPath} fill="url(#aromaAreaGrad)" />}

                  {/* Linha suave principal em vermelho */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#820b28"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Linhas guias verticais discretas e pontos de cada dia */}
                  {points.map((pt, idx) => {
                    const isHovered = hoveredDayIdx === idx;
                    return (
                      <g
                        key={pt.item.date}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDayIdx(idx)}
                        onMouseLeave={() => setHoveredDayIdx(null)}
                      >
                        {/* Guia vertical ao passar o mouse ou no dia de hoje */}
                        {(isHovered || pt.isToday) && (
                          <line
                            x1={pt.x}
                            y1={pt.y}
                            x2={pt.x}
                            y2={baselineY}
                            stroke="#820b28"
                            strokeDasharray="3 3"
                            strokeWidth="1.5"
                            strokeOpacity="0.5"
                          />
                        )}

                        {/* Badge de valor acima do ponto */}
                        <g transform={`translate(${pt.x}, ${pt.y - 14})`}>
                          <rect
                            x="-26"
                            y="-11"
                            width="52"
                            height="17"
                            rx="6"
                            fill={pt.isToday || isHovered ? '#820b28' : '#ffffff'}
                            stroke={pt.isToday || isHovered ? '#820b28' : '#e7e5e4'}
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            y="1"
                            fill={pt.isToday || isHovered ? '#ffffff' : '#57534e'}
                            fontSize="9.5"
                            fontWeight="800"
                          >
                            R$ {Math.round(pt.item.revenue)}
                          </text>
                        </g>

                        {/* Halo externo no dia de hoje ou hover */}
                        {(pt.isToday || isHovered) && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="8"
                            fill="#820b28"
                            fillOpacity="0.16"
                          />
                        )}

                        {/* Ponto principal */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.isToday || isHovered ? 5 : 4}
                          fill={pt.isToday ? '#820b28' : '#ffffff'}
                          stroke="#820b28"
                          strokeWidth="2.5"
                        />

                        {/* Área clicável/hover invisível maior */}
                        <rect
                          x={pt.x - 28}
                          y={0}
                          width="56"
                          height={chartHeight}
                          fill="transparent"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Eixo X perfeitamente alinhado na base com dias e quantidade de pedidos */}
                <div className="grid grid-cols-7 gap-1 pt-2 border-t border-stone-100">
                  {last7Days.map((item, idx) => {
                    const isToday = idx === last7Days.length - 1;
                    const isHovered = hoveredDayIdx === idx;
                    return (
                      <div
                        key={item.date}
                        onMouseEnter={() => setHoveredDayIdx(idx)}
                        onMouseLeave={() => setHoveredDayIdx(null)}
                        className={`text-center py-1 rounded-lg transition-colors ${
                          isToday
                            ? 'bg-[#820b28]/[0.06]'
                            : isHovered
                            ? 'bg-stone-50'
                            : ''
                        }`}
                      >
                        <span
                          className={`text-[10px] block leading-tight ${
                            isToday
                              ? 'text-[#820b28] font-extrabold'
                              : 'text-stone-600 font-semibold'
                          }`}
                        >
                          {item.label}
                        </span>
                        <span
                          className={`text-[9px] block mt-0.5 ${
                            isToday
                              ? 'text-[#820b28] font-bold uppercase'
                              : 'text-stone-400 font-medium'
                          }`}
                        >
                          {isToday ? `Hoje • ${item.ordersCount} ped.` : `${item.ordersCount} ped.`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Avisos de Estoque Baixo (Fundo Branco) */}
          <div className="lg:col-span-5 rounded-3xl border bg-white border-stone-200/90 shadow-xs p-5 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c68e5b]" />
                <h3 className="font-extrabold text-stone-900 text-sm tracking-tight">
                  Avisos de Estoque Baixo
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-white text-[#924529] border border-[#c68e5b]/30 shadow-2xs">
                {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
              </span>
            </div>

            <p className="text-[11px] text-stone-500 mb-3.5 font-medium">
              Produtos que atingiram o limite mínimo (&le; 5 un.) ou esgotaram. A compra no cardápio é bloqueada se zerar.
            </p>

            {/* Lista de Cards Brancos Limpos e Suaves */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-72 pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-dashed border-[#7e8b60]/40">
                  <CheckCircle className="w-8 h-8 mx-auto text-[#7e8b60] mb-2" />
                  <p className="text-xs font-semibold text-stone-700">
                    Estoque 100% abastecido!
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Nenhum produto em nível crítico no momento.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.productId}
                    className={`bg-white p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-sm transition-all ${
                      alert.isOutOfStock
                        ? 'border-l-4 border-l-[#924529]'
                        : 'border-l-4 border-l-[#c68e5b]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-stone-900 text-xs">
                            {alert.productName}
                          </span>
                          {alert.isOutOfStock ? (
                            <span className="text-[10px] bg-[#924529]/12 text-[#924529] border border-[#924529]/25 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Esgotado
                            </span>
                          ) : (
                            <span className="text-[10px] bg-[#c68e5b]/15 text-[#631a09] border border-[#c68e5b]/35 font-bold px-2 py-0.5 rounded-md">
                              Restam {alert.currentStock} un.
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>

                      {/* Botão de Reposição Rápida */}
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={() => handleRestock(alert.productId)}
                          className="text-xs font-bold bg-white hover:bg-[#7e8b60]/15 text-stone-800 hover:text-[#4f583c] border border-stone-200/90 hover:border-[#7e8b60]/40 px-2.5 py-1.5 rounded-xl shadow-2xs flex items-center space-x-1 transition cursor-pointer"
                          title="Repor +20 unidades com registro em auditoria"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-[#7e8b60]" />
                          <span>+20 un.</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pedidos Recentes (Fundo Branco) */}
        <div className="rounded-3xl border bg-white border-stone-200/90 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7e8b60]" />
                <h3 className="font-extrabold text-stone-900 text-sm tracking-tight">
                  Pedidos Recentes (Balcão & Salão)
                </h3>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
                Cada pedido finalizado dá baixa automática no estoque em tempo real
              </p>
            </div>

            <button
              onClick={() => onNavigateToTab('kanban')}
              className="text-xs font-bold text-[#4f583c] bg-white hover:bg-[#f6f8f0] px-3.5 py-1.5 rounded-full transition flex items-center space-x-1.5 border border-[#7e8b60]/35 shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <ChefHat className="w-3.5 h-3.5 text-[#7e8b60]" />
              <span>Ver no Quadro Kanban (KDS)</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50/70 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Pedido</th>
                    <th className="py-3 px-4">Cliente / Consumo</th>
                    <th className="py-3 px-4">Itens da Comanda</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Pagamento</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentOrders.map((order) => {
                    const statusStyles = {
                      recebido: 'bg-[#c68e5b]/15 text-[#924529] border-[#c68e5b]/35',
                      preparando: 'bg-[#924529]/12 text-[#924529] border-[#924529]/30',
                      pronto: 'bg-[#7e8b60]/15 text-[#4f583c] border-[#7e8b60]/35',
                      entregue: 'bg-stone-100 text-stone-600 border-stone-200',
                      cancelado: 'bg-[#820b28]/10 text-[#820b28] border-[#820b28]/25',
                    };

                    return (
                      <tr key={order.id} className="hover:bg-stone-50/80 transition">
                        <td className="py-3.5 px-4 font-extrabold text-stone-900">
                          #{order.orderNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {renderConsumptionBadge(order)}
                            <div className="font-semibold text-stone-800 flex items-center gap-1">
                              <User className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>{order.customerName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-stone-700 max-w-xs truncate font-medium">
                            {order.items
                              .map((i) => `${i.quantity}x ${i.productName}`)
                              .join(', ')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-stone-900">
                          {formatCurrencyBRL(order.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 font-medium">
                          {order.paymentMethod}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                              statusStyles[order.status]
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {order.status === 'recebido' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'preparando')}
                              className="px-3 py-1.5 bg-[#924529] hover:bg-[#7a3820] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Preparar</span>
                            </button>
                          )}
                          {order.status === 'preparando' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'pronto')}
                              className="px-3 py-1.5 bg-[#820b28] hover:bg-[#680820] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Finalizar</span>
                            </button>
                          )}
                          {order.status === 'pronto' && (
                            <button
                              onClick={() => onUpdateOrderStatus(order.id, 'entregue')}
                              className="px-3 py-1.5 bg-[#7e8b60] hover:bg-[#626d4a] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Entregar</span>
                            </button>
                          )}
                          {order.status === 'entregue' && (
                            <span className="text-[11px] text-[#7e8b60] font-bold inline-flex items-center justify-end space-x-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Entregue</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
};
