ROTA EXPRESS - VERSÃO COMPLETA ATUALIZADA

Arquivos principais:
- index.html
- api/criar-pix.js
- api/verificar-pix.js
- api/mercado-pago-webhook.js
- supabase_atualizacao.sql
- package.json

O que foi atualizado:
- Nova aba no admin: Pedidos, Histórico de entregas, Histórico de pagamentos e Motoboys.
- Quando o motoboy finaliza a corrida, ela aparece no histórico de entregas.
- Cliente vê a entrega como entregue/finalizada quando o motoboy finaliza.
- Pagamento do motoboy salva valor, hora, nome e pedidos no histórico de pagamentos.
- Botão para deletar/desativar motoboy que não está mais ativo.
- Pix confirmado libera automaticamente a entrega para os motoboys.
- Botão para verificar Pix manualmente pelo cliente/admin.
- Botão para calcular KM automático usando coleta e entrega via OpenStreetMap/OSRM.
- Confirmação manual do Pix no admin agora também libera automaticamente a entrega.

IMPORTANTE NO SUPABASE:
1. Abra Supabase > SQL Editor.
2. Rode o arquivo supabase_atualizacao.sql.
3. Confira se existem as tabelas usuarios e pedidos.
4. Para teste, deixe o RLS desativado ou crie políticas liberando select/insert/update/delete.

IMPORTANTE NA VERCEL:
1. Settings > Environment Variables
2. Configure:
   MP_TOKEN = seu Access Token de produção do Mercado Pago
   SUPABASE_URL = URL do seu Supabase
   SUPABASE_SERVICE_ROLE_KEY = Service Role Key do Supabase
3. Faça Redeploy.

WEBHOOK MERCADO PAGO:
Configure no painel do Mercado Pago a URL:
https://SEU-DOMINIO.vercel.app/api/mercado-pago-webhook
Evento: payment

Observação sobre KM automático:
O cálculo automático usa serviço público de mapa. Se o endereço vier incompleto, pode falhar. Nesse caso, digite o KM manualmente.

ATUALIZAÇÃO EXTRA - ENDEREÇOS SEPARADOS
- Cliente agora preenche endereço de coleta com cidade, bairro e rua.
- Cliente agora preenche endereço de entrega com cidade, bairro e rua.
- O sistema salva os campos separados e também monta o endereço completo para motoboy, admin, histórico e Maps.
- Rode novamente o arquivo supabase_atualizacao.sql no Supabase para criar as novas colunas.
