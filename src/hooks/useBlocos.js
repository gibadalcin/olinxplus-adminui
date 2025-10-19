import { useState } from "react";
import { revokeObjectUrlsFromBloco } from '../utils/fileUtils';

// Hook to manage 'blocos' (content blocks). This implementation keeps any
// pending File objects on item.meta.pendingFile (or bloco.meta.pendingFile)
// but never sets a boolean bloco.pendingFile flag. Callers should treat
// pending uploads as file-like objects stored under meta.pendingFile.
export function useBlocos(limite = 10) {
  const [blocos, setBlocos] = useState([]);
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const [conteudoBloco, setConteudoBloco] = useState("");

  function getNextLabel(type) {
    const count = blocos.filter((b) => b.tipoSelecionado === type).length + 1;
    switch (type) {
      case "subtitulo":
        return `Subtítulo ${count}`;
      case "carousel":
        return `Carousel ${count}`;
      case "imagem":
        return `Imagem topo ${count}`;
      case "video":
        return `Vídeo ${count}`;
      case "titulo":
        return `Título ${count}`;
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }

  function handleAddBloco(tipo, conteudo, subtipo, meta = {}) {
    if (!tipo || blocos.length >= limite) return;

    // Basic validation per type.
    if (tipo === "imagem") {
      const hasImageSource = (conteudo && String(conteudo).trim()) || (meta && meta.pendingFile) || (meta && meta.url);
      if (!hasImageSource) return;
    } else if (tipo === "carousel") {
      const items = meta && meta.items;
      if (!items || !Array.isArray(items) || !items.some((it) => (it && ((it.meta && it.meta.pendingFile) || (it.url && String(it.url).trim() !== ""))))) return;
    } else {
      if (!conteudo || !String(conteudo).trim()) return;
    }

    const label = getNextLabel(tipo);
    let novoBloco = null;

    if (tipo === "imagem") {
      const isFullBloco = meta && (meta.filename || meta.url || meta.nome || meta.type || meta.content_type);
      if (isFullBloco) {
        const blocoFromServer = {
          tipo: label,
          conteudo: meta.url || meta.conteudo || conteudo,
          tipoSelecionado: tipo,
          subtipo: meta.subtipo ?? subtipo ?? "",
          url: meta.url || conteudo,
          nome: meta.nome || "",
          filename: meta.filename || "",
          type: meta.type || meta.content_type || "",
          created_at: meta.created_at || meta.createdAt || new Date().toISOString(),
        };

        if (meta && meta.pendingFile) blocoFromServer.meta = { ...(blocoFromServer.meta || {}), ...(meta || {}), pendingFile: meta.pendingFile };
        else if (meta) blocoFromServer.meta = { ...(blocoFromServer.meta || {}), ...(meta || {}) };

        if (meta && meta.temp_id) blocoFromServer.temp_id = meta.temp_id;
        novoBloco = blocoFromServer;
      } else {
        const nome = (meta && meta.nome) || (conteudo && conteudo.startsWith("gs://") ? conteudo.split("/").pop() : "");
        const filename = (meta && meta.filename) || (conteudo && conteudo.startsWith("gs://") ? conteudo.split("/").slice(3).join("/") : "");
        const type = (meta && meta.type) || "image/png";
        const created_at = (meta && meta.created_at) || new Date().toISOString();

        novoBloco = {
          tipo: label,
          conteudo,
          tipoSelecionado: tipo,
          subtipo: subtipo ?? "",
          url: (meta && meta.url) || conteudo,
          nome,
          filename,
          type,
          created_at,
          meta: meta && Object.keys(meta).length ? { ...(meta || {}) } : undefined,
        };

        if (meta && meta.pendingFile) novoBloco.meta = { ...(novoBloco.meta || {}), pendingFile: meta.pendingFile };
        if (meta && meta.temp_id) novoBloco.temp_id = meta.temp_id;
      }
    } else if (tipo === "carousel") {
      const items = meta && meta.items ? meta.items : [];
      novoBloco = {
        tipo: label,
        conteudo: null,
        tipoSelecionado: tipo,
        subtipo: "",
        items: items.map((it) => ({
          url: it.url || "",
          subtipo: it.subtipo || "",
          meta: it.meta && Object.keys(it.meta).length ? { ...(it.meta || {}) } : undefined,
          nome: (it.meta && it.meta.nome) || (it.url && String(it.url).split("/").pop()) || "",
          filename: (it.meta && it.meta.filename) || (it.url && String(it.url).split("/").slice(3).join("/")) || "",
          temp_id: it.meta && it.meta.temp_id ? it.meta.temp_id : undefined,
        })),
        created_at: new Date().toISOString(),
      };
    } else {
      novoBloco = { tipo: label, conteudo, tipoSelecionado: tipo };
    }

    setBlocos((prev) => [...prev, novoBloco]);
    setConteudoBloco("");
    setTipoSelecionado("");
    return novoBloco;
  }

  function handleRemoveBloco(idx) {
    setBlocos((prev) => {
      const target = prev[idx];
      try { revokeObjectUrlsFromBloco(target); } catch (e) { }
      return prev.filter((_, i) => i !== idx);
    });
  }

  function handleEditBloco(idx, tipo, conteudo, subtipo, meta = {}) {
    setBlocos((prev) => {
      const bloco = prev[idx] || {};
      const novos = [...prev];

      if (tipo === "imagem") {
        const isFullBloco = meta && (meta.filename || meta.url || meta.nome || meta.type || meta.content_type);
        if (isFullBloco) {
          const updated = {
            ...bloco,
            tipo: bloco.tipo || getNextLabel(tipo),
            tipoSelecionado: tipo,
            conteudo: meta.url || meta.conteudo || conteudo,
            subtipo: meta.subtipo ?? subtipo ?? bloco.subtipo ?? "",
            url: meta.url || conteudo,
            nome: meta.nome || bloco.nome || "",
            filename: meta.filename || bloco.filename || "",
            type: meta.type || meta.content_type || bloco.type || "",
            created_at: meta.created_at || meta.createdAt || bloco.created_at || new Date().toISOString(),
          };

          if (meta && meta.pendingFile) updated.meta = { ...(updated.meta || {}), ...(meta || {}), pendingFile: meta.pendingFile };
          else if (meta && Object.keys(meta).length) updated.meta = { ...(updated.meta || {}), ...(meta || {}) };

          if (meta && meta.temp_id) updated.temp_id = meta.temp_id;
          novos[idx] = updated;
        } else {
          const nome = (meta && meta.nome) || bloco.nome || (conteudo && conteudo.startsWith("gs://") ? conteudo.split("/").pop() : "");
          const filename = (meta && meta.filename) || bloco.filename || (conteudo && conteudo.startsWith("gs://") ? conteudo.split("/").slice(3).join("/") : "");
          const type = (meta && meta.type) || bloco.type || "image/png";
          const created_at = (meta && meta.created_at) || bloco.created_at || new Date().toISOString();

          const updated = {
            ...bloco,
            tipoSelecionado: tipo,
            conteudo,
            subtipo: subtipo ?? "",
            url: (meta && meta.url) || conteudo,
            nome,
            filename,
            type,
            created_at,
          };

          if (meta && meta.pendingFile) updated.meta = { ...(updated.meta || {}), ...(meta || {}), pendingFile: meta.pendingFile };
          else if (meta && Object.keys(meta).length) updated.meta = { ...(updated.meta || {}), ...(meta || {}) };

          novos[idx] = updated;
        }
      } else if (tipo === "carousel") {
        const items = meta && meta.items ? meta.items : (bloco.items || []);
        novos[idx] = {
          ...bloco,
          tipoSelecionado: tipo,
          conteudo: null,
          items: items.map((it) => ({
            url: it.url || "",
            subtipo: it.subtipo || "",
            meta: it.meta && Object.keys(it.meta).length ? { ...(it.meta || {}) } : undefined,
            nome: (it.meta && it.meta.nome) || (it.url && String(it.url).split("/").pop()) || "",
            filename: (it.meta && it.meta.filename) || (it.url && String(it.url).split("/").slice(3).join("/")) || "",
          })),
        };
      } else {
        novos[idx] = { ...bloco, tipoSelecionado: tipo, conteudo };
      }

      return novos;
    });
  }

  function resetBlocos() {
    // revoke any object URLs before clearing
    setBlocos((prev) => {
      try { prev.forEach(b => revokeObjectUrlsFromBloco(b)); } catch (e) { }
      return [];
    });
    setTipoSelecionado("");
    setConteudoBloco("");
  }

  return {
    blocos,
    setBlocos,
    tipoSelecionado,
    setTipoSelecionado,
    conteudoBloco,
    setConteudoBloco,
    handleAddBloco,
    handleRemoveBloco,
    handleEditBloco,
    resetBlocos,
    getNextLabel,
  };
}
