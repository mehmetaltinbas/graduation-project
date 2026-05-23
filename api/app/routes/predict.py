from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
import numpy as np
import cv2
import time
import logging

from ..config import get_settings
from ..services.predict import inference

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    if file.content_type is None or not file.content_type.startswith(("image/", "application/octet-stream")):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    data = await file.read()
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data.")

    t0 = time.perf_counter()
    result = inference(img)
    elapsed_ms = (time.perf_counter() - t0) * 1000
    logger.info("inference took %.1f ms (image %dx%d, %d detections)", elapsed_ms, result["image_width"], result["image_height"], len(result["detections"]))

    return JSONResponse(content=result)


@router.websocket("/predict/ws")
async def predict_ws(websocket: WebSocket):
    """Continuous-detection channel for the video UI.

    Protocol:
      client → server: binary JPEG bytes, one frame per message.
      server → client: JSON text, same shape as POST /predict:
        {"detections": [...], "image_width": W, "image_height": H}

    Invalid frames return {"error": "..."} but keep the socket open so a
    transient bad frame doesn't tear the session down. The client guarantees
    at most one frame in flight at a time, so no message correlation is needed.
    """
    # Browsers don't enforce same-origin on WebSockets, so the CORSMiddleware
    # (which only handles HTTP) doesn't apply here. Re-check the Origin header
    # against the same allowlist. 1008 = policy violation.
    allowed = get_settings().cors_origin_list
    origin = websocket.headers.get("origin")
    if allowed and origin not in allowed:
        logger.warning("ws connection rejected: origin=%r not in allowlist", origin)
        await websocket.close(code=1008)
        return

    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                await websocket.send_json({"error": "Invalid image data."})
                continue

            t0 = time.perf_counter()
            result = inference(img)
            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.info(
                "ws inference took %.1f ms (image %dx%d, %d detections)",
                elapsed_ms, result["image_width"], result["image_height"], len(result["detections"]),
            )
            await websocket.send_json(result)
    except WebSocketDisconnect:
        # Normal: client closed the channel when detection stopped.
        return
