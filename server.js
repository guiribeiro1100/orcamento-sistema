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

const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
app.use('/uploads', express.static(uploadPath));
app.use(express.static(__dirname));

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
        
        // Dados Técnicos
        angulo_corte: b.tipo_produto === 'disco' ? b.angulo_corte : b.angulo_corte_lamina,
        diametros: `${b.diametro_externo || ''} / ${b.diametro_interno || ''}`,
        espessura: b.espessura_disco || b.espessura_lamina || '',
        perfil: b.perfil_corte_disco === 'outro' ? b.perfil_outro_disco : b.perfil_corte_disco,
        dimensoes_lamina: `${b.largura || ''} x ${b.comprimento || ''}`,
        medidas_usinagem: b.medidas_usinagem || '',
        
        foto: req.file ? '/uploads/' + req.file.filename : null,
        status: 'novo',
        data: new Date().toLocaleString()
    };

    db.push(novo);
    saveDB(db);
    res.json({ ok: true });
});

app.get('/orcamento/:id/pdf', (req, res) => {
    const item = readDB().find(o => o.id == req.params.id);
    if (!item) return res.status(404).send('Não encontrado');
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text('RELATÓRIO DE ORÇAMENTO', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`CNPJ: ${item.cnpj}`);
    doc.text(`Contato: ${item.cliente_cargo} | Vendedor: ${item.vendedor}`);
    doc.text(`Aplicação: ${item.aplicacao_final}`).moveDown();
    doc.text(`Produto: ${item.tipo_produto.toUpperCase()}`);
    doc.text(`Ângulo de Corte: ${item.angulo_corte || 'N/A'}`);
    doc.text(`Quantidade: ${item.quantidade}`);
    
    if (item.foto) {
        const imgPath = path.join(__dirname, item.foto);
        if (fs.existsSync(imgPath)) doc.addPage().image(imgPath, { fit: [450, 450] });
    }
    doc.end();
});

app.get('/orcamentos', (req, res) => res.json(readDB()));
app.listen(process.env.PORT || 3000, () => console.log('Servidor OK'));
