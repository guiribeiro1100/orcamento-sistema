<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<title>Painel</title>

<style>
body {
    font-family: Arial;
    background: #eef2f7;
    padding: 20px;
}

h2 {
    text-align: center;
    margin-bottom: 10px;
}

.topo {
    max-width: 900px;
    margin: auto;
    margin-bottom: 20px;
}

.search {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #ccc;
}

.card {
    max-width: 900px;
    margin: auto;
    background: white;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.status {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    color: white;
}

.novo {
    background: #f59e0b;
}

.respondido {
    background: #10b981;
}

.grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
}

.bloco {
    background: #f9fafb;
    padding: 10px;
    border-radius: 6px;
}

textarea {
    width: 100%;
    margin-top: 10px;
    padding: 8px;
    border-radius: 6px;
    border: 1px solid #ccc;
}

.actions {
    margin-top: 10px;
    display: flex;
    gap: 10px;
}

button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    color: white;
}

.responder { background: #2563eb; }
.marcar { background: #10b981; }
.voltar { background: #f59e0b; }

.pdf {
    background: #111827;
    color: white;
    text-align: center;
    padding: 10px;
    border-radius: 6px;
    text-decoration: none;
    display: block;
    margin-top: 10px;
}
</style>
</head>

<body>

<h2>📊 Painel de Orçamentos</h2>

<div class="topo">
    <input type="text" id="busca" class="search" placeholder="🔎 Buscar por cliente, empresa ou máquina...">
</div>

<div id="lista"></div>

<script>
let dadosGlobais = [];

async function carregar() {
    const res = await fetch('/orcamentos');
    dadosGlobais = await res.json();
    renderizar(dadosGlobais.reverse());
}

function renderizar(dados) {
    const lista = document.getElementById('lista');
    lista.innerHTML = '';

    dados.forEach(item => {

        let detalhes = '';

        if (item.tipo_produto === 'disco') {
            detalhes = `
                Diâmetro ext: ${item.diametro_externo || '-'}<br>
                Diâmetro int: ${item.diametro_interno || '-'}<br>
                Fio: ${item.tipo_fio || '-'}
            `;
        }

        if (item.tipo_produto === 'lamina') {
            detalhes = `
                Largura: ${item.largura || '-'}<br>
                Comprimento: ${item.comprimento || '-'}<br>
                Espessura: ${item.espessura || '-'}
            `;
        }

        if (item.tipo_produto === 'usinagem') {
            detalhes = `Medidas: ${item.medidas_usinagem || '-'}`;
        }

        lista.innerHTML += `
            <div class="card">

                <div class="header">
                    <h3>${item.cliente_cargo || 'Sem nome'} • ${item.tipo_produto}</h3>
                    <span class="status ${item.status}">
                        ${item.status}
                    </span>
                </div>

                <div class="grid">

                    <div class="bloco">
                        <b>Empresa:</b> ${item.empresa_local || '-'} <br>
                        <b>Telefone:</b> ${item.telefone || '-'} <br>
                        <b>Email:</b> ${item.email || '-'} <br>
                        <b>Vendedor:</b> ${item.vendedor || '-'} <br>
                    </div>

                    <div class="bloco">
                        <b>Material:</b> ${item.material_tipo || '-'} <br>
                        <b>Quantidade:</b> ${item.quantidade || '-'} <br>
                        <b>Máquina:</b> ${item.nome_maquina || '-'} <br>
                        <b>Código:</b> ${item.codigo_original || '-'} <br>
                    </div>

                </div>

                <div class="bloco">
                    ${detalhes}
                </div>

                ${item.foto ? `<img src="${item.foto}" style="max-width:150px;margin-top:10px;border-radius:8px;">` : ''}

                <textarea id="resposta-${item.id}" placeholder="Digite a resposta...">${item.resposta || ''}</textarea>

                <div class="actions">
                    <button class="responder" onclick="responder(${item.id})">
                        Salvar resposta
                    </button>

                    <button class="marcar" onclick="mudarStatus(${item.id}, 'respondido')">
                        Respondido
                    </button>

                    <button class="voltar" onclick="mudarStatus(${item.id}, 'novo')">
                        Novo
                    </button>
                </div>

                <a class="pdf" href="/orcamento/${item.id}/pdf" target="_blank">
                    📄 Gerar PDF
                </a>

            </div>
        `;
    });
}

// 🔎 BUSCA INTELIGENTE
document.getElementById('busca').addEventListener('input', (e) => {
    const valor = e.target.value.toLowerCase();

    const filtrado = dadosGlobais.filter(item =>
        (item.cliente_cargo || '').toLowerCase().includes(valor) ||
        (item.empresa_local || '').toLowerCase().includes(valor) ||
        (item.nome_maquina || '').toLowerCase().includes(valor)
    );

    renderizar(filtrado.reverse());
});

async function responder(id) {
    const texto = document.getElementById('resposta-' + id).value;

    await fetch('/responder/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resposta: texto })
    });

    alert('Resposta salva!');
    carregar();
}

async function mudarStatus(id, status) {
    await fetch('/status/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });

    carregar();
}

carregar();
</script>

</body>
</html>