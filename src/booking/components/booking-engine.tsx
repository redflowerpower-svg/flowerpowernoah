import { useState, useMemo, useEffect, useRef } from "react"
import { formatDisplayDate } from "../../lib/dateUtils"
import VillageSlideshow from "../../components/VillageSlideshow"
import '../booking.css'

import {
  Wifi,
  Users,
  Calendar,
  Coffee,
  ChevronDown,
  Globe,
  ShieldCheck,
  Percent,
  Grid,
  Home,
  Trees,
  Tent,
  Bed,
  Waves,
  Flower,
  Dumbbell,
  HelpingHand,
  Wind,
  X,
  QrCode,
  CreditCard,
  Wallet,
  Banknote
} from "lucide-react"
import { getAuthorizationUrl, isAuthenticated, exchangeToken, clearTokens } from "../lib/octorate"
import { RoomGrid } from "../resort/components/RoomGrid"
import { ACCOMMODATIONS, PRICE_CONFIG } from "../resort/config/accommodations"
import { translations, Language } from "../lib/translations"
import { getBaselineMinStay } from "../../admin/resort/lib/octorateAdmin"
import { calculatePaymentTotal } from "../../lib/paymentCalculations"

const CATEGORY_ITEMS = [
  { name: "Tutti", label: "TUTTI", desc: "Esplora il villaggio", icon: Grid },
  { name: "Ville", label: "VILLE", desc: "Lusso e privacy", icon: Home },
  { name: "Bungalow", label: "BUNGALOW", desc: "Immersi nel verde", icon: Trees },
  { name: "Tende Glamping", label: "GLAMPING", desc: "Natura e comfort", icon: Tent },
  { name: "The Hub Guesthouse", label: "HUBit@", desc: "The Coworking GuestHouse", icon: Bed },
]

function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  const parts = dateStr.split('-')
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const d = parseInt(parts[2], 10)
  return new Date(y, (m || 1) - 1, d || 1)
}

