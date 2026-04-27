ROTA EXPRESS - PIX AUTOMÁTICO

O que foi atualizado:
- Cliente gera Pix Mercado Pago normalmente.
- Quando o Mercado Pago confirmar o Pix, o pedido muda para:
  pagamento_status = Pix confirmado
  liberado = true
  status = Liberado para motoboys
- Assim a entrega aparece automaticamente para os motoboys, sem o admin liberar.
- O sistema também verifica Pix pendente automaticamente enquanto estiver aberto.

Importante:
1. Suba este ZIP na Vercel.
2. Rode o supabase_atualizacao.sql no Supabase SQL Editor.
3. Confirme que a variável MP_TOKEN ou MERCADO_PAGO_ACCESS_TOKEN está configurada na Vercel.
4. Para funcionar mesmo com o site fechado, configure o webhook no Mercado Pago para:
   https://SEU-SITE.vercel.app/api/mercado-pago-webhook

Mesmo se não configurar webhook, o botão "Já paguei / verificar Pix" e a verificação automática com o sistema aberto liberam a entrega.
