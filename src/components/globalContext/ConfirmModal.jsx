export default function ConfirmModal({ open, onConfirm, onCancel }) {
    if (!open) return null;
    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999
        }}>
            <div style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "2rem",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                maxWidth: "400px",
                textAlign: "center"
            }}>
                <h3 style={{ marginBottom: "1rem" }}>Trocar marca?</h3>
                <p style={{ marginBottom: "2rem", color: "#333" }}>
                    Você possui blocos não salvos. Ao trocar a marca, todo o conteúdo será perdido. Deseja continuar?
                </p>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: "8px 20px",
                            background: "#ccc",
                            color: "#222",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            marginRight: "1rem",
                            cursor: "pointer"
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: "8px 20px",
                            background: "#e74c3c",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "bold",
                            cursor: "pointer"
                        }}
                    >
                        Trocar marca
                    </button>
                </div>
            </div>
        </div>
    );
}