import sys
import os
import pytest

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.storage.store import init_file_storage


@pytest.fixture(scope="session", autouse=True)
def setup_test_storage():
    init_file_storage()
