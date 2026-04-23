# D&D 3.5 DM Tool

A local AI-powered reference tool for Dungeons & Dragons 3.5 Edition Dungeon Masters. Upload your rulebooks (PDFs or Word docs), ask questions, and get precise answers with source citations. Stat blocks, spells, and feats are rendered in proper D&D format. All data stays on your machine.

---

## Features

- **Ask anything** — rules questions, stat lookups, spell details, feat prerequisites
- **Upload your books** — PDF and DOCX support (PHB, DMG, MM, supplements, homebrew)
- **Formatted output** — stat blocks, spell entries, and feat entries render as proper D&D cards
- **Source citations** — every answer shows which book and page it came from
- **Persistent sessions** — chat history saved to SQLite; resume any conversation
- **Dice roller** — type `/roll 4d6dl` or click quick-roll buttons; nat20/nat1 highlighted
- **Keyword search** — search indexed content directly (hybrid, FTS, or vector mode)
- **Upload progress** — step-by-step progress bar (Parsing → Chunking → Embedding → Indexing)
- **Local-first** — no cloud database, no telemetry
- **Flexible LLM** — Claude API, Ollama, or LM Studio

---

## Requirements

- Python 3.12+
- Node.js 18+
- An LLM (one of):
  - [Anthropic API key](https://console.anthropic.com/) for Claude
  - [Ollama](https://ollama.com/) running locally
  - [LM Studio](https://lmstudio.ai/) running locally
- NVIDIA GPU recommended — used for local embeddings. CPU works but is slower.

---

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd DMTool
cp .env.example .env
```

Edit `.env` and set your LLM provider (see [LLM Configuration](#llm-configuration) below).

### 2. Create a Python virtual environment

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

> **Required on most modern Linux distros** — system Python is managed by the distro and blocks direct pip installs.

### 3. Install backend dependencies

```bash
cd backend && pip install -r requirements.txt
```

> `torch` and `sentence-transformers` are large downloads (~2 GB). They run the local embedding model that powers search.

### 4. Install frontend dependencies

```bash
cd frontend && npm install
```

### 5. Start the servers

Open two terminals (with the venv active in the backend terminal):

```bash
# Terminal 1 — backend API (port 8000)
make dev-backend

# Terminal 2 — frontend (port 5173)
make dev-frontend
```

Then open **http://localhost:5173** in your browser.

---

## LLM Configuration

Set `LLM_PROVIDER` in your `.env` file.

### Claude (Anthropic)

```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

Uses `claude-sonnet-4-6` by default. Prompt caching is enabled automatically, cutting API costs ~90% on repeated queries.

### Ollama

```bash
# Install a model first
ollama pull llama3
```

```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3
```

Ollama must be running (`ollama serve`) before starting the backend. Default URL: `http://localhost:11434/v1`.

### LM Studio

Load a model in LM Studio and start the local server (default port 1234).

```env
LLM_PROVIDER=lmstudio
LLM_MODEL=your-model-name
```

The model name must match exactly what's shown in LM Studio.

### Context limit for small local models

Models with a small context window (4096 tokens) need this set to prevent overflow:

```env
LLM_CONTEXT_LIMIT=4500
LLM_MAX_TOKENS=512
```

The backend trims retrieved chunks to fit within the budget before sending to the LLM.

### Custom URL

```env
LLM_PROVIDER=ollama
LLM_MODEL=mistral
LLM_BASE_URL=http://192.168.1.100:11434/v1
```

---

## Usage

### Adding Books

1. Click the **Books** tab in the sidebar
2. Drag and drop a PDF or DOCX onto the upload area, or click to browse
3. Enter the book name (e.g. `Player's Handbook`)
4. Optionally set a collection to group books (e.g. `core_rules`, `supplements`)
5. Click **Upload & Index**

Processing runs in the background. The progress bar shows the current step (Parsing / Cleaning / Chunking / Embedding / Indexing) and chunk count. Large books (300+ pages) take a few minutes.

### Asking Questions

Type in the chat box and press **Ctrl+Enter** (or click **Ask**). Examples:

- `What are the grapple rules for a Large creature grabbing a Medium creature?`
- `Give me the full stat block for a Troll`
- `How does Fireball work? What's the area of effect?`
- `What are the prerequisites for Cleave?`

### Sessions

Chat history is persisted automatically. Each conversation is saved as a session.

- **Sessions tab** (sidebar) — list all past sessions, load or delete them
- **New Chat** button (sidebar footer) — starts a fresh session
- Sessions are linked to a collection at creation time

### Dice Roller

Type dice expressions directly in chat:

```
/roll 1d20
/roll 4d6dl        # roll 4, drop lowest (ability score gen)
/roll 2d8+5
/roll 3d6-2
```

Or click quick-roll buttons above the chat input (d4 / d6 / d8 / d10 / d12 / d20 / d100).

Results show each die individually. Nat20 glows gold, nat1 glows red. Dropped dice are shown strikethrough.

### Keyword Search

Click the **Search** tab to search indexed content directly without asking the LLM.

- **Hybrid** — combines keyword and semantic results (default, best coverage)
- **FTS** — keyword only (fast, good for exact names)
- **Vector** — semantic only (good for concept queries)

Results show content type badge, book name, page number, and section path. Click any result to expand the full text.

### Collections

Use the **Collection** dropdown to scope answers to a specific group of books. Useful for keeping core rules separate from supplements.

### Response Formats

Answers are automatically rendered based on content type:

| Content | Rendering |
|---------|-----------|
| Rules text | Markdown prose with citations |
| Stat block | D&D 3.5 card (maroon header, tan body, ability grid) |
| Spell entry | Blue card with school, components, duration, etc. |
| Feat entry | Green card with prerequisites, benefit, normal, special |
| Dice roll | Die squares with result, modifiers, nat20/nat1 highlight |

Each answer shows collapsible source citations (book + page + section).

---

## Project Structure

```
DMTool/
├── backend/
│   ├── api/              # REST endpoints: chat, documents, collections, sessions, search, health
│   ├── core/             # Embedder, vector store (ChromaDB), LLM client, prompt builder
│   ├── detection/        # Content classifier — stat block / spell / feat regex scoring
│   ├── ingestion/        # PDF/DOCX parsers, D&D-aware chunker, pipeline
│   ├── models/           # Pydantic schemas
│   ├── db/               # SQLite: document registry, sessions, messages, FTS5 index
│   └── data/             # Local data (gitignored)
│       ├── chroma_db/    # Vector embeddings (ChromaDB)
│       ├── uploads/      # Uploaded source files
│       └── dm_tool.sqlite
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── chat/         # ChatWindow, ChatInput, MessageBubble, CitationList, DiceStrip
│       │   ├── renderers/    # StatBlockRenderer, SpellRenderer, FeatRenderer, DiceRenderer, PlainTextRenderer
│       │   └── sidebar/      # Sidebar, UploadDropzone, DocumentList, CollectionSelector, SearchPanel, SessionList
│       ├── hooks/            # useChat, useStream, useDocuments, useSessions
│       ├── utils/            # dice.ts — roll parser
│       └── api/              # Typed fetch wrappers (client.ts)
├── .env.example
├── Makefile
└── README.md
```

---

## How It Works

1. **Ingestion** — Files are parsed with PyMuPDF (PDF) or python-docx (DOCX). Text is cleaned (dehyphenation, ligature fixes), then chunked using a D&D-aware state machine that keeps stat blocks, spell entries, and feat entries intact as single chunks. Chunks are embedded with `all-MiniLM-L6-v2` (runs locally on GPU) and stored in ChromaDB. An FTS5 index is built in SQLite for keyword search.

2. **Query** — The question is embedded and used to find the top 8 most relevant chunks via cosine similarity. A keyword fallback (FTS5) catches proper noun lookups (creature names, spell names) that embedding search can miss. Results are deduplicated and merged.

3. **Answer** — Retrieved chunks are sent to the LLM as context. The response is streamed token-by-token. After streaming, regex scoring detects whether the response is a stat block, spell, feat, or rules text and routes it to the appropriate renderer. Answers and user messages are saved to the active session.

---

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (backend + frontend) |
| `make install-backend` | Install Python dependencies only |
| `make install-frontend` | Install npm dependencies only |
| `make dev-backend` | Start FastAPI on port 8000 (auto-reload) |
| `make dev-frontend` | Start Vite dev server on port 5173 |
| `make dev` | Start both servers concurrently |
| `make test` | Run backend tests |
| `make clean` | Delete all indexed data, uploads, and the SQLite DB |

---

## Tips

- **Best results** come from clean PDF exports, not scanned images. Scanned books with OCR artifacts will work but accuracy drops.
- **Book names** appear in every citation — use descriptive names (`Monster Manual` not `mm35`).
- **Collections** scope search to a subset of books. Useful when core rules and supplements overlap.
- **Local models** work well for rules lookups. Use 13B+ parameters for reliable stat block formatting. Set `LLM_CONTEXT_LIMIT` if you hit context overflow errors.
- **First startup** takes ~20 seconds while the embedding model loads into GPU memory.
- **LM Studio cold starts** — the first query after loading a model may be slow (~30s) while the model moves into VRAM. Subsequent queries are fast.
