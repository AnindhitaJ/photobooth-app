#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ERRORS: list[str] = []
WARNINGS: list[str] = []
COUNTS = {"js": 0, "json": 0, "html": 0, "core_assets": 0, "rewrites": 0, "hashes": 0}


def error(message: str) -> None:
    ERRORS.append(message)


def warn(message: str) -> None:
    WARNINGS.append(message)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def check_required_files() -> None:
    required = [
        "package.json", "manifest.json", "vercel.json", "sw.js", "auth.js",
        "config.js", "app.html", "camera.html", "login.html", "icon-192.png",
        "icon-512.png", "scripts/validate_repo.py"
    ]
    for relative in required:
        if not (ROOT / relative).is_file():
            error(f"File wajib tidak ditemukan: {relative}")


def check_javascript() -> None:
    for path in sorted(ROOT.rglob("*.js")):
        COUNTS["js"] += 1
        result = subprocess.run(
            ["node", "--check", str(path)],
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout).strip()
            error(f"Sintaks JavaScript gagal: {path.relative_to(ROOT)}\n{detail}")


def check_json() -> None:
    for path in sorted(ROOT.rglob("*.json")):
        COUNTS["json"] += 1
        try:
            json.loads(read_text(path))
        except Exception as exc:
            error(f"JSON tidak valid: {path.relative_to(ROOT)} — {exc}")


class StrictEnoughHTMLParser(HTMLParser):
    pass


def check_html() -> None:
    for path in sorted(ROOT.rglob("*.html")):
        COUNTS["html"] += 1
        try:
            parser = StrictEnoughHTMLParser()
            parser.feed(read_text(path))
            parser.close()
        except Exception as exc:
            error(f"HTML gagal diparse: {path.relative_to(ROOT)} — {exc}")


def js_array_strings(source: str, variable_name: str) -> list[str]:
    match = re.search(
        rf"const\s+{re.escape(variable_name)}\s*=\s*\[(.*?)\]\s*;",
        source,
        flags=re.DOTALL,
    )
    if not match:
        error(f"Array {variable_name} tidak ditemukan di sw.js")
        return []
    return re.findall(r"['\"]([^'\"]+)['\"]", match.group(1))


def route_to_file(route: str) -> Path:
    if route == "/":
        return ROOT / "index.html"
    return ROOT / route.lstrip("/")


def check_service_worker() -> None:
    sw_path = ROOT / "sw.js"
    if not sw_path.is_file():
        return
    sw = read_text(sw_path)
    assets = js_array_strings(sw, "CORE_ASSETS")
    COUNTS["core_assets"] = len(assets)
    if not assets:
        return

    for asset in assets:
        if "?" in asset or "#" in asset:
            warn(f"CORE_ASSETS sebaiknya tanpa query/hash: {asset}")
        local_path = route_to_file(asset)
        if not local_path.is_file():
            error(f"Aset precache tidak ditemukan: {asset} -> {local_path.relative_to(ROOT)}")

    if "Promise.allSettled" in sw:
        error("sw.js masih memakai Promise.allSettled untuk precache; instalasi dapat menjadi parsial.")
    if "await Promise.all(CORE_ASSETS.map" not in sw:
        error("sw.js tidak terlihat memakai precache atomik Promise.all.")
    if "throw error" not in sw:
        warn("Tidak menemukan kegagalan eksplisit untuk aset dinamis di sw.js.")
    if re.search(r"assetNetworkFirst[\s\S]{0,1800}login\.html", sw):
        error("assetNetworkFirst tampak memiliki fallback HTML login untuk aset dinamis.")


def check_vercel_routes() -> None:
    path = ROOT / "vercel.json"
    if not path.is_file():
        return
    try:
        config = json.loads(read_text(path))
    except Exception:
        return

    rewrites = config.get("rewrites", [])
    COUNTS["rewrites"] = len(rewrites)
    source_to_destination: dict[str, str] = {}
    for rule in rewrites:
        source = rule.get("source")
        destination = rule.get("destination")
        if not isinstance(source, str) or not isinstance(destination, str):
            error(f"Rewrite tidak lengkap: {rule}")
            continue
        source_to_destination[source] = destination
        if destination.startswith("/") and not route_to_file(destination).is_file():
            error(f"Target rewrite tidak ditemukan: {source} -> {destination}")

    try:
        manifest = json.loads(read_text(ROOT / "manifest.json"))
        start_url = manifest.get("start_url")
        if isinstance(start_url, str) and start_url.startswith("/"):
            if start_url not in source_to_destination and not route_to_file(start_url).is_file():
                error(f"start_url manifest tidak memiliki file/rewrite: {start_url}")
    except Exception:
        pass


def png_dimensions(path: Path) -> tuple[int, int] | None:
    try:
        data = path.read_bytes()
        if data[:8] != b"\x89PNG\r\n\x1a\n" or len(data) < 24:
            return None
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    except Exception:
        return None


def check_manifest_icons() -> None:
    path = ROOT / "manifest.json"
    if not path.is_file():
        return
    try:
        manifest = json.loads(read_text(path))
    except Exception:
        return

    for icon in manifest.get("icons", []):
        src = icon.get("src")
        sizes = icon.get("sizes")
        if not isinstance(src, str):
            error(f"Icon manifest tanpa src valid: {icon}")
            continue
        icon_path = route_to_file(src)
        if not icon_path.is_file():
            error(f"Icon manifest tidak ditemukan: {src}")
            continue
        if icon_path.suffix.lower() == ".png" and isinstance(sizes, str) and "x" in sizes:
            expected = tuple(int(value) for value in sizes.split("x", 1))
            actual = png_dimensions(icon_path)
            if actual and actual != expected:
                error(f"Ukuran icon berbeda: {src}, manifest={expected}, file={actual}")


def check_hash_manifest() -> None:
    path = ROOT / "FILE_MANIFEST.sha256"
    if not path.is_file():
        warn("FILE_MANIFEST.sha256 tidak ditemukan.")
        return
    for line_number, raw in enumerate(read_text(path).splitlines(), start=1):
        if not raw.strip():
            continue
        try:
            expected, relative = raw.split("  ", 1)
        except ValueError:
            error(f"Format hash manifest tidak valid pada baris {line_number}")
            continue
        file_path = ROOT / relative
        if not file_path.is_file():
            error(f"File dalam hash manifest hilang: {relative}")
            continue
        actual = hashlib.sha256(file_path.read_bytes()).hexdigest()
        COUNTS["hashes"] += 1
        if actual != expected:
            error(f"Hash berubah/tidak cocok: {relative}")


def main() -> int:
    check_required_files()
    check_javascript()
    check_json()
    check_html()
    check_service_worker()
    check_vercel_routes()
    check_manifest_icons()
    check_hash_manifest()

    print("LUX Photobooth repository validation")
    print(
        "Checked: "
        f"{COUNTS['js']} JS, {COUNTS['json']} JSON, {COUNTS['html']} HTML, "
        f"{COUNTS['core_assets']} precache assets, {COUNTS['rewrites']} rewrites, "
        f"{COUNTS['hashes']} file hashes."
    )
    for message in WARNINGS:
        print(f"WARNING: {message}")
    if ERRORS:
        for message in ERRORS:
            print(f"ERROR: {message}")
        print(f"FAILED: {len(ERRORS)} error(s), {len(WARNINGS)} warning(s).")
        return 1
    print(f"PASSED: 0 errors, {len(WARNINGS)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
