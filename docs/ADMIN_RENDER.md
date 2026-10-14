# Админка «Умной Полки»

Адрес владельца: `https://shelfsmartacademy.com/admin`. Публичной регистрации нет. Владелец получает случайные логин и пароль; восстановление отправляется только на `islamov.denis@gmail.com`. Пароль хранится как scrypt-хеш, cookie сессии — HttpOnly/Secure/SameSite=Strict, действует 24 часа. Ссылка восстановления одноразовая, действует 30 минут и отзывает все старые сессии.

## Состояние запуска

Опубликовано и проверено 2026-10-14. Используется существующая база `shelfsmart-admin-db`: `dpg-db7j6ua5b2lc7385gsdg-a`, PostgreSQL 18, Frankfurt. Новая база не создавалась. API `shelfsmart-api`: `srv-db7k2iqj9qps73codnh0`, Frankfurt, 0.5 CPU / 512 MB, `https://api.shelfsmartacademy.com`; HTTPS и `/healthz` работают. Static Site `srv-dam8up61egvs738j9kmg` обслуживает основной домен с настроенным API URL. Производственная ветка обоих сервисов — `feature/debug-source-view`.

Приёмка выполнена на frontend `35623f39a89ac9c6f88936629c0ec3a7a4fb11a7` (deploy `dep-db7kmcmi0phs7397dlug`) и API `b8eeecc82fbeefb9e19b1ebbb4f40b0b867045a2` (deploy `dep-db7k7hij9qps73cosls0`). Впоследствии API и frontend синхронизируются с производственной веткой; различия после проверенного runtime — документация и исправления regression-тестов. Единственная учётная запись владельца создана; актуальные случайные данные входа сохранены в приватный файл `ShelfSmart Admin.json` на рабочем столе владельца (0600, вне Git).

## Ресурсы Render

`render.admin.yaml` описывает только новый API в Frankfurt. В `DATABASE_URL` вручную передаётся внутренний URL существующей базы из Render → shelfsmart-admin-db → Info → Connections. База намеренно не объявлена в Blueprint, чтобы его применение не создавало и не перенастраивало её.

| Ресурс | Конфигурация | Плановый расход |
| --- | --- | --- |
| API shelfsmart-api | 0.5 CPU / 512 MB (Starter) | ориентир $7/мес. |
| Существующая shelfsmart-admin-db | PostgreSQL 18, 0.1 CPU / 256 MB (Basic), 5 GB | $6 + $1.50/мес. |
| Существующий Static Site | сохраняется | без отдельного compute |
| Resend | Free, проверенный отправитель | в рамках бесплатной квоты |

