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

async function checkRecentBookings() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  console.log('Fetching recent reservations from Octorate (2026-08-01 -> 2026-09-06)...');
  const res = await fetch(`https://api.octorate.com/connect/rest/v1/reservation/${structureId}?dateType=CREATION&startDate=2026-08-01&endDate=2026-09-06&size=100`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  const json = await res.json();
  const reservations = Array.isArray(json) ? json : (json.data || json.reservations || []);
  console.log(`\n=== TUTTE LE PRENOTAZIONI RICEVUTE (QUALSIASI STATO) DAL 1° AGOSTO A OGGI (${reservations.length}) ===`);
  for (const r of reservations) {
    console.log(`[${r.status}] ID: ${r.id} | Canale: ${r.channelName} | Alloggio/Prodotto: ${r.roomName} (${r.product}) | Ospite: ${r.firstName} ${r.lastName} | Check-in: ${r.checkin?.slice(0, 10)} -> Check-out: ${r.checkout?.slice(0, 10)} | Creato: ${r.createTime}`);
  }
}

checkRecentBookings().catch(console.error);


