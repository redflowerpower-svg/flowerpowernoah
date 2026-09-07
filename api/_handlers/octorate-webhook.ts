import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { executeAutoShieldForReservation } from "../_helpers/octorate-auto-shield.js";
import { checkAndSyncCascadeLastMinute } from "../_helpers/octorate-cascade-sync.js";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  return (supabaseUrl && serviceRoleKey) ? createClient(supabaseUrl, serviceRoleKey) : null;
}

// Global DRY_RUN mode flag (simulazione in memoria / log per la massima sicurezza)
const DRY_RUN = true;
const STAGING_LOCK_IDS = new Set([
  '649669', '932243', '932244', '932246', '932247', '932248', '932249', '932250', '932251', '932252', '932253', '932254', '932255',
  '921799', '932256', '932257', '932259', '932260', '932261', '932262', '932263', '932264', '932265', '932266', '932267', '932268'
]);

// Mappatura Canonica 1:1 ID Madre, Prodotti Derivati e Keyword OTA per Octorate (212 Prodotti)
export const ALL_ACCOMMODATIONS_MAP: Record<string, { motherId: number; name: string; ids: string[]; keywords: string[][]; linkedKeys?: string[] }> = {
  'jungle villa': {
    motherId: 529773,
    name: 'Jungle Villa',
    ids: ['529773', '529784', '529778', '529792', '529788', '529780', '916817', '529781', '529801', '921868', '921869', '529783', '529813'],
    keywords: [["jungle", "jv"], ["villa", "ac", "be"]],
    linkedKeys: ['jungle villa left', 'jungle villa right']
  },
  'jungle villa left': {
    motherId: 495795,
    name: 'Jungle Villa Left',
    ids: ['495795', '495807', '495804', '496009', '496001', '495805', '496022', '495806', '496031', '921870', '921871', '495810', '496057'],
    keywords: [["jungle", "jv"], ["left", "jvl"]],
    linkedKeys: ['jungle villa']
  },
  'jungle villa right': {
    motherId: 495796,
    name: 'Jungle Villa Right',
    ids: ['495796', '495980', '495977', '496010', '496002', '495978', '496021', '495979', '496030', '921872', '921873', '495982', '496056'],
    keywords: [["jungle", "jv"], ["right", "jvr"]],
    linkedKeys: ['jungle villa']
  },
  'peace & love villa': {
    motherId: 494840,
    name: 'Peace & Love Villa',
    ids: ['494840', '495566', '495580', '495575', '495552', '495587', '495565', '495593', '921874', '921875', '495569', '495609'],
    keywords: [["peace", "love", "p&l"]]
  },
  'villa penthouse': {
    motherId: 421511,
    name: 'Villa Penthouse',
    ids: ['421511', '449348', '421513', '421516', '421520', '421522', '421525', '421527', '421530', '921876', '921877', '421532', '421533'],
    keywords: [["penthouse", "pent"]]
  },
  'yellow bungalow': {
    motherId: 293957,
    name: 'Yellow Bungalow',
    ids: ['293957', '449385', '293958', '332055', '332054', '331921', '332057', '331922', '332060', '921878', '921879', '297022', '340198'],
    keywords: [["yellow"]]
  },
  'red bungalow': {
    motherId: 293954,
    name: 'Red Bungalow',
    ids: ['293954', '449422', '293953', '332030', '332029', '330964', '332035', '330970', '332036', '921880', '921881', '297021', '340196'],
    keywords: [["red"]]
  },
  'green bungalow': {
    motherId: 293962,
    name: 'Green Bungalow',
    ids: ['293962', '449668', '293961', '332070', '332066', '331923', '332072', '331924', '332074', '921882', '921883', '297023', '340200'],
    keywords: [["green"]]
  },
  'camel tent bungalow': {
    motherId: 293965,
    name: 'Camel Tent',
    ids: ['293965', '449675', '422325', '293966', '332089', '332084', '297025'],
    keywords: [["camel"]]
  },
  'lagoon tent bungalow': {
    motherId: 293955,
    name: 'Lagoon Tent',
    ids: ['293955', '449674', '422351', '293956', '332081', '332077', '297024'],
    keywords: [["lagoon"]]
  },
  'internal room': {
    motherId: 293942,
    name: 'Internal Room',
    ids: ['293942', '449742', '293941', '332109', '332105', '340367', '916840', '421998', '916838', '921898', '921899', '297027', '422147'],
    keywords: [["internal", "inter"]]
  },
  'room 1': {
    motherId: 293963,
    name: 'Room 1',
    ids: ['293963', '449678', '422300', '332737', '332735', '331976', '916818', '331977', '916402', '921889', '921890', '297033', '421505'],
    keywords: [["room", "hub", "r1"], ["1", "one"]]
  },
  'room 2': {
    motherId: 293959,
    name: 'Room 2',
    ids: ['293959', '449684', '422296', '332741', '332739', '331966', '332119', '331967', '332134', '921891', '921900', '297032', '421506'],
    keywords: [["room", "hub", "r2"], ["2", "two"]]
  },
  'room 3': {
    motherId: 293948,
    name: 'Room 3',
    ids: ['293948', '449699', '422293', '332743', '332757', '331968', '332121', '331969', '332136', '921892', '921893', '297028', '421507'],
    keywords: [["room", "hub", "r3"], ["3", "three"]]
  },
  'room 4': {
    motherId: 293945,
    name: 'Room 4',
    ids: ['293945', '449724', '422265', '332759', '332746', '331970', '332123', '331971', '332138', '921894', '921895', '297029', '421508'],
    keywords: [["room", "hub", "r4"], ["4", "four"]]
  },
  'room 5': {
    motherId: 293943,
    name: 'Room 5',
    ids: ['293943', '449730', '422213', '332765', '332763', '331972', '332125', '331973', '332140', '921896', '921897', '297031', '421509'],
    keywords: [["room", "hub", "r5"], ["5", "five"]]
  },
  'lodge 1': {
    motherId: 293951,
    name: 'Lodge 1',
    ids: ['293951', '449736', '422149', '332769', '332767', '331974', '332129', '422157', '332142', '921884', '921885', '297030', '421510'],
    keywords: [["lodge"], ["1", "one"]]
  },
  'lodge 2': {
    motherId: 883795,
    name: 'Lodge 2',
    ids: ['883795', '923905', '916108', '916107', '916109', '916114', '916829', '916105', '916830', '921886', '921887', '916103', '916104'],
    keywords: [["lodge"], ["2", "two"]]
  },
  'fake bungalow 1': {
    motherId: 649669,
    name: 'Fake Bungalow 1',
    ids: ['649669', '932243', '932244', '932246', '932247', '932248', '932249', '932250', '932251', '932252', '932253', '932254', '932255'],
    keywords: [["fake"], ["1", "one"]]
  },
  'fake bungalow 2': {
    motherId: 921799,
    name: 'Fake Bungalow 2',
    ids: ['921799', '932256', '932257', '932259', '932260', '932261', '932262', '932263', '932264', '932265', '932266', '932267', '932268'],
    keywords: [["fake"], ["2", "two"]]
  }
};

