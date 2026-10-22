# Aroma

Sistema completo de gestão para cafeteria **Aroma**, incluindo cardápio digital, gestão de estoque inteligente, kanban para barista, dashboard gerencial com curva ABC e trilha de auditoria completa.

---

## 📁 Estrutura de Pastas do Projeto

```
aroma/
├── backend/                  # Servidor Express e banco de dados
│   ├── db/
│   │   ├── db.ts             # Store e operações de dados
│   │   └── seedData.ts       # Dados iniciais para demonstração
│   └── server.ts             # Servidor HTTP, rotas da API e integração SPA
│
├── frontend/                 # Interface Web React + Vite + TailwindCSS
│   ├── index.html            # Ponto de entrada HTML
│   └── src/
│       ├── components/       # Componentes e telas do sistema
│       │   ├── AuditView.tsx
│       │   ├── ClientMenuView.tsx
│       │   ├── DashboardView.tsx
│       │   ├── KanbanView.tsx
│       │   ├── ProductModal.tsx
│       │   ├── ProductsView.tsx
│       │   ├── ReportsView.tsx
│       │   ├── Sidebar.tsx
│       │   └── StockView.tsx
│       ├── services/         # Clientes de API (fetch)
│       │   └── api.ts
│       ├── utils/            # Utilitários (áudio, formatação)
│       │   └── sound.ts
│       ├── App.tsx           # Componente raiz da aplicação
│       ├── index.css         # Estilos globais TailwindCSS
│       └── main.tsx          # Inicializador React
│
├── shared/                   # Código compartilhado entre Frontend e Backend
│   ├── logic/
│   │   ├── cafeRules.ts      # Regras de negócio, cálculos e relatórios
│   │   └── cafeRules.test.ts # Suíte de testes unitários
│   └── types/
│       └── index.ts          # Definições de tipos TypeScript
│
├── package.json              # Scripts e dependências
├── tsconfig.json             # Configurações TypeScript e aliases (@frontend, @backend, @shared)
└── vite.config.ts            # Configuração do Vite e Tailwind
```

---

## 🚀 Como Executar

### Pré-requisitos
- **Node.js** (v18+)

### 1. Instalar as dependências
```bash
npm install
```

### 2. Executar em modo de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no seu navegador em: `http://localhost:3000`

### 3. Rodar os testes unitários
```bash
npm test
```

### 4. Build de produção
```bash
npm run build
npm start
```
