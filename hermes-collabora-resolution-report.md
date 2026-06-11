# Resolution Report: Collabora Integration & Content Security Policy (CSP) Resolution

This report details the final resolution of the Collabora Online (CODE) integration into the Hermes WebUI. The initial integration was blocked by browser-enforced Content Security Policies (CSP) injected by the proxy layer and Cloudflare Access. By applying a surgical CSP policy update, direct subdomain framing has been successfully enabled.

---

## 1. Executive Summary
- **Status:** **Resolved / Fully Functional (2026-06-10)**
- **Root Cause:** Injected Content Security Policies (CSP) at the Cloudflare Access level prevented cross-subdomain framing of `collabora.dianinsanlestari.co.id` within `hermes.dianinsanlestari.co.id`.
- **Resolution:** Added a dedicated `frame-src` directive in the Cloudflare Access CSP headers.
- **Result:** The Hermes WebUI can now frame the Collabora subdomain directly. The previous same-origin routing workaround (via Zoraxy virtual directories) has been superseded by direct subdomain routing for cleaner network architecture and improved performance.

---

## 2. Technical Context & Network Stack

The finalized deployment topology runs on the test server (`100.66.101.58`) under the following schema:

| Layer | Component | Target Domain / Port | Protocol / Transport | Status |
| :--- | :--- | :--- | :--- | :--- |
| **External Proxy** | Zoraxy | `hermes.dianinsanlestari.co.id` | HTTPS (Wildcard SSL) | Active |
| **Main UI** | Hermes WebUI | Port `8787` (Native) | HTTP | Active |
| **Office Editor** | Collabora CODE | `collabora.dianinsanlestari.co.id` | HTTPS (Docker Port `9980`) | Active |
| **Filesystem** | WOPI Bridge | Port `8880` (Native) | HTTP | Active |

---

## 3. Chronology of Resolution

### Phase 1: Proxy-level Alignment (Zoraxy)
- **Problem:** Zoraxy's default security headers injected a strict global CSP that overrode backend rules.
- **Action:** Disabled Zoraxy-injected enforcing `Content-Security-Policy` and `X-Frame-Options` headers on `hermes.dianinsanlestari.co.id`. Enabled `SkipWebSocketOriginCheck` on `collabora.dianinsanlestari.co.id`.

### Phase 2: Cloudflare Access CSP Blocker (Workaround Applied)
- **Problem:** Browsers encountered a second CSP blocker injected by Cloudflare Access:
  ```
  Framing 'https://collabora.dianinsanlestari.co.id/' violates CSP: "default-src 'self' https://*.cloudflareaccess.com"
  ```
- **Workaround:** Implemented same-origin virtual directories in Zoraxy (`/browser`, `/hosting`, `/loleaflet` mapping to the Collabora container), allowing the iframe to load under `window.location.origin` (satisfying the `'self'` directive).

### Phase 3: Final Resolution (Direct Subdomain Framing)
- **Problem with Workaround:** Path-based proxying of Collabora's complex websocket and asset streams via virtual directories added overhead and configuration complexity.
- **Action:** Modified the Cloudflare Access CSP configuration to explicitly permit framing the Collabora subdomain.
  
  **CSP Configuration Change:**
  - **Previous policy:**
    ```http
    default-src 'self' https://*.cloudflareaccess.com
    ```
  - **Updated policy (added frame-src):**
    ```http
    frame-src 'self' blob: https://collabora.dianinsanlestari.co.id
    ```

---

## 4. Code & Configuration Changes

### 4.1. Extension Script Update
To match the direct subdomain integration, the frontend browser extension [collabora-viewer.js](file:///home/abuhafi/Project/hermesDIL/hermes-collabora-extension/collabora-viewer.js) has been updated from `v10` (same-origin routing) to `v11` (subdomain-directed routing):

```diff
-  // Same-origin /browser avoids Cloudflare Access CSP (default-src 'self') blocking cross-subdomain iframes.
-  const collaboraUrl = window.location.origin;
+  // Cloudflare Access CSP now allows framing the subdomain directly.
+  const collaboraUrl = 'https://collabora.dianinsanlestari.co.id';
   const collaboraVersion = 'f0f0f2a66a';
 
-  console.log('[Collabora] Extension v10 (same-origin) initialized ✓ ', ' —  Collabora at', collaboraUrl);
-  console.log('[Collabora] Opening documents via /browser and /wopi on', window.location.host);
+  console.log('[Collabora] Extension v11 (subdomain) initialized ✓ ', ' —  Collabora at', collaboraUrl);
+  console.log('[Collabora] Opening documents via subdomain and /wopi on', window.location.host);
```

### 4.2. Docker Environment (`docker-compose.collabora.yml`)
The Collabora CODE container is configured with the correct frame ancestor policies to trust the Hermes domain:
```yaml
      extra_params: >-
        --o:ssl.enable=false
        --o:ssl.termination=true
        --o:net.frame_ancestors="https://hermes.dianinsanlestari.co.id"
        --o:logging.level=warning
        --o:server_name=collabora.dianinsanlestari.co.id
        --o:storage.wopi.host[0]=hermes.dianinsanlestari.co.id
```

---

## 5. Verification Checklist

> [!TIP]
> Use these verification steps to confirm correct behavior in a browser window.

1. **Verify Response Headers:**
   Verify that the CSP policy returned from `https://hermes.dianinsanlestari.co.id/` contains the new directive:
   ```bash
   curl -sI https://hermes.dianinsanlestari.co.id/ | grep -i content-security-policy
   ```
2. **Verify Browser Console Logs:**
   Upon loading the Hermes WebUI, check the console logs for the following message:
   ```
   [Collabora] Extension v11 (subdomain) initialized ✓  —  Collabora at https://collabora.dianinsanlestari.co.id
   ```
3. **Verify Document Editing:**
   Open any `.docx`, `.xlsx`, or `.pptx` file. Confirm that the Collabora frame loads correctly without console errors or blocked requests.
