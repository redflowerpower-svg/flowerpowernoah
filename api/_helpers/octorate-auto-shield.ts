import { createClient } from "@supabase/supabase-js";

/**
 * Mappatura completa e autoritativa dei Rate ID derivati da chiudere TASSATIVAMENTE (Stop Sell forzato)
 * per ciascun alloggio fisico del resort.
 */
export const ACCOMMODATION_DISABLED_DERIVED_RATES: Record<string, number[]> = {
  // Peace & Love Villa (494840 / 883596)
  pl: [495552, 495565, 495587, 495593, 495609],
  
  // Jungle Villa Left (495795 / 883597)
  jvl: [495805, 495806, 496022, 496031, 496057],
  
  // Jungle Villa Right (495796 / 883598)
  jvr: [495978, 495979, 496021, 496030, 496056],
  
  // Jungle Villa Master (529773 / 883972 / 883595)
  jv: [529780, 529781, 916816, 529801, 529813],
  
  // Penthouse Villa (421511 / 883594)
  pent: [421522, 421527, 421525, 421530, 421533],
  
  // Yellow Bungalow (293957 / 294662 / 883592)
  yellow: [331921, 331922, 332057, 332060, 340198],
  
  // Green Bungalow (293962 / 294667 / 883593)
  green: [331923, 331924, 332072, 332074, 340200],
  
  // Red Bungalow (293954 / 294666 / 883591)
  red: [330964, 330970, 332035, 332036, 340196],
  
  // Internal room (293942 / 294670 / 883589)
  inter: [340367, 421998, 916840, 916838, 422147],
  
  // Room 1 (293963 / 294673 / 883584)
  r1: [331976, 331977, 916818, 916402, 421505],
  
  // Room 2 (293959 / 294674 / 883585)
  r2: [331966, 331967, 332119, 332134, 421506],
  
  // Room 3 (293948 / 294676 / 883586)
  r3: [331968, 331969, 332121, 332136, 421507],
  
  // Room 4 (293945 / 294677 / 883587)
  r4: [331970, 331971, 332123, 332138, 421508],
  
  // Room 5 (293943 / 294678 / 883588)
  r5: [331972, 331973, 332125, 332140, 421509],
  
  // Lodge 1 (293951 / 883590)
  lodge1: [331974, 422157, 332142],
  
  // Lodge 2 (883795 / 883600)
  lodge2: [916114, 916105, 916829, 916830],
  
  // Fake Bungalow 1 (Test)
  fb1: [932248, 932249, 932253, 932254, 932255],
  
  // Fake Bungalow 2 (Test)
  fb2: [932261, 932262, 932266, 932267, 932268]
};

// Tutte le 87 tariffe aggregate per chiusura globale
export const ALL_TARGET_DISABLED_RATES: number[] = Array.from(
  new Set(Object.values(ACCOMMODATION_DISABLED_DERIVED_RATES).flat())
);

export const ALL_ACCOMMODATIONS_PRODUCT_MAP: Record<string, string[]> = {
  pl: ['494840', '495566', '495580', '495575', '495552', '495587', '495565', '495593', '921874', '921875', '495569', '495609'],
  jvl: ['495795', '495807', '495804', '496009', '496001', '495805', '496022', '495806', '496031', '921870', '921871', '495810', '496057'],
  jvr: ['495796', '495980', '495977', '496010', '496002', '495978', '496021', '495979', '496030', '921872', '921873', '495982', '496056'],
  jv: ['529773', '529784', '529778', '529792', '529788', '529780', '916817', '529781', '529801', '921868', '921869', '529783', '529813'],
  pent: ['421511', '449348', '421513', '421516', '421520', '421522', '421525', '421527', '421530', '921876', '921877', '421532', '421533'],
  yellow: ['293957', '449385', '293958', '332055', '332054', '331921', '332057', '331922', '332060', '921878', '921879', '297022', '340198'],
  red: ['293954', '449422', '293953', '332030', '332029', '330964', '332035', '330970', '332036', '921880', '921881', '297021', '340196'],
  green: ['293962', '449668', '293961', '332070', '332066', '331923', '332072', '331924', '332074', '921882', '921883', '297023', '340200'],
  inter: ['293942', '449742', '293941', '332109', '332105', '340367', '916840', '421998', '916838', '921898', '921899', '297027', '422147'],
  r1: ['293963', '449678', '422300', '332737', '332735', '331976', '916818', '331977', '916402', '921889', '921890', '297033', '421505'],
  r2: ['293959', '449684', '422296', '332741', '332739', '331966', '332119', '331967', '332134', '921891', '921900', '297032', '421506'],
  r3: ['293948', '449699', '422293', '332743', '332757', '331968', '332121', '331969', '332136', '921892', '921893', '297028', '421507'],
  r4: ['293945', '449724', '422265', '332759', '332746', '331970', '332123', '331971', '332138', '921894', '921895', '297029', '421508'],
  r5: ['293943', '449730', '422213', '332765', '332763', '331972', '332125', '331973', '332140', '921896', '921897', '297031', '421509'],
  lodge1: ['293951', '449736', '422149', '332769', '332767', '331974', '332129', '422157', '332142', '921884', '921885', '297030', '421510'],
  lodge2: ['883795', '923905', '916108', '916107', '916109', '916114', '916829', '916105', '916830', '921886', '921887', '916103', '916104'],
  fb1: ['649669', '932243', '932244', '932246', '932247', '932248', '932249', '932250', '932251', '932252', '932253', '932254', '932255'],
  fb2: ['921799', '932256', '932257', '932259', '932260', '932261', '932262', '932263', '932264', '932265', '932266', '932267', '932268']
};

