-- ===================================
-- VIBES LMS - Complete Seed Data 
-- Все данные из data.ts для заполнения БД
-- ===================================

BEGIN;

-- Очистка существующих данных (раскомментируйте если нужно)
-- TRUNCATE TABLE style_cards, glossary_terms, prompts, roadmaps, roadmap_steps, 
--               dashboard_stages, stage_tasks, course_modules, lessons, 
--               lesson_materials CASCADE;

-- ===================================
-- 1. STYLE CARDS (Библиотека стилей)
-- ===================================

INSERT INTO style_cards (id, name, gradient, image_url, description, long_description, prompt, tags, category, created_at) VALUES
(gen_random_uuid(), 'Quiet Luxury', 'from-stone-100 to-stone-300', 
 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=1000&auto=format&fit=crop',
 'Тихая роскошь и сдержанность',
 'Эстетика "старых денег". Приглушённые нейтральные тона, натуральные материалы (лён, камень), изысканная типографика. Дизайн, который не кричит о цене, но шепчет о качестве. Идеально для премиум-сегмента, отелей и личных брендов.',
 'Create a "Quiet Luxury" web interface. Palette: Muted neutrals (Ivory, Sand, Taupe, Mocha Mousse). Typography: Classic Serif headers (Cormorant Garamond) with wide letter-spacing, neutral Sans-serif for body. Layout: Generous whitespace, vertical rhythm. UI Elements: Minimal buttons with thin borders, soft shadows, no aggressive accents. Textures: Grain overlay, linen, paper. Atmosphere: Expensive, understated, timeless.',
 ARRAY['Premium', 'Serif', 'Warm'], 'Минимализм', NOW()),

(gen_random_uuid(), 'Neobrutalism', 'from-yellow-300 to-pink-500',
 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&auto=format&fit=crop',
 'Яркий, честный, дерзкий',
 'Современная интерпретация брутализма. Высокий контраст, кислотные цвета, жесткие тени без размытия, толстые обводки. Эстетика "уродства", которая привлекает внимание. Подходит для стартапов, креативных агентств и смелых блогов.',
 'Design a Neobrutalism interface. Colors: High contrast, saturated Lime/Electric Blue/Hot Pink on white/cream background. Typography: Bold Sans-serif headers (Inter Bold, Satoshi), Monospace for accents. Shapes: Sharp corners, thick black borders (3-5px), hard unblurred shadows. Layout: Dense, grid-based, "raw" aesthetic. UI Elements: Chunky buttons, default HTML vibes, sticker aesthetic.',
 ARRAY['Bold', 'Contrast', 'Raw'], 'Яркие', NOW()),

(gen_random_uuid(), 'Bento Grid', 'from-gray-200 to-gray-400',
 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop',
 'Структура и модульность',
 'Организация контента в виде ячеек разного размера, как в японском ланчбоксе. Идеально для дашбордов и портфолио. Порядок, который приносит удовольствие. Каждый блок — отдельная история, но вместе они складываются в целое.',
 'Create a Bento Grid layout design. Visual Style: Modular, organized, Apple-like aesthetic. Structure: Asymmetric grid of rectangular cards (bento box). Styling: Smooth rounded corners (16-24px), soft backgrounds (off-white or light gray), subtle borders. Typography: Clean Sans-serif (SF Pro, Inter). Content: Each cell contains distinct content (numbers, charts, icons) with clear hierarchy.',
 ARRAY['Grid', 'Structure', 'Apple'], 'Минимализм', NOW()),

(gen_random_uuid(), 'Anti-Design', 'from-lime-400 to-fuchsia-600',
 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
 'Хаос и самовыражение',
 'Стиль, нарушающий правила. Конфликтующие цвета, растянутые шрифты, наложение элементов. Эстетика бунта и Gen Z энергии. Дизайн как высказывание: "Мы не пытаемся быть красивыми".',
 'Generate an Anti-Design / Cluttercore interface. Aesthetic: Chaotic, rebellious, "ugly-cool". Colors: Clashing neons (Brat Green vs Magenta). Typography: Distorted, stretched, mixed fonts (Serif + Sans). Layout: Overlapping elements, broken grid, random rotation. UI Elements: Glitch effects, raw unstyled components, maximalist visual noise.',
 ARRAY['Chaos', 'Gen Z', 'Acid'], 'Яркие', NOW()),

