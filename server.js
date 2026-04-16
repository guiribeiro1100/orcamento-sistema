const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 SERVIR HTML
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

app.get('/painel', (req, res) => {
    res.sendFile(path.join(__dirname, 'painel.html'));
});

// =========================
// 🔥 SUPABASE
// =========================

const supabase = createClient(
    'https://vhrnuejlubfxmlownydm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocm51ZWpsdWJmeG1sb3dueWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDk2MDgsImV4cCI6MjA5MTgyNTYwOH0.JFEYbnwD3IkwHT3IB2jM-ZPLa1PV-lNJBPQpgRvjuLI' // ⚠️ coloca tua key aqui
);

// =========================
// 📁 UPLOAD TEMP (local)
// =========================

const uploadPath = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadPath),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    })
});

// =========================
// 🚀 CRIAR ORÇAMENTO
// =========================

app.post('/orcamento', upload.single('foto'), async (req, res) => {
    try {
        const b = req.body;

        let fotoUrl = null;

        if (req.file) {
            const fileName = Date.now() + '-' + req.file.originalname;

            const { error: uploadError } = await supabase.storage
                .from('orcamentos')
                .upload(fileName, fs.readFileSync(req.file.path), {
                    contentType: req.file.mimetype
                });

            if (!uploadError) {
                const { data } = supabase.storage
                    .from('orcamentos')
                    .getPublicUrl(fileName);

                fotoUrl = data.publicUrl;
            }

            fs.unlinkSync(req.file.path);
        }

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
            aplicacao_final: b.aplicacao === 'outro' ? b.aplicacao_outro : b.aplicacao,

            quantidade: b.quantidade || '',

            diametro_externo: b.diametro_externo || '',
            diametro_interno: b.diametro_interno || '',
            espessura_disco: b.espessura_disco || '',
            tipo_fio: b.tipo_fio || '',
            tipo_fio_desc: b.tipo_fio_desc || '',
            obs_disco: b.obs_disco || '',

            largura: b.largura || '',
            comprimento: b.comprimento || '',
            espessura_lamina: b.espessura_lamina || '',
            obs_lamina: b.obs_lamina || '',

            medidas_usinagem: b.medidas_usinagem || '',

            foto: fotoUrl,

            resposta_vendedor: '',
            status: 'pendente',
            data: new Date().toLocaleString()
        };

        const { error } = await supabase
            .from('orcamentos')
            .insert([novo]);

        if (error) return res.status(500).json({ error });

        res.json({ ok: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno' });
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

app.post('/orcamento/:id/resposta', async (req, res) => {

    const { error } = await supabase
        .from('orcamentos')
        .update({
            resposta_vendedor: req.body.resposta,
            status: 'respondido'
        })
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error });

    res.json({ ok: true });
});

// =========================
// 📄 PDF
// =========================

app.get('/orcamento/:id/pdf', async (req, res) => {

    const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (error || !data) return res.status(404).send('Não encontrado');

    const item = data;

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    const prod = (item.tipo_produto || '').toUpperCase();

    let med = '';
    if (item.tipo_produto === 'disco') {
        med = `D${item.diametro_externo || ''}x${item.diametro_interno || ''}x${item.espessura_disco || ''}mm`;
    }
    if (item.tipo_produto === 'lamina') {
        med = `${item.largura || ''}x${item.comprimento || ''}x${item.espessura_lamina || ''}mm`;
    }
    if (item.tipo_produto === 'usinagem') {
        med = item.medidas_usinagem || '';
    }

    const titulo = `${prod} ${med} Fio ${item.tipo_fio || ''} ${item.material || ''}`;

    doc.fontSize(18).text('ORÇAMENTO TÉCNICO', { align: 'center' });
    doc.moveDown();

    doc.text(`Cliente: ${item.cliente_cargo}`);
    doc.text(`Telefone: ${item.telefone}`);
    doc.moveDown();

    doc.text(`Material: ${item.material}`);
    doc.text(`Aplicação: ${item.aplicacao_final}`);
    doc.text(`Quantidade: ${item.quantidade}`);
    doc.moveDown();

    if (item.resposta_vendedor) {
        doc.text('Resposta:');
        doc.text(item.resposta_vendedor);
    }

    // 🔥 IMAGEM FUNCIONANDO (SUPABASE)
    if (item.foto) {
        try {
            const response = await axios({
    url: item.foto,
    method: 'GET',
    responseType: 'arraybuffer'
});
            const imgBuffer = Buffer.from(response.data, 'binary');

            doc.addPage();
            doc.image(imgBuffer, {
                fit: [400, 400],
                align: 'center'
            });

        } catch (e) {
            console.log('Erro imagem:', e);
        }
    }

    doc.end();
});

// =========================
// 🚀 START
// =========================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Rodando na porta ' + PORT));