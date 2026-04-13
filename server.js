const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// arquivos estáticos
app.use(express.static(path.join(__dirname)));

let orcamentos = [];

// 📦 criar orçamento
app.post('/orcamento', (req, res) => {

    // 🔥 NOVO: obrigatório
    if (!req.body.marca_referencia || req.body.marca_referencia.trim() === '') {
        return res.status(400).send({
            ok: false,
            error: 'Marca / Referência é obrigatória'
        });
    }

    orcamentos.push({
        ...req.body,
        id: Date.now(),
        status: 'novo',
        marca_referencia: req.body.marca_referencia,
        historico: []
    });

    res.send({ ok: true });
});

// 📦 listar orçamentos
app.get('/orcamentos', (req, res) => {
    res.json(orcamentos);
});

// 💬 responder orçamento
app.post('/responder/:id', (req, res) => {
    const item = orcamentos.find(o => o.id == req.params.id);

    if (item) {
        item.resposta = req.body.resposta;
        item.status = 'respondido';

        item.historico.push({
            resposta: req.body.resposta,
            data: new Date().toLocaleString()
        });
    }

    res.send({ ok: true });
});

// 📄 rotas html
app.get('/painel.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'painel.html'));
});

app.get('/form.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

// 🚀 server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Rodando na porta ' + PORT);
});