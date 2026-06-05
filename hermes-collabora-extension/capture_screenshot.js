const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

const outPath = process.argv[2] || 'screenshot.png';

http.get('http://localhost:9222/json/version', (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        const info = JSON.parse(body);
        const wsUrl = info.webSocketDebuggerUrl;
        
        const ws = new WebSocket(wsUrl);
        
        ws.on('open', function open() {
            ws.send(JSON.stringify({id: 1, method: "Page.captureScreenshot", params: {format: "png"}}));
        });
        
        ws.on('message', function incoming(data) {
            const msg = JSON.parse(data.toString());
            if (msg.id === 1 && msg.result && msg.result.data) {
                fs.writeFileSync(outPath, Buffer.from(msg.result.data, 'base64'));
                console.log(`Saved screenshot to ${outPath}`);
                ws.close();
            }
        });
    });
});
