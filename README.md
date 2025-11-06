# OlinxRA Admin UI

<div align="center">

**Dashboard Administrativo para Gestão de Conteúdo AR**

[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Material-UI](https://img.shields.io/badge/MUI-7-007FFF.svg?logo=mui&logoColor=white)](https://mui.com/)

Interface intuitiva para criação e gerenciamento de experiências de Realidade Aumentada

</div>

---

## 📋 Visão Geral

OlinxRA Admin UI é uma aplicação web React que permite aos administradores:

- 🎨 **Criar Conteúdo AR**: Editor visual de blocos de conteúdo (imagens, vídeos, carrosséis, modelos 3D)
- 🏷️ **Gerenciar Logos**: Upload e indexação de logos de marcas para reconhecimento visual
- 🗺️ **Definir Localização**: Configuração de raio de alcance baseado em geolocalização
- 📊 **Visualizar Dados**: Dashboard com métricas e status do sistema
- 🔐 **Autenticação**: Login seguro via Firebase Authentication

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn
- Backend OlinxRA rodando (porta 8000)
- Projeto Firebase configurado

### Instalação

1. **Navegue até o diretório**
```bash
cd olinxra-adminui
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Firebase**

Crie o arquivo `src/firebaseConfig.js`:

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

4. **Configure a URL da API**

Edite `src/api.js` se necessário:

```javascript
const API_BASE_URL = 'http://localhost:8000';
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Desenvolvimento Completo (Frontend + Backend)

Para rodar frontend e backend simultaneamente:

```bash
npm run dev:full
```

Isso iniciará:
- Backend na porta 8000
- Frontend na porta 5173

## 🎨 Funcionalidades

### 1. Gestão de Conteúdo

#### Editor de Blocos

Interface drag-and-drop para criar conteúdo AR estruturado:

**Tipos de Blocos Disponíveis:**
- 📷 **Imagem Topo**: Banner principal
- 🎪 **Carousel**: Galeria de imagens com ações
- 📝 **Título/Subtítulo**: Textos formatados
- 📄 **Texto**: Parágrafos de conteúdo
- 🔘 **Botões**: Botões com ações customizadas
- 🎭 **Modelo 3D**: Upload de arquivos GLB

<!-- SCREENSHOT: Editor de blocos com preview -->

#### Carrosséis Interativos

Criação de carrosséis com:
- Upload múltiplo de imagens
- Definição de ações por item (links externos, navegação)
- Associação de modelos 3D opcionais
- Reordenação via drag-and-drop

<!-- SCREENSHOT: Editor de carousel -->

#### Geolocalização

Configuração de alcance geográfico:
- Mapa interativo (Leaflet)
- Definição de raio em metros
- Visualização de área de cobertura
- Múltiplas regiões por marca

<!-- SCREENSHOT: Mapa de geolocalização -->

### 2. Gestão de Logos

Interface para gerenciar logos de marcas:

- ✅ Upload de imagens PNG/JPG
- ✅ Indexação automática (CLIP + FAISS)
- ✅ Visualização de thumbnails
- ✅ Busca por marca
- ✅ Exclusão com confirmação

<!-- SCREENSHOT: Gestão de logos -->

### 3. Autenticação

Sistema de login integrado com Firebase:
- Login via email/senha
- Proteção de rotas
- Logout seguro
- Persistência de sessão

## 🏗️ Arquitetura

```
olinxra-adminui/
├── public/                    # Assets estáticos
│
├── src/
│   ├── main.jsx               # Entrypoint React
│   ├── App.jsx                # Componente raiz + rotas
│   ├── firebaseConfig.js      # Configuração Firebase
│   ├── api.js                 # Cliente HTTP (axios)
│   │
│   ├── pages/                 # Páginas principais
│   │   ├── Content.jsx        # Editor de conteúdo AR
│   │   ├── Logos.jsx          # Gestão de logos
│   │   ├── Login.jsx          # Tela de login
│   │   └── Dashboard.jsx      # (futuro) Dashboard
│   │
│   ├── components/            # Componentes reutilizáveis
│   │   ├── ContentBlockType.jsx     # Modal de edição de bloco
│   │   ├── ContentActions.jsx       # Botões de ação
│   │   ├── CarouselEditor.jsx       # Editor de carousel
│   │   ├── MapSelector.jsx          # Seletor de mapa
│   │   └── ...
│   │
│   ├── hooks/                 # Custom hooks
│   │   ├── useBlocos.js       # Gestão de estado de blocos
│   │   └── ...
│   │
│   └── utils/                 # Utilitários
│
├── package.json
├── vite.config.js
└── eslint.config.js
```

## 🔧 Componentes Principais

### ContentBlockType.jsx

Modal de edição de blocos com suporte a:
- Upload de mídia (imagens, vídeos, GLB)
- Configuração de ações (links, navegação)
- Edição de carrosséis
- Validação de formulário
- Preview em tempo real

**Estados Principais:**
```javascript
const [tipoSelecionado, setTipoSelecionado] = useState('');
const [carouselImagens, setCarouselImagens] = useState([]);
const [pendingFile, setPendingFile] = useState(null);
const [buttonAction, setButtonAction] = useState({});
```

### useBlocos.js

Hook customizado para gerenciar estado de blocos:

```javascript
const {
  blocos,
  setBlocos,
  handleAddBloco,
  handleEditBloco,
  handleDeleteBloco,
  handleReorderBlocos
} = useBlocos();
```

**Funcionalidades:**
- Adicionar/editar/deletar blocos
- Reordenar com drag-and-drop
- Validação de dados
- Sincronização com backend

### Content.jsx

Página principal de edição:

**Fluxo de Trabalho:**
1. Selecionar marca + região
2. Carregar conteúdo existente (se houver)
3. Adicionar/editar blocos
4. Configurar raio de localização
5. Preview em tempo real
6. Salvar no backend

**Detecção de Mudanças:**
```javascript
const blocosIdenticos = useMemo(() => 
  blocosIguais(blocos, blocosOriginais), 
  [blocos, blocosOriginais]
);

const radiusChanged = String(radiusMeters) !== String(originalRadius);

// Botão salvar habilitado se houver mudanças
<button disabled={blocosIdenticos && !radiusChanged}>
  Salvar
</button>
```

## 🎯 Fluxo de Dados

### Upload de Mídia

```
1. Usuário seleciona arquivo
   ↓
2. Arquivo validado (tipo, tamanho)
   ↓
3. Upload para Firebase Storage
   ↓
4. URL do arquivo retornada
   ↓
5. Bloco atualizado com URL
   ↓
6. Preview exibido
```

### Salvamento de Conteúdo

```
1. Usuário clica em "Salvar"
   ↓
2. Validação de blocos
   ↓
3. POST /conteudos com payload
   ↓
4. Backend processa e salva no MongoDB
   ↓
5. Resposta com dados salvos
   ↓
6. Estado atualizado (blocosOriginais)
   ↓
7. Notificação de sucesso
```

### Edição de Carousel

```
1. Abrir modal de carousel
   ↓
2. Adicionar imagens via upload
   ↓
3. Configurar ação por item
   ↓
4. (Opcional) Associar GLB
   ↓
5. Salvar edição
   ↓
6. Bloco atualizado no estado
   ↓
7. Modal fechado
```

## 🔐 Autenticação e Segurança

### Protected Routes

```javascript
// App.jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={
    <ProtectedRoute>
      <Content />
    </ProtectedRoute>
  } />
</Routes>
```

### API Interceptors

```javascript
// api.js
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 🧪 Scripts Disponíveis

```bash
# Desenvolvimento (apenas frontend)
npm run dev

# Desenvolvimento completo (frontend + backend)
npm run dev:full

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint

# Apenas backend (porta 8000)
npm run backend
```

## 🎨 Customização

### Temas (Material-UI)

Edite `App.jsx` para customizar cores:

```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});
```

### Tipos de Blocos

Para adicionar novos tipos de blocos, edite:

1. `ContentBlockType.jsx` - Adicionar tipo no select
2. `useBlocos.js` - Adicionar lógica de processamento
3. `Content.jsx` - (Opcional) Adicionar renderização customizada

## 🐛 Troubleshooting

### Problema: "Firebase: Error (auth/configuration-not-found)"
- Verifique `firebaseConfig.js`
- Confirme que o projeto Firebase está ativo
- Habilite autenticação por email/senha no console

### Problema: "API request failed with status 401"
- Usuário não está autenticado
- Token expirado - faça logout e login novamente
- Backend não está validando tokens corretamente

### Problema: "CORS error ao fazer upload"
- Configure CORS no Firebase Storage
- Configure CORS no Google Cloud Storage
- Adicione URL do frontend nas origens permitidas

### Problema: "Botão Salvar não habilita após editar carousel"
- ✅ Corrigido! Deep clone de `blocosOriginais` implementado
- Sempre use a versão mais recente do código

## 📊 Performance

### Otimizações Implementadas

- ✅ **Code Splitting**: Lazy loading de componentes
- ✅ **Memoização**: `useMemo` para comparações pesadas
- ✅ **Debounce**: Inputs de busca com debounce
- ✅ **Vite**: Build otimizado e HMR rápido
- ✅ **Tree Shaking**: Remoção de código não utilizado

### Bundle Size (produção)

```
dist/assets/index-[hash].js    ~150 KB (gzipped)
dist/assets/vendor-[hash].js   ~200 KB (gzipped)
Total:                         ~350 KB
```

## 📈 Deploy

### Build de Produção

```bash
npm run build
```

Isso gera os arquivos otimizados em `dist/`.

### Deploy em Serviços

**Vercel:**
```bash
vercel --prod
```

**Netlify:**
```bash
netlify deploy --prod --dir=dist
```

**Firebase Hosting:**
```bash
firebase deploy --only hosting
```

### Variáveis de Ambiente (Produção)

Configure no serviço de hospedagem:

```env
VITE_API_BASE_URL=https://api.olinxra.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
```

Acesse via `import.meta.env.VITE_*`

## 📚 Documentação Adicional

- [Upload GLB Frontend](UPLOAD-GLB-FRONTEND.md)
- [Esquema AR](AR_SCHEMA.md)
- [Endpoints API](ENDPOINTS.md)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Material-UI](https://mui.com/)

## 🤝 Contribuindo

Ao contribuir:

1. Siga convenções React (hooks, components)
2. Use TypeScript quando possível
3. Adicione PropTypes ou TypeScript types
4. Teste em diferentes navegadores
5. Mantenha acessibilidade (a11y)

## 📄 Licença

Este projeto está sob a licença MIT.

---

<div align="center">
<strong>OlinxRA Admin UI</strong> | Desenvolvido com React e Material-UI
</div>
