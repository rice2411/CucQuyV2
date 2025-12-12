import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order, ProductType, OrderItem, Customer } from '../types/index';
import { DEFAULT_PRICES } from '../constants/index';
import { sendMessageToGroup } from './zaloService';
import { getDate, mapStatus, getPaymentStatus, getPaymentMethod, getProductImage, calculateOrderTotal } from '../utils/orderUtils';

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    // Try to order by orderDate if index exists, otherwise basic query
    const q = query(ordersRef); 
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();

      const typeLower = (data.type || '').toLowerCase();

      // Synthetic Item creation from flat fields
      const quantity = typeof data.quantity === 'number' ? data.quantity : 1;
      const shippingCost = typeof data.shippingCost === 'number' ? data.shippingCost : 0;
      
      // Attempt to deduce unit price if not present
      let price = data.price;
      
      // Fix/Default price logic for Sets
      if (!price || Number(price) === 0) {
          if (typeLower.includes('family')) price = DEFAULT_PRICES[ProductType.FAMILY];
          else if (typeLower.includes('friend')) price = DEFAULT_PRICES[ProductType.FRIENDSHIP];
          else {
             // Fallback for custom/other: try to deduce from total if available
             const tempTotal = typeof data.total === 'number' ? data.total : 0;
             price = quantity > 0 ? (tempTotal - shippingCost) / quantity : 0;
          }
      }

      // Use stored items if available, otherwise construct from legacy flat fields
      let items: OrderItem[] = [];
      if (data.items && Array.isArray(data.items)) {
         // Map existing items ensuring ID and Image exist
         items = data.items.map((item: any, idx: number) => ({
             id: item.id || `ITEM-${doc.id}-${idx}`,
             productName: item.productName || 'Unknown Product',
             quantity: Number(item.quantity) || 1,
             price: Number(item.price) || 0,
             image: item.image || getProductImage(item.productName)
         }));
      } else {
         items = [{
            id: `ITEM-${doc.id}`,
            productName: data.type ? (data.type.charAt(0).toUpperCase() + data.type.slice(1)) : 'Assorted Items',
            quantity: quantity,
            price: Number(price), 
            image: getProductImage(data.type)
          }];
      }

      // Recalculate total using standard formula: Price * Quantity + Shipping
      const finalTotal = calculateOrderTotal(items, shippingCost);

      // Customer Construction: Prefer 'customer' object, fallback to flat fields
      let customer: Customer = data.customer ? { ...data.customer } : {
        id: '',
        name: data.customerName || 'Walk-in Customer',
        phone: data.phone || '',
        address: data.address || '',
        city: '',
        country: '',
        email: data.email || ''
      };

      // Ensure ID exists
      if (!customer.id) {
         customer.id = `CUST-${doc.id.substring(0, 6)}`;
      }

      return {
        id: doc.id,
        orderNumber: data.orderNumber,
        sepayId: data.sepayId, 
        customer: customer,
        items: items,
        total: finalTotal, // Use calculated total
        shippingCost: shippingCost,
        status: mapStatus(data.status),
        paymentStatus: getPaymentStatus(data.paymentStatus),
        paymentMethod: getPaymentMethod(data.paymentMethod),
        date: getDate(data.orderDate || data.createdAt),
        trackingNumber: data.trackingNumber,
        notes: data.note || data.notes || '',
        createdBy: data.createdBy || undefined
      } as Order;
    });
  } catch (error) {
    console.error("Error fetching orders from Firebase:", error);
    return [];
  }
};

// Helper to find the next order number (ORD-XXXXXX)
export const getNextOrderNumber = async (): Promise<string> => {
  try {
    const ordersRef = collection(db, 'orders');
    // Sort by orderNumber string desc to get the highest one.
    const q = query(ordersRef, orderBy('orderNumber', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const lastOrder = snapshot.docs[0].data();
      const lastNumberStr = lastOrder.orderNumber;
      
      if (lastNumberStr && lastNumberStr.startsWith('ORD-')) {
        const numPart = parseInt(lastNumberStr.split('-')[1], 10);
        if (!isNaN(numPart)) {
           return `ORD-${String(numPart + 1).padStart(6, '0')}`;
        }
      }
    }
    
    // Default start
    return 'ORD-000001';
  } catch (e) {
    console.warn("Failed to generate order number from DB, falling back to basic.", e);
    return `ORD-${Date.now().toString().slice(-6)}`;
  }
};

export const addOrder = async (orderData: any): Promise<void> => {
  try {
    const ordersRef = collection(db, 'orders');
    
    // Use provided order number or generate new one
    const orderNumber = orderData.orderNumber || await getNextOrderNumber();

    // Map internal form data to specific Firestore flat structure + structured customer
    const payload = {
      // New Field
      orderNumber: orderNumber,
      // sepayId is usually set by backend, but if provided (e.g. manual link), save it
      sepayId: orderData.sepayId || null,

      // Legacy flat fields
      customerName: orderData.customer?.name || '',
      phone: orderData.customer?.phone || '',
      address: orderData.customer?.address || '',
      email: orderData.customer?.email || '',
      
      // Structured Customer Object
      customer: {
        id: orderData.customer?.id || '',
        name: orderData.customer?.name || '',
        phone: orderData.customer?.phone || '',
        address: orderData.customer?.address || '',
        email: orderData.customer?.email || '',
        city: orderData.customer?.city || '',
        country: orderData.customer?.country || ''
      },

      items: orderData.items || [], // New Array structure
      shippingCost: orderData.shippingCost || 0,
      total: orderData.total || 0,
      note: orderData.notes || '',
      status: (orderData.status || 'pending').toLowerCase(),
      orderDate: Timestamp.now(),
      createdAt: Timestamp.now(),
      paymentStatus: orderData.paymentStatus || 'Unpaid',
      paymentMethod: orderData.paymentMethod || 'Cash',
      createdBy: orderData.createdBy || undefined // Thêm thông tin người tạo
    };
     await addDoc(ordersRef, payload);
    await sendMessageToGroup(payload as any);
  } catch (error) {
    console.error("Error adding order:", error);
    throw error;
  }
};

export const updateOrder = async (orderId: string, orderData: any): Promise<void> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // Clean customer data to ensure no undefined values
    const safeCustomer = {
        id: orderData.customer?.id || '',
        name: orderData.customer?.name || '',
        phone: orderData.customer?.phone || '',
        address: orderData.customer?.address || '',
        email: orderData.customer?.email || '',
        city: orderData.customer?.city || '',
        country: orderData.customer?.country || ''
    };

    const payload = {
      // Legacy flat fields - Write them instead of deleting
      customerName: safeCustomer.name,
      phone: safeCustomer.phone,
      address: safeCustomer.address,
      email: safeCustomer.email,

      // Structured Customer Object
      customer: safeCustomer,

      items: orderData.items || [],
      shippingCost: orderData.shippingCost || 0,
      total: orderData.total || 0,
      note: orderData.notes || '',
      status: (orderData.status || 'pending').toLowerCase(),
      paymentStatus: orderData.paymentStatus || 'Unpaid',
      paymentMethod: orderData.paymentMethod || 'Cash',
      // Preserve sepayId if it exists in update data, typically it might be updated by backend
      ...(orderData.sepayId !== undefined && { sepayId: orderData.sepayId })
    };
    await updateDoc(orderRef, payload);
  } catch (error) {
    console.error("Error updating order:", error);
    throw error;
  }
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  try {
    if (!orderId) throw new Error("Order ID is required");
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
  } catch (error) {
    console.error("Error deleting order:", error);
    throw error;
  }
};