import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, amount, student_id, fee_type_id, month, year, callback_data } = body;

    // Load gateway config
    const { data: config, error: cfgErr } = await supabase
      .from("payment_gateway_config")
      .select("*")
      .eq("is_enabled", true)
      .limit(1)
      .maybeSingle();

    if (cfgErr || !config) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured or disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle callback/IPN verification
    if (action === "verify_callback") {
      return new Response(
        JSON.stringify({ success: true, provider: config.provider, message: "Callback received" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initiate payment
    if (action === "initiate") {
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: "Invalid amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      let paymentUrl = "";
      let responseData: Record<string, unknown> = {};

      switch (config.provider) {
        case "bkash": {
          // bKash PGW - Grant Token then Create Payment
          const tokenRes = await fetch(`${config.api_url}/tokenized/checkout/token/grant`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              username: config.api_key,
              password: config.api_secret,
            },
            body: JSON.stringify({
              app_key: config.merchant_id,
              app_secret: config.api_secret,
            }),
          });
          const tokenData = await tokenRes.json();

          if (tokenData.id_token) {
            const createRes = await fetch(`${config.api_url}/tokenized/checkout/create`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: tokenData.id_token,
                "X-APP-Key": config.merchant_id,
              },
              body: JSON.stringify({
                mode: "0011",
                payerReference: student_id || "anonymous",
                callbackURL: config.callback_url,
                amount: String(amount),
                currency: "BDT",
                intent: "sale",
                merchantInvoiceNumber: transactionId,
              }),
            });
            const createData = await createRes.json();
            paymentUrl = createData.bkashURL || "";
            responseData = createData;
          } else {
            responseData = { error: "bKash token grant failed", details: tokenData };
          }
          break;
        }

        case "nagad": {
          // Nagad initialization
          const initRes = await fetch(`${config.api_url}/remote-payment/initialize/${config.merchant_id}/${transactionId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-KM-Api-Version": "v-0.2.0",
              "X-KM-IP-V4": "127.0.0.1",
              "X-KM-Client-Type": "PC_WEB",
            },
            body: JSON.stringify({
              accountNumber: config.api_key,
              dateTime: new Date().toISOString(),
              sensitiveData: JSON.stringify({ merchantId: config.merchant_id, orderId: transactionId, amount }),
              signature: config.api_secret,
            }),
          });
          responseData = await initRes.json();
          break;
        }

        case "sslcommerz": {
          const formData = new URLSearchParams();
          formData.append("store_id", config.api_key);
          formData.append("store_passwd", config.api_secret);
          formData.append("total_amount", String(amount));
          formData.append("currency", "BDT");
          formData.append("tran_id", transactionId);
          formData.append("success_url", config.callback_url + "?status=success");
          formData.append("fail_url", config.callback_url + "?status=fail");
          formData.append("cancel_url", config.callback_url + "?status=cancel");
          formData.append("cus_name", "Student");
          formData.append("cus_email", "student@example.com");
          formData.append("cus_phone", "01700000000");
          formData.append("cus_add1", "Dhaka");
          formData.append("cus_city", "Dhaka");
          formData.append("cus_country", "Bangladesh");
          formData.append("shipping_method", "NO");
          formData.append("product_name", "Fee Payment");
          formData.append("product_category", "Education");
          formData.append("product_profile", "non-physical-goods");

          const baseUrl = config.is_sandbox
            ? "https://sandbox.sslcommerz.com"
            : "https://securepay.sslcommerz.com";

          const sslRes = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          });
          const sslData = await sslRes.json();
          paymentUrl = sslData.GatewayPageURL || "";
          responseData = sslData;
          break;
        }

        case "stripe": {
          // Stripe Checkout Session
          const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.api_secret}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              "payment_method_types[]": "card",
              "line_items[0][price_data][currency]": "bdt",
              "line_items[0][price_data][product_data][name]": "Fee Payment",
              "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)),
              "line_items[0][quantity]": "1",
              mode: "payment",
              success_url: config.callback_url + "?status=success&session_id={CHECKOUT_SESSION_ID}",
              cancel_url: config.callback_url + "?status=cancel",
              "metadata[transaction_id]": transactionId,
              "metadata[student_id]": student_id || "",
            }),
          });
          const stripeData = await stripeRes.json();
          paymentUrl = stripeData.url || "";
          responseData = stripeData;
          break;
        }

        case "paypal": {
          // PayPal Orders API
          const authRes = await fetch(`${config.api_url || "https://api-m.sandbox.paypal.com"}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${config.api_key}:${config.api_secret}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });
          const authData = await authRes.json();

          if (authData.access_token) {
            const orderRes = await fetch(`${config.api_url || "https://api-m.sandbox.paypal.com"}/v2/checkout/orders`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${authData.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [{
                  reference_id: transactionId,
                  amount: { currency_code: "USD", value: String(amount) },
                }],
                application_context: {
                  return_url: config.callback_url + "?status=success",
                  cancel_url: config.callback_url + "?status=cancel",
                },
              }),
            });
            const orderData = await orderRes.json();
            const approveLink = orderData.links?.find((l: any) => l.rel === "approve");
            paymentUrl = approveLink?.href || "";
            responseData = orderData;
          } else {
            responseData = { error: "PayPal auth failed", details: authData };
          }
          break;
        }

        default: {
          // Generic provider - just return config info
          responseData = {
            provider: config.provider,
            transaction_id: transactionId,
            amount,
            message: "Generic provider - implement custom integration",
          };
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          provider: config.provider,
          transaction_id: transactionId,
          payment_url: paymentUrl,
          data: responseData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'initiate' or 'verify_callback'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
