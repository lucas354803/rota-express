ROTA EXPRESS - ATUALIZADO COM MERCADO PAGO

Arquivos:
- index.html
- api/criar-pix.js
- package.json

Como subir:
1. Envie todos esses arquivos para o GitHub.
2. Na Vercel, vá em Settings > Environment Variables.
3. Crie:
   Name: MP_TOKEN
   Value: seu Access Token do Mercado Pago
4. Faça Redeploy.

O token NÃO deve ficar dentro do index.html.


ATUALIZAÇÃO:
- Corrigido erro do Mercado Pago: payer.email must be a valid email.
- Corrigido erro da área do cliente apagando campos enquanto digitava.
- A atualização automática agora não recarrega a tela do cliente enquanto ele escreve.
