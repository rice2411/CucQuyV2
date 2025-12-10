import React from 'react';
import { StickyNote, CreditCard } from 'lucide-react';
import { OrderStatus, PaymentStatus } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface OrderStatusSectionProps {
  status: OrderStatus;
  setStatus: (val: OrderStatus) => void;
  paymentStatus: PaymentStatus;
  setPaymentStatus: (val: PaymentStatus) => void;
  note: string;
  setNote: (val: string) => void;
}

const OrderFormStatusSection: React.FC<OrderStatusSectionProps> = ({
  status, setStatus,
  paymentStatus, setPaymentStatus,
  note, setNote
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('form.status')}</label>
            <select 
              value={status}
              onChange={e => setStatus(e.target.value as OrderStatus)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
            >
              {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
         </div>

         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('detail.payment')}</label>
            <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select 
                  value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
         </div>
      </div>
      
      <div>
         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('form.notes')}</label>
         <div className="relative">
            <StickyNote className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
              placeholder="Special requests, delivery instructions..."
            />
         </div>
      </div>
    </div>
  );
};

export default OrderFormStatusSection;