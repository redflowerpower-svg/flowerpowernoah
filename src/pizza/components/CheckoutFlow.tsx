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

      const order: Omit<PizzaOrder, 'id' | 'created_at'> = {
        customer_name: name.trim(),
        phone: phone.trim(),
        address: deliveryType === 'pickup' ? 'Pickup at restaurant' : address.trim(),
        items: savedItems,
        total,
        status: 'new',
        payment_method: (paymentMethod === 'cash' ? 'cash' : 'promptpay'),
        receipt_url: receiptUrl,
        telegram_notified: false,
      };

      const { error: dbError } = await supabase.from('pizza_orders').insert(order);
      if (dbError) throw dbError;

      await sendTelegramNotification({ ...order, receipt_url: receiptUrl });

      clearCart();
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="min-h-full flex items-start sm:items-center justify-center py-6 px-4">
        <div className="w-full max-w-lg bg-stone-900" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800">
            <div className="flex items-center gap-3">
              {step > 1 && step < 3 && (
                <button onClick={() => setStep((s) => (s - 1) as Step)} className="text-stone-500 hover:text-white transition-colors">
                  <ArrowLeft size={18} />
                </button>
              )}
              <p className="text-white text-sm tracking-widest uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                {step === 1 && 'Your Details'} {step === 2 && 'Payment'} {step === 3 && 'Confirmed!'}
              </p>
            </div>
            {step < 3 && <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors"><X size={18} /></button>}
          </div>
          {step < 3 && (
            <div className="flex px-6 pt-5 gap-2">
              {[1, 2].map((s) => (<div key={s} className="h-0.5 flex-1 transition-all duration-300" style={{ background: step >= s ? '#b91c1c' : 'rgba(255,255,255,0.1)' }} />))}
            </div>
          )}
          <div className="p-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full bg-stone-800 border border-stone-700 text-white text-sm px-4 py-3 focus:outline-none focus:border-red-700" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Phone Number *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+66 xx xxx xxxx" className="w-full bg-stone-800 border border-stone-700 text-white text-sm px-4 py-3 focus:outline-none focus:border-red-700" />
                </div>
                <div>
                    <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Order Type *</label>
                    <div className="flex gap-2">
                        {(['delivery', 'pickup'] as const).map((type) => (
                        <button key={type} onClick={() => setDeliveryType(type)} className="flex-1 py-3 text-xs uppercase tracking-widest" style={{ background: deliveryType === type ? 'rgba(185,28,28,0.15)' : 'transparent', border: deliveryType === type ? '1px solid #b91c1c' : '1px solid rgba(255,255,255,0.1)', color: deliveryType === type ? '#fca5a5' : 'rgba(255,255,255,0.5)' }}>
                            {type === 'delivery' ? 'Delivery' : 'Pickup'}
                        </button>
                        ))}
                    </div>
                </div>
                {deliveryType === 'delivery' && (
                    <>
                        <div>
                            <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2">Delivery Address *</label>
                            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full delivery address..." rows={3} className="w-full bg-stone-800 border border-stone-700 text-white text-sm px-4 py-3 focus:outline-none focus:border-red-700 resize-none" />
                        </div>
                        <div className="border border-stone-800 p-4 space-y-3">
                            <button type="button" onClick={requestLocation} disabled={locationLoading} className="w-full flex items-center justify-center gap-2 py-3 text-xs tracking-widest uppercase" style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
                                {locationLoading ? <Loader2 size={14} className="animate-spin" /> : <><MapPin size={14} /> Verify Location</>}
                            </button>
                            {distanceKm !== null && <p className="text-xs text-center" style={{ color: isDeliverable ? '#86efac' : '#fca5a5' }}>{isDeliverable ? `Sei a ${distanceKm.toFixed(1)} km dal ristorante` : 'Fuori area di consegna'}</p>}
                            {!isDeliverable && distanceKm !== null && (
                                <button type="button" onClick={setSimulatedLocation} className="w-full py-2 text-xs text-stone-500 underline">Simula posizione (Test)</button>
                            )}
                        </div>
                    </>
                )}
                <button disabled={!step1Valid} onClick={() => setStep(2)} className="w-full py-4 text-xs tracking-widest uppercase" style={{ background: step1Valid ? '#b91c1c' : 'rgba(255,255,255,0.05)', color: step1Valid ? 'white' : 'rgba(255,255,255,0.3)' }}>
                    Continue to Payment <ArrowRight size={14} />
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-400 mb-3">Payment Method *</p>
                  <div className="flex gap-2">
                    {([ { value: 'promptpay', label: 'PromptPay (QR)' }, { value: 'cash', label: 'Cash on Delivery' } ] as const).map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => setPaymentMethod(value)} className="flex-1 py-3 text-xs uppercase" style={{ background: paymentMethod === value ? 'rgba(185,28,28,0.15)' : 'transparent', border: paymentMethod === value ? '1px solid #b91c1c' : '1px solid rgba(255,255,255,0.1)', color: paymentMethod === value ? '#fca5a5' : 'rgba(255,255,255,0.5)' }}>{label}</button>
                    ))}
                  </div>
                </div>
                {paymentMethod === 'promptpay' && (
                  <>
                    <div className="flex justify-center"><img src={PROMPTPAY_QR} alt="QR" className="w-48" /></div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-stone-700 p-4 text-xs text-stone-500">Upload screenshot</button>
                  </>
                )}
                {error && <div className="p-3 border border-red-800 bg-red-900 bg-opacity-20 text-red-400 text-xs">{error}</div>}
                <button disabled={!canSubmit || loading} onClick={handleSubmit} className="w-full py-4 text-xs uppercase" style={{ background: canSubmit && !loading ? '#b91c1c' : 'rgba(255,255,255,0.05)' }}>
                  {loading ? 'Confirming...' : 'Confirm Order'}
                </button>
              </div>
            )}
            {step === 3 && (
              <div className="text-center py-6 space-y-5">
                <CheckCircle size={48} className="text-green-500 mx-auto" />
                <p className="text-white text-xl">Order Confirmed!</p>
                <button onClick={onSuccess} className="w-full py-4 bg-red-700 text-white text-xs uppercase">Back to Menu</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}