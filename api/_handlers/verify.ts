import { VercelRequest, VercelResponse } from "@vercel/node";
import { stripe } from "../_helpers/stripe.js";
import { createClient } from "@supabase/supabase-js";
import { generateConfirmationPDF, sendConfirmationEmail } from "../_helpers/booking-confirmation.js";
import { executeAutoShieldForReservation } from "../_helpers/octorate-auto-shield.js";
import * as https from "https";

// Robust HTTP POST using Node built-in https — avoids global fetch() issues in vercel dev on Windows
function httpsPost(url: string, body: object, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers
      },
      timeout: 20000
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("Octorate request timed out after 20s")); });
    req.write(payload);
    req.end();
  });
}

// Initialize Supabase (use service role key to bypass RLS and read octorate_tokens)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null as any;

// Octorate Structure ID
const OCTORATE_STRUCTURE_ID = process.env.VITE_OCTORATE_STRUCTURE_ID || "366879";

export async function handleVerifyCheckoutSession(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { session_id } = req.query;
  if (!session_id || typeof session_id !== "string") {
    return res.status(400).json({ error: "Missing or invalid session_id parameter" });
  }

  try {
    // 0. Handle Simulation & Ksher Verified Sessions
    if (session_id.startsWith("FPSIM") || session_id.startsWith("SIM_")) {
      return res.status(200).json({
        paid: true,
        stripeSessionId: session_id,
        octorateReservationId: `SIM-${session_id}`,
        octorateStatus: "confirmed",
        finalTotal: 21600,
        depositPaid: 6739,
        balanceDue: 15120,
        bookingData: {
          accommodationId: 529784,
          checkIn: "2026-11-10",
          checkOut: "2026-11-15",
          guests: 2,
          guestName: "Snooker0 (Simulazione Test)",
          guestEmail: "test@flowerpower-phayam.com",
          guestPhone: "+66 81 234 5678",
          extraBreakfast: false,
          extraAC: false,
          totalPrice: 21600,
          depositPaid: 6739,
          balanceDue: 15120
        }
      });
    }

    // 1. Retrieve Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        paid: false,
        error: "Session is not paid yet",
        status: session.payment_status
      });
    }

    // 2. Extract booking metadata saved during creation
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
      totalPrice,
      depositPaid,
      balanceDue
    } = session.metadata || {};

    if (!accommodationId || !checkIn || !checkOut || !guestName || !guestEmail || !guestPhone) {
      return res.status(422).json({
        paid: true,
        error: "Session paid but booking metadata is incomplete or missing in Stripe session",
        metadata: session.metadata
      });
    }

    // Extract calculated financial values certified directly from Stripe metadata (V27)
    const finalTotalAmt     = Number(session.metadata?.grandTotal || session.metadata?.finalTotal || session.metadata?.totalPrice || totalPrice || 0);
    const depositPaidAmt    = Number(session.metadata?.depositAmount || session.metadata?.depositPaid || depositPaid || Math.round(finalTotalAmt * 0.3));
    const balanceDueAmt     = Number(session.metadata?.balanceDue || balanceDue || (finalTotalAmt - depositPaidAmt));
    const promoCodeVal      = session.metadata?.promoCode || null;
    const discountAmountVal = Number(session.metadata?.discountAmount || session.metadata?.promoDiscountAmount || 0);

    // Guard: if already emailed, restore and return immediately (prevents duplicate Octorate and email calls)
    if (session.metadata?.emailSent === "true") {
      console.log(`[Verify API] Session ${session.id} already verified and emailed. Returning cached reservation.`);
      return res.status(200).json({
        paid: true,
        stripeSessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : "",
        octorateReservationId: session.metadata.octorateReservationId || null,
        octorateStatus: session.metadata.octorateReservationId ? "confirmed" : null,
        finalTotal: finalTotalAmt,
        depositPaid: depositPaidAmt,
        balanceDue: balanceDueAmt,
        promoCode: promoCodeVal,
        discountAmount: discountAmountVal,
        bookingData: {
          accommodationId: Number(accommodationId),
          checkIn,
          checkOut,
          guests: Number(guests),
          guestName,
          guestEmail,
          guestPhone,
          extraBreakfast: extraBreakfast === "true",
          extraAC: extraAC === "true",
          totalPrice: finalTotalAmt,
          depositPaid: depositPaidAmt,
          balanceDue: balanceDueAmt,
          finalTotal: finalTotalAmt,
          promoCode: promoCodeVal,
          discountAmount: discountAmountVal
        }
      });
    }

    // 3. Attempt to create reservation in Octorate (server-side, has access to tokens)
    let octorateReservationId: string | null = null;
    let octorateStatus: string | null = null;
    let octorateError: string | null = null;

    try {
      // Read Octorate tokens from Supabase
      const { data: tokenData } = await supabase
        .from("octorate_tokens")
        .select("access_token, refresh_token")
        .eq("id", "singleton")
        .maybeSingle();

      if (tokenData?.access_token) {
        const OCTORATE_API_BASE = "https://api.octorate.com/connect/rest/v1";

        const now = new Date().toISOString();
        const [givenName, ...lastNameParts] = (guestName || "Guest Guest").split(" ");
        const familyName = lastNameParts.join(" ") || "Guest";
        const totalGuest = Number(guests || 1);

        const guestsList = [{
          type: "BOOKER",
          givenName,
          familyName,
          email: guestEmail || "",
          phone: guestPhone || "",
          checkin: checkIn,
          checkout: checkOut,
          sex: "MALE"
        }];

        const sessionSuffix = session.id.replace(/^cs_test_|^cs_/, "");
        const refer = (Date.now().toString(36).substring(0, 8) + sessionSuffix.slice(-17)).substring(0, 25);

        const depositPaidAmt  = Number(depositPaid  || 0);
        const balanceDueAmt   = Number(balanceDue   || 0);
        const stayNights      = Number(session.metadata?.nights || 0);
        const discountPct     = Number(session.metadata?.discountPercent || 0);
        const hasAC           = extraAC === "true";
        const hasBreakfast    = extraBreakfast === "true";
        const numGuests       = Number(guests || 1);
        const breakfastCount  = hasBreakfast ? numGuests * stayNights : 0;

        const promoCode            = session.metadata?.promoCode || "";
        const discountType         = session.metadata?.discountType || "";
        const discountValue        = session.metadata?.discountValue || "0";
        const promoDiscountAmount  = Number(session.metadata?.promoDiscountAmount || session.metadata?.discountAmount || 0);
        const directDiscountAmount = Number(session.metadata?.directDiscountAmount || 0);

        let discountLine = "";
        let promoLine = "";

        if (promoCode) {
          const formattedDisc = discountType === "percentage" ? `-${discountValue}%` : `-฿${discountValue}`;
          discountLine = `| Discount Applied    : EXCLUSIVE PROMO COUPON (${promoCode})`;
          promoLine    = `| Coupon Details      : ${promoCode} (${formattedDisc}, saved ฿${promoDiscountAmount.toLocaleString("en")}) — Standard stay discount bypassed`;
        } else if (directDiscountAmount > 0 || discountPct > 0) {
          const savedStr = directDiscountAmount > 0 ? `saved ฿${directDiscountAmount.toLocaleString("en")}` : `-${discountPct}%`;
          discountLine = `| Discount Applied    : Standard Direct Stay Discount (${savedStr})`;
        } else {
          discountLine = `| Discount Applied    : None`;
        }

        const formatDisplayDate = (dStr: string) => {
          if (!dStr) return '';
          const p = dStr.slice(0, 10).split(/[\/\-]/);
          return p.length === 3 && p[0].length === 4 ? `${p[2]}/${p[1]}/${p[0]}` : dStr;
        };

        const notesLines = [
          `=== FLOWER POWER VILLAGE — BOOKING SUMMARY ===`,
          `| Stripe Session      : ${session.id}`,
          `| Total Amount        : ฿${Number(totalPrice || 0).toLocaleString("en")}`,
          `| Deposit Paid (30%)  : ฿${depositPaidAmt.toLocaleString("en")} (charged via Stripe)`,
          `| Balance Due (70%)   : ฿${balanceDueAmt.toLocaleString("en")} (to be paid at check-in)`,
          `| Stay                : ${stayNights} night${stayNights !== 1 ? "s" : ""} (${formatDisplayDate(checkIn)} → ${formatDisplayDate(checkOut)})`,
          discountLine,
        ];
        if (promoLine) {
          notesLines.push(promoLine);
        }
        notesLines.push(
          `| Air Conditioning    : ${hasAC ? "YES — AC surcharge included" : "No"}`,
          `| Breakfast           : ${hasBreakfast ? `YES — ${breakfastCount} breakfast${breakfastCount !== 1 ? "s" : ""} (${numGuests} guest${numGuests !== 1 ? "s" : ""} × ${stayNights} night${stayNights !== 1 ? "s" : ""})` : "No"}`,
          `===============================================`
        );

        const privateNotes = notesLines.join("\n");

        const reservationBody = {
          status: "CONFIRMED",
          refer,
          channelId: 233,
          product: Number(accommodationId),
          checkin: `${checkIn}T14:00:00Z`,
          checkout: `${checkOut}T12:00:00Z`,
          createTime: now,
          updateTime: now,
          guests: guestsList,
          roomGross: Number(totalPrice),
          totalGuest,
          totalChildren: 0,
          totalInfants: 0,
          privateNotes
        };

        console.log("[Verify API] Posting to Octorate:", `${OCTORATE_API_BASE}/reservation/${OCTORATE_STRUCTURE_ID}`);

        let currentToken = tokenData.access_token;

        const httpsPostForm = (url: string, params: Record<string, string>, hdrs: Record<string, string> = {}): Promise<{ status: number; body: string }> =>
          new Promise((resolve, reject) => {
            const payload = new URLSearchParams(params).toString();
            const parsed = new URL(url);
            const req = https.request({
              hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(payload), ...hdrs },
              timeout: 15000
            }, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode || 0, body: d })); });
            req.on("error", reject);
            req.on("timeout", () => req.destroy(new Error("refresh token timeout")));
            req.write(payload); req.end();
          });

        let octRaw = await httpsPost(`${OCTORATE_API_BASE}/reservation/${OCTORATE_STRUCTURE_ID}`, reservationBody, { "Authorization": `Bearer ${currentToken}` });

        console.log("[Verify API] Octorate initial response status:", octRaw.status);

        if (octRaw.status === 401 && tokenData.refresh_token) {
          console.log("[Verify API] 401 - Octorate token expired, attempting refresh...");
          const refreshRaw = await httpsPostForm(`${OCTORATE_API_BASE}/identity/refresh`, {
            grant_type: "refresh_token",
            refresh_token: tokenData.refresh_token,
            client_id: process.env.VITE_OCTORATE_CLIENT_ID || "",
            client_secret: process.env.VITE_OCTORATE_SECRET_KEY || "",
          });

          if (refreshRaw.status >= 200 && refreshRaw.status < 300) {
            const newTokens = JSON.parse(refreshRaw.body);
            console.log("[Verify API] Refresh successful, new token starts with:", String(newTokens.access_token).substring(0, 10));
            currentToken = newTokens.access_token;
            await supabase.from("octorate_tokens").upsert({
              id: "singleton",
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token || tokenData.refresh_token,
              expires_in: newTokens.expires_in,
              updated_at: new Date().toISOString()
            });
            octRaw = await httpsPost(`${OCTORATE_API_BASE}/reservation/${OCTORATE_STRUCTURE_ID}`, reservationBody, { "Authorization": `Bearer ${currentToken}` });
            console.log("[Verify API] Octorate retry response status:", octRaw.status);
          } else {
            console.error("[Verify API] Token refresh FAILED:", refreshRaw.status, refreshRaw.body);
          }
        }

        if (octRaw.status >= 200 && octRaw.status < 300) {
          const octData = JSON.parse(octRaw.body);
          octorateReservationId = String(octData.id || octData.reservationId || "") || null;
          octorateStatus = "confirmed";
          console.log(`[Verify API] Octorate reservation created: ${octorateReservationId}`);

          if (octorateReservationId) {
            const depositAmount = depositPaid ? Number(depositPaid) : Math.round(Number(totalPrice || 0) * 0.3);
            const paymentBody = {
              paymentMode: "CREDITCARD",
              referenceTime: new Date().toISOString(),
              amount: depositAmount,
              transaction: typeof session.payment_intent === "string" ? session.payment_intent : session.id,
              description: `Caparra 30% pagata via Stripe - Session: ${session.id}`,
              status: "NORMAL"
            };

            try {
              console.log(`[Verify API] Registering deposit payment of ฿${depositAmount} in Octorate for reservation ${octorateReservationId}...`);
              const payRaw = await httpsPost(
                `${OCTORATE_API_BASE}/reservation/${OCTORATE_STRUCTURE_ID}/${octorateReservationId}/payment`,
                paymentBody,
                { "Authorization": `Bearer ${currentToken}` }
              );
              if (payRaw.status >= 200 && payRaw.status < 300) {
                console.log(`[Verify API] Octorate deposit payment successfully registered.`);
              } else {
                console.warn(`[Verify API] Failed to register deposit payment in Octorate:`, payRaw.status, payRaw.body);
              }
            } catch (payErr: any) {
              console.error(`[Verify API] Error registering Octorate payment:`, payErr);
            }

            // 🛡️ Post-Booking Auto-Shield: Sigilla istantaneamente tutte le tariffe derivate per questo alloggio e date
            try {
              console.log(`[Verify API] Triggering Auto-Shield for reservation ${octorateReservationId} (${accommodationId})...`);
              await executeAutoShieldForReservation({
                accessToken: currentToken,
                checkIn,
                checkOut,
                roomName: session.metadata?.accommodationName || session.metadata?.roomName || '',
                productId: accommodationId,
                reservationId: octorateReservationId,
                guestName,
                channelName: 'Sito Web Diretto (Stripe)',
                supabaseAdmin: supabase
              });
            } catch (shieldErr) {
              console.warn('[Verify API] Auto-Shield non-fatal warning:', shieldErr);
            }
          }
        } else {
          octorateError = `Octorate API error (${octRaw.status}): ${octRaw.body}`;
          console.error(`[Verify API] ${octorateError}`);
        }
      } else {
        console.log("[Verify API] No Octorate tokens found — skipping Octorate reservation.");
        octorateError = "Octorate non connesso. La prenotazione è registrata solo su Stripe.";
      }
    } catch (octErr: any) {
      octorateError = `Octorate error: ${octErr.message}`;
      console.error("[Verify API] Octorate reservation error:", octErr);
    }

    // 4. Generate Confirmation PDF and Send Confirmation Email
    try {
      const websiteUrl = session.success_url ? new URL(session.success_url).origin : "https://flowerpower-phayam.com";
      console.log(`[Verify API] Generating PDF and sending email for session ${session.id}...`);
      
      const fullMetadata = {
        ...(session.metadata || {}),
        finalTotal: finalTotalAmt,
        totalPrice: finalTotalAmt,
        grandTotal: finalTotalAmt,
        depositPaid: depositPaidAmt,
        depositAmount: depositPaidAmt,
        balanceDue: balanceDueAmt,
        promoCode: promoCodeVal,
        discountAmount: discountAmountVal,
        promoDiscountAmount: discountAmountVal,
        extraBreakfast: session.metadata?.extraBreakfast || "false",
        extraAC: session.metadata?.extraAC || "false"
      };

      const pdfBuffer = await generateConfirmationPDF(fullMetadata, octorateReservationId, websiteUrl);
      await sendConfirmationEmail(fullMetadata, octorateReservationId, pdfBuffer, websiteUrl);
      
      console.log(`[Verify API] Updating Stripe Checkout Session ${session.id} metadata...`);
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          emailSent: "true",
          octorateReservationId: octorateReservationId || ""
        }
      });
    } catch (emailErr: any) {
      console.error("[Verify API] Confirmation email / Stripe metadata update failed:", emailErr);
    }

    // 5. Return success
    return res.status(200).json({
      paid: true,
      stripeSessionId: session.id,
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : "",
      octorateReservationId,
      octorateStatus,
      octorateError,
      finalTotal: finalTotalAmt,
      depositPaid: depositPaidAmt,
      balanceDue: balanceDueAmt,
      promoCode: promoCodeVal,
      discountAmount: discountAmountVal,
      bookingData: {
        accommodationId: Number(accommodationId),
        checkIn,
        checkOut,
        guests: Number(guests),
        guestName,
        guestEmail,
        guestPhone,
        extraBreakfast: extraBreakfast === "true",
        extraAC: extraAC === "true",
        totalPrice: finalTotalAmt,
        depositPaid: depositPaidAmt,
        balanceDue: balanceDueAmt,
        finalTotal: finalTotalAmt,
        promoCode: promoCodeVal,
        discountAmount: discountAmountVal
      }
    });
  } catch (error: any) {
    console.error("[Stripe API] Checkout session verification failed:", error);
    return res.status(500).json({ error: error.message || "Failed to verify checkout session" });
  }
}
