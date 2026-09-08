import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Parse .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
}

console.log('--- TEST DI VERIFICA CREDENZIALI AMBIENTE LOCALE ---\n');

async function testSupabase() {
  const url = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
  const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log('❌ Supabase: Variabili mancanti');
    return false;
  }
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('telegram_config').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      // Try another table if telegram_config query had an issue
      const { error: error2 } = await supabase.from('accommodations').select('id').limit(1);
      if (error2) {
        console.log(`❌ Supabase: Errore di connessione (${error2.message})`);
        return false;
      }
    }
    console.log(`✅ Supabase: Connessione riuscita (URL: ${url})`);
    return true;
  } catch (err) {
    console.log(`❌ Supabase: Errore exception: ${err.message}`);
    return false;
  }
}

async function testStripe() {
  const secretKey = envVars.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.log('❌ Stripe: STRIPE_SECRET_KEY mancante');
    return false;
  }
  try {
    const stripe = new Stripe(secretKey);
    const balance = await stripe.balance.retrieve();
    console.log(`✅ Stripe: Autenticazione OK (Modalità Test: ${balance.livemode === false ? 'SI' : 'NO'})`);
    return true;
  } catch (err) {
    console.log(`❌ Stripe: Errore (${err.message})`);
    return false;
  }
}

async function testTelegram() {
  const botToken = envVars.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.log('❌ Telegram: TELEGRAM_BOT_TOKEN mancante');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();
    if (data.ok) {
      console.log(`✅ Telegram Bot: Connessione OK (Bot Name: @${data.result.username})`);
      return true;
    } else {
      console.log(`❌ Telegram Bot: Risposta non OK (${data.description})`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Telegram Bot: Errore di connessione (${err.message})`);
    return false;
  }
}

async function testOctorate(opts = { testWrite: false }) {
  const structureId = envVars.VITE_OCTORATE_STRUCTURE_ID || '366879';
  const clientId = envVars.VITE_OCTORATE_CLIENT_ID || envVars.OCTORATE_CLIENT_ID || '';
  const clientSecret = envVars.OCTORATE_SECRET_KEY || envVars.VITE_OCTORATE_SECRET_KEY || '';
  const url = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
  const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

  if (!structureId || !url || !key) {
    console.log('❌ Octorate PMS: Variabili d\'ambiente mancanti');
    return false;
  }

  try {
    const supabase = createClient(url, key);
    const { data: tokenData, error: tokenError } = await supabase
      .from('octorate_tokens')
      .select('access_token, refresh_token')
      .eq('id', 'singleton')
      .maybeSingle();

    if (tokenError || !tokenData?.access_token) {
      console.log(`❌ Octorate PMS: Impostazione token fallita nel DB (${tokenError?.message || 'Token mancante'})`);
      return false;
    }

    let accessToken = tokenData.access_token;
    let refreshToken = tokenData.refresh_token;

    async function refreshAccessToken() {
      try {
        const refreshParams = new URLSearchParams();
        refreshParams.append('client_id', clientId);
        refreshParams.append('client_secret', clientSecret);
        refreshParams.append('refresh_token', refreshToken);

        const res = await fetch('https://api.octorate.com/connect/rest/v1/identity/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: refreshParams.toString()
        });

        if (res.ok) {
          const json = await res.json();
          if (json.access_token) {
            accessToken = json.access_token;
            if (json.refresh_token) refreshToken = json.refresh_token;
            await supabase.from('octorate_tokens').upsert({
              id: 'singleton',
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_in: json.expires_in,
              updated_at: new Date().toISOString()
            });
            return true;
          }
        }
      } catch {}
      return false;
    }

    const getHeaders = (t) => {
      const h = {
        'Authorization': `Bearer ${t}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (clientId) h['Octorate-Api-Key'] = clientId;
      return h;
    };

    const todayISO = new Date().toISOString().substring(0, 10);
    const calendarUrl = `https://api.octorate.com/connect/rest/v1/calendar/${structureId}?dateFrom=${todayISO}&dateTo=${todayISO}&size=5`;

    let res = await fetch(calendarUrl, { method: 'GET', headers: getHeaders(accessToken) });
    let text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    if ((res.status === 401 || (res.status === 403 && json?.type === 'ApiLoginExpired')) && refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        res = await fetch(calendarUrl, { method: 'GET', headers: getHeaders(accessToken) });
        text = await res.text();
        try { json = JSON.parse(text); } catch {}
      }
    }

    if (!res.ok) {
      console.log(`❌ Octorate PMS: Chiamata GET calendar fallita (HTTP ${res.status} ${res.statusText})`);
      return false;
    }

    let writeStatusStr = 'non testato';
    if (opts.testWrite) {
      const bulkUrl = 'https://api.octorate.com/connect/rest/v1/calendar/bulk';
      const bulkPayload = [{
        room: 529773,
        dateFrom: '2026-12-21',
        dateTo: '2026-12-21',
        values: { minstay: 5, price: 120.00, availability: 1, stopSells: false, closeToArrival: false }
      }];
      let writeRes = await fetch(bulkUrl, {
        method: 'POST',
        headers: getHeaders(accessToken),
        body: JSON.stringify(bulkPayload)
      });
      if (writeRes.ok) {
        writeStatusStr = 'CONFERMATO (HTTP 200 OK)';
      } else {
        writeStatusStr = `FALLITO (HTTP ${writeRes.status})`;
      }
    }

    console.log(`✅ Octorate PMS: Connessione OK (Structure ID: ${structureId}) | Permesso READONLY: Confermato | Permesso READWRITE: ${writeStatusStr}`);
    return true;
  } catch (err) {
    console.log(`❌ Octorate PMS: Errore exception: ${err.message}`);
    return false;
  }
}

