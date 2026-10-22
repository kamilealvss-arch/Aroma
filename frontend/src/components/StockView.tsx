import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { Product, StockAlert } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

interface StockViewProps {
  products: Product[];
  alerts: StockAlert[];
  onAdjustStock: (productId: string, newStock: number, reason?: string) => Promise<void>;
  onRefresh: () => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  alerts,
  onAdjustStock,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ESGOTADO' | 'BAIXO' | 'NORMAL'>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Reposição de fornecedor');
  const [isSaving, setIsSaving] = useState(false);

  // Produtos ativos no cardápio
  const activeProducts = products.filter((p) => p.status === 'ativo');

  const filteredProducts = activeProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const isOutOfStock = p.stockQuantity <= 0;
    const isLow = p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold;
    const isNormal = p.stockQuantity > p.minStockThreshold;

    if (filter === 'ESGOTADO') return matchesSearch && isOutOfStock;
    if (filter === 'BAIXO') return matchesSearch && isLow;
    if (filter === 'NORMAL') return matchesSearch && isNormal;
    return matchesSearch;
  });

  const handleOpenAdjustModal = (product: Product, defaultAdd?: number) => {
    setSelectedProduct(product);
    setNewStockValue(defaultAdd ? product.stockQuantity + defaultAdd : product.stockQuantity);
    setAdjustReason(defaultAdd ? `Entrada de reposição de +${defaultAdd} unidades` : 'Contagem física de inventário');
  };

  const handleSaveStock = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);
    try {
      await onAdjustStock(selectedProduct.id, newStockValue, adjustReason);
      setSelectedProduct(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdd = async (product: Product, qty: number) => {
    await onAdjustStock(
      product.id,
      product.stockQuantity + qty,
      `Reposição rápida de balcão (+${qty} un.)`
    );
  };

  const handleZeroStockToTest = async (product: Product) => {
    await onAdjustStock(
      product.id,
      0,
      'Zerar estoque para demonstração do produto Esgotado no cardápio do cliente (RF04)'
    );
  };

  return (
    <div className="space-y-6">
      {/* Box explicativo da Regra de Negócio (Requisito 5 & RF04) */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 border border-stone-800 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-amber-600 rounded-xl text-white shrink-0 mt-0.5">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-amber-200">
                  Controle de Estoque Inteligente & Baixa Automática (Requisito 19 - RF04)
                </h2>
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-700/50 px-2 py-0.5 rounded-full font-bold uppercase">
                  Regra de Negócio Req. 5
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1 max-w-3xl leading-relaxed">
                <strong>Sem necessidade de controle manual exaustivo:</strong> toda vez que um cliente finaliza um pedido no balcão ou pelo cardápio digital, o sistema subtrai automaticamente as unidades do estoque. Se o estoque chegar a zero, o produto é sinalizado como <strong>"Esgotado"</strong> no cardápio digital e tem sua compra bloqueada.
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold border border-stone-700 transition shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar Estoque</span>
          </button>
        </div>
      </div>

      {/* Cards de Status de Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilter('ALL')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            filter === 'ALL'
              ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-stone-600">
            <span>Itens Monitorados</span>
            <Package className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-extrabold text-stone-900 mt-2">
            {activeProducts.length} produtos
          </div>
          <span className="text-[11px] text-stone-400">Total ativo no cardápio</span>
        </div>

        <div
          onClick={() => setFilter('BAIXO')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            filter === 'BAIXO'
              ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span>Nível de Reposição (&le; 5 un.)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-800 mt-2">
            {alerts.filter((a) => !a.isOutOfStock).length} produtos
          </div>
          <span className="text-[11px] text-amber-700">Atenção para compras</span>
        </div>

        <div
          onClick={() => setFilter('ESGOTADO')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            filter === 'ESGOTADO'
              ? 'bg-rose-50/80 border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-900">
            <span>Esgotados no Cardápio (0 un.)</span>
            <ArrowDownCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-800 mt-2">
            {alerts.filter((a) => a.isOutOfStock).length} produtos
          </div>
          <span className="text-[11px] text-rose-700">Bloqueados para venda ao cliente</span>
        </div>
      </div>

      {/* Tabela de Controle de Estoque */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Filtros da Tabela */}
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por produto no estoque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs text-stone-500">
            <span>Exibindo <strong>{filteredProducts.length}</strong> itens</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Estoque Atual</th>
                <th className="py-3 px-4">Limite Mínimo</th>
                <th className="py-3 px-4">Status de Disponibilidade</th>
                <th className="py-3 px-4 text-right">Reposição Rápida</th>
                <th className="py-3 px-4 text-right">Ajuste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stockQuantity <= 0;
                const isLow =
                  product.stockQuantity > 0 &&
                  product.stockQuantity <= product.minStockThreshold;

                return (
                  <tr key={product.id} className="hover:bg-stone-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-stone-200"
                        />
                        <div>
                          <span className="font-bold text-stone-900 block">
                            {product.name}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            Preço: {formatCurrencyBRL(product.price)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-stone-600 font-medium">
                      {product.category}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-sm font-extrabold ${
                          isOutOfStock
                            ? 'text-rose-600'
                            : isLow
                            ? 'text-amber-700'
                            : 'text-stone-900'
                        }`}
                      >
                        {product.stockQuantity} un.
                      </span>
                    </td>

                    <td className="py-3 px-4 text-stone-500">
                      {product.minStockThreshold} un.
                    </td>

                    <td className="py-3 px-4">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Esgotado (Bloqueia venda)</span>
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          <span>Atenção: Repor</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Normal / Abastecido</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleQuickAdd(product, 10)}
                          className="px-2 py-1 bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 rounded-lg text-xs font-bold border border-stone-200 transition"
                          title="Adicionar +10 unidades ao estoque"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleQuickAdd(product, 25)}
                          className="px-2 py-1 bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 rounded-lg text-xs font-bold border border-stone-200 transition"
                          title="Adicionar +25 unidades ao estoque"
                        >
                          +25
                        </button>
                        {/* Botão de teste para zerar e ver esgotado */}
                        {product.stockQuantity > 0 && (
                          <button
                            onClick={() => handleZeroStockToTest(product)}
                            className="px-2 py-1 bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-700 rounded-lg text-[10px] font-semibold border border-stone-200 transition"
                            title="Zerar para testar exibição como Esgotado"
                          >
                            Zerar (Teste)
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenAdjustModal(product)}
                        className="p-1.5 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg transition"
                        title="Ajuste manual de estoque com justificativa"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Ajuste de Estoque */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">
                  Ajustar Estoque de "{selectedProduct.name}"
                </h3>
                <span className="text-xs text-stone-500">
                  Estoque atual: <strong>{selectedProduct.stockQuantity} un.</strong>
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nova Quantidade em Estoque
                </label>
                <input
                  type="number"
                  min="0"
                  value={newStockValue}
                  onChange={(e) => setNewStockValue(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 text-base font-extrabold text-stone-900 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Motivo / Justificativa (Registrado na Auditoria)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Recebimento de carga de fornecedor, quebra..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-500 border border-stone-200">
                Esta alteração será registrada com nome do usuário e data na aba <strong>Auditoria de Segurança (Requisito 11)</strong>.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveStock}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Novo Estoque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
