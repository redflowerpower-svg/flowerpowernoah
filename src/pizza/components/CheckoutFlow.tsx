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

export default function CheckoutFlow({ onClose, onSuccess }: Props) {
  const { items, getTotal, clearCart } = useCartStore();
  const total = getTotal();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'cash'>('promptpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
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
        customer_name: name,
        phone: phone,
        address: deliveryType === 'pickup' ? 'Pickup' : address,
        items: savedItems,
        total,
        status: 'new',
        payment_method: paymentMethod
      };

      const { error: dbError } = await supabase.from('pizza_orders').insert([order]);
      if (dbError) throw dbError;

      clearCart();
      setStep(3);
    } catch (err) {
      setError('Errore nell\'invio. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-stone-900 w-full max-w-md p-6 border border-stone-800">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-white text-lg">I Tuoi Dati</h2>
            <input className="w-full bg-stone-800 p-3 text-white" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
            <input className="w-full bg-stone-800 p-3 text-white" placeholder="Telefono" value={phone} onChange={e => setPhone(e.target.value)} />
            <button onClick={() => setStep(2)} className="w-full bg-red-700 text-white p-3">Continua</button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-white text-lg">Pagamento</h2>
            <button onClick={() => setPaymentMethod('promptpay')} className="w-full border border-stone-700 p-3 text-white">PromptPay</button>
            <button onClick={() => setPaymentMethod('cash')} className="w-full border border-stone-700 p-3 text-white">Contanti</button>
            <button onClick={handleSubmit} className="w-full bg-green-700 text-white p-3" disabled={loading}>
                {loading ? 'Attendere...' : 'Conferma Ordine'}
            </button>
          </div>
        )}
        {step === 3 && <div className="text-white text-center">Ordine inviato! <button onClick={onSuccess} className="underline">Chiudi</button></div>}
      </div>
    </div>
  );
}