const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-client');

// 1. INICIALIZAÇÃO DO APP
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. CONEXÃO SUPABASE (Verifique se suas chaves estão corretas aqui)
const supabaseUrl = 'SUA_URL_DO_SUPABASE';
const supabaseKey = 'SUA_CHAVE_ANON_DO_SUPABASE';
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. CONFIGURAÇÃO DE ARQUIVOS
const uploadPath = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
app.use('/uploads', express.static(uploadPath));
app.use(express.static(__dirname));

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})});

// --- ROTAS ---

// Salvar Orçamento
app.post('/orcamento', upload.single('foto'), async (req, res) => {
    try {
        const b = req.body;
        const { data, error } = await supabase.from('orcamentos').insert([{
            cnpj: b.cnpj,
            vendedor: b.vendedor,
            cliente_cargo: b.cliente_cargo,
            telefone: b.telefone,
            email: b.email,
            tipo_produto: b.tipo_produto,
            nome_maquina: b.nome_maquina,
            codigo_original: b.codigo_original,
            material: b.material === 'outro' ? b.material_outro : b.material,
            angulo_corte: b.angulo_corte || b.angulo_corte_lamina,
            tipo_fio: b.tipo_fio,
            perfil: b.perfil_corte_disco === 'outro' ? b.perfil_outro_disco : b.perfil_corte_disco,
            quantidade: b.quantidade,
            diametro_externo: b.diametro_externo,
            diametro_interno: b.diametro_interno,
            espessura_disco: b.espessura_disco,
            largura: b.largura,
            comprimento: b.comprimento,
            espessura_lamina: b.espessura_lamina,
            medidas_usinagem: b.medidas_usinagem,
            aplicacao_final: b.aplicacao === 'outro' ? b.aplicacao_outro : b.aplicacao,
            foto: req.file ? '/uploads/' + req.file.filename : null,
            data: new Date().toLocaleString()
        }]);
        if (error) throw error;
        res.json({ ok: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// Listar Orçamentos
app.get('/orcamentos', async (req, res) => {
    try {
        const { data, error } = await supabase.from('orcamentos').select('*').order('id', { ascending: false });
        res.json(data || []);
    } catch (err) {
        res.status(500).json([]);
    }
});

// Salvar Resposta
app.post('/orcamento/:id/resposta', async (req, res) => {
    try {
        const { error } = await supabase.from('orcamentos')
            .update({ resposta_vendedor: req.body.resposta, status: 'respondido' })
            .eq('id', req.params.id);
        res.json({ ok: !error });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
});

// Rota do PDF
app.get('/orcamento/:id/pdf', async (req, res) => {
    try {
        const { data: item, error } = await supabase.from('orcamentos').select('*').eq('id', req.params.id).single();
        if (error || !item) return res.status(404).send('Não encontrado');

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        const prod = (item.tipo_produto || '').toUpperCase();
        let med = '';
        if (item.tipo_produto === 'disco') {
            med = `D${item.diametro_externo || ''}x${item.diametro_interno || ''}x${item.espessura_disco || ''}mm`;
        } else if (item.tipo_produto === 'lamina') {
            med = `${item.largura || ''}x${item.comprimento || ''}x${item.espessura_lamina || ''}mm`;
        } else {
            med = item.medidas_usinagem || '';
        }

        const titulo = `${prod} ${med} Fio ${item.tipo_fio || ''} Perfil ${item.perfil || ''} ${item.material || ''}`;

        doc.fillColor('#1e40af').fontSize(20).font('Helvetica-Bold').text('ORÇAMENTO TÉ