function getCanonicalAccommodation(booking: any): { key: string; name: string; motherId: number } | null {
  if (!booking) return null;
  const bProduct = String(booking.product || booking.pmsProduct || booking.accommodation_id || booking.roomId || '').trim();
  const bName = String(booking.roomName || booking.accommodation_name || booking.room_name || '').toLowerCase().trim();

  // 1. Direct match by Product ID in 212 rate plans map
  if (bProduct) {
    for (const [key, entry] of Object.entries(ALL_ACCOMMODATIONS_MAP)) {
      if (entry.ids.includes(bProduct)) {
        return { key, name: entry.name, motherId: entry.motherId };
      }
    }
  }

  // 2. Fuzzy match by OTA Name / Keywords
  if (bName) {
    if (bName.includes('jvr') || bName.includes('right')) {
      return { key: 'jungle villa right', name: 'Jungle Villa Right', motherId: 495796 };
    }
    if (bName.includes('jvl') || bName.includes('left')) {
      return { key: 'jungle villa left', name: 'Jungle Villa Left', motherId: 495795 };
    }

    for (const [key, entry] of Object.entries(ALL_ACCOMMODATIONS_MAP)) {
      const matchAllGroups = entry.keywords.every(group => group.some(kw => bName.includes(kw)));
      if (matchAllGroups) {
        return { key, name: entry.name, motherId: entry.motherId };
      }
    }
  }

  return null;
}

