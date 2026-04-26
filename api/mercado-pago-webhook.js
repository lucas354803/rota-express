const SUPABASE_URL = process.env.SUPABASE_URL || "https://dbindrrbdllfozqvmawx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_w8lHZFJkXNGcyoThKTjdIA_FtOQ3uG4";

async function supabaseRest(path, options = {}) {
  const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await resposta.text();
  const data = text ? JSON.parse(text) : null;
  if (!resposta.ok) throw new Error(data?.message || data?.error || "Erro Supabase");
  return data;
}

function isFinalizada(status) {
  const s = String(status || "").trim().toLowerCase();
  return s.includes("finalizada") || s.includes("entregue");
}

export default async function handler(req, res) {
  if (!["POST", "GET"].includes(req.method)) return res.status(405).json({ error: "Método não permitido" });
  const token = process.env.MP_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: "MP_TOKEN não configurado" });

  try {
    const body = req.body || {};
    const paymentId = String(body?.data?.id || body?.id || req.query?.id || req.query?.['data.id'] || "").trim();
    const topic = String(body?.type || body?.topic || req.query?.topic || "");
    if (!paymentId || !topic.includes("payment")) return res.status(200).json({ ok: true, ignored: true });

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
    const payment = await r.json();
    if (!r.ok) throw new Error(payment?.message || "Erro Mercado Pago");

    const pedidoId = String(payment.external_reference || "").trim();
    if (!pedidoId) return res.status(200).json({ ok: true, ignored: "sem external_reference" });

    const pedidos = await supabaseRest(`pedidos?id=eq.${encodeURIComponent(pedidoId)}&select=*`);
    const pedido = pedidos?.[0] || {};

    const patch = { mp_payment_id: String(payment.id) };
    if (payment.status === "approved") {
      patch.pagamento_status = "Pix confirmado";
      if (!pedido.motoboy_id && !isFinalizada(pedido.status)) {
        patch.liberado = true;
        patch.status = "Liberado para motoboys";
      }
    } else {
      patch.pagamento_status = "Aguardando confirmação";
    }

    await supabaseRest(`pedidos?id=eq.${encodeURIComponent(pedidoId)}`, { method: "PATCH", body: JSON.stringify(patch) });
    return res.status(200).json({ ok: true, pedidoId, status: payment.status });
  } catch (erro) {
    return res.status(500).json({ error: "Erro webhook", message: erro.message || "Erro interno" });
  }
}
