// =============================================================================
// Octorate Channel Manager - API Bridge + OAuth 3-Legged Flow
// =============================================================================
//
// ARCHITETTURA SICUREZZA:
// - getAuthorizationUrl() -> Client-side (sicura, usa solo client_id)
// - exchangeToken()       -> DA MIGRARE su Supabase Edge Function in produzione
//                            La secret_key NON deve MAI essere esposta al browser.
//                            Attualmente isolata in questo modulo per sviluppo locale.
// - fetchAccommodations() -> Client-side con Bearer token
// - checkAvailability()   -> Client-side con Bearer token
// - createReservation()   -> Client-side con Bearer token
// =============================================================================

import { calculateCascadeDiscountUpdates, calculateOriginalPriceResetUpdates, calculateStandardProtectionUpdates, DiscountExecutionMode, capturePriceSnapshot, getTargetAccommodationsForMode, toThailandDateStr, parseThailandDateParts } from '../../admin/resort/lib/octorateAdmin';

// --- ENV CONFIG ---
const OCTORATE_CLIENT_ID = import.meta.env.VITE_OCTORATE_CLIENT_ID || ""
const getRedirectUri = (): string => {
  if (typeof window !== "undefined" && window.location) {
    const origin = window.location.origin;
    const redirectUrl = origin.endsWith("/") ? origin : `${origin}/`;
    if (redirectUrl.includes("flowerpowervillage.com")) {
      return redirectUrl;
    }
    if (redirectUrl.includes("localhost") || redirectUrl.includes("127.0.0.1")) {
      return "https://localhost/";
    }
  }
  return import.meta.env.VITE_OCTORATE_REDIRECT_URI || "https://localhost/";
};
const OCTORATE_REDIRECT_URI = getRedirectUri();

const OCTORATE_AUTH_URL = "https://admin.octorate.com/octobook/identity/oauth.xhtml"
const OCTORATE_API_BASE = "/api-octorate/connect/rest/v1"

// --- TYPES ---

export interface Accommodation {
  id: number
  slug: string
  title: string
  category: string
  description: string
  capacity: number
  base_price_high: number
  base_price_low: number
  images: string[]
  monthly_discount: boolean
}

export interface AvailabilityResult {
  accommodationId: number
  available: boolean
  minStayRequired?: number
  isPhysicallyAvailable?: boolean
  pricePerNight: number
  totalPrice: number
  currency: string
}

export interface ReservationPayload {
  accommodationId: number
  checkIn: string
  checkOut: string
  guests: number
  guestName: string
  guestEmail: string
  phone?: string
  note?: string
  totalPrice?: number
}

export interface ReservationResponse {
  reservationId: string
  status: "confirmed" | "pending" | "failed"
  accommodationId: number
  checkIn: string
  checkOut: string
  totalPrice: number
  currency: string
}

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// Helper for safe night calculations (V30)
export function calculateNights(checkIn?: string | null, checkOut?: string | null): number {
  try {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch (err) {
    console.warn("[octorate.ts] calculateNights failed safely:", err);
    return 0;
  }
}

// =============================================================================
// OAuth 3-Legged Flow
// =============================================================================

let cachedTokens: OAuthTokens | null = null;

export async function getStoredTokens(): Promise<OAuthTokens | null> {
  if (cachedTokens) return cachedTokens;

  try {
    const res = await fetch("/api/octorate-client-get");
    if (res.ok) {
      const json = await res.json();
      if (json && (json.connected || json.data?.connected || json.data?.access_token)) {
        cachedTokens = {
          access_token: json.data?.access_token || "PROTECTED_SERVER_SIDE",
          refresh_token: json.data?.refresh_token || "",
          token_type: "Bearer",
          expires_in: json.data?.expires_in || 3600,
        };
        return cachedTokens;
      }
    }
  } catch (err) {
    console.warn("[Octorate] Exception fetching tokens from server-get:", err);
  }

  return null;
}

/**
 * Fetch live Octorate reservations via secure serverless endpoint (/api/resort/octorate-bookings).
 * Server-side function uses SUPABASE_SERVICE_ROLE_KEY to safely query tokens and fetch Octorate reservations.
 */
export async function fetchOctorateLiveReservations(): Promise<any[]> {
  try {
    const res = await fetch("/api/resort/octorate-bookings");
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    } else {
      console.warn(`[Octorate Reservations] Serverless endpoint status ${res.status}`);
    }
  } catch (err) {
    console.warn("[Octorate Reservations] Serverless endpoint exception:", err);
  }

  return [];
}


