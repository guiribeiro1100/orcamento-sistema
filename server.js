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
    if (!item) return res.status(404).send('Orçamento não encontrado');

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=orcamento-${item.id}.pdf`);
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(22).font('Helvetica-Bold').text('SOLICITAÇÃO DE ORÇAMENTO TÉCNICO', { align: 'center' }).moveDown();
    doc.fontSize(10).font('Helvetica').text(`ID: ${item.id} | Data: ${item.data}`, { align: 'right' }).moveDown();

    // --- SEÇÃO 1: CLIENTE ---
    doc.rect(30, doc.y, 535, 15).fill('#1e40af');
    doc.fillColor('#fff').font('Helvetica-Bold').text(' IDENTIFICAÇÃO DO CLIENTE', 35, doc.y - 12).moveDown(0.5);
    
    doc.fillColor('#000').font('Helvetica').fontSize(11);
    doc.text(`CNPJ: ${item.cnpj || '---'}`);
    doc.text(`Cliente/Cargo: ${item.cliente_cargo || '---'}`);
    doc.text(`Vendedor Responsável: ${item.vendedor || '---'}`);
    doc.text(`E-mail: ${item.email || '---'}`);
    doc.text(`WhatsApp/Telefone: ${item.telefone || '---'}`).moveDown();

    // --- SEÇÃO 2: EQUIPAMENTO E PRODUTO ---
    doc.rect(30, doc.y, 535, 15).fill('#1e40af');
    doc.fillColor('#fff').font('Helvetica-Bold').text(' ESPECIFICAÇÕES DO PRODUTO', 35, doc.y - 12).moveDown(0.5);

    doc.fillColor('#000').font('Helvetica');
    doc.text(`Tipo de Produto: ${(item.tipo_produto || '---').toUpperCase()}`);
    doc.text(`Nome da Máquina: ${item.nome_maquina || '---'}`);
    doc.text(`Código da Peça Original: ${item.codigo_original || '---'}`).moveDown();

    // --- SEÇÃO 3: DETALHES TÉCNICOS ---
    doc.rect(30, doc.y, 535, 15).fill('#3b82f6');
    doc.fillColor('#fff').font('Helvetica-Bold').text(' DETALHES TÉCNICOS E MEDIDAS', 35, doc.y - 12).moveDown(0.5);

    doc.fillColor('#000').font('Helvetica');
    doc.text(`Ângulo de Corte: ${item.angulo_corte || '---'}`);
    doc.text(`Tipo de Fio: ${(item.tipo_fio || '---').toUpperCase()}`);
    
    // Mostra medidas dependendo do produto
    if (item.tipo_produto === 'disco') {
        doc.text(`Diâmetros (Ext/Int): ${item.diametros}`);
        doc.text(`Perfil de Corte: ${item.perfil || '---'}`);
    } else if (item.tipo_produto === 'lamina') {
        doc.text(`Dimensões (LxC): ${item.dimensoes_lamina}`);
    } else {
        doc.text(`Medidas Usinagem: ${item.medidas_usinagem || '---'}`);
    }
    
    doc.text(`Espessura: ${item.espessura || '---'}`);
    doc.text(`Quantidade: ${item.quantidade || '---'}`);
    doc.text(`Aplicação: ${item.aplicacao_final || '---'}`).moveDown();

    // --- SEÇÃO 4: RESPOSTA DO VENDEDOR (DESTAQUE) ---
    if (item.resposta_vendedor) {
        doc.rect(30, doc.y, 535, 20).fill('#fef08a');
        doc.fillColor('#854d0e').font('Helvetica-Bold').text(' RESPOSTA / OBSERVAÇÕES DO ORÇAMENTO:', 35, doc.y - 16).moveDown(0.5);
        doc.fillColor('#000').font('Helvetica').text(item.resposta_vendedor, 35, doc.y).moveDown();
    }

    // --- SEÇÃO 5: FOTO (EM NOVA PÁGINA SE EXISTIR) ---
    if (item.foto) {
        const imgPath = path.join(__dirname, item.foto);
        if (fs.existsSync(imgPath)) {
            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').text('FOTO DE REFERÊNCIA:', { align: 'center' }).moveDown();
            doc.image(imgPath, { fit: [500, 600], align: 'center' });
        }
    }

    doc.end();
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));