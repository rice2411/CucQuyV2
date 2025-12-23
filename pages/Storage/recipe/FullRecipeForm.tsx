import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, ChefHat, Save, X, Search, AlignLeft, FlaskConical, Sparkles, Layers, Cake, CheckCircle2, Box } from 'lucide-react';
import { Recipe, RecipeIngredient, Ingredient, IngredientType } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateCurrentQuantity, isLowStock, isOutOfStock } from '@/utils/ingredientUtil';
import { fetchRecipes } from '@/services/recipeService';

const getTypeIcon = (type: IngredientType) => {
  switch (type) {
    case IngredientType.FLAVOR:
      return FlaskConical;
    case IngredientType.TOPPING:
      return Sparkles;
    default:
      return Package;
  }
};

const getTypeColors = (type: IngredientType) => {
  switch (type) {
    case IngredientType.FLAVOR:
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-300',
        icon: 'text-purple-600 dark:text-purple-400',
      };
    case IngredientType.TOPPING:
      return {
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        border: 'border-pink-200 dark:border-pink-800',
        text: 'text-pink-700 dark:text-pink-300',
        icon: 'text-pink-600 dark:text-pink-400',
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-800',
        border: 'border-slate-200 dark:border-slate-700',
        text: 'text-slate-700 dark:text-slate-300',
        icon: 'text-slate-600 dark:text-slate-400',
      };
  }
};

interface FullRecipeFormProps {
  isOpen: boolean;
  initialData?: Recipe;
  ingredients: Ingredient[];
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  baseRecipes?: Recipe[];
}

