# Render Admin, Analytics and Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать владельцу закрытую админку с восстановлением доступа, статистикой посещений/Boosty и входящими сообщениями сайта.

**Architecture:** Существующий Expo Static Site остаётся на Render CDN. Отдельный Node API на api.shelfsmartacademy.com хранит данные в платном Render Postgres; интерфейс владельца открывается на /admin. Resend отправляет письма восстановления только владельцу.

**Tech Stack:** Существующие React 19 / React Native Web / Expo 57; Node 24.7+, TypeScript с нативным strip-types; Fastify 5, совместимые @fastify/cookie и @fastify/cors, pg; PostgreSQL 17; node:test и Playwright. Новые серверные зависимости фиксируются отдельным server/package-lock.json.

**Spec:** [Согласованная схема](../specs/2026-10-13-admin-analytics-feedback-design.md).

## Global Constraints

- Единственный владелец; восстановление только через islamov.denis@gmail.com. Публичной регистрации нет.
- Сессия — 24 часа; одноразовый reset-токен — 30 минут; смена пароля аннулирует все прежние сессии.
- Логин и начальный пароль содержат минимум 128 бит случайности. Никаких секретов в Git, Expo-переменных или логах.
- Cookie: Secure, HttpOnly, SameSite=Strict, host-only; изменение данных требует проверки Origin и CSRF-токена.
- Статистика: сегодня / 7 / 30 дней, Asia/Makassar; браузерный ID обновляется через 30 дней; визит завершается после 30 минут без событий; события удаляются через 90 дней.
- Не собирать ответы ребёнка, учебный прогресс, полные IP-адреса, произвольные URL или содержимое сообщений в аналитике.
- Сообщение 10–5000 символов, имя до 80, email до 254; последние два поля необязательны. Публичная форма — ru/en/de/fr/es/it; админка — ru.
- API не задерживает открытие учебника или Boosty. При ошибке отправки форма сохраняет текст; повтор не создаёт копий.
- Существующие незакоммиченные docs/* и .claude/ не входят в задачу. Перед реализацией использовать using-git-worktrees и отдельную ветку d.islamov/admin-analytics-feedback от текущего HEAD.
- До платного размещения: работающий код, проверенная конфигурация, актуальная сумма в Render. Предварительный ориентир $13–15/месяц до налогов/перерасходов — не жёсткий лимит.

## Review Focus

1. Два одновременных сброса либо вход во время смены пароля: только один reset успешен, не остаётся сессии со старым паролем — тесты Task 2.
2. Запись в БД завершилась, но ответ потерялся: retry не создаёт второе событие/сообщение — Task 3 и Task 4.
3. Вкладки открыты одновременно, повреждён localStorage или включён DNT/GPC: учебник работает, подсчёты не включают фиктивные постоянные ID — Task 3 и Task 6.
4. Истёкшая сессия, запросы от другого сайта, HTML в сообщении: нет утечки сообщений и выполнения HTML — Task 2, Task 4 и Task 5.
5. Пустые данные, полночь Asia/Makassar и сбой API: понятная пустая статистика, правильные дни, работающий учебник — Task 3 и Task 6.

## File Structure and Contracts

Серверные модули: server/src/config.ts, app.ts, index.ts, db.ts, migrate.ts, security.ts, auth.ts, mail.ts, analytics.ts, feedback.ts, maintenance.ts. SQL — server/migrations/001_admin.sql. Скрипт первоначального аккаунта — server/scripts/bootstrap-owner.ts. Тесты — server/tests/*.test.ts; изолированная PostgreSQL и фикстуры — server/tests/helpers.ts.

Общие чистые типы без runtime-зависимостей — shared/site-api.ts. Клиент — src/api/client.ts; аналитика — src/analytics/{core.ts,index.web.ts,index.ts}; форма — src/components/FeedbackForm.tsx и src/localization/feedback.ts. Админка — src/admin/{AdminApp.tsx,AuthForms.tsx,Dashboard.tsx,Inbox.tsx,styles.ts}. Использовать существующую тему библиотеки, не добавлять UI-фреймворк.

В shared/site-api.ts определить:

```ts
type Period = "today" | "7d" | "30d";
type FeedbackStatus = "new" | "read" | "archived";
type AnalyticsKind = "page_view" | "book_open" | "boosty_click";
type EventInput = { id: string; kind: AnalyticsKind; visitorId: string | null; sessionId: string; referrerHost: string | null };
type FeedbackInput = { id: string; message: string; name?: string; email?: string; website?: string };
type FeedbackMessage = { id: string; message: string; name: string | null; email: string | null; status: FeedbackStatus; createdAt: string };
type FeedbackPage = { items: FeedbackMessage[]; nextCursor: string | null };
type Counts = { visitors: number; visits: number; bookOpens: number; boostyClicks: number; boostyVisitors: number; boostyConversion: number | null };
type DashboardData = { period: Period; timezone: "Asia/Makassar"; totals: Counts; days: ({ date: string } & Counts)[]; sources: { host: string; visits: number }[] };
type AdminSession = { username: string; csrfToken: string; expiresAt: string };
type ApiFailure = { error: "invalid_input" | "unauthorized" | "forbidden" | "rate_limited" | "unavailable" | "conflict" };
```

HTTP-контракт: JSON для всех POST/PATCH; тело не более 32 KiB; UUID для id/sessionId/visitorId. POST /v1/events → 204; POST /v1/feedback → 202 {ok:true}; POST /v1/auth/login {username,password} и GET /v1/auth/session → AdminSession; POST /v1/auth/logout → 204; POST /v1/auth/forgot {email} → 202 {ok:true}; POST /v1/auth/reset {token,password} → 204. GET /v1/admin/analytics?period=… → DashboardData; GET /v1/admin/feedback?status=…&cursor=… → FeedbackPage; PATCH /v1/admin/feedback/:id {status} и DELETE того же пути → 204. GET /healthz → 200 {ok:true} только при доступной БД и актуальной схеме.

## Task 1: Запускаемый API с постоянной базой и изолированными тестами

**Files:** Create shared/site-api.ts; server/package.json, package-lock.json, tsconfig.json, .env.example; server/src/config.ts, app.ts, index.ts, db.ts, migrate.ts; server/migrations/001_admin.sql; server/tests/helpers.ts, foundation.test.ts. Modify tsconfig.json (exclude server).

**Interfaces:** `readConfig(env: NodeJS.ProcessEnv): Config`; `createPool(databaseUrl: string): Pool`; `migrate(pool: Pool): Promise<void>`; `buildApp(config: Config, deps: Dependencies): Promise<FastifyInstance>`. Config содержит environment, databaseUrl, webOrigin, port, ownerEmail, resendApiKey, mailFrom, abuseSecret. В config.ts определить также `Mailer = {sendReset(to: string, resetUrl: string): Promise<void>}` и Dependencies с pool, `now: () => Date`, mailer; реализация Mailer появляется в Task 2. Тестовый helper `withDatabase(run: (pool: Pool) => Promise<void>): Promise<void>` создаёт и удаляет только собственную случайную test_* схему.

- [ ] Написать foundation.test.ts: проверка обязательных настроек production, повторного/конкурентного migrate, единственности владельца, healthz и отказа без БД. Ключевые утверждения: `assert.equal(health.statusCode, 200)`, `assert.equal(secondMigrationCount, firstMigrationCount)`, `assert.equal(ownerRows.rows.length, 1)` после отклонённой вставки второго владельца; значения получать SQL-запросами к тестовой схеме.
- [ ] Запустить `npm --prefix server test -- tests/foundation.test.ts`; убедиться, что ошибки вызваны отсутствующей реализацией. Зависимости и тестовый PostgreSQL подготовить в рамках этого шага, после утверждения плана.
- [ ] Реализовать модули и миграции: owner_account с фиксированным PK=1, password_hash и auth_version; admin_sessions (hash, csrf_hash, expires_at, auth_version); password_reset_tokens (hash, expires_at); analytics_events (id PK, kind, visitor_id nullable, session_id, referrer_host, received_at); feedback_messages (id PK, payload_hash, поля формы, status, created_at); rate_limits (scope, key_hash, window_start, count, expires_at). Индексы по времени событий и (status,created_at,id) сообщений; таблица schema_migrations; транзакция и advisory lock миграций.
- [ ] Настроить pool max=5, connect timeout 5s, statement timeout 10s; запросы с параметрами. Production разрешает ровно https://shelfsmartacademy.com, обязательные секреты и почту владельца; test/development разрешает настроенный loopback. Логи без URL query, тела, cookies и исходного IP; общий error handler без SQL/секретов. Слушать 0.0.0.0:$PORT, по умолчанию 10000; корректно закрывать pool на SIGTERM. При недоступной БД возвращать 503, не успех.
- [ ] Повторить тесты и `npm --prefix server run typecheck`, ожидается 0 ошибок. Коммитить только перечисленные файлы: `feat: add persistent admin API foundation`.

## Task 2: Единственный аккаунт, сессии и email-восстановление

**Files:** Create server/src/security.ts, auth.ts, mail.ts; server/scripts/bootstrap-owner.ts; server/tests/auth.test.ts, recovery.test.ts. Modify server/src/app.ts, package.json.

**Interfaces:** `hashPassword(password: string): Promise<string>`; `verifyPassword(password: string, hash: string): Promise<boolean>`; `consumeLimit(pool: Pool, scope: string, key: string, limit: number, windowMs: number, now: Date): Promise<boolean>`; `registerAuth(app: FastifyInstance, config: Config, deps: Dependencies): Promise<void>`; `requireOwner(request: FastifyRequest, config: Config, deps: Dependencies): Promise<{ ownerId: 1; authVersion: number }>` (общая проверка для всех admin handlers). `Mailer.sendReset(to: string, resetUrl: string): Promise<void>`; `createMailer(config: Config): Mailer`.

- [ ] Написать тесты входа/выхода, cookie-флагов, CSRF, чужого Origin, лимитов, неизвестного логина и bootstrap без перезаписи. Для защищённых маршрутов: `assert.equal(anonymous.statusCode, 401)`; для чужого Origin: `assert.equal(foreign.statusCode, 403)`; для старой cookie после выхода: `assert.equal(replayed.statusCode, 401)`.
- [ ] Написать recovery.test.ts: fake mailer получает только ownerEmail; неизвестный email возвращает такое же тело; expiry=30 минут; два параллельных reset дают `assert.deepEqual(statuses.sort(), [204, 400])`; прежние сессии и вход со старым паролем, пересекающий reset, недействительны. Неуспешная отправка письма не раскрывает токен и не отбирает доступ.
- [ ] Запустить оба файла через server test, зафиксировать ожидаемый fail. Реализовать scrypt N=131072/r=8/p=1, salt=16 bytes, key=64 bytes, maxmem=256 MiB; constant-time сравнение и одинаковая дорогая проверка неизвестного логина. Не более одного scrypt одновременно, ограниченная очередь 3, далее 429. Новый пароль: минимум 16 символов, максимум 256 UTF-8 bytes.
- [ ] Реализовать opaque tokens по 32 случайных bytes, хеш SHA-256 в БД. Cookie `__Host-shelf_admin`, Path=/; локально отдельное имя без __Host и Secure. GET session возвращает CSRF-token = HMAC-SHA256(abuseSecret, "csrf:" + sessionToken), сверяемый через csrf_hash в БД; клиент никогда не получает sessionToken в JSON. Изменяющие административные маршруты проверяют X-CSRF-Token, Origin и JSON content type (для DELETE/logout без тела — Origin и CSRF). Login/forgot/reset проверяют Origin и JSON без требования существующей сессии. Все auth/admin ответы no-store.
- [ ] Ограничения в PostgreSQL: login 10/15min на IP-key и 30/15min глобально; forgot 5/hour на IP-key и 3/hour для получателя; reset 10/15min на IP-key; хранить HMAC(IP, abuseSecret + UTC date) с TTL 24h, не raw IP. Доверие proxy задать по проверенной цепочке Render, не принимать произвольный X-Forwarded-For; тестировать подмену заголовка. Конкретное доверенное поле/число hops подтвердить на deployment; без подтверждения выбирать безопасное ограничение по peer плюс глобальный лимит.
- [ ] Реализовать atomic reset: блокировка строки владельца, проверка действующего токена, смена hash, auth_version++, удаление всех reset-токенов и сессий одной транзакцией. Login перед вставкой сессии проверяет неизменность auth_version. Письмо с фиксированным WEB_ORIGIN/admin/reset#token=… через Resend HTTPS, timeout 10s; токен/URL не логировать, Host запроса не использовать.
- [ ] Bootstrap создаёт `owner-` + 16 random bytes base64url и пароль из 24 random bytes; пишет реквизиты исключительно в явно заданный файл вне репозитория с mode 0600 и O_EXCL; после создания владельца повторный запуск не меняет его. Не оставлять начальный пароль в Render env. Тестовый mailer никогда не включается в production.
- [ ] Повторить auth/recovery и foundation тесты: 0 fail; проверить реальный scrypt отдельно от быстрых test-fixtures. Коммит: `feat: secure owner login and email password recovery`.

## Task 3: Аналитика посещений и Boosty

**Files:** Create server/src/analytics.ts, maintenance.ts; server/tests/analytics.test.ts; src/api/client.ts; src/analytics/core.ts, index.web.ts, index.ts; tests/site-analytics.test.ts. Modify server/src/app.ts, index.ts; src/components/Library.tsx; App.tsx.

**Interfaces:** `registerAnalytics(app, config, deps): Promise<void>` с типами Task 1; `readDashboard(pool: Pool, period: Period, now: Date): Promise<DashboardData>`; `cleanup(pool: Pool, now: Date): Promise<void>`; `track(kind: AnalyticsKind): void` (web) и no-op native; `apiRequest<T>(path: string, options?: {method?: string; body?: unknown; csrfToken?: string}): Promise<T>`; `ApiError` содержит status:number и code:ApiFailure["error"].

- [ ] Написать тесты с фикстурами двух посетителей, трёх сессий, повторных id, одного кликавшего посетителя и полуночи UTC+8: `assert.equal(report.totals.visitors, 2)`, `assert.equal(report.totals.visits, 3)`, `assert.equal(report.totals.boostyConversion, 0.5)`. Для пустой статистики conversion=null, дни заполнены нулями. Считать уникальных посетителей за период отдельно от суммы дней.
- [ ] Проверить запрет лишних полей/URL вместо host, nullable visitorId, отсутствие email/IP, идемпотентность после потери ответа и удаление >90 дней. Смена IP не должна менять visitorId. На клиенте fake clock/storage: 30 дней меняет visitorId; ровно 30 минут простоя меняет sessionId; две вкладки используют общий sessionId при последовательных событиях; DNT/GPC прекращает сбор, сбой storage не ломает track и использует только ephemeral session без visitorId.
- [ ] Запустить `npm --prefix server test -- tests/analytics.test.ts` и `node --experimental-strip-types --test tests/site-analytics.test.ts`; сначала fail, затем реализовать API и client core. Session metadata хранить в localStorage, читать перед событием, синхронизировать через storage events; одновременная самая первая загрузка вкладок допускает погрешность визитов, она не должна падать или создавать ошибочный постоянный ID. Получать referrer только как нормализованный внешний hostname, без query/path/credentials.
- [ ] Сервер принимает только kind enum и указанные поля, назначает received_at, делает ON CONFLICT DO NOTHING; лимит 120/min на IP-key и 3000/min глобально. Показатели посетителей и конверсии используют только non-null visitorId; остальные события учитываются в totals. Визиты — distinct sessionId с событием в периоде; источник — первое событие сессии, попавшей в период, без повторного подсчёта каждого page_view. Общая оговорка в UI: это оценка браузеров и активности, не людей или платежей.
- [ ] Клиент берёт только EXPO_PUBLIC_API_BASE_URL, credentials omit для публичных событий и include для admin; fetch timeout 10s, ошибка становится ApiError. track отправляет JSON fetch keepalive, без ожидания навигации; допускает одну повторную попытку с тем же event.id, не хранит долговременную очередь. Нет URL API — учебник работает без сетевых запросов. Выполнять page_view один раз за загрузку Main; book_open в onOpenBook/onContinue; boosty_click в существующем Pressable без preventDefault, сохранив href/target и native Linking.
- [ ] cleanup удаляет устаревшие events, expired sessions/reset/limits при запуске и раз в час с unref timer, advisory lock и ограниченной пачкой удаления. Затем повторить тесты и typecheck; коммит: `feat: track private first-party site analytics`.

## Task 4: Форма обратной связи и API входящих

**Files:** Create server/src/feedback.ts, server/tests/feedback.test.ts; src/components/FeedbackForm.tsx, src/localization/feedback.ts; tests/site-feedback.test.ts; scripts/feedback-smoke.cjs. Modify server/src/app.ts, src/components/Library.tsx.

**Interfaces:** `registerFeedback(app, config, deps): Promise<void>`; `FeedbackForm({locale,onClose}: {locale:LibraryLocale;onClose:()=>void}): React.JSX.Element`; `feedbackCopy: Record<LibraryLocale, FeedbackCopy>` (FeedbackCopy определяется ключами ru). API использует FeedbackInput/FeedbackMessage/FeedbackPage из Task 1.

- [ ] Написать тесты: 9 и 5001 символов отклоняются; 10 и 5000 принимаются; имя 81/email255 отклоняются; пустой email допустим, невалидный непустой нет. `assert.equal(retriedRows.length, 1)` при retry; другое тело с прежним id даёт 409; ошибка DB даёт 503. Неавторизованные list/update/delete дают 401, смена status сохраняется после нового подключения.
- [ ] Написать UI-сценарий: отказ сети сохраняет текст, повторная отправка с тем же id после успешной записи не дублирует сообщение; редактирование после отправки меняет id. Пустой honeypot и минимальная валидация не мешают клавиатуре/screen reader; заполненный honeypot получает нейтральный ответ без записи. На русском/английском и ещё четырёх языках нет отсутствующих строк.
- [ ] Запустить server feedback test и клиентский test (ожидаемый fail). Реализовать JSON schema без лишних свойств, trim полей, длины по Unicode code points и email без CR/LF; payload_hash для проверки retry. Limit 5 сообщений/hour на IP-key и 100/hour глобально. Идемпотентный повтор уже записанного id возвращает тот же результат без расхода квоты создания; сохранять rate-limit и запись атомарно.
- [ ] Защищённый inbox: status необязателен, limit=25, opaque cursor из (createdAt,id) с валидацией, сортировка DESC; PATCH разрешает только new/read/archived, DELETE удаляет строку. Не передавать внутренние хеши и limiter-данные клиенту. Форма в Modal: labelled inputs, Escape/закрытие, фокус на открытии и возврат на кнопку, состояние pending и понятные локализованные ошибки; только успешный ответ очищает форму.
- [ ] Повторить тесты и typecheck; браузерный сценарий запускается общим runner из Task 6. Коммит: `feat: add feedback form and private inbox API`.

## Task 5: Интерфейс /admin

**Files:** Create src/admin/AdminApp.tsx, AuthForms.tsx, Dashboard.tsx, Inbox.tsx, styles.ts; src/admin/route.ts; tests/admin-route.test.ts; scripts/admin-smoke.cjs. Modify App.tsx.

**Interfaces:** `adminRoute(pathname: string): "login" | "reset" | null`; `AdminApp(): React.JSX.Element`; `Dashboard({session,onExpired}: {session:AdminSession;onExpired:()=>void}): React.JSX.Element`; `Inbox` с теми же props. Общий клиент Task 3 отправляет X-CSRF-Token только на изменяющих admin запросах.

- [ ] Написать route-тесты для /admin, /admin/, /admin/reset и неподходящего /administrator. В browser-тесте: без cookie только login; после правильного входа dashboard; reload сохраняет вход; logout и expiry возвращают login и очищают сообщения из памяти. `await expectPrivateRequestStatus(401)` до входа; этот helper определяется в scripts/admin-smoke.cjs через fetch к тестовому API.
- [ ] Проверить reset-страницу: fragment извлекается один раз в память и удаляется replaceState до API/аналитики; не хранится в localStorage, не меняется пароль от простого открытия. После отправки показан вход; забытый/просроченный token даёт понятную ошибку. Сообщение `<img src=x onerror=…>` показывается буквальным текстом, а не HTML. API 503 и пустая база имеют различимые состояния.
- [ ] После ожидаемых fail реализовать верхнюю развилку App перед Main только для web, без изменения внутренних экранов учебника. AdminApp вызывает GET session, хранит csrf только в памяти, умеет back/forward между login/reset и блокирует устаревшие ответы при выходе или смене фильтра. Формы содержат autocomplete для password manager, без автосохранения паролей приложением.
- [ ] Dashboard: карточки visitors/visits/bookOpens/boostyClicks, уникальные Boosty-посетители и конверсия; 3 периода; график с доступной таблицей дат и значений; источники; указание timezone и оговорок аналитики. Inbox: новые/прочитанные/архив, страницы по25, чтение/архив/возврат, mailto только валидного адреса, удаление после явного подтверждения. Компоненты адаптивны для 390px и 1280px, русский текст всех controls/accessibility labels.
- [ ] Запустить route-тесты, typecheck, подготовленные browser-сценарии Task 6; успешный результат включает отсутствие административных событий в аналитике. Коммит: `feat: add owner dashboard and feedback inbox`.

## Task 6: Сквозная проверка и готовый пакет Render

**Files:** Create scripts/run-admin-browser-tests.cjs, .github/workflows/admin.yml, render.admin.yaml, docs/ADMIN_RENDER.md, .env.example; server/tests/e2e-fixture.ts. Modify docs/DEPLOY_RENDER.md, server/package.json, package.json. Закрыть browser-сценарии из Tasks 4–5 и добавить scripts/analytics-smoke.cjs.

**Interfaces:** `npm run test:admin:browser` запускает scripts/run-admin-browser-tests.cjs с TEST_DATABASE_URL; runner создаёт test_* схему, API на 127.0.0.1:8097 и SPA static server на 127.0.0.1:8096, затем очищает только свои процессы/схему. `npm --prefix server test`, `npm --prefix server run typecheck`, `npm --prefix server run migrate`, `npm --prefix server run bootstrap-owner -- --out /absolute/non-repo/file` и `npm --prefix server start` — документированные команды.

- [ ] Подготовить тестовый Postgres17. На момент планирования Docker CLI установлен, daemon отсутствует, psql не найден: сначала проверить доступный локальный PostgreSQL; если его нет — установить изолированный runtime и запустить initdb/pg_ctl с данными в /tmp. TEST_DATABASE_URL допускает только loopback и тестовую БД, не DATABASE_URL production. CI использует PostgreSQL service container. Не заменять SQL-тесты in-memory mock и не пропускать их молча.
- [ ] Runner принимает только локальный URL и сборку с локальным API, поддерживает SPA fallback на /admin и /admin/reset; fake mailer доступен только внутри тестового процесса. Проверить предварительные guards: без тестовой БД runner завершается с понятной ошибкой, не стартует тесты против внешнего сервиса. В браузере воспроизвести: посетитель → сообщение → вход владельца → сообщение в inbox → архив/возврат/удаление → reset → прежняя cookie отклонена.
- [ ] Browser checks на 390/1280, шесть локалей формы, localStorage denied/DNT/GPC, две вкладки, API offline и Boosty popup по неизменной ссылке. Публичные события count+1 за нажатие, успешный POST повторён с тем же id count неизменен. Сохранённый прогресс учебника не меняется после работы с админкой. Скриншоты/результаты — в /tmp, не перезаписывать существующие грязные docs/*.
- [ ] Проверить `npm run typecheck`, `npm test`, `npm run test:release-guard`, `npm --prefix server run typecheck`, `npm --prefix server test`. Для e2e: `EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8097 npm run export:web`, затем `npm run test:admin:browser`; далее existing library-smoke и library-localization-smoke через scripts/run-browser-tests.cjs. Ожидается 0 fail, работоспособная навигация/прогресс, отсутствие секретов в dist. Полный existing CI test:all проходит в CI, его результат учитывать отдельно от локальных targeted suites.
- [ ] Написать render.admin.yaml только для нового API Starter и Postgres Basic-256mb с начальным диском5GB, PostgreSQL17, одинаковым регионом, внутренним DATABASE_URL и healthz. Корень build — репозиторий, команды используют --prefix server, чтобы shared/site-api.ts доступен. Existing Static Site не дублировать/не переподчинять blueprint. Внешний доступ к БД закрыт. Production env: WEB_ORIGIN, OWNER_EMAIL, RESEND_API_KEY, MAIL_FROM, ABUSE_SECRET; значения секретов только в панели. PUBLIC API URL добавляется в frontend build отдельно. Blueprint — проверяемый артефакт, не команда на платное создание.
- [ ] docs/ADMIN_RENDER.md: локальный запуск, команды миграций/начального аккаунта, безопасная передача credentials, DNS api CNAME и отдельные записи почтового отправителя, rewrite /admin* на /index.html и X-Robots-Tag:noindex для admin, no-store HTML админки, фиксированный production origin. Описать текущий Render PITR (Hobby3дня), ручной export и восстановление в отдельную БД; не выдавать непроверенное восстановление за выполненное.
- [ ] Добавить отдельный CI job с PostgreSQL17 и перечисленными server/browser checks, сохранить существующий regression workflow. После успешных проверок провести code review, исправить найденные проблемы и повторить только затронутые проверки. Коммит: `test: verify admin flows and prepare Render deployment`.

## Task 7: Размещение и приёмка на домене

**Files:** Update docs/ADMIN_RENDER.md с фактическими service IDs, SHA, датой, выполненными проверками и оставшимися ограничениями; без секретов. Код на этом этапе уже готов и проверен.

- [ ] Проверить актуальные цены Starter/Basic, размер диска и состояние оплаты в Render; предъявить конкретную конфигурацию перед финальным подтверждением платного создания. Пользователь одобрил небольшой ежемесячный бюджет и архитектуру; не повышать workspace план и не подключать дополнительные платные продукты.
- [ ] Создать новые сервисы, настроить секреты, миграции и /healthz. Добавить api.shelfsmartacademy.com, дождаться TLS; ограничить CORS. Подключить Resend free, подтвердить почтовый поддомен через Spaceship. При необходимости входа в аккаунт/платёжных данных дать пользователю выполнить только эту часть, продолжая доступные проверки.
- [ ] Создать владельца одноразовым скриптом, проверить, что повторный запуск не меняет его. Передать реквизиты владельцу отдельно от исходников; убрать временные копии только после подтверждения получения. Подтвердить proxy header на реальной цепочке Render и защиту от его подмены.
- [ ] Обновить проверенную ветку публикации feature/debug-source-view без force, учитывая новые удалённые коммиты. Добавить frontend API URL и rewrite/headers существующего Static Site. Дождаться Deploy succeeded / Live с нужным SHA для обоих сервисов.
- [ ] На действующем домене проверить: /admin login/reload/logout, отказ анониму на analytics/inbox, тестовое сообщение, Boosty click, отображение статистики, сохранность сообщений после рестарта API; реальное письмо сброса на islamov.denis@gmail.com и отзыв старых сессий. Не отправлять тестовые письма другим людям. Тестовую обратную связь удалить через подтверждение; тестовый период в статистике обозначить владельцу.
- [ ] Завершить только после проверки production; отдельно сообщить, если доставку письма в Gmail ещё должен подтвердить владелец. Передать URL админки, реквизиты, фактическую конфигурацию расходов и краткую инструкцию восстановления/резервных копий.

## References

- [Fastify: параметры сервера и trustProxy](https://fastify.dev/docs/latest/Reference/Server/).
- [OWASP: параметры scrypt](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [node-postgres: транзакции на одном соединении](https://node-postgres.com/features/transactions).
- [Render: восстановление и экспорт PostgreSQL](https://render.com/docs/postgresql-backups).

## Execution Handoff

План подготовлен и проверен по согласованной схеме. Рекомендуемый способ — выполнить последовательно в текущем чате, затем независимый review: backend и UI тесно связаны HTTP-контрактом, а разбиение между многими исполнителями добавит согласование интерфейсов. Альтернатива — отдельные исполнители и review каждого этапа, с большим расходом контекста. Способ выбирает владелец после просмотра этого плана; реализация ещё не начата.
