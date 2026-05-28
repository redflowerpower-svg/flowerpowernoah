import { useState, useRef } from 'react';
import { useCartStore } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { supabase } from '../lib/supabase';
import { MapPin, Loader2, X, Upload } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const QR_URL = 'https://res.cloudinary.com/dhxd3o7nk/image/upload/v1779969719/QR_KITTI_qnsev7.jpg';

export default function CheckoutFlow({ onClose, onSuccess }: Props) {
  const { items, getTotal, clearCart } = useCartStore();
  const total = getTotal();
  const { requestLocation, setSimulatedLocation, isLoading: locationLoading, distanceKm, isDeliverable } = useLocationStore();
  
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

      // Gestione caricamento ricevuta
      if (paymentMethod === 'promptpay' && receiptFile) {
        const fileName = `receipts/${Date.now()}-${receiptFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);
        
        if (uploadError) throw uploadError;
        receiptUrl = data.path;
      }

      const order = {
        customer_name: name || 'Cliente',
        phone: phone || '0000000000',
        address: address || 'Pickup',
        items: items,
        total: total,
        status: 'new',
        payment_method: paymentMethod,
        receipt_url: receiptUrl
      };

      const { error } = await supabase.from('pizza_orders').insert([order]);
      if (error) throw error;

      clearCart();
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'invio. Riprova.');
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
            <h2 className="text-xl font-light">I Tuoi Dati</h2>
            <input className="w-full bg-stone-800 p-3" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
            <input className="w-full bg-stone-800 p-3" placeholder="Telefono" value={phone} onChange={e => setPhone(e.target.value)} />
            <textarea className="w-full bg-stone-800 p-3" placeholder="Indirizzo di consegna..." value={address} onChange={e => setAddress(e.target.value)} rows={3} />
            
            <div className="border border-stone-700 p-4 space-y-2">
              <button type="button" onClick={requestLocation} disabled={locationLoading} className="w-full bg-stone-800 p-2 text-sm flex items-center justify-center gap-2">
                {locationLoading ? <Loader2 size={16} className="animate-spin" /> : <><MapPin size={16} /> Verifica Posizione</>}
              </button>
              {distanceKm !== null && (
                <div className="text-center space-y-1">
                  <p className={`text-xs ${isDeliverable ? 'text-green-400' : 'text-red-400'}`}>
                    {isDeliverable ? `Distanza: ${distanceKm.toFixed(1)} km` : 'Fuori area di consegna'}
                  </p>
                  {!isDeliverable && (
                    <button onClick={setSimulatedLocation} className="text-[10px] underline text-stone-400">Simula (Test)</button>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setStep(2)} className="w-full bg-red-700 p-3" disabled={distanceKm !== null && !isDeliverable}>Continua</button>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-light">Pagamento</h2>
            <select className="w-full bg-stone-800 p-3" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="promptpay">PromptPay (QR)</option>
              <option value="cash">Pagamento alla consegna</option>
            </select>
            
            {paymentMethod === 'promptpay' && (
              <div className="space-y-3">
                <div className="bg-white p-4 flex flex-col items-center"><img src={QR_URL} alt="QR" className="w-48" /></div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                <button onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed p-3 text-xs flex items-center justify-center gap-2">
                  <Upload size={16} /> {receiptFile ? receiptFile.name : 'Carica ricevuta pagamento'}
                </button>
              </div>
            )}
            
            <button onClick={handleSubmit} className="w-full bg-green-700 p-3" disabled={loading}>
              {loading ? 'Attendere...' : 'Conferma Ordine'}
            </button>
          </div>
        )}
        
        {step === 3 && (
          <div className="text-center py-8 space-y-4">
            <h2 className="text-xl">Ordine Inviato!</h2>
            <button onClick={() => { clearCart(); onSuccess(); }} className="bg-stone-700 p-3 w-full">Torna al Menu</button>
          </div>
        )}
      </div>
    </div>
  );
}