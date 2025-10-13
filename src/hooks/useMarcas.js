import { useState, useEffect, useCallback } from "react";
import { fetchMarcas } from "../api";

export function useMarcas(ownerId) {
    const [marcas, setMarcas] = useState([]);
    const [marca, setMarca] = useState("");
    const [loadingMarcas, setLoadingMarcas] = useState(true);

    const buscarMarcas = useCallback(async () => {
        setLoadingMarcas(true);
        try {
            const user = window.auth?.currentUser;
            if (!user) {
                setMarcas([]);
                setMarca("");
                return;
            }
            const token = await user.getIdToken();
            const idToFetch = ownerId || user.uid;
            const lista = await fetchMarcas(idToFetch, token);
            setMarcas(lista || []);
            if (lista && lista.length > 0) {
                setMarca(lista[0].nome);
            } else {
                setMarca("");
            }
        } catch {
            setMarcas([]);
            setMarca("");
        } finally {
            setLoadingMarcas(false);
        }
    }, [ownerId]);

    useEffect(() => {
        buscarMarcas();
    }, [buscarMarcas]);

    return { marcas, marca, setMarca, loadingMarcas };
}