(gen_random_uuid(), 'Human-Crafted', 'from-orange-100 to-amber-200',
 'https://images.unsplash.com/photo-1544256671-50965365511b?q=80&w=1000&auto=format&fit=crop',
 'Тепло и несовершенство',
 'Противовес искусственному интеллекту. Рукописные элементы, неровные линии, бумажные текстуры, "живые" цвета. Уют и человечность. Дизайн говорит: "Это сделал человек, и это видно".',
 'Design a Human-Crafted / Organic interface. Palette: Earthy tones (Terracotta, Olive, Sage, Cream). Forms: Imperfect "wobbly" lines, organic blob shapes, hand-drawn elements. Typography: Humanist Sans or hand-written scripts. Textures: Paper grain, watercolor, canvas. UI Elements: Soft, non-geometric buttons, illustrations instead of stock photos. Atmosphere: Cozy, authentic, artisanal.',
 ARRAY['Organic', 'Handmade', 'Warm'], 'Светлые', NOW()),

(gen_random_uuid(), 'Warm Minimalism', 'from-stone-50 to-orange-50',
 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?q=80&w=1000&auto=format&fit=crop',
 'Мягкость и комфорт',
 'Минимализм без холода. Тёплые оттенки бежевого, мягкие тени, очень скругленные углы. Дизайн, который успокаивает. Идеально для wellness-приложений и lifestyle-брендов.',
 'Create a Warm Minimalism design. Palette: Warm neutrals (Taupe, Beige, Cream, Dusty Rose) - avoid pure white/black. Shapes: Very soft rounded corners (24px+). Typography: Rounded Sans-serif or Soft Serif (Nunito, Lora). UI Elements: Soft blurred shadows, pill-shaped buttons, clean inputs. Atmosphere: Soothing, wellness-focused, "Hygge" digital experience.',
 ARRAY['Soft', 'Calm', 'Beige'], 'Минимализм', NOW()),

(gen_random_uuid(), 'Dark Mode Neon', 'from-slate-900 to-cyan-900',
 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1000&auto=format&fit=crop',
 'Глубина и свечение',
 'Глубокий темный фон (почти черный) с резкими неоновыми акцентами. Эстетика киберпанка, инструментов для разработчиков и ночного города. Glow-эффекты и градиентные границы.',
 'Design a Dark Mode Neon interface. Background: Deep Black (#0a0a0a) or Dark Blue. Accents: High-intensity Neon Cyan, Magenta, Lime. Typography: Geometric Sans (Space Grotesk) or Monospace. Effects: Outer glow (box-shadow) on elements, gradient borders, glassmorphism. Atmosphere: Cyberpunk, DevTools, Night City vibes.',
 ARRAY['Cyber', 'Neon', 'Glow'], 'Тёмные', NOW()),

(gen_random_uuid(), 'Glassmorphism', 'from-blue-100 to-purple-200',
 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop',
 'Стекло и размытие',
 'Полупрозрачные элементы с размытым фоном (backdrop-filter blur). Легкость, воздушность, футуристичность. Популяризирован Apple и Microsoft.',
 'Create a Glassmorphism interface. Background: Gradient or image. Glass Cards: Semi-transparent bg (white 10-20% opacity), backdrop-filter blur(10-20px), subtle 1px border (white 20%). Typography: Clean modern Sans. Shadows: Soft multi-layer. Atmosphere: Futuristic, elegant, Apple Big Sur vibes.',
 ARRAY['Glass', 'Blur', 'Modern'], 'Светлые', NOW());


-- ===================================
-- 2. GLOSSARY TERMS (Словарь)
-- ===================================

