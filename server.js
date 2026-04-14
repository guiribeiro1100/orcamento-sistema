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
    margin-bottom: 20px;
}

.card {
    background: white;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.status {
    padding: 5px 10px;
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

.info {
    margin-top: 10px;
    line-height: 1.6;
}

.detalhes {
    margin-top: 10px;
    background: #f9fafb;
    padding: 10px;
    border-radius: 6px;
}

img {
    margin-top: 10px;
    border-radius: 8px;
    max-width: 150px;
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
}

.responder {
    background: #2563eb;
    color: white;
}

.pdf {
    background: #111827;
    color: white;
    text-align: center;
    padding: 10px;
    border-radius: 6px;
    text-decoration: none;
    display: inline-block;
    flex: 1;
}
</style>
</head>

<body>

<h2>📊 Painel de Orçamentos</h2>

<div id="lista"></div>

<script>
async function carregar() {
    const res = await fetch('/orcamentos');
    const dados = await res.json();

    const lista = document.getElementById('lista');
    lista.innerHTML = '';

    dados.reverse().forEach(item => {

        let detalhes = '';

        if (item.tipo_produto === 'disco') {
            detalhes = `
                🔵 Diâmetro ext: ${item.diametro_externo || '-'}<br>
                🔵 Diâmetro int: ${item.diametro_interno || '-'}<br>
                🔵 Fio: ${item.tipo_fio || '-'}
            `;
        }

        if (item.tipo_produto === 'lamina') {
            detalhes = `
                📏 Largura: ${item.largura || '-'}<br>
                📏 Comprimento: ${item.comprimento || '-'}<br>
                📏 Espessura: ${item.espessura || '-'}
            `;
        }

        if (item.tipo_produto === 'usinagem') {
            detalhes = `⚙️ Medidas: ${item.medidas_usinagem || '-'}`;
        }

        lista.innerHTML += `
            <div class="card">

                <div class="header">
                    <h3>${item.cliente_cargo || 'Sem nome'} • ${item.tipo_produto}</h3>
                    <span class="status ${item.status}">
                        ${item.status}
                    </span>
                </div>

                <div class="info">
                    <b>Empresa:</b> ${item.empresa_local || '-'} <br>
                    <b>Telefone:</b> ${item.telefone || '-'} <br>
                    <b>Email:</b> ${item.email || '-'} <br>
                    <b>Vendedor:</b> ${item.vendedor || '-'} <br>
                    <b>Aplicação:</b> ${item.aplicacao || '-'} <br>

                    <b>Material:</b> ${item.material_tipo || '-'} <br>
                    <b>Quantidade:</b> ${item.quantidade || '-'} <br>
                    <b>Máquina:</b> ${item.nome_maquina || '-'} <br>
                    <b>Código:</b> ${item.codigo_original || '-'} <br>
                </div>

                <div class="detalhes">
                    ${detalhes}
                </div>

                ${item.foto ? `<img src="${item.foto}">` : ''}

                <textarea id="resposta-${item.id}" placeholder="Digite a resposta..."></textarea>

                <div class="actions">
                    <button class="responder" onclick="responder(${item.id})">
                        Responder
                    </button>

                    <a class="pdf" href="/orcamento/${item.id}/pdf" target="_blank">
                        📄 PDF
                    </a>
                </div>

            </div>
        `;
    });
}

async function responder(id) {
    const texto = document.getElementById('resposta-' + id).value;

    await fetch('/responder/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resposta: texto })
    });

    alert('Resposta enviada!');
    carregar();
}

carregar();
</script>

</body>
</html>