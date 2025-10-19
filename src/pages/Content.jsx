import { useState, useEffect, useRef } from "react";
import { getAuth } from "firebase/auth";
import { uploadContentImage } from "../api";
import { attachBlobFilesToBlocos } from "../utils/uploadHelper";
import { revokeAllObjectUrls } from "../utils/fileUtils";
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
    // util: detecta se um objeto se parece com File/Blob
    function isFileLike(x) {
        try {
            return x && typeof x === 'object' && (typeof x.name === 'string' || typeof x.size === 'number');
        } catch (e) { return false; }
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
                // revoke any object URLs before clearing state
                try { revokeAllObjectUrls(blocos); } catch (e) { }
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
        // Converter blobs para File quando aplicável
        try {
            await attachBlobFilesToBlocos(blocos);
        } catch (err) {
            console.warn('[handleSubmit] falha ao anexar blob files:', err);
        }

        if (blocosIguais(blocos, blocosOriginais)) {
            setSnackbarMsg('Nenhuma alteração detectada nos blocos. Nada foi salvo.');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);
            return;
        }

        try {
            const user = getAuth().currentUser;
            let token = null;
            if (user) token = await user.getIdToken();

            // usar clone raso para preservar referências a objetos File (JSON.stringify|parse remove Files)
            const updatedBlocos = (blocos || []).slice();
            const localIsFileLike = isFileLike;

            // Upload de arquivos pendentes (bloco-level e items)
            for (let i = 0; i < updatedBlocos.length; i++) {
                const b = updatedBlocos[i];
                if (!b) continue;

                // bloco-level
                const blockFile = (b && (b.pendingFile || (b.meta && b.meta.pendingFile))) || null;
                if (localIsFileLike(blockFile)) {
                    try {
                        updatedBlocos[i] = { ...b, upload_status: 'uploading', upload_error: null };
                        setBlocos([...updatedBlocos]);
                        const fd = new FormData();
                        fd.append('file', blockFile);
                        if (b.temp_id) fd.append('temp_id', b.temp_id);
                        else if (b.meta && b.meta.temp_id) fd.append('temp_id', b.meta.temp_id);
                        fd.append('name', (blockFile && (blockFile.name || blockFile.filename)) || (b.nome || 'file'));
                        fd.append('subtipo', b.subtipo || '');
                        fd.append('marca', marca || '');
                        fd.append('tipo_regiao', tipoRegiao || '');
                        fd.append('nome_regiao', nomeRegiao || '');
                        const uploaded = await uploadContentImage(fd, token);
                        if (uploaded && uploaded.success) {
                            const serverBloco = uploaded.bloco || uploaded;
                            updatedBlocos[i] = {
                                ...updatedBlocos[i],
                                url: serverBloco.url || uploaded.url || updatedBlocos[i].url || '',
                                nome: serverBloco.nome || uploaded.nome || updatedBlocos[i].nome || '',
                                filename: serverBloco.filename || uploaded.filename || updatedBlocos[i].filename || '',
                                type: serverBloco.type || uploaded.type || updatedBlocos[i].type || '',
                                created_at: serverBloco.created_at || uploaded.created_at || updatedBlocos[i].created_at || new Date().toISOString(),
                                upload_status: 'done',
                                upload_error: null,
                            };
                            // limpar pendingFile references e quaisquer meta.url/meta.conteudo que possam conter blob:
                            try {
                                if (updatedBlocos[i].meta) {
                                    if (localIsFileLike(updatedBlocos[i].meta.pendingFile)) delete updatedBlocos[i].meta.pendingFile;
                                    if (updatedBlocos[i].meta.url && String(updatedBlocos[i].meta.url).startsWith('blob:')) delete updatedBlocos[i].meta.url;
                                    if (updatedBlocos[i].meta.conteudo && typeof updatedBlocos[i].meta.conteudo === 'string' && updatedBlocos[i].meta.conteudo.startsWith && updatedBlocos[i].meta.conteudo.startsWith('blob:')) delete updatedBlocos[i].meta.conteudo;
                                }
                                if (localIsFileLike(updatedBlocos[i].pendingFile)) delete updatedBlocos[i].pendingFile;
                            } catch (e) { /* ignore */ }
                            setBlocos([...updatedBlocos]);
                        } else {
                            throw new Error((uploaded && uploaded.error) ? JSON.stringify(uploaded.error) : 'upload failed');
                        }
                    } catch (err) {
                        console.error('[handleSubmit] Erro ao enviar arquivo pendente (bloco):', err);
                        updatedBlocos[i] = { ...updatedBlocos[i], upload_status: 'error', upload_error: String(err) };
                        setBlocos([...updatedBlocos]);
                        setSnackbarMsg('Erro ao enviar arquivos de imagem. Veja console.');
                        setSnackbarSeverity('error');
                        setSnackbarOpen(true);
                        return;
                    }
                }

                // items do carousel
                if (Array.isArray(b.items)) {
                    for (let j = 0; j < b.items.length; j++) {
                        const it = b.items[j];
                        if (!it) continue;
                        const itemFile = (it.pendingFile || (it.meta && it.meta.pendingFile)) || null;
                        if (localIsFileLike(itemFile)) {
                            try {
                                updatedBlocos[i] = { ...updatedBlocos[i], upload_status: 'uploading', upload_error: null };
                                setBlocos([...updatedBlocos]);
                                const fd = new FormData();
                                fd.append('file', itemFile);
                                if (it.temp_id) fd.append('temp_id', it.temp_id);
                                else if (it.meta && it.meta.temp_id) fd.append('temp_id', it.meta.temp_id);
                                fd.append('name', (itemFile && (itemFile.name || itemFile.filename)) || (it.nome || 'item'));
                                fd.append('subtipo', it.subtipo || '');
                                fd.append('marca', marca || '');
                                fd.append('tipo_regiao', tipoRegiao || '');
                                fd.append('nome_regiao', nomeRegiao || '');
                                const uploaded = await uploadContentImage(fd, token);
                                if (uploaded && uploaded.success) {
                                    const serverBloco = uploaded.bloco || uploaded;
                                    const newItems = (updatedBlocos[i].items || []).slice();
                                    newItems[j] = {
                                        ...newItems[j],
                                        url: serverBloco.url || uploaded.url || newItems[j].url || '',
                                        nome: serverBloco.nome || uploaded.nome || newItems[j].nome || '',
                                        filename: serverBloco.filename || uploaded.filename || newItems[j].filename || '',
                                        type: serverBloco.type || uploaded.type || newItems[j].type || '',
                                        created_at: serverBloco.created_at || uploaded.created_at || newItems[j].created_at || new Date().toISOString(),
                                    };
                                    // limpar pendingFile e quaisquer meta.url/meta.conteudo que possam conter blob:
                                    try {
                                        if (newItems[j].meta) {
                                            if (localIsFileLike(newItems[j].meta.pendingFile)) delete newItems[j].meta.pendingFile;
                                            if (newItems[j].meta.url && String(newItems[j].meta.url).startsWith('blob:')) delete newItems[j].meta.url;
                                            if (newItems[j].meta.conteudo && typeof newItems[j].meta.conteudo === 'string' && newItems[j].meta.conteudo.startsWith && newItems[j].meta.conteudo.startsWith('blob:')) delete newItems[j].meta.conteudo;
                                        }
                                        if (localIsFileLike(newItems[j].pendingFile)) delete newItems[j].pendingFile;
                                    } catch (e) { /* ignore */ }
                                    updatedBlocos[i].items = newItems;
                                    setBlocos([...updatedBlocos]);
                                } else {
                                    throw new Error((uploaded && uploaded.error) ? JSON.stringify(uploaded.error) : 'upload failed');
                                }
                            } catch (err) {
                                console.error('[handleSubmit] Erro ao enviar item pendente do carousel:', err);
                                updatedBlocos[i] = { ...updatedBlocos[i], upload_status: 'error', upload_error: String(err) };
                                setBlocos([...updatedBlocos]);
                                setSnackbarMsg('Erro ao enviar arquivos do carousel. Veja console.');
                                setSnackbarSeverity('error');
                                setSnackbarOpen(true);
                                return;
                            }
                        }
                    }
                }
            }

            // Após uploads, limpar flags pendentes locais
            try {
                updatedBlocos.forEach(blk => {
                    if (!blk) return;
                    if (Array.isArray(blk.items) && blk.items.length > 0) {
                        const anyPending = blk.items.some(it => (it && (localIsFileLike(it.pendingFile) || (it.meta && localIsFileLike(it.meta.pendingFile)))));
                        if (!anyPending && blk.meta && localIsFileLike(blk.meta.pendingFile)) delete blk.meta.pendingFile;
                    }
                });
            } catch (e) { /* ignore */ }

            setBlocos(updatedBlocos);

            // Montar payload e enviar dry-run + save (reaproveitar lógica existente)
            // Limpeza final: remover qualquer campo que contenha blob: para evitar rejeição pelo backend
            function cleanBlobFieldsFromBlocos(list) {
                if (!Array.isArray(list)) return list;
                for (let bi = 0; bi < list.length; bi++) {
                    const b = list[bi];
                    if (!b || typeof b !== 'object') continue;
                    try {
                        // campos no bloco
                        if (b.url && typeof b.url === 'string' && b.url.startsWith && b.url.startsWith('blob:')) delete b.url;
                        if (b.conteudo && typeof b.conteudo === 'string' && b.conteudo.startsWith && b.conteudo.startsWith('blob:')) delete b.conteudo;
                        if (b.meta) {
                            if (b.meta.url && typeof b.meta.url === 'string' && b.meta.url.startsWith && b.meta.url.startsWith('blob:')) delete b.meta.url;
                            if (b.meta.conteudo && typeof b.meta.conteudo === 'string' && b.meta.conteudo.startsWith && b.meta.conteudo.startsWith('blob:')) delete b.meta.conteudo;
                            // also remove common preview/temp fields if present
                            if (b.meta.previewUrl && typeof b.meta.previewUrl === 'string' && b.meta.previewUrl.startsWith && b.meta.previewUrl.startsWith('blob:')) delete b.meta.previewUrl;
                            if (b.meta.tmpUrl && typeof b.meta.tmpUrl === 'string' && b.meta.tmpUrl.startsWith && b.meta.tmpUrl.startsWith('blob:')) delete b.meta.tmpUrl;
                        }
                        // campos temporários comuns no próprio bloco
                        if (b.previewUrl && typeof b.previewUrl === 'string' && b.previewUrl.startsWith && b.previewUrl.startsWith('blob:')) delete b.previewUrl;
                        if (b.tmpUrl && typeof b.tmpUrl === 'string' && b.tmpUrl.startsWith && b.tmpUrl.startsWith('blob:')) delete b.tmpUrl;
                        // items
                        if (Array.isArray(b.items)) {
                            for (let ii = 0; ii < b.items.length; ii++) {
                                const it = b.items[ii];
                                if (!it || typeof it !== 'object') continue;
                                if (it.url && typeof it.url === 'string' && it.url.startsWith && it.url.startsWith('blob:')) delete it.url;
                                if (it.conteudo && typeof it.conteudo === 'string' && it.conteudo.startsWith && it.conteudo.startsWith('blob:')) delete it.conteudo;
                                if (it.meta) {
                                    if (it.meta.url && typeof it.meta.url === 'string' && it.meta.url.startsWith && it.meta.url.startsWith('blob:')) delete it.meta.url;
                                    if (it.meta.conteudo && typeof it.meta.conteudo === 'string' && it.meta.conteudo.startsWith && it.meta.conteudo.startsWith('blob:')) delete it.meta.conteudo;
                                    if (it.meta.previewUrl && typeof it.meta.previewUrl === 'string' && it.meta.previewUrl.startsWith && it.meta.previewUrl.startsWith('blob:')) delete it.meta.previewUrl;
                                    if (it.meta.tmpUrl && typeof it.meta.tmpUrl === 'string' && it.meta.tmpUrl.startsWith && it.meta.tmpUrl.startsWith('blob:')) delete it.meta.tmpUrl;
                                }
                                if (it.previewUrl && typeof it.previewUrl === 'string' && it.previewUrl.startsWith && it.previewUrl.startsWith('blob:')) delete it.previewUrl;
                                if (it.tmpUrl && typeof it.tmpUrl === 'string' && it.tmpUrl.startsWith && it.tmpUrl.startsWith('blob:')) delete it.tmpUrl;
                            }
                        }
                    } catch (e) {
                        // ignore per-block errors
                        continue;
                    }
                }
                return list;
            }

            try { cleanBlobFieldsFromBlocos(updatedBlocos); } catch (e) { /* ignore */ }
            const sourceBlocos = (updatedBlocos && updatedBlocos.length) ? updatedBlocos : blocos;
            const blocosLimpos = sourceBlocos.map(b => {
                const tipoAtual = (b && (b.tipoSelecionado || b.tipo)) || '';
                let isMedia = false;
                try {
                    const tipoSel = (b && b.tipoSelecionado) || '';
                    if (typeof tipoSel === 'string' && ['imagem', 'carousel', 'video'].includes(tipoSel.toLowerCase())) isMedia = true;
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
                } catch (e) { }
                const url = isMedia ? ((b && (b.url || b.conteudo)) ? (b.url || b.conteudo) : '') : '';
                let nome = (b && (b.nome || b.name)) ? (b.nome || b.name) : '';
                let filename = (b && b.filename) ? b.filename : '';
                if (!filename && url) {
                    if (String(url).startsWith('gs://')) {
                        const parts = String(url).split('/');
                        filename = parts.slice(3).join('/');
                        nome = parts[parts.length - 1] || nome;
                    } else {
                        try {
                            const u = new URL(String(url));
                            const parts = u.pathname.split('/').filter(Boolean);
                            nome = parts[parts.length - 1] || nome;
                            filename = parts.join('/');
                        } catch (e) { }
                    }
                }

                let items = undefined;
                if (Array.isArray(b?.items) && b.items.length > 0) {
                    items = b.items.map(it => {
                        const itUrl = (it && (it.url || it.conteudo)) ? (it.url || it.conteudo) : '';
                        let itNome = (it && (it.nome || (it.meta && it.meta.nome))) ? (it.nome || (it.meta && it.meta.nome)) : '';
                        let itFilename = (it && (it.filename || (it.meta && it.meta.filename))) ? (it.filename || (it.meta && it.meta.filename)) : '';
                        if (!itFilename && itUrl) {
                            if (String(itUrl).startsWith('gs://')) {
                                const parts = String(itUrl).split('/');
                                itFilename = parts.slice(3).join('/');
                                itNome = parts[parts.length - 1] || itNome;
                            } else {
                                try {
                                    const u = new URL(String(itUrl));
                                    const parts = u.pathname.split('/').filter(Boolean);
                                    itNome = parts[parts.length - 1] || itNome;
                                    itFilename = parts.join('/');
                                } catch (e) { }
                            }
                        }
                        return {
                            subtipo: it?.subtipo ?? (it?.meta && it.meta.subtipo) ?? '',
                            url: itUrl,
                            nome: itNome,
                            filename: itFilename,
                            type: it?.type ?? (it?.meta && it.meta.type) ?? '',
                            created_at: it?.created_at ?? it?.createdAt ?? (it?.meta && it.meta.created_at) ?? new Date().toISOString(),
                            conteudo: it?.conteudo ?? (it?.meta && it.meta.conteudo) ?? ''
                        };
                    });
                }

                if (isMedia) {
                    const blocoObj = { tipo: b?.tipo, subtipo: b?.subtipo ?? '', url, nome, filename, type: b?.type ?? b?.content_type ?? '', created_at: b?.created_at ?? b?.createdAt ?? new Date().toISOString(), conteudo: b?.conteudo };
                    if (items) blocoObj.items = items;
                    return blocoObj;
                }
                return { tipo: b?.tipo, conteudo: b?.conteudo ?? '' };
            });

            if (!marca || !tipoRegiao || !nomeRegiao) {
                setSnackbarMsg('Por favor selecione Marca, Tipo de Região e Nome da Região antes de salvar.');
                setSnackbarSeverity('warning');
                setSnackbarOpen(true);
                return;
            }

            const payload = { nome_marca: marca, blocos: blocosLimpos, latitude: parseFloat(latitude), longitude: parseFloat(longitude), tipo_regiao: tipoRegiao, nome_regiao: nomeRegiao };

            // dry-run
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
            const dryRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/conteudo?dry_run=true`, { method: 'POST', headers, body: JSON.stringify(payload) });
            let dryJson = {};
            try { dryJson = await dryRes.json(); } catch (e) { dryJson = {}; }
            if (dryRes.ok && dryJson && dryJson.action === 'dry_run') {
                const toDelete = Array.isArray(dryJson.to_delete) ? dryJson.to_delete : (dryJson.to_delete ? [dryJson.to_delete] : []);
                if (toDelete.length > 0) {
                    setPendingDeleteList(toDelete);
                    setShowDeletePreview(true);
                    setPendingSave({ payload, token });
                    return;
                }
            }

            // real save
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/conteudo`, { method: 'POST', headers, body: JSON.stringify(payload) });
            const contentType = res.headers.get('content-type');
            if (!res.ok || !contentType || !contentType.includes('application/json')) {
                const errorText = await res.text();
                console.error('Erro ao cadastrar conteúdo:', { status: res.status, contentType, errorText, payload });
                setSnackbarMsg('Erro ao cadastrar conteúdo!');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
                return;
            }
            const data = await res.json();
            if (data.action === 'deleted') {
                setSnackbarMsg('Conteúdo excluído com sucesso!');
                setSnackbarSeverity('error');
                setLatitude(''); setLongitude(''); setNomeRegiao(''); setTipoRegiao('');
                try { revokeAllObjectUrls(blocos); } catch (e) { }
                setBlocos([]); setBlocosOriginais([]); setTipoBloco(''); setIsExistingContent(false);
            } else if (data.action === 'saved') {
                setSnackbarMsg('Conteúdo salvo com sucesso!');
                setSnackbarSeverity('success');
                const savedBlocos = data.blocos && Array.isArray(data.blocos) ? data.blocos : blocosLimpos;
                setBlocos(savedBlocos); setBlocosOriginais(savedBlocos); setIsExistingContent(true);
            } else {
                setSnackbarMsg('Operação realizada!'); setSnackbarSeverity('success');
            }
            setSnackbarOpen(true);
        } catch (err) {
            console.error('Erro inesperado ao cadastrar conteúdo:', err);
            setSnackbarMsg('Erro inesperado ao cadastrar conteúdo!');
            setSnackbarSeverity('error');
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
            try { revokeAllObjectUrls(blocos); } catch (e) { }
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
                    try { revokeAllObjectUrls(blocos); } catch (e) { }
                    setBlocos([]);
                    setBlocosOriginais([]);
                    setIsExistingContent(false);
                    return;
                }
                const data = await res.json();
                if (!data || !Array.isArray(data.blocos)) {
                    try { revokeAllObjectUrls(blocos); } catch (e) { }
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