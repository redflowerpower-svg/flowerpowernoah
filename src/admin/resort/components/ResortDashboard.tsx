import { useEffect, useState } from 'react';
import { useResortAdminStore } from '../store/useResortAdminStore';
import { getAuthorizationUrl, getStoredTokens, clearTokens, exchangeToken } from '../../../booking/lib/octorate';
import { ResortVisualCalendar } from './ResortVisualCalendar';
import { DerivedRatesTreeSection } from './DerivedRatesTreeSection';
import { NewsletterCampaignSection } from './NewsletterCampaignSection';
import { StandardRatesProtectionSection } from './StandardRatesProtectionSection';
import { PromoCodesSection } from './PromoCodesSection';
import { GestioneStagionaleTariffe } from './GestioneStagionaleTariffe';
import { GestioneRestrizioniCanali } from './GestioneRestrizioniCanali';
import { AccommodationFeaturesEditor } from './AccommodationFeaturesEditor';
import { supabase } from '../../../lib/supabase';
import { toThailandDateStr } from '../lib/octorateAdmin';
import { 
  Hotel, 
  Calendar, 
  Users, 
  DollarSign, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Coffee, 
  Wind, 
  Search, 
  SlidersHorizontal,
  Plus,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Terminal,
  Key,
  Link,
  Zap,
  Loader2,
  XCircle,
  GitFork,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  BarChart3,
  Coins,
  Bed,
  Ticket
} from 'lucide-react';
import { 
  isValidActiveBooking, 
  addBookingToBlacklist, 
  getBlacklistedBookingIds, 
  clearBlacklistedBookings 
} from '../lib/bookingFilters';

const formatLastUpdateStr = (dateVal?: string | number | Date | null): string => {
  if (!dateVal) return 'Nessuna operazione eseguita';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'Nessuna operazione eseguita';
  return d.toLocaleString('it-IT');
};

type OptimizationTab = 'cascade' | 'min_stay' | 'standard_rates' | 'promo_codes';

