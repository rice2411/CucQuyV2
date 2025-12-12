import { OrderStatus, PaymentStatus, PaymentMethod, OrderItem } from '../types/index';

/**
 * Chuyển đổi Firestore timestamp hoặc string sang ISO string
 */
export const getDate = (val: any): string => {
  if (!val) return new Date().toISOString();
  if (val.toDate && typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  return new Date(val).toISOString();
};

/**
 * Map status string từ Firestore sang OrderStatus enum
 */
export const mapStatus = (status: string): OrderStatus => {
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
    const match = Object.values(OrderStatus).find(v => v.toLowerCase() === s);
    if (match) return match;
  }

  return OrderStatus.PROCESSING; // Default fallback
};

/**
 * Normalize payment status từ Firestore sang PaymentStatus enum
 */
export const getPaymentStatus = (val: any): PaymentStatus => {
  if (!val) return PaymentStatus.UNPAID;
  const s = String(val).toLowerCase();
  if (s === 'paid') return PaymentStatus.PAID;
  if (s === 'refunded') return PaymentStatus.REFUNDED;
  return PaymentStatus.UNPAID;
};

/**
 * Normalize payment method từ Firestore sang PaymentMethod enum
 */
export const getPaymentMethod = (val: any): PaymentMethod => {
  const s = String(val || '').toLowerCase();
  if (s === 'banking' || s === 'transfer' || s === 'chuyển khoản') return PaymentMethod.BANKING;
  return PaymentMethod.CASH;
};

/**
 * Tạo URL ảnh sản phẩm dựa trên loại sản phẩm
 */
export const getProductImage = (type: string): string => {
  const t = (type || '').toLowerCase();
  if (t.includes('family') || t.includes('gia đình')) return 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&q=80&w=200';
  if (t.includes('friend') || t.includes('tình bạn')) return 'https://images.unsplash.com/photo-1621236378699-8597f840b45a?auto=format&fit=crop&q=80&w=200';
  if (t.includes('set') || t.includes('quà') || t.includes('gif')) return 'https://images.unsplash.com/photo-1549488352-22668e9e6c1c?auto=format&fit=crop&q=80&w=200';
  if (t.includes('cookie') || t.includes('bánh')) return 'https://images.unsplash.com/photo-1499636138143-bd649025ebeb?auto=format&fit=crop&q=80&w=200';
  if (t.includes('cake') || t.includes('kem')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=200';
  return `https://placehold.co/200x200?text=${encodeURIComponent(type || 'Product')}`;
};

/**
 * Tính tổng tiền từ danh sách items và shipping cost
 */
export const calculateOrderTotal = (items: OrderItem[], shippingCost: number = 0): number => {
  const subtotal = items.reduce((sum: number, item: OrderItem) => {
    return sum + (Number(item.price) * Number(item.quantity));
  }, 0);
  return subtotal + Number(shippingCost);
};
