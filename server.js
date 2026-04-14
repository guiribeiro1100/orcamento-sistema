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

// Configuração de Pastas e Banco
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

// ROTA POST: Recebe tudo do Form
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
            
            // Novos campos que você pediu
            angulo_corte: b.angulo_corte || b.angulo_corte_lamina || '',
            tipo_fio: b.tipo_fio || '',
            
            // Medidas mantidas (Disco e Lâmina)
            diametros: `${b.diametro_externo || ''} / ${b.diametro_interno || ''}`,
            espessura: b.espessura_disco || b.espessura_lamina || '',
            perfil: b.perfil_corte_disco === 'outro' ? b.perfil_outro_disco : b.perfil_corte_disco,
            dimensoes_lamina: `${b.largura || ''} x ${b.comprimento || ''}`,
            medidas_usinagem: b.medidas_usinagem || '',
            
            aplicacao_final: b.aplicacao === 'outro' ? b.aplicacao_outro : b.aplicacao,
            quantidade: b.quantidade || '',
            foto: req.file ? '/uploads/' + req.file.filename : null,
            status: 'novo',
            data: new Date().toLocaleString()
        };

        db.push(novo);
        saveDB(db);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: "Erro ao salvar" });
    }
});

app.get('/orcamentos', (req, res) => res.json(readDB()));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor ativo na porta ${PORT}`));