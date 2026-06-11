# Comprehensive Report: Collabora Integration & Path-Routing Failures

## 1. Problem Discovery
The integration of Collabora Online (CODE) into the native Hermes WebUI initially failed with a "Blocked Content" error. While the chat interface was functional, document previews appeared as blank spaces or displayed "Refused to connect."

## 2. Technical Context & Network Stack (Hybrid-Native)
The current deployment is distributed across the following components on the test server (`100.66.101.58`):

| Layer | Component | Port | Transport |
| :--- | :--- | :--- | :--- |
| **External Proxy** | Zoraxy | 443 | HTTPS (Wildcard SSL) |
| **Main UI** | Hermes WebUI | 8787 | HTTP (Natively served) |
| **Agent** | Hermes Agent | 8642 | HTTP (API Gateway) |
| **Office Editor**| Collabora CODE| 9980 | HTTP (Docker) |
| **Filesystem**| WOPI Bridge | 8880 | HTTP (Natively served) |

## 3. The Hypothesis
The root problem is **Origin & Protocol Fragmentation**.
Modern browsers block "Mixed Content" (HTTPS loading HTTP). Additionally, strict Content Security Policies (CSP) prevent the Hermes domain from "framing" the Collabora domain unless explicit trust is established at both the proxy and application levels.

## 4. Solutions Attempted & Results

### Attempt 1: Hardcoded Direct Ports
*   **Error:** `Mixed Content: The page was loaded over HTTPS, but requested an insecure frame.`

### Attempt 2: Self-Signed SSL on Port 9980
*   **Error:** `ERR_CERT_AUTHORITY_INVALID`. Browser refused background loading of untrusted certificates in an iframe.

### Attempt 3: Path-Based Routing via Zoraxy (`/browser`)
*   **Error:** **404 Not Found.** Collabora's internal asset paths are complex; path-stripping in Zoraxy's "Virtual Directories" mangled the requests.

### Attempt 4: The "Internal Proxy" (Python sidecar)
*   **Error:** **Synchronous Bottleneck.** The Python-based internal proxy failed to handle the binary streams and WebSocket upgrades required for real-time editing.

### Attempt 5: The Subdomain Strategy (Recommended)
*   **Method:** Moved Collabora to its own subdomain (`collabora.dianinsanlestari.co.id`).
*   **Result:** Improved performance and resolved path mangling.
*   **New Blocker:** **Zoraxy Header Injection.** Zoraxy's default "Security Headers" were found to be injecting an enforcing CSP (`default-src 'self'`) that ignored the backend's permissive patches.

## 5. Current Blockers & Technical Debt
1.  **Proxy Policy Conflict:** Zoraxy's global CSP presets override the surgical patches applied to the Hermes `server.py` and `api/helpers.py`.
2.  **Reporting URL Mismatch:** The WebUI was initially sending relative reporting URLs (`/api/csp-report`), which caused "Invalid Endpoint" warnings when accessed through the reverse proxy. (Now fixed with absolute URLs).

## 6. Required Path Forward (Final Alignment)
We have moved from application-level fixes to **Proxy-level tuning**.
1.  **Relax Zoraxy CSP:** The `hermes` subdomain rule in Zoraxy must have its internal CSP toggle turned **OFF** to allow the application's native (and correctly configured) policy to take precedence.
2.  **Enable WebSockets:** The `collabora` subdomain rule in Zoraxy must have "Skip WebSocket Origin Check" enabled.
3.  **Unified Protocol:** Ensure both subdomains are served over the same protocol (HTTPS) via Zoraxy to satisfy browser safety checks.

---
**Status:** **Proxy Aligned (2026-06-08).** Zoraxy changes applied on `103.167.12.129:8000`:
1. **hermes.dianinsanlestari.co.id** — Removed Zoraxy-injected enforcing `Content-Security-Policy` and `X-Frame-Options` custom headers; disabled Permission-Policy header injection. Hermes backend CSP (`report-only`) now controls framing policy.
2. **collabora.dianinsanlestari.co.id** — `SkipWebSocketOriginCheck` was already enabled; no header overrides present.

**Verification:** `curl -sSI https://hermes.dianinsanlestari.co.id/` no longer returns an enforcing `content-security-policy` header — only the backend's `content-security-policy-report-only` with `frame-src` allowing `collabora.dianinsanlestari.co.id`.

### Follow-up: Cloudflare Access CSP (2026-06-08)
Browser console showed a **second** blocker after Zoraxy alignment:
```
Framing 'https://collabora.dianinsanlestari.co.id/' violates CSP: "default-src 'self' https://*.cloudflareaccess.com"
```
Cloudflare Access injects an enforcing CSP on the Hermes page. Cross-subdomain iframes fail because `frame-src` is unset and `default-src 'self'` does not include the Collabora subdomain.

**Fix applied:** Same-origin Collabora via Zoraxy Virtual Directories on `hermes.dianinsanlestari.co.id`:
| Path | Upstream |
|------|----------|
| `/browser` | `192.168.100.34:9980/browser` |
| `/hosting` | `192.168.100.34:9980/hosting` |
| `/loleaflet` | `192.168.100.34:9980/loleaflet` |

`collabora-viewer.js` v10 now sets `collaboraUrl = window.location.origin` so the iframe loads `https://hermes.dianinsanlestari.co.id/browser/...` (same-origin, allowed by Cloudflare Access `'self'`).
