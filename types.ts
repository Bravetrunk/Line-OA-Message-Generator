export interface Item {
  id: number;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

export interface QuickItem {
  name: string;
  unit: string;
}

export interface StoreConfig {
  contactPhone: string;
}

export interface CustomerDetails {
    patientName: string;
    customerPhone: string;
    shippingAddress: string;
}

export interface PriceDetails {
    shippingFee: number;
    discount: number;
}

export interface Order extends CustomerDetails, PriceDetails {
  timestamp: number;
  items: Omit<Item, 'id'>[];
  finalPrice: number;
}

export type StatusType = 'success' | 'error';

export interface StatusMessage {
    text: string;
    type: StatusType;
}