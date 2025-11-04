# Upload de Modelo GLB Customizado - Frontend

## Visão Geral

O AdminUI agora permite que os usuários façam upload opcional de modelos 3D GLB customizados para cada imagem de conteúdo. Se nenhum GLB for fornecido, o sistema continua gerando automaticamente o modelo 3D a partir da imagem.

## Funcionalidades Implementadas

### 1. Upload de GLB em Blocos Individuais (tipo: imagem)

**Componente:** `ContentBlockType.jsx`

#### Interface do Usuário
- Novo botão "+ GLB (opc.)" ao lado do botão "Escolher arquivo"
- Botão muda para "✓ GLB Custom" (verde) quando um arquivo GLB é selecionado
- Botão laranja quando nenhum GLB está selecionado
- Tooltip mostra o nome do arquivo GLB quando selecionado
- Desabilitado para vídeos (GLB só se aplica a imagens)

#### Estados Gerenciados
```javascript
const [glbFile, setGlbFile] = useState(null);
const glbInputRef = useRef(null);
```

#### Fluxo de Dados
1. Usuário seleciona imagem
2. Opcionalmente, seleciona arquivo GLB
3. Ao salvar, o GLB é adicionado ao `meta.glbFile` do bloco
4. No submit, o `Content.jsx` adiciona o GLB ao FormData como `glb_file`
5. Backend processa e retorna `glb_source: 'custom'` ou `'auto_generated'`

### 2. Upload de GLB em Carousels

**Componente:** `ContentBlockType.jsx`

#### Interface do Usuário
- Botão "+ GLB" para cada item do carousel
- Botão muda para "✓ GLB" (verde) quando arquivo selecionado
- Tooltip mostra nome do arquivo
- Cada item do carousel pode ter seu próprio GLB customizado

#### Fluxo de Dados
1. Usuário seleciona imagem para item do carousel
2. Opcionalmente, clica "+ GLB" e seleciona arquivo
3. GLB é armazenado em `item.meta.glbFile`
4. No submit, o `Content.jsx` verifica cada item e adiciona GLB ao FormData se existir

### 3. Envio ao Backend

**Componente:** `Content.jsx`

#### Para Blocos Individuais
```javascript
// adiciona arquivo GLB se foi fornecido
if (b.meta && b.meta.glbFile && localIsFileLike(b.meta.glbFile)) {
    fd.append('glb_file', b.meta.glbFile);
}
```

#### Para Items de Carousel
```javascript
// adiciona arquivo GLB se foi fornecido
if (it.meta && it.meta.glbFile && localIsFileLike(it.meta.glbFile)) {
    fd.append('glb_file', it.meta.glbFile);
}
```

## Comportamento Esperado

### Cenário 1: Upload com GLB Customizado
1. Usuário seleciona imagem PNG/JPG/SVG
2. Usuário clica "+ GLB (opc.)" e seleciona arquivo `.glb`
3. Botão muda para "✓ GLB Custom" (verde)
4. Ao salvar, backend recebe imagem + GLB
5. Backend valida GLB, faz upload e marca como `custom`
6. Resposta: `{ ..., glb_source: 'custom', glb_url: 'gs://...' }`

### Cenário 2: Upload sem GLB (Auto-geração)
1. Usuário seleciona apenas imagem
2. Não seleciona GLB (botão permanece laranja)
3. Ao salvar, backend recebe apenas imagem
4. Backend gera GLB automaticamente da imagem
5. Resposta: `{ ..., glb_source: 'auto_generated', glb_url: 'gs://...' }`

### Cenário 3: GLB Inválido
1. Usuário seleciona GLB corrompido/inválido
2. Backend tenta validar e falha
3. Backend faz fallback para auto-geração
4. Resposta: `{ ..., glb_source: 'auto_generated', glb_url: 'gs://...' }`
5. Log de aviso no backend

## Validações

### Frontend
- Aceita apenas arquivos `.glb`
- Desabilita para vídeos
- Validação visual com cores (laranja = sem GLB, verde = com GLB)

### Backend
- Valida extensão `.glb`
- Verifica header do arquivo
- Tamanho máximo 50MB
- Fallback para auto-geração em caso de erro

## Limpeza de Estado

Ao fechar/resetar o modal de criação de bloco:
```javascript
setGlbFile(null);
```

No reset geral:
```javascript
setConteudo("");
setTipoSelecionado("");
setSubtipoImagem("");
setUploadedMeta(null);
setGlbFile(null); // ← novo
```

## Próximos Passos (Opcional)

1. **Indicador Visual de Fonte GLB**
   - Adicionar badge mostrando se GLB é custom ou auto-gerado
   - Ícone: 🎨 para custom, 🤖 para auto-gerado

2. **Preview do GLB**
   - Visualização 3D do modelo antes de salvar
   - Usar three.js ou model-viewer

3. **Edição de GLB Existente**
   - Permitir substituir GLB de imagens já salvas
   - Botão "Substituir GLB" em blocos existentes

4. **Estatísticas**
   - Dashboard mostrando % de GLBs customizados vs auto-gerados
   - Tamanho total de armazenamento de GLBs

## Arquivos Modificados

### `ContentBlockType.jsx`
- Linha 43: Adicionado `glbInputRef`
- Linha 106: Adicionado estado `glbFile`
- Linhas 553-588: Input e botão GLB para blocos individuais
- Linhas 684-719: Input e botão GLB para carousel items
- Linha 1314: Adiciona glbFile ao meta antes de salvar
- Linha 1327: Reset do glbFile ao fechar modal

### `Content.jsx`
- Linhas 379-381: Adiciona glb_file ao FormData para blocos
- Linhas 443-445: Adiciona glb_file ao FormData para carousel items

## Compatibilidade

✅ **Backward Compatible**: Código existente continua funcionando sem modificações
✅ **Opcional**: GLB é completamente opcional, não quebra fluxo existente
✅ **Fallback Automático**: Em caso de erro, sistema volta para auto-geração

## Testado

- ✅ Upload de imagem sem GLB (auto-geração)
- ✅ Upload de imagem com GLB customizado
- ✅ Carousel com múltiplos itens (mix de custom/auto)
- ✅ Reset de estado ao fechar modal
- ✅ Validação de tipo de arquivo
- ✅ Desabilitação para vídeos

## Referências

- Backend: `docs/UPLOAD-GLB-CUSTOMIZADO.md`
- Endpoint: `POST /add-content-image/`
- Schema: `olinxra-backend/schemas.py`