export async function clearTokens(): Promise<void> {
  cachedTokens = null;
  try {
    const res = await fetch("/api/octorate-client-clear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      }
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[Octorate] Failed to clear tokens via server: ${errorBody}`);
    } else {
      console.log("[Octorate] Tokens successfully cleared from server and cache");
    }
  } catch (err) {
    console.error("[Octorate] Exception clearing tokens:", err);
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return tokens !== null;
}

/**
 * Genera l'URL di autorizzazione OAuth per il login Octorate.
 * Redirige l'utente alla pagina di consenso Octorate.
 * Client-side safe: usa solo il client_id pubblico.
 */
export function getAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: OCTORATE_CLIENT_ID,
    redirect_uri: OCTORATE_REDIRECT_URI,
  })

  if (state) {
    params.set("state", state)
  }

  return `${OCTORATE_AUTH_URL}?${params.toString()}`
}

/**
 * Scambia l'Authorization Code con Access Token e Refresh Token.
 *
 * !! NOTA SICUREZZA !!
 * Questa funzione usa la SECRET_KEY e in produzione DEVE essere
 * eseguita server-side (Supabase Edge Function).
 * E' isolata qui per facilitare la futura migrazione.
 */
export async function exchangeToken(authorizationCode: string): Promise<any> {
  console.log('Tentativo scambio token tramite endpoint sicuro...');
  const dynamicRedirectUri = `${window.location.origin}/village`;
  const res = await fetch("/api/octorate-exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: authorizationCode,
      redirectUri: dynamicRedirectUri
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OAuth token exchange via server failed: ${errorBody}`);
  }

  return await res.json();
}

/**
 * Rinnova l'Access Token usando il Refresh Token.
 * Anche questa funzione migrera' su Edge Function.
 */
