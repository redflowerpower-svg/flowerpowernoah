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

async function inspectRoomRatesDerivation() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  const res = await fetch(`https://api.octorate.com/connect/rest/v1/roomrates/${structureId}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  const data = await res.json();
  const rates = Array.isArray(data) ? data : (data.roomRates || data.rates || []);

  const targets = ['Inter AirBnB AC', 'JVL AC bnb-7d', 'JV AirBnB AC', 'Lodge 2 AC7d', 'R1 AC bnb-7d'];
  for (const name of targets) {
    const r = rates.find(x => (x.name || '').includes(name));
    if (r) {
      console.log(`\n========================================`);
      console.log(`Rate: ${r.name} (ID: ${r.id})`);
      console.log(`accommodationId:`, r.accommodationId);
      console.log(`derivedRule:`, JSON.stringify(r.derivedRule, null, 2));
      console.log(`closeNextDays:`, r.closeNextDays);
      console.log(`openNextDays:`, r.openNextDays);
    }
  }
}

inspectRoomRatesDerivation().catch(console.error);