/**
 * Identifica la chiave dell'alloggio fisico da nome camera, ID prodotto o PMS Product
 */
export function identifyAccommodationKey(
  roomName: string = '',
  productId?: number | string,
  pmsProductId?: number | string
): string | null {
  const norm = (roomName || '').toLowerCase().trim();
  const prodStr = String(productId || '').trim();
  const pmsNum = Number(pmsProductId || 0);

  // 1. Controllo immediato nei set completi di product IDs (copre sia mother che tutte le 212 derivate)
  if (prodStr) {
    for (const [key, idList] of Object.entries(ALL_ACCOMMODATIONS_PRODUCT_MAP)) {
      if (idList.includes(prodStr)) {
        return key;
      }
    }
  }

  // 2. Controllo per PMS Product ID
  if (pmsNum === 883596) return 'pl';
  if (pmsNum === 883597) return 'jvl';
  if (pmsNum === 883598) return 'jvr';
  if (pmsNum === 883595 || pmsNum === 883972) return 'jv';
  if (pmsNum === 883594) return 'pent';
  if (pmsNum === 294662 || pmsNum === 883592) return 'yellow';
  if (pmsNum === 294667 || pmsNum === 883593) return 'green';
  if (pmsNum === 294666 || pmsNum === 883591) return 'red';
  if (pmsNum === 294670 || pmsNum === 883589) return 'inter';
  if (pmsNum === 294673 || pmsNum === 883584) return 'r1';
  if (pmsNum === 294674 || pmsNum === 883585) return 'r2';
  if (pmsNum === 294676 || pmsNum === 883586) return 'r3';
  if (pmsNum === 294677 || pmsNum === 883587) return 'r4';
  if (pmsNum === 294678 || pmsNum === 883588) return 'r5';
  if (pmsNum === 883590) return 'lodge1';
  if (pmsNum === 883600) return 'lodge2';

  // 3. Controllo per nome o prefisso stringa
  if (norm.includes('peace') || norm.startsWith('p&l')) return 'pl';
  if (norm.includes('jungle villa left') || norm.startsWith('jvl')) return 'jvl';
  if (norm.includes('jungle villa right') || norm.startsWith('jvr')) return 'jvr';
  if (norm.includes('jungle villa') || norm.startsWith('jv')) return 'jv';
  if (norm.includes('penthouse') || norm.startsWith('pent')) return 'pent';
  if (norm.includes('yellow')) return 'yellow';
  if (norm.includes('green')) return 'green';
  if (norm.includes('red')) return 'red';
  if (norm.includes('internal') || norm.startsWith('inter')) return 'inter';
  if (norm.includes('room 1') || norm.startsWith('r1')) return 'r1';
  if (norm.includes('room 2') || norm.startsWith('r2')) return 'r2';
  if (norm.includes('room 3') || norm.startsWith('r3')) return 'r3';
  if (norm.includes('room 4') || norm.startsWith('r4')) return 'r4';
  if (norm.includes('room 5') || norm.startsWith('r5')) return 'r5';
  if (norm.includes('lodge 1')) return 'lodge1';
  if (norm.includes('lodge 2')) return 'lodge2';
  if (norm.includes('fake bungalow 1') || norm.startsWith('fb1')) return 'fb1';
  if (norm.includes('fake bungalow 2') || norm.startsWith('fb2')) return 'fb2';

  return null;
}

/**
 * Invia un alert Telegram asincrono allo staff in caso di auto-shielding attivo
 */
