const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// UPLOAD
// =========================

const uploadPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadPath));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// =========================
// BANCO JSON
// =========================

const DB_FILE = path.join(__dirname, 'data.json');

function readDB() {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// =========================
// ROTAS HTML
// =========================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'form.html')));
app.get('/painel.html', (req, res) => res.sendFile(path.join(__dirname, 'painel.html')));

// =========================
// CRIAR ORÇAMENTO
// =========================

app.post('/orcamento', upload.single('foto'), (req, res) => {

    const db = readDB();
    const b = req.body;

    const novo = {
        id: Date.now(),

        // CLIENTE
        empresa_local: b.empresa_local || '',
        cliente_cargo: b.cliente_cargo || '',
        email: b.email || '',
        telefone: b.telefone || '',
        vendedor: b.vendedor || '',

        // NOVOS CAMPOS
        material_tipo: b.material_tipo || '',
        quantidade: b.quantidade || '',
        nome_maquina: b.nome_maquina || '',
        codigo_original: b.codigo_original || '',

        // PRODUTO
        tipo_produto: b.tipo_produto || '',

        // DISCO
        diametro_externo: b.diametro_externo || '',
        diametro_interno: b.diametro_interno || '',
        tipo_fio: b.tipo_fio || '',
        tipo_fio_desc: b.tipo_fio_desc || '',
        obs_disco: b.obs_disco || '',

        // LÂMINA
        largura: b.largura || '',
        comprimento: b.comprimento || '',
        espessura: b.espessura || '',
        obs_lamina: b.obs_lamina || '',

        // USINAGEM
        medidas_usinagem: b.medidas_usinagem || '',

        // APLICAÇÃO
        aplicacao: b.aplicacao || '',

        // FOTO
        foto: req.file ? '/uploads/' + req.file.filename : null,

        // CONTROLE
        status: 'novo',
        resposta: '',
        historico: [],
        data: new Date().toLocaleString()
    };

    db.push(novo);
    saveDB(db);

    res.send({ ok: true });
});

// =========================
// LISTAR
// =========================

app.get('/orcamentos', (req, res) => {
    res.json(readDB());
});

// =========================
// RESPONDER
// =========================

app.post('/responder/:id', (req, res) => {

    const db = readDB();
    const item = db.find(o => o.id == req.params.id);

    if (item) {
        item.resposta = req.body.resposta;
        item.status = 'respondido';

        item.historico.push({
            resposta: req.body.resposta,
            data: new Date().toLocaleString()
        });

        saveDB(db);
    }

    res.send({ ok: true });
});

// =========================
// STATUS
// =========================

app.post('/status/:id', (req, res) => {

    const db = readDB();
    const item = db.find(o => o.id == req.params.id);

    if (item) {
        item.status = req.body.status;
        saveDB(db);
    }

    res.send({ ok: true });
});

// =========================
// PDF
// =========================

app.get('/orcamento/:id/pdf', (req, res) => {

    const db = readDB();
    const item = db.find(o => o.id == req.params.id);

    if (!item) return res.status(404).send('Não encontrado');

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=orcamento-${item.id}.pdf`);

    doc.pipe(res);

    doc.fontSize(18).text('ORÇAMENTO TÉCNICO', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Cliente: ${item.cliente_cargo}`);
    doc.text(`Empresa: ${item.empresa_local}`);
    doc.text(`Email: ${item.email}`);
    doc.text(`Telefone: ${item.telefone}`);
    doc.text(`Vendedor: ${item.vendedor}`);
    doc.moveDown();

    doc.text(`Material: ${item.material_tipo}`);
    doc.text(`Quantidade: ${item.quantidade}`);
    doc.text(`Máquina: ${item.nome_maquina}`);
    doc.text(`Código: ${item.codigo_original}`);
    doc.moveDown();

    doc.text(`Tipo: ${item.tipo_produto}`);

    if (item.tipo_produto === 'disco') {
        doc.text(`Diâmetro externo: ${item.diametro_externo}`);
        doc.text(`Diâmetro interno: ${item.diametro_interno}`);
        doc.text(`Fio: ${item.tipo_fio}`);
    }

    if (item.tipo_produto === 'lamina') {
        doc.text(`Largura: ${item.largura}`);
        doc.text(`Comprimento: ${item.comprimento}`);
        doc.text(`Espessura: ${item.espessura}`);
    }

    if (item.tipo_produto === 'usinagem') {
        doc.text(`Medidas: ${item.medidas_usinagem}`);
    }

    doc.moveDown();

    doc.text('Resposta:');
    doc.text(item.resposta || 'Ainda não respondido');

    doc.end();
});

// =========================
// START
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Rodando na porta ' + PORT);
});