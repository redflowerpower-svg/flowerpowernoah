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

async function checkDirectCalendar() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  const checkIds = [
    529813, // JV AirBnB AC (CLOSED)
    529783, // JV AirBnB (parent)
    529773, // Jungle Villa (master)
    496057, // JVL AirBnB AC (OPEN)
    495810, // JVL AirBnB (parent)
    495795  // Jungle Villa Left (master)
  ];

  for (let page = 1; page <= 6; page++) {
    const res = await fetch(`https://api.octorate.com/connect/rest/v1/calendar/${structureId}?dateFrom=2026-09-05&dateTo=2026-09-05&page=${page}&size=50`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const json = await res.json();
    const items = json.data || [];
    for (const item of items) {
      if (checkIds.includes(item.id)) {
        const day = item.days?.[0] || {};
        console.log(`[ID ${item.id}] ${item.name} | stopSells: ${day.stopSells} | closed: ${day.closed} | bookable: ${day.bookable} | avail: ${day.availability}`);
      }
    }
  }
}

checkDirectCalendar().catch(console.error);
