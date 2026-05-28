import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutFlow({ onClose, onSuccess }: Props) {
  const { items, getTotal, clearCart } = useCartStore();
  const total = getTotal();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('promptpay');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const order = {
        customer_name: name || 'Cliente',
        phone: phone || '0000000000',
        address: address || 'Nessun indirizzo',
        items: items,
        total: total,
        status: 'new',
        payment_method: paymentMethod
      };

      const { error } = await supabase.from('pizza_orders').insert([order]);
      
      if (error) throw error;

      clearCart();
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Errore invio. Controlla la console (F12) per il dettaglio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-stone-900 w-full max-w-md p-6 border border-stone-800 text-white relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-white"><X size={20} /></button>
        
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl">I Tuoi Dati</h2>
            <input className="w-full bg-stone-800 p-3" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
            <input className="w-full bg-stone-800 p-3" placeholder="Telefono" value={phone} onChange={e => setPhone(e.target.value)} />
            <textarea className="w-full bg-stone-800 p-3" placeholder="Indirizzo" value={address} onChange={e => setAddress(e.target.value)} />
            <button onClick={() => setStep(2)} className="w-full bg-red-700 p-3">Continua</button>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl">Conferma</h2>
            <select className="w-full bg-stone-800 p-3" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="promptpay">PromptPay</option>
              <option value="cash">Contanti</option>
            </select>
            <button onClick={handleSubmit} className="w-full bg-green-700 p-3" disabled={loading}>
              {loading ? 'Attendere...' : 'Invia Ordine'}
            </button>
          </div>
        )}
        
        {step === 3 && (
          <div className="text-center py-8">
            <h2 className="text-xl">Ordine Inviato!</h2>
            <button onClick={() => { clearCart(); onSuccess(); }} className="bg-stone-700 p-3 w-full mt-4">Chiudi</button>
          </div>
        )}
      </div>
    </div>
  );
}