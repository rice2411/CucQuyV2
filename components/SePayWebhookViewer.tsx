import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Transaction {
  id: string;
  sepayId: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
  description: string;
  receivedAt: string;
  createdAt: string;
}

const SePayWebhookViewer: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lắng nghe realtime updates từ Firebase
    const transactionsRef = collection(db, 'transaction');
    const q = query(transactionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data();
          
          const getDate = (val: any) => {
            if (!val) return new Date().toISOString();
            if (val.toDate && typeof val.toDate === 'function') {
              return val.toDate().toISOString();
            }
            return new Date(val).toISOString();
          };

          return {
            id: doc.id,
            sepayId: docData.sepayId || 0,
            gateway: docData.gateway || '',
            transactionDate: docData.transactionDate || '',
            accountNumber: docData.accountNumber || '',
            code: docData.code || null,
            content: docData.content || '',
            transferType: docData.transferType || 'in',
            transferAmount: Number(docData.transferAmount) || 0,
            accumulated: Number(docData.accumulated) || 0,
            subAccount: docData.subAccount || null,
            referenceCode: docData.referenceCode || '',
            description: docData.description || '',
            receivedAt: getDate(docData.receivedAt),
            createdAt: getDate(docData.createdAt),
          } as Transaction;
        });

        setTransactions(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to transactions:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-600 dark:text-slate-400">
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          SePay Webhook Transactions
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Webhook URL: <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
            {window.location.origin}/api/sepay/webhook
          </code>
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
          Tổng số giao dịch: <strong>{transactions.length}</strong>
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">
            Chưa có giao dịch nào được nhận
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Giao dịch #{transaction.sepayId}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(transaction.transactionDate).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      transaction.transferType === 'in'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {transaction.transferType === 'in' ? 'Tiền vào' : 'Tiền ra'}
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                    {transaction.transferAmount.toLocaleString('vi-VN')} VND
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Ngân hàng:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {transaction.gateway}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Số tài khoản:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {transaction.accountNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Nội dung:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {transaction.content}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Số dư:</span>
                  <span className="ml-2 font-medium text-slate-900 dark:text-white">
                    {transaction.accumulated.toLocaleString('vi-VN')} VND
                  </span>
                </div>
                {transaction.referenceCode && (
                  <div className="col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">Mã tham chiếu:</span>
                    <span className="ml-2 font-mono text-sm text-slate-900 dark:text-white">
                      {transaction.referenceCode}
                    </span>
                  </div>
                )}
                {transaction.description && (
                  <div className="col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">Mô tả:</span>
                    <p className="mt-1 text-slate-900 dark:text-white">
                      {transaction.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Nhận lúc: {new Date(transaction.receivedAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SePayWebhookViewer;