function calculateStayDays(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0
  const start = parseLocalDate(checkIn)
  const end = parseLocalDate(checkOut)
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

function isLowSeason(checkIn: string, checkOut: string): boolean {
  if (!checkIn || !checkOut) return false
  const start = parseLocalDate(checkIn)
  const end = parseLocalDate(checkOut)
  const lowSeasonMonths = [4, 5, 6, 7, 8, 9]
  const startMonth = start.getMonth()
  const endMonth = end.getMonth()
  return lowSeasonMonths.includes(startMonth) || lowSeasonMonths.includes(endMonth)
}

function getDiscountInfo(days: number): { label: string; discount: number; color: string } {
  if (days >= 30) {
    return { label: "Tariffa Long-Term Coliving (-20%)", discount: 0.20, color: "bg-emerald-600" }
  } else if (days >= 15) {
    return { label: "Sconto Medium-Stay (-15%)", discount: 0.15, color: "bg-emerald-500" }
  } else if (days > 0) {
    return { label: "Prezzo Diretto Garantito (-10%)", discount: 0.10, color: "bg-primary" }
  }
  return { label: "", discount: 0, color: "" }
}


interface BookingEngineProps {
  lang?: Language;
  setLang?: (l: Language) => void;
}

export default function BookingEngine({ lang: propLang, setLang: propSetLang }: BookingEngineProps = {}) {

  const [localLang, setLocalLang] = useState<Language>('IT');
  const lang = propLang || localLang;
  const setLang = propSetLang || setLocalLang;

  const t = (key: keyof typeof translations['IT'], variables?: Record<string, string | number>) => {
    let text = translations[lang][key] || translations['IT'][key] || '';
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  useEffect(() => {
    const browserLang = navigator.language.slice(0, 2).toUpperCase()
    if (['IT', 'EN', 'TH', 'DE'].includes(browserLang)) {
      setLang(browserLang as Language)
    } else {
      setLang('EN')
    }
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [guests, setGuests] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState("Tutti")

  // Checkout & Payment states
  const checkoutSectionRef = useRef<HTMLDivElement | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null)
  const [selectedPricing, setSelectedPricing] = useState<any | null>(null)
  const [checkoutData, setCheckoutData] = useState({ name: "", email: "", phone: "", requests: "" })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'ksher' | 'paypal' | 'bank_transfer'>('ksher')
  const [isBooked, setIsBooked] = useState(false)
  const [bookingId, setBookingId] = useState("")
  const [stripeSessionId, setStripeSessionId] = useState("")

  // Promo Code States (V22)
  const [promoInput, setPromoInput] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null)

  // Verified booking financial data state (V23 Fix for 0 THB bug)
  const [verifiedBooking, setVerifiedBooking] = useState<{
    finalTotal: number;
    depositPaid: number;
    balanceDue: number;
    promoCode?: string | null;
    discountAmount?: number;
  } | null>(null)

  // Remove promo code & clear sessionStorage
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoSuccess(null);
    setPromoError(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('fpv_applied_promo_code');
      } catch (e) {
        console.warn("[SessionStorage] Failed to remove promo:", e);
      }
    }
  };

  // Validate Promo Code using Zustand store (V22)
  const handleValidatePromo = async (codeToValidate: string) => {
    const cleanCode = codeToValidate.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError(lang === 'IT' ? "Inserisci un codice promozionale." : "Please enter a promo code.");
      setPromoSuccess(null);
      return;
    }
    try {
      const { useResortAdminStore } = await import("../../admin/resort/store/useResortAdminStore");
      const promoCodes = useResortAdminStore.getState().promoCodes;
      const found = promoCodes.find(p => p.code.trim().toUpperCase() === cleanCode);

      if (!found) {
        setPromoError(lang === 'IT' ? `Codice "${cleanCode}" non valido.` : `Invalid promo code "${cleanCode}".`);
        setPromoSuccess(null);
        handleRemovePromo();
        return;
      }

      if (!found.active) {
        setPromoError(lang === 'IT' ? `Il codice "${cleanCode}" non è attivo.` : `Promo code "${cleanCode}" is inactive.`);
        setPromoSuccess(null);
        handleRemovePromo();
        return;
      }

      if (found.slotsTotal > 0 && found.slotsUsed >= found.slotsTotal) {
        setPromoError(lang === 'IT' ? `Il codice "${cleanCode}" ha esaurito gli utilizzi disponibili.` : `Promo code "${cleanCode}" has reached its limit.`);
        setPromoSuccess(null);
        handleRemovePromo();
        return;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (found.validFrom && todayStr < found.validFrom) {
        setPromoError(lang === 'IT' ? `Il codice "${cleanCode}" non è ancora valido.` : `Promo code "${cleanCode}" is not yet valid.`);
        setPromoSuccess(null);
        handleRemovePromo();
        return;
      }
      if (found.validTo && todayStr > found.validTo) {
        setPromoError(lang === 'IT' ? `Il codice "${cleanCode}" è scaduto.` : `Promo code "${cleanCode}" has expired.`);
        setPromoSuccess(null);
        handleRemovePromo();
        return;
      }

      // Valid Promo Code!
      setAppliedPromo(found);
      setPromoError(null);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('fpv_applied_promo_code', found.code);
        } catch (e) {
          console.warn("[SessionStorage] Failed to save promo:", e);
        }
      }
      const discountText = found.discountType === 'percentage' ? `-${found.discountValue}%` : `-฿${found.discountValue}`;
      setPromoSuccess(lang === 'IT' ? `Coupon ${found.code} (${discountText}) applicato!` : `Coupon ${found.code} (${discountText}) applied!`);
    } catch (err) {
      console.error("[Promo Validation Error]", err);
      setPromoError(lang === 'IT' ? "Errore nella verifica del codice." : "Error validating promo code.");
    }
  }

  // Parse & Auto-Validate ?promo=CODICE parameter from URL or sessionStorage (V22)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('promo');
      let savedCode: string | null = null;
      try {
        savedCode = sessionStorage.getItem('fpv_applied_promo_code');
      } catch (e) {
        console.warn("[SessionStorage] Read error:", e);
      }
      const codeToApply = urlCode ? urlCode.trim().toUpperCase() : (savedCode ? savedCode.trim().toUpperCase() : null);

      if (codeToApply) {
        setPromoInput(codeToApply);
        handleValidatePromo(codeToApply);
      }
    }
  }, []);

  // Auto-scroll to checkout form position when a room is selected
  useEffect(() => {
    if (selectedRoom && checkoutSectionRef.current) {
      setTimeout(() => {
        checkoutSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 50)
    }
  }, [selectedRoom])
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [confirmedTotalPrice, setConfirmedTotalPrice] = useState<number | null>(null)

  // Custom extra services options (Breakfast & AC)
  const [extraBreakfast, setExtraBreakfast] = useState(false)
  const [extraAC, setExtraAC] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false)
  const [checkInCalendarMonth, setCheckInCalendarMonth] = useState(() => new Date())
  const [checkOutCalendarMonth, setCheckOutCalendarMonth] = useState(() => new Date())

  // Synchronize calendar months with selected checkIn and checkOut dates
  useEffect(() => {
    if (checkIn) {
      setCheckInCalendarMonth(parseLocalDate(checkIn));
    }
  }, [checkIn]);

  useEffect(() => {
    if (checkOut) {
      setCheckOutCalendarMonth(parseLocalDate(checkOut));
    } else if (checkIn) {
      const date = parseLocalDate(checkIn);
      date.setDate(date.getDate() + 2);
      setCheckOutCalendarMonth(date);
    }
  }, [checkIn, checkOut]);

  // Click outside detection to close calendar popovers
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.date-picker-container')) {
        setIsCheckInOpen(false);
        setIsCheckOutOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Verify Stripe payment session and register reservation in Octorate
  // Returns the resolved bookingId (Octorate ID or STRIPE-fallback)
  const verifyAndConfirmBooking = async (sessionId: string): Promise<string | null> => {
    try {
      setVerifyingPayment(true)
      setBookingLoading(true)

      const verifyRes = await fetch(`/api/verify-checkout-session?session_id=${sessionId}`)
      if (!verifyRes.ok) {
        const errorData = await verifyRes.json()
        throw new Error(errorData.error || "Impossibile verificare la sessione di pagamento.")
      }

      const verifyData = await verifyRes.json()
      const { bookingData, stripeSessionId: verifiedSessionId, octorateReservationId, octorateStatus, octorateError } = verifyData
      setStripeSessionId(verifiedSessionId || sessionId)

      // Find the room type based on the octorate ID
      const matchedRoom = ACCOMMODATIONS.find(
        (r) => r.octorateId === bookingData.accommodationId
      )

      // Restore states to render the success screen properly
      if (matchedRoom) {
        setSelectedRoom(matchedRoom as any)
      }
      setCheckIn(bookingData.checkIn)
      setCheckOut(bookingData.checkOut)
      setGuests(bookingData.guests)
      setExtraBreakfast(bookingData.extraBreakfast)
      setExtraAC(bookingData.extraAC)
      setCheckoutData({
        name: bookingData.guestName,
        email: bookingData.guestEmail,
        phone: bookingData.guestPhone,
        requests: ""
      })
      const resolvedFinalTotal = Number(verifyData.finalTotal || bookingData?.finalTotal || bookingData?.grandTotal || bookingData?.totalPrice || 0)
      const resolvedDepositPaid = Number(verifyData.depositPaid || bookingData?.depositPaid || bookingData?.depositAmount || Math.round(resolvedFinalTotal * 0.3))
      const resolvedBalanceDue = Number(verifyData.balanceDue || bookingData?.balanceDue || (resolvedFinalTotal - resolvedDepositPaid))
      const resolvedPromoCode = verifyData.promoCode || bookingData?.promoCode || null
      const resolvedDiscountAmount = Number(verifyData.discountAmount || bookingData?.discountAmount || bookingData?.promoDiscountAmount || 0)

      setVerifiedBooking({
        finalTotal: resolvedFinalTotal,
        depositPaid: resolvedDepositPaid,
        balanceDue: resolvedBalanceDue,
        promoCode: resolvedPromoCode,
        discountAmount: resolvedDiscountAmount
      })
      setConfirmedTotalPrice(resolvedFinalTotal)

      // Applied Promo Code Tracking & Cleanup (V24)
      const savedPromoCode = typeof window !== 'undefined' ? sessionStorage.getItem('fpv_applied_promo_code') : null;
      const promoToIncrement = savedPromoCode || appliedPromo?.code || (typeof appliedPromo === 'string' ? appliedPromo : null) || resolvedPromoCode;

      if (promoToIncrement) {
        try {
          const { useResortAdminStore } = await import("../../admin/resort/store/useResortAdminStore")
          useResortAdminStore.getState().incrementPromoCodeUsage(promoToIncrement)
          console.log("[Promo Engine V24] Incremented promo code usage:", promoToIncrement);
        } catch (pErr) {
          console.error("[Promo Engine V24] Errore incremento promo code:", pErr)
        }
      }

      // Cleanup session & states to auto-close floating banner (V24)
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('fpv_applied_promo_code');
        } catch (e) {
          console.warn("[SessionStorage] Failed to clear promo key:", e);
        }
      }
      setAppliedPromo(null);
      setPromoInput("");
      setPromoSuccess(null);
      setPromoError(null);

      // Octorate reservation is now handled server-side in verify-checkout-session.ts
      if (octorateReservationId && octorateStatus === "confirmed") {
        setBookingId(octorateReservationId)
        setIsBooked(true)
        return octorateReservationId
      } else if (octorateError) {
        // Octorate failed but payment went through — still show success with Stripe ID
        console.warn("[Verify API] Octorate warning:", octorateError)
        const fallbackId = `STRIPE-${stripeSessionId}`
        setBookingId(fallbackId)
        setIsBooked(true)
        return fallbackId
      } else {
        throw new Error("Errore durante la registrazione della prenotazione su Octorate.")
      }
    } catch (err: any) {
      console.error("[Stripe Verify Error]", err)
      alert(lang === 'IT'
        ? `Impossibile verificare il pagamento: ${err.message}`
        : `Could not verify payment: ${err.message}`
      )
      return null
    } finally {
      setVerifyingPayment(false)
      setBookingLoading(false)
    }
  }

  // Check for Stripe Checkout redirect callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (sessionId) {
      // Clean query parameters from URL immediately so refreshes don't re-trigger
      window.history.replaceState({}, document.title, window.location.pathname)

      // Guard: prevent duplicate Octorate registration if same session already verified
      const storedId = sessionStorage.getItem(`verified_${sessionId}`)
      if (storedId) {
        console.log('[BookingEngine] Session already verified, restoring from cache:', sessionId)
        setBookingId(storedId)
        setStripeSessionId(sessionId)
        setIsBooked(true)
        return
      }

      // Mark as in-progress immediately to block concurrent retries on same session
      sessionStorage.setItem(`verified_${sessionId}`, `PENDING_${sessionId}`)

      setStripeSessionId(sessionId)
      verifyAndConfirmBooking(sessionId).then((resolvedId) => {
        if (resolvedId) {
          // Update with real bookingId (overwrites PENDING marker)
          sessionStorage.setItem(`verified_${sessionId}`, resolvedId)
        } else {
          // Verification failed — remove the PENDING marker so user can retry manually
          sessionStorage.removeItem(`verified_${sessionId}`)
        }
      })
    }
  }, [])


  const [oauthUrl, setOauthUrl] = useState("")
  const [oauthConnected, setOauthConnected] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  useEffect(() => {
    let active = true
    isAuthenticated().then((authed) => {
      if (active) {
        setOauthConnected(authed)
      }
    })
    return () => { active = false }
  }, [])

  async function handleSaveToken() {
    if (!oauthUrl.trim()) return
    try {
      const url = new URL(oauthUrl.trim())
      const code = url.searchParams.get("code")
      if (!code) {
        alert("Nessun parametro 'code' trovato nell'URL incollato.")
        return
      }
      setOauthLoading(true)
      await exchangeToken(code)
      setOauthConnected(true)
      setOauthUrl("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Errore durante lo scambio token:\n${msg}`)
    } finally {
      setOauthLoading(false)
    }
  }

  // No fetch needed here — RoomGrid handles its own data loading
  // via fetchAccommodations() internally.
  useEffect(() => {
    setLoading(false)
    setError(null)
  }, [])

  const stayDays = useMemo(() => calculateStayDays(checkIn, checkOut), [checkIn, checkOut])
  const lowSeason = useMemo(() => isLowSeason(checkIn, checkOut), [checkIn, checkOut])
  const discountInfo = useMemo(() => getDiscountInfo(stayDays), [stayDays])

  const isMaxSavings = stayDays >= 30 && lowSeason

  // Thai Timezone (ICT, UTC+7) cutoff check (prenotazioni aperte per oggi fino alle 21:00 / 9:00 PM)
  const checkInMin = useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const thaiTime = new Date(utc + (3600000 * 7));
    const thaiHour = thaiTime.getHours();

    const minDate = new Date(thaiTime);
    if (thaiHour >= 21) {
      minDate.setDate(minDate.getDate() + 1);
    }
    return minDate.toISOString().split('T')[0];
  }, []);

  const checkOutMin = useMemo(() => {
    if (!checkIn) {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const thaiTime = new Date(utc + (3600000 * 7));
      const thaiHour = thaiTime.getHours();
      const minCheckIn = new Date(thaiTime);
      if (thaiHour >= 21) {
        minCheckIn.setDate(minCheckIn.getDate() + 1);
      }
      const minCheckOut = new Date(minCheckIn);
      minCheckOut.setDate(minCheckOut.getDate() + 1);
      const y = minCheckOut.getFullYear();
      const m = String(minCheckOut.getMonth() + 1).padStart(2, '0');
      const d = String(minCheckOut.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const date = parseLocalDate(checkIn);
    date.setDate(date.getDate() + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [checkIn]);

  // Automatically adjust checkout if it is empty or before checkIn + 1 day
  useEffect(() => {
    if (checkIn) {
      const date = parseLocalDate(checkIn);
      date.setDate(date.getDate() + 1);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const minCheckOutStr = `${y}-${m}-${d}`;
      if (!checkOut || checkOut < minCheckOutStr) {
        setCheckOut(minCheckOutStr);
        setCheckOutCalendarMonth(date);
      }
    }
  }, [checkIn]);

  // Format check-in/out date for premium display (DD/MM/YYYY)
  const formatDateForDisplay = (dateStr: string): string => {
    return formatDisplayDate(dateStr);
  };

  // Helper to render premium React calendar dropdowns
  const renderCalendarDropdown = (
    type: 'in' | 'out',
    selectedDateStr: string,
    onSelectDate: (dateStr: string) => void,
    minDateStr: string,
    isOpen: boolean,
    onClose: () => void,
    calendarMonth: Date,
    setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>
  ) => {
    if (!isOpen) return null;

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const daysInMonth = getDaysInMonth(year, month);
    let firstDayOfWeek = getFirstDayOfMonth(year, month);
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const monthNames = {
      IT: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
      EN: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      TH: ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
      DE: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
    };

    const curMonthName = monthNames[lang]?.[month] || monthNames['IT'][month];

    const prevMonth = () => {
      setCalendarMonth(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
      setCalendarMonth(new Date(year, month + 1, 1));
    };

    const weekdayHeaders = {
      IT: ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"],
      EN: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
      TH: ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."],
      DE: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    };

    const headers = weekdayHeaders[lang] || weekdayHeaders['IT'];
    const dayCells: React.ReactNode[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      dayCells.push(<div key={`empty-${i}`} className="w-9 h-9" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const isDisabled = minDateStr ? (dateStr < minDateStr) : false;
      const isSelected = selectedDateStr === dateStr;
      const isCheckInMarker = type === 'out' && checkIn === dateStr;
      const isRangeDay = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

      let btnClass = "w-9 h-9 flex items-center justify-center text-xs font-semibold rounded-full transition-all duration-200 ";

      if (isDisabled) {
        btnClass += "text-stone-300 cursor-not-allowed pointer-events-none line-through opacity-40";
      } else if (isSelected) {
        btnClass += "bg-emerald-800 text-white shadow-md font-bold";
      } else if (isCheckInMarker) {
        btnClass += "bg-emerald-100 text-emerald-800 border-2 border-emerald-800 font-black";
      } else if (isRangeDay) {
        btnClass += "bg-emerald-50 text-emerald-950 rounded-none font-semibold hover:bg-emerald-100";
      } else {
        btnClass += "text-stone-700 hover:bg-stone-200 cursor-pointer";
      }

      dayCells.push(
        <button
          key={`day-${day}`}
          type="button"
          disabled={isDisabled}
          onClick={() => {
            onSelectDate(dateStr);
            if (type === 'in') {
              const nextDate = parseLocalDate(dateStr);
              nextDate.setDate(nextDate.getDate() + 2);
              const y = nextDate.getFullYear();
              const m = String(nextDate.getMonth() + 1).padStart(2, '0');
              const d = String(nextDate.getDate()).padStart(2, '0');
              const nextCheckOutStr = `${y}-${m}-${d}`;
              if (!checkOut || checkOut < nextCheckOutStr) {
                setCheckOut(nextCheckOutStr);
                setCheckOutCalendarMonth(nextDate);
              }
            }
            onClose();
          }}
          className={btnClass}
          title={isCheckInMarker ? (lang === 'IT' ? 'Data di check-in selezionata' : 'Selected check-in date') : ''}
        >
          {day}
        </button>
      );
    }

    const positionClass = type === 'in'
      ? "left-0"
      : "right-0 left-auto md:left-0 md:right-auto";

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-full mt-2 bg-stone-50 border border-stone-300 rounded-3xl p-4 shadow-2xl z-[100] animate-fadeIn w-[280px] ${positionClass}`}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-200">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors font-bold"
          >
            ←
          </button>
          <span className="font-bold text-xs uppercase tracking-wider text-stone-800">
            {curMonthName} {year}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors font-bold"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {headers.map((h, i) => (
            <span key={`header-${i}`} className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              {h}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {dayCells}
        </div>
      </div>
    );
  };

  const calculateBaseRoomCost = (pricing: any, room: any, isLow: boolean): number => {
    if (pricing && typeof pricing.basePriceLordo === 'number' && pricing.basePriceLordo > 0) {
      return pricing.basePriceLordo;
    }
    if (pricing && typeof pricing.original === 'number' && pricing.original > 0) {
      return pricing.original;
    }
    if (pricing && typeof pricing.perNight === 'number' && pricing.perNight > 0) {
      return pricing.perNight;
    }
    if (room) {
      return isLow ? (room.base_price_low ?? room.pricePerNight ?? 0) : (room.base_price_high ?? room.pricePerNight ?? 0);
    }
    return 0;
  };

  // Memoized pricing calculations for checkout (base + discounts + extras)
  const checkoutPricing = useMemo(() => {
    if (!selectedRoom || !selectedPricing) return { original: 0, savings: 0, total: 0, breakfast: 0, ac: 0, directDiscount: 0, promoDiscount: 0, finalTotal: 0 };
    const breakfast = extraBreakfast ? (PRICE_CONFIG.BREAKFAST_PRICE * guests * stayDays) : 0;
    const ac = extraAC ? PRICE_CONFIG.AC_SURCHARGE : 0;

    // Mother Rate (Tariffa Madre): Priority 1 = Live Octorate price from selectedPricing.basePriceLordo (V28)
    const baseRoomPricePerNight = calculateBaseRoomCost(selectedPricing, selectedRoom, lowSeason);
    const roomCostMother = baseRoomPricePerNight * stayDays;
    const extraGuestsCount = Math.max(0, guests - selectedRoom.baseGuests);
    const extraGuestCost = extraGuestsCount * PRICE_CONFIG.EXTRA_GUEST_PRICE * stayDays;
    const motherRateTotal = roomCostMother + extraGuestCost;

    let directDiscountAmount = 0;
    let promoDiscountAmount = 0;

    if (appliedPromo) {
      // EXCLUSIVITY (V26): Standard stay duration discount is FORCED to 0
      directDiscountAmount = 0;

      // Promo discount calculated DIRECTLY on Mother Rate (roomCost + extraGuestCost)
      if (appliedPromo.discountType === 'percentage') {
        promoDiscountAmount = Math.round(motherRateTotal * (appliedPromo.discountValue / 100));
      } else if (appliedPromo.discountType === 'fixed') {
        promoDiscountAmount = Math.min(motherRateTotal, appliedPromo.discountValue);
      }
    } else {
      // Standard stay duration discount applies
      const savingsPercent = selectedPricing.savings || 0;
      directDiscountAmount = Math.round(roomCostMother * (savingsPercent / 100));
      promoDiscountAmount = 0;
    }

    const discountedRoomAndGuestsTotal = Math.max(0, motherRateTotal - directDiscountAmount - promoDiscountAmount);
    const finalTotal = discountedRoomAndGuestsTotal + breakfast + ac;

    return {
      original: motherRateTotal,
      savings: appliedPromo ? 0 : (selectedPricing.savings || 0),
      total: discountedRoomAndGuestsTotal,
      breakfast,
      ac,
      directDiscount: directDiscountAmount,
      promoDiscount: promoDiscountAmount,
      finalTotal
    };
  }, [selectedRoom, selectedPricing, extraBreakfast, extraAC, guests, stayDays, appliedPromo]);

  const filteredAccommodations = ACCOMMODATIONS.filter((item) => {
    const normalizedActive = selectedCategory.toUpperCase()
    const normalizedRoomCat = item.category.toUpperCase()
    if (normalizedActive !== "TUTTI" && normalizedRoomCat !== normalizedActive)
      return false
    const capacity = item.baseGuests + item.maxExtraGuests
    if (guests && capacity < guests) return false
    return true
  })


  // Import API reservation creator
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkoutData.name || !checkoutData.email || !checkoutData.phone) {
      alert(lang === 'IT' ? "Si prega di compilare tutti i campi obbligatori." : "Please fill in all required fields.")
      return
    }
    try {
      setBookingLoading(true)

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accommodationId: selectedRoom.octorateId || selectedRoom.id,
          roomName: selectedRoom.name || selectedRoom.title,
          slug: selectedRoom.slug,
          checkIn,
          checkOut,
          guests,
          guestName: checkoutData.name,
          guestEmail: checkoutData.email,
          guestPhone: checkoutData.phone,
          extraBreakfast,
          extraAC,
          lang,
          paymentMethod: (paymentMethod === 'ksher_promptpay' || paymentMethod === 'ksher_card') ? 'ksher' : paymentMethod,
          paymentChannel: paymentMethod === 'ksher_promptpay' ? 'promptpay' : 'card',
          origin: window.location.origin,
          promoCode: appliedPromo?.code || null,
          discountType: appliedPromo?.discountType || null,
          discountValue: appliedPromo?.discountValue || null
        })
      })

      let session: any = null
      const rawText = await response.text()
      try {
        session = JSON.parse(rawText)
      } catch {
        throw new Error(rawText || "Impossibile elaborare la risposta del server.")
      }

      if (!response.ok) {
        throw new Error(session?.error || session?.message || "Impossibile avviare la sessione di pagamento.")
      }
      if (session.url) {
        window.location.href = session.url
      } else if (session.isBankTransfer) {
        alert(lang === 'IT'
          ? "Prenotazione registrata! Invia la contabile del bonifico su WhatsApp o Telegram per confermare definitivamente il soggiorno."
          : "Booking requested! Please send your bank transfer slip via WhatsApp or Telegram to confirm your reservation."
        )
        setIsBooked(true)
      } else {
        throw new Error("URL di pagamento non restituito dal gateway.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(lang === 'IT'
        ? `Errore durante l'avvio del pagamento: ${msg}`
        : `Error starting payment: ${msg}`
      )
    } finally {
      setBookingLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkIn || !checkOut) {
      alert(lang === 'IT' ? "Seleziona le date di check-in e check-out." : "Please select check-in and check-out dates.")
      return
    }
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    if (end <= start) {
      alert(lang === 'IT' ? "La data di check-out deve essere successiva a quella di check-in." : "Check-out date must be after check-in date.")
      return
    }

    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 1) {
      alert(lang === 'IT' ? "Si prega di selezionare almeno 1 notte." : "Please select at least 1 night.")
      return
    }

    setHasSearched(true)

    // Smooth scroll viewport down to the rooms grid immediately
    const grid = document.getElementById("rooms-grid")
    const searchForm = document.getElementById("booking-search-form")
    if (grid) {
      const stickySection = searchForm ? searchForm.closest("section") : null;
      const stickyHeight = stickySection ? stickySection.offsetHeight : 120;
      grid.style.scrollMarginTop = `${stickyHeight}px`;
      grid.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="booking-engine-root min-h-screen text-foreground font-sans antialiased selection:bg-accent" style={{ backgroundColor: '#e7e5e4', minHeight: hasSearched ? '2500px' : 'auto' }}>
      <div className="max-w-6xl mx-auto px-4 mt-20 md:mt-24">
        <header className="relative text-stone-100 py-4 lg:py-8 px-4 md:px-8 overflow-hidden rounded-2xl shadow-lg" style={{ backgroundColor: '#3b3530' }}>
          <div className="absolute inset-0 opacity-45">
            <VillageSlideshow />
          </div>
          <div className="absolute inset-0 bg-stone-950/30 backdrop-blur-[0.5px]" />


          {/* Collapsible Dropdown Language Selector (Absolutely positioned top-right) */}
          <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20">
            <button
              type="button"
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 shadow-sm text-stone-300 hover:text-white transition-all cursor-pointer font-bold text-[10px] uppercase"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang}</span>
              <ChevronDown className="w-3 h-3 transition-transform duration-200" style={{ transform: isLangOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {isLangOpen && (
              <>
                {/* Overlay to close when clicking outside */}
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsLangOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-24 bg-[#3b3530]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-lg z-50 overflow-hidden flex flex-col">
                  {(['EN', 'TH', 'IT', 'DE'] as Language[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        setLang(l)
                        setIsLangOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-[10px] font-bold transition-all hover:bg-white/10 cursor-pointer ${lang === l ? "text-emerald-400 bg-white/5" : "text-stone-300"
                        }`}
                    >
                      {l === 'EN' && '🇬🇧 EN'}
                      {l === 'TH' && '🇹🇭 TH'}
                      {l === 'IT' && '🇮🇹 IT'}
                      {l === 'DE' && '🇩🇪 DE'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative z-10 my-auto py-2">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-8 min-h-[160px] lg:min-h-[180px]">
              {/* Left Side: Logo + Title (Equally spaced between top and bottom borders) */}
              <div className="flex flex-col lg:flex-row items-center gap-3.5 lg:gap-6 text-center lg:text-left w-full lg:w-auto my-auto">
                <img
                  src="/FP_04_-_LOGO_OFFICIAL_HD.png"
                  alt="Flower Power Village Logo"
                  width={200}
                  height={200}
                  className="h-16 lg:h-44 w-auto drop-shadow-md mx-auto lg:mx-0 flex-shrink-0 object-contain my-auto"
                />
                <div className="flex flex-col justify-between items-center lg:items-start lg:pl-4 my-auto space-y-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-black tracking-tight text-white leading-none text-center lg:text-left">
                    FLOWER POWER <br />
                    <span className="font-light italic text-[#a2b997]">Village</span>
                  </h1>
                  <span className="text-[#a2b997] font-bold tracking-widest text-[9px] md:text-xs uppercase text-center lg:text-left block pt-1">
                    KOH PHAYAM, THAILANDIA
                  </span>
                </div>
              </div>

              {/* Right Side: Compact Tagline block (Equally spaced vertically) */}
              <div className="flex flex-col justify-between items-center lg:items-end gap-2 text-center lg:text-right max-w-md w-full lg:w-auto my-auto space-y-1">
                <span className="text-xs sm:text-sm md:text-xl lg:text-2xl font-extrabold text-stone-100 tracking-tight block uppercase bg-white/10 lg:bg-transparent px-3 py-0.5 rounded-full lg:p-0">
                  {t('heroLine1')}
                </span>
                <span className="text-[9px] md:text-xs lg:text-sm font-bold text-[#a2b997] tracking-widest block uppercase">
                  {t('heroLine2')}
                </span>
                <div className="flex flex-row flex-wrap justify-center lg:justify-end gap-x-2 gap-y-0.5 text-[9px] md:text-xs font-light text-stone-200">
                  <span>{t('heroLine3')}</span>
                  <span className="text-stone-400">•</span>
                  <span>{t('heroLine4')}</span>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <section className="sticky top-0 z-50 bg-stone-300/95 backdrop-blur-md shadow-md border-b border-stone-400 py-4 md:py-3 transition-all">
        <div className="max-w-6xl mx-auto px-4">
          <form
            id="booking-search-form"
            onSubmit={handleSearch}
            className="grid grid-cols-2 lg:flex lg:flex-row gap-2 lg:gap-3 items-stretch lg:items-center bg-stone-50 p-1.5 md:p-2 rounded-xl border border-stone-300 shadow-sm"
          >
            {/* Check-In */}
            <div className="date-picker-container relative col-span-1 lg:flex-1 flex items-center justify-center lg:justify-start gap-1.5 md:gap-3 px-2 md:px-4 py-1.5 md:py-3 bg-stone-50 rounded-lg md:rounded-xl border border-stone-300 focus-within:border-stone-500 focus-within:ring-1 focus-within:ring-stone-500 transition-all cursor-pointer"
              onClick={() => {
                if (!isCheckInOpen && checkIn) {
                  setCheckInCalendarMonth(parseLocalDate(checkIn));
                }
                setIsCheckInOpen(!isCheckInOpen);
                setIsCheckOutOpen(false);
              }}
            >
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 lg:static lg:transform-none p-1 lg:p-2.5 bg-stone-200 text-primary rounded-lg lg:rounded-xl flex-shrink-0 shadow-sm flex">
                <Calendar className="w-4 h-4 lg:w-6 lg:h-6" />
              </div>
              <div className="w-full flex flex-col justify-center items-center lg:items-start select-none">
                <label className="block text-[8px] lg:text-[10px] uppercase tracking-wider text-stone-500 font-extrabold leading-tight mb-0.5 text-center lg:text-left">
                  {t('checkIn')}
                </label>
                <span className="text-xs lg:text-sm font-bold text-stone-800 text-center lg:text-left block min-h-[1.25rem]">
                  {checkIn ? formatDateForDisplay(checkIn) : (lang === 'IT' ? 'Scegli data' : 'Choose date')}
                </span>
              </div>

              {/* Dropdown Calendar */}
              {renderCalendarDropdown(
                'in',
                checkIn,
                setCheckIn,
                checkInMin,
                isCheckInOpen,
                () => setIsCheckInOpen(false),
                checkInCalendarMonth,
                setCheckInCalendarMonth
              )}
            </div>

            {/* Check-Out */}
            <div className="date-picker-container relative col-span-1 lg:flex-1 flex items-center justify-center lg:justify-start gap-1.5 md:gap-3 px-2 md:px-4 py-1.5 md:py-3 bg-stone-50 rounded-lg md:rounded-xl border border-stone-300 focus-within:border-stone-500 focus-within:ring-1 focus-within:ring-stone-500 transition-all cursor-pointer"
              onClick={() => {
                if (!isCheckOutOpen) {
                  if (checkOut) {
                    setCheckOutCalendarMonth(parseLocalDate(checkOut));
                  } else if (checkIn) {
                    const date = parseLocalDate(checkIn);
                    date.setDate(date.getDate() + 2);
                    setCheckOutCalendarMonth(date);
                  }
                }
                setIsCheckOutOpen(!isCheckOutOpen);
                setIsCheckInOpen(false);
              }}
            >
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 lg:static lg:transform-none p-1 lg:p-2.5 bg-stone-200 text-primary rounded-lg lg:rounded-xl flex-shrink-0 shadow-sm flex">
                <Calendar className="w-4 h-4 lg:w-6 lg:h-6" />
              </div>
              <div className="w-full flex flex-col justify-center items-center lg:items-start select-none">
                <label className="block text-[8px] lg:text-[10px] uppercase tracking-wider text-stone-500 font-extrabold leading-tight mb-0.5 text-center lg:text-left">
                  {t('checkOut')}
                </label>
                <span className="text-xs lg:text-sm font-bold text-stone-800 text-center lg:text-left block min-h-[1.25rem]">
                  {checkOut ? formatDateForDisplay(checkOut) : (lang === 'IT' ? 'Scegli data' : 'Choose date')}
                </span>
              </div>

              {/* Dropdown Calendar */}
              {renderCalendarDropdown(
                'out',
                checkOut,
                setCheckOut,
                checkOutMin,
                isCheckOutOpen,
                () => setIsCheckOutOpen(false),
                checkOutCalendarMonth,
                setCheckOutCalendarMonth
              )}
            </div>

            {/* Guests */}
            <div className="col-span-1 lg:flex-1 flex items-center justify-between gap-1 px-2 md:px-4 py-1.5 md:py-3 bg-stone-50 rounded-lg md:rounded-xl border border-stone-300 focus-within:border-stone-500 focus-within:ring-1 focus-within:ring-stone-500 transition-all">
              <div className="p-1 lg:p-2.5 bg-stone-200 text-primary rounded-lg lg:rounded-xl flex-shrink-0 shadow-sm flex items-center justify-center">
                <Users className="w-4 h-4 lg:w-6 lg:h-6" />
              </div>
              <div className="flex-1 flex flex-col justify-center items-center lg:items-start min-w-0 px-1">
                <label className="block text-[8px] lg:text-[10px] uppercase tracking-wider text-stone-500 font-extrabold leading-tight mb-0.5 text-center lg:text-left truncate w-full">
                  {t('guests')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={guests}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setGuests(Math.max(1, Math.min(8, val)));
                    }
                  }}
                  className="w-full bg-transparent text-xs lg:text-sm focus:outline-none font-bold text-stone-800 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center lg:text-left"
                />
              </div>
              <div className="flex items-center gap-0.5 bg-stone-200/60 p-0.5 rounded-lg border border-stone-300/50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  className="w-5 md:w-7 h-5 md:h-7 flex items-center justify-center rounded bg-white hover:bg-stone-300 text-stone-700 text-[10px] md:text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setGuests(Math.min(8, guests + 1))}
                  className="w-5 md:w-7 h-5 md:h-7 flex items-center justify-center rounded bg-white hover:bg-stone-300 text-stone-700 text-[10px] md:text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="col-span-1 lg:w-auto bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs lg:text-sm py-3 lg:py-3.5 px-4 lg:px-8 rounded-lg lg:rounded-xl shadow-sm transition-all duration-200 transform active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{t('searchBtn')}</span>
            </button>
          </form>
        </div>
      </section>

      {/* --- DIRECT BOOKING & HUBIT@ PREMIUM SYMMETRIC NOMAD STRIP --- */}
      <section className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-emerald-800 rounded-2xl py-2 md:py-3.5 px-4 md:px-5 text-white shadow-xl border border-emerald-700/20 relative overflow-hidden">
          {/* Ambient decorative glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-10 divide-y md:divide-y-0 md:divide-x divide-white/10 items-stretch">

            {/* Left Column: Digital Nomads (HUBit@) */}
            <div className="flex flex-col justify-between gap-2 py-1 md:py-0 md:space-y-2.5">
              <div className="flex items-center justify-center md:justify-start gap-2.5 md:gap-3 w-full">
                <div className="p-1.5 md:p-2 bg-emerald-700/35 rounded-lg md:rounded-xl border border-emerald-650/30 text-emerald-300 flex-shrink-0 hidden xs:block">
                  <Wifi className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <div className="space-y-0.5 w-full md:w-auto">
                  <div className="flex flex-row flex-wrap items-center justify-center md:justify-start gap-1.5 md:gap-2">
                    <h4 className="font-bold text-stone-100 text-xs md:text-sm tracking-tight text-center md:text-left uppercase">
                      {t('hubitTitle' as any)}
                    </h4>
                    <span className="bg-emerald-600/30 text-emerald-200 border border-emerald-600/40 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                      CO-WORKING
                    </span>
                  </div>
                  <p className="text-emerald-100/80 text-[11px] md:text-xs leading-relaxed hidden sm:block">
                    {t('hubitDesc' as any)}
                  </p>
                </div>
              </div>

              {/* Clear Discount Info for Digital Nomads */}
              <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-center text-xs">
                <div className="bg-black/15 py-1 md:py-2 px-2 rounded-lg border border-white/5 flex flex-col justify-center">
                  <span className="block text-[8px] md:text-[9px] text-emerald-300 font-extrabold uppercase tracking-wider">
                    {t('nomadStay15' as any)}
                  </span>
                  <span className="block text-[11px] md:text-sm font-black text-white md:mt-0.5">
                    -15% {t('nomadDiscount' as any)}
                  </span>
                </div>
                <div className="bg-black/25 py-1 md:py-2.5 px-2.5 md:px-2.5 rounded-lg border border-white/5 flex flex-col justify-center">
                  <span className="block text-[8px] md:text-[9px] text-emerald-300 font-extrabold uppercase tracking-wider">
                    {t('nomadStay30' as any)}
                  </span>
                  <span className="block text-[11px] md:text-sm font-black text-white md:mt-0.5">
                    -20% {t('nomadDiscount' as any)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Direct Booking */}
            <div className="flex flex-col justify-between gap-2 pt-2 md:pt-0 md:pl-6 lg:pl-10 md:space-y-2.5">
              <div className="flex items-start gap-2.5 md:gap-3">
                <div className="p-1.5 md:p-2 bg-emerald-700/35 rounded-lg md:rounded-xl border border-emerald-650/30 text-emerald-300 flex-shrink-0 hidden xs:block">
                  <Percent className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-stone-100 text-xs md:text-sm tracking-tight">
                    {t('directBookingTitle')}
                  </h4>
                  <p className="text-emerald-100/80 text-[11px] md:text-xs leading-relaxed hidden sm:block">
                    {t('directBookingDesc')}
                  </p>
                </div>
              </div>

              {/* Clear Discount & Deposit Info for Direct Bookings */}
              <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-center text-xs">
                <div className="bg-black/15 py-1 md:py-2 px-2 rounded-lg border border-white/5 flex flex-col justify-center">
                  <span className="block text-[8px] md:text-[9px] text-emerald-300 font-extrabold uppercase tracking-wider">
                    {lang === 'IT' ? 'Sconto Diretto' : 'Direct discount'}
                  </span>
                  <span className="block text-[11px] md:text-sm font-black text-white md:mt-0.5">
                    -10% {lang === 'IT' ? 'Garantito' : 'Guaranteed'}
                  </span>
                </div>
                <div className="bg-black/25 py-1 md:py-2.5 px-2.5 md:px-2.5 rounded-lg border border-white/5 flex flex-col justify-center">
                  <span className="block text-[8px] md:text-[9px] text-emerald-300 font-extrabold uppercase tracking-wider">
                    {lang === 'IT' ? 'Caparra' : 'Deposit'}
                  </span>
                  <span className="block text-[11px] md:text-sm font-black text-white md:mt-0.5">
                    {lang === 'IT' ? 'Solo 30% oggi' : 'Only 30% today'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Active Date Selection Badges (Only displayed when dates are selected) */}
          {discountInfo.label && (
            <div className="mt-3 pt-3 border-t border-stone-300/50 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                Sconto attivo:
              </span>
              <span className="bg-emerald-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                {(() => {
                  if (stayDays >= 30) {
                    if (lang === 'IT') return "Tariffa Long-Term (-20%)";
                    if (lang === 'EN') return "Long-Term Rate (-20%)";
                    if (lang === 'TH') return "ราคาพักระยะยาว (-20%)";
                    return "Langzeit-Tarif (-20%)";
                  } else if (stayDays >= 15) {
                    if (lang === 'IT') return "Sconto Medium-Stay (-15%)";
                    if (lang === 'EN') return "Medium-Stay Discount (-15%)";
                    if (lang === 'TH') return "ส่วนลดพักระยะกลาง (-15%)";
                    return "Mittellang-Rabatt (-15%)";
                  } else {
                    if (lang === 'IT') return "Prezzo Diretto Garantito (-10%)";
                    if (lang === 'EN') return "Direct Booking Discount (-10%)";
                    if (lang === 'TH') return "ส่วนลดจองตรง (-10%)";
                    return "Direktbuchung-Rabatt (-10%)";
                  }
                })()}
              </span>
              {isMaxSavings && (
                <span className="bg-emerald-650 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm animate-pulse">
                  {t('lowSeasonBanner')}
                </span>
              )}
              {stayDays > 0 && (
                <span className="text-[10px] text-stone-500 font-semibold bg-stone-200 px-2 py-1 rounded-md border border-stone-300/50">
                  {stayDays} {t('directBookingNights')}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* --- VILLAGE SERVICES BANNER --- */}
      <section className="max-w-6xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-stone-50 border border-stone-300 rounded-xl p-3.5 md:p-5 text-sm shadow-sm">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="p-2 md:p-2.5 bg-primary text-primary-foreground rounded-xl flex-shrink-0">
              <Waves className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h4 className="font-bold text-stone-800 text-[10px] md:text-xs uppercase tracking-wider">{t('benefitsPoolTitle')}</h4>
              <p className="text-stone-500 text-[11px] leading-relaxed mt-1 hidden sm:block">
                {t('benefitsPoolDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="p-2 md:p-2.5 bg-primary text-primary-foreground rounded-xl flex-shrink-0">
              <Flower className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h4 className="font-bold text-stone-800 text-[10px] md:text-xs uppercase tracking-wider">{t('benefitsYogaTitle')}</h4>
              <p className="text-stone-500 text-[11px] leading-relaxed mt-1 hidden sm:block">
                {t('benefitsYogaDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="p-2 md:p-2.5 bg-primary text-primary-foreground rounded-xl flex-shrink-0">
              <Dumbbell className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h4 className="font-bold text-stone-800 text-[10px] md:text-xs uppercase tracking-wider">{t('benefitsGymTitle')}</h4>
              <p className="text-stone-500 text-[11px] leading-relaxed mt-1 hidden sm:block">
                {t('benefitsGymDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="p-2 md:p-2.5 bg-primary text-primary-foreground rounded-xl flex-shrink-0">
              <HelpingHand className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h4 className="font-bold text-stone-800 text-[10px] md:text-xs uppercase tracking-wider">{t('benefitsMassageTitle')}</h4>
              <p className="text-stone-500 text-[11px] leading-relaxed mt-1 hidden sm:block">
                {t('benefitsMassageDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FILTER SEGMENTS --- */}
      <main className="max-w-6xl mx-auto px-4 pt-4 pb-6">
        {verifyingPayment ? (
          /* --- VERIFYING PAYMENT SCREEN (CENTERED OVERLAY) --- */
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
            <div className="max-w-xl w-full bg-stone-50 border border-stone-300 rounded-3xl p-8 text-center shadow-2xl my-8">
              <div className="w-12 h-12 border-4 border-stone-200 border-t-emerald-800 rounded-full animate-spin mb-6 mx-auto"></div>
              <h3 className="text-xl font-black text-stone-850 mb-2">
                {lang === 'IT' ? "Verifica del pagamento..." : "Verifying payment..."}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto">
                {lang === 'IT'
                  ? "Stiamo verificando la transazione Stripe e registrando la tua prenotazione su Octorate."
                  : "We are verifying the Stripe transaction and registering your booking with Octorate."
                }
              </p>
            </div>
          </div>
        ) : isBooked ? (
          /* --- SUCCESS SCREEN (CENTERED OVERLAY) --- */
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
            <div className="max-w-xl w-full bg-stone-50 border border-stone-300 rounded-3xl p-8 text-center shadow-2xl my-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-300">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-stone-850 mb-2">
                {lang === 'IT' ? "Prenotazione Confermata!" : "Reservation Confirmed!"}
              </h2>
              <p className="text-stone-550 text-sm mb-6 leading-relaxed">
                {lang === 'IT'
                  ? `Grazie! La tua richiesta per ${selectedRoom?.category} è stata inoltrata a sistema. Ti abbiamo inviato un'email con i dettagli.`
                  : `Thank you! Your request for ${selectedRoom?.category} has been submitted. We've sent you an email with details.`
                }
              </p>

              <div className="bg-stone-200/50 rounded-2xl p-5 border border-stone-300 text-left space-y-3 mb-8 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-semibold uppercase">ID PRENOTAZIONE:</span>
                  <span className="font-extrabold text-stone-850">{bookingId}</span>
                </div>
                <div className="flex justify-between border-t border-stone-300/50 pt-2">
                  <span className="text-stone-500 font-semibold uppercase">CHECK-IN / OUT:</span>
                  <span className="font-bold text-stone-700">{checkIn} ➔ {checkOut}</span>
                </div>
                <div className="flex justify-between border-t border-stone-300/50 pt-2">
                  <span className="text-stone-500 font-semibold uppercase">ALLOGGIO:</span>
                  <span className="font-bold text-stone-700">{selectedRoom?.category}</span>
                </div>
                <div className="flex justify-between border-t border-stone-300/50 pt-2">
                  <span className="text-stone-500 font-semibold uppercase">PAGAMENTO:</span>
                  <span className="font-bold text-stone-700 uppercase">
                    {lang === 'IT' ? 'Acconto 30% Pagato via Stripe' : '30% Deposit Paid via Stripe'}
                  </span>
                </div>
                {(verifiedBooking || confirmedTotalPrice !== null) && (() => {
                  const displayTotal = verifiedBooking?.finalTotal ?? confirmedTotalPrice ?? 0;
                  const displayDeposit = verifiedBooking?.depositPaid ?? Math.round(displayTotal * 0.3);
                  const displayBalance = verifiedBooking?.balanceDue ?? (displayTotal - displayDeposit);
                  return (
                    <>
                      <div className="flex justify-between border-t border-stone-300/50 pt-2">
                        <span className="text-stone-500 font-semibold uppercase">{lang === 'IT' ? 'TOTALE SOGGIORNO:' : 'TOTAL STAY PRICE:'}</span>
                        <span className="font-bold text-stone-750">
                          {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(displayTotal)}
                        </span>
                      </div>
                      {verifiedBooking?.promoCode && (verifiedBooking.discountAmount || 0) > 0 && (
                        <div className="flex justify-between border-t border-stone-300/50 pt-2 text-fuchsia-700 font-bold bg-fuchsia-50/60 p-2 rounded-lg border border-fuchsia-200/50">
                          <span className="uppercase">{lang === 'IT' ? `COUPON SCONTO (${verifiedBooking.promoCode}):` : `PROMO COUPON (${verifiedBooking.promoCode}):`}</span>
                          <span>
                            -{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(verifiedBooking.discountAmount!)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-stone-300/50 pt-2 text-emerald-850 bg-emerald-500/5 p-2 rounded-lg border border-emerald-700/10">
                        <span className="font-bold uppercase">{lang === 'IT' ? 'ACCONTO PAGATO (30%):' : 'DEPOSIT PAID (30%):'}</span>
                        <span className="font-black">
                          {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(displayDeposit)}
                        </span>
                      </div>
                      <div className="flex flex-col border-2 border-amber-600/40 pt-2.5 text-stone-800 bg-amber-500/10 p-3 rounded-xl gap-1 shadow-xs">
                        <div className="flex justify-between items-baseline w-full">
                          <span className="font-black text-amber-950 uppercase text-[11px] tracking-wide">{lang === 'IT' ? 'SALDO DA PAGARE ALL\'ARRIVO (70%):' : 'BALANCE DUE AT CHECK-IN (70%):'}</span>
                          <span className="font-black text-amber-950 text-base">
                            {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(displayBalance)}
                          </span>
                        </div>
                        <span className="block text-[10px] text-amber-900/90 font-medium leading-relaxed">
                          {t('balanceMethods' as any)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                {stripeSessionId && (
                  <a
                    href={`/api/download-confirmation?session_id=${stripeSessionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs px-8 py-3.5 rounded-full shadow transition-all cursor-pointer inline-flex items-center gap-2 decoration-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    {lang === 'IT' ? 'Scarica la tua prenotazione' : 'Download confirmation (PDF)'}
                  </a>
                )}
                <button
                  onClick={() => {
                    setIsBooked(false)
                    setSelectedRoom(null)
                    setSelectedPricing(null)
                    setCheckoutData({ name: "", email: "", phone: "", requests: "" })
                    setExtraBreakfast(false)
                    setExtraAC(false)
                  }}
                  className="bg-stone-300 hover:bg-stone-400 text-stone-750 font-bold text-xs px-8 py-3.5 rounded-full shadow transition-all cursor-pointer"
                >
                  {t('checkoutBackBtn')}
                </button>
              </div>
            </div>
          </div>
        ) : selectedRoom ? (
          /* --- CUSTOM CHECKOUT INTERFACE --- */
          <div ref={checkoutSectionRef} className="my-6 scroll-mt-6">
            {/* --- CHECKOUT HEADER BANNER --- */}
            <div className="bg-emerald-800 rounded-2xl py-4 px-6 text-white shadow-lg mb-6 text-center border border-emerald-700/30">
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                {lang === 'IT' ? 'Completa la tua prenotazione' : 'Complete your booking'}
              </h2>
              <p className="text-emerald-200 text-xs md:text-sm mt-1 font-medium">
                {lang === 'IT'
                  ? 'Compila i dati e procedi con il pagamento per confermare il soggiorno.'
                  : 'Fill in your details and proceed with payment to confirm your stay.'}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedRoom(null)
                setSelectedPricing(null)
                setExtraBreakfast(false)
                setExtraAC(false)
              }}
              className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-emerald-700 mb-6 transition-colors bg-stone-200/60 px-4 py-2 rounded-full border border-stone-300/50 cursor-pointer"
            >
              ← {t('checkoutBackBtn')}
            </button>

            <h2 className="text-2xl font-black text-stone-850 mb-6 tracking-tight">
              {t('checkoutTitle' as any)}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form & Payment methods (Left) */}
              <form onSubmit={handleConfirmBooking} className="lg:col-span-7 space-y-6">

                {/* Personal Information */}
                <div className="bg-stone-50 border border-stone-300 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider border-b border-stone-300/50 pb-2">
                    {t('checkoutFormTitle' as any)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-stone-500">
                        {t('fullName' as any)} *
                      </label>
                      <input
                        type="text"
                        value={checkoutData.name}
                        onChange={(e) => setCheckoutData({ ...checkoutData, name: e.target.value })}
                        className="w-full bg-stone-100/50 border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-stone-850 font-medium focus:outline-none focus:border-emerald-750 focus:ring-1 focus:ring-emerald-750 transition-all"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-stone-500">
                        {t('email' as any)} *
                      </label>
                      <input
                        type="email"
                        value={checkoutData.email}
                        onChange={(e) => setCheckoutData({ ...checkoutData, email: e.target.value })}
                        className="w-full bg-stone-100/50 border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-stone-850 font-medium focus:outline-none focus:border-emerald-750 focus:ring-1 focus:ring-emerald-750 transition-all"
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">
                      {t('phone' as any)} *
                    </label>
                    <input
                      type="tel"
                      value={checkoutData.phone}
                      onChange={(e) => setCheckoutData({ ...checkoutData, phone: e.target.value })}
                      className="w-full bg-stone-100/50 border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-stone-850 font-medium focus:outline-none focus:border-emerald-750 focus:ring-1 focus:ring-emerald-750 transition-all"
                      placeholder="+39 333 1234567"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">
                      {t('specialRequests' as any)}
                    </label>
                    <textarea
                      value={checkoutData.requests}
                      onChange={(e) => setCheckoutData({ ...checkoutData, requests: e.target.value })}
                      rows={3}
                      className="w-full bg-stone-100/50 border border-stone-300 rounded-xl px-4 py-2.5 text-xs text-stone-850 font-medium focus:outline-none focus:border-emerald-750 focus:ring-1 focus:ring-emerald-750 transition-all resize-none"
                      placeholder="Let us know..."
                    />
                  </div>
                </div>

                {/* 2. Servizi Aggiuntivi (Opzionali) */}
                <div className="bg-stone-50 border border-stone-300 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider border-b border-stone-300/50 pb-2">
                    {t('extraServicesTitle' as any)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Breakfast Card */}
                    <div
                      onClick={() => setExtraBreakfast(!extraBreakfast)}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${extraBreakfast
                        ? "bg-emerald-500/5 border-emerald-750 shadow-sm"
                        : "bg-white border-stone-300 hover:bg-stone-100/40"
                        }`}
                    >
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${extraBreakfast ? "bg-emerald-800 text-white" : "bg-stone-200 text-primary"
                        }`}>
                        <Coffee className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-850">
                            {t('extraBreakfastTitle' as any)}
                          </span>
                          <input
                            type="checkbox"
                            checked={extraBreakfast}
                            onChange={() => { }}
                            className="accent-emerald-750 cursor-pointer pointer-events-none"
                          />
                        </div>
                        <p className="text-stone-500 text-[10px] mt-1 leading-normal">
                          {t('extraBreakfastDesc' as any)}
                        </p>
                        <span className="inline-block mt-2 font-bold text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                          +200 THB / {t('perDay')} / {t('perPerson')}
                        </span>
                      </div>
                    </div>

                    {/* AC Card */}
                    <div
                      onClick={() => setExtraAC(!extraAC)}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${extraAC
                        ? "bg-emerald-500/5 border-emerald-750 shadow-sm"
                        : "bg-white border-stone-300 hover:bg-stone-100/40"
                        }`}
                    >
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${extraAC ? "bg-emerald-800 text-white" : "bg-stone-200 text-primary"
                        }`}>
                        <Wind className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-850">
                            {t('extraACTitle' as any)}
                          </span>
                          <input
                            type="checkbox"
                            checked={extraAC}
                            onChange={() => { }}
                            className="accent-emerald-750 cursor-pointer pointer-events-none"
                          />
                        </div>
                        <p className="text-stone-500 text-[10px] mt-1 leading-normal">
                          {t('extraACDesc' as any)}
                        </p>
                        <span className="inline-block mt-2 font-bold text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                          +500 THB / forfait
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Selection */}
                <div className="bg-stone-50 border border-stone-300 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider border-b border-stone-300/50 pb-2">
                    {t('checkoutPaymentTitle' as any)}
                  </h3>

                  <div className="space-y-3">
                    {/* Option 1: Cash (Ksher - Credit & Debit Cards) */}
                    <div
                      onClick={() => setPaymentMethod('ksher_card')}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                        paymentMethod === 'ksher_card' || paymentMethod === 'ksher'
                          ? "bg-emerald-500/5 border-emerald-750 shadow-sm"
                          : "bg-white border-stone-300 hover:bg-stone-100/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'ksher_card' || paymentMethod === 'ksher'}
                        onChange={() => setPaymentMethod('ksher_card')}
                        className="accent-emerald-750 mt-1 cursor-pointer"
                      />
                      <div className="text-xs space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-850 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-emerald-800" />
                            {lang === 'IT' ? 'Carta di Credito / Debito (Visa, Mastercard, JCB)' : 'Credit / Debit Card (Visa, Mastercard, JCB)'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {lang === 'IT' ? 'Istantaneo (Cash)' : 'Instant (Cash)'}
                          </span>
                        </div>
                        <p className="text-stone-600 text-[11px] leading-relaxed">
                          {lang === 'IT'
                            ? "Paga in sicurezza con qualsiasi carta di credito/debito internazionale con accredito immediato."
                            : "Pay securely with any international credit/debit card with instant booking confirmation."}
                        </p>
                      </div>
                    </div>

                    {/* Option 2: Cash (Ksher - PromptPay QR Code) */}
                    <div
                      onClick={() => setPaymentMethod('ksher_promptpay')}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                        paymentMethod === 'ksher_promptpay'
                          ? "bg-emerald-500/5 border-emerald-750 shadow-sm"
                          : "bg-white border-stone-300 hover:bg-stone-100/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'ksher_promptpay'}
                        onChange={() => setPaymentMethod('ksher_promptpay')}
                        className="accent-emerald-750 mt-1 cursor-pointer"
                      />
                      <div className="text-xs space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-850 flex items-center gap-1.5">
                            <QrCode className="w-4 h-4 text-emerald-800" />
                            {lang === 'IT' ? 'PromptPay QR Code (Banche TH / Cross-Border)' : 'PromptPay QR Code (Thai Banks)'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {lang === 'IT' ? 'Conferma Automatica' : 'Auto 1-Sec'}
                          </span>
                        </div>
                        <p className="text-stone-600 text-[11px] leading-relaxed">
                          {lang === 'IT'
                            ? "Inquadra il QR con la tua app bancaria (KBank, SCB, Bangkok Bank) per la conferma istantanea senza bisogno di inviare ricevute."
                            : "Scan the dynamic QR with your Thai banking app for instant 1-second confirmation without sending slips."}
                        </p>
                      </div>
                    </div>

                    {/* Option 3: PayPal Express with Official Logo */}
                    <div
                      onClick={() => setPaymentMethod('paypal')}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                        paymentMethod === 'paypal'
                          ? "bg-blue-500/5 border-[#003087]/50 shadow-sm"
                          : "bg-white border-stone-300 hover:bg-stone-100/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'paypal'}
                        onChange={() => setPaymentMethod('paypal')}
                        className="accent-[#003087] mt-1 cursor-pointer"
                      />
                      <div className="text-xs space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {/* Official PayPal Dual-P Monogram + Wordmark Logo */}
                            <svg className="h-5 w-auto" viewBox="0 0 95 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10.8 1.8H4.2C3.6 1.8 3.1 2.2 3 2.8L0.2 19.8C0.1 20.3 0.5 20.7 0.9 20.7H4.6C5.1 20.7 5.6 20.3 5.7 19.8L6.7 13.5C6.8 12.9 7.3 12.5 7.9 12.5H10C14.5 12.5 17.5 10.3 18.2 6C18.5 4.3 18 3.2 16.9 2.6C15.7 1.8 13.7 1.8 10.8 1.8Z" fill="#003087"/>
                              <path d="M11.5 6.8H7.5C7.3 6.8 7.1 7 7.1 7.2L6 14C6 14.2 6.2 14.4 6.4 14.4H8.5C12.1 14.4 14.5 12.6 15 9.2C15.3 7.8 14.8 7 14 6.6C13.2 6.8 12.3 6.8 11.5 6.8Z" fill="#0079C1"/>
                              <text x="22" y="18" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontStyle="italic" fontSize="18" fill="#003087">Pay<tspan fill="#0079C1">Pal</tspan></text>
                            </svg>
                          </div>
                          <span className="text-[10px] font-bold text-[#003087] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            PayPal Express
                          </span>
                        </div>
                        <p className="text-stone-600 text-[11px] leading-relaxed">
                          {lang === 'IT'
                            ? "Paga direttamente con il tuo account PayPal o con carta internazionale."
                            : "Pay directly with your PayPal account balance or international card."}
                        </p>
                      </div>
                    </div>

                    {/* Payment policy note */}
                    <div className="bg-stone-100/90 rounded-xl p-3.5 border border-stone-300 space-y-2 text-stone-700 leading-normal mt-3">
                      <span className="block font-bold text-stone-850 uppercase text-[9px] tracking-wider">
                        {t('paymentPolicyTitle' as any)}
                      </span>
                      <p className="text-[11px]">
                        <strong>{lang === 'IT' ? 'Acconto:' : 'Deposit:'}</strong> {lang === 'IT' ? '30% alla conferma della prenotazione.' : '30% deposit to secure your booking.'}
                      </p>
                      <div className="bg-amber-500/15 border border-amber-600/50 rounded-lg p-2.5 text-[11px] text-amber-950 font-medium space-y-0.5">
                        <div className="flex items-center gap-1 font-black text-amber-950 uppercase text-[11px]">
                          <Wallet className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                          <span>{lang === 'IT' ? 'Saldo da pagare al check-in (70%):' : 'Balance due at check-in (70%):'}</span>
                        </div>
                        <p className="text-amber-900 leading-tight">
                          {lang === 'IT' ? 'in Contanti (Thai Baht), PromptPay, Wise o Revolut.' : 'via Cash (THB), PromptPay, Wise, or Revolut.'}
                        </p>
                      </div>
                      <p className="text-[11px] text-stone-600">
                        <strong>{lang === 'IT' ? 'Cancellazione:' : 'Cancellation:'}</strong> {t('cancellationPolicyDesc' as any)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm py-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  {bookingLoading ? "..." : t('checkoutConfirmBtn' as any)}
                </button>
              </form>

              {/* Booking Summary Sidebar (Right) */}
              <div className="lg:col-span-5 bg-stone-50 border border-stone-300 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider border-b border-stone-300/50 pb-2">
                  {t('checkoutSummaryTitle' as any)}
                </h3>

                {/* Room Info */}
                <div className="flex gap-4 border-b border-stone-300/50 pb-4">
                  {selectedRoom.images && selectedRoom.images.length > 0 && (
                    <img
                      src={selectedRoom.images[0]}
                      alt={selectedRoom.category}
                      className="w-20 h-20 object-cover rounded-xl border border-stone-300 flex-shrink-0"
                    />
                  )}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-[#a2b997] bg-stone-800 px-2.5 py-0.5 rounded-full uppercase">
                      {selectedRoom.category}
                    </span>
                    <h4 className="font-bold text-sm text-stone-850 mt-1 leading-snug">
                      {selectedRoom.name}
                    </h4>
                  </div>
                </div>

                {/* Stay Details */}
                <div className="space-y-3.5 text-xs border-b border-stone-300/50 pb-4">
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold uppercase">CHECK-IN:</span>
                    <span className="font-extrabold text-stone-800">{checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold uppercase">CHECK-OUT:</span>
                    <span className="font-extrabold text-stone-800">{checkOut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold uppercase">DURATA:</span>
                    <span className="font-extrabold text-stone-800">{stayDays} {lang === 'IT' ? 'Notti' : 'Nights'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold uppercase">OSPITI:</span>
                    <span className="font-extrabold text-stone-800">{guests} {guests > 1 ? t('guestPlural') : t('guestSingular')}</span>
                  </div>
                </div>

                {/* Coupon Box - V20 Fucsia Style (Requirement 2) */}
                <div className="bg-fuchsia-50/90 border border-fuchsia-200/80 rounded-xl p-3.5 space-y-2.5 my-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-fuchsia-800 font-extrabold text-xs uppercase tracking-wider">
                      <Percent className="w-3.5 h-3.5 text-fuchsia-600" />
                      <span>{lang === 'IT' ? 'Codice Promozionale / Coupon' : 'Promo Code / Coupon'}</span>
                    </div>
                    {appliedPromo && (
                      <span className="text-[10px] bg-fuchsia-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        {appliedPromo.discountType === 'percentage' ? `-${appliedPromo.discountValue}%` : `-฿${appliedPromo.discountValue}`}
                      </span>
                    )}
                  </div>

                  {!appliedPromo ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={lang === 'IT' ? 'Es. WELCOME2026' : 'e.g. WELCOME2026'}
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value);
                          setPromoError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleValidatePromo(promoInput);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-fuchsia-300 rounded-lg text-stone-800 font-bold tracking-wider uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleValidatePromo(promoInput)}
                        className="px-3 py-1.5 text-xs font-bold bg-fuchsia-600 hover:bg-fuchsia-700 active:scale-95 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        {lang === 'IT' ? 'Applica' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-white border border-fuchsia-300 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-fuchsia-900 tracking-wider">
                          🎟️ {appliedPromo.code}
                        </span>
                        <span className="text-[11px] text-fuchsia-700 font-semibold">
                          ({appliedPromo.discountType === 'percentage' ? `-${appliedPromo.discountValue}%` : `-฿${appliedPromo.discountValue}`})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-[11px] text-stone-500 hover:text-red-600 font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        ✕ {lang === 'IT' ? 'Rimuovi' : 'Remove'}
                      </button>
                    </div>
                  )}

                  {promoError && (
                    <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                      ⚠️ {promoError}
                    </p>
                  )}

                  {promoSuccess && (
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      ✅ {promoSuccess}
                    </p>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 text-xs pt-1">
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">{lang === 'IT' ? "Tariffa Base" : "Base Rate"} ({stayDays} notti)</span>
                    <span className="font-bold text-stone-750">
                      {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format((selectedPricing.basePriceLordo ?? selectedPricing.original) * stayDays)}
                    </span>
                  </div>

                  {!appliedPromo && selectedPricing.savings > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>
                        {stayDays >= 30 && "Sconto Digital Nomads (30+ gg)"}
                        {stayDays >= 15 && stayDays < 30 && "Sconto Digital Nomads (15-29 gg)"}
                        {stayDays < 15 && "Sconto Prenotazione Diretta (-10%)"}
                      </span>
                      <span>
                        -{selectedPricing.savings}%
                      </span>
                    </div>
                  )}

                  {/* Extra Guests Surcharge */}
                  {selectedPricing.extraGuests > 0 && (
                    <div className="flex justify-between text-stone-700 font-medium border-t border-stone-300/30 pt-2.5">
                      <span>{lang === 'IT' ? "Ospiti Aggiuntivi" : "Extra Guests"} ({Math.max(0, guests - selectedRoom.baseGuests)} x 200 THB x {stayDays} notti)</span>
                      <span className="font-bold text-stone-750">
                        +{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(selectedPricing.extraGuests)}
                      </span>
                    </div>
                  )}

                  {/* Promo Coupon Discount (Requirement 5) */}
                  {checkoutPricing.promoDiscount > 0 && appliedPromo && (
                    <div className="flex justify-between text-fuchsia-700 font-bold border-t border-fuchsia-200/50 pt-2.5">
                      <span className="flex items-center gap-1">
                        🎟️ Coupon ({appliedPromo.code})
                      </span>
                      <span>
                        -{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(checkoutPricing.promoDiscount)}
                      </span>
                    </div>
                  )}

                  {/* Breakfast Extra */}
                  {extraBreakfast && (
                    <div className="flex justify-between text-stone-700 font-medium border-t border-stone-300/30 pt-2.5">
                      <span>{t('extraBreakfastTitle' as any)} (200 THB x {guests} x {stayDays})</span>
                      <span className="font-bold text-stone-750">
                        +{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(checkoutPricing.breakfast)}
                      </span>
                    </div>
                  )}

                  {/* AC Extra */}
                  {extraAC && (
                    <div className="flex justify-between text-stone-700 font-medium border-t border-stone-300/30 pt-2.5">
                      <span>{t('extraACTitle' as any)} (500 THB forfait)</span>
                      <span className="font-bold text-stone-750">
                        +{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(checkoutPricing.ac)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-stone-300 pt-3 text-stone-500">
                    <span>{t('paymentTax' as any)}</span>
                    <span className="font-medium">10% VAT / 7% City Tax</span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-stone-300/50">
                    <span className="font-bold text-stone-600 text-xs uppercase">
                      {lang === 'IT' ? 'Totale Soggiorno' : 'Total Stay'}
                    </span>
                    <span className="text-lg font-bold text-stone-750">
                      {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(checkoutPricing.finalTotal)}
                    </span>
                  </div>

                  {/* 30% Deposit Card with VAT 7% & Incorporated Fees */}
                  {(() => {
                    const baseDeposit30 = Math.round(checkoutPricing.finalTotal * 0.3);
                    const depositPricing = calculatePaymentTotal(
                      baseDeposit30,
                      paymentMethod,
                      lang.toLowerCase() as any
                    );
                    const balanceDue = checkoutPricing.finalTotal - baseDeposit30;

                    return (
                      <>
                        <div className="bg-emerald-500/5 border border-emerald-750/35 rounded-xl p-3.5 mt-2 space-y-1">
                          <div className="flex justify-between items-baseline">
                            <span className="font-extrabold text-emerald-800 text-xs uppercase tracking-wide">
                              {lang === 'IT' ? 'Totale da Pagare Oggi' : 'Total Amount Payable Today'}
                            </span>
                            <span className="text-xl font-black text-emerald-800">
                              {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(depositPricing.finalTotal)}
                            </span>
                          </div>
                          <span className="block text-[10px] text-emerald-900/80 font-medium leading-normal">
                            {depositPricing.disclaimer}
                          </span>
                          <span className="block text-[10px] text-stone-500 font-medium leading-normal pt-0.5">
                            {t('cancellationPolicyDesc' as any)}
                          </span>
                        </div>

                        {/* 70% Balance Box - Inequivocabile & High Contrast */}
                        <div className="bg-amber-500/10 border-2 border-amber-600/50 rounded-xl p-3.5 space-y-1.5 shadow-sm">
                          <div className="flex justify-between items-baseline">
                            <div className="flex items-center gap-1.5">
                              <Wallet className="w-4 h-4 text-amber-700 flex-shrink-0" />
                              <span className="font-black text-amber-950 text-xs uppercase tracking-wide">
                                {t('balanceAtCheckIn' as any)}
                              </span>
                            </div>
                            <span className="text-xl font-black text-amber-950 tracking-tight">
                              {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(balanceDue)}
                            </span>
                          </div>
                          <span className="block text-[11px] text-amber-900 font-semibold leading-normal">
                            {t('balanceMethods' as any)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* --- SEARCH & ROOM GRID (Normal view) --- */
          <>
            <div id="rooms-grid" className="mt-2 mb-6 flex items-center justify-between scroll-mt-20">
              <h2 className="font-sans text-2xl font-extrabold text-stone-700 tracking-tight">
                {t('filterTitle')}
              </h2>
              {!loading && (
                <span className="text-xs text-stone-500 font-medium bg-stone-200/60 px-3 py-1.5 rounded-full border border-stone-300">
                  {t('filterRoomsFound', { count: filteredAccommodations.length })}
                </span>
              )}
            </div>

            {/* --- MOBILE CATEGORY SELECTOR (Pill-shaped slider) --- */}
            <div className="flex md:hidden gap-2 overflow-x-auto pb-4 mb-6 snap-x no-scrollbar">
              {CATEGORY_ITEMS.map((item) => {
                const Icon = item.icon
                const isSelected = selectedCategory === item.name

                const labelKey =
                  item.name === "Tutti" ? 'filterCompass' :
                    item.name === "Ville" ? 'filterVilla' :
                      item.name === "Bungalow" ? 'filterBungalow' :
                        item.name === "Tende Glamping" ? 'filterGlamping' :
                          'filterGuesthouse';

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedCategory(item.name)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 border text-xs font-bold whitespace-nowrap snap-align-start cursor-pointer shadow-sm ${isSelected
                      ? "bg-emerald-800 border-emerald-800 text-white"
                      : "bg-stone-50 border-stone-300 text-stone-600 active:bg-stone-100"
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-primary"}`} />
                    <span>{t(labelKey as any)}</span>
                  </button>
                )
              })}
            </div>

            {/* --- DESKTOP CATEGORY SELECTOR (Original card grid) --- */}
            <div className="hidden md:grid md:grid-cols-5 gap-4 mb-10">
              {CATEGORY_ITEMS.map((item) => {
                const Icon = item.icon
                const isSelected = selectedCategory === item.name

                const labelKey =
                  item.name === "Tutti" ? 'filterCompass' :
                    item.name === "Ville" ? 'filterVilla' :
                      item.name === "Bungalow" ? 'filterBungalow' :
                        item.name === "Tende Glamping" ? 'filterGlamping' :
                          'filterGuesthouse';

                const descKey =
                  item.name === "Tutti" ? 'filterCompassDesc' :
                    item.name === "Ville" ? 'filterVillaDesc' :
                      item.name === "Bungalow" ? 'filterBungalowDesc' :
                        item.name === "Tende Glamping" ? 'filterGlampingDesc' :
                          'filterGuesthouseDesc';

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedCategory(item.name)}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-300 border text-center group cursor-pointer ${isSelected
                      ? "bg-emerald-800 border-emerald-800 text-white shadow-md"
                      : "bg-stone-50 border-stone-300 text-stone-600 hover:border-stone-400 hover:bg-stone-100/50"
                      }`}
                  >
                    <div className={`p-3 rounded-xl mb-3 transition-colors ${isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-stone-200/50 text-primary group-hover:bg-stone-200"
                      }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold tracking-wider">
                      {t(labelKey as any)}
                    </span>
                    <span className={`text-[10px] mt-1 font-light ${isSelected ? "text-stone-300" : "text-stone-400"
                      }`}>
                      {t(descKey as any)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* --- LOADING STATE --- */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-stone-50 rounded-2xl overflow-hidden border border-stone-300 shadow-sm flex flex-col animate-pulse"
                  >
                    <div className="h-56 bg-stone-200" />
                    <div className="p-6 flex flex-col gap-3">
                      <div className="h-5 bg-stone-200 rounded w-3/4" />
                      <div className="h-3 bg-stone-200 rounded w-full" />
                      <div className="h-3 bg-stone-200 rounded w-5/6" />
                      <div className="h-3 bg-stone-200 rounded w-2/3" />
                      <div className="mt-4 pt-4 border-t border-stone-200 flex justify-between items-center">
                        <div className="h-6 bg-stone-200 rounded w-24" />
                        <div className="h-9 bg-stone-200 rounded w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- ERROR STATE --- */}
            {error && !loading && (
              <div className="text-center py-16 bg-red-50 rounded-2xl border border-red-200 p-8">
                <p className="text-red-600 text-sm font-medium">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 text-primary font-semibold text-sm hover:underline"
                >
                  Riprova
                </button>
              </div>
            )}

            {/* --- ACCOMMODATIONS GRID --- */}
            {!loading && !error && filteredAccommodations.length === 0 && (
              <div className="text-center py-16 bg-stone-50 rounded-2xl border border-stone-300 p-8">
                <p className="text-muted-foreground text-lg">
                  {lang === 'IT' && "Nessun alloggio soddisfa i criteri di ricerca selezionati."}
                  {lang === 'EN' && "No accommodations match your search criteria."}
                  {lang === 'TH' && "ไม่พบที่พักที่ตรงกับเงื่อนไขการค้นหาของคุณ"}
                  {lang === 'DE' && "Keine Unterkünfte entsprechen Ihren Suchkriterien."}
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory("Tutti")
                    setGuests(1)
                  }}
                  className="mt-4 text-primary font-semibold text-sm hover:underline"
                >
                  {t('resetFilters')}
                </button>
              </div>
            )}

            {!loading && !error && (
              <RoomGrid
                lang={lang}
                activeCategory={selectedCategory}
                guests={guests}
                checkIn={checkIn}
                checkOut={checkOut}
                oauthConnected={oauthConnected}
                onResetFilters={() => {
                  setSelectedCategory("Tutti")
                  setGuests(1)
                }}
                onExtendStay={(nightsNeeded: number) => {
                  if (!checkIn) return;
                  const date = parseLocalDate(checkIn);
                  date.setDate(date.getDate() + nightsNeeded);
                  const y = date.getFullYear();
                  const m = String(date.getMonth() + 1).padStart(2, '0');
                  const d = String(date.getDate()).padStart(2, '0');
                  const newCheckOut = `${y}-${m}-${d}`;
                  setCheckOut(newCheckOut);
                  setCheckOutCalendarMonth(date);
                  setHasSearched(true);
                }}
                onSelectRoom={(room, pricing, extras) => {
                  setSelectedRoom(room)
                  setSelectedPricing(pricing)
                  setExtraBreakfast(extras.breakfast)
                  setExtraAC(extras.ac)
                  // Scroll to top to focus on checkout
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Bright Yellow & Neon Red Banner (Requirement 3 V23) */}
      {appliedPromo && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-400 border-t-4 border-red-600 shadow-[0_-4px_25px_rgba(220,38,38,0.5)] px-4 py-3 transition-all duration-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider animate-pulse shadow-md shrink-0">
                <Percent className="w-3.5 h-3.5 text-white" />
                {appliedPromo.discountType === 'percentage' ? `-${appliedPromo.discountValue}%` : `-฿${appliedPromo.discountValue}`}
              </span>
              <div className="text-xs md:text-sm font-black text-stone-950 flex items-center gap-2 truncate">
                <span className="text-base">🎟️</span>
                <span className="text-red-700 font-black uppercase tracking-wider shrink-0">
                  {lang === 'IT' ? 'COPERTURA SCONTO ATTIVA:' : 'ACTIVE DISCOUNT COVERAGE:'}
                </span>
                <span className="truncate text-stone-950 font-black">
                  {lang === 'IT' ? `Applicato il codice ${appliedPromo.code}` : `Code ${appliedPromo.code} applied`}
                </span>
                <span className="hidden md:inline text-stone-800 font-bold text-xs">
                  ({lang === 'IT' ? 'sconto applicato su camera + ospiti' : 'valid on room + extra guests'})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemovePromo}
              className="p-1.5 text-stone-900 hover:text-red-700 hover:bg-yellow-300 rounded-full transition-colors cursor-pointer shrink-0 font-bold"
              title={lang === 'IT' ? 'Rimuovi codice promozionale' : 'Remove promo code'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}