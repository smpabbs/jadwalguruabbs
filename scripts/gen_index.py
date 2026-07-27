import json
import os

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
DATA_PATH = os.path.join(BASE, "scratch_all_teachers.json")

TARGETS = [
    os.path.join(ROOT, "index.html"),
    os.path.join(ROOT, "www", "index.html"),
]

with open(DATA_PATH, encoding="utf-8") as f:
    data = json.load(f)

new_data_line = "var DATA = " + json.dumps(data, ensure_ascii=False) + ";"

for path in TARGETS:
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    hit = None
    for i, line in enumerate(lines):
        if line.startswith("var DATA = "):
            hit = i
            break
    if hit is None:
        raise RuntimeError(f"var DATA line not found in {path}")

    # PIKET (and everything else) is left completely untouched — only the DATA line is replaced.
    lines[hit] = new_data_line + "\n"

    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("updated:", path)
