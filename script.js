// ==========================================
// CONFIGURAÇÕES DO SUPABASE
// ==========================================
const SUPABASE_URL = 'https://ovrkpnusgulvkjtnhcsr.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92cmtwbnVzZ3VsdmtqdG5oY3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODI2NTEsImV4cCI6MjA4NjE1ODY1MX0.EF4opjkiJfSi4Nr3M4DDTvhZnM8itILurG_OTLw_q-I'; 

const supabaseInstance = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const TABELA_USUARIOS = 'batecontroleusers'; 

// ==========================================
// CONFIGURAÇÕES DE VENDA E NOTIFICAÇÃO
// ==========================================
const DIAS_TRIAL = 15; 
const VALOR_MENSALIDADE = 39.90; 
const MEU_PIX = "caio.programador10@gmail.com"; 
const WHATSAPP_DONO = "5521985072328"; 

const TELEGRAM_TOKEN = "8646880823:AAG8F1oClLVjqrH4PggfqYeevpaaq2RxyeI"; 
const TELEGRAM_CHAT_ID = "6924491541"; 

// FUNÇÃO GLOBAL DE NOTIFICAÇÃO
async function enviarNotificacaoTelegram(mensagem) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: mensagem, parse_mode: 'Markdown' })
        });
    } catch (e) { console.error("Erro Telegram:", e); }
}

// ==========================================
// 1. SISTEMA DE LOGIN, CADASTRO E ASSINATURA
// ==========================================
let usuarioLogado = JSON.parse(localStorage.getItem('bateControleSessao')) || null;
let modoCadastro = false;

async function checarWhatsAppPendente() {
    if (usuarioLogado && usuarioLogado.user !== "caio" && !usuarioLogado.whatsapp) {
        const numero = prompt("Olá! Seu WhatsApp não está cadastrado. Digite seu número com DDD (ex: 21988887777):");
        if (numero && numero.length >= 10) {
            const { error } = await supabaseInstance
                .from(TABELA_USUARIOS)
                .update({ whatsapp: numero })
                .eq('user', usuarioLogado.user);

            if (!error) {
                usuarioLogado.whatsapp = numero;
                localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));
                alert("WhatsApp atualizado! 🤡👊");
                enviarNotificacaoTelegram(`📱 *ZAP ATUALIZADO*\n👤 Turma: ${usuarioLogado.user.toUpperCase()}\n✅ Número: ${numero}`);
            }
        }
    }
}

async function atualizarVisualizacao() {
    const loginContainer = document.getElementById('login-container');
    const appContent = document.getElementById('app-content');
    const bloqueioAssinatura = document.getElementById('bloqueio-assinatura');

    if (usuarioLogado) {
        if (usuarioLogado.user === "caio") {
            loginContainer.style.display = 'none';
            appContent.style.display = 'block';
            if(bloqueioAssinatura) bloqueioAssinatura.style.display = 'none';
            await atualizarTabela();
            return;
        }

        const acessoValido = await verificarStatusAssinatura();

        if (!acessoValido) {
            loginContainer.style.display = 'none';
            appContent.style.display = 'none';
            if(bloqueioAssinatura) bloqueioAssinatura.style.display = 'flex'; 
            return;
        }
        
        await checarWhatsAppPendente();
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

async function verificarStatusAssinatura() {
    let { data: userDB, error } = await supabaseInstance
        .from(TABELA_USUARIOS)
        .select('*')
        .eq('user', usuarioLogado.user)
        .single();

    if (error || !userDB) return false;

    usuarioLogado = userDB;
    localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));

    const hoje = new Date();
    let dataLimite = userDB.data_expiracao ? new Date(userDB.data_expiracao) : new Date(new Date(userDB.criacao).setDate(new Date(userDB.criacao).getDate() + DIAS_TRIAL));

    return hoje <= dataLimite;
}

