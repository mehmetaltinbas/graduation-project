from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
import cv2
import time
import logging

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
