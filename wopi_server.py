import os
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

class WOPIHandler(BaseHTTPRequestHandler):
    def get_file_info(self, path):
        # Path is like /wopi/files/some/file.txt or /wopi/files/some/file.txt/contents
        parts = path.split('?')[0].strip('/').split('/')
        if len(parts) >= 3 and parts[0] == 'wopi' and parts[1] == 'files':
            is_contents = (parts[-1] == 'contents')
            if is_contents:
                file_id = '/'.join(parts[2:-1])
            else:
                file_id = '/'.join(parts[2:])
            file_id = urllib.parse.unquote(file_id)
            abs_path = os.path.join('/workspace', file_id)
            return abs_path, is_contents
        return None, False

    def do_GET(self):
        abs_path, is_contents = self.get_file_info(self.path)
        if abs_path:
            if not is_contents:
                if os.path.exists(abs_path):
                    size = os.path.getsize(abs_path)
                    basename = os.path.basename(abs_path)
                    info = {
                        "BaseFileName": basename,
                        "OwnerId": "admin",
                        "Size": size,
                        "UserId": "admin",
                        "UserCanWrite": True,
                        "SupportsLocks": False,
                        "SupportsUpdate": True
                    }
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(info).encode('utf-8'))
                    return
            else:
                if os.path.exists(abs_path):
                    size = os.path.getsize(abs_path)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/octet-stream')
                    self.send_header('Content-Length', str(size))
                    self.end_headers()
                    with open(abs_path, 'rb') as f:
                        self.wfile.write(f.read())
                    return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        abs_path, is_contents = self.get_file_info(self.path)
        if abs_path and is_contents:
            content_len = int(self.headers.get('X-WOPI-Size', self.headers.get('Content-Length', 0)))
            data = self.rfile.read(content_len)
            with open(abs_path, 'wb') as f:
                f.write(data)
            self.send_response(200)
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8880), WOPIHandler)
    print("WOPI Server running on port 8880...")
    server.serve_forever()
