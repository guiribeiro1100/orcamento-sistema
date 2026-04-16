const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-client');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Substitua APENAS o texto entre as aspas simples
const supabaseUrl = 'SUA_URL_AQUI';
const supabaseKey = 'SUA_CHAVE_AQUI';
const supabase = createClient(supabaseUrl, supabaseKey);

const uploadPath = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
app.use('/uploads', express.static(uploadPath));
app.use(express.static(__dirname));

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})});

app.post('/orcamento', upload.single('foto'), async (req, res) => {
    try {
        const b = req.body;
        const { error } = await supabase.from('orcamentos').insert([{
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

app.get('/orcamentos', async (req, res) => {
    const { data, error } = await supabase.from('orcamentos').select('*').order('id', { ascending: false });
    res.json(data || []);
});

app.post('/orcamento/:id/resposta', async (req, res) => {
    const { error } = await supabase.from('orcamentos')
        .update({ resposta_vendedor: req.body.resposta, status: 'respondido' })
        .eq('id', req.params.id);
    res.json({ ok: !error });
});

app.get('/orcamento/:id/pdf', async (req, res) => {
    try {
        const { data: item, error } = await supabase.from('orcamentos').select('*').eq('id', req.params.id).single();
        if (error || !item) return res.status(404).send('Nao encontrado');

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

        doc.fillColor('#1e40af').fontSize(20).font('Helvetica-Bold').text('ORCAMENTO TECNICO', { align: 'center' });
        doc.fontSize(10).fillColor('#64748b').text(`Data: ${item.data || '-'}`, { align: 'center' }).moveDown();

        doc.rect(40, doc.y, 515, 25).fill('#f8fafc');
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(titulo, 40, doc.y + 7, { align: 'center' }).moveDown(1.5);

        const criarSecao = (t, c) => {
            doc.rect(40, doc.y, 515, 18).fill(c);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text('  ' + t, 40, doc.y + 4).moveDown(0.5);
            doc.fillColor('#000000').font('Helvetica').fontSize(11).moveDown(0.2);
        };

        criarSecao('DADOS DO CLIENTE', '#1e40af');
        doc.text(`CNPJ: ${item.cnpj || '-'} | Vendedor: ${item.vendedor || '-'} | WhatsApp: ${item.telefone || '-'}`).moveDown();

        criarSecao('DETALHES TECNICOS', '#1e40af');
        doc.text(`Maquina: ${item.nome_maquina || '-'} | Material: ${item.material || '-'}`);
        doc.text(`Fio: ${item.tipo_fio || '-'} | Perfil: ${item.perfil || '-'}`);
        doc.text(`Quantidade: ${item.quantidade || '-'} | Aplicacao: ${item.aplicacao_final || '-'}`).moveDown();

        if (item.resposta_vendedor) {
            criarSecao('RESPOSTA', '#ca8a04');
            doc.text(item.resposta_vendedor, { align: 'justify' }).moveDown();
        }

        if (item.foto) {
            const p = path.resolve(__dirname, item.foto.replace(/^\//, ''));
            if (fs.existsSync(p)) {
                doc.addPage();
                doc.image(p, { fit: [450, 500], align: 'center' });
            }
        }
        doc.end();
    } catch (e) {
        res.status(500).send("Erro no PDF");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));