async function executarAcaoPrincipal() {
    const user = document.getElementById('usuario').value.trim().toLowerCase();
    const pass = document.getElementById('senha').value.trim();
    const whatsappLider = document.getElementById('whatsapp_lider') ? document.getElementById('whatsapp_lider').value.trim() : "";
    
    const rdbSim = document.querySelector('input[name="foi_indicado"][value="sim"]');
    const idIndicador = document.getElementById('id_indicador') ? document.getElementById('id_indicador').value.trim() : "";
    const valorIndicacao = (rdbSim && rdbSim.checked) ? (idIndicador || "Sim (Sem ID)") : "Nenhum";

    if (!user || !pass) return alert("Preencha tudo!");
    if (modoCadastro && !whatsappLider) return alert("Informe o WhatsApp do responsável!");

    if (user === "caio" && pass === "caio1010") {
        usuarioLogado = { user: "caio", status: "admin" };
        localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));
        acessarPainelDono();
        return;
    }

    try {
        if (modoCadastro) {
            let { data: exist } = await supabaseInstance.from(TABELA_USUARIOS).select('user').eq('user', user).single();
            if (exist) return alert("Essa turma já existe!");
            
            const expiraInicial = new Date();
            expiraInicial.setDate(expiraInicial.getDate() + DIAS_TRIAL);

            const novo = { 
                user: user, pass: pass, whatsapp: whatsappLider,
                indicado_por: valorIndicacao,
                criacao: new Date().toISOString(), 
                data_expiracao: expiraInicial.toISOString(), status: "gratis" 
            };
            const { error: insErr } = await supabaseInstance.from(TABELA_USUARIOS).insert([novo]);
            if (insErr) throw insErr;

            // --- LÓGICA DE METAS DE DESCONTO (5 = 50% | 10 = 100%) ---
            let alertaMeta = "";
            if (valorIndicacao !== "Nenhum" && valorIndicacao !== "Sim (Sem ID)") {
                // Conta quantas turmas esse ID já indicou
                const { count, error: countErr } = await supabaseInstance
                    .from(TABELA_USUARIOS)
                    .select('*', { count: 'exact', head: true })
                    .eq('indicado_por', valorIndicacao);

                if (!countErr) {
                    if (count === 5) {
                        alertaMeta = `\n\n🎯 *META DE 5 ATINGIDA!* \nO padrinho *${valorIndicacao.toUpperCase()}* ganhou *50% DE DESCONTO*! 💸`;
                    } else if (count === 10) {
                        alertaMeta = `\n\n🔥 *META DE 10 ATINGIDA!* \nO padrinho *${valorIndicacao.toUpperCase()}* ganhou *100% DE DESCONTO (GRÁTIS)*! 🏆`;
                    } else {
                        alertaMeta = `\n(Total do padrinho: ${count} indicações)`;
                    }
                }
            }

            enviarNotificacaoTelegram(`🎭 *NOVA TURMA CADASTRADA!*\n👑 Turma: ${user.toUpperCase()}\n📱 Whats: ${whatsappLider}\n🎁 Indicação: ${valorIndicacao}${alertaMeta}\n📅 Expira em: ${expiraInicial.toLocaleDateString()}`);
            
            alert(`Turma ${user.toUpperCase()} cadastrada! 15 dias grátis.`);
            location.reload(); 
        } else {
            let { data: valid } = await supabaseInstance.from(TABELA_USUARIOS).select('*').eq('user', user).eq('pass', pass).single();
            if (valid) {
                usuarioLogado = valid;
                localStorage.setItem('bateControleSessao', JSON.stringify(usuarioLogado));
                atualizarVisualizacao();
            } else { alert("Dados incorretos!"); }
        }
    } catch (e) { alert("Erro no banco."); }
}

