app.get('/orcamento/:id/pdf', async (req, res) => {

    // 🔥 BUSCAR NO SUPABASE (CORRETO)
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

    // 🔥 MEDIDAS CORRETAS
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

    doc.fillColor('#1e40af')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('ORÇAMENTO TÉCNICO', { align: 'center' });

    doc.fontSize(10)
       .fillColor('#64748b')
       .text(`Data: ${item.data || '-'}`, { align: 'center' })
       .moveDown();

    doc.rect(40, doc.y, 515, 25).fill('#f8fafc');

    doc.fillColor('#0f172a')
       .font('Helvetica-Bold')
       .fontSize(12)
       .text(titulo, 40, doc.y + 7, { align: 'center' })
       .moveDown(1.5);

    const criarSecao = (t, c) => {
        doc.rect(40, doc.y, 515, 18).fill(c);
        doc.fillColor('#ffffff')
           .font('Helvetica-Bold')
           .fontSize(11)
           .text('  ' + t, 40, doc.y + 4)
           .moveDown(0.5);

        doc.fillColor('#000000')
           .font('Helvetica')
           .fontSize(11)
           .moveDown(0.2);
    };

    // CLIENTE
    criarSecao('DADOS DO CLIENTE', '#1e40af');
    doc.text(`CNPJ: ${item.cnpj || '-'} | Vendedor: ${item.vendedor || '-'} | WhatsApp: ${item.telefone || '-'}`)
       .moveDown();

    // TÉCNICO
    criarSecao('DETALHES TÉCNICOS', '#1e40af');
    doc.text(`Máquina: ${item.nome_maquina || '-'} | Material: ${item.material || '-'}`);
    doc.text(`Quantidade: ${item.quantidade || '-'}`);
    doc.text(`Aplicação: ${item.aplicacao_final || '-'}`);
    doc.text(`Fio: ${item.tipo_fio || '-'} ${item.tipo_fio_desc || ''}`)
       .moveDown();

    // DETALHES DO PRODUTO
    if (item.tipo_produto === 'disco') {
        doc.text(`Diâmetro externo: ${item.diametro_externo || '-'}`);
        doc.text(`Diâmetro interno: ${item.diametro_interno || '-'}`);
        doc.text(`Espessura: ${item.espessura_disco || '-'}`);
        doc.text(`Observação: ${item.obs_disco || '-'}`);
    }

    if (item.tipo_produto === 'lamina') {
        doc.text(`Largura: ${item.largura || '-'}`);
        doc.text(`Comprimento: ${item.comprimento || '-'}`);
        doc.text(`Espessura: ${item.espessura_lamina || '-'}`);
        doc.text(`Observação: ${item.obs_lamina || '-'}`);
    }

    if (item.tipo_produto === 'usinagem') {
        doc.text(`Medidas: ${item.medidas_usinagem || '-'}`);
    }

    doc.moveDown();

    // RESPOSTA
    if (item.resposta_vendedor) {
        criarSecao('RESPOSTA', '#ca8a04');
        doc.text(item.resposta_vendedor, { align: 'justify' }).moveDown();
    }

    // ANEXO
    if (item.foto) {
        try {
            const p = path.resolve(__dirname, item.foto.replace('/uploads/', 'uploads/'));

            if (fs.existsSync(p)) {
                doc.addPage();
                doc.image(p, {
                    fit: [450, 500],
                    align: 'center'
                });
            }
        } catch (e) {
            console.log('Erro imagem:', e);
        }
    }

    doc.end();
});