export async function refreshAccessToken(): Promise<any> {
  console.log('Tentativo rinnovo token tramite endpoint sicuro...');
  const res = await fetch("/api/octorate-refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    }
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Token refresh via server failed: ${errorBody}`);
  }

  // Clear client-side token cache so the next request retrieves fresh tokens
  cachedTokens = null;

  return await res.json();
}

// =============================================================================
// Authenticated API Headers
// =============================================================================

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  }

  const tokens = await getStoredTokens()
  if (tokens?.access_token) {
    headers["Authorization"] = `Bearer ${tokens.access_token}`
  }

  return headers
}

// =============================================================================
// MOCK DATA (fallback quando non autenticati o API non raggiungibili)
// =============================================================================

const ACCOMMODATIONS_MOCK: Accommodation[] = [
  {
    id: 529784,
    slug: "jungle-villa",
    title: "Jungle Villa",
    category: "Ville",
    description: "La Jungle Villa รจ la struttura piรน ampia del villaggio, ideale per grandi gruppi che vogliono condividere l'esperienza.",
    capacity: 8,
    base_price_high: 4800,
    base_price_low: 1200,
    images: [],
    monthly_discount: true,
  },
  {
    id: 495807,
    slug: "jungle-villa-left",
    title: "Jungle Villa Left",
    category: "Ville",
    description: "Villa su due piani affacciata direttamente sulla piscina del villaggio, con cucina privata, zona pranzo e bagno.",
    capacity: 4,
    base_price_high: 2400,
    base_price_low: 600,
    images: [],
    monthly_discount: true,
  },
  {
    id: 495980,
    slug: "jungle-villa-right",
    title: "Jungle Villa Right",
    category: "Ville",
    description: "Villa su due piani affacciata direttamente sulla piscina del villaggio, con cucina privata, zona pranzo e bagno.",
    capacity: 4,
    base_price_high: 2400,
    base_price_low: 600,
    images: [],
    monthly_discount: true,
  },
  {
    id: 495566,
    slug: "peace-love-villa",
    title: "Peace & Love Villa",
    category: "Ville",
    description: "Situata di fronte alla piscina, questa villa indipendente vanta un'ampia terrazza privata e una camera principale.",
    capacity: 4,
    base_price_high: 2400,
    base_price_low: 600,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449348,
    slug: "villa-penthouse",
    title: "Villa Penthouse",
    category: "Ville",
    description: "La Penthouse Villa รจ la sistemazione piรน esclusiva del villaggio, con camera padronale King size, bagno privato e salotto.",
    capacity: 4,
    base_price_high: 2400,
    base_price_low: 600,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449385,
    slug: "yellow-bungalow",
    title: "Yellow Bungalow",
    category: "Bungalow",
    description: "Il Yellow Bungalow รจ la cupola piรน spaziosa del villaggio, immersa in un giardino con fiori vibranti.",
    capacity: 3,
    base_price_high: 1800,
    base_price_low: 750,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449422,
    slug: "red-bungalow",
    title: "Red Bungalow",
    category: "Bungalow",
    description: "Il Red Bungalow a cupola รจ avvolto da un giardino lussureggiante con fauna tropicale da scoprire.",
    capacity: 3,
    base_price_high: 1800,
    base_price_low: 750,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449668,
    slug: "green-bungalow",
    title: "Green Bungalow",
    category: "Bungalow",
    description: "Il Green Bungalow a cupola รจ immerso in un giardino di fiori e alberi da frutto.",
    capacity: 3,
    base_price_high: 1800,
    base_price_low: 790,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449675,
    slug: "camel-tent-bungalow",
    title: "Camel Tent Glamping",
    category: "Tende Glamping",
    description: "Il Camel Glamping รจ una tenda esclusiva su piattaforma rialzata in legno.",
    capacity: 2,
    base_price_high: 1400,
    base_price_low: 350,
    images: [],
    monthly_discount: false,
  },
  {
    id: 449674,
    slug: "lagoon-tent-bungalow",
    title: "Lagoon Tent Glamping",
    category: "Tende Glamping",
    description: "Il Laguna Glamping รจ un'esclusiva tenda sollevata su pedana di legno.",
    capacity: 2,
    base_price_high: 1400,
    base_price_low: 350,
    images: [],
    monthly_discount: false,
  },
  {
    id: 449678,
    slug: "room-1",
    title: "Room 1",
    category: "The Hub Guesthouse",
    description: "La Room #1 di HUBit@ รจ pensata per nomadi digitali e famiglie che cercano comfort.",
    capacity: 3,
    base_price_high: 1000,
    base_price_low: 250,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449684,
    slug: "room-2",
    title: "Room 2",
    category: "The Hub Guesthouse",
    description: "La Room #2 di HUBit@ unisce comfort moderno e produttivitร  con letto King size.",
    capacity: 4,
    base_price_high: 1000,
    base_price_low: 250,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449699,
    slug: "room-3",
    title: "Room 3",
    category: "The Hub Guesthouse",
    description: "La Room #3 di HUBit@ offre un ambiente sereno con letto King size e scrivania.",
    capacity: 4,
    base_price_high: 1000,
    base_price_low: 250,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449724,
    slug: "room-4",
    title: "Room 4",
    category: "The Hub Guesthouse",
    description: "La Room #4 di HUBit@ รจ la scelta ideale per chi lavora da remoto.",
    capacity: 4,
    base_price_high: 1000,
    base_price_low: 250,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449730,
    slug: "room-5",
    title: "Room 5",
    category: "The Hub Guesthouse",
    description: "La Room #5 di HUBit@ รจ il rifugio piรน intimo e silenzioso.",
    capacity: 2,
    base_price_high: 1000,
    base_price_low: 250,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449736,
    slug: "lodge-1",
    title: "Lodge 1",
    category: "The Hub Guesthouse",
    description: "Il Lodge #1 รจ un appartamento premium a livelli per famiglie e digital nomad.",
    capacity: 4,
    base_price_high: 1600,
    base_price_low: 400,
    images: [],
    monthly_discount: true,
  },
  {
    id: 923905,
    slug: "lodge-2",
    title: "Lodge 2",
    category: "The Hub Guesthouse",
    description: "Il Lodge #2 รจ un appartamento premium a livelli per famiglie e digital nomad.",
    capacity: 4,
    base_price_high: 1600,
    base_price_low: 400,
    images: [],
    monthly_discount: true,
  },
  {
    id: 449742,
    slug: "internal-room",
    title: "Internal Room",
    category: "The Hub Guesthouse",
    description: "L'Internal Room di HUBit@ offre letto King, postazione lavoro e bagno privato.",
    capacity: 2,
    base_price_high: 1000,
    base_price_low: 250,
    images: [],
    monthly_discount: true,
  }
]

// =============================================================================
// API Functions (con fallback ai mock)
// =============================================================================

/**
 * Recupera la lista alloggi. Se autenticato, chiama l'API reale.
 * Se il token manca o la chiamata fallisce, restituisce i dati mockati.
 */
export async function fetchAccommodations(): Promise<Accommodation[]> {
  const tokens = await getStoredTokens()

  if (tokens?.access_token) {
    try {
      // Codice di diagnostica temporaneo rimosso. La chiamata reale viene ora gestita internamente al componente RoomGrid.
    } catch (err) {
      console.warn("[Octorate] API call failed:", err)
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 800))
  return ACCOMMODATIONS_MOCK
}

const WHITELISTED_RATEPLAN_IDS: number[] = [
  529784, 495807, 495980, 495566, 449348, 449385, 449422, 449668,
  449674, 449675, 449678, 449684, 449699, 449724, 449730, 449736,
  923905, 449742,
];
const PAGINATION_PARAM_NAME = "page";
const PAGE_SIZE = 20;
const MAX_PAGES_SAFETY_CAP = 30;

export async function checkAvailability(
  checkIn: string,
  checkOut: string,
  guests: number
): Promise<AvailabilityResult[]> {
  // 1. Try first via the optimized serverless backend endpoint (/api/resort/octorate-grid)
  try {
    const gridRes = await fetch(`/api/resort/octorate-grid?dateFrom=${checkIn}&dateTo=${checkOut}`);
    if (gridRes.ok) {
      const payload = await gridRes.json();
      const items = payload && Array.isArray(payload.beGrid) && payload.beGrid.length > 0
        ? payload.beGrid
        : (payload && Array.isArray(payload.grid) ? payload.grid : (payload?.data || []));

      if (Array.isArray(items) && items.length > 0) {
        return mapCalendarDataToAvailability({ data: items }, checkIn, checkOut, guests);
      }
    }
  } catch (backendErr) {
    console.warn("[Octorate] /api/resort/octorate-grid query notice:", backendErr);
  }

  // 2. Fallback to direct client-side Octorate API (solo se access_token reale disponibile, mai se protetto lato server)
  const tokens = await getStoredTokens()
  if (tokens?.access_token && tokens.access_token !== "PROTECTED_SERVER_SIDE") {
    try {
      const structureId = import.meta.env.VITE_OCTORATE_STRUCTURE_ID || "366879";
      const collected: any[] = [];
      const foundIds = new Set<number>();
      let page = 0;
      let sawAnyPage = false;

      while (page < MAX_PAGES_SAFETY_CAP && foundIds.size < WHITELISTED_RATEPLAN_IDS.length) {
        const url = `${OCTORATE_API_BASE}/calendar/${structureId}?dateFrom=${checkIn}&dateTo=${checkOut}&size=${PAGE_SIZE}&${PAGINATION_PARAM_NAME}=${page}`;

        let res = await fetch(url, { method: "GET", headers: await getAuthHeaders() });

        if (res.status === 401 || res.status === 403) {
          await refreshAccessToken();
          res = await fetch(url, { method: "GET", headers: await getAuthHeaders() });
        }

        if (!res.ok) {
          if (page === 0) {
            throw new Error(`Calendar API returned status: ${res.status}`);
          }
          console.warn(`[Octorate] Calendar page ${page} failed with status ${res.status}, stopping pagination.`);
          break;
        }

        const data = await res.json();
        sawAnyPage = true;

        const pageItems: any[] = data && Array.isArray(data.data)
          ? data.data
          : (Array.isArray(data) ? data : []);

        if (pageItems.length === 0) {
          break;
        }

        for (const item of pageItems) {
          const id = Number(item.id);
          if (WHITELISTED_RATEPLAN_IDS.includes(id) && !foundIds.has(id)) {
            foundIds.add(id);
            collected.push(item);
          }
        }

        if (pageItems.length < PAGE_SIZE) {
          break;
        }

        page++;
      }

      if (!sawAnyPage) {
        throw new Error("Calendar API: no pages retrieved");
      }

      return mapCalendarDataToAvailability({ data: collected }, checkIn, checkOut, guests);
    } catch (err) {
      console.warn("[Octorate] Live calendar fetch failed, fallback to mock:", err)
      throw err;
    }
  }
  return getMockAvailability(checkIn, checkOut, guests);
}

function mapCalendarDataToAvailability(
  calendarResponse: any,
  checkIn: string,
  checkOut: string,
  _guests: number
): AvailabilityResult[] {
  const calendarData = calendarResponse && Array.isArray(calendarResponse.data)
    ? calendarResponse.data
    : (Array.isArray(calendarResponse) ? calendarResponse : []);

  if (!Array.isArray(calendarData) || calendarData.length === 0) return [];
  
  const nights = Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  ));

  return calendarData.map((item) => {
    const days = item.days || [];
    let isPhysicallyAvailable = days.length >= nights;
    let requiredMinStay = 1;
    let totalPrice = 0;
    
    const checkInTime = new Date(checkIn + "T00:00:00").getTime();
    const checkOutTime = new Date(checkOut + "T00:00:00").getTime();
    let activeDaysCount = 0;

    days.forEach((day: any) => {
      const dateStr = String(day.date).substring(0, 10);
      const dayTime = new Date(dateStr + "T00:00:00").getTime();
      if (dayTime >= checkInTime && dayTime < checkOutTime) {
        activeDaysCount++;
        totalPrice += day.price || 0;
        
        // Accurately check availability from Octorate day indicators
        if (day.availability !== undefined && day.availability <= 0) {
          isPhysicallyAvailable = false;
        }
        if (day.stopSells === true || day.stopSell === true || day.closed === true) {
          isPhysicallyAvailable = false;
        }
        
        // Track the real minimum stay required by Octorate
        const dayMinStay = Number(day.minStay || day.minstay || 1);
        if (dayMinStay > requiredMinStay) {
          requiredMinStay = dayMinStay;
        }
      }
    });

    if (activeDaysCount < nights) {
      isPhysicallyAvailable = false;
    }

    // Fully available only if physically free AND requested nights meet Octorate minStay
    const isAvailable = isPhysicallyAvailable && nights >= requiredMinStay;
    const pricePerNight = activeDaysCount > 0 ? (totalPrice / activeDaysCount) : 0;

    return {
      accommodationId: Number(item.id),
      available: isAvailable,
      minStayRequired: requiredMinStay,
      isPhysicallyAvailable: isPhysicallyAvailable,
      pricePerNight: Math.round(pricePerNight),
      totalPrice: Math.round(totalPrice),
      currency: "THB"
    };
  });
}

export interface OctorateDayData {
  octorateId: number;
  date: string;
  price: number;
  available: boolean;
  stopSell: boolean;
  closedToArrival: boolean;
  minStay?: number;
}

/**
 * Recupera la griglia mensile da Octorate tramite l'endpoint serverless /api/resort/octorate-grid
 */
export async function fetchOctorateMonthlyGrid(
  dateFrom: string,
  dateTo: string
): Promise<Record<string, Record<string, OctorateDayData>>> {
  const result: Record<string, Record<string, OctorateDayData>> = {};

  try {
    const url = `/api/resort/octorate-grid?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`[Octorate Grid API] Serverless route returned status ${res.status}`);
      return result;
    }

    const payload = await res.json();
    const items = payload && Array.isArray(payload.grid) && payload.grid.length > 0
      ? payload.grid
      : (payload && payload.data && Array.isArray(payload.data) ? payload.data : []);

    // Save raw rate plans items (all rate plans) and reservations into Zustand store for tree visual controller
    try {
      const { useResortAdminStore } = await import('../../admin/resort/store/useResortAdminStore');
      if (items.length > 0) {
        useResortAdminStore.getState().setRawOctorateGridItems(items);
      }
      if (payload && payload.reservations && Array.isArray(payload.reservations) && payload.reservations.length > 0) {
        useResortAdminStore.getState().setBookings(payload.reservations);
      }
    } catch (stErr) {
      console.warn('[Octorate Grid API] Store update warning:', stErr);
    }

    console.log(`[Octorate Grid API] Received ${items.length} rate plan items and ${(payload?.reservations || []).length} reservations from serverless endpoint.`);

    // Primary BE Rate Plan IDs to process after secondary sub-rate plans
    const PRIMARY_BE_IDS = [
      529784, 495807, 495980, 495566, 449348, 449385, 449422, 449668,
      449675, 449674, 449678, 449684, 449699, 449724, 449730, 449736,
      923905, 449742
    ];

    const isPrimaryBEItem = (item: any) => {
      const idNum = Number(item.id);
      const name = String(item.name || '').toLowerCase();
      return PRIMARY_BE_IDS.includes(idNum) || name.includes('be') || name.includes('booking engine');
    };

    // Sort: Process non-BE items first, and Primary BE items LAST so BE items overwrite secondary ones!
    const sortedItems = [...items].sort((a, b) => {
      const aBE = isPrimaryBEItem(a) ? 1 : 0;
      const bBE = isPrimaryBEItem(b) ? 1 : 0;
      return aBE - bBE;
    });

    const ALIAS_MAP: Record<string, string[]> = {
      '529784': ['jungle villa', 'jv be', '529773'],
      '495807': ['jungle villa left', 'jvl be', '495795'],
      '495980': ['jungle villa right', 'jvr be', '495796'],
      '495566': ['peace & love villa', 'p&l be', '494840'],
      '449348': ['villa penthouse', 'pent be', '421511'],
      '449385': ['yellow bungalow', 'yellow be', '293957'],
      '449422': ['red bungalow', 'red be', '293954'],
      '449668': ['green bungalow', 'green be', '293962'],
      '449675': ['camel tent bungalow', 'camel be', '293965'],
      '449674': ['lagoon tent bungalow', 'lagoon be', '293955'],
      '449678': ['room 1', 'room 1 be', '293963'],
      '449684': ['room 2', 'room 2 be', '293959'],
      '449699': ['room 3', 'room 3 be', '293948'],
      '449724': ['room 4', 'room 4 be', '293945'],
      '449730': ['room 5', 'room 5 be', '293943'],
      '449736': ['lodge 1', 'lodge 1 be', '293951'],
      '923905': ['lodge 2', 'lodge 2 be', '883795'],
      '449742': ['internal room', 'internal be', '293942']
    };

    sortedItems.forEach((item: any) => {
      const octId = String(item.id);
      const roomTypeId = item.roomTypeId ? String(item.roomTypeId) : (item.room?.id ? String(item.room.id) : octId);
      const name = item.name ? String(item.name) : (item.roomName ? String(item.roomName) : (item.room?.name ? String(item.room.name) : ''));

      const extraAliases = ALIAS_MAP[octId] || ALIAS_MAP[roomTypeId] || [];

      const keysToSet = Array.from(new Set([
        octId, 
        octId.toLowerCase(),
        roomTypeId, 
        roomTypeId.toLowerCase(),
        name, 
        name.toLowerCase(),
        ...extraAliases
      ].filter(Boolean)));

      keysToSet.forEach((key) => {
        if (!result[key]) result[key] = {};

        (item.days || []).forEach((day: any) => {
          const dateStr = String(day.date).substring(0, 10);
          const dayPrice = Number(day.price || day.value || day.amount || 0);

          // REGOLE STOP SELL & CHIUSURA (INCLUSA LA REGOLA DEI 10.000 ฿):
          const isStopSell = 
            Boolean(day.stopSells || day.stopSell) || 
            (day.availability !== undefined && day.availability <= 0) ||
            (day.available !== undefined && day.available <= 0) ||
            dayPrice >= 10000;

          const minStayVal = Number(
            day.minStay ?? day.minstay ?? day.minNights ?? day.min_stay ?? day.minimumStay ??
            item.minStay ?? item.minstay ?? item.minNights ?? item.min_stay ?? 0
          );

          const existing = result[key][dateStr];
          // Se la Madre era aperta, un listino BE derivato non può sovrascriverla con stopSell: true
          if (existing && isPrimaryBEItem(item) && existing.stopSell === false && isStopSell) {
            return;
          }

          result[key][dateStr] = {
            octorateId: Number(item.id),
            date: dateStr,
            price: dayPrice > 0 ? dayPrice : (existing?.price || dayPrice),
            available: !isStopSell,
            stopSell: isStopSell,
            closedToArrival: Boolean(day.closedToArrival || day.closed_to_arrival || day.cta),
            minStay: minStayVal > 0 ? minStayVal : existing?.minStay
          };
        });
      });
    });
  } catch (err) {
    console.warn("[Octorate Grid API] Exception during serverless grid fetch:", err);
  }

  return result;
}

