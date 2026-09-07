import crypto from "crypto";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { stripe } from "../_helpers/stripe.js";
import { signKsherPayload, getKsherAppId, getKsherPrivateKey } from "../_helpers/ksher.js";
import fs from "fs";
import path from "path";
import { getPayPalCredentials, getPayPalAccessToken } from "../_helpers/paypal.js";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  let url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!url || !key) {
    try {
      for (const fileName of ['.env.local', '.env']) {
        const envPath = path.resolve(process.cwd(), fileName);
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              if (trimmed.startsWith('SUPABASE_URL=') || trimmed.startsWith('VITE_SUPABASE_URL=')) {
                if (!url) url = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
              } else if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=') || trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
                if (!key) key = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
              }
            }
          }
        }
        if (url && key) break;
      }
    } catch {}
  }

  return (url && key) ? createClient(url, key) : null;
}

// Room configurations matching accommodations.ts
const MOCK_ACCOMMODATIONS = [
  { id: 529784, name: "Jungle Villa", category: "Ville", baseGuests: 8, maxExtraGuests: 0, base_price_high: 4800, base_price_low: 1200, monthly_discount: true },
  { id: 495807, name: "Jungle Villa Left", category: "Ville", baseGuests: 4, maxExtraGuests: 0, base_price_high: 2400, base_price_low: 600, monthly_discount: true },
  { id: 495980, name: "Jungle Villa Right", category: "Ville", baseGuests: 4, maxExtraGuests: 0, base_price_high: 2400, base_price_low: 600, monthly_discount: true },
  { id: 495566, name: "Peace & Love Villa", category: "Ville", baseGuests: 4, maxExtraGuests: 0, base_price_high: 2400, base_price_low: 600, monthly_discount: true },
  { id: 449348, name: "Villa Penthouse", category: "Ville", baseGuests: 4, maxExtraGuests: 0, base_price_high: 2400, base_price_low: 600, monthly_discount: true },
  { id: 449385, name: "Yellow Bungalow", category: "Bungalow", baseGuests: 2, maxExtraGuests: 1, base_price_high: 1800, base_price_low: 750, monthly_discount: true },
  { id: 449422, name: "Red Bungalow", category: "Bungalow", baseGuests: 2, maxExtraGuests: 1, base_price_high: 1800, base_price_low: 750, monthly_discount: true },
  { id: 449668, name: "Green Bungalow", category: "Bungalow", baseGuests: 2, maxExtraGuests: 1, base_price_high: 1800, base_price_low: 790, monthly_discount: true },
  { id: 449675, name: "Camel Tent Glamping", category: "Tende Glamping", baseGuests: 2, maxExtraGuests: 0, base_price_high: 1400, base_price_low: 350, monthly_discount: false },
  { id: 449674, name: "Lagoon Tent Glamping", category: "Tende Glamping", baseGuests: 2, maxExtraGuests: 0, base_price_high: 1400, base_price_low: 350, monthly_discount: false },
  { id: 449678, name: "Room 1", category: "The Hub Guesthouse", baseGuests: 2, maxExtraGuests: 1, base_price_high: 1000, base_price_low: 250, monthly_discount: true },
  { id: 449684, name: "Room 2", category: "The Hub Guesthouse", baseGuests: 2, maxExtraGuests: 2, base_price_high: 1000, base_price_low: 250, monthly_discount: true },
  { id: 449699, name: "Room 3", category: "The Hub Guesthouse", baseGuests: 2, maxExtraGuests: 2, base_price_high: 1000, base_price_low: 250, monthly_discount: true },
  { id: 449724, name: "Room 4", category: "The Hub Guesthouse", baseGuests: 2, maxExtraGuests: 2, base_price_high: 1000, base_price_low: 250, monthly_discount: true },
  { id: 449730, name: "Room 5", category: "The Hub Guesthouse", baseGuests: 2, maxExtraGuests: 0, base_price_high: 1000, base_price_low: 250, monthly_discount: true },
  { id: 449736, name: "Lodge 1", category: "The Hub Guesthouse", baseGuests: 4, maxExtraGuests: 0, base_price_high: 1600, base_price_low: 400, monthly_discount: true },
  { id: 923905, name: "Lodge 2", category: "The Hub Guesthouse", baseGuests: 4, maxExtraGuests: 0, base_price_high: 1600, base_price_low: 400, monthly_discount: true },
  { id: 449742, name: "Internal Room", category: "The Hub Guesthouse", baseGuests: 2, maxExtraGuests: 0, base_price_high: 1000, base_price_low: 250, monthly_discount: true }
];

