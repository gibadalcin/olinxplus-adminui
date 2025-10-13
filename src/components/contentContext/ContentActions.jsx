import CustomButton from "../globalContext/CustomButton";
import { useNavigate } from "react-router-dom";

export default function ContentActions({ onSubmit, disabled }) {
    const navigate = useNavigate();
    return (
        <div style={{
            position: "fixed",
            top: 24,
            right: 32,
            zIndex: 10001,
            display: "flex",
            flexDirection: "column",
            gap: "12px"
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
                type="submit"
                onClick={onSubmit}
                disabled={disabled}
                style={{
                    background: "#4cd964",
                    color: "#151515",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.15)",
                    border: "1px solid rgba(255,255,255,0.90)",
                }}>
                Salvar
            </CustomButton>
        </div>
    );
}