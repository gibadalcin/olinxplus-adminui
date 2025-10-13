// Novo componente MarcaSelect.jsx
import React from "react";

export default function MarcaSelect({ marcas, marca, setMarca, loadingMarcas }) {
    return (
        <select
            value={marca}
            onChange={e => setMarca(e.target.value)}
            disabled={loadingMarcas || marcas.length === 0}
            style={{ width: "100%", padding: "8px", fontSize: "1rem", borderRadius: "6px" }}
        >
            <option value="" disabled>Selecione uma marca</option>
            {marcas.map(m => (
                <option key={m.id} value={m.nome}>
                    {m.nome}
                </option>
            ))}
        </select>
    );
}