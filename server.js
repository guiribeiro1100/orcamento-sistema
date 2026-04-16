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

// SEGURANÇA: Não use static(__dirname) diretamente para não expor seu server.js
// Os arquivos HTML devem preferencialmente estar em uma pasta /public
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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'form.html')));
app.get('/painel', (req, res) => res.sendFile(path.join(__dirname, 'painel.html')));

// =========================
// 🚀 CRIAR ORÇAMENTO (ÚNICA ROTA POST)
// =========================
app.post('/orcamento', upload.single('foto'), async (req, res) => {
    try {
        const b = req.body;

        const novo = {
            cnpj: b.cnpj || null,
            vendedor: b.vendedor || null,
            cliente_cargo: b.cliente_cargo || null,
            telefone: b.telefone || null,
            email: b.email || null,
            tipo_produto: b.tipo_produto || null,
            nome_maquina: b.nome_maquina || null,
            codigo_original: b.codigo_original || null,
            material: b.material === 'outro' ? (b.material_outro || null) : (b.material || null),
            angulo_corte: b.angulo_corte || null,
            tipo_fio: b.tipo_fio || null,
            perfil: b.perfil_corte_disco === 'outro' ? (b.perfil_outro_disco || null) : (b.perfil_corte_disco || null),
            quantidade: b.quantidade ? parseInt(b.quantidade) : 0, 
            diametro_externo: b.diametro_externo || null,
            diametro_interno: b.diametro_interno || null,
            espessura_disco: b.espessura_disco || null,
            largura: b.largura || null,
            comprimento: b.comprimento || null,
            espessura_lamina: b.espessura_lamina || null,
            medidas_usinagem: b.medidas_usinagem || null,
            aplicacao_final: b.aplicacao === 'outro' ? (b.aplicacao_outro || null) : (b.aplicacao || null),
            foto: req.file ? '/uploads/' + req.file.filename : null,
            resposta_vendedor: '',
            status: 'pendente',
            data: new Date().toLocaleString('pt-BR')
        };

        const { data, error } = await supabase
            .from('orcamentos')
            .insert([novo])
            .select();

        if (error) {
            console.error('ERRO SUPABASE:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ ok: true, data });

    } catch (err) {
        console.error('ERRO GERAL:', err);
        res.status(500).json({ error: 'Erro interno no servidor' });
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
// 🚀 START
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

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