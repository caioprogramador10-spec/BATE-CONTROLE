// ==========================================
// CONFIGURAÇÕES DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ovrkpnusgulvkjtnhcsr.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cmtwbnVzZ3VsdmtqdG5oY3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODI2NTEsImV4cCI6MjA4NjE1ODY1MX0.EF4opjkiJfSi4Nr3M4DDTvhZnM8itILurG_OTLw_q-I'; 

// Inicialização única para evitar erro de duplicidade
const supabaseInstance = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// CONFIGURAÇÕES DE VENDA (SaaS)
// ==========================================
const DIAS_TRIAL = 15; 
const VALOR_MENSALIDADE = 69.90; 
const MEU_PIX = "(21) 98507-2328"; 
const WHATSAPP_DONO = "5521985072328"; 

// ==========================================
// 1. SISTEMA DE LOGIN E ASSINATURA
// ==========================================
let usuarioLogado = JSON.parse(localStorage.getItem('bateControleSessao')) || null;
let modoCadastro = false;

async function atualizarVisualizacao() {
    const loginContainer = document.getElementById('login-container');
    const appContent = document.getElementById('app-content');
    const bloqueioAssinatura = document.getElementById('bloqueio-assinatura');

    if (usuarioLogado) {
        if (usuarioLogado.status === "admin") {
            loginContainer.style.display = 'none';
            appContent.style.display = 'block';
            bloqueioAssinatura.style.display = 'none';
            await atualizarTabela();
            return;
        }

        if (!verificarAssinatura()) {
            loginContainer.style.display = 'none';
            appContent.style.display = 'none';
            
            bloqueioAssinatura.innerHTML = `
                <div style="background:#1a1a1a; padding:30px; border-radius:20px; border:2px solid #e74c3c; text-align:center; max-width:400px; margin: 20px auto;">
                    <h2 style="color:#e74c3c">Acesso Expirado! 🤡</h2>
                    <p style="color:#ddd">O período de ${DIAS_TRIAL} dias de teste da turma <strong>${usuarioLogado.user.toUpperCase()}</strong> chegou ao fim.</p>
                    <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
                    <p style="font-size:1.1rem">Valor da Assinatura: <br><strong style="font-size:1.5rem; color:#27ae60">R$ ${VALOR_MENSALIDADE.toFixed(2)}</strong></p>
                    <p style="background:#000; padding:10px; border-radius:8px; margin:15px 0; border:1px dashed #555;">
                        Chave PIX: <br><strong>${MEU_PIX}</strong>
                    </p>
                    <button onclick="avisarPagamento()" style="background:#25d366; color:white; padding:15px; border:none; border-radius:12px; cursor:pointer; font-weight:bold; width:100%; font-size:1rem; transition:0.3s;">
                        ✅ JÁ FIZ O PIX! LIBERAR ACESSO
                    </button>
                    <button onclick="fazerLogout()" style="background:transparent; color:#888; border:none; margin-top:20px; cursor:pointer; text-decoration:underline;">Sair da conta</button>
                </div>
            `;
            bloqueioAssinatura.style.display = 'block'; 
            return;
        }
        
        loginContainer.style.display = 'none';
        appContent.style.display = 'block';
        bloqueioAssinatura.style.display = 'none';
        await atualizarTabela();
    } else {
        loginContainer.style.display = 'flex';
        appContent.style.display = 'none';
        bloqueioAssinatura.style.display = 'none';
    }
}

