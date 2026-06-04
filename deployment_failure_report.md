# Deployment Failure & Troubleshooting Report

This document outlines the series of cascading failures encountered during the deployment of the Hermes Agent, LibreOffice MCP, and WebUI stack on the remote test server, and details the structural fixes applied to resolve them.

## 1. I/O Starvation during `libreoffice-mcp` Build
**Symptom**: The Docker build for `libreoffice-mcp` took nearly 45 minutes to complete, starving the host VM of disk I/O.
**Root Cause**: Running `apt-get install libreoffice` inside a Debian container pulls down over 1GB of graphical (X11/GTK) dependencies, Java environments, and fonts. Unpacking and configuring 500+ heavy packages on a constrained remote VM saturated the disk I/O, causing cascading timeouts in other services.
**Resolution**: Allowed the build to complete. In the future, using `--no-install-recommends` or installing headless-only variants (if available) would significantly reduce this overhead.

## 2. Hermes Container `Unhealthy` / OOM Kill (Exit Code 137)
**Symptom**: The `hermes` container would hang in the `Starting` state for over 10 minutes before Docker Compose would forcefully kill it (`exit code 137`) for exceeding the `start_period: 300s` healthcheck timeout.
**Root Cause**: 
1. The `hermes-agent` image includes a startup script (`/etc/cont-init.d/01-hermes-setup`) that attempts to map the container's internal UID to the host's UID (`HERMES_UID`).
2. Because the deployment was executed as `root` on the remote server, `HERMES_UID` evaluated to `0`.
3. The image's files (gigabytes of Python libraries and binaries in `/opt/hermes`) are natively owned by UID `10000`.
4. The startup script ran `chown -R 0:0 /opt/hermes`. On Docker's OverlayFS, changing the ownership of a file from the base image forces a **"copy-up"** operation, duplicating the file into the container's writable layer.
5. Copying gigabytes of files while the disk was already starved by the LibreOffice build caused an indefinite hang, ultimately leading to a healthcheck timeout and SIGKILL.
**Resolution**: Hardcoded `HERMES_UID: "10000"` and `HERMES_GID: "10000"` in `docker-compose.yml` to match the native ownership of the base image. This completely bypassed the `chown` operation, allowing the container to boot instantly. We then manually ran `chown -R 10000:10000 /root/.hermes` on the host to ensure the container had write access to its persistent data volume.

## 3. Gateway API Server Not Listening (Connection Reset)
**Symptom**: Once the `hermes` container booted successfully, `curl http://localhost:8642/v1/models` failed with `exit code 56` (Connection reset by peer).
**Root Cause**: The container logs showed `WARNING gateway.run: No messaging platforms enabled.` By default, the new Hermes gateway does not activate the REST API server unless explicitly configured to do so in the `.env` file. 
**Resolution**: Injected `API_SERVER_ENABLED=true` and `API_SERVER_KEY=hermes-secret-key` into `/root/.hermes/.env` on the remote server.

## 4. Healthcheck Failure: 401 Unauthorized
**Symptom**: After the API server was enabled, the container was still marked `unhealthy`, preventing `hermes-webui` from starting.
**Root Cause**: The healthcheck command in `docker-compose.yml` was configured as `curl -sf http://localhost:8642/v1/models`. Because we secured the API server with an `API_SERVER_KEY`, the endpoint returned `HTTP 401 Unauthorized`. The `-f` (fail) flag in `curl` caused it to return a non-zero exit code upon encountering an HTTP error, failing the Docker healthcheck.
**Resolution**: Updated `docker-compose.yml` to ping the unauthenticated `http://localhost:8642/health` endpoint instead.

