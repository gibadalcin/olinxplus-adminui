
import { useState } from "react";

export function useBlocos(limite = 10) {
  const [blocos, setBlocos] = useState([]);
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const [conteudoBloco, setConteudoBloco] = useState("");

  function getNextLabel(type) {
    const count = blocos.filter(b => b.tipoSelecionado === type).length + 1;
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

  function handleAddBloco(tipo, conteudo, subtipo, meta) {
    if (!tipo || !conteudo || !String(conteudo).trim() || blocos.length >= limite) return;
    const label = getNextLabel(tipo);
    let novoBloco;
    if (tipo === "imagem") {
      // se 'meta' for um bloco completo vindo do backend, use-o como autoridade
      const isFullBloco = meta && (meta.filename || meta.url || meta.nome || meta.tipo);
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
        novoBloco = blocoFromServer;
      } else {
      // usa metadados do upload quando disponíveis, senão extrai da URL
      const nome = (meta && meta.nome) || (conteudo.startsWith("gs://") ? conteudo.split("/").pop() : "");
      const filename = (meta && meta.filename) || (conteudo.startsWith("gs://") ? conteudo.split('/').slice(3).join('/') : "");
      const type = (meta && meta.type) || "image/png";
      const created_at = (meta && meta.created_at) || new Date().toISOString();
      novoBloco = {
        tipo: label,
        conteudo,
        tipoSelecionado: tipo,
        subtipo: subtipo ?? "",
        url: conteudo,
        nome,
        filename,
        type,
        created_at
      };
      }
    } else {
      novoBloco = { tipo: label, conteudo, tipoSelecionado: tipo };
    }
    setBlocos([...blocos, novoBloco]);
    setConteudoBloco("");
    setTipoSelecionado("");
  }

  function handleRemoveBloco(idx) {
    setBlocos(blocos.filter((_, i) => i !== idx));
  }

  function handleEditBloco(idx, tipo, conteudo, subtipo, meta) {
    const bloco = blocos[idx];
    const novosBlocos = [...blocos];
    if (tipo === "imagem") {
      const isFullBloco = meta && (meta.filename || meta.url || meta.nome || meta.tipo);
      if (isFullBloco) {
        novosBlocos[idx] = {
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
      } else {
      const nome = (meta && meta.nome) || bloco.nome || (conteudo.startsWith("gs://") ? conteudo.split("/").pop() : "");
      const filename = (meta && meta.filename) || bloco.filename || (conteudo.startsWith("gs://") ? conteudo.split('/').slice(3).join('/') : "");
      const type = (meta && meta.type) || bloco.type || "image/png";
      const created_at = (meta && meta.created_at) || bloco.created_at || new Date().toISOString();
      novosBlocos[idx] = {
        ...bloco,
        tipoSelecionado: tipo,
        conteudo,
        subtipo: subtipo ?? "",
        url: conteudo,
        nome,
        filename,
        type,
        created_at
      };
      }
    } else {
      novosBlocos[idx] = { ...bloco, tipoSelecionado: tipo, conteudo };
    }
    setBlocos(novosBlocos);
  }

  function resetBlocos() {
    setBlocos([]);
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
