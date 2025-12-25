import { useState, useEffect, useMemo } from "react";
import MainTitle from "../components/globalContext/MainTitle";
import Copyright from "../components/globalContext/Copyright";
import { useNavigate } from "react-router-dom";
import FadeIn from "../components/globalContext/FadeIn";
import Header from "../components/globalContext/Header";
import { fetchAdmins, createAdmin, deleteAdmin } from "../api";
import { getAuth } from "firebase/auth";
import AdminForm from "../components/adminContext/AdminForm";
import AdminList from "../components/adminContext/AdminList";
import DeleteAdminModal from "../components/adminContext/DeleteAdminModal";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1420;
const MAIN_BG_COLOR = "#0047AB";
const LEFT_COL_BG_COLOR = "rgba(255,255,255)";

export default function Register() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState("");
    const [admins, setAdmins] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [adminToDelete, setAdminToDelete] = useState(null);
    const [showContent, setShowContent] = useState(false);
    const [adminsLoaded, setAdminsLoaded] = useState(false);
    const navigate = useNavigate();

    const initialIsMobile = useMemo(() => window.innerWidth <= MOBILE_BREAKPOINT, []);

    const [isMobile, setIsMobile] = useState(initialIsMobile);
    const [isTablet, setIsTablet] = useState(window.innerWidth <= TABLET_BREAKPOINT);

    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
            setIsTablet(window.innerWidth <= TABLET_BREAKPOINT);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        setTimeout(() => setShowContent(true), 400);
    }, []);

    useEffect(() => {
        async function fetchTokenAndAdmins() {
            const usuario = getAuth().currentUser;
            if (!usuario) {
                setErro("Usuário não autenticado.");
                setAdminsLoaded(true);
                return;
            }
            try {
                const idToken = await usuario.getIdToken();
                const adminsList = await fetchAdmins(idToken);
                setAdmins(adminsList);
            } catch (err) {
                setErro("Erro ao buscar administradores: " + (err?.message || err));
            } finally {
                setAdminsLoaded(true);
            }
        }
        fetchTokenAndAdmins();
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        setErro("");
        setSucesso("");
        if (!email || !senha) {
            setErro("Preencha todos os campos.");
            return;
        }
        const usuario = getAuth().currentUser;
        if (!usuario) {
            setErro("Usuário não autenticado. Faça login novamente.");
            return;
        }
        try {
            const token = await usuario.getIdToken();
            const res = await createAdmin(email, senha, token);
            if (res && res.ok) {
                setSucesso("Administrador cadastrado com sucesso!");
                setEmail("");
                setSenha("");
                const adminsList = await fetchAdmins(token);
                setAdmins(adminsList);
            } else if (res) {
                const data = await res.json();
                if (
                    data.detail && (
                        data.detail.includes("EMAIL_EXISTS") ||
                        data.detail.includes("já existe um usuário com este e-mail") ||
                        data.detail.includes("already exists")
                    )
                ) {
                    setErro("Já existe um administrador cadastrado com este e-mail.");
                } else {
                    setErro(data.message || data.detail || "Erro ao cadastrar.");
                }
            } else {
                setErro("Erro inesperado na resposta da API.");
            }
        } catch (err) {
            setErro("Erro ao cadastrar: " + (err?.message || err));
        }
    };

    const handleDeleteAdmin = async () => {
        if (!adminToDelete) {
            setErro("Nenhum administrador selecionado para exclusão.");
            return;
        }
        const usuario = getAuth().currentUser;
        if (!usuario) {
            setErro("Usuário não autenticado. Faça login novamente.");
            return;
        }
        setErro("");
        try {
            const token = await usuario.getIdToken();
            const res = await deleteAdmin(adminToDelete.uid, token);
            if (res && res.ok) {
                setAdmins(admins.filter(a => a.uid !== adminToDelete.uid));
                setModalOpen(false);
                setAdminToDelete(null);
            } else if (res) {
                const data = await res.json();
                setErro(data.message || "Erro ao excluir.");
            } else {
                setErro("Erro inesperado na resposta da API.");
            }
        } catch (err) {
            setErro("Erro ao excluir: " + (err?.message || err));
        }
    };

    // Estilo para o container do conteúdo
    const contentContainerStyle = useMemo(() => ({
        padding: isMobile ? "1.5rem" : "3rem",
        borderRadius: "16px",
        maxWidth: isMobile ? "90%" : "400px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "0px",
        background: isMobile ? MAIN_BG_COLOR : "transparent",
    }), [isMobile]);

    return (
        <div
            style={{
                width: "100vw",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: MAIN_BG_COLOR,
                overflow: "hidden",
                position: "relative",
            }}
        >
            <div
                style={{
                    width: "100%",
                    height: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: isMobile ? "column" : "row",
                }}
            >
                {/* COLUNA 1: LOGOMARCA/BRANDING (Desktop Only) */}
                {!isMobile && (
                    <div
                        style={{
                            width: "30%",
                            height: "100%",
                            background: LEFT_COL_BG_COLOR,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            textAlign: "center",
                            padding: "2rem",
                        }}
                    >
                        <Header />
                    </div>
                )}

                {/* COLUNA 2: CONTEÚDO DO REGISTER */}
                <div
                    style={{
                        width: isMobile ? "100%" : "70%",
                        height: "100%",
                        background: MAIN_BG_COLOR,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <FadeIn show={showContent} duration="0.6s" distance="40px">
                        <div style={contentContainerStyle}>
                            {/* Logomarca mobile */}
                            {isMobile && (
                                <Header />
                            )}
                            <MainTitle isMobile={isMobile} isTablet={isTablet}>Cadastrar novo administrador</MainTitle>
                            <AdminForm
                                email={email}
                                senha={senha}
                                setEmail={setEmail}
                                setSenha={setSenha}
                                handleRegister={handleRegister}
                                isMobile={isMobile}
                                isTablet={isTablet} // <-- Adicione esta linha
                                erro={erro}
                                sucesso={sucesso}
                                navigate={navigate}
                                formStyle={{
                                    flexWrap: "wrap",
                                    gap: "1rem",
                                    width: "80%",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            />
                            {adminsLoaded ? (
                                <>
                                    <div
                                        style={{
                                            background: "transparent",
                                            padding: isMobile ? "0.5rem" : "1.5rem",
                                            borderRadius: "8px",
                                            textAlign: "center",

                                        }}
                                        className="admin-list-scroll"
                                    >
                                        <h2 style={{
                                            color: "#fff",
                                            fontSize: isMobile ? "1.2em" : "1.4em",
                                            marginBottom: "1rem",
                                        }}>Administradores</h2>

                                        <div style={{
                                            display: 'flex',
                                            width: '70vw',
                                            margin: isMobile ? "16px auto" : "24px auto",
                                            maxHeight: isMobile ? "260px" : "340px",
                                            overflowY: "auto",
                                            scrollbarWidth: "thin",
                                            scrollbarColor: "#cccccc #0000",
                                        }}>
                                            <AdminList
                                                admins={admins}
                                                isMobile={isMobile}
                                                onDelete={admin => { setModalOpen(true); setAdminToDelete(admin); }}
                                            />
                                        </div>
                                    </div>
                                    <DeleteAdminModal
                                        open={modalOpen}
                                        adminToDelete={adminToDelete}
                                        onConfirm={handleDeleteAdmin}
                                        onCancel={() => { setModalOpen(false); setAdminToDelete(null); }}
                                        isMobile={isMobile}
                                    />
                                </>
                            ) : (
                                <div style={{ color: "#fff", marginTop: "2rem" }}>Carregando administradores...</div>
                            )}
                            <Copyright />
                        </div>
                    </FadeIn>
                </div>
            </div>
        </div>
    );
}