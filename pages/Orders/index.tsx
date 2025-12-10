import React, { useState } from 'react';
import { Plus, Package, Download, RefreshCw } from 'lucide-react';
import { useOrders } from '../../contexts/OrderContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useModal } from '../../hooks/useModal';
import { Order, Customer } from '../../types';
import { updateOrder } from '../../services/orderService';
import OrderList from './components/OrderList';
import OrderDetail from './components/OrderDetail';
import OrderForm from './components/OrderForm';
import ConfirmModal from '../../components/ConfirmModal';
import ExportModal from './components/ExportModal';

const OrdersPage: React.FC = () => {
  const { orders, createNewOrder, modifyOrder, removeOrder, refreshOrders } = useOrders();
  const { customers } = useCustomers();
  const { t } = useLanguage();
  
  // Modal Hooks
  const exportModal = useModal();
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCreateNewOrder = () => {
    setEditingOrder(undefined);
    setIsOrderFormOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setSelectedOrder(null);
    setIsOrderFormOpen(true);
  };

  const handleDeleteClick = (orderId: string) => {
    setDeleteId(orderId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await removeOrder(deleteId);
      setIsDeleteModalOpen(false);
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete order:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveOrder = async (data: any) => {
    if (data.id) {
      await modifyOrder(data.id, data);
    } else {
      await createNewOrder(data);
    }
    setIsOrderFormOpen(false);
  };

  const normalize = (str: string) => str ? str.replace(/[^0-9]/g, '') : '';

  const handleSyncCustomers = async () => {
    if (isSyncing) return;
    if (!confirm(t('Are you sure you want to sync all orders with the customer database? This will standardize names and phones based on existing customers.'))) return;
    
    setIsSyncing(true);
    try {
      let updatedCount = 0;
      // We process sequentially to avoid overwhelming Firestore
      for (const order of orders) {
         const orderPhone = normalize(order.customer.phone);
         
         // Logic:
         // 1. If phone exists, try to find in customer DB.
         // 2. If found, update order with Customer data (ID, Name, Phone, Address).
         // 3. If NOT found (or no phone), keep Name, but blank out Phone, Address, ID.
         
         let newCustomerData: Customer;
         const matchedCustomer = orderPhone 
            ? customers.find(c => normalize(c.phone) === orderPhone)
            : undefined;

         if (matchedCustomer) {
             newCustomerData = {
                 id: matchedCustomer.id,
                 name: matchedCustomer.name,
                 phone: matchedCustomer.phone,
                 address: matchedCustomer.address || '',
                 email: matchedCustomer.email || '',
                 city: matchedCustomer.city || '',
                 country: matchedCustomer.country || ''
             };
         } else {
             // Not found or no phone -> Keep Name, leave others blank as requested
             newCustomerData = {
                 id: '', 
                 name: order.customer.name, // Keep existing name from order (which might be from customerName legacy)
                 phone: '', 
                 address: '',
                 email: '',
                 city: '',
                 country: ''
             };
         }
         
         // Perform update using the service directly to avoid multiple refreshes
         // The service is configured to DELETE legacy customerName/phone fields during this update
         await updateOrder(order.id, {
            ...order,
            customer: newCustomerData
         });
         updatedCount++;
      }
      
      await refreshOrders();
      alert(`Sync complete! Processed ${updatedCount} orders.`);
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Sync failed. Check console for details.");
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <div className="h-full relative">
      <div className="mb-4 flex flex-col sm:flex-row justify-end items-center gap-3">
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
             onClick={handleSyncCustomers}
             disabled={isSyncing}
             className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
             title="Sync order customer data with customer database"
           >
             <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
             <span className="hidden sm:inline">Sync</span>
           </button>
          <button 
             onClick={() => exportModal.open()}
             className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
           >
             <Download className="w-4 h-4" />
             <span>{t('orders.exportCsv')}</span>
           </button>
          <button 
             onClick={handleCreateNewOrder}
             className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-orange-200 dark:shadow-none"
           >
             <Plus className="w-4 h-4" />
             <span>{t('nav.newOrder')}</span>
           </button>
        </div>
      </div>

      {orders.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
           <Package className="w-16 h-16 mb-4 opacity-20" />
           <p className="mb-4">{t('orders.noOrders')}</p>
           <button 
             onClick={handleCreateNewOrder}
             className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700"
           >
             {t('orders.createFirst')}
           </button>
         </div>
      ) : (
        <OrderList 
          orders={orders} 
          onSelectOrder={handleOrderSelect} 
          onDeleteOrder={handleDeleteClick}
          onUpdateOrder={modifyOrder}
        />
      )}

      {selectedOrder && (
        <OrderDetail 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)}
          onEdit={() => handleEditOrder(selectedOrder)}
        />
      )}

      {isOrderFormOpen && (
        <OrderForm 
          initialData={editingOrder} 
          onSave={handleSaveOrder} 
          onCancel={() => setIsOrderFormOpen(false)} 
        />
      )}

      <ExportModal 
        isOpen={exportModal.isOpen}
        onClose={exportModal.close}
        orders={orders}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title={t('orders.delete')}
        message={t('orders.confirmDelete')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default OrdersPage;