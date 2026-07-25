#!/usr/bin/env python3
"""Fail early on Python runtimes unsupported by the dependency contract."""

from __future__ import annotations

import sys
from collections.abc import Sequence


MINIMUM = (3, 10)
MAXIMUM_EXCLUSIVE = (3, 14)


def is_supported_runtime(version: Sequence[int]) -> bool:
    normalized = tuple(version[:2])
    return MINIMUM <= normalized < MAXIMUM_EXCLUSIVE


def main() -> int:
    current = sys.version_info[:2]
    if is_supported_runtime(current):
        print(f"Supported Python runtime: {current[0]}.{current[1]}")
        return 0
    print(
        "Unsupported Python runtime: "
        f"{current[0]}.{current[1]}. Use Python 3.10 through 3.13; "
        "the pinned tiktoken/PyO3 dependency chain does not support Python 3.14.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
