
const SUPABASE_URL = "https://dbindrrbdllfozqvmawx.supabase.co";
const SUPABASE_KEY = "sb_publishable_w8lHZFJkXNGcyoThKTjdIA_FtOQ3uG4";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TAXA_ROTA = 20;
const PIX_ROTA = "48999117385";
const PIX_NOME = "LUCAS ALVES FERNANDES";

let sessao = JSON.parse(localStorage.getItem("rota_sessao_online")) || null;
let clientes = [];
let motoboys = [];
let pedidos = [];
let historicoEntregas = [];
let historicoPagamentos = [];
let abaAdmin = localStorage.getItem("rota_aba_admin") || "pedidos";
let abaMotoboy = localStorage.getItem("rota_aba_motoboy") || "ativas";
let abaCliente = localStorage.getItem("rota_aba_cliente") || "ativas";
let ultimoTotalPedidos = 0;
let somLiberado = false;
let intervaloAtualizacao = null;


function liberarSom(){
  somLiberado = true;
}

function tocarSomNovaEntrega(){
  if(!somLiberado) return;

  try{
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.18;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();

    setTimeout(() => {
      osc.frequency.value = 660;
    }, 180);

    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 420);
  }catch(e){
    console.log("Som bloqueado pelo navegador", e);
  }
}

function calcularTempo(data){
  if(!data) return "tempo não informado";

  const inicio = new Date(data);
  const agora = new Date();

  let diff = Math.floor((agora - inicio) / 1000);
  if(diff < 0) diff = 0;

  const horas = Math.floor(diff / 3600);
  const minutos = Math.floor((diff % 3600) / 60);

  if(horas > 0){
    return `${horas}h ${minutos}min`;
  }

  return `${minutos}min`;
}

function textoTempoEntrega(p){
  if(statusFinalizado(p.status)){
    return "Entrega finalizada";
  }

  if(p.status === "Aceito pelo motoboy" || p.status === "Pedido coletado"){
    return "Em andamento há " + calcularTempo(p.criado_em);
  }

  return "Criado há " + calcularTempo(p.criado_em);
}

function dinheiro(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function calcular(km){
  km = Number(km || 0);
  if(km <= 0) return 0;

  // CÁLCULO PROFISSIONAL ROTA EXPRESS
  // Até 4km: valor mínimo
  // Acima de 4km: cobra adicional por km extra
  // Taxa de operação já inclusa no valor final
  const VALOR_MINIMO = 8.00;
  const KM_INCLUSO = 4;
  const VALOR_KM_EXTRA = 2.00;
  const TAXA_CHUVA_NOITE = 0; // mude para 2 ou 3 se quiser cobrar adicional

  let valor = VALOR_MINIMO;

  if(km > KM_INCLUSO){
    valor += (km - KM_INCLUSO) * VALOR_KM_EXTRA;
  }

  valor += TAXA_CHUVA_NOITE;

  return Number(valor.toFixed(2));
}

function explicarCalculo(km){
  km = Number(km || 0);
  if(km <= 0) return "Informe a distância para calcular.";

  const VALOR_MINIMO = 8.00;
  const KM_INCLUSO = 4;
  const VALOR_KM_EXTRA = 2.00;
  const TAXA_CHUVA_NOITE = 0;

  if(km <= KM_INCLUSO){
    return `Valor mínimo: R$ 8,00 até 4km`;
  }

  const kmExtra = km - KM_INCLUSO;
  const extra = kmExtra * VALOR_KM_EXTRA;
  let texto = `R$ 8,00 até 4km + ${kmExtra.toFixed(1)}km extra x R$ 2,00 = ${dinheiro(VALOR_MINIMO + extra)}`;

  if(TAXA_CHUVA_NOITE > 0){
    texto += ` + adicional ${dinheiro(TAXA_CHUVA_NOITE)}`;
  }

  return texto;
}
function hoje(){return new Date().toISOString().slice(0,10)}
function hora(){return new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
function agoraBR(){return new Date().toLocaleString("pt-BR")}
function setAbaAdmin(aba){abaAdmin = aba; localStorage.setItem("rota_aba_admin", aba); render();}
function setAbaMotoboy(aba){abaMotoboy = aba; localStorage.setItem("rota_aba_motoboy", aba); render();}
function setAbaCliente(aba){abaCliente = aba; localStorage.setItem("rota_aba_cliente", aba); render();}
function esc(v){return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c] || c));}


