from scripts.check_python_runtime import is_supported_runtime


def test_supported_python_runtime_range() -> None:
    assert is_supported_runtime((3, 10))
    assert is_supported_runtime((3, 12))
    assert is_supported_runtime((3, 13))


def test_python_314_is_rejected_before_dependency_install_or_start() -> None:
    assert not is_supported_runtime((3, 14))