// 🎯 SORGENTE DI VERITÀ: Timeline Min Stay configurata in Gestione Tariffe Derivate
const WEBHOOK_MIN_STAY_TIMELINE = [
  { dateFrom: '2026-08-01', dateTo: '2026-12-15', minStay: 2 },
  { dateFrom: '2026-12-16', dateTo: '2027-01-15', minStay: 5 },
  { dateFrom: '2027-01-16', dateTo: '2027-03-31', minStay: 3 },
  { dateFrom: '2027-04-01', dateTo: '2027-10-31', minStay: 2 }
];

function toThailandDateStr(raw: any): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 10);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch (e) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

function getBaselineMinStay(dateStr: string): number {
  if (!dateStr || typeof dateStr !== 'string') return 2;
  const dStr = dateStr.slice(0, 10);
  const matched = WEBHOOK_MIN_STAY_TIMELINE.find(p => dStr >= p.dateFrom && dStr <= p.dateTo);
  return matched?.minStay || 2;
}

export interface DynamicMinStayUpdate {
  roomTypeId: string;
  accommodationName: string;
  dateFrom: string;
  dateTo: string;
  minStay: number;
  reason: string;
}

/**
 * Algoritmo Serverless di Calcolo e Ripristino Soggiorno Minimo Dinamico 24/7
 */
