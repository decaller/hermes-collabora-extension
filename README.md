# Hermes DIL: Hybrid-Native Deployment

This guide outlines the "Hybrid-Native" installation of the Hermes Agent ecosystem. This architecture prioritizes performance and file-system transparency by running core services natively while utilizing Docker only for complex web-rendering components (Collabora).

## Architecture Overview
- **Hermes Agent:** Native Binary (Highest performance).
- **Hermes WebUI:** Native Python (Easy extension management).
- **LibreOffice:** Native System Install (Lowest latency for LLM automation).
- **Workspace:** Headless Dropbox (Seamless cross-device file sync).
- **Collabora CODE:** Docker (Stable containerized document rendering).

---

## 1. Prerequisites
- **OS:** Linux (Ubuntu/Debian recommended).
- **Docker & Docker Compose:** Required for the Collabora rendering engine.
- **Python 3.11+:** For MCP and WebUI services.
- **Dropbox:** Account for workspace synchronization.

---

## 2. Installation Steps

### Step 1: System Dependencies
Install LibreOffice and basic build tools:
```bash
sudo apt update
sudo apt install -y libreoffice libreoffice-script-provider-python python3-pip python3-venv curl git
```

### Step 2: LibreOffice MCP Setup
The MCP server allows the LLM to control LibreOffice natively via the UNO API.
```bash
cd libreoffice-mcp
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Start LibreOffice in headless mode (Port 2083)
soffice --headless --accept="socket,host=localhost,port=2083;urp;" --nodefault --nologo &
# Start MCP Server
python libreoffice.py
```

### Step 3: Dropbox Workspace
Install [Dropbox Headless](https://www.dropbox.com/install-linux) and sync your target folder.
```bash
# Example workspace path
export WORKSPACE_DIR="$HOME/Dropbox/hermes_workspace"
mkdir -p $WORKSPACE_DIR
```

### Step 4: Hermes Agent
Install the latest Hermes Agent natively:
```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
# Initialize with your workspace
export HERMES_DATA_DIR="$HOME/.hermes"
hermes gateway run
```

### Step 5: Hermes WebUI & Collabora Extension
1. **Clone the UI:**
   ```bash
   git clone https://github.com/nesquena/hermes-webui.git
   cd hermes-webui
   ```
2. **Install Extension:**
   ```bash
   mkdir -p ~/.hermes/extensions
   cp ../hermes-collabora-extension/collabora-viewer.js ~/.hermes/extensions/
   ```
3. **Start Collabora Backend (Docker):**
   ```bash
   cd ../hermes-collabora-extension
   docker compose -f docker-compose.collabora.yml up -d
   ```
4. **Run WebUI:**
   ```bash
   cd ../hermes-webui
   ./start.sh
   ```

---

## 3. Environment Configuration
Create a `.env` file in your project root to manage keys:
```bash
# LLM Configuration
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Paths
WORKSPACE_DIR=/home/user/Dropbox/hermes_workspace
HERMES_DATA_DIR=/home/user/.hermes
```

---

## 4. Why this approach?
1. **Direct File Access:** The LLM works directly in your Dropbox. You can open a `.docx` on your phone, and the Agent sees your changes instantly.
2. **Native Performance:** `libreoffice-mcp` communicates via local sockets, avoiding container networking overhead.
3. **Extensibility:** Running the WebUI natively makes it trivial to debug and add custom JavaScript extensions to `~/.hermes/extensions`.
4. **Reliability:** Collabora stays in Docker, ensuring its complex dependencies don't conflict with your system libraries.

## 5. Troubleshooting
- **LibreOffice Connection:** If the MCP server can't connect, ensure no other `soffice` instances are running and that port `2083` is open.
- **Collabora Preview:** Ensure the WOPI server (`wopi_server.py`) is running; it acts as the bridge between the Docker container and your native files.
