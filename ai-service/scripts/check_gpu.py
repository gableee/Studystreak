import json
import sys

try:
    import torch
except Exception as e:
    print(json.dumps({"error": "import_torch_failed", "message": str(e)}))
    sys.exit(1)

out = {
    "torch_version": torch.__version__,
    "cuda_available": torch.cuda.is_available(),
    "cuda_device_count": torch.cuda.device_count(),
}
if out["cuda_available"] and out["cuda_device_count"] > 0:
    try:
        out["devices"] = [torch.cuda.get_device_name(i) for i in range(out["cuda_device_count"])]
    except Exception as e:
        out["devices_error"] = str(e)

print(json.dumps(out, indent=2))