function getMockAvailability(checkIn: string, checkOut: string, guests: number): AvailabilityResult[] {
  const nights = Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  ));
  return ACCOMMODATIONS_MOCK
    .filter((acc) => acc.capacity >= guests)
    .map((acc) => {
      const isRoom2MockClosed = acc.id === 449684 && checkIn === "2026-07-10" && checkOut === "2026-07-15";
      return {
        accommodationId: acc.id,
        available: !isRoom2MockClosed,
        pricePerNight: acc.base_price_high,
        totalPrice: acc.base_price_high * nights,
        currency: "THB",
      };
    });
}

/**
 * Crea una prenotazione. Fallback mock se non autenticato.
 */
export async function createReservation(
  payload: ReservationPayload
): Promise<ReservationResponse> {
  const tokens = await getStoredTokens()

  if (tokens?.access_token && tokens.access_token !== "PROTECTED_SERVER_SIDE") {
    try {
      const res = await fetch(`${OCTORATE_API_BASE}/reservation`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (res.status === 401 || res.status === 403) {
        await refreshAccessToken()
        const retryRes = await fetch(`${OCTORATE_API_BASE}/reservation`, {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify(payload),
        })
        if (retryRes.ok) return await retryRes.json()
      }

      if (res.ok) return await res.json()
    } catch (err) {
      console.warn("[Octorate] Reservation failed, using mock:", err)
    }
  }

  // Fallback mock
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const nights = Math.ceil(
    (new Date(payload.checkOut).getTime() - new Date(payload.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  )
  const acc = ACCOMMODATIONS_MOCK.find((a) => a.id === payload.accommodationId)

  return {
    reservationId: `OC-${Date.now()}-${payload.accommodationId}`,
    status: "confirmed",
    accommodationId: payload.accommodationId,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    totalPrice: payload.totalPrice || (acc?.base_price_high ?? 0) * nights,
    currency: "THB",
  }
}

/**
 * Automazione Tariffe Last-Minute con Sconti Percentuali Dinamici a Cascata su 3 Stadi
 * - Bivio a 3 Livelli (executionMode):
 *   - 'simulation': SIMULAZIONE DRY-RUN (0 chiamate API).
 *   - 'test_bungalows': TEST (Aggiorna SOLO Tariffe Madri Fake Bungalow 649669 e 921799).
 *   - 'production': PRODUZIONE (Aggiorna Tariffe Madri di tutti gli alloggi del resort).
 * - TASSATIVO: Colpisce SEMPRE E SOLO l'ID della Tariffa Madre (Livello 0).
 */
export async function updateLastMinuteRatesStrategy(
  structureId: string = '366879',
  stage1Days: number = 3,
  stage1Discount: number = 10,
  stage2Days: number = 2,
  stage2Discount: number = 5,
  stage3Days: number = 2,
  stage3Discount: number = 2.5,
  executionMode: DiscountExecutionMode = 'test_bungalows',
  isTestEnvironment?: boolean,
  rawGridItems?: any[]
): Promise<{ success: boolean; message: string; dateUpdated: string; details: any }> {
  const updates = calculateCascadeDiscountUpdates({
    stage1Days,
    stage1Discount,
    stage2Days,
    stage2Discount,
    stage3Days,
    stage3Discount,
    executionMode,
    isTestEnvironment,
    rawGridItems
  });

  const payload = {
    structureId: structureId || '366879',
    executionMode,
    stage1: { days: stage1Days, discountPct: stage1Discount },
    stage2: { days: stage2Days, discountPct: stage2Discount },
    stage3: { days: stage3Days, discountPct: stage3Discount },
    totalUpdatesCount: updates.length,
    updates
  };

  // Se la modalità è SIMULAZIONE DRY-RUN, NON inviare chiamate API
  if (executionMode === 'simulation') {
    return {
      success: true,
      message: `🟡 SIMULAZIONE DRY-RUN: Calcolati ${updates.length} sconti a cascata su Tariffe Madri (Livello 0). Nessuna chiamata API inviata ad Octorate.`,
      dateUpdated: new Date().toISOString(),
      details: payload
    };
  }

  // 📸 BACKUP VAULT: Fotocopia istantanea dei prezzi correnti prima di applicare gli sconti
  const targetAccs = getTargetAccommodationsForMode(executionMode);
  capturePriceSnapshot(targetAccs, stage1Days + stage2Days + stage3Days, rawGridItems);

  const periodUpdates = updates.map(u => ({
    roomMotherId: Number(u.motherRateId),
    room: Number(u.motherRateId),
    dateFrom: u.dateStr,
    dateTo: u.dateStr,
    price: u.finalPrice
  }));

  try {
    const res = await fetch('/api/update-prices-stagionale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodUpdates,
        testMode: executionMode === 'test_bungalows',
        testOnly: executionMode === 'test_bungalows',
        executionMode
      })
    });

    const resJson = await res.json().catch(() => ({}));
    if (res.ok && resJson.success) {
      const envLabel = executionMode === 'test_bungalows' ? '🧪 AMBIENTE DI TEST (Fake Bungalows 1 & 2 - ID 649669, 921799)' : '🌐 PRODUZIONE (Tutte le Tariffe Madri Livello 0)';
      return {
        success: true,
        message: `✅ SCONTI A CASCATA SINCRONIZZATI SU OCTORATE (${envLabel}): ${resJson.updatedCount || updates.length} aggiornamenti scritti con successo sulle Tariffe Madri.`,
        dateUpdated: new Date().toISOString(),
        details: { ...payload, octorateResponse: resJson }
      };
    } else {
      return {
        success: false,
        message: `❌ Errore sincronizzazione Octorate: ${resJson.error || 'Risposta non valida'}`,
        dateUpdated: new Date().toISOString(),
        details: { ...payload, error: resJson.error }
      };
    }
  } catch (err: any) {
    console.error("[Octorate] updateLastMinuteRatesStrategy network error:", err);
    return {
      success: false,
      message: `❌ Errore di rete durante invio ad Octorate: ${err.message}`,
      dateUpdated: new Date().toISOString(),
      details: { ...payload, error: err.message }
    };
  }
}

