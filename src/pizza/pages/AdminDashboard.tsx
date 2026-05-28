import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Phone, MapPin, ChevronRight, RefreshCw, LogOut, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PizzaOrder, CartItemSaved } from '../lib/supabase';

const ADMIN_PIN = '1234';
const POLL_INTERVAL = 10000;

function usePing() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  return useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      const playTone = (freq: number, startTime: number, endFreq: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration * 0.8);
        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(880, now, 440, 0.6, 0.8);
      playTone(1320, now + 0.2, 660, 0.4, 0.6);
    } catch {
      // AudioContext not supported
    }
  }, []);
}

function PinScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        onUnlock();
      } else {
        setTimeout(() => { setPin(''); setError(true); }, 400);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0c0a09' }}>
      <div className="text-center mb-10">
        <p className="text-white font-light mb-1" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2rem' }}>
          Staff Dashboard
        </p>
        <p className="text-stone-500 text-xs tracking-widest uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
          Flower Power Pizza · Ranong
        </p>
      </div>

      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-all duration-200"
            style={{
              background: pin.length > i ? (error ? '#ef4444' : '#b91c1c') : 'rgba(255,255,255,0.15)',
              transform: pin.length > i ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-xs mb-4 tracking-widest" style={{ fontFamily: 'Inter, sans-serif' }}>
          Incorrect PIN
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 w-64">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          <button
            key={i}
            onClick={() => d === '⌫' ? setPin((p) => p.slice(0, -1)) : d ? handleDigit(d) : undefined}
            className="h-16 flex items-center justify-center text-xl text-white transition-all duration-150 hover:bg-stone-800 active:scale-95"
            style={{
              fontFamily: d === '⌫' ? 'Inter, sans-serif' : 'Cormorant Garamond, Georgia, serif',
              background: d ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: d ? '1px solid rgba(255,255,255,0.08)' : 'none',
              visibility: d === '' ? 'hidden' : 'visible',
            }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onAdvance }: { order: PizzaOrder; onAdvance: (id: string, status: PizzaOrder['status']) => void }) {
  const items = order.items as CartItemSaved[];
  const createdAt = order.created_at ? new Date(order.created_at) : null;
  const timeStr = createdAt ? createdAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';

  const nextStatus: Record<string, PizzaOrder['status']> = { new: 'preparing', preparing: 'ready' };
  const nextLabel: Record<string, string> = { new: 'Start Preparing', preparing: 'Mark Ready' };

  return (
    <div
      className="border p-4 space-y-3 transition-all duration-300"
      style={{
        borderColor: order.status === 'new' ? '#b91c1c' : order.status === 'preparing' ? '#d97706' : '#16a34a',
        background: order.status === 'new' ? 'rgba(185,28,28,0.05)' : 'rgba(255,255,255,0.02)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white font-medium text-sm">{order.customer_name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-stone-500 text-xs"><Clock size={11} /> {timeStr}</span>
            <span className="flex items-center gap-1 text-stone-500 text-xs"><Phone size={11} /> {order.phone}</span>
          </div>
        </div>
        <span className="text-red-400 text-sm font-light flex-shrink-0">{order.total} ฿</span>
      </div>

      {order.address && order.address !== 'Pickup at restaurant' && (
        <div className="flex items-start gap-1.5 text-xs text-stone-400">
          <MapPin size={11} className="mt-0.5 flex-shrink-0" />
          {order.address}
        </div>
      )}
      {order.address === 'Pickup at restaurant' && <p className="text-xs text-amber-500">🏠 Pickup</p>}

      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="text-xs">
            <span className="text-white">
              {item.quantity}x {item.name}{item.selectedVariant ? ` (${item.selectedVariant})` : ''}
            </span>
            {item.selectedExtras.length > 0 && (
              <div className="pl-3 text-stone-500 space-y-0.5 mt-0.5">
                {item.selectedExtras.map((e, j) => (
                  <p key={j}>+ {e.name} {e.price > 0 ? `+${e.price}฿` : ''}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {order.receipt_url && (
        <a href={order.receipt_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors">
          <ExternalLink size={10} /> View Receipt
        </a>
      )}

      {order.status !== 'ready' && (
        <button
          onClick={() => onAdvance(order.id!, nextStatus[order.status])}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs uppercase tracking-widest transition-all"
          style={{
            fontFamily: 'Inter, sans-serif',
            background: order.status === 'new' ? 'rgba(217,119,6,0.15)' : 'rgba(22,163,74,0.15)',
            border: order.status === 'new' ? '1px solid #d97706' : '1px solid #16a34a',
            color: order.status === 'new' ? '#fbbf24' : '#4ade80',
          }}>
          {nextLabel[order.status]} <ChevronRight size={14} />
        </button>
      )}

      {order.status === 'ready' && (
        <p className="text-center text-green-500 text-xs tracking-widest uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
          ✓ Ready
        </p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [unlocked, setUnlocked] = useState(false);
  const [orders, setOrders] = useState<PizzaOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const ping = usePing();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pizza_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      const incoming = data as PizzaOrder[];
      const hasNew = incoming.some((o) => o.status === 'new' && o.id && !knownIdsRef.current.has(o.id));
      if (hasNew && knownIdsRef.current.size > 0) ping();
      incoming.forEach((o) => { if (o.id) knownIdsRef.current.add(o.id); });
      setOrders(incoming);
      setLastFetch(new Date());
    }
    setLoading(false);
  }, [ping]);

  useEffect(() => {
    if (!unlocked) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [unlocked, fetchOrders]);

  const handleAdvance = async (id: string, status: PizzaOrder['status']) => {
    await supabase.from('pizza_orders').update({ status }).eq('id', id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />;

  const newOrders = orders.filter((o) => o.status === 'new');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  const columns = [
    { label: 'New', color: '#ef4444', pulse: true, count: newOrders.length, items: newOrders },
    { label: 'In Preparation', color: '#f59e0b', pulse: false, count: preparingOrders.length, items: preparingOrders },
    { label: 'Ready', color: '#22c55e', pulse: false, count: readyOrders.length, items: readyOrders },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0c0a09' }}>
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-stone-800 flex items-center justify-between" style={{ background: '#0c0a09' }}>
        <div>
          <p className="text-white font-light" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.3rem' }}>
            Kitchen Dashboard
          </p>
          <p className="text-stone-600 text-xs">
            {lastFetch ? `Updated ${lastFetch.toLocaleTimeString('th-TH')}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchOrders} disabled={loading} className="text-stone-500 hover:text-white transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setUnlocked(false)} className="text-stone-500 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.label}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${col.pulse ? 'animate-pulse' : ''}`} style={{ background: col.color }} />
              <p className="text-white text-xs uppercase tracking-widest" style={{ fontFamily: 'Inter, sans-serif' }}>
                {col.label}
              </p>
              <span className="ml-auto text-xs" style={{ color: col.color }}>{col.count}</span>
            </div>
            <div className="space-y-3">
              {col.items.length === 0 ? (
                <p className="text-stone-700 text-xs text-center py-8">No orders</p>
              ) : (
                col.items.map((o) => <OrderCard key={o.id} order={o} onAdvance={handleAdvance} />)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