function testSMTP() {
  const host = envVars.SMTP_HOST;
  const user = envVars.SMTP_USER;
  const pass = envVars.SMTP_PASS;
  if (host && user && pass) {
    console.log(`✅ SMTP Email: Configurazione presente (${user} via ${host})`);
    return true;
  } else {
    console.log('❌ SMTP Email: Configurazione incompleta');
    return false;
  }
}

function testGoogleMaps() {
  const apiKey = envVars.VITE_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    console.log(`✅ Google Maps: API Key configurata (${apiKey.substring(0, 8)}...)`);
    return true;
  } else {
    console.log('❌ Google Maps: VITE_GOOGLE_MAPS_API_KEY mancante');
    return false;
  }
}

async function testGeminiVision() {
  const apiKey = envVars.GEMINI_API_KEY || envVars.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.log('❌ Google Gemini Vision: GEMINI_API_KEY mancante');
    return false;
  }
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Ping' }] }]
      }),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      console.log(`✅ Google Gemini Vision: Connessione OK (Vision OCR Pronto)`);
      return true;
    } else {
      console.log(`❌ Google Gemini Vision: Risposta status ${res.status}`);
      return false;
    }
  } catch (err) {
    console.log(`⚠️ Google Gemini Vision: (${err.message})`);
    return false;
  }
}

async function testPayPal() {
  const clientId = envVars.PAYPAL_CLIENT_ID;
  const clientSecret = envVars.PAYPAL_CLIENT_SECRET;
  const mode = envVars.PAYPAL_MODE || 'sandbox';
  if (!clientId || !clientSecret) {
    console.log('❌ PayPal: PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET mancante');
    return false;
  }
  try {
    const ep = mode === 'live' ? 'https://api-m.paypal.com/v1/oauth2/token' : 'https://api-m.sandbox.paypal.com/v1/oauth2/token';
    const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(ep, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    if (res.ok && data.access_token) {
      console.log(`✅ PayPal API: Connessione OK (Modalità: ${mode.toUpperCase()} | App ID: ${data.app_id || 'N/A'})`);
      return true;
    } else {
      console.log(`❌ PayPal API: Errore autenticazione (${data.error_description || data.error})`);
      return false;
    }
  } catch (err) {
    console.log(`❌ PayPal API: Errore (${err.message})`);
    return false;
  }
}

function testKsher() {
  const appId = envVars.KSHER_APP_ID;
  const privKey = envVars.KSHER_PRIVATE_KEY;
  if (appId && privKey && privKey.includes('RSA PRIVATE KEY')) {
    console.log(`✅ Ksher Pay: Chiave RSA Configura (App ID: ${appId} | THB Gateway Attivo)`);
    return true;
  } else {
    console.log('❌ Ksher Pay: Configurazione mancante');
    return false;
  }
}

async function runAll() {
  await testSupabase();
  await testStripe();
  await testTelegram();
  await testOctorate();
  testSMTP();
  testGoogleMaps();
  await testGeminiVision();
  testKsher();
  await testPayPal();
  console.log('\n--- VERIFICA COMPLETATA ---');
}

runAll();


