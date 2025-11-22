

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
*   **Remote Storage:** PostgreSQL 16
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
    *   **PostgreSQL** acts as a "Save Slot".
    *   **Sync Trigger:** Manual "Sync" button or Auto-save on idle (debounce 5s).
    *   **Endpoint:** `POST /api/sync` accepts a raw JSON dump of the graph.
    *   **Schema (Drizzle):**
        ```typescript
        export const graphs = pgTable('graphs', {
          id: uuid('id').primaryKey().defaultRandom(),
          title: text('title'),
          content: jsonb('content'), // Stores { nodes: [], edges: [] }
          updatedAt: timestamp('updated_at').defaultNow()
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
      - DATABASE_URL=postgres://user:pass@db:5432/rabbitnode
      - NUXT_OPENAI_API_KEY=${OPENAI_KEY}
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=rabbitnode
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

1.  [ ] **Init:** `bun create nuxt` + Install Vue Flow, Nuxt UI, Pinia, Drizzle.
2.  [ ] **Database:** Setup Postgres container and run Drizzle migration.
3.  [ ] **Canvas:** Render `<VueFlow>` with `ChatPair` component (Visuals only).
4.  [ ] **Store:** Build `useGraphStore` to handle `addNode` and `forkNode` logic.
5.  [ ] **AI Backend:** Setup `/api/chat` with Vercel AI SDK + LM Studio connection.
6.  [ ] **Streaming:** Connect Backend Stream -> Frontend Node UI.
7.  [ ] **Markdown:** Integrate `markdown-it` renderer.
