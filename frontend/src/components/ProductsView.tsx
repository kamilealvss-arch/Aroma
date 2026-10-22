import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Package,
  Sparkles,
  Info,
} from 'lucide-react';
import { Product, ProductCategory, ProductStatus } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import { ProductModal } from './ProductModal.tsx';

interface ProductsViewProps {
  products: Product[];
  onCreateProduct: (data: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onSoftDeleteProduct: (id: string) => Promise<void>;
  onRestoreProduct: (id: string) => Promise<void>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onCreateProduct,
  onUpdateProduct,
  onSoftDeleteProduct,
  onRestoreProduct,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ativo' | 'inativo'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Estado do Modal de Confirmação da Exclusão Lógica (Requisito 4)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtros
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'ALL' || p.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const activeCount = products.filter((p) => p.status === 'ativo').length;
  const inactiveCount = products.filter((p) => p.status === 'inativo').length;

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (data: Partial<Product>) => {
    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, data);
    } else {
      await onCreateProduct(data);
    }
  };

  const handleConfirmSoftDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await onSoftDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de destaque: Requisito 4 - Exclusão Lógica */}
      <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-stone-900">
                Gestão de Cardápio com Exclusão Lógica (Ponto de Ouro - Requisito 4)
              </h2>
              <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Requisito 4
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Ao excluir um item do cardápio, o sistema <strong>não remove fisicamente do banco de dados</strong> para não quebrar relatórios e o histórico de pedidos passados. O item tem seu status marcado como <code>inativo</code>, sumindo imediatamente do cardápio do cliente.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Ações & Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Busca */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome ou ingrediente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Botão Novo Produto */}
          <button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-900/20 flex items-center justify-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produto (Req. 16)</span>
          </button>
        </div>

        {/* Linha de Filtros: Categorias e Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          {/* Categorias */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                selectedCategory === 'ALL'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Todas as Categorias ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-amber-700 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Filtro de Status (Ativo vs Inativo) */}
          <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                selectedStatus === 'ALL'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              onClick={() => setSelectedStatus('ativo')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
                selectedStatus === 'ativo'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Eye className="w-3 h-3 text-emerald-600" />
              <span>No Cardápio ({activeCount})</span>
            </button>
            <button
              onClick={() => setSelectedStatus('inativo')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
                selectedStatus === 'inativo'
                  ? 'bg-white text-stone-800 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <EyeOff className="w-3 h-3 text-rose-500" />
              <span>Inativos / Excluídos ({inactiveCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((product) => {
          const isInactive = product.status === 'inativo';
          const isOutOfStock = product.stockQuantity <= 0;
          const isLowStock =
            product.stockQuantity > 0 &&
            product.stockQuantity <= product.minStockThreshold;

          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                isInactive
                  ? 'border-stone-300/80 bg-stone-50/50 opacity-80'
                  : 'border-stone-200/90'
              }`}
            >
              <div>
                {/* Imagem do Produto com Badges (Requisito 16) */}
                <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className={`w-full h-full object-cover transition duration-300 ${
                      isInactive ? 'grayscale-70' : 'hover:scale-105'
                    }`}
                  />
                  {/* Categoria Badge */}
                  <span className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {product.category}
                  </span>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    {isInactive ? (
                      <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-sm">
                        <EyeOff className="w-3 h-3" />
                        <span>Inativo (Excluído)</span>
                      </span>
                    ) : isOutOfStock ? (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Esgotado
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-amber-500 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        Estoque Baixo ({product.stockQuantity} un.)
                      </span>
                    ) : (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        Ativo
                      </span>
                    )}
                  </div>
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

                  {/* Mini dados: Estoque e Custo */}
                  <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                    <div className="flex items-center space-x-1">
                      <Package className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        Estoque:{' '}
                        <strong
                          className={
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-700'
                              : 'text-stone-800'
                          }
                        >
                          {product.stockQuantity} un.
                        </strong>
                      </span>
                    </div>
                    <span>Custo: {formatCurrencyBRL(product.costPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação do CRUD */}
              <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                {isInactive ? (
                  /* Botão Reativar */
                  <button
                    onClick={() => onRestoreProduct(product.id)}
                    className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reativar no Cardápio</span>
                  </button>
                ) : (
                  <>
                    {/* Editar */}
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="flex-1 py-1.5 px-3 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Editar</span>
                    </button>

                    {/* Excluir (Lógica - Requisito 4) */}
                    <button
                      onClick={() => setProductToDelete(product)}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                      title="Exclusão lógica do produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-bold text-stone-800 text-base">
            Nenhum produto encontrado
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Tente ajustar os filtros de busca ou cadastre um novo produto com o botão acima.
          </p>
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={editingProduct}
      />

      {/* Modal Educativo de Confirmação: Exclusão Lógica (Requisito 4) */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-stone-900">
                  Confirmar Exclusão Lógica?
                </h3>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                  Req. 4
                </span>
              </div>

              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Você solicitou desativar o produto: <strong>"{productToDelete.name}"</strong>.
              </p>

              {/* Explicação Didática da Exclusão Lógica */}
              <div className="mt-4 p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                  <Info className="w-4 h-4 text-amber-700" />
                  <span>Como funciona a Exclusão Lógica:</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-normal">
                  • O produto <strong>NÃO</strong> é apagado do banco de dados (o que quebraria relatórios antigos e o histórico de vendas).
                </p>
                <p className="text-stone-600 text-[11px] leading-normal">
                  • O campo <code>status</code> é marcado como <code>'inativo'</code>.
                </p>
                <p className="text-stone-600 text-[11px] leading-normal">
                  • Ele <strong>some imediatamente do cardápio digital do cliente</strong>, mas você pode reativá-lo a qualquer momento.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setProductToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmSoftDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  {isDeleting ? (
                    <span>Processando...</span>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirmar Exclusão Lógica</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
