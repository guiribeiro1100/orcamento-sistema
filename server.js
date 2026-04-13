const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const app = express();

app.use(cors());
app.use(express.json());

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
app.get('/form.html', (req, res) => res.sendFile(path.join(__dirname, 'form.html')));
app.get('/painel.html', (req, res) => res.sendFile(path.join(__dirname, 'painel.html')));

// =========================
// CRIAR ORÇAMENTO
// =========================

app.post('/orcamento', upload.single('foto'), (req, res) => {

    const db = readDB();
    const b = req.body;

    const novo = {
        id: Date.now(),

        cliente_cargo: b.cliente_cargo || '',
        empresa_local: b.empresa_local || '',
        email: b.email || '',
        telefone: b.telefone || '',
        vendedor: b.vendedor || '',

        aplicacao: b.aplicacao || '',
        material: b.material || '',
        diametro: b.diametro || '',
        espessura: b.espessura || '',




        tipo_furo: b.tipo_furo || '',
        d1: b.d1 || '',
        s1: b.s1 || '',
        d2: b.d2 || '',
        dmin: b.dmin || '',
        s2: b.s2 || '',
        c1: b.c1 || '',

        tipo_fio: b.tipo_fio || '',
        da: b.da || '',
        df: b.df || '',

        perfil_corte: b.perfil_corte || '',
        largura: b.largura || '',
        comprimento: b.comprimento || '',

        foto: req.file ? '/uploads/' + req.file.filename : null,

        status: 'novo',
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
        item.historico.push({
            resposta: req.body.resposta,
            data: new Date().toLocaleString()
        });

        item.status = 'respondido';
    }

    saveDB(db);

    res.send({ ok: true });
});

// =========================
// PDF PROFISSIONAL
// =========================

app.get('/orcamento/:id/pdf', (req, res) => {

    const db = readDB();
    const item = db.find(o => o.id == req.params.id);

    if (!item) return res.status(404).send('Não encontrado');

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=orcamento-${item.id}.pdf`);

    doc.pipe(res);

    doc.fontSize(18).text('ORÇAMENTO TÉCNICO', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Cliente: ${item.cliente_cargo}`);
    doc.text(`Empresa: ${item.empresa_local}`);
    doc.text(`Email: ${item.email}`);
    doc.text(`Telefone: ${item.telefone}`);
    doc.text(`Vendedor: ${item.vendedor}`);
    doc.moveDown();

    doc.fontSize(14).text('ESPECIFICAÇÕES');
    doc.fontSize(12).text(`Aplicação: ${item.aplicacao}`);
    doc.text(`Material: ${item.material}`);
    doc.text(`Diâmetro: ${item.diametro}`);
    doc.text(`Espessura: ${item.espessura}`);
    doc.moveDown();

    doc.fontSize(14).text('FURAÇÃO');
    doc.fontSize(12).text(`Tipo: ${item.tipo_furo}`);
    doc.text(`D1: ${item.d1}`);
    doc.text(`S1: ${item.s1}`);
    doc.text(`D2: ${item.d2}`);
    doc.text(`Dmin: ${item.dmin}`);
    doc.text(`S2: ${item.s2}`);
    doc.text(`C1: ${item.c1}`);
    doc.moveDown();

    doc.fontSize(14).text('FIO');
    doc.fontSize(12).text(`${item.tipo_fio}`);
    doc.text(`DA: ${item.da}`);
    doc.text(`DF: ${item.df}`);
    doc.moveDown();

    doc.fontSize(14).text('CORTE');
    doc.fontSize(12).text(`${item.perfil_corte}`);
    doc.text(`L: ${item.largura}`);
    doc.text(`C: ${item.comprimento}`);

    doc.end();
});
app.get('/pdf/:id', (req, res) => {
    const item = orcamentos.find(o => o.id == req.params.id);

    if (!item) {
        return res.send('Orçamento não encontrado');
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=orcamento.pdf');

    doc.pipe(res);

    // 🔥 LOGO (coloque um arquivo logo.png na pasta do projeto)
    doc.image('logo.png', 50, 30, { width: 120 });

    doc.moveDown(5);

    // TÍTULO
    doc.fontSize(20).text('ORÇAMENTO PROFISSIONAL', { align: 'center' });

    doc.moveDown();

    // DADOS CLIENTE
    doc.fontSize(12).text(`Status: ${item.status}`);
    doc.text(`Data: ${new Date(item.id).toLocaleString()}`);

    doc.moveDown();

    // MARCA REFERÊNCIA
    doc.text(`Marca / Referência: ${item.marca_referencia || '-'}`);

    doc.moveDown();

    // FACAS
    doc.text('🔪 FACAS');
    doc.text(`Largura: ${item.facas_largura || '-'}`);
    doc.text(`Altura: ${item.facas_altura || '-'}`);
    doc.text(`Espessura: ${item.facas_espessura || '-'}`);

    doc.moveDown();

    // RESPOSTA (🔥 O QUE VOCÊ PEDIU)
    doc.text('💬 RESPOSTA DO ORÇAMENTO:');
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