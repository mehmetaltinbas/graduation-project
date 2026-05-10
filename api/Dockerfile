# syntax=docker/dockerfile:1.6
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .

ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE ${PORT}

CMD uvicorn app.main:app --host ${HOST} --port ${PORT}