function idIgual(a,b){ return String(a ?? "") === String(b ?? ""); }
function nomeIgual(a,b){ return normalizarTexto(a) && normalizarTexto(a) === normalizarTexto(b); }
function statusFinalizado(status){
  const s = normalizarTexto(status);
  return s.includes("finalizada") || s.includes("finalizado") || s.includes("entregue");
}
function motoboyDoPedido(p, motoboy){
  if(!p || !motoboy) return false;
  const telPedido = somenteNumeros(p.motoboy_whatsapp || p.motoboy_telefone || "");
  const telMotoboy = somenteNumeros(motoboy.telefone || motoboy.whats || "");
  return idIgual(p.motoboy_id, motoboy.id) || nomeIgual(p.motoboy_nome, motoboy.nome) || (telPedido && telMotoboy && telPedido === telMotoboy);
}
function valorPedido(p){ return Number(p?.valor ?? p?.taxa_entrega ?? p?.valor_entrega ?? p?.preco ?? 0) || 0; }
function pedidoPagoEmHistorico(pedidoId){
  return historicoPagamentos.some(h => {
    const ids = Array.isArray(h.pedidos_ids) ? h.pedidos_ids.map(String) : [];
    return ids.includes(String(pedidoId)) || String(h.pedido_id || "") === String(pedidoId);
  });
}
function corridasParaReceberMotoboy(motoboyId){
  const motoboy = motoboys.find(m => idIgual(m.id, motoboyId)) || {id: motoboyId};
  const porPedido = pedidos.filter(p =>
    motoboyDoPedido(p, motoboy) &&
    statusFinalizado(p.status) &&
    p.pago_motoboy !== true &&
    !pedidoPagoEmHistorico(p.id)
  );

  const idsJaNoPedido = new Set(porPedido.map(p => String(p.id)));
  const porHistorico = historicoEntregas.filter(h =>
    motoboyDoPedido(h, motoboy) &&
    !idsJaNoPedido.has(String(h.pedido_id || h.id)) &&
    h.pago_motoboy !== true &&
    !pedidoPagoEmHistorico(h.pedido_id || h.id)
  ).map(h => ({...h, id: h.pedido_id || h.id, status:"Entrega finalizada"}));

  return [...porPedido, ...porHistorico];
}
function corridasAtivasMotoboy(motoboyId){
  return pedidos.filter(p =>
    motoboyDoPedido(p, motoboys.find(m => idIgual(m.id, motoboyId)) || {id: motoboyId}) &&
    !p.pago_motoboy &&
    !statusFinalizado(p.status) &&
    p.status !== "Recusado pelo admin"
  );
}

function entregasFinalizadasMotoboy(motoboyId){
  const motoboy = motoboys.find(m => idIgual(m.id, motoboyId)) || sessao || {id: motoboyId};
  const porPedido = pedidos.filter(p => motoboyDoPedido(p, motoboy) && statusFinalizado(p.status));
  const ids = new Set(porPedido.map(p => String(p.id)));
  const porHistorico = historicoEntregas
    .filter(h => motoboyDoPedido(h, motoboy) && !ids.has(String(h.pedido_id || h.id)))
    .map(h => ({...h, id:h.pedido_id || h.id, status:"Entrega finalizada", data_finalizacao:h.finalizado_em || h.data_finalizacao}));
  return [...porPedido, ...porHistorico].sort((a,b) => Number(b.id || 0) - Number(a.id || 0));
}

function showOnly(id){
  ["loginArea","cadastroCliente","cadastroMotoboy","sistema"].forEach(x=>document.getElementById(x).classList.add("hide"));
  document.getElementById(id).classList.remove("hide");
}
function abrirCadastroCliente(){showOnly("cadastroCliente")}
function abrirCadastroMotoboy(){showOnly("cadastroMotoboy")}
function voltarLogin(){showOnly("loginArea")}

function normalizarTexto(v){
  return String(v || "").trim().toLowerCase();
}

function somenteNumeros(v){
  return String(v || "").replace(/\D/g, "");
}

function compararUsuario(valorDigitado, usuario){
  const digitado = normalizarTexto(valorDigitado);
  const digitadoNum = somenteNumeros(valorDigitado);

  const telefone = normalizarTexto(usuario.telefone);
  const telefoneNum = somenteNumeros(usuario.telefone);
  const nome = normalizarTexto(usuario.nome);

  return (
    digitado === telefone ||
    digitado === nome ||
    (digitadoNum && telefoneNum && digitadoNum === telefoneNum)
  );
}

function compararCodigo(valorDigitado, usuario){
  return String(valorDigitado || "").trim() === String(usuario.senha || "").trim();
}


async function carregarDados(){
  const { data: usuarios, error: errUsuarios } = await db.from("usuarios").select("*").order("id", {ascending:false});
  const { data: listaPedidos, error: errPedidos } = await db.from("pedidos").select("*").order("id", {ascending:false});

  if(errUsuarios || errPedidos){
    console.error(errUsuarios || errPedidos);
    alert("Erro ao carregar dados. Confira se as tabelas existem e se o RLS está desativado.");
    return;
  }

  clientes = (usuarios || []).filter(u => u.tipo === "cliente");
  motoboys = (usuarios || []).filter(u => u.tipo === "motoboy" && u.ativo !== false);
  pedidos = listaPedidos || [];

  // Históricos são opcionais. Se as tabelas ainda não existirem, o sistema continua funcionando
  // usando os próprios pedidos finalizados/pagos como histórico visual.
  const ent = await db.from("historico_entregas").select("*").order("id", {ascending:false});
  historicoEntregas = ent.error ? pedidos.filter(p => statusFinalizado(p.status)) : (ent.data || []);

  const pag = await db.from("historico_pagamentos").select("*").order("id", {ascending:false});
  historicoPagamentos = pag.error ? pedidos.filter(p => p.pago_motoboy) : (pag.data || []);

  if(sessao && sessao.tipo === "admin"){
    const totalAtual = pedidos.length;
    if(ultimoTotalPedidos > 0 && totalAtual > ultimoTotalPedidos){
      tocarSomNovaEntrega();
      alert("Nova entrega chegou no painel!");
    }
    ultimoTotalPedidos = totalAtual;
  }
}

async function salvarCliente(){
  let nome = cadCliNome.value.trim();
  let tel = cadCliTel.value.trim();
  let senha = cadCliSenha.value.trim();

  if(!nome || !tel || !senha){alert("Preencha todos os campos");return}

  const { data: existentes, error: erroBusca } = await db.from("usuarios").select("*").eq("tipo","cliente");
  if(erroBusca){alert("Erro ao verificar cadastro: " + erroBusca.message); return;}

  const jaExiste = (existentes || []).some(u => compararUsuario(tel, u) || normalizarTexto(u.nome) === normalizarTexto(nome));
  if(jaExiste){
    alert("Esse cliente já está cadastrado. Use o nome/telefone e código para entrar.");
    voltarLogin();
    return;
  }

  const { error } = await db.from("usuarios").insert({nome, telefone: tel, senha, tipo:"cliente"});
  if(error){alert("Erro ao cadastrar cliente: " + error.message); return;}

  alert("Cliente cadastrado");
  cadCliNome.value = ""; cadCliTel.value = ""; cadCliSenha.value = "";
  voltarLogin();
  await carregarDados();
}

