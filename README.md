# D&D 3.5 DM Tool

A local AI-powered reference tool for Dungeons & Dragons 3.5 Edition Dungeon Masters. Upload your rulebooks (PDFs or Word docs), then ask questions and get precise answers with source citations. Stat blocks, spells, and feats are rendered in their proper D&D format.

![Layout: sidebar with book list on left, chat interface on right]

---

## Features

- **Ask anything** — rules questions, stat lookups, spell details, feat prerequisites
- **Upload your books** — PDF and DOCX support (PHB, DMG, MM, supplements, homebrew)
- **Formatted output** — stat blocks, spell entries, and feat entries render as proper D&D cards
- **Source citations** — every answer shows which book and page it came from
- **Local-first** — all data stays on your machine; no cloud database
- **Flexible LLM** — use Claude API, Ollama (local), or LM Studio (local)

---

## Requirements

- Python 3.11+
- Node.js 18+
- An LLM (one of):
  - [Anthropic API key](https://console.anthropic.com/) for Claude
  - [Ollama](https://ollama.com/) running locally
  - [LM Studio](https://lmstudio.ai/) running locally
- NVIDIA GPU recommended (RTX 3080+ ideal) — used for local embeddings. CPU works but is slower.

---

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd DMTool
cp .env.example .env
```

Edit `.env` and set your LLM provider (see [LLM Configuration](#llm-configuration) below).

### 2. Install backend dependencies

```bash
make install-backend
# or manually:
cd backend && pip install -r requirements.txt
```

> **Note:** `torch` and `sentence-transformers` are large downloads (~2GB). They run the local embedding model that powers search.

### 3. Install frontend dependencies

```bash
make install-frontend
# or manually:
cd frontend && npm install
```

### 4. Start the servers

Open two terminals:

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

Uses `claude-sonnet-4-6` by default. Prompt caching is enabled automatically, which cuts API costs by ~90% on repeated queries.

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

The model name must match exactly what's loaded in LM Studio. Default URL: `http://localhost:1234/v1`.

### Custom URL or model

```env
LLM_PROVIDER=ollama
LLM_MODEL=mistral
LLM_BASE_URL=http://192.168.1.100:11434/v1
```

---

## Usage

### Adding Books

1. Open the sidebar (left panel)
2. Drag and drop a PDF or DOCX file onto the upload area, or click to browse
3. Enter the book name (e.g. `Player's Handbook`)
4. Optionally set a collection name to group books (e.g. `core_rules`, `supplements`)
5. Click **Upload & Index**

The book is processed in the background. Status shows as **Queued → Processing → Indexed**. Large books (300+ pages) take a few minutes. Once indexed, all content is searchable.

### Asking Questions

Type in the chat box and press **Ctrl+Enter** (or click **Ask**). Examples:

- `What are the grapple rules for a Large creature grabbing a Medium creature?`
- `Give me the full stat block for a Troll`
- `How does Fireball work? What's the area of effect?`
- `What are the prerequisites for Cleave?`
- `What happens when you cast a spell while in melee?`

### Collections

Use the **Collection** dropdown to limit search to a specific group of books. Useful if you have core rules separate from supplements and want to avoid cross-contamination.

### Response Formats

Answers are automatically rendered based on content type:

| Content | Rendering |
|---------|-----------|
| Rules text | Markdown prose with citations |
| Stat block | D&D 3.5 card (maroon header, tan body, ability grid) |
| Spell entry | Blue card with school, components, duration, etc. |
| Feat entry | Green card with prerequisites, benefit, normal, special |

Each answer shows collapsible source citations (book + page + section).

---

## Project Structure

```
DMTool/
├── backend/                  # FastAPI Python backend
│   ├── api/                  # REST endpoints (chat, documents, collections, health)
│   ├── core/                 # Embedder, vector store, LLM client, prompt builder
│   ├── detection/            # Content classifier (stat block / spell / feat detection)
│   ├── ingestion/            # PDF/DOCX parsers, chunker, pipeline
│   ├── models/               # Pydantic schemas
│   ├── db/                   # SQLite store + FTS5 keyword search
│   └── data/                 # Local data (gitignored)
│       ├── chroma_db/        # Vector embeddings
│       ├── uploads/          # Uploaded source files
│       └── dm_tool.sqlite    # Document registry
├── frontend/                 # React + TypeScript frontend
│   └── src/
│       ├── components/
│       │   ├── chat/         # ChatWindow, ChatInput, MessageBubble, CitationList
│       │   ├── renderers/    # StatBlockRenderer, SpellRenderer, FeatRenderer, PlainTextRenderer
│       │   └── sidebar/      # Sidebar, UploadDropzone, DocumentList, CollectionSelector
│       ├── hooks/            # useChat, useStream, useDocuments
│       └── api/              # Typed fetch wrappers
├── .env.example
├── Makefile
└── README.md
```

---

## How It Works

1. **Ingestion** — Uploaded files are parsed with PyMuPDF (PDF) or python-docx (DOCX). Text is cleaned (dehyphenation, ligature fixes), then chunked using a D&D-aware state machine that keeps stat blocks, spell entries, and feat entries intact as single chunks. Chunks are embedded with `all-MiniLM-L6-v2` (runs locally on GPU) and stored in ChromaDB.

2. **Query** — Your question is embedded and used to find the top 8 most relevant chunks via cosine similarity search. A keyword fallback (SQLite FTS5) catches proper noun lookups (creature names, spell names) that embedding search can miss.

3. **Answer** — Retrieved chunks are sent to the LLM as context. The LLM answers using only that context and includes source citations. The response is streamed token-by-token. After streaming completes, regex scoring detects whether the response is a stat block, spell, feat, or plain rules text, and routes it to the appropriate renderer.

---

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (backend + frontend) |
| `make install-backend` | Install Python dependencies only |
| `make install-frontend` | Install npm dependencies only |
| `make dev-backend` | Start FastAPI on port 8000 (auto-reload) |
| `make dev-frontend` | Start Vite dev server on port 5173 |
| `make test` | Run backend tests |
| `make clean` | Delete all indexed data and uploads |

---

## Tips

- **Best results** come from clean PDF exports, not scanned images. Scanned books with OCR artifacts will still work but may have lower accuracy.
- **Book names** are included in every citation, so use descriptive names (`Monster Manual` not `mm35`).
- **Collections** help when you want to ask questions scoped to core rules only vs. including supplements.
- **Local models** (Ollama/LM Studio) work well for rules lookups but may produce less precise stat block formatting than Claude. A 13B+ parameter model is recommended for best results.
- The embedding model loads once at startup and stays in GPU memory. First startup takes ~20 seconds while the model loads.
