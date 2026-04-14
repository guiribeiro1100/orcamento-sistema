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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // --- MONTAGEM DO PADRÃO AUTOMÁTICO ---
    // Ex: DISCO D132x50x11mm Fio Simples Liso
    const produtoNome = (item.tipo_produto || '').toUpperCase();
    const medidas = item.tipo_produto === 'disco' 
        ? `D${item.diametros.replace(' / ', 'x')}x${item.espessura}mm` 
        : `${item.dimensoes_lamina}x${item.espessura}mm`;
    
    const tituloPadrao = `${produtoNome} ${medidas} ${item.tipo_fio || ''} ${item.perfil || ''}`;

    // --- CABEÇALHO ---
    doc.fillColor('#1e40af').fontSize(18).font('Helvetica-Bold').text('ORÇAMENTO TÉCNICO', { align: 'center' });
    doc.fontSize(10).fillColor('#64748b').text(`Gerado em: ${item.data}`, { align: 'center' }).moveDown(1);

    // --- TÍTULO PADRONIZADO (O QUE VOCÊ PEDIU) ---
    doc.rect(40, doc.y, 515, 25).fill('#f1f5f9');
    doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(12).text(tituloPadrao, 45, doc.y + 7, { align: 'center' }).moveDown(1.5);

    // Função auxiliar para seções
    const criarSecao = (titulo, cor) => {
        doc.rect(40, doc.y, 515, 18).fill(cor);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text(`  ${titulo}`, 40, doc.y + 4).moveDown(0.5);
        doc.fillColor('#000000').font('Helvetica').fontSize(11).moveDown(0.2);
    };

    // --- SEÇÃO: CLIENTE ---
    criarSecao('DADOS DO CLIENTE', '#1e40af');
    doc.text(`CNPJ: ${item.cnpj || '---'}`);
    doc.text(`Cliente/Cargo: ${item.cliente_cargo || '---'}`);
    doc.text(`WhatsApp: ${item.telefone || '---'}`).moveDown(1);

    // --- SEÇÃO: DETALHES TÉCNICOS ---
    criarSecao('ESPECIFICAÇÕES DA PEÇA', '#1e40af');
    doc.text(`Máquina: ${item.nome_maquina || '---'}`);
    doc.text(`Cód. Original: ${item.codigo_original || '---'}`);
    doc.text(`Ângulo de Corte: ${item.angulo_corte || '---'}`);
    doc.text(`Aplicação: ${item.aplicacao_final || '---'}`);
    doc.text(`Quantidade: ${item.quantidade || '0'}`).moveDown(1);

    // --- SEÇÃO: RESPOSTA ---
    criarSecao('RETORNO DO ORÇAMENTO', '#ca8a04');
    const textoResposta = item.resposta_vendedor && item.resposta_vendedor.trim() !== "" 
        ? item.resposta_vendedor 
        : "Orçamento em fase de análise técnica.";
    
    doc.font('Helvetica-Bold').fillColor('#854d0e').text('OBSERVAÇÕES DO VENDEDOR:').moveDown(0.2);
    doc.font('Helvetica').fillColor('#000000').text(textoResposta, { align: 'justify', width: 500 }).moveDown(1.5);

    // --- FOTO ---
    if (item.foto) {
        const imgPath = path.join(__dirname, item.foto);
        if (fs.existsSync(imgPath)) {
            doc.addPage();
            doc.image(imgPath, { fit: [450, 500], align: 'center' });
        }
    }

    doc.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));