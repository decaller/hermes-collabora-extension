# 🚀 Hermes Docker Infrastructure Report

> Generated: 2026-06-04 | Host: Linux | Analysis of running containers

---

## 📦 Container Overview

| Container | Image | Status | Uptime | Restart Policy |
|-----------|-------|--------|--------|----------------|
| `hermes` | `nousresearch/hermes-agent:latest` | ✅ Running | ~5 hours | `unless-stopped` |
| `hermes-webui` | `ghcr.io/nesquena/hermes-webui:latest` | ✅ Running (healthy) | ~5 hours | `unless-stopped` |

---

## 🔬 Container Details

### 1. `hermes` — Hermes Agent

| Property | Value |
|----------|-------|
| **Image** | `nousresearch/hermes-agent:latest` |
| **Image SHA** | `bedaa6808982...` |
| **Image Size** | ~1.07 GB |
| **Image Created** | 2026-06-03T06:50:19Z |
| **Container ID** | `2be0ea34ee18` |
| **Created** | 2026-06-03T12:51:53Z |
| **Started** | 2026-06-03T13:54:48Z |
| **Container IP** | `172.17.0.3` (default `bridge` network) |
| **Entrypoint** | `/init /opt/hermes/docker/main-wrapper.sh` |
| **CMD** | `gateway run` |
| **User** | `root` (drops to `hermes` via `s6-setuidgid`) |
| **Working Dir** | `/opt/hermes` |

#### Exposed & Mapped Ports

| Host Port | Container Port | Purpose |
|-----------|----------------|---------|
| `0.0.0.0:8642` | `8642/tcp` | **API Server** (OpenAI-compatible REST API) |
| `0.0.0.0:9119` | `9119/tcp` | **Hermes Web UI** (built-in dashboard) |

#### Environment Variables

| Variable | Value |
|----------|-------|
| `HERMES_DASHBOARD` | `true` |
| `HERMES_DASHBOARD_INSECURE` | `true` |
| `HERMES_DASHBOARD_HOST` | `0.0.0.0` |
| `HERMES_UID` | `1000` |
| `HERMES_GID` | `1000` |
| `HERMES_HOME` | `/opt/data` |
| `PYTHONUNBUFFERED` | `1` |
| `PLAYWRIGHT_BROWSERS_PATH` | `/opt/hermes/.playwright` |
| `HERMES_WEB_DIST` | `/opt/hermes/hermes_cli/web_dist` |
| `HERMES_TUI_DIR` | `/opt/hermes/ui-tui` |

#### Volume Mounts

| Host Path | Container Path | Access |
|-----------|----------------|--------|
| `/home/abuhafi/.hermes` | `/opt/data` | Read-Write |
| `/home/abuhafi/Project` | `/workspace` | Read-Write |

#### Runtime Config (from `/home/abuhafi/.hermes/.env`)

| Variable | Value |
|----------|-------|
| `OPENAI_BASE_URL` | `https://openagentic.id/api/v1` |
| `API_SERVER_ENABLED` | `true` |
| `API_SERVER_HOST` | `0.0.0.0` |
| `API_SERVER_PORT` | `8642` |
| `API_SERVER_MODEL_NAME` | `"Hermes Agent"` |
| `HERMES_DASHBOARD` | `true` |
| `HERMES_DASHBOARD_INSECURE` | `true` |
| `HERMES_DASHBOARD_HOST` | `0.0.0.0` |

#### Notable Startup Log

```
s6-rc: info: service main-hermes successfully started
s6-rc: info: service dashboard successfully started
→ gateway is now running under s6 supervision (auto-restart on crash)
  Hermes Web UI → http://0.0.0.0:9119
```

> ⚠️ **Warning logged:** No user allowlists configured. All unauthorized users will be denied.
> Set `GATEWAY_ALLOW_ALL_USERS=true` in `~/.hermes/.env` to allow open access, or configure platform allowlists.

---

### 2. `hermes-webui` — Hermes Web UI (External)

| Property | Value |
|----------|-------|
| **Image** | `ghcr.io/nesquena/hermes-webui:latest` |
| **Image SHA** | `fca032f1988e...` |
| **Image Size** | ~126 MB |
| **Image Created** | 2026-06-03T05:49:10Z |
| **Container ID** | `3e3a06af1432` |
| **Created** | 2026-06-03T12:51:54Z |
| **Started** | 2026-06-03T13:54:48Z |
| **Health Status** | ✅ `healthy` |
| **Container IP** | `172.17.0.2` (default `bridge` network) |
| **Entrypoint** | `/hermeswebui_init.bash` |

#### Exposed & Mapped Ports

| Host Port | Container Port | Purpose |
|-----------|----------------|---------|
| `0.0.0.0:8787` | `8787/tcp` | **Web UI** (Primary browser interface) |

#### Environment Variables

| Variable | Value |
|----------|-------|
| `HERMES_WEBUI_HOST` | `0.0.0.0` |
| `HERMES_WEBUI_PORT` | `8787` |
| `HERMES_AGENT_URL` | `http://172.17.0.1:8642/v1` |
| `HERMES_HOME` | `/home/hermeswebui/.hermes` |
| `HERMES_WEBUI_STATE_DIR` | `/home/hermeswebui/.hermes/webui` |
| `HERMES_WEBUI_AGENT_DIR` | `/home/hermeswebui/.hermes/hermes-agent` |
| `WANTED_UID` | `1000` |
| `WANTED_GID` | `1000` |
| `PYTHON_VERSION` | `3.12.13` |
| `PYTHONUNBUFFERED` | `1` |

