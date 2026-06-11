#!/usr/bin/env python3
import sys

def modify_file(filepath, replacements):
    print(f"Modifying {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = content
    for target, replacement in replacements:
        if target not in modified:
            print(f"WARNING: Target not found in {filepath}: {target!r}")
            continue
        modified = modified.replace(target, replacement)
    
    if modified == content:
        print(f"No changes made to {filepath}")
        return False
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(modified)
    print(f"Successfully modified {filepath}")
    return True

# 1. api/helpers.py
helpers_replacements = [
    (
        "frame-src 'self' blob: ; ",
        "frame-src 'self' blob: https://collabora.dianinsanlestari.co.id; "
    )
]

# 2. api/routes.py
routes_replacements = [
    (
        'def handle_get(handler, parsed) -> bool:\n    """Handle all GET routes. Returns True if handled, False for 404."""',
        'def handle_get(handler, parsed) -> bool:\n    """Handle all GET routes. Returns True if handled, False for 404."""\n    if parsed.path.startswith("/wopi/"):\n        return proxy_request(handler, "http://localhost:8880")'
    ),
    (
        'def handle_post(handler, parsed) -> bool:\n    """Handle all POST routes. Returns True if handled, False for 404."""',
        'def handle_post(handler, parsed) -> bool:\n    """Handle all POST routes. Returns True if handled, False for 404."""\n    if parsed.path.startswith("/wopi/") or parsed.path == "/wopi/create":\n        return proxy_request(handler, "http://localhost:8880")'
    ),
    (
        'def handle_put(handler, parsed) -> bool:\n    """Handle all PUT routes. Returns True if handled, False for 404."""',
        'def handle_put(handler, parsed) -> bool:\n    """Handle all PUT routes. Returns True if handled, False for 404."""\n    if parsed.path.startswith("/wopi/"):\n        return proxy_request(handler, "http://localhost:8880")'
    )
]

# 3. server.py
server_replacements = [
    (
        'self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")',
        'self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-WOPI-Size")'
    )
]

modify_file("/opt/hermes-webui/api/helpers.py", helpers_replacements)
modify_file("/opt/hermes-webui/api/routes.py", routes_replacements)
modify_file("/opt/hermes-webui/server.py", server_replacements)

print("Modification script finished.")
