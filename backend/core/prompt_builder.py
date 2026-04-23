from config import settings

SYSTEM_PROMPT = """You are a D&D 3.5 Edition rules assistant. Answer using ONLY the retrieved context. Cite sources (book + page). Do not reference other editions. If context is insufficient, say so.

After your answer add:
<citations>
[{"book": "Book Name", "page": 0, "section": "Section"}]
</citations>"""


def build_messages(
    user_message: str,
    retrieved_chunks: list[dict],
    history: list[dict] | None = None,
) -> list[dict]:
    chunks = _trim_chunks(retrieved_chunks, user_message)

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk.get("metadata", {})
        book = meta.get("book_name", "Unknown")
        page_start = meta.get("page_start", 0)
        section = meta.get("section_path", "")
        label = f"[{i}: {book}" + (f" p.{page_start}" if page_start else "") + (f", {section}" if section else "") + "]"
        context_parts.append(f"{label}\n{chunk['text']}")

    context_block = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant context found."

    messages = []
    if history:
        for msg in history[-4:]:  # last 2 turns only (save tokens)
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({
        "role": "user",
        "content": f"Context:\n{context_block}\n\nQuestion: {user_message}",
    })
    return messages


def _trim_chunks(chunks: list[dict], user_message: str) -> list[dict]:
    """Trim retrieved chunks to fit within llm_context_limit if set."""
    limit = settings.llm_context_limit
    if limit <= 0 or not chunks:
        return chunks

    # Reserve tokens: system prompt + user question + max_tokens output + overhead
    # Rough estimate: 1 token ≈ 4 chars
    system_chars = len(SYSTEM_PROMPT)
    question_chars = len(user_message)
    overhead_chars = 300  # labels, separators, formatting
    output_reserve_chars = settings.llm_max_tokens * 4
    budget_chars = (limit * 4) - system_chars - question_chars - overhead_chars - output_reserve_chars

    if budget_chars <= 0:
        return chunks[:1]

    result = []
    used = 0
    for chunk in chunks:
        text = chunk.get("text", "")
        if used + len(text) <= budget_chars:
            result.append(chunk)
            used += len(text)
        elif not result:
            # Always include at least one chunk, truncated
            truncated = dict(chunk)
            truncated["text"] = text[: budget_chars] + "…"
            result.append(truncated)
            break
        else:
            # Partially fit remaining budget
            remaining = budget_chars - used
            if remaining > 200:
                truncated = dict(chunk)
                truncated["text"] = text[:remaining] + "…"
                result.append(truncated)
            break

    return result
