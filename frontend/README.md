# Metas — frontend

SPA em React, Vite e Tailwind CSS. O visual usa apenas utilitários Tailwind no JSX, com transparência, desfoque e reflexos para o efeito liquid glass. `src/global.css` contém somente o import do Tailwind e o tema da fonte. As rotas atuais são a landing page (`/`), cadastro (`/cadastro`), login (`/login`), perfil (`/perfil`), minhas metas (`/metas`), criação de meta (`/metas/nova`), detalhes e tarefas (`/metas/:goalId`), sobre (`/about`) e página 404.

## Desenvolvimento

```bash
npm install
npm run dev
```

O Vite encaminha `/api` para `http://127.0.0.1:8000` durante o desenvolvimento. Inicie o backend separadamente nessa porta para usar o login. `VITE_API_URL` é opcional: sem ela, o frontend usa `/api/v1`. Veja `.env.example` e defina a variável em `.env.local` apenas se a API estiver em outra base. Nesse caso, o backend precisa permitir a origem do frontend.

O login envia `username` e `password` para `/api/v1/token`. Os tokens ficam em `localStorage` para manter a sessão ao abrir outra aba ou página na mesma origem, e o acesso é renovado por `/api/v1/token/refresh` quando necessário. Abas já abertas reagem ao login e ao logout. Sessões antigas em `sessionStorage` são migradas automaticamente. Sair da conta remove os tokens. Após entrar, o usuário vai para `/perfil`.

O cadastro envia `username`, `first_name`, `last_name`, `email` e `password` para `POST /api/v1/register`. Depois de criar a conta, o frontend tenta entrar automaticamente; se o login não estiver disponível, encaminha a pessoa para `/login` com uma confirmação do cadastro.

A página de perfil usa `GET /api/v1/user` e `PATCH /api/v1/user` para consultar e editar nome de usuário, nome, sobrenome, e-mail, bio e imagem. A troca de senha usa `POST /api/v1/change/password`. O feed ainda não tem tela.

As metas usam `GET/POST /api/v1/goals`. A página de detalhes consulta `GET /api/v1/goals/:id` e altera a visibilidade com `PATCH /api/v1/goals/:id`. Ela lista as tarefas do usuário por `GET /api/v1/tasks` e mostra apenas as da meta aberta. A criação de tarefas usa `POST /api/v1/tasks` com o ID da meta em `goal`; o botão de conclusão usa `PATCH /api/v1/tasks/:id`. As listagens percorrem as páginas retornadas pela API.

```bash
npm run lint
npm run build
npm test
```

Os testes usam Vitest, Testing Library e jsdom. Eles simulam as respostas da API para verificar as rotas públicas, cadastro e login, persistência da sessão entre abas, edição do perfil, foto, troca de senha, listagem e criação de metas, visibilidade pública, tarefas, progresso e erros devolvidos pelo servidor. Use `npm run test:watch` durante o desenvolvimento.