const FullRecipeForm: React.FC<FullRecipeFormProps> = ({ isOpen, initialData, ingredients, onSave, onClose, baseRecipes = [] }) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const [baseRecipeId, setBaseRecipeId] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [outputQuantity, setOutputQuantity] = useState(0);
  const [wasteRate, setWasteRate] = useState(0);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [loadedBaseRecipes, setLoadedBaseRecipes] = useState<Recipe[]>([]);

  const [ingredientSearch, setIngredientSearch] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalIngredient, setQuantityModalIngredient] = useState<{ ingredient: Ingredient; recipeIngredient: RecipeIngredient } | null>(null);
  const [quantityModalValue, setQuantityModalValue] = useState<string>('');
  const quantityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadBaseRecipes = async () => {
      try {
        const recipes = await fetchRecipes();
        const baseOnly = recipes.filter(r => r.recipeType === 'base' || (!r.recipeType && !r.baseRecipeId));
        setLoadedBaseRecipes(baseOnly);
      } catch (error) {
        console.error('Failed to load base recipes:', error);
      }
    };
    if (isOpen) {
      loadBaseRecipes();
    }
  }, [isOpen]);

  const allBaseRecipes = useMemo(() => {
    return baseRecipes.length > 0 ? baseRecipes : loadedBaseRecipes;
  }, [baseRecipes, loadedBaseRecipes]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDescription(initialData.description || '');
        setInstructions(initialData.instructions || '');
        setOutputQuantity(initialData.outputQuantity || 0);
        setWasteRate(initialData.wasteRate || 0);
        setBaseRecipeId(initialData.baseRecipeId || '');
        setRecipeIngredients(initialData.ingredients || []);
      } else {
        setName('');
        setDescription('');
        setInstructions('');
        setOutputQuantity(0);
        setWasteRate(0);
        setBaseRecipeId('');
        setRecipeIngredients([]);
      }
      setError(null);
      setShowQuantityModal(false);
      setQuantityModalIngredient(null);
      setQuantityModalValue('');
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (baseRecipeId) {
      const selectedBase = allBaseRecipes.find(r => r.id === baseRecipeId);
      if (selectedBase) {
        const baseIngredients = selectedBase.ingredients.map(ing => ({
          ...ing,
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredientName,
        }));
        const currentFlavorTopping = recipeIngredients.filter(ri => {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          return ing && (ing.type === IngredientType.FLAVOR || ing.type === IngredientType.TOPPING);
        });
        setRecipeIngredients([...baseIngredients, ...currentFlavorTopping]);
      }
    }
  }, [baseRecipeId, allBaseRecipes, ingredients]);

  useEffect(() => {
    if (showQuantityModal && quantityInputRef.current) {
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
    }
  }, [showQuantityModal]);

  const selectedBaseRecipe = useMemo(() => {
    return allBaseRecipes.find(r => r.id === baseRecipeId);
  }, [allBaseRecipes, baseRecipeId]);

  const baseIngredientIds = useMemo(() => {
    return selectedBaseRecipe?.ingredients.map(ri => ri.ingredientId) || [];
  }, [selectedBaseRecipe]);

  const allFlavorToppingIngredients = useMemo(
    () =>
      ingredients
        .filter((ing) => ing.type === IngredientType.FLAVOR || ing.type === IngredientType.TOPPING)
        .filter((ing) => {
          if (!ingredientSearch.trim()) return true;
          return ing.name.toLowerCase().includes(ingredientSearch.toLowerCase());
        })
        .filter((ing) => !baseIngredientIds.includes(ing.id)),
    [ingredients, ingredientSearch, baseIngredientIds]
  );

  const isIngredientSelected = (ingredientId: string) => {
    return recipeIngredients.some((ri) => ri.ingredientId === ingredientId);
  };

  const getSelectedIngredient = (ingredientId: string) => {
    return recipeIngredients.find((ri) => ri.ingredientId === ingredientId);
  };

  const handleToggleIngredient = (ingredient: Ingredient) => {
    const isSelected = isIngredientSelected(ingredient.id);
    if (isSelected) {
      setRecipeIngredients(recipeIngredients.filter((ri) => ri.ingredientId !== ingredient.id));
    } else {
      const newIngredient: RecipeIngredient = {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: 0,
        unit: ingredient.unit,
      };
      setRecipeIngredients([...recipeIngredients, newIngredient]);
      setShowQuantityModal(true);
      setQuantityModalIngredient({ ingredient, recipeIngredient: newIngredient });
      setQuantityModalValue('0');
    }
  };

  const handleOpenQuantityModal = (ingredient: Ingredient, e: React.MouseEvent) => {
    e.stopPropagation();
    if (baseIngredientIds.includes(ingredient.id)) {
      return;
    }
    const selected = getSelectedIngredient(ingredient.id);
    if (selected) {
      setShowQuantityModal(true);
      setQuantityModalIngredient({ ingredient, recipeIngredient: selected });
      setQuantityModalValue(selected.quantity.toString());
    }
  };

  const handleSaveQuantity = () => {
    if (!quantityModalIngredient) return;
    if (baseIngredientIds.includes(quantityModalIngredient.ingredient.id)) {
      return;
    }
    const numValue = quantityModalValue === '' ? 0 : Number(quantityModalValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setRecipeIngredients(
        recipeIngredients.map((ri) =>
          ri.ingredientId === quantityModalIngredient.ingredient.id ? { ...ri, quantity: numValue } : ri
        )
      );
    }
    setShowQuantityModal(false);
    setQuantityModalIngredient(null);
    setQuantityModalValue('');
  };

  const handleCancelQuantityModal = () => {
    if (!quantityModalIngredient) return;
    if (baseIngredientIds.includes(quantityModalIngredient.ingredient.id)) {
      return;
    }
    const selected = getSelectedIngredient(quantityModalIngredient.ingredient.id);
    if (selected && selected.quantity === 0) {
      setRecipeIngredients(recipeIngredients.filter((ri) => ri.ingredientId !== quantityModalIngredient.ingredient.id));
    }
    setShowQuantityModal(false);
    setQuantityModalIngredient(null);
    setQuantityModalValue('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!name.trim()) throw new Error(t('recipes.form.errors.nameRequired'));
      if (!baseRecipeId) {
        throw new Error(t('recipes.form.errors.baseRecipeRequired'));
      }
      if (recipeIngredients.length === 0) throw new Error(t('recipes.form.errors.ingredientsRequired'));
      if (recipeIngredients.some((ri) => ri.quantity <= 0)) {
        throw new Error(t('recipes.form.errors.quantityRequired'));
      }

      const payload: any = {
        id: initialData?.id,
        name: name.trim(),
        description: description.trim(),
        ingredients: recipeIngredients,
        instructions: instructions.trim(),
        outputQuantity: outputQuantity || 0,
        wasteRate: wasteRate || 0,
        recipeType: 'full',
        baseRecipeId,
      };

      await onSave(payload);
      handleClose();
    } catch (err: any) {
      setError(err.message || t('recipes.form.errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      ></div>
      <div className="absolute inset-y-0 right-0 w-full sm:w-3/4 flex pointer-events-none">
        <div
          className={`w-full h-full bg-white dark:bg-slate-800 shadow-2xl flex flex-col pointer-events-auto transition-colors duration-200 ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
        >
          <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between bg-white dark:bg-slate-800">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {initialData ? t('recipes.form.editFullRecipe') || 'Sửa công thức bánh' : t('recipes.form.addFullRecipe') || 'Thêm công thức bánh'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t('recipes.form.fullRecipeSubtitle') || 'Tạo công thức bánh từ công thức nền + hương vị + topping'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-4 sm:p-6 space-y-4 sm:space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                    {t('recipes.form.baseRecipeSelect')} *
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                    <select
                      value={baseRecipeId}
                      onChange={(e) => setBaseRecipeId(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="">{t('recipes.form.selectBaseRecipe')}</option>
                      {allBaseRecipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                    {t('recipes.form.name')} *
                  </label>
                  <div className="relative">
                    <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 sm:py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none touch-manipulation"
                      placeholder={t('recipes.form.namePlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                    {t('recipes.form.description')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none touch-manipulation"
                    placeholder={t('recipes.form.descriptionPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                      {t('recipes.form.outputQuantity')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={outputQuantity === 0 ? '' : outputQuantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        setOutputQuantity(value === '' ? 0 : Number(value));
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                      {t('recipes.form.wasteRate')}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={wasteRate === 0 ? '' : wasteRate}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? 0 : Number(value);
                          setWasteRate(Math.min(100, Math.max(0, numValue)));
                        }}
                        className="w-full px-3 py-2 pr-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedBaseRecipe && selectedBaseRecipe.ingredients.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                      {t('recipes.form.fromBaseRecipe')} ({selectedBaseRecipe.name})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {selectedBaseRecipe.ingredients.map((ri) => {
                      const ingredient = ingredients.find((ing) => ing.id === ri.ingredientId);
                      const colors = getTypeColors(ingredient?.type || IngredientType.BASE);
                      return (
                        <div
                          key={ri.ingredientId}
                          className="relative p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border-2 border-slate-200 dark:border-slate-600 opacity-75"
                        >
                          <div className="flex flex-col items-center text-center space-y-2">
                            <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                              <Box className={`w-5 h-5 ${colors.icon}`} />
                            </div>
                            <div className="flex-1 w-full">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 mb-1">
                                {ri.ingredientName}
                              </p>
                              <div className="px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 rounded-md text-xs font-bold">
                                {ri.quantity.toLocaleString()} {ri.unit === 'piece' ? t('ingredients.form.unitPiece') : 'g'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
                    {t('recipes.form.ingredients')} * ({t('ingredients.form.types.flavor')} + {t('ingredients.form.types.topping')})
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {recipeIngredients.filter(ri => {
                      const ing = ingredients.find(i => i.id === ri.ingredientId);
                      return ing && (ing.type === IngredientType.FLAVOR || ing.type === IngredientType.TOPPING);
                    }).length} {t('recipes.form.selected') || 'đã chọn'}
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                  <input
                    type="text"
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none touch-manipulation"
                    placeholder={t('recipes.form.addIngredientPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto">
                  {allFlavorToppingIngredients.map((ing) => {
                    const currentQuantity = calculateCurrentQuantity(ing);
                    const lowStock = isLowStock(ing);
                    const outOfStock = isOutOfStock(ing);
                    const colors = getTypeColors(ing.type);
                    const TypeIcon = getTypeIcon(ing.type);
                    const isSelected = isIngredientSelected(ing.id);
                    const selectedIngredient = getSelectedIngredient(ing.id);

                    return (
                      <div
                        key={ing.id}
                        onClick={() => !outOfStock && handleToggleIngredient(ing)}
                        className={`relative p-3 bg-white dark:bg-slate-800 rounded-lg border-2 transition-all cursor-pointer touch-manipulation ${
                          isSelected
                            ? `${colors.border} bg-orange-50 dark:bg-orange-900/20 shadow-md`
                            : outOfStock
                              ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                              : `${colors.border} hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md`
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <CheckCircle2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                        )}
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className={`p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                            <TypeIcon className={`w-5 h-5 ${colors.icon}`} />
                          </div>
                          <div className="flex-1 w-full">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 mb-1">
                              {ing.name}
                            </p>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block ${
                              outOfStock ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' : 
                              lowStock ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20' : 
                              'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700'
                            }`}>
                              {outOfStock ? t('recipes.form.outOfStock') : 
                               `${currentQuantity.toLocaleString()} ${ing.unit === 'piece' ? t('ingredients.form.unitPiece') : 'g'}`}
                            </span>
                          </div>
                          {isSelected && selectedIngredient && (
                            <div
                              onClick={(e) => handleOpenQuantityModal(ing, e)}
                              className="w-full px-2 py-1.5 bg-orange-600 dark:bg-orange-500 text-white rounded-md text-xs font-bold hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors touch-manipulation"
                            >
                              {selectedIngredient.quantity > 0
                                ? `${selectedIngredient.quantity.toLocaleString()} ${selectedIngredient.unit === 'piece' ? t('ingredients.form.unitPiece') : 'g'}`
                                : t('recipes.form.setQuantity') || 'Nhập số lượng'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                    {t('recipes.form.instructions')}
                  </label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      rows={4}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                      placeholder={t('recipes.form.instructionsPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600 transition-colors disabled:opacity-50 touch-manipulation"
                >
                  {t('form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 dark:bg-orange-500 rounded-lg text-sm font-medium text-white hover:bg-orange-700 dark:hover:bg-orange-600 active:bg-orange-800 dark:active:bg-orange-700 shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 transition-colors touch-manipulation"
                >
                  {isSubmitting ? t('form.saving') : (
                    <>
                      <Save className="w-4 h-4" /> {t('recipes.form.save')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showQuantityModal && quantityModalIngredient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={handleCancelQuantityModal}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {t('recipes.form.setQuantity') || 'Nhập số lượng'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {quantityModalIngredient.ingredient.name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  {t('recipes.form.quantity') || 'Số lượng'} *
                </label>
                <div className="relative">
                  <input
                    ref={quantityInputRef}
                    type="number"
                    min="0"
                    step={quantityModalIngredient.ingredient.unit === 'piece' ? 1 : 0.01}
                    value={quantityModalValue}
                    onChange={(e) => setQuantityModalValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveQuantity();
                      } else if (e.key === 'Escape') {
                        handleCancelQuantityModal();
                      }
                    }}
                    className="w-full px-4 py-3 text-base font-medium bg-slate-50 dark:bg-slate-700 border-2 border-orange-500 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none touch-manipulation"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">
                    {quantityModalIngredient.ingredient.unit === 'piece' ? t('ingredients.form.unitPiece') : 'g'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelQuantityModal}
                  className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors touch-manipulation"
                >
                  {t('form.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuantity}
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors touch-manipulation"
                >
                  {t('common.apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default FullRecipeForm;