INSERT INTO glossary_terms (id, term, slang, definition, category, created_at) VALUES
(gen_random_uuid(), 'Frontend', 'Фронтенд', 'Всё, что пользователь видит и с чем взаимодействует на сайте: кнопки, формы, анимации. Код, который выполняется в браузере.', 'Базовые', NOW()),
(gen_random_uuid(), 'Backend', 'Бэкенд', 'Невидимая часть сайта: база данных, серверная логика, API. То, что работает «за кулисами». Обрабатывает запросы фронтенда.', 'Базовые', NOW()),
(gen_random_uuid(), 'HTML', 'АшТиЭмЭль', 'HyperText Markup Language — язык разметки, «скелет» любой веб-страницы. Определяет структуру: заголовки, параграфы, картинки.', 'Код', NOW()),
(gen_random_uuid(), 'CSS', 'СиЭсЭс', 'Cascading Style Sheets — язык стилей. Отвечает за внешний вид: цвета, шрифты, расположение элементов. Делает сайт красивым.', 'Код', NOW()),
(gen_random_uuid(), 'JavaScript', 'JS, Джаваскрипт', 'Язык программирования для браузера. Делает сайты интерактивными: кнопки работают, формы валидируются, анимации оживают.', 'Код', NOW()),
(gen_random_uuid(), 'React', 'Реакт', 'JavaScript-библиотека для создания пользовательских интерфейсов. Компонентный подход, быстрая разработка. Очень популярна.', 'Инструменты', NOW()),
(gen_random_uuid(), 'Tailwind CSS', 'Тейлвинд', 'Utility-first CSS фреймворк. Вместо написания CSS пишешь классы прямо в HTML: className="text-blue-500 font-bold".', 'Инструменты', NOW()),
(gen_random_uuid(), 'API', 'АПИ', 'Application Programming Interface — мост между фронтендом и бэкендом. Позволяет получать и отправлять данные по HTTP-запросам.', 'API', NOW()),
(gen_random_uuid(), 'REST API', NULL, 'Архитектурный стиль для создания API. Использует HTTP-методы (GET, POST, PUT, DELETE) для работы с данными. Стандарт индустрии.', 'API', NOW()),
(gen_random_uuid(), 'JSON', 'Джейсон', 'JavaScript Object Notation — формат обмена данными. Читаемый текст вида { "name": "Alex", "age": 25 }. Используется в API.', 'API', NOW()),
(gen_random_uuid(), 'Деплой', 'Deploy',  'Запуск сайта на хостинге, чтобы он был доступен всем в интернете. Финальный шаг разработки.', 'Инструменты', NOW()),
(gen_random_uuid(), 'Vercel', NULL, 'Платформа для деплоя фронтенд-приложений. Особенно популярна для Next.js и React. Бесплатный план для личных проектов.', 'Инструменты', NOW()),
(gen_random_uuid(), 'GitHub', 'Гитхаб', 'Платформа для хранения кода и совместной работы. Основана на системе контроля версий Git. Must-have для разработчиков.', 'Инструменты', NOW()),
(gen_random_uuid(), '404 Error', 'Страница не найдена', 'HTTP-код ошибки, означающий, что запрошенная страница не существует на сервере. Классическая ошибка веб-разработки.', 'Ошибки', NOW()),
(gen_random_uuid(), '500 Error', 'Ошибка сервера', 'HTTP-код ошибки, означающий внутреннюю ошибку сервера. Проблема на стороне бэкенда, не на фронтенде.', 'Ошибки', NOW()),
(gen_random_uuid(), 'Промпт', 'Prompt', 'Текстовая инструкция для нейросети (AI). Качественный промпт = качественный результат. Основа вайб-кодинга.', 'Вайб-кодинг', NOW()),
(gen_random_uuid(), 'AI Studio', 'Гугл АИ Студио', 'Платформа Google для работы с их моделями ИИ (Gemini). Можно генерировать код, текст, идеи прямо в браузере.', 'Вайб-кодинг', NOW()),
(gen_random_uuid(), 'Claude', 'Клод', 'AI-ассистент от Anthropic. Одна из лучших моделей для программирования. Понимает контекст, пишет чистый код.', 'Вайб-кодинг', NOW());


-- ===================================
-- 3. DASHBOARD STAGES (Этапы ученика)
-- ===================================

-- Stage 1: Подготовка
DO $$
DECLARE
    stage1_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO dashboard_stages (id, title, subtitle, sort_order, created_at) 
    VALUES (stage1_id, 'Подготовка', 'Настрой свой рабочий процесс', 1, NOW());
    
    INSERT INTO stage_tasks (id, stage_id, title, sort_order, created_at) VALUES
    (gen_random_uuid(), stage1_id, 'Установить VS Code и расширения', 1, NOW()),
    (gen_random_uuid(), stage1_id, 'Создать аккаунт на GitHub', 2, NOW()),
    (gen_random_uuid(), stage1_id, 'Зарегистрироваться в Vercel', 3, NOW()),
    (gen_random_uuid(), stage1_id, 'Получить доступ к Claude/Gemini', 4, NOW());
END $$;

