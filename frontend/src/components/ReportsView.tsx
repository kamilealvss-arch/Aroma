import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Users,
  Download,
  Filter,
  DollarSign,
  Package,
  ShoppingBag,
  RefreshCw,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  ABCCurveItem,
  CustomerLoyaltyItem,
  Order,
  Product,
} from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

type ActiveTab = 'sales' | 'abc' | 'customers';
type DatePreset = 'today' | '7days' | '15days' | '30days' | 'month' | 'all' | 'custom';
type SalesSortKey = 'name' | 'quantity' | 'revenue' | 'profit' | 'margin';
type SortDirection = 'asc' | 'desc';

export const ReportsView: React.FC = () => {
  // Aba ativa: Vendas & Faturamento (padrão), Curva ABC ou Clientes
  const [activeTab, setActiveTab] = useState<ActiveTab>('sales');

  // Filtro de Datas
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sevenDaysAgoStr = useMemo(
    () => new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    []
  );

  const [startDate, setStartDate] = useState(sevenDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [activePreset, setActivePreset] = useState<DatePreset>('7days');

  // Estados da Tabela de Produtos Detalhada
  const [tableSearch, setTableSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [tableSortKey, setTableSortKey] = useState<SalesSortKey>('revenue');
  const [tableSortDir, setTableSortDir] = useState<SortDirection>('desc');
  const [tablePage, setTablePage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Estados de Curva ABC e Clientes
  const [abcClassFilter, setAbcClassFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [abcSearch, setAbcSearch] = useState('');
  const [abcPage, setAbcPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSort, setCustomerSort] = useState<'orders' | 'spent' | 'ticket'>('orders');
  const [customerPage, setCustomerPage] = useState(1);

  // Catálogo e Dados do Backend
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
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

  const [abcData, setAbcData] = useState<{
    items: ABCCurveItem[];
    classASummary: { count: number; revenue: number };
    classBSummary: { count: number; revenue: number };
    classCSummary: { count: number; revenue: number };
    totalRevenue: number;
  } | null>(null);

  const [customersData, setCustomersData] = useState<CustomerLoyaltyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  // Carrega catálogo para mapear categorias
  useEffect(() => {
    api
      .getProducts()
      .then((prods) => setCatalogProducts(prods))
      .catch((err) => console.error('Erro ao carregar catálogo para relatórios:', err));
  }, []);

  // Recarrega relatório ao alterar aba
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Mapa rápido de Produto -> Categoria
  const productCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of catalogProducts) {
      map.set(p.id, p.category);
    }
    return map;
  }, [catalogProducts]);

  // Busca dados analíticos
  const fetchData = async (overrideStart?: string, overrideEnd?: string) => {
    setLoading(true);
    try {
      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

      const start = overrideStart !== undefined ? overrideStart : startDate;
      const end = overrideEnd !== undefined ? overrideEnd : endDate;

      if (activeTab === 'sales') {
        const data = await api.getSalesReport(start, end);
        setSalesReportData(data);
      } else if (activeTab === 'abc') {
        const data = await api.getABCCurveReport();
        setAbcData(data);
      } else if (activeTab === 'customers') {
        const data = await api.getCustomerReport();
        setCustomersData(data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados analíticos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Atalhos rápidos de período
  const handleSelectPreset = (preset: 'today' | '7days' | '15days' | '30days' | 'month' | 'all') => {
    let start = todayStr;
    let end = todayStr;

    if (preset === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (preset === '7days') {
      start = sevenDaysAgoStr;
      end = todayStr;
    } else if (preset === '15days') {
      start = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
    setTablePage(1);
    fetchData(start, end);
  };

  const handleApplyCustomDates = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (startDate > endDate) {
      alert('A data inicial não pode ser superior à data final.');
      return;
    }
    setActivePreset('custom');
    setTablePage(1);
    fetchData(startDate, endDate);
  };

  // Itens da Tabela de Produtos Detalhada
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    if (salesReportData) {
      for (const item of salesReportData.itemsSoldSummary) {
        const cat = productCategoryMap.get(item.productId);
        if (cat) set.add(cat);
      }
    }
    return Array.from(set);
  }, [salesReportData, productCategoryMap]);

  const filteredAndSortedTableItems = useMemo(() => {
    if (!salesReportData) return [];

    let items = salesReportData.itemsSoldSummary.map((item) => {
      const category = productCategoryMap.get(item.productId) || 'Geral';
      const margin =
        item.totalRevenue > 0 ? Number(((item.totalProfit / item.totalRevenue) * 100).toFixed(1)) : 0;
      const unitAvgPrice = item.quantity > 0 ? item.totalRevenue / item.quantity : 0;
      const shareOfTotal =
        salesReportData.totalRevenue > 0
          ? Number(((item.totalRevenue / salesReportData.totalRevenue) * 100).toFixed(1))
          : 0;

      return {
        ...item,
        category,
        margin,
        unitAvgPrice,
        shareOfTotal,
      };
    });

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      items = items.filter(
        (i) => i.productName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'ALL') {
      items = items.filter((i) => i.category === categoryFilter);
    }

    items.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (tableSortKey === 'name') {
        valA = a.productName;
        valB = b.productName;
        return tableSortDir === 'asc'
          ? (valA as string).localeCompare(valB as string, 'pt-BR')
          : (valB as string).localeCompare(valA as string, 'pt-BR');
      } else if (tableSortKey === 'quantity') {
        valA = a.quantity;
        valB = b.quantity;
      } else if (tableSortKey === 'revenue') {
        valA = a.totalRevenue;
        valB = b.totalRevenue;
      } else if (tableSortKey === 'profit') {
        valA = a.totalProfit;
        valB = b.totalProfit;
      } else if (tableSortKey === 'margin') {
        valA = a.margin;
        valB = b.margin;
      }

      return tableSortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return items;
  }, [salesReportData, productCategoryMap, tableSearch, categoryFilter, tableSortKey, tableSortDir]);

  const totalTablePages = Math.max(1, Math.ceil(filteredAndSortedTableItems.length / itemsPerPage));
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const paginatedTableItems = useMemo(() => {
    const start = (safeTablePage - 1) * itemsPerPage;
    return filteredAndSortedTableItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedTableItems, safeTablePage, itemsPerPage]);

  const toggleTableSort = (key: SalesSortKey) => {
    if (tableSortKey === key) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortKey(key);
      setTableSortDir('desc');
    }
    setTablePage(1);
  };

  // Helper de Exportação CSV
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
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
    const headers = [
      'Produto',
      'Categoria',
      'Quantidade Vendida',
      'Faturamento Total (R$)',
      'Lucro Estimado (R$)',
      'Margem (%)',
    ];
    const rows = filteredAndSortedTableItems.map((i) => [
      `"${i.productName}"`,
      `"${i.category}"`,
      i.quantity,
      i.totalRevenue.toFixed(2),
      i.totalProfit.toFixed(2),
      `${i.margin}%`,
    ]);
    exportToCSV(`aroma_vendas_${startDate}_a_${endDate}`, headers, rows);
  };

  const handleExportABCCSV = () => {
    if (!abcData) return;
    const headers = [
      'Classe',
      'Produto',
      'Categoria',
      'Quantidade Vendida',
      'Faturamento (R$)',
      '% Receita',
      '% Acumulada',
      'Estoque Atual',
    ];
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
    exportToCSV('aroma_curva_abc_produtos', headers, rows);
  };

  const handleExportCustomersCSV = () => {
    const headers = [
      'Cliente',
      'Total de Pedidos',
      'Gasto Total (R$)',
      'Ticket Médio (R$)',
      'Última Compra',
      'Item Favorito',
    ];
    const rows = customersData.map((c) => [
      `"${c.customerName}"`,
      c.totalOrders,
      c.totalSpent.toFixed(2),
      c.averageTicket.toFixed(2),
      c.lastOrderDate.slice(0, 10),
      `"${c.favoriteProduct || 'N/A'}"`,
    ]);
    exportToCSV('aroma_clientes_fidelidade', headers, rows);
  };

  return (
    <div
      className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6 text-[#35312F]"
      style={{ zoom: 1.05 }}
    >
      {/* 1. CABEÇALHO LIMPO E ELEGANTE (SEM ELEMENTOS REPETIDOS) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <nav className="flex items-center space-x-1.5 text-xs text-stone-400 font-medium">
            <span className="hover:text-[#35312F] transition">Painel</span>
            <span>/</span>
            <span className="text-[#850D2C] font-semibold">
              {activeTab === 'sales'
                ? 'Vendas & Faturamento'
                : activeTab === 'abc'
                ? 'Curva ABC de Estoque'
                : 'Clientes & Fidelidade'}
            </span>
          </nav>

          <h1
            className="text-2xl sm:text-3xl font-normal tracking-tight text-[#35312F] mt-1"
            style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
          >
            Relatórios
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Resultados de vendas, margem operacional e produtos da cafeteria.
          </p>
        </div>

        {/* Ações Rápidas do Cabeçalho */}
        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 h-8.5 px-3 rounded-xl text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition cursor-pointer disabled:opacity-60"
            title="Atualizar dados em tempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-500 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          <button
            onClick={
              activeTab === 'abc'
                ? handleExportABCCSV
                : activeTab === 'customers'
                ? handleExportCustomersCSV
                : handleExportSalesCSV
            }
            className="inline-flex items-center space-x-1.5 h-8.5 px-3.5 rounded-xl text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] transition cursor-pointer shadow-2xs"
            title="Exportar dados em planilha CSV"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO ENTRE ABAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        <div className="inline-flex p-1 bg-stone-100/90 rounded-2xl border border-stone-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F]'
            }`}
          >
            <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'sales' ? 'text-white' : 'text-stone-400'}`} />
            <span>Vendas & Faturamento</span>
            {salesReportData && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                  activeTab === 'sales' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {salesReportData.itemsSoldSummary.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('abc')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'abc'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F]'
            }`}
          >
            <span>Curva ABC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-[#850D2C] text-white shadow-2xs'
                : 'text-stone-600 hover:text-[#35312F]'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${activeTab === 'customers' ? 'text-white' : 'text-stone-400'}`} />
            <span>Clientes & Fidelidade</span>
          </button>
        </div>

        <span className="text-xs text-stone-400 hidden sm:inline">
          Atualizado às {lastUpdatedTime}
        </span>
      </div>

      {/* 3. BARRA DE FILTROS DE PERÍODO DISCRETA E ENXUTA */}
      {activeTab === 'sales' && (
        <div className="bg-[#F9F7F3] rounded-2xl border border-stone-200/80 p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-stone-500 mr-1 hidden sm:inline">
              Período:
            </span>
            {(['today', '7days', '15days', '30days', 'month', 'all'] as const).map((preset) => {
              const labels = {
                today: 'Hoje',
                '7days': '7 dias',
                '15days': '15 dias',
                '30days': '30 dias',
                month: 'Este Mês',
                all: 'Todo o Período',
              };
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                    activePreset === preset
                      ? 'bg-[#850D2C] text-white shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>

          {/* Seletor Customizado De/Até */}
          <form onSubmit={handleApplyCustomDates} className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 text-xs bg-white px-2 py-1 rounded-xl border border-stone-200">
              <span className="text-stone-400 font-medium">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="h-5 text-xs text-[#35312F] font-semibold bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-1 text-xs bg-white px-2 py-1 rounded-xl border border-stone-200">
              <span className="text-stone-400 font-medium">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
                className="h-5 text-xs text-[#35312F] font-semibold bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="h-7 px-3 bg-[#850D2C] hover:bg-[#6e0a24] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Filtrar
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: VENDAS & FATURAMENTO (MINIMALISTA, ELEGANTE E DIRETO AO PONTO)     */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && salesReportData && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 4 CARDS PRINCIPAIS: FATURAMENTO, CUSTOS, LUCRO E TICKET MÉDIO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Faturamento */}
            <div className="p-5 rounded-2xl border border-stone-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                <span>Faturamento</span>
                <DollarSign className="w-4 h-4 text-[#850D2C]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                {formatCurrencyBRL(salesReportData.totalRevenue)}
              </div>
              <p className="text-[11px] text-stone-400 mt-2 font-medium">
                {salesReportData.totalOrders} {salesReportData.totalOrders === 1 ? 'pedido concluído' : 'pedidos concluídos'}
              </p>
            </div>

            {/* Card 2: Custos dos Produtos (Insumos) */}
            <div className="p-5 rounded-2xl border border-stone-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                <span>Custos dos Produtos (Insumos)</span>
                <ShoppingBag className="w-4 h-4 text-[#924529]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#924529] mt-2 tracking-tight">
                {formatCurrencyBRL(salesReportData.totalCost)}
              </div>
              <p className="text-[11px] text-stone-500 mt-2 font-medium">
                {salesReportData.totalRevenue > 0
                  ? ((salesReportData.totalCost / salesReportData.totalRevenue) * 100).toFixed(1)
                  : '0.0'}
                % do faturamento
              </p>
            </div>

            {/* Card 3: Lucro Estimado */}
            <div className="p-5 rounded-2xl border border-stone-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                <span>Lucro Estimado</span>
                <TrendingUp className="w-4 h-4 text-[#858F6D]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#4c543c] mt-2 tracking-tight">
                {formatCurrencyBRL(salesReportData.totalProfit)}
              </div>
              <p className="text-[11px] text-[#4c543c] mt-2 font-semibold">
                {salesReportData.totalRevenue > 0
                  ? ((salesReportData.totalProfit / salesReportData.totalRevenue) * 100).toFixed(1)
                  : '0.0'}
                % de margem líquida
              </p>
            </div>

            {/* Card 4: Gasto Médio por Pedido (Ticket Médio) */}
            <div className="p-5 rounded-2xl border border-stone-200/80 bg-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-stone-500">
                <span>Gasto Médio por Pedido</span>
                <Package className="w-4 h-4 text-stone-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#35312F] mt-2 tracking-tight">
                {formatCurrencyBRL(salesReportData.averageTicket)}
              </div>
              <p className="text-[11px] text-stone-400 mt-2 font-medium">
                Ticket médio por cliente
              </p>
            </div>
          </div>

          {/* TABELA DE DESEMPENHO DOS PRODUTOS (DIRETO ABAIXO DOS INDICADORES) */}
          <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs">
            {/* Controles da Tabela: Busca + Filtro por Categoria */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
              <div>
                <h3 className="font-semibold text-[#35312F] text-sm">
                  Desempenho Comercial dos Produtos
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  {filteredAndSortedTableItems.length} itens encontrados no período selecionado
                </p>
              </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Categoria */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setTablePage(1);
                  }}
                  className="h-8 pl-3 pr-7 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-700 font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition cursor-pointer appearance-none"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Filter className="w-3 h-3 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Busca em Tempo Real */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setTablePage(1);
                  }}
                  className="w-full h-8 pl-8 pr-7 text-xs rounded-xl border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:bg-white focus:outline-none transition"
                />
                {tableSearch && (
                  <button
                    type="button"
                    onClick={() => setTableSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Seletor de Itens por Página */}
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setTablePage(1);
                }}
                className="h-8 px-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value={5}>5 / pág</option>
                <option value={10}>10 / pág</option>
                <option value={20}>20 / pág</option>
              </select>
            </div>
          </div>

          {/* Tabela de Produtos com Ordenação Clicável */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th
                    onClick={() => toggleTableSort('name')}
                    className="py-3 px-4 cursor-pointer hover:text-[#850D2C] transition select-none"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Produto</span>
                      {tableSortKey === 'name' ? (
                        tableSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#850D2C]" /> : <ArrowDown className="w-3 h-3 text-[#850D2C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-4">Categoria</th>

                  <th
                    onClick={() => toggleTableSort('quantity')}
                    className="py-3 px-4 text-center cursor-pointer hover:text-[#850D2C] transition select-none"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Qtd. Vendida</span>
                      {tableSortKey === 'quantity' ? (
                        tableSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#850D2C]" /> : <ArrowDown className="w-3 h-3 text-[#850D2C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => toggleTableSort('revenue')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-[#850D2C] transition select-none"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Faturamento</span>
                      {tableSortKey === 'revenue' ? (
                        tableSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#850D2C]" /> : <ArrowDown className="w-3 h-3 text-[#850D2C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => toggleTableSort('profit')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-[#850D2C] transition select-none"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Lucro Estimado</span>
                      {tableSortKey === 'profit' ? (
                        tableSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#850D2C]" /> : <ArrowDown className="w-3 h-3 text-[#850D2C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => toggleTableSort('margin')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-[#850D2C] transition select-none"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Margem (%)</span>
                      {tableSortKey === 'margin' ? (
                        tableSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#850D2C]" /> : <ArrowDown className="w-3 h-3 text-[#850D2C]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100 bg-white">
                {paginatedTableItems.length > 0 ? (
                  paginatedTableItems.map((item) => (
                    <tr key={item.productId} className="hover:bg-[#F9F7F3]/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#35312F]">{item.productName}</td>
                      <td className="py-3 px-4 text-stone-500">{item.category}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{item.quantity} un.</td>
                      <td className="py-3 px-4 text-right font-bold text-[#35312F] font-mono">
                        {formatCurrencyBRL(item.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#4c543c] font-mono">
                        {formatCurrencyBRL(item.totalProfit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#858F6D]/15 text-[#4c543c] font-mono">
                          {item.margin}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400 text-xs">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação da Tabela */}
          <div className="p-3.5 bg-white border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>
              Exibindo {(safeTablePage - 1) * itemsPerPage + 1}–
              {Math.min(safeTablePage * itemsPerPage, filteredAndSortedTableItems.length)} de{' '}
              {filteredAndSortedTableItems.length} produtos
            </span>

            {totalTablePages > 1 && (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  disabled={safeTablePage === 1}
                  className="p-1 rounded-md border border-stone-200 text-stone-600 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-semibold text-stone-800">
                  {safeTablePage} / {totalTablePages}
                </span>
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                  disabled={safeTablePage === totalTablePages}
                  className="p-1 rounded-md border border-stone-200 text-stone-600 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: CURVA ABC (SIMPLIFICADA PARA CONSULTA)                              */}
      {/* ========================================================================= */}
      {activeTab === 'abc' && (
        <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs animate-in fade-in duration-150">
          <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAbcClassFilter('ALL');
                  setAbcPage(1);
                }}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  abcClassFilter === 'ALL'
                    ? 'bg-[#850D2C] text-white'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Todas ({abcData?.items.length || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbcClassFilter('A');
                  setAbcPage(1);
                }}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  abcClassFilter === 'A'
                    ? 'bg-[#850D2C] text-white'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Classe A (Alto Giro)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbcClassFilter('B');
                  setAbcPage(1);
                }}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  abcClassFilter === 'B'
                    ? 'bg-[#850D2C] text-white'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Classe B (Médio)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbcClassFilter('C');
                  setAbcPage(1);
                }}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  abcClassFilter === 'C'
                    ? 'bg-[#850D2C] text-white'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Classe C (Baixo Giro)
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar na Curva ABC..."
                value={abcSearch}
                onChange={(e) => {
                  setAbcSearch(e.target.value);
                  setAbcPage(1);
                }}
                className="w-full h-8 pl-8 pr-7 text-xs rounded-xl border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4 text-center">Classe</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-center">Qtd. Vendida</th>
                  <th className="py-3 px-4 text-right">Faturamento</th>
                  <th className="py-3 px-4 text-right">% Receita</th>
                  <th className="py-3 px-4 text-right">% Acumulada</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {abcData?.items
                  .filter((item) => {
                    const matchesClass = abcClassFilter === 'ALL' || item.classification === abcClassFilter;
                    const matchesSearch =
                      item.productName.toLowerCase().includes(abcSearch.toLowerCase()) ||
                      item.category.toLowerCase().includes(abcSearch.toLowerCase());
                    return matchesClass && matchesSearch;
                  })
                  .map((item) => (
                    <tr key={item.productId} className="hover:bg-[#F9F7F3]/70 transition">
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`w-6 h-6 rounded-md inline-flex items-center justify-center font-extrabold text-xs border ${
                            item.classification === 'A'
                              ? 'bg-[#858F6D]/20 text-[#4c543c] border-[#858F6D]/40'
                              : item.classification === 'B'
                              ? 'bg-amber-50 text-[#924529] border-[#924529]/30'
                              : 'bg-rose-50 text-[#850D2C] border-[#850D2C]/30'
                          }`}
                        >
                          {item.classification}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#35312F]">{item.productName}</td>
                      <td className="py-3 px-4 text-center font-mono font-medium">{item.quantitySold} un.</td>
                      <td className="py-3 px-4 text-right font-bold text-[#35312F] font-mono">
                        {formatCurrencyBRL(item.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-500 font-mono">{item.percentageOfRevenue}%</td>
                      <td className="py-3 px-4 text-right font-bold text-[#850D2C] font-mono">
                        {item.cumulativePercentage}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
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
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: CLIENTES & FIDELIDADE                                              */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-2xs animate-in fade-in duration-150">
          <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-stone-400 font-medium mr-1">Ordenar:</span>
              <button
                type="button"
                onClick={() => setCustomerSort('orders')}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  customerSort === 'orders' ? 'bg-[#850D2C] text-white' : 'bg-stone-50 text-stone-700 border border-stone-200'
                }`}
              >
                Mais Pedidos
              </button>
              <button
                type="button"
                onClick={() => setCustomerSort('spent')}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  customerSort === 'spent' ? 'bg-[#850D2C] text-white' : 'bg-stone-50 text-stone-700 border border-stone-200'
                }`}
              >
                Maior Gasto
              </button>
              <button
                type="button"
                onClick={() => setCustomerSort('ticket')}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                  customerSort === 'ticket' ? 'bg-[#850D2C] text-white' : 'bg-stone-50 text-stone-700 border border-stone-200'
                }`}
              >
                Ticket Médio
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-xs rounded-xl border border-stone-200 bg-stone-50 text-[#35312F] placeholder-stone-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F9F7F3] border-b border-stone-200/80 text-stone-600 font-semibold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-4 text-center">Posição</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Pedidos</th>
                  <th className="py-3 px-4 text-right">Gasto Total</th>
                  <th className="py-3 px-4 text-right">Ticket Médio</th>
                  <th className="py-3 px-4">Item Predileto</th>
                  <th className="py-3 px-4 text-right">Última Visita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {customersData
                  .filter((c) => c.customerName.toLowerCase().includes(customerSearch.toLowerCase()))
                  .sort((a, b) => {
                    if (customerSort === 'spent') return b.totalSpent - a.totalSpent;
                    if (customerSort === 'ticket') return b.averageTicket - a.averageTicket;
                    return b.totalOrders - a.totalOrders;
                  })
                  .map((customer, index) => (
                    <tr key={customer.customerName} className="hover:bg-[#F9F7F3]/70 transition">
                      <td className="py-3 px-4 text-center font-bold text-stone-600">{index + 1}º</td>
                      <td className="py-3 px-4 font-semibold text-[#35312F]">{customer.customerName}</td>
                      <td className="py-3 px-4 text-center font-mono">{customer.totalOrders} pedidos</td>
                      <td className="py-3 px-4 text-right font-bold text-[#35312F] font-mono">
                        {formatCurrencyBRL(customer.totalSpent)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#850D2C] font-mono">
                        {formatCurrencyBRL(customer.averageTicket)}
                      </td>
                      <td className="py-3 px-4 text-stone-500">{customer.favoriteProduct || '—'}</td>
                      <td className="py-3 px-4 text-right text-stone-400 font-mono">
                        {new Date(customer.lastOrderDate).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
