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

async function listOpenVsClosed() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  const targetPatterns = ['AirBnB AC', 'AC7d', 'AC14d', 'AC bnb-7d', 'AC bnb-14d'];

  let allItems = [];
  for (let page = 1; page <= 6; page++) {
    const url = `https://api.octorate.com/connect/rest/v1/calendar/${structureId}?dateFrom=2026-09-05&dateTo=2026-09-05&page=${page}&size=50`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const json = await res.json();
    const items = json.data || [];
    if (!items.length) break;
    allItems.push(...items);
  }

  const matched = [];
  for (const item of allItems) {
    const itemName = item.name || '';
    if (targetPatterns.some(p => itemName.includes(p))) {
      const day = item.days?.[0] || {};
      matched.push({
        id: item.id,
        name: itemName,
        stopSells: day.stopSells,
        closed: day.closed,
        bookable: day.bookable,
        availability: day.availability,
        price: day.price
      });
    }
  }

  console.log(`\n=== TARIFFE TARGET SU OCTORATE (05/09/2026) ===`);
  console.log(`Totale trovate: ${matched.length}`);

  const openList = matched.filter(m => !m.stopSells && !m.closed);
  const closedList = matched.filter(m => m.stopSells || m.closed);

  console.log(`\n🟢 APERTE (${openList.length}):`);
  for (const item of openList) {
    console.log(`  [ID: ${item.id}] ${item.name} | Avail: ${item.availability} | Price: ${item.price} | Bookable: ${item.bookable}`);
  }

  console.log(`\n🔴 CHIUSE (${closedList.length}):`);
  for (const item of closedList) {
    console.log(`  [ID: ${item.id}] ${item.name} | Avail: ${item.availability} | Price: ${item.price} | Bookable: ${item.bookable}`);
  }

  fs.writeFileSync('scratch/target-rates-status-analysis.json', JSON.stringify({ openList, closedList }, null, 2));
}

listOpenVsClosed().catch(console.error);
