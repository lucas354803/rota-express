NOTIFICAÇÕES NO CELULAR - ROTA EXPRESS

O que foi adicionado:
1. Botão no painel do motoboy: "🔔 Ativar notificações no celular".
2. Service Worker: rota-express-sw.js.
3. API para salvar o celular autorizado: /api/salvar-inscricao-push.
4. API para enviar notificação: /api/enviar-notificacao-entrega.
5. Webhook do Mercado Pago atualizado: quando o Pix for aprovado, envia notificação para todos os motoboys ativos.
6. SQL atualizado: coluna push_subscription na tabela usuarios.

IMPORTANTE - RODE NO SUPABASE:
Abra o arquivo supabase_atualizacao.sql e rode tudo no SQL Editor do Supabase.

IMPORTANTE - CONFIGURE NA VERCEL/SERVIDOR:
Adicione estas variáveis de ambiente:

VAPID_PUBLIC_KEY=BETxXo9UzrVm4iK8zJNXw99oB_nqcrVKK2OASn1JM9MtcGpsnY96NuWehWoLVzGpVBOZXBN71MXpYOgQggksyVc
VAPID_PRIVATE_KEY=3NTXjVukZBCj5zAW1fVZEHqqn6jsYW6pSHVUgE303rs
VAPID_SUBJECT=mailto:admin@rotaexpress.com

Também confira se já estão configuradas:
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MP_TOKEN

COMO USAR:
1. Publique o sistema atualizado.
2. Entre pelo celular como motoboy.
3. Clique em "🔔 Ativar notificações no celular".
4. Permita as notificações no navegador.
5. Quando o Pix for aprovado, o motoboy recebe aviso no celular.

OBSERVAÇÃO:
No Android com Chrome/Edge funciona bem.
No iPhone, o Safari costuma exigir instalar o site na tela inicial para receber push.
