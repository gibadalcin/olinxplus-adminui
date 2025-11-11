import React, { useEffect, useState, useMemo, useCallback } from "react";
import { auth } from "../firebaseConfig";
import { getImages, deleteImage, uploadLogo } from "../api";
import { useNavigate } from "react-router-dom";
import Header from "../components/globalContext/Header";
import Loader from "../components/globalContext/Loader";
import Copyright from "../components/globalContext/Copyright";
import MainTitle from "../components/globalContext/MainTitle";
import CustomButton from "../components/globalContext/CustomButton";
import FadeIn from "../components/globalContext/FadeIn";
import ImageUploadForm from "../components/imageContext/ImageUploadForm";
import ImageList from "../components/imageContext/ImageList";
import DeleteImageModal from "../components/imageContext/DeleteImageModal";

const MOBILE_BREAKPOINT = 768;
const MAIN_BG_COLOR = "#012E57";
const LEFT_COL_BG_COLOR = "#ffffff";

// Função utilitária para normalizar a resposta da API (simplificada)
const normalizeImagesResponse = (res) => {
  // Tenta extrair um array de imagens do objeto de resposta
  const data = res?.data || res;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  // Se o formato é estranho (ex: { key: [img1, img2] }), tenta encontrar o array
  if (data && typeof data === 'object') {
    const arr = Object.values(data).find(v => Array.isArray(v));
    return arr || [];
  }
  return [];
};