function avisarPagamento() {
    const msg = `Fala Caio! Sou o responsável pela turma *${usuarioLogado.user.toUpperCase()}* e acabei de fazer o PIX da mensalidade do Bate-Controle. 🤡%0A%0APode liberar meu acesso?`;
    window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_DONO}&text=${msg}`);
}

function verificarAssinatura() {
    if (usuarioLogado.status === "admin" || usuarioLogado.status === "pago") return true; 
    const hoje = new Date();
    const dataCadastro = new Date(usuarioLogado.dataCriacao);
    const diferencaTempo = hoje - dataCadastro;
    const diasUso = Math.floor(diferencaTempo / (1000 * 60 * 60 * 24));
    return !(usuarioLogado.status === "gratis" && diasUso > DIAS_TRIAL);
}

async function executarAcaoPrincipal() {
    const user = document.getElementById('usuario').value.trim().toLowerCase();
    const pass = document.getElementById('senha').value.trim();
    if (!user || !pass) return alert("Preencha tudo!");

    if (user === "caio" && pass === "caio1010") {
        usuarioLogado = { user: "caio", status: "admin" };
        localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));
        acessarPainelDono();
        return;
    }

    let { data: usuarios, error } = await supabaseInstance.from('bateControleUsers').select('*');
    if (error) usuarios = JSON.parse(localStorage.getItem('bateControleUsers')) || [];

    if (modoCadastro) {
        if (usuarios.find(u => u.user === user)) return alert("Essa turma já existe!");
        const novo = { user: user, pass: pass, dataCriacao: new Date().toISOString(), status: "gratis" };
        await supabaseInstance.from('bateControleUsers').insert([novo]);
        alert(`Turma cadastrada! ${DIAS_TRIAL} dias grátis liberados.`);
        alternarTelaLogin();
    } else {
        const valid = usuarios.find(u => u.user === user && u.pass === pass);
        if (valid) {
            usuarioLogado = valid;
            localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));
            atualizarVisualizacao();
        } else {
            alert("Usuário ou senha incorretos!");
        }
    }
}

function acessarPainelDono() {
    document.getElementById('painel-dono').style.display = 'block';
    renderizarUsuariosAdmin();
}

function fecharPainelDono() {
    document.getElementById('painel-dono').style.display = 'none';
    atualizarVisualizacao();
}

async function renderizarUsuariosAdmin() {
    let { data: usuarios } = await supabaseInstance.from('bateControleUsers').select('*');
    if(!usuarios) usuarios = [];
    
    const lista = document.getElementById('lista-usuarios-admin');
    const termoBusca = document.getElementById('busca-admin').value.toLowerCase();
    const displayTotal = document.getElementById('admin-total-turmas');
    const displayLucro = document.getElementById('admin-lucro-total');
    
    let lucroAcumulado = 0;
    lista.innerHTML = "";

    usuarios.forEach(u => { if (u.status === 'pago') lucroAcumulado += VALOR_MENSALIDADE; });
    if(displayTotal) displayTotal.innerText = usuarios.length;
    if(displayLucro) displayLucro.innerText = `R$ ${lucroAcumulado.toFixed(2)}`;

    const filtrados = usuarios.filter(u => u.user.toLowerCase().includes(termoBusca));
    if (filtrados.length === 0) {
        lista.innerHTML = "<p style='color:#888; text-align:center;'>Nenhuma turma encontrada.</p>";
        return;
    }

    filtrados.forEach((u) => {
        const data = new Date(u.dataCriacao).toLocaleDateString('pt-BR');
        const corStatus = u.status === 'pago' ? '#27ae60' : '#e67e22';
        lista.innerHTML += `
            <div style="background:#222; padding:15px; margin-bottom:12px; border-radius:12px; border-left: 6px solid ${corStatus}">
                <p style="margin:0; font-size:1rem;"><strong>Turma:</strong> ${u.user.toUpperCase()}</p>
                <p style="margin:5px 0; font-size:0.75rem; color:#aaa;">Desde: ${data} | Status: ${u.status.toUpperCase()}</p>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button onclick="liberarAcesso('${u.user}')" style="background:#27ae60; color:white; padding:10px; border:none; border-radius:8px; cursor:pointer; flex:3; font-weight:bold;">Confirmar Pago</button>
                    <button onclick="deletarUsuarioAdmin('${u.user}')" style="background:#444; color:white; padding:10px; border:none; border-radius:8px; cursor:pointer; flex:1;">❌</button>
                </div>
            </div>`;
    });
}

async function liberarAcesso(nomeUsuario) {
    const { error } = await supabaseInstance.from('bateControleUsers').update({ status: 'pago' }).eq('user', nomeUsuario).select();
    if (!error) {
        alert("ACESSO LIBERADO!");
        renderizarUsuariosAdmin();
    } else { alert("Erro ao liberar: " + error.message); }
}

async function deletarUsuarioAdmin(nomeUsuario) {
    if(confirm(`Apagar turma ${nomeUsuario}?`)) {
        const { error } = await supabaseInstance.from('bateControleUsers').delete().eq('user', nomeUsuario);
        if(!error) renderizarUsuariosAdmin();
    }
}

function alternarTelaLogin() {
    modoCadastro = !modoCadastro;
    const titulo = document.getElementById('login-titulo'), btnPrincipal = document.getElementById('btn-login-entrar'), linkAlternar = document.getElementById('link-alternar'), textoAlternar = document.getElementById('texto-alternar');
    if (modoCadastro) {
        titulo.innerText = "NOVA TURMA 🎭"; btnPrincipal.innerText = "Criar Minha Turma"; textoAlternar.innerText = "Já tem conta?"; linkAlternar.innerText = "Fazer Login";
    } else {
        titulo.innerText = "BATE-LOGIN 🤡"; btnPrincipal.innerText = "Entrar no Painel"; textoAlternar.innerText = "Não tem conta?"; linkAlternar.innerText = "Cadastrar Turma";
    }
}

function fazerLogout() {
    localStorage.removeItem('bateControleSessao');
    window.location.reload();
}

// ==========================================
// 2. LÓGICA DO APP (FINANCEIRO COM SUPABASE)
// ==========================================
let componentes = [], custosExtras = [], filtroAtual = 'todos';

async function carregarDadosUsuario() {
    if(!usuarioLogado) return;
    let { data: compCloud } = await supabaseInstance.from('componentes').select('*').eq('turma_id', usuarioLogado.user);
    let { data: extraCloud } = await supabaseInstance.from('extras').select('*').eq('turma_id', usuarioLogado.user);
    componentes = compCloud || [];
    custosExtras = extraCloud || [];
}

async function salvarComponenteNuvem(c) {
    if(!usuarioLogado) return;
    await supabaseInstance.from('componentes').upsert({
        id: c.id || undefined, turma_id: usuarioLogado.user, nome: c.nome, valor_total: c.valorTotal, valor_pago: c.valorPago, telefone: c.telefone, vencimento: c.vencimento
    });
}

async function adicionarCustoExtra() {
    const desc = document.getElementById('descExtra').value, valor = parseFloat(document.getElementById('valorExtra').value);
    if (desc && !isNaN(valor)) {
        const novoExtra = { turma_id: usuarioLogado.user, descricao: desc, valor: valor };
        await supabaseInstance.from('extras').insert([novoExtra]);
        document.getElementById('descExtra').value = ''; document.getElementById('valorExtra').value = '';
        await atualizarTabela();
    }
}

async function adicionarComponente() {
    const nome = document.getElementById('nome').value, valor = parseFloat(document.getElementById('valorTotal').value), tel = document.getElementById('telefone').value.replace(/\D/g, ''), data = document.getElementById('dataVencimento').value;
    if (nome && !isNaN(valor) && tel && data) {
        const novo = { nome, valorTotal: valor, valorPago: 0, telefone: tel, vencimento: data };
        componentes.push(novo);
        await salvarComponenteNuvem(novo);
        await atualizarTabela();
        document.getElementById('nome').value = ''; document.getElementById('valorTotal').value = ''; document.getElementById('telefone').value = '';
        alert("Salvo na nuvem!");
    }
}

function atualizarResumo() {
    let pago = 0, metaFanta = 0, totalExtras = custosExtras.reduce((sum, e) => sum + e.valor, 0);
    componentes.forEach(c => { 
        metaFanta += (c.valorTotal || c.valor_total || 0); 
        pago += (c.valorPago || c.valor_pago || 0); 
    });
    const rateio = componentes.length > 0 ? (totalExtras / componentes.length) : 0;
    document.getElementById('total-componentes').innerText = componentes.length;
    document.getElementById('meta-total').innerText = `R$ ${(metaFanta + totalExtras).toFixed(2)}`;
    document.getElementById('total-pago').innerText = `R$ ${pago.toFixed(2)}`;
    document.getElementById('total-devedor').innerText = `R$ ${(metaFanta + totalExtras - pago).toFixed(2)}`;
    document.getElementById('valorExtraPorPessoa').innerText = `R$ ${rateio.toFixed(2)}`;
    document.getElementById('listaExtras').innerHTML = custosExtras.map(e => `<li>✅ ${e.descricao}: R$ ${e.valor.toFixed(2)}</li>`).join('');
    return rateio;
}

async function atualizarTabela() {
    await carregarDadosUsuario();
    const rateio = atualizarResumo(), corpo = document.getElementById('corpoTabela'), busca = document.getElementById('buscaNome') ? document.getElementById('buscaNome').value.toLowerCase() : "";
    corpo.innerHTML = '';
    componentes.forEach(c => {
        const cNome = c.nome, cTotal = (c.valorTotal || c.valor_total || 0), cPago = (c.valorPago || c.valor_pago || 0), cVenc = c.vencimento, cID = c.id;
        if (busca && !cNome.toLowerCase().includes(busca)) return;
        const totalComRateio = cTotal + rateio, saldo = totalComRateio - cPago;
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const venc = new Date(cVenc + 'T00:00:00');
        let statusCls = (saldo > 0 && venc < hoje) ? "bg-atrasado" : "bg-ok";
        if (filtroAtual === 'atrasado' && statusCls !== "bg-atrasado") return;
        if (filtroAtual === 'em-dia' && statusCls === "bg-atrasado") return;
        corpo.innerHTML += `
            <tr class="${statusCls}">
                <td><strong>${cNome}</strong><br><span class="valor-extra-badge">F: R$ ${cTotal.toFixed(2)} | E: R$ ${rateio.toFixed(2)}</span></td>
                <td>R$ ${totalComRateio.toFixed(2)}</td>
                <td style="color:#27ae60">R$ ${cPago.toFixed(2)}</td>
                <td style="color:${saldo > 0 ? '#e74c3c':'#27ae60'}">R$ ${saldo.toFixed(2)}</td>
                <td>${cVenc.split('-').reverse().join('/')}</td>
                <td><div style="display:flex; gap:2px">
                    <button class="btn-acao-grande btn-pgto" onclick="registrarPagamento('${cID}')">💸</button>
                    <button class="btn-acao-grande btn-wpp" onclick="cobrarWhatsApp('${cID}', ${saldo}, ${rateio})">📱</button>
                    <button class="btn-acao-grande btn-del" onclick="removerComponente('${cID}')">❌</button>
                </div></td>
            </tr>`;
    });
}

async function registrarPagamento(id) {
    const v = parseFloat(prompt("Valor do pagamento:"));
    if (isNaN(v) || v <= 0) return;
    const c = componentes.find(x => x.id == id);
    if (c) {
        const novoPago = (c.valorPago || c.valor_pago || 0) + v;
        await supabaseInstance.from('componentes').update({ valor_pago: novoPago }).eq('id', id);
        await atualizarTabela();
    }
}

function cobrarWhatsApp(id, saldo, rateio) {
    const c = componentes.find(x => x.id == id);
    const msg = `Olá *${c.nome}*! 🤡%0A%0ASaldo Devedor: *R$ ${saldo.toFixed(2)}*%0AVencimento: ${c.vencimento.split('-').reverse().join('/')}%0A%0A_Favor regularizar!_`;
    window.open(`https://api.whatsapp.com/send?phone=55${c.telefone}&text=${msg}`);
}

