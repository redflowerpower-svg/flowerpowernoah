import { useState, useRef } from 'react';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { supabase } from '../lib/supabase';
import { X, Upload, MapPin, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const QR_URL = 'https://res.cloudinary.com/dhxd3o7nk/image/upload/v1779969719/QR_KITTI_qnsev7.jpg';

export default function CheckoutFlow({ onClose, onSuccess }: Props) {
  const { items, getTotal, clearCart } = useCartStore();
  const { requestLocation, setSimulatedLocation, isLoading: locationLoading, distanceKm, isDeliverable } = useLocationStore();
  
  const total = getTotal();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('promptpay');
  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let receiptUrl = null;

      if (paymentMethod === 'promptpay' && receiptFile) {
        const fileName = `receipts/${Date.now()}-${receiptFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);
        
        if (uploadError) throw uploadError;
        receiptUrl = data.path;
      }

      const orderData = {
        customer_name: name || 'Cliente',
        phone: phone || '0000000000',
        address: address || 'Nessun indirizzo',
        items: items,
        total: total,
        status: 'new',
        payment_method: paymentMethod,
        receipt_url: receiptUrl
      };

      const { error } = await supabase.from('pizza_orders').insert([orderData]);
      if (error) throw error;

      clearCart();
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Errore invio: ' + (err instanceof Error ? err.message : 'Controlla database'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-stone-900 w-full max-w-md p-6 border border-stone-800 text-white relative rounded-lg shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-500 hover:text-white"><X size={20} /></button>
        
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-light">I Tuoi Dati</h2>
            <input className="w-full bg-stone-800 p-3 rounded" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
            <input className="w-full bg-stone-800 p-3 rounded" placeholder="Telefono" value={phone} onChange={e => setPhone(e.target.value)} />
            <textarea className="w-full bg-stone-800 p-3 rounded" placeholder="Indirizzo" value={address} onChange={e => setAddress(e.target.value)} />
            
            <button type="button" onClick={requestLocation} className="w-full bg-stone-800 p-2 text-sm flex items-center justify-center gap-2 hover:bg-stone-700">
              {locationLoading ? <Loader2 size={16} className="animate-spin" /> : <><MapPin size={16} /> Verifica Posizione</>}
            </button>
            
            {distanceKm !== null && !isDeliverable && (
              <button onClick={setSimulatedLocation} className="text-xs text-stone-400 underline w-full">Simula posizione (Test)</button>
            )}

            <button 
              onClick={() => setStep(2)} 
              disabled={distanceKm !== null && !isDeliverable}
              className="w-full bg-red-700 p-3 rounded font-bold disabled:bg-stone-800 disabled:text-stone-600"
            >
              Continua
            </button>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-light">Pagamento</h2>
            <select className="w-full bg-stone-800 p-3 rounded" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="promptpay">PromptPay (QR)</option>
              <option value="cash">Contanti alla consegna</option>
            </select>
            
            {paymentMethod === 'promptpay' && (
              <div className="space-y-3">
                <img src={QR_URL} alt="QR" className="w-48 h-48 mx-auto object-contain bg-white p-2 rounded" />
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                <button onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed p-2 text-xs hover:border-white transition-colors">
                  {receiptFile ? receiptFile.name : 'Carica ricevuta'}
                </button>
              </div>
            )}
            
            <button 
              onClick={handleSubmit} 
              disabled={loading || (paymentMethod === 'promptpay' && !receiptFile)}
              className={`w-full p-3 font-bold rounded transition-colors ${
                (paymentMethod === 'promptpay' && !receiptFile) 
                ? 'bg-stone-700 text-stone-500 cursor-not-allowed' 
                : 'bg-green-700 text-white hover:bg-green-600'
              }`}
            >
              {loading ? 'Attendere...' : (paymentMethod === 'promptpay' && !receiptFile ? 'CARICA RICEVUTA PER CONFERMARE' : 'CONFERMA E INVIA')}
            </button>
            <button onClick={() => setStep(1)} className="w-full bg-stone-800 p-2 text-xs text-stone-400 mt-2 rounded">Torna indietro</button>
          </div>
        )}
        
        {step === 3 && (
          <div className="text-center py-8">
            <h2 className="text-xl">Ordine Inviato!</h2>
            <button onClick={() => { clearCart(); onSuccess(); }} className="bg-stone-700 p-3 w-full mt-4 rounded">Chiudi</button>
          </div>
        )}
      </div>
    </div>
  );
}