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

async function traceTree() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  const res = await fetch(`https://api.octorate.com/connect/rest/v1/roomrates/${structureId}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  const data = await res.json();
  const rates = Array.isArray(data) ? data : (data.roomRates || []);

  const ratesMap = new Map();
  for (const r of rates) ratesMap.set(r.id, r);

  function printAncestors(rateId, depth = 0) {
    const r = ratesMap.get(rateId);
    if (!r) {
      console.log(`${'  '.repeat(depth)}[ID: ${rateId}] -> Non trovato nei roomrates`);
      return;
    }
    const dr = r.derivedRule;
    console.log(`${'  '.repeat(depth)}[ID: ${r.id}] ${r.name} (stopSell inherited: ${dr?.stopSell}, restrictions: ${dr?.restrictions}, fullyDerived: ${dr?.fullyDerived}, parent: ${dr?.parent})`);
    if (dr?.parent && dr.parent !== rateId) {
      printAncestors(dr.parent, depth + 1);
    }
  }

  console.log('--- ALBERO GENEALOGICO: JVL AC bnb-7d (496022) ---');
  printAncestors(496022);

  console.log('\n--- ALBERO GENEALOGICO: JVL AirBnB AC (496057) ---');
  printAncestors(496057);

  console.log('\n--- ALBERO GENEALOGICO: Inter AirBnB AC (422147) ---');
  printAncestors(422147);

  console.log('\n--- ALBERO GENEALOGICO: JV AirBnB AC (529813) ---');
  printAncestors(529813);
}

traceTree().catch(console.error);
