import re
import unicodedata


# Common ligature substitutions found in scanned PDFs
_LIGATURES = {
    "ﬀ": "ff",
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
    "ﬅ": "st",
    "ﬆ": "st",
}

_LIGATURE_TABLE = str.maketrans(_LIGATURES)

# Soft hyphen at line break: "re-\nsult" → "result"
_HYPHEN_BREAK = re.compile(r"(\w+)-\n(\w+)")

# Multiple spaces → single space
_MULTI_SPACE = re.compile(r" {2,}")

# More than two consecutive newlines → two newlines
_MULTI_NEWLINE = re.compile(r"\n{3,}")


def clean_text(text: str) -> str:
    text = text.translate(_LIGATURE_TABLE)
    text = unicodedata.normalize("NFKC", text)
    text = _HYPHEN_BREAK.sub(r"\1\2", text)
    text = _MULTI_SPACE.sub(" ", text)
    text = _MULTI_NEWLINE.sub("\n\n", text)
    return text.strip()
