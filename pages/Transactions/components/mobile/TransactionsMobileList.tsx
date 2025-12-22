import React from 'react';
import { ArrowRightLeft, Calendar, Building2, CreditCard, TrendingUp } from 'lucide-react';
import { Transaction } from '@/types';
import { formatVND } from '@/utils/currencyUtil';

interface TransactionsMobileListProps {
  transactions: Transaction[];
  formatDate: (dateStr: string) => string;
}

const TransactionsMobileList: React.FC<TransactionsMobileListProps> = ({
  transactions,
  formatDate,
}) => {
  if (!transactions.length) {
    return null;
  }

  return (
    <div className="lg:hidden flex-1 overflow-y-auto space-y-3 pb-4">
      {transactions.map((tr) => (
        <div
          key={tr.id}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm mx-[-0.25rem] sm:mx-0"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  +{formatVND(tr.transferAmount)}
                </span>
                <div className="flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(tr.transactionDate)}
                </div>
              </div>
            </div>
            {tr.orderNumber && (
              <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 px-2 py-1 rounded-md text-[10px] font-medium font-mono">
                <ArrowRightLeft className="w-3 h-3" />
                {tr.orderNumber}
              </span>
            )}
          </div>

          <div className="mb-2">
            <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2">
              {tr.content || '-'}
            </p>
            {tr.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                {tr.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr.gateway || '-'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {tr.subAccount || tr.accountNumber || '-'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionsMobileList;


