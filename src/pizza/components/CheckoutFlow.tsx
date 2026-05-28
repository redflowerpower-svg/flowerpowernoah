import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useCartStore, calcItemTotal } from '../store/cartStore';
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

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step1Valid = name.trim() && phone.trim() && (deliveryType === 'pickup' || address.trim());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!receiptFile) return;
    setLoading(true);
    setError(null);

    try {
      const ext = receiptFile.name.split('.').pop() ?? 'jpg';
      const fileName = `receipt-${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile, { contentType: receiptFile.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
      const receiptUrl = urlData.publicUrl;

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
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
                {step === 1 && 'Your Details'}
                {step === 2 && 'Payment'}
                {step === 3 && 'Confirmed!'}
              </p>
            </div>
            {step < 3 && (
              <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            )}
          </div>

          {step < 3 && (
            <div className="flex px-6 pt-5 gap-2">
              {[1, 2].map((s) => (
                <div key={s} className="h-0.5 flex-1 transition-all duration-300"
                  style={{ background: step >= s ? '#b91c1c' : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
          )}

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Full Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                    className="w-full bg-stone-800 border border-stone-700 text-white text-sm px-4 py-3 focus:outline-none focus:border-red-700 placeholder-stone-600 transition-colors" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Phone Number *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+66 xx xxx xxxx"
                    className="w-full bg-stone-800 border border-stone-700 text-white text-sm px-4 py-3 focus:outline-none focus:border-red-700 placeholder-stone-600 transition-colors" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Order Type *</label>
                  <div className="flex gap-2">
                    {(['delivery', 'pickup'] as const).map((type) => (
                      <button key={type} onClick={() => setDeliveryType(type)}
                        className="flex-1 py-3 text-xs uppercase tracking-widest transition-all"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          background: deliveryType === type ? 'rgba(185,28,28,0.15)' : 'transparent',
                          border: deliveryType === type ? '1px solid #b91c1c' : '1px solid rgba(255,255,255,0.1)',
                          color: deliveryType === type ? '#fca5a5' : 'rgba(255,255,255,0.5)',
                        }}>
                        {type === 'delivery' ? 'Delivery' : 'Pickup'}
                      </button>
                    ))}
                  </div>
                </div>
                {deliveryType === 'delivery' && (
                  <div>
                    <label className="text-xs uppercase tracking-widest text-stone-400 block mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Delivery Address *</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full delivery address..." rows={3}
                      className="w-full bg-stone-800 border border-stone-700 text-white text-sm px-4 py-3 focus:outline-none focus:border-red-700 placeholder-stone-600 transition-colors resize-none" />
                  </div>
                )}
                <div className="border border-stone-800 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-stone-500 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>Order Summary</p>
                  {items.map((item) => (
                    <div key={item.cartId} className="flex justify-between text-xs">
                      <span className="text-stone-400">
                        {item.quantity}x {item.name}{item.selectedVariant && ` (${item.selectedVariant.name})`}
                      </span>
                      <span className="text-stone-400">{calcItemTotal(item)} ฿</span>
                    </div>
                  ))}
                  <div className="border-t border-stone-800 pt-2 flex justify-between">
                    <span className="text-stone-300 text-sm">Total</span>
                    <span className="text-red-400 text-sm font-light">{total} ฿</span>
                  </div>
                </div>
                <button
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 py-4 text-xs tracking-widest uppercase transition-all"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    background: step1Valid ? '#b91c1c' : 'rgba(255,255,255,0.05)',
                    color: step1Valid ? 'white' : 'rgba(255,255,255,0.3)',
                    cursor: step1Valid ? 'pointer' : 'not-allowed',
                  }}>
                  Continue to Payment <ArrowRight size={14} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-white font-light mb-1" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.3rem' }}>
                    Pay via PromptPay
                  </p>
                  <p className="text-stone-400 text-xs">
                    Scan the QR code and transfer exactly <span className="text-red-400 font-medium">{total} ฿</span>
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="bg-white p-4" style={{ maxWidth: '260px', width: '100%' }}>
                    <img src={PROMPTPAY_QR} alt="PromptPay QR Code" className="w-full h-auto block" />
                  </div>
                </div>

                <div className="border border-stone-800 p-4 space-y-2 text-xs text-stone-400">
                  {[
                    `Open your banking app and scan the QR code above`,
                    `Transfer exactly ${total} ฿ to confirm your order`,
                    `Take a screenshot of your payment confirmation`,
                    `Upload the screenshot below to complete your order`,
                  ].map((step, i) => (
                    <p key={i} className="flex items-start gap-2">
                      <span className="text-red-500 font-bold flex-shrink-0">{i + 1}.</span>
                      {step}
                    </p>
                  ))}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-400 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Upload Payment Screenshot *
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  {receiptPreview ? (
                    <div className="relative">
                      <img src={receiptPreview} alt="Receipt preview" className="w-full object-contain border border-stone-700" style={{ maxHeight: '200px' }} />
                      <button
                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-700 flex items-center justify-center text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-stone-700 p-8 flex flex-col items-center gap-3 hover:border-red-800 transition-colors"
                    >
                      <Upload size={28} className="text-stone-500" />
                      <span className="text-stone-500 text-xs">Tap to upload screenshot</span>
                      <span className="text-stone-600 text-xs">JPG, PNG or WEBP</span>
                    </button>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 border border-red-800 bg-red-900 bg-opacity-20">
                    <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-400 text-xs">{error}</p>
                  </div>
                )}

                <button
                  disabled={!receiptFile || loading}
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 py-4 text-xs tracking-widest uppercase transition-all"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    background: receiptFile && !loading ? '#b91c1c' : 'rgba(255,255,255,0.05)',
                    color: receiptFile && !loading ? 'white' : 'rgba(255,255,255,0.3)',
                    cursor: receiptFile && !loading ? 'pointer' : 'not-allowed',
                  }}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Confirming Order...
                    </span>
                  ) : (
                    <>Confirm Order <ArrowRight size={14} /></>
                  )}
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 bg-green-900 bg-opacity-30 flex items-center justify-center mx-auto">
                  <CheckCircle size={36} className="text-green-500" />
                </div>
                <div>
                  <p className="text-white font-light mb-2" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.6rem' }}>
                    Order Confirmed!
                  </p>
                  <p className="text-stone-400 text-sm">Thank you, <span className="text-white">{name}</span>!</p>
                  <p className="text-stone-500 text-xs mt-2 leading-relaxed">
                    We've received your order and payment confirmation. Our team will start preparing it shortly.
                  </p>
                </div>
                <div className="border border-stone-800 p-4 text-left space-y-2">
                  <p className="text-xs text-stone-400 uppercase tracking-widest mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Order Details</p>
                  <p className="text-stone-400 text-xs">📞 We'll contact you at <span className="text-white">{phone}</span></p>
                  {deliveryType === 'delivery'
                    ? <p className="text-stone-400 text-xs">📍 Delivery to: <span className="text-white">{address}</span></p>
                    : <p className="text-stone-400 text-xs">🏠 Pickup at restaurant</p>
                  }
                  <p className="text-stone-400 text-xs">💰 Total paid: <span className="text-red-400">{total} ฿</span></p>
                </div>
                <button onClick={onSuccess}
                  className="w-full py-4 bg-red-700 text-white text-xs tracking-widest uppercase hover:bg-red-800 transition-colors"
                  style={{ fontFamily: 'Inter, sans-serif' }}>
                  Back to Menu
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