async function removerComponente(id) { 
    if(confirm("Remover?")) { await supabaseInstance.from('componentes').delete().eq('id', id); await atualizarTabela(); } 
}

function filtrar(t) { filtroAtual = t; atualizarTabela(); }

async function zerarTudo() { 
    if(confirm("Zerar temporada?")) { 
        await supabaseInstance.from('componentes').delete().eq('turma_id', usuarioLogado.user);
        await supabaseInstance.from('extras').delete().eq('turma_id', usuarioLogado.user);
        await atualizarTabela(); 
    } 
}

async function gerarRelatorioPDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); const rateio = atualizarResumo();
    doc.text(`Financeiro: ${usuarioLogado.user}`, 14, 20);
    const body = componentes.map(c => [c.nome, ((c.valorTotal || c.valor_total)+rateio).toFixed(2), (c.valorPago || c.valor_pago).toFixed(2), ((c.valorTotal || c.valor_total)+rateio-(c.valorPago || c.valor_pago)).toFixed(2), c.vencimento.split('-').reverse().join('/')]);
    doc.autoTable({ startY: 25, head: [['Nome', 'Total', 'Pago', 'Dívida', 'Venc.']], body: body });
    doc.save(`relatorio_${usuarioLogado.user}.pdf`);
}

window.onload = atualizarVisualizacao;
