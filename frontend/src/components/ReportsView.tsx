import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  BarChart3,
  Users,
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  Package,
  Star,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ABCCurveItem, CustomerLoyaltyItem, Order } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

export const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'sales' | 'abc' | 'customers'>('sales');

  // Relatório de Vendas
  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(sevenDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [salesReportData, setSalesReportData] = useState<{
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalOrders: number;
    averageTicket: number;
    orders: Order[];
    itemsSoldSummary: Array<{
      productId: string;
      productName: string;
      quantity: number;
      totalRevenue: number;
      totalProfit: number;
    }>;
  } | null>(null);

  // Relatório Curva ABC
  const [abcData, setAbcData] = useState<{
    items: ABCCurveItem[];
    classASummary: { count: number; revenue: number };
    classBSummary: { count: number; revenue: number };
    classCSummary: { count: number; revenue: number };
    totalRevenue: number;
  } | null>(null);

  // Relatório de Clientes
  const [customersData, setCustomersData] = useState<CustomerLoyaltyItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrega relatório ao mudar de aba ou datas
  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeReport === 'sales') {
        const data = await api.getSalesReport(startDate, endDate);
        setSalesReportData(data);
      } else if (activeReport === 'abc') {
        const data = await api.getABCCurveReport();
        setAbcData(data);
      } else if (activeReport === 'customers') {
        const data = await api.getCustomerReport();
        setCustomersData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySalesFilter = () => {
    fetchReport();
  };

  // Export CSV Helper
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSalesCSV = () => {
    if (!salesReportData) return;
    const headers = ['Produto', 'Quantidade Vendida', 'Faturamento Total (R$)', 'Lucro Gerado (R$)'];
    const rows = salesReportData.itemsSoldSummary.map((item) => [
      `"${item.productName}"`,
      item.quantity,
      item.totalRevenue.toFixed(2),
      item.totalProfit.toFixed(2),
    ]);
    exportToCSV(`relatorio_vendas_${startDate}_a_${endDate}`, headers, rows);
  };

  const handleExportABCCSV = () => {
    if (!abcData) return;
    const headers = ['Produto', 'Classificação', 'Qtd Vendida', 'Faturamento (R$)', '% da Receita', '% Acumulado', 'Estoque Atual'];
    const rows = abcData.items.map((i) => [
      `"${i.productName}"`,
      i.classification,
      i.quantitySold,
      i.totalRevenue.toFixed(2),
      `${i.percentageOfRevenue}%`,
      `${i.cumulativePercentage}%`,
      i.currentStock,
    ]);
    exportToCSV('relatorio_curva_abc_produtos', headers, rows);
  };

  const handleExportCustomersCSV = () => {
    const headers = ['Cliente', 'Total de Pedidos', 'Gasto Total (R$)', 'Ticket Médio (R$)', 'Última Compra', 'Item Favorito'];
    const rows = customersData.map((c) => [
      `"${c.customerName}"`,
      c.totalOrders,
      c.totalSpent.toFixed(2),
      c.averageTicket.toFixed(2),
      c.lastOrderDate.slice(0, 10),
      `"${c.favoriteProduct || 'N/A'}"`,
    ]);
    exportToCSV('relatorio_clientes_fidelidade', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header da Área de Relatórios */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-stone-900">
              Área de Relatórios Gerenciais (Requisito 10)
            </h2>
            <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full uppercase">
              Mínimo 3 Relatórios
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Análises estratégicas para tomada de decisão, giro de estoque e retenção de clientes.
          </p>
        </div>

        {/* Abas dos 3 Relatórios */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl self-start md:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveReport('sales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeReport === 'sales'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            <span>1. Vendas por Período</span>
          </button>
          <button
            onClick={() => setActiveReport('abc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeReport === 'abc'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
            <span>2. Curva ABC (Mais Vendidos)</span>
          </button>
          <button
            onClick={() => setActiveReport('customers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
              activeReport === 'customers'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-700" />
            <span>3. Clientes Mais Fiéis</span>
          </button>
        </div>
      </div>

      {/* ================= RELATÓRIO 1: VENDAS POR PERÍODO ================= */}
      {activeReport === 'sales' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Seletor de Período e Exportação */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-stone-700">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-stone-700">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleApplySalesFilter}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filtrar Período</span>
              </button>

              {/* Atalhos Rápidos */}
              <div className="flex items-center space-x-1 text-[11px]">
                <button
                  onClick={() => {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    setStartDate(sevenDaysAgoStr);
                    setEndDate(todayStr);
                  }}
                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-medium"
                >
                  Últimos 7 dias
                </button>
              </div>
            </div>

            <button
              onClick={handleExportSalesCSV}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Exportar CSV</span>
            </button>
          </div>

          {/* Cards Financeiros do Período */}
          {salesReportData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Faturamento no Período
                </span>
                <div className="text-2xl font-extrabold text-stone-900 mt-1">
                  {formatCurrencyBRL(salesReportData.totalRevenue)}
                </div>
                <span className="text-[11px] text-stone-500">
                  {salesReportData.totalOrders} pedidos realizados
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Custo Estimado dos Insumos
                </span>
                <div className="text-2xl font-extrabold text-stone-700 mt-1">
                  {formatCurrencyBRL(salesReportData.totalCost)}
                </div>
                <span className="text-[11px] text-stone-500">
                  Baseado no preço de custo
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                  Lucro Total no Período
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {formatCurrencyBRL(salesReportData.totalProfit)}
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Margem: {salesReportData.totalRevenue > 0 ? ((salesReportData.totalProfit / salesReportData.totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Ticket Médio Geral
                </span>
                <div className="text-2xl font-extrabold text-amber-900 mt-1">
                  {formatCurrencyBRL(salesReportData.averageTicket)}
                </div>
                <span className="text-[11px] text-stone-500">
                  Média por comanda
                </span>
              </div>
            </div>
          )}

          {/* Tabela de Produtos Vendidos no Período */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Itens Vendidos no Período Selecionado
                </h3>
                <p className="text-xs text-stone-500">
                  Consolidado de unidades vendidas e retorno financeiro
                </p>
              </div>
              <span className="text-xs text-stone-400">
                {salesReportData?.itemsSoldSummary.length || 0} produtos vendidos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="py-2.5 px-4 text-center">Quantidade Vendida</th>
                    <th className="py-2.5 px-4 text-right">Faturamento Total</th>
                    <th className="py-2.5 px-4 text-right">Lucro Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {salesReportData?.itemsSoldSummary.map((item) => (
                    <tr key={item.productId} className="hover:bg-stone-50/80">
                      <td className="py-2.5 px-4 font-bold text-stone-900">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-amber-800">
                        {item.quantity} un.
                      </td>
                      <td className="py-2.5 px-4 text-right font-extrabold text-stone-900">
                        {formatCurrencyBRL(item.totalRevenue)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                        {formatCurrencyBRL(item.totalProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= RELATÓRIO 2: CURVA ABC (MAIS VENDIDOS) ================= */}
      {activeReport === 'abc' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Box de Conceito da Curva ABC */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-600 text-white rounded-xl shrink-0 mt-0.5">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  O que é o Relatório de Curva ABC? (Requisito 10)
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Baseado no Princípio de Pareto (80/20). Ele classifica os produtos do café em 3 grupos estratégicos:
                </p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-emerald-100/70 border border-emerald-300 rounded-lg text-emerald-950">
                    <strong className="block text-emerald-900">Classe A (Mais Vendidos)</strong>
                    Representam até 80% do faturamento. Nunca podem faltar no estoque!
                  </div>
                  <div className="p-2 bg-amber-100/70 border border-amber-300 rounded-lg text-amber-950">
                    <strong className="block text-amber-900">Classe B (Giro Médio)</strong>
                    Representam os próximos 15% (acumulado até 95%). Manter estoque equilibrado.
                  </div>
                  <div className="p-2 bg-rose-100/70 border border-rose-300 rounded-lg text-rose-950">
                    <strong className="block text-rose-900">Classe C (Baixo Giro / Encalhados)</strong>
                    Últimos 5% da receita. Itens com pouca saída que podem estar retendo capital.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Resumo das Classes */}
          {abcData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  Classe A • Mais Vendidos
                </span>
                <div className="text-2xl font-extrabold text-emerald-950 mt-1">
                  {abcData.classASummary.count} produtos
                </div>
                <div className="text-xs text-emerald-800 mt-1 font-semibold">
                  {formatCurrencyBRL(abcData.classASummary.revenue)} gerados
                </div>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                  Classe B • Giro Moderado
                </span>
                <div className="text-2xl font-extrabold text-amber-950 mt-1">
                  {abcData.classBSummary.count} produtos
                </div>
                <div className="text-xs text-amber-800 mt-1 font-semibold">
                  {formatCurrencyBRL(abcData.classBSummary.revenue)} gerados
                </div>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs">
                <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider">
                  Classe C • Itens Encalhados / Baixo Giro
                </span>
                <div className="text-2xl font-extrabold text-rose-950 mt-1">
                  {abcData.classCSummary.count} produtos
                </div>
                <div className="text-xs text-rose-800 mt-1 font-semibold">
                  {formatCurrencyBRL(abcData.classCSummary.revenue)} gerados
                </div>
              </div>
            </div>
          )}

          {/* Tabela da Curva ABC */}
          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Classificação Analítica dos Produtos (Curva ABC)
                </h3>
                <p className="text-xs text-stone-500">
                  Ordenado por maior faturamento e percentual acumulado
                </p>
              </div>
              <button
                onClick={handleExportABCCSV}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                <span>Exportar CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <th className="py-2.5 px-4">Classe</th>
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="py-2.5 px-4 text-center">Unidades Vendidas</th>
                    <th className="py-2.5 px-4 text-right">Faturamento Total</th>
                    <th className="py-2.5 px-4 text-right">% Receita</th>
                    <th className="py-2.5 px-4 text-right">% Acumulada</th>
                    <th className="py-2.5 px-4 text-center">Estoque Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {abcData?.items.map((item) => {
                    const badgeClasses = {
                      A: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      B: 'bg-amber-100 text-amber-800 border-amber-300',
                      C: 'bg-rose-100 text-rose-800 border-rose-300',
                    };

                    return (
                      <tr key={item.productId} className="hover:bg-stone-50/80">
                        <td className="py-3 px-4">
                          <span
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-extrabold text-xs border ${
                              badgeClasses[item.classification]
                            }`}
                          >
                            {item.classification}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-900 block">
                            {item.productName}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-stone-800">
                          {item.quantitySold} un.
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-stone-900">
                          {formatCurrencyBRL(item.totalRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-stone-600 font-medium">
                          {item.percentageOfRevenue}%
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-900">
                          {item.cumulativePercentage}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              item.currentStock <= 0
                                ? 'bg-rose-100 text-rose-700'
                                : item.currentStock <= 5
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {item.currentStock} un.
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= RELATÓRIO 3: CLIENTES MAIS FIÉIS ================= */}
      {activeReport === 'customers' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">
                Relatório de Clientes & Fidelidade (Requisito 10)
              </h3>
              <p className="text-xs text-stone-500">
                Identifique quem são os clientes que mais consom e o ticket médio individual.
              </p>
            </div>
            <button
              onClick={handleExportCustomersCSV}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Exportar CSV</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <th className="py-2.5 px-4">Posição</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4 text-center">Total de Pedidos</th>
                    <th className="py-2.5 px-4 text-right">Total Gasto</th>
                    <th className="py-2.5 px-4 text-right">Ticket Médio</th>
                    <th className="py-2.5 px-4">Item Predileto</th>
                    <th className="py-2.5 px-4 text-right">Última Compra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {customersData.map((customer, index) => (
                    <tr key={customer.customerName} className="hover:bg-stone-50/80">
                      <td className="py-3 px-4">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-extrabold text-[11px] ${
                            index === 0
                              ? 'bg-amber-500 text-white shadow-xs'
                              : index === 1
                              ? 'bg-stone-400 text-white'
                              : index === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-stone-900">
                        <div className="flex items-center space-x-2">
                          <span>{customer.customerName}</span>
                          {index === 0 && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-stone-800">
                        {customer.totalOrders} pedidos
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-stone-900 text-sm">
                        {formatCurrencyBRL(customer.totalSpent)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-amber-900">
                        {formatCurrencyBRL(customer.averageTicket)}
                      </td>

                      <td className="py-3 px-4 text-stone-600 font-medium">
                        {customer.favoriteProduct ? (
                          <span className="inline-block bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md text-[11px] border border-amber-200">
                            {customer.favoriteProduct}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-stone-400">
                        {new Date(customer.lastOrderDate).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