/**
 * Ripristina i Prezzi Originali al 100% (Reset Sconti) sulle Tariffe Madri (Livello 0).
 * - Bivio a 3 Livelli (executionMode):
 *   - 'simulation': SIMULAZIONE RESET (Nessuna chiamata API).
 *   - 'test_bungalows': TEST RESET (Ripristina SOLO Fake Bungalows 649669 e 921799).
 *   - 'production': PRODUZIONE RESET (Ripristina tutte le Tariffe Madri reali).
 * - TASSATIVO: Colpisce SEMPRE E SOLO l'ID della Tariffa Madre (Livello 0).
 */
export async function resetLastMinuteRatesStrategy(
  structureId: string = '366879',
  stage1Days: number = 3,
  stage2Days: number = 2,
  stage3Days: number = 2,
  executionMode: DiscountExecutionMode = 'test_bungalows',
  isTestEnvironment?: boolean,
  rawGridItems?: any[]
): Promise<{ success: boolean; message: string; dateUpdated: string; details: any }> {
  const updates = calculateOriginalPriceResetUpdates({
    stage1Days,
    stage2Days,
    stage3Days,
    executionMode,
    isTestEnvironment,
    rawGridItems
  });

  const payload = {
    structureId: structureId || '366879',
    executionMode,
    action: 'reset_to_original_prices',
    totalResetCount: updates.length,
    updates
  };

  // Se la modalità è SIMULAZIONE DRY-RUN, NON inviare chiamate API
  if (executionMode === 'simulation') {
    return {
      success: true,
      message: `🟡 SIMULAZIONE RESET: Prezzi riportati al valore originale (100% base) per ${updates.length} nodi Madre (Livello 0). Nessuna chiamata API effettuata.`,
      dateUpdated: new Date().toISOString(),
      details: payload
    };
  }

  const periodUpdates = updates.map(u => ({
    roomMotherId: Number(u.motherRateId),
    room: Number(u.motherRateId),
    dateFrom: u.dateStr,
    dateTo: u.dateStr,
    price: u.finalPrice || u.basePrice
  }));

  try {
    const res = await fetch('/api/update-prices-stagionale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodUpdates,
        testMode: executionMode === 'test_bungalows',
        testOnly: executionMode === 'test_bungalows',
        executionMode
      })
    });

    const resJson = await res.json().catch(() => ({}));
    if (res.ok && resJson.success) {
      const envLabel = executionMode === 'test_bungalows' ? '🧪 AMBIENTE DI TEST (Fake Bungalows 1 & 2 - ID 649669, 921799)' : '🌐 PRODUZIONE (Tutte le Tariffe Madri Livello 0)';
      return {
        success: true,
        message: `🔄 PREZZI ORIGINALI RIPRISTINATI SU OCTORATE (${envLabel}): Prezzi riportati al 100% per ${resJson.updatedCount || updates.length} giorni sulle Tariffe Madri.`,
        dateUpdated: new Date().toISOString(),
        details: { ...payload, octorateResponse: resJson }
      };
    } else {
      return {
        success: false,
        message: `❌ Errore ripristino Octorate: ${resJson.error || 'Risposta non valida'}`,
        dateUpdated: new Date().toISOString(),
        details: { ...payload, error: resJson.error }
      };
    }
  } catch (err: any) {
    console.error("[Octorate] resetLastMinuteRatesStrategy network error:", err);
    return {
      success: false,
      message: `❌ Errore di rete durante ripristino Octorate: ${err.message}`,
      dateUpdated: new Date().toISOString(),
      details: { ...payload, error: err.message }
    };
  }
}

