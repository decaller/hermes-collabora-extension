(function() {
  const collaboraUrl = 'http://localhost:9980';
  const collaboraVersion = '29388df';

  console.log('[Collabora] Extension v6 initialized \u2713 ', ' \u2014  Collabora at', collaboraUrl);
  console.log('[Collabora] Click any .docx/.xlsx/.pptx in the workspace to open here');
  window._collaDownloadPatched = true;
  
  const init = () => {
    if (window.downloadFile && window.openFile) {
      const originalDownload = window.downloadFile;
      const originalOpen = window.openFile;
      
      const handleColla = (path, originalFn, args, thisArg) => {
        if (path.match(/\.(docx|xlsx|pptx|csv)$/i)) {
          console.log('[Collabora] Intercepted click on:', path);
          
          const workspace = document.querySelector('.rail').nextElementSibling;
          let previewPane = document.getElementById('preview-pane');
          let resizer = document.getElementById('collabora-resizer');
          
          if (!previewPane) {
            previewPane = document.createElement('div');
            previewPane.id = 'preview-pane';
            previewPane.style.flex = '1';
            previewPane.style.position = 'relative';
            previewPane.style.minWidth = '300px';

            resizer = document.createElement('div');
            resizer.id = 'collabora-resizer';
            resizer.style.width = '6px';
            resizer.style.cursor = 'col-resize';
            resizer.style.backgroundColor = '#181825';
            resizer.style.borderLeft = '1px solid #313244';
            resizer.style.borderRight = '1px solid #313244';
            resizer.style.zIndex = '10';
            
            let isResizing = false;
            resizer.onmousedown = (e) => {
              isResizing = true;
              document.body.style.cursor = 'col-resize';
              const iframe = previewPane.querySelector('iframe');
              if (iframe) iframe.style.pointerEvents = 'none';
              e.preventDefault();
            };
            window.addEventListener('mousemove', (e) => {
              if (!isResizing) return;
              previewPane.style.flex = 'none';
              const newWidth = window.innerWidth - e.clientX;
              previewPane.style.width = `${newWidth}px`;
            });
            window.addEventListener('mouseup', () => {
              if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                const iframe = previewPane.querySelector('iframe');
                if (iframe) iframe.style.pointerEvents = 'auto';
              }
            });

            workspace.parentElement.style.display = 'flex';
            workspace.parentElement.appendChild(resizer);
            workspace.parentElement.appendChild(previewPane);
          }
          
          previewPane.innerHTML = '';
          previewPane.style.display = 'flex';
          previewPane.style.flexDirection = 'column';

          const header = document.createElement('div');
          header.style.display = 'flex';
          header.style.justifyContent = 'space-between';
          header.style.alignItems = 'center';
          header.style.padding = '8px 16px';
          header.style.backgroundColor = '#181825';
          header.style.borderBottom = '1px solid #313244';
          header.style.fontFamily = 'system-ui, -apple-system, sans-serif';

          const title = document.createElement('span');
          title.textContent = path.split('/').pop();
          title.style.color = '#cdd6f4';
          title.style.fontWeight = '600';
          title.style.fontSize = '14px';
          
          const btnsContainer = document.createElement('div');
          btnsContainer.style.display = 'flex';
          btnsContainer.style.gap = '8px';

          const fullWidthBtn = document.createElement('button');
          fullWidthBtn.innerHTML = '&#x26F6; Full Width';
          fullWidthBtn.style.padding = '6px 12px';
          fullWidthBtn.style.backgroundColor = 'transparent';
          fullWidthBtn.style.color = '#cdd6f4';
          fullWidthBtn.style.border = '1px solid #45475a';
          fullWidthBtn.style.borderRadius = '6px';
          fullWidthBtn.style.cursor = 'pointer';
          fullWidthBtn.style.fontSize = '13px';
          fullWidthBtn.style.transition = 'background-color 0.2s';
          fullWidthBtn.onmouseover = () => fullWidthBtn.style.backgroundColor = '#313244';
          fullWidthBtn.onmouseout = () => fullWidthBtn.style.backgroundColor = 'transparent';
          
          let isFullWidth = false;
          let hiddenElements = [];
          
          const nativeBtn = document.createElement('button');
          nativeBtn.innerHTML = '&#x21BA; Native Editor';
          nativeBtn.style.padding = '6px 12px';
          nativeBtn.style.backgroundColor = 'transparent';
          nativeBtn.style.color = '#cdd6f4';
          nativeBtn.style.border = '1px solid #45475a';
          nativeBtn.style.borderRadius = '6px';
          nativeBtn.style.cursor = 'pointer';
          nativeBtn.style.fontSize = '13px';
          nativeBtn.style.transition = 'background-color 0.2s';
          nativeBtn.onmouseover = () => nativeBtn.style.backgroundColor = '#313244';
          nativeBtn.onmouseout = () => nativeBtn.style.backgroundColor = 'transparent';
          
          nativeBtn.onclick = () => {
            if (previewPane && previewPane.parentElement) {
              previewPane.parentElement.removeChild(previewPane);
              if (resizer && resizer.parentElement) resizer.parentElement.removeChild(resizer);
              workspace.style.display = ''; 
            }
            originalFn.apply(thisArg, args);
          };

          fullWidthBtn.onclick = () => {
            isFullWidth = !isFullWidth;
            if (isFullWidth) {
              hiddenElements = [];
              Array.from(previewPane.parentElement.children).forEach(child => {
                if (child !== previewPane && child.style.display !== 'none') {
                  hiddenElements.push(child);
                  child.style.display = 'none';
                }
              });
              fullWidthBtn.innerHTML = '&#x25D6; Split View';
              previewPane.style.width = '100%';
              previewPane.style.flex = '1';
              nativeBtn.style.display = 'none';
            } else {
              hiddenElements.forEach(child => {
                child.style.display = '';
              });
              hiddenElements = [];
              if (resizer) resizer.style.display = '';
              fullWidthBtn.innerHTML = '&#x26F6; Full Width';
              nativeBtn.style.display = '';
            }
          };
          
          const closeBtn = document.createElement('button');
          closeBtn.innerHTML = '&#x2715; Close';
          closeBtn.style.padding = '6px 12px';
          closeBtn.style.backgroundColor = 'transparent';
          closeBtn.style.color = '#cdd6f4';
          closeBtn.style.border = '1px solid #45475a';
          closeBtn.style.borderRadius = '6px';
          closeBtn.style.cursor = 'pointer';
          closeBtn.style.fontSize = '13px';
          closeBtn.style.transition = 'background-color 0.2s';
          closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#313244';
          closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';
          
          closeBtn.onclick = () => {
            if (previewPane && previewPane.parentElement) {
              previewPane.parentElement.removeChild(previewPane);
              if (resizer && resizer.parentElement) resizer.parentElement.removeChild(resizer);
              workspace.style.display = ''; // Make sure workspace is visible if closed from full width
            }
          };

          btnsContainer.appendChild(fullWidthBtn);
          btnsContainer.appendChild(nativeBtn);
          btnsContainer.appendChild(closeBtn);
          header.appendChild(title);
          header.appendChild(btnsContainer);

          const iframe = document.createElement('iframe');
          iframe.style.flex = '1';
          iframe.style.width = '100%';
          iframe.style.border = 'none';
          
          // Use WOPI backend
          const fileId = encodeURIComponent(path);
          const wopiSrc = encodeURIComponent('http://wopi-server:8880/wopi/files/' + fileId);
          iframe.src = `${collaboraUrl}/browser/${collaboraVersion}/cool.html?WOPISrc=${wopiSrc}`;
          
          previewPane.appendChild(header);
          previewPane.appendChild(iframe);
          return false;
        } else {
          return originalFn.apply(thisArg, args);
        }
      };

      window.downloadFile = function(path) {
        return handleColla(path, originalDownload, arguments, this);
      };
      window.openFile = function(path) {
        return handleColla(path, originalOpen, arguments, this);
      };

      console.log('[Collabora] File handlers patched \u2713');
    } else {
      setTimeout(init, 500);
    }
  };
  init();
})();
