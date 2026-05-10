IMAGE_NAME := altnbsmehmet/graduation-project-api
PLATFORM := linux/arm64

.PHONY: setup install dev docker-build docker-push docker-deploy

setup:
	python3 -m venv .venv
	@echo "Run: source .venv/bin/activate"

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

docker-build:
	docker build --platform $(PLATFORM) -t $(IMAGE_NAME) .

docker-push:
	docker push $(IMAGE_NAME)

docker-deploy: docker-build docker-push
