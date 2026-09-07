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

async function checkStatus() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  const testDates = ['2026-09-05', '2026-10-01', '2026-12-25', '2027-02-05'];
  
  // Rate plan patterns we care about:
  // airbnb_ac, ac_7d, ac_14d, ac_bnb_7d, ac_bnb_14d
  const targetPatterns = [
    'AirBnB AC',
    'AC7d',
    'AC14d',
    'AC bnb-7d',
    'AC bnb-14d'
  ];

  console.log(`=== VERIFICA STATO RESTRIZIONI OCTORATE SU DATE CHIAVE ===\n`);

  for (const date of testDates) {
    console.log(`\n📅 Controllo data: ${date}`);
    let allItems = [];
    for (let page = 1; page <= 6; page++) {
      const url = `https://api.octorate.com/connect/rest/v1/calendar/${structureId}?dateFrom=${date}&dateTo=${date}&page=${page}&size=50`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (!res.ok) {
        console.error(`Fetch failed for ${date} page ${page}: ${res.status}`);
        break;
      }
      const json = await res.json();
      const items = json.data || (Array.isArray(json) ? json : []);
      if (!items || items.length === 0) break;
      allItems.push(...items);
    }

    console.log(`   Totale record ricevuti: ${allItems.length}`);

    // Filter for targets
    const matched = [];
    for (const item of allItems) {
      const itemName = item.name || '';
      const isTarget = targetPatterns.some(p => itemName.includes(p));
      if (isTarget) {
        const dayInfo = item.days?.[0] || {};
        matched.push({
          id: item.id,
          name: itemName,
          date: dayInfo.date || date,
          stopSells: dayInfo.stopSells,
          closed: dayInfo.closed,
          bookable: dayInfo.bookable,
          availability: dayInfo.availability,
          price: dayInfo.price
        });
      }
    }

    console.log(`   Di cui tariffe target (${targetPatterns.join(', ')}): ${matched.length}`);

    // Summary of closed vs open
    let closedCount = 0;
    let openCount = 0;
    const sampleOpen = [];
    const sampleClosed = [];

    for (const m of matched) {
      const isClosed = m.stopSells === true || m.closed === true;
      if (isClosed) {
        closedCount++;
        if (sampleClosed.length < 3) {
          sampleClosed.push(`${m.name} [ID ${m.id}] (stopSells: ${m.stopSells}, bookable: ${m.bookable})`);
        }
      } else {
        openCount++;
        if (sampleOpen.length < 5) {
          sampleOpen.push(`${m.name} [ID ${m.id}] (stopSells: ${m.stopSells}, bookable: ${m.bookable}, price: ${m.price})`);
        }
      }
    }

    console.log(`   ➡️ CHIUSE (StopSell=true): ${closedCount}`);
    console.log(`   ➡️ APERTE (StopSell=false): ${openCount}`);
    if (openCount > 0) {
      console.log(`   ⚠️ Esempi APERTE:`);
      sampleOpen.forEach(s => console.log(`      - ${s}`));
    }
    if (closedCount > 0) {
      console.log(`   🔒 Esempi CHIUSE:`);
      sampleClosed.forEach(s => console.log(`      - ${s}`));
    }
  }
}

checkStatus().catch(console.error);

