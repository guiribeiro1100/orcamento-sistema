const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const app = express();
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadPath));

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})});

const DB_FILE = path.join(__dirname, 'data.json');
const readDB = () => fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : [];
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.post('/orcamento', upload.single('foto'), (req, res) => {
    const db = readDB();
    const b = req.body;

    const novo = {
        id: Date.now(),
        empresa_local: b.empresa_local || '',
        cnpj: b.cnpj || '',
        cliente_cargo: b.cliente_cargo || '',
        email: b.email || '',
        telefone: b.telefone || '',
        vendedor: b.vendedor || '',
        material_final: b.material_tipo === 'outro' ? b.material_outro : b.material_tipo,
        aplicacao_final: b.aplicacao === 'outro' ? b.aplicacao_outro : b.aplicacao,
        tipo_produto: b.tipo_produto || '',
        quantidade: b.quantidade || '',
        nome_maquina: b.nome_maquina || '',
        codigo_original: b.codigo_original || '',
        // Dados Disco
        diametro_externo: b.diametro_externo || '',
        diametro_interno: b.diametro_interno || '',
        espessura_disco: b.espessura_disco || '',
        tipo_fio_disco: b.tipo_fio_disco || '',
        angulo_corte: b.angulo_corte || '',
        comprimento_fio_disco: b.comprimento_fio_disco || '',
        perfil_corte_disco: b.perfil_corte_disco === 'outro' ? b.perfil_outro_disco : b.perfil_corte_disco,
        // Dados Lâmina
        largura: b.largura || '',
        comprimento: b.comprimento || '',
        espessura: b.espessura || '',
        tipo_fio_lamina: b.tipo_fio_lamina || '',
        angulo_corte_lamina: b.angulo_corte_lamina || '',
        comprimento_fio_lamina: b.comprimento_fio_lamina || '',
        perfil_corte_lamina: b.perfil_corte_lamina === 'outro' ? b.perfil_outro_lamina : b.perfil_corte_lamina,
        
        medidas_usinagem: b.medidas_usinagem || '',
        foto: req.file ? '/uploads/' + req.file.filename : null,
        status: 'novo',
        resposta: '',
        historico: [],
        data: new Date().toLocaleString()
    };

    db.push(novo);
    saveDB(db);
    res.json({ ok: true });
});

app.get('/orcamento/:id/pdf', (req, res) => {
    const item = readDB().find(o => o.id == req.params.id);
    if (!item) return res.status(404).send('Não encontrado');

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(18).text('ORÇAMENTO TÉCNICO', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Empresa: ${item.empresa_local} - CNPJ: ${item.cnpj}`);
    doc.text(`Cliente: ${item.cliente_cargo} | Vendedor: ${item.vendedor}`).moveDown();

    doc.fontSize(14).text('DETALHES DO PRODUTO', { underline: true });
    doc.fontSize(12).text(`Tipo: ${item.tipo_produto.toUpperCase()} | Qtd: ${item.quantidade}`);
    doc.text(`Material: ${item.material_final} | Máquina: ${item.nome_maquina}`).moveDown();

    if (item.tipo_produto === 'disco') {
        doc.text(`Diâmetro Ext/Int: ${item.diametro_externo} / ${item.diametro_interno}`);
        doc.text(`Ângulo: ${item.angulo_corte} | Perfil: ${item.perfil_corte_disco}`);
        doc.text(`Fio: ${item.tipo_fio_disco} (${item.comprimento_fio_disco})`);
    } else if (item.tipo_produto === 'lamina') {
        doc.text(`Dimensões: ${item.largura}x${item.comprimento}x${item.espessura}`);
        doc.text(`Ângulo: ${item.angulo_corte_lamina} | Perfil: ${item.perfil_corte_lamina}`);
    }

    if (item.foto) {
        doc.addPage().image(path.join(__dirname, item.foto), { fit: [450, 450], align: 'center' });
    }
    doc.end();
});

app.get('/orcamentos', (req, res) => res.json(readDB()));
app.post('/responder/:id', (req, res) => { /* Mesma lógica anterior */ });
app.post('/status/:id', (req, res) => { /* Mesma lógica anterior */ });
app.listen(3000, () => console.log('Servidor rodando porta 3000'));