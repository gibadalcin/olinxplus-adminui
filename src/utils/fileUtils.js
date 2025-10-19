// Pequenas utilidades para lidar com object URLs (URL.createObjectURL)
export function revokeObjectUrlIfBlob(url) {
    try {
        if (!url) return;
        if (typeof url === 'string' && url.startsWith && url.startsWith('blob:')) {
            if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
                try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
            }
        }
    } catch (e) { /* ignore */ }
}

export function revokeObjectUrlsFromBloco(b) {
    if (!b) return;
    try {
        revokeObjectUrlIfBlob(b.url);
        revokeObjectUrlIfBlob(b.conteudo);
        if (b.meta) {
            try { revokeObjectUrlIfBlob(b.meta.url); } catch (e) {}
            try { revokeObjectUrlIfBlob(b.meta.conteudo); } catch (e) {}
        }
        if (Array.isArray(b.items)) {
            b.items.forEach(it => {
                if (!it) return;
                try { revokeObjectUrlIfBlob(it.url); } catch (e) {}
                try { revokeObjectUrlIfBlob(it.conteudo); } catch (e) {}
                if (it.meta) {
                    try { revokeObjectUrlIfBlob(it.meta.url); } catch (e) {}
                    try { revokeObjectUrlIfBlob(it.meta.conteudo); } catch (e) {}
                }
            });
        }
    } catch (e) { /* ignore */ }
}

export function revokeAllObjectUrls(blocos) {
    try {
        if (!Array.isArray(blocos)) return;
        for (let i = 0; i < blocos.length; i++) {
            try { revokeObjectUrlsFromBloco(blocos[i]); } catch (e) { }
        }
    } catch (e) { /* ignore */ }
}
