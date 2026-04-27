const fs=require('fs'), vm=require('vm');
const code=fs.readFileSync('/mnt/data/rota_debug/inline.js','utf8');
const ctx={console, window:{supabase:{createClient:()=>({})}}, localStorage:{getItem:(k)=>null,setItem:()=>{},removeItem:()=>{}}, setInterval:()=>{}, clearInterval:()=>{}, alert:console.log, document:{getElementById:()=>({classList:{add(){},remove(){}},innerHTML:''}), activeElement:null}};
vm.createContext(ctx); vm.runInContext(code, ctx);
vm.runInContext(`sessao={id:1,nome:'Lucas',tipo:'motoboy',telefone:'48999117385',whats:'48999117385',pix:'489'};
motoboys=[{id:1,nome:'Lucas',tipo:'motoboy',telefone:'48999117385',whats:'48999117385',pix:'489'}];
pedidos=[{id:9,cliente_nome:'big',loja:'Big Burger',status:'Entrega finalizada',motoboy_id:1,motoboy_nome:'Lucas',km:1.2,pagamento:'Pix',pagamento_status:'Pix confirmado',valor:8}];
historicoEntregas=[]; historicoPagamentos=[];`, ctx);
console.log(vm.runInContext('motoboyHTML()', ctx));