-- Stage 2: Первый проект
DO $$
DECLARE
    stage2_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO dashboard_stages (id, title, subtitle, sort_order, created_at)
    VALUES (stage2_id, 'Первый проект', 'Создай своё первое приложение', 2, NOW());
    
    INSERT INTO stage_tasks (id, stage_id, title, sort_order, created_at) VALUES
    (gen_random_uuid(), stage2_id, 'Сгенерировать код в AI Studio', 1, NOW()),
    (gen_random_uuid(), stage2_id, 'Создать репозиторий на GitHub', 2, NOW()),
    (gen_random_uuid(), stage2_id, 'Де плоить на Vercel', 3, NOW()),
    (gen_random_uuid(), stage2_id, 'Протестировать на мобильном', 4, NOW()),
    (gen_random_uuid(), stage2_id, 'Поделиться в чате курса', 5, NOW());
END $$;

-- Stage 3: Стилизация
DO $$
DECLARE
    stage3_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO dashboard_stages (id, title, subtitle, sort_order, created_at)
    VALUES (stage3_id, 'Стилизация', 'Примени дизайн из библиотеки', 3, NOW());
    
    INSERT INTO stage_tasks (id, stage_id, title, sort_order, created_at) VALUES
    (gen_random_uuid(), stage3_id, 'Выбрать стиль из библиотеки', 1, NOW()),
    (gen_random_uuid(), stage3_id, 'Применить промпт стиля', 2, NOW()),
    (gen_random_uuid(), stage3_id, 'Настроить цветовую палитру', 3, NOW()),
    (gen_random_uuid(), stage3_id, 'Добавить анимации', 4, NOW());
END $$;


-- ===================================
-- 4. PROMPTS (Библиотека промптов)
-- ===================================

INSERT INTO prompts (id, title, description, category, usage, content, tags, created_at) VALUES
(gen_random_uuid(), 'Лендинг для эксперта', 
 'Создай продающий лендинг для консультанта, коуча или эксперта. С формой захвата лидов и секциями кейсов.',
 'Лендинг',
 'Опиши свою нишу (например, «финансовый консультант»), целевую аудиторию (кто твой клиент) и ключевое преимущество (почему выбирают именно тебя). AI создаст структуру и дизайн.',
 'Create a professional landing page for a [NICHE] consultant. Target audience: [AUDIENCE]. Key benefit: [BENEFIT]. Include: Hero section with strong headline, About section, Services/Packages (3 tiers), Case studies/testimonials, Lead capture form (email + name), CTA buttons. Design: Clean, trustworthy, professional. Use [STYLE] aesthetic. Optimize for mobile.',
 ARRAY['landing', 'expert', 'sales', 'lead-gen'], NOW()),

(gen_random_uuid(), 'Дашборд админ-панели',
 'Генерация современного дашборда с метриками, графиками и таблицами данных. Для внутренних инструментов.',
 'Веб-сервис',
 'Укажи какие метрики нужно отображать (например, «количество пользователей, выручка, конверсия»). AI создаст макет дашборда.',
 'Create an admin dashboard interface with the following metrics: [METRICS]. Include: KPI cards with numbers and trends, Line/Bar charts for analytics, Data table with pagination, Top navigation bar, Sidebar menu. Use a modern design system with good data visualization. Responsive layout. Dark/Light theme toggle.',
 ARRAY['dashboard', 'admin', 'metrics', 'charts'], NOW()),

(gen_random_uuid(), 'Портфолио разработчика',
 'Минималистичное портфолио для демонстрации проектов. С секциями About, Skills, Projects, Contacts.',
 'Лендинг',
 'Расскажи о своём стеке технологий и типе проектов, которые хочешь показать.',
 'Create a developer portfolio website. Stack: [YOUR_STACK]. Include: Hero with your name and role, About section with photo, Skills grid (tech stack with icons), Projects showcase (cards with images, descriptions, links), Contact form or social links. Design: Modern, minimalist, professional. Mobile-first. Add smooth scroll and fade-in animations.',
 ARRAY['portfolio', 'developer', 'showcase'], NOW()),

(gen_random_uuid(), 'SaaS-лендинг с ценами',
 'Лендинг для SaaS-продукта с секцией Features, Benefits, Pricing и FAQ. Конвертирует в регистрации.',
 'Лендинг',
 'Опиши что делает твой продукт, для кого он и какие планы подписки предлагаешь.',
 'Create a SaaS landing page for [PRODUCT_NAME]. Value proposition: [WHAT_IT_DOES]. Target users: [WHO]. Include: Hero with demo video/screenshot, Features grid (6-8 features with icons), Benefits section, Pricing table (Free/Pro/Enterprise tiers), FAQ accordion, Email capture for trial. Use modern SaaS design patterns. CTAs on every section.',
 ARRAY['saas', 'pricing', 'b2b', 'signup'], NOW()),

