#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["pypdf"]
# ///
"""
check-sensitive.py: fail if the site would publish contact details it should not.

Usage:
    scripts/check-sensitive.py               # every tracked file
    scripts/check-sensitive.py dist x.pdf    # these files and folders

Two addresses belong on the site: aldo@sideband.studio and the studio's
hello@sideband.studio. Any other email address fails, and so does anything shaped
like a phone number. PDFs are read for their text, link targets and metadata,
since that is where a resume keeps its contact line.

Hits are printed masked. This repo's Actions logs are public, so a check that
echoed what it found would publish it.

Python rather than Node because the Resume repo's portfolio.yml runs this on the
resume PDF before pushing it here, and pypdf is already in that pipeline. Without
uv, `pip install pypdf` and run it with python3, which is what CI does.
"""

import re
import subprocess
import sys
from pathlib import Path

ALLOWED_EMAILS = {
    "aldo@sideband.studio",
    "hello@sideband.studio",
    "local@vertex.co",  # not an address: Python's @ operator in scripts/blender/hood_and_details.py
}
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}")
# (NNN) NNN-NNNN, NNN-NNN-NNNN, NNN.NNN.NNNN, +1 NNN NNN NNNN, and tel: links.
PHONE = re.compile(
    r"(?<![\w.])(?:\+\d{1,3}[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]\d{4}(?![\w.])|tel:\+?\d[\d().-]*",
    re.IGNORECASE,
)


def files(args):
    if not args:
        out = subprocess.run(["git", "ls-files", "-z"], capture_output=True, text=True, check=True).stdout
        return [Path(p) for p in out.split("\0") if p]
    paths = []
    for arg in map(Path, args):
        if not arg.exists():
            sys.exit(f"FAIL: {arg} does not exist, so there is nothing to check")
        paths +=sorted(p for p in arg.rglob("*") if p.is_file()) if arg.is_dir() else [arg]
    return paths


def pdf_text(path):
    from pypdf import PdfReader

    reader = PdfReader(path)
    parts = [page.extract_text() or "" for page in reader.pages]
    for page in reader.pages:
        for annot in page.get("/Annots") or []:
            uri = annot.get_object().get("/A", {}).get("/URI")
            if uri:
                parts.append(str(uri))
    parts += [str(value) for value in (reader.metadata or {}).values()]
    return "\n".join(parts)


def mask(kind, value):
    if kind == "email":
        local, _, domain = value.partition("@")
        return f"{local[0]}***@{domain}"
    return "ending " + re.sub(r"\D", "", value)[-2:]


def main():
    hits = []
    for path in files(sys.argv[1:]):
        if not path.is_file():
            continue
        if path.suffix.lower() == ".pdf":
            text = pdf_text(path)
        else:
            data = path.read_bytes()
            if b"\0" in data[:8192]:
                continue  # images, models, fonts, audio
            text = data.decode("utf-8", errors="ignore")
        for kind, pattern in (("email", EMAIL), ("phone", PHONE)):
            for m in pattern.finditer(text):
                if kind == "email" and m.group(0).lower() in ALLOWED_EMAILS:
                    continue
                line = text.count("\n", 0, m.start()) + 1
                hits.append(f"{path}:{line}: {kind} {mask(kind, m.group(0))}")

    if hits:
        print("\n".join(hits))
        print(f"FAIL: {len(hits)} contact detail(s) that should not be public. "
              "Only aldo@sideband.studio and hello@sideband.studio belong on the site, and no phone numbers.")
        sys.exit(1)
    print("sensitive check: OK")


if __name__ == "__main__":
    main()
