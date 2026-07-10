[English](README.md) | Português

# back-template-nest

Template base pronto pra produção pra novos projetos de backend: NestJS, TypeScript (strict), Postgres + Prisma, auth Passport (local + JWT) com verificação de email/reset de senha/rate limiting, nodemailer com fallback em console, logging estruturado via nestjs-pino, um recurso CRUD de exemplo completo (`notes`), e Docker + CI ligados ponta a ponta.

## Stack

- NestJS — TypeScript strict mode
- Postgres + Prisma (`schema.prisma`, migrations versionadas)
- Passport — `passport-local` (login) + `passport-jwt` (proteção de rota), `@nestjs/throttler` pra rate limiting
- nodemailer — fallback em console em dev quando as env vars de SMTP não tão setadas
- nestjs-pino — logs legíveis em dev, JSON em prod, nível via `LOG_LEVEL`
- class-validator/class-transformer — validação de DTO em todo endpoint que recebe dado do cliente
- Jest (unit, dependências mockadas) + Jest/Supertest (e2e, Postgres real, sem mock)
- ESLint + Prettier + Husky/lint-staged
- Docker (multi-stage, non-root, healthcheck) + docker-compose
- GitHub Actions (build+lint+test, build de Docker, e2e contra Postgres real) + Dependabot

## Começando (Docker — recomendado)

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# cola a saída no .env como JWT_SECRET

docker compose up -d db      # sobe só o Postgres
npm run db:migrate           # aplica o schema (primeira vez / após mudanças)
npm run docker:up            # builda e sobe a app também
```

App: http://localhost:3000/api. Postgres exposto na porta `5456` do host por padrão — muda `POSTGRES_PORT` no `.env` se colidir localmente.

## Começando (sem Docker)

Precisa de uma instância Postgres acessível.

```bash
cp .env.example .env    # aponta DATABASE_URL pro teu próprio Postgres
npm install
npm run db:migrate
npm run dev
```

## Variáveis de ambiente

Ver `.env.example` pra lista completa e comentada. `src/config/env.validation.ts` valida as obrigatórias no startup via Joi — uma var ausente/inválida falha rápido com mensagem legível.

## Auth

- `POST /api/auth/register`, `POST /api/auth/login` (register/login tem rate limit de 5 requisições/60s por IP, fixo e não configurável via env — ver Notas de design)
- `GET /api/auth/verify-email?token=...`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `PATCH /api/account/password`, `DELETE /api/account` (ambos exigem JWT Bearer)
- Todas as rotas protegidas usam `JwtAuthGuard` + `@CurrentUser()` (ver `src/auth`)

## Email

Emails de verificação e reset de senha passam por `src/email/email.service.ts`. Sem `SMTP_HOST` setado, os emails são logados no console em vez de enviados — sem setup necessário pra testar o fluxo localmente.

## Recurso CRUD de exemplo

`src/notes` (model Prisma pertencente ao usuário autenticado, validado via DTO, CRUD completo) é a implementação de referência pra copiar na tua primeira feature de verdade — apaga depois que não precisar mais da referência (remove o model `Note` do `prisma/schema.prisma` e gera uma migration).

## Testes

- **Unit** (`npm test`): a maioria dos services é instanciada manualmente com dependências mockadas via jest — sem banco real. A exceção é `src/prisma/prisma.service.spec.ts`, um teste de integração de verdade (o título do próprio describe já diz isso) que precisa de um Postgres acessível; o job `build` do CI roda um serviço Postgres especificamente pra isso.
- **E2E** (`npm run test:e2e`): `AppModule` completo + Supertest contra Postgres real, sem mock. Precisa de `docker compose up -d db && npm run db:migrate` primeiro.

## Docker

- `Dockerfile` — multi-stage (`deps` → `builder` → `runner`), roda como usuário non-root, healthcheck bate em `/api/health` via `127.0.0.1`.
- `docker-compose.yml` — `db` (Postgres 17, healthcheck via `pg_isready`, porta `5456` do host) e `app` (espera `db` ficar healthy).

## Scripts

| Script | Faz |
| --- | --- |
| `npm run dev` | Sobe o servidor de dev (watch mode) |
| `npm run build` | Compila TypeScript |
| `npm start` | Sobe o servidor compilado |
| `npm run lint` | ESLint (auto-fix) |
| `npm run format` | Prettier (escreve) |
| `npm run format:check` | Prettier (só checa) |
| `npm test` | Testes unit |
| `npm run test:watch` | Testes unit, watch mode |
| `npm run test:e2e` | Testes E2E contra Postgres real |
| `npm run db:generate` | `prisma migrate dev` — cria + aplica uma migration localmente |
| `npm run db:migrate` | `prisma migrate deploy` — aplica migrations pendentes (CI/prod) |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run docker:up` | `docker compose up --build` |
| `npm run docker:down` | `docker compose down` |

## Usando como template

1. Clona/degita esse repo como ponto de partida do teu novo projeto
2. Atualiza o `name` do `package.json` e esse README
3. `cp .env.example .env`, seta um `JWT_SECRET` real
4. `docker compose up -d db && npm run db:migrate && npm run dev`
5. Apaga `src/notes` depois de copiar o padrão pra tua primeira feature

## Notas de design e armadilhas

Coisas que não foram óbvias construindo isso, guardadas aqui pra não precisar redescobrir:

