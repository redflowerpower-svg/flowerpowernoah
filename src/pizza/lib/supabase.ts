import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CartItemSaved {
  productId: string;
  name: string;
  nameTh: string;
  quantity: number;
  basePrice: number;
  selectedVariant: string | null;
  selectedExtras: { id: string; name: string; price: number }[];
  itemTotal: number;
}

export interface PizzaOrder {
  id?: string;
  created_at?: string;
  customer_name: string;
  phone: string;
  address: string;
  items: CartItemSaved[];
  total: number;
  status: 'new' | 'preparing' | 'ready';
  receipt_url: string;
  telegram_notified?: boolean;
}
