export default function BlockTypeSelect({ value, onChange, disabled, isMobile }) {
    return (
        <select
            name="blockType"
            id="block-type-select"
            value={value}
            onChange={onChange}
            disabled={disabled}
            style={{
                width: "240px",
                padding: "8px",
                fontSize: "1rem",
                borderRadius: "6px"
            }}
        >
            <option value="" disabled>Selecione o tipo de bloco</option>
            <option value="titulo">Título</option>
            <option value="subtitulo">Subtítulo</option>
            <option value="texto">Texto</option>
            <option value="imagem">Imagem</option>
            <option value="video">Vídeo</option>
            <option value="carousel">Carousel (imagem/vídeo)</option>
            <option value="botao-destaque">Botão destaque</option>
            <option value="botao">Botão</option>
        </select>
    );
}