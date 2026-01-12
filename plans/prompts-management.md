# Feature Implementation Plan: Prompts Management

## 📋 Todo Checklist
- [ ] **Database Migration**
    - [ ] Create `prompt_categories` table (id, name, sort_order, etc.).
    - [ ] Migrate existing enum data to the new table.
    - [ ] Update `prompts` table to reference `prompt_categories`.
    - [ ] Create `schema_migration.sql` file.
- [ ] **Backend Implementation**
    - [ ] Create/Update API to fetch categories (`GET /api/content/categories` or via `prompts` endpoint).
    - [ ] Update `GET /api/content/prompts` to join with categories.
    - [ ] Update `api/admin-content.ts` to support `type=prompt-categories` (CRUD).
    - [ ] Update `api/admin-content.ts` prompt logic to handle `categoryId` instead of string.
- [ ] **Frontend Implementation (User View)**
    - [ ] Update `views/PromptBase.tsx` to fetch categories from API.
    - [ ] Remove hardcoded category constants.
    - [ ] Handle dynamic category rendering and filtering.
- [ ] **Frontend Implementation (Admin View)**
    - [ ] Add "Manage Categories" UI in `views/AdminContent.tsx`.
    - [ ] Implement Category CRUD modal/drawer.
    - [ ] Update Prompt Editor to use dynamic category list from API.
- [ ] **Testing & Verification**
    - [ ] Verify admin can create/rename/delete categories.
    - [ ] Verify admin can assign prompts to new categories.
    - [ ] Verify changes reflect immediately in User View.

## 🔍 Analysis & Investigation

### Codebase Structure
- **Database:** `prompts` table uses a hardcoded PostgreSQL ENUM `prompt_category`. This prevents dynamic management (renaming/adding) of categories from the UI.
- **Backend:**
    - `api/content.ts`: Fetches prompts using raw SQL, filtering by the enum string.
    - `api/admin-content.ts`: Handles CRUD for prompts, treating category as a string.
- **Frontend:**
    - `views/PromptBase.tsx`: Uses hardcoded `CATEGORIES` array and `CATEGORY_COLORS` map.
    - `views/AdminContent.tsx`: Uses hardcoded category options in the dropdown.

### Current Architecture
The system relies on hardcoded strings for categories across the stack (DB Enum -> API -> Frontend Constants). To enable "full management," we must transition to a relational model where categories are entities in their own right.

### Dependencies & Integration Points
- **PostgreSQL:** Needs schema changes.
- **Vercel Functions:** API endpoints need updates.
- **React Frontend:** State management needs to handle fetching categories before fetching prompts (or in parallel).

### Considerations & Challenges
- **Data Migration:** Existing prompts have a `category` column with enum values. These must be mapped to new `prompt_categories` IDs.
- **Backward Compatibility:** During deployment, the frontend might request old logic while backend is updating. (Not a huge issue for this project scale, but good to note).
- **Colors:** The frontend hardcodes colors per category name. We need to decide if we store colors in the DB or keep a fallback mapping. *Decision:* We will add a `color_theme` or similar field to the `prompt_categories` table to allow admins to select a visual style for the category, or at least fallback gracefully.

## 📝 Implementation Plan

### Prerequisites
- Access to the PostgreSQL database to run migrations.

### Step-by-Step Implementation

#### 1. Database Migration
Create a migration file `database/migrations/004_prompt_categories_refactor.sql`:
1.  Create `prompt_categories` table.
2.  Insert default categories (from the current Enum).
3.  Add `category_id` to `prompts`.
4.  Update `prompts.category_id` based on `prompts.category`.
5.  Drop `prompts.category`.

#### 2. Backend Updates

**Step 2.1: Update `api/content.ts`**
- Files to modify: `api/content.ts`
- Changes:
    - Add `getPromptCategories` handler to fetch categories for the frontend filter bar.
    - Update `getPrompts` query to `JOIN prompt_categories` and select `prompt_categories.name` (aliased as `category` for compatibility) and `prompt_categories.id`.

**Step 2.2: Update `api/admin-content.ts`**
- Files to modify: `api/admin-content.ts`
- Changes:
    - Add `handlePromptCategories` function (GET, POST, PUT, DELETE).
    - Update `createPrompt` and `updatePrompt` to accept `categoryId` (UUID) instead of `category` (string).
    - Update `getPrompts` (admin version) to join with categories.

#### 3. Frontend Updates (User View)

**Step 3.1: Fetch Categories in `PromptBase.tsx`**
- Files to modify: `views/PromptBase.tsx`
- Changes:
    - Add state `categories`.
    - Fetch categories from `/api/content/categories` (or similar new endpoint) on mount.
    - Replace `CATEGORIES` constant with this state.
    - Update `CATEGORY_COLORS` usage: Either usage a default color cycle or use a color field from the API if added.

#### 4. Frontend Updates (Admin View)

**Step 4.1: Add Category Management to `AdminContent.tsx`**
- Files to modify: `views/AdminContent.tsx`
- Changes:
    - Add state `promptCategories`.
    - Fetch categories on load.
    - Add a "Manage Categories" button in the Prompts tab.
    - Create a modal/drawer to list categories with Edit/Delete/Create actions.

**Step 4.2: Update Prompt Editor**
- Files to modify: `views/AdminContent.tsx`
- Changes:
    - In `renderEditorForm` (when `activeTab === 'prompts'`), replace the `Select` options with `promptCategories.map(...)`.
    - Ensure the value stored is the `categoryId`.

### Testing Strategy
1.  **Migration Test:** Run SQL migration locally and verify data integrity (existing prompts should have correct `category_id`).
2.  **Admin Test:**
    -   Create a new category "New AI".
    -   Rename it to "GenAI".
    -   Create a prompt and assign it to "GenAI".
3.  **User View Test:**
    -   Open "Prompts" page.
    -   Verify "GenAI" appears in the filter tabs.
    -   Verify the new prompt appears under that filter.

## 🎯 Success Criteria
- Admin can create, rename, and delete prompt categories.
- Admin can assign any category to a prompt.
- Changes in categories are immediately reflected in the User's "Prompts" section.
- Existing prompts are preserved and correctly categorized after migration.
