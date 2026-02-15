// ==========================================
// CONFIGURAÇÕES DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ovrkpnusgulvkjtnhcsr.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cmtwbnVzZ3VsdmtqdG5oY3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODI2NTEsImV4cCI6MjA4NjE1ODY1MX0.EF4opjkiJfSi4Nr3M4DDTvhZnM8itILurG_OTLw_q-I'; 

const supabaseInstance = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const TABELA_USUARIOS = 'batecontroleusers'; 

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
            if(bloqueioAssinatura) bloqueioAssinatura.style.display = 'none';
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
                    <p style="font-size:1.1rem">Valor da Assinatura: <br><strong style="font-size:1.5rem; color:#27ae60">R$ ${VALOR_MENSALIDADE.toFixed(2)}</strong></p>
                    <p style="background:#000; padding:10px; border-radius:8px; margin:15px 0; border:1px dashed #555;">Chave PIX: <br><strong>${MEU_PIX}</strong></p>
                    <button onclick="avisarPagamento()" style="background:#25d366; color:white; padding:15px; border:none; border-radius:12px; cursor:pointer; font-weight:bold; width:100%; font-size:1rem;">✅ JÁ FIZ O PIX! LIBERAR ACESSO</button>
                    <button onclick="fazerLogout()" style="background:transparent; color:#888; border:none; margin-top:20px; cursor:pointer; text-decoration:underline;">Sair da conta</button>
                </div>`;
            bloqueioAssinatura.style.display = 'block'; 
            return;
        }
        
        loginContainer.style.display = 'none';
        appContent.style.display = 'block';
        if(bloqueioAssinatura) bloqueioAssinatura.style.display = 'none';
        await atualizarTabela();
    } else {
        loginContainer.style.display = 'flex';
        appContent.style.display = 'none';
        if(bloqueioAssinatura) bloqueioAssinatura.style.display = 'none';
    }
}

function verificarAssinatura() {
    if (usuarioLogado.status === "admin" || usuarioLogado.status === "pago") return true; 
    const hoje = new Date();
    const dataCadastro = new Date(usuarioLogado.criacao);
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

    try {
        let { data: usuarios, error } = await supabaseInstance.from(TABELA_USUARIOS).select('*');
        if (error) throw error;

        if (modoCadastro) {
            if (usuarios && usuarios.find(u => u.user === user)) return alert("Essa turma já existe!");
            const novo = { user: user, pass: pass, criacao: new Date().toISOString(), status: "gratis" };
            const { error: insErr } = await supabaseInstance.from(TABELA_USUARIOS).insert([novo]);
            if (insErr) throw insErr;
            alert(`Turma ${user.toUpperCase()} cadastrada!`);
            alternarTelaLogin();
        } else {
            const valid = usuarios.find(u => u.user === user && u.pass === pass);
            if (valid) {
                usuarioLogado = valid;
                localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));
                atualizarVisualizacao();
            } else { alert("Usuário ou senha incorretos!"); }
        }
    } catch (e) { 
        console.error(e);
        alert("Erro no banco de dados."); 
    }
}

// ==========================================
// 2. PAINEL DO DONO (ADMIN)
// ==========================================
async function renderizarUsuariosAdmin() {
    let { data: usuarios } = await supabaseInstance.from(TABELA_USUARIOS).select('*');
    const lista = document.getElementById('lista-usuarios-admin');
    const termo = document.getElementById('busca-admin').value.toLowerCase();
    let lucroTotal = 0;
    lista.innerHTML = "";

    if(usuarios) {
        usuarios.forEach(u => {
            if (u.status === 'pago') lucroTotal += VALOR_MENSALIDADE;
            if (u.user.includes(termo)) {
                const cor = u.status === 'pago' ? '#27ae60' : '#e67e22';
                lista.innerHTML += `
                    <div style="background:#222; padding:15px; margin-bottom:12px; border-radius:12px; border-left: 6px solid ${cor}">
                        <p><strong>Turma:</strong> ${u.user.toUpperCase()}</p>
                        <p style="font-size:0.75rem; color:#aaa;">Status: ${u.status.toUpperCase()}</p>
                        <button onclick="liberarAcesso('${u.user}')" style="background:#27ae60; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer;">Confirmar Pago</button>
                        <button onclick="deletarUsuarioAdmin('${u.user}')" style="background:#444; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer;">❌</button>
                    </div>`;
            }
        });
    }
    document.getElementById('admin-total-turmas').innerText = usuarios ? usuarios.length : 0;
    document.getElementById('admin-lucro-total').innerText = `R$ ${lucroTotal.toFixed(2)}`;
}

async function liberarAcesso(nome) {
    await supabaseInstance.from(TABELA_USUARIOS).update({ status: 'pago' }).eq('user', nome);
    renderizarUsuariosAdmin();
}

async function deletarUsuarioAdmin(nome) {
    if(confirm("Apagar?")) {
        await supabaseInstance.from(TABELA_USUARIOS).delete().eq('user', nome);
        renderizarUsuariosAdmin();
    }
}

function acessarPainelDono() { document.getElementById('painel-dono').style.display = 'block'; renderizarUsuariosAdmin(); }
function fecharPainelDono() { document.getElementById('painel-dono').style.display = 'none'; atualizarVisualizacao(); }

// ==========================================
// 3. LÓGICA DO APP (FINANCEIRO INTEGRAL)
// ==========================================
let componentes = [], custosExtras = [], filtroAtual = 'todos';

async function carregarDadosUsuario() {
    if(!usuarioLogado) return;
    const { data: comp } = await supabaseInstance.from('componentes').select('*').eq('turma_id', usuarioLogado.user);
    const { data: extr } = await supabaseInstance.from('extras').select('*').eq('turma_id', usuarioLogado.user);
    componentes = comp || [];
    custosExtras = extr || [];
}

async function adicionarComponente() {
    const nome = document.getElementById('nome').value;
    const valor = parseFloat(document.getElementById('valorTotal').value);
    const tel = document.getElementById('telefone').value.replace(/\D/g, '');
    const data = document.getElementById('dataVencimento').value;

    if (nome && !isNaN(valor) && tel && data) {
        await supabaseInstance.from('componentes').insert([{ turma_id: usuarioLogado.user, nome, valor_total: valor, valor_pago: 0, telefone: tel, vencimento: data }]);
        document.getElementById('nome').value = ''; document.getElementById('valorTotal').value = ''; document.getElementById('telefone').value = '';
        await atualizarTabela();
    }
}

async function adicionarCustoExtra() {
    const desc = document.getElementById('descExtra').value;
    const valor = parseFloat(document.getElementById('valorExtra').value);
    if (desc && !isNaN(valor)) {
        await supabaseInstance.from('extras').insert([{ turma_id: usuarioLogado.user, descricao: desc, valor: valor }]);
        document.getElementById('descExtra').value = ''; document.getElementById('valorExtra').value = '';
        await atualizarTabela();
    }
}

function atualizarResumo() {
    let pago = 0, metaFanta = 0, totalExtras = custosExtras.reduce((sum, e) => sum + e.valor, 0);
    componentes.forEach(c => { 
        metaFanta += (c.valor_total || 0); 
        pago += (c.valor_pago || 0); 
    });
    const rateio = componentes.length > 0 ? (totalExtras / componentes.length) : 0;
    
    document.getElementById('total-componentes').innerText = componentes.length;
    document.getElementById('meta-total').innerText = `R$ ${(metaFanta + totalExtras).toFixed(2)}`;
    document.getElementById('total-pago').innerText = `R$ ${pago.toFixed(2)}`;
    document.getElementById('total-devedor').innerText = `R$ ${(metaFanta + totalExtras - pago).toFixed(2)}`;
    document.getElementById('valorExtraPorPessoa').innerText = `R$ ${rateio.toFixed(2)}`;
    
    document.getElementById('listaExtras').innerHTML = custosExtras.map(e => `
        <li style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <span>✅ ${e.descricao}: R$ ${e.valor.toFixed(2)}</span>
            <button onclick="removerExtra('${e.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-weight:bold; font-size:1.1rem;">❌</button>
        </li>`).join('');
    return rateio;
}

async function removerExtra(id) {
    if(confirm("Remover este custo extra?")) {
        await supabaseInstance.from('extras').delete().eq('id', id);
        await atualizarTabela();
    }
}

// ==========================================
// NOVAS FUNÇÕES: ZERAR E AVISAR AMANHÃ
// ==========================================

async function zerarTemporada() {
    if(!confirm("⚠️ ATENÇÃO: Isso vai zerar todos os pagamentos e excluir todos os custos extras da turma. Continuar?")) return;
    
    try {
        // 1. Apagar extras
        await supabaseInstance.from('extras').delete().eq('turma_id', usuarioLogado.user);
        
        // 2. Zerar valor_pago de todos
        await supabaseInstance.from('componentes').update({ valor_pago: 0 }).eq('turma_id', usuarioLogado.user);
        
        alert("Temporada zerada com sucesso! 🤡");
        await atualizarTabela();
    } catch (e) {
        alert("Erro ao zerar temporada.");
    }
}

async function avisarVencimentosAmanha() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataAmanhaStr = amanha.toISOString().split('T')[0];
    
    const avisados = componentes.filter(c => c.vencimento === dataAmanhaStr);
    
    if (avisados.length === 0) {
        alert("Ninguém vence amanhã! 🎉");
        return;
    }

    if(confirm(`Enviar mensagem para ${avisados.length} pessoas que vencem amanhã?`)) {
        avisados.forEach((c, index) => {
            setTimeout(() => {
                const msg = `Olá *${c.nome}*! 🤡%0A%0APassando para avisar que sua mensalidade vence *AMANHÃ* (${c.vencimento.split('-').reverse().join('/')}).%0A%0A_Evite atrasos!_`;
                window.open(`https://api.whatsapp.com/send?phone=55${c.telefone}&text=${msg}`);
            }, index * 1000); // Delay de 1s entre janelas para não travar o navegador
        });
    }
}

