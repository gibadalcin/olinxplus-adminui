export default function Loader({ height = "60vh" }) {
    return (
        <div style={{
            width: "100vw",
            height: '100vh',
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0047AB", // Adicione esta linha!
        }}>
            <div style={{
                border: "6px solid #FFB703",
                borderTop: "6px solid #0047AB",
                borderRadius: "50%",
                width: "48px",
                height: "48px",
                animation: "spin 1s linear infinite",
                background: "#0047AB",
            }} />
            <style>
                {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
            </style>
        </div>
    );
}