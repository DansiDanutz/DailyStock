"""Fail-closed security checks for Web UI/API service bindings."""

from __future__ import annotations

import ipaddress


_LOOPBACK_BIND_NAMES = frozenset({"localhost", "ip6-localhost"})


def is_non_loopback_bind(host: str) -> bool:
    """Return whether *host* may expose the service beyond this machine."""
    normalized = (host or "").strip().lower().strip("[]")
    if normalized in _LOOPBACK_BIND_NAMES:
        return False
    try:
        return not ipaddress.ip_address(normalized).is_loopback
    except ValueError:
        # Unknown hostnames may resolve externally, so fail closed.
        return True


def ensure_public_webui_is_provisioned(host: str) -> None:
    """Require enabled auth and an existing credential for non-loopback binds."""
    if not is_non_loopback_bind(host):
        return

    from src.auth import has_stored_password, is_auth_enabled

    if is_auth_enabled() and has_stored_password():
        return
    raise RuntimeError(
        f"WEBUI_HOST={host} binds the Web UI/API to a non-loopback interface, "
        "but administrator authentication is not fully provisioned. Set "
        "ADMIN_AUTH_ENABLED=true and create the credential out of band with "
        "`python -m src.auth reset_password`, or bind to "
        "127.0.0.1/::1 behind a trusted local proxy."
    )