// ==========================================

async function atualizarTabela() {
    await carregarDadosUsuario();
    const rateio = atualizarResumo();
    const corpo = document.getElementById('corpoTabela');
    if(!corpo) return;
    const busca = document.getElementById('buscaNome') ? document.getElementById('buscaNome').value.toLowerCase() : "";
    corpo.innerHTML = '';

    componentes.forEach(c => {
        const cTotal = (c.valor_total || 0);
        const cPago = (c.valor_pago || 0);
        const totalComRateio = cTotal + rateio;
        const saldo = totalComRateio - cPago;

        if (busca && !c.nome.toLowerCase().includes(busca)) return;

        const hoje = new Date().setHours(0,0,0,0);
        const venc = new Date(c.vencimento + 'T00:00:00');
        const atrasado = (saldo > 0 && venc < hoje);

        if (filtroAtual === 'atrasado' && !atrasado) return;
        if (filtroAtual === 'em-dia' && atrasado) return;

        corpo.innerHTML += `
            <tr class="${atrasado ? 'bg-atrasado' : 'bg-ok'}">
                <td><strong>${c.nome}</strong><br><small>F: R$ ${cTotal.toFixed(2)} | E: R$ ${rateio.toFixed(2)}</small></td>
                <td>R$ ${totalComRateio.toFixed(2)}</td>
                <td style="color:#27ae60">R$ ${cPago.toFixed(2)}</td>
                <td style="color:${saldo > 0 ? '#e74c3c' : '#27ae60'}">R$ ${saldo.toFixed(2)}</td>
                <td>${c.vencimento.split('-').reverse().join('/')}</td>
                <td>
                    <button class="btn-acao-grande" onclick="registrarPagamento('${c.id}')">💸</button>
                    <button class="btn-acao-grande" onclick="cobrarWhatsApp('${c.id}', ${saldo})">📱</button>
                    <button class="btn-acao-grande" onclick="removerComponente('${c.id}')">❌</button>
                </td>
            </tr>`;
    });
}