async function salvarMotoboy(){
  let nome = cadMotNome.value.trim();
  let whats = cadMotWhats.value.trim();
  let pix = cadMotPix.value.trim();
  let senha = cadMotSenha.value.trim();

  if(!nome || !whats || !pix || !senha){alert("Preencha todos os campos");return}

  const { data: existentes, error: erroBusca } = await db.from("usuarios").select("*").eq("tipo","motoboy");
  if(erroBusca){alert("Erro ao verificar cadastro: " + erroBusca.message); return;}

  const jaExiste = (existentes || []).some(u => compararUsuario(whats, u) || normalizarTexto(u.nome) === normalizarTexto(nome));
  if(jaExiste){
    alert("Esse motoboy já está cadastrado. Use o nome/telefone e código para entrar.");
    voltarLogin();
    return;
  }

  const { error } = await db.from("usuarios").insert({nome, telefone: whats, senha, tipo:"motoboy", pix});
  if(error){alert("Erro ao cadastrar motoboy: " + error.message); return;}

  alert("Motoboy cadastrado");
  cadMotNome.value = ""; cadMotWhats.value = ""; cadMotPix.value = ""; cadMotSenha.value = "";
  voltarLogin();
  await carregarDados();
}

async function entrar(){
  let tipo = loginTipo.value;
  let user = loginUser.value.trim();
  let senha = loginSenha.value.trim();

  if(!user || !senha){
    alert("Preencha usuário/telefone e código de acesso.");
    return;
  }

  if(tipo==="admin" && normalizarTexto(user)==="admin" && senha==="1234"){
    sessao={tipo:"admin",nome:"Administrador",id:"admin"};
    localStorage.setItem("rota_sessao_online", JSON.stringify(sessao));
    await carregarDados();
    render();
    return;
  }

  const { data, error } = await db
    .from("usuarios")
    .select("*")
    .eq("tipo", tipo);

  if(error){
    alert("Erro ao buscar cadastro: " + error.message);
    return;
  }

  const encontrado = (data || []).find(u => compararUsuario(user, u) && compararCodigo(senha, u));

  if(!encontrado){
    alert(tipo==="cliente" ? "Cliente não encontrado. Confira se digitou o telefone/nome e código corretos." : "Motoboy não encontrado. Confira se digitou o telefone/nome e código corretos.");
    return;
  }

  sessao={
    tipo:encontrado.tipo,
    nome:encontrado.nome,
    id:encontrado.id,
    tel:encontrado.telefone,
    whats:encontrado.telefone,
    pix:encontrado.pix || ""
  };

  localStorage.setItem("rota_sessao_online", JSON.stringify(sessao));
  await carregarDados();
  render();
}

function sair(){
  sessao=null;
  localStorage.removeItem("rota_sessao_online");
  render();
}

function blocoPixPedido(p){
  const areaId = "pixArea_" + p.id;
  return `
    <div class="pixbox">
      <b>Pagamento via Pix Mercado Pago</b><br>
      <div class="pixvalue">${dinheiro(valorPedido(p))}</div>
      <p><b>Status:</b> ${p.pagamento_status || "Aguardando confirmação"}</p>
      <div id="${areaId}">
        <button class="yellow" onclick="gerarPixMercadoPago(${p.id})">Gerar QR Code Pix</button>
        <button class="gray" onclick="copiar('${PIX_ROTA}')">Copiar chave Pix manual</button>
        <p class="small">Se o QR Code não gerar, use a chave Pix manual: <b>${PIX_ROTA}</b></p>
      </div>
    </div>`;
}

async function gerarPixMercadoPago(id){
  const p = pedidos.find(x => x.id === id);
  if(!p){ alert("Pedido não encontrado."); return; }

  const area = document.getElementById("pixArea_" + id);
  if(!area){ return; }

  area.innerHTML = `<p class="loading">Gerando Pix seguro...</p>`;

  try{
    const resposta = await fetch("/api/criar-pix", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        pedidoId: p.id,
        valor: valorPedido(p),
        descricao: "Entrega Rota Express #" + p.id,
        nome: p.cliente_nome || "Cliente Rota Express",
        telefone: p.cliente_telefone || ""
      })
    });

    const data = await resposta.json();

    if(!resposta.ok || data.error){
      throw new Error(data.message || data.error || "Erro ao gerar Pix.");
    }

    await db.from("pedidos").update({mp_payment_id: String(data.id || ""), pagamento_status: data.status === "approved" ? "Pix confirmado" : "Aguardando confirmação"}).eq("id", p.id);

    area.innerHTML = `
      <img class="qrpix" src="data:image/png;base64,${data.qr_base64}" alt="QR Code Pix">
      <button class="yellow" onclick="copiarPixGerado(${p.id})">Copiar Pix Copia e Cola</button>
      <a class="btn green" href="${data.ticket_url}" target="_blank">Abrir pagamento</a>
      <button class="blue" onclick="verificarPix(${p.id})">Já paguei / verificar Pix</button>
      <div class="copybox" id="pixCode_${p.id}">${data.qr_code}</div>
      <p class="small">Quando o Pix for confirmado pelo Mercado Pago, a entrega é liberada automaticamente para os motoboys.</p>
    `;

  }catch(e){
    area.innerHTML = `
      <p class="small">Não foi possível gerar o QR Code automático.</p>
      <p class="small"><b>Motivo:</b> ${e.message}</p>
      <div class="pixvalue">${dinheiro(valorPedido(p))}</div>
      Chave Pix manual: <b>${PIX_ROTA}</b><br>
      Nome: <b>${PIX_NOME}</b>
      <button class="yellow" onclick="copiar('${PIX_ROTA}')">Copiar chave Pix manual</button>
    `;
  }
}

