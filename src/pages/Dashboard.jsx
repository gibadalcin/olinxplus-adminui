import { useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import FadeIn from "../components/globalContext/FadeIn";
import Loader from "../components/globalContext/Loader";
import Copyright from "../components/globalContext/Copyright";
import MainTitle from "../components/globalContext/MainTitle";
import CustomButton from "../components/globalContext/CustomButton";
import UserInfo from "../components/globalContext/UserInfo";
import DashboardActions from "../components/dashboardContext/DashboardActions";
import Header from "../components/globalContext/Header";

const MOBILE_BREAKPOINT = 768;
const MAIN_BG_COLOR = "#0047AB"; // Azul escuro
const LEFT_COL_BG_COLOR = "#ffffff"; // Branco

export default function Dashboard() {
    const [usuario, setUsuario] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showContent, setShowContent] = useState(false);
    const [showFade, setShowFade] = useState(false);
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUsuario(user);
            setLoading(false);
            setTimeout(() => {
                setShowContent(true);
                setShowFade(true);
            }, 400); // Transição suave
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await auth.signOut();
        navigate("/");
    };

    return (
        <div style={{
            background: MAIN_BG_COLOR,
            minHeight: "100vh",
            width: "100vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
        }}>
            {/* Loader aparece sobre o fundo, antes dos componentes */}
            {(loading || !showContent) && (
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: MAIN_BG_COLOR,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                }}>
                    <Loader />
                </div>
            )}
            <div style={{
                width: "100%",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: isMobile ? "column" : "row",
                overflow: "hidden",
            }}>
                {/* COLUNA 1: LOGOMARCA/BRANDING (Desktop Only) */}
                {!isMobile && (
                    <div style={{
                        width: "60%",
                        height: "100%",
                        background: LEFT_COL_BG_COLOR,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        textAlign: "center",
                        padding: "2rem",
                    }}>
                        <Header />
                    </div>
                )}
                {/* COLUNA 2: CONTEÚDO DO DASHBOARD */}
                <div style={{
                    width: isMobile ? "100%" : "40%",
                    height: "100%",
                    background: MAIN_BG_COLOR,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                }}>
                    {/* Logomarca mobile */}
                    {isMobile && (
                        <Header />
                    )}
                    <FadeIn show={showFade} duration="0.6s" distance="40px">
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <MainTitle isMobile={isMobile}>Dashboard</MainTitle>
                            <UserInfo usuario={usuario} isMobile={isMobile} />
                            <DashboardActions
                                usuario={usuario}
                                isMobile={isMobile}
                                onImages={() => navigate("/images")}
                                onRegister={() => navigate("/register")}
                            />
                            <CustomButton
                                onClick={handleLogout}
                                style={{
                                    marginTop: "2rem",
                                    background: "#d32f2f",
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.20)",
                                    color: "#fff",
                                }}
                            >
                                Sair
                            </CustomButton>
                            <Copyright />
                        </div>
                    </FadeIn>
                </div>
            </div>
        </div>
    );
}