(gen_random_uuid(), 'E-commerce карточка товара',
 'Детальная страница продукта для интернет-магазина. С галереей, описанием, отзывами и кнопкой покупки.',
 'Веб-сервис',
 'Укажи тип товара (одежда, электроника, и т.д.) и ключевые характеристики, которые нужно показать.',
 'Create a product detail page for e-commerce. Product type: [TYPE]. Include: Image gallery with zoom, Product title and price, Size/Color selector (if applicable), Add to cart button, Product description tabs (Overview, Specs, Reviews), Related products carousel, Reviews section with ratings. Design: Clean, conversion-optimized, trust signals (secure checkout, free shipping). Use ecommerce best practices.',
 ARRAY['ecommerce', 'product', 'shop', 'buy'], NOW());


-- ===================================
-- 5. ROADMAPS (Дорожные карты)
-- ===================================

-- Roadmap 1: Запуск первого проекта
DO $$
DECLARE
    roadmap1_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO roadmaps (id, icon, title, description, category, difficulty, estimated_time, created_at)
    VALUES (roadmap1_id, '🚀', 'Запуск первого проекта', 
            'От идеи до живого сайта за один день. Пошаговый гайд для новичков без опыта в программировании.',
            'Подготовка', 'Легко', '2-3 часа', NOW());
    
    INSERT INTO roadmap_steps (id, roadmap_id, title, description, sort_order, created_at) VALUES
    (gen_random_uuid(), roadmap1_id, 'Придумай идею', 
     'Что хочешь создать? Лендинг для себя, портфолио, простое приложение? Запиши 2-3 предложения.', 1, NOW()),
    (gen_random_uuid(), roadmap1_id, 'Напиши промпт в AI Studio',
     'Используй промпт из библиотеки или создай свой. Опиши детально что нужно создать.', 2, NOW()),
    (gen_random_uuid(), roadmap1_id, 'Скопируй код в VS Code',
     'Создай проект (npx create-vite@latest), замени код на сгенерированный AI.', 3, NOW()),
    (gen_random_uuid(), roadmap1_id, 'Загрузи на GitHub',
     'git init, git add ., git commit, git push. Создай репозиторий через интерфейс GitHub.', 4, NOW()),
    (gen_random_uuid(), roadmap1_id, 'Задеплой на Vercel',
     'Подключи GitHub репозиторий к Vercel. Deploy автоматически. Получи ссылку.', 5, NOW()),
    (gen_random_uuid(), roadmap1_id, 'Протестируй и поделись',
     'Открой сайт, проверь на телефоне. Отправь ссылку в чат курса и получи фидбек!', 6, NOW());
END $$;

-- Roadmap 2: Улучшение дизайна
DO $$
DECLARE
    roadmap2_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO roadmaps (id, icon, title, description, category, difficulty, estimated_time, created_at)
    VALUES (roadmap2_id, '🎨', 'Улучшение дизайна', 
            'Сделай свой проект визуально крутым. Применение стилей, анимаций и адаптивности.',
            'Лендинг', 'Средне', '1-2 часа', NOW());
    
    INSERT INTO roadmap_steps (id, roadmap_id, title, description, sort_order, created_at) VALUES
    (gen_random_uuid(), roadmap2_id, 'Выбери стиль из библиотеки',
     'Открой раздел «Стили» и выбери эстетику: Quiet Luxury, Neobrutalism, Glassmorphism и т.д.', 1, NOW()),
    (gen_random_uuid(), roadmap2_id, 'Скопируй промпт стиля',
     'В карточке стиля есть готовый промпт. Скопируй его и добавь к описанию своего проекта.', 2, NOW()),
    (gen_random_uuid(), roadmap2_id, 'Попроси AI переработать дизайн',
     'Отправь новый промпт: «Переработай этот код, примени стиль [STYLE_NAME]».', 3, NOW()),
    (gen_random_uuid(), roadmap2_id, 'Замени код и проверь локально',
     'Обнови файлы, запусти npm run dev. Убедись что всё работает и выглядит круто.', 4, NOW()),
    (gen_random_uuid(), roadmap2_id, 'Задеплой обновление',
     'git push — Vercel автоматически задеплоит новую версию. Проверь результат!', 5, NOW());
END $$;


-- ===================================
-- 6. COURSE MODULES & LESSONS
-- ===================================

