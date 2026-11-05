import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Plus,
  Check,
} from 'lucide-react';
import { Product, ProductCategory } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => Promise<void>;
  productToEdit?: Product | null;
  categories?: string[];
  onCreateCategory?: (newCategory: string) => void;
}

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  'Cafés Especiais',
  'Bebidas Geladas',
  'Doces & Bolos',
  'Salgados Artesanais',
  'Combos & Brunch',
];

const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80';

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  categories = DEFAULT_CATEGORIES,
  onCreateCategory,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('12.00');
  const [costPrice, setCostPrice] = useState('4.00');
  const [category, setCategory] = useState<ProductCategory>('Cafés Especiais');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [minStockThreshold, setMinStockThreshold] = useState('5');
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE_URL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para criação de nova categoria diretamente no modal
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Garante que todas as categorias (padrão + existentes + atual) apareçam no select
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories, ...(category ? [category] : [])])
  );

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setDescription(productToEdit.description);
      setPrice(productToEdit.price.toString());
      setCostPrice(productToEdit.costPrice.toString());
      setCategory(productToEdit.category);
      setStockQuantity(productToEdit.stockQuantity.toString());
      setMinStockThreshold(productToEdit.minStockThreshold.toString());
      setImageUrl(productToEdit.imageUrl);
    } else {
      setName('');
      setDescription('');
      setPrice('12.00');
      setCostPrice('4.00');
      setCategory(categories[0] || 'Cafés Especiais');
      setStockQuantity('50');
      setMinStockThreshold('5');
      setImageUrl(DEFAULT_IMAGE_URL);
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  // Confirma a criação de uma nova categoria no modal
  const handleConfirmNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (onCreateCategory) {
      onCreateCategory(trimmed);
    }
    setCategory(trimmed);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  // Upload de arquivo de foto
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter menos de 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do produto.');
      return;
    }

    // Se o usuário digitou uma categoria nova no campo aberto e clicou direto em Salvar
    let finalCategory = category;
    if (isCreatingCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      if (onCreateCategory) {
        onCreateCategory(finalCategory);
      }
    }

    if (!finalCategory || !finalCategory.trim()) {
      setError('Por favor, selecione ou crie uma categoria.');
      return;
    }

    const numPrice = parseFloat(price);
    const numCost = parseFloat(costPrice);
    const numStock = parseInt(stockQuantity, 10);
    const numMin = parseInt(minStockThreshold, 10);

    if (isNaN(numPrice) || numPrice <= 0) {
      setError('O preço de venda deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        price: numPrice,
        costPrice: isNaN(numCost) ? numPrice * 0.4 : numCost,
        category: finalCategory,
        stockQuantity: isNaN(numStock) ? 0 : numStock,
        minStockThreshold: isNaN(numMin) ? 5 : numMin,
        imageUrl: imageUrl || DEFAULT_IMAGE_URL,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedPrice = parseFloat(price) || 0;
  const parsedCost = parseFloat(costPrice) || 0;
  const estimatedProfit = Math.max(0, parsedPrice - parsedCost);
  const estimatedMargin =
    parsedPrice > 0 ? Math.round(((parsedPrice - parsedCost) / parsedPrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 p-6 sm:p-7 relative my-8 animate-in fade-in zoom-in-95 duration-150 text-[#35312F]">
        {/* Cabeçalho do Modal no padrão Aroma */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3 className="font-bold text-[#35312F] text-base">
              {productToEdit ? 'Editar Produto do Cardápio' : 'Cadastrar Novo Produto'}
            </h3>
            <p className="text-xs text-stone-400">
              {productToEdit
                ? 'Atualize informações, precificação, foto ou parâmetros de estoque'
                : 'Adicione um novo item gastronômico ao catálogo digital da cafeteria'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-[#850D2C] rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#850D2C]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Nome & Categoria (com opção de criar nova categoria) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pão de Queijo Mineiro"
                className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider">
                  Categoria *
                </label>
                {!isCreatingCategory ? (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#850D2C] hover:text-[#6e0a24] transition cursor-pointer"
                    title="Criar uma nova categoria de cardápio"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nova categoria</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="text-[11px] font-medium text-stone-400 hover:text-stone-600 transition cursor-pointer"
                  >
                    Selecionar existente
                  </button>
                )}
              </div>

              {!isCreatingCategory ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingCategory(true);
                    } else {
                      setCategory(e.target.value as ProductCategory);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] font-medium focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition cursor-pointer"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__NEW__">+ Criar nova categoria...</option>
                </select>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmNewCategory();
                      }
                    }}
                    placeholder="Ex: Chás & Infusões"
                    className="flex-1 px-3 py-2.5 text-xs border border-[#850D2C] rounded-xl bg-white text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmNewCategory}
                    disabled={!newCategoryName.trim()}
                    className="h-9 px-3 rounded-xl bg-[#850D2C] hover:bg-[#6e0a24] disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer shrink-0"
                    title="Adicionar categoria"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Criar</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
              Descrição no Cardápio
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os ingredientes, notas sensoriais e preparo artesanal..."
              className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none resize-none transition"
            />
          </div>

          {/* Preço de Venda, Preço de Custo e Margem Estimada */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Preço de Venda (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-bold text-[#35312F] border border-stone-300 rounded-xl bg-stone-50/50 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Auditado automaticamente
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Custo Unitário (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-semibold text-stone-700 border border-stone-300 rounded-xl bg-stone-50/50 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Base para cálculo de lucro
              </span>
            </div>

            <div className="bg-[#F9F7F3] border border-stone-200/80 rounded-xl px-3.5 py-2 flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Lucro / Margem Bruta
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-sm font-extrabold text-[#4c543c]">
                  {formatCurrencyBRL(estimatedProfit)}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#858F6D]/15 text-[#4c543c]">
                  {estimatedMargin}%
                </span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5">
                Retorno estimado por un.
              </span>
            </div>
          </div>

          {/* Estoque Inicial / Atual & Limite de Estoque Baixo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-[#F9F7F3] rounded-2xl border border-stone-200/80">
            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Estoque Disponível (un.) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold border border-stone-300 rounded-xl bg-white text-[#35312F] focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Se chegar a 0, bloqueia vendas no cardápio
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Limite Mínimo de Alerta (un.) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold border border-stone-300 rounded-xl bg-white text-[#35312F] focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Exibe aviso de reposição quando ≤ este limite
              </span>
            </div>
          </div>

          {/* Upload de Foto (Limpo, sem falsas tags de sugestão) */}
          <div>
            <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Fotografia do Produto</span>
              <span className="text-[10px] font-normal text-stone-400 normal-case">
                Arquivo do computador ou link de imagem
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3.5 items-center p-3 bg-stone-50/60 rounded-2xl border border-stone-200/80">
              {/* Preview */}
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-stone-200/90 shrink-0 bg-stone-100 flex items-center justify-center shadow-2xs">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-stone-400" />
                )}
              </div>

              {/* Controles de Imagem */}
              <div className="flex-1 flex flex-wrap items-center gap-2 w-full">
                <label className="cursor-pointer h-9 px-3.5 bg-white hover:bg-stone-100 text-[#35312F] border border-stone-300 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition shadow-2xs shrink-0">
                  <Upload className="w-3.5 h-3.5 text-[#850D2C]" />
                  <span>Enviar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Ou cole a URL da imagem (https://...)"
                  className="flex-1 min-w-[180px] h-9 px-3 text-xs border border-stone-300 rounded-xl bg-white text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Rodapé do Modal */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-[#35312F] rounded-xl hover:bg-stone-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] rounded-xl shadow-xs transition inline-flex items-center space-x-1.5 disabled:opacity-75 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
