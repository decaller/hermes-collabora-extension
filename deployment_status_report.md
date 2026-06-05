# Hermes DIL — Deployment & Integration Status Report
> Generated: 2026-06-05 | Environment: Production-Local + Test Server (100.66.101.58)

---

## 🖥️ Infrastructure Overview

### Running Containers

| Container | Status | Image | Ports |
|-----------|--------|-------|-------|
| `hermes` | ✅ Up 36 hours | `nousresearch/hermes-agent` | 8642 (API), 9119 (dashboard) |
| `hermes-webui` | ✅ Up 24 hours (healthy) | `ghcr.io/nesquena/hermes-webui` | 8787 (WebUI) |
| `collabora` | ✅ Up 24 hours | `collabora/code:latest` | 9980 |
| `wopi-server` | ✅ Up 24 hours | `python:3.11-alpine` | 8880 |
| `WinBoat` | ✅ Up 36 hours | `ghcr.io/dockur/windows:5.14` | 3389, 7148–7149, 8006 |
| `libreoffice-mcp` | ❌ **NOT RUNNING** | Build from `./libreoffice-mcp` | 8000 |

### Network Topology

All active Hermes services reside on the `hermes-net` bridge network:

```
hermes-net (172.21.0.0/16)
├── hermes-webui  → 172.21.0.2
├── collabora     → 172.21.0.3
├── hermes        → 172.21.0.4
└── wopi-server   → 172.21.0.5
```

> ⚠️ `libreoffice-mcp` is defined in `docker-compose.yml` and connected to `hermes-net`, but was **never started** in this session.

---

## ⚙️ Hermes Agent Configuration

**Config path (inside container):** `/opt/data/config.yaml`  
**Secrets path (inside container):** `/opt/data/.env`  
**Host mapping:** `${HERMES_DATA_DIR:-~/.hermes}` → `/opt/data`

### Model & API Settings

| Setting | Value |
|---------|-------|
| Model | `claude-sonnet-4.5` |
| Provider | `openai-api` (OpenAI-compatible endpoint) |
| Base URL | `https://openagentic.id/api/v1` |
| Max Turns | 60 |

### API Key (`.env`)

```
OPENAI_API_KEY=sk-f7e7ef5c74e9869e29b740dc3661a0fb...
OPENAI_BASE_URL=https://openagentic.id/api/v1
API_SERVER_ENABLED=true
API_SERVER_HOST=0.0.0.0
API_SERVER_PORT=8642
```

The model is correctly configured to route all inference through **OpenAgentic** using the `claude-sonnet-4.5` model with an OpenAI-compatible request format.

---

## 🔌 MCP Server Integration — `libreoffice-mcp`

### Current Status: ❌ Not Registered in Hermes

```
$ docker exec hermes hermes mcp list
  No MCP servers configured.
```

The MCP server definition exists in **`mcp_servers.json`** on the host but has **not been applied** to the Hermes agent's `config.yaml`.

### `mcp_servers.json` (current, on host)

```json
{
  "mcpServers": {
    "libreoffice-mcp": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "libreoffice-mcp",
        "fastmcp",
        "run",
        "/app/libreoffice.py"
      ]
    }
  }
}
```

> ⚠️ **Problem**: This config references `fastmcp` as the command. However, `fastmcp` is not guaranteed to be on PATH inside the container. The correct command is `/venv/bin/mcp` (or `python -m mcp.server.fastmcp`).

### Root Cause Analysis

| # | Issue | Status |
|---|-------|--------|
| 1 | `mcp_servers.json` not imported into Hermes `config.yaml` | ❌ Pending |
| 2 | `fastmcp` command path incorrect in JSON definition | ❌ Needs fix |
| 3 | `libreoffice-mcp` container not running | ❌ Needs start |
| 4 | `log_level="INFO"` type bug in `libreoffice.py` | ✅ **Fixed** |

---

## 🛠️ Bug Fixes Applied

### Fix 1 — `libreoffice.py`: `log_level` Type Mismatch ✅

**File:** `/home/abuhafi/Project/hermesDIL/libreoffice-mcp/libreoffice.py`

**Error:** `TypeError: '>' not supported between instances of 'str' and 'int'`  
**Cause:** The `ooodev` library's `Options()` class expected an integer for `log_level`, but `"INFO"` (string) was passed.

```python
# Before (broken):
opt=Options(log_level="INFO")

# After (fixed):
opt=Options(log_level=20)   # 20 = logging.INFO
```

This fix is already committed in the local source at `libreoffice-mcp/libreoffice.py` (line ~39).

---

## 📋 Pending Actions

### 1. Start `libreoffice-mcp` Container

```bash
cd /home/abuhafi/Project/hermesDIL
docker compose up -d libreoffice-mcp
```

### 2. Register MCP Server in Hermes Config

The `mcp_servers.json` needs to be imported with the corrected command path:

```bash
docker exec hermes hermes mcp add libreoffice-mcp \
  --command docker \
  --args exec -i libreoffice-mcp /venv/bin/mcp run /app/libreoffice.py
```

Or manually append to `/opt/data/config.yaml` inside the container:

```yaml
mcp_servers:
  libreoffice-mcp:
    command: docker
    args:
      - exec
      - -i
      - libreoffice-mcp
      - /venv/bin/mcp
      - run
      - /app/libreoffice.py
```

### 3. Verify Connection

```bash
docker exec hermes hermes mcp test libreoffice-mcp
```

Expected: List of exposed LibreOffice tools (create_document, open_file, export_pdf, etc.)

---

## 📂 Project File Inventory

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Full stack definition (hermes, webui, collabora, wopi, libreoffice-mcp) |
| `.env` | Runtime secrets (API keys, server config) |
| `mcp_servers.json` | MCP server definitions (not yet active in hermes) |
| `libreoffice-mcp/libreoffice.py` | MCP server entrypoint (bug fixed) |
| `libreoffice-mcp/Dockerfile` | LibreOffice MCP container build |
| `inventory.ini` | Ansible inventory (test server: 100.66.101.58) |
| `setup-test-server.yml` | Ansible playbook for test server provisioning |

---

## 🌐 Test Server

| Property | Value |
|----------|-------|
| IP (Tailscale) | `100.66.101.58` |
| WebUI | `http://100.66.101.58:8787/` |
| Access | Password: `cemara153` |
| Domain | `hermes.dianinsanlestari.co.id` |

The test server mirrors the local stack. Deployment via Ansible playbook (`setup-test-server.yml`) was configured.

---

## ✅ Summary

| Component | State |
|-----------|-------|
| Hermes Agent | ✅ Running, model configured (claude-sonnet-4.5 via OpenAgentic) |
| Hermes WebUI | ✅ Running and healthy at :8787 |
| Collabora + WOPI | ✅ Running (document editing backend) |
| `libreoffice-mcp` container | ❌ Not started |
| MCP registration in Hermes | ❌ Not applied |
| `log_level` bug fix | ✅ Applied to source |
| Dropbox mount | Configured in compose (`~/Dropbox:/Dropbox`) |

**Next immediate action:** Start the `libreoffice-mcp` container and register it in Hermes config.
