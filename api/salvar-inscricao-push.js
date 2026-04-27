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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { usuario_id, subscription } = req.body || {};
    if (!usuario_id || !subscription?.endpoint) {
      return res.status(400).json({ error: "Dados incompletos para ativar notificação" });
    }

    await supabaseRest(`usuarios?id=eq.${encodeURIComponent(usuario_id)}`, {
      method: "PATCH",
      body: JSON.stringify({ push_subscription: subscription })
    });

    return res.status(200).json({ ok: true });
  } catch (erro) {
    return res.status(500).json({ error: "Erro ao salvar notificação", message: erro.message || "Erro interno" });
  }
}
