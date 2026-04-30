ROTA EXPRESS - RASTREAMENTO EM TEMPO REAL

O que foi adicionado:
- Botão "Iniciar rastreamento" na área do motoboy quando ele aceita uma corrida.
- Botão "Pausar rastreamento" para parar o envio da localização.
- Mapa no pedido para cliente/admin/motoboy acompanharem a localização.
- Atualização da localização do motoboy no Supabase pela tabela pedidos.

IMPORTANTE:
1. Antes de subir o sistema, rode o arquivo supabase_atualizacao.sql no Supabase > SQL Editor.
2. O rastreamento só funciona se o motoboy permitir localização/GPS no celular.
3. O app precisa estar aberto para enviar a localização. No celular, deixe o navegador/app aberto durante a entrega.
4. Se aparecer erro de coluna motoboy_lat/motoboy_lng, significa que o SQL ainda não foi rodado.

Como usar:
- Cliente cria pedido e paga Pix.
- Motoboy aceita a corrida.
- Motoboy toca em "Iniciar rastreamento".
- Cliente/admin passam a ver o mapa no pedido.
- Quando finalizar a entrega, o rastreamento é parado.