function copiarPixGerado(id){
  const el = document.getElementById("pixCode_" + id);
  if(!el){ alert("Código Pix não encontrado."); return; }
  copiar(el.innerText);
}

async function verificarPix(id){
  try{
    const r = await fetch(`/api/verificar-pix?pedidoId=${encodeURIComponent(id)}`);
    const data = await r.json();
    if(!r.ok || data.error) throw new Error(data.message || data.error || "Não foi possível verificar.");
    await carregarDados();
    render();
    alert(data.approved ? "Pix confirmado! A entrega foi liberada para os motoboys." : "Pagamento ainda não confirmado.");
  }catch(e){
    alert("Não foi possível verificar o Pix automaticamente: " + e.message);
  }
}

function atualizarPreviaValor(){
  const campo = document.getElementById("km");
  const valor = document.getElementById("valorPrevio");
  const calculo = document.getElementById("calculoPrevio");

  if(!campo || !valor || !calculo) return;

  const km = Number(campo.value || 0);
  valor.innerText = dinheiro(calcular(km));
  calculo.innerText = explicarCalculo(km);
}

function montarEndereco(prefixo){
  const cidade = (document.getElementById(prefixo + "_cidade")?.value || "").trim();
  const bairro = (document.getElementById(prefixo + "_bairro")?.value || "").trim();
  const rua = (document.getElementById(prefixo + "_rua")?.value || "").trim();
  return {
    cidade,
    bairro,
    rua,
    completo: [rua, bairro, cidade].filter(Boolean).join(", ")
  };
}

function enderecoPedido(p, tipo){
  const rua = p?.[tipo + "_rua"] || "";
  const bairro = p?.[tipo + "_bairro"] || "";
  const cidade = p?.[tipo + "_cidade"] || "";
  const completo = [rua, bairro, cidade].filter(Boolean).join(", ");
  return completo || p?.[tipo] || "";
}

