

# Technical Specification: RabbitNode

## 1. Project Overview
**RabbitNode** is a personal, node-based AI chat interface designed for non-linear conversation branching.
*   **Core Philosophy:** "Explore every rabbit hole." Users can fork conversations at any point without losing context.
*   **Target Environment:** Self-hosted VPS (Docker) + Local-First Logic.

## 2. Technology Stack

### Core Runtime
*   **Server Runtime:** Bun (v1.1+)
*   **Framework:** Nuxt 4 (Vue 3.5+)
*   **Language:** TypeScript (Strict for DB/API, Loose for Graph Interactions)

### Interface & Graph
*   **Graph Engine:** `@vue-flow/core`
*   **UI Library:** `@nuxt/ui` (Tailwind CSS based)
*   **Markdown Engine:** `markdown-it` + `shiki` (for syntax highlighting)

### Data & State
*   **Local State:** Pinia (persisted via `@vueuse/core` `useStorage`)
*   **Remote Storage:** SQLite
*   **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
*   **AI SDK:** Vercel AI SDK (`ai` core package)

---

## 3. Architecture & Data Flow

### A. The Hybrid Data Strategy
We prioritize local speed (instant load) with server-side backup.

1.  **Local Layer (Primary):**
    *   The entire graph state lives in `localStorage` (IndexedDB wrapper).
    *   Pinia store `graphStore` hydrates from here on boot.
2.  **Cloud Layer (Backup/Sync):**
    *   **SQLite** acts as a "Save Slot".
    *   **Sync Trigger:** Manual "Sync" button or Auto-save on idle (debounce 5s).
    *   **Endpoint:** `POST /api/sync` accepts a raw JSON dump of the graph.
    *   **Schema (Drizzle):**
        ```typescript
        export const graphs = sqliteTable('graphs', {
          id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
          title: text('title'),
          content: text('content', { mode: 'json' }),
          updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow()
        });
        ```

### B. AI Generation Pipeline
1.  **Trigger:** User selects a node -> types in Global Input -> clicks Send.
2.  **Context Build:** Client traverses the graph backwards (Selected Node $\to$ Parent $\to$ Root).
3.  **Payload:** Client constructs `messages` array + prepends **Global System Prompt**.
4.  **Request:** Sent to `/api/chat` (Nitro Server Route).
5.  **Provider:** Server connects to `openai` or `lm-studio` (based on config).
6.  **Streaming:**
    *   Server streams text chunks.
    *   Client updates `activeNode.data.aiText` reactively.
    *   **Markdown Handling:** The Markdown renderer receives raw partial strings. We use a specialized CSS class `.markdown-streaming` to handle unclosed code blocks gracefully during generation so the UI doesn't "jump."

---

## 4. User Experience (UX) Specification

### A. Canvas & Navigation
*   **Interaction:** Infinite Pan/Zoom.
*   **Snapping:** Enabled (Grid: `[20, 20]`).
*   **Selection:** Clicking a node makes it "Active." The Global Input bar always targets the "Active" node.

### B. The "Chat Pair" Node
Each node represents a full "Turn" (User + AI).
*   **Header (User):** Lighter Gray background. Editable text area.
*   **Body (AI):** Darker Gray background. Markdown rendered content.
*   **Metadata:** Displays Model Name (e.g., "GPT-4") and Token Count (approx).

### C. Branching & Auto-Forking Logic
This is the critical "Time Travel" feature.
*   **Scenario:** User selects a Node that *already has children* and edits the User Prompt (Header).
*   **Action:**
    1.  **Clone:** A new Sibling Node is created immediately.
    2.  **Link:** The new node connects to the *same parent* as the original node.
    3.  **State:** The new node becomes "Active."
    4.  **Data:** The edited text is applied to this *new* node. The original node remains untouched.
    5.  **Result:** The graph splits visually, preserving the old conversation path while starting a new one.

### D. Global Settings
A modal accessible via the sidebar.
1.  **System Prompt:** Textarea (Default: "You are a helpful AI assistant...").
2.  **Provider Config:** Toggle between "Cloud (OpenAI)" and "Local (LM Studio)".
3.  **Base URL:** Input field for Local URL (default: `http://localhost:1234/v1`).

---