-- Module 1: Записанные уроки
DO $$
DECLARE
    module1_id UUID := gen_random_uuid();
    lesson1_id UUID;
    lesson2_id UUID;
    lesson3_id UUID;
BEGIN
    INSERT INTO course_modules (id, title, subtitle, sort_order, created_at)
    VALUES (module1_id, 'Записанные уроки', 'Основы вайб-кодинга', 1, NOW());
    
    -- Lesson 1
    lesson1_id := gen_random_uuid();
    INSERT INTO lessons (id, module_id, title, description, duration_minutes, video_url, sort_order, created_at)
    VALUES (lesson1_id, module1_id, 'Введение в вайб-кодинг',
            'Знакомство с философией курса, инструментами и подходом к созданию сайтов через AI.',
            15, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, NOW());
    
    -- Lesson 2
    lesson2_id := gen_random_uuid();
    INSERT INTO lessons (id, module_id, title, description, duration_minutes, video_url, sort_order, created_at)
    VALUES (lesson2_id, module1_id, 'Первый промпт в AI Studio',
            'Учимся правильно общаться с нейросетью. Структура промпта, примеры, частые ошибки.',
            20, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, NOW());
    
    -- Lesson 3
    lesson3_id := gen_random_uuid();
    INSERT INTO lessons (id, module_id, title, description, duration_minutes, video_url, sort_order, created_at)
    VALUES (lesson3_id, module1_id, 'Деплой на Vercel',
            'Пошаговая инструкция: от GitHub-репозитория до живого сайта. Настройка домена.',
            18, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 3, NOW());
    
    -- Materials for lessons (optional)
    INSERT INTO lesson_materials (id, lesson_id, title, content_type, content_url, sort_order, created_at) VALUES
    (gen_random_uuid(), lesson1_id, 'Презентация урока', 'document', 'https://example.com/slides1.pdf', 1, NOW()),
    (gen_random_uuid(), lesson2_id, 'Шаблон промпта', 'code', 'https://gist.github.com/example', 1, NOW()),
    (gen_random_uuid(), lesson3_id, 'Чеклист деплоя', 'document', 'https://example.com/checklist.pdf', 1, NOW());
END $$;

-- Module 2: Прямые эфиры
DO $$
DECLARE
    module2_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO course_modules (id, title, subtitle, sort_order, created_at)
    VALUES (module2_id, 'Прямые эфиры', 'Разборы проектов и Q&A', 2, NOW());
    
    INSERT INTO lessons (id, module_id, title, description, duration_minutes, video_url, sort_order, created_at) VALUES
    (gen_random_uuid(), module2_id, 'Разбор проектов учеников',
     'Живой код-ревью: смотрим ваши работы, фиксим баги, улучшаем дизайн.',
     60, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1, NOW()),
    (gen_random_uuid(), module2_id, 'Вопрос-ответ по AI-промптам',
     'Отвечаем на ваши вопросы: как добиться нужного результата от нейросети.',
     45, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 2, NOW());
END $$;


-- ===================================
-- 7. ADMIN CALLS (Созвоны)
-- ===================================

INSERT INTO admin_calls (id, title, description, meeting_link, scheduled_for, duration_minutes, status, created_at) VALUES
(gen_random_uuid(), 'Прямой эфир: Разбор проектов',
 'Показывай свои работы, получай фидбек, учись на чужих ошибках. Формат: Live Coding + Q&A.',
 'https://zoom.us/j/example123',
 NOW() + INTERVAL '3 days', 90, 'scheduled', NOW()),

(gen_random_uuid(), 'Воркшоп: Генерация промптов',
 'Учимся создавать универсальные промпты для любых задач. Формула идеального запроса к AI.',
 'https://zoom.us/j/example456',
 NOW() + INTERVAL '7 days', 60, 'scheduled', NOW());


COMMIT;

-- ===================================
-- Готово! Данные загружены
-- ===================================

-- Проверить количество записей:
-- SELECT 'style_cards' as table, COUNT(*) as count FROM style_cards
-- UNION ALL SELECT 'glossary_terms', COUNT(*) FROM glossary_terms
-- UNION ALL SELECT 'prompts', COUNT(*) FROM prompts
-- UNION ALL SELECT 'roadmaps', COUNT(*) FROM roadmaps
-- UNION ALL SELECT 'dashboard_stages', COUNT(*) FROM dashboard_stages
-- UNION ALL SELECT 'lessons', COUNT(*) FROM lessons;
