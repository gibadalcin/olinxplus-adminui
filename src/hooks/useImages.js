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
                    imagensArray = imgs.map(img => img.url);
                } else {
                    const imgs = await fetchImagesByOwner(user.uid, token);
                    imagensArray = imgs.map(img => img.url);
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