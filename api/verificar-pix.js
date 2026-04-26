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
  if (!resposta.ok) {
    throw new Error(data?.message || data?.error || "Erro Supabase");
  }
  return data;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const token = process.env.MP_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Token Mercado Pago não configurado", message: "Configure MP_TOKEN na Vercel." });
  }

  try {
    const pedidoId = String(req.query.pedidoId || "").trim();
    if (!pedidoId) return res.status(400).json({ error: "pedidoId obrigatório" });

    const pedidos = await supabaseRest(`pedidos?id=eq.${encodeURIComponent(pedidoId)}&select=*`);
    const pedido = pedidos?.[0];
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    let payment = null;

    if (pedido.mp_payment_id) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${pedido.mp_payment_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      payment = await r.json();
      if (!r.ok) payment = null;
    }

    if (!payment) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(pedidoId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.message || "Erro ao consultar Mercado Pago");
      payment = (data?.results || []).sort((a, b) => new Date(b.date_created || 0) - new Date(a.date_created || 0))[0];
    }

    if (!payment) return res.status(200).json({ approved: false, status: "not_found" });

    const approved = payment.status === "approved";

    await supabaseRest(`pedidos?id=eq.${encodeURIComponent(pedidoId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        mp_payment_id: String(payment.id || pedido.mp_payment_id || ""),
        pagamento_status: approved ? "Pix confirmado" : "Aguardando confirmação",
        liberado: approved ? true : pedido.liberado,
        status: approved ? "Liberado para motoboys" : pedido.status
      })
    });

    return res.status(200).json({ approved, status: payment.status, payment_id: payment.id });
  } catch (erro) {
    return res.status(500).json({ error: "Erro interno", message: erro.message || "Erro ao verificar Pix" });
  }
}
