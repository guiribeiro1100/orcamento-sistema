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

// Configuração de Pastas
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
app.use('/uploads', express.static(uploadPath));
app.use(express.static(__dirname));

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})});

const DB_FILE = path.join(__dirname, 'data.json');
const readDB = () => {
    try {
        return fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : [];
    } catch (e) { return []; }
};
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Rota para Salvar Orçamento
app.post('/orcamento', upload.single('foto'), (req, res) => {
    try {
        const db = readDB();
        const b = req.body;

        const novo = {
            id: Date.now(),
            cnpj: b.cnpj || '',
            cliente_cargo: b.cliente_cargo || '',
            email: b.email || '',
            telefone: b.telefone || '',
            vendedor: b.vendedor || '',
            aplicacao_final: b.aplicacao === 'outro' ? b.aplicacao_outro : b.aplicacao,
            tipo_produto: b.tipo_produto || '',
            quantidade: b.quantidade || '',
            nome_maquina: b.nome_maquina || '',
            codigo_original: b.codigo_original || '',
            
            // Dados Técnicos (Unificados)
            diametro_externo: b.diametro_externo || '',
            diametro_interno: b.diametro_interno || '',
            espessura: b.espessura || b.espessura_disco || '',
            angulo_corte: b.tipo_produto === 'disco' ? b.angulo_corte : b.angulo_corte_lamina,
            comprimento_fio: b.tipo_produto === 'disco' ? b.comprimento_fio_disco : b.comprimento_fio_lamina,
            perfil_corte: b.perfil_corte_disco || '',
            largura: b.largura || '',
            comprimento: b.comprimento || '',
            medidas_usinagem: b.medidas_usinagem || '',
            
            foto: req.file ? '/uploads/' + req.file.filename : null,
            status: 'novo',
            data: new Date().toLocaleString()
        };

        db.push(novo);
        saveDB(db);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao salvar" });
    }
});

// Rota do PDF (Com proteção contra erro de imagem)
app.get('/orcamento/:id/pdf', (req, res) => {
    const item = readDB().find(o => o.id == req.params.id);
    if (!item) return res.status(404).send('Orçamento não encontrado');

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text('SOLICITAÇÃO DE ORÇAMENTO', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`CNPJ: ${item.cnpj}`);
    doc.text(`Contato: ${item.cliente_cargo} | Vendedor: ${item.vendedor}`);
    doc.text(`Aplicação: ${item.aplicacao_final}`).moveDown();

    doc.fontSize(14).text('ESPECIFICAÇÕES:', { underline: true });
    doc.fontSize(12).text(`Produto: ${item.tipo_produto.toUpperCase()}`);
    doc.text(`Ângulo de Corte: ${item.angulo_corte || 'N/A'}`);
    doc.text(`Quantidade: ${item.quantidade}`);

    if (item.foto) {
        const imgPath = path.join(__dirname, item.foto);
        if (fs.existsSync(imgPath)) {
            doc.addPage().image(imgPath, { fit: [450, 450], align: 'center' });
        }
    }
    doc.end();
});

app.get('/orcamentos', (req, res) => res.json(readDB()));

app.post('/status/:id', (req, res) => {
    const db = readDB();
    const index = db.findIndex(o => o.id == req.params.id);
    if (index !== -1) {
        db[index].status = req.body.status;
        saveDB(db);
        res.json({ ok: true });
    } else { res.status(404).send(); }
});

app.listen(3000, () => console.log('✅ Servidor Ativo: http://localhost:3000'));