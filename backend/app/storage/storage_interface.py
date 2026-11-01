from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseStorage(ABC):
    """Abstract interface defining required storage operations for database-free persistence."""

    @abstractmethod
    def read_all(self) -> List[Dict[str, Any]]:
        """Reads all records from the storage collection."""
        pass

    @abstractmethod
    def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single record by its primary key / identifier."""
        pass

    @abstractmethod
    def insert(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Atomically inserts a new record with concurrency locking."""
        pass

    @abstractmethod
    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Atomically updates an existing record."""
        pass

    @abstractmethod
    def delete(self, item_id: str) -> bool:
        """Deletes a record by its identifier."""
        pass


class BaseStreamStorage(ABC):
    """Abstract interface for append-only audit & reading ledgers (JSONL)."""

    @abstractmethod
    def append_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Atomically appends a verified immutable event record to the log stream."""
        pass

    @abstractmethod
    def read_stream(self, limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Reads events from the append-only log stream in chronological or reverse order."""
        pass

