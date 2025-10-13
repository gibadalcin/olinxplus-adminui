import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TextField, Box } from "@mui/material";
import Header from "../components/globalContext/Header";
import MainTitle from "../components/globalContext/MainTitle";
import Copyright from "../components/globalContext/Copyright";
import CustomButton from "../components/globalContext/CustomButton";
import UrlInputs from "../components/globalContext/URLInputs";
import { IoArrowBackOutline } from "react-icons/io5";
import LocationPicker from "../components/contentContext/LocationPicker";
import FadeIn from "../components/globalContext/FadeIn";
import { useMarcas } from "../hooks/useMarcas";
import MarcaSelect from "../components/contentContext/MarcaSelect";
import { useImagens } from "../hooks/useImages";
import ContentActions from "../components/contentContext/ContentActions";

export default function Content() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const ownerId = params.get("ownerId");
    const imageId = params.get("imageId");

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
    const [texto, setTexto] = useState("");
    const [videos, setVideos] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= width);
    const [showContent, setShowContent] = useState(false);
    const navigate = useNavigate();

    // Hook de marcas
    const { marcas, marca, setMarca, loadingMarcas } = useMarcas(ownerId);

    // Hook de imagens
    const { imagens, setImagens, imagensInput, setImagensInput, loading: loadingImagens } = useImagens(ownerId, imageId);

    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth <= width);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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
            <ContentActions
                onSubmit={handleSubmit}
                disabled={camposDesativados}
            />
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
                            height: '100vh',
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
                                    <MarcaSelect
                                        marcas={marcas}
                                        marca={marca}
                                        setMarca={setMarca}
                                        loadingMarcas={loadingMarcas}
                                    />
                                </div>
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