export async function sendAutoShieldTelegramAlert(
  supabase: any,
  message: string
): Promise<void> {
  if (!supabase) return;
  try {
    const { data: config } = await supabase
      .from('telegram_config')
      .select('bot_token, chat_id')
      .eq('id', 'default')
      .maybeSingle();

    if (!config?.bot_token || !config?.chat_id) return;

    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chat_id,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
  } catch (err) {
    console.warn('[Auto-Shield Telegram Alert Warning]:', err);
  }
}

/**
 * 🛡️ Procedura Eccezionale di Auto-Shielding:
 * Quando viene ricevuta una prenotazione (via Webhook Octorate o Booking Engine),
 * invia immediatamente ad Octorate una richiesta bulk di Stop Sell forzato
 * su tutte le tariffe derivate disattivate di quell'alloggio per le date del soggiorno.
 */
export async function executeAutoShieldForReservation(params: {
  accessToken: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  roomName?: string;
  productId?: number | string;
  pmsProductId?: number | string;
  reservationId?: number | string;
  guestName?: string;
  channelName?: string;
  supabaseAdmin?: any;
}): Promise<{ success: boolean; closedRatesCount: number; message: string }> {
  const {
    accessToken,
    checkIn,
    checkOut,
    roomName,
    productId,
    pmsProductId,
    reservationId,
    guestName,
    channelName,
    supabaseAdmin
  } = params;

  if (!accessToken || !checkIn || !checkOut) {
    return { success: false, closedRatesCount: 0, message: 'Parametri insufficienti per Auto-Shield' };
  }

  const cleanCheckIn = checkIn.slice(0, 10);
  const cleanCheckOut = checkOut.slice(0, 10);

  const accKey = identifyAccommodationKey(roomName, productId, pmsProductId);
  const rateIdsToClose = accKey && ACCOMMODATION_DISABLED_DERIVED_RATES[accKey]
    ? ACCOMMODATION_DISABLED_DERIVED_RATES[accKey]
    : ALL_TARGET_DISABLED_RATES;

  if (rateIdsToClose.length === 0) {
    return { success: true, closedRatesCount: 0, message: 'Nessuna tariffa derivata da chiudere per questo alloggio.' };
  }

  console.log(`🛡️ [AUTO-SHIELD] Attivazione protezione Stop Sell per ${rateIdsToClose.length} tariffe derivate (${accKey || 'ALL'}) dal ${cleanCheckIn} al ${cleanCheckOut}...`);

  const bulkPayload = rateIdsToClose.map(rateId => ({
    room: rateId,
    dateFrom: cleanCheckIn,
    dateTo: cleanCheckOut,
    values: {
      stopSells: true,
      closed: true,
      closedArrival: true,
      closedDeparture: true
    }
  }));

  try {
    const res = await fetch('https://api.octorate.com/connect/rest/v1/calendar/bulk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(bulkPayload)
    });

    const resText = await res.text();
    let resJson: any = null;
    try { resJson = JSON.parse(resText); } catch {}

    const isOk = res.ok && resJson?.success !== false;

    if (isOk) {
      console.log(`🛡️ [AUTO-SHIELD] Successo: ${rateIdsToClose.length} tariffe derivate sigillate su Octorate per ${cleanCheckIn} -> ${cleanCheckOut}.`);
      
      // Se presente una notifica di prenotazione rilevante, notifica Telegram
      if (supabaseAdmin && reservationId) {
        const alertMsg = `🛡️ <b>[Auto-Shield Antigravity Active]</b>\n` +
          `Prenotazione: <b>#${reservationId}</b> (${channelName || 'OTA'})\n` +
          `Ospite: <b>${guestName || 'N/D'}</b>\n` +
          `Alloggio: <b>${roomName || accKey || 'N/D'}</b>\n` +
          `Date: <code>${cleanCheckIn}</code> ➔ <code>${cleanCheckOut}</code>\n` +
          `🔒 Sigillate <b>${rateIdsToClose.length} tariffe derivate</b> in Stop Sell preventivo contro overbooking.`;
        
        sendAutoShieldTelegramAlert(supabaseAdmin, alertMsg).catch(() => {});
      }

      return {
        success: true,
        closedRatesCount: rateIdsToClose.length,
        message: `Auto-Shield applicato con successo per ${rateIdsToClose.length} tariffe derivate.`
      };
    } else {
      console.warn(`⚠️ [AUTO-SHIELD] Octorate ha risposto con errore: HTTP ${res.status} | ${resText.slice(0, 150)}`);
      return {
        success: false,
        closedRatesCount: 0,
        message: `Errore Octorate: ${resText.slice(0, 100)}`
      };
    }
  } catch (err: any) {
    console.error('❌ [AUTO-SHIELD EXCEPTION]:', err);
    return {
      success: false,
      closedRatesCount: 0,
      message: err.message || 'Eccezione di rete Auto-Shield'
    };
  }
}