async function calcularKmAutomatico(){
  const kmEl = document.getElementById("km");
  if(!kmEl) return;
  const coletaDados = montarEndereco("coleta");
  const entregaDados = montarEndereco("entrega");
  const coleta = coletaDados.completo;
  const entrega = entregaDados.completo;
  if(!coleta || !entrega){alert("Preencha cidade, bairro e rua da coleta e da entrega para calcular o KM automático."); return;}
  const btn = document.getElementById("btnCalcKm");
  if(btn) btn.innerText = "Calculando...";
  try{
    async function geo(q){
      const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q + ", Santa Catarina, Brasil");
      const r = await fetch(url, {headers:{"Accept":"application/json"}});
      const d = await r.json();
      if(!d || !d[0]) throw new Error("Endereço não encontrado: " + q);
      return {lat:d[0].lat, lon:d[0].lon};
    }
    const a = await geo(coleta);
    const b = await geo(entrega);
    const rota = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`);
    const rd = await rota.json();
    const metros = rd?.routes?.[0]?.distance;
    if(!metros) throw new Error("Rota não encontrada.");
    kmEl.value = (metros / 1000).toFixed(1);
    atualizarPreviaValor();
  }catch(e){
    alert("Não consegui calcular automaticamente. Digite o KM manualmente. Motivo: " + e.message);
  }finally{
    if(btn) btn.innerText = "Calcular KM automático";
  }
}

async function criarPedidoCliente(){
  let loja = document.getElementById("loja").value.trim();
  const coletaDados = montarEndereco("coleta");
  const entregaDados = montarEndereco("entrega");
  let coleta = coletaDados.completo;
  let entrega = entregaDados.completo;
  let km = document.getElementById("km").value;
  let obs = document.getElementById("obs").value.trim();
  if(!coletaDados.cidade || !coletaDados.bairro || !coletaDados.rua || !entregaDados.cidade || !entregaDados.bairro || !entregaDados.rua || !km){
    alert("Preencha cidade, bairro, rua da coleta, cidade, bairro, rua da entrega e KM.");
    return;
  }

  const novoPedido = {
    cliente_id:sessao.id,
    cliente_nome:sessao.nome,
    cliente_telefone:sessao.tel || sessao.whats || "",
    loja:loja || sessao.nome,
    coleta,
    coleta_cidade:coletaDados.cidade,
    coleta_bairro:coletaDados.bairro,
    coleta_rua:coletaDados.rua,
    entrega,
    entrega_cidade:entregaDados.cidade,
    entrega_bairro:entregaDados.bairro,
    entrega_rua:entregaDados.rua,
    km:Number(km),
    valor:calcular(km),
    obs,
    pagamento_status:"Aguardando confirmação",
    status:"Aguardando admin aprovar",
    liberado:false,
    motoboy_id:null,
    motoboy_nome:"",
    pago_motoboy:false,
    mp_payment_id:null,
    data_finalizacao:null
  };

  const { error } = await db.from("pedidos").insert(novoPedido);
  if(error){alert("Erro ao criar pedido: " + error.message); return;}

  await carregarDados();
  render();
  alert("Pedido criado. Pague o valor mostrado no Pix e aguarde o admin confirmar.");
}

async function confirmarPix(id){
  const { error } = await db.from("pedidos").update({pagamento_status:"Pix confirmado", liberado:true, status:"Liberado para motoboys"}).eq("id", id);
  if(error){alert("Erro: " + error.message); return;}
  await carregarDados(); render();
}

async function liberarPedido(id){
  const p = pedidos.find(x=>x.id===id);
  if(p && p.pagamento_status !== "Pix confirmado"){alert("Confirme o Pix antes de liberar."); return;}

  const { error } = await db.from("pedidos").update({liberado:true,status:"Liberado para motoboys"}).eq("id", id);
  if(error){alert("Erro: " + error.message); return;}
  await carregarDados(); render();
}

async function recusarPedido(id){
  const { error } = await db.from("pedidos").update({status:"Recusado pelo admin", liberado:false}).eq("id", id);
  if(error){alert("Erro: " + error.message); return;}
  await carregarDados(); render();
}

async function aceitarPedido(id){
  const { error } = await db.from("pedidos").update({
    status:"Aceito pelo motoboy",
    motoboy_id:sessao.id,
    motoboy_nome:sessao.nome,
    liberado:false
  }).eq("id", id);
  if(error){alert("Erro: " + error.message); return;}
  await carregarDados(); render();
}

async function mudarStatus(id,status){
  const extra = {};
  if(status === "Entrega finalizada"){
    extra.data_finalizacao = agoraBR();
    extra.liberado = false;
  }
  const { error } = await db.from("pedidos").update({status, ...extra}).eq("id", id);
  if(error){alert("Erro: " + error.message); return;}

  if(status === "Entrega finalizada"){
    const p = pedidos.find(x => x.id === id);
    const jaExisteHistorico = historicoEntregas.some(h => String(h.pedido_id || "") === String(id));
    if(p && !jaExisteHistorico){
      await db.from("historico_entregas").insert({
        pedido_id:id, cliente_nome:p.cliente_nome || "", motoboy_id:p.motoboy_id || sessao.id,
        motoboy_nome:p.motoboy_nome || sessao.nome || "",
        coleta:enderecoPedido(p,"coleta"), coleta_cidade:p.coleta_cidade || "", coleta_bairro:p.coleta_bairro || "", coleta_rua:p.coleta_rua || "",
        entrega:enderecoPedido(p,"entrega"), entrega_cidade:p.entrega_cidade || "", entrega_bairro:p.entrega_bairro || "", entrega_rua:p.entrega_rua || "",
        valor:valorPedido(p), km:Number(p.km || 0), finalizado_em:agoraBR()
      });
    }
  }

  await carregarDados(); render();
}

async function excluirPedido(id){
  if(!confirm("Excluir esse pedido?")) return;
  const { error } = await db.from("pedidos").delete().eq("id", id);
  if(error){alert("Erro: " + error.message); return;}
  await carregarDados(); render();
}

async function pagarMotoboy(id){
  const m = motoboys.find(x=>idIgual(x.id,id));
  const corridas = corridasParaReceberMotoboy(id);
  if(corridas.length===0){alert("Esse motoboy não tem valor em aberto.");return}

  const bruto = corridas.reduce((t,p)=>t+valorPedido(p),0);
  const liquido = bruto*(100-TAXA_ROTA)/100;
  if(!confirm("Confirmar pagamento para " + m.nome + " no valor de " + dinheiro(liquido) + "?")) return;

  const ids = corridas.map(p=>p.id).filter(Boolean);
  const pagoEm = agoraBR();
  if(ids.length){
    const { error } = await db.from("pedidos").update({
      pago_motoboy:true,
      data_pagamento: pagoEm
    }).in("id", ids);
    if(error){alert("Erro: " + error.message); return;}

    // Se a entrega estiver só no histórico, também marca como paga ali.
    await db.from("historico_entregas").update({
      pago_motoboy:true,
      data_pagamento:pagoEm
    }).in("pedido_id", ids);
  }

  await db.from("historico_pagamentos").insert({
    motoboy_id:id, motoboy_nome:m.nome, valor_pago:Number(liquido.toFixed(2)),
    valor_bruto:Number(bruto.toFixed(2)), taxa_rota:TAXA_ROTA, pedidos_ids:ids, pago_em:pagoEm
  });

  await carregarDados();
  render();
  alert("Pagamento salvo no histórico e saldo do motoboy zerado.");
}

async function deletarMotoboy(id){
  const m = motoboys.find(x => idIgual(x.id,id));
  if(!m) return;
  const temCorridaAtiva = pedidos.some(p => idIgual(p.motoboy_id,id) && !statusFinalizado(p.status) && !p.pago_motoboy);
  if(temCorridaAtiva){alert("Esse motoboy tem corrida ativa. Finalize ou remova a corrida antes de deletar."); return;}
  if(!confirm("Deletar motoboy " + m.nome + "?")) return;
  const soft = await db.from("usuarios").update({ativo:false}).eq("id", id);
  if(soft.error){
    const hard = await db.from("usuarios").delete().eq("id", id);
    if(hard.error){alert("Erro ao deletar motoboy: " + hard.error.message); return;}
  }
  await carregarDados(); render();
}

function copiar(texto){
  if(navigator.clipboard){navigator.clipboard.writeText(texto);}
  alert("Chave Pix copiada!");
}

function clienteHTML(){
  let meusTodos = pedidos.filter(p=>String(p.cliente_id)===String(sessao.id));
  let meusAtivos = meusTodos.filter(p=>!statusFinalizado(p.status));
  let minhasFinalizadas = meusTodos.filter(p=>statusFinalizado(p.status));

  const conteudoCliente = abaCliente === "finalizadas" ? `
    <h2>Entregas finalizadas</h2>
    ${minhasFinalizadas.map(cardPedidoClienteFinalizado).join("") || "<p>Nenhuma entrega finalizada.</p>"}
  ` : `
    <div class="card">
      <h2>Solicitar entrega</h2>
      <input id="loja" placeholder="Nome da loja">
      <h3>📍 Endereço de coleta</h3>
      <input id="coleta_cidade" placeholder="Cidade da coleta">
      <input id="coleta_bairro" placeholder="Bairro da coleta">
      <input id="coleta_rua" placeholder="Rua / número da coleta">
      <h3>🏁 Endereço de entrega</h3>
      <input id="entrega_cidade" placeholder="Cidade da entrega">
      <input id="entrega_bairro" placeholder="Bairro da entrega">
      <input id="entrega_rua" placeholder="Rua / número da entrega">
      <button id="btnCalcKm" class="blue" onclick="calcularKmAutomatico()">Calcular KM automático</button>
      <input id="km" type="number" step="0.1" placeholder="Distância em KM" oninput="atualizarPreviaValor()">
      <div class="pixbox">
        <b>Prévia do valor</b>
        <div class="pixvalue" id="valorPrevio">R$ 0,00</div>
        <p class="small" id="calculoPrevio">Informe a distância para calcular.</p>
      </div>
      <textarea id="obs" placeholder="Observação"></textarea>
      <button class="main" onclick="criarPedidoCliente()">Gerar entrega com valor Pix</button>
    </div>
    <h2>Meus pedidos</h2>
    ${meusAtivos.map(cardPedidoCliente).join("") || "<p>Nenhum pedido em aberto.</p>"}
  `;

  return `
    <div class="card">
      <h2>Olá, ${sessao.nome}</h2>
      <p>Pagamento aceito: <b>somente Pix</b></p>
      <div class="pixbox">Chave Pix Rota Express: <b>${PIX_ROTA}</b><br>Nome: <b>${PIX_NOME}</b></div>
      <button class="gray" onclick="carregarDados().then(render)">Atualizar meus pedidos</button>
      <div class="tabs">
        <button class="${abaCliente==='ativas'?'yellow':'gray'}" onclick="setAbaCliente('ativas')">Meus pedidos</button>
        <button class="${abaCliente==='finalizadas'?'yellow':'gray'}" onclick="setAbaCliente('finalizadas')">Entregas finalizadas</button>
      </div>
    </div>
    ${conteudoCliente}
  `;
}

function adminHTML(){
  let total = pedidos.reduce((t,p)=>t+valorPedido(p),0);
  let corridasAbertas = motoboys.flatMap(m => corridasParaReceberMotoboy(m.id));
  let rota = corridasAbertas.reduce((t,p)=>t+(valorPedido(p)*TAXA_ROTA/100),0);
  let aPagar = corridasAbertas.reduce((t,p)=>t+(valorPedido(p)*(100-TAXA_ROTA)/100),0);
  const pedidosAbertos = pedidosAbertosAdmin();
  const historicoAdmin = historicoEntregasAdmin();
  const conteudo = abaAdmin === "pedidos" ? `
    <h2>Pedidos para aprovar</h2>${pedidosAbertos.map(cardPedidoAdmin).join("") || "<p>Nenhum pedido em aberto.</p>"}` :
    abaAdmin === "entregas" ? `
    <h2>Histórico de entregas</h2>${historicoAdmin.map(cardHistoricoEntrega).join("") || "<p>Nenhuma entrega finalizada.</p>"}` :
    abaAdmin === "pagamentos" ? `
    <h2>Histórico de pagamentos</h2>${historicoPagamentos.map(cardHistoricoPagamento).join("") || "<p>Nenhum pagamento registrado.</p>"}` : `
    <h2>Motoboys cadastrados</h2>${motoboys.map(cardMotoboyAdmin).join("") || "<p>Nenhum motoboy.</p>"}`;
  return `
    <div class="stats">
      <div class="stat"><span>Total bruto</span><b>${dinheiro(total)}</b></div>
      <div class="stat"><span>Sua parte ${TAXA_ROTA}%</span><b>${dinheiro(rota)}</b></div>
      <div class="stat"><span>Pagar motoboys</span><b>${dinheiro(aPagar)}</b></div>
      <div class="stat"><span>Fechamento</span><b>00:00</b></div>
    </div>
    <div class="card">
      <h2>Configuração Pix</h2>
      <p><b>Chave:</b> ${PIX_ROTA}</p>
      <p><b>Nome:</b> ${PIX_NOME}</p>
      <button class="yellow" onclick="liberarSom(); alert('Som ativado! Quando chegar entrega nova, vai tocar aviso.')">Ativar som de nova entrega</button>
      <button class="gray" onclick="carregarDados().then(render)">Atualizar dados</button>
      <div class="tabs">
        <button class="${abaAdmin==='pedidos'?'yellow':'gray'}" onclick="setAbaAdmin('pedidos')">Pedidos</button>
        <button class="${abaAdmin==='entregas'?'yellow':'gray'}" onclick="setAbaAdmin('entregas')">Hist. entregas</button>
        <button class="${abaAdmin==='pagamentos'?'yellow':'gray'}" onclick="setAbaAdmin('pagamentos')">Hist. pagamentos</button>
        <button class="${abaAdmin==='motoboys'?'yellow':'gray'}" onclick="setAbaAdmin('motoboys')">Motoboys</button>
      </div>
    </div>
    ${conteudo}
  `;
}

function pedidosAbertosAdmin(){
  return pedidos.filter(p => !statusFinalizado(p.status));
}

function historicoEntregasAdmin(){
  const finalizadosPedidos = pedidos.filter(p => statusFinalizado(p.status));
  const ids = new Set(finalizadosPedidos.map(p => String(p.id)));
  const somenteHistorico = historicoEntregas
    .filter(h => !ids.has(String(h.pedido_id || h.id)))
    .map(h => ({...h, status:"Entrega finalizada"}));
  return [...finalizadosPedidos, ...somenteHistorico].sort((a,b) => Number((b.pedido_id || b.id) || 0) - Number((a.pedido_id || a.id) || 0));
}

function motoboyHTML(){
  let liberados = pedidos.filter(p=>p.liberado && p.pagamento_status==="Pix confirmado" && !p.motoboy_id && !statusFinalizado(p.status));
  let meus = pedidos.filter(p=>motoboyDoPedido(p, sessao) && !statusFinalizado(p.status) && !p.pago_motoboy);
  let finalizadas = entregasFinalizadasMotoboy(sessao.id);
  let finalizadasNaoPagas = corridasParaReceberMotoboy(sessao.id);
  let bruto = finalizadasNaoPagas.reduce((t,p)=>t+valorPedido(p),0);
  let taxa = bruto*TAXA_ROTA/100;
  let liquido = bruto-taxa;

  const conteudoMotoboy = abaMotoboy === "finalizadas" ? `
    <h2>Entregas finalizadas</h2>
    ${finalizadas.map(cardPedidoMotoboyFinalizado).join("") || "<p>Nenhuma entrega finalizada.</p>"}
  ` : `
    <h2>Corridas liberadas</h2>
    ${liberados.map(cardPedidoMotoboy).join("") || "<p>Nenhuma corrida liberada.</p>"}
    <h2>Minhas corridas</h2>
    ${meus.map(cardPedidoMotoboy).join("") || "<p>Nenhuma corrida sua.</p>"}
  `;

  return `
    <div class="card">
      <h2>Perfil do motoboy</h2>
      <p><b>Nome:</b> ${sessao.nome}</p>
      <p><b>WhatsApp:</b> ${sessao.whats}</p>
      <p><b>Pix:</b> ${sessao.pix || "Não informado"}</p>
      <p><b>Pagamento:</b> todo dia às 00:00</p>
      <button class="gray" onclick="carregarDados().then(render)">Atualizar corridas</button>
      <div class="tabs">
        <button class="${abaMotoboy==='ativas'?'yellow':'gray'}" onclick="setAbaMotoboy('ativas')">Corridas</button>
        <button class="${abaMotoboy==='finalizadas'?'yellow':'gray'}" onclick="setAbaMotoboy('finalizadas')">Entregas finalizadas</button>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><span>Finalizadas a receber</span><b>${finalizadasNaoPagas.length}</b></div>
      <div class="stat"><span>Faturado</span><b>${dinheiro(bruto)}</b></div>
      <div class="stat"><span>Taxa Rota ${TAXA_ROTA}%</span><b>${dinheiro(taxa)}</b></div>
      <div class="stat"><span>Você recebe</span><b>${dinheiro(liquido)}</b></div>
    </div>
    ${conteudoMotoboy}
  `;
}

function baseCard(p){
  return `
    <p><b>Cliente:</b> ${p.cliente_nome || ""}</p>
    <p><b>Loja:</b> ${p.loja || ""}</p>
    <p><b>Coleta:</b> ${enderecoPedido(p,"coleta")}</p>
    <p><b>Entrega:</b> ${enderecoPedido(p,"entrega")}</p>
    <p><b>KM:</b> ${p.km || ""}</p>\n    <p><b>Cálculo:</b> ${explicarCalculo(p.km)}</p>
    ${p.obs?`<p><b>Obs:</b> ${p.obs}</p>`:""}
    <span class="tempo">⏱️ ${textoTempoEntrega(p)}</span>
    <p><b>Pagamento:</b> Pix — ${p.pagamento_status || ""}</p>
    ${p.pago_motoboy ? `<p><b>Motoboy:</b> Pago em ${p.data_pagamento || ""}</p>` : ""}
    <h3>${dinheiro(valorPedido(p))}</h3>
  `;
}

function cardPedidoCliente(p){
  const entregue = statusFinalizado(p.status) ? `<div class="notice">✅ Entrega entregue/finalizada pelo motoboy.</div>` : "";
  return `<div class="order"><b>#${p.id}</b> <span class="badge">${p.status}</span>${entregue}${baseCard(p)}${blocoPixPedido(p)}</div>`;
}

