import CustomButton from "./../../components/globalContext/CustomButton";
import { FiPlus, FiX } from "react-icons/fi";
import useIsMasterAdmin from "./../../hooks/useIsMasterAdmin";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function ImageCard({ img, isMobile, isAdmin, usuario, onDelete }) {
    const navigate = useNavigate();
    // Trate o risco de undefined
    const ownerUid = img.owner_uid || "";
    // Se ownerUid vier vazio, isMaster será false
    const isMaster = Boolean(useIsMasterAdmin({ uid: ownerUid }));

    // Glass color: vermelho para master, azul para outros admins
    const glassColor = isMaster
        ? "rgba(255, 0, 0, 0.12)" // leve vermelho
        : "rgba(1, 46, 87, 0.12)"; // azul contexto olinxra

    const [previewUrl, setPreviewUrl] = useState(img.signed_url || (img.meta && img.meta.signed_url) || img.url);

    useEffect(() => {
        let mounted = true;
        async function hydrate() {
            try {
                // If original URL is gs:// and we don't have a signed_url yet, ask the server
                if (previewUrl && typeof previewUrl === 'string' && previewUrl.startsWith && previewUrl.startsWith('gs://')) {
                    const mod = await import('../../api');
                    const signed = await mod.getSignedContentUrl(img.url, img.filename || (img.meta && img.meta.filename));
                    if (mounted && signed) setPreviewUrl(signed);
                }
            } catch (e) {
                // noop, keep original previewUrl
                console.error('Falha ao obter signed url para imagem', e);
            }
        }
        hydrate();
        return () => { mounted = false; };
    }, []); // run once per card

    return (
        <div
            style={{
                background: glassColor,
                borderRadius: "14px",
                padding: isMobile ? "0.5rem" : "1rem",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                flex: "1 1 45%",
                maxWidth: "220px", // tamanho máximo menor do card
                minWidth: "140px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                border: isMaster ? "2px solid rgba(255,0,0,0.18)" : "2px solid rgba(0,180,60,0.18)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                boxSizing: "border-box"
            }}
        >
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                margin: "0.25rem 0 0.15rem 0"
            }}>
                <span style={{
                    color: "#fff",
                    fontSize: isMobile ? "1em" : "1.08em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    wordBreak: "break-word",
                    textAlign: "left",
                    fontWeight: 500,
                    letterSpacing: "0.2px",
                    flex: 1,
                    justifyContent: "left",
                }} title={img.nome}>{img.nome}</span>
                {(isAdmin || (usuario && ownerUid === usuario.uid)) && (
                    <button
                        onClick={() => onDelete(img._id)}
                        style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            marginLeft: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                        }}
                        aria-label="Excluir"
                    >
                        <FiX size={20} color="#fff" />
                    </button>
                )}
            </div>
            {img.url ? (
                <img
                    src={img.url}
                    srcSet={img.webpUrl ? `${img.webpUrl} 1x, ${img.webpUrl2x} 2x` : undefined}
                    width={212}
                    height={119}
                    alt={img.name || "Logo"}
                    style={{
                        maxWidth: "100%",
                        height: "auto",
                        objectFit: "contain",
                        borderRadius: 8,
                        background: "#fff"
                    }}
                    fetchPriority="high" // <-- Correto em React
                />
            ) : (
                <div
                    style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        borderRadius: "10px",
                        background: "#eee",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#888",
                        fontSize: "1.1em",
                        maxWidth: "220px",
                        maxHeight: "123px",
                        boxShadow: "0 1px 8px rgba(0,0,0,0.10)"
                    }}
                >
                    Imagem não disponível
                </div>
            )}
            {/* Nome e botão de exclusão já renderizados acima */}
            {(isAdmin || (usuario && ownerUid === usuario.uid)) ? (
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    gap: 0,
                    maxWidth: "220px" // <-- garante que os botões não ultrapassem o card
                }}>
                    <CustomButton
                        onClick={() => navigate(`/content?ownerId=${ownerUid}&imageId=${img._id}`)}
                        style={{
                            background: "linear-gradient(90deg, #00e913ff 0%, #04aa20ff 100%)",
                            textShadow: "0 1px 4px rgba(0,0,0,0.15)",
                            width: "100%",
                            minWidth: 0,
                            maxWidth: "220px",
                            height: "24px",
                            borderRadius: "2px",
                            transition: "box-shadow 0.2s",
                            marginRight: "2px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxSizing: "border-box",
                            color: "#fff",
                            fontWeight: "700",
                            fontSize: "0.9em",
                            letterSpacing: "0.5px",
                        }}
                        aria-label="Associar Conteúdo"
                    >
                        Conteúdo
                    </CustomButton>
                </div>
            ) : null}
        </div>
    );
}