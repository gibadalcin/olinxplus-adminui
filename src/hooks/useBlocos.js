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

  function handleAddBloco() {
    if (!tipoSelecionado || !conteudoBloco.trim() || blocos.length >= limite) return;
    const label = getNextLabel(tipoSelecionado);
    const novoBloco = { tipo: label, conteudo: conteudoBloco, tipoSelecionado };
    setBlocos([...blocos, novoBloco]);
    setConteudoBloco("");
    setTipoSelecionado("");
  }

  function handleRemoveBloco(idx) {
    setBlocos(blocos.filter((_, i) => i !== idx));
  }

  function handleEditBloco(idx, novoConteudo) {
    const bloco = blocos[idx];
    const novosBlocos = [...blocos];
    novosBlocos[idx] = { ...bloco, conteudo: novoConteudo };
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
