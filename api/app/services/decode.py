import io

import cv2
import numpy as np
from PIL import Image, ImageOps

# HEIC/HEIF/AVIF openers are registered with Pillow in app/__init__.py, which
# also ensures pillow-heif loads its native codecs before OpenCV (ordering
# matters; see that module).


def decode_image(data: bytes) -> np.ndarray | None:
    """Decode raw image bytes into a BGR numpy array, or None if undecodable.

    OpenCV is the fast path and covers JPEG/PNG/WebP/BMP/TIFF. When it can't
    decode the bytes (e.g. HEIC/HEIF/AVIF), fall back to Pillow, which also
    honors EXIF orientation so rotated phone photos come out upright.
    """
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is not None:
        return img

    try:
        with Image.open(io.BytesIO(data)) as pil_img:
            pil_img = ImageOps.exif_transpose(pil_img)
            rgb = pil_img.convert("RGB")
            # YOLO/OpenCV expect BGR channel order.
            return np.ascontiguousarray(np.asarray(rgb)[:, :, ::-1])
    except Exception:
        return None
