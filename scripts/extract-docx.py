#!/usr/bin/env python3
"""
Extract the 60 Q&A pairs from FAQs.docx into data/source-hi.json, VERBATIM.

The Hindi text is an approved police advisory, so it is never rewritten. This
script is the single point where it enters the codebase; re-run it if the
department issues an updated document.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCX = ROOT / "FAQs.docx"
OUT = ROOT / "data" / "source-hi.json"

ENTITIES = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
}


def paragraphs(xml: str):
    for para in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
        text = "".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", para, re.S))
        for ent, ch in ENTITIES.items():
            text = text.replace(ent, ch)
        yield text.strip()


def main() -> int:
    if not DOCX.exists():
        print(f"missing {DOCX}", file=sys.stderr)
        return 1

    with zipfile.ZipFile(DOCX) as z:
        xml = z.read("word/document.xml").decode("utf-8")

    lines = [p for p in paragraphs(xml) if p]

    # Questions are numbered "1. ...", answers are the paragraph that follows.
    entries = []
    i = 0
    while i < len(lines):
        m = re.match(r"^(\d+)\.\s*(.+)$", lines[i])
        if m and i + 1 < len(lines):
            number = int(m.group(1))
            question = re.sub(r"\s+", " ", m.group(2)).strip()
            answer = re.sub(r"\s+", " ", lines[i + 1]).strip()
            entries.append(
                {"id": f"faq-{number:02d}", "number": number,
                 "questionHi": question, "answerHi": answer}
            )
            i += 2
        else:
            i += 1

    seen = {e["number"] for e in entries}
    gaps = sorted(set(range(1, max(seen) + 1)) - seen) if seen else []
    if gaps:
        print(f"WARNING: missing question numbers {gaps}", file=sys.stderr)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"extracted {len(entries)} Q&A pairs -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
