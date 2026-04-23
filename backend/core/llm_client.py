"""
Multi-provider streaming LLM client.
Supports: claude | ollama | lmstudio
"""
from __future__ import annotations

from collections.abc import AsyncGenerator

from loguru import logger

from config import settings
from core.prompt_builder import SYSTEM_PROMPT, build_messages


async def stream_answer(
    user_message: str,
    retrieved_chunks: list[dict],
    history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    provider = settings.llm_provider.lower()
    if provider == "claude":
        async for chunk in _stream_claude(user_message, retrieved_chunks, history):
            yield chunk
    elif provider in ("ollama", "lmstudio"):
        async for chunk in _stream_openai_compat(user_message, retrieved_chunks, history):
            yield chunk
    else:
        yield f"[Error: Unknown LLM_PROVIDER '{provider}'. Use claude, ollama, or lmstudio.]"


# ---------------------------------------------------------------------------
# Claude (Anthropic) — with prompt caching
# ---------------------------------------------------------------------------

def _get_anthropic_client():
    import anthropic
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


async def _stream_claude(
    user_message: str,
    retrieved_chunks: list[dict],
    history: list[dict] | None,
) -> AsyncGenerator[str, None]:
    import anthropic

    client = _get_anthropic_client()
    messages = build_messages(user_message, retrieved_chunks, history)
    model = settings.llm_model or "claude-sonnet-4-6"

    system = [
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    try:
        with client.messages.stream(
            model=model,
            max_tokens=settings.llm_max_tokens,
            system=system,
            messages=messages,
            extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
        ) as stream:
            for text in stream.text_stream:
                yield text
    except anthropic.RateLimitError as e:
        logger.warning(f"Claude rate limit: {e}")
        yield "\n\n[Error: Rate limit reached. Please wait and try again.]"
    except anthropic.APIError as e:
        logger.error(f"Claude API error: {e}")
        yield f"\n\n[Error: {e}]"


# ---------------------------------------------------------------------------
# Ollama / LM Studio — OpenAI-compatible API
# ---------------------------------------------------------------------------

def _openai_compat_client():
    from openai import AsyncOpenAI

    provider = settings.llm_provider.lower()
    if settings.llm_base_url:
        base_url = settings.llm_base_url
    elif provider == "ollama":
        base_url = settings.ollama_base_url
    else:  # lmstudio
        base_url = settings.lmstudio_base_url

    return AsyncOpenAI(base_url=base_url, api_key="not-needed")


def _openai_model() -> str:
    if settings.llm_model:
        return settings.llm_model
    provider = settings.llm_provider.lower()
    if provider == "ollama":
        return settings.ollama_default_model
    return settings.lmstudio_default_model


async def _stream_openai_compat(
    user_message: str,
    retrieved_chunks: list[dict],
    history: list[dict] | None,
) -> AsyncGenerator[str, None]:
    client = _openai_compat_client()
    model = _openai_model()
    messages = build_messages(user_message, retrieved_chunks, history)

    # Prepend system message (OpenAI format)
    oai_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=oai_messages,
            max_tokens=settings.llm_max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except Exception as e:
        logger.error(f"{settings.llm_provider} error: {e}")
        yield f"\n\n[Error connecting to {settings.llm_provider}: {e}]"
