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
            material: b.material === 'outro' ? b.material_outro : b.material,
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
            resposta_vendedor: '', 
            status: 'pendente',
            data: new Date().toLocaleString()
        };
        db.push(novo);
        saveDB(db);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: "Erro ao salvar" }); }
});

app.get('/orcamentos', (req, res) => res.json(readDB()));

app.post('/orcamento/:id/resposta', (req, res) => {
    const db = readDB();
    const index = db.findIndex(o => o.id == req.params.id);
    if (index !== -1) {
        db[index].resposta_vendedor = req.body.resposta;
        db[index].status = 'respondido';
        saveDB(db);
        res.json({ ok: true });
    } else { res.status(404).send('Não encontrado'); }
});

app.get('/orcamento/:id/pdf', (req, res) => {
    const item = readDB().find(o => o.id == req.params.id);
    if (!item) return res.status(404).send('Não encontrado');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    const prod = (item.tipo_produto || '').toUpperCase();
    const med = item.tipo_produto === 'disco' ? `D${item.diametros.replace(' / ', 'x')}x${item.espessura}mm` : `${item.dimensoes_lamina.replace(' x ', 'x')}x${item.espessura}mm`;
    const tituloPadrao = `${prod} ${med} ${item.tipo_fio || ''} ${item.perfil || ''} ${item.material || ''}`;

    doc.fillColor('#1e40af').fontSize(20).font('Helvetica-Bold').text('ORÇAMENTO TÉCNICO', { align: 'center' });
    doc.fontSize(10).fillColor('#64748b').text(`Data: ${item.data} | ID: ${item.id}`, { align: 'center' }).moveDown();
    doc.rect(40, doc.y, 515, 25).fill('#f8fafc');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(tituloPadrao, 40, doc.y + 7, { align: 'center' }).moveDown(1.5);

    const criarSecao = (titulo, cor) => {
        doc.rect(40, doc.y, 515, 18).fill(cor);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text('  ' + titulo, 40, doc.y + 4).moveDown(0.5);
        doc.fillColor('#000000').font('Helvetica').fontSize(11).moveDown(0.2);
    };

    criarSecao('DADOS DO CLIENTE', '#1e40af');
    doc.text(`CNPJ: ${item.cnpj} | Cliente: ${item.cliente_cargo} | WhatsApp: ${item.telefone}`).moveDown();
    criarSecao('DETALHES TÉCNICOS', '#1e40af');
    doc.text(`Máquina: ${item.nome_maquina} | Material: ${item.material}`);
    doc.text(`Ângulo: ${item.angulo_corte} | Fio: ${item.tipo_fio} | Perfil: ${item.perfil}`);
    doc.text(`Quantidade: ${item.quantidade} | Aplicação: ${item.aplicacao_final}`).moveDown();

    if (item.resposta_vendedor) {
        criarSecao('RESPOSTA TÉCNICA', '#ca8a04');
        doc.text(item.resposta_vendedor, { align: 'justify' }).moveDown();
    }

    if (item.foto) {
        const imgPath = path.join(__dirname, item.foto);
        if (fs.existsSync(imgPath)) { doc.addPage(); doc.image(imgPath, { fit: [450, 500], align: 'center' }); }
    }
    doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));