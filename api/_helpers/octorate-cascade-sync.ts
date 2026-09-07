/**
 * ⚡ Motore Serverless Permanente: Sconti a Cascata Last-Minute (3 Stadi Sequenziali)
 * Sincronizzazione automatica 24/7 su Octorate PMS (Regola d'Oro: Sempre e solo Livello 0).
 */

export interface CascadeRoomConfig {
  motherId: number;
  name: string;
  basePrice: number;
}

export const CASCADE_MOTHER_ROOMS: CascadeRoomConfig[] = [
  { motherId: 529773, name: 'Jungle Villa', basePrice: 2290 },
  { motherId: 495795, name: 'Jungle Villa Left', basePrice: 1290 },
  { motherId: 495796, name: 'Jungle Villa Right', basePrice: 1290 },
  { motherId: 494840, name: 'Peace & Love Villa', basePrice: 1290 },
  { motherId: 421511, name: 'Villa Penthouse', basePrice: 1290 },
  { motherId: 293957, name: 'Yellow Bungalow', basePrice: 990 },
  { motherId: 293954, name: 'Red Bungalow', basePrice: 790 },
  { motherId: 293962, name: 'Green Bungalow', basePrice: 790 },
  { motherId: 293965, name: 'Camel Tent', basePrice: 430 },
  { motherId: 293955, name: 'Lagoon Tent', basePrice: 430 },
  { motherId: 293942, name: 'Internal Room', basePrice: 430 },
  { motherId: 293963, name: 'Room 1', basePrice: 10000 },
  { motherId: 293959, name: 'Room 2', basePrice: 10000 },
  { motherId: 293948, name: 'Room 3', basePrice: 10000 },
  { motherId: 293945, name: 'Room 4', basePrice: 10000 },
  { motherId: 293943, name: 'Room 5', basePrice: 10000 },
  { motherId: 293951, name: 'Lodge 1', basePrice: 10000 },
  { motherId: 883795, name: 'Lodge 2', basePrice: 10000 },
  { motherId: 649669, name: 'Fake Bungalow 1', basePrice: 1000 },
  { motherId: 921799, name: 'Fake Bungalow 2', basePrice: 1000 }
];

export function getThailandTodayStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

export function addDaysToDate(baseDateStr: string, days: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Memoria volatile per istanza serverless
let lastSyncedCascadeDateGlobal = '';

async function sendTelegramAlert(supabase: any, message: string): Promise<void> {
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
    console.warn('[Cascade Telegram Alert Warning]:', err);
  }
}

/**
 * Verifica e sincronizza automaticamente la finestra di sconti a cascata (3 stadi)
 * su Octorate PMS. Esecuzione idempotente e priva di sovraccarico (solo 1 sync al giorno).
 */
