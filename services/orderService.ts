import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Order, OrderStatus, PaymentStatus, ProductType, OrderItem } from '../types';
import { DEFAULT_PRICES } from '../constants';
import * as XLSX from 'xlsx-js-style';

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    // Try to order by orderDate if index exists, otherwise basic query
    const q = query(ordersRef); 
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Helper to safely convert Firestore timestamps or strings to ISO string
      const getDate = (val: any) => {
        if (!val) return new Date().toISOString();
        if (val.toDate && typeof val.toDate === 'function') {
          return val.toDate().toISOString();
        }
        return new Date(val).toISOString();
      };

      // Helper to map Firestore status string to Enum
      const mapStatus = (status: string): OrderStatus => {
        const s = (status || '').toLowerCase();
        if (s === 'completed' || s === 'success') return OrderStatus.DELIVERED;
        if (s === 'shipping' || s === 'shipped') return OrderStatus.SHIPPED;
        if (s === 'pending') return OrderStatus.PENDING;
        if (s === 'cancelled' || s === 'fail') return OrderStatus.CANCELLED;
        if (s === 'returned') return OrderStatus.RETURNED;
        if (s === 'processing') return OrderStatus.PROCESSING;
        
        // Fallback checks against Enum values directly
        const enumValues = Object.values(OrderStatus).map(v => v.toLowerCase());
        if (enumValues.includes(s as any)) {
            // Find the matching key/value
            const match = Object.values(OrderStatus).find(v => v.toLowerCase() === s);
            if (match) return match;
        }

        return OrderStatus.PROCESSING; // Default fallback
      };

      // Helper for Payment Status normalization
      const getPaymentStatus = (val: any): PaymentStatus => {
         if (!val) return PaymentStatus.UNPAID;
         const s = String(val).toLowerCase();
         if (s === 'paid') return PaymentStatus.PAID;
         if (s === 'refunded') return PaymentStatus.REFUNDED;
         return PaymentStatus.UNPAID;
      };

      // Helper to generate a consistent image based on product type
      const getProductImage = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('family') || t.includes('gia đình')) return 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&q=80&w=200';
        if (t.includes('friend') || t.includes('tình bạn')) return 'https://images.unsplash.com/photo-1621236378699-8597f840b45a?auto=format&fit=crop&q=80&w=200';
        if (t.includes('set') || t.includes('quà') || t.includes('gif')) return 'https://images.unsplash.com/photo-1549488352-22668e9e6c1c?auto=format&fit=crop&q=80&w=200';
        if (t.includes('cookie') || t.includes('bánh')) return 'https://images.unsplash.com/photo-1499636138143-bd649025ebeb?auto=format&fit=crop&q=80&w=200';
        if (t.includes('cake') || t.includes('kem')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=200';
        return `https://placehold.co/200x200?text=${encodeURIComponent(type || 'Product')}`;
      };

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

      // CONSISTENCY CHECK: Recalculate total using standard formula: Price * Quantity + Shipping
      const calculatedSubtotal = items.reduce((sum: number, item: OrderItem) => {
          return sum + (Number(item.price) * Number(item.quantity));
      }, 0);

      const finalTotal = calculatedSubtotal + Number(shippingCost);

      return {
        id: doc.id,
        customer: {
          id: `CUST-${doc.id.substring(0, 6)}`,
          name: data.customerName || 'Walk-in Customer',
          email: data.email || '', 
          phone: data.phone || '',
          address: data.address || '', 
          city: '',
          country: ''
        },
        items: items,
        total: finalTotal, // Use calculated total
        shippingCost: shippingCost,
        status: mapStatus(data.status),
        paymentStatus: getPaymentStatus(data.paymentStatus),
        date: getDate(data.orderDate || data.createdAt),
        trackingNumber: data.trackingNumber,
        notes: data.note || data.notes || ''
      } as Order;
    });
  } catch (error) {
    console.error("Error fetching orders from Firebase:", error);
    return [];
  }
};

