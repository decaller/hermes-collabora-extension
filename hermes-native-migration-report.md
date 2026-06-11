# Journey to Native: Hermes & LibreOffice Integration Report

## 1. The Starting Point: Why Move from Docker?
The project initially struggled with standard Docker deployment due to:
*   **OverlayFS I/O Overhead:** Heavy recursive `chown` operations on startup caused the container to hang or time out.
*   **UID/GID Mismatches:** File permission conflicts between the host and the container made document editing unreliable.
*   **LibreOffice Bloat:** Embedding a full office suite (~1.5GB) inside a container created resource starvation on the VM.

## 2. The Migration Journey (Step-by-Step)

### Phase 1: Cleaning the Slate
The environment was completely sanitized by removing all Docker containers, volumes, and orphan networks to ensure no port conflicts (like port 2083 or 8642) existed.

### Phase 2: Validating Native LibreOffice
Confirmed that `libreoffice-headless` was already installed on the host. A manual conversion test (`text -> pdf`) passed, proving the underlying rendering engine was healthy.

### Phase 3: The Native MCP Struggle
This was the most technically challenging phase.
*   **Problem:** The `uno` bridge (Python-to-LibreOffice) is highly version-specific.
*   **Failure:** Attempting to use Python 3.11 failed because the system's UNO bridge was built for **Python 3.13**.
*   **Fix:** Standardized on a Python 3.13 virtual environment and manually pointed `PYTHONPATH` to `/usr/lib/python3/dist-packages` to bridge the gap.

### Phase 4: Hermes Agent Deployment
Installed the Hermes Agent natively using the official script. 
*   **Configuration Fix:** The agent initially couldn't find the MCP tools. We discovered that the `config.yaml` schema for native MCP servers required the specific `mcp_servers:` block.
*   **Bootstrap Script:** Created `/usr/local/bin/hermes-bootstrap.sh` to ensure `soffice` (the office process) is always running before the agent starts.

## 3. Final Verification (The "Acid Test")
A complete end-to-end test was performed via the CLI:
1.  **Command:** "Create a document, write to A1, save, edit A1, save again."
2.  **Result:** **Success.**
3.  **Artifact:** `/root/test_mcp.ods` (9.1 KB) was successfully generated and verified.

## 4. Current Architecture (Hybrid Stack)
| Component | Mode | Role |
| :--- | :--- | :--- |
| **LibreOffice** | Native | Rendering Engine |
| **MCP Server** | Native (stdio) | Python/UNO Bridge |
| **Hermes Agent** | Native (Systemd) | Core Intelligence & Tool Orchestrator |
| **Collabora** | Docker (CODE) | Web-based visual editor (Sidecar) |

## 5. Major Obstacles Overcome
1.  **The UNO Bridge Trap:** Resolved the `ImportError: Are you sure that uno has been imported?` by matching Python versions (3.13) and fixing system paths.
2.  **Config Schema Mismatch:** Corrected the `config.yaml` structure to properly register `stdio`-based servers.
3.  **Process Management:** Solved the "Headless Hang" by using a bootstrap script that manages both the Agent and the Office background process.

---
**Status:** **Stable & Functional.** The agent can now manipulate documents with zero Docker-related I/O lag.
