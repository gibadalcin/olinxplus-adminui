import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TextField, Box } from "@mui/material";
import Header from "../components/globalContext/Header";
import MainTitle from "../components/globalContext/MainTitle";
import Copyright from "../components/globalContext/Copyright";
import CustomButton from "../components/globalContext/CustomButton";
import UrlInputs from "../components/globalContext/URLInputs";
import { fetchMarcas, fetchImagesByOwner } from "../api";
import { IoArrowBackOutline } from "react-icons/io5";
import LocationPicker from "../components/contentContext/LocationPicker";
import FadeIn from "../components/globalContext/FadeIn";

export default function Content() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const ownerId = params.get("ownerId");
    const imageId = params.get("imageId");

    // Adicione esta verificação:
    if (!ownerId) {
        return (
            <div style={{ color: "#fff", padding: "2rem" }}>
                <h2>Erro ao carregar conteúdo</h2>
                <p>Parâmetro <b>ownerId</b> não informado na URL.</p>
                <CustomButton onClick={() => window.history.back()}>Voltar</CustomButton>
            </div>
        );
    }

    const [width, setWidth] = useState(768);
    const [marca, setMarca] = useState("");
    const [marcas, setMarcas] = useState([]);
    const [texto, setTexto] = useState("");
    const [imagens, setImagens] = useState([]);
    const [imagensInput, setImagensInput] = useState("");
    const [videos, setVideos] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= width);
    const [loadingMarcas, setLoadingMarcas] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth <= width);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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
    }, [buscarMarcas, imageId]);

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

    useEffect(() => {
        setTimeout(() => setShowContent(true), 400);
    }, []);

    const camposDesativados = !marca;

    const handleSubmit = async (e) => {
        e.preventDefault();
        await fetch("/api/conteudo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome_marca: marca,
                texto,
                imagens: Array.isArray(imagens) ? imagens : [],
                videos: videos.split(",").map(v => v.trim()).filter(Boolean),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
            }),
        });
        alert("Conteúdo cadastrado!");
        setTexto("");
        setImagens([]);
        setVideos("");
        setLatitude("");
        setLongitude("");
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100vw",
                backgroundColor: "#012E57",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                overflow: "hidden",
            }}
        >
            {/* Ícone de voltar */}
            <button
                onClick={() => navigate("/images")}
                style={{
                    position: "fixed",
                    top: 24,
                    left: isMobile ? 8 : 32,
                    zIndex: 10000,
                    background: "none",
                    border: "none",
                    borderRadius: 0,
                    width: "auto",
                    height: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "none",
                    transition: "background 0.2s"
                }}
                title="Voltar para gerenciamento de imagens"
            >
                <IoArrowBackOutline size={isMobile ? 38 : 44} color="#ffffff" />
            </button>
            {/* Botões fixos no canto superior direito */}
            <div style={{
                position: "fixed",
                top: 24,
                right: 32,
                zIndex: 10001,
                display: "flex",
                flexDirection: "column",
                gap: "12px"
            }}>
                <CustomButton
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    style={{
                        background: "#012E57",
                        color: "#fff",
                        textShadow: "0 1px 4px rgba(255,255,255,0.15)",
                        border: "1px solid rgba(255,255,255,0.90)",
                    }}
                >
                    Dashboard
                </CustomButton>
                <CustomButton
                    type="submit"
                    onClick={handleSubmit}
                    disabled={camposDesativados}
                    style={{
                        background: "#4cd964",
                        color: "#151515",
                        textShadow: "2px 2px 4px rgba(0,0,0,0.15)",
                        border: "1px solid rgba(255,255,255,0.90)",
                    }}>
                    Salvar
                </CustomButton>
            </div>
            <div style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
            }}>
                <FadeIn show={showContent}>
                    <Box
                        sx={{
                            width: '100vw',
                            paddingTop: "4rem",
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            color: "#fff",
                            overflowY: "auto",
                            scrollbarWidth: "none",
                            "&::-webkit-scrollbar": {
                                display: "none",
                            },
                        }}
                    >
                        <Header />
                        <MainTitle isMobile={isMobile}>Cadastrar Conteúdo</MainTitle>
                        {/* Remova os botões do formulário */}
                        <form
                            onSubmit={handleSubmit}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: isMobile ? ".8rem" : "1.5rem",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                                maxWidth: isMobile ? "96vw" : "900px",
                                padding: "20px"
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: isMobile ? "column" : "row",
                                    gap: isMobile ? "1rem" : "2rem",
                                    width: "100%",
                                    marginBottom: isMobile ? "0.8rem" : "1.5rem",
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <LocationPicker
                                        latitude={latitude}
                                        longitude={longitude}
                                        setLatitude={setLatitude}
                                        setLongitude={setLongitude}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <select
                                        value={marca}
                                        onChange={e => setMarca(e.target.value)}
                                        disabled={loadingMarcas || marcas.length === 0}
                                        style={{ width: "100%", padding: "8px", fontSize: "1rem", borderRadius: "6px" }}
                                    >
                                        <option value="" disabled>Selecione uma marca</option>
                                        {marcas.map(m => (
                                            <option key={m.id} value={m.nome}>
                                                {m.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <TextField
                                label="Texto"
                                value={texto}
                                onChange={e => setTexto(e.target.value)}
                                multiline
                                rows={4}
                                fullWidth
                                disabled={camposDesativados}
                                sx={{
                                    borderRadius: 2,
                                    color: "#fff",
                                    minHeight: "48px",
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff !important' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#fff !important' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff !important' },
                                    '& .MuiInputLabel-root': { color: '#fff' },
                                    '& .MuiInputBase-input': { color: '#fff', minHeight: "48px", display: "flex", alignItems: "center" },
                                }}
                                slotProps={{
                                    input: { style: { color: "#fff", minHeight: "48px", display: "flex", alignItems: "center" } }
                                }}
                                style={{ marginTop: 16, width: "100%" }}
                            />
                            <div style={{ width: "100%" }}>
                                <UrlInputs
                                    imagens={imagensInput}
                                    setImagens={val => {
                                        setImagensInput(val);
                                    }}
                                    videos={videos}
                                    setVideos={setVideos}
                                    disabled={camposDesativados}
                                />
                            </div>
                            <Copyright />
                        </form>
                        {!loadingMarcas && marcas.length === 0 && (
                            <p style={{ marginTop: 16 }}>
                                Nenhuma marca cadastrada. Cadastre uma marca para liberar o formulário.
                            </p>
                        )}
                    </Box>
                </FadeIn>
            </div>
        </div>
    );
}