"""API package.

pillow-heif is imported and registered here, before any submodule pulls in
OpenCV. Both ship their own native codec libraries (libheif, libde265, ...);
loading OpenCV's copies first and pillow-heif's afterwards clashes and segfaults
on some platforms. Doing the registration at package-import time guarantees the
safe ordering process-wide. See app/services/decode.py for how it's used.
"""

import logging
import warnings

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()  # HEIC/HEIF (iPhone photos); Pillow has no native HEIF.
    try:
        # AVIF is routed through pillow-heif too, to avoid loading Pillow's
        # separate native libavif alongside libheif. The opener is deprecated and
        # may be dropped in a future release, hence the guard.
        from pillow_heif import register_avif_opener

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            register_avif_opener()
    except ImportError:
        pass
except ImportError:  # pragma: no cover - pillow-heif should be installed
    logging.getLogger(__name__).warning(
        "pillow-heif not installed; HEIC/AVIF uploads will fail to decode."
    )