export default function ImageManager() {
  const [usuario, setUsuario] = useState(null);
  const [imagens, setImagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [nome, setNome] = useState("");
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [imgToDelete, setImgToDelete] = useState(null);
  const [showAllAdmins, setShowAllAdmins] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [imagensLoaded, setImagensLoaded] = useState(false);
  const navigate = useNavigate();

  const initialIsMobile = useMemo(() => window.innerWidth <= MOBILE_BREAKPOINT, []);
  const [isMobile, setIsMobile] = useState(initialIsMobile);

  const isAdmin = useMemo(() =>
    usuario?.email === import.meta.env.VITE_USER_ADMIN_EMAIL,
    [usuario]
  );

  // --- Efeitos de Componente ---

  // 1. Efeito de Redimensionamento (Responsividade)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2. Efeito de Autenticação (Observador)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUsuario(user);
      // Se o usuário não estiver logado, encerra o loading
      if (!user) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. Função Centralizada de Busca de Imagens (Otimização)
  const fetchImages = useCallback(async () => {
    if (!usuario) return;

    setLoading(true);
    try {
      const token = await usuario.getIdToken();
      const idToFetch = isAdmin && showAllAdmins ? null : usuario.uid; // null para todas as imagens (master)

      const res = await getImages(token, idToFetch);

      const imagensArray = Array.isArray(res) ? res : [];
      setImagens(imagensArray);
    } catch (error) {
      console.error("Erro ao buscar imagens:", error);
      setImagens([]);
    } finally {
      setLoading(false);
      setImagensLoaded(true);
    }
  }, [usuario, isAdmin, showAllAdmins]); // Dependências: usuário, status Master/Admin

  // 4. Efeito para Disparar a Busca de Imagens
  useEffect(() => {
    if (usuario) {
      fetchImages();
    }
  }, [usuario, fetchImages]);

  // 5. Efeito de FadeIn
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // --- Handlers de Ação ---

  const handleDelete = async (id) => {
    if (!usuario) return;
    setLoading(true); // Opcional: mostrar loading durante a exclusão

    try {
      const token = await usuario.getIdToken();
      await deleteImage(id, token);
      // Atualiza o estado localmente para feedback rápido
      setImagens(prevImagens => prevImagens.filter(img => img._id !== id));
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      alert("Erro ao deletar imagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !nome || !usuario) return;

    setUploading(true);
    const token = await usuario.getIdToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", nome);

    try {
      const result = await uploadLogo(formData, token);
      if (!result.success) {
        if (result.detail && result.detail.includes("imagem com esse nome")) {
          alert("Já existe uma imagem com esse nome!");
        } else {
          alert("Erro ao enviar imagem.");
        }
      } else {
        // ✅ OTIMIZAÇÃO: Adiciona imagem localmente ao invés de recarregar tudo
        const novaImagem = result.data || result.image || {
          _id: Date.now().toString(),
          nome,
          url: result.url,
          owner_uid: usuario.uid
        };

        // Evita cache do browser quando a imagem tem o mesmo nome/URL: adiciona cache-buster
        const appendCacheBuster = (u) => {
          if (!u) return u;
          const sep = u.includes("?") ? "&" : "?";
          return `${u}${sep}t=${Date.now()}`;
        };

        // Não adicionar cache-buster em signed URLs (assinatura seria invalidada)
        if (novaImagem.signed_url) {
          // use signed_url como está
          novaImagem.signed_url = novaImagem.signed_url;
        } else if (novaImagem.url) {
          // apenas para URLs públicas ou internas adicionamos cache-buster
          novaImagem.url = appendCacheBuster(novaImagem.url);
        }
        setImagens(prevImagens => [novaImagem, ...prevImagens]); // Adiciona no início

        // Limpa o formulário
        setNome("");
        setFile(null);
      }
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!imgToDelete) return;
    await handleDelete(imgToDelete);
    setModalOpen(false);
    setImgToDelete(null);
  };

  const handleNavigateToContent = (imgId, ownerUid) => {
    // Navega, garantindo que o ownerId seja o ID correto para o Master
    const ownerIdParam = isAdmin ? (ownerUid || usuario.uid) : usuario.uid;
    navigate(`/content?imageId=${imgId}&ownerId=${ownerIdParam}`);
  };


  // --- Renderização ---

  // Exibe o Loader enquanto carrega dados ou autentica
  const shouldShowLoader = loading || !usuario || !showContent;

  return (
    // Container principal da aplicação
    <div style={{ minHeight: "100vh", background: MAIN_BG_COLOR }}>

      {/* Loader Full Screen (melhorado para ser mais conciso) */}
      {shouldShowLoader && (
        <div style={{
          position: "fixed", // Usar fixed é mais seguro do que absolute com inset: 0
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          background: MAIN_BG_COLOR,
        }}>
          <Loader />
        </div>
      )}

      {/* Botões fixos do Admin/Master */}
      {isAdmin && (
        <div style={{
          position: "fixed",
          top: isMobile ? 16 : 32,
          right: isMobile ? 16 : 32,
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}>
          <CustomButton
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{ background: MAIN_BG_COLOR, color: "#fff", border: "1px solid #fff" }}
          >
            Dashboard
          </CustomButton>
          <CustomButton
            type="button"
            onClick={() => setShowAllAdmins(v => !v)}
            style={{
              background: showAllAdmins ? "#FFD700" : MAIN_BG_COLOR,
              color: showAllAdmins ? "#151515" : "#fff",
              border: "1px solid #fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
              transition: "background 0.2s, color 0.2s",
            }}
            disabled={loading}
          >
            {showAllAdmins ? "Modo Admin" : "Modo Master"}
          </CustomButton>
        </div>
      )}

      {/* Layout de Duas Colunas (Principal) */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          width: "100vw",
        }}
      >
        {/* COLUNA 1: HEADER/Branding (Branca - Desktop Only) */}
        {!isMobile && (
          <div
            style={{
              flex: isMobile ? "none" : 0.3,
              background: LEFT_COL_BG_COLOR,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: "2rem",
              boxSizing: "border-box",
            }}
          >
            <Header />
          </div>
        )}

        {/* COLUNA 2: Conteúdo Principal (Azul) */}
        <div
          style={{
            flexGrow: isMobile ? 0 : 1,
            flexShrink: isMobile ? 0 : 1,
            flexBasis: isMobile ? "auto" : 0,
            width: isMobile ? "100%" : "70%",
            background: MAIN_BG_COLOR,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: isMobile ? "1rem" : "0",
            boxSizing: "border-box",
            minHeight: "100vh",
            justifyContent: "center",
          }}
        >
          {/* Renderiza o Header apenas no mobile, nunca nos dois ao mesmo tempo */}
          {isMobile && (
            <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
              <Header />
            </div>
          )}

          <FadeIn show={showContent && imagensLoaded} duration="0.2s" distance="20px" style={{ width: "70vw" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: isMobile ? "1.2rem" : "2rem",
                width: "100%",
                maxWidth: "90%",
                margin: "0 auto",
              }}
            >
              <MainTitle isMobile={isMobile}>Gerenciamento de Imagens</MainTitle>

              <ImageUploadForm
                file={file}
                setFile={setFile}
                nome={nome}
                setNome={setNome}
                uploading={uploading}
                handleUpload={handleUpload}
                isMobile={isMobile}
                isWide={window.innerWidth < 1600}
                onDashboardClick={() => navigate("/dashboard")}
              />

              <DeleteImageModal
                open={modalOpen}
                imgToDelete={imgToDelete}
                imagens={imagens}
                onClose={() => { setModalOpen(false); setImgToDelete(null); }}
                onConfirm={confirmDelete}
              />

              {imagensLoaded && imagens.length > 0 && (
                <div
                  style={{
                    width: "100%",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                    background: "transparent",
                    scrollbarWidth: "none",
                    height: "auto",
                    maxHeight: "60vh",
                  }}
                >
                  <ImageList
                    imagens={imagens}
                    isMobile={isMobile}
                    usuario={usuario}
                    isAdmin={isAdmin}
                    onDelete={(id) => { setModalOpen(true); setImgToDelete(id); }}
                    onAssociate={handleNavigateToContent}
                  />
                </div>
              )}

              {imagensLoaded && imagens.length === 0 && (
                <p style={{ color: "#fff", marginTop: "2rem" }}>Nenhuma imagem encontrada.</p>
              )}

              <Copyright />
            </div>
          </FadeIn>
        </div>
      </div >
    </div>
  );
}