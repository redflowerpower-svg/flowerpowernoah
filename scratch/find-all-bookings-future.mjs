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

async function checkAllBookings() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  console.log('Fetching reservations by STAY (2026-09-01 -> 2027-04-30)...');
  
  let allRes = [];
  for (let page = 0; page <= 10; page++) {
    const res = await fetch(`https://api.octorate.com/connect/rest/v1/reservation/${structureId}?type=STAY&startDate=2026-09-01&endDate=2027-04-30&size=100&page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.data || json.reservations || []);
    if (!list.length) break;
    allRes.push(...list);
  }

  console.log(`Total reservations found: ${allRes.length}`);

  // Sort by createTime descending
  allRes.sort((a, b) => new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime());

  const confirmed = allRes.filter(r => r.status === 'CONFIRMED');
  console.log(`Confirmed reservations: ${confirmed.length}`);

  console.log('\n=== PRENOTAZIONI CONFERMATE PERIODO SETTEMBRE 2026 - APRILE 2027 ===');
  for (const r of confirmed) {
    console.log(`📌 ID: ${r.id} | Canale: ${r.channelName} | Prodotto: ${r.roomName} (${r.product || r.pmsProduct}) | Checkin: ${r.checkin?.slice(0, 10)} -> Checkout: ${r.checkout?.slice(0, 10)} | Ospite: ${r.firstName} ${r.lastName} | Creato il: ${r.createTime}`);
  }

  fs.writeFileSync('scratch/confirmed-future-reservations.json', JSON.stringify(confirmed, null, 2));
}

checkAllBookings().catch(console.error);
