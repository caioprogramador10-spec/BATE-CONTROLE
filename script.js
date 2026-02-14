// ==========================================
// CONFIGURAÇÕES DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ovrkpnusgulvkjtnhcsr.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cmtwbnVzZ3VsdmtqdG5oY3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODI2NTEsImV4cCI6MjA4NjE1ODY1MX0.EF4opjkiJfSi4Nr3M4DDTvhZnM8itILurG_OTLw_q-I'; 

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
                    <p style="color:#ddd">O período de teste da turma <strong>${usuarioLogado.user.toUpperCase()}</strong> chegou ao fim.</p>
                    <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
                    <p style="font-size:1.1rem">Assinatura Mensal: <br><strong style="font-size:1.5rem; color:#27ae60">R$ ${VALOR_MENSALIDADE.toFixed(2)}</strong></p>
                    <p style="background:#000; padding:10px; border-radius:8px; margin:15px 0; border:1px dashed #555;">Chave PIX: <br><strong>${MEU_PIX}</strong></p>
                    <button onclick="avisarPagamento()" style="background:#25d366; color:white; padding:15px; border:none; border-radius:12px; cursor:pointer; font-weight:bold; width:100%; font-size:1rem;">✅ JÁ FIZ O PIX!</button>
                    <button onclick="fazerLogout()" style="background:transparent; color:#888; border:none; margin-top:20px; cursor:pointer; text-decoration:underline;">Sair da conta</button>
                </div>`;
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
    }
}

function verificarAssinatura() {
    if (usuarioLogado.status === "admin" || usuarioLogado.status === "pago") return true; 
    const hoje = new Date();
    const dataCadastro = new Date(usuarioLogado.dataCriacao);
    const diasUso = Math.floor((hoje - dataCadastro) / (1000 * 60 * 60 * 24));
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

    // Busca atualizada do banco para garantir login pós-cadastro
    let { data: usuarios } = await supabaseInstance.from('bateControleUsers').select('*');
    
    if (modoCadastro) {
        if (usuarios && usuarios.find(u => u.user === user)) return alert("Essa turma já existe!");
        const novo = { user, pass, dataCriacao: new Date().toISOString(), status: "gratis" };
        await supabaseInstance.from('bateControleUsers').insert([novo]);
        alert("Turma cadastrada! Faça login agora.");
        alternarTelaLogin();
    } else {
        const valid = usuarios.find(u => u.user === user && u.pass === pass);
        if (valid) {
            usuarioLogado = valid;
            localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));
            window.location.reload(); 
        } else {
            alert("Usuário ou senha incorretos!");
        }
    }
}

// ==========================================
// 2. FUNÇÕES ADMIN (PAINEL DO DONO)
// ==========================================
function acessarPainelDono() {
    document.getElementById('painel-dono').style.display = 'block';
    renderizarUsuariosAdmin();
}

async function renderizarUsuariosAdmin() {
    let { data: usuarios } = await supabaseInstance.from('bateControleUsers').select('*');
    const lista = document.getElementById('lista-usuarios-admin');
    const termo = document.getElementById('busca-admin').value.toLowerCase();
    
    let lucro = 0;
    lista.innerHTML = "";
    
    usuarios.forEach(u => { 
        if (u.status === 'pago') lucro += VALOR_MENSALIDADE; 
        if (u.user.includes(termo)) {
            const cor = u.status === 'pago' ? '#27ae60' : '#e67e22';
            lista.innerHTML += `
                <div style="background:#222; padding:15px; margin-bottom:10px; border-radius:12px; border-left: 5px solid ${cor}">
                    <p><strong>Turma:</strong> ${u.user.toUpperCase()}</p>
                    <p style="font-size:0.8rem; color:#aaa">Status: ${u.status}</p>
                    <button onclick="liberarAcesso('${u.user}')" style="background:#27ae60; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">Confirmar Pago</button>
                    <button onclick="deletarUsuarioAdmin('${u.user}')" style="background:#444; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer;">❌</button>
                </div>`;
        }
    });
    document.getElementById('admin-total-turmas').innerText = usuarios.length;
    document.getElementById('admin-lucro-total').innerText = `R$ ${lucro.toFixed(2)}`;
}

async function liberarAcesso(user) {
    await supabaseInstance.from('bateControleUsers').update({ status: 'pago' }).eq('user', user).select();
    renderizarUsuariosAdmin();
}

async function deletarUsuarioAdmin(user) {
    if(confirm("Apagar?")) {
        await supabaseInstance.from('bateControleUsers').delete().eq('user', user);
        renderizarUsuariosAdmin();
    }
}

// ==========================================
// 3. LÓGICA DO APP (FINANCEIRO)
// ==========================================
let componentes = [], custosExtras = [], filtroAtual = 'todos';

async function carregarDadosUsuario() {
    if(!usuarioLogado) return;
    const { data: c } = await supabaseInstance.from('componentes').select('*').eq('turma_id', usuarioLogado.user);
    const { data: e } = await supabaseInstance.from('extras').select('*').eq('turma_id', usuarioLogado.user);
    componentes = c || [];
    custosExtras = e || [];
}

async function adicionarComponente() {
    const nome = document.getElementById('nome').value;
    const valor = parseFloat(document.getElementById('valorTotal').value);
    const tel = document.getElementById('telefone').value.replace(/\D/g, '');
    const data = document.getElementById('dataVencimento').value;

    if (nome && !isNaN(valor)) {
        const novo = { turma_id: usuarioLogado.user, nome, valor_total: valor, valor_pago: 0, telefone: tel, vencimento: data };
        await supabaseInstance.from('componentes').insert([novo]);
        await atualizarTabela();
        document.getElementById('nome').value = '';
        document.getElementById('valorTotal').value = '';
    }
}

async function atualizarTabela() {
    await carregarDadosUsuario();
    const rateio = componentes.length > 0 ? (custosExtras.reduce((s, e) => s + e.valor, 0) / componentes.length) : 0;
    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = '';

    componentes.forEach(c => {
        const total = (c.valor_total || c.valorTotal || 0) + rateio;
        const pago = (c.valor_pago || c.valorPago || 0);
        const saldo = total - pago;
        
        // Lógica de Filtro e Atraso
        const venc = new Date(c.vencimento + 'T00:00:00');
        const atrasado = (saldo > 0 && venc < new Date().setHours(0,0,0,0));
        
        if (filtroAtual === 'atrasado' && !atrasado) return;
        if (filtroAtual === 'em-dia' && atrasado) return;

        corpo.innerHTML += `
            <tr class="${atrasado ? 'bg-atrasado' : 'bg-ok'}">
                <td><strong>${c.nome}</strong></td>
                <td>R$ ${total.toFixed(2)}</td>
                <td style="color:#27ae60">R$ ${pago.toFixed(2)}</td>
                <td style="color:${saldo > 0 ? '#e74c3c' : '#27ae60'}">R$ ${saldo.toFixed(2)}</td>
                <td>${c.vencimento.split('-').reverse().join('/')}</td>
                <td>
                    <button onclick="registrarPagamento('${c.id}')">💸</button>
                    <button onclick="cobrarWhatsApp('${c.id}', ${saldo})">📱</button>
                    <button onclick="removerComponente('${c.id}')">❌</button>
                </td>
            </tr>`;
    });
    atualizarResumo();
}

async function registrarPagamento(id) {
    const v = parseFloat(prompt("Valor:"));
    if (isNaN(v)) return;
    const comp = componentes.find(x => x.id == id);
    const novoPago = (comp.valor_pago || 0) + v;
    await supabaseInstance.from('componentes').update({ valor_pago: novoPago }).eq('id', id);
    await atualizarTabela();
}

function fazerLogout() { localStorage.removeItem('bateControleSessao'); window.location.reload(); }
function alternarTelaLogin() { modoCadastro = !modoCadastro; atualizarVisualizacao(); }
function avisarPagamento() { window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_DONO}&text=Libera meu acesso!`); }

window.onload = atualizarVisualizacao;
