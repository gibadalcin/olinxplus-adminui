import { useMediaQuery } from "react-responsive";
import CircularProgress from '@mui/material/CircularProgress';

export default function CustomButton({ children, onClick, style = {}, loading = false, disabled = false, ...props }) {
    const isMobile = useMediaQuery({ maxWidth: 768 });

    // Detecta se o botão é redondo (borderRadius >= 50%) para remover padding
    const isRound = style?.borderRadius && (typeof style.borderRadius === "string" ? style.borderRadius.includes("%") || parseInt(style.borderRadius) >= 24 : style.borderRadius >= 24);

    const isDisabled = disabled || loading;

    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            style={{
                padding: isRound ? 0 : (isMobile ? "0.5rem 1rem" : "0.75rem 2rem"),
                borderRadius: isRound ? style.borderRadius : "6px",
                fontWeight: isRound ? undefined : "700",
                fontSize: isRound ? undefined : (isMobile ? ".8em" : "1em"),
                textTransform: isRound ? undefined : "uppercase",
                cursor: isDisabled ? "not-allowed" : "pointer",
                border: "none",
                letterSpacing: isRound ? undefined : "0.5px",
                textAlign: "center",
                height: '36px',
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isDisabled ? 0.6 : 1,
                position: "relative",
                ...style
            }}
            {...props}
        >
            {loading ? (
                <>
                    <CircularProgress
                        size={20}
                        style={{
                            color: style?.color || '#fff',
                            marginRight: '8px'
                        }}
                    />
                    <span style={{ opacity: 0.7 }}>Processando...</span>
                </>
            ) : children}
        </button>
    );
}