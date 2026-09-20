"""Root import fallback — delegates to db.patch_subject_filter_final."""
from db.patch_subject_filter_final import install  # noqa: F401

__all__ = ["install"]
