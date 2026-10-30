import React, { useState, useEffect } from 'react';
import {
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
  ShoppingBag,
  RefreshCw,
  Search,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { ABCCurveItem, CustomerLoyaltyItem, Order } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

type DatePreset = 'today' | '7days' | '30days' | 'month' | 'all' | 'custom';

export const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'sales' | 'abc' | 'customers'>('sales');

  // Relatório de Vendas
  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(sevenDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activePreset, setActivePreset] = useState<DatePreset>('7days');
  const [salesSearch, setSalesSearch] = useState('');

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
  const [abcClassFilter, setAbcClassFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [abcSearch, setAbcSearch] = useState('');

  // Relatório de Clientes
  const [customersData, setCustomersData] = useState<CustomerLoyaltyItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSort, setCustomerSort] = useState<'orders' | 'spent' | 'ticket'>('orders');

  const [loading, setLoading] = useState(false);

  // Carrega relatório ao mudar de aba
  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const fetchReport = async (overrideStart?: string, overrideEnd?: string) => {
    setLoading(true);
    try {
      if (activeReport === 'sales') {
        const start = overrideStart !== undefined ? overrideStart : startDate;
        const end = overrideEnd !== undefined ? overrideEnd : endDate;
        const data = await api.getSalesReport(start, end);
        setSalesReportData(data);
      } else if (activeReport === 'abc') {
        const data = await api.getABCCurveReport();
        setAbcData(data);
      } else if (activeReport === 'customers') {
        const data = await api.getCustomerReport();
        setCustomersData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados analíticos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Aplicação instantânea de filtros de período
  const handleSelectPreset = (preset: 'today' | '7days' | '30days' | 'month' | 'all') => {
    let start = todayStr;
    let end = todayStr;

    if (preset === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (preset === '7days') {
      start = sevenDaysAgoStr;
      end = todayStr;
    } else if (preset === '30days') {
      start = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      end = todayStr;
    } else if (preset === 'month') {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      end = todayStr;
    } else if (preset === 'all') {
      start = '2026-01-01';
      end = todayStr;
    }

    setStartDate(start);
    setEndDate(end);
    setActivePreset(preset);
    fetchReport(start, end);
  };

  const handleApplyCustomDates = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActivePreset('custom');
    fetchReport(startDate, endDate);
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
    const headers = ['Produto', 'Quantidade Vendida', 'Faturamento Total (R$)', 'Lucro Estimado (R$)'];
    const rows = salesReportData.itemsSoldSummary.map((i) => [
      `"${i.productName}"`,
      i.quantity,
      i.totalRevenue.toFixed(2),
      i.totalProfit.toFixed(2),
    ]);
    exportToCSV(`relatorio_vendas_${startDate}_a_${endDate}`, headers, rows);
  };

  const handleExportABCCSV = () => {
    if (!abcData) return;
    const headers = ['Classe', 'Produto', 'Categoria', 'Quantidade Vendida', 'Faturamento (R$)', '% Receita', '% Acumulada', 'Estoque Atual'];
    const rows = abcData.items.map((i) => [
      i.classification,
      `"${i.productName}"`,
      `"${i.category}"`,
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

  // Filtragem de itens vendidos no período
  const filteredSalesItems =
    salesReportData?.itemsSoldSummary.filter((item) =>
      item.productName.toLowerCase().includes(salesSearch.toLowerCase())
    ) || [];

  // Filtragem e busca na Curva ABC
  const filteredAbcItems =
    abcData?.items.filter((item) => {
      const matchesClass = abcClassFilter === 'ALL' || item.classification === abcClassFilter;
      const matchesSearch =
        item.productName.toLowerCase().includes(abcSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(abcSearch.toLowerCase());
      return matchesClass && matchesSearch;
    }) || [];

  // Filtragem e ordenação de Clientes
  const filteredCustomers = [...customersData]
    .filter((c) => c.customerName.toLowerCase().includes(customerSearch.toLowerCase()))
    .sort((a, b) => {
      if (customerSort === 'spent') return b.totalSpent - a.totalSpent;
      if (customerSort === 'ticket') return b.averageTicket - a.averageTicket;
      return b.totalOrders - a.totalOrders;
    });

  return (
    <div
      className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6 text-[#35312F]"
      style={{ zoom: 1.05 }}
    >
      {/* 1. Cabeçalho de Analytics com Identidade Visual Aroma */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-stone-100">
        <div className="space-y-0.5">
          {/* Breadcrumb Discreto */}
          <nav className="flex items-center space-x-1.5 text-xs text-stone-400 font-medium">
            <span className="hover:text-[#35312F] transition">Painel</span>
            <span>/</span>
            <span className="text-[#850D2C] font-semibold">
              {activeReport === 'sales'
                ? 'Vendas por Período'
                : activeReport === 'abc'
                ? 'Curva ABC de Produtos'
                : 'Clientes & Fidelidade'}
            </span>
          </nav>

          {/* Título com Fonte Amarego da Marca */}
          <h1
            className="text-2xl sm:text-3xl font-normal tracking-tight text-[#35312F] leading-tight"
            style={{ fontFamily: "'Amarego', sans-serif" }}
          >
            Analytics & Indicadores
          </h1>

          {/* Subtítulo */}
          <p className="text-xs text-stone-500 pt-0.5">
            Análises estratégicas de faturamento, giro de estoque e comportamento de consumo.
          </p>
        </div>

        {/* Botão de Atualizar Dados com Animação */}
        <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="inline-flex items-center space-x-2 h-8.5 px-4 rounded-full text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] disabled:opacity-75 shadow-xs transition cursor-pointer"
            title="Sincronizar dados analíticos mais recentes"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Atualizando...' : 'Atualizar dados'}</span>
          </button>
        </div>
      </div>

      {/* 2. Abas de Navegação Refinadas */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 pb-0.5">
        <div className="inline-flex p-1 bg-stone-100/90 rounded-2xl border border-stone-200/80">
          <button
            type="button"
            onClick={() => setActiveReport('sales')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition duration-150 cursor-pointer ${
              activeReport === 'sales'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F] hover:bg-white/60'
            }`}
            title="Relatório financeiro de vendas e lucratividade por período"
          >
            <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeReport === 'sales' ? 'text-white' : 'text-stone-400'}`} />
            <span>Vendas por Período</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReport('abc')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition duration-150 cursor-pointer ${
              activeReport === 'abc'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F] hover:bg-white/60'
            }`}
            title="Classificação Curva ABC de produtos mais vendidos e faturamento"
          >
            <BarChart3 className={`w-3.5 h-3.5 shrink-0 ${activeReport === 'abc' ? 'text-white' : 'text-stone-400'}`} />
            <span>Curva ABC (Mais Vendidos)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReport('customers')}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition duration-150 cursor-pointer ${
              activeReport === 'customers'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F] hover:bg-white/60'
            }`}
            title="Relatório de clientes mais fiéis e ticket médio individual"
          >
            <Users className={`w-3.5 h-3.5 shrink-0 ${activeReport === 'customers' ? 'text-white' : 'text-stone-400'}`} />
            <span>Clientes Fiéis</span>
          </button>
        </div>

        <span className="text-xs text-stone-400 hidden sm:inline">
          {activeReport === 'sales'
            ? 'Receitas brutas, custos e margem operacional'
            : activeReport === 'abc'
            ? 'Classificação 80/20 de itens no cardápio'
            : 'Fidelização e recorrência de clientes'}
        </span>
      </div>

      {/* Estado de Carregamento Suave */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-2 text-stone-400">
          <RefreshCw className="w-6 h-6 animate-spin text-[#850D2C]" />
          <span className="text-xs font-medium">Carregando indicadores analíticos...</span>
        </div>
      )}

      {/* ======================= ABA 1: VENDAS POR PERÍODO ======================= */}
      {!loading && activeReport === 'sales' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Barra de Filtro de Período Ultra-Responsiva com Atalhos Imediatos */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-3.5 bg-[#F9F7F3] rounded-2xl border border-stone-200/80">
            <form onSubmit={handleApplyCustomDates} className="flex flex-wrap items-center gap-2.5">
              {/* Pílulas de Atalhos Rápidos com Feedback Ativo e Ação Imediata */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('today')}
                  className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activePreset === 'today'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                  title="Filtrar imediatamente pedidos de hoje"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('7days')}
                  className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activePreset === '7days'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                  title="Filtrar imediatamente últimos 7 dias"
                >
                  7 dias
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('30days')}
                  className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activePreset === '30days'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                  title="Filtrar imediatamente últimos 30 dias"
                >
                  30 dias
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('month')}
                  className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activePreset === 'month'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                  title="Filtrar vendas desde o início deste mês"
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('all')}
                  className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activePreset === 'all'
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                  title="Visualizar todo o histórico disponível"
                >
                  Todo o Período
                </button>
              </div>

              {/* Divisor vertical */}
              <div className="hidden sm:block w-px h-5 bg-stone-300 mx-1" />

              {/* Seletor de Datas Personalizado */}
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-stone-500 font-medium">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="h-8 px-2.5 rounded-xl border border-stone-200 bg-white text-xs text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition cursor-pointer"
                />
              </div>

              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-stone-500 font-medium">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="h-8 px-2.5 rounded-xl border border-stone-200 bg-white text-xs text-[#35312F] font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="h-8 px-3.5 bg-[#850D2C] hover:bg-[#6e0a24] text-white rounded-xl text-xs font-semibold shadow-xs transition inline-flex items-center space-x-1.5 cursor-pointer"
                title="Aplicar intervalo de datas selecionado"
              >
                <Filter className="w-3 h-3" />
                <span>Filtrar</span>
              </button>
            </form>

            {/* Exportar CSV */}
            <button
              onClick={handleExportSalesCSV}
              className="h-8 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition inline-flex items-center space-x-1.5 shadow-2xs self-start lg:self-auto cursor-pointer"
              title="Exportar dados consolidados em planilha CSV"
            >
              <Download className="w-3 h-3 text-stone-500" />
              <span>Exportar CSV</span>
            </button>
          </div>

          {/* Cards Financeiros do Período */}
          {salesReportData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Faturamento */}
              <div className="p-4 sm:py-4 sm:px-5 rounded-2xl border border-stone-200/80 bg-white shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-[#850D2C] border border-stone-200">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Faturamento Total</span>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {formatCurrencyBRL(salesReportData.totalRevenue)}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  {salesReportData.totalOrders} {salesReportData.totalOrders === 1 ? 'comanda finalizada' : 'comandas finalizadas'}
                </p>
              </div>

              {/* Card 2: Custos de Insumos */}
              <div className="p-4 sm:py-4 sm:px-5 rounded-2xl border border-stone-200/80 bg-white shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-[#924529] border border-stone-200">
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Custos Operacionais</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#924529] bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                    Insumos
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#924529] mt-2 tracking-tight">
                  {formatCurrencyBRL(salesReportData.totalCost)}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  Custo base de mercadoria vendida (CMV)
                </p>
              </div>

              {/* Card 3: Lucro Estimado */}
              <div className="p-4 sm:py-4 sm:px-5 rounded-2xl border border-stone-200/80 bg-white shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-[#858F6D] border border-stone-200">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Lucro Bruto Estimado</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#4c543c] bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                    Líquido
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#4c543c] mt-2 tracking-tight">
                  {formatCurrencyBRL(salesReportData.totalProfit)}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  Margem de {salesReportData.totalRevenue > 0 ? ((salesReportData.totalProfit / salesReportData.totalRevenue) * 100).toFixed(1) : 0}% sobre vendas
                </p>
              </div>

              {/* Card 4: Ticket Médio */}
              <div className="p-4 sm:py-4 sm:px-5 rounded-2xl border border-stone-200/80 bg-white shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-[#35312F] border border-stone-200">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[#35312F] font-medium">Ticket Médio</span>
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {formatCurrencyBRL(salesReportData.averageTicket)}
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  Média por pedido no período
                </p>
              </div>
            </div>
          )}

          {/* Tabela de Produtos Vendidos com Barra de Busca */}
          <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
            <div className="p-4 bg-white border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#35312F] text-sm">
                  Desempenho por Item no Período
                </h3>
                <p className="text-xs text-stone-400">
                  Volume vendido, faturamento gerado e margem de contribuição
                </p>
              </div>

              {/* Campo de Busca Rápida de Produto */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar produto vendido..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 text-xs rounded-full border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:bg-white focus:outline-none transition"
                />
                {salesSearch && (
                  <button
                    type="button"
                    onClick={() => setSalesSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4 font-semibold text-stone-600">Produto</th>
                    <th className="py-3 px-4 text-center font-semibold text-stone-600">Qtd. Vendida</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Faturamento Bruto</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Lucro Estimado</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Margem (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {filteredSalesItems.length > 0 ? (
                    filteredSalesItems.map((item) => {
                      const marginPct = item.totalRevenue > 0
                        ? ((item.totalProfit / item.totalRevenue) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={item.productId} className="hover:bg-[#F9F7F3]/70 transition-colors duration-150">
                          <td className="py-3 px-4 font-semibold text-[#35312F]">
                            {item.productName}
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-[#35312F]">
                            {item.quantity} <span className="text-[11px] text-stone-400">un.</span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#35312F]">
                            {formatCurrencyBRL(item.totalRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#4c543c]">
                            {formatCurrencyBRL(item.totalProfit)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#858F6D]/15 text-[#4c543c] border border-[#858F6D]/30">
                              {marginPct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-400 text-xs">
                        {salesSearch
                          ? `Nenhum item vendido encontrado para "${salesSearch}".`
                          : 'Nenhum pedido finalizado encontrado para o período selecionado.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================= ABA 2: CURVA ABC ======================= */}
      {!loading && activeReport === 'abc' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Banner Explicativo Pareto */}
          <div className="p-4 bg-[#F9F7F3] rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#850D2C]" />
              <h4 className="font-semibold text-xs text-[#35312F] tracking-wide uppercase">
                Metodologia Curva ABC (Princípio de Pareto)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => setAbcClassFilter(abcClassFilter === 'A' ? 'ALL' : 'A')}
                className={`p-3 bg-white border rounded-xl cursor-pointer transition ${
                  abcClassFilter === 'A'
                    ? 'border-[#858F6D] ring-2 ring-[#858F6D]/20 shadow-xs'
                    : 'border-stone-200/80 hover:border-stone-300'
                }`}
                title="Clique para filtrar apenas itens Classe A"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-[#858F6D]/20 text-[#4c543c] border border-[#858F6D]/30 inline-flex items-center justify-center font-extrabold text-[10px]">
                    A
                  </span>
                  <span className="font-semibold text-xs text-[#35312F]">Classe A • Mais Vendidos</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                  Concentram <strong>até 80% do faturamento</strong>. Devem ter prioridade absoluta e nunca podem faltar no estoque.
                </p>
              </div>

              <div
                onClick={() => setAbcClassFilter(abcClassFilter === 'B' ? 'ALL' : 'B')}
                className={`p-3 bg-white border rounded-xl cursor-pointer transition ${
                  abcClassFilter === 'B'
                    ? 'border-[#924529] ring-2 ring-[#924529]/20 shadow-xs'
                    : 'border-stone-200/80 hover:border-stone-300'
                }`}
                title="Clique para filtrar apenas itens Classe B"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-amber-50 text-[#924529] border border-[#924529]/30 inline-flex items-center justify-center font-extrabold text-[10px]">
                    B
                  </span>
                  <span className="font-semibold text-xs text-[#35312F]">Classe B • Giro Moderado</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                  Representam os <strong>próximos 15%</strong> (acumulado até 95%). Manter estoque equilibrado e compras regulares.
                </p>
              </div>

              <div
                onClick={() => setAbcClassFilter(abcClassFilter === 'C' ? 'ALL' : 'C')}
                className={`p-3 bg-white border rounded-xl cursor-pointer transition ${
                  abcClassFilter === 'C'
                    ? 'border-[#850D2C] ring-2 ring-[#850D2C]/20 shadow-xs'
                    : 'border-stone-200/80 hover:border-stone-300'
                }`}
                title="Clique para filtrar apenas itens Classe C"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-rose-50 text-[#850D2C] border border-[#850D2C]/30 inline-flex items-center justify-center font-extrabold text-[10px]">
                    C
                  </span>
                  <span className="font-semibold text-xs text-[#35312F]">Classe C • Menor Saída</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                  Últimos <strong>5% da receita</strong>. Itens de baixo giro que exigem cautela para evitar capital parado e vencimentos.
                </p>
              </div>
            </div>
          </div>

          {/* Cards de Resumo das Classes (com Ação de Filtragem Direta) */}
          {abcData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div
                onClick={() => setAbcClassFilter(abcClassFilter === 'A' ? 'ALL' : 'A')}
                className={`p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs cursor-pointer ${
                  abcClassFilter === 'A'
                    ? 'border-[#858F6D] ring-2 ring-[#858F6D]/20'
                    : 'border-stone-200/80 hover:border-stone-300'
                }`}
                title="Clique para filtrar apenas produtos Classe A"
              >
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <span className="font-medium text-[#35312F]">Produtos Classe A</span>
                  <span className="w-5 h-5 rounded-md bg-[#858F6D]/20 text-[#4c543c] border border-[#858F6D]/30 inline-flex items-center justify-center font-extrabold text-[10px]">
                    A
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {abcData.classASummary.count} <span className="text-xs font-normal text-stone-400">itens</span>
                </div>
                <p className="text-[11px] text-[#4c543c] font-semibold mt-1.5">
                  {formatCurrencyBRL(abcData.classASummary.revenue)} gerados
                </p>
              </div>

              <div
                onClick={() => setAbcClassFilter(abcClassFilter === 'B' ? 'ALL' : 'B')}
                className={`p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs cursor-pointer ${
                  abcClassFilter === 'B'
                    ? 'border-[#924529] ring-2 ring-[#924529]/20'
                    : 'border-stone-200/80 hover:border-stone-300'
                }`}
                title="Clique para filtrar apenas produtos Classe B"
              >
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <span className="font-medium text-[#35312F]">Produtos Classe B</span>
                  <span className="w-5 h-5 rounded-md bg-amber-50 text-[#924529] border border-[#924529]/30 inline-flex items-center justify-center font-extrabold text-[10px]">
                    B
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {abcData.classBSummary.count} <span className="text-xs font-normal text-stone-400">itens</span>
                </div>
                <p className="text-[11px] text-[#924529] font-semibold mt-1.5">
                  {formatCurrencyBRL(abcData.classBSummary.revenue)} gerados
                </p>
              </div>

              <div
                onClick={() => setAbcClassFilter(abcClassFilter === 'C' ? 'ALL' : 'C')}
                className={`p-4 sm:py-4 sm:px-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-xs cursor-pointer ${
                  abcClassFilter === 'C'
                    ? 'border-[#850D2C] ring-2 ring-[#850D2C]/20'
                    : 'border-stone-200/80 hover:border-stone-300'
                }`}
                title="Clique para filtrar apenas produtos Classe C"
              >
                <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                  <span className="font-medium text-[#35312F]">Produtos Classe C</span>
                  <span className="w-5 h-5 rounded-md bg-rose-50 text-[#850D2C] border border-[#850D2C]/30 inline-flex items-center justify-center font-extrabold text-[10px]">
                    C
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                  {abcData.classCSummary.count} <span className="text-xs font-normal text-stone-400">itens</span>
                </div>
                <p className="text-[11px] text-[#850D2C] font-semibold mt-1.5">
                  {formatCurrencyBRL(abcData.classCSummary.revenue)} gerados
                </p>
              </div>
            </div>
          )}

          {/* Barra de Filtros e Busca da Curva ABC */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAbcClassFilter('ALL')}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  abcClassFilter === 'ALL'
                    ? 'bg-[#850D2C] text-white shadow-2xs'
                    : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>Todas as Classes</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${abcClassFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-stone-200/70 text-stone-600'}`}>
                  {abcData?.items.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbcClassFilter('A')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  abcClassFilter === 'A'
                    ? 'bg-[#850D2C] text-white shadow-2xs'
                    : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>Classe A</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${abcClassFilter === 'A' ? 'bg-white/20 text-white' : 'bg-[#858F6D]/20 text-[#4c543c]'}`}>
                  {abcData?.classASummary.count || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbcClassFilter('B')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  abcClassFilter === 'B'
                    ? 'bg-[#850D2C] text-white shadow-2xs'
                    : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>Classe B</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${abcClassFilter === 'B' ? 'bg-white/20 text-white' : 'bg-amber-100 text-[#924529]'}`}>
                  {abcData?.classBSummary.count || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbcClassFilter('C')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  abcClassFilter === 'C'
                    ? 'bg-[#850D2C] text-white shadow-2xs'
                    : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>Classe C</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${abcClassFilter === 'C' ? 'bg-white/20 text-white' : 'bg-rose-100 text-[#850D2C]'}`}>
                  {abcData?.classCSummary.count || 0}
                </span>
              </button>

              {(abcClassFilter !== 'ALL' || abcSearch !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setAbcClassFilter('ALL');
                    setAbcSearch('');
                  }}
                  className="inline-flex items-center space-x-1 h-8 px-2.5 text-xs text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition cursor-pointer"
                  title="Limpar filtros"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Busca por Produto na Curva ABC */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar produto ou categoria..."
                value={abcSearch}
                onChange={(e) => setAbcSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-xs rounded-full border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:bg-white focus:outline-none transition"
              />
              {abcSearch && (
                <button
                  type="button"
                  onClick={() => setAbcSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Tabela Curva ABC */}
          <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
            <div className="p-4 bg-white border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#35312F] text-sm">
                  Classificação Analítica dos Produtos (Curva ABC)
                </h3>
                <p className="text-xs text-stone-400">
                  Ordenado por relevância financeira e percentual acumulado sobre a receita total
                </p>
              </div>

              <button
                onClick={handleExportABCCSV}
                className="h-8 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition inline-flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                title="Exportar classificação ABC em CSV"
              >
                <Download className="w-3 h-3 text-stone-500" />
                <span>Exportar CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4 font-semibold text-stone-600 text-center">Classe</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Produto</th>
                    <th className="py-3 px-4 text-center font-semibold text-stone-600">Unidades Vendidas</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Faturamento Total</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">% Receita</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">% Acumulada</th>
                    <th className="py-3 px-4 text-center font-semibold text-stone-600">Estoque Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {filteredAbcItems.length > 0 ? (
                    filteredAbcItems.map((item) => {
                      const badgeClasses = {
                        A: 'bg-[#858F6D]/20 text-[#4c543c] border-[#858F6D]/40',
                        B: 'bg-amber-50 text-[#924529] border-[#924529]/30',
                        C: 'bg-rose-50 text-[#850D2C] border-[#850D2C]/30',
                      };

                      return (
                        <tr key={item.productId} className="hover:bg-[#F9F7F3]/70 transition-colors duration-150">
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center font-extrabold text-xs border ${
                                badgeClasses[item.classification]
                              }`}
                            >
                              {item.classification}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#35312F] block">
                              {item.productName}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-medium text-[#35312F]">
                            {item.quantitySold} <span className="text-[11px] text-stone-400">un.</span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#35312F]">
                            {formatCurrencyBRL(item.totalRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right text-stone-500 font-medium">
                            {item.percentageOfRevenue}%
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#850D2C]">
                            {item.cumulativePercentage}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                item.currentStock <= 0
                                  ? 'bg-rose-50 text-[#850D2C] border-rose-200'
                                  : 'bg-stone-50 text-stone-700 border-stone-200'
                              }`}
                            >
                              {item.currentStock} un.
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400 text-xs">
                        Nenhum produto encontrado para o filtro selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================= ABA 3: CLIENTES MAIS FIÉIS ======================= */}
      {!loading && activeReport === 'customers' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Barra de Filtros e Busca de Clientes */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Ordenação Rápida */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-stone-400 font-medium mr-1">Ordenar por:</span>
              <button
                type="button"
                onClick={() => setCustomerSort('orders')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  customerSort === 'orders'
                    ? 'bg-[#850D2C] text-white shadow-2xs'
                    : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Mais Pedidos
              </button>
              <button
                type="button"
                onClick={() => setCustomerSort('spent')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  customerSort === 'spent'
                    ? 'bg-[#850D2C] text-white shadow-2xs'
                    : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Maior Gasto Total
              </button>
              <button
                type="button"
                onClick={() => setCustomerSort('ticket')}
                className={`h-8 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  customerSort === 'ticket'
                    ? 'bg-[#850D2C] text-white shadow-2xs'
                    : 'bg-stone-50 text-[#35312F] hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Maior Ticket Médio
              </button>
            </div>

            {/* Campo de Busca de Cliente */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente por nome..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-xs rounded-full border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:bg-white focus:outline-none transition"
              />
              {customerSearch && (
                <button
                  type="button"
                  onClick={() => setCustomerSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
            <div className="p-4 bg-white border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#35312F] text-sm">
                  Relatório de Clientes & Fidelidade
                </h3>
                <p className="text-xs text-stone-400">
                  Identifique os clientes com maior frequência de pedidos e maior ticket médio
                </p>
              </div>

              <button
                onClick={handleExportCustomersCSV}
                className="h-8 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition inline-flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                title="Exportar lista de fidelidade em CSV"
              >
                <Download className="w-3 h-3 text-stone-500" />
                <span>Exportar CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4 text-center font-semibold text-stone-600">Posição</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Cliente</th>
                    <th className="py-3 px-4 text-center font-semibold text-stone-600">Total de Pedidos</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Total Gasto</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Ticket Médio</th>
                    <th className="py-3 px-4 font-semibold text-stone-600">Item Predileto</th>
                    <th className="py-3 px-4 text-right font-semibold text-stone-600">Última Visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer, index) => (
                      <tr key={customer.customerName} className="hover:bg-[#F9F7F3]/70 transition-colors duration-150">
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-[11px] ${
                              index === 0
                                ? 'bg-[#850D2C] text-white shadow-2xs'
                                : index === 1
                                ? 'bg-stone-300 text-stone-800'
                                : index === 2
                                ? 'bg-amber-100 text-[#924529] border border-amber-300'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-semibold text-[#35312F]">
                          <div className="flex items-center space-x-2">
                            <span>{customer.customerName}</span>
                            {index === 0 && (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-medium text-[#35312F]">
                          {customer.totalOrders} <span className="text-[11px] text-stone-400">pedidos</span>
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-[#35312F]">
                          {formatCurrencyBRL(customer.totalSpent)}
                        </td>

                        <td className="py-3 px-4 text-right font-semibold text-[#850D2C]">
                          {formatCurrencyBRL(customer.averageTicket)}
                        </td>

                        <td className="py-3 px-4">
                          {customer.favoriteProduct ? (
                            <span className="inline-block bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full text-[11px] border border-stone-200">
                              {customer.favoriteProduct}
                            </span>
                          ) : (
                            <span className="text-stone-300">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right text-stone-400 font-normal">
                          {new Date(customer.lastOrderDate).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400 text-xs">
                        Nenhum cliente encontrado para "{customerSearch}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
