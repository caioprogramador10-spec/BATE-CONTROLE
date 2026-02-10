// ==========================================
// CONFIGURAÇÕES DE VENDA (SaaS)
// ==========================================
const DIAS_TRIAL = 30; 
const VALOR_MENSALIDADE = "49,90";
const MEU_PIX = "(21) 98507-2328"; 

// ==========================================
// 1. SISTEMA DE LOGIN E ASSINATURA
// ==========================================
let usuarioLogado = JSON.parse(localStorage.getItem('bateControleSessao')) || null;
let modoCadastro = false;

function atualizarVisualizacao() {
    const loginContainer = document.getElementById('login-container');
    const appContent = document.getElementById('app-content');
    const bloqueioAssinatura = document.getElementById('bloqueio-assinatura');

    if (usuarioLogado) {
        // Se for o admin (você)
        if (usuarioLogado.status === "admin") {
            loginContainer.style.display = 'none';
            appContent.style.display = 'block';
            bloqueioAssinatura.style.display = 'none';
            atualizarTabela();
            return;
        }

        // Se for um usuário comum, verifica se pagou ou está no trial
        if (!verificarAssinatura()) {
            loginContainer.style.display = 'none';
            appContent.style.display = 'none';
            bloqueioAssinatura.style.display = 'block'; 
            return;
        }
        
        loginContainer.style.display = 'none';
        appContent.style.display = 'block';
        bloqueioAssinatura.style.display = 'none';
        atualizarTabela();
    } else {
        loginContainer.style.display = 'flex';
        appContent.style.display = 'none';
        bloqueioAssinatura.style.display = 'none';
    }
}

function verificarAssinatura() {
    if (usuarioLogado.status === "admin" || usuarioLogado.status === "pago") return true; 
    
    const hoje = new Date();
    const dataCadastro = new Date(usuarioLogado.dataCriacao);
    const diferencaTempo = hoje - dataCadastro;
    const diasUso = Math.floor(diferencaTempo / (1000 * 60 * 60 * 24));

    // Se o status for grátis e passou de 30 dias, bloqueia
    if (usuarioLogado.status === "gratis" && diasUso > DIAS_TRIAL) {
        return false;
    }
    return true;
}

