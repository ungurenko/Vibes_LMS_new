При работе с базой данных VIBES LMS используйте команду `use vibes-database` в ваших запросах.

Доступные инструменты базы данных:
- `read_query` - выполнение SELECT запросов
- `write_query` - INSERT/UPDATE/DELETE операции
- `list_tables` - список всех таблиц
- `describe_table` - структура таблицы
- `create_table` / `alter_table` / `drop_table` - управление схемой

Примеры использования:
```
Посмотреть все таблицы в базе данных. use vibes-database

Показать структуру таблицы users. use vibes-database

Найти всех студентов со статусом active. use vibes-database
```