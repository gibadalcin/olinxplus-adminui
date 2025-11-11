import React, { useEffect, useState } from "react";
import CustomButton from "./../../components/globalContext/CustomButton";

export default function DeleteImageModal({ open, imgToDelete, imagens, onConfirm, onClose }) {
    if (!open) return null;
    const imgObj = imagens.find(i => i._id === imgToDelete);
    const [imageSrc, setImageSrc] = useState(null);

    useEffect(() => {
        if (!imgObj) {
            setImageSrc(null);
            return;
        }
        const signed = imgObj.signed_url || (imgObj.meta && imgObj.meta.signed_url);
        const publicUrl = imgObj.url;
        if (signed) {
            // Não modificar signed URLs (assinatura sensível à query string)
            setImageSrc(signed);
            return;
        }
        if (!publicUrl) {
            setImageSrc(null);
            return;
        }
        // Para URLs públicas, adiciona cache-buster
        const sep = publicUrl.includes("?") ? "&" : "?";
        setImageSrc(`${publicUrl}${sep}t=${Date.now()}`);
    }, [imgObj]);

    return (
        <div style={{
            position: "fixed",
            width: "100%", height: "100%",
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999
        }}>
            <div style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "2rem",
                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                minWidth: "320px",
                textAlign: "center"
            }}>
                <h2 style={{ color: "#d32f2f", marginBottom: "1rem" }}>Confirmar exclusão</h2>
                {imageSrc && (
                    <img
                        src={imageSrc}
                        alt={imgObj?.nome}
                        style={{
                            width: "120px",
                            borderRadius: "8px",
                            marginBottom: "1rem",
                            objectFit: "cover",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.10)"
                        }}
                    />
                )}
                <p>Deseja realmente excluir a imagem <b>{imgObj?.nome}</b>?</p>
                <div
                    style={{
                        marginTop: "2rem",
                        display: "flex",
                        gap: "1rem",
                        justifyContent: "center"
                    }}>
                    <CustomButton
                        onClick={onConfirm}
                        style={{ background: "#d32f2f", color: "#fff" }}
                    >
                        Excluir
                    </CustomButton>
                    <CustomButton
                        onClick={onClose}
                        style={{ background: "#012E57", color: "#fff" }}
                    >
                        Cancelar
                    </CustomButton>
                </div>
            </div>
        </div>
    );
}
