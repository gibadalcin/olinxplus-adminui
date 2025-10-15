import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { TextField, Button } from "@mui/material";

export default function LocationPicker({ latitude, longitude, setLatitude, setLongitude, tipoRegiao, setTipoRegiao, nomeRegiao, setNomeRegiao }) {
    const [width, setWidth] = useState(768);
    // Se vier do parent, usa o estado do parent, senão local
    const isControlled = typeof nomeRegiao !== "undefined" && typeof setNomeRegiao === "function";
    const [address, setAddressState] = useState("");
    const setAddress = isControlled ? setNomeRegiao : setAddressState;
    const addressValue = isControlled ? nomeRegiao : address;
    const [tipoRegiaoState, setTipoRegiaoState] = typeof tipoRegiao !== "undefined" && typeof setTipoRegiao === "function" ? [tipoRegiao, setTipoRegiao] : useState("");
    const tipoRegiaoSelectRef = useRef(null);
    const [tipoRegiaoWarning, setTipoRegiaoWarning] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= width);
    const addressInputRef = useRef(null);

    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth <= width);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);


    async function buscarNomeRegiao(lat, lon, tipoRegiao) {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reverse-geocode?lat=${lat}&lon=${lon}`);
        const data = await res.json();
        const address = data || {};
        let nome = "";
        if (tipoRegiao === "rua") nome = address.road || "";
        else if (tipoRegiao === "bairro") nome = address.suburb || address.neighbourhood || "";
        else if (tipoRegiao === "cidade") nome = address.city || address.town || address.village || "";
        else if (tipoRegiao === "estado") nome = address.state || "";
        else if (tipoRegiao === "pais") nome = address.country || "";
        return nome;
    }

    function LocationMarker() {
        useMapEvents({
            click: async (e) => {
                if (!tipoRegiaoState) {
                    setTipoRegiaoWarning(true);
                    if (tipoRegiaoSelectRef.current) tipoRegiaoSelectRef.current.focus();
                    return;
                }
                setTipoRegiaoWarning(false);
                setLatitude(e.latlng.lat);
                setLongitude(e.latlng.lng);
                const nome = await buscarNomeRegiao(e.latlng.lat, e.latlng.lng, tipoRegiaoState);
                setAddress(nome);
            }
        });
        return latitude && longitude ? (
            <Marker position={[parseFloat(latitude), parseFloat(longitude)]} />
        ) : null;
    }

    // Busca de endereço via Nominatim (OpenStreetMap)
    async function handleSearch() {
        if (!address) return;
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );
        const data = await res.json();
        if (data[0]) {
            setLatitude(data[0].lat);
            setLongitude(data[0].lon);
        }
    }

    return (
        <div style={{ width: "100%" }}>
            <div style={{
                display: "flex",
                width: "100%",
                gap: ".6rem",
                marginBottom: "0.5rem",
                flexDirection: isMobile ? "column" : "row"
            }}>
                <select
                    ref={tipoRegiaoSelectRef}
                    value={tipoRegiaoState}
                    onChange={e => {
                        setTipoRegiaoState(e.target.value);
                        setTipoRegiaoWarning(false);
                        setTimeout(() => {
                            if (addressInputRef.current) addressInputRef.current.focus();
                        }, 0);
                    }}
                    style={{
                        background: tipoRegiaoWarning ? '#fffbe6' : '#ffffff',
                        color: '#000',
                        border: tipoRegiaoWarning ? '2px solid #ff9800' : undefined,
                        padding: '8px 16px',
                        borderRadius: "4px",
                        height: isMobile ? "42px" : "56px",
                    }}
                >
                    <option value="">Tipo de região</option>
                    <option value="rua">Rua</option>
                    <option value="bairro">Bairro</option>
                    <option value="cidade">Cidade</option>
                    <option value="estado">Estado</option>
                    <option value="pais">País</option>
                </select>
                {tipoRegiaoWarning && (
                    <span style={{ color: '#ff9800', fontSize: '0.95rem', marginLeft: 4 }}>
                        Selecione o tipo de região antes de clicar no mapa
                    </span>
                )}
                <TextField
                    label="Nome da região"
                    variant="outlined"
                    value={addressValue}
                    onChange={e => setAddress(e.target.value)}
                    name="address"
                    fullWidth
                    inputRef={addressInputRef}
                    sx={{
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff !important' },
                        '& .MuiInputLabel-root': { color: '#fff' },
                        '& .MuiInputBase-input': { color: '#fff' },
                    }}
                    slotProps={{ style: { color: "#fff" } }}
                />

                <Button
                    type="button"
                    onClick={() => {
                        setLatitude("");
                        setLongitude("");
                        setAddress("");
                        setTipoRegiaoState("");
                        const addressInput = document.querySelector('input[name="address"]');
                        if (addressInput) addressInput.value = "";
                    }}
                    style={{
                        background: '#f44336',
                        color: '#fff',
                        height: "56px",
                        padding: '8px 16px',
                    }}
                >
                    Limpar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSearch}
                    sx={{
                        color: "#fff",
                        borderColor: "#fff",
                        height: "56px"
                    }}
                >
                    Buscar
                </Button>
            </div>
            <div style={{ height: "350px", width: "100%", marginBottom: "0.5rem" }}>
                <MapContainer
                    center={[latitude || -29.168291, longitude || -51.179366]}
                    zoom={latitude && longitude ? 15 : 4}
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker />
                </MapContainer>
            </div>
            <div style={{ display: "flex", width: "100%", gap: "1rem" }}>
                <TextField
                    label="Latitude"
                    variant="outlined"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff !important' },
                        '& .MuiInputLabel-root': { color: '#fff' },
                        '& .MuiInputBase-input': { color: '#fff' },
                    }}
                    slotProps={{ style: { color: "#fff" } }}
                />
                <TextField
                    label="Longitude"
                    variant="outlined"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff !important' },
                        '& .MuiInputLabel-root': { color: '#fff' },
                        '& .MuiInputBase-input': { color: '#fff' },
                    }}
                    slotProps={{ style: { color: "#fff" } }}
                />
            </div>
            {/* Para integração, exporte tipoRegiao e address como tipo_regiao e nome_regiao */}
        </div>
    );
}