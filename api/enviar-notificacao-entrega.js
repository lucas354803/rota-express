import webpush from "web-push";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dbindrrbdllfozqvmawx.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_w8lHZFJkXNGcyoThKTjdIA_FtOQ3uG4";

function configurarWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@rotaexpress.com";

  if (!publicKey || !privateKey) {
    throw new Error("Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nas variáveis de ambiente");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

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

function enderecoCurto(pedido, tipo) {
  const bairro = pedido?.[`${tipo}_bairro`] || "";
  const rua = pedido?.[`${tipo}_rua`] || "";
  const texto = [bairro, rua].filter(Boolean).join(" - ");
  return texto || pedido?.[tipo] || "Endereço não informado";
}

export async function notificarMotoboysNovaEntrega(pedidoId) {
  configurarWebPush();

  const pedidos = await supabaseRest(`pedidos?id=eq.${encodeURIComponent(pedidoId)}&select=*`);
  const pedido = Array.isArray(pedidos) ? pedidos[0] : null;
  if (!pedido) return { enviados: 0, motivo: "pedido não encontrado" };

  const motoboys = await supabaseRest(`usuarios?tipo=eq.motoboy&ativo=neq.false&select=id,nome,push_subscription`);
  const payload = JSON.stringify({
    title: "Nova entrega disponível 🚀",
    body: `Coleta: ${enderecoCurto(pedido, "coleta")} | Entrega: ${enderecoCurto(pedido, "entrega")}`,
    url: "/",
    tag: `pedido-${pedido.id}`
  });

  let enviados = 0;
  for (const motoboy of motoboys || []) {
    if (!motoboy.push_subscription?.endpoint) continue;
    try {
      await webpush.sendNotification(motoboy.push_subscription, payload);
      enviados++;
    } catch (erro) {
      console.log("Falha ao notificar motoboy", motoboy.id, erro?.message || erro);
    }
  }

  return { enviados };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { pedido_id } = req.body || {};
    if (!pedido_id) return res.status(400).json({ error: "pedido_id obrigatório" });

    const resultado = await notificarMotoboysNovaEntrega(pedido_id);
    return res.status(200).json({ ok: true, ...resultado });
  } catch (erro) {
    return res.status(500).json({ error: "Erro ao enviar notificação", message: erro.message || "Erro interno" });
  }
}
