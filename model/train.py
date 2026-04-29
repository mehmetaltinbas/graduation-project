"""
YOLOv8s training script for weapon detection.

Usage:
    cd model
    python train.py
"""


from roboflow import Roboflow
from ultralytics import YOLO 

rf = Roboflow(api_key="yFln7xXWISavCcWk1ZmU")
project = rf.workspace("rakymzhan-baimurat-6kqpv").project("weapon-detection-jqd3x-4auq8")
version = project.version(1)
dataset = version.download("yolov8")

model = YOLO("yolov8n.pt")

model.train(
    data=f"{dataset.location}/data.yaml",
    epochs=10, 
    imgsz=640,
    device="mps"
)
                