// ==========================================
// 2. PAINEL DO DONO (ADMIN) - ATUALIZADO CAIO
// ==========================================
async function renderizarUsuariosAdmin() {
    let { data: usuarios } = await supabaseInstance.from(TABELA_USUARIOS).select('*');
    const lista = document.getElementById('lista-usuarios-admin');
    const inputBusca = document.getElementById('busca-admin');
    const termo = inputBusca ? inputBusca.value.toLowerCase() : "";
    let lucroTotal = 0;
    lista.innerHTML = "";

    if(usuarios) {
        usuarios.forEach(u => {
            const hoje = new Date();
            const expira = u.data_expiracao ? new Date(u.data_expiracao) : new Date(new Date(u.criacao).getTime() + (DIAS_TRIAL * 24 * 60 * 60 * 1000));
            const expirado = hoje > expira;
            
            if (!expirado && u.status === 'pago') lucroTotal += VALOR_MENSALIDADE;

            if (u.user.toLowerCase().includes(termo)) {
                const corStatus = expirado ? 'var(--danger)' : (u.status === 'pago' ? 'var(--success)' : 'var(--primary)');
                
                // Visual Aprimorado para o seu controle visual total
                lista.innerHTML += `
                    <div class="card-resumo" style="margin-bottom:12px; border-left: 6px solid ${corStatus}; background:#fff; padding:15px; border-radius:12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <div style="display:flex; justify-content: space-between; align-items: flex-start; width:100%;">
                            <div style="flex:1;">
                                <p style="margin:0; font-size:1rem; color: #333;"><strong>${u.user.toUpperCase()}</strong></p>
                                <p style="font-size:0.75rem; color:#25D366; font-weight:bold; margin: 4px 0;">📱 WhatsApp: ${u.whatsapp || 'Não informado'}</p>
                                <p style="font-size:0.75rem; color:#666; margin: 2px 0;">🤝 Indicado por: <span style="color:var(--primary-dark); font-weight:bold;">${u.indicado_por || 'Direto'}</span></p>
                                <p style="font-size:0.7rem; color:#888;">📅 Expira: ${expira.toLocaleDateString('pt-BR')} ${expirado ? '⚠️' : '✅'}</p>
                            </div>
                            <div style="display:flex; flex-direction: column; gap:8px;">
                                <div style="display:flex; gap:5px;">
                                    <button onclick="falarComLider('${u.whatsapp}')" style="background:#25D366; border:none; color:white; width:35px; height:35px; border-radius:8px; cursor:pointer; font-size:1rem;">📱</button>
                                    <button onclick="renovarTurma('${u.user}')" style="background:var(--success); border:none; color:white; padding:0 10px; height:35px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:0.7rem;">+30d</button>
                                    <button onclick="deletarUsuarioAdmin('${u.user}')" style="background:#f1f1f1; border:none; width:35px; height:35px; border-radius:8px; cursor:pointer; font-size:0.9rem;">🗑️</button>
                                </div>
                                <span style="font-size:0.6rem; text-align:center; font-weight:bold; color:${corStatus}">${u.status === 'pago' ? 'ASSINANTE' : (expirado ? 'BLOQUEADO' : 'TRIAL')}</span>
                            </div>
                        </div>
                    </div>`;
            }
        });
        document.getElementById('master-total-turmas').innerText = usuarios.length;
        document.getElementById('master-faturamento').innerText = `R$ ${lucroTotal.toFixed(2)}`;
    }
}

