# Включение Realtime для уведомлений

## Инструкция по включению Realtime в Supabase Dashboard

**Дата: 2025-10-01**

### Шаги для включения Realtime:

1. **Откройте Supabase Dashboard**
   - Перейдите по ссылке: https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc

2. **Перейдите в раздел Database**
   - В левом меню выберите **Database** → **Replication**

3. **Включите Realtime для таблицы notifications**
   - Найдите в списке таблицу `notifications`
   - Нажмите на переключатель в колонке **Realtime**
   - Убедитесь, что переключатель стал зелёным

4. **Настройки Realtime (опционально)**
   - В разделе **Settings** → **API** → **Realtime**
   - Проверьте, что Realtime включен глобально
   - Max concurrent connections: 100 (по умолчанию достаточно)

### Проверка работы Realtime:

После включения Realtime, приложение сможет подписываться на изменения в таблице `notifications`:

```javascript
// В коде это выглядит так (уже реализовано в useNotifications.js):
const subscription = supabase
  .channel('notifications')
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      // Обработка нового уведомления
    }
  )
  .subscribe();
```

### Важные замечания:

- ✅ Realtime работает только для авторизованных пользователей
- ✅ RLS политики применяются и к Realtime подпискам
- ✅ Пользователь получает только те изменения, на которые у него есть права SELECT
- ⚠️ При большой нагрузке (>1000 одновременных подключений) может потребоваться upgrade плана

### Альтернативный способ (через SQL):

Если через UI не получается, выполните в SQL Editor:

```sql
-- Включить Realtime для таблицы notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Проверка статуса:

```sql
-- Проверить какие таблицы включены в Realtime
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```
