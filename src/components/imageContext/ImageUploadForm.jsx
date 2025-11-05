import CustomButton from "./../../components/globalContext/CustomButton";

export default function ImageUploadForm({ file, setFile, nome, setNome, isMobile, uploading, handleUpload, onDashboardClick }) {
    // Função para limpar os campos após envio
    const handleSubmit = async (e) => {
        await handleUpload(e);
        // Limpa os campos se o upload foi bem-sucedido
        setFile(null);
        setNome("");
        // Opcional: também pode limpar o input file visualmente
        if (e.target && e.target.reset) e.target.reset();
    };
    return (
        <form
            onSubmit={handleSubmit}
            style={{
                margin: "0 auto 2rem auto",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "1rem",
                alignItems: "center",
                justifyContent: "center",
                width: 'auto',
                minWidth: isMobile ? "80%" : "80%",

            }}>
            <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={e => {
                    const arquivo = e.target.files[0];
                    setFile(arquivo);
                    if (arquivo) {
                        let nomeArquivo = arquivo.name;
                        // Remove a extensão
                        let nomeBase = nomeArquivo.replace(/\.[^/.]+$/, "");
                        // Extrai apenas o primeiro conjunto antes de hífen, underline ou ponto
                        let nomeSimples = nomeBase.split(/[-_.]/)[0];
                        setNome(nomeSimples);
                    }
                }}
                required
                style={{
                    background: "#fff",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    border: "none",
                    width: isMobile ? "90%" : "100%",
                    maxWidth: isMobile ? "90%" : "60%",
                    fontSize: "16px",
                }}
            />
            <input
                type="text"
                placeholder="Nome da imagem"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                style={{
                    background: "#fff",
                    borderRadius: "6px",
                    padding: "0.5rem",
                    width: isMobile ? "90%" : "100%",
                    border: "none",
                    fontSize: "16px"
                }}
            />
            <CustomButton
                type="submit"
                disabled={uploading || !file || !nome}
                style={{
                    background: (uploading || !file || !nome)
                        ? "#cccccc"
                        : "linear-gradient(90deg, #00e913ff 0%, #04aa20ff 100%)",
                    color: "#ffffff",
                    fontWeight: "700",
                    textShadow: (uploading || !file || !nome)
                        ? "none"
                        : "0 1px 4px rgba(0,0,0,0.15)",
                    width: isMobile ? "90%" : "100%",
                    borderStyle: "solid",
                    borderWidth: "1px",
                    borderColor: (uploading || !file || !nome)
                        ? "#999999"
                        : "#ffffff",
                }}
            >
                {uploading ? "Enviando..." : "Enviar"}
            </CustomButton>
        </form>
    );
}