function falarComLider(numero) {
    if(!numero) return alert("Sem WhatsApp cadastrado!");
    const numLimpo = numero.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=55${numLimpo}&text=Olá! Aqui é o Caio do Bate-Controle. 🤡`, '_blank');
}

async function renovarTurma(nomeTurma) {
    if(!confirm(`Confirmar pagamento e renovar ${nomeTurma.toUpperCase()} por 30 dias?`)) return;
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);
    const { error } = await supabaseInstance.from(TABELA_USUARIOS).update({ data_expiracao: novaData.toISOString(), status: 'pago' }).eq('user', nomeTurma);
    if (!error) { 
        enviarNotificacaoTelegram(`💰 *PAGAMENTO CONFIRMADO!*\n👑 Turma: ${nomeTurma.toUpperCase()}\n📅 Nova Expiração: ${novaData.toLocaleDateString()}`);
        alert("Renovado com sucesso! 🤡👊"); 
        renderizarUsuariosAdmin(); 
    }
}

async function deletarUsuarioAdmin(nome) {
    if(confirm(`ATENÇÃO: Deseja apagar a turma ${nome.toUpperCase()} permanentemente?`)) { 
        await supabaseInstance.from(TABELA_USUARIOS).delete().eq('user', nome); 
        enviarNotificacaoTelegram(`🗑️ *TURMA DELETADA*\n👤 Nome: ${nome.toUpperCase()}`);
        renderizarUsuariosAdmin(); 
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
    const nome = document.getElementById('nome').value, valor = parseFloat(document.getElementById('valorTotal').value), tel = document.getElementById('telefone').value.replace(/\D/g, ''), data = document.getElementById('dataVencimento').value;
    if (nome && !isNaN(valor) && tel && data) {
        await supabaseInstance.from('componentes').insert([{ turma_id: usuarioLogado.user, nome, valor_total: valor, valor_pago: 0, telefone: tel, vencimento: data }]);
        document.getElementById('nome').value = ''; document.getElementById('valorTotal').value = ''; document.getElementById('telefone').value = '';
        await atualizarTabela();
    }
}

async function adicionarCustoExtra() {
    const desc = document.getElementById('descExtra').value, valor = parseFloat(document.getElementById('valorExtra').value);
    if (desc && !isNaN(valor)) {
        await supabaseInstance.from('extras').insert([{ turma_id: usuarioLogado.user, descricao: desc, valor: valor }]);
        document.getElementById('descExtra').value = ''; document.getElementById('valorExtra').value = '';
        await atualizarTabela();
    }
}

function atualizarResumo() {
    let pago = 0, metaFanta = 0, totalExtras = custosExtras.reduce((sum, e) => sum + e.valor, 0);
    componentes.forEach(c => { metaFanta += (c.valor_total || 0); pago += (c.valor_pago || 0); });
    const rateio = componentes.length > 0 ? (totalExtras / componentes.length) : 0;
    
    document.getElementById('total-componentes').innerText = componentes.length;
    document.getElementById('meta-total').innerText = `R$ ${(metaFanta + totalExtras).toFixed(2)}`;
    document.getElementById('total-pago').innerText = `R$ ${pago.toFixed(2)}`;
    document.getElementById('total-devedor').innerText = `R$ ${(metaFanta + totalExtras - pago).toFixed(2)}`;
    document.getElementById('valorExtraPorPessoa').innerText = `R$ ${rateio.toFixed(2)}`;
    
    document.getElementById('listaExtras').innerHTML = custosExtras.map(e => `
        <li class="card-resumo" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:10px; border-left:4px solid var(--primary); text-align:left;">
            <span style="font-weight:bold;">✅ ${e.descricao}: R$ ${e.valor.toFixed(2)}</span>
            <button onclick="removerExtra('${e.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer;">❌</button>
        </li>`).join('');
    return rateio;
}

async function atualizarTabela() {
    await carregarDadosUsuario();
    await carregarGastosManuais();
    const rateio = atualizarResumo();
    const corpo = document.getElementById('corpoTabela');
    if(!corpo) return;
    const busca = (document.getElementById('buscaNome') ? document.getElementById('buscaNome').value : "").toLowerCase();
    corpo.innerHTML = '';

    componentes.forEach(c => {
        const totalComRateio = (c.valor_total || 0) + rateio;
        const saldo = totalComRateio - (c.valor_pago || 0);
        if (busca && !c.nome.toLowerCase().includes(busca)) return;

        const hoje = new Date().setHours(0,0,0,0);
        const venc = new Date(c.vencimento + 'T00:00:00');
        const atrasado = (saldo > 0 && venc < hoje);

        if (filtroAtual === 'atrasado' && !atrasado) return;
        if (filtroAtual === 'em-dia' && atrasado) return;

        corpo.innerHTML += `
            <tr class="${atrasado ? 'bg-atrasado' : 'bg-ok'}">
                <td><strong>${c.nome}</strong><br><small>F: R$ ${c.valor_total.toFixed(2)} | E: R$ ${rateio.toFixed(2)}</small></td>
                <td>R$ ${totalComRateio.toFixed(2)}</td>
                <td style="color:var(--success)">R$ ${c.valor_pago.toFixed(2)}</td>
                <td style="color:${saldo > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:bold;">R$ ${saldo.toFixed(2)}</td>
                <td>${c.vencimento.split('-').reverse().join('/')}</td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-acao-grande" onclick="registrarPagamento('${c.id}')">💸</button>
                        <button class="btn-acao-grande" onclick="editarValorFantasia('${c.id}')">✏️</button>
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
    let dataObj = new Date(comp.vencimento + 'T12:00:00'); 
    dataObj.setMonth(dataObj.getMonth() + 1);
    await supabaseInstance.from('componentes').update({ valor_pago: (comp.valor_pago || 0) + v, vencimento: dataObj.toISOString().split('T')[0] }).eq('id', id);
    await atualizarTabela();
}

function cobrarWhatsApp(id, saldo) {
    const c = componentes.find(x => x.id == id);
    const msg = `Olá *${c.nome}*! 🤡%0ASaldo Devedor: *R$ ${saldo.toFixed(2)}*`;
    window.open(`https://api.whatsapp.com/send?phone=55${c.telefone}&text=${msg}`, '_blank');
}

async function avisarVencimentosAmanha() {
    const amanha = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
    const rateio = atualizarResumo();
    const avisados = componentes.filter(c => c.vencimento === amanha && ((c.valor_total + rateio) - c.valor_pago) > 0.1);
    if (avisados.length === 0) return alert("Ninguém vence amanhã!");

    if(confirm(`Avisar ${avisados.length} pessoas?`)) {
        avisados.forEach((c, index) => {
            setTimeout(() => {
                const saldo = ((c.valor_total || 0) + rateio - (c.valor_pago || 0)).toFixed(2);
                const msg = `Olá *${c.nome}*! 🤡%0AVence AMANHÃ! Valor: *R$ ${saldo}*`;
                window.open(`https://api.whatsapp.com/send?phone=55${c.telefone}&text=${msg}`, '_blank');
            }, index * 3000); 
        });
    }
}

