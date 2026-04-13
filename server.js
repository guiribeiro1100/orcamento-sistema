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

        // TIPO
        tipo_produto: b.tipo_produto || '',

        // DISCO
        diametro_externo: b.diametro_externo || '',
        diametro_interno: b.diametro_interno || '',
        tipo_fio: b.tipo_fio || '',
        tipo_fio_desc: b.tipo_fio_desc || '',
        obs_disco: b.obs_disco || '',

        // LAMINA
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
// PDF PROFISSIONAL DINÂMICO
// =========================

app.get('/orcamento/:id/pdf', (req, res) => {

    const db = readDB();
    const item = db.find(o => o.id == req.params.id);

    if (!item) return res.status(404).send('Não encontrado');

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=orcamento-${item.id}.pdf`);

    doc.pipe(res);

    // ===== TÍTULO =====
    doc.fontSize(20).text('ORÇAMENTO TÉCNICO', { align: 'center' });
    doc.moveDown(2);

    // ===== CLIENTE =====
    doc.fontSize(14).text('DADOS DO CLIENTE');
    doc.fontSize(12);

    doc.text(`Empresa: ${item.empresa_local}`);
    doc.text(`Cliente: ${item.cliente_cargo}`);
    doc.text(`Email: ${item.email}`);
    doc.text(`Telefone: ${item.telefone}`);
    doc.text(`Vendedor: ${item.vendedor}`);

    doc.moveDown();

    // ===== TIPO =====
    doc.fontSize(14).text('TIPO DE PRODUTO');
    doc.fontSize(12).text(item.tipo_produto.toUpperCase());

    doc.moveDown();

    // ===== CONTEÚDO DINÂMICO =====

    if (item.tipo_produto === 'disco') {

        doc.fontSize(14).text('DISCO');
        doc.fontSize(12);

        doc.text(`Diâmetro externo: ${item.diametro_externo}`);
        doc.text(`Diâmetro interno: ${item.diametro_interno}`);
        doc.text(`Tipo de fio: ${item.tipo_fio}`);
        doc.text(`Descrição do fio: ${item.tipo_fio_desc}`);
        doc.text(`Observação: ${item.obs_disco}`);
    }

    if (item.tipo_produto === 'lamina') {

        doc.fontSize(14).text('LÂMINA');
        doc.fontSize(12);

        doc.text(`Largura: ${item.largura}`);
        doc.text(`Comprimento: ${item.comprimento}`);
        doc.text(`Espessura: ${item.espessura}`);
        doc.text(`Observação: ${item.obs_lamina}`);
    }

    if (item.tipo_produto === 'usinagem') {

        doc.fontSize(14).text('USINAGEM');
        doc.fontSize(12);

        doc.text(`Medidas: ${item.medidas_usinagem}`);
    }

    doc.moveDown();

    // ===== APLICAÇÃO =====
    doc.fontSize(14).text('APLICAÇÃO');
    doc.fontSize(12).text(item.aplicacao);

    doc.moveDown();

    // ===== RESPOSTA =====
    const resposta = item.historico?.slice(-1)[0]?.resposta || 'Sem resposta';

    doc.fontSize(14).text('RESPOSTA');
    doc.fontSize(12).text(resposta);

    // ===== IMAGEM =====
    if (item.foto) {
        doc.addPage();

        doc.fontSize(16).text('ANEXO DO CLIENTE', { align: 'center' });
        doc.moveDown();

        try {
            doc.image(path.join(__dirname, item.foto), {
                fit: [500, 400],
                align: 'center'
            });
        } catch (e) {
            doc.text('Erro ao carregar imagem');
        }
    }

    doc.end();
});

// =========================
// START
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Rodando na porta ' + PORT);
});