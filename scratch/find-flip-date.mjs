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

async function checkFlip() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  console.log('Fetching days 2026-08-30 -> 2026-09-08 for all targets...');
  
  for (let p = 1; p <= 6; p++) {
    const r = await fetch(`https://api.octorate.com/connect/rest/v1/calendar/${structureId}?dateFrom=2026-08-30&dateTo=2026-09-08&page=${p}&size=50`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const j = await r.json();
    const items = j.data || [];
    for (const it of items) {
      if (it.id === 496022 || it.id === 496057 || it.id === 496031) {
        console.log(`\nRate: ${it.name} (ID: ${it.id})`);
        for (const d of it.days || []) {
          console.log(`  Date: ${d.date} | StopSells: ${d.stopSells} | Bookable: ${d.bookable} | Avail: ${d.availability} | Price: ${d.price}`);
        }
      }
    }
  }
}

checkFlip().catch(console.error);