export async function checkAndSyncCascadeLastMinute(
  accessToken: string,
  supabaseAdmin?: any,
  force: boolean = false
): Promise<{ synced: boolean; message: string; updatesCount?: number }> {
  if (!accessToken) {
    return { synced: false, message: 'Access token mancante per sync sconti a cascata.' };
  }

  const todayStr = getThailandTodayStr();

  if (!force && lastSyncedCascadeDateGlobal === todayStr) {
    return { synced: false, message: `Sconti a cascata già sincronizzati per oggi (${todayStr}).` };
  }

  // Sonda rapida dello stato live di Octorate per Jungle Villa (529773) su todayStr
  // Se ha già 2061฿ (-10%), Octorate è già aggiornato e allineato
  if (!force) {
    try {
      const probeRes = await fetch(
        `https://api.octorate.com/connect/rest/v1/calendar/366879?dateFrom=${todayStr}&dateTo=${todayStr}&size=20&page=0`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
      );
      if (probeRes.ok) {
        const probeJson = await probeRes.json();
        const items = Array.isArray(probeJson.data) ? probeJson.data : (Array.isArray(probeJson) ? probeJson : []);
        const jv = items.find((x: any) => Number(x.id) === 529773);
        const day0Price = jv?.days?.[0]?.price;
        if (day0Price === 2061) {
          lastSyncedCascadeDateGlobal = todayStr;
          return { synced: false, message: `Octorate live calendar già allineato con sconti per oggi (${todayStr}).` };
        }
      }
    } catch (probeErr) {
      console.warn('[Cascade Probe Warning]:', probeErr);
    }
  }

  console.log(`⚡ [CASCADE LAST-MINUTE 24/7] Avvio sincronizzazione finestra mobile per ${todayStr}...`);

  // Costruzione della sequenza 7 giorni + 1 giorno coda:
  // Offset 0, 1, 2 (3 gg): -10%
  // Offset 3, 4 (2 gg): -5%
  // Offset 5, 6 (2 gg): -2.5%
  // Offset 7 (1 gg coda): 100% baseline (pulizia del giorno che esce dalla finestra)
  const bulkPayload: Array<{ room: number; dateFrom: string; dateTo: string; values: { price: number } }> = [];

  CASCADE_MOTHER_ROOMS.forEach((room) => {
    for (let offset = 0; offset <= 7; offset++) {
      const targetDateStr = addDaysToDate(todayStr, offset);
      let discountedPrice = room.basePrice;

      if (offset < 3) {
        // Stadio 1: -10%
        discountedPrice = Math.round(room.basePrice * 0.90);
      } else if (offset < 5) {
        // Stadio 2: -5%
        discountedPrice = Math.round(room.basePrice * 0.95);
      } else if (offset < 7) {
        // Stadio 3: -2.5%
        discountedPrice = Math.round(room.basePrice * 0.975);
      } else {
        // Offset 7 (Coda di pulizia): 100% Prezzo Base
        discountedPrice = room.basePrice;
      }

      bulkPayload.push({
        room: room.motherId,
        dateFrom: targetDateStr,
        dateTo: targetDateStr,
        values: {
          price: discountedPrice
        }
      });
    }
  });

  // Invio a scaglioni (Batch da 25) per rispettare i limiti di carico Octorate
  const BATCH_SIZE = 25;
  const chunks: Array<typeof bulkPayload> = [];
  for (let i = 0; i < bulkPayload.length; i += BATCH_SIZE) {
    chunks.push(bulkPayload.slice(i, i + BATCH_SIZE));
  }

  let totalSuccessful = 0;

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    try {
      const res = await fetch(`https://api.octorate.com/connect/rest/v1/calendar/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(chunk)
      });

      if (res.ok) {
        totalSuccessful += chunk.length;
        console.log(`⚡ [CASCADE LAST-MINUTE] Batch ${idx + 1}/${chunks.length} inviato con successo (${chunk.length} tariffe).`);
      } else {
        const txt = await res.text();
        console.warn(`⚠️ [CASCADE LAST-MINUTE] Batch ${idx + 1}/${chunks.length} Octorate error (${res.status}): ${txt.slice(0, 100)}`);
      }
    } catch (batchErr) {
      console.error(`❌ [CASCADE LAST-MINUTE] Exception on batch ${idx + 1}:`, batchErr);
    }
  }

  if (totalSuccessful > 0) {
    lastSyncedCascadeDateGlobal = todayStr;
    console.log(`✅ [CASCADE LAST-MINUTE 24/7] Sincronizzazione completata: ${totalSuccessful} tariffe scritte su Octorate PMS.`);

    // Notifica Telegram discreta allo staff
    if (supabaseAdmin) {
      const endWindowStr = addDaysToDate(todayStr, 6);
      const alertMsg = `⚡ <b>[Cascade Last-Minute Auto-Roll]</b>\n` +
        `📅 Finestra Sconti Aggiornata: <code>${todayStr}</code> ➔ <code>${endWindowStr}</code>\n` +
        `🏨 Applicati sconti a cascata su <b>${CASCADE_MOTHER_ROOMS.length} Alloggi</b> (Livello 0):\n` +
        `• Gg 0-2 (3 gg): <b>-10.0%</b>\n` +
        `• Gg 3-4 (2 gg): <b>-5.0%</b>\n` +
        `• Gg 5-6 (2 gg): <b>-2.5%</b>\n` +
        `• Gg 7+: <b>Ripristino Baseline 100%</b>\n` +
        `✅ Octorate PMS sincronizzato automaticamente.`;

      sendTelegramAlert(supabaseAdmin, alertMsg).catch(() => {});
    }

    return {
      synced: true,
      message: `Sincronizzazione completata con successo (${totalSuccessful} tariffe aggiornate per ${todayStr}).`,
      updatesCount: totalSuccessful
    };
  }

  return {
    synced: false,
    message: 'Nessun aggiornamento inviato ad Octorate a causa di errori API.'
  };
}
