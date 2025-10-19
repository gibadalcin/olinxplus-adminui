import { useState, useRef, useEffect, useMemo } from "react";
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
    setSubtipo
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
    // signed url para preview de mídia (usado quando gs://)
    const [signedPreviewUrl, setSignedPreviewUrl] = useState(null);
    // showPathModal controla o toggle dentro do modal
    const [showPathModal, setShowPathModal] = useState(false);
    // showPathMap controla visibilidade do caminho por bloco no preview
    const [showPathMap, setShowPathMap] = useState({});
    // mapa para alternar edição de URL por item do carousel
    const [showUrlEditMap, setShowUrlEditMap] = useState({});

    // Deterministic modal validation calc: se o modal tem mídia pronta para Salvar/Adicionar
    const isModalImageReady = useMemo(() => {
        let ready = false;
        try {
            if (tipoSelecionado === 'imagem') {
                ready = Boolean(subtipoImagem && (uploadedMeta?.pendingFile || (conteudo && conteudo.trim() !== "")));
            } else if (tipoSelecionado === 'carousel') {
                ready = Array.isArray(carouselImagens) && carouselImagens.some(it => it && it.subtipo && ((it.meta && isFileLike(it.meta.pendingFile)) || (it.url && String(it.url).trim() !== "")));
            } else {
                ready = Boolean(conteudo && conteudo.trim() !== "");
            }
            // defesa adicional: uploadedMeta/url ou qualquer item do carousel com pendingFile deve permitir salvar
            if (!ready) {
                if (uploadedMeta && (uploadedMeta.pendingFile || (uploadedMeta.url && String(uploadedMeta.url).trim() !== ""))) {
                    ready = true;
                }
            }
            if (!ready && Array.isArray(carouselImagens)) {
                const anyItem = carouselImagens.some(it => it && ((it.meta && isFileLike(it.meta.pendingFile)) || (it.url && String(it.url).trim() !== "")));
                if (anyItem) ready = true;
            }
        } catch (e) { ready = false; }
        return ready;
    }, [tipoSelecionado, subtipoImagem, uploadedMeta, conteudo, carouselImagens]);

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
        if (!tipoSelecionado) return null;
        if (tipoSelecionado === "imagem") {
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
                            {uploadedMeta?.url || conteudo ? (
                                (uploadedMeta && uploadedMeta.url && (uploadedMeta.url.startsWith('gs://') || uploadedMeta.url.startsWith('/')))
                                    ? (
                                        (subtipoImagem === 'video' || (uploadedMeta && uploadedMeta.type && uploadedMeta.type.startsWith && uploadedMeta.type.startsWith('video'))) ? (
                                            signedPreviewUrl ? <video src={signedPreviewUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ color: '#999' }}>Carregando vídeo...</div>
                                        ) : (
                                            <ContentImagePreview gsUrl={uploadedMeta.url} signedUrl={uploadedMeta && uploadedMeta.signed_url} />
                                        )
                                    ) : (
                                        (subtipoImagem === 'video' || (uploadedMeta && uploadedMeta.type && uploadedMeta.type.startsWith && uploadedMeta.type.startsWith('video'))) ? (
                                            <video src={uploadedMeta?.url || conteudo} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <img src={uploadedMeta?.url || conteudo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )
                                    )
                            ) : (
                                <div style={{ color: '#999', fontSize: 12 }}>Sem mídia</div>
                            )}
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
                        </div>
                    </div>
                </>
            );
        }
        if (tipoSelecionado === "carousel") {
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
                                    <strong style={{ color: "#4cd964" }}>{bloco.tipo}</strong>
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
                                        return (
                                            <button
                                                onClick={() => {
                                                    // abrir modal no item correspondente ao clicar no badge
                                                    setTipoSelecionado(bloco.tipoSelecionado || bloco.tipo);
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
                                                    if (bloco.tipoSelecionado === 'carousel' && Array.isArray(bloco.items)) {
                                                        try {
                                                            const mapped = bloco.items.map(it => ({ url: it.url || it.gsUrl || '', subtipo: it.subtipo || '', meta: it.meta || null }));
                                                            setCarouselImagens(mapped.length ? mapped : [{ url: '', subtipo: '' }]);
                                                        } catch (e) { setCarouselImagens([{ url: '', subtipo: '' }]); }
                                                    }
                                                    setEditIdx(idx);
                                                    setShowModal(true);
                                                }}
                                                title={reason}
                                                aria-label={reason}
                                                style={{ background: '#ffcc00', color: '#000', padding: '2px 6px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                            >
                                                ⚠
                                            </button>
                                        );
                                    })()}
                                </div>
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
                                    <div style={{ fontSize: 13 }}>
                                        {bloco.tipoSelecionado === 'imagem'
                                            ? ''
                                            : bloco.conteudo
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: isMobile ? 8 : 0, display: 'flex', gap: 8, justifyContent: isMobile ? 'flex-end' : 'initial' }}>
                            <button
                                type="button"
                                aria-label={`Editar bloco ${bloco.tipo}`}
                                onClick={() => {
                                    // bloco.tipoSelecionado guarda o tipo base (ex: 'imagem')
                                    setTipoSelecionado(bloco.tipoSelecionado || bloco.tipo);
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
                                    // Se o bloco editado for um carousel, popula o estado local com os items existentes
                                    if (bloco.tipoSelecionado === 'carousel' && Array.isArray(bloco.items)) {
                                        try {
                                            const mapped = bloco.items.map(it => ({ url: it.url || it.gsUrl || '', subtipo: it.subtipo || '', meta: it.meta || null }));
                                            setCarouselImagens(mapped.length ? mapped : [{ url: '', subtipo: '' }]);
                                        } catch (e) {
                                            setCarouselImagens([{ url: '', subtipo: '' }]);
                                        }
                                    }
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
                                aria-label={`Excluir bloco ${bloco.tipo}`}
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
                        padding: isMobile ? '1rem' : isMedium ? '1.75rem 1.25rem' : '2.5rem 2rem',
                        /* para desktop queremos pelo menos 1340px */
                        minWidth: isMobile ? '320px' : isMedium ? '650px' : '994px',
                        maxWidth: '86vw',
                        width: isMobile ? '92vw' : isMedium ? '80vw' : 'auto',
                        minHeight: isMobile ? '200px' : '220px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        border: '1px solid rgba(255,255,255,0.10)',
                        backdropFilter: 'blur(25px)',
                        WebkitBackdropFilter: 'blur(25px)',
                    }}>
                        <h3 style={{ color: '#151515', marginBottom: '1.5rem', fontWeight: 600 }}>
                            {editIdx === null ? 'Adicionar bloco' : 'Editar bloco'}
                        </h3>
                        {renderConteudoInput()}
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
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
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
                                            fontSize: "1rem"
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                    {editIdx === null ? (
                                        <button
                                            type="button"
                                            disabled={!isModalImageReady}
                                            onClick={() => {
                                                if (tipoSelecionado === "imagem") {
                                                    onAddBloco(tipoSelecionado, conteudo, subtipoImagem, uploadedMeta);
                                                } else if (tipoSelecionado === "carousel") {
                                                    onAddBloco(tipoSelecionado, null, null, { items: carouselImagens });
                                                } else {
                                                    onAddBloco(tipoSelecionado, conteudo);
                                                }
                                                setConteudo("");
                                                setTipoSelecionado("");
                                                setSubtipoImagem("");
                                                setUploadedMeta(null);
                                                setCarouselImagens([{ url: "", subtipo: "" }]);
                                                setShowModal(false);
                                            }}
                                            style={{
                                                background: !isImageReady ? "#b2b2b2" : "#4cd964",
                                                color: "#fff",
                                                textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                                boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                                                border: "1px solid rgba(255,255,255,0.10)",
                                                borderRadius: "4px",
                                                padding: "10px 18px",
                                                cursor: !isImageReady ? "not-allowed" : "pointer",
                                                fontWeight: "bold",
                                                fontSize: "1rem",
                                                opacity: !isImageReady ? 0.7 : 1
                                            }}
                                        >
                                            Adicionar bloco
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={!isModalImageReady}
                                            onClick={() => {
                                                if (tipoSelecionado === "imagem") {
                                                    onEditBloco(editIdx, tipoSelecionado, conteudo, subtipoImagem, uploadedMeta);
                                                } else if (tipoSelecionado === "carousel") {
                                                    onEditBloco(editIdx, tipoSelecionado, null, null, { items: carouselImagens });
                                                } else {
                                                    onEditBloco(editIdx, tipoSelecionado, conteudo);
                                                }
                                                setEditIdx(null);
                                                setConteudo("");
                                                setTipoSelecionado("");
                                                setSubtipoImagem("");
                                                setUploadedMeta(null);
                                                setCarouselImagens([{ url: "", subtipo: "" }]);
                                                setShowModal(false);
                                            }}
                                            style={{
                                                background: "#2196f3",
                                                color: "#fff",
                                                textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                                border: "none",
                                                borderRadius: "4px",
                                                padding: "10px 18px",
                                                cursor: !isImageReady ? "not-allowed" : "pointer",
                                                fontWeight: "bold",
                                                fontSize: "1rem",
                                                opacity: !isImageReady ? 0.7 : 1
                                            }}
                                        >
                                            Salvar edição
                                        </button>
                                    )}
                                </div>
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