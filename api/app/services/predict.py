import numpy as np
from ultralytics import YOLO

from ..config import get_settings

_settings = get_settings()
model = YOLO(_settings.model_path)


def inference(image: np.ndarray) -> dict:
    h, w = image.shape[:2]
    results = model(image, conf=_settings.confidence_threshold)
    detections = []

    for box in results[0].boxes:
        class_id = int(box.cls[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        detections.append({
            "label": model.names[class_id],
            "confidence": round(float(box.conf[0]), 2),
            "bbox": [round(x1), round(y1), round(x2), round(y2)],
        })

    return {"detections": detections, "image_width": w, "image_height": h}
