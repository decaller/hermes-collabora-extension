# Deployment Status Report — June 5, 2026

## Overview
This report summarizes the successful diagnostics and fixes applied to the **Hermes AI Agent Stack** on the test server (`100.66.101.58`). All reported issues regarding missing MCP tools and empty workspaces have been resolved.

## 1. LibreOffice MCP Server (Resolved)
**Issue:** The server connected but showed "0 tools".
**Status:** Healthy (13 tools active).

### Root Causes
1.  **Stdout Pollution:** The `ooodev` library was printing `INFO` messages to `stdout`. MCP uses `stdout` for JSON-RPC communication; these logs corrupted the data stream, causing the agent to fail tool discovery.
2.  **Missing Fonts:** LibreOffice failed to start headless because no fonts were installed in the container.
3.  **Invalid Command:** The configuration used `fastmcp` (non-existent) and lacked the `:mcp` entry point suffix.

### Applied Fixes
*   **Logging Overhaul:** Moved logging configuration to the top of `libreoffice.py`. Set level to `WARNING` and explicitly redirected `sys.stdout` to `sys.stderr` during office initialization.
*   **Dockerfile Update:** Installed `fonts-dejavu-core` and `fonts-liberation`.
*   **Command Correction:** Updated `mcp_servers.json` and `config.yaml` to use `/venv/bin/mcp run /app/libreoffice.py:mcp`.
*   **Service Logs:** Redirected `soffice` internal logs to `/proc/1/fd/2` (stderr).

## 2. Dropbox Workspace Integration (Resolved)
**Issue:** Workspace appeared empty in the Web UI.
**Status:** Synchronized and Fully Visible.

### Root Causes
1.  **Permission Denied:** The `/root/Dropbox` folder on the host was restricted to the root user. The Hermes agent (running as UID `10000`) could not read the mounted volume.
2.  **Conflicting Mounts:** A redundant `/usr/share/fonts` volume mount was masking the container's internal fonts with an empty host directory.

### Applied Fixes
*   **Permission Fix:** Performed `chmod 755 /root` and `chmod -R 755 /root/Dropbox` on the host.
*   **Compose Cleanup:** Removed the font volume mount and consolidated the Dropbox mount into the primary `WORKSPACE_DIR`.
*   **Environment Config:** Set `WORKSPACE_DIR=~/Dropbox` in the `.env` file to establish it as the default project root.

## 3. Hermes Agent Stability (Resolved)
**Issue:** Agent was stuck in a restart loop.
**Status:** Healthy / Supervised.

### Root Causes
1.  **Init Conflict:** An explicit `command: ["gateway", "run"]` in `docker-compose.yml` conflicted with the container's `s6-overlay` init system, causing a PID file race.

### Applied Fixes
*   **Compose Update:** Removed the explicit command and the `HERMES_GATEWAY_NO_SUPERVISE` flag to allow native supervision.

---

## Final Verification Results
*   **Dropbox Status:** "Up to date".
*   **Tool Count:** `libreoffice-mcp (stdio) — 13 tool(s)`.
*   **Workspace Content:** Verified 90+ files/folders visible inside the `hermes` container.
*   **Web UI:** Fully operational and connected to the agent API.

## Maintenance Notes
*   **Logs:** Always check `docker logs hermes` for JSON-RPC parsing errors if tools disappear.
*   **Sync:** If files are missing, run `/usr/local/bin/dropbox status` on the host.
*   **Config:** Changes to MCP servers should be made in `/root/.hermes/config.yaml` followed by `docker compose restart hermes`.