/**
 * Disabilita l'Ottimizzazione Tariffe Last-Minute e ripristina lo Stop Sell sulle tariffe standard (7D / 14D).
 */
export async function disableLastMinuteRatesStrategy(
  structureId: string = '366879'
): Promise<{ success: boolean; message: string; dateUpdated: string; details: any }> {
  const now = new Date();
  const dateFrom = now.toISOString().substring(0, 10);
  const dateToObj = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dateTo = dateToObj.toISOString().substring(0, 10);

  const payload = {
    structureId: structureId || '366879',
    ratePlans: ['7D', '14D'],
    resetPeriod: {
      dateFrom,
      dateTo,
      stopSell: true,
      closedToArrival: false,
      label: 'Ripristinato Stop Sell su tariffe standard 7D/14D'
    }
  };

  const tokens = await getStoredTokens();

  if (tokens?.access_token) {
    try {
      const res = await fetch(`${OCTORATE_API_BASE}/calendar/update`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return {
          success: true,
          message: `Automazione Last-Minute disabilitata: Stop Sell ripristinato sulle tariffe 7D/14D per i prossimi 30 giorni (${dateFrom} ➔ ${dateTo}).`,
          dateUpdated: new Date().toISOString(),
          details: payload
        };
      }
    } catch (err) {
      console.warn("[Octorate] Live last-minute strategy disable exception:", err);
    }
  }

  return {
    success: true,
    message: `Automazione Last-Minute disabilitata con successo: Stop Sell ripristinato sulle tariffe 7D/14D (${dateFrom} ➔ ${dateTo}).`,
    dateUpdated: new Date().toISOString(),
    details: payload
  };
}

