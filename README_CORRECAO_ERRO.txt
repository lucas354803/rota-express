CORREÇÃO APLICADA - NOTIFICAÇÃO FORTE

Foi identificado um erro de JavaScript causado por crases escapadas no texto da notificação:
const texto = \`...\`

Isso podia travar o script e impedir o sistema de abrir corretamente.

Corrigido:
- script.js validado com node --check
- script principal dentro do index.html validado com node --check
- removido botão duplicado "🔔 Ativar alertas fortes" no painel do motoboy
- mantidas as funções de som forte, vibração e notificação PWA

Como testar:
1. Envie este ZIP para a Vercel.
2. Abra o painel do motoboy.
3. Clique em "🔔 Ativar alertas fortes".
4. Permita notificações no navegador.
5. Quando surgir nova corrida liberada, o app toca, vibra e mostra aviso.
