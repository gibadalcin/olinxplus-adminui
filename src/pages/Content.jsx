import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import Header from "../components/globalContext/Header";
import MainTitle from "../components/globalContext/MainTitle";
import Copyright from "../components/globalContext/Copyright";
import CustomButton from "../components/globalContext/CustomButton";
import { IoArrowBackOutline } from "react-icons/io5";
import LocationPicker from "../components/contentContext/LocationPicker";
import FadeIn from "../components/globalContext/FadeIn";
import { useMarcas } from "../hooks/useMarcas";
import { useImagens } from "../hooks/useImages";
import ContentActions from "../components/contentContext/ContentActions";
import ContentBlockType from "../components/contentContext/ContentBlockType"; // import do novo componente
import ConfirmModal from "../components/globalContext/ConfirmModal";
import BlockTypeSelect from "../components/contentContext/BlockTypeSelect";
import MarcaSelect from "../components/contentContext/MarcaSelect";

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
    const [tipoRegiao, setTipoRegiao] = useState("");
    const [nomeRegiao, setNomeRegiao] = useState("");
    const [tipoBloco, setTipoBloco] = useState(""); // estado para tipo de bloco
    const [blocos, setBlocos] = useState([]); // lista de blocos já criados
    const [isMobile, setIsMobile] = useState(window.innerWidth <= width);
    const [showContent, setShowContent] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [nextMarca, setNextMarca] = useState(null);
    const navigate = useNavigate();

    const { marcas, marca, setMarca, loadingMarcas } = useMarcas(ownerId);
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
        try {
            const res = await fetch(`/api/conteudo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome_marca: marca,
                    blocos,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    tipo_regiao: tipoRegiao,
                    nome_regiao: nomeRegiao,
                }),
            });
            const contentType = res.headers.get('content-type');
            if (!res.ok || !contentType || !contentType.includes('application/json')) {
                const errorText = await res.text();
                console.error('Erro ao cadastrar conteúdo:', { status: res.status, contentType, errorText });
                alert('Erro ao cadastrar conteúdo!');
                return;
            }
            alert("Conteúdo cadastrado!");
            setLatitude("");
            setLongitude("");
            setTipoBloco("");
        } catch (err) {
            console.error('Erro inesperado ao cadastrar conteúdo:', err);
            alert('Erro inesperado ao cadastrar conteúdo!');
        }
    };

    const [tipoSelecionado, setTipoSelecionado] = useState("");
    const [conteudoBloco, setConteudoBloco] = useState("");

    function getNextLabel(type) {
        const count = blocos.filter(b => b.tipoSelecionado === type).length + 1;
        switch (type) {
            case "subtitulo":
                return `Subtítulo ${count}`;
            case "carousel":
                return `Carousel ${count}`;
            case "imagem":
                return `Imagem topo ${count}`;
            case "video":
                return `Vídeo ${count}`;
            case "titulo":
                return `Título ${count}`;
            default:
                return type.charAt(0).toUpperCase() + type.slice(1);
        }
    }

    const LIMITE_BLOCOS = 10; // exemplo

    function handleAddBloco() {
        if (!tipoSelecionado || !conteudoBloco.trim() || blocos.length >= LIMITE_BLOCOS) return;
        const label = getNextLabel(tipoSelecionado);
        const novoBloco = { tipo: label, conteudo: conteudoBloco, tipoSelecionado };
        setBlocos([...blocos, novoBloco]);
        setConteudoBloco("");
        setTipoSelecionado("");
    }

    function handleChangeMarca(novaMarca) {
        if (blocos.length > 0) {
            setNextMarca(novaMarca);
            setShowModal(true);
        } else {
            setMarca(novaMarca);
        }
    }

    function handleConfirmTrocaMarca() {
        setBlocos([]);
        setMarca(nextMarca);
        setShowModal(false);
        setNextMarca(null);
        // Desativa o botão de salvar (camposDesativados = true)
        // Se o botão depende de blocos.length > 0, já estará desativado
        // Se depende de outro estado, pode adicionar um estado extra
    }

    function handleCancelTrocaMarca() {
        setShowModal(false);
        setNextMarca(null);
    }

    function handleRemoveBloco(idx) {
        setBlocos(blocos.filter((_, i) => i !== idx));
        // Se bloco tem id, pode adicionar chamada ao backend para deletar
        const bloco = blocos[idx];
        if (bloco && bloco._id) {
            fetch(`/api/conteudo/bloco/${bloco._id}`, {
                method: "DELETE"
            })
                .then(async res => {
                    const contentType = res.headers.get('content-type');
                    if (!res.ok || !contentType || !contentType.includes('application/json')) {
                        const errorText = await res.text();
                        console.error('Erro ao remover bloco:', { status: res.status, contentType, errorText });
                    }
                })
                .catch(err => {
                    console.error('Erro inesperado ao remover bloco:', err);
                });
        }
    }

    useEffect(() => {
        // Removido fetch antigo que usava apenas 'marca'.
        // O fetch principal abaixo já garante os parâmetros corretos.
        if (!(marca && latitude && longitude)) {
            setBlocos([]);
            return;
        }
        if (marca && latitude && longitude) {
            const url = `/api/conteudo?nome_marca=${encodeURIComponent(marca)}&latitude=${latitude}&longitude=${longitude}`;
            console.log('Buscando blocos na URL:', url);
            fetch(url)
                .then(async res => {
                    const contentType = res.headers.get('content-type');
                    if (!res.ok || !contentType || !contentType.includes('application/json')) {
                        const errorText = await res.text();
                        console.error('Erro ao buscar blocos:', { status: res.status, contentType, errorText, url });
                        setBlocos([]);
                        return;
                    }
                    const data = await res.json();
                    // Se não houver conteúdo, mostra tela vazia sem erro
                    if (!data || !data.conteudo) {
                        setBlocos([]);
                    } else if (Array.isArray(data.conteudo)) {
                        setBlocos(data.conteudo);
                    } else {
                        setBlocos([data.conteudo]);
                    }
                })
                .catch(err => {
                    console.error('Erro inesperado ao buscar blocos:', err, url);
                    setBlocos([]);
                });
        } else {
            setBlocos([]);
        }
    }, [marca, latitude, longitude]);

    function handleEditBloco(idx, novoConteudo) {
        const bloco = blocos[idx];
        const novosBlocos = [...blocos];
        novosBlocos[idx] = { ...bloco, conteudo: novoConteudo };
        setBlocos(novosBlocos);
        // Se bloco tem id, atualizar no backend
        if (bloco._id) {
            fetch(`/api/conteudo/bloco/${bloco._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conteudo: novoConteudo })
            })
                .then(async res => {
                    const contentType = res.headers.get('content-type');
                    if (!res.ok || !contentType || !contentType.includes('application/json')) {
                        const errorText = await res.text();
                        console.error('Erro ao editar bloco:', { status: res.status, contentType, errorText });
                    }
                })
                .catch(err => {
                    console.error('Erro inesperado ao editar bloco:', err);
                });
        }
    }

    return (
        <>
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
                    disabled={
                        !marca ||
                        !latitude ||
                        !longitude ||
                        camposDesativados ||
                        blocos.length === 0
                    }
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
                                    maxWidth: isMobile ? "96vw" : "auto",
                                    padding: "20px"
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    width: isMobile ? '100%' : 'auto',
                                    minWidth: isMobile ? 'auto' : '800px',
                                }}>
                                    <LocationPicker
                                        latitude={latitude}
                                        longitude={longitude}
                                        setLatitude={setLatitude}
                                        setLongitude={setLongitude}
                                        tipoRegiao={tipoRegiao}
                                        setTipoRegiao={setTipoRegiao}
                                        nomeRegiao={nomeRegiao}
                                        setNomeRegiao={setNomeRegiao}
                                    />
                                </div>
                                <ContentBlockType
                                    tipoSelecionado={tipoSelecionado}
                                    setTipoSelecionado={setTipoSelecionado}
                                    conteudo={conteudoBloco}
                                    setConteudo={setConteudoBloco}
                                    disabled={camposDesativados || blocos.length >= LIMITE_BLOCOS}
                                    blocos={blocos}
                                    onRemoveBloco={handleRemoveBloco}
                                    onEditBloco={handleEditBloco}
                                    onAddBloco={handleAddBloco}
                                />
                                <Copyright />
                            </form>
                        </Box>
                    </FadeIn>
                </div>
                {/* Select fixo no canto inferior direito - FORA do Box/FadeIn */}
                <div style={{
                    position: "fixed",
                    width: isMobile ? "90vw" : "240px",
                    gap: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    bottom: 24,
                    right: 32,
                    background: "rgba(255,255,255,0.10)",
                    padding: "8px",
                    boxShadow: "0 -2px 8px rgba(0,0,0,0.10)",
                    borderRadius: "8px",
                    zIndex: 9999
                }}>
                    <MarcaSelect
                        marcas={marcas}
                        marca={marca}
                        setMarca={handleChangeMarca}
                        loadingMarcas={loadingMarcas}
                    />
                    <BlockTypeSelect
                        value={tipoSelecionado}
                        onChange={e => setTipoSelecionado(e.target.value)}
                        disabled={camposDesativados}
                        isMobile={isMobile}
                    />
                </div>
            </div>
            <ConfirmModal
                open={showModal}
                onConfirm={handleConfirmTrocaMarca}
                onCancel={handleCancelTrocaMarca}
            />
        </>
    );
}