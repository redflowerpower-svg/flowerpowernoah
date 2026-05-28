import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, AlertCircle, X, MapPin, Loader2 } from 'lucide-react';
import { useCartStore, calcItemTotal } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { supabase } from '../lib/supabase';
import type { PizzaOrder, CartItemSaved } from '../lib/supabase';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

const PROMPTPAY_QR = 'https://res.cloudinary.com/dhxd3o7nk/image/upload/v1779969719/QR_KITTI_qnsev7.jpg';

async function sendTelegramNotification(order: PizzaOrder) {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID as string;
  if (!token || chatId === 'CONFIGURE_ME') return;

  const itemLines = (order.items as CartItemSaved[]).map((item) => {
    const variant = item.selectedVariant ? ` (${item.selectedVariant})` : '';
    const extras = item.selectedExtras.length
      ? `\n  + ${item.selectedExtras.map((e) => `${e.name} +${e.price}฿`).join(', ')}`
      : '';
    return `• ${item.quantity}x ${item.name}${variant} — ${item.itemTotal}฿${extras}`;
  }).join('\n');

  const paymentLabel = order.payment_method === 'cash' ? 'Contanti alla consegna' : 'PromptPay';

  const message = [
    '🍕 *NEW ORDER — Flower Power Pizza*',
    '',
    `👤 *${order.customer_name}*`,
    `📞 ${order.phone}`,
    `📍 ${order.address}`,
    '',
    '*Items:*',
    itemLines,
    '',
    `💰 *Total: ${order.total} ฿*`,
    `💳 *Metodo di pagamento: ${paymentLabel}*`,
    '',
    order.receipt_url ? `🧾 [View Receipt](${order.receipt_url})` : '🧾 No receipt uploaded',
  ].join('\n');

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
  });
}

export default function CheckoutFlow({ onClose, onSuccess }: Props) {
  const { items, getTotal, clearCart } = useCartStore();
  const total = getTotal();
  const { requestLocation, setSimulatedLocation, isLoading: locationLoading, distanceKm, isDeliverable, error: locationError } = useLocationStore();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'cash'>('promptpay');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const locationVerified = deliveryType === 'pickup' || distanceKm !== null;
  const step1Valid = name.trim() && phone.trim() && (deliveryType === 'pickup' || address.trim()) && locationVerified && isDeliverable;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const canSubmit = paymentMethod === 'cash' || receiptFile !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      let receiptUrl: string | null = null;

      if (paymentMethod === 'promptpay' && receiptFile) {
        const ext = receiptFile.name.split('.').pop() ?? 'jpg';
        const fileName = `receipt-${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile, { contentType: receiptFile.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
        receiptUrl = urlData.publicUrl;
      }

      const savedItems: CartItemSaved[] = items.map((item) => ({
        productId: item.productId,
        name: item.name,
        nameTh: item.nameTh,
        quantity: item.quantity,
        basePrice: item.basePrice,
        selectedVariant: item.selectedVariant?.name ?? null,
        selectedExtras: item.selectedExtras.map((e) => ({ id: e.id, name: e.name, price: e.price })),
        itemTotal: calcItemTotal(item),
      }));

      const order = {
        customer_name: name.trim(),
        phone: phone.trim(),
        address: deliveryType === 'pickup' ? 'Pickup at restaurant' : address.trim(),
        items: savedItems,
        total: total,
        status: 'new',
        payment_method: paymentMethod === 'cash' ? 'cash' : 'promptpay',
        receipt_url: receiptUrl,
        telegram_notified: false,
      };

      const { error: dbError } = await supabase.from('pizza_orders').insert([order]);
      
      if (dbError) throw dbError;

      await sendTelegramNotification({ ...order, receipt_url: receiptUrl } as PizzaOrder);

      clearCart();
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="min-h-full flex items-start sm:items-center justify-center py-6 px-4">
        <div className="w-full max-w-lg bg-stone-900 border border-stone-800">
           {/* ... resto del UI ... */}
        </div>
      </div>
    </div>
  );
}