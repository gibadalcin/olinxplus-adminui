import { useState, useEffect, useRef } from "react";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
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
import { useBlocos } from "../hooks/useBlocos";

export default function Content() {
    // Drag para mobile
    const dragOffset = useRef({ x: 0, y: 0 });
    function handleDragStart(e) {
        // Permite drag tanto no mobile quanto no desktop
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        const rect = dragRef.current?.getBoundingClientRect();
        dragOffset.current = {
            x: clientX - (rect?.left || window.innerWidth / 2),
            y: clientY - (rect?.top || (isMobile ? window.innerHeight * 0.86 : window.innerHeight * 0.10))
        };
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', handleDragMove, { passive: false });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', handleDragEnd);
    }
    function handleDragMove(e) {
        e.preventDefault();
        const isTouch = e.type === 'touchmove';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        if (isMobile) {
            setDragPos({
                left: `${clientX - dragOffset.current.x}px`,
                bottom: `${window.innerHeight - clientY - 10}px`
            });
        } else {
            setDragPos({
                top: `${clientY - dragOffset.current.y}px`,
                right: `${window.innerWidth - clientX - 32}px`
            });
        }
    }
    function handleDragEnd(e) {
        const isTouch = e.type === 'touchend';
        document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', handleDragMove);
        document.removeEventListener(isTouch ? 'touchend' : 'mouseup', handleDragEnd);
    }
    // Estado para posição do grupo arrastável no mobile
    const [dragPos, setDragPos] = useState({ bottom: '2%', left: '50%' });
    const dragRef = useRef(null);
    // Função para comparar blocos
    function blocosIguais(a, b) {
        if (a.length !== b.length) return false;
        return a.every((bloco, i) =>
            bloco.tipo === b[i]?.tipo && bloco.conteudo === b[i]?.conteudo
        );
    }
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
    const [isMobile, setIsMobile] = useState(window.innerWidth <= width);
    const [blocosOriginais, setBlocosOriginais] = useState([]);
    const [texto, setTexto] = useState("");
    const [videos, setVideos] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [tipoRegiao, setTipoRegiao] = useState("");

    // Limpa blocos ao trocar tipo de local
    function handleChangeTipoRegiao(novoTipo) {
        setTipoRegiao(novoTipo);
        setBlocos([]);
        setBlocosOriginais([]);
    }
    const [nomeRegiao, setNomeRegiao] = useState("");
    const [tipoBloco, setTipoBloco] = useState(""); // estado para tipo de bloco
    const {
        blocos,
        setBlocos,
        tipoSelecionado,
        setTipoSelecionado,
        conteudoBloco,
        setConteudoBloco,
        handleAddBloco,
        handleRemoveBloco,
        handleEditBloco,
        getNextLabel,
        resetBlocos,
    } = useBlocos(10);
    const [nextMarca, setNextMarca] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const navigate = useNavigate();
    const { marcas, marca, setMarca, loadingMarcas } = useMarcas(ownerId);
    const { imagens, setImagens, imagensInput, setImagensInput, loading: loadingImagens } = useImagens(ownerId, imageId);

    // Lógica para cor/texto do botão principal (depois de marca)
    let botaoCor = "#4cd964"; // verde padrão
    let botaoTexto = "Salvar";
    if (
        blocos.length === 0 && blocosOriginais.length > 0 && marca && latitude && longitude && tipoRegiao && nomeRegiao
    ) {
        botaoCor = "#ff3b30"; // vermelho para exclusão
        botaoTexto = "Excluir";
    }

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

    // Snackbar para feedback profissional
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (blocosIguais(blocos, blocosOriginais)) {
            setSnackbarMsg("Nenhuma alteração detectada nos blocos. Nada foi salvo.");
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
            return;
        }
        try {
            const blocosLimpos = blocos.map(({ tipo, conteudo }) => ({ tipo, conteudo }));
            const payload = {
                nome_marca: marca,
                blocos: blocosLimpos,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                tipo_regiao: tipoRegiao,
                nome_regiao: nomeRegiao,
            };
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/conteudo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const contentType = res.headers.get('content-type');
            if (!res.ok || !contentType || !contentType.includes('application/json')) {
                const errorText = await res.text();
                console.error('Erro ao cadastrar conteúdo:', { status: res.status, contentType, errorText, payload });
                setSnackbarMsg('Erro ao cadastrar conteúdo!');
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
                return;
            }
            const data = await res.json();
            if (data.action === "deleted") {
                setSnackbarMsg("Conteúdo excluído com sucesso!");
                setSnackbarSeverity("error"); // vermelho para exclusão
            } else if (data.action === "saved") {
                setSnackbarMsg("Conteúdo salvo com sucesso!");
                setSnackbarSeverity("success");
            } else {
                setSnackbarMsg("Operação realizada!");
                setSnackbarSeverity("success");
            }
            setSnackbarOpen(true);
            // Limpa todos os campos após salvar/excluir para evitar confusão
            setLatitude("");
            setLongitude("");
            setNomeRegiao("");
            setTipoRegiao("");
            setBlocos([]);
            setTipoBloco("");
        } catch (err) {
            console.error('Erro inesperado ao cadastrar conteúdo:', err);
            setSnackbarMsg('Erro inesperado ao cadastrar conteúdo!');
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    function handleChangeMarca(novaMarca) {
        // Modal deve aparecer se houver blocos em edição, mesmo se tipoRegiao ou nomeRegiao estiverem preenchidos
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
        resetBlocos();
    }

    function handleCancelTrocaMarca() {
        setShowModal(false);
        setNextMarca(null);
    }

    const lastUrlRef = useRef("");
    useEffect(() => {
        if (!(marca && tipoRegiao && nomeRegiao)) {
            setBlocos([]);
            setBlocosOriginais([]);
            lastUrlRef.current = "";
            return;
        }
        const url = `${import.meta.env.VITE_API_BASE_URL}/api/conteudo-por-regiao?nome_marca=${encodeURIComponent(marca)}&tipo_regiao=${encodeURIComponent(tipoRegiao)}&nome_regiao=${encodeURIComponent(nomeRegiao)}`;
        if (lastUrlRef.current === url) {
            // Evita fetch duplicado
            return;
        }
        lastUrlRef.current = url;
        console.log('Buscando blocos na URL:', url);
        fetch(url)
            .then(async res => {
                const contentType = res.headers.get('content-type');
                if (!res.ok || !contentType || !contentType.includes('application/json')) {
                    const errorText = await res.text();
                    console.error('Erro ao buscar blocos:', { status: res.status, contentType, errorText, url });
                    setBlocos([]);
                    setBlocosOriginais([]);
                    return;
                }
                const data = await res.json();
                if (!data || !Array.isArray(data.blocos)) {
                    setBlocos([]);
                    setBlocosOriginais([]);
                } else {
                    setBlocos(data.blocos);
                    setBlocosOriginais(data.blocos);
                }
            })
            .catch(err => {
                console.error('Erro inesperado ao buscar blocos:', err, url);
                setBlocos([]);
                setBlocosOriginais([]);
            });
    }, [marca, latitude, longitude, tipoRegiao, nomeRegiao]);

    const inputRef = useRef(null);

    useEffect(() => {
        if (showModal && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showModal, tipoSelecionado]);

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
                                        setTipoRegiao={handleChangeTipoRegiao}
                                        nomeRegiao={nomeRegiao}
                                        setNomeRegiao={setNomeRegiao}
                                    />
                                </div>
                                <ContentBlockType
                                    tipoSelecionado={tipoSelecionado}
                                    setTipoSelecionado={setTipoSelecionado}
                                    conteudo={conteudoBloco}
                                    setConteudo={setConteudoBloco}
                                    disabled={camposDesativados || blocos.length >= 10}
                                    blocos={blocos}
                                    onRemoveBloco={handleRemoveBloco}
                                    onEditBloco={(idx, tipo, conteudo) => {
                                        setBlocos(prev =>
                                            prev.map((b, i) => i === idx ? { tipo, conteudo } : b)
                                        );
                                    }}
                                    onAddBloco={handleAddBloco}
                                />
                                <Copyright />
                            </form>
                        </Box>
                    </FadeIn>
                </div>
                {/* Controles alinhados à direita no desktop, layout original no mobile */}
                <div
                    ref={dragRef}
                    style={{
                        position: 'fixed',
                        ...(isMobile
                            ? {
                                bottom: dragPos.bottom || undefined,
                                left: dragPos.left || undefined,
                                transform: "translateX(-50%)",
                            }
                            : {
                                top: dragPos.top || "10%",
                                right: dragPos.right || "5%",
                            }
                        ),
                        width: "240px",
                        gap: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        background: "rgba(255,255,255,0.28)",
                        padding: "8px",
                        boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
                        borderRadius: "8px",
                        zIndex: 9999,
                        touchAction: 'none',
                        cursor: 'grab'
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            height: '22px',
                            background: 'rgba(0,0,0,0.18)',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'grab',
                            userSelect: 'none',
                        }}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        title="Arraste por aqui"
                    >
                        <span style={{ color: '#fff', fontSize: 16, opacity: 0.7 }}>≡</span>
                    </div>
                    <MarcaSelect
                        marcas={marcas}
                        marca={marca}
                        setMarca={handleChangeMarca}
                        loadingMarcas={loadingMarcas}
                    />
                    <BlockTypeSelect
                        value={tipoSelecionado}
                        onChange={e => setTipoSelecionado(e.target.value)}
                        disabled={camposDesativados || !tipoRegiao || !nomeRegiao}
                        isMobile={isMobile}
                    />
                    {/* Botões fixos no canto superior direito */}
                    <ContentActions
                        onSubmit={handleSubmit}
                        disabled={
                            !marca ||
                            !latitude ||
                            !longitude ||
                            !tipoRegiao ||
                            !nomeRegiao ||
                            (
                                (blocos.length === 0 && blocosOriginais.length === 0) ||
                                (blocos.length > 0 && blocosIguais(blocos, blocosOriginais)) ||
                                blocos.some(b => !b.tipo || !b.conteudo)
                            )
                        }
                        color={botaoCor}
                        label={botaoTexto}
                    />
                    {/* Botão dashboard e salvar podem ser adicionados aqui se existirem como componentes */}
                </div>
            </div>
            <ConfirmModal
                open={showModal}
                onConfirm={handleConfirmTrocaMarca}
                onCancel={handleCancelTrocaMarca}
            />
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3500}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <MuiAlert
                    elevation={6}
                    variant="filled"
                    onClose={handleSnackbarClose}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMsg}
                </MuiAlert>
            </Snackbar>
        </>
    );
}