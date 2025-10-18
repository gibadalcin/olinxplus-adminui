// Converte URLs blob: em File/Blob e anexa como `pendingFile` nos blocos antes do envio
export async function attachBlobFilesToBlocos(blocos) {
    if (!Array.isArray(blocos)) return blocos;
    // Trabalhar sobre os próprios objetos (mutação intencional para manter referências React)
    for (let i = 0; i < blocos.length; i++) {
        const b = blocos[i];
        if (!b) continue;
        try {
            // bloco único (imagem/video)
            if (b.url && typeof b.url === 'string' && b.url.startsWith && b.url.startsWith('blob:') && !b.pendingFile) {
                try {
                    const resp = await fetch(b.url);
                    const blob = await resp.blob();
                    const filename = (b.nome || b.filename || `file_${Date.now()}`).toString();
                    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                    b.pendingFile = file;
                    if (!b.temp_id) b.temp_id = `tmp_${Date.now()}_${Math.floor(Math.random()*1000000)}`;
                    if (!b.created_at) b.created_at = new Date().toISOString();
                    // revoga a URL local para liberar memória
                    try { if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(b.url); } catch (e) { /* ignore */ }
                    // limpar campo url e conteudo (se for blob:) para evitar validação que bloqueie envio
                    try { if (b.url) b.url = ""; } catch (e) { /* ignore */ }
                    try { if (b.conteudo && typeof b.conteudo === 'string' && b.conteudo.startsWith && b.conteudo.startsWith('blob:')) b.conteudo = ""; } catch (e) { /* ignore */ }
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
                    if (it.url && typeof it.url === 'string' && it.url.startsWith && it.url.startsWith('blob:') && !(it.pendingFile || (it.meta && it.meta.pendingFile))) {
                        try {
                            const resp = await fetch(it.url);
                            const blob = await resp.blob();
                            const filename = (it.nome || (it.meta && it.meta.nome) || `file_${Date.now()}`).toString();
                            const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                            // prefer to attach as meta.pendingFile if meta exists
                            if (it.meta) {
                                it.meta.pendingFile = file;
                                if (!it.meta.temp_id) it.meta.temp_id = `tmp_${Date.now()}_${Math.floor(Math.random()*1000000)}`;
                                if (!it.meta.created_at) it.meta.created_at = new Date().toISOString();
                                try { if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(it.url); } catch (e) { /* ignore */ }
                                // limpar url e conteudo no meta para evitar bloqueio de validação
                                try { if (it.meta && it.meta.url) it.meta.url = ""; } catch (e) { /* ignore */ }
                                try { if (it.meta && it.meta.conteudo && typeof it.meta.conteudo === 'string' && it.meta.conteudo.startsWith && it.meta.conteudo.startsWith('blob:')) it.meta.conteudo = ""; } catch (e) { /* ignore */ }
                            } else {
                                it.pendingFile = file;
                                if (!it.temp_id) it.temp_id = `tmp_${Date.now()}_${Math.floor(Math.random()*1000000)}`;
                                if (!it.created_at) it.created_at = new Date().toISOString();
                                try { if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(it.url); } catch (e) { /* ignore */ }
                                // limpar campo url e conteudo para evitar validação que bloqueie envio
                                try { if (it.url) it.url = ""; } catch (e) { /* ignore */ }
                                try { if (it.conteudo && typeof it.conteudo === 'string' && it.conteudo.startsWith && it.conteudo.startsWith('blob:')) it.conteudo = ""; } catch (e) { /* ignore */ }
                            }
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