async function registrarPagamento(id) {
    const v = parseFloat(prompt("Valor do pagamento:"));
    if (isNaN(v)) return;

    const comp = componentes.find(x => x.id == id);
    const novoPago = (comp.valor_pago || 0) + v;

    let dataObj = new Date(comp.vencimento + 'T12:00:00'); 
    dataObj.setMonth(dataObj.getMonth() + 1);
    const novoVencimento = dataObj.toISOString().split('T')[0];

    await supabaseInstance.from('componentes').update({ 
        valor_pago: novoPago,
        vencimento: novoVencimento 
    }).eq('id', id);

    await atualizarTabela();
}

function cobrarWhatsApp(id, saldo) {
    const c = componentes.find(x => x.id == id);
    const msg = `Olá *${c.nome}*! 🤡%0A%0ASaldo Devedor: *R$ ${saldo.toFixed(2)}*%0A_Favor regularizar!_`;
    window.open(`https://api.whatsapp.com/send?phone=55${c.telefone}&text=${msg}`);
}

async function removerComponente(id) {
    if(confirm("Remover?")) { await supabaseInstance.from('componentes').delete().eq('id', id); await atualizarTabela(); }
}

async function gerarRelatorioPDF() {
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); const rateio = atualizarResumo();
    doc.text(`Financeiro: ${usuarioLogado.user}`, 14, 20);
    const body = componentes.map(c => [c.nome, (c.valor_total + rateio).toFixed(2), c.valor_pago.toFixed(2), (c.valor_total + rateio - c.valor_pago).toFixed(2), c.vencimento.split('-').reverse().join('/')]);
    doc.autoTable({ startY: 25, head: [['Nome', 'Total', 'Pago', 'Dívida', 'Venc.']], body: body });
    doc.save(`relatorio_${usuarioLogado.user}.pdf`);
}

function filtrar(t) { filtroAtual = t; atualizarTabela(); }
function fazerLogout() { localStorage.removeItem('bateControleSessao'); window.location.reload(); }
function alternarTelaLogin() { modoCadastro = !modoCadastro; document.getElementById('login-titulo').innerText = modoCadastro ? "NOVA TURMA 🎭" : "BATE-LOGIN 🤡"; }
function avisarPagamento() { window.open(`https://api.whatsapp.com/send?phone=${WHATSAPP_DONO}&text=Fiz o PIX para a turma ${usuarioLogado.user}!`); }

window.onload = atualizarVisualizacao;
