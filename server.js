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

const DB_FILE = path.join(__dirname, 'data.json');
const readDB = () => {
    try { return fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : []; } 
    catch (e) { return []; }
};
const saveDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})});

// ROTA POST ÚNICA: Recebe tudo do Form
app.post('/orcamento', upload.single('foto'), (req, res) => {
    try {
        const db = readDB();
        const b = req.body;

        const novo = {
            id: Date.now(),
            cnpj: b.cnpj || '',
            cliente_cargo: b.cliente_cargo || '',
            vendedor: b.vendedor || '',
            email: b.email || '',
            telefone: b.telefone || '',
            tipo_produto: b.tipo_produto || '',
            nome_maquina: b.nome_maquina || '',
            codigo_original: b.codigo_original || '',
            angulo_corte: b.angulo_corte || b.angulo_corte_lamina || '',
            tipo_fio: b.tipo_fio || '',
            diametros: `${b.diametro_externo || ''} / ${b.diametro_interno || ''}`,
            espessura: b.espessura_disco || b.espessura_lamina || '',
            perfil: b.perfil_corte_disco === 'outro' ? b.perfil_outro_disco : b.perfil_corte_disco,
            dimensoes_lamina: `${b.largura || ''} x ${b.comprimento || ''}`,
            medidas_usinagem: b.medidas_usinagem || '',
            aplicacao_final: b.aplicacao === 'outro' ? b.aplicacao_outro : b.aplicacao,
            quantidade: b.quantidade || '',
            foto: req.file ? '/uploads/' + req.file.filename : null,
            resposta_vendedor: '', // Campo inicia vazio
            data: new Date().toLocaleString()
        };

        db.push(novo);
        saveDB(db);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: "Erro ao salvar" });
    }
});

// Listar Orçamentos para o Painel
app.get('/orcamentos', (req, res) => res.json(readDB()));

// Salvar Resposta do Vendedor
app.post('/orcamento/:id/resposta', (req, res) => {
    const db = readDB();
    const index = db.findIndex(o => o.id == req.params.id);
    if (index !== -1) {
        db[index].resposta_vendedor = req.body.resposta;
        saveDB(db);
        res.json({ ok: true });
    } else {
        res.status(404).send('Não encontrado');
    }
});

// Gerar PDF com Resposta
app.get('/orcamento/:id/pdf', (req, res) => {
    const item = readDB().find(o => o.id == req.params.id);
    if (!item) return res.status(404).send('Não encontrado');

    const doc = new PDFDocument({ margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text('ORÇAMENTO TÉCNICO', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`CNPJ: ${item.cnpj} | Data: ${item.data}`);
    doc.text(`Cliente: ${item.cliente_cargo} | Vendedor: ${item.vendedor}`).moveDown();
    
    doc.fontSize(14).font('Helvetica-Bold').text('ESPECIFICAÇÕES:');
    doc.fontSize(12).font('Helvetica').text(`Produto: ${item.tipo_produto ? item.tipo_produto.toUpperCase() : '---'}`);
    doc.text(`Ângulo: ${item.angulo_corte} | Fio: ${item.tipo_fio}`);
    doc.text(`Medidas: ${item.diametros !== " / " ? item.diametros : item.dimensoes_lamina}`);
    doc.text(`Quantidade: ${item.quantidade}`).moveDown();

    if (item.resposta_vendedor) {
        doc.rect(30, doc.y, 530, 25).fill('#e2e8f0');
        doc.fillColor('#1e3a8a').font('Helvetica-Bold').text('RESPOSTA DO ORÇAMENTO:', 35, doc.y - 18);
        doc.fillColor('#000').font('Helvetica').text(item.resposta_vendedor, 35, doc.y + 10).moveDown();
    }

    if (item.foto) {
        const imgPath = path.join(__dirname, item.foto);
        if (fs.existsSync(imgPath)) {
            doc.addPage().text('FOTO DE REFERÊNCIA:').image(imgPath, { fit: [500, 400], align: 'center' });
        }
    }
    doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));