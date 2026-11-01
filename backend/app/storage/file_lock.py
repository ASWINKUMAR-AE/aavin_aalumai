import os
import time
import errno
from typing import Optional
from app.core.logging import logger


class FileLockException(Exception):
    """Raised when acquiring a file lock fails or times out."""
    pass


class FileLock:
    """
    Cross-platform file-based lock with timeout, retries, and stale lock reclamation.
    Protects concurrent read-modify-write operations in database-free file persistence.
    """
    def __init__(self, target_filepath: str, timeout_seconds: float = 10.0, poll_interval: float = 0.05, max_stale_seconds: float = 60.0):
        self.target_filepath = os.path.abspath(target_filepath)
        self.lock_filepath = f"{self.target_filepath}.lock"
        self.timeout_seconds = timeout_seconds
        self.poll_interval = poll_interval
        self.max_stale_seconds = max_stale_seconds
        self._fd: Optional[int] = None

    def acquire(self) -> bool:
        start_time = time.time()
        while True:
            try:
                # Ensure parent directory exists
                parent_dir = os.path.dirname(self.lock_filepath)
                if parent_dir and not os.path.exists(parent_dir):
                    os.makedirs(parent_dir, exist_ok=True)

                # O_EXCL ensures atomic creation. If file exists, raises OSError
                self._fd = os.open(self.lock_filepath, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                # Write current timestamp and process ID into lockfile
                lock_info = f"pid={os.getpid()};time={time.time()}\n".encode("utf-8")
                os.write(self._fd, lock_info)
                return True
            except OSError as e:
                if e.errno in (errno.EEXIST, 17):
                    # Check for stale lock
                    try:
                        mtime = os.path.getmtime(self.lock_filepath)
                        if (time.time() - mtime) > self.max_stale_seconds:
                            logger.warning(f"Reclaiming stale file lock on: {self.lock_filepath}")
                            try:
                                os.remove(self.lock_filepath)
                            except OSError:
                                pass
                    except OSError:
                        pass

                    if (time.time() - start_time) >= self.timeout_seconds:
                        raise FileLockException(
                            f"Timeout waiting for file lock: {self.lock_filepath} after {self.timeout_seconds}s"
                        )
                    time.sleep(self.poll_interval)
                else:
                    raise FileLockException(f"Failed to acquire file lock: {e}")

    def release(self):
        if self._fd is not None:
            try:
                os.close(self._fd)
            except OSError:
                pass
            self._fd = None

        if os.path.exists(self.lock_filepath):
            try:
                os.remove(self.lock_filepath)
            except OSError:
                pass

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
