"""
AI Models package - ML model loaders and inference logic.
"""
"""Models package init.

Avoid importing heavy model dependencies at package import time (transformers,
pytesseract, torch, etc.) because importing submodules can trigger large
side-effects and break on some Python versions/environments. Import submodules
explicitly where needed.
"""

__all__ = []
