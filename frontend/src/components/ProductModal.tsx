import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { Product, ProductCategory } from '../../../shared/types/index.ts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => Promise<void>;
  productToEdit?: Product | null;
}

const CATEGORIES: ProductCategory[] = [
  'Cafés Especiais',
  'Bebidas Geladas',
  'Doces & Bolos',
  'Salgados Artesanais',
  'Combos & Brunch',
];

const PRESET_IMAGES = [
  {
    name: 'Café Expresso',
    url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cappuccino',
    url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Pão de Queijo',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Bolo de Cenoura',
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Croissant Francês',
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Frapê Gelado',
    url: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Torta Holandesa',
    url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Soda Italiana',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
  },
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('12.00');
  const [costPrice, setCostPrice] = useState('4.00');
  const [category, setCategory] = useState<ProductCategory>('Cafés Especiais');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [minStockThreshold, setMinStockThreshold] = useState('5');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setCategory('Cafés Especiais');
      setStockQuantity('50');
      setMinStockThreshold('5');
      setImageUrl(PRESET_IMAGES[0].url);
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  // Upload de arquivo de foto (Requisito 16)
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
        category,
        stockQuantity: isNaN(numStock) ? 0 : numStock,
        minStockThreshold: isNaN(numMin) ? 5 : numMin,
        imageUrl: imageUrl || PRESET_IMAGES[0].url,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 text-white">
          <div>
            <h3 className="font-bold text-base text-amber-100">
              {productToEdit ? 'Editar Produto do Cardápio' : 'Novo Produto para o Cardápio'}
            </h3>
            <p className="text-xs text-stone-400">
              {productToEdit
                ? 'Atualize preços, estoque ou detalhes (Requisito 1 & 11)'
                : 'Cadastre um novo item gastronômico (Requisito 16)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pão de Queijo Mineiro"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Descrição Apetitosa
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os ingredientes, origem dos grãos e sabor..."
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
            />
          </div>

          {/* Preço de Venda & Preço de Custo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Preço de Venda (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-semibold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-bold text-stone-900 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Alterações de preço geram log de auditoria
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Preço de Custo (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 text-sm font-semibold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm text-stone-700 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Usado para relatórios de lucro líquido
              </span>
            </div>
          </div>

          {/* Estoque Atual & Estoque Mínimo (Requisito 19) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Estoque Inicial / Atual *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
              />
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Se chegar a 0, fica esgotado automaticamente
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Limite de Estoque Baixo (Alerta) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
              />
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                Dispara aviso no dashboard ao atingir este valor
              </span>
            </div>
          </div>

          {/* Upload de Foto (Requisito 16) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Upload da Foto do Produto (Requisito 16)</span>
              <span className="text-[10px] font-normal text-amber-800">
                Arquivo local ou galeria rápida
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              {/* Preview */}
              <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-amber-600/40 shrink-0 bg-stone-100 flex items-center justify-center shadow-xs">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-stone-400" />
                )}
              </div>

              {/* Botões de upload e link */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-amber-700" />
                    <span>Carregar Arquivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-stone-400">ou use URL direta:</span>
                </div>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                {/* Galeria de Fotos Rápidas */}
                <div className="pt-1">
                  <span className="text-[11px] text-stone-500 block mb-1 font-medium">
                    Fotos de alta resolução recomendadas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => setImageUrl(preset.url)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                          imageUrl === preset.url
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-200'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer com botões */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-900/20 transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{productToEdit ? 'Atualizar Produto' : 'Cadastrar Produto'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
