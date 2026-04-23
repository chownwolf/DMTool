"""
D&D-aware chunking state machine.

Stat blocks, spell entries, and feat entries are kept as single chunks.
Prose is split at heading/paragraph boundaries with overlap.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional


SIZES = r"(Fine|Diminutive|Tiny|Small|Medium|Large|Huge|Gargantuan|Colossal)"
CREATURE_TYPES = r"(Aberration|Animal|Construct|Dragon|Elemental|Fey|Giant|Humanoid|Magical Beast|Monstrous Humanoid|Ooze|Outsider|Plant|Undead|Vermin)"
SCHOOLS = r"(Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation|Universal)"

_STAT_BLOCK_START = re.compile(
    rf"^[A-Z][A-Z\s,]+$",  # ALL CAPS creature name
)
_STAT_BLOCK_SIZE_TYPE = re.compile(
    rf"^{SIZES}\s+{CREATURE_TYPES}",
    re.IGNORECASE,
)
_STAT_BLOCK_HIT_DICE = re.compile(r"^Hit Dice:", re.IGNORECASE)
_STAT_BLOCK_FIELDS = re.compile(
    r"^(Hit Dice|Initiative|Speed|Armor Class|Base Attack|Attack|Full Attack|"
    r"Space/Reach|Special Attacks|Special Qualities|Saves|Abilities|Skills|"
    r"Feats|Environment|Organization|Challenge Rating|Treasure|Alignment|Advancement|"
    r"Level Adjustment):",
    re.IGNORECASE,
)

_SPELL_SCHOOL_LINE = re.compile(rf"^{SCHOOLS}", re.IGNORECASE)
_SPELL_LEVEL_LINE = re.compile(r"^Level:", re.IGNORECASE)

_FEAT_TYPE_TAG = re.compile(r"^\[[\w\s]+ Feat\]", re.IGNORECASE)
_FEAT_PREREQ = re.compile(r"^Prerequisite", re.IGNORECASE)
_FEAT_BENEFIT = re.compile(r"^Benefit:", re.IGNORECASE)

_HEADING_STYLES = {"Heading 1", "Heading 2", "Heading 3", "Heading 4"}

MAX_CHUNK_CHARS = 2400  # ~600 tokens
OVERLAP_CHARS = 100


class State(Enum):
    NORMAL = auto()
    STAT_BLOCK = auto()
    SPELL_ENTRY = auto()
    FEAT_ENTRY = auto()


@dataclass
class Chunk:
    text: str
    page_start: int
    page_end: int
    section_path: str
    content_type: str
    chunk_index: int


@dataclass
class _Block:
    text: str
    page_num: int
    is_heading: bool = False
    heading_level: int = 0
    is_table: bool = False
    style_name: str = "Normal"


def _is_heading(block) -> tuple[bool, int]:
    """Return (is_heading, level) for a parsed block."""
    style = getattr(block, "style_name", "Normal")
    if style in _HEADING_STYLES:
        level = int(style.split()[-1]) if style != "Normal" else 0
        return True, level
    # Detect headings in PDFs by font size threshold
    font_size = getattr(block, "font_size", 12.0)
    is_bold = getattr(block, "is_bold", False)
    if font_size >= 16 and is_bold:
        return True, 1
    if font_size >= 14 and is_bold:
        return True, 2
    if font_size >= 12.5 and is_bold and len(block.text) < 80:
        return True, 3
    return False, 0


def chunk_blocks(blocks: list, book_name: str = "") -> list[Chunk]:
    state = State.NORMAL
    heading_stack: list[str] = []
    buffer: list[str] = []
    buffer_pages: list[int] = []
    chunks: list[Chunk] = []
    chunk_index = 0

    # Look-ahead window for stat block detection
    texts = [b.text for b in blocks]

    def section_path() -> str:
        return " > ".join(heading_stack) if heading_stack else book_name

    def flush_buffer(content_type: str = "rules_text") -> None:
        nonlocal chunk_index
        combined = "\n\n".join(buffer).strip()
        if not combined:
            buffer.clear()
            buffer_pages.clear()
            return
        # Split prose at size threshold
        if content_type == "rules_text" and len(combined) > MAX_CHUNK_CHARS:
            for sub in _split_prose(combined, buffer_pages):
                chunks.append(Chunk(
                    text=sub["text"],
                    page_start=sub["page_start"],
                    page_end=sub["page_end"],
                    section_path=section_path(),
                    content_type=content_type,
                    chunk_index=chunk_index,
                ))
                chunk_index += 1
        else:
            chunks.append(Chunk(
                text=combined,
                page_start=buffer_pages[0] if buffer_pages else 0,
                page_end=buffer_pages[-1] if buffer_pages else 0,
                section_path=section_path(),
                content_type=content_type,
                chunk_index=chunk_index,
            ))
            chunk_index += 1
        buffer.clear()
        buffer_pages.clear()

    i = 0
    while i < len(blocks):
        block = blocks[i]
        text = block.text.strip()
        page = getattr(block, "page_num", 0)
        is_tbl = getattr(block, "is_table", False)

        if is_tbl:
            flush_buffer()
            chunks.append(Chunk(
                text=text,
                page_start=page,
                page_end=page,
                section_path=section_path(),
                content_type="table",
                chunk_index=chunk_index,
            ))
            chunk_index += 1
            i += 1
            continue

        is_hdg, hdg_level = _is_heading(block)

        # --- STAT BLOCK detection ---
        if state == State.NORMAL and i + 1 < len(blocks):
            next_text = blocks[i + 1].text.strip()
            if (_STAT_BLOCK_START.match(text) and
                    (_STAT_BLOCK_SIZE_TYPE.match(next_text) or _STAT_BLOCK_HIT_DICE.match(next_text))):
                flush_buffer()
                state = State.STAT_BLOCK
                buffer.append(text)
                buffer_pages.append(page)
                i += 1
                continue

        if state == State.STAT_BLOCK:
            if is_hdg or (_STAT_BLOCK_START.match(text) and i + 1 < len(blocks) and
                          (_STAT_BLOCK_SIZE_TYPE.match(blocks[i + 1].text.strip()) or
                           _STAT_BLOCK_HIT_DICE.match(blocks[i + 1].text.strip()))):
                flush_buffer("stat_block")
                state = State.NORMAL
                # re-process current block as potential new stat block start
                continue
            buffer.append(text)
            buffer_pages.append(page)
            i += 1
            continue

        # --- SPELL ENTRY detection ---
        if state == State.NORMAL and i + 1 < len(blocks):
            next_text = blocks[i + 1].text.strip() if i + 1 < len(blocks) else ""
            if _SPELL_SCHOOL_LINE.match(next_text) and not is_hdg:
                # Current block = spell name, next = school line
                look_ahead_2 = blocks[i + 2].text.strip() if i + 2 < len(blocks) else ""
                if _SPELL_LEVEL_LINE.match(look_ahead_2) or _SPELL_LEVEL_LINE.match(next_text):
                    flush_buffer()
                    state = State.SPELL_ENTRY
                    buffer.append(text)
                    buffer_pages.append(page)
                    i += 1
                    continue

        if state == State.SPELL_ENTRY:
            if is_hdg or (not _spell_continuation(text) and len(buffer) > 4):
                flush_buffer("spell")
                state = State.NORMAL
                continue
            buffer.append(text)
            buffer_pages.append(page)
            i += 1
            continue

        # --- FEAT ENTRY detection ---
        if state == State.NORMAL and i + 1 < len(blocks):
            next_text = blocks[i + 1].text.strip() if i + 1 < len(blocks) else ""
            if _FEAT_TYPE_TAG.match(next_text) or _FEAT_PREREQ.match(next_text):
                flush_buffer()
                state = State.FEAT_ENTRY
                buffer.append(text)
                buffer_pages.append(page)
                i += 1
                continue

        if state == State.FEAT_ENTRY:
            if is_hdg or (not _feat_continuation(text) and len(buffer) > 5):
                flush_buffer("feat")
                state = State.NORMAL
                continue
            buffer.append(text)
            buffer_pages.append(page)
            i += 1
            continue

        # --- NORMAL prose / headings ---
        if is_hdg:
            flush_buffer()
            # Update heading stack
            if hdg_level == 1:
                heading_stack.clear()
                heading_stack.append(text)
            elif hdg_level == 2:
                if len(heading_stack) > 1:
                    heading_stack.pop()
                elif len(heading_stack) == 0:
                    heading_stack.append("")
                heading_stack.append(text)
            else:
                heading_stack.append(text)
            i += 1
            continue

        buffer.append(text)
        buffer_pages.append(page)
        i += 1

    # Flush remaining buffer
    type_map = {
        State.STAT_BLOCK: "stat_block",
        State.SPELL_ENTRY: "spell",
        State.FEAT_ENTRY: "feat",
        State.NORMAL: "rules_text",
    }
    flush_buffer(type_map[state])
    return chunks


def _spell_continuation(text: str) -> bool:
    return bool(re.match(
        r"^(Level|Components|Casting Time|Range|Area|Target|Duration|Saving Throw|Spell Resistance|Effect):?",
        text, re.IGNORECASE,
    )) or len(text) > 30


def _feat_continuation(text: str) -> bool:
    return bool(re.match(
        r"^(Prerequisite|Benefit|Normal|Special|\[[\w\s]+ Feat\]):?",
        text, re.IGNORECASE,
    )) or len(text) > 30


def _split_prose(text: str, pages: list[int]) -> list[dict]:
    """Split oversized prose at paragraph then sentence boundaries with overlap."""
    result = []
    start = 0
    total = len(text)
    page_start = pages[0] if pages else 0
    page_end = pages[-1] if pages else 0

    while start < total:
        end = min(start + MAX_CHUNK_CHARS, total)
        if end < total:
            # Try paragraph boundary
            para_pos = text.rfind("\n\n", start, end)
            if para_pos > start + OVERLAP_CHARS:
                end = para_pos
            else:
                # Try sentence boundary
                for sep in (". ", "! ", "? ", ".\n"):
                    pos = text.rfind(sep, start, end)
                    if pos > start + OVERLAP_CHARS:
                        end = pos + 1
                        break

        chunk_text = text[start:end].strip()
        if chunk_text:
            result.append({"text": chunk_text, "page_start": page_start, "page_end": page_end})
        start = max(end - OVERLAP_CHARS, end)

    return result