#### Volume Mounts

| Host Path | Container Path | Access |
|-----------|----------------|--------|
| `/home/abuhafi/.hermes` | `/home/hermeswebui/.hermes` | Read-Write |
| `/home/abuhafi/Project` | `/workspace` | Read-Write |

#### Health Check

The container performs HTTP health checks against `/health` every **30 seconds**:
```
GET /health → HTTP 200 (response ~0.1–0.3ms)
```
Health check has been consistently returning `200 OK` with sub-millisecond response times.

---

## 📊 Resource Usage

| Container | CPU % | Memory Usage | Memory % | Network I/O | Block I/O |
|-----------|-------|-------------|----------|-------------|-----------|
| `hermes` | 0.12% | 275.8 MiB / 27.27 GiB | 0.99% | 9.23 kB / 126 B | 60.8 MB / 3.99 MB |
| `hermes-webui` | 0.02% | 211.4 MiB / 27.27 GiB | 0.76% | 9.53 kB / 126 B | 101 MB / 430 kB |

> Total memory footprint: ~487 MiB (both containers combined)

---

## 🌐 Network Topology

Both containers currently run on the default `bridge` network (`172.17.0.0/16`). A dedicated `hermes-net` bridge network also exists on the host but is **not being used** by these containers.

```
Host (172.17.0.1)
├── hermes-webui  → 172.17.0.2  (port 8787 exposed)
└── hermes        → 172.17.0.3  (ports 8642, 9119 exposed)

hermes-webui connects to hermes via: http://172.17.0.1:8642/v1
(via host gateway IP, not direct container-to-container)
```

> ⚠️ **Issue:** The WebUI communicates with the agent via the **host's gateway IP** (`172.17.0.1`) rather than a named Docker network. This is fragile — if the default bridge gateway changes, the connection breaks.

---

## 🗂️ Shared Data Directory

Both containers share `/home/abuhafi/.hermes` with key contents:

| Path | Purpose |
|------|---------|
| `config.yaml` | Main Hermes configuration (13.5 KB) |
| `.env` | Runtime environment overrides (API keys, URLs) |
| `auth.json` | Authentication state |
| `kanban.db` | SQLite Kanban database (112 KB) |
| `models_dev_cache.json` | Model discovery cache (2.1 MB) |
| `gateway_state.json` | Gateway runtime state |
| `logs/` | Application logs |
| `cache/` | General cache |
| `hermes-agent/` | Agent-specific data |

---

## 🔌 API Integration

The Hermes agent exposes an **OpenAI-compatible API** at port `8642`:

| Endpoint | Description |
|----------|-------------|
| `http://localhost:8642/v1` | OpenAI-compatible base URL |
| `http://localhost:9119` | Hermes built-in dashboard |
| `http://localhost:8787` | External Web UI (nesquena/hermes-webui) |

**Backend LLM Provider:** `https://openagentic.id/api/v1` (custom OpenAI-compatible proxy)

---

## ⚠️ Observations & Recommendations

### Issues Found

1. **No dedicated Docker network**: Both containers use the default `bridge` network. The WebUI connects to the agent via the host gateway IP (`172.17.0.1`) instead of a named network with DNS resolution.

2. **No allowlist configured**: The gateway logs a warning about missing user allowlists for messaging platforms. `GATEWAY_ALLOW_ALL_USERS=true` should be set if needed.

3. **Dashboard runs in insecure mode**: `HERMES_DASHBOARD_INSECURE=true` disables authentication on the built-in dashboard (port `9119`). This is fine for local use but should be secured for any networked environment.

4. **No health check on `hermes` container**: Only `hermes-webui` has a health check. The agent container has no health monitoring.

5. **Workspace mounted read-write on both containers**: `/home/abuhafi/Project` is mounted into both containers with full read-write access.

### Recommendations

- ✅ Migrate to a `docker-compose.yml` (see `docker-compose.yml` in this directory)
- ✅ Use a named network (`hermes-net`) for container-to-container communication
- ✅ Add a health check to the `hermes` agent container
- ✅ Store sensitive values (API keys) in a `.env` file with proper `.gitignore` entry
- ✅ Consider mounting workspace as read-only if write access isn't needed

---

## 🗺️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Docker Host                                 │
│                                                                      │
│  ┌─────────────────────┐        ┌────────────────────────────────┐  │
│  │   hermes-webui      │        │          hermes                │  │
│  │                     │        │                                │  │
│  │  :8787 → WebUI      │──────▶│  :8642 → OpenAI API           │  │
│  │  ghcr.io/nesquena/  │        │  :9119 → Dashboard            │  │
│  │  hermes-webui:latest│        │  nousresearch/hermes-agent    │  │
│  │                     │        │                                │  │
│  └─────────────────────┘        └────────────────────────────────┘  │
│           │                                     │                    │
│           └────────────┬────────────────────────┘                   │
│                        ▼                                            │
│              /home/abuhafi/.hermes  (shared volume)                 │
│              /home/abuhafi/Project  (shared workspace)              │
│                                                                      │
│  Upstream LLM: https://openagentic.id/api/v1                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Report generated by Antigravity analysis on 2026-06-04.*
