import os
import json
import uuid
import tempfile
from typing import Any, Callable, Dict, List, Optional
from app.storage.file_lock import FileLock
from app.storage.storage_interface import BaseStorage, BaseStreamStorage
from app.core.logging import logger


class JsonStorage(BaseStorage):
    """
    Atomic file-based JSON collection storage with cross-platform FileLock concurrency protection.
    Uses atomic writes (.tmp write followed by os.replace) to prevent partial writes and corruption.
    """
    def __init__(self, filepath: str, id_field: str = "id"):
        self.filepath = os.path.abspath(filepath)
        self.id_field = id_field
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        parent = os.path.dirname(self.filepath)
        if parent and not os.path.exists(parent):
            os.makedirs(parent, exist_ok=True)
        if not os.path.exists(self.filepath):
            with FileLock(self.filepath):
                if not os.path.exists(self.filepath):
                    with open(self.filepath, "w", encoding="utf-8") as f:
                        json.dump([], f, indent=2)

    def _read_data_locked(self) -> List[Dict[str, Any]]:
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _write_data_locked(self, data: List[Dict[str, Any]]):
        parent = os.path.dirname(self.filepath)
        tmp_fd, tmp_path = tempfile.mkstemp(dir=parent, prefix="atomic_", suffix=".tmp")
        try:
            with open(tmp_fd, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_path, self.filepath)
        except Exception:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
            raise

    def read_all(self) -> List[Dict[str, Any]]:
        with FileLock(self.filepath):
            return self._read_data_locked()

    def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        with FileLock(self.filepath):
            data = self._read_data_locked()
            for item in data:
                if str(item.get(self.id_field)) == str(item_id):
                    return dict(item)
            return None

    def query(self, filter_func: Callable[[Dict[str, Any]], bool]) -> List[Dict[str, Any]]:
        with FileLock(self.filepath):
            data = self._read_data_locked()
            return [dict(item) for item in data if filter_func(item)]

    def insert(self, record: Dict[str, Any]) -> Dict[str, Any]:
        with FileLock(self.filepath):
            data = self._read_data_locked()
            new_record = dict(record)
            if self.id_field not in new_record or not new_record[self.id_field]:
                new_record[self.id_field] = str(uuid.uuid4())
            item_id = str(new_record[self.id_field])

            for existing in data:
                if str(existing.get(self.id_field)) == item_id:
                    raise ValueError(f"Record with {self.id_field}='{item_id}' already exists")

            data.append(new_record)
            self._write_data_locked(data)
            return new_record

    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with FileLock(self.filepath):
            data = self._read_data_locked()
            for idx, item in enumerate(data):
                if str(item.get(self.id_field)) == str(item_id):
                    updated_item = dict(item)
                    for k, v in updates.items():
                        if k != self.id_field:
                            updated_item[k] = v
                    data[idx] = updated_item
                    self._write_data_locked(data)
                    return updated_item
            return None

    def upsert(self, record: Dict[str, Any]) -> Dict[str, Any]:
        with FileLock(self.filepath):
            data = self._read_data_locked()
            new_record = dict(record)
            if self.id_field not in new_record or not new_record[self.id_field]:
                new_record[self.id_field] = str(uuid.uuid4())
            item_id = str(new_record[self.id_field])

            for idx, existing in enumerate(data):
                if str(existing.get(self.id_field)) == item_id:
                    updated_item = dict(existing)
                    updated_item.update(new_record)
                    data[idx] = updated_item
                    self._write_data_locked(data)
                    return updated_item

            data.append(new_record)
            self._write_data_locked(data)
            return new_record

    def delete(self, item_id: str) -> bool:
        with FileLock(self.filepath):
            data = self._read_data_locked()
            initial_len = len(data)
            data = [item for item in data if str(item.get(self.id_field)) != str(item_id)]
            if len(data) < initial_len:
                self._write_data_locked(data)
                return True
            return False

    def count(self) -> int:
        with FileLock(self.filepath):
            return len(self._read_data_locked())


class JsonStreamStorage(BaseStreamStorage):
    """
    Append-only immutable event stream (JSONL) storage.
    Used for reading event streams and tamper-evident audit trails.
    """
    def __init__(self, filepath: str):
        self.filepath = os.path.abspath(filepath)
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        parent = os.path.dirname(self.filepath)
        if parent and not os.path.exists(parent):
            os.makedirs(parent, exist_ok=True)
        if not os.path.exists(self.filepath):
            with FileLock(self.filepath):
                if not os.path.exists(self.filepath):
                    with open(self.filepath, "w", encoding="utf-8") as f:
                        pass

    def append_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        with FileLock(self.filepath):
            event_copy = dict(event)
            if "event_id" not in event_copy and "id" not in event_copy:
                event_copy["event_id"] = str(uuid.uuid4())
            line = json.dumps(event_copy, separators=(',', ':'), ensure_ascii=False) + "\n"
            with open(self.filepath, "a", encoding="utf-8") as f:
                f.write(line)
                f.flush()
                os.fsync(f.fileno())
            return event_copy

    def read_stream(
        self,
        limit: Optional[int] = None,
        offset: int = 0,
        reverse: bool = False,
        filter_func: Optional[Callable[[Dict[str, Any]], bool]] = None
    ) -> List[Dict[str, Any]]:
        with FileLock(self.filepath):
            events = []
            if not os.path.exists(self.filepath):
                return []
            with open(self.filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        ev = json.loads(line)
                        if filter_func is None or filter_func(ev):
                            events.append(ev)
                    except json.JSONDecodeError:
                        continue

            if reverse:
                events.reverse()

            if offset > 0:
                events = events[offset:]
            if limit is not None:
                events = events[:limit]
            return events

    def count(self, filter_func: Optional[Callable[[Dict[str, Any]], bool]] = None) -> int:
        with FileLock(self.filepath):
            cnt = 0
            if not os.path.exists(self.filepath):
                return 0
            with open(self.filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    if filter_func is None:
                        cnt += 1
                    else:
                        try:
                            ev = json.loads(line)
                            if filter_func(ev):
                                cnt += 1
                        except json.JSONDecodeError:
                            pass
            return cnt

