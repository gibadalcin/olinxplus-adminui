import { useState } from "react";

export default function ContentBlockType({
    tipoSelecionado,
    setTipoSelecionado,
    conteudo,
    setConteudo,
    disabled,
    blocos,
    onRemoveBloco,
    onEditBloco
}) {
    function renderConteudoInput() {
        if (!tipoSelecionado) return null;
        if (tipoSelecionado === "imagem") {
            return (
                <input
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
            {/* Preview dos blocos adicionados */}
            {blocos.length > 0 && (
                <div style={{
                    width: "100%",
                    marginTop: "2rem",
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                    padding: "1rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.10)"
                }}>
                    <h4 style={{ color: "#fff", marginBottom: "1rem" }}>Pré-visualização dos blocos</h4>
                    {blocos.map((bloco, idx) => (
                        <div key={idx} style={{
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
                            <button
                                type="button"
                                onClick={() => onRemoveBloco(idx)}
                                style={{
                                    marginLeft: "1rem",
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
                    ))}
                </div>
            )}
            {/* Campo de conteúdo aparece acima do rodapé */}
            {tipoSelecionado && renderConteudoInput()}
        </>
    );
}