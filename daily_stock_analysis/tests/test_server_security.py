"""Regression coverage for the legacy ASGI server entry point."""

import os
from pathlib import Path
import subprocess
import sys


def test_server_entrypoint_requires_preprovisioned_auth() -> None:
    source = (Path(__file__).parents[1] / "server.py").read_text(encoding="utf-8")

    guard = 'ensure_public_webui_is_provisioned("0.0.0.0")'
    assert guard in source
    assert source.index(guard) < source.index("from api.app import app")


def test_server_import_fails_closed_without_auth(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("ADMIN_AUTH_ENABLED=false\n", encoding="utf-8")
    env = {
        **os.environ,
        "ENV_FILE": str(env_file),
        "DATABASE_PATH": str(tmp_path / "stock_analysis.db"),
    }

    result = subprocess.run(
        [sys.executable, "-c", "import server"],
        cwd=Path(__file__).parents[1],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "administrator authentication is not fully provisioned" in result.stderr


def test_webui_compatibility_launcher_fails_closed_without_auth(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("ADMIN_AUTH_ENABLED=false\n", encoding="utf-8")
    env = {
        **os.environ,
        "ENV_FILE": str(env_file),
        "DATABASE_PATH": str(tmp_path / "stock_analysis.db"),
        "WEBUI_HOST": "0.0.0.0",
    }

    result = subprocess.run(
        [sys.executable, "webui.py"],
        cwd=Path(__file__).parents[1],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "administrator authentication is not fully provisioned" in result.stderr
