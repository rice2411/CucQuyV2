import { OrderStatus, PaymentStatus, PaymentMethod } from './enums';
import { Customer } from './customer';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber?: string; // New human-readable ID (ORD-XXXXXX)
  sepayId?: number; // Transaction ID from SePay
  customer: Customer;
  items: OrderItem[];
  total: number;
  shippingCost?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  date: string;
  trackingNumber?: string;
  note?: string;
  createdBy?: string; // Tên người tạo đơn (customName hoặc email)
}
