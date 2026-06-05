# Hermes & Collabora Integration Report

## 1. Current Architecture
The current setup consists of three primary components orchestrating a collaborative document editing environment:
- **Hermes Core & WebUI**: The main chat and workspace interface. Hermes WebUI provides a file browser on the right rail and supports injecting custom JavaScript/CSS extensions.
- **Collabora Online (CODE)**: A headless LibreOffice-based container providing document rendering and editing over WebSockets.
- **Custom WOPI Server sidecar**: Because Hermes does not natively provide a WOPI endpoint for files, a lightweight Python sidecar (`wopi-server`) runs alongside Collabora to serve files from the shared `/workspace` volume over the WOPI protocol.

## 2. Docker Compose Configuration
The architecture is split into two logical configurations:
1. `docker-compose.yml`: Runs the `hermes` backend and `hermes-webui` frontend. It defines the `hermes-net` network and mounts the host project directory.
2. `docker-compose.collabora.yml`: Runs `collabora` and the `wopi-server`. It joins the `hermes-net` network, mounts the same host project directory as `/workspace`, and configures Collabora's security settings (`aliasgroups`, `frame_ancestors`) to allow framing within Hermes WebUI.

## 3. Extension Injection Mechanism
The Hermes WebUI has been configured with:
```yaml
HERMES_WEBUI_EXTENSION_DIR: "/extensions"
HERMES_WEBUI_EXTENSION_SCRIPT_URLS: "/extensions/collabora-viewer.js"
HERMES_WEBUI_EXTENSION_STYLESHEET_URLS: "/extensions/collabora-viewer.css"
```
The extensions are mounted from `~/.hermes/extensions` on the host to `/extensions` in the WebUI container.

## 4. How the Integration Works
1. **Intercepting Clicks**: The `collabora-viewer.js` script monkey-patches the global `window.downloadFile` function in Hermes.
2. **Filtering by Extension**: When a user clicks `.docx`, `.xlsx`, or `.pptx` files, the patch intercepts the click.
3. **Injecting the Preview Pane**: It dynamically resizes the workspace layout, appends a new `preview-pane` `div`, and creates an `iframe` pointing to Collabora.
4. **WOPI Protocol**: The iframe's `src` requests `WOPISrc=http://wopi-server:8880/wopi/files/<encoded_path>`. Collabora connects to the Python sidecar which reads the file directly from the shared `/workspace` volume and returns the file metadata and bytes.

## 5. Security and CSP
- Collabora is configured with `--o:net.frame_ancestors="http://localhost:8787 http://hermes-webui:8787"` to allow Hermes to embed it.
- SSL is disabled for internal Docker network communication.
- The WOPI server restricts access to the mounted `/workspace` volume.

## 6. Testing Results
The extension successfully intercepts document clicks, injects the Collabora iframe side-by-side with the chat interface, communicates through the custom WOPI server, and renders spreadsheets and documents natively in the browser without downloading them.
