import { useState, useRef, useEffect, useMemo } from "react";
import { FiCalendar, FiPlus, FiX, FiExternalLink, FiInfo, FiChevronRight, FiChevronLeft, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';
import * as FI from 'react-icons/fi';
import * as IO from 'react-icons/io5';
import * as MD from 'react-icons/md';
import * as FA from 'react-icons/fa';
import * as BS from 'react-icons/bs';
import { uploadLogo, uploadContentImage, getSignedContentUrl } from "../../api";
import { getAuth } from "firebase/auth";
import useIsMasterAdmin from "../../hooks/useIsMasterAdmin";
// Subtipos possíveis para blocos de imagem
// subtipos para conteúdo visual. incluímos 'video' porque o carousel pode conter vídeos
const SUBTIPOS_IMAGEM = [
    { value: "banner", label: "Banner" },
    { value: "card", label: "Card" },
    { value: "header", label: "Cabeçalho" },
    { value: "video", label: "Vídeo" },
];

export default function ContentBlockType({
    tipoSelecionado,
    setTipoSelecionado,
    conteudo,
    setConteudo,
    disabled,
    blocos,
    onRemoveBloco,
    onEditBloco,
    onAddBloco,
    marca,
    tipoRegiao,
    nomeRegiao,
    subtipo,
    setSubtipo,
    // optional callback to notify parent when a bloco is added/edited
    onBlockSaved
}) {
    // util: gera id temporário para mapear uploads pendentes
    const genTempId = () => {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        } catch (e) { }
        return `tmp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    };
    const [showModal, setShowModal] = useState(false);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const conteudoFieldRef = useRef(null);
    const blocosContainerRef = useRef(null);
    const lastBlocoRef = useRef(null);
    // refs for button modal fields to support autofocus
    const buttonLabelRef = useRef(null);
    const buttonHrefRef = useRef(null);
    const buttonCallbackRef = useRef(null);
    const didAutofocusRef = useRef(false)
    // Scroll automático para o último bloco
    useEffect(() => {
        if (blocos.length > 0 && lastBlocoRef.current) {
            setTimeout(() => {
                lastBlocoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }, [blocos]);
    const [editIdx, setEditIdx] = useState(null);
    // util: detecta se um objeto se parece com File/Blob
    function isFileLike(x) {
        try {
            return x && typeof x === 'object' && (typeof x.name === 'string' || typeof x.size === 'number');
        } catch (e) { return false; }
    }
    // Human readable block type
    function humanizeTipo(t) {
        if (!t) return '';
        const map = {
            botao_destaque: 'Botão destaque',
            botao_default: 'Botão',
            imagem: 'Imagem',
            carousel: 'Carousel',
            video: 'Vídeo'
        };
        const lower = String(t).toLowerCase();
        if (map[lower]) return map[lower];
        return String(t).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    // normalize raw tipo strings to canonical portuguese keys used by modals
    function canonicalTipo(raw) {
        if (!raw) return '';
        const low = String(raw).toLowerCase();
        if (low.includes('botao') || low.startsWith('botao')) return low.includes('destaque') ? 'botao_destaque' : 'botao_default';
        if (low.includes('carousel') || low.startsWith('carousel')) return 'carousel';
        if (low.includes('video') || low.startsWith('video')) return 'video';
        if (low.includes('imagem') || low.includes('image') || low.startsWith('imagem') || low.startsWith('image')) return 'imagem';
        return low;
    }
    // Subtipo de imagem (apenas para blocos de imagem)
    // Se vier o prop subtipo, prioriza ele, senão usa o estado local
    const [subtipoImagem, setSubtipoImagem] = useState(subtipo || "");
    useEffect(() => {
        if (subtipo && subtipo !== subtipoImagem) setSubtipoImagem(subtipo);
    }, [subtipo]);
    // Sempre sincroniza subtipoImagem com setSubtipo do pai, se existir
    useEffect(() => {
        if (setSubtipo) setSubtipo(subtipoImagem);
    }, [subtipoImagem, setSubtipo]);

    // Estado do carousel (sempre declarado no topo, mas só usado se tipoSelecionado === 'carousel')
    const [carouselImagens, setCarouselImagens] = useState([{ url: "", subtipo: "" }]);
    // Metadados do último upload (single image)
    const [uploadedMeta, setUploadedMeta] = useState(null);
    // Signed URL for gs:// previews
    const [signedPreviewUrl, setSignedPreviewUrl] = useState(null);
    // Image action (link) states for single image
    const [imageActionHref, setImageActionHref] = useState('');
    const [imageActionDisabled, setImageActionDisabled] = useState(false);
    const [imageActionTarget, setImageActionTarget] = useState('_self');
    // Button block state
    const [buttonLabel, setButtonLabel] = useState("");
    const [buttonActionType, setButtonActionType] = useState('link');
    const [buttonHref, setButtonHref] = useState('');
    const [buttonCallbackName, setButtonCallbackName] = useState('');
    const [buttonColor, setButtonColor] = useState('');
    const [buttonIconFamily, setButtonIconFamily] = useState('fi');
    const [buttonIcon, setButtonIcon] = useState('');
    const [buttonIconInvert, setButtonIconInvert] = useState(false);
    const [buttonSize, setButtonSize] = useState('medium');
    const [buttonPosition, setButtonPosition] = useState('center');
    const [buttonDisabled, setButtonDisabled] = useState(false);
    const [buttonAnalytics, setButtonAnalytics] = useState('');
    const [buttonTarget, setButtonTarget] = useState('_self');
    const [buttonVariant, setButtonVariant] = useState('primary');
    const [showPathModal, setShowPathModal] = useState(false);
    // showPathMap controla visibilidade do caminho por bloco no preview
    const [showPathMap, setShowPathMap] = useState({});
    // mapa para alternar edição de URL por item do carousel
    const [showUrlEditMap, setShowUrlEditMap] = useState({});

    // Deterministic modal validation: returns { ready: boolean, reason: string|null }
    const modalValidation = useMemo(() => {
        try {
            if (tipoSelecionado === 'imagem') {
                if (subtipoImagem && (uploadedMeta?.pendingFile || (conteudo && conteudo.trim() !== ""))) return { ready: true, reason: null };
                // fallback: uploadedMeta.url
                if (uploadedMeta && (uploadedMeta.pendingFile || (uploadedMeta.url && String(uploadedMeta.url).trim() !== ""))) return { ready: true, reason: null };
                return { ready: false, reason: 'Selecione um arquivo ou informe o caminho da imagem' };
            }
            if (tipoSelecionado === 'carousel') {
                const ok = Array.isArray(carouselImagens) && carouselImagens.some(it => it && it.subtipo && ((it.meta && isFileLike(it.meta.pendingFile)) || (it.url && String(it.url).trim() !== "")));
                if (ok) return { ready: true, reason: null };
                return { ready: false, reason: 'Adicione ao menos uma mídia válida ao carousel' };
            }
            if (tipoSelecionado === 'botao_default' || tipoSelecionado === 'botao_destaque') {
                if (!buttonLabel || String(buttonLabel).trim() === '') return { ready: false, reason: 'Preencha a label do botão' };
                if (buttonActionType === 'link') {
                    if (!buttonHref || String(buttonHref).trim() === '') return { ready: false, reason: 'Preencha a URL (href) da ação' };
                    return { ready: true, reason: null };
                }
                if (buttonActionType === 'callback') {
                    if (!buttonCallbackName || String(buttonCallbackName).trim() === '') return { ready: false, reason: 'Preencha o nome da callback' };
                    return { ready: true, reason: null };
                }
                return { ready: false, reason: 'Selecione o tipo de ação' };
            }
            // default: text/content blocks
            if (conteudo && String(conteudo).trim() !== '') return { ready: true, reason: null };
            return { ready: false, reason: 'Preencha o conteúdo' };
        } catch (e) {
            return { ready: false, reason: 'Erro na validação do modal' };
        }
    }, [tipoSelecionado, subtipoImagem, uploadedMeta, conteudo, carouselImagens, buttonLabel, buttonActionType, buttonHref, buttonCallbackName]);

    // estilos padrão de botões usados no modal
    const BTN = {
        base: { border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
        primary: { background: '#2196f3', color: '#fff' },
        success: { background: '#4cd964', color: '#fff' },
        danger: { background: '#e74c3c', color: '#fff' },
        neutral: { background: '#777', color: '#fff' },
        small: { padding: '6px 10px', fontSize: 13 }
    };

    // determina se o usuário corrente é master admin
    const currentUser = getAuth().currentUser || {};
    const isMaster = useIsMasterAdmin({ uid: currentUser.uid || "", email: currentUser.email || "" });
    // detecta mobile (<=768px) e medium (769-1339px) para ajustar layout em pontos de quebra
    const [isMobile, setIsMobile] = useState(false);
    const [isMedium, setIsMedium] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mqMobile = window.matchMedia('(max-width: 768px)');
        const mqMedium = window.matchMedia('(max-width: 1339px)');
        const onMobileChange = () => setIsMobile(mqMobile.matches);
        const onMediumChange = () => setIsMedium(mqMedium.matches && !mqMobile.matches);
        onMobileChange();
        onMediumChange();
        try { if (mqMobile.addEventListener) mqMobile.addEventListener('change', onMobileChange); else mqMobile.addListener(onMobileChange); } catch (e) { }
        try { if (mqMedium.addEventListener) mqMedium.addEventListener('change', onMediumChange); else mqMedium.addListener(onMediumChange); } catch (e) { }
        return () => {
            try { if (mqMobile.removeEventListener) mqMobile.removeEventListener('change', onMobileChange); else mqMobile.removeListener(onMobileChange); } catch (e) { }
            try { if (mqMedium.removeEventListener) mqMedium.removeEventListener('change', onMediumChange); else mqMedium.removeListener(onMediumChange); } catch (e) { }
        };
    }, []);

    // Validação por bloco que retorna razão caso inválido, ou null se válido
    function blockInvalidReason(b) {
        if (!b) return 'Bloco ausente';
        // Heurística: se houver URL, pendingFile ou items com mídias, consideramos válido
        try {
            const tipo = (b.tipo || b.tipoSelecionado || '').toLowerCase();
            // Validação específica para blocos de botão
            if (tipo && (tipo === 'botao_destaque' || tipo === 'botao_default' || String(tipo).startsWith('botao'))) {
                // precisa de meta com label e action válida. Aceitamos tanto meta (edição local)
                // quanto fields top-level (quando vindo do backend: label/action)
                try {
                    const m = b.meta || {};
                    const label = (m && m.label) || b.label || '';
                    const a = (m && m.action) || b.action;
                    if (label && String(label).trim() !== '') {
                        if (a && a.type === 'link' && a.href && String(a.href).trim() !== '') return null;
                        if (a && a.type === 'callback' && a.name && String(a.name).trim() !== '') return null;
                    }
                } catch (e) { /* fallthrough to return reason */ }
                return 'Botão sem label ou ação válida';
            }
            if ((b.url && String(b.url).trim() !== '') || (isFileLike(b.pendingFile))) return null;
            if ((b.url && String(b.url).trim() !== '') || (isFileLike(b.pendingFile) || (b.meta && isFileLike(b.meta.pendingFile)))) return null;
            if (b.conteudo && String(b.conteudo).trim() !== '') return null;
            if (Array.isArray(b.items) && b.items.length > 0) {
                const ok = b.items.some(it => it && ((it.url && String(it.url).trim() !== '') || (it.meta && isFileLike(it.meta.pendingFile)) || isFileLike(it.pendingFile)));
                if (ok) return null;
                return 'Carousel sem mídias válidas';
            }
        } catch (e) { /* ignore and fallthrough */ }
        return 'Conteúdo vazio';
    }

    // Permite adicionar/remover imagens e escolher subtipo
    function handleCarouselImgChange(idx, field, value) {
        const novas = [...carouselImagens];
        novas[idx][field] = value;
        setCarouselImagens(novas);
    }
    function handleCarouselImgActionChange(idx, key, value) {
        const novas = [...carouselImagens];
        if (!novas[idx]) novas[idx] = { url: '', subtipo: '', meta: {} };
        if (!novas[idx].meta) novas[idx].meta = {};
        if (!novas[idx].meta.action) novas[idx].meta.action = {};
        novas[idx].meta.action[key] = value;
        setCarouselImagens(novas);
    }
    function handleAddCarouselImg() {
        // Impede adicionar mais de 4 itens
        if (Array.isArray(carouselImagens) && carouselImagens.length >= 4) return;
        setCarouselImagens([...carouselImagens, { url: "", subtipo: "" }]);
    }
    function handleRemoveCarouselImg(idx) {
        const img = carouselImagens[idx];
        if (img && img.url && img.url.startsWith && img.url.startsWith('blob:')) {
            try { URL.revokeObjectURL(img.url); } catch (e) { }
        }
        setCarouselImagens(carouselImagens.filter((_, i) => i !== idx));
    }
    // Abre o modal automaticamente ao selecionar qualquer tipo de bloco
    useEffect(() => {
        if (tipoSelecionado && !showModal) {
            setShowModal(true);
        }
    }, [tipoSelecionado]);

    // Quando o modal abrir para blocos de texto, foca o textarea para digitar imediatamente
    useEffect(() => {
        if (!showModal) return;
        // considera texto qualquer tipo que não seja imagem, vídeo ou carousel
        const isTextType = tipoSelecionado && !['imagem', 'video', 'carousel'].includes(tipoSelecionado);
        if (!isTextType) return;
        // foco com pequeno delay para garantir que o DOM do modal foi renderizado
        setTimeout(() => {
            try {
                const el = inputRef && inputRef.current;
                if (el && typeof el.focus === 'function') {
                    el.focus();
                    // posiciona cursor ao final do conteúdo
                    try { if (typeof el.setSelectionRange === 'function') el.setSelectionRange(el.value.length, el.value.length); } catch (e) { }
                }
            } catch (e) { }
        }, 60);
    }, [showModal, tipoSelecionado]);

    // Autofocus first missing field for button modal (label, then href/callback)
    // Run once when modal opens to avoid stealing focus while typing.
    useEffect(() => {
        if (!showModal) {
            didAutofocusRef.current = false;
            return;
        }
        if (didAutofocusRef.current) return;
        try {
            const t = (tipoSelecionado || '').toString().toLowerCase();
            if (!(t === 'botao_default' || t === 'botao_destaque' || String(t).startsWith('botao'))) return;
            // run on next tick so inputs are mounted
            setTimeout(() => {
                try {
                    if (buttonLabelRef && buttonLabelRef.current && String(buttonLabelRef.current.value || '').trim() === '') {
                        buttonLabelRef.current.focus();
                        didAutofocusRef.current = true;
                        return;
                    }
                    if (buttonActionType === 'link') {
                        if (buttonHrefRef && buttonHrefRef.current && String(buttonHrefRef.current.value || '').trim() === '') {
                            buttonHrefRef.current.focus();
                            didAutofocusRef.current = true;
                            return;
                        }
                    } else if (buttonActionType === 'callback') {
                        if (buttonCallbackRef && buttonCallbackRef.current && String(buttonCallbackRef.current.value || '').trim() === '') {
                            buttonCallbackRef.current.focus();
                            didAutofocusRef.current = true;
                            return;
                        }
                    }
                    // nothing to autofocus or all fields already filled
                    didAutofocusRef.current = true;
                } catch (e) { didAutofocusRef.current = true; }
            }, 60);
        } catch (e) { }
    }, [showModal, tipoSelecionado, editIdx]);

    // Carrega signed URL quando o conteúdo for um gs:// (imagem ou vídeo)
    useEffect(() => {
        let mounted = true;
        async function loadSigned() {
            try {
                const url = uploadedMeta?.url || conteudo;
                const isGs = url && typeof url === 'string' && url.startsWith('gs://');
                if (isGs) {
                    const s = await getSignedContentUrl(url);
                    if (mounted) setSignedPreviewUrl(s);
                } else {
                    if (mounted) setSignedPreviewUrl(null);
                }
            } catch (e) { if (mounted) setSignedPreviewUrl(null); }
        }
        loadSigned();
        return () => { mounted = false; };
    }, [uploadedMeta?.url, conteudo]);

    function renderConteudoInput() {
        // Determine effective tipo: prefer the bloco currently being edited (if any), otherwise use tipoSelecionado
        let effectiveTipo = tipoSelecionado;
        try {
            if (typeof editIdx === 'number' && editIdx !== null && Array.isArray(blocos) && blocos[editIdx]) {
                const b = blocos[editIdx];
                const inferred = canonicalTipo(b.tipoSelecionado || b.tipo);
                if (inferred) effectiveTipo = inferred;
            }
        } catch (e) { /* ignore */ }
        if (!effectiveTipo) return null;
        // Button block UI
        if (effectiveTipo === 'botao_default' || effectiveTipo === 'botao_destaque') {
            // validation: label and action
            const rowStyle = { display: 'flex', gap: 12, alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' };
            const fullWidthInput = { flex: 1, padding: 8, borderRadius: 6, width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' };
            const narrowSelect = { padding: 8, borderRadius: 6, minWidth: isMobile ? '100%' : 120, boxSizing: 'border-box' };
            return (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ ...rowStyle, justifyContent: 'space-between' }}>
                        <input ref={buttonLabelRef} type="text" placeholder="Label do botão" value={buttonLabel} onChange={e => setButtonLabel(e.target.value)} style={{ ...fullWidthInput }} />
                        <select value={buttonVariant} onChange={e => setButtonVariant(e.target.value)} style={{ ...narrowSelect }}>
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                            <option value="tertiary">Tertiary</option>
                        </select>
                    </div>
                    <div style={rowStyle}>
                        <label style={{ minWidth: isMobile ? 'auto' : 90 }}>Ação</label>
                        <select value={buttonActionType} onChange={e => setButtonActionType(e.target.value)} style={{ ...narrowSelect }}>
                            <option value="link">Link (URL)</option>
                            <option value="callback">Callback (interno)</option>
                        </select>
                        {buttonActionType === 'link' ? (
                            <input ref={buttonHrefRef} type="text" placeholder="https://... ou /rota" value={buttonHref} onChange={e => setButtonHref(e.target.value)} style={{ ...fullWidthInput }} />
                        ) : (
                            <input ref={buttonCallbackRef} type="text" placeholder="Nome da ação (ex: openModal)" value={buttonCallbackName} onChange={e => setButtonCallbackName(e.target.value)} style={{ ...fullWidthInput }} />
                        )}
                        <select value={buttonTarget} onChange={e => setButtonTarget(e.target.value)} style={{ ...narrowSelect }}>
                            <option value="_self">_self</option>
                            <option value="_blank">_blank</option>
                        </select>
                    </div>
                    <div style={rowStyle}>
                        <input type="text" placeholder="Cor (ex: #ff3b30)" value={buttonColor} onChange={e => setButtonColor(e.target.value)} style={{ ...narrowSelect }} />
                        <div style={{ display: isMobile ? "inline-grid" : 'flex', gap: 8, alignItems: 'center' }}>
                            <select value={buttonIconFamily} onChange={e => setButtonIconFamily(e.target.value)} style={{ ...narrowSelect }}>
                                <option value="fi">Feather (fi)</option>
                                <option value="io">Ionicons (io5)</option>
                                <option value="md">Material (md)</option>
                                <option value="fa">FontAwesome (fa)</option>
                                <option value="bs">Bootstrap (bs)</option>
                            </select>
                            <input type="text" placeholder="Ícone (nome)" value={buttonIcon} onChange={e => setButtonIcon(e.target.value)} style={{ ...narrowSelect }} />
                        </div>
                        <select value={buttonSize} onChange={e => setButtonSize(e.target.value)} style={{ ...narrowSelect }}>
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                        </select>
                        <select value={buttonPosition} onChange={e => setButtonPosition(e.target.value)} style={{ ...narrowSelect }}>
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={buttonDisabled} onChange={e => setButtonDisabled(e.target.checked)} />
                                <div style={{ color: '#999', fontSize: 13 }}>Desativado</div>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={buttonIconInvert} onChange={e => setButtonIconInvert(e.target.checked)} />
                                <div style={{ color: '#999', fontSize: 13 }}>Inverter ícone</div>
                            </label>
                        </div>
                        <input type="text" placeholder="Analytics event name (opcional)" value={buttonAnalytics} onChange={e => setButtonAnalytics(e.target.value)} style={{ ...fullWidthInput }} />
                    </div>
                </div>
            );
        }
        if (effectiveTipo === "imagem") {
            // Upload de imagem
            async function handleFileChange(e) {
                const file = e.target.files[0];
                if (!file) return;
                // cria URL local temporária para preview no modal
                const objectUrl = URL.createObjectURL(file);
                // não sobrescrever o campo 'conteudo' (código/gs://) com a URL local
                // armazena meta local com o File para upload posterior ao salvar
                const meta = {
                    pendingFile: file,
                    nome: file.name,
                    filename: file.name,
                    type: file.type,
                    created_at: new Date().toISOString(),
                    url: objectUrl,
                    temp_id: genTempId(),
                };
                setUploadedMeta(meta);
                // ao selecionar arquivo local, não mostrar o campo de código automaticamente
                // mensagem UX removida: não usar alert() bloqueante aqui
            }
            return (
                <>
                    <div style={{ display: 'flex', gap: 12, alignItems: isMobile ? 'stretch' : 'center', marginBottom: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                        <select
                            value={subtipoImagem}
                            onChange={e => {
                                setSubtipoImagem(e.target.value);
                                if (setSubtipo) setSubtipo(e.target.value);
                            }}
                            style={{ flex: 1, padding: "8px", borderRadius: "6px" }}
                            disabled={disabled}
                        >
                            <option value="">Selecione o tipo de Imagem/Video</option>
                            {SUBTIPOS_IMAGEM.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {/* Input file escondido, controlado por botão visível */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={subtipoImagem === 'video' ? 'video/*' : 'image/*'}
                            onChange={handleFileChange}
                            disabled={disabled || !subtipoImagem}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            disabled={disabled || !subtipoImagem}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: (disabled || !subtipoImagem) ? '#b2b2b2' : '#2196f3',
                                color: '#fff',
                                cursor: (disabled || !subtipoImagem) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {subtipoImagem ? 'Escolher arquivo' : '<- defina o tipo'}
                        </button>
                        {/* botão Mostrar caminho será renderizado abaixo do nome do arquivo para manter padrão */}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: isMobile ? 'stretch' : 'center', marginBottom: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                        <div style={{ width: isMobile ? '100%' : 120, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 8, overflow: 'hidden' }}>
                            {(() => {
                                const previewUrl = (uploadedMeta && uploadedMeta.url) || conteudo || '';
                                if (!previewUrl) return <div style={{ color: '#999', fontSize: 12 }}>Sem mídia</div>;
                                const isGs = typeof previewUrl === 'string' && previewUrl.startsWith('gs://');
                                const isLocalPath = typeof previewUrl === 'string' && previewUrl.startsWith('/');
                                const isVideoType = subtipoImagem === 'video' || (uploadedMeta && uploadedMeta.type && uploadedMeta.type.startsWith && uploadedMeta.type.startsWith('video'));
                                if (isGs) {
                                    return isVideoType ? (signedPreviewUrl ? <video src={signedPreviewUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ color: '#999' }}>Carregando vídeo...</div>) : <ContentImagePreview gsUrl={previewUrl} signedUrl={uploadedMeta && uploadedMeta.signed_url} />;
                                }
                                if (isLocalPath) {
                                    // local paths (/) can be used directly by the browser
                                    return isVideoType ? <video src={previewUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                                }
                                // otherwise assume http/blob or object URL
                                return isVideoType ? <video src={previewUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                            })()}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <input
                                type="text"
                                placeholder="Nome do arquivo"
                                value={uploadedMeta?.nome || (conteudo ? conteudo.split('/').pop() : '')}
                                style={{ marginBottom: "0.5rem", padding: "8px", borderRadius: "6px", background: '#f5f5f5', color: '#888' }}
                                disabled={true}
                            />
                            {/* botão Mostrar caminho (aparece abaixo do nome do arquivo) */}
                            {/* Contêiner com altura fixa para evitar reflow; texto aparece abaixo do botão e usa opacidade */}
                            <div style={{ width: '100%', marginTop: 6, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {isMaster && (uploadedMeta?.url || conteudo) && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPathModal(p => !p)}
                                        style={{ ...BTN.base, ...BTN.neutral, ...BTN.small, height: 34, width: '100%', textAlign: 'left', boxSizing: 'border-box', outline: 'none', display: 'block' }}
                                    >
                                        {showPathModal ? 'Ocultar caminho' : 'Mostrar caminho'}
                                    </button>
                                )}
                                <div style={{ minHeight: 26, paddingLeft: 6, paddingRight: 6, boxSizing: 'border-box' }}>
                                    <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', opacity: showPathModal ? 1 : 0, transition: 'opacity 160ms linear', position: 'relative', wordBreak: 'break-word' }}>{uploadedMeta?.url || conteudo}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexDirection: isMobile ? 'column' : 'row' }}>
                                <input type="text" placeholder="Link (opcional) https://..." value={imageActionHref} onChange={e => setImageActionHref(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 6 }} />
                                <select value={imageActionTarget} onChange={e => setImageActionTarget(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
                                    <option value="_self">_self</option>
                                    <option value="_blank">_blank</option>
                                    <option value="in_app">in_app</option>
                                </select>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" checked={imageActionDisabled} onChange={e => setImageActionDisabled(e.target.checked)} />
                                    <div style={{ color: '#999', fontSize: 13 }}>Desativar clique</div>
                                </label>
                            </div>
                        </div>
                    </div>
                </>
            );
        }
        if (effectiveTipo === "carousel") {
            // Upload de imagem para cada item do carousel
            async function handleFileChangeCarousel(idx, e) {
                const file = e.target.files[0];
                if (!file) return;
                const objectUrl = URL.createObjectURL(file);
                handleCarouselImgChange(idx, "url", objectUrl);
                const meta = {
                    pendingFile: file,
                    nome: file.name,
                    filename: file.name,
                    type: file.type,
                    created_at: new Date().toISOString(),
                    url: objectUrl,
                    temp_id: genTempId(),
                };
                handleCarouselImgChange(idx, "meta", meta);
            }

            return (
                <div style={{ width: "100%" }}>
                    {carouselImagens.map((img, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: isMobile ? 'stretch' : "center", flexDirection: isMobile ? 'column' : 'row' }}>
                            <select
                                value={img.subtipo}
                                onChange={e => handleCarouselImgChange(idx, "subtipo", e.target.value)}
                                style={{ padding: 6, borderRadius: 6 }}
                                disabled={disabled}
                            >
                                <option value="">Tipo</option>
                                {SUBTIPOS_IMAGEM.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>

                            {/* input file escondido para cada item do carousel */}
                            <input
                                id={`carousel-file-${idx}`}
                                type="file"
                                accept={img.subtipo === 'video' ? 'video/*' : 'image/*'}
                                style={{ display: 'none' }}
                                onChange={e => handleFileChangeCarousel(idx, e)}
                                disabled={disabled}
                            />
                            <button
                                type="button"
                                onClick={() => document.getElementById(`carousel-file-${idx}`)?.click()}
                                disabled={disabled || !img.subtipo}
                                style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: (disabled || !img.subtipo) ? '#b2b2b2' : '#2196f3', color: '#fff', cursor: (disabled || !img.subtipo) ? 'not-allowed' : 'pointer' }}
                            >
                                {img.subtipo ? 'Escolher arquivo' : 'Tipo indefinido'}
                            </button>

                            <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
                                {!showUrlEditMap[idx] ? (
                                    <input
                                        type="text"
                                        placeholder="Arquivo"
                                        value={(img.meta && (img.meta.nome || img.meta.filename)) || (img.url ? String(img.url).split('/').pop() : '')}
                                        readOnly
                                        style={{ flex: 1, padding: '6px', borderRadius: 6, background: '#f5f5f5' }}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={img.url || ''}
                                        onChange={e => handleCarouselImgChange(idx, "url", e.target.value)}
                                        style={{ flex: 1, padding: '6px', borderRadius: 6 }}
                                    />
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowUrlEditMap(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                    style={{ ...BTN.base, ...BTN.neutral, ...BTN.small }}
                                >
                                    {showUrlEditMap[idx] ? 'Fechar' : 'Editar URL'}
                                </button>
                            </div>

                            {/* Action inputs for each carousel item */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
                                <input type="text" placeholder="Link (opcional)" value={(img.meta && img.meta.action && img.meta.action.href) || ''} onChange={e => handleCarouselImgActionChange(idx, 'href', e.target.value)} style={{ padding: 6, borderRadius: 6 }} />
                                <select value={(img.meta && img.meta.action && img.meta.action.target) || '_self'} onChange={e => handleCarouselImgActionChange(idx, 'target', e.target.value)} style={{ padding: 6, borderRadius: 6 }}>
                                    <option value="_self">_self</option>
                                    <option value="_blank">_blank</option>
                                    <option value="in_app">in_app</option>
                                </select>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input type="checkbox" checked={Boolean(img.meta && img.meta.action && img.meta.action.disabled)} onChange={e => handleCarouselImgActionChange(idx, 'disabled', e.target.checked)} />
                                </label>
                            </div>

                            {img.url && (
                                img.subtipo === 'video' ? (
                                    <video src={img.url} style={{ maxWidth: isMobile ? 160 : 80, maxHeight: isMobile ? 120 : 60, borderRadius: 6, marginLeft: 4 }} controls />
                                ) : (
                                    (img.url.startsWith && img.url.startsWith('gs://')) ? (
                                        <ContentImagePreview gsUrl={img.url} signedUrl={img.signed_url || (img.meta && img.meta.signed_url)} isVideo={img.subtipo === 'video'} />
                                    ) : (
                                        <img src={img.url} alt="preview" style={{ width: '120px', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                                    )
                                )
                            )}

                            <button type="button" onClick={() => handleRemoveCarouselImg(idx)} style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer" }} disabled={carouselImagens.length === 1}>-</button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={handleAddCarouselImg}
                        disabled={Array.isArray(carouselImagens) && carouselImagens.length >= 4}
                        style={{
                            background: (Array.isArray(carouselImagens) && carouselImagens.length >= 4) ? '#b2b2b2' : '#2196f3',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '8px 16px',
                            cursor: (Array.isArray(carouselImagens) && carouselImagens.length >= 4) ? 'not-allowed' : 'pointer',
                            marginTop: 8,
                            opacity: (Array.isArray(carouselImagens) && carouselImagens.length >= 4) ? 0.7 : 1
                        }}
                        title={(Array.isArray(carouselImagens) && carouselImagens.length >= 4) ? 'Limite de 4 mídias por carousel atingido' : 'Adicionar imagem'}
                    >
                        {(Array.isArray(carouselImagens) && carouselImagens.length >= 4) ? 'Limite atingido (4)' : 'Adicionar imagem'}
                    </button>
                </div>
            );
        }
        return (
            <textarea
                ref={inputRef}
                placeholder="Conteúdo"
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                style={{ width: "100%", marginBottom: "1rem", padding: "8px", borderRadius: "6px" }}
                disabled={disabled}
            />
        );
    }

    return (
        <>
            {/* Preview dos blocos adicionados - sempre renderizado para evitar quebra visual */}
            <div
                ref={blocosContainerRef}
                style={{
                    width: "100%",
                    marginTop: "2rem",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                    padding: "1rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                    paddingBottom: "120px",
                    minHeight: "220px",
                    display: "flex",
                    flexDirection: "column"
                }}
            >
                <h4 style={{ color: "#fff", marginBottom: "1rem" }}>Pré-visualização dos blocos</h4>
                {blocos.length === 0 && (
                    <div style={{ color: "#bbb", textAlign: "center", marginTop: "2.5rem" }}>
                        Nenhum bloco adicionado ainda
                    </div>
                )}
                {blocos.map((bloco, idx) => (
                    <div
                        key={idx}
                        ref={idx === blocos.length - 1 ? lastBlocoRef : null}
                        style={{
                            marginBottom: "1rem",
                            padding: "0.5rem",
                            background: "rgba(255,255,255,0.10)",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: isMobile ? 'flex-start' : "center",
                            justifyContent: "space-between",
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: isMobile ? 8 : 0
                        }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: isMobile ? 'flex-start' : 'start', flexDirection: bloco.tipoSelecionado === 'carousel' ? 'column-reverse' : 'row', width: isMobile ? '100%' : 'auto' }}>
                            {(() => {
                                // Only render thumbnails for media blocks (imagem, carousel, video) or when the bloco has media-like properties
                                const tipo = (bloco && (bloco.tipoSelecionado || bloco.tipo || '')).toLowerCase();
                                const blocoUrlCandidate = (bloco && (bloco.url || bloco.conteudo)) || '';
                                const hasUrlLike = blocoUrlCandidate && String(blocoUrlCandidate).trim() !== '' && (String(blocoUrlCandidate).startsWith('gs://') || String(blocoUrlCandidate).startsWith('/') || String(blocoUrlCandidate).startsWith('http') || String(blocoUrlCandidate).startsWith('blob:'));
                                const hasTypeMedia = bloco && bloco.type && (String(bloco.type).startsWith('image') || String(bloco.type).startsWith('video'));
                                const isMediaBlock = ['imagem', 'carousel', 'video'].includes(tipo)
                                    || (Array.isArray(bloco.items) && bloco.items.length > 0)
                                    || hasUrlLike
                                    || (bloco && isFileLike(bloco.pendingFile))
                                    || hasTypeMedia;
                                if (!isMediaBlock) return null; // don't render any thumbnail area for pure text blocks

                                // Detect by content instead of relying on the human-readable `tipo` text
                                const isCarousel = Array.isArray(bloco.items) && bloco.items.length > 0;
                                const hasUrl = bloco.url && String(bloco.url).trim() !== '';
                                const hasPending = (isFileLike(bloco.pendingFile) || (bloco.meta && isFileLike(bloco.meta.pendingFile))) || (Array.isArray(bloco.items) && bloco.items.some(it => it && ((it.meta && isFileLike(it.meta.pendingFile)) || isFileLike(it.pendingFile))));
                                if (isCarousel) {
                                    return (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {bloco.items.map((it, i) => (
                                                <div key={i} style={{ width: 64, height: 64, overflow: 'hidden', borderRadius: 6, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {it && (it.url || (it.meta && it.meta.pendingFile)) ? (
                                                        (it.url && it.url.startsWith && it.url.startsWith('gs://')) ? (
                                                            <ContentImagePreview gsUrl={it.url} isVideo={it.subtipo === 'video'} signedUrl={it.signed_url || (it.meta && it.meta.signed_url)} />
                                                        ) : (
                                                            it.subtipo === 'video' ? (
                                                                <video src={it.url || (it.meta && it.meta.url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <img src={it.url || (it.meta && it.meta.url)} alt={`thumb-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            )
                                                        )
                                                    ) : (
                                                        <div style={{ color: '#999', fontSize: 12 }}>Sem mídia</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }
                                if (hasUrl || hasPending) {
                                    if (hasUrl) {
                                        return bloco.url.startsWith && bloco.url.startsWith('gs://') ? (
                                            <ContentImagePreview gsUrl={bloco.url} signedUrl={bloco.signed_url} />
                                        ) : (
                                            <img src={bloco.url} alt="thumb" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                                        );
                                    }
                                    // hasPending but no url: show placeholder
                                    return (
                                        <div style={{ width: 64, height: 64, overflow: 'hidden', borderRadius: 6, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ color: '#999', fontSize: 12 }}>Upload pendente</div>
                                        </div>
                                    );
                                }
                                // No media found
                                return (
                                    <div style={{ width: 64, height: 64, overflow: 'hidden', borderRadius: 6, background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ color: '#999', fontSize: 12 }}>Sem mídia</div>
                                    </div>
                                );
                            })()}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <strong style={{ color: "#4cd964" }}>{humanizeTipo(bloco.tipo)}</strong>
                                    {(() => {
                                        const hasPending = (isFileLike(bloco && bloco.pendingFile) || (bloco && bloco.meta && isFileLike(bloco.meta.pendingFile))) || (Array.isArray(bloco.items) && bloco.items.some(it => it && (isFileLike(it.pendingFile) || (it.meta && isFileLike(it.meta.pendingFile)))));
                                        if (!hasPending) return null;
                                        return (
                                            <span style={{ background: '#ffcc00', color: '#000', padding: '2px 6px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>Upload pendente</span>
                                        );
                                    })()}
                                    {(() => {
                                        const reason = blockInvalidReason(bloco);
                                        if (!reason) return null;
                                        // For button blocks, double-check presence of valid label+action in either meta or top-level
                                        try {
                                            const tipoRaw = ((bloco && (bloco.tipoSelecionado || bloco.tipo)) || '').toString().toLowerCase();
                                            if (tipoRaw && tipoRaw.startsWith('botao')) {
                                                const m = bloco.meta || {};
                                                const label = (m && m.label) || bloco.label || '';
                                                const a = (m && m.action) || bloco.action;
                                                if (label && String(label).trim() !== '' && a) {
                                                    if ((a.type === 'link' && a.href && String(a.href).trim() !== '') || (a.type === 'callback' && a.name && String(a.name).trim() !== '')) {
                                                        // button is valid; do not show badge
                                                        return null;
                                                    }
                                                }
                                            }
                                        } catch (e) { /* ignore and fallthrough */ }
                                        try { console.debug('[blockInvalid] idx=', idx, 'reason=', reason, 'bloco=', bloco); } catch (e) { }
                                        return (
                                            <button
                                                onClick={() => {
                                                    // abrir modal no item correspondente ao clicar no badge
                                                    setTipoSelecionado(canonicalTipo(bloco.tipoSelecionado || bloco.tipo));
                                                    let initialConteudo = "";
                                                    try {
                                                        const c = bloco.conteudo;
                                                        const u = bloco.url;
                                                        if (c && typeof c === 'string' && !c.startsWith('blob:')) {
                                                            initialConteudo = c;
                                                        } else if (u && typeof u === 'string' && !u.startsWith('blob:') && (u.startsWith('gs://') || u.startsWith('/'))) {
                                                            initialConteudo = u;
                                                        }
                                                    } catch (e) { initialConteudo = ""; }
                                                    setConteudo(initialConteudo);
                                                    setSubtipoImagem(bloco.subtipo || "");
                                                    // Prefill button modal fields if this bloco is a button
                                                    try {
                                                        const t = (bloco.tipoSelecionado || bloco.tipo || '').toString().toLowerCase();
                                                        if ((t === 'botao_default' || t === 'botao_destaque' || String(t).startsWith('botao'))) {
                                                            const m = bloco.meta || {};
                                                            const label = m.label || bloco.label || '';
                                                            setButtonLabel(label);
                                                            const a = (m.action || bloco.action) || {};
                                                            if (a.type === 'callback') {
                                                                setButtonActionType('callback');
                                                                setButtonCallbackName(a.name || '');
                                                            } else {
                                                                setButtonActionType('link');
                                                                setButtonHref(a.href || '');
                                                                setButtonTarget(a.target || '_self');
                                                            }
                                                            setButtonVariant(m.variant || bloco.variant || 'primary');
                                                            setButtonColor(m.color || bloco.color || '');
                                                            setButtonIconFamily(m.icon_family || bloco.icon_family || 'fi');
                                                            setButtonIcon(m.icon || bloco.icon || '');
                                                            setButtonIconInvert(Boolean(m.icon_invert || bloco.icon_invert));
                                                            setButtonSize(m.size || bloco.size || 'medium');
                                                            setButtonPosition(m.position || bloco.position || 'center');
                                                            setButtonDisabled(Boolean(typeof m.disabled !== 'undefined' ? m.disabled : bloco.disabled));
                                                            setButtonAnalytics((m.analytics && m.analytics.event_name) ? m.analytics.event_name : (bloco.analytics && bloco.analytics.event_name ? bloco.analytics.event_name : ''));
                                                        }
                                                    } catch (e) { /* ignore */ }
                                                    // prefill image action for image blocks
                                                    try {
                                                        if ((bloco.tipoSelecionado === 'imagem' || (bloco.tipo || '').toString().toLowerCase().startsWith('imagem'))) {
                                                            const action = (bloco.meta && bloco.meta.action) || bloco.action || null;
                                                            setImageActionHref(action && action.href ? action.href : '');
                                                            setImageActionTarget(action && action.target ? action.target : '_self');
                                                            setImageActionDisabled(Boolean(action && action.disabled));
                                                        }
                                                    } catch (e) { }
                                                    if (bloco.tipoSelecionado === 'carousel' && Array.isArray(bloco.items)) {
                                                        try {
                                                            const mapped = bloco.items.map(it => ({ url: it.url || it.gsUrl || '', subtipo: it.subtipo || '', meta: it.meta || null }));
                                                            setCarouselImagens(mapped.length ? mapped : [{ url: '', subtipo: '' }]);
                                                        } catch (e) { setCarouselImagens([{ url: '', subtipo: '' }]); }
                                                    }
                                                    try {
                                                        const inferredTipo = ((bloco.tipoSelecionado || bloco.tipo) || '').toString().toLowerCase();
                                                        if (typeof setTipoSelecionado === 'function') setTipoSelecionado(inferredTipo);
                                                    } catch (e) { }
                                                    setEditIdx(idx);
                                                    setShowModal(true);
                                                }}
                                                title={`Motivo: ${reason}. Clique para editar.`}
                                                aria-label={reason}
                                                style={{ background: '#ffcc00', color: '#000', padding: '2px 6px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                            >
                                                ⚠ Ver motivo
                                            </button>
                                        );
                                    })()}
                                </div>
                                {/* preview para blocos de botão (inline na lista) */}
                                {((bloco.tipoSelecionado === 'botao_default' || bloco.tipoSelecionado === 'botao_destaque') || ((bloco.tipo || '').toString().toLowerCase().startsWith('botao'))) ? (
                                    <div style={{ marginTop: 8, marginBottom: 6 }}>
                                        {/* Prefer meta fields (used by local edits). Fallback to top-level server fields so saved blocks remain visible */}
                                        <ButtonPreview
                                            label={(bloco.meta && bloco.meta.label) || bloco.label || ''}
                                            variant={(bloco.meta && bloco.meta.variant) || bloco.variant || 'primary'}
                                            color={(bloco.meta && bloco.meta.color) || bloco.color || ''}
                                            icon={(bloco.meta && bloco.meta.icon) || bloco.icon || ''}
                                            icon_family={(bloco.meta && bloco.meta.icon_family) || bloco.icon_family || 'fi'}
                                            icon_invert={Boolean((bloco.meta && bloco.meta.icon_invert) || bloco.icon_invert)}
                                            size={(bloco.meta && bloco.meta.size) || bloco.size || 'medium'}
                                            disabled={Boolean((bloco.meta && typeof bloco.meta.disabled !== 'undefined' ? bloco.meta.disabled : bloco.disabled))}
                                        />
                                    </div>
                                ) : null}
                                {/* Indicador de status de upload por bloco */}
                                <div style={{ fontSize: 12, marginTop: 6 }}>
                                    {bloco.upload_status === 'uploading' && <span style={{ color: '#f0ad4e' }}>⏳ enviando...</span>}
                                    {bloco.upload_status === 'done' && <span style={{ color: '#4cd964' }}>✅ enviado</span>}
                                    {bloco.upload_status === 'error' && <span style={{ color: '#ff3b30' }}>❌ erro</span>}
                                    {bloco.upload_error && <div style={{ color: '#ffb3b3', fontSize: 12 }}>{bloco.upload_error}</div>}
                                </div>
                                <div style={{ color: "#fff", marginTop: "4px", wordBreak: "break-word" }}>
                                    <div style={{ fontSize: 12, color: '#ccc' }}>{bloco.nome || bloco.filename || ''}</div>
                                    {/* Apenas master pode ver opção de revelar caminho do arquivo e somente para blocos de imagem */}
                                    {isMaster && bloco.tipoSelecionado === 'imagem' && (bloco.url || bloco.conteudo) && (
                                        <div style={{ marginTop: 6 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPathMap(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                    style={{ background: '#666', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12, display: 'block' }}
                                                >
                                                    {showPathMap[idx] ? 'Ocultar caminho' : 'Mostrar caminho'}
                                                </button>
                                                <div style={{ minHeight: 26, paddingLeft: 4, paddingRight: 4, boxSizing: 'border-box' }}>
                                                    <div style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', opacity: showPathMap[idx] ? 1 : 0, transition: 'opacity 160ms linear', position: 'relative', wordBreak: 'break-word' }}>{bloco.url || bloco.conteudo}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: isMobile ? 8 : 0, display: 'flex', gap: 8, justifyContent: isMobile ? 'flex-end' : 'initial' }}>
                            <button
                                type="button"
                                aria-label={`Editar bloco ${humanizeTipo(bloco.tipo)}`}
                                onClick={() => {
                                    // bloco.tipoSelecionado guarda o tipo base (ex: 'imagem')
                                    setTipoSelecionado(canonicalTipo(bloco.tipoSelecionado || bloco.tipo));
                                    // Evita preencher o campo 'conteudo' com object URL local (blob:)
                                    let initialConteudo = "";
                                    try {
                                        const c = bloco.conteudo;
                                        const u = bloco.url;
                                        if (c && typeof c === 'string' && !c.startsWith('blob:')) {
                                            initialConteudo = c;
                                        } else if (u && typeof u === 'string' && !u.startsWith('blob:') && (u.startsWith('gs://') || u.startsWith('/'))) {
                                            initialConteudo = u;
                                        }
                                    } catch (e) {
                                        initialConteudo = "";
                                    }
                                    setConteudo(initialConteudo);
                                    setSubtipoImagem(bloco.subtipo || "");
                                    // Se o bloco for um botão, popula o estado do modal com os valores existentes
                                    try {
                                        const t = (bloco.tipoSelecionado || bloco.tipo || '').toString().toLowerCase();
                                        if ((t === 'botao_default' || t === 'botao_destaque' || String(t).startsWith('botao'))) {
                                            const m = bloco.meta || {};
                                            // fallback para top-level fields enviados pelo backend
                                            const label = m.label || bloco.label || '';
                                            setButtonLabel(label);
                                            // action pode vir em m.action ou bloco.action
                                            const a = (m.action || bloco.action) || {};
                                            if (a.type === 'callback') {
                                                setButtonActionType('callback');
                                                setButtonCallbackName(a.name || '');
                                            } else {
                                                setButtonActionType('link');
                                                setButtonHref(a.href || '');
                                                setButtonTarget(a.target || '_self');
                                            }
                                            setButtonVariant(m.variant || bloco.variant || 'primary');
                                            setButtonColor(m.color || bloco.color || '');
                                            setButtonIconFamily(m.icon_family || bloco.icon_family || 'fi');
                                            setButtonIcon(m.icon || bloco.icon || '');
                                            setButtonIconInvert(Boolean(m.icon_invert || bloco.icon_invert));
                                            setButtonSize(m.size || bloco.size || 'medium');
                                            setButtonPosition(m.position || bloco.position || 'center');
                                            setButtonDisabled(Boolean(typeof m.disabled !== 'undefined' ? m.disabled : bloco.disabled));
                                            setButtonAnalytics((m.analytics && m.analytics.event_name) ? m.analytics.event_name : (bloco.analytics && bloco.analytics.event_name ? bloco.analytics.event_name : ''));
                                        }
                                    } catch (e) { /* ignore */ }
                                    // prefill image action for image blocks (when editing a single image)
                                    try {
                                        if ((bloco.tipoSelecionado === 'imagem' || (bloco.tipo || '').toString().toLowerCase().startsWith('imagem'))) {
                                            const action = (bloco.meta && bloco.meta.action) || bloco.action || null;
                                            setImageActionHref(action && action.href ? action.href : '');
                                            setImageActionTarget(action && action.target ? action.target : '_self');
                                            setImageActionDisabled(Boolean(action && action.disabled));
                                        }
                                    } catch (e) { }
                                    // Se o bloco editado for um carousel, popula o estado local com os items existentes
                                    if (bloco.tipoSelecionado === 'carousel' && Array.isArray(bloco.items)) {
                                        try {
                                            const mapped = bloco.items.map(it => ({ url: it.url || it.gsUrl || '', subtipo: it.subtipo || '', meta: it.meta || null }));
                                            setCarouselImagens(mapped.length ? mapped : [{ url: '', subtipo: '' }]);
                                        } catch (e) {
                                            setCarouselImagens([{ url: '', subtipo: '' }]);
                                        }
                                    }
                                    try {
                                        const inferredTipo = ((bloco.tipoSelecionado || bloco.tipo) || '').toString().toLowerCase();
                                        if (typeof setTipoSelecionado === 'function') setTipoSelecionado(inferredTipo);
                                    } catch (e) { }
                                    setEditIdx(idx);
                                    setShowModal(true);
                                }}
                                style={{
                                    background: "#2196f3",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "6px 12px",
                                    cursor: "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                Editar
                            </button>
                            <button
                                type="button"
                                aria-label={`Excluir bloco ${humanizeTipo(bloco.tipo)}`}
                                onClick={() => onRemoveBloco(idx)}
                                style={{
                                    marginLeft: "0.5rem",
                                    background: "#e74c3c",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    padding: "6px 12px",
                                    cursor: "pointer",
                                    fontWeight: "bold"
                                }}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                ))}
                {/* Spacer para garantir distância da borda inferior */}
                <div style={{ height: '120px' }} />
            </div>

            {/* Modal para campo de conteúdo */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100%',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(1, 46, 87, 0.90)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    transition: 'backdrop-filter 0.3s',
                }}>
                    <div style={{
                        background: 'rgba(255,255,255)',
                        borderRadius: '16px',
                        boxShadow: '0 4px 32px rgba(255,255,255,0.18)',
                        padding: isMobile ? '1rem' : isMedium ? '1.25rem' : '2rem',
                        /* largura adaptativa: reduzir minWidth desktop para caber telas menores */
                        minWidth: isMobile ? '320px' : isMedium ? '580px' : '760px',
                        maxWidth: '96vw',
                        width: isMobile ? '92vw' : isMedium ? '90vw' : 'auto',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMobile ? 'center' : 'stretch',
                        border: '1px solid rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(25px)',
                        WebkitBackdropFilter: 'blur(25px)',
                    }}>
                        <h3 style={{ color: '#151515', marginBottom: '1.5rem', fontWeight: 600 }}>
                            {editIdx === null ? 'Adicionar bloco' : 'Editar bloco'}
                        </h3>
                        {renderConteudoInput()}
                        {/* preview ao vivo para blocos de botão */}
                        {(tipoSelecionado === 'botao_default' || tipoSelecionado === 'botao_destaque') && (
                            <div style={{ width: '100%', marginTop: 12, display: 'flex', justifyContent: buttonPosition === 'center' ? 'center' : buttonPosition === 'right' ? 'flex-end' : 'flex-start' }}>
                                <ButtonPreview label={buttonLabel} variant={buttonVariant} color={buttonColor} icon={buttonIcon} icon_family={buttonIconFamily} icon_invert={buttonIconInvert} size={buttonSize} disabled={buttonDisabled} />
                            </div>
                        )}
                        {/* determina se o bloco de imagem tem dados suficientes para adicionar/editar */}
                        {(() => {
                            // Move validation to a useMemo above render via closure - compute here for compatibility
                            // but keep the logic identical. We'll compute isImageReady using explicit checks.
                            let isImageReady = false;
                            if (tipoSelecionado === 'imagem') {
                                isImageReady = Boolean(subtipoImagem && (uploadedMeta?.pendingFile || (conteudo && conteudo.trim() !== "")));
                            } else if (tipoSelecionado === 'carousel') {
                                isImageReady = Array.isArray(carouselImagens) && carouselImagens.some(it => it && it.subtipo && ((it.meta && it.meta.pendingFile) || (it.url && String(it.url).trim() !== "")));
                            } else {
                                isImageReady = Boolean(conteudo && conteudo.trim() !== "");
                            }
                            // defesa adicional: uploadedMeta/url or any carousel item with pendingFile should allow save
                            if (!isImageReady) {
                                if (uploadedMeta && (uploadedMeta.pendingFile || (uploadedMeta.url && String(uploadedMeta.url).trim() !== ""))) {
                                    isImageReady = true;
                                }
                            }
                            if (!isImageReady && Array.isArray(carouselImagens)) {
                                const anyItem = carouselImagens.some(it => it && ((it.meta && it.meta.pendingFile) || (it.url && String(it.url).trim() !== "")));
                                if (anyItem) isImageReady = true;
                            }
                            return (
                                <>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexDirection: isMobile ? 'column' : 'row', width: '100%', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // revoga object URL local se existir
                                                try {
                                                    if (uploadedMeta && uploadedMeta.url && uploadedMeta.url.startsWith && uploadedMeta.url.startsWith('blob:')) {
                                                        URL.revokeObjectURL(uploadedMeta.url);
                                                    }
                                                } catch (e) { }
                                                // revoga urls do carousel
                                                try {
                                                    if (carouselImagens && Array.isArray(carouselImagens)) {
                                                        carouselImagens.forEach(img => {
                                                            if (img && img.url && img.url.startsWith && img.url.startsWith('blob:')) {
                                                                try { URL.revokeObjectURL(img.url); } catch (e) { }
                                                            }
                                                        });
                                                    }
                                                } catch (e) { }

                                                // limpar estados locais e reconfigurar fluxo
                                                setConteudo("");
                                                setTipoSelecionado("");
                                                setEditIdx(null);
                                                setSubtipoImagem("");
                                                if (setSubtipo) setSubtipo("");
                                                setUploadedMeta(null);
                                                setCarouselImagens([{ url: "", subtipo: "" }]);
                                                setShowPathModal(false);
                                                setShowModal(false);

                                                // limpar inputs file (visíveis ou ocultos)
                                                try {
                                                    if (fileInputRef && fileInputRef.current) fileInputRef.current.value = null;
                                                } catch (e) { }
                                                try {
                                                    // limpa possíveis inputs do carousel
                                                    const els = document.querySelectorAll('[id^="carousel-file-"]');
                                                    els.forEach(el => { try { el.value = null; } catch (e) { } });
                                                } catch (e) { }
                                            }}
                                            style={{
                                                background: "#e74c3c",
                                                color: "#fff",
                                                textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                                boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                                                border: "1px solid rgba(255,255,255,0.10)",
                                                borderRadius: "4px",
                                                padding: "10px 18px",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                                fontSize: "1rem",
                                                width: isMobile ? '100%' : 'auto'
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                        {editIdx === null ? (
                                            <button
                                                type="button"
                                                disabled={!modalValidation.ready}
                                                onClick={() => {
                                                    // handle button blocks specially
                                                    if (tipoSelecionado === "botao_default" || tipoSelecionado === "botao_destaque") {
                                                        const meta = {
                                                            label: buttonLabel,
                                                            action: buttonActionType === 'link' ? { type: 'link', href: buttonHref, target: buttonTarget } : { type: 'callback', name: buttonCallbackName },
                                                            variant: buttonVariant,
                                                            color: buttonColor,
                                                            icon: buttonIcon,
                                                            icon_family: buttonIconFamily,
                                                            icon_invert: buttonIconInvert,
                                                            size: buttonSize,
                                                            position: buttonPosition,
                                                            disabled: buttonDisabled,
                                                            analytics: (buttonAnalytics && String(buttonAnalytics).trim() !== '') ? { event_name: String(buttonAnalytics).trim() } : undefined,
                                                        };
                                                        onAddBloco(tipoSelecionado, null, null, meta);
                                                        try { if (typeof onBlockSaved === 'function') onBlockSaved('Bloco adicionado', 'success'); } catch (e) { }
                                                    } else if (tipoSelecionado === "imagem") {
                                                        // attach action into meta if present
                                                        const metaWithAction = uploadedMeta && Object.keys(uploadedMeta).length ? { ...(uploadedMeta || {}) } : {};
                                                        if (imageActionHref && String(imageActionHref).trim() !== '') {
                                                            metaWithAction.action = { type: 'link', href: imageActionHref.trim(), target: imageActionTarget, disabled: !!imageActionDisabled };
                                                        }
                                                        onAddBloco(tipoSelecionado, conteudo, subtipoImagem, metaWithAction);
                                                    } else if (tipoSelecionado === "carousel") {
                                                        // ensure each item meta.action is present when filled
                                                        const items = (carouselImagens || []).map(it => ({ url: it.url, subtipo: it.subtipo, meta: it.meta && Object.keys(it.meta).length ? { ...(it.meta || {}) } : undefined }));
                                                        onAddBloco(tipoSelecionado, null, null, { items });
                                                    } else {
                                                        onAddBloco(tipoSelecionado, conteudo);
                                                    }
                                                    // reset modal states
                                                    setConteudo("");
                                                    setTipoSelecionado("");
                                                    setSubtipoImagem("");
                                                    setUploadedMeta(null);
                                                    setCarouselImagens([{ url: "", subtipo: "" }]);
                                                    setImageActionHref(''); setImageActionTarget('_self'); setImageActionDisabled(false);
                                                    setButtonLabel(""); setButtonActionType('link'); setButtonHref(''); setButtonCallbackName(''); setButtonTarget('_self');
                                                    setButtonVariant('primary'); setButtonColor(''); setButtonIcon(''); setButtonIconFamily('fi'); setButtonIconInvert(false); setButtonSize('medium'); setButtonPosition('center'); setButtonDisabled(false); setButtonAnalytics('');
                                                    setShowModal(false);
                                                }}
                                                style={{
                                                    background: !modalValidation.ready ? "#b2b2b2" : "#4cd964",
                                                    color: "#fff",
                                                    textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                                    boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                                                    border: "1px solid rgba(255,255,255,0.10)",
                                                    borderRadius: "4px",
                                                    padding: "10px 18px",
                                                    cursor: !modalValidation.ready ? "not-allowed" : "pointer",
                                                    fontWeight: "bold",
                                                    fontSize: "1rem",
                                                    opacity: !modalValidation.ready ? 0.7 : 1,
                                                    width: isMobile ? '100%' : 'auto'
                                                }}
                                                title={!modalValidation.ready ? modalValidation.reason : 'Adicionar bloco'}
                                            >
                                                Adicionar bloco
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={!modalValidation.ready}
                                                onClick={() => {
                                                    if (tipoSelecionado === "botao_default" || tipoSelecionado === "botao_destaque") {
                                                        const meta = {
                                                            label: buttonLabel,
                                                            action: buttonActionType === 'link' ? { type: 'link', href: buttonHref, target: buttonTarget } : { type: 'callback', name: buttonCallbackName },
                                                            variant: buttonVariant,
                                                            color: buttonColor,
                                                            icon: buttonIcon,
                                                            icon_family: buttonIconFamily,
                                                            icon_invert: buttonIconInvert,
                                                            size: buttonSize,
                                                            position: buttonPosition,
                                                            disabled: buttonDisabled,
                                                            analytics: (buttonAnalytics && String(buttonAnalytics).trim() !== '') ? { event_name: String(buttonAnalytics).trim() } : undefined,
                                                        };
                                                        onEditBloco(editIdx, tipoSelecionado, null, null, meta);
                                                        try { if (typeof onBlockSaved === 'function') onBlockSaved('Bloco editado', 'success'); } catch (e) { }
                                                    } else if (tipoSelecionado === "imagem") {
                                                        const metaWithAction = uploadedMeta && Object.keys(uploadedMeta).length ? { ...(uploadedMeta || {}) } : {};
                                                        if (imageActionHref && String(imageActionHref).trim() !== '') {
                                                            metaWithAction.action = { type: 'link', href: imageActionHref.trim(), target: imageActionTarget, disabled: !!imageActionDisabled };
                                                        }
                                                        onEditBloco(editIdx, tipoSelecionado, conteudo, subtipoImagem, metaWithAction);
                                                    } else if (tipoSelecionado === "carousel") {
                                                        const items = (carouselImagens || []).map(it => ({ url: it.url, subtipo: it.subtipo, meta: it.meta && Object.keys(it.meta).length ? { ...(it.meta || {}) } : undefined }));
                                                        onEditBloco(editIdx, tipoSelecionado, null, null, { items });
                                                    } else {
                                                        onEditBloco(editIdx, tipoSelecionado, conteudo);
                                                    }
                                                    setEditIdx(null);
                                                    setConteudo("");
                                                    setTipoSelecionado("");
                                                    setSubtipoImagem("");
                                                    setUploadedMeta(null);
                                                    setCarouselImagens([{ url: "", subtipo: "" }]);
                                                    setImageActionHref(''); setImageActionTarget('_self'); setImageActionDisabled(false);
                                                    setButtonLabel(""); setButtonActionType('link'); setButtonHref(''); setButtonCallbackName(''); setButtonTarget('_self');
                                                    setButtonVariant('primary'); setButtonColor(''); setButtonIcon(''); setButtonIconFamily('fi'); setButtonIconInvert(false); setButtonSize('medium'); setButtonPosition('center'); setButtonDisabled(false); setButtonAnalytics('');
                                                    setShowModal(false);
                                                }}
                                                style={{
                                                    background: "#2196f3",
                                                    color: "#fff",
                                                    textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    padding: "10px 18px",
                                                    cursor: !modalValidation.ready ? "not-allowed" : "pointer",
                                                    fontWeight: "bold",
                                                    fontSize: "1rem",
                                                    opacity: !modalValidation.ready ? 0.7 : 1,
                                                    width: isMobile ? '100%' : 'auto'
                                                }}
                                                title={!modalValidation.ready ? modalValidation.reason : 'Salvar edição'}
                                            >
                                                Salvar edição
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ width: '100%', marginTop: 8, color: modalValidation.ready ? '#4cd964' : '#ff3b30', fontSize: 13 }}>
                                        {modalValidation.ready ? 'Pronto para salvar' : modalValidation.reason}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div >
            )
            }
        </>
    );
}

// Componente para buscar e exibir a signed URL de uma imagem de conteúdo
function ContentImagePreview({ gsUrl, isVideo, signedUrl: signedUrlProp }) {
    const [signedUrl, setSignedUrl] = useState(signedUrlProp || null);
    useEffect(() => {
        let isMounted = true;
        async function fetchUrl() {
            // if parent provided signedUrl prop, prefer it
            if (signedUrlProp) {
                if (isMounted) setSignedUrl(signedUrlProp);
                return;
            }
            if (!gsUrl) return;
            try {
                const url = await getSignedContentUrl(gsUrl);
                if (isMounted) setSignedUrl(url);
            } catch (e) { if (isMounted) setSignedUrl(null); }
        }
        fetchUrl();
        return () => { isMounted = false; };
    }, [gsUrl, signedUrlProp]);
    if (!signedUrl) return <span>Carregando mídia...</span>;
    if (isVideo) return <video src={signedUrl} controls style={{ width: '120px', height: '100%', objectFit: 'cover', borderRadius: 8 }} />;
    return <img src={signedUrl} alt="preview" style={{ width: '120px', height: '100%', objectFit: 'cover', borderRadius: 8 }} />;
}

// Pequeno preview visual para blocos de botão (usado no modal e na lista de blocos)
function ButtonPreview({ label, variant = 'primary', color, icon, icon_family, icon_invert = false, size = 'medium', disabled = false }) {
    const sizes = {
        small: { padding: '6px 10px', fontSize: 13 },
        medium: { padding: '8px 14px', fontSize: 15 },
        large: { padding: '10px 18px', fontSize: 17 }
    };
    const base = {
        border: 'none',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
    };
    const variantStyles = {
        primary: { background: color || '#2196f3', color: '#fff' },
        secondary: { background: '#f5f5f5', color: '#333', border: '1px solid #ddd' },
        tertiary: { background: 'transparent', color: color || '#2196f3', border: '1px dashed rgba(0,0,0,0.08)' }
    };
    const s = { ...base, ...(variantStyles[variant] || variantStyles.primary), ...(sizes[size] || sizes.medium) };
    // map common icon names (lowercase) to react-icons components
    const ICON_MAP = {
        'calendar': FiCalendar,
        'plus': FiPlus,
        'x': FiX,
        'close': FiX,
        'external': FiExternalLink,
        'external-link': FiExternalLink,
        'info': FiInfo,
        'chevron-right': FiChevronRight,
        'chevron-left': FiChevronLeft,
        'search': FiSearch,
        'edit': FiEdit,
        'trash': FiTrash2,
    };
    let IconComponent = null;
    try {
        if (icon && typeof icon === 'string') {
            const key = icon.trim();
            // try explicit quick map first
            IconComponent = ICON_MAP[key.toLowerCase().replace(/\s+/g, '-')] || null;
            if (!IconComponent && icon_family && typeof icon_family === 'string') {
                // try module resolution by family + pascalized name
                const fam = icon_family.toLowerCase();
                const MOD_MAP = { fi: FI, io: IO, md: MD, fa: FA, bs: BS };
                const PREFIX_MAP = { fi: 'Fi', io: 'Io', md: 'Md', fa: 'Fa', bs: 'Bs' };
                const MOD = MOD_MAP[fam];
                const prefix = PREFIX_MAP[fam] || '';
                const pascal = key.split(/[-_\s]+/).map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join('');
                const exportName = prefix + pascal;
                if (MOD && MOD[exportName]) IconComponent = MOD[exportName];
                // fallback: try with first-letter upper only
                if (!IconComponent && MOD) {
                    const alt = prefix + pascal.replace(/^[A-Z]/, c => c);
                    if (MOD[alt]) IconComponent = MOD[alt];
                }
            }
            // final fallback: try scanning families for matching export name
            if (!IconComponent) {
                const allMods = { FI, IO, MD, FA, BS };
                const pascal = key.split(/[-_\s]+/).map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join('');
                for (const [famKey, modObj] of Object.entries(allMods)) {
                    const pref = famKey.charAt(0) + famKey.slice(1).toLowerCase(); // e.g., FI -> Fi
                    const candidate = pref + pascal;
                    if (modObj && modObj[candidate]) { IconComponent = modObj[candidate]; break; }
                }
            }
        }
    } catch (e) { IconComponent = null; }

    return (
        <button type="button" style={s} disabled={disabled} aria-disabled={disabled}>
            {!icon_invert && IconComponent ? <IconComponent style={{ width: '1.1em', height: '1.1em' }} /> : null}
            <span>{label || 'Botão'}</span>
            {icon_invert && IconComponent ? <IconComponent style={{ width: '1.1em', height: '1.1em' }} /> : null}
        </button>
    );
}