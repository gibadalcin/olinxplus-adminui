import { useState, useRef, useEffect } from "react";
import { uploadLogo, uploadContentImage, getSignedContentUrl } from "../../api";
import { getAuth } from "firebase/auth";
import useIsMasterAdmin from "../../hooks/useIsMasterAdmin";
// Subtipos possíveis para blocos de imagem
const SUBTIPOS_IMAGEM = [
    { value: "banner", label: "Banner" },
    { value: "card", label: "Card" },
    { value: "header", label: "Cabeçalho" },
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
    const [showPath, setShowPath] = useState(false);

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
    // detecta mobile para ajustar layout (empilhar em column em telas pequenas)
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(max-width: 640px)');
        const onChange = () => setIsMobile(mq.matches);
        onChange();
        try { if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange); } catch (e) { }
        return () => { try { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else mq.removeListener(onChange); } catch (e) { } };
    }, []);

    // Permite adicionar/remover imagens e escolher subtipo
    function handleCarouselImgChange(idx, field, value) {
        const novas = [...carouselImagens];
        novas[idx][field] = value;
        setCarouselImagens(novas);
    }
    function handleAddCarouselImg() {
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
                    url: objectUrl
                };
                setUploadedMeta(meta);
                // ao selecionar arquivo local, não mostrar o campo de código automaticamente
                // informa o usuário que o arquivo foi carregado localmente
                alert("Arquivo carregado localmente. Clique em 'Adicionar bloco' e depois em 'Salvar' para enviar ao servidor.");
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
                            <option value="">Selecione o tipo de imagem</option>
                            {SUBTIPOS_IMAGEM.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {/* Input file escondido, controlado por botão visível */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
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
                            {subtipoImagem ? 'Escolher arquivo' : 'Tipo indefinido'}
                        </button>
                        {/* botão Mostrar caminho será renderizado abaixo do nome do arquivo para manter padrão */}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: isMobile ? 'stretch' : 'center', marginBottom: 12, flexDirection: isMobile ? 'column' : 'row' }}>
                        <div style={{ width: isMobile ? '100%' : 120, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 8, overflow: 'hidden' }}>
                            {uploadedMeta?.url || conteudo ? (
                                (uploadedMeta && uploadedMeta.url && (uploadedMeta.url.startsWith('gs://') || uploadedMeta.url.startsWith('/')))
                                    ? <ContentImagePreview gsUrl={uploadedMeta.url} />
                                    : <img src={uploadedMeta?.url || conteudo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ color: '#999', fontSize: 12 }}>Sem imagem</div>
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
                                        onClick={() => setShowPath(p => !p)}
                                        style={{ ...BTN.base, ...BTN.neutral, ...BTN.small, height: 34, width: '100%', textAlign: 'left', boxSizing: 'border-box', outline: 'none', display: 'block' }}
                                    >
                                        {showPath ? 'Ocultar caminho' : 'Mostrar caminho'}
                                    </button>
                                )}
                                <div style={{ minHeight: 26, paddingLeft: 6, paddingRight: 6, boxSizing: 'border-box' }}>
                                    <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', opacity: showPath ? 1 : 0, transition: 'opacity 160ms linear', position: 'relative', wordBreak: 'break-word' }}>{uploadedMeta?.url || conteudo}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            );
        }
        if (tipoSelecionado === "video") {
            return (
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="URL do vídeo"
                    value={conteudo}
                    onChange={e => setConteudo(e.target.value)}
                    style={{ width: "100%", marginBottom: "1rem", padding: "8px", borderRadius: "6px" }}
                    disabled={disabled}
                />
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
                    url: objectUrl
                };
                handleCarouselImgChange(idx, "meta", meta);
                alert("Arquivo carregado localmente no carousel. Clique em 'Salvar' para enviar ao servidor.");
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
                                accept="image/*"
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
                            <input
                                type="text"
                                placeholder="URL da imagem"
                                value={img.url}
                                onChange={e => handleCarouselImgChange(idx, "url", e.target.value)}
                                style={{ flex: 1, padding: 6, borderRadius: 6 }}
                                disabled={disabled}
                            />
                            {img.url && (
                                <img src={img.url} alt="preview" style={{ maxWidth: 60, maxHeight: 60, borderRadius: 6, marginLeft: 4 }} />
                            )}
                            <button type="button" onClick={() => handleRemoveCarouselImg(idx)} style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 4, padding: "6px 10px", cursor: "pointer" }} disabled={carouselImagens.length === 1}>-</button>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddCarouselImg} style={{ background: "#2196f3", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px", cursor: "pointer", marginTop: 8 }}>Adicionar imagem</button>
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
                        <div style={{ display: 'flex', gap: 12, alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'row' : 'row', width: isMobile ? '100%' : 'auto' }}>
                            {bloco.url && (bloco.url.startsWith('gs://') ? (
                                <ContentImagePreview gsUrl={bloco.url} />
                            ) : (
                                <img src={bloco.url} alt="thumb" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                            ))}
                            <div>
                                <strong style={{ color: "#4cd964" }}>{bloco.tipo}</strong>
                                <div style={{ color: "#fff", marginTop: "4px", wordBreak: "break-word" }}>
                                    <div style={{ fontSize: 12, color: '#ccc' }}>{bloco.nome || bloco.filename || ''}</div>
                                    {/* Apenas master pode ver opção de revelar caminho do arquivo */}
                                    {isMaster && (bloco.url || bloco.conteudo) && (
                                        <div style={{ marginTop: 6 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPath(p => !p)}
                                                    style={{ background: '#666', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12, display: 'block' }}
                                                >
                                                    {showPath ? 'Ocultar caminho' : 'Mostrar caminho'}
                                                </button>
                                                <div style={{ minHeight: 26, paddingLeft: 4, paddingRight: 4, boxSizing: 'border-box' }}>
                                                    <div style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', opacity: showPath ? 1 : 0, transition: 'opacity 160ms linear', position: 'relative', wordBreak: 'break-word' }}>{bloco.url || bloco.conteudo}</div>
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
                        padding: '2.5rem 2rem',
                        minWidth: '340px',
                        maxWidth: '96vw',
                        width: '50vw',
                        minHeight: '220px',
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
                            const isImageReady = tipoSelecionado === 'imagem' ? (subtipoImagem && (uploadedMeta?.pendingFile || (conteudo && conteudo.trim() !== ""))) : (conteudo && conteudo.trim() !== "");
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
                                            setShowPath(false);
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
                                            disabled={!isImageReady}
                                            onClick={() => {
                                                if (tipoSelecionado === "imagem") {
                                                    onAddBloco(tipoSelecionado, conteudo, subtipoImagem, uploadedMeta);
                                                } else {
                                                    onAddBloco(tipoSelecionado, conteudo);
                                                }
                                                setConteudo("");
                                                setTipoSelecionado("");
                                                setSubtipoImagem("");
                                                setUploadedMeta(null);
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
                                            disabled={!isImageReady}
                                            onClick={() => {
                                                if (tipoSelecionado === "imagem") {
                                                    onEditBloco(editIdx, tipoSelecionado, conteudo, subtipoImagem, uploadedMeta);
                                                } else {
                                                    onEditBloco(editIdx, tipoSelecionado, conteudo);
                                                }
                                                setEditIdx(null);
                                                setConteudo("");
                                                setTipoSelecionado("");
                                                setSubtipoImagem("");
                                                setUploadedMeta(null);
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
function ContentImagePreview({ gsUrl }) {
    const [signedUrl, setSignedUrl] = useState(null);
    useEffect(() => {
        let isMounted = true;
        async function fetchUrl() {
            if (!gsUrl) return;
            const url = await getSignedContentUrl(gsUrl);
            if (isMounted) setSignedUrl(url);
        }
        fetchUrl();
        return () => { isMounted = false; };
    }, [gsUrl]);
    if (!signedUrl) return <span>Carregando imagem...</span>;
    return <img src={signedUrl} alt="preview" style={{ maxWidth: "100%", maxHeight: 120, marginBottom: 8, borderRadius: 8 }} />;
}