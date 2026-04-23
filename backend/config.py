from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # LLM provider: "claude" | "ollama" | "lmstudio"
    llm_provider: str = "claude"
    llm_model: str = ""          # overrides provider default when set
    llm_base_url: str = ""       # overrides provider default base URL when set
    llm_max_tokens: int = 2048

    # Claude-specific
    anthropic_api_key: str = ""

    # Ollama defaults  (http://localhost:11434/v1, model: llama3)
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_default_model: str = "llama3"

    # LM Studio defaults (http://localhost:1234/v1, model: auto-detected)
    lmstudio_base_url: str = "http://localhost:1234/v1"
    lmstudio_default_model: str = "local-model"

    base_dir: Path = Path(__file__).parent
    data_dir: Path = Path(__file__).parent / "data"
    upload_dir: Path = Path(__file__).parent / "data" / "uploads"
    chroma_dir: Path = Path(__file__).parent / "data" / "chroma_db"
    sqlite_path: Path = Path(__file__).parent / "data" / "dm_tool.sqlite"

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_batch_size: int = 64

    retrieval_top_k: int = 8
    max_chunk_tokens: int = 600
    chunk_overlap_chars: int = 100

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


settings = Settings()