function executarAcaoPrincipal() {
    const user = document.getElementById('usuario').value.trim().toLowerCase();
    const pass = document.getElementById('senha').value.trim();
    
    if (!user || !pass) return alert("Preencha tudo!");

    // LOGIN DO DONO (CAIO)
    if (user === "caio" && pass === "caio1010") {
        usuarioLogado = { user: "caio", status: "admin" };
        localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));
        acessarPainelDono();
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem('bateControleUsers')) || [];

    if (modoCadastro) {
        if (usuarios.find(u => u.user === user)) return alert("Essa turma já existe!");
        const novo = { 
            user: user, 
            pass: pass, 
            dataCriacao: new Date().toISOString(), 
            status: "gratis" 
        };
        usuarios.push(novo);
        localStorage.setItem('bateControleUsers', JSON.stringify(usuarios));
        alert("Turma cadastrada! 30 dias grátis liberados.");
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

// PAINEL ADMINISTRATIVO
function acessarPainelDono() {
    document.getElementById('painel-dono').style.display = 'block';
    renderizarUsuariosAdmin();
}

function fecharPainelDono() {
    document.getElementById('painel-dono').style.display = 'none';
    atualizarVisualizacao();
}

function renderizarUsuariosAdmin() {
    const usuarios = JSON.parse(localStorage.getItem('bateControleUsers')) || [];
    const lista = document.getElementById('lista-usuarios-admin');
    lista.innerHTML = "";

    if (usuarios.length === 0) {
        lista.innerHTML = "<p style='color:#888;'>Nenhuma turma cadastrada ainda.</p>";
        return;
    }

    usuarios.forEach((u) => {
        const data = new Date(u.dataCriacao).toLocaleDateString('pt-BR');
        lista.innerHTML += `
            <div style="background:#222; padding:15px; margin-bottom:10px; border-radius:10px; border-left: 5px solid ${u.status === 'pago' ? '#27ae60' : '#e67e22'}">
                <p style="margin:0;"><strong>Turma:</strong> ${u.user}</p>
                <p style="margin:5px 0; font-size:0.8rem; color:#aaa;">Desde: ${data} | Status: ${u.status.toUpperCase()}</p>
                <button onclick="liberarAcesso('${u.user}')" style="background:#27ae60; color:white; padding:8px; border:none; border-radius:5px; cursor:pointer; margin-top:5px; width:100%; font-weight:bold;">Confirmar Pagamento</button>
                <button onclick="deletarUsuarioAdmin('${u.user}')" style="background:#444; color:white; padding:8px; border:none; border-radius:5px; cursor:pointer; margin-top:5px; width:100%;">Excluir Turma</button>
            </div>
        `;
    });
}

function liberarAcesso(nomeUsuario) {
    let usuarios = JSON.parse(localStorage.getItem('bateControleUsers')) || [];
    const idx = usuarios.findIndex(u => u.user === nomeUsuario);
    if (idx !== -1) {
        usuarios[idx].status = "pago";
        usuarios[idx].dataCriacao = new Date().toISOString(); 
        localStorage.setItem('bateControleUsers', JSON.stringify(usuarios));
        alert("ACESSO LIBERADO! A turma " + nomeUsuario + " agora está como PAGO.");
        renderizarUsuariosAdmin();
    }
}

function deletarUsuarioAdmin(nomeUsuario) {
    if(confirm(`ATENÇÃO: Deseja apagar a turma ${nomeUsuario}?`)) {
        let usuarios = JSON.parse(localStorage.getItem('bateControleUsers')) || [];
        usuarios = usuarios.filter(u => u.user !== nomeUsuario);
        localStorage.setItem('bateControleUsers', JSON.stringify(usuarios));
        localStorage.removeItem(`data_${nomeUsuario}`);
        localStorage.removeItem(`extras_${nomeUsuario}`);
        renderizarUsuariosAdmin();
    }
}

function alternarTelaLogin() {
    modoCadastro = !modoCadastro;
    const titulo = document.getElementById('login-titulo');
    const btnPrincipal = document.getElementById('btn-login-entrar');
    const linkAlternar = document.getElementById('link-alternar');
    const textoAlternar = document.getElementById('texto-alternar');

    if (modoCadastro) {
        titulo.innerText = "NOVA TURMA 🎭";
        btnPrincipal.innerText = "Criar Minha Turma";
        textoAlternar.innerText = "Já tem conta?";
        linkAlternar.innerText = "Fazer Login";
    } else {
        titulo.innerText = "BATE-LOGIN 🤡";
        btnPrincipal.innerText = "Entrar no Painel";
        textoAlternar.innerText = "Não tem conta?";
        linkAlternar.innerText = "Cadastrar Turma";
    }
}

function fazerLogout() {
    localStorage.removeItem('bateControleSessao');
    usuarioLogado = null;
    window.location.reload();
}

// ==========================================
// 2. LÓGICA DO APP (FINANCEIRO)
// ==========================================
let componentes = [];
let custosExtras = [];
let filtroAtual = 'todos';

function carregarDadosUsuario() {
    if(!usuarioLogado) return;
    componentes = JSON.parse(localStorage.getItem(`data_${usuarioLogado.user}`)) || [];
    custosExtras = JSON.parse(localStorage.getItem(`extras_${usuarioLogado.user}`)) || [];
}

function salvar() { if(usuarioLogado) localStorage.setItem(`data_${usuarioLogado.user}`, JSON.stringify(componentes)); }
function salvarExtras() { if(usuarioLogado) localStorage.setItem(`extras_${usuarioLogado.user}`, JSON.stringify(custosExtras)); }

function adicionarCustoExtra() {
    const desc = document.getElementById('descExtra').value;
    const valor = parseFloat(document.getElementById('valorExtra').value);
    if (desc && !isNaN(valor)) {
        custosExtras.push({ id: Date.now(), descricao: desc, valor: valor });
        salvarExtras();
        document.getElementById('descExtra').value = '';
        document.getElementById('valorExtra').value = '';
        atualizarTabela();
    }
}

function adicionarComponente() {
    const nome = document.getElementById('nome').value;
    const valor = parseFloat(document.getElementById('valorTotal').value);
    const tel = document.getElementById('telefone').value.replace(/\D/g, '');
    const data = document.getElementById('dataVencimento').value;

    if (nome && !isNaN(valor) && tel && data) {
        componentes.push({ 
            id: Date.now(), 
            nome, 
            valorTotal: valor, 
            valorPago: 0, 
            telefone: tel, 
            vencimento: data 
        });
        salvar();
        atualizarTabela();
        document.getElementById('nome').value = '';
        document.getElementById('valorTotal').value = '';
        document.getElementById('telefone').value = '';
        alert("Componente salvo!");
    } else {
        alert("Preencha todos os campos!");
    }
}

function atualizarResumo() {
    let pago = 0, metaFanta = 0;
    let totalExtras = custosExtras.reduce((sum, e) => sum + e.valor, 0);
    componentes.forEach(c => { metaFanta += c.valorTotal; pago += c.valorPago; });
    const rateio = componentes.length > 0 ? (totalExtras / componentes.length) : 0;
    
    document.getElementById('total-componentes').innerText = componentes.length;
    document.getElementById('meta-total').innerText = `R$ ${(metaFanta + totalExtras).toFixed(2)}`;
    document.getElementById('total-pago').innerText = `R$ ${pago.toFixed(2)}`;
    document.getElementById('total-devedor').innerText = `R$ ${(metaFanta + totalExtras - pago).toFixed(2)}`;
    document.getElementById('valorExtraPorPessoa').innerText = `R$ ${rateio.toFixed(2)}`;
    
    document.getElementById('listaExtras').innerHTML = custosExtras.map(e => `<li>✅ ${e.descricao}: R$ ${e.valor.toFixed(2)}</li>`).join('');
    return rateio;
}

function atualizarTabela() {
    carregarDadosUsuario();
    const rateio = atualizarResumo();
    const corpo = document.getElementById('corpoTabela');
    const busca = document.getElementById('buscaNome').value.toLowerCase();
    corpo.innerHTML = '';

    componentes.forEach(c => {
        if (busca && !c.nome.toLowerCase().includes(busca)) return;
        const total = c.valorTotal + rateio;
        const saldo = total - c.valorPago;
        
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const venc = new Date(c.vencimento + 'T00:00:00');
        let statusCls = "bg-ok";
        
        if (saldo > 0 && venc < hoje) statusCls = "bg-atrasado";

        if (filtroAtual === 'atrasado' && (saldo <= 0 || venc >= hoje)) return;
        if (filtroAtual === 'em-dia' && (saldo > 0 && venc < hoje)) return;

        corpo.innerHTML += `
            <tr class="${statusCls}">
                <td>
                    <strong>${c.nome}</strong><br>
                    <span class="valor-extra-badge">F: R$ ${c.valorTotal.toFixed(2)} | E: R$ ${rateio.toFixed(2)}</span>
                </td>
                <td>R$ ${total.toFixed(2)}</td>
                <td style="color:#27ae60">R$ ${c.valorPago.toFixed(2)}</td>
                <td style="color:${saldo > 0 ? '#e74c3c':'#27ae60'}">R$ ${saldo.toFixed(2)}</td>
                <td>${c.vencimento.split('-').reverse().join('/')}</td>
                <td>
                    <div style="display:flex; gap:2px">
                        <button class="btn-acao-grande btn-pgto" onclick="registrarPagamento(${c.id})">💸</button>
                        <button class="btn-acao-grande btn-wpp" onclick="cobrarWhatsApp(${c.id}, ${saldo}, ${rateio})">📱</button>
                        <button class="btn-acao-grande btn-del" onclick="removerComponente(${c.id})">❌</button>
                    </div>
                </td>
            </tr>`;
    });
}

function registrarPagamento(id) {
    const v = parseFloat(prompt("Valor do pagamento:"));
    if (isNaN(v) || v <= 0) return;
    
    const c = componentes.find(x => x.id === id);
    c.valorPago += v;

    let dataVenc = new Date(c.vencimento + 'T00:00:00');
    dataVenc.setMonth(dataVenc.getMonth() + 1);
    
    c.vencimento = dataVenc.toISOString().split('T')[0];

    salvar(); 
    atualizarTabela();
}

function cobrarWhatsApp(id, saldo, rateio) {
    const c = componentes.find(x => x.id === id);
    const msg = `Olá *${c.nome}*! 🤡%0A%0ASaldo Devedor: *R$ ${saldo.toFixed(2)}*%0AVencimento: ${c.vencimento.split('-').reverse().join('/')}%0A%0A_Favor regularizar!_`;
    window.open(`https://api.whatsapp.com/send?phone=55${c.telefone}&text=${msg}`);
}

function removerComponente(id) { 
    if(confirm("Remover?")) { 
        componentes = componentes.filter(x => x.id !== id); 
        salvar(); 
        atualizarTabela(); 
    } 
}

function filtrar(t) { 
    filtroAtual = t; 
    atualizarTabela(); 
}

function zerarTudo() { 
    if(confirm("Zerar temporada?")) { 
        componentes = []; 
        custosExtras = []; 
        salvar(); 
        salvarExtras(); 
        atualizarTabela(); 
    } 
}

async function gerarRelatorioPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const rateio = atualizarResumo();
    doc.text(`Financeiro: ${usuarioLogado.user}`, 14, 20);
    
    const body = componentes.map(c => [
        c.nome, 
        (c.valorTotal+rateio).toFixed(2), 
        c.valorPago.toFixed(2), 
        (c.valorTotal+rateio-c.valorPago).toFixed(2), 
        c.vencimento
    ]);

    doc.autoTable({ 
        startY: 30, 
        head: [['Nome', 'Total', 'Pago', 'Dívida', 'Venc.']], 
        body: body 
    });
    doc.save(`relatorio.pdf`);
}

window.onload = atualizarVisualizacao;
