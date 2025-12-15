import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Tag, DollarSign, AlignLeft, AlertCircle, Scale, Building, Bell } from 'lucide-react';
import { Ingredient } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface IngredientFormProps {
  initialData?: Ingredient | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

const IngredientForm: React.FC<IngredientFormProps> = ({ initialData, onSave, onCancel }) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('kg');
  const [minQuantity, setMinQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState(''); 

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setQuantity(initialData.quantity);
      setUnit(initialData.unit);
      setMinQuantity(initialData.minQuantity);
      setPrice(initialData.price);
      setSupplier(initialData.supplier || '');
      setNote(initialData.note || '');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!name.trim()) throw new Error("Name is required");
      if (quantity < 0) throw new Error("Quantity cannot be negative");
      if (price < 0) throw new Error("Price cannot be negative");

      const formData = {
        id: initialData?.id,
        name,
        quantity,
        unit,
        minQuantity,
        price,
        supplier,
        note,
      };

      await onSave(formData);
    } catch (err: any) {
      setError(err.message || "Failed to save ingredient");
      setIsSubmitting(false);
    }
  };

  const units = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'can', 'bottle'];

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
      <div className="absolute inset-y-0 right-0 max-w-lg w-full flex pointer-events-none">
        <div className="w-full h-full bg-white dark:bg-slate-800 shadow-2xl flex flex-col pointer-events-auto animate-slide-in-right">
          
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {initialData ? t('storage.formTitleEdit') : t('storage.formTitleAdd')}
            </h2>
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('storage.name')} *</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="e.g. Flour, Sugar, Milk"
                  />
                </div>
              </div>

              {/* Quantity & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('storage.quantity')}</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('storage.unit')}</label>
                   <select 
                    value={unit} 
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{t(`units.${u}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Min Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('storage.price')}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      min="0"
                      step="1000"
                      value={price}
                      onChange={e => setPrice(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('storage.minQuantity')}</label>
                  <div className="relative">
                    <Bell className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={minQuantity}
                      onChange={e => setMinQuantity(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('storage.supplier')}</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Supplier Name"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('storage.note')}</label>
                <div className="relative">
                   <AlignLeft className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                   <textarea 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </div>

          </form>

          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-3">
             <button 
              type="button" 
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {t('form.cancel')}
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-orange-600 dark:bg-orange-500 rounded-lg text-sm font-medium text-white hover:bg-orange-700 dark:hover:bg-orange-600 shadow-sm flex items-center gap-2 disabled:opacity-70 transition-colors"
            >
               {isSubmitting ? t('form.saving') : (
                <>
                  <Save className="w-4 h-4" /> {t('form.saveIngredient')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IngredientForm;