export function ResortDashboard() {
  const { 
    bookings, 
    accommodations, 
    loading, 
    error, 
    octorateStatus, 
    octorateDetails, 
    fetchBookings, 
    toggleRoomAvailability,
    updateAccommodationFeatures, 
    checkOctorateConnection,
    filterCategory,
    executeLastMinuteStrategy,
    resetLastMinuteStrategy,
    lastMinuteStage1Days,
    lastMinuteDiscountStage1,
    lastMinuteStage2Days,
    lastMinuteDiscountStage2,
    lastMinuteStage3Days,
    lastMinuteDiscountStage3,
    executionMode,
    isTestEnvironment,
    isSimulationActive,
    simulatedOctorateGridItems,
    lastMinuteRunning,
    lastMinuteExecuting,
    lastMinuteResetting,
    lastMinuteResult,
    setLastMinuteStage1Days,
    setLastMinuteDiscountStage1,
    setLastMinuteStage2Days,
    setLastMinuteDiscountStage2,
    setLastMinuteStage3Days,
    setLastMinuteDiscountStage3,
    setExecutionMode,
    setIsTestEnvironment,
    disableLastMinuteStrategy,
    isLastMinuteActive,
    setIsLastMinuteActive,
    dynamicMinStayGapFill,
    dynamicMinStayRunning,
    dynamicMinStayResetRunning,
    dynamicMinStayResult,
    dynamicMinStayExecutionMode,
    setDynamicMinStayGapFill,
    setDynamicMinStayExecutionMode,
    executeDynamicMinStayStrategy,
    downloadSeasonSequential,
    seasonDownloadStatus,
    seasonDownloadProgress,
    seasonDownloadMessage,
    isDynamicCalculationEnabled,
    setIsDynamicCalculationEnabled,
    standardProtectionActive,
    cachedImportTime,
    loadFromCache,
    saveToCache
  } = useResortAdminStore();

  const [activeOptimizationTab, setActiveOptimizationTab] = useState<OptimizationTab>('cascade');
  const [activeTab, setActiveTab] = useState<'bookings' | 'calendar_30_days' | 'calendar' | 'rooms' | 'derived_rates' | 'seasonal_rates' | 'messages' | 'octorate'>('bookings');
  const [searchQuery, setSearchQuery] = useState('');
  // Doppio click per Calendario Annuale (componente pesante ~9000 celle)
  const [calendarConfirm, setCalendarConfirm] = useState(false);
  // Production confirmation modals
  const [showCascadeProdModal, setShowCascadeProdModal] = useState(false);
  const [showMinStayProdModal, setShowMinStayProdModal] = useState(false);
  const [expandedFeaturesRoomId, setExpandedFeaturesRoomId] = useState<string | null>(null);

  // Cache choice modal state on initial mount
  const [showCacheChoiceModal, setShowCacheChoiceModal] = useState(false);

  // Arming state & auto-disarm timer for double-click room deactivation safety
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);
  const [minStayDeactivateArmed, setMinStayDeactivateArmed] = useState(false);
  const [lastMinuteDeactivateArmed, setLastMinuteDeactivateArmed] = useState(false);
  const [lastMinuteArmed, setLastMinuteArmed] = useState(false);

  useEffect(() => {
    if (!pendingDeactivateId) return;
    const timer = setTimeout(() => {
      setPendingDeactivateId(null);
    }, 4000); // 4 seconds auto-disarm
    return () => clearTimeout(timer);
  }, [pendingDeactivateId]);

  useEffect(() => {
    if (!minStayDeactivateArmed) return;
    const timer = setTimeout(() => setMinStayDeactivateArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [minStayDeactivateArmed]);

  useEffect(() => {
    if (!lastMinuteDeactivateArmed) return;
    const timer = setTimeout(() => setLastMinuteDeactivateArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [lastMinuteDeactivateArmed]);

  useEffect(() => {
    if (!lastMinuteArmed) return;
    const timer = setTimeout(() => setLastMinuteArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [lastMinuteArmed]);

  // Auto-Hydrate and Advance Last-Minute & Standard OTA Rates on Dashboard Mount, Focus & Periodic Check
  useEffect(() => {
    // Esecuzione immediata al caricamento
    useResortAdminStore.getState().autoAdvanceDailyLastMinute();
    useResortAdminStore.getState().autoAdvanceDailyStandardProtection();

    // Listener per quando la scheda torna visibile / in primo piano
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        useResortAdminStore.getState().autoAdvanceDailyLastMinute();
        useResortAdminStore.getState().autoAdvanceDailyStandardProtection();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Controllo periodico ogni 5 minuti per rilevare subito il cambio data / mezzanotte
    const interval = setInterval(() => {
      useResortAdminStore.getState().autoAdvanceDailyLastMinute();
      useResortAdminStore.getState().autoAdvanceDailyStandardProtection();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, []);

  const handleToggleAvailability = async (room: any) => {
    const isCurrentAvailable = Boolean(room.isAvailable ?? room.is_available);
    if (isCurrentAvailable) {
      if (pendingDeactivateId !== room.id) {
        // First click: arm the deactivation button
        setPendingDeactivateId(room.id);
        return;
      }
      // Second click within 4 seconds: disarm and execute
      setPendingDeactivateId(null);
    } else {
      setPendingDeactivateId(null);
    }

    const targetState = !isCurrentAvailable;
    toggleRoomAvailability(room.octorateId || room.id, targetState);

    try {
      const { error } = await supabase
        .from('accommodations')
        .update({ is_available: targetState })
        .eq('id', room.id);
      if (error) {
        console.error('[ResortDashboard] Error updating availability on Supabase:', error);
      }
    } catch (err) {
      console.error('[ResortDashboard] Exception updating availability on Supabase:', err);
    }
  };

  // Accordion state per i 6 Canali OTA (V16/V17: Default completamente chiuso)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    'booking.com': false,
    'airbnb': false,
    'agoda': false,
    'expedia': false,
    'website': false,
    'private': false,
  });

  const handleExpandAllAccordions = () => {
    setOpenAccordions({
      'booking.com': true,
      'airbnb': true,
      'agoda': true,
      'expedia': true,
      'website': true,
      'private': true,
    });
  };

  const handleCollapseAllAccordions = () => {
    setOpenAccordions({
      'booking.com': false,
      'airbnb': false,
      'agoda': false,
      'expedia': false,
      'website': false,
      'private': false,
    });
  };

  const toggleAccordionKey = (key: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const [openOptimizationAccordions, setOpenOptimizationAccordions] = useState<Record<string, boolean>>({
    cascade: false,
    minStay: false,
    standardRates: false,
    promoCodes: false,
  });

  const [minStayArmed, setMinStayArmed] = useState<boolean>(false);

  useEffect(() => {
    if (minStayArmed) {
      const t = setTimeout(() => setMinStayArmed(false), 4000);
      return () => clearTimeout(t);
    }
  }, [minStayArmed]);

  useEffect(() => {
    setOpenOptimizationAccordions({
      cascade: false,
      minStay: false,
      standardRates: false,
      promoCodes: false,
    });
  }, [activeTab]);

  const toggleOptimizationAccordion = (key: string) => {
    setOpenOptimizationAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Octorate Dev Diagnostics State
  const [showDevDiagnostics, setShowDevDiagnostics] = useState(false);
  const [octorateRooms, setOctorateRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [oauthConnected, setOauthConnected] = useState(false);
  const [oauthUrl, setOauthUrl] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
    checkOctorateConnection();
    getStoredTokens().then((tokens) => {
      setOauthConnected(tokens !== null);
    });

    const existingCacheTime = useResortAdminStore.getState().cachedImportTime;
    if (existingCacheTime) {
      setShowCacheChoiceModal(true);
    } else {
      downloadSeasonSequential();
    }
  }, [fetchBookings, checkOctorateConnection, downloadSeasonSequential]);

  const handleFetchDevRooms = async () => {
    setLoadingRooms(true);
    try {
      const tokens = await getStoredTokens();
      const structureId = octorateDetails?.structureId || '366879';
      if (!tokens || !tokens.access_token || tokens.access_token === 'PROTECTED_SERVER_SIDE') {
        setOctorateRooms([]);
        setLoadingRooms(false);
        return;
      }
      const res = await fetch(`/api-octorate/connect/rest/v1/roomrates/${structureId}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${tokens.access_token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setOctorateRooms(data);
        }
      }
    } catch (e) {
      console.error('[ResortDashboard] Dev rates fetch error:', e);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleToggleDiagnostics = () => {
    const nextState = !showDevDiagnostics;
    setShowDevDiagnostics(nextState);
    if (nextState && octorateRooms.length === 0) {
      handleFetchDevRooms();
    }
  };

  const handleSaveToken = async () => {
    if (!oauthUrl) return;
    setOauthLoading(true);
    try {
      const urlObj = new URL(oauthUrl);
      const code = urlObj.searchParams.get("code");
      if (!code) {
        alert("Nessun parametro 'code' trovato nell'URL.");
        setOauthLoading(false);
        return;
      }
      await exchangeToken(code);
      setOauthConnected(true);
      setOauthUrl("");
      alert("Token scambiato e salvato con successo!");
      handleFetchDevRooms();
    } catch (err: any) {
      alert("Errore nello scambio del token: " + err.message);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleClearTokens = async () => {
    const confirmReset = window.confirm(
      "Sei sicuro di voler disconnettere le API Octorate e resettare i token OAuth?\n\nQuesta azione disattiverà la sincronizzazione in tempo reale finché non verrà effettuata una nuova riconnessione."
    );
    if (!confirmReset) return;

    await clearTokens();
    setOauthConnected(false);
    setOctorateRooms([]);
  };

  // Blacklist manual state trigger for instant UI refresh
  const [blacklistedVersion, setBlacklistedVersion] = useState(0);

  // V14 Financial Date Range Filter State (Default: Today -> Oct 31 next year)
  const todayStr = toThailandDateStr(new Date());
  const defaultToDate = `${new Date().getFullYear() + 1}-10-31`;
  const [finDateFrom, setFinDateFrom] = useState<string>(todayStr);
  const [finDateTo, setFinDateTo] = useState<string>(defaultToDate);

  const handleHideBooking = (bookingId: string) => {
    if (!bookingId) return;
    addBookingToBlacklist(bookingId);
    setBlacklistedVersion(v => v + 1);
  };

  const handleResetBlacklist = () => {
    clearBlacklistedBookings();
    setBlacklistedVersion(v => v + 1);
  };

  const blacklistedCount = getBlacklistedBookingIds().length;

  // ─── computeFinancials: Algoritmo KPI Unificato con Commissioni OTA & Notti v15 ──────
  const getChannelKey = (channelName?: string): 'booking.com' | 'airbnb' | 'agoda' | 'expedia' | 'website' | 'private' => {
    if (!channelName) return 'private';
    const c = channelName.toLowerCase().trim();
    if (c.includes('booking')) return 'booking.com';
    if (c.includes('airbnb')) return 'airbnb';
    if (c.includes('agoda')) return 'agoda';
    if (c.includes('expedia')) return 'expedia';
    if (c.includes('website') || c.includes('site') || c.includes('sito') || c.includes('engine') || c.includes('stripe')) return 'website';
    return 'private';
  };

  const isBookingInDateRange = (b: any, dateFrom: string, dateTo: string) => {
    if (!b) return false;
    const checkIn = b.check_in || b.checkIn || b.checkin;
    const checkOut = b.check_out || b.checkOut || b.checkout;
    if (!checkIn) return true;

    const bIn = String(checkIn).substring(0, 10);
    const bOut = checkOut ? String(checkOut).substring(0, 10) : bIn;

    if (dateFrom && bOut < dateFrom) return false;
    if (dateTo && bIn > dateTo) return false;
    return true;
  };

  const calculateBookingNights = (checkIn?: string, checkOut?: string): number => {
    if (!checkIn || !checkOut) return 1;
    const cIn = new Date(String(checkIn).substring(0, 10));
    const cOut = new Date(String(checkOut).substring(0, 10));
    const diffMs = cOut.getTime() - cIn.getTime();
    if (diffMs > 0) {
      return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }
    return 1;
  };

  const computeFinancials = () => {
    const validBookings = (bookings || []).filter(isValidActiveBooking);
    const bList = validBookings.filter(b => isBookingInDateRange(b, finDateFrom, finDateTo));

    let grossRevenue = 0;
    let totalCommissions = 0;
    let totalGuests = 0;
    let totalNights = 0;

    const otaStats: Record<string, { label: string; rate: number; count: number; gross: number; commission: number; nights: number }> = {
      'booking.com': { label: 'Booking.com', rate: 0.172, count: 0, gross: 0, commission: 0, nights: 0 },
      'airbnb': { label: 'Airbnb', rate: 0.15, count: 0, gross: 0, commission: 0, nights: 0 },
      'agoda': { label: 'Agoda', rate: 0.18, count: 0, gross: 0, commission: 0, nights: 0 },
      'expedia': { label: 'Expedia', rate: 0.15, count: 0, gross: 0, commission: 0, nights: 0 },
      'website': { label: 'Website (Sito)', rate: 0.035, count: 0, gross: 0, commission: 0, nights: 0 },
      'private': { label: 'Private (Diretto)', rate: 0.0, count: 0, gross: 0, commission: 0, nights: 0 },
    };

    for (const b of bList) {
      if (!b) continue;
      const price = Number(b.total_price) || 0;
      const key = getChannelKey(b.source_channel);
      const rate = otaStats[key]?.rate || 0;
      const commission = price * rate;
      const nights = calculateBookingNights(
        b.check_in || (b as any).checkIn || (b as any).checkin,
        b.check_out || (b as any).checkOut || (b as any).checkout
      );

      grossRevenue += price;
      totalCommissions += commission;
      totalGuests += Number(b.guests) || 1;
      totalNights += nights;

      if (otaStats[key]) {
        otaStats[key].count += 1;
        otaStats[key].gross += price;
        otaStats[key].commission += commission;
        otaStats[key].nights += nights;
      }
    }

    return {
      grossRevenue,
      totalCommissions,
      netRevenue: grossRevenue - totalCommissions,
      totalGuests,
      totalBookings: bList.length,
      totalNights,
      otaStats,
    };
  };

  const fin = computeFinancials();
  const totalBookingsCount = fin.totalBookings;
  const totalRevenue = fin.grossRevenue;
  const totalGuests = fin.totalGuests;
  const availableRoomsCount = (accommodations || []).filter(r => r?.isAvailable).length;


  // Filter bookings (Excludes cancelled, test, and manually blacklisted bookings)
  const filteredBookings = (bookings || []).filter(b => {
    if (!isValidActiveBooking(b)) return false;
    const searchLower = searchQuery.toLowerCase();
    return !searchQuery || 
      (b.guest_name && b.guest_name.toLowerCase().includes(searchLower)) ||
      (b.guest_email && b.guest_email.toLowerCase().includes(searchLower)) ||
      (b.accommodation_name && b.accommodation_name.toLowerCase().includes(searchLower)) ||
      (b.id && String(b.id).toLowerCase().includes(searchLower));
  });

  // Filter rooms
  const filteredRooms = (accommodations || []).filter(r => {
    if (!r) return false;
    if (filterCategory === 'All') return true;
    return r.category && r.category.toLowerCase() === filterCategory.toLowerCase();
  });

  return (
    <div className="space-y-6 text-stone-100 w-full max-w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* V17: Blocking Season Download Modal Overlay */}
      {seasonDownloadStatus !== 'completed' && (
        <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/50 border-double flex items-center justify-center text-emerald-300 mx-auto shadow-lg">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                SINCRONIZZAZIONE STAGIONALE OCTORATE
              </h3>
              <p className="text-xs text-stone-400 font-medium leading-relaxed">
                {seasonDownloadMessage || 'Download sequenziale delle prenotazioni in corso...'}
              </p>
            </div>

            {/* Progress Bar & Percentage */}
            <div className="space-y-2">
              <div className="w-full bg-stone-950 rounded-full h-3.5 border border-stone-800 overflow-hidden p-0.5 shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 shadow"
                  style={{ width: `${Math.min(100, Math.max(5, seasonDownloadProgress))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-stone-400 px-1">
                <span>Progresso</span>
                <span className="text-emerald-400 font-black">{seasonDownloadProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ELEGANTE SCELTA CACHE / SYNC LIVE ALL'AVVIO */}
      {showCacheChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
              <RefreshCw className="w-7 h-7 animate-spin-slow" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                Rilevato salvataggio locale Octorate
              </h3>
              <p className="text-xs sm:text-sm text-emerald-400 font-bold bg-emerald-950/80 py-2 px-4 rounded-xl border border-emerald-800/60 inline-block">
                Rilevato salvataggio locale del: {formatLastUpdateStr(cachedImportTime)}
              </p>
              <p className="text-xs text-stone-400 leading-relaxed font-medium pt-1">
                Scegli se caricare istantaneamente i dati delle prenotazioni salvati in locale o se avviare una nuova sincronizzazione live con i server Octorate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  loadFromCache();
                  setShowCacheChoiceModal(false);
                }}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Carica salvataggio (Istantaneo)
                </span>
                <span className="text-[10px] font-normal text-emerald-200">
                  Caricamento offline zero attese
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  downloadSeasonSequential();
                  setShowCacheChoiceModal(false);
                }}
                className="w-full py-3.5 px-4 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95"
              >
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  Nuova sincronizzazione live
                </span>
                <span className="text-[10px] font-normal text-stone-400">
                  Download completo da Octorate API
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Confirmation Modal — LAST MINUTE (Root Level Full-Screen Center) */}
      {showCascadeProdModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-red-600/80 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] space-y-5">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm sm:text-base uppercase tracking-wider">
                  CONFERMA MODALITÀ PRODUZIONE
                </h3>
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Sconti a Cascata Last Minute</span>
              </div>
            </div>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              ⚠️ <strong>ATTENZIONE:</strong> Stai per attivare la modalità <strong>PRODUZIONE REAL TIME</strong> per gli Sconti a Cascata Last Minute.
              <br /><br />
              I prezzi scontati (-{lastMinuteDiscountStage1}% / -{lastMinuteDiscountStage2}% / -{lastMinuteDiscountStage3}%) verranno inviati <strong>realmente a tutte le Tariffe Madri del resort su Octorate PMS</strong>.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowCascadeProdModal(false)}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => { setExecutionMode('production'); setShowCascadeProdModal(false); }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-950/50 cursor-pointer transition-all active:scale-95"
              >
                Sì, Attiva Produzione Reale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Confirmation Modal — SOGGIORNO MINIMO DINAMICO (Root Level Full-Screen Center) */}
      {showMinStayProdModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-red-600/80 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] space-y-5">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400 animate-bounce" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm sm:text-base uppercase tracking-wider">
                  CONFERMA MODALITÀ PRODUZIONE
                </h3>
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Soggiorno Minimo Dinamico</span>
              </div>
            </div>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              ⚠️ <strong>ATTENZIONE:</strong> Stai per attivare la modalità <strong>PRODUZIONE REAL TIME</strong> per il Soggiorno Minimo Dinamico.
              <br /><br />
              I valori di <strong>min_stay</strong> verranno modificati <strong>realmente su tutte le Tariffe Madri del resort su Octorate PMS</strong>.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowMinStayProdModal(false)}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => { setDynamicMinStayExecutionMode('production'); setShowMinStayProdModal(false); }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-950/50 cursor-pointer transition-all active:scale-95"
              >
                Sì, Attiva Produzione Reale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integrated Header Container: Gestione Resort Title + Octorate Status + Navigation Menu (Static Top) */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5">
        {/* Top Banner Title & Octorate Status Indicator */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <Hotel className="w-6 h-6 text-emerald-400" />
                Gestione Resort & Booking Engine
              </h2>
            </div>
            <p className="text-stone-400 text-xs font-medium">
              Koh Phayam Resort · Modulo prenotazioni, alloggi e sincronizzazione Octorate
            </p>
          </div>

          {/* Octorate Status Chip & Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {oauthConnected ? (
              <div className="flex items-center gap-2 bg-stone-900/90 border border-emerald-800/60 px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-extrabold text-xs">API Octorate Connesse</span>
                <button
                  type="button"
                  onClick={handleClearTokens}
                  className="px-2.5 py-1 text-[10px] bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700/60 rounded-xl transition-all cursor-pointer font-black uppercase tracking-wider ml-1 shadow"
                  title="Disconnetti le API Octorate e cancella i token"
                >
                  Disconnetti / Reset
                </button>
              </div>
            ) : (
              <a
                href={getAuthorizationUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-800/60 hover:bg-amber-900 px-3.5 py-2 rounded-2xl text-xs font-extrabold text-amber-400 transition-colors shadow"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Connetti API Octorate</span>
              </a>
            )}

            <div className="flex items-center gap-2 bg-stone-900/90 border border-stone-800 px-3 py-2 rounded-2xl text-xs font-bold">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-stone-400 text-[11px] font-mono">
                ID {octorateDetails?.structureId ?? '366879'}
              </span>
            </div>

            <button
              onClick={() => fetchBookings()}
              disabled={loading}
              className="py-2 px-3.5 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Sincronizza</span>
            </button>

            {/* Search Input for Bookings & Reset Blacklist Control (Moved after Sincronizza) */}
            <div className="flex items-center gap-2">
              {blacklistedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetBlacklist}
                  className="px-2.5 py-1.5 bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900 text-amber-300 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow whitespace-nowrap"
                  title="Ripristina tutte le prenotazioni nascoste manualmente"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Nascosti: {blacklistedCount} (Reset)</span>
                </button>
              )}
              <div className="relative w-44 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca ospite, email, camera..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-7 py-1.5 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-emerald-500/50 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Integrated Navigation Bar (Single line, maximized readable typography, no wrap) */}
        <div className="pt-2.5 border-t border-stone-800/80">
          <div className="flex items-center justify-between gap-[2px] sm:gap-1 xl:gap-1.5 w-full flex-nowrap overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'bookings'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              PRENOTAZIONI
            </button>

            <button
              onClick={() => setActiveTab('calendar_30_days')}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'calendar_30_days'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              CALENDARIO 30
            </button>

            <button
              onClick={() => {
                if (calendarConfirm) {
                  setActiveTab('calendar');
                  setCalendarConfirm(false);
                } else {
                  setCalendarConfirm(true);
                  setTimeout(() => setCalendarConfirm(false), 4000);
                }
              }}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'calendar'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                  : calendarConfirm
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-950/40 animate-pulse'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
              title="Componente pesante: clicca 2 volte per caricare il calendario stagionale completo"
            >
              {calendarConfirm && activeTab !== 'calendar'
                ? 'CLICCA ANCORA PER CARICARE'
                : 'CALENDARIO 365'}
            </button>

            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'rooms'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              CARATTERISTICHE ALLOGGI
            </button>

            <button
              onClick={() => setActiveTab('seasonal_rates')}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'seasonal_rates'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-950/40 ring-1 ring-amber-300/40'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              PREZZI ALLOGGI
            </button>

            <button
              onClick={() => setActiveTab('derived_rates')}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'derived_rates'
                  ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-950/40 ring-1 ring-amber-300/40'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              ALBERO DERIVATE
            </button>

            <button
              onClick={() => setActiveTab('channel_restrictions')}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'channel_restrictions'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40 ring-1 ring-red-400/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              GESTIONE TARIFFE DERIVATE
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'messages'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-1 ring-rose-400/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              MESSAGGI CLIENTI
            </button>

            <button
              onClick={() => setActiveTab('octorate')}
              className={`px-1.5 py-1.5 sm:px-2 xl:px-2.5 rounded-xl text-[11px] sm:text-[12px] md:text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[15px] font-black uppercase tracking-tight transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                activeTab === 'octorate'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
              }`}
            >
              OCTORATE PMS
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           COMPARTIMENTO: OTTIMIZZAZIONI & CALENDARIO
           Nascosto completamente quando si è nella tab Messaggi Clienti
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab !== 'messages' && (
      <>

      {/* KPI Cards Unificate v15 — visibili SOLO su PRENOTAZIONI */}
      {activeTab === 'bookings' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* CARD 1: STATISTICHE GENERALI RESORT */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl flex flex-col justify-between min-h-[360px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border-2 border-emerald-400/50 border-double flex items-center justify-center text-emerald-300 flex-shrink-0 shadow">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                  STATISTICHE GENERALI RESORT
                </h3>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                {fin.totalNights} NOTTI TOT.
              </span>
            </div>

            {/* 3 Riquadri Fisici Equidistanti con Icone W-6 H-6 e Testi Ingranditi */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Prenotazioni</span>
                  <Calendar className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white leading-none">{totalBookingsCount}</div>
                  <p className="text-[10px] text-stone-500 font-medium mt-1">Registrate nel sistema</p>
                </div>
              </div>

              <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Ospiti</span>
                  <Users className="w-6 h-6 text-teal-400 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white leading-none">{totalGuests}</div>
                  <p className="text-[10px] text-stone-500 font-medium mt-1">Capacità occupata</p>
                </div>
              </div>

              <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Alloggi</span>
                  <Hotel className="w-6 h-6 text-amber-400 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white leading-none">
                    {availableRoomsCount}<span className="text-base text-stone-500 font-bold">/{(accommodations || []).length}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 font-medium mt-1">Pronti al check-in</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3x2 Symmetrical Grid for Sold Nights Distribution across 6 Channels */}
          <div className="pt-3 border-t border-stone-800/80 space-y-2">
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
              🌙 DISTRIBUZIONE NOTTI VENDUTE PER CANALE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { key: 'booking.com', label: 'Booking.com' },
                { key: 'airbnb', label: 'Airbnb' },
                { key: 'agoda', label: 'Agoda' },
                { key: 'expedia', label: 'Expedia' },
                { key: 'website', label: 'Website (Sito)' },
                { key: 'private', label: 'Private (Diretto)' }
              ].map(({ key, label }) => {
                const item = fin.otaStats[key];
                return (
                  <div key={key} className="flex items-center justify-between bg-stone-950/50 border border-stone-800/80 p-2.5 rounded-xl shadow-sm">
                    <span className="text-[11px] font-extrabold text-stone-300">{label}</span>
                    <span className="text-[11px] font-mono font-black text-emerald-400">
                      {item.nights} {item.nights === 1 ? 'notte' : 'notti'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 2: RENDICONTO FINANZIARIO & INTERMEDIAZIONI */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl flex flex-col justify-between min-h-[360px]">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border-2 border-amber-400/50 border-double flex items-center justify-center text-amber-300 flex-shrink-0 shadow">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                  RENDICONTO FINANZIARIO & INTERMEDIAZIONI
                </h3>
              </div>
              
              {/* Date Range Picker Filters (V14 Default: Oggi -> 31 Ottobre prossimo anno) */}
              <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800 shadow-inner">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-stone-400 uppercase pl-1">Dal:</span>
                  <input
                    type="date"
                    value={finDateFrom}
                    onChange={(e) => setFinDateFrom(e.target.value)}
                    className="bg-stone-900 border border-stone-750 rounded-lg px-2 py-0.5 text-[11px] text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-stone-400 uppercase">Al:</span>
                  <input
                    type="date"
                    value={finDateTo}
                    onChange={(e) => setFinDateTo(e.target.value)}
                    className="bg-stone-900 border border-stone-750 rounded-lg px-2 py-0.5 text-[11px] text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Top 3 Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Incasso Lordo</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono leading-tight">
                  ฿{fin.grossRevenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[10px] text-stone-500 font-medium">Caparre + Saldi</p>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Commissioni OTA</div>
                <div className="text-xl sm:text-2xl font-black text-red-400 font-mono leading-tight">
                  -฿{fin.totalCommissions.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[10px] text-stone-500 font-medium">Stima intermediazioni</p>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Netto Resort</div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono leading-tight">
                  ฿{fin.netRevenue.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[10px] text-stone-500 font-medium">Dopo intermediazioni</p>
              </div>
            </div>
          </div>

          {/* 3x2 Symmetrical Grid Layout for 6 Channels (Booking, Airbnb, Agoda, Expedia, Website, Private) */}
          <div className="pt-3 border-t border-stone-800/80 space-y-2">
            <div className="text-[10px] font-black text-stone-400 uppercase tracking-wider">
              💰 INCASSI & COMMISSIONI PER CANALE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { key: 'booking.com', label: 'Booking.com', rateText: '17.2%' },
                { key: 'airbnb', label: 'Airbnb', rateText: '15.0%' },
                { key: 'agoda', label: 'Agoda', rateText: '18.0%' },
                { key: 'expedia', label: 'Expedia', rateText: '15.0%' },
                { key: 'website', label: 'Website (Sito)', rateText: '3.5%' },
                { key: 'private', label: 'Private (Diretto)', rateText: '0.0%' }
              ].map(({ key, label, rateText }) => {
                const item = fin.otaStats[key];
                return (
                  <div key={key} className="flex items-center justify-between bg-stone-900/30 border border-stone-800/80 p-2.5 rounded-xl shadow-sm hover:border-stone-700/80 transition-all">
                    <div>
                      <span className="text-[11px] font-extrabold text-stone-200 block">{label}</span>
                      <span className="text-[9px] font-mono text-stone-500 font-semibold">{rateText} comm.</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-mono font-bold text-stone-300">
                        ฿{item.gross.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                      </div>
                      <div className={`text-[10px] font-mono font-black ${item.commission > 0 ? 'text-red-400' : 'text-stone-500'}`}>
                        {item.commission > 0 ? `-฿${item.commission.toLocaleString('it-IT', { maximumFractionDigits: 0 })}` : '฿0'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
      )}



      {/* ═══════════════════════════════════════════════════════════════
           MODULI SCONTI: RACCOGLITORE A SCHEDE (TABBED BINDER)
           Visibili SOLO su CALENDARIO 30GG e ANNUALE
      ══════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'calendar_30_days' || activeTab === 'calendar') && (
        <div className="my-4 space-y-0">
          
          {/* TABS SUPERIORI (LINGUETTE DEL RACCOGLITORE) */}
          <div className="flex flex-row overflow-x-auto gap-1.5 px-1 z-10 -mb-[2px] cursor-pointer select-none no-scrollbar">
            {/* Tab 1: Last Minute */}
            <button
              type="button"
              onClick={() => setActiveOptimizationTab('cascade')}
              className={`px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-t-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeOptimizationTab === 'cascade'
                  ? 'bg-amber-950/30 border-t-2 border-x-2 border-amber-500/40 text-amber-300 opacity-100 z-10 shadow-lg'
                  : 'bg-stone-900/60 border border-b-0 border-stone-800 text-stone-400 hover:text-amber-300 hover:bg-stone-850 opacity-50 hover:opacity-80 z-0'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>LAST MINUTE</span>
              {isLastMinuteActive && (
                <span className="relative flex h-2.5 w-2.5 ml-1" title="Last Minute Sconti a Cascata Attivo">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </button>

            {/* Tab 2: Soggiorno Minimo Dinamico */}
            <button
              type="button"
              onClick={() => setActiveOptimizationTab('min_stay')}
              className={`px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-t-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeOptimizationTab === 'min_stay'
                  ? 'bg-violet-950/30 border-t-2 border-x-2 border-violet-500/40 text-violet-300 opacity-100 z-10 shadow-lg'
                  : 'bg-stone-900/60 border border-b-0 border-stone-800 text-stone-400 hover:text-violet-300 hover:bg-stone-850 opacity-50 hover:opacity-80 z-0'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-violet-400" />
              <span>SOGGIORNO MINIMO</span>
              {isDynamicCalculationEnabled && (
                <span className="relative flex h-2.5 w-2.5 ml-1" title="Soggiorno Minimo Dinamico Attivo">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </button>

            {/* Tab 3: Tariffe Standard OTA */}
            <button
              type="button"
              onClick={() => setActiveOptimizationTab('standard_rates')}
              className={`px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-t-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeOptimizationTab === 'standard_rates'
                  ? 'bg-cyan-950/30 border-t-2 border-x-2 border-cyan-500/40 text-cyan-300 opacity-100 z-10 shadow-lg'
                  : 'bg-stone-900/60 border border-b-0 border-stone-800 text-stone-400 hover:text-cyan-300 hover:bg-stone-850 opacity-50 hover:opacity-80 z-0'
              }`}
            >
              <Bed className="w-4 h-4 text-cyan-400" />
              <span>TARIFFE STANDARD OTA</span>
              {standardProtectionActive && (
                <span className="relative flex h-2.5 w-2.5 ml-1" title="Tariffe Standard OTA Attive">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </button>

            {/* Tab 4: Codici Promozionali & Ticket */}
            <button
              type="button"
              onClick={() => setActiveOptimizationTab('promo_codes')}
              className={`px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-t-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeOptimizationTab === 'promo_codes'
                  ? 'bg-fuchsia-950/30 border-t-2 border-x-2 border-fuchsia-500/40 text-fuchsia-300 opacity-100 z-10 shadow-lg'
                  : 'bg-stone-900/60 border border-b-0 border-stone-800 text-stone-400 hover:text-fuchsia-300 hover:bg-stone-850 opacity-50 hover:opacity-80 z-0'
              }`}
            >
              <Ticket className="w-4 h-4 text-fuchsia-400" />
              <span>PROMO CODES</span>
            </button>
          </div>

          {/* RACCOGLITORE SOTTOSTANTE (PANNELLO UNICO) */}
          <div className={`rounded-b-2xl rounded-tr-2xl p-4 sm:p-5 shadow-2xl relative z-0 transition-all border-4 border-double ${
            activeOptimizationTab === 'cascade'
              ? 'bg-amber-950/30 border-amber-500/40 shadow-amber-950/30 ring-1 ring-amber-500/10'
              : activeOptimizationTab === 'min_stay'
              ? 'bg-violet-950/30 border-violet-500/40 shadow-violet-950/30 ring-1 ring-violet-500/10'
              : activeOptimizationTab === 'standard_rates'
              ? 'bg-cyan-950/30 border-cyan-500/40 shadow-cyan-950/30 ring-1 ring-cyan-500/10'
              : 'bg-fuchsia-950/30 border-fuchsia-500/40 shadow-fuchsia-950/30 ring-1 ring-fuchsia-500/10'
          }`}>

            {/* TAB 1 CONTENT: LAST-MINUTE DYNAMIC 3-STAGE CASCADE DISCOUNT */}
            {activeOptimizationTab === 'cascade' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 flex-shrink-0 shadow">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2 uppercase">
                        LAST MINUTE / SCONTI A CASCATA
                      </h3>
                      <p className="text-stone-400 text-[11px] font-medium">
                        Sconti percentuali sequenziali dinamici calcolati sulla data libera imminente
                      </p>
                    </div>
                  </div>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                    OCTORATE API
                  </span>
                </div>

                {/* Master Status & Kill-Switch Banner for Last Minute */}
                <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isLastMinuteActive
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                    : 'bg-stone-900/60 border-stone-800'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {isLastMinuteActive ? (
                        <span className="relative flex h-4 w-4 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-md shadow-emerald-400"></span>
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full h-4 w-4 bg-stone-600 border border-stone-500 flex-shrink-0"></span>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            isLastMinuteActive ? 'text-emerald-300' : 'text-stone-400'
                          }`}>
                            {isLastMinuteActive ? '🟢 SERVIZIO ATTIVO (SCONTI A CASCATA APPLICATI)' : '⚪ SERVIZIO DISATTIVATO (CALENDARIO NORMALE OCTORATE)'}
                          </span>
                          {isLastMinuteActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                              LIVE PMS
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {isLastMinuteActive
                            ? 'Gli sconti sequenziali a 3 stadi sono attivi e allineati sulle Tariffe Madri di Octorate per i prossimi 7 giorni.'
                            : 'Nessun automatismo sconto attivo. Octorate segue la normale gestione manuale del calendario e i prezzi base standard.'}
                        </p>
                      </div>
                    </div>

                    {/* Dual-Click Toggle / Deactivation Button */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {isLastMinuteActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!lastMinuteDeactivateArmed) {
                              setLastMinuteDeactivateArmed(true);
                              return;
                            }
                            setLastMinuteDeactivateArmed(false);
                            resetLastMinuteStrategy();
                          }}
                          disabled={lastMinuteRunning}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            lastMinuteDeactivateArmed
                              ? 'bg-red-600 text-white animate-bounce shadow-lg shadow-red-950/60'
                              : 'bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-500/30'
                          }`}
                          title="Ripristina i prezzi al 100% della tariffa base e torna al sistema normale Octorate"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${lastMinuteRunning ? 'animate-spin' : ''}`} />
                          <span>
                            {lastMinuteRunning
                              ? 'Ripristino in corso...'
                              : lastMinuteDeactivateArmed
                              ? '⚠️ CONFERMA DISATTIVAZIONE'
                              : 'DISATTIVA E TORNA AL SISTEMA NORMALE'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[10.5px] text-stone-500 font-mono italic">
                          Standard Octorate 100%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3 Cascade Discount Stages Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Stage 1: 3 Days @ 10% */}
                  <div className="bg-red-950/30 p-2.5 rounded-xl border border-red-500/40 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1">
                        🔥 Stadio 1: Imminente
                      </label>
                      <span className="text-[9px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded border border-red-500/30 font-mono">
                        Gg 0 - {Math.max(0, (lastMinuteStage1Days || 3) - 1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400 text-[10.5px]">Durata:</span>
                        <input
                          type="number"
                          min="1"
                          max="14"
                          value={lastMinuteStage1Days ?? 3}
                          onChange={(e) => setLastMinuteStage1Days(parseInt(e.target.value))}
                          className="w-11 bg-stone-900 border border-stone-700 rounded-lg px-1 py-0.5 text-white font-mono font-black text-[11px] text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-stone-400 text-[10.5px]">gg</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400 text-[10.5px]">Sconto:</span>
                        <input
                          type="number"
                          min="0"
                          max="80"
                          step="0.5"
                          value={lastMinuteDiscountStage1 ?? 10}
                          onChange={(e) => setLastMinuteDiscountStage1(parseFloat(e.target.value))}
                          className="w-11 bg-stone-900 border border-stone-700 rounded-lg px-1 py-0.5 text-amber-400 font-mono font-black text-[11px] text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-amber-400 font-black text-[11px]">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 2: 2 Next Days @ 5% */}
                  <div className="bg-orange-950/30 p-2.5 rounded-xl border border-orange-500/40 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-orange-400 uppercase tracking-wider flex items-center gap-1">
                        🏷️ Stadio 2: Intermedio
                      </label>
                      <span className="text-[9px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/30 font-mono">
                        Gg {lastMinuteStage1Days || 3} - {(lastMinuteStage1Days || 3) + (lastMinuteStage2Days || 2) - 1}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400 text-[10.5px]">Durata:</span>
                        <input
                          type="number"
                          min="1"
                          max="14"
                          value={lastMinuteStage2Days ?? 2}
                          onChange={(e) => setLastMinuteStage2Days(parseInt(e.target.value))}
                          className="w-11 bg-stone-900 border border-stone-700 rounded-lg px-1 py-0.5 text-white font-mono font-black text-[11px] text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-stone-400 text-[10.5px]">gg</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400 text-[10.5px]">Sconto:</span>
                        <input
                          type="number"
                          min="0"
                          max="80"
                          step="0.5"
                          value={lastMinuteDiscountStage2 ?? 5}
                          onChange={(e) => setLastMinuteDiscountStage2(parseFloat(e.target.value))}
                          className="w-11 bg-stone-900 border border-stone-700 rounded-lg px-1 py-0.5 text-amber-400 font-mono font-black text-[11px] text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-amber-400 font-black text-[11px]">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage 3: 2 Next Days @ 2.5% */}
                  <div className="bg-yellow-950/30 p-2.5 rounded-xl border border-yellow-600/40 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                        ⚡ Stadio 3: Esteso
                      </label>
                      <span className="text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-600/30 font-mono">
                        Gg {(lastMinuteStage1Days || 3) + (lastMinuteStage2Days || 2)} - {(lastMinuteStage1Days || 3) + (lastMinuteStage2Days || 2) + (lastMinuteStage3Days || 2) - 1}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400 text-[10.5px]">Durata:</span>
                        <input
                          type="number"
                          min="1"
                          max="14"
                          value={lastMinuteStage3Days ?? 2}
                          onChange={(e) => setLastMinuteStage3Days(parseInt(e.target.value))}
                          className="w-11 bg-stone-900 border border-stone-700 rounded-lg px-1 py-0.5 text-white font-mono font-black text-[11px] text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-stone-400 text-[10.5px]">gg</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400 text-[10.5px]">Sconto:</span>
                        <input
                          type="number"
                          min="0"
                          max="80"
                          step="0.5"
                          value={lastMinuteDiscountStage3 ?? 2.5}
                          onChange={(e) => setLastMinuteDiscountStage3(parseFloat(e.target.value))}
                          className="w-11 bg-stone-900 border border-stone-700 rounded-lg px-1 py-0.5 text-amber-400 font-mono font-black text-[11px] text-center focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-amber-400 font-black text-[11px]">%</span>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Simulation Active Visual Banner — Visibile SOLO quando il servizio reale non è attivo */}
                {isSimulationActive && !isLastMinuteActive && (
                  <div className="p-2.5 bg-amber-950/60 border border-amber-500/50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 text-amber-300 text-[11px] shadow-lg animate-pulse">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        <strong>ANTEPRIMA SIMULAZIONE ATTIVA:</strong> Prezzi scontati in memoria (-10%, -5%, -2.5%). Nessun dato inviato ad Octorate.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => useResortAdminStore.getState().resetLastMinuteStrategy()}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 text-[10px] font-extrabold uppercase rounded-lg transition-all cursor-pointer whitespace-nowrap"
                    >
                      Chiudi Anteprima
                    </button>
                  </div>
                )}

                {/* Action Controls + 3-Level Execution Mode Selector + Reset Button */}
                <div className="pt-2.5 border-t border-stone-850 flex flex-col space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* 3-Level Execution Mode Selector */}
                    <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800 shadow-inner">
                      <span className="text-[11px] font-black text-stone-300 px-1.5 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        MODALITÀ:
                      </span>

                      <button
                        type="button"
                        onClick={() => setExecutionMode('simulation')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          executionMode === 'simulation'
                            ? 'bg-red-500 text-white shadow-sm shadow-red-950/40'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                        title="Calcolo senza chiamate API"
                      >
                        🔴 SIMULAZIONE DRY-RUN
                      </button>

                      <button
                        type="button"
                        onClick={() => setExecutionMode('test_bungalows')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          executionMode === 'test_bungalows'
                            ? 'bg-amber-500 text-stone-950 font-bold shadow-sm shadow-amber-950/40'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                        title="Invia modifiche SOLO a Fake Bungalows (ID Madri 649669 e 921799)"
                      >
                        🧪 AMBIENTE DI TEST
                      </button>

                      <button
                        type="button"
                        onClick={() => executionMode !== 'production' ? setShowCascadeProdModal(true) : setExecutionMode('simulation')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          executionMode === 'production'
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/40 animate-pulse'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                        title="Invia modifiche a tutte le Tariffe Madri di produzione"
                      >
                        🌐 PRODUZIONE
                      </button>
                    </div>

                    {/* Action Buttons: Execute & Reset */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const isLiveTarget = executionMode === 'test_bungalows' || executionMode === 'production';
                          if (isLiveTarget && !lastMinuteArmed) {
                            setLastMinuteArmed(true);
                            return;
                          }
                          setLastMinuteArmed(false);
                          executeLastMinuteStrategy();
                        }}
                        disabled={lastMinuteExecuting || lastMinuteResetting}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                          lastMinuteArmed
                            ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-400'
                            : executionMode === 'production'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                            : executionMode === 'test_bungalows'
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-950/50'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                        }`}
                      >
                        {lastMinuteExecuting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Elaborazione...</span>
                          </>
                        ) : lastMinuteArmed ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>SEI SICURO? CLICCA PER CONFERMARE</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>ESEGUI SCONTI A CASCATA</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => resetLastMinuteStrategy()}
                        disabled={lastMinuteExecuting || lastMinuteResetting}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-850 transition-all cursor-pointer disabled:opacity-50"
                        title="Ripristina i prezzi al 100% della tariffa base originale senza sconti"
                      >
                        {lastMinuteResetting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>Ripristino...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                            <span>RIPRISTINA PREZZI ORIGINALI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {lastMinuteResult && (
                  <div className={`p-3 rounded-2xl border text-xs leading-relaxed w-full ${
                    lastMinuteResult.success
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-red-950/40 border-red-800/60 text-red-300'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      {lastMinuteResult.success ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                      <span>{lastMinuteResult.message}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono block">
                      Ultimo aggiornamento: {formatLastUpdateStr(lastMinuteResult.dateUpdated)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2 CONTENT: DYNAMIC MINIMUM STAY */}
            {activeOptimizationTab === 'min_stay' && (
              <div className="space-y-4">
                {/* Master Status & Kill-Switch Banner */}
                <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isDynamicCalculationEnabled
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                    : 'bg-stone-900/60 border-stone-800'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {isDynamicCalculationEnabled ? (
                        <span className="relative flex h-4 w-4 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-md shadow-emerald-400"></span>
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full h-4 w-4 bg-stone-600 border border-stone-500 flex-shrink-0"></span>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            isDynamicCalculationEnabled ? 'text-emerald-300' : 'text-stone-400'
                          }`}>
                            {isDynamicCalculationEnabled ? '🟢 FUNZIONALITÀ ATTIVA (24/7 AUTO SYNC & GAP-FILL)' : '⚪ FUNZIONALITÀ DISATTIVATA (CALENDARIO NORMALE OCTORATE)'}
                          </span>
                          {isDynamicCalculationEnabled && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                              LIVE PMS
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {isDynamicCalculationEnabled
                            ? 'Il calcolo dinamico del soggiorno minimo è in esecuzione automatica e allinea Octorate ad ogni prenotazione.'
                            : 'Il calcolo dinamico è spento. Octorate segue la normale gestione manuale del calendario e i valori stagionali standard.'}
                        </p>
                      </div>
                    </div>

                    {/* Dual-Click Toggle Button */}
                    <div className="flex items-center gap-2">
                      {isDynamicCalculationEnabled ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!minStayDeactivateArmed) {
                              setMinStayDeactivateArmed(true);
                              return;
                            }
                            setMinStayDeactivateArmed(false);
                            executeDynamicMinStayStrategy(true);
                          }}
                          disabled={dynamicMinStayRunning || dynamicMinStayResetRunning}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-md ${
                            minStayDeactivateArmed
                              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-400 shadow-rose-950/60'
                              : 'bg-stone-900 hover:bg-rose-950/60 border border-rose-800/40 text-rose-300 hover:text-rose-200'
                          }`}
                          title="Disattiva il calcolo dinamico e ripristina la normale gestione del calendario su Octorate"
                        >
                          {dynamicMinStayResetRunning ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Ripristino Octorate in corso...</span>
                            </>
                          ) : minStayDeactivateArmed ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>CONFERMI DISATTIVAZIONE? CLICCA DI NUOVO</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                              <span>DISATTIVA E TORNA AL CALENDARIO NORMALE</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            executeDynamicMinStayStrategy(false);
                          }}
                          disabled={dynamicMinStayRunning || dynamicMinStayResetRunning}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {dynamicMinStayRunning ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Attivazione in corso...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>ATTIVA SOGGIORNO MINIMO DINAMICO</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-violet-500/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-400/50 flex items-center justify-center text-violet-300 flex-shrink-0 shadow">
                      <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2 uppercase">
                        SOGGIORNO MINIMO DINAMICO
                      </h3>
                      <p className="text-stone-400 text-[11px] font-medium">
                        Calcolo automatico per coprire le bucature inferiori a 7 notti e regolare i soggiorni minimi in base all'occupazione.
                      </p>
                    </div>
                  </div>
                  <span className="bg-violet-500/10 text-violet-300 border border-violet-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                    Staging Lock #649669 & #921799
                  </span>
                </div>

                {/* Result Output */}
                {dynamicMinStayResult && (
                  <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    dynamicMinStayResult.success
                      ? 'bg-teal-950/40 border-teal-800/60 text-teal-300'
                      : 'bg-red-950/40 border-red-800/60 text-red-300'
                  }`}>
                    <div className="font-bold flex items-center gap-2 mb-1">
                      {dynamicMinStayResult.success ? <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                      <span>{dynamicMinStayResult.message}</span>
                    </div>
                    {dynamicMinStayResult.dryRun && (
                      <span className="text-[10px] text-amber-300/90 font-mono block">
                        🔒 Modalità DRY_RUN Attiva: Nessuna modifica inviata ad Octorate. {dynamicMinStayResult.updatesCount} bucature identificate in memoria.
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom Controls Bar */}
                <div className="pt-2.5 border-t border-stone-850 flex flex-col space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    {/* Mode Selector */}
                    <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800 shadow-inner">
                      <span className="text-[11px] font-black text-stone-300 px-1.5 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                        MODALITÀ:
                      </span>

                      <button
                        type="button"
                        onClick={() => setDynamicMinStayExecutionMode('simulation')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          dynamicMinStayExecutionMode === 'simulation'
                            ? 'bg-red-500 text-white shadow-sm shadow-red-950/40'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        🔴 SIMULAZIONE DRY-RUN
                      </button>

                      <button
                        type="button"
                        onClick={() => setDynamicMinStayExecutionMode('test_bungalows')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          dynamicMinStayExecutionMode === 'test_bungalows'
                            ? 'bg-amber-500 text-stone-950 font-bold shadow-sm shadow-amber-950/40'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        🧪 AMBIENTE DI TEST
                      </button>

                      <button
                        type="button"
                        onClick={() => { dynamicMinStayExecutionMode !== 'production' ? setShowMinStayProdModal(true) : setDynamicMinStayExecutionMode('simulation'); setMinStayArmed(false); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                          dynamicMinStayExecutionMode === 'production'
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/40 animate-pulse'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        🌐 PRODUZIONE
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const isLiveTarget = dynamicMinStayExecutionMode === 'test_bungalows' || dynamicMinStayExecutionMode === 'production';
                          if (isLiveTarget && !minStayArmed) {
                            setMinStayArmed(true);
                            return;
                          }
                          setMinStayArmed(false);
                          executeDynamicMinStayStrategy(false);
                        }}
                        disabled={dynamicMinStayRunning || dynamicMinStayResetRunning}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md ${
                          minStayArmed
                            ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-400'
                            : dynamicMinStayExecutionMode === 'production'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                            : dynamicMinStayExecutionMode === 'test_bungalows'
                            ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-950/50'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50'
                        }`}
                      >
                        {dynamicMinStayRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Calcolo in corso...</span>
                          </>
                        ) : minStayArmed ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>SEI SICURO? CLICCA PER CONFERMARE</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>ESEGUI SOGGIORNO MINIMO DINAMICO</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => { executeDynamicMinStayStrategy(true); setMinStayArmed(false); }}
                        disabled={dynamicMinStayRunning || dynamicMinStayResetRunning}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-stone-950 border border-stone-800 text-stone-300 hover:bg-stone-850 transition-all cursor-pointer disabled:opacity-50"
                        title="Ripristina i valori di soggiorno minimo stagionali standard su Octorate"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${dynamicMinStayResetRunning ? 'animate-spin' : ''}`} />
                        <span>RIPRISTINO VALORI STAGIONALI</span>
                      </button>
                    </div>
                  </div>
                </div>

                {dynamicMinStayResult && (
                  <div className={`p-3 rounded-2xl border text-xs leading-relaxed w-full ${
                    dynamicMinStayResult.success
                      ? 'bg-violet-950/40 border-violet-800/60 text-violet-300'
                      : 'bg-red-950/40 border-red-800/60 text-red-300'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      {dynamicMinStayResult.success ? <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                      <span>{dynamicMinStayResult.message}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono block">
                      Ultimo aggiornamento: {formatLastUpdateStr(dynamicMinStayResult.dateUpdated)}
                    </span>
                  </div>
                )}


              </div>
            )}

            {/* TAB 3 CONTENT: TARIFFE STANDARD HIGH SEASON */}
            {activeOptimizationTab === 'standard_rates' && (
              <StandardRatesProtectionSection isOpen={true} borderless={true} />
            )}

            {/* TAB 4 CONTENT: CODICI PROMOZIONALI & TICKET SCONTO */}
            {activeOptimizationTab === 'promo_codes' && (
              <PromoCodesSection isOpen={true} borderless={true} />
            )}
          </div>
        </div>
      )}

      {/* Tab Visual Calendar 30gg Veloce */}
      {activeTab === 'calendar_30_days' && (
        <ResortVisualCalendar viewMode="30_days" />
      )}

      {/* Tab Visual Calendar Full Season */}
      {activeTab === 'calendar' && (
        <ResortVisualCalendar viewMode="full_season" />
      )}

      {/* Tab Tariffe Derivate & Albero Canali OTA */}
      {activeTab === 'derived_rates' && (
        <DerivedRatesTreeSection />
      )}

      {/* fine compartimento ottimizzazioni + tabs */}
      </>
      )}


      {/* ═══════════════════════════════════════════════════════════════
           COMPARTIMENTO STAGNO: MESSAGGI CLIENTI
           Visibile SOLO quando activeTab === 'messages'
           Nessun modulo di ottimizzazione viene montato nel DOM
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'messages' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <NewsletterCampaignSection />
        </div>
      )}

      {/* Tab 1: Bookings List — Accordion Raggruppati per Canale OTA (v16) */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* Header Controls for Accordions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-900/80 border border-stone-800 rounded-2xl p-4 shadow-lg">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Hotel className="w-4 h-4 text-emerald-400" />
                PRENOTAZIONI PER CANALE ({filteredBookings.length} ATTIVE)
              </h3>
              <p className="text-[10px] text-stone-400">
                Raggruppamento dinamico delle prenotazioni per OTA e Sito Diretto.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExpandAllAccordions}
                className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ChevronDown className="w-4 h-4 text-emerald-400" />
                <span>Espandi Tutte le OTA</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAllAccordions}
                className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ChevronUp className="w-4 h-4 text-amber-400" />
                <span>Comprimi Tutte</span>
              </button>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800 rounded-3xl p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-stone-600 mx-auto" />
              <h3 className="text-stone-300 font-bold text-base">Nessuna prenotazione trovata</h3>
              <p className="text-stone-500 text-xs max-w-sm mx-auto">
                Le prenotazioni ricevute tramite il Booking Engine compariranno in questo elenco.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { key: 'booking.com', label: 'Booking.com', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                { key: 'airbnb', label: 'Airbnb', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                { key: 'agoda', label: 'Agoda', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
                { key: 'expedia', label: 'Expedia', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                { key: 'website', label: 'Website (Sito Web)', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                { key: 'private', label: 'Private (Diretto / Altro)', badgeColor: 'bg-stone-800 text-stone-300 border-stone-700' },
              ].map(({ key, label, badgeColor }) => {
                const channelBookings = filteredBookings.filter(b => getChannelKey(b.source_channel) === key);
                const channelGross = channelBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
                const isOpen = !!openAccordions[key];

                return (
                  <div key={key} className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xl transition-all">
                    {/* Accordion Channel Header */}
                    <button
                      type="button"
                      onClick={() => toggleAccordionKey(key)}
                      className="w-full px-5 py-4 flex items-center justify-between bg-stone-950/70 hover:bg-stone-850 transition-colors text-left cursor-pointer border-b border-stone-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-xs text-emerald-400 shadow-inner">
                          {channelBookings.length}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white tracking-wide uppercase">
                              {label}
                            </h4>
                            <span className={`text-[9px] border px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${badgeColor}`}>
                              {key}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-medium">
                            {channelBookings.length === 1 ? '1 prenotazione attiva' : `${channelBookings.length} prenotazioni attive`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[9px] text-stone-400 uppercase font-bold block">Incasso Canale</span>
                          <span className="text-xs font-mono font-black text-amber-400">
                            ฿{channelGross.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="p-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    {/* Accordion Content */}
                    {isOpen && (
                      <div className="p-4 bg-stone-950/40">
                        {channelBookings.length === 0 ? (
                          <div className="p-4 text-center text-xs text-stone-400 font-medium italic">
                            Nessuna prenotazione attiva per {label} nel filtro corrente.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {channelBookings.map((b) => (
                              <div
                                key={b.id}
                                className="bg-stone-900/90 border border-stone-800 hover:border-stone-700/90 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all shadow-md"
                              >
                                {/* Col 1: ID, Created Date */}
                                <div className="space-y-1 sm:w-44 flex-shrink-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-emerald-400 font-black text-sm">{b.id}</span>
                                  </div>
                                  <div className="text-[11px] text-stone-400 font-medium">
                                    {b?.created_at ? new Date(b.created_at).toLocaleDateString('it-IT') : '-'}
                                  </div>
                                  {b.octorate_reservation_id && (
                                    <div className="text-[10px] text-stone-400 font-mono">
                                      PMS ID: {b.octorate_reservation_id}
                                    </div>
                                  )}
                                </div>

                                {/* Col 2: Guest Information */}
                                <div className="space-y-0.5 sm:w-56 flex-shrink-0">
                                  <div className="font-black text-white text-sm tracking-tight">{b.guest_name ?? 'Ospite Anonimo'}</div>
                                  <div className="text-stone-300 text-xs font-medium">{b.guest_email ?? '-'}</div>
                                  <div className="text-stone-400 font-mono text-[11px]">{b.guest_phone ?? '-'}</div>
                                </div>

                                {/* Col 3: Room & Dates */}
                                <div className="space-y-1.5 sm:w-60 flex-shrink-0">
                                  <div className="inline-block bg-stone-850 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-bold shadow-sm">
                                    {b.accommodation_name ?? 'Alloggio Standard'}
                                  </div>
                                  <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                    <span>{b.check_in ?? '-'} ➔ {b.check_out ?? '-'}</span>
                                    <span className="text-[10px] text-stone-400 font-normal">({b.guests ?? 1} osp.)</span>
                                  </div>
                                </div>

                                {/* Col 4: Extra Services */}
                                <div className="flex gap-1.5 flex-wrap sm:w-36 flex-shrink-0">
                                  {b.extra_breakfast && (
                                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                      <Coffee className="w-3 h-3" /> Colazione
                                    </span>
                                  )}
                                  {b.extra_ac && (
                                    <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                      <Wind className="w-3 h-3" /> Aria Cond.
                                    </span>
                                  )}
                                  {!b.extra_breakfast && !b.extra_ac && (
                                    <span className="text-stone-400 text-[10px] italic">Standard</span>
                                  )}
                                </div>

                                {/* Col 5: Financial Total & Deposit */}
                                <div className="space-y-1 text-left sm:text-right flex-shrink-0">
                                  <div className="font-black text-amber-400 font-mono text-base leading-none">
                                    ฿{(b?.total_price ?? 0).toLocaleString('it-IT')}
                                  </div>
                                  <div className="text-[10px] text-emerald-400 font-bold">
                                    Acconto 30%: ฿{(b?.deposit_paid ?? 0).toLocaleString('it-IT')}
                                  </div>
                                </div>

                                {/* Col 6: Hide Action with Trash2 Icon */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleHideBooking(String(b.id || b.octorate_reservation_id))}
                                    className="px-3 py-2 bg-stone-950 hover:bg-red-950/90 hover:text-red-300 text-stone-400 border border-stone-800 hover:border-red-600/60 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                                    title="Nascondi questa prenotazione (escludi da vista e calcoli KPI)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-400/90" />
                                    <span>Nascondi</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Accommodations & Room Availability */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-stone-900/60 p-3 rounded-2xl border border-stone-850">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Filtra Categoria:</span>
              {['All', 'Ville', 'Bungalow', 'Tende Glamping', 'The Hub Guesthouse'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'text-stone-400 hover:text-white bg-stone-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black tracking-widest text-emerald-400 bg-stone-950 px-3 py-1 rounded-full uppercase border border-stone-800">
                      {room.category}
                    </span>
                    <span className="font-mono text-stone-400 text-xs font-bold bg-stone-950 px-2 py-0.5 rounded-lg border border-stone-800">
                      Octorate ID: {room.octorateId}
                    </span>
                  </div>

                  <h3 className="font-black text-white text-lg leading-snug whitespace-normal break-words">
                    {String(room.name || '').replace(/^\d+[\s._-]+/, '')}
                  </h3>

                  <div className="flex justify-between items-center text-xs text-stone-400 pt-2 border-t border-stone-850">
                    <span>Capienza Massima:</span>
                    <span className="font-bold text-white">{room.maxGuests} Ospiti</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-stone-400">
                    <span>Tariffa Base / Notte:</span>
                    <span className="font-black text-amber-400 font-mono text-sm">
                      ฿{(room?.basePrice ?? 0).toLocaleString('it-IT')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-400">Stato Prenotabile:</span>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(room)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                      pendingDeactivateId === room.id
                        ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold animate-pulse shadow-lg'
                        : (room.isAvailable ?? room.is_available)
                        ? 'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 shadow-sm'
                        : 'bg-stone-900 border border-stone-800 text-stone-500 hover:text-stone-300 shadow-sm'
                    }`}
                  >
                    {pendingDeactivateId === room.id
                      ? '⚠️ Clicca ancora!'
                      : (room.isAvailable ?? room.is_available)
                      ? '🟢 Disponibile'
                      : '🔴 Non Disponibile'}
                  </button>
                </div>

                <div className="pt-3 border-t border-stone-850 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedFeaturesRoomId(expandedFeaturesRoomId === room.id ? null : room.id)}
                    className="w-full py-2 px-3 bg-stone-950 hover:bg-stone-850 border border-stone-800 hover:border-fuchsia-500/40 text-fuchsia-400 hover:text-fuchsia-300 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>⚙️ {expandedFeaturesRoomId === room.id ? 'Nascondi Caratteristiche' : 'Gestisci Caratteristiche'}</span>
                    {expandedFeaturesRoomId === room.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {expandedFeaturesRoomId === room.id && (
                    <div className="pt-2 animate-fadeIn">
                      <AccommodationFeaturesEditor
                        accommodation={room}
                        onSaveSuccess={(updatedFeatures) => {
                          updateAccommodationFeatures(room.id, updatedFeatures);
                          alert('Caratteristiche salvate con successo!');
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Octorate PMS Integration Details */}
      {activeTab === 'octorate' && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl max-w-3xl mx-auto">
          <div className="flex items-center gap-3 border-b border-stone-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Octorate Channel Manager</h3>
              <p className="text-stone-400 text-xs font-medium">
                Stato connessione e parametri di sincronizzazione automatica delle disponibilità
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-stone-300">
            <div className="flex justify-between items-center bg-stone-950 p-4 rounded-2xl border border-stone-850">
              <span className="font-bold text-stone-400">Stato Connessione API:</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle className="w-4 h-4" /> Connesso & Operativo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-stone-950 p-4 rounded-2xl border border-stone-850 space-y-1">
                <span className="text-stone-500 text-[10px] uppercase font-bold">Structure (Hotel) ID</span>
                <div className="font-mono text-white text-sm font-bold">{octorateDetails?.structureId ?? '366879'}</div>
              </div>

              <div className="bg-stone-950 p-4 rounded-2xl border border-stone-850 space-y-1">
                <span className="text-stone-500 text-[10px] uppercase font-bold">Direct Booking Channel ID</span>
                <div className="font-mono text-white text-sm font-bold">{octorateDetails?.channelId ?? '233'}</div>
              </div>
            </div>

            <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-850 space-y-2">
              <span className="text-amber-400 font-bold block text-xs">ℹ️ Nota di Integrazione:</span>
              <p className="text-stone-400 text-xs leading-relaxed">
                Le prenotazioni effettuate tramite Stripe Checkout vengono registrate automaticamente sia nel sistema interno che su Octorate PMS inviando la conferma all'ID Struttura <strong className="text-white">366879</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Gestione Stagionale Tariffe */}
      {activeTab === 'seasonal_rates' && (
        <GestioneStagionaleTariffe />
      )}

      {/* Tab: Gestione Restrizioni Canali (Dynamic Timeline Matrix) */}
      {activeTab === 'channel_restrictions' && (
        <GestioneRestrizioniCanali />
      )}

      {/* --- COLLAPSIBLE OCTORATE DEV ROOM MAPPING & DIAGNOSTICS SECTION --- */}
      <div className="mt-8 border border-stone-800 rounded-3xl bg-stone-900/90 shadow-2xl overflow-hidden">
        {/* Accordion Bar */}
        <div 
          onClick={handleToggleDiagnostics}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer bg-stone-900 hover:bg-stone-850 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                  Octorate Dev Room Mapping & Diagnostics (Produzione)
                </h3>
              </div>
              <p className="text-[11px] text-stone-400">
                Pannello tecnico riservato alla diagnostica API, mappatura ID alloggi e reset token OAuth
              </p>
            </div>
          </div>

          <button
            type="button"
            className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>{showDevDiagnostics ? 'Nascondi Diagnostica' : 'Mostra Diagnostica'}</span>
            {showDevDiagnostics ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>

        {/* Expanded Panel */}
        {showDevDiagnostics && (
          <div className="p-6 border-t border-stone-800 space-y-6 text-xs text-stone-300 bg-stone-950/60 animate-fadeIn">
            
            {/* Controllo Connessione OAuth */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white text-xs uppercase tracking-wider">Stato Autenticazione OAuth Octorate</span>
                </div>
                {oauthConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">
                      <CheckCircle className="w-3.5 h-3.5" /> API Connesse & Attive
                    </span>
                    <button
                      type="button"
                      onClick={handleClearTokens}
                      className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/50 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                    >
                      Disconnetti / Reset Token
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold">
                    <AlertCircle className="w-3.5 h-3.5" /> API Non Connesse / In Attesa Token
                  </span>
                )}
              </div>

              {!oauthConnected && (
                <div className="space-y-2 pt-1">
                  <p className="text-stone-400 text-xs">
                    Per connettere le API Octorate, avvia il flusso OAuth e incolla l'URL di reindirizzamento generato:
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <a
                      href={getAuthorizationUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Link className="w-3.5 h-3.5" /> Avvia Autorizzazione OAuth
                    </a>
                    <input
                      type="text"
                      value={oauthUrl}
                      onChange={(e) => setOauthUrl(e.target.value)}
                      placeholder="Incolla qui l'URL di reindirizzamento..."
                      className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveToken}
                      disabled={oauthLoading}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                    >
                      {oauthLoading ? "Salvataggio..." : "Salva Token"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Mappatura Camere */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-emerald-400 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <span>1. Stato Mappatura Camere del Sito</span>
                </h4>
                <button
                  type="button"
                  onClick={handleFetchDevRooms}
                  disabled={loadingRooms}
                  className="px-3 py-1 bg-stone-850 hover:bg-stone-800 text-stone-300 border border-stone-750 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingRooms ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Ricarica Tariffe Octorate</span>
                </button>
              </div>

              <div className="overflow-x-auto bg-stone-900 border border-stone-800 rounded-2xl">
                <table className="w-full text-left text-xs text-stone-200">
                  <thead className="bg-stone-950 border-b border-stone-800 text-stone-400 text-[10px] uppercase font-extrabold">
                    <tr>
                      <th className="p-3">Camera Sito</th>
                      <th className="p-3">ID nel Codice</th>
                      <th className="p-3">Stato</th>
                      <th className="p-3">Octorate Room/Rate Name</th>
                      <th className="p-3">Suggerimento / Correzione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850">
                    {(accommodations || []).map((room) => {
                      const octorateMatch = octorateRooms.find((r) => {
                        const targetId = Number(room.octorateId);
                        const rId = Number(r.id);
                        const roomId = Number(r.room?.id);
                        const rName = (r.name || "").toLowerCase();
                        const roomName = room.name.toLowerCase();

                        return (
                          (targetId > 0 && (rId === targetId || roomId === targetId)) ||
                          (rName.length > 0 && (rName.includes(roomName) || roomName.includes(rName))) ||
                          (roomName.includes("jungle villa") && !roomName.includes("left") && !roomName.includes("right") && (rName.includes("jv be") || rId === 529784 || roomId === 529773)) ||
                          (roomName.includes("jungle villa left") && (rName.includes("jvl be") || rId === 495807 || roomId === 495795)) ||
                          (roomName.includes("jungle villa right") && (rName.includes("jvr be") || rId === 495980 || roomId === 495796)) ||
                          (roomName.includes("yellow bungalow") && (rName.includes("yellow be") || rId === 449385 || roomId === 293957)) ||
                          (roomName.includes("red bungalow") && (rName.includes("red be") || rId === 449422 || roomId === 293954)) ||
                          (roomName.includes("green bungalow") && (rName.includes("green be") || rId === 449668 || roomId === 293962)) ||
                          (roomName.includes("camel") && (rName.includes("camel be") || rId === 449675 || roomId === 293965)) ||
                          (roomName.includes("lagoon") && (rName.includes("lagoon be") || rId === 449674 || roomId === 293955)) ||
                          (roomName.includes("peace") && (rName.includes("p&l be") || rId === 495566 || roomId === 494840)) ||
                          (roomName.includes("penthouse") && (rName.includes("pent be") || rId === 449348 || roomId === 421511))
                        );
                      });

                      let suggestion = "";
                      if (!octorateMatch && octorateRooms.length > 0) {
                        const potentialMatches = octorateRooms.filter((r) => {
                          const octorateRoomName = (r.room?.name || "").toLowerCase();
                          const siteRoomName = room.name.toLowerCase();
                          return octorateRoomName.includes(siteRoomName) || siteRoomName.includes(octorateRoomName) ||
                                 (room.name === "Internal Room" && octorateRoomName.includes("inter"));
                        });
                        if (potentialMatches.length > 0) {
                          suggestion = potentialMatches.map(m => `Usa ID: ${m.id} (${m.room?.name || 'N/D'} - ${m.name || 'N/D'})`).join(" | ");
                        }
                      }

                      return (
                        <tr key={room.id} className="hover:bg-stone-850/50 transition-colors">
                          <td className="p-3 font-bold text-white whitespace-normal break-words">{String(room.name || '').replace(/^\d+[\s._-]+/, '')}</td>
                          <td className="p-3 font-mono text-stone-400">{room.octorateId || "Mancante"}</td>
                          <td className="p-3">
                            {octorateMatch ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold text-[10px]">Mappato OK</span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-bold text-[10px]">Non Trovato</span>
                            )}
                          </td>
                          <td className="p-3 text-stone-300">
                            {octorateMatch ? `${octorateMatch.room?.name} (${octorateMatch.name})` : "-"}
                          </td>
                          <td className="p-3 text-amber-400 font-medium">{suggestion || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Tariffe Ricevute */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-emerald-400 uppercase tracking-wider text-xs">
                2. Tariffe Ricevute da Octorate (Elenco Completo)
              </h4>
              {octorateRooms.length === 0 ? (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-stone-500 italic text-xs">
                  Nessuna tariffa caricata da Octorate. Assicurati che le API siano autenticate e clicca "Ricarica Tariffe Octorate".
                </div>
              ) : (
                <div className="overflow-x-auto bg-stone-900 border border-stone-800 rounded-2xl">
                  <table className="w-full text-left text-xs text-stone-200">
                    <thead className="bg-stone-950 border-b border-stone-800 text-stone-400 text-[10px] uppercase font-extrabold">
                      <tr>
                        <th className="p-3">Stanza Octorate (room.name)</th>
                        <th className="p-3">Room ID (room.id)</th>
                        <th className="p-3">Tariffa Name</th>
                        <th className="p-3">Rate ID (rate.id)</th>
                        <th className="p-3 text-right">Prezzo Min.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-850">
                      {octorateRooms.map((rate) => (
                        <tr key={rate.id} className="hover:bg-stone-850/50 transition-colors">
                          <td className="p-3 font-bold text-white">{rate.room?.name || "N/D"}</td>
                          <td className="p-3 font-mono text-stone-400">{rate.room?.id || "N/D"}</td>
                          <td className="p-3 text-stone-300">{rate.name || "N/D"}</td>
                          <td className="p-3 text-emerald-400 font-mono font-bold select-all">{rate.id}</td>
                          <td className="p-3 text-right font-bold text-amber-400 font-mono">฿{rate.minimumSellingPrice || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3. JSON Grezzo */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-emerald-400 uppercase tracking-wider text-xs">
                3. JSON Grezzo Ricevuto da Octorate (API Response)
              </h4>
              <textarea
                readOnly
                value={octorateRooms.length > 0 ? JSON.stringify(octorateRooms, null, 2) : "In attesa di caricamento o nessun dato ricevuto..."}
                className="w-full h-44 bg-stone-900 border border-stone-800 rounded-2xl p-4 font-mono text-[11px] text-emerald-400 focus:outline-none"
              />
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
