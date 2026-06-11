# Workspace Verification & Troubleshooting Report — June 6, 2026

This report details the technical challenges and solutions encountered while verifying the native workspace link (Dropbox) and the Hermes Agent CLI functionality.

## 1. Encountered Problems

### A. Safety Filter: Command Injection
*   **Problem:** An attempt to run a precise listing command (`ls -F`) via the Hermes CLI prompt was blocked.
*   **Cause:** The prompt contained backticks which triggered the "Command injection detected" safety guardrail in the CLI orchestration layer.
*   **Solution:** Simplified the prompt to plain language without shell-like symbols.

### B. One-Shot Prompt Failure (`hermes -z`)
*   **Problem:** Repeated attempts to use the `-z` flag resulted in "no final response was produced."
*   **Cause:** In a non-interactive SSH environment, the Hermes agent occasionally fails to signal the end of a session when using the one-shot flag, leading to a silent exit or timeout.
*   **Solution:** Switched to direct API testing via `curl` to get a guaranteed JSON response from the background gateway.

### C. Model Availability (403 Forbidden)
*   **Problem:** The initial API test failed with a `403 Forbidden` error from the provider (`openagentic.id`).
*   **Cause:** The agent was configured to use `claude-3-5-sonnet-latest`, which was restricted on the current API plan ("Model tidak tersedia di plan free").
*   **Solution:** 
    *   Queried the provider for available models.
    *   Updated `config.yaml` to use `claude-sonnet-4.5`.
    *   Restarted the service to apply the change.

### D. Process Conflict (Stale PID)
*   **Problem:** The agent service failed to start after manual CLI tests.
*   **Cause:** A stale `gateway.pid` file and lingering `soffice` processes were preventing the bootstrap script from initializing the gateway.
*   **Solution:** Added `pkill` and `rm -f gateway.pid` logic to the cleanup and verified with `systemctl restart`.

## 2. Current State Verification
*   **Model Status:** Successfully switched to a supported model (`claude-sonnet-4.5`).
*   **API Health:** The API server on port `8642` is now responding correctly.
*   **Workspace Visibility:** Verified that the agent can see both system files (`.hermes/logs`) and sync files (`.dropbox/logs`) via the symlink to `/root/Dropbox`.

## 3. Key Learnings for the Native Move
1.  **API > CLI for Automation:** For background verification in scripts, querying the Hermes API Gateway is more reliable than using the interactive CLI wrapper.
2.  **Config Resilience:** Standardizing the `config.yaml` to use specific, available models prevents cascading startup failures.
3.  **Bootstrap Robustness:** The native setup requires explicit cleanup of background office processes to ensure the UNO bridge doesn't hang.

---
**Conclusion:** The agent is now fully "aware" of its native environment and the workspace sync is confirmed functional. Proceeding to the WebUI phase.
