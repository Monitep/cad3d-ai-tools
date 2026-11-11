FROM denoland/deno:bin AS deno
FROM python:3.12-slim
COPY --from=deno /deno /usr/local/bin/deno
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY nas-services/videopocket/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --uid 10001 --create-home app && mkdir /data && chown app:app /data
COPY nas-services/videopocket/*.py ./
COPY videopocket /app/web
USER app
ENV DATA_DIR=/data WEB_DIR=/app/web
EXPOSE 8787
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8787", "--no-access-log"]