## 5. Infrastructure & Deployment

### Docker Compose Configuration
The `compose.yml` defines the production stack.

```yaml
services:
  rabbit-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/app/.data/rabbitnode.sqlite
      - NUXT_OPENAI_API_KEY=${OPENAI_KEY}
    volumes:
      - rabbit_app_data:/app/.data
```

### Developer Experience (DX) Standards
*   **Type Safety:**
    *   **Strict:** Drizzle Schemas, API Request Bodies.
    *   **Loose:** Vue Flow Events (allowing `any` for complex drag/drop payloads).
*   **Code Structure:**
    *   `/server/api` - Nitro Routes.
    *   `/server/db` - Drizzle Schema & Config.
    *   `/stores` - Pinia Graph Logic (actions for `addNode`, `forkNode`).
    *   `/components/graph` - Custom Node UI.

---

## 6. Implementation Checklist (Phase 1)

1.  [x] **Init:** `bun create nuxt` + Install Vue Flow, Nuxt UI, Pinia, Drizzle.
2.  [x] **Database:** Setup SQLite storage and run Drizzle migration.
3.  [x] **Canvas:** Render `<VueFlow>` with `ChatPair` component (Visuals only).
4.  [x] **Store:** Build `useGraphStore` to handle `addNode` and `forkNode` logic.
5.  [x] **AI Backend:** Setup `/api/chat` with Vercel AI SDK + LM Studio connection.
6.  [x] **Streaming:** Connect Backend Stream -> Frontend Node UI.
7.  [x] **Markdown:** Integrate `markdown-it` renderer.



### Phase 2. Core Interface & Navigation
- [x] **Global Input Bar:** Implement a fixed input bar at the bottom of the screen that binds to the `activeNodeId`. Ensure typing here updates the user text of the selected node.
- [x] **Node Selection Logic:** Add click handlers to `ChatPair` nodes to invoke `setActiveNode(id)` so the Global Input knows which node to target.
- [x] **Sidebar UI:** Create a sidebar container to house the Graph Title, "New Graph" button, "Sync" status, and Settings trigger.

### Phase 3. Global Settings & Configuration
- [x] **Settings Store:** Add state to Pinia to handle `systemPrompt`, `aiProvider` ('openai' | 'local'), and `localBaseUrl`.
- [x] **Settings Modal:** Create a UI modal accessible from the sidebar to edit the global System Prompt and AI Provider configuration.
- [x] **Context Injection:** Update `buildContext` in `stores/graph.ts` to prepend the global `systemPrompt` to the messages array before sending to the API.

### Phase 4. Data Persistence (Cloud Layer)
- [x] **Sync API Route:** Implement `server/api/sync.post.ts` to receive the full graph JSON and upsert it into the `graphs` table.
- [x] **Load API Route:** Implement `server/api/graph/[id].get.ts` to retrieve a specific graph structure by ID.
- [x] **Auto-Save Logic:** Implement a `watch` effect in `RabbitFlow.vue` or the store that triggers the Sync API on change (with a 5-second debounce).
- [x] **Manual Sync:** Add a "Save/Sync" button in the UI for immediate persistence.

### Phase 5. Advanced AI & Markdown Features
- [x] **Syntax Highlighting:** Integrate `shiki` with `markdown-it` in `ChatPair.vue` to properly render code blocks with syntax highlighting (as `shiki` is already in `package.json`).
- [x] **Token Estimation:** Implement a basic token counter (or estimation function) to update `node.data.tokens` after an AI response finishes.
- [x] **Streaming Styles:** Add the `.markdown-streaming` CSS class logic to handle unclosed code blocks visually while the AI is typing.

### Phase 6. Graph Interaction Refinements
- [x] **Debounced Forking:** Refine the `updateNodeUserText` logic. Ensure that editing a parent node doesn't trigger a fork immediately on the first keystroke (add a small debounce or specific trigger).
- [x] **Node Layout Optimization:** Improve `forkNode` positioning logic. instead of a simple `+50, +50` offset, implement a smarter placement strategy so new branches don't overlap existing siblings.
- [x] **Graph Loading:** Update `app.vue` to check for a URL parameter (e.g., `?id=...`) and hydrate the store from the API if present, falling back to `localStorage` if not.
