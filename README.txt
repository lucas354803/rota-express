ROTA EXPRESS - VERSÃO CORRIGIDA

Correções aplicadas nesta versão:

1. Valor a pagar para motoboys no admin
- O painel admin agora calcula corretamente o saldo dos motoboys usando entregas finalizadas e ainda não pagas.
- Na aba Motoboys aparece bruto, desconto da Rota e valor líquido para pagar.
- Ao marcar como pago, salva no histórico de pagamentos.

2. Liberação automática após Pix
- Quando o Pix é confirmado pelo Mercado Pago, o pedido muda para Pix confirmado, fica liberado e aparece para os motoboys.
- O arquivo api/criar-pix.js agora envia notification_url para o webhook do Mercado Pago.
- Também foi mantida uma checagem automática a cada atualização do painel, caso o webhook não dispare.

3. Relatórios de entrega
- Quando o motoboy finaliza a entrega, ela sai de Minhas corridas.
- A entrega aparece no Relatório de entregas do motoboy.
- A entrega também aparece no Histórico de entregas do admin.
- Foi adicionada proteção para não duplicar relatório se clicar duas vezes em finalizar.

IMPORTANTE:
1. Rode o arquivo supabase_atualizacao.sql no Supabase > SQL Editor.
2. Na Vercel, configure:
   MP_TOKEN ou MERCADO_PAGO_ACCESS_TOKEN
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
3. Se o webhook do Mercado Pago não estiver configurado manualmente, o sistema tenta confirmar automaticamente pelos pedidos que já têm Pix gerado.

Admin padrão:
Usuário: admin
Senha: 1234
