import React, { useState, useEffect, useMemo } from 'react';
import { Coffee, Wind, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAccommodations, EnrichedAccommodation } from '../../data/accommodationsService';
import { checkAvailability } from '../../lib/octorate';
import { translations, Language } from '../../lib/translations';
import { PRICE_CONFIG } from '../config/accommodations';
import { useResortAdminStore } from '../../../admin/resort/store/useResortAdminStore';
import RoomFeaturesGrid from './RoomFeaturesGrid';

interface RoomGridProps {
  lang: Language;
  activeCategory: string;
  guests: number;
  checkIn: string;
  checkOut: string;
  onResetFilters?: () => void;
  onSelectRoom?: (room: any, pricing: any, extras: { breakfast: boolean; ac: boolean }) => void;
  onExtendStay?: (nightsNeeded: number) => void;
  oauthConnected?: boolean;
}

function calculateStayDays(checkIn: string, checkOut: string): number {
  try {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch (err) {
    return 0;
  }
}

function isLowSeason(checkIn: string, checkOut: string): boolean {
  if (!checkIn || !checkOut) return false;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const lowSeasonMonths = [4, 5, 6, 7, 8, 9];
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  return lowSeasonMonths.includes(startMonth) || lowSeasonMonths.includes(endMonth);
}

function getDiscountInfo(days: number, lang: Language): { label: string; discount: number; color: string } {
  if (days >= 30) {
    const label = lang === 'TH' ? 'โคลิฟวิ่งระยะยาว (-20%)'
      : lang === 'DE' ? 'Langzeit Coliving (-20%)'
      : lang === 'EN' ? 'Long-Term Coliving (-20%)'
      : 'Tariffa Long-Term Coliving (-20%)';
    return { label, discount: 0.20, color: "bg-emerald-600" };
  } else if (days >= 15) {
    const label = lang === 'TH' ? 'ส่วนลดพักกลาง (-15%)'
      : lang === 'DE' ? 'Mittelaufenthalt Rabatt (-15%)'
      : lang === 'EN' ? 'Medium-Stay Discount (-15%)'
      : 'Sconto Medium-Stay (-15%)';
    return { label, discount: 0.15, color: "bg-emerald-500" };
  } else if (days > 0) {
    const label = lang === 'TH' ? 'ราคาจองตรง (-10%)'
      : lang === 'DE' ? 'Direktbuchungsrabatt (-10%)'
      : lang === 'EN' ? 'Direct Booking Price (-10%)'
      : 'Prezzo Diretto Garantito (-10%)';
    return { label, discount: 0.10, color: "bg-primary" };
  }
  return { label: "", discount: 0, color: "" };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

export const RoomGrid: React.FC<RoomGridProps> = ({
  lang,
  activeCategory,
  guests,
  checkIn,
  checkOut,
  onResetFilters,
  onSelectRoom,
  onExtendStay,
  oauthConnected,
}) => {
  const { promoCodes } = useResortAdminStore();
  const [rooms, setRooms] = useState<EnrichedAccommodation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [octorateRooms, setOctorateRooms] = useState<any[]>([]);
  const [showDevMapping, setShowDevMapping] = useState<boolean>(false);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, { breakfast: boolean; ac: boolean }>>({});

  const [availabilityResults, setAvailabilityResults] = useState<any[]>([]);
  const [isOctorateOffline, setIsOctorateOffline] = useState<boolean>(false);
  const [loadingAvailability, setLoadingAvailability] = useState<boolean>(false);
  const [availabilityChecked, setAvailabilityChecked] = useState<boolean>(false);

  // Gallery Modal State
  const [activeGalleryRoom, setActiveGalleryRoom] = useState<EnrichedAccommodation | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  const stayDays = calculateStayDays(checkIn, checkOut);
  const lowSeason = isLowSeason(checkIn, checkOut);
  const discountInfo = getDiscountInfo(stayDays, lang);
  const isMaxSavings = stayDays >= 30 && lowSeason;

  const t = (key: keyof typeof translations['IT'], variables?: Record<string, string | number>) => {
    let text = translations[lang][key] || translations['IT'][key] || '';
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  const getRoomTitle = (room: any) => {
    if (lang === 'TH' && room.title_th) return room.title_th;
    if (lang === 'DE' && room.title_de) return room.title_de;
    if (lang === 'EN' && room.title_en) return room.title_en;
    if (lang === 'IT' && room.title_it) return room.title_it;
    return room.title || room.name;
  };

  const getRoomDesc = (room: any) => {
    if (lang === 'TH' && room.description_th) return room.description_th;
    if (lang === 'DE' && room.description_de) return room.description_de;
    if (lang === 'EN' && room.description_en) return room.description_en;
    if (lang === 'IT' && room.description_it) return room.description_it;
    return room.description;
  };

  // Load accommodations from Supabase
  useEffect(() => {
    setLoading(true);
    fetchAccommodations()
      .then((data) => {
        setRooms(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading accommodations:", err);
        setError(err.message || "Errore durante il caricamento degli alloggi.");
        setLoading(false);
      });
  }, []);

  // 1. Load live baseline prices and rate plans from Octorate on mount
  useEffect(() => {
    const fetchLiveBaseRates = async () => {
      try {
        const today = new Date().toISOString().substring(0, 10);
        const futureDateObj = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const futureDate = futureDateObj.toISOString().substring(0, 10);

        const res = await fetch(`/api/resort/octorate-grid?dateFrom=${today}&dateTo=${futureDate}`);
        if (res.ok) {
          const payload = await res.json();
          const items = payload && Array.isArray(payload.beGrid) && payload.beGrid.length > 0
            ? payload.beGrid
            : (payload && Array.isArray(payload.grid) ? payload.grid : (payload?.data || []));

          if (Array.isArray(items) && items.length > 0) {
            setOctorateRooms(items);
          }
        }
      } catch (err) {
        console.warn("[Octorate] Failed to load baseline rates on mount:", err);
      }
    };

    fetchLiveBaseRates();
  }, []);

  // 2. Load dynamic date-specific availability and pricing from Octorate whenever dates are set
  useEffect(() => {
    if (checkIn && checkOut && stayDays > 0) {
      console.log(`[Octorate Debug] Querying availability: CheckIn: ${checkIn}, CheckOut: ${checkOut}, Guests: ${guests}`);
      setLoadingAvailability(true);
      setAvailabilityChecked(false);
      checkAvailability(checkIn, checkOut, guests)
        .then((results) => {
          console.log("[Octorate Debug] Availability payload received:", results.length, "items");
          if (Array.isArray(results) && results.length > 0) {
            setAvailabilityResults(results);
            setIsOctorateOffline(false);
          } else {
            console.warn("[Octorate Debug] Availability response is empty or invalid:", results);
            setAvailabilityResults(results || []);
            setIsOctorateOffline(false);
          }
          setAvailabilityChecked(true);
          setLoadingAvailability(false);
        })
        .catch((err) => {
          console.error("[Octorate Debug] checkAvailability failed with network error:", err);
          setIsOctorateOffline(true);
          setAvailabilityResults([]);
          setAvailabilityChecked(true);
          setLoadingAvailability(false);
        });
    } else {
      setAvailabilityResults([]);
      setIsOctorateOffline(false);
      setAvailabilityChecked(false);
    }
  }, [checkIn, checkOut, guests, stayDays]);

  // Gallery keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeGalleryRoom) return;
      if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'Escape') {
        closeGallery();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGalleryRoom, activeImageIndex]);

  const cleanSlug = (s: string): string => {
    if (!s) return '';
    return String(s).toLowerCase().replace(/^\d+_/, '').trim();
  };

  const openGallery = (item: any) => {
    try {
      console.log("Cliccato alloggio:", item);
      if (!item) return;
      setActiveGalleryRoom(item);
      if (typeof setActiveImageIndex === 'function') {
        setActiveImageIndex(0);
      }
      // Gestione sicura dello slug o ID pulito
      const rawSlug = item?.slug || item?.id || 'room';
      const slug = cleanSlug(rawSlug) || 'room';
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('room', slug);
        window.history.pushState(null, '', url.toString());
      }
      console.log("URL aggiornato con successo con slug pulito:", slug);
    } catch (err) {
      console.error("Errore in openGallery:", err);
    }
  };

  const closeGallery = () => {
    setActiveGalleryRoom(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('room')) {
        url.searchParams.delete('room');
        window.history.pushState({}, '', url.toString());
      }
    }
  };

  // Auto-open room gallery modal safely if ?room=slug parameter is present in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && Array.isArray(rooms) && rooms.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        const cleanParam = cleanSlug(roomParam);
        const found = rooms.find(r => r && (cleanSlug(r.slug) === cleanParam || cleanSlug(r.slug).includes(cleanParam) || cleanParam.includes(cleanSlug(r.slug))));
        if (found) {
          setActiveGalleryRoom(found);
          setActiveImageIndex(0);
        }
      }
    }
  }, [rooms]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = activeGalleryRoom ? 'hidden' : '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [activeGalleryRoom]);

  const nextImage = () => {
    if (!activeGalleryRoom) return;
    const imagesList = (Array.isArray(activeGalleryRoom?.images) && activeGalleryRoom.images.length > 0)
      ? activeGalleryRoom.images
      : (activeGalleryRoom?.image_url ? [activeGalleryRoom.image_url] : []);
    if (imagesList.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % imagesList.length);
  };

  const prevImage = () => {
    if (!activeGalleryRoom) return;
    const imagesList = (Array.isArray(activeGalleryRoom?.images) && activeGalleryRoom.images.length > 0)
      ? activeGalleryRoom.images
      : (activeGalleryRoom?.image_url ? [activeGalleryRoom.image_url] : []);
    if (imagesList.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };


  // Enrich dynamically loaded accommodations with live Octorate info
  const enrichedRooms = rooms.map((room) => {
    let finalPriceHigh = room.base_price_high;
    let finalPriceLow = room.base_price_low;
    let isLiveFromOctorate = false;

    if (room.octorateId) {
      const octorateMatch = octorateRooms.find((r) => Number(r.id) === Number(room.octorateId));
      if (octorateMatch) {
        const days = Array.isArray(octorateMatch.days) ? octorateMatch.days : [];
        const validDays = days.filter((d: any) => d.price && d.price > 0);
        if (validDays.length > 0) {
          const avg = Math.round(validDays.reduce((sum: number, d: any) => sum + d.price, 0) / validDays.length);
          if (avg > 0) {
            finalPriceHigh = avg;
            finalPriceLow = Math.round(avg * 0.25);
            isLiveFromOctorate = true;
          }
        } else if (octorateMatch.price && octorateMatch.price > 0) {
          finalPriceHigh = octorateMatch.price;
          finalPriceLow = Math.round(octorateMatch.price * 0.25);
          isLiveFromOctorate = true;
        }
      }
    }

    return {
      ...room,
      base_price_high: finalPriceHigh,
      base_price_low: finalPriceLow,
      isLive: isLiveFromOctorate,
    };
  });

  // Filter accommodations
  const filteredRooms = enrichedRooms.filter((room) => {
    const normalizedActive = (activeCategory || '').toUpperCase();
    const normalizedRoomCat = room.category.toUpperCase();

    if (normalizedActive !== 'TUTTI' && normalizedRoomCat !== normalizedActive) {
      return false;
    }
    if (guests && room.capacity < guests) {
      return false;
    }

    // After availability check: hide rooms that are physically booked/blocked by Octorate.
    // NOTE: If a room is physically free but requires more nights (minStay constraint),
    // we KEEP it in filteredRooms so the guest sees the room with the minStay notice and extend button.
    if (availabilityChecked && !loadingAvailability && !isOctorateOffline && availabilityResults.length > 0 && room.octorateId) {
      const availMatch = availabilityResults.find((a) => String(a.accommodationId) === String(room.octorateId));
      if (availMatch) {
        // If availMatch explicitly reports physically unavailable (booked/closed), filter it out
        if (availMatch.isPhysicallyAvailable === false) {
          return false;
        }
        // If neither available nor physically available (legacy fallback)
        if (!availMatch.available && availMatch.isPhysicallyAvailable === undefined) {
          return false;
        }
      }
    }

    return true;
  });

  const calculateFinalPrice = (item: typeof enrichedRooms[0]) => {
    const staticBasePrice = (isMaxSavings || (stayDays >= 30 && lowSeason))
      ? item.base_price_low
      : item.base_price_high;

    let basePrice = staticBasePrice;
    let isAvailable = true;
    let usingDynamicPrice = false;
    let minStayRequired = 1;
    let isPhysicallyAvailable = true;
    let minStayBlocked = false;

    // Use dynamic availability/price if Octorate is online and we have results
    if (!isOctorateOffline && availabilityResults.length > 0 && item.octorateId) {
      const availMatch = availabilityResults.find((a) => String(a.accommodationId) === String(item.octorateId));
      if (availMatch) {
        minStayRequired = availMatch.minStayRequired || 1;
        isPhysicallyAvailable = availMatch.isPhysicallyAvailable !== undefined ? availMatch.isPhysicallyAvailable : availMatch.available;
        
        if (availMatch.available) {
          basePrice = availMatch.pricePerNight || (stayDays > 0 ? (availMatch.totalPrice / stayDays) : staticBasePrice);
          usingDynamicPrice = true;
          isAvailable = true;
        } else {
          isAvailable = false;
          // Room is physically available, but blocked ONLY because stayDays < minStayRequired
          if (isPhysicallyAvailable && stayDays < minStayRequired) {
            minStayBlocked = true;
            if (availMatch.pricePerNight && availMatch.pricePerNight > 0) {
              basePrice = availMatch.pricePerNight;
              usingDynamicPrice = true;
            }
          }
        }
      }
    }

    const discountedPrice = basePrice * (1 - discountInfo.discount);

    // Floor price check
    if (item.octorateId) {
      const octorateMatch = octorateRooms.find((r) => r.id === item.octorateId);
      if (octorateMatch && octorateMatch.minimumSellingPrice) {
        if (usingDynamicPrice && basePrice < octorateMatch.minimumSellingPrice) {
          console.warn(`[Octorate Warning] Dynamic price (${basePrice} THB) for ${item.name} is lower than safety floor (${octorateMatch.minimumSellingPrice} THB). Forcing safety floor.`);
          basePrice = octorateMatch.minimumSellingPrice;
        }
      }
    }

    return {
      original: item.base_price_high,
      basePriceLordo: basePrice,
      final: Math.round(discountedPrice),
      perNight: Math.round(discountedPrice),
      total: stayDays > 0 ? Math.round(discountedPrice * stayDays) : 0,
      savings: isMaxSavings
        ? Math.round((item.base_price_high - discountedPrice) / item.base_price_high * 100)
        : Math.round(discountInfo.discount * 100),
      isAvailable,
      minStayBlocked,
      minStayRequired,
      isPhysicallyAvailable,
      usingDynamicPrice
    };
  };

  const appliedPromo = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const promoFromUrl = urlParams.get('promo');
    const promoFromStorage = sessionStorage.getItem('fpv_applied_promo_code');
    const code = promoFromUrl || promoFromStorage;
    if (!code) return null;
    const list = promoCodes || [];
    return list.find(p => p.code.toUpperCase() === code.trim().toUpperCase() && (p.active !== false)) || null;
  }, [promoCodes]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 w-full">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-emerald-800 rounded-full animate-spin mb-4"></div>
        <p className="text-stone-500 font-serif italic text-base">
          {lang === 'TH' ? 'กำลังโหลดข้อมูลที่พัก...' : lang === 'DE' ? 'Unterkünfte werden geladen...' : lang === 'EN' ? 'Loading accommodations...' : 'Caricamento alloggi in corso...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-red-50/50 rounded-3xl border border-red-200 p-8 w-full">
        <p className="text-red-800 text-lg font-bold">
          {lang === 'TH' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : lang === 'DE' ? 'Verbindungsfehler' : lang === 'EN' ? 'Connection error' : 'Errore di connessione'}
        </p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }



  if (filteredRooms.length === 0) {
    return (
      <div className="text-center py-16 bg-stone-50 rounded-2xl border border-stone-300 p-8 w-full">
        <p className="text-muted-foreground text-lg">
          {lang === 'TH' ? 'ไม่พบที่พักที่ตรงกับเงื่อนไขที่คุณเลือก' : lang === 'DE' ? 'Keine Unterkunft erfüllt die ausgewählten Suchkriterien.' : lang === 'EN' ? 'No accommodation matches your selected criteria.' : 'Nessun alloggio soddisfa i criteri di ricerca selezionati.'}
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="mt-4 text-primary font-semibold text-sm hover:underline"
          >
            {t('resetFilters')}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRooms.map((item) => {
          // V30: Guard for valid dates check
          const hasValidDates = Boolean(checkIn && checkOut && stayDays > 0);
          const isDateSelected = hasValidDates;
          const isUnlocked = isDateSelected && guests > 0 && availabilityChecked && !loadingAvailability;
          const pricing = calculateFinalPrice(item);
          
          // Retrieve local extras selection for this specific room
          const extras = selectedExtras[item.id] || { breakfast: false, ac: false };
          
          // Extra guests surcharge
          const extraGuests = Math.min(item.maxExtraGuests, Math.max(0, guests - item.baseGuests));
          const extraGuestsPricePerNight = extraGuests * PRICE_CONFIG.EXTRA_GUEST_PRICE;
          const extraGuestsPrice = hasValidDates ? extraGuestsPricePerNight * stayDays : 0;
          
          // Calculate extras pricing
          const breakfastPrice = (hasValidDates && extras.breakfast) ? (PRICE_CONFIG.BREAKFAST_PRICE * guests * stayDays) : 0;
          const acPrice = (hasValidDates && extras.ac) ? PRICE_CONFIG.AC_SURCHARGE : 0;
          
          let directDiscountAmount = 0;
          let promoDiscountAmount = 0;
          let totalDiscountAmount = 0;
          let roomAndGuestsTotalLordo = 0;
          let roomAndGuestsTotalNetto = 0;
          let finalTotalPrice = 0;
          let finalNightlyPrice = pricing.basePriceLordo || item.base_price_high;

          if (hasValidDates) {
            // Room and extra guests total (Lordo)
            roomAndGuestsTotalLordo = (pricing.basePriceLordo + extraGuestsPricePerNight) * stayDays;

            if (appliedPromo) {
              // EXCLUSIVITY (V26/V28): Direct stay discount is FORCED to 0 when promo coupon is active
              directDiscountAmount = 0;
              if (appliedPromo.discountType === 'percentage') {
                promoDiscountAmount = Math.round(roomAndGuestsTotalLordo * (appliedPromo.discountValue / 100));
              } else if (appliedPromo.discountType === 'fixed') {
                promoDiscountAmount = Math.min(roomAndGuestsTotalLordo, appliedPromo.discountValue);
              }
            } else {
              directDiscountAmount = Math.round(roomAndGuestsTotalLordo * discountInfo.discount);
              promoDiscountAmount = 0;
            }

            totalDiscountAmount = appliedPromo ? promoDiscountAmount : directDiscountAmount;
            roomAndGuestsTotalNetto = Math.max(0, roomAndGuestsTotalLordo - totalDiscountAmount);

            // Grand total with extras (breakfast and AC surcharges added undiscounted)
            finalTotalPrice = roomAndGuestsTotalNetto + breakfastPrice + acPrice;

            // Prezzo per notte scontato comprensivo di supplemento ospiti extra (per il compact view)
            const effectiveDiscountRate = appliedPromo
              ? (roomAndGuestsTotalLordo > 0 ? promoDiscountAmount / roomAndGuestsTotalLordo : 0)
              : discountInfo.discount;
            finalNightlyPrice = Math.round((pricing.basePriceLordo + extraGuestsPricePerNight) * (1 - effectiveDiscountRate));
          } else {
            // V30: Bypassed when dates are missing: static base room rate, zero discounts
            directDiscountAmount = 0;
            promoDiscountAmount = 0;
            totalDiscountAmount = 0;
            roomAndGuestsTotalLordo = pricing.basePriceLordo || item.base_price_high;
            roomAndGuestsTotalNetto = roomAndGuestsTotalLordo;
            finalTotalPrice = roomAndGuestsTotalLordo;
            finalNightlyPrice = pricing.basePriceLordo || item.base_price_high;
          }

          const pricingWithExtras = hasValidDates ? {
            ...pricing,
            final: finalNightlyPrice,
            extraGuests: extraGuestsPrice,
            breakfast: breakfastPrice,
            ac: acPrice,
            total: finalTotalPrice,
            roomAndGuestsTotalNetto: roomAndGuestsTotalNetto,
            discountAmount: totalDiscountAmount,
            directDiscountAmount,
            promoDiscountAmount,
            totalLordo: roomAndGuestsTotalLordo + breakfastPrice + acPrice
          } : null;

          const toggleExtra = (roomId: string, type: 'breakfast' | 'ac') => {
            setSelectedExtras((prev) => {
              const current = prev[roomId] || { breakfast: false, ac: false };
              return {
                ...prev,
                [roomId]: {
                  ...current,
                  [type]: !current[type]
                }
              };
            });
          };

          const isExpanded = isUnlocked && expandedRoomId === item.id;

          const handleScrollToCalendar = (cardEl: HTMLElement | null) => {
            // Usa getElementById per trovare ESATTAMENTE la sticky search bar,
            // evitando di intercettare altri <form> presenti nel DOM del sito madre
            const searchForm = document.getElementById('booking-search-form') as HTMLElement | null;
            if (!searchForm) return;

            // Scroll the form (sticky bar) into viewport first
            const formRect = searchForm.getBoundingClientRect();
            const scrollTop = window.scrollY + formRect.top;
            window.scrollTo({ top: scrollTop, behavior: 'smooth' });

            // If we have the card element, after scroll settle, position the window
            // so the calendar bar sits exactly ~10px above the card (1 cm)
            if (cardEl) {
              setTimeout(() => {
                const cardRect = cardEl.getBoundingClientRect();
                const formHeight = searchForm.offsetHeight;
                // Target: card should appear ~38px below the sticky form bottom
                const targetScroll = window.scrollY + cardRect.top - formHeight - 38;
                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
              }, 400);
            }

            // Apply pulse-highlight animation to the form
            setTimeout(() => {
              searchForm.classList.add('pulse-highlight');
              setTimeout(() => {
                searchForm.classList.remove('pulse-highlight');
              }, 2000);
            }, 300);
          };

          return (
            <article
              key={item.id}
              className="bg-stone-50 rounded-[2rem] border border-stone-300 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col group will-change-transform"
            >
              {/* IMAGE HEADER - CLICKABLE GALLERY POPUP */}
              <div 
                onClick={() => openGallery(item)}
                className="relative h-64 bg-stone-300 overflow-hidden flex-shrink-0 rounded-t-[2rem] cursor-pointer group/image"
              >
                {item.images && item.images.length > 0 ? (
                  <>
                    <img
                      src={item.images[0]}
                      alt={getRoomTitle(item)}
                      className="object-cover w-full h-full group-hover:scale-105 transition-all duration-500 brightness-[0.96] contrast-[1.03]"
                    />
                    {/* Vertical gradient overlay: darkens only the edges (top/bottom) for badges legibility, keeping center clear and bright */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35 pointer-events-none transition-opacity duration-300 group-hover/image:opacity-80" />
                    
                    {/* Stylish Hover Gallery Overlay */}
                    <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white gap-2 font-semibold text-xs backdrop-blur-[2px]">
                      <div className="p-3 bg-stone-900/90 rounded-full border border-stone-700 shadow-lg scale-90 group-hover/image:scale-100 transition-transform duration-300">
                        <ImageIcon className="w-5 h-5 text-white" />
                      </div>
                      <span className="tracking-wide uppercase text-[10px]">
                        {lang === 'TH' ? `ดูแกลเลอรี่ (${item.images.length})` : lang === 'DE' ? `Galerie ansehen (${item.images.length})` : lang === 'EN' ? `View Gallery (${item.images.length})` : `Vedi Galleria (${item.images.length})`}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-stone-300 text-muted-foreground p-4 border-b border-stone-400">
                    <span className="font-serif italic text-sm text-muted-foreground tracking-wide">
                      Photos coming soon
                    </span>
                  </div>
                )}
                <span className={`absolute top-4 left-4 bg-emerald-800/95 border border-emerald-650/60 text-white text-[9px] font-extrabold tracking-wider px-3 py-1.5 rounded-xl shadow-md backdrop-blur-md ${item.category.toUpperCase() !== "THE HUB GUESTHOUSE" ? "uppercase" : ""}`}>
                  {item.category.toUpperCase() === "THE HUB GUESTHOUSE" ? "HUBit@" : item.category}
                </span>

                {/* Capacity badge — bottom right of image */}
                <span className="absolute bottom-4 right-4 bg-emerald-800/95 border border-emerald-650/60 text-white text-[9px] font-extrabold tracking-wider px-3 py-1.5 rounded-xl shadow-md backdrop-blur-md flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {lang === 'TH' ? `สูงสุด ${item.capacity} ท่าน` : lang === 'DE' ? `Bis zu ${item.capacity} Gäste` : lang === 'EN' ? `Up to ${item.capacity} guests` : `Fino a ${item.capacity} ospiti`}
                </span>

                {/* MinStay / Gap-Fill Dynamic Badge — bottom left of image */}
                {isUnlocked && pricing.minStayBlocked && (
                  <span className="absolute bottom-4 left-4 bg-amber-600/95 border border-amber-400/60 text-white text-[9px] font-black tracking-wider px-3 py-1.5 rounded-xl shadow-md backdrop-blur-md flex items-center gap-1 animate-pulse">
                    ℹ️ {lang === 'TH' ? `ขั้นต่ำ ${pricing.minStayRequired} คืน` : lang === 'DE' ? `Min. ${pricing.minStayRequired} Nächte` : lang === 'EN' ? `Min. ${pricing.minStayRequired} nights` : `Minimo ${pricing.minStayRequired} notti`}
                  </span>
                )}
                {isUnlocked && pricing.isAvailable && stayDays === 1 && (
                  <span className="absolute bottom-4 left-4 bg-emerald-600/95 border border-emerald-400/60 text-white text-[9px] font-black tracking-wider px-3 py-1.5 rounded-xl shadow-md backdrop-blur-md flex items-center gap-1">
                    ⚡ {lang === 'TH' ? 'จองได้ 1 คืน (Gap-Fill)' : lang === 'DE' ? '1 Nacht Buchbar' : lang === 'EN' ? '1 Night Available' : 'Disponibile 1 Notte'}
                  </span>
                )}
 
                {isUnlocked && discountInfo.label && (
                  <span className={`absolute top-4 right-4 ${discountInfo.color} text-white text-[9px] font-bold tracking-wider px-3 py-1.5 rounded-xl shadow-sm uppercase`}>
                    {discountInfo.label.split(' ')[0]} {discountInfo.label.match(/\(-?\d+%\)/)?.[0]}
                  </span>
                )}
              </div>

              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-sans text-lg font-bold text-stone-900 leading-tight tracking-tight">
                    {getRoomTitle(item)}
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs font-light leading-relaxed mb-4 flex-grow">
                  {getRoomDesc(item)}
                </p>

                <p className="text-stone-500 text-[11px] font-medium mb-3">
                  {t('beds')}: {item.beds}
                </p>




                {!isUnlocked ? (
                  /* ================= STATO LOCKED ================= */
                  <div className="mt-auto pt-4 border-t border-stone-300">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        id={`btn-select-dates-room-${item.id}`}
                        onClick={(e) => handleScrollToCalendar(e.currentTarget.closest('article'))}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white text-xs font-bold py-3 px-3 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all duration-300 cursor-pointer text-center tracking-wide leading-tight flex flex-col items-center justify-center"
                      >
                        {loadingAvailability ? (
                          <span>{lang === 'TH' ? 'กำลังตรวจสอบ...' : lang === 'DE' ? 'Verfügbarkeit...' : lang === 'EN' ? 'Checking...' : 'Verifica disponibilità...'}</span>
                        ) : (
                          <>
                            <span>{lang === 'TH' ? 'เลือกวันเข้าพัก' : lang === 'DE' ? 'Termine wählen' : lang === 'EN' ? 'Select dates' : 'Seleziona date'}</span>
                            <span className="text-[10px] font-normal opacity-90">{lang === 'TH' ? 'เพื่อดูราคา' : lang === 'DE' ? 'für den Preis' : lang === 'EN' ? 'for price' : 'per il prezzo'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        id={`btn-view-details-room-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openGallery(item);
                        }}
                        className="bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white text-xs font-bold py-3 px-4 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all duration-300 cursor-pointer text-center tracking-wide flex items-center justify-center"
                        title={lang === 'TH' ? 'ดูรายละเอียด' : lang === 'DE' ? 'Details anzeigen' : lang === 'EN' ? 'View details' : 'Vedi dettagli'}
                      >
                        <span>{lang === 'TH' ? 'รายละเอียด' : lang === 'DE' ? 'Details' : lang === 'EN' ? 'View details' : 'Vedi dettagli'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ================= STATO UNLOCKED ================= */
                  <div className="flex flex-col flex-grow mt-auto pt-4 border-t border-stone-300">
                    {isExpanded && (
                      <div className="mb-6 bg-stone-200/40 p-4 rounded-2xl border border-stone-300/50 space-y-4">
                        <span className="block text-[9px] uppercase tracking-wider text-stone-500 font-extrabold mb-1">
                          {t('extraServicesTitle' as any)}:
                        </span>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExtra(item.id, 'breakfast')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-[10px] font-bold transition-all duration-200 cursor-pointer shadow-sm ${
                              extras.breakfast
                                ? "bg-emerald-800 border-emerald-800 text-white"
                                : "bg-white border-stone-300 text-stone-600 hover:bg-stone-100/50"
                            }`}
                          >
                            <Coffee className="w-3.5 h-3.5" />
                            <span>{lang === 'TH' ? 'อาหารเช้า' : lang === 'DE' ? 'Frühstück' : lang === 'EN' ? 'Breakfast' : 'Colazione'}</span>
                          </button>

                          {/* AC toggle — hidden for Tende Glamping (no AC available) */}
                          {item.category.toUpperCase() !== 'TENDE GLAMPING' && (
                            <button
                              type="button"
                              onClick={() => toggleExtra(item.id, 'ac')}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-[10px] font-bold transition-all duration-200 cursor-pointer shadow-sm ${
                                extras.ac
                                  ? "bg-emerald-800 border-emerald-800 text-white"
                                  : "bg-white border-stone-300 text-stone-600 hover:bg-stone-100/50"
                              }`}
                            >
                              <Wind className="w-3.5 h-3.5" />
                              <span>{lang === 'TH' ? 'แอร์' : lang === 'DE' ? 'Klima' : lang === 'EN' ? 'A/C' : 'Aria Cond.'}</span>
                            </button>
                          )}
                        </div>

                        {/* DETAILED PRICE BREAKDOWN INSIDE THE DRAWER (V30 Safe Guard) */}
                        {hasValidDates && pricingWithExtras ? (
                          <div className="space-y-2 pt-3 border-t border-stone-300 text-xs">
                            <span className="block text-[9px] uppercase tracking-wider text-stone-500 font-extrabold mb-1">
                              {lang === 'TH' ? 'รายละเอียดค่าใช้จ่าย' : lang === 'DE' ? 'Kostenaufstellung' : lang === 'EN' ? 'Cost Breakdown' : 'Dettaglio Costi:'}
                            </span>
                            <div className="space-y-1.5 text-stone-600 font-medium">
                              <div className="flex justify-between">
                                <span>
                                  {lang === 'TH' ? `ที่พัก (${stayDays} คืน):` : lang === 'DE' ? `Unterkunft (${stayDays} ${stayDays === 1 ? 'Nacht' : 'Nächte'}):` : lang === 'EN' ? `Accommodation (${stayDays} ${stayDays === 1 ? 'night' : 'nights'}):` : `Alloggio (${stayDays} ${stayDays === 1 ? 'notte' : 'notti'}):`}
                                </span>
                                <span>{formatPrice(pricing.basePriceLordo * stayDays)}</span>
                              </div>
                              
                              {extraGuests > 0 && (
                                <div className="flex justify-between">
                                  <span>{lang === 'TH' ? `ผู้เข้าพักเพิ่มเติม (${extraGuests} ท่าน):` : lang === 'DE' ? `Zusätzliche Gäste (${extraGuests} Pers.):` : lang === 'EN' ? `Extra guests (${extraGuests} pers.):` : `Ospiti aggiuntivi (${extraGuests} pers.):`}</span>
                                  <span>{formatPrice(extraGuestsPrice)}</span>
                                </div>
                              )}
                              
                              {extras.breakfast && (
                                <div className="flex justify-between">
                                  <span>{lang === 'TH' ? 'อาหารเช้า:' : lang === 'DE' ? 'Frühstück:' : lang === 'EN' ? 'Breakfast:' : 'Colazione:'}</span>
                                  <span>{formatPrice(breakfastPrice)}</span>
                                </div>
                              )}
                              
                              {extras.ac && (
                                <div className="flex justify-between">
                                  <span>{lang === 'TH' ? 'เครื่องปรับอากาศ:' : lang === 'DE' ? 'Klimaanlage:' : lang === 'EN' ? 'Air Conditioning:' : 'Aria Condizionata:'}</span>
                                  <span>{formatPrice(acPrice)}</span>
                                </div>
                              )}

                               <div className="flex justify-between font-bold border-t border-dashed border-stone-300 pt-1.5 text-stone-700">
                                 <span>{lang === 'TH' ? 'ยอดรวมก่อนส่วนลด:' : lang === 'DE' ? 'Brutto-Zwischensumme:' : lang === 'EN' ? 'Gross Subtotal:' : 'Subtotale Lordo:'}</span>
                                 <span>{formatPrice(pricingWithExtras.totalLordo)}</span>
                               </div>

                               {appliedPromo ? (
                                 <div className="flex justify-between text-fuchsia-700 font-bold">
                                   <span>🎟️ Coupon ({appliedPromo.code}):</span>
                                   <span>-{formatPrice(promoDiscountAmount)}</span>
                                 </div>
                               ) : (
                                 directDiscountAmount > 0 && (
                                   <div className="flex justify-between text-emerald-700 font-bold">
                                     <span>Sconto Diretto (-{Math.round(discountInfo.discount * 100)}%):</span>
                                     <span>-{formatPrice(directDiscountAmount)}</span>
                                   </div>
                                 )
                               )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 text-center text-xs text-stone-600 italic bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1">
                            <span className="block font-bold text-amber-900 not-italic">
                              {lang === 'TH' ? '📅 โปรดเลือกวันที่เข้าพัก' : lang === 'DE' ? '📅 Bitte Aufenthaltsdaten wählen' : lang === 'EN' ? '📅 Select stay dates' : '📅 Seleziona le date del soggiorno'}
                            </span>
                            <span className="block text-[11px] text-amber-750">
                              {lang === 'TH' ? 'เลือกวันเช็คอินและเช็คเอาท์เพื่อคำนวณรายละเอียดราคาแบบเรียลไทม์' : lang === 'DE' ? 'Wählen Sie An- und Abreisedaten zur Berechnung der Kostenaufstellung.' : lang === 'EN' ? 'Select check-in and check-out dates to calculate live cost breakdown.' : 'Inserisci check-in e check-out per calcolare il dettaglio costi in tempo reale.'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5 flex-wrap">
                          {isExpanded ? (lang === 'TH' ? 'ยอดรวมทั้งหมด' : lang === 'DE' ? 'Gesamtpreis' : lang === 'EN' ? 'Grand Total' : 'Totale Finito') : t('pricePerNight')}
                          {item.isLive && !isOctorateOffline && (
                            <span className="inline-block bg-emerald-100 text-emerald-800 text-[8px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-400/20 backdrop-blur-sm shadow-sm animate-pulse">
                              Live Octorate
                            </span>
                          )}
                          {isOctorateOffline && item.octorateId && (
                            <span className="inline-block bg-amber-100 text-amber-800 text-[8px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-amber-400/20 backdrop-blur-sm shadow-sm">
                              {lang === 'TH' ? 'ราคาออฟไลน์' : lang === 'DE' ? 'Offline-Tarif' : lang === 'EN' ? 'Offline rate' : 'Tariffa offline'}
                            </span>
                          )}
                        </span>
                        
                        {pricing.isAvailable ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-baseline gap-2">
                              {isExpanded ? (
                                <>
                                  <span className="text-xl font-extrabold text-emerald-800">
                                    {formatPrice(pricingWithExtras.total)}
                                  </span>
                                  {pricingWithExtras.discountAmount > 0 && (
                                    <span className="text-xs line-through text-stone-400">
                                      {formatPrice(pricingWithExtras.totalLordo)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="text-xl font-extrabold text-stone-900">
                                    {formatPrice(pricingWithExtras.final)}
                                  </span>
                                  {pricing.savings > 0 && (
                                    <span className="text-xs line-through text-stone-400">
                                      {formatPrice(Math.round(pricing.basePriceLordo + extraGuestsPricePerNight))}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            {!isExpanded && (
                              <p className="text-primary font-bold text-xs">
                                {lang === 'IT' && <>Totale: <span className="text-emerald-700 font-extrabold">{formatPrice(pricingWithExtras.total)}</span> ({stayDays} notti)</>}
                                {lang === 'EN' && <>Total: <span className="text-emerald-700 font-extrabold">{formatPrice(pricingWithExtras.total)}</span> ({stayDays} nights)</>}
                                {lang === 'TH' && <>รวม: <span className="text-emerald-700 font-extrabold">{formatPrice(pricingWithExtras.total)}</span> ({stayDays} คืน)</>}
                                {lang === 'DE' && <>Gesamt: <span className="text-emerald-700 font-extrabold">{formatPrice(pricingWithExtras.total)}</span> ({stayDays} Nächte)</>}
                                {pricing.savings > 0 && (
                                  <span className="text-emerald-600 ml-1.5 font-extrabold">
                                    -{pricing.savings}%
                                  </span>
                                )}
                              </p>
                            )}
                          </div>
                        ) : pricing.minStayBlocked ? (
                          <div className="py-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-extrabold text-stone-900">
                                {formatPrice(pricingWithExtras ? pricingWithExtras.final : pricing.final)}
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium">
                                /{lang === 'TH' ? 'คืน' : lang === 'DE' ? 'Nacht' : lang === 'EN' ? 'night' : 'notte'}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300/80 px-2.5 py-0.5 rounded-lg mt-1">
                              ℹ️ {lang === 'TH' ? `ขั้นต่ำ ${pricing.minStayRequired} คืน` : lang === 'DE' ? `Mindestaufenthalt: ${pricing.minStayRequired} Nächte` : lang === 'EN' ? `Minimum stay: ${pricing.minStayRequired} nights` : `Soggiorno minimo: ${pricing.minStayRequired} notti`}
                            </span>
                          </div>
                        ) : (
                          <div className="py-2">
                            <span className="inline-block text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
                              {lang === 'TH' ? 'ไม่ว่างในช่วงนั้น' : lang === 'DE' ? 'Nicht verfügbar' : lang === 'EN' ? 'Not available' : 'Non disponibile'}
                            </span>
                          </div>
                        )}
                      </div>

                      {pricing.isAvailable ? (
                        isExpanded ? (
                          <button
                            onClick={() => onSelectRoom && onSelectRoom(item, pricingWithExtras, extras)}
                            className="bg-stone-900 hover:bg-emerald-700 text-white text-xs font-semibold px-6 py-3 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all duration-300 hover:px-7 cursor-pointer"
                          >
                             {lang === 'TH' ? 'ยืนยัน' : lang === 'DE' ? 'Bestätigen' : lang === 'EN' ? 'Confirm' : 'Conferma'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setExpandedRoomId(item.id)}
                            className="bg-stone-900 hover:bg-emerald-700 text-white text-xs font-semibold px-6 py-3 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all duration-300 hover:px-7 cursor-pointer"
                          >
                             {lang === 'TH' ? 'ดูตัวเลือก' : lang === 'DE' ? 'Konfigurieren' : lang === 'EN' ? 'Configure' : 'Configura'}
                          </button>
                        )
                      ) : pricing.minStayBlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onExtendStay) {
                              onExtendStay(pricing.minStayRequired);
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all duration-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                          title={lang === 'IT' ? `Estendi il soggiorno a ${pricing.minStayRequired} notti per prenotare` : `Extend stay to ${pricing.minStayRequired} nights to book`}
                        >
                          <span>➕ {lang === 'TH' ? `เพิ่มเป็น ${pricing.minStayRequired} คืน` : lang === 'DE' ? `Auf ${pricing.minStayRequired} Nächte` : lang === 'EN' ? `Extend to ${pricing.minStayRequired} nights` : `Estendi a ${pricing.minStayRequired} notti`}</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="bg-stone-200 text-stone-400 text-xs font-semibold px-6 py-3 rounded-full cursor-not-allowed pointer-events-none border border-stone-300 shadow-none"
                        >
                           {lang === 'TH' ? 'ไม่ว่าง' : lang === 'DE' ? 'Nicht verfügbar' : lang === 'EN' ? 'Not Available' : 'Non Disponibile'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* FULL-SCREEN IMMERSIVE TROPICAL GLASSMORPHISM MODAL */}
      {Boolean(activeGalleryRoom) && (() => {
        const roomImages = (Array.isArray(activeGalleryRoom?.images) && activeGalleryRoom.images.length > 0)
          ? activeGalleryRoom.images
          : (activeGalleryRoom?.image_url ? [activeGalleryRoom.image_url] : ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80']);
        const bgImage = roomImages[0];
        return (
          <div className="fixed inset-0 z-[99999] w-screen h-screen flex flex-col lg:flex-row bg-stone-950/80 backdrop-blur-md overflow-hidden">
            
            {/* TROPICAL GLASSMORPHISM BLURRED BACKGROUND IMAGE */}
            {bgImage && (
              <img 
                src={bgImage} 
                className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 pointer-events-none scale-110 -z-10" 
                alt="" 
              />
            )}

          {/* Close button (floating top right) */}
          <button
            onClick={closeGallery}
            className="fixed top-4 right-4 md:top-6 md:right-6 p-3 rounded-full bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white cursor-pointer transition-all duration-200 z-[120] shadow-2xl hover:scale-105 active:scale-95"
            title={lang === 'IT' ? 'Chiudi' : 'Close'}
          >
            <X className="w-6 h-6" />
          </button>

          {/* LEFT PANEL: Full-Height Gallery (60% width desktop, 45% height mobile) */}
          <div className="w-full lg:w-3/5 h-[45vh] lg:h-full relative bg-black/40 flex flex-col justify-between p-4 lg:p-8 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-stone-800/80 z-10">
            
            {/* Main Image Container */}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
              
              {/* Left Arrow */}
              {roomImages.length > 1 && (
                <button
                  onClick={prevImage}
                  className="absolute left-2 md:left-4 p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white border border-stone-800/60 cursor-pointer transition-all duration-200 z-10 hover:scale-105 active:scale-95 shadow-xl"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Main Image */}
              <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-2xl bg-stone-950/30">
                <img
                  src={roomImages[activeImageIndex] || roomImages[0]}
                  alt={`${activeGalleryRoom ? getRoomTitle(activeGalleryRoom) : 'Room'} - ${activeImageIndex + 1}`}
                  className="max-h-full max-w-full object-contain rounded-2xl transition-all duration-300 shadow-2xl"
                />
              </div>

              {/* Right Arrow */}
              {roomImages.length > 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-2 md:right-4 p-3 rounded-full bg-stone-900/80 hover:bg-stone-800 text-white border border-stone-800/60 cursor-pointer transition-all duration-200 z-10 hover:scale-105 active:scale-95 shadow-xl"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Thumbnails Row (Bottom of Left Panel) */}
            {roomImages.length > 0 && (
              <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-2 px-2 no-scrollbar flex-shrink-0 mt-3">
                {roomImages.map((src: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative w-16 h-12 md:w-20 md:h-14 flex-shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                      i === activeImageIndex
                        ? "border-emerald-500 scale-105 shadow-md shadow-emerald-500/20 opacity-100"
                        : "border-stone-800 opacity-40 hover:opacity-100 hover:scale-102"
                    }`}
                  >
                    <img
                      src={src}
                      alt={`preview-${i}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Scrollable Info & Features Panel with Glassmorphism */}
          <div className="w-full lg:w-2/5 h-[55vh] lg:h-full overflow-y-auto p-6 lg:p-10 bg-stone-950/40 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-white/5 space-y-6 relative z-10">
            {/* Header Info */}
            <div className="space-y-3 pr-8">
              {activeGalleryRoom?.category && (
                <span className="inline-block px-3 py-1 bg-stone-800/80 border border-stone-700 text-emerald-400 font-extrabold text-[10px] rounded-lg uppercase tracking-widest">
                  {activeGalleryRoom.category}
                </span>
              )}
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-sans font-black text-white tracking-tight leading-tight">
                {activeGalleryRoom ? getRoomTitle(activeGalleryRoom) : ''}
              </h3>
              <p className="text-stone-300 text-sm md:text-base font-normal leading-relaxed">
                {activeGalleryRoom ? getRoomDesc(activeGalleryRoom) : ''}
              </p>
              {roomImages.length > 0 && (
                <div className="pt-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-stone-950/80 text-[10px] md:text-xs text-stone-400 border border-stone-800/80 uppercase font-extrabold tracking-widest">
                    📷 Foto {activeImageIndex + 1} di {roomImages.length}
                  </span>
                </div>
              )}
            </div>

            {/* ROOM FEATURES GRID COMPONENT */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-300 border-b border-stone-800 pb-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {String(lang).toLowerCase() === 'it' ? 'Servizi & Caratteristiche Alloggio' : String(lang).toLowerCase() === 'de' ? 'Ausstattung & Merkmale' : String(lang).toLowerCase() === 'th' ? 'สิ่งอำนวยความสะดวกและลักษณะห้อง' : 'Room Features & Amenities'}
                </span>
              </h4>
              <RoomFeaturesGrid
                features={activeGalleryRoom?.features || activeGalleryRoom?.details?.features}
                details={activeGalleryRoom?.details}
                lang={lang}
              />
            </div>
          </div>

        </div>
        );
      })()}
    </>
  );
};

