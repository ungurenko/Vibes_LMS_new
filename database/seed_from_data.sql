-- ===================================
-- VIBES LMS - Seed Data Script
-- Generated from data.ts
-- Date: 2026-01-07 18:36:52
-- ===================================

-- Очистка существующих данных (опционально)
-- TRUNCATE TABLE style_cards, glossary_terms, prompts, roadmaps, roadmap_steps, dashboard_stages, stage_tasks, course_modules, lessons, lesson_materials CASCADE;

BEGIN;

-- ===================================
-- STYLE CARDS
-- ===================================

INSERT INTO style_cards (id, name, gradient, image_url, description, long_description, prompt, tags, category) VALUES
  ('5ba48e5e-92a1-45f8-87b0-8dc8c5b783b7', 'Quiet Luxury', 'from-stone-100 to-stone-300', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=1000&auto=format&fit=crop', 'Тихая роскошь и сдержанность', 'Эстетика "старых денег". Приглушённые нейтральные тона, натуральные материалы (лён, камень), изысканная типографика.', 'Create a "Quiet Luxury" web interface...', ARRAY['Premium','Serif','Warm'], 'Минимализм');
INSERT INTO style_cards (id, name, gradient, image_url, description, long_description, prompt, tags, category) VALUES
  ('54f77e2d-b113-4589-a1a5-4a2ed497fda8', 'Neobrutalism', 'from-yellow-300 to-pink-500', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&auto=format&fit=crop', 'Яркий, честный, дерзкий', 'Современная интерпретация брутализма. Высокий контраст, кислотные цвета, жесткие тени.', 'Design a Neobrutalism interface...', ARRAY['Bold','Contrast','Raw'], 'Яркие');
INSERT INTO style_cards (id, name, gradient, image_url, description, long_description, prompt, tags, category) VALUES
  ('6417871d-7082-491d-bd12-f35674a3fc38', 'Bento Grid', 'from-gray-200 to-gray-400', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop', 'Структура и модульность', 'Организация контента в виде ячеек разного размера.', 'Create a Bento Grid layout design...', ARRAY['Grid','Structure','Apple'], 'Минимализм');
INSERT INTO style_cards (id, name, gradient, image_url, description, long_description, prompt, tags, category) VALUES
  ('306939d4-c0ec-4983-9978-841fb79abec5', 'Anti-Design', 'from-lime-400 to-fuchsia-600', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop', 'Хаос и самовыражение', 'Стиль, нарушающий правила.', 'Generate an Anti-Design interface...', ARRAY['Chaos','Gen Z','Acid'], 'Яркие');
INSERT INTO style_cards (id, name, gradient, image_url, description, long_description, prompt, tags, category) VALUES
  ('ef538023-1754-4ade-bdc4-d4cb946f1003', 'Human-Crafted', 'from-orange-100 to-amber-200', 'https://images.unsplash.com/photo-1544256671-50965365511b?q=80&w=1000&auto=format&fit=crop', 'Тепло и несовершенство', 'Противовес искусственному интеллекту.', 'Design a Human-Crafted interface...', ARRAY['Organic','Handmade','Warm'], 'Светлые');

-- ===================================
-- GLOSSARY TERMS
-- ===================================

INSERT INTO glossary_terms (id, term, slang, definition, category) VALUES
  ('b53444c2-41db-4486-ae84-51f18f8e4b67', 'Frontend', 'Фронтенд', 'Всё, что пользователь видит и с чем взаимодействует на сайте: кнопки, формы, анимации.', 'Базовые');
INSERT INTO glossary_terms (id, term, slang, definition, category) VALUES
  ('a258e392-d788-42fa-9dcf-ce5edaaa3de8', 'Backend', 'Бэкенд', 'Невидимая часть сайта: база данных, серверная логика, API. То, что работает «за кулисами».', 'Базовые');
INSERT INTO glossary_terms (id, term, slang, definition, category) VALUES
  ('c16d9c34-024a-4fd5-ac26-9755dd48148f', 'API', 'АПИ', 'Application Programming Interface — мост между фронтендом и бэкендом.', 'API');
INSERT INTO glossary_terms (id, term, slang, definition, category) VALUES
  ('4528c106-0503-4104-8850-c77c76027fed', 'Деплой', 'Deploy', 'Запуск сайта на хостинге, чтобы он был доступен всем в интернете.', 'Инструменты');
INSERT INTO glossary_terms (id, term, slang, definition, category) VALUES
  ('fd490f0b-c8a3-4ce5-bf7b-97a5214d8907', 'Верстка', NULL, 'Создание HTML/CSS структуры сайта — его «скелета».', 'Код');

-- ===================================
-- DASHBOARD STAGES
-- ===================================

INSERT INTO dashboard_stages (id, title, subtitle, sort_order) VALUES
  ('531b376f-18c7-436f-8646-906c8a3ed6e9', 'Подготовка', 'Настрой свой рабочий процесс', 1);
INSERT INTO stage_tasks (id, stage_id, title, sort_order) VALUES
  ('53bc6196-8b4b-4418-9624-b0fd1bcf3a23', '531b376f-18c7-436f-8646-906c8a3ed6e9', 'Установить VS Code', 1);
INSERT INTO stage_tasks (id, stage_id, title, sort_order) VALUES
  ('d1833cfa-bffd-411f-8669-193ab722af34', '531b376f-18c7-436f-8646-906c8a3ed6e9', 'Создать аккаунт на GitHub', 2);
INSERT INTO stage_tasks (id, stage_id, title, sort_order) VALUES
  ('d91879d0-1936-48bf-900d-cd91b8427fc6', '531b376f-18c7-436f-8646-906c8a3ed6e9', 'Зарегистрироваться в Vercel', 3);

INSERT INTO dashboard_stages (id, title, subtitle, sort_order) VALUES
  ('6c3fa4e6-2f43-414d-84b2-b99849453577', 'Первый проект', 'Создай своё первое приложение', 2);
INSERT INTO stage_tasks (id, stage_id, title, sort_order) VALUES
  ('bb8cd8ee-0289-414b-9a5f-09177e1c1a9a', '6c3fa4e6-2f43-414d-84b2-b99849453577', 'Сгенерировать код в AI Studio', 1);
INSERT INTO stage_tasks (id, stage_id, title, sort_order) VALUES
  ('be9bfb5c-5ab1-4f45-8794-203150a6988b', '6c3fa4e6-2f43-414d-84b2-b99849453577', 'Деплоить на Vercel', 2);
INSERT INTO stage_tasks (id, stage_id, title, sort_order) VALUES
  ('4767580e-cbe7-45b0-9540-05a3f4489f8e', '6c3fa4e6-2f43-414d-84b2-b99849453577', 'Протестировать на мобильном', 3);

-- ===================================
-- PROMPTS
-- ===================================

INSERT INTO prompts (id, title, description, category, usage, content, tags) VALUES
  ('c27dc3ce-9c1b-4af1-a15a-068144aea264', 'Лендинг для эксперта', 'Создай продающий лендинг для консультанта или эксперта.', 'Лендинг', 'Опиши свою нишу, целевую аудиторию и ключевое преимущество.', 'Create a landing page for...', ARRAY['landing','expert','sales']);
INSERT INTO prompts (id, title, description, category, usage, content, tags) VALUES
  ('38499e3b-20a9-4f7e-8d8a-65d756f44382', 'Дашборд админ-панели', 'Генерация современного дашборда с метриками и графиками.', 'Веб-сервис', 'Укажи какие метрики нужно отображать.', 'Create an admin dashboard with...', ARRAY['dashboard','admin','metrics']);

-- ===================================
-- COURSE MODULES & LESSONS
-- ===================================

INSERT INTO course_modules (id, title, subtitle, sort_order) VALUES
  ('64643936-db29-420f-b26a-69f2cb3a16dd', 'Записанные уроки', 'Основы вайб-кодинга', 1);
INSERT INTO lessons (id, module_id, title, description, duration_minutes, video_url, sort_order) VALUES
  ('2e177f55-7eae-4d0a-9a49-08c1e780714a', '64643936-db29-420f-b26a-69f2cb3a16dd', 'Введение в вайб-кодинг', 'Знакомство с философией курса', 15, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1);
INSERT INTO lessons (id, module_id, title, description, duration_minutes, video_url, sort_order) VALUES
  ('80061452-fcf4-48c0-93a1-3a834b97597c', '64643936-db29-420f-b26a-69f2cb3a16dd', 'Первый промпт в AI Studio', 'Учимся общаться с нейросетью', 20, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2);

COMMIT;

-- ===================================
-- Seed script complete!
-- ===================================