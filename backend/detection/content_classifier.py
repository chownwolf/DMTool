"""
Classify LLM response as stat_block, spell, feat, or rules_text.
Also parses the <citations> block from the response.
"""
from __future__ import annotations

import json
import re
from typing import Optional

STAT_BLOCK_SIGNALS = [
    re.compile(r"Hit Dice:\s+\d+d\d+", re.IGNORECASE),
    re.compile(r"Initiative:\s+[+-]\d+", re.IGNORECASE),
    re.compile(r"Speed:\s+\d+ ft\.", re.IGNORECASE),
    re.compile(r"Armor Class:\s+\d+", re.IGNORECASE),
    re.compile(r"Base Attack[/\s]Grapple:", re.IGNORECASE),
    re.compile(r"^Attack:\s+", re.IGNORECASE | re.MULTILINE),
    re.compile(r"Full Attack:\s+", re.IGNORECASE),
    re.compile(r"Space/Reach:", re.IGNORECASE),
    re.compile(r"Saves:\s+Fort", re.IGNORECASE),
    re.compile(r"Abilities:\s+Str\s+\d+", re.IGNORECASE),
    re.compile(r"Challenge Rating:\s+\d+", re.IGNORECASE),
    re.compile(r"Alignment:\s+(Lawful|Neutral|Chaotic|Always|Usually)", re.IGNORECASE),
]

SPELL_SIGNALS = [
    re.compile(r"(Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation)", re.IGNORECASE),
    re.compile(r"Level:\s+(Sor|Wiz|Clr|Drd|Pal|Rgr|Brd|Asn)\s*/?\s*\d", re.IGNORECASE),
    re.compile(r"Casting Time:", re.IGNORECASE),
    re.compile(r"Range:\s+(Personal|Touch|Close|Medium|Long|Unlimited|\d+)", re.IGNORECASE),
    re.compile(r"^Duration:", re.IGNORECASE | re.MULTILINE),
    re.compile(r"Saving Throw:", re.IGNORECASE),
    re.compile(r"Spell Resistance:", re.IGNORECASE),
]

FEAT_SIGNALS = [
    re.compile(r"\[[\w\s]+ Feat\]", re.IGNORECASE),
    re.compile(r"Prerequisite[s]?:", re.IGNORECASE),
    re.compile(r"^Benefit:", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^Normal:", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^Special:", re.IGNORECASE | re.MULTILINE),
]

CITATIONS_RE = re.compile(r"<citations>\s*(.*?)\s*</citations>", re.DOTALL)


def classify_response(text: str) -> tuple[str, str, list[dict]]:
    """
    Returns (content_type, clean_text, citations).
    clean_text has the <citations> block stripped.
    """
    citations = _extract_citations(text)
    clean = CITATIONS_RE.sub("", text).strip()

    stat_score = sum(1 for p in STAT_BLOCK_SIGNALS if p.search(text))
    spell_score = sum(1 for p in SPELL_SIGNALS if p.search(text))
    feat_score = sum(1 for p in FEAT_SIGNALS if p.search(text))

    if stat_score >= 5:
        return "stat_block", clean, citations
    if spell_score >= 4:
        return "spell", clean, citations
    if feat_score >= 3:
        return "feat", clean, citations
    return "rules_text", clean, citations


def _extract_citations(text: str) -> list[dict]:
    match = CITATIONS_RE.search(text)
    if not match:
        return []
    try:
        data = json.loads(match.group(1))
        if isinstance(data, list):
            return data
        return []
    except (json.JSONDecodeError, ValueError):
        return []
