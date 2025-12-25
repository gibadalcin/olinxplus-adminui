import CustomButton from "./../globalContext/CustomButton";

export default function DashboardActions({ usuario, isMobile, onImages, onRegister }) {
    const USER_ADMIN_EMAIL = import.meta.env.VITE_USER_ADMIN_EMAIL;
    return (
        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <CustomButton
                onClick={onImages}
                style={{
                    background: "#FFB703",
                    color: "#ffffff",
                    borderStyle: "solid",
                    borderWidth: "1px",
                    borderColor: "rgba(255,255,255,0.90)",
                    textShadow: "0 1px 4px rgba(0,0,0,0.50)",
                }}
            >
                Gerenciar Imagens
            </CustomButton>
            {usuario?.email === USER_ADMIN_EMAIL && (
                <CustomButton
                    onClick={onRegister}
                    style={{
                        background: "#012E57",
                        color: "#fff",
                        borderStyle: "solid",
                        borderWidth: "1px",
                        borderColor: "rgba(255,255,255,0.90)",
                        textShadow: "0 1px 2px rgba(0,0,0,0.50)",
                    }}
                >
                    Cadastrar Administrador
                </CustomButton>
            )}
        </div>
    );
}
