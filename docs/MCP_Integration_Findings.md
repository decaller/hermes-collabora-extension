# LibreOffice MCP Integration Investigation Report

**Date:** June 5, 2026
**Status:** In Progress (Networking verified, Agent connection failing)

## 1. Overview
The goal is to integrate the LibreOffice MCP server with the Hermes Agent using **SSE (Server-Sent Events) over HTTP**. This allows the containerized agent to communicate with the document processor across network boundaries (either between containers or from container to host).

## 2. Approach: Native vs. Docker

### Native Installation (Test Server)
- **Status:** Installed but inactive.
- **Findings:** 
    - Successfully installed LibreOffice and the `python3-uno` bridge natively on Debian.
    - Configured a systemd service (`libreoffice-mcp.service`).
    - **Complexity:** Highly sensitive to environment variables (`PYTHONPATH`, `UNO_PATH`, `URE_BOOTSTRAP`) and Python version mismatches between system UNO and the virtual environment.
    - **Resolution:** Used `--system-site-packages` in the venv to access the system `uno` library.

### Dockerized Stack (Local)
- **Status:** Current Focus. Networking confirmed, but Agent rejected connection.
- **Findings:**
    - The `libreoffice-mcp` service is running on `http://libreoffice-mcp:8000/sse`.
    - Manual `curl` from within the `hermes` container returns a `200 OK` and initiates an event stream.
    - **Issue:** The Hermes agent logs show `libreoffice-networked (http) — failed`.

## 3. Key Technical Hurdles & Fixes

### Dependency Resolution
Several packages were missing from the initial environment that are critical for SSE transport:
- **`mcp[cli]` & `typer`**: Required for the standard `mcp run` command.
- **`a2wsgi`**: A hidden requirement for `uvicorn` when handling certain middleware in the MCP server.
- **`uno.py`**: The bridge to LibreOffice must be explicitly pointed to via `PYTHONPATH` inside the container.

### Script Refactoring
The `libreoffice.py` script was updated to:
- Bind to `0.0.0.0` (all interfaces) to allow external container access.
- Include a `if __name__ == "__main__":` block to launch the SSE server directly, bypassing some CLI overhead.

### Path Alignment
- **Uniformity:** Both `hermes` and `libreoffice-mcp` now mount `~/Dropbox` to `/Dropbox`.
- **Reason:** If the agent finds a file at `/Dropbox/doc.docx`, the LibreOffice service must be able to resolve that *exact same path* to perform conversions.

## 4. Current Blockers
1. **Agent Health:** The `hermes` container is reporting as `unhealthy`. This usually indicates the internal gateway/dashboard is not responding fast enough or is stuck.
2. **Connection Rejection:** Despite the SSE endpoint being live, the agent fails to handshake. Possible causes:
    - Timeout during the initial tool discovery phase.
    - Hostname resolution lag within the Docker bridge.
    - CORS or protocol mismatch in the MCP client library.

## 5. Next Steps
1. **Debug Agent Health:** Investigate why the `hermes` container is marked unhealthy (check internal port 8642 responses).
2. **Extended Discovery Timeout:** Increase the agent's timeout for MCP discovery to account for the overhead of starting headless LibreOffice.
3. **Log Interception:** Capture the internal agent logs (not just stdout) to see the specific stack trace of the `libreoffice-networked` failure.
