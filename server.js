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

        marca_referencia: b.marca_referencia || '',

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

        // 🔪 FACAS
        facas_largura: b.facas_largura || '',
        facas_altura: b.facas_altura || '',
        facas_espessura: b.facas_espessura || '',

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

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=orcamento-${item.id}.pdf`);

    doc.pipe(res);

    // TÍTULO
    doc.fontSize(20).text('ORÇAMENTO TÉCNICO', { align: 'center' });
    doc.moveDown(2);

    // CLIENTE
    doc.fontSize(14).text('DADOS DO CLIENTE');
    doc.moveDown(0.5);

    doc.fontSize(12);
    if (item.cliente_cargo) doc.text(`Cliente: ${item.cliente_cargo}`);
    if (item.empresa_local) doc.text(`Empresa: ${item.empresa_local}`);
    if (item.email) doc.text(`Email: ${item.email}`);
    if (item.telefone) doc.text(`Telefone: ${item.telefone}`);
    if (item.vendedor) doc.text(`Vendedor: ${item.vendedor}`);

    doc.moveDown();

    // ESPECIFICAÇÕES
    doc.fontSize(14).text('ESPECIFICAÇÕES');
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Aplicação: ${item.aplicacao || '-'}`);
    doc.text(`Material: ${item.material || '-'}`);
    doc.text(`Diâmetro: ${item.diametro || '-'}`);
    doc.text(`Espessura: ${item.espessura || '-'}`);

    doc.moveDown();

    // FACAS
    doc.fontSize(14).text('FACAS');
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Largura: ${item.facas_largura || '-'}`);
    doc.text(`Altura: ${item.facas_altura || '-'}`);
    doc.text(`Espessura: ${item.facas_espessura || '-'}`);

    doc.moveDown();

    // FURAÇÃO
    doc.fontSize(14).text('FURAÇÃO');
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Tipo: ${item.tipo_furo || '-'}`);
    doc.text(`D1: ${item.d1 || '-'}`);
    doc.text(`S1: ${item.s1 || '-'}`);
    doc.text(`D2: ${item.d2 || '-'}`);
    doc.text(`Dmin: ${item.dmin || '-'}`);
    doc.text(`S2: ${item.s2 || '-'}`);
    doc.text(`C1: ${item.c1 || '-'}`);

    doc.moveDown();

    // FIO
    doc.fontSize(14).text('FIO');
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`${item.tipo_fio || '-'}`);
    doc.text(`DA: ${item.da || '-'}`);
    doc.text(`DF: ${item.df || '-'}`);

    doc.moveDown();

    // CORTE
    doc.fontSize(14).text('CORTE');
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`${item.perfil_corte || '-'}`);
    doc.text(`L: ${item.largura || '-'}`);
    doc.text(`C: ${item.comprimento || '-'}`);

    doc.moveDown();

    // RESPOSTA
    const ultimaResposta = item.historico?.slice(-1)[0]?.resposta || 'Sem resposta';
    doc.fontSize(14).text('RESPOSTA');
    doc.moveDown(0.5);

    doc.fontSize(12).text(ultimaResposta);

    doc.moveDown(2);

    // RODAPÉ
    doc.fontSize(10).fillColor('gray')
        .text('Documento gerado automaticamente', { align: 'center' });

    doc.end();
});

// =========================
// START
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Rodando na porta ' + PORT);
});