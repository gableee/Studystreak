from fastapi import APIRouter
from typing import Dict, Any, Optional
import os
import subprocess
import json
import datetime
import socket

router = APIRouter(prefix="/diagnostics", tags=["diagnostics"])


@router.get("/ocr-smoke")
async def ocr_smoke() -> Dict[str, Any]:
    """Run lightweight checks for OCR/PDF toolchain and optional in-memory OCR smoke test.

    Returns diagnostic information including whether pytesseract/pdf2image are importable,
    whether tesseract and pdftoppm executables are found (and their versions if runnable),
    and a small OCR sample result if possible.
    """
    info: Dict[str, Any] = {}

    # Metadata
    info["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
    try:
        info["hostname"] = socket.gethostname()
    except Exception:
        info["hostname"] = None

    # Environment hints
    t_cmd_env = os.getenv("TESSERACT_CMD") or os.getenv("TESSERACT_PATH") or os.getenv("TESSERACT_EXE")
    poppler_env = os.getenv("POPPLER_PATH")
    info["env"] = {"TESSERACT_CMD": t_cmd_env, "POPPLER_PATH": poppler_env}

    # Try to import optional Python libs and get versions
    try:
        import pytesseract  # type: ignore
        info["pytesseract_imported"] = True
        try:
            info["pytesseract_version"] = pytesseract.__version__
        except Exception:
            info["pytesseract_version"] = "unknown"
    except Exception as e:
        info["pytesseract_imported"] = False
        info["pytesseract_error"] = str(e)

    try:
        from pdf2image import convert_from_bytes  # type: ignore
        import pdf2image
        info["pdf2image_imported"] = True
        try:
            info["pdf2image_version"] = pdf2image.__version__
        except Exception:
            info["pdf2image_version"] = "unknown"
    except Exception as e:
        info["pdf2image_imported"] = False
        info["pdf2image_error"] = str(e)

    try:
        import pdfplumber  # type: ignore
        info["pdfplumber_imported"] = True
        try:
            info["pdfplumber_version"] = pdfplumber.__version__
        except Exception:
            info["pdfplumber_version"] = "unknown"
    except Exception as e:
        info["pdfplumber_imported"] = False
        info["pdfplumber_error"] = str(e)

    # Check tesseract executable
    tesseract_path = None
    tesseract_version = None
    if t_cmd_env and os.path.isfile(t_cmd_env):
        tesseract_path = t_cmd_env
    else:
        # try common locations (Windows host paths won't exist in Linux container)
        # Check Linux container paths first
        linux_tesseract = "/usr/bin/tesseract"
        if os.path.isfile(linux_tesseract):
            tesseract_path = linux_tesseract
        else:
            # Fallback to Windows paths (for host debugging)
            common = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            if os.path.isfile(common):
                tesseract_path = common

    info["tesseract_path"] = tesseract_path
    if tesseract_path:
        try:
            out = subprocess.check_output([tesseract_path, "--version"], stderr=subprocess.STDOUT, text=True)
            tesseract_version = out.splitlines()[0].strip()
        except Exception as e:
            tesseract_version = f"error: {e}"
    info["tesseract_version"] = tesseract_version

    # Check pdftoppm in POPPLER_PATH or common places
    poppler_bin = None
    if poppler_env:
        # If they passed file path
        if os.path.isfile(poppler_env) and os.path.basename(poppler_env).lower().startswith("pdftoppm"):
            poppler_bin = os.path.dirname(poppler_env)
        elif os.path.isdir(poppler_env):
            # check bin or library/bin for Windows-style paths
            cand = os.path.join(poppler_env, "pdftoppm.exe")
            if os.path.isfile(cand):
                poppler_bin = poppler_env
            else:
                cand2 = os.path.join(poppler_env, "bin", "pdftoppm.exe")
                if os.path.isfile(cand2):
                    poppler_bin = os.path.join(poppler_env, "bin")
                else:
                    cand3 = os.path.join(poppler_env, "Library", "bin", "pdftoppm.exe")
                    if os.path.isfile(cand3):
                        poppler_bin = os.path.join(poppler_env, "Library", "bin")

    # Fallback common checks (Linux container first, then Windows host)
    if not poppler_bin:
        # Check Linux container paths
        linux_pdftoppm = "/usr/bin/pdftoppm"
        if os.path.isfile(linux_pdftoppm):
            poppler_bin = "/usr/bin"
        else:
            # Fallback to Windows host paths
            pf = os.environ.get("ProgramFiles", r"C:\Program Files")
            try:
                for root, dirs, files in os.walk(pf):
                    if "pdftoppm.exe" in files:
                        poppler_bin = root
                        break
            except Exception:
                pass

    info["poppler_bin"] = poppler_bin
    pdftoppm_version = None
    if poppler_bin:
        # Try both .exe (Windows) and no extension (Linux)
        pdftoppm_candidates = [
            os.path.join(poppler_bin, "pdftoppm.exe"),
            os.path.join(poppler_bin, "pdftoppm")
        ]
        for pdftoppm in pdftoppm_candidates:
            if os.path.isfile(pdftoppm):
                try:
                    out = subprocess.check_output([pdftoppm, "-v"], stderr=subprocess.STDOUT, text=True)
                    # pdftoppm outputs version in first line or to stderr depending on build
                    pdftoppm_version = out.splitlines()[0].strip()
                    break
                except Exception as e:
                    pdftoppm_version = f"error: {e}"
                    break
    info["pdftoppm_version"] = pdftoppm_version

    # Try a deterministic in-memory OCR using PIL if available
    ocr_sample: Optional[Dict[str, Any]] = None
    expected_substring = "QUICK BROWN FOX"
    try:
        from PIL import Image, ImageDraw, ImageFont  # type: ignore
        import io
        try:
            import pytesseract  # type: ignore
            # Create a simple test image with deterministic text
            img = Image.new("RGB", (400, 100), color=(255, 255, 255))
            d = ImageDraw.Draw(img)
            # Use default font; render clear text for OCR
            test_text = "THE QUICK BROWN FOX"
            d.text((20, 30), test_text, fill=(0, 0, 0))
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)
            try:
                # Configure tesseract if env var is set
                if tesseract_path:
                    pytesseract.pytesseract.tesseract_cmd = tesseract_path
                txt = pytesseract.image_to_string(Image.open(buf))
                extracted = txt.strip() if isinstance(txt, str) else str(txt)
                ocr_pass = expected_substring in extracted.upper()
                ocr_sample = {
                    "expected_substring": expected_substring,
                    "text": extracted,
                    "ocr_pass": ocr_pass
                }
            except Exception as e:
                ocr_sample = {"ocr_error": str(e), "ocr_pass": False}
        except Exception as e:
            ocr_sample = {"error": f"pytesseract not usable: {e}", "ocr_pass": False}
    except Exception as e:
        ocr_sample = {"pillow_error": str(e), "ocr_pass": False}

    info["ocr_sample"] = ocr_sample

    # Torch / GPU diagnostics
    try:
        import torch  # type: ignore
        info["torch_imported"] = True
        info["torch_version"] = torch.__version__
        try:
            cuda_avail = torch.cuda.is_available()
            info["cuda_available"] = bool(cuda_avail)
            info["cuda_device_count"] = int(torch.cuda.device_count()) if cuda_avail else 0
            if cuda_avail:
                try:
                    cur = int(torch.cuda.current_device())
                    info["cuda_current_device"] = cur
                except Exception:
                    info["cuda_current_device"] = None
                try:
                    info["cuda_device_name"] = torch.cuda.get_device_name(0)
                except Exception:
                    info["cuda_device_name"] = None
                # Memory stats (best-effort)
                try:
                    allocated = torch.cuda.memory_allocated(0)
                    reserved = torch.cuda.memory_reserved(0)
                    info["cuda_memory_allocated"] = allocated
                    info["cuda_memory_reserved"] = reserved
                    # Add warning if memory usage is high
                    try:
                        total_mem = torch.cuda.get_device_properties(0).total_memory
                        usage_pct = (allocated / total_mem) * 100 if total_mem > 0 else 0
                        if usage_pct > 80:
                            info["cuda_memory_warning"] = f"High GPU memory usage ({usage_pct:.1f}% allocated). Consider reducing batch sizes."
                    except Exception:
                        pass
                except Exception:
                    info["cuda_memory_allocated"] = None
                    info["cuda_memory_reserved"] = None
        except Exception as e:
            info["cuda_check_error"] = str(e)
    except Exception as e:
        info["torch_imported"] = False
        info["torch_error"] = str(e)

    # Summary health flags
    info["gpu_ok"] = info.get("cuda_available", False)
    info["ocr_ok"] = info.get("pytesseract_imported", False) and info.get("tesseract_version") is not None
    info["pdf_tools_ok"] = info.get("pdf2image_imported", False) and info.get("poppler_bin") is not None

    return info
