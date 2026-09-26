# Публикация веб-версии на Render

Настроено 18 сентября 2026 через Render Dashboard в Firefox.

- Адрес приложения: https://uchebnik-v2.onrender.com
- Управление: https://dashboard.render.com/static/srv-dam8up61egvs738j9kmg
- Репозиторий: https://github.com/denisislamov/uchebnik-v2
- Ветка публикации: `feature/debug-source-view`.
- Тип сервиса: **Static Site**, имя `uchebnik-v2`.
- Корневая папка: корень репозитория.
- Build Command: `npm ci --include=dev && npm run export:web`.
- Publish Directory: `dist`.
- Переменные Render: `NODE_VERSION=24.7.0`, `EXPO_PUBLIC_SOURCE_DEBUG=0`.
- Auto-Deploy: **On Commit**.

Версия Node совпадает с использованной локально. Параметр `--include=dev` сохраняет инструменты сборки независимо от настроек npm окружения. Expo экспортирует production web-сборку. Команда `web:debug` при публикации не используется; код панели сравнения с PDF исключается из production.

## Обновление сайта

После проверки изменений сделайте коммит и отправьте его в указанную ветку:

```sh
git push origin feature/debug-source-view
```

Render автоматически соберёт новую версию. В разделе **Deploys** проверьте успешный статус и SHA коммита, затем откройте приложение и обновите страницу браузера. Если сборка завершилась ошибкой, откройте её журнал. Прогресс ребёнка хранится локально в браузере: на новом домене, устройстве или в другом браузере он будет отдельным от локального приложения.

Для ручного повторного запуска используйте **Manual Deploy → Deploy latest commit** в панели этого сервиса. Для публикации другой ветки сначала измените **Settings → Branch**. Пуш в `main` сам по себе этот сайт не обновляет.

Настройки созданы через Dashboard; `render.yaml` не добавлялся. Веб-публикация не создаёт нативные iOS/Android-приложения.

Справка Render: [статические сайты](https://render.com/docs/static-sites), [версия Node](https://render.com/docs/node-version).
