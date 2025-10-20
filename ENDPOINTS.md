# ENDPOINTS e contratos (Admin UI / Mobile)

Este documento resume os endpoints usados pelo Admin UI e pelo App mobile (reconhecimento de logos e fetch de conteúdo), exemplos de payloads e observações importantes (upload-before-save, `blob:` URLs e signed URLs).

Índice

- [Visão geral](#visão-geral)
- [Endpoints principais](#endpoints-principais)
  - `/search-logo/`
  - `/authenticated-search-logo/`
  - `/add-logo/`
  - `/add-content-image/`
  - `/api/conteudo`
  - `/consulta-conteudo/`
  - `/api/conteudo` (GET)
  - `/api/conteudo-signed-url` (GET)
  - `/images` (GET)
- [Contrato de blocos e `meta.ar`](#contrato-de-blocos-e-metaar)
- [Fluxos e recomendações](#fluxos-e-recomendações)
- [Exemplos práticos](#exemplos-práticos)

## Visão geral

- Backend: FastAPI. Algumas rotas exigem autenticação Firebase (token), outras são públicas (ex.: `/search-logo/`).
- Admin UI deve evitar `blob:` URLs ao enviar `POST /api/conteudo` — usar `POST /add-content-image/` para enviar arquivos e substituir referências locais por `filename`/`url` antes do envio.
- Backend gera signed URLs para assets (`gerar_signed_url_conteudo`) e as inclui nas respostas de `GET /api/conteudo` e `GET /api/conteudo-por-regiao` por meio de `attach_signed_urls_to_blocos`.

## Endpoints principais

### POST /search-logo/
- Descrição: endpoint público que recebe um arquivo (multipart/form-data) e retorna o melhor match no índice FAISS.
- Request:
  - Content-Type: multipart/form-data
  - Campo: `file` (UploadFile)
- Response (exemplo):
  - Found:
    {
      "found": true,
      "name": "Marca X",
      "confidence": 0.92,
      "distance": 0.08,
      "owner": "user_uid",
      "query_vector": [ ... ]
    }
  - Not found:
    { "found": false, "debug": "Nenhum match encontrado", "query_vector": [ ... ] }
- Observações: cliente mobile já usa este endpoint com timeout ~8s.

### POST /authenticated-search-logo/
- Igual a `/search-logo/` mas exige token Firebase (Authentication header: `Authorization: Bearer <id_token>`).

### POST /add-logo/
- Descrição: adiciona logo ao índice e ao bucket GCS (somente para usuários autenticados).
- Request (multipart/form-data):
  - file: UploadFile (image/png | image/jpeg)
  - name: string (Form)
  - Autorização: Header `Authorization: Bearer <id_token>` (Firebase)
- Response: `{ "success": true, "id": "<object_id>" }`

### POST /add-content-image/
- Descrição: endpoint usado pelo Admin UI para enviar imagens/videos/GLB vinculados a blocos de conteúdo. Retorna dados necessários (filename, url) para referenciar no `bloco` antes do `POST /api/conteudo`.
- Request: multipart/form-data
  - file: UploadFile (image/* ou video/*) — content-type validado
  - name: Form (string) — nome do arquivo
  - temp_id: Form (string, opcional) — id temporário do bloco no client
  - tipo_bloco: Form (string) — ex.: "imagem" (default)
  - subtipo, marca, tipo_regiao, nome_regiao — opcionais
  - Autorização: Header `Authorization: Bearer <id_token>` (Firebase)
- Response (exemplo):
  {
    "success": true,
    "filename": "<owner_uid>/<nome_upload.jpg>",
    "url": "gs://olinxra-conteudo/<owner_uid>/<nome_upload.jpg>",
    "signed_url": "https://storage.googleapis.com/...."  // pode ser retornado ou o admin deve chamar /api/conteudo-signed-url
  }
- Observações:
  - Sempre usar este endpoint para enviar `blob:` local files antes de chamar `POST /api/conteudo`.
  - Substituir campos locais (`url: 'blob:...'`) por `filename` ou `url`/signed_url no bloco.

### POST /api/conteudo
- Descrição: cria/atualiza conteúdo (blocos) para uma marca/região. Regras importantes:
  - Rejeita payloads com referências `blob:` (422). Faça upload dos assets primeiro.
  - Valida botões (`botao_destaque`, `botao_default`) e hidrata campos de `meta` para a validação quando necessário.
  - Remove `analytics` vazios (se não tiver `event_name`).
  - Se `blocos` estiver vazio e existir documento, apaga o documento.
- Request (JSON body):
  - nome_marca: string (required)
  - blocos: array of bloco objects
  - latitude, longitude, tipo_regiao, nome_regiao (opc)
  - Query param: `dry_run=true` para checar sem persistir (retorna arquivos a deletar etc.)
- Response (exemplo): `{ "action": "saved" }` ou `{ "action": "deleted" }` ou `422` com detalhes

### POST /consulta-conteudo/
- Descrição: client-friendly helper. Recebe `nome_marca`, `latitude` e `longitude` no body e retorna `conteudo` simplificado com `texto`, `imagens`, `videos` e `localizacao` string preparada.
- Request (JSON body): { "nome_marca": "Marca X", "latitude": -23.5, "longitude": -46.6 }
- Response (exemplo):
  {
    "conteudo": { "texto": "...", "imagens": ["gs://.."], "videos": [] },
    "mensagem": "Conteúdo encontrado.",
    "localizacao": "Rua X, Bairro Y, Cidade Z"
  }

### GET /api/conteudo (query)
- Descrição: busca blocos por `nome_marca`, `latitude`, `longitude` (query params).
- Response: retorna `conteudo` com `blocos` e o backend anexa `signed_url` para media blocos via `attach_signed_urls_to_blocos`.

### GET /api/conteudo-signed-url
- Descrição: gera signed_url para um `gs://` ou `filename`.
- Query params: `gs_url` (required), `filename` (optional)
- Response: `{ "signed_url": "https://..." }

### GET /images
- Lista imagens adicionadas via `/add-logo/` (ou `/add-content-image/` gravadas em logos collection). Pode filtrar por `ownerId`.

## Contrato de blocos e `meta.ar`
- Veja `AR_SCHEMA.md` para o schema de `bloco.meta.ar` (recommended fields: `enabled`, `anchor`, `assets`, `transform`, `interactions`, `visibility`, `fallback`, `meta_admin`).
- Regras importantes:
  - Não envie `blob:` URLs em `POST /api/conteudo`.
  - Assets devem ser enviados com `/add-content-image/` e referenciados por `filename` ou `url`/signed_url.
  - Backend tentará hidratar button blocks de `meta` se necessário para validar.

## Fluxos e recomendações

1. Admin uploader flow (recommended):
   - No Admin UI, ao criar/editar um bloco com imagem/video/GLB, o client gera um temp_id e armazena o File em `bloco.meta.pendingFile`.
   - Ao salvar ou fazer dry-run, o client primeiro chama `/add-content-image/` para cada pendingFile, recebe `filename`/`url` e atualiza o bloco (`meta` e/ou top-level fields) substituindo `blob:`.
   - Em seguida, o client envia `POST /api/conteudo` com blocos normalizados.

2. Mobile recognition → mostrar conteúdo:
   - App captura foto e chama `POST /search-logo/` (ou `/authenticated-search-logo/` quando autenticado).
   - Se `found: true`, app chama `/consulta-conteudo/` ou `GET /api/conteudo?nome_marca=...&latitude=...&longitude=...`.
   - Filtrar blocos com `meta.ar.enabled === true`, aplicar `visibility` (min_confidence, max_distance_m) e apresentar usando AR nativo ou overlay.

## Exemplos práticos

1) Upload de imagem no Admin (PowerShell curl-like):

```powershell
# powerShell example using curl (Windows)
$token = '<id_token>'
curl -X POST "https://api.example.com/add-content-image/" \
  -H "Authorization: Bearer $token" \
  -F "file=@C:\\path\\to\\image.jpg;type=image/jpeg" \
  -F "name=image.jpg" \
  -F "temp_id=tmp-1234" \
  -F "tipo_bloco=imagem"
```

Resposta esperada:

```json
{
  "success": true,
  "filename": "useruid/image.jpg",
  "url": "gs://olinxra-conteudo/useruid/image.jpg",
  "signed_url": "https://storage.googleapis.com/..."
}
```

2) Enviar conteúdo (após upload das imagens):

POST /api/conteudo?dry_run=false

Request body (JSON simplified):

```json
{
  "nome_marca": "Marca X",
  "latitude": -23.55,
  "longitude": -46.63,
  "blocos": [
    {
      "tipo": "imagem",
      "filename": "useruid/image.jpg",
      "meta": {
        "ar": {
          "enabled": true,
          "anchor": "image",
          "assets": [{ "type": "image", "url": "https://storage.googleapis.com/.../image.jpg" }]
        }
      }
    }
  ]
}
```

Resposta:

```json
{ "action": "saved" }
```

## Nota sobre `blob:` URLs
- Se o admin enviar `blob:` (ex.: `url: 'blob:...'`) o backend retornará 422 com detalhe indicando índices inválidos. Isso é intencional para forçar upload dos arquivos. O fluxo do editor deve garantir upload antes do save.

## Observações finais
- Se quiser, eu posso:
  - Gerar exemplos de payload para validação de botões (`/api/validate-button-block`).
  - Atualizar `AR_SCHEMA.md` para incluir exemplos adicionais (GLB, vídeo com autoplay) ou um mini-editor pro admin.
  - Implementar o hook `useARContent` no app (esqueleto inicial).

---
Gerado: 2025-10-20