function cardPedidoClienteFinalizado(p){
  return `<div class="order">
    <b>#${p.id}</b> <span class="badge">Entrega finalizada</span>
    <div class="notice">✅ Sua entrega foi entregue/finalizada pelo motoboy.</div>
    ${baseCard({...p, status:"Entrega finalizada"})}
    <p><b>Finalizado em:</b> ${p.finalizado_em || p.data_finalizacao || ""}</p>
  </div>`;
}

function cardPedidoAdmin(p){
  return `<div class="order">
    <b>#${p.id}</b> <span class="badge">${p.status}</span>
    ${baseCard(p)}
    ${blocoPixPedido(p)}
    <p><b>Motoboy:</b> ${p.motoboy_nome || "Nenhum"}</p>
    <div class="row">
      <button class="yellow" onclick="confirmarPix(${p.id})">Confirmar Pix</button>
      <button class="green" onclick="liberarPedido(${p.id})">Liberar</button>
      <button class="blue" onclick="mudarStatus(${p.id},'Entrega finalizada')">Finalizar</button>
      <button class="red" onclick="recusarPedido(${p.id})">Recusar</button>
    </div>
    <button class="red" onclick="excluirPedido(${p.id})">Excluir pedido</button>
  </div>`;
}

function cardPedidoMotoboy(p){
  return `<div class="order">
    <b>#${p.id}</b> <span class="badge">${p.status}</span>
    ${baseCard(p)}
    <a class="btn gray" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoPedido(p,"entrega"))}">Abrir rota no Maps</a>
    ${!p.motoboy_id?`<button class="yellow" onclick="aceitarPedido(${p.id})">Aceitar corrida</button>`:""}
    ${idIgual(p.motoboy_id,sessao.id)?`
      <button class="blue" onclick="mudarStatus(${p.id},'Pedido coletado')">Pedido coletado</button>
      <button class="green" onclick="mudarStatus(${p.id},'Entrega finalizada')">Finalizar entrega</button>`:""}
  </div>`;
}