const PRICE_CONFIG = {
  EXTRA_GUEST_PRICE: 200,  // THB per extra guest per night
  BREAKFAST_PRICE: 200,    // THB per guest per day
  AC_SURCHARGE: 500,       // THB flat per stay
};

export async function handleCreateCheckoutSession(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      accommodationId,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      extraBreakfast,
      extraAC,
      lang,
      origin,
      promoCode,
      discountType,
      discountValue
    } = req.body;

    if (!accommodationId || !checkIn || !checkOut || !guestName || !guestEmail || !guestPhone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const room = MOCK_ACCOMMODATIONS.find((a) => 
      a.id === Number(accommodationId) || 
      (a as any).slug === String(accommodationId || '').toLowerCase() ||
      (a as any).slug === String(req.body.slug || '').toLowerCase() ||
      a.name.toLowerCase() === String(req.body.roomName || accommodationId || '').toLowerCase() ||
      String(req.body.roomName || '').toLowerCase().includes(a.name.toLowerCase())
    ) || MOCK_ACCOMMODATIONS[0];

    // Secure simulation check via SHA-256 hash (never exposes raw phrase to frontend or scrapers)
    const rawTrimmed = String(guestName || "").trim();
    const hashExact = crypto.createHash("sha256").update(rawTrimmed).digest("hex");
    const hashLower = crypto.createHash("sha256").update(rawTrimmed.toLowerCase()).digest("hex");
    const isSimulatedTest = hashExact === "4e138ca57b89e981f234326a55790d7bd10d2253890cfa0251c10229dc41a161" ||
                            hashLower === "76ca1be92d3f7bf285f24f5a341e8c715db18e9c6a715aeeea3dcf8c85775f0a";

    // Calculate stay nights
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    // Low season detection (May to October)
    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    const lowSeasonMonths = [4, 5, 6, 7, 8, 9];
    const isLowSeason = lowSeasonMonths.includes(startMonth) || lowSeasonMonths.includes(endMonth);

    // Stay discount calculations
    let discount = 0;
    if (nights >= 30) {
      discount = 0.20;
    } else if (nights >= 15) {
      discount = 0.15;
    } else if (nights > 0) {
      discount = 0.10;
    }

    // Check Octorate Live Rates first
    let baseRoomPricePerNight = 0;
    let solvedFromOctorate = false;

    // Load tokens from Supabase if available
    const supabase = getSupabaseClient();
    let tokenData: any = null;
    if (supabase) {
      const res = await supabase
        .from("octorate_tokens")
        .select("access_token")
        .eq("id", "singleton")
        .maybeSingle();
      tokenData = res.data;
    }

    if (tokenData?.access_token) {
      try {
        const structureId = process.env.VITE_OCTORATE_STRUCTURE_ID || "366879";
        const octUrl = `https://api.octorate.com/connect/rest/v1/calendar/${structureId}?dateFrom=${checkIn}&dateTo=${checkOut}&size=20`;
        const octRes = await fetch(octUrl, {
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        });

        if (octRes.ok) {
          const octJson = await octRes.json();
          const items = Array.isArray(octJson) ? octJson : (octJson.data || []);
          const targetRoom = items.find((item: any) => item.id === Number(accommodationId) || item.room === Number(accommodationId));

          if (targetRoom && targetRoom.days && targetRoom.days.length > 0) {
            // Verify Octorate minStay restriction
            let maxMinStayRequired = 1;
            targetRoom.days.forEach((d: any) => {
              const ms = Number(d.minStay || d.minstay || 1);
              if (ms > maxMinStayRequired) maxMinStayRequired = ms;
            });

            if (nights < maxMinStayRequired) {
              return res.status(400).json({
                error: `Soggiorno minimo non rispettato. Questo alloggio richiede almeno ${maxMinStayRequired} notti.`
              });
            }

            const totalPriceFromOct = targetRoom.days.reduce((acc: number, day: any) => acc + (day.price || 0), 0);
            if (totalPriceFromOct > 0) {
              baseRoomPricePerNight = Math.round(totalPriceFromOct / targetRoom.days.length);
              solvedFromOctorate = true;
            }
          }
        }
      } catch (octErr) {
        console.warn("[Stripe API] Octorate live rate fetch failed, falling back to local prices:", octErr);
      }
    }

    // Fallback if Octorate was not available
    if (!solvedFromOctorate) {
      baseRoomPricePerNight = isLowSeason ? room.base_price_low : room.base_price_high;
    }

    // Mother Rate (Tariffa Madre): Base room cost + Extra guest cost
    const roomCostMother = baseRoomPricePerNight * nights;
    const extraGuestsCount = Math.max(0, guests - room.baseGuests);
    const totalExtraGuestPrice = extraGuestsCount * PRICE_CONFIG.EXTRA_GUEST_PRICE * nights;
    const motherRateTotal = roomCostMother + totalExtraGuestPrice;

    let directDiscountAmount = 0;
    let promoDiscountAmount = 0;

    if (promoCode && discountType && discountValue) {
      // EXCLUSIVITY (V26): Standard stay discount is FORCED to 0 when coupon is present
      directDiscountAmount = 0;

      const val = Number(discountValue) || 0;
      if (discountType === 'percentage') {
        promoDiscountAmount = Math.round(motherRateTotal * (val / 100));
      } else if (discountType === 'fixed') {
        promoDiscountAmount = Math.min(motherRateTotal, val);
      }
    } else {
      // Standard stay duration discount applies
      directDiscountAmount = Math.round(roomCostMother * discount);
      promoDiscountAmount = 0;
    }

    const discountedRoomAndGuestsTotal = Math.max(0, motherRateTotal - directDiscountAmount - promoDiscountAmount);

    // Extra Breakfast
    const totalBreakfastPrice = extraBreakfast ? (guests * PRICE_CONFIG.BREAKFAST_PRICE * nights) : 0;

    // Extra AC
    const totalACPrice = extraAC ? PRICE_CONFIG.AC_SURCHARGE : 0;

    // Total accommodation base price
    const grandTotal = discountedRoomAndGuestsTotal + totalBreakfastPrice + totalACPrice;

    // Base Deposit (30%)
    const baseDepositAmount = Math.round(grandTotal * 0.30);
    const balanceDue = grandTotal - baseDepositAmount;

    // Selected payment method normalization
    const rawMethod = String(req.body.paymentMethod || 'ksher').toLowerCase();
    const paymentMethod = (rawMethod === 'ksher_promptpay' || rawMethod === 'ksher_card' || rawMethod.includes('ksher')) ? 'ksher' : rawMethod;

    // Apply VAT 7% and incorporated processing costs
    let processingRate = 0;
    if (paymentMethod === 'ksher') {
      processingRate = 0.04; // 4%
    } else if (paymentMethod === 'paypal') {
      processingRate = 0.10; // 10%
    }

    const payableDepositAmount = Math.round(baseDepositAmount * (1 + processingRate));

    // Construct origin URL safely
    const rawOrigin = origin || req.headers?.origin || req.headers?.referer || "https://flowerpower-phayam.com";
    const requestOrigin = Array.isArray(rawOrigin) ? rawOrigin[0] : String(rawOrigin);
    const cleanOrigin = requestOrigin.split('?')[0].replace(/\/$/, "");

    // 0. SECURE SIMULATION MODE (Triggers only on exact SHA-256 match)
    if (isSimulatedTest) {
      const simOrderNo = `FPSIM${Date.now().toString().slice(-6)}`;
      return res.status(200).json({
        sessionId: simOrderNo,
        url: `${cleanOrigin}/village?session_id=${simOrderNo}&booking=success&gateway=ksher_simulated&amount=${payableDepositAmount}`,
        depositAmount: payableDepositAmount,
        balanceDue,
        grandTotal,
        nights,
        gateway: 'ksher_simulated'
      });
    }

    // 1. KSHER PAYMENT (PRIMARY)
    if (paymentMethod === 'ksher') {
      const orderNo = `FPBK${Date.now().toString().slice(-8)}`;
      const appId = getKsherAppId();
      const privateKey = getKsherPrivateKey();
      const timeStamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      const nonceStr = crypto.randomBytes(8).toString("hex");

      const params: Record<string, any> = {
        appid: appId,
        channel_list: req.body.paymentChannel === 'promptpay' ? 'promptpay' : 'card,promptpay',
        fee_type: "THB",
        mch_code: orderNo,
        mch_notify_url: `${cleanOrigin}/api/payments-admin?action=ksher-notify`,
        mch_order_no: orderNo,
        mch_redirect_url: `${cleanOrigin}/village?session_id=${orderNo}&booking=success&gateway=ksher`,
        mch_redirect_url_fail: `${cleanOrigin}/village?booking=failed`,
        nonce_str: nonceStr,
        product_name: `Flower Power Village - ${room.name} (${nights} Notti)`,
        refer_url: cleanOrigin,
        time_stamp: timeStamp,
        total_fee: payableDepositAmount * 100 // in Satang
      };

      const sign = signKsherPayload(params, privateKey);
      params.sign = sign;

      const ksherResponse = await fetch("https://gateway.ksher.com/api/gateway_pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      const ksherData = await ksherResponse.json();

      if (ksherData.code === 0 && (ksherData.data?.pay_content || ksherData.data?.pay_url)) {
        return res.status(200).json({
          sessionId: orderNo,
          url: ksherData.data.pay_content || ksherData.data.pay_url,
          depositAmount: payableDepositAmount,
          balanceDue,
          grandTotal,
          nights,
          gateway: 'ksher'
        });
      }

      console.error("[Checkout API] Ksher Error Response:", ksherData);
      return res.status(400).json({
        error: ksherData.msg || ksherData.error || "Errore durante la generazione del pagamento Ksher."
      });
    }

    // 2. STRIPE CHECKOUT (FALLBACK)
    if (paymentMethod === 'stripe') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "thb",
              product_data: {
                name: `Acconto Prenotazione - ${room.name}`,
                description: `${nights} notti (${checkIn} / ${checkOut}), ${guests} ospiti. Saldo da pagare all'arrivo: ${balanceDue.toLocaleString()} THB`,
              },
              unit_amount: payableDepositAmount * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${cleanOrigin}/village?session_id={CHECKOUT_SESSION_ID}&booking=success`,
        cancel_url: `${cleanOrigin}/village?booking=cancelled`,
        customer_email: guestEmail
      });

      return res.status(200).json({
        sessionId: session.id,
        url: session.url,
        depositAmount: payableDepositAmount,
        balanceDue,
        grandTotal,
        nights,
        gateway: 'stripe'
      });
    }

    // 3. BANK TRANSFER
    if (paymentMethod === 'bank_transfer') {
      const orderNo = `FPBK${Date.now().toString().slice(-8)}`;
      return res.status(200).json({
        sessionId: orderNo,
        isBankTransfer: true,
        depositAmount: payableDepositAmount,
        balanceDue,
        grandTotal,
        nights,
        gateway: 'bank_transfer'
      });
    }

    // 4. PAYPAL (Orders v2 API with Live Access Token)
    if (paymentMethod === 'paypal') {
      const creds = getPayPalCredentials();
      const accessToken = await getPayPalAccessToken();

      const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: `FPBK-${Date.now().toString().slice(-8)}`,
            description: `Flower Power Village - ${room.name} (${nights} Notti)`,
            amount: {
              currency_code: "THB",
              value: payableDepositAmount.toFixed(2)
            }
          }
        ],
        application_context: {
          brand_name: "Flower Power Village",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${cleanOrigin}/village?booking=success&gateway=paypal`,
          cancel_url: `${cleanOrigin}/village?booking=cancelled`
        }
      };

      const orderRes = await fetch(`${creds.baseUrl}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await orderRes.json();
      const approveLink = orderData.links?.find((l: any) => l.rel === "approve")?.href;

      if (!orderRes.ok || !approveLink) {
        throw new Error(`Errore creazione ordine PayPal: ${orderData.message || JSON.stringify(orderData)}`);
      }

      return res.status(200).json({
        sessionId: orderData.id,
        url: approveLink,
        depositAmount: payableDepositAmount,
        balanceDue,
        grandTotal,
        nights,
        gateway: "paypal"
      });
    }

    return res.status(400).json({
      error: `Metodo di pagamento "${paymentMethod}" non supportato.`
    });

  } catch (error: any) {
    console.error("[Checkout API] Error creating session:", error);
    return res.status(500).json({
      error: error.message || "Failed to create checkout session"
    });
  }
}