Это ориентир $14.50/мес. до налогов и возможного превышения трафика/сборок. В Dashboard 2026-10-14 подтверждены 5 GB базы и $7/мес. в форме нового API. Workspace повышать не требуется. В актуальном [Blueprint Reference](https://render.com/docs/blueprint-spec) ID compute-планов — `0.5c-512mb` и `0.1c-256mb`. У базы отключено автоматическое расширение диска; после перезагрузки Dashboard подтверждено «All internet traffic is blocked». API использует внутренний URL. Эти настройки управляются отдельно в Dashboard.

Build из корня репозитория: `npm ci --prefix server --include=dev && npm --prefix server run typecheck`. Start: `npm --prefix server start`. Root Directory не задавать: сервер импортирует `shared/*.ts`. Миграции выполняются при старте под advisory lock; изменять уже применённый SQL-файл нельзя. `/healthz` проверяет соединение и версию схемы.

Переменные **только API**:

| Ключ | Значение |
| --- | --- |
| NODE_VERSION | 24.7.0 |
| NODE_ENV | production |
| DATABASE_URL | внутренний URL существующей shelfsmart-admin-db; sync: false |
| WEB_ORIGIN | https://shelfsmartacademy.com |
| OWNER_EMAIL | islamov.denis@gmail.com |
| ABUSE_SECRET | случайный секрет не менее 32 байт; generateValue |
| RESEND_API_KEY | ключ Resend с минимально достаточной отправкой |
| MAIL_FROM | account@mail.shelfsmartacademy.com |

Секреты не добавляются в Git, build логи, frontend или `EXPO_PUBLIC_*`. Приложение не использует пароль Gmail. На Free Resend сейчас 3000 писем/мес. и 100/день: проверить [текущие условия](https://resend.com/pricing). Resend получает адрес владельца, его логин и ссылку восстановления; сообщения посетителей не отправляются по почте.

Resend: домен `61d382b9-1935-4722-a334-1c7bb9d60e93`, Ireland (`eu-west-1`), Verified. Включён Enforced TLS, получение почты выключено, tracking domain не настроен. Создан ключ `shelfsmart-password-reset` с Sending access только для этого поддомена; его значение не хранится в документации. В Spaceship добавлены выданный TXT `resend._domainkey.mail` и CNAME `rsend.mail` → `rsend-euw1.forge.rmta.net`, `send.mail` → `send.forge.rmta.net`; публичный DNS подтверждает все три. Записи основного сайта сохранены.

## DNS, отправитель и frontend

1. В Render API → Custom Domains добавить `api.shelfsmartacademy.com`. В Spaceship создать CNAME `api` на фактический `*.onrender.com` API, дождаться Verified и Certificate Issued. Записи `@` и `www` существующего сайта сохраняются.
2. В Resend добавить отправляющий поддомен `mail.shelfsmartacademy.com`. Скопировать именно выданные Resend DNS-записи в Spaceship; не угадывать значения и не менять почтовые записи корневого домена. Дождаться статуса Verified. Ключ хранить только в Render API.
3. В существующий Static Site добавить `EXPO_PUBLIC_API_BASE_URL=https://api.shelfsmartacademy.com` и пересобрать. Build остаётся `npm ci --include=dev && npm run export:web`.
4. Redirects/Rewrites: **Rewrite** `/admin` → `/index.html`, `/admin/*` → `/index.html`. Headers: для `/admin` и `/admin/*` задать `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`. Проверить реальные ответы `curl -I` и прямое открытие `/admin/reset`. Содержимое HTML общедоступно; данные закрыты API авторизацией.
5. `trustProxy: false` сохраняется. В production квота использует единственный валидный `CF-Connecting-IP`, нормализованный через ipaddr.js; отсутствие, дубликат или неверное значение закрывает ограничиваемый endpoint с 503. XFF игнорируется. Это опирается на [публичный ingress Render через Cloudflare](https://render.com/articles/how-render-handles-ddos-attacks) и [семантику заголовка Cloudflare](https://developers.cloudflare.com/fundamentals/reference/http-headers/). Прямые приватные вызовы считаются доверенной инфраструктурой; порт приложения нельзя открывать в Интернет напрямую. Production-проверка пройдена: после ошибочных входов подмена XFF/X-Real-IP/True-Client-IP и длинной цепочки XFF оставалась 429; попытки подмены CF-Connecting-IP блокировал Cloudflare (403 HTML). Проверены custom и onrender hostname. Запрос из Render Shell по публичному HTTPS получил 401 на обоих hostname, подтверждая отдельную квоту. После рестарта API в 17:27 Asia/Makassar лимит сохранился (429 в 17:28:57).

## Создание владельца

В Shell сервиса выполнить `npm --prefix server run bootstrap-owner -- --out /tmp/shelfsmart-owner.json`. Файл создаётся с правами 0600, содержит случайные логин (128 бит) и пароль (192 бита); секреты не выводятся в лог. Повторный запуск при существующем владельце ничего не меняет. Для ручной миграции есть `npm --prefix server run migrate`.

Передать файл владельцу по приватному каналу, сохранить в менеджере паролей. Не вставлять содержимое в commit, issue, PR или общий чат. Удалить временные копии после подтверждения получения. Восстановление — «Забыли пароль?» на `/admin`; нужен доступ к указанному Gmail. Письмо также напоминает случайный логин, поэтому потеря исходного файла не блокирует восстановление. Потеря сессии не удаляет сообщения.

## Локальная проверка

Node 24.7+, отдельный PostgreSQL 18 на loopback (локальные проверки также проходили на 17). Создать БД `shelfsmart_test`; URL передавать только через `TEST_DATABASE_URL`. Тесты отвергают внешние адреса и остальные имена БД, создают уникальную `test_*` схему и удаляют только её.

```sh
npm ci
npm ci --prefix server
npm run typecheck
npm --prefix server run typecheck
npm test
npm --prefix server test
npm run test:release-guard
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8097 npm run export:web
npm run test:admin:browser
```

Runner занимает только `127.0.0.1:8096/8097`, поднимает настоящую БД/API и SPA, fake mailer живёт только в тестовом дочернем процессе и доступен через IPC. Нет тестового HTTP endpoint в production. Проверяет вход, интерфейс на 390/1280, сообщения, сохранность после перезапуска API, смену пароля и отзыв cookie. Скриншоты — каталог `shelfsmart-admin-evidence` в системной временной папке (в CI `/tmp`). Существующий workflow regression tests сохраняется с добавлением недостающего Pillow, отдельный admin workflow использует PostgreSQL 18, как существующая база Render. `export:web` очищает Metro cache: иначе после сборки без API URL Expo может повторно использовать клиент с пустой настройкой.

Для отдельного dev API понадобятся `DATABASE_URL`, `NODE_ENV=development`, `WEB_ORIGIN=http://127.0.0.1:8096`, `OWNER_EMAIL`, `ABUSE_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`. `npm --prefix server start` использует реальный почтовый адаптер; для проверок без писем предпочтителен тестовый runner.

## Метрики и сообщения

Статистика приблизительная: посетитель означает браузер с локальным идентификатором на 30 дней, новый визит — после 30 минут. DNT/GPC отключают события, заблокированное хранилище даёт только временный ID визита. Клики Boosty не равны пожертвованиям. Сохраняются вид события, серверное время, случайные ID и домен источника без пути/параметров. События старше 90 дней удаляются ежечасно пакетами. Ответы детей, прогресс и полные URL не передаются.

Сообщения остаются до явного удаления владельцем. «Архив» обратим, «Удалить» требует подтверждения. Имя и почта необязательны. Кнопка ответа открывает локальную почтовую программу, сама ничего не отправляет.

## Резервные копии и восстановление

Платная PostgreSQL имеет PITR: на Hobby окно 3 дня, Pro+ 7 дней. В Recovery → Restore Database выбрать момент и создать **отдельную** базу; проверить её, затем переключить API на новый URL. Восстановление исходную базу не перезаписывает. До проверки новую базу не подключать к сайту.

Для экспорта: Recovery → Create export → скачать архив и хранить приватно. Render хранит эти экспорты 7 дней. Восстанавливать через `pg_restore` только в пустую отдельную БД совместимой версии. Резервная копия содержит сообщения и хеши доступа: после восстановления отозвать `admin_sessions` и `password_reset_tokens`, затем заново войти. Этот документ описывает процедуру, но не утверждает, что реальное восстановление уже испытано. [Документация Render](https://render.com/docs/postgresql-backups).

## Production-приёмка

2026-10-14 на опубликованном сайте проверены:

- Firefox: прямой `/admin`, вход, сохранение сессии после обновления, выход; форма обратной связи → сообщение в админке; ссылка Boosty открывает нужную страницу и добавляет один клик.
- HTTPS: анонимные inbox/analytics возвращают 401; cookie Secure/HttpOnly; повторные сообщения и события не дублируются. `/admin` и `/admin/reset` возвращают 200 с no-store/noindex/no-referrer.
- После рестарта API сохранились сессия, сообщение и ограничение попыток входа. API deploy при этой проверке: `dep-db7k7hij9qps73cosls0`.
- Письмо запрошено через Firefox. Resend подтвердил Delivered на `islamov.denis@gmail.com` в 17:35 Asia/Makassar, email ID `01a139c4-44c2-7e75-b7aa-538943d4309a`. Входящий ящик Gmail не просматривался. Письмо содержит логин и одноразовую ссылку.
- Ссылка открыла `/admin/reset` в Firefox, секрет удалился из адресной строки. Через API проверен реальный reset: 204, прежняя сессия 401, повторное использование ссылки 400, старый пароль 401, новый вход 200 (09:40:40 UTC). Затем вход с новым паролем повторно проверен в Firefox.
- Два собственных проверочных сообщения удалены по точным ID и содержимому. Первые показатели включают служебные визиты и два проверочных клика Boosty. Письма от формы обратной связи не отправляются.

Admin CI `38542582482` успешно завершён на `35623f3`, включая PostgreSQL 18, 39 серверных тестов и браузерный сценарий. Независимое ревью выполнено; критических или важных незакрытых замечаний по админке нет. Полный regression учебника остаётся отдельным ограничением ниже.

## Известный дефект учебника до админки

Полный regression нельзя считать зелёным: result-smoke выявляет обрезанную кнопку подсказки в p004-block06 после неверного ответа на экранах 1440×760 (28 px) и 1280×800 (12 px). Это воспроизведено 2026-10-14 на отдельно собранном опубликованном SHA 652d39a с тем же lockfile/браузером; соответствующий runtime-код совпадает. Независимое ревью допускает отдельный выпуск админки с этим зарегистрированным существующим дефектом. Тест не ослаблен. Изолированный resize повторно прошёл, исправленный all-pages прошёл 143 страницы и 1251 блок. Admin CI b8eeecc прошёл, включая 39 серверных тестов и browser E2E с PostgreSQL18.
