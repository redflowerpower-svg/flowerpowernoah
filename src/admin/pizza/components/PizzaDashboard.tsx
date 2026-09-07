import { useEffect, useState, useRef } from 'react';
import { usePizzaAdminStore, sanitizePizzaOrder } from '../store/usePizzaAdminStore';
import { PizzaOrderHistoryModal } from './PizzaOrderHistoryModal';
import { PizzeriaSettingsSection } from './PizzeriaSettingsSection';
import { WineCardStudio } from './WineCardStudio';
import { RESTAURANT_LAT, RESTAURANT_LNG } from '../../../pizza/store/locationStore';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import type { PizzaOrder, CartItemSaved } from '../../../pizza/types';
import { 
  Clock, 
  Phone, 
  MapPin, 
  RefreshCw, 
  Loader2, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  Send,
  CheckCircle,
  Pizza,
  Users,
  X,
  Calendar,
  Search,
  Filter,
  DollarSign,
  UtensilsCrossed,
  ToggleLeft,
  ToggleRight,
  PackageCheck,
  AlertTriangle,
  Settings,
  Wine
} from 'lucide-react';

const parseAddressAndCoords = (addressStr: string) => {
  if (!addressStr || typeof addressStr !== 'string') {
    return { address: 'Nessun indirizzo', lat: RESTAURANT_LAT, lng: RESTAURANT_LNG, hasCoords: false };
  }
  
  try {
    const coordMatch = addressStr.match(/\[COORD:\s*([^,]+),\s*([^\]]+)\]/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      const cleanAddress = addressStr.replace(/\[COORD:\s*[^\]]+\]/, '').trim();
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        return { address: cleanAddress, lat, lng, hasCoords: true };
      }
    }
  } catch (e) {
    console.error('Error parsing coordinates from address:', e);
  }
  return { address: addressStr, lat: RESTAURANT_LAT, lng: RESTAURANT_LNG, hasCoords: false };
};

const formatProductName = (name: any) => {
  if (!name) return '';
  let str = '';
  if (typeof name === 'string') {
    str = name;
  } else if (typeof name === 'object') {
    str = name.name || name.nameIt || name.name_it || name.sku || 'Prodotto';
  } else {
    str = String(name);
  }

  const connectors = [' CON ', ' & ', ' WITH ', ' พร้อม'];
  for (const conn of connectors) {
    if (str.includes(conn)) {
      const parts = str.split(conn);
      return (
        <>
          {parts[0]}
          <br />
          <span className="text-stone-400 font-normal">{conn.trim()} {parts.slice(1).join(conn)}</span>
        </>
      );
    }
  }
  return str;
};

