# Esquema AR para blocos de conteúdo (bloco.meta.ar)

Esta documentação descreve o schema recomendado para adicionar metadados de Realidade Aumentada em blocos de conteúdo no admin UI. Esses campos permitem que o app mobile (Expo/React Native) e, futuramente, o presenter AR nativo (ARKit/ARCore) entendam como apresentar assets (imagens, vídeos, modelos 3D) sobre o mundo real quando uma marca for reconhecida.

Local de armazenamento

- Colocar os metadados de AR dentro de `bloco.meta.ar` em cada bloco que deve ser apresentado em AR.
- O backend preserva `meta` para edição local; antes do `POST /api/conteudo`, o admin UI deve serializar/normalizar (server espera `blocos` normalizados). Os campos `meta.ar` não são obrigatórios para salvar conteúdo, mas são usados pelo mobile para apresentação AR.

Princípios

- Keep it simple: comece com um overlay 2D (imagens e vídeos) e um campo opcional para modelo 3D (`glb`) quando suportado.
- Assets usados em AR devem ser carregados anteriormente usando o endpoint `POST /add-content-image/` (ou um endpoint equivalente) para evitar `blob:` URLs que o backend rejeita.
- Use signed URLs gerados pelo backend (`/api/conteudo` e helpers) para acesso seguro aos assets.
- Para compatibilidade com evolução, todos os campos em `meta.ar` são opcionais; o app decide o que renderizar conforme disponível.

Schema recomendado (JSON)

- Tipo: objeto (opcional)
- Caminho: `bloco.meta.ar`

Campos:

- enabled: boolean
  - Se `false` ou ausente, o bloco não é considerado para apresentação AR.
  - Ex.: true

- anchor: string
  - Tipo de ancoragem desejada.
  - Valores permitidos (sugestões):
    - `image` — ancorar ao logo/imagem reconhecida.
    - `world` — posicionamento absoluto (coordenadas relativas ao ponto detectado).
    - `screen` — overlay fixo na tela (fallback para Expo sem AR nativo).
  - Ex.: "image"

- prefer_overlay: boolean
  - Indica preferência por overlay 2D mesmo quando AR nativo estiver disponível (bom para performance ou prototipagem).

- assets: array de asset objects
  - Lista ordenada de assets a apresentar para este bloco (o presenter decide qual usar por disponibilidade).
  - Cada asset object pode conter:
    - type: string ("image" | "video" | "model")
    - url: string (signed URL ou `gs://...` — prefer signed URL para consumo imediato)
    - filename: string (opcional)
    - mime_type: string (opcional)
    - thumbnail_url: string (opcional) — para carregamento leve
    - preload: boolean (opcional) — se o app deve tentar pré-buscar
  - Exemplo:
    [
      { "type": "image", "url": "https://.../img1.jpg", "preload": true },
      { "type": "model", "url": "https://.../scene.glb", "preload": false }
    ]

- transform: object (opcional)
  - Posição e escala relativas ao anchor. Unidades: metros (quando aplicável) ou frações/pixels para screen overlay.
  - Fields:
    - position: { x: number, y: number, z: number } (opcional)
    - rotation: { x: number, y: number, z: number } (opcional, graus)
    - scale: { x: number, y: number, z: number } (opcional)
  - Ex.: { "position": {"x":0, "y":0, "z":0}, "scale": {"x":1, "y":1, "z":1} }

- interactions: array of interaction objects (opcional)
  - Descreve interações disponíveis no asset AR (tap, longpress, drag, open_url, play_video).
  - Cada interação:
    - type: string ("tap" | "open_url" | "play_video" | "custom")
    - payload: object (depende do tipo) — ex.: { "url": "https://..." }
    - analytics: { event_name: string, properties?: object } (opcional)
  - Ex.: { "type": "open_url", "payload": { "url": "https://promo.example.com" }, "analytics": { "event_name": "ra_open_promo" } }

- visibility: object (opcional)
  - Controla quando o bloco deve ser mostrado (confiança mínima do reconhecimento, distância máxima em metros, horário etc.)
  - Fields sugeridos:
    - min_confidence: number (0..1)
    - max_distance_m: number (metros)
    - active_from: ISO datetime (opcional)
    - active_until: ISO datetime (opcional)
  - Ex.: { "min_confidence": 0.75, "max_distance_m": 50 }

