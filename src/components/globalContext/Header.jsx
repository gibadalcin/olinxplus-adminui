import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const MOBILE_BREAKPOINT = 768;
const LOGO_SRC_DARK = "/adm-logo-dark.png";
const LOGO_SRC_LIGHT = "/adm-logo-light.png";
const LOGO_ALT = "Olinxra Logo";

export default function Header() {
    const location = useLocation();

    const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);

    useEffect(() => {
        const handleResize = () => {
            const newIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
            if (newIsMobile !== isMobile) {
                setIsMobile(newIsMobile);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isMobile]);

    const headerStyle = useMemo(() => ({
        width: isMobile ? "100%" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }), [isMobile]);

    const logoStyle = useMemo(() => ({
        height: isMobile ? "224px" : "260px",
        width: "100%",
        objectFit: "contain",
        transition: 'height 0.3s ease-in-out',
    }), [isMobile]);

    const logoSrc = location.pathname.startsWith("/content")
        ? LOGO_SRC_LIGHT
        : (isMobile ? LOGO_SRC_LIGHT : LOGO_SRC_DARK);

    return (
        <header style={headerStyle}>
            <img
                src={logoSrc}
                alt={LOGO_ALT}
                style={logoStyle}
            />
        </header>
    );
}