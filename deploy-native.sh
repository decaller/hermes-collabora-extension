#!/bin/bash
set -e

PROJECT_ROOT="/root/hermesDIL"
WORKSPACE_DIR="/root/Dropbox"
HERMES_DATA_DIR="/root/.hermes"
PYTHON_VERSION="3.11"

echo "Updating apt..."
apt-get update

echo "Stopping old Docker containers..."
cd $PROJECT_ROOT
docker compose down || true

echo "Installing native dependencies..."
apt-get install -y python3-pip python3-venv libreoffice libreoffice-script-provider-python fonts-dejavu-core fonts-liberation curl git tini

echo "Installing uv..."
if [ ! -f /root/.local/bin/uv ]; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="$PATH:/root/.local/bin"

echo "Setting up LibreOffice MCP venv..."
uv venv /opt/libreoffice-mcp-venv --python $PYTHON_VERSION --system-site-packages --clear
uv pip install -r $PROJECT_ROOT/libreoffice-mcp/requirements.txt fastapi uvicorn "mcp[cli]" a2wsgi --python /opt/libreoffice-mcp-venv/bin/python

echo "Setting up WOPI Server venv..."
uv venv /opt/wopi-server-venv --python $PYTHON_VERSION --clear

echo "Extracting Hermes Agent source..."
docker run --rm -v /tmp:/tmp nousresearch/hermes-agent:latest tar -czf /tmp/hermes-agent.tar.gz -C /opt hermes
tar -xzf /tmp/hermes-agent.tar.gz -C /opt
rm /tmp/hermes-agent.tar.gz

echo "Extracting Hermes WebUI source..."
docker run --rm -v /tmp:/tmp ghcr.io/nesquena/hermes-webui:latest tar -czf /tmp/hermes-webui.tar.gz -C /apptoo .
mkdir -p /opt/hermes-webui
tar -xzf /tmp/hermes-webui.tar.gz -C /opt/hermes-webui
rm /tmp/hermes-webui.tar.gz

echo "Setting up Hermes Agent venv..."
uv venv /opt/hermes-venv --python $PYTHON_VERSION --clear
uv pip install -e /opt/hermes --python /opt/hermes-venv/bin/python

echo "Setting up Hermes WebUI venv..."
uv venv /opt/hermes-webui-venv --python $PYTHON_VERSION --clear
uv pip install -e /opt/hermes --python /opt/hermes-webui-venv/bin/python
uv pip install -r /opt/hermes-webui/requirements.txt --python /opt/hermes-webui-venv/bin/python

echo "Configuring Systemd Services..."

# LibreOffice MCP
cat <<EOF > /etc/systemd/system/libreoffice-mcp.service
[Unit]
Description=LibreOffice MCP Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT/libreoffice-mcp
Environment=VIRTUAL_ENV=/opt/libreoffice-mcp-venv
Environment=PATH=/opt/libreoffice-mcp-venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PYTHONPATH="/usr/lib/python3/dist-packages:/usr/lib/libreoffice/program"
Environment=LIBREOFFICE_OUTPUT_DIR=$WORKSPACE_DIR
ExecStartPre=-/usr/bin/pkill soffice
ExecStartPre=/usr/bin/soffice --headless --accept="socket,host=localhost,port=2083;urp;" --nodefault --nologo --nofirststartwizard &
ExecStart=/opt/libreoffice-mcp-venv/bin/python libreoffice.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

# WOPI Server
cat <<EOF > /etc/systemd/system/wopi-server.service
[Unit]
Description=WOPI Server for Collabora
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT/hermes-collabora-extension
ExecStart=/opt/wopi-server-venv/bin/python wopi_server.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

# Hermes Agent
cat <<EOF > /etc/systemd/system/hermes-agent.service
[Unit]
Description=Hermes Agent
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/hermes
Environment=HERMES_DATA_DIR=$HERMES_DATA_DIR
Environment=WORKSPACE_DIR=$WORKSPACE_DIR
Environment=PATH=/opt/hermes-venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/opt/hermes-venv/bin/hermes gateway run
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

# Hermes WebUI
cat <<EOF > /etc/systemd/system/hermes-webui.service
[Unit]
Description=Hermes WebUI
After=hermes-agent.service

[Service]
Type=simple
WorkingDirectory=/opt/hermes-webui
Environment=HERMES_AGENT_URL=http://localhost:8642/v1
Environment=HERMES_WEBUI_EXTENSION_DIR=$PROJECT_ROOT/hermes-collabora-extension
Environment=HERMES_WEBUI_EXTENSION_SCRIPT_URLS=/extensions/collabora-viewer.js
Environment=PATH=/opt/hermes-webui-venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PYTHONPATH=/opt/hermes
ExecStart=/opt/hermes-webui-venv/bin/python server.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd and starting services..."
systemctl daemon-reload
systemctl enable libreoffice-mcp wopi-server hermes-agent hermes-webui
systemctl restart libreoffice-mcp wopi-server hermes-agent hermes-webui

echo "Starting Collabora in Docker..."
cat <<EOF > $PROJECT_ROOT/docker-compose.collabora-only.yml
version: '3.8'
services:
  collabora:
    image: collabora/code:latest
    container_name: collabora
    restart: unless-stopped
    ports:
      - "9980:9980"
    environment:
      aliasgroups: "host=http://localhost:8787"
      dictionaries: "en_US id_ID"
      username: "admin"
      password: "changeme_admin_pass"
      DONT_GEN_SSL_CERT: "1"
      extra_params: >-
        --o:ssl.enable=false
        --o:ssl.termination=false
        --o:net.frame_ancestors="http://localhost:8787"
        --o:logging.level=warning
        --o:server_name=localhost:9980
        --o:storage.wopi.host[0]=host.docker.internal
        --o:storage.wopi.alias_groups.mode=first
    cap_add:
      - MKNOD
    extra_hosts:
      - "host.docker.internal:host-gateway"
EOF

docker compose -f $PROJECT_ROOT/docker-compose.collabora-only.yml up -d

echo "Deployment complete!"
