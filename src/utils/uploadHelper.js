// Converte URLs blob: em File/Blob e anexa como `pendingFile` nos blocos antes do envio
export async function attachBlobFilesToBlocos(blocos) {
    if (!Array.isArray(blocos)) return blocos;
    // Trabalhar sobre os próprios objetos (mutação intencional para manter referências React)
    for (let i = 0; i < blocos.length; i++) {
        const b = blocos[i];
        if (!b) continue;
        try {
            // bloco único (imagem/video)
            // detectar blob: em b.url, b.conteudo, b.meta.url ou b.meta.conteudo
            const blockBlobUrl = (b && ((typeof b.url === 'string' && b.url.startsWith && b.url.startsWith('blob:')) ? b.url : null))
                || (b && b.meta && (typeof b.meta.url === 'string' && b.meta.url.startsWith && b.meta.url.startsWith('blob:')) ? b.meta.url : null)
                || (b && (typeof b.conteudo === 'string' && b.conteudo.startsWith && b.conteudo.startsWith('blob:')) ? b.conteudo : null)
                || (b && b.meta && (typeof b.meta.conteudo === 'string' && b.meta.conteudo.startsWith && b.meta.conteudo.startsWith('blob:')) ? b.meta.conteudo : null);
            if (blockBlobUrl && !(b.meta && b.meta.pendingFile)) {
                try {
                    const resp = await fetch(blockBlobUrl);
                    const blob = await resp.blob();
                    const filename = (b.nome || b.filename || `file_${Date.now()}`).toString();
                    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                    b.meta = { ...(b.meta || {}), pendingFile: file };
                    if (!b.meta.temp_id) b.meta.temp_id = `tmp_${Date.now()}_${Math.floor(Math.random()*1000000)}`;
                    if (!b.meta.created_at) b.meta.created_at = new Date().toISOString();
                    // revoga todas as possíveis URLs blob: relacionadas ao bloco
                    try { if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') { if (b.url && String(b.url).startsWith('blob:')) URL.revokeObjectURL(b.url); if (b.meta && b.meta.url && String(b.meta.url).startsWith('blob:')) URL.revokeObjectURL(b.meta.url); } } catch (e) { /* ignore */ }
                    // limpar campos que possam conter blob:
                    try { if (b.url && String(b.url).startsWith('blob:')) b.url = ""; } catch (e) { /* ignore */ }
                    try { if (b.conteudo && typeof b.conteudo === 'string' && b.conteudo.startsWith && b.conteudo.startsWith('blob:')) b.conteudo = ""; } catch (e) { /* ignore */ }
                    try { if (b.meta && b.meta.url && String(b.meta.url).startsWith('blob:')) b.meta.url = ""; } catch (e) { /* ignore */ }
                    try { if (b.meta && b.meta.conteudo && typeof b.meta.conteudo === 'string' && b.meta.conteudo.startsWith && b.meta.conteudo.startsWith('blob:')) b.meta.conteudo = ""; } catch (e) { /* ignore */ }
                } catch (err) {
                    console.warn('[attachBlobFilesToBlocos] falha ao transformar blob em File para bloco', i, err);
                }
            }
            // carousel items
            if (Array.isArray(b.items)) {
                for (let j = 0; j < b.items.length; j++) {
                    const it = b.items[j];
                    if (!it) continue;
                    // item.url can be blob: and meta.pendingFile absent
                    // Detecta blob: em it.url, it.conteudo, it.meta.url ou it.meta.conteudo
                    const itemBlobUrl = (it && ((typeof it.url === 'string' && it.url.startsWith && it.url.startsWith('blob:')) ? it.url : null))
                        || (it && it.meta && (typeof it.meta.url === 'string' && it.meta.url.startsWith && it.meta.url.startsWith('blob:')) ? it.meta.url : null)
                        || (it && (typeof it.conteudo === 'string' && it.conteudo.startsWith && it.conteudo.startsWith('blob:')) ? it.conteudo : null)
                        || (it && it.meta && (typeof it.meta.conteudo === 'string' && it.meta.conteudo.startsWith && it.meta.conteudo.startsWith('blob:')) ? it.meta.conteudo : null);
                    if (itemBlobUrl && !(it.meta && it.meta.pendingFile)) {
                        try {
                            const resp = await fetch(itemBlobUrl);
                            const blob = await resp.blob();
                            const filename = (it.nome || (it.meta && it.meta.nome) || `file_${Date.now()}`).toString();
                            const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                            // Always attach to it.meta.pendingFile (create meta if missing)
                            it.meta = { ...(it.meta || {}), pendingFile: file };
                            if (!it.meta.temp_id) it.meta.temp_id = `tmp_${Date.now()}_${Math.floor(Math.random()*1000000)}`;
                            if (!it.meta.created_at) it.meta.created_at = new Date().toISOString();
                            try { if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') { if (it.url && String(it.url).startsWith('blob:')) URL.revokeObjectURL(it.url); if (it.meta && it.meta.url && String(it.meta.url).startsWith('blob:')) URL.revokeObjectURL(it.meta.url); } } catch (e) { /* ignore */ }
                            // clear any fields that may have held blob:
                            try { if (it.meta && it.meta.url && String(it.meta.url).startsWith('blob:')) it.meta.url = ""; } catch (e) { /* ignore */ }
                            try { if (it.meta && it.meta.conteudo && typeof it.meta.conteudo === 'string' && it.meta.conteudo.startsWith && it.meta.conteudo.startsWith('blob:')) it.meta.conteudo = ""; } catch (e) { /* ignore */ }
                            try { if (it.url && String(it.url).startsWith('blob:')) it.url = ""; } catch (e) { /* ignore */ }
                            try { if (it.conteudo && typeof it.conteudo === 'string' && it.conteudo.startsWith && it.conteudo.startsWith('blob:')) it.conteudo = ""; } catch (e) { /* ignore */ }
                        } catch (err) {
                            console.warn('[attachBlobFilesToBlocos] falha ao transformar blob em File para item', i, j, err);
                        }
                    }
                }
            }
        } catch (e) {
            // proteção geral para não interromper processamento de outros blocos
            console.warn('[attachBlobFilesToBlocos] erro ao processar bloco', i, e);
        }
    }
    return blocos;
}
