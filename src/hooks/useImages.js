import { useState, useEffect } from "react";
import { fetchImagesByOwner } from "../api";

export function useImagens(ownerId, imageId) {
    const [imagens, setImagens] = useState([]);
    const [imagensInput, setImagensInput] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setImagens([]);
        setImagensInput("");
        async function buscarImagens() {
            setLoading(true);
            try {
                const user = window.auth?.currentUser;
                if (!user) {
                    setImagens([]);
                    setImagensInput("");
                    return;
                }
                const token = await user.getIdToken();
                let imagensArray = [];
                if (ownerId) {
                    const imgs = await fetchImagesByOwner(ownerId, token);
                    // Prefer server-provided signed_url if present
                    const hasSigned = imgs.every(i => i && (i.signed_url || (i.meta && i.meta.signed_url)));
                    if (hasSigned) {
                        imagensArray = imgs.map(img => img.signed_url || (img.meta && img.meta.signed_url));
                    } else {
                        // Try to batch-request signed urls for all returned gs:// urls
                        const gsUrls = imgs.map(img => img.url).filter(Boolean);
                        if (gsUrls.length) {
                            try {
                                const { getSignedContentUrls } = await import('../api');
                                const mapping = await getSignedContentUrls(gsUrls);
                                imagensArray = gsUrls.map(u => mapping[u] || u);
                            } catch (e) {
                                console.error('Falha ao obter signed urls em lote, usando URLs originais', e);
                                imagensArray = gsUrls;
                            }
                        } else {
                            imagensArray = imgs.map(img => img.url);
                        }
                    }
                } else {
                    const imgs = await fetchImagesByOwner(user.uid, token);
                    // Prefer server-provided signed_url if present
                    const hasSigned = imgs.every(i => i && (i.signed_url || (i.meta && i.meta.signed_url)));
                    if (hasSigned) {
                        imagensArray = imgs.map(img => img.signed_url || (img.meta && img.meta.signed_url));
                    } else {
                        // Try to batch-request signed urls for all returned gs:// urls
                        const gsUrls = imgs.map(img => img.url).filter(Boolean);
                        if (gsUrls.length) {
                            try {
                                const { getSignedContentUrls } = await import('../api');
                                const mapping = await getSignedContentUrls(gsUrls);
                                imagensArray = gsUrls.map(u => mapping[u] || u);
                            } catch (e) {
                                console.error('Falha ao obter signed urls em lote, usando URLs originais', e);
                                imagensArray = gsUrls;
                            }
                        } else {
                            imagensArray = imgs.map(img => img.url);
                        }
                    }
                }
                setImagens(imagensArray);
                const nomes = imagensArray.map(url => {
                    try {
                        const urlObj = new URL(url);
                        return urlObj.pathname.split('/').pop();
                    } catch {
                        return url;
                    }
                });
                setImagensInput(nomes.join(", "));
            } finally {
                setLoading(false);
            }
        }
        buscarImagens();
    }, [ownerId, imageId]);

    return { imagens, setImagens, imagensInput, setImagensInput, loading };
}