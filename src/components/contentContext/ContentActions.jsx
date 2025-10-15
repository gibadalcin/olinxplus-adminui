import CustomButton from "../globalContext/CustomButton";
import { useNavigate } from "react-router-dom";

export default function ContentActions({ onSubmit, disabled }) {
    const navigate = useNavigate();
    return (
        <div style={{
            zIndex: 10001,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "240px"
        }}>
            <CustomButton
                type="button"
                onClick={() => navigate("/dashboard")}
                style={{
                    background: "#012E57",
                    color: "#fff",
                    textShadow: "0 1px 4px rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.90)",
                }}
            >
                Dashboard
            </CustomButton>
            <CustomButton
                type="button"
                onClick={e => {
                    if (!disabled) {
                        onSubmit(e);
                    } else {
                        e.preventDefault();
                    }
                }}
                disabled={disabled}
                style={{
                    background: disabled ? "#bdbdbd" : "#4cd964",
                    color: disabled ? "#888" : "#151515",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.90)",
                }}>
                Salvar
            </CustomButton>
        </div>
    );
}