const getDriverMessageEncoded = (order: PizzaOrder, lat: number, lng: number) => {
  const items = (Array.isArray(order.items) ? order.items : []) as CartItemSaved[];
  const itemsText = items
    .map(item => {
      const nameStr = typeof item.name === 'string' ? item.name : ((item.name as any)?.name || (item.name as any)?.nameIt || 'Prodotto');
      const variantStr = typeof item.selectedVariant === 'string' ? item.selectedVariant : ((item.selectedVariant as any)?.name || '');
      return `• ${item.quantity}x ${nameStr}${variantStr ? ` (${variantStr})` : ''}`;
    })
    .join('\n');
  
  const { address } = parseAddressAndCoords(order.address);
  const timeStr = order.created_at ? new Date(order.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
  const orderId = order.id ? String(order.id).substring(0, 8).toUpperCase() : 'N/A';
  
  const text = `🛵 *CONSEGNA ORDINE FLOWER POWER*\n` +
               `-------------------------------\n` +
               `📌 *ID Ordine*: #${orderId}\n` +
               `🕒 *Orario*: ${timeStr}\n` +
               `👤 *Cliente*: ${order.customer_name}\n` +
               `📞 *Telefono*: ${order.phone}\n` +
               `🏠 *Indirizzo*: ${address}\n` +
               `-------------------------------\n` +
               `🍕 *Dettaglio Pizze*:\n${itemsText}\n` +
               `-------------------------------\n` +
               `🗺️ *Navigatore*: https://www.google.com/maps?q=${lat},${lng}`;
  
  return encodeURIComponent(text);
};

export function PizzaDashboard() {
  const { 
    orders, 
    loading, 
    error, 
    fetchOrders, 
    updateOrderStatus, 
    subscribeToRealtime, 
    soundEnabled, 
    toggleSound, 
    filterStatus, 
    setFilterStatus,
    menuItems,
    menuLoading,
    menuError,
    fetchMenuItems,
    toggleItemAvailability,
    updateItemPrice,
    filterMenuCategory,
    setFilterMenuCategory
  } = usePizzaAdminStore();

  const [activeMainTab, setActiveMainTab] = useState<'orders' | 'menu' | 'wine_studio' | 'settings'>('orders');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
    const unsubscribe = subscribeToRealtime();
    return () => unsubscribe();
  }, [fetchOrders, fetchMenuItems, subscribeToRealtime]);

  // Filter orders by status & search
  const filteredOrders = orders.filter(order => {
    const matchesFilter = filterStatus === 'all' ? true : order.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      order.customer_name.toLowerCase().includes(searchLower) ||
      order.phone.includes(searchLower) ||
      order.address.toLowerCase().includes(searchLower) ||
      String(order.id).toLowerCase().includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  // Filter menu items by category & search
  const filteredMenuItems = (menuItems || []).filter(item => {
    if (!item) return false;
    const matchesCategory = filterMenuCategory === 'All' ? true : item.category === filterMenuCategory;
    const searchLower = menuSearchQuery.toLowerCase();
    const matchesSearch = !menuSearchQuery ||
      (item.name && item.name.toLowerCase().includes(searchLower)) ||
      (item.nameTh && item.nameTh.toLowerCase().includes(searchLower)) ||
      (item.category && item.category.toLowerCase().includes(searchLower));

    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status: PizzaOrder['status']) => {
    switch (status) {
      case 'new':
        return <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">In Arrivo</span>;
      case 'preparing':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">In Preparazione</span>;
      case 'delivering':
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">In Consegna</span>;
      case 'completed':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Consegnato</span>;
      case 'cancelled':
        return <span className="bg-stone-800 text-stone-400 border border-stone-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Annullato</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-stone-100 w-full max-w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Banner Stats & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Pizza className="w-6 h-6 text-red-500" />
              Gestione Pizzeria & Delivery Food
            </h2>
          </div>
          <p className="text-stone-400 text-xs font-medium">
            Ranong Headquarters · Monitoraggio ordini, gestione menu e sold-out in tempo reale
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              fetchOrders();
              fetchMenuItems();
            }}
            disabled={loading || menuLoading}
            className="flex-1 md:flex-initial py-2.5 px-4 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || menuLoading) ? 'animate-spin text-amber-400' : ''}`} />
            <span>Aggiorna</span>
          </button>

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="py-2.5 px-4 bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/30 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Calendar className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Archivio Storico & CSV</span>
          </button>

          <button
            onClick={toggleSound}
            className={`py-2.5 px-4 border rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                : 'bg-stone-800 text-stone-400 border-stone-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio Attivo' : 'Muto'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 bg-stone-900 p-1.5 rounded-2xl border border-stone-800">
        <button
          onClick={() => setActiveMainTab('orders')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === 'orders'
              ? 'bg-red-700 text-white shadow-lg'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>📦 Ordini Live & Tracking ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('menu')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === 'menu'
              ? 'bg-red-700 text-white shadow-lg'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>📋 Gestione Menu & Prezzi ({menuItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('wine_studio')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === 'wine_studio'
              ? 'bg-amber-600 text-white shadow-lg'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'
          }`}
        >
          <Wine className="w-4 h-4" />
          <span>🍷 Wine Card Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('settings')}
          className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeMainTab === 'settings'
              ? 'bg-red-700 text-white shadow-lg'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>⚙️ Instradamento & Impostazioni</span>
        </button>
      </div>

      {/* TAB 1: ORDERS LIVE & TRACKING */}
      {activeMainTab === 'orders' && (
        <div className="space-y-6">
          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/60 p-2 rounded-2xl border border-stone-850">
            {/* Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {(['all', 'new', 'preparing', 'delivering', 'completed', 'cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    filterStatus === st
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  {st === 'all' && 'Tutti'}
                  {st === 'new' && 'Nuovi'}
                  {st === 'preparing' && 'In Preparazione'}
                  {st === 'delivering' && 'In Consegna'}
                  {st === 'completed' && 'Consegnati'}
                  {st === 'cancelled' && 'Annullati'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca cliente, indirizzo, ID..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 p-4 rounded-2xl text-red-400 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Orders Pipeline Grid */}
          {loading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">
                Caricamento ordini in corso...
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800 rounded-3xl p-12 text-center space-y-3">
              <Pizza className="w-12 h-12 text-stone-600 mx-auto" />
              <h3 className="text-stone-300 font-bold text-base">Nessun ordine trovato</h3>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">
                Non ci sono ordini corrispondenti ai filtri selezionati. I nuovi ordini appariranno qui automaticamente in tempo reale.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredOrders.map((order) => {
                const { address, lat, lng, hasCoords } = parseAddressAndCoords(order.address);
                const driverMsg = getDriverMessageEncoded(order, lat, lng);
                const formattedTotal = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(order.total);

                return (
                  <div
                    key={order.id}
                    className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-stone-700 transition-all space-y-4"
                  >
                    <div className="space-y-4">
                      {/* Top Bar Card */}
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            #{String(order.id).substring(0, 8).toUpperCase()}
                          </span>
                          <span className="text-stone-500 text-xs flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-stone-500" />
                            {new Date(order.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-1.5 text-xs">
                        <div className="font-black text-white text-sm">
                          {order.customer_name}
                        </div>
                        <div className="flex items-center gap-2 text-stone-300">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <a href={`tel:${order.phone}`} className="hover:text-amber-400 transition-colors font-mono">
                            {order.phone}
                          </a>
                        </div>
                        <div className="flex items-start gap-2 text-stone-400 pt-1">
                          <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="leading-snug">{address}</span>
                        </div>
                      </div>

                      {/* Order Items List */}
                      <div className="bg-stone-950/70 border border-stone-850 rounded-2xl p-3 space-y-2 text-xs">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block border-b border-stone-850 pb-1">
                          Pizze e Prodotti Ordinati:
                        </span>
                        <ul className="space-y-1.5">
                          {(Array.isArray(order.items) ? order.items : []).map((item, idx) => {
                            const nameStr = typeof item.name === 'string' ? item.name : ((item.name as any)?.name || (item.name as any)?.nameIt || 'Prodotto');
                            const variantStr = typeof item.selectedVariant === 'string' ? item.selectedVariant : ((item.selectedVariant as any)?.name || '');
                            return (
                              <li key={idx} className="flex justify-between items-start text-stone-200 font-medium">
                                <span>
                                  <strong className="text-amber-400 font-bold">{item.quantity}x</strong> {nameStr}
                                  {variantStr && <span className="text-stone-400 font-normal text-[11px]"> ({variantStr})</span>}
                                </span>
                                <span className="text-stone-400 font-mono text-[11px] ml-2">
                                  ฿{( (item?.price ?? 0) * (item?.quantity ?? 1) ).toLocaleString('it-IT')}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        {order.notes && (
                          <div className="mt-2 pt-1 border-t border-stone-850 text-[11px] text-amber-300 italic">
                            " {order.notes} "
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions & Status Controls */}
                    <div className="space-y-3 pt-3 border-t border-stone-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-400 font-medium">Totale Ordine:</span>
                        <span className="text-lg font-black text-amber-400 font-mono">{formattedTotal}</span>
                      </div>

                      {/* Status Toggle Buttons */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className={`py-1.5 text-[10px] font-bold uppercase rounded-xl border transition-all cursor-pointer ${
                            order.status === 'preparing' 
                              ? 'bg-amber-500 text-black border-amber-400 shadow' 
                              : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-amber-500/50'
                          }`}
                        >
                          Cucina
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, 'delivering')}
                          className={`py-1.5 text-[10px] font-bold uppercase rounded-xl border transition-all cursor-pointer ${
                            order.status === 'delivering' 
                              ? 'bg-blue-500 text-white border-blue-400 shadow' 
                              : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-blue-500/50'
                          }`}
                        >
                          In Consegna
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className={`py-1.5 text-[10px] font-bold uppercase rounded-xl border transition-all cursor-pointer ${
                            order.status === 'completed' 
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow' 
                              : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-emerald-500/50'
                          }`}
                        >
                          Consegnato
                        </button>
                      </div>

                      {/* WhatsApp Driver Share Link */}
                      <a
                        href={`https://api.whatsapp.com/send?text=${driverMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 hover:border-emerald-700 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Invia Dettagli al Rider (WhatsApp)</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MENU CATALOG & PRICE MANAGEMENT */}
      {activeMainTab === 'menu' && (
        <div className="space-y-6">
          {/* Category Filter & Search Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/60 p-2 rounded-2xl border border-stone-850">
            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'All', label: 'Tutti i Piatti' },
                { id: 'traditional-italian-pizza', label: '🍕 Pizze' },
                { id: 'pasta', label: '🍝 Pasta' },
                { id: 'italian-salads', label: '🥗 Insalate' },
                { id: 'pizza-sandwich', label: '🥪 Sandwich' },
                { id: 'french-fries', label: '🍟 Patatine' },
                { id: 'desserts', label: '🍰 Dolci' },
                { id: 'soft-drinks', label: '🍺 Birre & Bibite' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterMenuCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    filterMenuCategory === cat.id
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Menu Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
                placeholder="Cerca per nome piatto..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-red-500/50"
              />
            </div>
          </div>

          {/* Menu Loading & Error States */}
          {menuLoading && menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-stone-400 text-xs font-medium uppercase tracking-wider">
                Caricamento catalogo menu in corso...
              </p>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800 rounded-3xl p-12 text-center space-y-3">
              <UtensilsCrossed className="w-12 h-12 text-stone-600 mx-auto" />
              <h3 className="text-stone-300 font-bold text-base">Nessun piatto trovato</h3>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">
                Nessun piatto corrisponde ai criteri di ricerca o alla categoria selezionata.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredMenuItems.map((item) => {
                const isAvailable = item.is_available !== false;
                const safePrice = item.price ?? 0;

                return (
                  <div
                    key={item.id}
                    className={`bg-stone-900 border rounded-3xl p-5 shadow-xl flex flex-col justify-between transition-all space-y-4 ${
                      isAvailable ? 'border-stone-800 hover:border-stone-700' : 'border-red-900/60 bg-stone-950/90'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Category Badge & Availability Status */}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-stone-950 text-stone-400 px-2.5 py-1 rounded-full border border-stone-800">
                          {item.category}
                        </span>
                        
                        {/* Sold Out / Available Indicator */}
                        <button
                          type="button"
                          onClick={() => toggleItemAvailability(item.id, isAvailable)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            isAvailable
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 animate-pulse'
                          }`}
                        >
                          {isAvailable ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Disponibile</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>Sold Out</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Product Image & Name */}
                      <div className="flex items-start gap-3 pt-1">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className={`w-14 h-14 rounded-2xl object-cover border border-stone-800 flex-shrink-0 ${!isAvailable ? 'grayscale opacity-60' : ''}`}
                          />
                        )}
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-white text-sm leading-tight">
                            {formatProductName(item.name)}
                          </h3>
                          {item.nameTh && (
                            <p className="text-[11px] text-stone-500 font-medium">
                              {item.nameTh}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price Editor & Toggle Switch Footer */}
                    <div className="pt-4 border-t border-stone-850 space-y-3">
                      {/* Live Price Input */}
                      <div className="flex items-center justify-between bg-stone-950 px-3 py-2 rounded-2xl border border-stone-800">
                        <span className="text-xs font-bold text-stone-400">Prezzo (THB):</span>
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 font-bold text-sm">฿</span>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={safePrice}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value))}
                            className="w-20 bg-stone-900 border border-stone-700 rounded-xl px-2 py-1 font-mono text-sm text-white text-right font-black focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => toggleItemAvailability(item.id, isAvailable)}
                        className={`w-full py-2.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                          isAvailable
                            ? 'bg-stone-800 hover:bg-stone-750 text-emerald-400 border border-stone-700'
                            : 'bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80'
                        }`}
                      >
                        <span>{isAvailable ? 'Imposta come Sold Out' : 'Riattiva Prodotto'}</span>
                        {isAvailable ? (
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-red-400" />
                        )}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WINE CARD STUDIO */}
      {activeMainTab === 'wine_studio' && (
        <WineCardStudio />
      )}

      {/* TAB 4: SETTINGS & ROUTING */}
      {activeMainTab === 'settings' && (
        <PizzeriaSettingsSection />
      )}

      {/* Historical Orders Modal */}
      <PizzaOrderHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />
    </div>
  );
}

