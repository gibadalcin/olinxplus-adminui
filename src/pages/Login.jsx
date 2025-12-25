import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import Header from "../components/globalContext/Header";
import Copyright from "../components/globalContext/Copyright";
import MainTitle from "../components/globalContext/MainTitle";
import FadeIn from "../components/globalContext/FadeIn";
import LoginForm from "../components/loginContext/LoginForm";

const MOBILE_BREAKPOINT = 768;
const MAIN_BG_COLOR = "#0047AB"; // Azul escuro
const LEFT_COL_BG_COLOR = "#ffffff"; // Branco

export default function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [erro, setErro] = useState("");
    const [showFade, setShowFade] = useState(false);

    const initialIsMobile = useMemo(() => window.innerWidth <= MOBILE_BREAKPOINT, []);
    const [isMobile, setIsMobile] = useState(initialIsMobile);

    const navigate = useNavigate();

    // Memoiza a função de redimensionamento para estabilidade do useEffect
    const handleResize = useCallback(() => {
        const newIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
        if (newIsMobile !== isMobile) {
            setIsMobile(newIsMobile);
        }
    }, [isMobile]);

    useEffect(() => {
        // Aplica o FadeIn após um pequeno atraso
        const timer = setTimeout(() => setShowFade(true), 100);

        window.addEventListener("resize", handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("resize", handleResize);
        };
    }, [handleResize]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro("");
        setIsLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, senha);
            navigate("/dashboard");
        } catch (err) {
            console.error("Login Error:", err);
            const errorMessage = "Usuário ou senha inválidos.";
            setErro(errorMessage);
            setIsLoading(false);
        }
    };

    // Estilo para o container do formulário (que está na coluna azul)
    const formContainerStyle = useMemo(() => ({
        padding: isMobile ? "1.5rem" : "3rem",
        borderRadius: "16px",
        maxWidth: isMobile ? "90%" : "400px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // Adiciona min-height para reduzir CLS do formulário interno
        minHeight: "0px",
    }), [isMobile]);


    return (
        // 1. DIV EXTERNA: Estilos de fundo aplicados imediatamente no elemento mais externo
        <div
            style={{
                width: "100vw",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: MAIN_BG_COLOR, // Cor de fundo principal imediata
                overflow: "hidden",
                position: "relative",
            }}
        >
            {/* CONTAINER PRINCIPAL: Estrutura de colunas que ocupa 100% da tela */}
            <div
                style={{
                    width: "100%",
                    height: "100vh", // Garante que as colunas preencham a altura
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: isMobile ? "column" : "row",
                    // No mobile, o fundo de 100% é o azul, OK.
                    // No desktop, as colunas definirão seus próprios fundos.
                }}
            >
                {/* COLUNA 1: HEADER/BRANDING (Lado BRANCO - Desktop Only) */}
                {!isMobile && (
                    <div
                        style={{
                            // Largura de 40% para a coluna branca no desktop
                            width: "60%",
                            height: "100%",
                            background: LEFT_COL_BG_COLOR, // Fundo branco imediato
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            textAlign: "center",
                            padding: "2rem",
                        }}
                    >
                        {/* A logo aqui deve ter a cor correta para fundo claro */}
                        <Header />
                    </div>
                )}

                {/* COLUNA 2: FORMULÁRIO DE LOGIN (Lado AZUL) */}
                <div
                    style={{
                        // Largura de 60% para a coluna azul no desktop
                        width: isMobile ? "100%" : "40%",
                        height: "100%", // Ocupa a altura total
                        background: MAIN_BG_COLOR, // Fundo azul imediato
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                    }}
                >
                    {/* Header no mobile (dentro da coluna azul) */}
                    {isMobile && <Header />}

                    {/* 2. FadeIn APENAS NO CONTEÚDO DO FORMULÁRIO */}
                    <FadeIn show={showFade} duration="0.6s" distance="40px">
                        <div style={formContainerStyle}>
                            <MainTitle isMobile={isMobile}>Login</MainTitle>

                            <LoginForm
                                email={email}
                                setEmail={setEmail}
                                senha={senha}
                                setSenha={setSenha}
                                isLoading={isLoading}
                                handleLogin={handleLogin}
                                isMobile={isMobile}
                            />

                            {erro && (
                                <p style={{ color: "#ff6b6b", textAlign: "center", marginTop: "1rem", fontWeight: "bold" }}>
                                    {erro}
                                </p>
                            )}

                            <Copyright />
                        </div>
                    </FadeIn>
                </div>
            </div>
        </div>
    );
}