export const addOrder = async (orderData: any): Promise<void> => {
  try {
    const ordersRef = collection(db, 'orders');
    // Map internal form data to specific Firestore flat structure
    const payload = {
      customerName: orderData.customer?.name || '',
      phone: orderData.customer?.phone || '',
      address: orderData.customer?.address || '',
      items: orderData.items || [], // New Array structure
      shippingCost: orderData.shippingCost || 0,
      total: orderData.total || 0,
      note: orderData.notes || '',
      status: (orderData.status || 'pending').toLowerCase(),
      orderDate: Timestamp.now(),
      createdAt: Timestamp.now(),
      paymentStatus: orderData.paymentStatus || 'Unpaid' 
    };
    await addDoc(ordersRef, payload);
  } catch (error) {
    console.error("Error adding order:", error);
    throw error;
  }
};

export const updateOrder = async (orderId: string, orderData: any): Promise<void> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    // Map internal form data to specific Firestore flat structure
    const payload = {
      customerName: orderData.customer?.name || '',
      phone: orderData.customer?.phone || '',
      address: orderData.customer?.address || '',
      items: orderData.items || [],
      shippingCost: orderData.shippingCost || 0,
      total: orderData.total || 0,
      note: orderData.notes || '',
      status: (orderData.status || 'pending').toLowerCase(),
      paymentStatus: orderData.paymentStatus || 'Unpaid'
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

export interface ExportColumn {
  id: string;
  label: string;
  field: (order: Order) => any;
}

// Helper to apply header styling
const applyHeaderStyle = (ws: any, headerColor: string) => {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[address]) continue;
    
    ws[address].s = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" }
      },
      fill: {
        fgColor: { rgb: headerColor.replace('#', '') }
      },
      alignment: {
        horizontal: "center",
        vertical: "center"
      },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };
  }
};

export const exportOrdersToExcel = (
  orders: Order[], 
  columns: ExportColumn[], 
  headerColor: string = '#ea580c'
) => {
  const wb = XLSX.utils.book_new();

  // Group orders by Month (YYYY-MM)
  const groupedOrders: Record<string, Order[]> = {};
  orders.forEach(order => {
    const d = new Date(order.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groupedOrders[key]) groupedOrders[key] = [];
    groupedOrders[key].push(order);
  });

  const monthKeys = Object.keys(groupedOrders).sort();

  if (monthKeys.length > 1) {
    // --- MULTI-SHEET MODE (Overall + Monthly Sheets) ---

    // 1. Overall Sheet
    const overallData = monthKeys.map(month => {
      const monthOrders = groupedOrders[month];
      const revenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const uniqueCustomers = new Set(monthOrders.map(o => o.customer.id)).size;
      return {
        "Month": month,
        "Total Orders": monthOrders.length,
        "Total Revenue": revenue,
        "Total Customers": uniqueCustomers,
        "Avg Order Value": monthOrders.length ? revenue / monthOrders.length : 0
      };
    });

    const wsOverall = XLSX.utils.json_to_sheet(overallData);
    // Set columns width
    wsOverall['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }
    ];
    applyHeaderStyle(wsOverall, headerColor);
    XLSX.utils.book_append_sheet(wb, wsOverall, "Overall");

    // 2. Individual Month Sheets
    monthKeys.forEach(month => {
      const sheetData = groupedOrders[month].map(order => {
        const row: any = {};
        columns.forEach(col => {
          row[col.label] = col.field(order);
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws['!cols'] = columns.map(() => ({ wch: 20 }));
      applyHeaderStyle(ws, headerColor);
      XLSX.utils.book_append_sheet(wb, ws, month);
    });

  } else {
    // --- SINGLE SHEET MODE (Standard) ---
    const data = orders.map(order => {
      const row: any = {};
      columns.forEach(col => {
        row[col.label] = col.field(order);
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = columns.map(() => ({ wch: 20 }));
    applyHeaderStyle(ws, headerColor);
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
  }

  const fileName = `CucQuy_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
