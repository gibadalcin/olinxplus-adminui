import { useState, useRef, useEffect } from "react";

export default function ContentBlockType({
    tipoSelecionado,
    setTipoSelecionado,
    conteudo,
    setConteudo,
    disabled,
    blocos,
    onRemoveBloco,
    onEditBloco,
    onAddBloco
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

    useEffect(() => {
        if (tipoSelecionado) {
            setShowModal(true);
        } else {
            setShowModal(false);
        }
    }, [tipoSelecionado]);

    // Foca no campo de texto do modal ao abrir ou ao trocar tipo
    useEffect(() => {
        if (showModal) {
            // Aguarda renderização do input
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 100);
        }
    }, [showModal, tipoSelecionado]);

    function renderConteudoInput() {
        if (!tipoSelecionado) return null;
        if (tipoSelecionado === "imagem") {
            return (
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="URL da imagem"
                    value={conteudo}
                    onChange={e => setConteudo(e.target.value)}
                    style={{ width: "100%", marginBottom: "1rem", padding: "8px", borderRadius: "6px" }}
                    disabled={disabled}
                />
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
            return (
                <textarea
                    ref={inputRef}
                    placeholder="URLs de imagens ou vídeos (separados por vírgula)"
                    value={conteudo}
                    onChange={e => setConteudo(e.target.value)}
                    style={{ width: "100%", marginBottom: "1rem", padding: "8px", borderRadius: "6px" }}
                    disabled={disabled}
                />
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
                                    setTipoSelecionado(bloco.tipo);
                                    setConteudo(bloco.conteudo);
                                    setEditIdx(idx);
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
                                    disabled={!conteudo || conteudo.trim() === ""}
                                    onClick={() => {
                                        if (conteudo && conteudo.trim() !== "") {
                                            onAddBloco();
                                            setShowModal(false);
                                        }
                                    }}
                                    style={{
                                        background: !conteudo || conteudo.trim() === "" ? "#b2b2b2" : "#4cd964",
                                        color: "#fff",
                                        textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                                        boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
                                        border: "1px solid rgba(255,255,255,0.10)",
                                        borderRadius: "4px",
                                        padding: "10px 18px",
                                        cursor: !conteudo || conteudo.trim() === "" ? "not-allowed" : "pointer",
                                        fontWeight: "bold",
                                        fontSize: "1rem",
                                        opacity: !conteudo || conteudo.trim() === "" ? 0.7 : 1
                                    }}
                                >
                                    Adicionar bloco
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onEditBloco(editIdx, tipoSelecionado, conteudo);
                                        setEditIdx(null);
                                        setConteudo("");
                                        setTipoSelecionado("");
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
                </div>
            )}
        </>
    );
}