- **Guards rodam antes de Pipes no pipeline de request do Nest**: `@UseGuards(LocalAuthGuard)` dispara o `validate()` do passport-local antes do DTO `@Body()` do controller sequer chegar no `ValidationPipe` global. `LocalStrategy.validate()` (`src/auth/strategies/local.strategy.ts`) portanto roda `class-validator` contra um `LoginDto` ele mesmo, antes de delegar pro `AuthService.validateUser` — senão um body de login malformado pularia silenciosamente a validação de schema e apareceria como um 401 genérico em vez de 400.
- **`nest build` não precisa de env vars placeholder do jeito que `next build` precisa**: o passo de build do Next.js analisa estaticamente toda rota (incluindo rotas de API), que importa e executa módulos validados por env. `nest build` é `tsc` puro — nunca instancia `AppModule` nem roda validação Joi. O *único* motivo dos estágios `deps`/`runner` do Docker e do job `build` do CI ainda precisarem de um `DATABASE_URL` placeholder é que `npm ci` dispara `postinstall` → `prisma generate`, que precisa da env var *setada* pra algo (nunca conecta) mas dá erro se ela simplesmente não existir.
- **`class-validator`/`class-transformer` precisam estar instalados antes do `ValidationPipe` ser conectado, não só antes do primeiro DTO existir**: o `ValidationPipe` do Nest chama `process.exit(1)` na construção se os pacotes não forem resolvíveis — a app não conseguia bootar durante a janela de um commit entre conectar o pipe e a instalação da dependência originalmente planejada no plano. Corrigido instalando eles uma task antes.
- **Healthcheck do Docker: usa `127.0.0.1`, não `localhost`**: dentro do container Alpine, `localhost` do `wget` resolve pra `::1` (IPv6) primeiro, mas o servidor Nest bind em IPv4 — o healthcheck falha com "connection refused" mesmo com a app de pé. Tanto o `HEALTHCHECK` do `Dockerfile` quanto o `app.healthcheck` do `docker-compose.yml` miram `127.0.0.1` explicitamente.
- **`bcryptjs` em vez de `bcrypt`**: o `bcrypt` nativo precisa de uma toolchain `python3`/`make`/`g++` pra compilar no Alpine, que senão teria que ser instalada e depois removida do estágio `deps`. `bcryptjs` é JS puro — um pouco mais lento por hash, irrelevante nessa escala, e mantém o Dockerfile num `npm ci` só, sem desvio de build-tool.
- **Estágio de runtime reinstala com `npm ci --omit=dev`**: em vez de copiar o `node_modules` do estágio `deps` (que inclui `typescript`, `eslint`, `jest`, etc.) pra imagem final, o estágio `runner` faz sua própria instalação só-de-produção. Isso roda `prisma generate` uma segunda vez (precisa do mesmo `DATABASE_URL` placeholder), trocando alguns segundos extra de build por uma imagem de runtime consideravelmente menor.
- **`"prepare": "husky"` quebra um `npm ci --omit=dev` só-de-produção**: Husky é devDependency; quando o estágio de runtime do Docker instala com `--omit=dev`, o script de lifecycle `prepare` ainda dispara mas o binário do `husky` já era, quebrando o build inteiro com exit 127. Corrigido com `"prepare": "husky || true"` — uma instalação de Husky ausente/falha nunca bloqueia uma instalação de produção.
- **Porta `5456` do Postgres no host, não `5432`/`5433`/`5455`**: essa máquina já tem outras instâncias Postgres locais (e o projeto irmão `next-template`) presas nessas. `POSTGRES_PORT` no `.env` torna isso um fix de uma linha onde quer que isso seja deployado.
- **O rate limit de register/login é hardcoded, não vem de env**: `THROTTLE_TTL`/`THROTTLE_LIMIT` configuram o throttle *global* de fallback (default generoso: 100 req/60s, aplica em toda outra rota). O `@Throttle({ default: { limit: 5, ttl: 60000 } })` em `register`/`login` especificamente é um literal fixo em `src/auth/auth.controller.ts` — deliberadamente não ligado a uma env var, pra uma `.env` mal configurada não conseguir acidentalmente afrouxar a proteção nos dois endpoints que mais valem a pena proteger.
- **`Test.createTestingModule` nunca roda o `main.ts`**: o prefixo global, `ValidationPipe`, e `AllExceptionsFilter` setados no `bootstrap()` do `main.ts` têm que ser aplicados de novo em toda instância de app de teste e2e. `test/utils/create-test-app.ts` centraliza isso pra ser configurado identicamente uma vez, não copiado-colado por arquivo de spec.
- **Specs E2E rodam com `--runInBand`**: compartilham um Postgres real e usam emails únicos com timestamp por rodada de spec, mas execução serial mantém o estado do banco de um spec que falhou fácil de raciocinar sobre — default seguro pra uma suite pequena; revisitar se a suite crescer o suficiente pra execução serial virar o gargalo.
- **`src/prisma/prisma.service.spec.ts` é um teste de integração de verdade vivendo dentro do `npm test`, não só e2e**: precisa de um Postgres acessível. Localmente isso é `docker compose up -d db`; no CI, o job `build` roda seu próprio serviço `postgres:17-alpine` especificamente pra esse spec passar — uma primeira tentativa sem isso falhou de verdade no GitHub Actions antes disso ser adicionado.
- **As regras de Jest-mock/supertest do ESLint são desligadas por escopo pra arquivos de teste, não desligadas globalmente**: `unbound-method` (dispara em `expect(mock.method).toHaveBeenCalledWith(...)`) e `no-unsafe-assignment`/`no-unsafe-member-access` (disparam em bodies de resposta não-tipados do `supertest`) são inerentes a esses padrões, não bugs de verdade — desligadas só pra `**/*.spec.ts`/`**/*.e2e-spec.ts` em `eslint.config.mjs` pra código de produção continuar com o conjunto completo de regras type-checked.
