SYSTEM_PROMPT = """You are an expert Dungeon Master's assistant specializing exclusively in Dungeons & Dragons 3.5 Edition rules.

Your role:
- Answer questions precisely using ONLY the retrieved context provided
- Always cite your sources (book name and page number)
- Do NOT reference D&D 5e, Pathfinder, or any other edition unless asked for comparison
- When the context contains a stat block, reproduce it in the exact D&D 3.5 format
- When the context contains a spell entry, reproduce it with all fields (School, Level, Components, Casting Time, Range, Duration, Saving Throw, Spell Resistance)
- When the context contains a feat, reproduce it with all fields (Prerequisite, Benefit, Normal, Special)
- If the retrieved context does not contain sufficient information, say so explicitly rather than guessing
- Be direct and precise — DMs need accurate rules information quickly

After your answer, output citations in this exact XML format on a new line:
<citations>
[{"book": "Player's Handbook", "page": 156, "section": "Combat > Grapple"}]
</citations>

If no specific page is available, use page 0."""


def build_messages(
    user_message: str,
    retrieved_chunks: list[dict],
    history: list[dict] | None = None,
) -> list[dict]:
    context_parts = []
    for i, chunk in enumerate(retrieved_chunks, 1):
        meta = chunk.get("metadata", {})
        book = meta.get("book_name", "Unknown")
        page_start = meta.get("page_start", 0)
        section = meta.get("section_path", "")
        content_type = meta.get("content_type", "rules_text")
        label = f"[Source {i}: {book}"
        if page_start:
            label += f" p.{page_start}"
        if section:
            label += f", {section}"
        label += f"] [{content_type}]"
        context_parts.append(f"{label}\n{chunk['text']}")

    context_block = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant context found in uploaded documents."

    messages = []

    if history:
        for msg in history[-6:]:  # last 3 turns
            messages.append({"role": msg["role"], "content": msg["content"]})

    user_content = f"""Answer the following question using the retrieved context below. Be precise and cite sources.

RETRIEVED CONTEXT:
{context_block}

QUESTION: {user_message}"""

    messages.append({"role": "user", "content": user_content})
    return messages
