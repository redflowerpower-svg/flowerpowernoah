import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envVars = {};
['.env', '.env.local'].forEach(file => {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        if (key) envVars[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY
);

async function executeEmergencyClose() {
  console.log('🚨 AVVIO INTERVENTO DI EMERGENZA: Chiusura Stop Sell Immediata su Octorate');
  
  const { data: tokenData, error: tokenErr } = await supabase
    .from('octorate_tokens')
    .select('access_token')
    .eq('id', 'singleton')
    .single();

  if (tokenErr || !tokenData?.access_token) {
    console.error('❌ Impossibile recuperare il token Octorate da Supabase:', tokenErr);
    process.exit(1);
  }

  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  // 1. Recupera tutte le room rates del PMS per identificare con precisione chirurgica tutti i target
  console.log('📡 Recupero catalogo completo piani tariffari da Octorate...');
  const resRates = await fetch(`https://api.octorate.com/connect/rest/v1/roomrates/${structureId}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });

  if (!resRates.ok) {
    console.error(`❌ Errore recupero roomrates: ${resRates.status}`);
    process.exit(1);
  }

  const ratesData = await resRates.json();
  const allRates = Array.isArray(ratesData) ? ratesData : (ratesData.roomRates || []);

  const targetKeywords = ['AirBnB AC', 'AC7d', 'AC14d', 'AC bnb-7d', 'AC bnb-14d'];

  // Trova tutte le tariffe corrispondenti (sia camere reali che fake)
  const targetRates = allRates.filter(r => {
    const name = r.name || '';
    return targetKeywords.some(kw => name.includes(kw));
  });

  console.log(`✅ Identificate ${targetRates.length} tariffe target da chiudere categoricamente in Stop Sell.`);

  const dateFrom = '2026-09-05';
  const dateTo = '2027-10-31';

  console.log(`📅 Finestra di chiusura applicata: ${dateFrom} ➔ ${dateTo}`);

  // 2. Costruzione Payload Bulk
  const bulkPayload = targetRates.map(r => ({
    room: r.id,
    dateFrom,
    dateTo,
    values: {
      stopSells: true,
      closed: true,
      closedArrival: true,
      closedDeparture: true
    }
  }));

  // 3. Invio a scaglioni (Batch da 20) per rispettare i limiti di Octorate
  const BATCH_SIZE = 20;
  const totalBatches = Math.ceil(bulkPayload.length / BATCH_SIZE);
  console.log(`📦 Invio pianificato in ${totalBatches} batch da max ${BATCH_SIZE} alloggi ciascuno...`);

  const results = [];
  for (let i = 0; i < bulkPayload.length; i += BATCH_SIZE) {
    const batch = bulkPayload.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`📡 Invio Batch ${batchNum}/${totalBatches} (${batch.length} tariffe)...`);
    try {
      const res = await fetch('https://api.octorate.com/connect/rest/v1/calendar/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(batch)
      });

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}

      if (res.ok && json?.success !== false) {
        console.log(`   ✅ Batch ${batchNum} confermato da Octorate! HTTP ${res.status} | Process IDs: ${json?.process?.length || 0}`);
        results.push({ batch: batchNum, ok: true });
      } else {
        console.error(`   ❌ Batch ${batchNum} rifiutato: HTTP ${res.status} | ${text.slice(0, 150)}`);
        results.push({ batch: batchNum, ok: false, error: text });
      }

      // Attesa prudenziale di 400ms tra i batch
      await new Promise(res => setTimeout(res, 400));
    } catch (err) {
      console.error(`   ❌ Eccezione nel Batch ${batchNum}:`, err.message);
      results.push({ batch: batchNum, ok: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.ok).length;
  console.log(`\n══════════════════════════════════════════════════════════════`);
  console.log(`📊 ESITO SINCRONIZZAZIONE EMERGENZA: ${successCount}/${totalBatches} batch riusciti.`);
  console.log(`══════════════════════════════════════════════════════════════\n`);

  // Pulizia cache locale se presente
  const cachePath = path.resolve(process.cwd(), 'scratch/octorate-cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      fs.unlinkSync(cachePath);
      console.log('🧹 Cache Octorate locale cancellata.');
    } catch {}
  }
}

executeEmergencyClose().catch(console.error);