function cardHistoricoEntrega(h){
  return `<div class="order">
    <b>Entrega #${h.pedido_id || h.id || ""}</b> <span class="badge">Finalizada</span>
    <p><b>Cliente:</b> ${h.cliente_nome || ""}</p>
    <p><b>Motoboy:</b> ${h.motoboy_nome || ""}</p>
    <p><b>Coleta:</b> ${enderecoPedido(h,"coleta")}</p>
    <p><b>Entrega:</b> ${enderecoPedido(h,"entrega")}</p>
    <p><b>KM:</b> ${h.km || ""}</p>
    <p><b>Finalizado em:</b> ${h.finalizado_em || h.data_finalizacao || ""}</p>
    <h3>${dinheiro(valorPedido(h))}</h3>
  </div>`;
}

function cardPedidoMotoboyFinalizado(p){
  return `<div class="order">
    <b>#${p.pedido_id || p.id || ""}</b> <span class="badge">Entrega finalizada</span>
    ${baseCard({...p, status:"Entrega finalizada"})}
    <p><b>Finalizado em:</b> ${p.finalizado_em || p.data_finalizacao || ""}</p>
    ${p.pago_motoboy ? `<div class="notice">✅ Essa entrega já foi paga.</div>` : `<div class="warn">💰 Aguardando pagamento do admin.</div>`}
    <a class="btn gray" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoPedido(p,"entrega"))}">Abrir rota no Maps</a>
  </div>`;
}

