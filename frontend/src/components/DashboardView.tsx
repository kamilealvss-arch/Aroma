import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Package,
  PlusCircle,
  Clock,
  CheckCircle,
  ChefHat,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  DailyDashboardMetrics,
  DaySalesSummary,
  StockAlert,
  Order,
} from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

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

  const maxRevenue7Days = Math.max(
    ...last7Days.map((d) => d.revenue),
    100
  );

  const handleRestock = (productId: string) => {
    const qty = restockQty[productId] || 20;
    onQuickRestock(productId, qty);
    setRestockQty((prev) => ({ ...prev, [productId]: 20 }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert se houver itens esgotados ou críticos */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-950">
                Atenção ao Estoque (Requisito 19 - RF04)
              </h2>
              <p className="text-xs text-amber-800 mt-0.5">
                Existem <strong>{alerts.length} produtos</strong> que atingiram o limite mínimo ou estão esgotados no cardápio digital.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('stock')}
            className="text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition flex items-center space-x-1"
          >
            <span>Gerenciar Estoque Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Cards de Métricas Principais (Requisito 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento do Dia */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Faturamento do Dia
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
              {formatCurrencyBRL(metrics.todayRevenue)}
            </div>
            <div className="flex items-center space-x-1 text-xs text-emerald-600 font-medium mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Lucro est.: {formatCurrencyBRL(metrics.todayProfit)}</span>
            </div>
          </div>
        </div>

        {/* Quantidade de Pedidos Hoje */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Pedidos Hoje
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
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
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Ticket Médio
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
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

        {/* Avisos de Estoque Crítico */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Estoque Baixo / Esgotado
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                alerts.length > 0
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-stone-50 text-stone-400'
              }`}
            >
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
              {alerts.length} itens
            </div>
            <p className="text-xs text-rose-600 font-medium mt-1">
              {metrics.outOfStockCount} esgotado(s) • {metrics.lowStockAlertsCount} em nível de reposição
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Gráfico de Vendas 7 Dias & Tabela de Avisos de Estoque Baixo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico de Vendas nos Últimos 7 Dias (Requisito 8) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Vendas nos Últimos 7 Dias
              </h3>
              <p className="text-xs text-stone-500">
                Histórico diário de faturamento e volume de pedidos
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('reports')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
            >
              <span>Relatório Detalhado</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gráfico em Barras customizado com Tailwind */}
          <div className="mt-6 pt-4 border-t border-stone-100">
            <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2">
              {last7Days.map((item, idx) => {
                const heightPercent =
                  maxRevenue7Days > 0
                    ? Math.max(12, Math.round((item.revenue / maxRevenue7Days) * 100))
                    : 12;
                const isToday = idx === last7Days.length - 1;

                return (
                  <div
                    key={item.date}
                    className="flex-1 flex flex-col items-center group relative h-full justify-end"
                  >
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-stone-900 text-white text-[11px] rounded-lg py-1 px-2 pointer-events-none whitespace-nowrap shadow-lg">
                      <div className="font-bold">{formatCurrencyBRL(item.revenue)}</div>
                      <div className="text-[10px] text-stone-300">
                        {item.ordersCount} pedido(s)
                      </div>
                    </div>

                    {/* Valor acima da barra */}
                    <span className="text-[10px] font-bold text-stone-600 mb-1.5 hidden sm:block">
                      R$ {Math.round(item.revenue)}
                    </span>

                    {/* Barra */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        isToday
                          ? 'bg-amber-600 group-hover:bg-amber-500 shadow-md shadow-amber-600/30'
                          : 'bg-stone-300 group-hover:bg-amber-400'
                      }`}
                    />

                    {/* Label do dia */}
                    <div className="mt-2 text-center">
                      <span
                        className={`text-[10px] font-semibold block leading-tight ${
                          isToday ? 'text-amber-800 font-bold' : 'text-stone-500'
                        }`}
                      >
                        {item.label}
                      </span>
                      {isToday && (
                        <span className="text-[9px] text-amber-700 font-bold uppercase tracking-tighter">
                          Hoje
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabela de "Avisos de Estoque Baixo" (Requisito 19 - RF04) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-stone-900 text-base">
                Avisos de Estoque Baixo
              </h3>
            </div>
            <span className="text-xs bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
              {alerts.length} alertas
            </span>
          </div>

          <p className="text-xs text-stone-500 mb-3">
            Produtos que atingiram o limite mínimo (&le; 5 un.) ou esgotaram. A compra no cardápio é bloqueada se zerar.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-72 pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-xl">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
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
                  className={`p-3 rounded-xl border transition ${
                    alert.isOutOfStock
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs">
                          {alert.productName}
                        </span>
                        {alert.isOutOfStock ? (
                          <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                            Esgotado
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-500 text-stone-950 font-bold px-1.5 py-0.2 rounded-full">
                            Restam {alert.currentStock} un.
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 opacity-90">
                        {alert.message}
                      </p>
                    </div>

                    {/* Botão de Reposição Rápida */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleRestock(alert.productId)}
                        className="text-xs font-bold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1 transition"
                        title="Repor +20 unidades com registro em auditoria"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
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

      {/* Pedidos Recentes com Mudança de Status */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-stone-900 text-base">
              Pedidos Recentes (Balcão & Salão)
            </h3>
            <p className="text-xs text-stone-500">
              Cada pedido finalizado dá baixa automática no estoque (Regra de Negócio Req. 5)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-stone-500 hidden sm:inline">
              Atualizado em tempo real
            </span>
            <button
              onClick={() => onNavigateToTab('kanban')}
              className="text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 border border-amber-300"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Ver no Quadro Kanban (KDS)</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Pedido</th>
                <th className="py-2.5 px-3">Cliente / Local</th>
                <th className="py-2.5 px-3">Itens</th>
                <th className="py-2.5 px-3">Total</th>
                <th className="py-2.5 px-3">Pagamento</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recentOrders.map((order) => {
                const statusColors = {
                  recebido: 'bg-amber-100 text-amber-800 border-amber-200',
                  preparando: 'bg-sky-100 text-sky-800 border-sky-200',
                  pronto: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  entregue: 'bg-stone-100 text-stone-700 border-stone-200',
                  cancelado: 'bg-rose-100 text-rose-800 border-rose-200',
                };

                return (
                  <tr key={order.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-3 font-bold text-stone-900">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-stone-800">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {order.tableOrTakeaway}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-stone-700 max-w-xs truncate">
                        {order.items
                          .map((i) => `${i.quantity}x ${i.productName}`)
                          .join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-stone-900">
                      {formatCurrencyBRL(order.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-stone-600">
                      {order.paymentMethod}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          statusColors[order.status]
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {order.status === 'recebido' && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'preparando')}
                          className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition"
                        >
                          Preparar
                        </button>
                      )}
                      {order.status === 'preparando' && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'pronto')}
                          className="px-2.5 py-1 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition"
                        >
                          Pronto
                        </button>
                      )}
                      {order.status === 'pronto' && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'entregue')}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                        >
                          Entregar
                        </button>
                      )}
                      {order.status === 'entregue' && (
                        <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Finalizado</span>
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
  );
};
