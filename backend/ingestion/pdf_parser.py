from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF


@dataclass
class ParsedBlock:
    text: str
    page_num: int
    font_size: float = 12.0
    is_bold: bool = False
    is_table: bool = False
    bbox: tuple = field(default_factory=lambda: (0, 0, 0, 0))


def parse_pdf(path: Path) -> tuple[list[ParsedBlock], int]:
    doc = fitz.open(str(path))
    blocks: list[ParsedBlock] = []
    page_count = len(doc)

    for page_num, page in enumerate(doc, start=1):
        raw = page.get_text("dict")
        page_blocks = raw.get("blocks", [])

        for block in page_blocks:
            if block.get("type") == 1:
                # image block — skip
                continue

            lines_text = []
            max_font_size = 0.0
            is_bold = False

            for line in block.get("lines", []):
                line_text = ""
                for span in line.get("spans", []):
                    span_text = span.get("text", "").strip()
                    if span_text:
                        line_text += span_text + " "
                        size = span.get("size", 12.0)
                        if size > max_font_size:
                            max_font_size = size
                        flags = span.get("flags", 0)
                        if flags & 2**4:  # bold flag
                            is_bold = True
                if line_text.strip():
                    lines_text.append(line_text.strip())

            text = "\n".join(lines_text).strip()
            if text:
                blocks.append(ParsedBlock(
                    text=text,
                    page_num=page_num,
                    font_size=max_font_size,
                    is_bold=is_bold,
                    bbox=tuple(block.get("bbox", (0, 0, 0, 0))),
                ))

    doc.close()
    return blocks, page_count
