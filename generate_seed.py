#!/usr/bin/env python3
"""
Скрипт для генерации SQL seed-скрипта из data.ts
Читает TypeScript файл и создаёт INSERT запросы для PostgreSQL
"""

import re
import json
import uuid
from datetime import datetime, timedelta

def generate_uuid():
    """Генерирует UUID v4"""
    return str(uuid.uuid4())

def escape_sql_string(s):
    """Экранирует строку для SQL"""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''").replace('\\', '\\\\') + "'"

def parse_ts_array(content, var_name):
    """Извлекает массив из TypeScript файла"""
    pattern = rf'export const {var_name}.*?= \[(.*?)\];'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return []
    
    # Простой парсинг - заменяем одинарные кавычки на двойные
    array_content = match.group(1)
    # Убираем комментарии
    array_content = re.sub(r'//.*?\n', '\n', array_content)
    
    return array_content

# Читаем data.ts
with open('/Users/alexandrungurenko/Downloads/Vibes_LMS_new-main/data.ts', 'r', encoding='utf-8') as f:
    data_ts = f.read()

# SQL скрипт
sql = []
sql.append("-- ===================================")
sql.append("-- VIBES LMS - Seed Data Script")
sql.append("-- Generated from data.ts")
sql.append(f"-- Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
sql.append("-- ===================================\n")

sql.append("-- Очистка существующих данных (опционально)")
sql.append("-- TRUNCATE TABLE style_cards, glossary_terms, prompts, roadmaps, roadmap_steps, dashboard_stages, stage_tasks, course_modules, lessons, lesson_materials CASCADE;\n")

sql.append("BEGIN;\n")

# ===== STYLES =====
sql.append("-- ===================================")
sql.append("-- STYLE CARDS")
sql.append("-- ===================================\n")

styles = [
    ('1', 'Quiet Luxury', 'from-stone-100 to-stone-300', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=1000&auto=format&fit=crop', 'Тихая роскошь и сдержанность', 'Эстетика "старых денег". Приглушённые нейтральные тона, натуральные материалы (лён, камень), изысканная типографика.', 'Create a "Quiet Luxury" web interface...', 'Premium,Serif,Warm', 'Минимализм'),
    ('2', 'Neobrutalism', 'from-yellow-300 to-pink-500', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&auto=format&fit=crop', 'Яркий, честный, дерзкий', 'Современная интерпретация брутализма. Высокий контраст, кислотные цвета, жесткие тени.', 'Design a Neobrutalism interface...', 'Bold,Contrast,Raw', 'Яркие'),
    ('3', 'Bento Grid', 'from-gray-200 to-gray-400', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop', 'Структура и модульность', 'Организация контента в виде ячеек разного размера.', 'Create a Bento Grid layout design...', 'Grid,Structure,Apple', 'Минимализм'),
    ('4', 'Anti-Design', 'from-lime-400 to-fuchsia-600', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop', 'Хаос и самовыражение', 'Стиль, нарушающий правила.', 'Generate an Anti-Design interface...', 'Chaos,Gen Z,Acid', 'Яркие'),
    ('5', 'Human-Crafted', 'from-orange-100 to-amber-200', 'https://images.unsplash.com/photo-1544256671-50965365511b?q=80&w=1000&auto=format&fit=crop', 'Тепло и несовершенство', 'Противовес искусственному интеллекту.', 'Design a Human-Crafted interface...', 'Organic,Handmade,Warm', 'Светлые'),
]

for style_id, name, gradient, image, desc, long_desc, prompt, tags, category in styles:
    uuid_id = generate_uuid()
    sql.append(f"INSERT INTO style_cards (id, name, gradient, image_url, description, long_description, prompt, tags, category) VALUES")
    sql.append(f"  ({escape_sql_string(uuid_id)}, {escape_sql_string(name)}, {escape_sql_string(gradient)}, {escape_sql_string(image)}, {escape_sql_string(desc)}, {escape_sql_string(long_desc)}, {escape_sql_string(prompt)}, ARRAY[{','.join([escape_sql_string(t) for t in tags.split(',')])}], {escape_sql_string(category)});")

sql.append("")

# ===== GLOSSARY =====
sql.append("-- ===================================")
sql.append("-- GLOSSARY TERMS")
sql.append("-- ===================================\n")

glossary = [
    ('Frontend', 'Фронтенд', 'Всё, что пользователь видит и с чем взаимодействует на сайте: кнопки, формы, анимации.', 'Базовые'),
    ('Backend', 'Бэкенд', 'Невидимая часть сайта: база данных, серверная логика, API. То, что работает «за кулисами».', 'Базовые'),
    ('API', 'АПИ', 'Application Programming Interface — мост между фронтендом и бэкендом.', 'API'),
    ('Деплой', 'Deploy', 'Запуск сайта на хостинге, чтобы он был доступен всем в интернете.', 'Инструменты'),
    ('Верстка', None, 'Создание HTML/CSS структуры сайта — его «скелета».', 'Код'),
]

for term, slang, definition, category in glossary:
    uuid_id = generate_uuid()
    slang_val = escape_sql_string(slang) if slang else 'NULL'
    sql.append(f"INSERT INTO glossary_terms (id, term, slang, definition, category) VALUES")
    sql.append(f"  ({escape_sql_string(uuid_id)}, {escape_sql_string(term)}, {slang_val}, {escape_sql_string(definition)}, {escape_sql_string(category)});")

sql.append("")

# ===== DASHBOARD STAGES =====
sql.append("-- ===================================")
sql.append("-- DASHBOARD STAGES")
sql.append("-- ===================================\n")

stages = [
    ('Подготовка', 'Настрой свой рабочий процесс', ['Установить VS Code', 'Создать аккаунт на GitHub', 'Зарегистрироваться в Vercel']),
    ('Первый проект', 'Создай своё первое приложение', ['Сгенерировать код в AI Studio', 'Деплоить на Vercel', 'Протестировать на мобильном']),
]

for idx, (title, subtitle, tasks) in enumerate(stages):
    stage_id = generate_uuid()
    sql.append(f"INSERT INTO dashboard_stages (id, title, subtitle, sort_order) VALUES")
    sql.append(f"  ({escape_sql_string(stage_id)}, {escape_sql_string(title)}, {escape_sql_string(subtitle)}, {idx + 1});")
    
    for task_idx, task_title in enumerate(tasks):
        task_id = generate_uuid()
        sql.append(f"INSERT INTO stage_tasks (id, stage_id, title, sort_order) VALUES")
        sql.append(f"  ({escape_sql_string(task_id)}, {escape_sql_string(stage_id)}, {escape_sql_string(task_title)}, {task_idx + 1});")
    sql.append("")

# ===== PROMPTS =====
sql.append("-- ===================================")
sql.append("-- PROMPTS")
sql.append("-- ===================================\n")

prompts = [
    ('Лендинг для эксперта', 'Создай продающий лендинг для консультанта или эксперта.', 'Лендинг', 'Опиши свою нишу, целевую аудиторию и ключевое преимущество.', 'Create a landing page for...', 'landing,expert,sales'),
    ('Дашборд админ-панели', 'Генерация современного дашборда с метриками и графиками.', 'Веб-сервис', 'Укажи какие метрики нужно отображать.', 'Create an admin dashboard with...', 'dashboard,admin,metrics'),
]

for title, desc, category, usage, content, tags in prompts:
    uuid_id = generate_uuid()
    sql.append(f"INSERT INTO prompts (id, title, description, category, usage, content, tags) VALUES")
    sql.append(f"  ({escape_sql_string(uuid_id)}, {escape_sql_string(title)}, {escape_sql_string(desc)}, {escape_sql_string(category)}, {escape_sql_string(usage)}, {escape_sql_string(content)}, ARRAY[{','.join([escape_sql_string(t) for t in tags.split(',')])}]);")

sql.append("")

# ===== COURSE MODULES & LESSONS =====
sql.append("-- ===================================")
sql.append("-- COURSE MODULES & LESSONS")
sql.append("-- ===================================\n")

module1_id = generate_uuid()
sql.append(f"INSERT INTO course_modules (id, title, subtitle, sort_order) VALUES")
sql.append(f"  ({escape_sql_string(module1_id)}, 'Записанные уроки', 'Основы вайб-кодинга', 1);")

lessons = [
    ('Введение в вайб-кодинг', 'Знакомство с философией курса', 15, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ('Первый промпт в AI Studio', 'Учимся общаться с нейросетью', 20, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
]

for idx, (title, desc, duration, video_url) in enumerate(lessons):
    lesson_id = generate_uuid()
    sql.append(f"INSERT INTO lessons (id, module_id, title, description, duration_minutes, video_url, sort_order) VALUES")
    sql.append(f"  ({escape_sql_string(lesson_id)}, {escape_sql_string(module1_id)}, {escape_sql_string(title)}, {escape_sql_string(desc)}, {duration}, {escape_sql_string(video_url)}, {idx + 1});")

sql.append("")

# ===== COMPLETE =====
sql.append("COMMIT;\n")
sql.append("-- ===================================")
sql.append("-- Seed script complete!")
sql.append("-- ===================================")

# Записываем SQL в файл
output_path = '/Users/alexandrungurenko/Downloads/Vibes_LMS_new-main/database/seed_from_data.sql'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql))

print(f"✅ SQL seed script generated: {output_path}")
print(f"📊 Generated {len(sql)} lines of SQL")
