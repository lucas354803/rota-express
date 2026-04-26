ROTA EXPRESS - VERSÃO FINAL CORRIGIDA

Arquivos:
- index.html
- api/criar-pix.js
- package.json

Correções desta versão:
- Login do cliente agora aceita NOME ou TELEFONE cadastrado.
- Corrigido erro de cadastro não encontrado quando digitava nome em vez de telefone.
- Corrigido bug dos campos apagando enquanto o cliente digitava.
- Pix Mercado Pago usa email válido no backend.
- Mantém Supabase online + Mercado Pago + cálculo profissional + som de nova entrega.

IMPORTANTE NA VERCEL:
1. Settings > Environment Variables
2. Crie/Confira:
   MP_TOKEN = seu Access Token de produção do Mercado Pago
3. Faça Redeploy.

IMPORTANTE NO SUPABASE:
- Tabelas necessárias: usuarios e pedidos.
- RLS precisa estar desativado ou com políticas liberando select/insert/update/delete.