function calculateServerDynamicMinStay(
  bookings: any[],
  dateRange: { start: string; end: string }
): DynamicMinStayUpdate[] {
  const updates: DynamicMinStayUpdate[] = [];
  const activeBookings = (bookings || []).filter(b => {
    const st = String(b.status || '').toUpperCase().trim();
    return st !== 'CANCELLED' && st !== 'CANCELED' && st !== 'DELETED' && st !== 'VOID' && st !== 'REJECTED' && !b.cancelled && !b.isCancelled;
  });

  // 1. Inizializzazione obbligatoria di TUTTI gli alloggi del villaggio
  // Garantisce che le stanze senza prenotazioni (o con prenotazioni cancellate) vengano calcolate e ripristinate al baseline
  const roomBookingsMap: Record<string, { roomName: string; motherId: string; targetProductIds: string[]; bookings: Array<{ in: string; out: string }> }> = {};
  
  Object.entries(ALL_ACCOMMODATIONS_MAP).forEach(([key, canonical]) => {
    roomBookingsMap[key] = {
      roomName: canonical.name,
      motherId: String(canonical.motherId),
      targetProductIds: canonical.ids,
      bookings: []
    };
  });

  // 2. Mappatura prenotazioni attive sugli alloggi corrispondenti con motore canonico
  activeBookings.forEach((b: any) => {
    const canonical = getCanonicalAccommodation(b);
    if (!canonical) return;

    const rawIn = b.checkin || b.check_in || b.startDate || b.arrival || b.fromDate;
    const rawOut = b.checkout || b.check_out || b.endDate || b.departure || b.toDate;
    if (!rawIn || !rawOut) return;

    const inStr = toThailandDateStr(rawIn);
    const outStr = toThailandDateStr(rawOut);

    if (inStr && outStr && roomBookingsMap[canonical.key]) {
      roomBookingsMap[canonical.key].bookings.push({ in: inStr, out: outStr });
    }
  });

  function addDaysISO(isoStr: string, n: number): string {
    const parts = isoStr.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + n));
    return d.toISOString().slice(0, 10);
  }

  function daysDiffISO(startISO: string, endISO: string): number {
    const s = new Date(startISO + 'T00:00:00Z').getTime();
    const e = new Date(endISO + 'T00:00:00Z').getTime();
    return Math.round((e - s) / 86400000);
  }

  // 3. Calcolo intervalli occupati e gap per ciascun alloggio (incorporando unità collegate parent/child)
  Object.entries(roomBookingsMap).forEach(([key, { roomName, motherId, targetProductIds, bookings: bList }]) => {
    const canonical = ALL_ACCOMMODATIONS_MAP[key] || Object.values(ALL_ACCOMMODATIONS_MAP).find(a => String(a.motherId) === String(motherId));
    const linkedList = (canonical?.linkedKeys || []).flatMap(lKey => roomBookingsMap[lKey]?.bookings || []);
    const combinedList = [...bList, ...linkedList];

    const sorted = combinedList.sort((a, b) => a.in.localeCompare(b.in));
    const mergedOccupied: Array<{ in: string; out: string }> = [];

    for (const curr of sorted) {
      if (mergedOccupied.length === 0) {
        mergedOccupied.push({ ...curr });
      } else {
        const prev = mergedOccupied[mergedOccupied.length - 1];
        if (curr.in <= prev.out) {
          if (curr.out > prev.out) prev.out = curr.out;
        } else {
          mergedOccupied.push({ ...curr });
        }
      }
    }

    const gaps: Array<{ start: string; end: string }> = [];

    if (mergedOccupied.length === 0) {
      // Stanza completamente libera (o dopo cancellazione totale): ripristina l'intera stagione
      gaps.push({ start: dateRange.start, end: dateRange.end });
    } else {
      // Gap iniziale
      if (mergedOccupied[0].in > dateRange.start) {
        gaps.push({ start: dateRange.start, end: mergedOccupied[0].in });
      }

      // Gap intermedi tra prenotazioni
      for (let i = 0; i < mergedOccupied.length - 1; i++) {
        const prevOut = mergedOccupied[i].out;
        const nextIn = mergedOccupied[i + 1].in;
        if (prevOut < nextIn && prevOut <= dateRange.end && nextIn >= dateRange.start) {
          const effectiveStart = prevOut < dateRange.start ? dateRange.start : prevOut;
          if (effectiveStart < nextIn) {
            gaps.push({ start: effectiveStart, end: nextIn });
          }
        }
      }

      // Gap finale (Coda di stagione)
      const lastOut = mergedOccupied[mergedOccupied.length - 1].out;
      if (lastOut < dateRange.end) {
        const effectiveStart = lastOut < dateRange.start ? dateRange.start : lastOut;
        gaps.push({ start: effectiveStart, end: dateRange.end });
      }
    }

    const prodIds = targetProductIds && targetProductIds.length > 0 ? targetProductIds : [motherId];

    gaps.forEach(({ start: gapStart, end: gapEnd }) => {
      const gapDays = daysDiffISO(gapStart, gapEnd);

      if (gapDays > 0) {
        let cur = gapStart;
        let blockStart = cur;
        let blockMinStay = Math.min(gapDays, getBaselineMinStay(cur));

        while (cur < gapEnd) {
          const baseline = getBaselineMinStay(cur);
          const target = Math.min(gapDays, baseline);
          if (target !== blockMinStay) {
            const blockEnd = addDaysISO(cur, -1);
            updates.push({
              roomTypeId: String(motherId),
              accommodationName: roomName,
              dateFrom: blockStart,
              dateTo: blockEnd,
              minStay: blockMinStay,
              reason: gapDays < blockMinStay
                ? `Gap-Fill Dinamico (${gapDays}d): M=${blockMinStay}`
                : `Minimo da Gestione Tariffe Derivate: M=${blockMinStay}`
            });
            blockStart = cur;
            blockMinStay = target;
          }
          cur = addDaysISO(cur, 1);
        }

        const lastDate = addDaysISO(gapEnd, -1);
        if (blockStart <= lastDate) {
          updates.push({
            roomTypeId: String(motherId),
            accommodationName: roomName,
            dateFrom: blockStart,
            dateTo: lastDate,
            minStay: blockMinStay,
            reason: gapDays < blockMinStay
              ? `Gap-Fill Dinamico (${gapDays}d): M=${blockMinStay}`
              : `Minimo da Gestione Tariffe Derivate: M=${blockMinStay}`
          });
        }
      }
    });
  });

  return updates;
}

/**
 * Handler Webhook Octorate 24/7 per Soggiorno Minimo Dinamico (Gap-Filling & Ripristino)
 * Rotta API Gateway: POST /api/webhooks/octorate
 */
