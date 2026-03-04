.PHONY: setup install dev docker-build docker-push docker-deploy

setup:
	python3 -m venv .venv
	@echo "Run: source .venv/bin/activate"

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

docker-build:
	docker build -t altnbsmehmet/graduation-project-api .

docker-push:
	docker push altnbsmehmet/graduation-project-api

docker-deploy: docker-build docker-push
