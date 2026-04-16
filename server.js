const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// =========================
// 🔥 SUPABASE
// =========================

const supabase = createClient(
    'https://vhrnuejlubfxmlownydm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocm51ZWpsdWJmeG1sb3dueWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk2MDgsImV4cCI6MjA5MTgyNTYwOH0.JFEYbnwD3IkwHT3IB2jM-ZPLa1PV-lNJBPQpgRvjuLI'
);

// =========================
// 📁 UPLOAD LOCAL
// =========================

const uploadPath = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

app.use('/uploads', express.static(uploadPath));

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadPath),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    })
});

// =========================
// 🌐 ROTAS HTML
// =========================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

app.get('/painel', (req, res) => {
    res.sendFile(path.join(__dirname, 'painel.html'));
});

// =========================
// 🚀 CRIAR ORÇAMENTO
// =========================

app.post('/orcamento', upload.single('foto'), async (req, res) => {
    try {
        const b = req.body;

        const novo = {
            cnpj: b.cnpj || '',
            vendedor: b.vendedor || '',
            cliente_cargo: b.cliente_cargo || '',
            telefone: b.telefone || '',
            email: b.email || '',
            tipo_produto: b.tipo_produto || '',
            nome_maquina: b.nome_maquina || '',
            codigo_original: b.codigo_original || '',
            material: b.material === 'outro' ? b.material_outro : b.material,
            angulo_corte: b.angulo_corte || b.angulo_corte_lamina || '',
            tipo_fio: b.tipo_fio || '',
            perfil: b.perfil_corte_disco === 'outro' ? b.perfil_outro_disco : b.perfil_corte_disco,
            quantidade: b.quantidade || '',
            diametro_externo: b.diametro_externo || '',
            diametro_interno: b.diametro_interno || '',
            espessura_disco: b.espessura_disco || '',
            largura: b.largura || '',
            comprimento: b.comprimento || '',
            espessura_lamina: b.espessura_lamina || '',
            medidas_usinagem: b.medidas_usinagem || '',
            aplicacao_final: b.aplicacao === 'outro' ? b.aplicacao_outro : b.aplicacao,
            foto: req.file ? '/uploads/' + req.file.filename : null,
            resposta_vendedor: '',
            status: 'pendente',
            data: new Date().toLocaleString()
        };

        const { error } = await supabase
            .from('orcamentos')
            .insert([novo]);

        if (error) throw error;
        res.json({ ok: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// =========================
// 📋 LISTAR
// =========================

app.get('/orcamentos', async (req, res) => {
    const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .order('id', { ascending: false });

    if (error) return res.status(500).json({ error });
    res.json(data);
});

// =========================
// 💬 RESPONDER
// =========================

app.post('/orcamento', upload.single('foto'), async (req, res) => {
    try {
        const b = req.body;

  const novo = {
    cnpj: b.cnpj || '',
    vendedor: b.vendedor || '',
    cliente_cargo: b.cliente_cargo || '',
    telefone: b.telefone || '',
    email: b.email || '',
    tipo_produto: b.tipo_produto || '',
    nome_maquina: b.nome_maquina || '',
    codigo_original: b.codigo_original || '',
    material: b.material === 'outro' ? (b.material_outro || '') : (b.material || ''),
    angulo_corte: b.angulo_corte || '',
    tipo_fio: b.tipo_fio || '',
    perfil: b.perfil_corte_disco === 'outro'
        ? (b.perfil_outro_disco || '')
        : (b.perfil_corte_disco || ''),
    quantidade: b.quantidade || '0',
    diametro_externo: b.diametro_externo || '',
    diametro_interno: b.diametro_interno || '',
    espessura_disco: b.espessura_disco || '',
    largura: b.largura || '',
    comprimento: b.comprimento || '',
    espessura_lamina: b.espessura_lamina || '',
    medidas_usinagem: b.medidas_usinagem || '',
    aplicacao_final: b.aplicacao === 'outro' ? (b.aplicacao_outro || '') : (b.aplicacao || ''),
    foto: req.file ? '/uploads/' + req.file.filename : null,
    resposta_vendedor: '',
    status: 'pendente',
    data: new Date().toLocaleString()
};

        const { data, error } = await supabase
            .from('orcamentos')
            .insert([novo])
            .select();

        if (error) {
            console.error('ERRO SUPABASE:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ ok: true, data });

    } catch (err) {
        console.error('ERRO GERAL:', err);
        res.status(500).json({ error: err.message });
    }
});
// =========================
// 🚀 START
// =========================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));