- fallback: object (opcional)
  - Instruções para o caso de AR nativo não disponível — ex.: use overlay com `image` ou mostrar modal com conteúdo.
  - Ex.: { "type": "overlay", "asset_index": 0 }

- meta_admin: object (opcional)
  - Campos informativos somente para o admin (não usados pelo presenter) — ex.: { "notes": "Usar GLB otimizado 50KB", "author": "admin@..." }

Exemplo completo de `bloco.meta.ar`

{
  "enabled": true,
  "anchor": "image",
  "prefer_overlay": false,
  "assets": [
    { "type": "image", "url": "https://cdn.example.com/signed/img1.jpg", "preload": true },
    { "type": "model", "url": "https://cdn.example.com/signed/scene.glb", "preload": false }
  ],
  "transform": {
    "position": { "x": 0, "y": 0, "z": 0 },
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "scale": { "x": 1, "y": 1, "z": 1 }
  },
  "interactions": [
    { "type": "tap", "payload": { "action": "open_url", "url": "https://promo.example.com" }, "analytics": { "event_name": "ra_tap_promo", "properties": { "promo": "verao" } } }
  ],
  "visibility": { "min_confidence": 0.6, "max_distance_m": 30 },
  "fallback": { "type": "overlay", "asset_index": 0 },
  "meta_admin": { "notes": "GLB otimizado para mobile" }
}

Recomendações para o Admin UI

- Fornecer um editor simples para `meta.ar` quando o usuário desejar adicionar experiências AR:
  - Checkbox "Ativar AR" (enabled)
  - Campo de upload para assets (imagem, vídeo, GLB). Ao subir, usar `POST /add-content-image/` para obter `filename`/url e armazenar no `assets[].url` com signed URL ou `gs://` path.
  - Transform simples: sliders para scale e campos numéricos para position.z (distância da imagem).
  - Interações: permitir adicionar 1-2 interações simples (abrir URL, tocar para reproduzir vídeo).

Recomendações para o Mobile App

- Fluxo básico:
  1. Após reconhecimento de marca (endpoint `/search-logo/`), chamar `/consulta-conteudo/` ou `/api/conteudo` com `nome_marca` + latitude/longitude para obter blocos.
  2. Filtrar blocos com `meta.ar.enabled === true` e aplicar `visibility` (min_confidence, distância).
  3. Prefetch de `assets[].url` com `preload: true` (Image.prefetch, FileSystem.downloadAsync).
  4. Se `anchor === 'image'` e AR nativo disponível: tentar criar image anchor e renderizar asset (modelo 3D ou imagem) com transform.
  5. Se AR nativo indisponível ou `prefer_overlay: true`: renderizar overlay 2D na tela (imagem ou botão) com interações.

- Timeouts e performance:
  - Não bloquear a UI: carregar assets em background com progresso.
  - Se o backend retornar uma `min_confidence` alta, priorizar a pré-busca.
  - Ajustar `compareLogo` timeout (cliente atualmente 8s). Se reconhecimento for lento, notificar o usuário com um spinner e opção de tentar novamente.

Schema de versionamento

- Adicione um campo opcional `ar_schema_version` em `bloco.meta` para permitir evolução.
- Ex.: `bloco.meta.ar_schema_version = "1.0"`

Notas de segurança e privacidade

- Evitar armazenar URLs públicas sem expiração; usar signed URLs sempre que possível.
- Ao enviar analytics, garantir que dados pessoais não vazem (minimizar PII em analytics.properties).

Compatibilidade com backend

- `meta` é preservado pelo backend; porém o backend rejeita `blob:` URLs em `POST /api/conteudo`. Sempre fazer upload dos assets e substituir `blob:` por `filename`/`url` antes do envio final.
- Se usar `gs://` paths, o backend generará `signed_url` via `gerar_signed_url_conteudo` para consumo do mobile.

Next steps sugeridos

- Gerar `ENDPOINTS.md` contendo exemplos de requests/responses para `/consulta-conteudo/`, `/api/conteudo`, `/add-content-image/` e `/search-logo/`.
- Implementar editores no admin UI para facilitar a criação de objetos `meta.ar` (upload, preview, transform sliders).
- Implementar `useARContent` no app para agrupar fetch, prefetch e estado de assets.

Changelog

- Versão 1.0 — 2025-10-20: Esquema inicial com campos `enabled`, `anchor`, `assets`, `transform`, `interactions`, `visibility`, `fallback`, `meta_admin` e recomendações de uso.