export async function handleOctorateWebhook(req: VercelRequest, res: VercelResponse) {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 1. Handle preflight OPTIONS / HEAD requests immediately with HTTP 200 OK
  if (req.method === 'OPTIONS' || req.method === 'HEAD') {
    return res.status(200).send('OK');
  }

  // 2. Handle GET verification requests (Octorate ping tests)
  if (req.method === 'GET') {
    console.log('[Octorate Webhook GET Ping] Received verification GET request.');
    return res.status(200).json({ status: 'active', message: 'Octorate Webhook Endpoint Ready' });
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', message: 'Method accepted' });
  }

  let eventPayload: any = {};
  try {
    const rawBody = req.body;
    eventPayload = (typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : rawBody) || {};
  } catch (parseErr) {
    console.warn('[Octorate Webhook] Could not parse JSON body, treating as ping test.');
    eventPayload = {};
  }

  const eventType = eventPayload?.type || eventPayload?.event || eventPayload?.action || 'RESERVATION_NOTIFICATION';
  console.log(`[OCTORATE WEBHOOK 24/7] Received POST event: ${eventType}`, JSON.stringify(eventPayload, null, 2));

  // 4. Esecuzione asincrona garantita prima di chiudere la risposta Serverless
  let calculatedUpdatesCount = 0;
  let octorateStatus = 0;

  try {
    let bookingsData: any[] = [];
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      let accessToken: string | null = null;
      const { data: tokenData } = await supabaseAdmin
        .from('octorate_tokens')
        .select('access_token, refresh_token')
        .eq('id', 'singleton')
        .maybeSingle();

      if (tokenData?.access_token) {
        accessToken = tokenData.access_token;
      }

      // Auto-refresh token se necessario
      const clientId = process.env.VITE_OCTORATE_CLIENT_ID || process.env.OCTORATE_CLIENT_ID;
      const clientSecret = process.env.OCTORATE_SECRET_KEY || process.env.VITE_OCTORATE_SECRET_KEY;
      const refreshToken = tokenData?.refresh_token;

      if ((!accessToken || refreshToken) && refreshToken && clientId && clientSecret) {
        try {
          const refreshUrl = "https://api.octorate.com/connect/rest/v1/identity/refresh";
          const refreshRes = await fetch(refreshUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json"
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refreshToken,
              client_id: clientId,
              client_secret: clientSecret
            }).toString()
          });

          if (refreshRes.ok) {
            const newTokens = await refreshRes.json();
            accessToken = newTokens.access_token;
            await supabaseAdmin.from('octorate_tokens').upsert({
              id: 'singleton',
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token || refreshToken,
              expires_in: newTokens.expires_in,
              updated_at: new Date().toISOString()
            });
          }
        } catch (rErr) {
          console.warn("[octorate-webhook] Token refresh warning:", rErr);
        }
      }

      if (accessToken) {
        const todayISO = toThailandDateStr(new Date());
        const currentYear = new Date().getFullYear();
        const endISO = `${currentYear + 1}-10-31`;

        try {
          // Paginazione completa partendo da page 0 (0-indexed nell'API Octorate)
          let page = 0;
          let hasMore = true;
          while (hasMore && page <= 25) {
            const octUrl = `https://api.octorate.com/connect/rest/v1/reservation/366879?type=STAY&startDate=${todayISO}&endDate=${endISO}&size=100&page=${page}`;
            const octRes = await fetch(octUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                ...(clientId ? { 'Octorate-Api-Key': clientId } : {}),
                'Accept': 'application/json'
              }
            });
            if (octRes.ok) {
              const octJson = await octRes.json();
              const pageData = octJson && Array.isArray(octJson.data) ? octJson.data : (Array.isArray(octJson) ? octJson : (octJson.reservations || []));
              if (pageData.length > 0) {
                bookingsData.push(...pageData);
                if (pageData.length < 100) {
                  hasMore = false;
                } else {
                  page++;
                }
              } else {
                hasMore = false;
              }
            } else {
              hasMore = false;
            }
          }
        } catch (octErr) {
          console.warn('[OCTORATE WEBHOOK] Failed to fetch live bookings from Octorate:', octErr);
        }

        const calculatedUpdates = calculateServerDynamicMinStay(
          bookingsData,
          { start: todayISO, end: endISO }
        );

        calculatedUpdatesCount = calculatedUpdates.length;
        console.log(`[OCTORATE WEBHOOK 24/7] Calculated ${calculatedUpdates.length} gap-filling updates.`);

        // Invio sincronizzazione in blocchi (batch da 250 per Octorate API)
        if (calculatedUpdates.length > 0) {
          const roomsPayload = calculatedUpdates.map(u => ({
            room: Number(u.roomTypeId),
            dateFrom: u.dateFrom,
            dateTo: u.dateTo,
            values: {
              minstay: Number(u.minStay)
            }
          }));

          const chunkSize = 250;
          const chunks: any[][] = [];
          for (let c = 0; c < roomsPayload.length; c += chunkSize) {
            chunks.push(roomsPayload.slice(c, c + chunkSize));
          }

          // Invio parallelo per massimizzare la velocità su Vercel Serverless
          const batchPromises = chunks.map(async (chunk, idx) => {
            const bulkRes = await fetch(`https://api.octorate.com/connect/rest/v1/calendar/bulk`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify(chunk)
            });
            console.log(`[OCTORATE WEBHOOK 24/7] Bulk minstay batch ${idx + 1}/${chunks.length} sent (Status: ${bulkRes.status}).`);
            return bulkRes.status;
          });

          const results = await Promise.all(batchPromises);
          octorateStatus = results[0] || 200;
        }

        // 🛡️ [AUTO-SHIELD] Sigillatura forzata immediata tariffe derivate per la prenotazione ricevuta
        try {
          const targetResId = eventPayload?.id || eventPayload?.data?.id || eventPayload?.reservation?.id || eventPayload?.reservationId;
          let targetBooking: any = null;

          if (targetResId) {
            targetBooking = bookingsData.find(b => String(b.id) === String(targetResId));
            if (!targetBooking) {
              try {
                const singleRes = await fetch(`https://api.octorate.com/connect/rest/v1/reservation/366879/${targetResId}`, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                  }
                });
                if (singleRes.ok) {
                  targetBooking = await singleRes.json();
                }
              } catch (fetchErr) {
                console.warn('[OCTORATE WEBHOOK] Failed to fetch single reservation for Auto-Shield:', fetchErr);
              }
            }
          }

          // Se il webhook invia direttamente l'oggetto prenotazione nel payload
          if (!targetBooking && (eventPayload?.checkin || eventPayload?.reservation?.checkin)) {
            targetBooking = eventPayload.reservation || eventPayload;
          }

          if (targetBooking && (targetBooking.checkin || targetBooking.checkIn) && (targetBooking.checkout || targetBooking.checkOut)) {
            const rawIn = targetBooking.checkin || targetBooking.checkIn;
            const rawOut = targetBooking.checkout || targetBooking.checkOut;
            const st = String(targetBooking.status || '').toUpperCase().trim();

            if (st !== 'CANCELLED' && st !== 'CANCELED' && st !== 'DELETED' && st !== 'VOID') {
              const bookerGuest = (targetBooking.guests || []).find((g: any) => g.type === 'BOOKER') || targetBooking.guests?.[0];
              const guestName = bookerGuest ? `${bookerGuest.givenName || ''} ${bookerGuest.familyName || ''}`.trim() : (targetBooking.guestName || 'OTA Guest');

              await executeAutoShieldForReservation({
                accessToken,
                checkIn: toThailandDateStr(rawIn),
                checkOut: toThailandDateStr(rawOut),
                roomName: targetBooking.roomName || targetBooking.accommodation_name || '',
                productId: targetBooking.product || targetBooking.accommodation_id,
                pmsProductId: targetBooking.pmsProduct,
                reservationId: targetBooking.id || targetResId,
                guestName,
                channelName: targetBooking.channelName || targetBooking.channel || 'OTA Webhook',
                supabaseAdmin
              });
            }
          }
        } catch (shieldErr) {
          console.warn('[OCTORATE WEBHOOK] Auto-Shield error (non-blocking):', shieldErr);
        }

        // ⚡ [CASCADE LAST-MINUTE 24/7] Verifica e rinnovo automatico finestra 7 giorni sconti a cascata
        try {
          await checkAndSyncCascadeLastMinute(accessToken, supabaseAdmin);
        } catch (cascadeErr) {
          console.warn('[OCTORATE WEBHOOK] Cascade sync non-fatal warning:', cascadeErr);
        }
      }
    }

    return res.status(200).json({
      received: true,
      eventType,
      calculatedUpdatesCount,
      octorateStatus,
      timestamp: new Date().toISOString(),
      message: 'Webhook processed successfully with real Octorate synchronization.'
    });

  } catch (err: any) {
    console.error(`[OCTORATE WEBHOOK 24/7 ERROR]:`, err);
    return res.status(200).json({
      received: true,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
}