async function zerarTemporada() {
    if(!confirm("⚠️ Deseja zerar os pagamentos e custos extras da temporada?")) return;
    await supabaseInstance.from('extras').delete().eq('turma_id', usuarioLogado.user);
    await supabaseInstance.from('componentes').update({ valor_pago: 0 }).eq('turma_id', usuarioLogado.user);
    await supabaseInstance.from('gastos_manuais').delete().eq('turma_id', usuarioLogado.user);
    alert("Temporada zerada! 🤡"); await atualizarTabela();
}

async function carregarGastosManuais() {
    if(!usuarioLogado) return;
    const { data: gastos } = await supabaseInstance.from('gastos_manuais').select('*').eq('turma_id', usuarioLogado.user);
    const lista = document.getElementById('lista-gastos-manuais');
    if (!lista) return;
    document.getElementById('total-gastos-manuais').innerText = (gastos || []).reduce((acc, g) => acc + (g.valor || 0), 0).toFixed(2);
    lista.innerHTML = (gastos || []).map(g => `<div class="card-resumo" style="margin-bottom:8px; border-left:4px solid var(--primary-dark); padding:10px; background: #fff;"><strong>🛍️ ${g.item.toUpperCase()}</strong><br>R$ ${g.valor.toFixed(2)} - Resp: ${g.responsavel} <button onclick="removerGastoManual('${g.id}')" style="float:right; border:none; background:none; color:var(--danger);">🗑️</button></div>`).join('');
}

async function adicionarGastoManual() {
    const item = document.getElementById('gasto-item').value, valor = parseFloat(document.getElementById('gasto-valor').value), responsavel = document.getElementById('gasto-delegado').value;
    if (!item || isNaN(valor) || !responsavel) return alert("Preencha tudo!");
    await supabaseInstance.from('gastos_manuais').insert([{ turma_id: usuarioLogado.user, item, valor, responsavel }]);
    document.getElementById('gasto-item').value = ''; document.getElementById('gasto-valor').value = ''; document.getElementById('gasto-delegado').value = '';
    await carregarGastosManuais();
}

async function removerGastoManual(id) {
    if(confirm("Apagar gasto?")) { await supabaseInstance.from('gastos_manuais').delete().eq('id', id); await carregarGastosManuais(); }
}

async function editarValorFantasia(id) {
    const comp = componentes.find(x => x.id == id);
    const novo = parseFloat(prompt(`Novo valor para ${comp.nome}:`, comp.valor_total));
    if (!isNaN(novo)) { await supabaseInstance.from('componentes').update({ valor_total: novo }).eq('id', id); await atualizarTabela(); }
}

async function editarValorGlobal() {
    const novo = parseFloat(prompt("Novo valor global da fantasia:"));
    if (!isNaN(novo) && confirm("Alterar o valor de fantasia de TODOS os componentes?")) { 
        await supabaseInstance.from('componentes').update({ valor_total: novo }).eq('turma_id', usuarioLogado.user); 
        await atualizarTabela(); 
    }
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

function alternarTelaLogin() { 
    modoCadastro = !modoCadastro; 
    document.getElementById('login-titulo').innerText = modoCadastro ? "NOVA TURMA 🎭" : "BATE-LOGIN 🤡"; 
    
    const zapInput = document.getElementById('whatsapp_lider');
    const secaoIndica = document.getElementById('secao-indicacao-cadastro');

    if (modoCadastro) {
        if (zapInput) zapInput.style.display = 'block';
        if (secaoIndica) secaoIndica.style.display = 'block';
    } else {
        if (zapInput) zapInput.style.display = 'none';
        if (secaoIndica) secaoIndica.style.display = 'none';
    }
}

async function removerComponente(id) {
    if(confirm("Deseja realmente remover este componente?")) {
        await supabaseInstance.from('componentes').delete().eq('id', id);
        await atualizarTabela();
    }
}

async function removerExtra(id) {
    if(confirm("Remover este custo extra?")) {
        await supabaseInstance.from('extras').delete().eq('id', id);
        await atualizarTabela();
    }
}

window.onload = atualizarVisualizacao;