function cardHistoricoPagamento(h){
  return `<div class="order">
    <b>${h.motoboy_nome || "Motoboy"}</b> <span class="badge">Pago</span>
    <p><b>Valor pago:</b> ${dinheiro(h.valor_pago || h.valor || 0)}</p>
    <p><b>Bruto:</b> ${dinheiro(h.valor_bruto || 0)}</p>
    <p><b>Taxa Rota:</b> ${h.taxa_rota || TAXA_ROTA}%</p>
    <p><b>Data/hora:</b> ${h.pago_em || h.data_pagamento || ""}</p>
    <p><b>Pedidos:</b> ${Array.isArray(h.pedidos_ids) ? h.pedidos_ids.join(", ") : (h.pedido_id || "")}</p>
  </div>`;
}

function cardMotoboyAdmin(m){
  let abertos = corridasParaReceberMotoboy(m.id);
  let pagos = pedidos.filter(p=>idIgual(p.motoboy_id,m.id) && p.pago_motoboy);
  let bruto = abertos.reduce((t,p)=>t+valorPedido(p),0);
  let liquido = bruto*(100-TAXA_ROTA)/100;
  return `<div class="order">
    <b>${m.nome}</b>
    <p><b>WhatsApp:</b> ${m.telefone}</p>
    <p><b>Pix:</b> ${m.pix || "Não informado"}</p>
    <p><b>Entregas em aberto:</b> ${abertos.length}</p>
    <p><b>Bruto em aberto:</b> ${dinheiro(bruto)}</p>
    <p><b>Desconto Rota ${TAXA_ROTA}%:</b> ${dinheiro(bruto*TAXA_ROTA/100)}</p>
    <h3>Recebe agora: ${dinheiro(liquido)}</h3>
    <button class="yellow" onclick="copiar('${m.pix || ""}')">Copiar Pix do motoboy</button>
    <button class="green" onclick="pagarMotoboy(${m.id})">Marcar como pago e zerar saldo</button>
    <button class="red" onclick="deletarMotoboy(${m.id})">Deletar/desativar motoboy</button>
    <p class="small"><b>Histórico pago:</b> ${pagos.length} entregas já pagas.</p>
  </div>`;
}

async function render(){
  if(!sessao){showOnly("loginArea");return}
  showOnly("sistema");
  ["clienteArea","adminArea","motoboyArea"].forEach(x=>document.getElementById(x).classList.add("hide"));
  if(sessao.tipo==="cliente"){clienteArea.classList.remove("hide"); clienteArea.innerHTML=clienteHTML()}
  if(sessao.tipo==="admin"){adminArea.classList.remove("hide"); adminArea.innerHTML=adminHTML()}
  if(sessao.tipo==="motoboy"){motoboyArea.classList.remove("hide"); motoboyArea.innerHTML=motoboyHTML()}
}

async function iniciar(){
  if(sessao){
    await carregarDados();
  }
  render();

  if(intervaloAtualizacao){
    clearInterval(intervaloAtualizacao);
  }

  intervaloAtualizacao = setInterval(async () => {
    if(!sessao) return;

    // Evita apagar o que o cliente está digitando nos campos.
    const ativo = document.activeElement;
    const digitando = ativo && ["INPUT","TEXTAREA","SELECT"].includes(ativo.tagName);

    await carregarDados();

    // Admin e motoboy precisam atualizar automaticamente.
    // Cliente só atualiza se não estiver digitando.
    if(sessao.tipo === "admin" || sessao.tipo === "motoboy" || !digitando){
      render();
    }
  }, 15000);
}

iniciar();
