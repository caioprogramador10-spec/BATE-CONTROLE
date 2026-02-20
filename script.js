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
const VALOR_MENSALIDADE = 79.90; 
const MEU_PIX = "(21) 98507-2328"; 
const WHATSAPP_DONO = "5521985072328"; 

// ==========================================
// 1. SISTEMA DE LOGIN E ASSINATURA (ATUALIZADO)
// ==========================================
let usuarioLogado = JSON.parse(localStorage.getItem('bateControleSessao')) || null;
let modoCadastro = false;

async function atualizarVisualizacao() {
    const loginContainer = document.getElementById('login-container');
    const appContent = document.getElementById('app-content');
    const bloqueioAssinatura = document.getElementById('bloqueio-assinatura');

    if (usuarioLogado) {
        // Se for você (Admin), libera tudo
        if (usuarioLogado.user === "caio") {
            loginContainer.style.display = 'none';
            appContent.style.display = 'block';
            if(bloqueioAssinatura) bloqueioAssinatura.style.display = 'none';
            await atualizarTabela();
            return;
        }

        // VERIFICAÇÃO DE ASSINATURA MELHORADA
        const acessoValido = await verificarStatusAssinatura();

        if (!acessoValido) {
            loginContainer.style.display = 'none';
            appContent.style.display = 'none';
            if(bloqueioAssinatura) bloqueioAssinatura.style.display = 'flex'; 
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

// Função que checa no banco se o tempo acabou
async function verificarStatusAssinatura() {
    // 1. Pega os dados mais frescos do banco
    let { data: userDB, error } = await supabaseInstance
        .from(TABELA_USUARIOS)
        .select('*')
        .eq('user', usuarioLogado.user)
        .single();

    if (error || !userDB) return false;

    const hoje = new Date();
    
    // Se você já criou a coluna 'data_expiracao', use ela. 
    // Se não, o código abaixo usa a 'criacao' + 15 dias como padrão inicial.
    let dataLimite;
    if (userDB.data_expiracao) {
        dataLimite = new Date(userDB.data_expiracao);
    } else {
        dataLimite = new Date(userDB.criacao);
        dataLimite.setDate(dataLimite.getDate() + DIAS_TRIAL);
    }

    return hoje <= dataLimite;
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
            
            // Define data de expiração inicial (Hoje + 15 dias)
            const expiraInicial = new Date();
            expiraInicial.setDate(expiraInicial.getDate() + DIAS_TRIAL);

            const novo = { 
                user: user, 
                pass: pass, 
                criacao: new Date().toISOString(), 
                data_expiracao: expiraInicial.toISOString(),
                status: "gratis" 
            };
            const { error: insErr } = await supabaseInstance.from(TABELA_USUARIOS).insert([novo]);
            if (insErr) throw insErr;
            alert(`Turma ${user.toUpperCase()} cadastrada! Você tem 15 dias grátis.`);
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
// 2. PAINEL DO DONO (ADMIN) - FUNÇÃO DE RENOVAÇÃO ADICIONADA
// ==========================================
async function renderizarUsuariosAdmin() {
    let { data: usuarios } = await supabaseInstance.from(TABELA_USUARIOS).select('*');
    const lista = document.getElementById('lista-usuarios-admin');
    const inputBusca = document.getElementById('busca-admin');
    const termo = inputBusca ? inputBusca.value.toLowerCase() : "";
    
    let contPagas = 0;
    let contGratis = 0;
    let contAtraso = 0;
    let lucroTotal = 0;
    
    lista.innerHTML = "";

    if(usuarios) {
        usuarios.forEach(u => {
            const hoje = new Date();
            const expira = u.data_expiracao ? new Date(u.data_expiracao) : new Date(new Date(u.criacao).getTime() + (DIAS_TRIAL * 24 * 60 * 60 * 1000));
            const expirado = hoje > expira;

            if (!expirado && u.status === 'pago') {
                contPagas++;
                lucroTotal += VALOR_MENSALIDADE;
            } else if (!expirado && u.status === 'gratis') {
                contGratis++;
            } else if (expirado) {
                contAtraso++;
            }

            if (u.user.toLowerCase().includes(termo)) {
                const corStatus = expirado ? 'var(--danger)' : (u.status === 'pago' ? 'var(--success)' : 'var(--primary)');
                lista.innerHTML += `
                    <div class="card-resumo" style="margin-bottom:10px; border-left: 6px solid ${corStatus}; display: flex; justify-content: space-between; align-items: center; background:#f9f9f9; padding:10px;">
                        <div>
                            <p style="margin:0; font-size:0.9rem;"><strong>${u.user.toUpperCase()}</strong></p>
                            <p style="font-size:0.7rem; color:#666;">Expira em: ${expira.toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button onclick="renovarTurma('${u.user}')" title="Renovar +30 Dias" style="background:var(--success); border:none; color:white; padding:5px 10px; border-radius:5px; cursor:pointer;">+30d</button>
                            <button onclick="deletarUsuarioAdmin('${u.user}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
                        </div>
                    </div>`;
            }
        });

        document.getElementById('master-total-turmas').innerText = usuarios.length;
        document.getElementById('master-faturamento').innerText = `R$ ${lucroTotal.toFixed(2)}`;
    }
}

// FUNÇÃO CHAVE: ADICIONA 30 DIAS À TURMA
async function renovarTurma(nomeTurma) {
    if(!confirm(`Deseja renovar a turma ${nomeTurma.toUpperCase()} por mais 30 dias?`)) return;

    // Calcula Hoje + 30 dias
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);

    const { error } = await supabaseInstance
        .from(TABELA_USUARIOS)
        .update({ 
            data_expiracao: novaData.toISOString(),
            status: 'pago' 
        })
        .eq('user', nomeTurma);

    if (error) {
        alert("Erro ao renovar!");
    } else {
        alert("Turma renovada com sucesso! 🤡👊");
        renderizarUsuariosAdmin();
    }
}

async function deletarUsuarioAdmin(nome) {
    if(confirm("Deseja realmente apagar esta turma permanentemente?")) {
        await supabaseInstance.from(TABELA_USUARIOS).delete().eq('user', nome);
        renderizarUsuariosAdmin();
    }
}

function acessarPainelDono() { 
    document.getElementById('painel-dono').style.display = 'block';
    if(!document.getElementById('busca-admin')){
        document.getElementById('lista-usuarios-admin').insertAdjacentHTML('beforebegin', '<input type="text" id="busca-admin" placeholder="🔍 Filtrar turmas..." onkeyup="renderizarUsuariosAdmin()" style="margin-bottom:10px; width:100%; padding:8px;">');
    }
    renderizarUsuariosAdmin(); 
}

function fecharPainelDono() { document.getElementById('painel-dono').style.display = 'none'; atualizarVisualizacao(); }

// ==========================================
// 3. LÓGICA DO APP (FINANCEIRO INTEGRAL) - TOTALMENTE PRESERVADA
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
        <li class="card-resumo" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:10px; border-top:none; border-left:4px solid var(--primary); text-align:left;">
            <span style="font-weight:bold;">✅ ${e.descricao}: R$ ${e.valor.toFixed(2)}</span>
            <button onclick="removerExtra('${e.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer; font-weight:bold; font-size:1.1rem;">❌</button>
        </li>`).join('');
    return rateio;
}

async function removerExtra(id) {
    if(confirm("Remover este custo extra?")) {
        await supabaseInstance.from('extras').delete().eq('id', id);
        await atualizarTabela();
    }
}

async function zerarTemporada() {
    if(!confirm("⚠️ ATENÇÃO: Isso vai zerar todos os pagamentos e excluir todos os custos extras da turma. Continuar?")) return;
    
    try {
        await supabaseInstance.from('extras').delete().eq('turma_id', usuarioLogado.user);
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
            }, index * 1000); 
        });
    }
}

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
                <td><strong style="color:var(--primary-dark)">${c.nome}</strong><br><small style="opacity:0.6;">F: R$ ${cTotal.toFixed(2)} | E: R$ ${rateio.toFixed(2)}</small></td>
                <td>R$ ${totalComRateio.toFixed(2)}</td>
                <td style="color:var(--success)">R$ ${cPago.toFixed(2)}</td>
                <td style="color:${saldo > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:bold;">R$ ${saldo.toFixed(2)}</td>
                <td>${c.vencimento.split('-').reverse().join('/')}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-acao-grande" onclick="registrarPagamento('${c.id}')">💸</button>
                        <button class="btn-acao-grande" onclick="cobrarWhatsApp('${c.id}', ${saldo})">📱</button>
                        <button class="btn-acao-grande" onclick="removerComponente('${c.id}')">❌</button>
                    </div>
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
    if(confirm("Remover este componente?")) { await supabaseInstance.from('componentes').delete().eq('id', id); await atualizarTabela(); }
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
