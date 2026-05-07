"""
YOLOv8s training script for weapon detection.

Usage:
    cd model
    python train.py
"""


from roboflow import Roboflow
from ultralytics import YOLO 

rf = Roboflow(api_key="hdVogQwmYpxensN8apYU")
project = rf.workspace("altinbasmehmet-41-gmail-com").project("weapon-detection-jqd3x-4auq8-bvkjs")
version = project.version(1)
dataset = version.download("yolov8")

model = YOLO("yolov8n.pt")

model.train(
    data=f"{dataset.location}/data.yaml",
    epochs=10, 
    imgsz=640,
    device="mps"
)
