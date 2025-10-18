import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { uploadContentImage } from "../api";
import { attachBlobFilesToBlocos } from "../utils/uploadHelper";
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
import DeletePreviewModal from "../components/globalContext/DeletePreviewModal";
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
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const width = 768;
    const { marcas, marca, setMarca, loadingMarcas } = useMarcas(ownerId);
    // garante que, quando as marcas forem carregadas, a primeira seja selecionada como padrão
    useEffect(() => {
        if ((!marca || marca === "") && Array.isArray(marcas) && marcas.length > 0) {
            // preferir campo `nome`, fallback para `id` ou índice
            const first = marcas[0];
            const value = first && (first.nome || first.name || first.id || "");
            if (value) setMarca(value);
        }
    }, [marcas, marca, setMarca]);
    const [blocosOriginais, setBlocosOriginais] = useState([]);
    const [isExistingContent, setIsExistingContent] = useState(false);
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [tipoRegiao, setTipoRegiao] = useState("");
    const [nomeRegiao, setNomeRegiao] = useState("");
    const [tipoBloco, setTipoBloco] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showContent, setShowContent] = useState(false);
    const [nextMarca, setNextMarca] = useState(null);
    const [subtipo, setSubtipo] = useState("");

    function handleChangeTipoRegiao(novo) {
        setTipoRegiao(novo);
    }
    let botaoCor = "#4cd964"; // verde padrão
    let botaoTexto = "Salvar";
    if (
        blocos.length === 0 && isExistingContent && marca && tipoRegiao && nomeRegiao
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
    const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0, errors: [] });

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    // State for delete preview modal
    const [showDeletePreview, setShowDeletePreview] = useState(false);
    const [pendingDeleteList, setPendingDeleteList] = useState([]);
    const [pendingSave, setPendingSave] = useState(null); // { payload, token }

    const handleConfirmDeletePreview = async () => {
        try {
            if (!pendingSave) return;
            const { payload, token } = pendingSave;
            const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/conteudo`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const contentType = res.headers.get('content-type');
            if (!res.ok || !contentType || !contentType.includes('application/json')) {
                const errorText = await res.text();
                console.error('Erro ao cadastrar conteúdo (confirm):', { status: res.status, contentType, errorText, payload });
                setSnackbarMsg('Erro ao cadastrar conteúdo!');
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
                setShowDeletePreview(false);
                setPendingSave(null);
                return;
            }
            const data = await res.json();
            // reuse existing handling logic: set snackbars/state accordingly
            if (data.action === "deleted") {
                setSnackbarMsg("Conteúdo excluído com sucesso!");
                setSnackbarSeverity("error");
                setLatitude("");
                setLongitude("");
                setNomeRegiao("");
                setTipoRegiao("");
                setBlocos([]);
                setBlocosOriginais([]);
                setTipoBloco("");
                setIsExistingContent(false);
            } else if (data.action === "saved") {
                setSnackbarMsg("Conteúdo salvo com sucesso!");
                setSnackbarSeverity("success");
                const savedBlocos = data.blocos && Array.isArray(data.blocos) ? data.blocos : payload.blocos;
                setBlocos(savedBlocos);
                setBlocosOriginais(savedBlocos);
                setIsExistingContent(true);
            } else {
                setSnackbarMsg("Operação realizada!");
                setSnackbarSeverity("success");
            }
            setSnackbarOpen(true);
            setShowDeletePreview(false);
            setPendingSave(null);
        } catch (err) {
            console.error('Erro inesperado ao confirmar delete preview:', err);
            setSnackbarMsg('Erro inesperado ao cadastrar conteúdo!');
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            setShowDeletePreview(false);
            setPendingSave(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Primeiro: transformar quaisquer URLs blob: em File/Blob e anexar como pendingFile
        try {
            await attachBlobFilesToBlocos(blocos);
        } catch (err) {
            console.warn('[handleSubmit] falha ao anexar blob files:', err);
        }

        if (blocosIguais(blocos, blocosOriginais)) {
            setSnackbarMsg("Nenhuma alteração detectada nos blocos. Nada foi salvo.");
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
            return;
        }
        try {
            // Primeiro: enviar ao backend todos os arquivos pendentes (pendingFile) que foram carregados localmente
            const user = getAuth().currentUser;
            let token = null;
            if (user) token = await user.getIdToken();
            const updatedBlocos = [...blocos];
            // (simplified) não usamos matching complexo por temp_id; atualizamos os blocos diretamente
            // prepara contador de uploads (inclui pending files em blocos e em items de carousel)
            const isFileLike = (x) => {
                try {
                    return x && typeof x === 'object' && (typeof x.name === 'string' || typeof x.size === 'number');
                } catch (e) { return false; }
            };
            const totalPending = updatedBlocos.reduce((acc, b) => {
                let c = acc;
                if (b && isFileLike(b.pendingFile)) c += 1;
                if (b && Array.isArray(b.items)) {
                    c += b.items.reduce((ai, it) => ai + ((it && (isFileLike(it.pendingFile) || (it.meta && isFileLike(it.meta.pendingFile)))) ? 1 : 0), 0);
                }
                return c;
            }, 0);
            setUploadProgress({ done: 0, total: totalPending, errors: [] });
            // Contadores locais para evitar ler estado assíncrono logo em seguida
            let localDone = 0;
            let localErrors = [];

            // Simples: enviar cada arquivo pendente por ocorrência (bloco e items)
            for (let i = 0; i < updatedBlocos.length; i++) {
                const b = updatedBlocos[i];
                if (!b) continue;
                // upload de pendingFile do próprio bloco (single image)
                // only upload single-image pendingFile when it's a File/Blob, not a boolean flag used by carousel blocks
                if (b && isFileLike(b.pendingFile)) {
                    updatedBlocos[i] = { ...b, upload_status: 'uploading', upload_error: null };
                    setBlocos([...updatedBlocos]);
                    try {
                        const formData = new FormData();
                        formData.append('file', b.pendingFile);
                        // include deterministic temp_id if present to map upload response
                        if (b.temp_id) formData.append('temp_id', b.temp_id);
                        else if (b.meta && b.meta.temp_id) formData.append('temp_id', b.meta.temp_id);
                        formData.append('name', b.pendingFile.name || 'file');
                        formData.append('subtipo', b.subtipo || '');
                        formData.append('marca', marca || '');
                        formData.append('tipo_regiao', tipoRegiao || '');
                        formData.append('nome_regiao', nomeRegiao || '');
                        // tentativa com retry simples (até 2 tentativas) para reduzir falhas transitórias (422 etc.)
                        let result = null;
                        let attempts = 0;
                        while (attempts < 2) {
                            attempts += 1;
                            result = await uploadContentImage(formData, token);
                            if (result && result.success) break;
                            console.warn(`[handleSubmit] tentativa ${attempts} falhou para upload de bloco (index ${i})`, result);
                        }
                        if (result && result.success) {
                            const serverBloco = result.bloco || {};
                            // preferir URL permanente (serverBloco.url ou result.url) para persistência;
                            // usar signed_url apenas como fallback para preview
                            const resolvedUrl = serverBloco.url || result.url || result.signed_url || b.url || '';
                            const resolvedNome = serverBloco.nome || result.nome || b.nome || serverBloco.name || '';
                            const resolvedFilename = serverBloco.filename || result.filename || b.filename || '';
                            const resolvedType = serverBloco.type || result.type || b.type || '';
                            updatedBlocos[i] = {
                                ...b,
                                url: resolvedUrl,
                                nome: resolvedNome,
                                filename: resolvedFilename,
                                type: resolvedType,
                                created_at: serverBloco.created_at || result.created_at || b.created_at || new Date().toISOString(),
                                upload_status: 'done',
                                upload_error: null,
                            };
                            if (updatedBlocos[i].pendingFile) delete updatedBlocos[i].pendingFile;
                            // metadados já aplicados diretamente ao bloco acima
                            setUploadProgress(prev => ({ ...prev, done: prev.done + 1 }));
                            localDone += 1;
                            setBlocos([...updatedBlocos]);
                        } else {
                            console.warn('[handleSubmit] Falha ao enviar arquivo pendente para o servidor após retries', result);
                            updatedBlocos[i] = { ...b, upload_status: 'error', upload_error: result && (result.error || JSON.stringify(result)) ? (result.error || JSON.stringify(result)) : 'unknown' };
                            setBlocos([...updatedBlocos]);
                            const errObj = { index: i, reason: result && result.error ? result.error : JSON.stringify(result) };
                            setUploadProgress(prev => ({ ...prev, errors: [...prev.errors, errObj] }));
                            localErrors.push(errObj);
                            // show server-provided message when possible
                            const serverMsg = result && result.error ? (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)) : 'Falha ao enviar arquivo';
                            setSnackbarMsg(`Falha ao enviar arquivo: ${serverMsg}`);
                            setSnackbarSeverity('error');
                            setSnackbarOpen(true);
                            return;
                        }
                    } catch (err) {
                        console.error('[handleSubmit] Erro ao enviar arquivo pendente:', err);
                        updatedBlocos[i] = { ...b, upload_status: 'error', upload_error: String(err) };
                        setBlocos([...updatedBlocos]);
                        setUploadProgress(prev => ({ ...prev, errors: [...prev.errors, { index: i, reason: String(err) }] }));
                        setSnackbarMsg('Erro ao enviar arquivos de imagem. Veja console.');
                        setSnackbarSeverity('error');
                        setSnackbarOpen(true);
                        return;
                    }
                }
                // upload de pending files dentro de carousel items
                if (b && Array.isArray(b.items)) {
                    for (let j = 0; j < b.items.length; j++) {
                        const it = b.items[j];
                        const pending = (it && (it.pendingFile || (it.meta && it.meta.pendingFile)));
                        if (pending) {
                            updatedBlocos[i] = { ...updatedBlocos[i], upload_status: 'uploading', upload_error: null };
                            setBlocos([...updatedBlocos]);
                            try {
                                const fileObj = it.pendingFile || (it.meta && it.meta.pendingFile);
                                const formData = new FormData();
                                formData.append('file', fileObj);
                                // include deterministic temp_id for carousel item if present
                                if (it.temp_id) formData.append('temp_id', it.temp_id);
                                else if (it.meta && it.meta.temp_id) formData.append('temp_id', it.meta.temp_id);
                                formData.append('name', fileObj.name || (it.meta && it.meta.nome) || 'item');
                                formData.append('subtipo', it.subtipo || '');
                                formData.append('marca', marca || '');
                                formData.append('tipo_regiao', tipoRegiao || '');
                                formData.append('nome_regiao', nomeRegiao || '');
                                // retry simples para uploads de item do carousel
                                let result = null;
                                let attempts = 0;
                                while (attempts < 2) {
                                    attempts += 1;
                                    result = await uploadContentImage(formData, token);
                                    if (result && result.success) break;
                                    console.warn(`[handleSubmit] tentativa ${attempts} falhou para upload de item carousel (index ${i} item ${j})`, result);
                                }
                                if (result && result.success) {
                                    const serverBloco = result.bloco || {};
                                    const newItems = (updatedBlocos[i].items || []).slice();
                                    // preferir URL permanente do servidor antes do signed_url
                                    const resolvedItUrl = serverBloco.url || result.url || result.signed_url || newItems[j].url || '';
                                    const resolvedItNome = serverBloco.nome || result.nome || newItems[j].nome || serverBloco.name || '';
                                    const resolvedItFilename = serverBloco.filename || result.filename || newItems[j].filename || '';
                                    const resolvedItType = serverBloco.type || result.type || newItems[j].type || '';
                                    newItems[j] = {
                                        ...(newItems[j] || {}),
                                        url: resolvedItUrl,
                                        nome: resolvedItNome,
                                        filename: resolvedItFilename,
                                        type: resolvedItType,
                                        created_at: serverBloco.created_at || result.created_at || newItems[j].created_at || new Date().toISOString(),
                                    };
                                    if (newItems[j].pendingFile) delete newItems[j].pendingFile;
                                    if (newItems[j].meta && newItems[j].meta.pendingFile) delete newItems[j].meta.pendingFile;
                                    updatedBlocos[i].items = newItems;
                                    // se não houver mais itens com pendingFile/ meta.pendingFile, remover pendingFile no bloco pai
                                    try {
                                        const anyPendingLeft = Array.isArray(newItems) && newItems.some(it => (it && ((it.pendingFile) || (it.meta && it.meta.pendingFile))));
                                        if (!anyPendingLeft && updatedBlocos[i].pendingFile) {
                                            delete updatedBlocos[i].pendingFile;
                                        }
                                    } catch (e) { }
                                    // metadados já aplicados diretamente ao item acima
                                    setUploadProgress(prev => ({ ...prev, done: prev.done + 1 }));
                                    localDone += 1;
                                    setBlocos([...updatedBlocos]);
                                } else {
                                    console.warn('[handleSubmit] Falha ao enviar item pendente do carousel após retries', result);
                                    updatedBlocos[i] = { ...updatedBlocos[i], upload_status: 'error', upload_error: result && (result.error || JSON.stringify(result)) ? (result.error || JSON.stringify(result)) : 'unknown' };
                                    setBlocos([...updatedBlocos]);
                                    setUploadProgress(prev => ({ ...prev, errors: [...prev.errors, { index: i, item: j, reason: result && result.error ? result.error : JSON.stringify(result) }] }));
                                    const serverMsg = result && result.error ? (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)) : 'Falha ao enviar item do carousel';
                                    setSnackbarMsg(`Falha ao enviar item do carousel: ${serverMsg}`);
                                    setSnackbarSeverity('error');
                                    setSnackbarOpen(true);
                                    return;
                                }
                            } catch (err) {
                                console.error('[handleSubmit] Erro ao enviar item pendente do carousel:', err);
                                updatedBlocos[i] = { ...updatedBlocos[i], upload_status: 'error', upload_error: String(err) };
                                setBlocos([...updatedBlocos]);
                                const errObj = { index: i, item: j, reason: String(err) };
                                setUploadProgress(prev => ({ ...prev, errors: [...prev.errors, errObj] }));
                                localErrors.push(errObj);
                                setSnackbarMsg('Erro ao enviar arquivos do carousel. Veja console.');
                                setSnackbarSeverity('error');
                                setSnackbarOpen(true);
                                return;
                            }
                        }
                    }
                }
            }
            // após uploads pendentes concluídos
            if (totalPending > 0) {
                const done = localDone;
                const total = totalPending;
                const errors = localErrors || [];
                if (errors.length === 0) {
                    setSnackbarMsg(`Uploads concluídos: ${done}/${total}`);
                    setSnackbarSeverity('success');
                    setSnackbarOpen(true);
                } else {
                    setSnackbarMsg(`Uploads concluídos: ${done}/${total}. Erros em ${errors.length} arquivos.`);
                    setSnackbarSeverity('warning');
                    setSnackbarOpen(true);
                }
            }
            // grava blocos atualizados no estado antes de montar o payload
            // sanitiza flags de pendingFile a nível de bloco para evitar badges persistentes
            try {
                for (let k = 0; k < updatedBlocos.length; k++) {
                    const blk = updatedBlocos[k];
                    if (!blk) continue;
                    if (Array.isArray(blk.items) && blk.items.length > 0) {
                        const anyPending = blk.items.some(it => (it && ((it.pendingFile) || (it.meta && it.meta.pendingFile))));
                        if (!anyPending && blk.pendingFile) delete blk.pendingFile;
                    }
                }
            } catch (e) { }
            setBlocos(updatedBlocos);

            // prepara sourceBlocos a partir dos blocos atualizados
            const sourceBlocos = (updatedBlocos && updatedBlocos.length) ? updatedBlocos : blocos;
            // Simples: reconstruir blocosLimpos diretamente a partir de updatedBlocos (sem heurísticas complexas)
            const blocosLimpos = sourceBlocos.map(b => {
                const tipoAtual = (b && (b.tipoSelecionado || b.tipo)) || '';
                // Heurística robusta para detectar blocos de mídia:
                // - tipoSelecionado explícito (imagem/carousel/video)
                // - label `tipo` que começa com 'imagem'/'video'/'carousel'
                // - presença de url/conteudo (gs://, /, http, blob:)
                // - presença de filename/nome/type
                // - items array (carousel)
                let isMedia = false;
                try {
                    const tipoSel = (b && b.tipoSelecionado) || '';
                    if (typeof tipoSel === 'string' && ['imagem', 'carousel', 'video'].includes(tipoSel.toLowerCase())) {
                        isMedia = true;
                    }
                    const tipoLabel = (b && b.tipo) || '';
                    if (!isMedia && typeof tipoLabel === 'string') {
                        const tl = tipoLabel.toLowerCase();
                        if (tl.startsWith('imagem') || tl.startsWith('video') || tl.startsWith('carousel')) isMedia = true;
                    }
                    if (!isMedia) {
                        const urlCand = (b && (b.url || b.conteudo)) || '';
                        if (urlCand && String(urlCand).trim() !== '') {
                            const s = String(urlCand);
                            if (s.startsWith('gs://') || s.startsWith('/') || s.startsWith('http') || s.startsWith('blob:')) isMedia = true;
                        }
                    }
                    if (!isMedia && (b && (b.filename || b.nome || b.type))) isMedia = true;
                    if (!isMedia && Array.isArray(b?.items) && b.items.length > 0) isMedia = true;
                } catch (e) { /* fallback: not media */ }
                const url = isMedia ? ((b && (b.url || b.conteudo)) ? (b.url || b.conteudo) : "") : "";
                // Garante nomes exatos esperados pelo backend
                let nome = (b && (b.nome || b.name)) ? (b.nome || b.name) : "";
                let filename = (b && b.filename) ? b.filename : "";
                if (!filename && url) {
                    if (String(url).startsWith("gs://")) {
                        const parts = String(url).split('/');
                        filename = parts.slice(3).join('/');
                        nome = parts[parts.length - 1] || nome;
                    } else {
                        try {
                            const u = new URL(String(url));
                            const parts = u.pathname.split('/').filter(Boolean);
                            nome = parts[parts.length - 1] || nome;
                            filename = parts.join('/');
                        } catch (e) {
                            // não é uma URL válida, deixa como estava
                        }
                    }
                }

                // map items (carousel) quando presente
                let items = undefined;
                if (Array.isArray(b?.items) && b.items.length > 0) {
                    items = b.items.map(it => {
                        const itUrl = (it && (it.url || it.conteudo)) ? (it.url || it.conteudo) : "";
                        let itNome = (it && (it.nome || (it.meta && it.meta.nome))) ? (it.nome || (it.meta && it.meta.nome)) : "";
                        let itFilename = (it && (it.filename || (it.meta && it.meta.filename))) ? (it.filename || (it.meta && it.meta.filename)) : "";
                        if (!itFilename && itUrl) {
                            if (String(itUrl).startsWith("gs://")) {
                                const parts = String(itUrl).split('/');
                                itFilename = parts.slice(3).join('/');
                                itNome = parts[parts.length - 1] || itNome;
                            } else {
                                try {
                                    const u = new URL(String(itUrl));
                                    const parts = u.pathname.split('/').filter(Boolean);
                                    itNome = parts[parts.length - 1] || itNome;
                                    itFilename = parts.join('/');
                                } catch (e) {
                                    // ignore
                                }
                            }
                        }
                        return {
                            subtipo: it?.subtipo ?? (it?.meta && it.meta.subtipo) ?? "",
                            url: itUrl,
                            nome: itNome,
                            filename: itFilename,
                            type: it?.type ?? (it?.meta && it.meta.type) ?? "",
                            created_at: it?.created_at ?? it?.createdAt ?? (it?.meta && it.meta.created_at) ?? new Date().toISOString(),
                            conteudo: it?.conteudo ?? (it?.meta && it.meta.conteudo) ?? ""
                        };
                    });
                }

                let blocoObj;
                if (isMedia) {
                    blocoObj = {
                        tipo: b?.tipo,
                        subtipo: b?.subtipo ?? "",
                        url,
                        nome,
                        filename,
                        type: b?.type ?? b?.content_type ?? "",
                        created_at: b?.created_at ?? b?.createdAt ?? new Date().toISOString(),
                        conteudo: b?.conteudo
                    };
                    if (items) blocoObj.items = items;
                } else {
                    // Para blocos de texto/não-mídia, enviar apenas o necessário
                    blocoObj = {
                        tipo: b?.tipo,
                        conteudo: b?.conteudo ?? ""
                    };
                }
                return blocoObj;
            });

            // Removidos logs de debug excessivos para produção

            // Validação: não enviar sem marca / região
            if (!marca || !tipoRegiao || !nomeRegiao) {
                setSnackbarMsg('Por favor selecione Marca, Tipo de Região e Nome da Região antes de salvar.');
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                console.warn('[handleSubmit] Campos obrigatórios ausentes:', { marca, tipoRegiao, nomeRegiao });
                return;
            }

            const payload = {
                nome_marca: marca,
                blocos: blocosLimpos,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                tipo_regiao: tipoRegiao,
                nome_regiao: nomeRegiao,
            };
            // DEBUG: inspecionar blocos antes da validação final de blob:
            // inspeção: dados prontos para validação (debug removido em produção)
            // Validação extra: não permitir envio de URLs locais (blob:)
            const invalidBlocks = (payload.blocos || []).map((b, idx) => {
                const u = (b.url || "") + "";
                const c = (b.conteudo || "") + "";
                if ((u.startsWith && u.startsWith('blob:')) || (c.startsWith && c.startsWith('blob:'))) {
                    return { index: idx, filename: b.filename || b.nome || '(sem nome)' };
                }
                return null;
            }).filter(Boolean);
            if (invalidBlocks.length > 0) {
                const preview = invalidBlocks.slice(0, 3).map(x => `#${x.index + 1} (${x.filename})`).join(', ');
                const msg = invalidBlocks.length <= 3
                    ? `Uploads pendentes nos blocos: ${preview}. Aguarde os uploads ou remova os blocos.`
                    : `Uploads pendentes em ${invalidBlocks.length} blocos (ex: ${preview}). Aguarde os uploads ou remova os blocos.`;
                setSnackbarMsg(msg);
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                console.warn('[handleSubmit] Bloqueado envio: blocos com URL blob: detectados', invalidBlocks);
                return;
            }
            // Garantir que o usuário esteja autenticado antes de enviar (backend espera token)
            if (!token) {
                setSnackbarMsg('Você precisa estar autenticado para salvar. Faça login e tente novamente.');
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                return;
            }
            const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
            // FIRST: dry-run to compute files that would be deleted
            const dryRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/conteudo?dry_run=true`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            const dryJson = await dryRes.json();
            if (dryRes.ok && dryJson && dryJson.action === 'dry_run') {
                const toDelete = Array.isArray(dryJson.to_delete) ? dryJson.to_delete : (dryJson.to_delete ? [dryJson.to_delete] : []);
                if (toDelete.length > 0) {
                    // show modal to confirm deletions only when there are files to remove
                    setPendingDeleteList(toDelete);
                    setShowDeletePreview(true);
                    // store payload and token to be used on confirm
                    setPendingSave({ payload, token });
                    return;
                }
                // if nothing to delete, continue to perform real save below
            }

            // fallback: if dry-run not supported or returned unexpected, proceed with a real save
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/conteudo`, {
                method: "POST",
                headers,
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
                // limpa campos após exclusão
                setLatitude("");
                setLongitude("");
                setNomeRegiao("");
                setTipoRegiao("");
                setBlocos([]);
                setBlocosOriginais([]);
                setTipoBloco("");
                // marca que não existe mais conteúdo salvo para esta marca/região
                setIsExistingContent(false);
            } else if (data.action === "saved") {
                setSnackbarMsg("Conteúdo salvo com sucesso!");
                setSnackbarSeverity("success");
                // manter os blocos salvos visíveis e marcar como originais
                const savedBlocos = data.blocos && Array.isArray(data.blocos) ? data.blocos : blocosLimpos;
                setBlocos(savedBlocos);
                setBlocosOriginais(savedBlocos);
                // marca que há conteúdo salvo (agora existe um documento persistido)
                setIsExistingContent(true);
                // não limpar latitude/longitude/tipoRegiao/nomeRegiao para permanecer na mesma página
            } else {
                setSnackbarMsg("Operação realizada!");
                setSnackbarSeverity("success");
            }
            setSnackbarOpen(true);
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
                    setIsExistingContent(false);
                    return;
                }
                const data = await res.json();
                if (!data || !Array.isArray(data.blocos)) {
                    setBlocos([]);
                    setBlocosOriginais([]);
                    setIsExistingContent(false);
                } else {
                    setBlocos(data.blocos);
                    setBlocosOriginais(data.blocos);
                    // marca que existe conteúdo previamente salvo para essa combinação de marca/região
                    setIsExistingContent(Array.isArray(data.blocos) && data.blocos.length > 0);
                }
            })
            .catch(err => {
                console.error('Erro inesperado ao buscar blocos:', err, url);
                setBlocos([]);
                setBlocosOriginais([]);
                setIsExistingContent(false);
            });
    }, [marca, latitude, longitude, tipoRegiao, nomeRegiao]);

    const inputRef = useRef(null);

    useEffect(() => {
        if (showModal && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showModal, tipoSelecionado]);

    // Validação por bloco: trata tipos diferentes (imagem, carousel, texto)
    function isBlockIncomplete(b) {
        if (!b) return true;
        if (!b.tipo && !b.tipoSelecionado) return true;
        const tipoRaw = (b.tipoSelecionado || b.tipo || '').toString().toLowerCase();
        // Imagem: aceita se houver url (gs://, / ou blob:) ou conteudo (caso o backend use conteudo)
        if (tipoRaw === 'imagem' || tipoRaw.startsWith('imagem')) {
            return !((b.url && String(b.url).trim() !== '') || (b.conteudo && String(b.conteudo).trim() !== '') || (b.pendingFile));
        }
        // Carousel: precisa ter array items com ao menos um item válido (url ou pendingFile)
        if (tipoRaw === 'carousel' || tipoRaw.startsWith('carousel')) {
            if (!Array.isArray(b.items) || b.items.length === 0) return true;
            return !b.items.some(it => it && ((it.url && String(it.url).trim() !== '') || (it.meta && it.meta.pendingFile) || (it.pendingFile)));
        }
        // Video type
        if (tipoRaw === 'video' || tipoRaw.startsWith('video')) {
            return !((b.url && String(b.url).trim() !== '') || (b.conteudo && String(b.conteudo).trim() !== '') || (b.pendingFile));
        }
        // Outros tipos de bloco (texto etc.): requerem conteudo não-vazio
        return !(b.conteudo && String(b.conteudo).trim() !== '');
    }

    const anyInvalidBlock = Array.isArray(blocos) && blocos.some(isBlockIncomplete);

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
                                    onEditBloco={handleEditBloco}
                                    onAddBloco={handleAddBloco}
                                    marca={marca}
                                    tipoRegiao={tipoRegiao}
                                    nomeRegiao={nomeRegiao}
                                    subtipo={subtipo}
                                    setSubtipo={setSubtipo}
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
                            (blocos.length === 0 && blocosOriginais.length === 0) ||
                            (blocos.length > 0 && blocosIguais(blocos, blocosOriginais)) ||
                            ((blocos.length >= blocosOriginais.length) && anyInvalidBlock)
                        }
                        color={botaoCor}
                        label={botaoTexto}
                    />
                    {/* Botão dashboard e salvar podem ser adicionados aqui se existirem como componentes */}
                </div>
            </div>
            {/* Modal that previews files that will be deleted by the pending save */}
            <DeletePreviewModal
                open={showDeletePreview}
                toDelete={pendingDeleteList}
                onConfirm={handleConfirmDeletePreview}
                onCancel={() => { setShowDeletePreview(false); setPendingSave(null); setPendingDeleteList([]); }}
            />

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

// util: heurística de match (veja explicação acima)