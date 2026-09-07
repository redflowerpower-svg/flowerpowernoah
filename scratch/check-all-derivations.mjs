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

async function checkAllDerivations() {
  const { data: tokenData } = await supabase.from('octorate_tokens').select('access_token').eq('id', 'singleton').single();
  const token = tokenData.access_token;
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';

  const res = await fetch(`https://api.octorate.com/connect/rest/v1/roomrates/${structureId}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  const data = await res.json();
  const rates = Array.isArray(data) ? data : (data.roomRates || []);

  const targets = ['AirBnB AC', 'AC7d', 'AC14d', 'AC bnb-7d', 'AC bnb-14d'];

  console.log(`=== ANALISI EREDITARIETÀ TARIFFE TARGET (Totale tariffe nel PMS: ${rates.length}) ===\n`);

  const matched = rates.filter(r => targets.some(t => (r.name || '').includes(t)));
  console.log(`Tariffe target trovate: ${matched.length}`);

  const parentsMap = new Map();
  for (const r of matched) {
    const pId = r.derivedRule?.parent;
    if (!parentsMap.has(pId)) parentsMap.set(pId, []);
    parentsMap.get(pId).push(r.name);
  }

  console.log(`\nI nodi padre unici di queste 87 tariffe sono (${parentsMap.size}):`);
  for (const [pId, children] of parentsMap.entries()) {
    const parentRate = rates.find(x => x.id === pId);
    console.log(`- Padre ID ${pId} (${parentRate?.name || 'Sconosciuto'}): genera ${children.length} tariffe target (es: ${children[0]})`);
  }
}

checkAllDerivations().catch(console.error);

