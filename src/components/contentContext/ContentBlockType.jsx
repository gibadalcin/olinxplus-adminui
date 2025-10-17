import { useState, useRef, useEffect } from "react";
import { uploadLogo, uploadContentImage, getSignedContentUrl } from "../../api";
import { getAuth } from "firebase/auth";
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
                const formData = new FormData();
                formData.append("file", file);
                formData.append("name", file.name);
                // inclui subtipo no upload para que o backend salve essa informação
                formData.append("subtipo", subtipoImagem || "");
                // inclui marca e região para que o backend associe corretamente o bloco
                formData.append("marca", marca || "");
                formData.append("tipo_regiao", tipoRegiao || "");
                formData.append("nome_regiao", nomeRegiao || "");
                const user = getAuth().currentUser;
                if (!user) {
                    alert("Usuário não autenticado.");
                    return;
                }
                const token = await user.getIdToken();
                // Usa uploadContentImage para imagens de conteúdo
                const result = await uploadContentImage(formData, token);
                console.log("[uploadContentImage] Resultado:", result);
                if (result && result.success && result.url) {
                    // prefira a URL retornada no bloco do backend quando disponível
                    setConteudo((result.bloco && result.bloco.url) || result.url);
                    // use o bloco retornado como autoridade quando presente
                    const metaFromBackend = result.bloco || {};
                    const fallbackMeta = {
                        nome: metaFromBackend.nome || metaFromBackend.name || result.name || result.nome || file.name || "",
                        filename: metaFromBackend.filename || metaFromBackend.fileName || result.filename || result.fileName || file.name || "",
                        type: metaFromBackend.type || metaFromBackend.content_type || result.type || result.content_type || file.type || "",
                        created_at: metaFromBackend.created_at || metaFromBackend.createdAt || result.created_at || result.createdAt || new Date().toISOString(),
                        url: (result.bloco && result.bloco.url) || result.url
                    };
                    setUploadedMeta(result.bloco ? result.bloco : fallbackMeta);
                    alert("Upload realizado com sucesso!");
                } else if (result && result.url) {
                    setConteudo((result.bloco && result.bloco.url) || result.url);
                    const metaFromBackend = result.bloco || {};
                    const fallbackMeta = {
                        nome: metaFromBackend.nome || metaFromBackend.name || result.name || result.nome || file.name || "",
                        filename: metaFromBackend.filename || metaFromBackend.fileName || result.filename || result.fileName || file.name || "",
                        type: metaFromBackend.type || metaFromBackend.content_type || result.type || result.content_type || file.type || "",
                        created_at: metaFromBackend.created_at || metaFromBackend.createdAt || result.created_at || result.createdAt || new Date().toISOString(),
                        url: (result.bloco && result.bloco.url) || result.url
                    };
                    setUploadedMeta(result.bloco ? result.bloco : fallbackMeta);
                    alert("Upload realizado, mas sem sucesso explícito.");
                } else {
                    alert("Falha ao fazer upload da imagem: " + JSON.stringify(result));
                }
            }
            return (
                <>
                    <select
                        value={subtipoImagem}
                        onChange={e => {
                            setSubtipoImagem(e.target.value);
                            if (setSubtipo) setSubtipo(e.target.value);
                        }}
                        style={{ width: "100%", marginBottom: "1rem", padding: "8px", borderRadius: "6px" }}
                        disabled={disabled}
                    >
                        <option value="">Selecione o tipo de imagem</option>
                        {SUBTIPOS_IMAGEM.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <input
                        type="file"
                        accept="image/*"
                        style={{ marginBottom: "0.5rem" }}
                        onChange={handleFileChange}
                        disabled={disabled || !subtipoImagem}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Cole ou edite a URL gs:// aqui"
                        value={conteudo}
                        onChange={e => setConteudo(e.target.value)}
                        style={{ width: "100%", marginBottom: "0.5rem", padding: "8px", borderRadius: "6px" }}
                        disabled={disabled}
                    />
                    <input
                        type="text"
                        placeholder="Nome do arquivo"
                        value={conteudo ? conteudo.split('/').pop() : ''}
                        style={{ width: "100%", marginBottom: "1rem", padding: "8px", borderRadius: "6px", background: '#f5f5f5', color: '#888' }}
                        disabled={true}
                    />
                    {conteudo && <ContentImagePreview gsUrl={conteudo} />}
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
                const formData = new FormData();
                formData.append("file", file);
                formData.append("name", file.name);
                // inclui subtipo específico do item do carousel
                const subt = carouselImagens[idx]?.subtipo || "";
                formData.append("subtipo", subt);
                // inclui marca e região para que o backend associe corretamente o bloco do carousel
                formData.append("marca", marca || "");
                formData.append("tipo_regiao", tipoRegiao || "");
                formData.append("nome_regiao", nomeRegiao || "");
                const { getAuth } = await import("firebase/auth");
                const user = getAuth().currentUser;
                if (!user) {
                    alert("Usuário não autenticado.");
                    return;
                }
                const token = await user.getIdToken();
                const result = await uploadContentImage(formData, token);
                if (result && result.success && result.url) {
                    handleCarouselImgChange(idx, "url", (result.bloco && result.bloco.url) || result.url);
                    // guarda metadados no item do carousel se retornados (prefere bloco retornado pelo backend)
                    const metaFromBackend = result.bloco || {};
                    const fallbackMeta = {
                        nome: metaFromBackend.nome || metaFromBackend.name || result.name || result.nome || file.name || "",
                        filename: metaFromBackend.filename || metaFromBackend.fileName || result.filename || result.fileName || file.name || "",
                        type: metaFromBackend.type || metaFromBackend.content_type || result.type || result.content_type || file.type || "",
                        created_at: metaFromBackend.created_at || metaFromBackend.createdAt || result.created_at || result.createdAt || new Date().toISOString(),
                        url: (result.bloco && result.bloco.url) || result.url
                    };
                    handleCarouselImgChange(idx, "meta", result.bloco ? result.bloco : fallbackMeta);
                } else if (result && result.url) {
                    handleCarouselImgChange(idx, "url", (result.bloco && result.bloco.url) || result.url);
                    const metaFromBackend = result.bloco || {};
                    const fallbackMeta = {
                        nome: metaFromBackend.nome || metaFromBackend.name || result.name || result.nome || file.name || "",
                        filename: metaFromBackend.filename || metaFromBackend.fileName || result.filename || result.fileName || file.name || "",
                        type: metaFromBackend.type || metaFromBackend.content_type || result.type || result.content_type || file.type || "",
                        created_at: metaFromBackend.created_at || metaFromBackend.createdAt || result.created_at || result.createdAt || new Date().toISOString(),
                        url: (result.bloco && result.bloco.url) || result.url
                    };
                    handleCarouselImgChange(idx, "meta", result.bloco ? result.bloco : fallbackMeta);
                } else {
                    alert("Falha ao fazer upload da imagem.");
                }
            }
            return (
                <div style={{ width: "100%" }}>
                    {carouselImagens.map((img, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
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
                            <input
                                type="file"
                                accept="image/*"
                                style={{ maxWidth: 120 }}
                                onChange={e => handleFileChangeCarousel(idx, e)}
                                disabled={disabled}
                            />
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
                            alignItems: "center",
                            justifyContent: "space-between"
                        }}>
                        <div>
                            <strong style={{ color: "#4cd964" }}>{bloco.tipo}</strong>
                            <div style={{ color: "#fff", marginTop: "4px", wordBreak: "break-word" }}>
                                {bloco.conteudo}
                            </div>
                        </div>
                        <div>
                            <button
                                type="button"
                                aria-label={`Editar bloco ${bloco.tipo}`}
                                onClick={() => {
                                    // bloco.tipoSelecionado guarda o tipo base (ex: 'imagem')
                                    setTipoSelecionado(bloco.tipoSelecionado || bloco.tipo);
                                    // conteúdo pode estar em conteudo ou url
                                    setConteudo(bloco.conteudo || bloco.url || "");
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
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setConteudo("");
                                    setTipoSelecionado("");
                                    setEditIdx(null);
                                    setShowModal(false);
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
                                    disabled={(!conteudo || conteudo.trim() === "") || (tipoSelecionado === "imagem" && !subtipoImagem)}
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
                                        background: (!conteudo || conteudo.trim() === "") || (tipoSelecionado === "imagem" && !subtipoImagem) ? "#b2b2b2" : "#4cd964",
                                        color: "#fff",
                                        textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                        boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                                        border: "1px solid rgba(255,255,255,0.10)",
                                        borderRadius: "4px",
                                        padding: "10px 18px",
                                        cursor: (!conteudo || conteudo.trim() === "") || (tipoSelecionado === "imagem" && !subtipoImagem) ? "not-allowed" : "pointer",
                                        fontWeight: "bold",
                                        fontSize: "1rem",
                                        opacity: (!conteudo || conteudo.trim() === "") || (tipoSelecionado === "imagem" && !subtipoImagem) ? 0.7 : 1
                                    }}
                                >
                                    Adicionar bloco
                                </button>
                            ) : (
                                <button
                                    type="button"
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
                                        cursor: "pointer",
                                        fontWeight: "bold",
                                        fontSize: "1rem"
                                    }}
                                >
                                    Salvar edição
                                </button>
                            )}
                        </div>
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