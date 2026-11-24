"""Refresh the explicit credential-free source copy after application edits."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
files = {}
for path in (root / "src").rglob("*"):
    if path.is_file() and path.suffix in (".ts", ".tsx", ".css"):
        files[str(path.relative_to(root))] = path.read_text()
for name in ("package.json", "bun.lock", "tsconfig.json", "vite.config.ts", "vitest.config.ts", "components.json", "bunfig.toml", "public/robots.txt", "scripts/refresh-source-copy.py"):
    files[name] = (root / name).read_text()
out = root / "src/lib/source-copy.json"
out.write_text(json.dumps(files, ensure_ascii=False))
print(f"Refreshed source copy: {len(files)} files; no environment files or account data")