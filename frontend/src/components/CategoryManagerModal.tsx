import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  FolderTree,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Product } from '../../../shared/types/index.ts';
import { getAllSubcategoriesForCategory } from '../utils/categoryConfig.ts';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: string[];
  onCreateCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (name: string, replacementCategory?: string) => Promise<void>;
  onCreateSubcategory: (category: string, subName: string) => void;
  onRenameSubcategory: (category: string, oldSub: string, newSub: string) => Promise<void>;
  onDeleteSubcategory: (category: string, subName: string) => Promise<void>;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onCreateSubcategory,
  onRenameSubcategory,
  onDeleteSubcategory,
}) => {
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');
  const [deletingCat, setDeletingCat] = useState<string | null>(null);
  const [replacementCat, setReplacementCat] = useState<string>('');

  const [newSubInputs, setNewSubInputs] = useState<Record<string, string>>({});
  const [editingSub, setEditingSub] = useState<{ category: string; name: string } | null>(null);
  const [editingSubValue, setEditingSubValue] = useState('');
  const [deletingSub, setDeletingSub] = useState<{ category: string; name: string } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNewCategoryInput('');
      setEditingCat(null);
      setDeletingCat(null);
      setEditingSub(null);
      setDeletingSub(null);
      setErrorMsg(null);
      setIsBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setErrorMsg('Digite o nome da nova categoria.');
      return;
    }
    const exists = categories.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setErrorMsg(`Já existe uma categoria chamada "${trimmed}".`);
      return;
    }
    setErrorMsg(null);
    onCreateCategory(trimmed);
    setNewCategoryInput('');
    setExpandedCategory(trimmed);
  };

  const handleStartEditCategory = (cat: string) => {
    setErrorMsg(null);
    setDeletingCat(null);
    setEditingSub(null);
    setDeletingSub(null);
    setEditingCat(cat);
    setEditingCatValue(cat);
  };

  const handleConfirmRenameCategory = async (oldName: string) => {
    const trimmed = editingCatValue.trim();
    if (!trimmed) {
      setErrorMsg('O nome da categoria não pode ficar vazio.');
      return;
    }
    if (trimmed === oldName) {
      setEditingCat(null);
      return;
    }
    const duplicate = categories.some(
      (c) => c !== oldName && c.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(`Já existe uma categoria chamada "${trimmed}".`);
      return;
    }

    setErrorMsg(null);
    setIsBusy(true);
    try {
      await onRenameCategory(oldName, trimmed);
      setEditingCat(null);
      if (expandedCategory === oldName) {
        setExpandedCategory(trimmed);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao renomear categoria.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleStartDeleteCategory = (cat: string) => {
    if (categories.length <= 1) return;
    setErrorMsg(null);
    setEditingCat(null);
    setEditingSub(null);
    setDeletingSub(null);
    const others = categories.filter((c) => c !== cat);
    setReplacementCat(others[0] || '');
    setDeletingCat(cat);
  };

  const handleConfirmDeleteCategory = async (cat: string) => {
    const prodCount = products.filter((p) => p.category === cat).length;
    if (prodCount > 0 && !replacementCat) {
      setErrorMsg('Escolha uma categoria de destino para os produtos existentes.');
      return;
    }
    setErrorMsg(null);
    setIsBusy(true);
    try {
      await onDeleteCategory(cat, prodCount > 0 ? replacementCat : undefined);
      setDeletingCat(null);
      if (expandedCategory === cat) {
        setExpandedCategory(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao excluir categoria.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddSubcategory = (e: React.FormEvent, cat: string) => {
    e.preventDefault();
    const trimmed = (newSubInputs[cat] || '').trim();
    if (!trimmed) {
      setErrorMsg('Digite o nome da nova subcategoria.');
      return;
    }
    const existingSubs = getAllSubcategoriesForCategory(cat, products);
    if (existingSubs.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`A subcategoria "${trimmed}" já existe em ${cat}.`);
      return;
    }
    setErrorMsg(null);
    onCreateSubcategory(cat, trimmed);
    setNewSubInputs((prev) => ({ ...prev, [cat]: '' }));
  };

  const handleStartEditSubcategory = (category: string, subName: string) => {
    setErrorMsg(null);
    setEditingCat(null);
    setDeletingCat(null);
    setDeletingSub(null);
    setEditingSub({ category, name: subName });
    setEditingSubValue(subName);
  };

  const handleConfirmRenameSubcategory = async (category: string, oldSub: string) => {
    const trimmed = editingSubValue.trim();
    if (!trimmed) {
      setErrorMsg('O nome da subcategoria não pode ficar vazio.');
      return;
    }
    if (trimmed === oldSub) {
      setEditingSub(null);
      return;
    }
    const existingSubs = getAllSubcategoriesForCategory(category, products);
    const duplicate = existingSubs.some(
      (s) => s !== oldSub && s.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg(`Já existe uma subcategoria chamada "${trimmed}" em ${category}.`);
      return;
    }

    setErrorMsg(null);
    setIsBusy(true);
    try {
      await onRenameSubcategory(category, oldSub, trimmed);
      setEditingSub(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao renomear subcategoria.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmDeleteSubcategory = async (category: string, subName: string) => {
    setErrorMsg(null);
    setIsBusy(true);
    try {
      await onDeleteSubcategory(category, subName);
      setDeletingSub(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao excluir subcategoria.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#850D2C]/10 text-[#850D2C] flex items-center justify-center shrink-0 border border-[#850D2C]/20">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#35312F]">
                Categorias e Subcategorias
              </h2>
              <p className="text-xs text-stone-500">
                Adicione, renomeie ou exclua categorias e subcategorias do catálogo e cardápio.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 hover:text-[#35312F] flex items-center justify-center transition cursor-pointer disabled:opacity-40"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Nova Categoria + Feedback de Erro */}
        <div className="px-6 py-3.5 bg-stone-50/70 border-b border-stone-100 space-y-2.5 shrink-0">
          <form onSubmit={handleAddCategory} className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => {
                setNewCategoryInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Nova categoria (ex: Cafés Especiais, Padaria...)"
              disabled={isBusy}
              className="flex-1 h-9 px-3.5 rounded-xl bg-white border border-stone-200 text-xs text-[#35312F] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#850D2C]/20 focus:border-[#850D2C]"
            />
            <button
              type="submit"
              disabled={isBusy}
              className="h-9 px-4 rounded-xl bg-[#850D2C] hover:bg-[#6e0a24] text-white text-xs font-semibold inline-flex items-center space-x-1.5 shadow-2xs transition cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </form>

          {errorMsg && (
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Lista Expansível de Categorias */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
          {categories.map((cat) => {
            const catProductsCount = products.filter((p) => p.category === cat).length;
            const subs = getAllSubcategoriesForCategory(cat, products);
            const isExpanded = expandedCategory === cat;
            const isEditingThisCat = editingCat === cat;
            const isDeletingThisCat = deletingCat === cat;
            const otherCategories = categories.filter((c) => c !== cat);

            return (
              <div
                key={cat}
                className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden transition"
              >
                {/* Linha Principal da Categoria */}
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-stone-50/40">
                  {isEditingThisCat ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingCatValue}
                        onChange={(e) => setEditingCatValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmRenameCategory(cat);
                          } else if (e.key === 'Escape') {
                            setEditingCat(null);
                            setErrorMsg(null);
                          }
                        }}
                        autoFocus
                        disabled={isBusy}
                        className="flex-1 h-8 px-3 rounded-lg bg-white border border-[#850D2C]/50 text-xs font-semibold text-[#35312F] focus:outline-none focus:ring-2 focus:ring-[#850D2C]/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmRenameCategory(cat)}
                        disabled={isBusy}
                        className="h-8 px-2.5 rounded-lg bg-[#850D2C] hover:bg-[#6e0a24] text-white text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        title="Salvar nome"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Salvar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCat(null);
                          setErrorMsg(null);
                        }}
                        disabled={isBusy}
                        className="h-8 w-8 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 flex items-center justify-center cursor-pointer"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategory((prev) => (prev === cat ? null : cat))
                        }
                        className="flex-1 flex items-center space-x-2.5 text-left min-w-0 cursor-pointer group"
                      >
                        <span className="w-6 h-6 rounded-lg bg-stone-100 group-hover:bg-stone-200/80 text-stone-600 flex items-center justify-center shrink-0 transition">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="text-xs font-bold text-[#35312F] truncate">
                          {cat}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 shrink-0">
                          {catProductsCount}{' '}
                          {catProductsCount === 1 ? 'produto' : 'produtos'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#850D2C]/10 text-[#850D2C] shrink-0">
                          {subs.length} sub
                        </span>
                      </button>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(cat)}
                          disabled={isBusy}
                          className="h-7 w-7 rounded-lg hover:bg-stone-200/70 text-stone-600 hover:text-[#35312F] flex items-center justify-center transition cursor-pointer disabled:opacity-40"
                          title="Renomear categoria"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartDeleteCategory(cat)}
                          disabled={isBusy || categories.length <= 1}
                          className="h-7 w-7 rounded-lg hover:bg-rose-100 text-stone-500 hover:text-[#850D2C] flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            categories.length <= 1
                              ? 'É necessário manter pelo menos uma categoria'
                              : 'Excluir categoria'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Confirmação Inline de Exclusão da Categoria */}
                {isDeletingThisCat && (
                  <div className="px-4 py-3 bg-rose-50/80 border-t border-rose-200/80 space-y-2.5 text-xs">
                    {catProductsCount === 0 ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-rose-900 font-medium">
                          Excluir a categoria <strong>"{cat}"</strong>?
                        </span>
                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setDeletingCat(null)}
                            disabled={isBusy}
                            className="h-7 px-3 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteCategory(cat)}
                            disabled={isBusy}
                            className="h-7 px-3 rounded-lg bg-[#850D2C] hover:bg-[#6e0a24] text-white font-semibold inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                          >
                            {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-rose-900 font-medium">
                          Esta categoria possui <strong>{catProductsCount}</strong>{' '}
                          {catProductsCount === 1 ? 'produto' : 'produtos'}. Escolha para qual
                          categoria movê-los antes de excluir:
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <select
                            value={replacementCat}
                            onChange={(e) => setReplacementCat(e.target.value)}
                            disabled={isBusy}
                            className="flex-1 h-8 px-2.5 rounded-lg bg-white border border-rose-300 text-xs text-[#35312F] focus:outline-none focus:ring-2 focus:ring-[#850D2C]/20"
                          >
                            {otherCategories.map((other) => (
                              <option key={other} value={other}>
                                {other}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center space-x-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setDeletingCat(null)}
                              disabled={isBusy}
                              className="h-8 px-3 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteCategory(cat)}
                              disabled={isBusy}
                              className="h-8 px-3 rounded-lg bg-[#850D2C] hover:bg-[#6e0a24] text-white font-semibold inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                            >
                              {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Mover e Excluir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Área Expandida de Subcategorias */}
                {isExpanded && (
                  <div className="px-4 py-3 border-t border-stone-100 bg-white space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Subcategorias de {cat}
                      </span>
                    </div>

                    {subs.length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-1">
                        Nenhuma subcategoria cadastrada nesta categoria.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {subs.map((sub) => {
                          const subProdCount = products.filter(
                            (p) => p.category === cat && p.subcategory === sub
                          ).length;
                          const isEditingThisSub =
                            editingSub?.category === cat && editingSub?.name === sub;
                          const isDeletingThisSub =
                            deletingSub?.category === cat && deletingSub?.name === sub;

                          return (
                            <div
                              key={sub}
                              className="rounded-xl border border-stone-200/80 bg-stone-50/50 px-3 py-1.5 space-y-1.5"
                            >
                              {isEditingThisSub ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingSubValue}
                                    onChange={(e) => setEditingSubValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleConfirmRenameSubcategory(cat, sub);
                                      } else if (e.key === 'Escape') {
                                        setEditingSub(null);
                                        setErrorMsg(null);
                                      }
                                    }}
                                    autoFocus
                                    disabled={isBusy}
                                    className="flex-1 h-7 px-2.5 rounded-lg bg-white border border-[#850D2C]/50 text-xs text-[#35312F] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmRenameSubcategory(cat, sub)}
                                    disabled={isBusy}
                                    className="h-7 px-2.5 rounded-lg bg-[#850D2C] hover:bg-[#6e0a24] text-white text-[11px] font-semibold inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                                  >
                                    {isBusy ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    <span>Salvar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSub(null);
                                      setErrorMsg(null);
                                    }}
                                    disabled={isBusy}
                                    className="h-7 w-7 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 flex items-center justify-center cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <span className="text-xs font-medium text-[#35312F] truncate">
                                      {sub}
                                    </span>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-white border border-stone-200/80 text-stone-500 shrink-0">
                                      {subProdCount}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditSubcategory(cat, sub)}
                                      disabled={isBusy}
                                      className="h-6 w-6 rounded-md hover:bg-stone-200/70 text-stone-500 hover:text-[#35312F] flex items-center justify-center cursor-pointer disabled:opacity-40"
                                      title="Renomear subcategoria"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setErrorMsg(null);
                                        setEditingSub(null);
                                        setDeletingSub({ category: cat, name: sub });
                                      }}
                                      disabled={isBusy}
                                      className="h-6 w-6 rounded-md hover:bg-rose-100 text-stone-500 hover:text-[#850D2C] flex items-center justify-center cursor-pointer disabled:opacity-40"
                                      title="Excluir subcategoria"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isDeletingThisSub && (
                                <div className="pt-1.5 border-t border-rose-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-rose-900">
                                  <span>
                                    Excluir subcategoria? Produtos vinculados ficarão sem subcategoria.
                                  </span>
                                  <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                                    <button
                                      type="button"
                                      onClick={() => setDeletingSub(null)}
                                      disabled={isBusy}
                                      className="h-6 px-2.5 rounded-md bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmDeleteSubcategory(cat, sub)}
                                      disabled={isBusy}
                                      className="h-6 px-2.5 rounded-md bg-[#850D2C] hover:bg-[#6e0a24] text-white font-semibold inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                                    >
                                      {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                                      <span>Excluir</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Formulário inline para nova subcategoria */}
                    <form
                      onSubmit={(e) => handleAddSubcategory(e, cat)}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={newSubInputs[cat] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewSubInputs((prev) => ({ ...prev, [cat]: val }));
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Nova subcategoria..."
                        disabled={isBusy}
                        className="flex-1 h-8 px-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-[#35312F] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#850D2C]/20 focus:border-[#850D2C] focus:bg-white"
                      />
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="h-8 px-3 rounded-lg bg-stone-800 hover:bg-[#850D2C] text-white text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3.5 border-t border-stone-100 bg-stone-50/50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="h-9 px-5 rounded-xl bg-[#850D2C] hover:bg-[#6e0a24] text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
