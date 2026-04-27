export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const token = process.env.MP_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!token) {
    return res.status(500).json({
      error: "Token Mercado Pago não configurado",
      message: "Configure a variável de ambiente MP_TOKEN na Vercel."
    });
  }

  try {
    const { valor, descricao, pedidoId, nome, telefone } = req.body || {};
    const amount = Number(valor);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: "Valor inválido",
        message: "O valor do Pix precisa ser maior que zero."
      });
    }

    const emailSeguro = `cliente${pedidoId || Date.now()}@rotaexpress.com.br`;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const notificationUrl = host ? `${proto}://${host}/api/mercado-pago-webhook` : undefined;

    const resposta = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `rota-${pedidoId || Date.now()}-${Math.random().toString(36).slice(2)}`
      },
      body: JSON.stringify({
        transaction_amount: Number(amount.toFixed(2)),
        description: descricao || "Entrega Rota Express",
        payment_method_id: "pix",
        external_reference: String(pedidoId || ""),
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        payer: {
          email: emailSeguro,
          first_name: nome || "Cliente",
          phone: {
            number: String(telefone || "").replace(/\D/g, "")
          }
        }
      })
    });

    const data = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json({
        error: "Erro Mercado Pago",
        message: data?.message || data?.error || "Não foi possível gerar Pix.",
        details: data
      });
    }

    const transacao = data?.point_of_interaction?.transaction_data;

    if (!transacao?.qr_code || !transacao?.qr_code_base64) {
      return res.status(500).json({
        error: "Resposta incompleta do Mercado Pago",
        message: "Mercado Pago não retornou o QR Code Pix.",
        details: data
      });
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: transacao.qr_code,
      qr_base64: transacao.qr_code_base64,
      ticket_url: transacao.ticket_url
    });

  } catch (erro) {
    return res.status(500).json({
      error: "Erro interno",
      message: erro.message || "Erro ao gerar Pix."
    });
  }
}
