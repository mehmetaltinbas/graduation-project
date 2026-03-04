"""
YOLOv8s training script for weapon detection.

Usage:
    cd model
    python train.py
"""

from ultralytics import YOLO

model = YOLO("yolov8s.pt")

results = model.train(
    data="dataset/data.yaml",
    epochs=30,
    imgsz=640,
    batch=8,
    patience=10,
    device="mps",
    project="runs",
    name="weapon-detect",
)