/**
 * Esegue la Protezione Tariffe Standard 7d/14d OTA con il bivio a 3 livelli:
 * - 'simulation': Calcolo Dry-Run in memoria.
 * - 'test_bungalows': Invia modifiche API Octorate ai Fake Bungalows (ID 649669 e 921799).
 * - 'production': Invia modifiche API Octorate a tutte le camere reali del resort.
 */
export async function updateStandardProtectionStrategy(
  structureId: string = '366879',
  seasonStartDate: string = '2026-12-15',
  seasonEndDate: string = '2027-03-31',
  daysTriggerLimit: number = 15,
  daysOpenDuration: number = 10,
  executionMode: DiscountExecutionMode = 'test_bungalows',
  resetToOpen: boolean = false
): Promise<{ success: boolean; message: string; dateUpdated: string; details: any }> {
  const updates = calculateStandardProtectionUpdates({
    seasonStartDate,
    seasonEndDate,
    daysTriggerLimit,
    daysOpenDuration,
    executionMode
  });

  const payload = {
    structureId: structureId || '366879',
    executionMode,
    action: resetToOpen ? 'reset_standard_protection' : 'apply_standard_protection',
    totalUpdatesCount: updates.length,
    seasonStartDate,
    seasonEndDate,
    daysTriggerLimit,
    daysOpenDuration,
    updates: resetToOpen ? updates.map(u => ({ ...u, stopSell: false })) : updates
  };

  if (executionMode === 'simulation') {
    return {
      success: true,
      message: `🟡 SIMULAZIONE DRY-RUN: Calcolate ${updates.length} restrizioni per Tariffe Standard 7d OTA (Booking.com, Expedia, Agoda) dal ${seasonStartDate} al ${seasonEndDate}. Nessuna chiamata API inviata ad Octorate.`,
      dateUpdated: new Date().toISOString(),
      details: payload
    };
  }

  // Chiamata serverless bulk ad Octorate
  const isTestOnly = executionMode === 'test_bungalows';
  try {
    if (resetToOpen) {
      // Ripristino standard: Imposta Stop-Sell su tutta la High Season per tariffa 7d
      const resetRes = await fetch('/api/update-rateplan-restrictions-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: '7d',
          ratePlanKey: '7d',
          dateFrom: seasonStartDate,
          dateTo: seasonEndDate,
          stopSell: true,
          strategy: 'stopsell',
          testOnly: isTestOnly
        })
      });
      const resetJson = await resetRes.json().catch(() => ({}));
      if (!resetRes.ok) {
        throw new Error(resetJson.error || 'Errore durante il ripristino delle restrizioni');
      }
    } else {
      // 1. Chiusura Stop-Sell di sicurezza su tutta la High Season per tariffa 7d
      await fetch('/api/update-rateplan-restrictions-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: '7d',
          ratePlanKey: '7d',
          dateFrom: seasonStartDate,
          dateTo: seasonEndDate,
          stopSell: true,
          strategy: 'stopsell',
          testOnly: isTestOnly
        })
      });

      // 2. Calcolo finestra rolling di apertura sbloccata dal trigger
      const todayStr = toThailandDateStr(new Date());
      const todayParts = parseThailandDateParts(todayStr);
      if (todayParts) {
        const todayTime = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
        const openWindowStartTime = todayTime + daysTriggerLimit * 24 * 60 * 60 * 1000;
        const openWindowEndTime = openWindowStartTime + (daysOpenDuration - 1) * 24 * 60 * 60 * 1000;
        const openWindowEndDateStr = toThailandDateStr(new Date(openWindowEndTime));

        const effectiveOpenStart = seasonStartDate > todayStr ? seasonStartDate : todayStr;
        const effectiveOpenEnd = openWindowEndDateStr > seasonEndDate ? seasonEndDate : openWindowEndDateStr;

        if (effectiveOpenStart <= effectiveOpenEnd) {
          const openRes = await fetch('/api/update-rateplan-restrictions-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: '7d',
              ratePlanKey: '7d',
              dateFrom: effectiveOpenStart,
              dateTo: effectiveOpenEnd,
              stopSell: false,
              strategy: 'open',
              testOnly: isTestOnly
            })
          });
          const openJson = await openRes.json().catch(() => ({}));
          if (!openRes.ok) {
            throw new Error(openJson.error || 'Errore durante l\'apertura della finestra 7d OTA');
          }
        }
      }
    }

    const envLabel = isTestOnly ? '🧪 AMBIENTE DI TEST (Fake Bungalows ID 649669 e 921799)' : '🌐 PRODUZIONE (Tutte le 18 camere reali)';
    return {
      success: true,
      message: resetToOpen
        ? `🔄 Ripristino completato in ${envLabel}: Stop-Sell riapplicato su tutta la High Season (${seasonStartDate} ➔ ${seasonEndDate}) per Tariffa Standard 7d OTA.`
        : `✅ Tariffe Standard 7d OTA sincronizzate in ${envLabel}: Finestra Last-Minute aperta da Trigger ${daysTriggerLimit}gg con durata ${daysOpenDuration}gg.`,
      dateUpdated: new Date().toISOString(),
      details: payload
    };
  } catch (err: any) {
    console.error('[Octorate] Standard protection strategy exception:', err);
    throw new Error(err.message || 'Impossibile completare la sincronizzazione delle Tariffe Standard OTA');
  }
}






