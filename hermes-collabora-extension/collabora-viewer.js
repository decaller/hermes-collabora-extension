(function() {
  // Cloudflare Access CSP now allows framing the subdomain directly.
  const collaboraUrl = 'https://collabora.dianinsanlestari.co.id';
  const collaboraVersion = 'f0f0f2a66a';

  console.log('[Collabora] Extension v11 (subdomain) initialized ✓ ', ' —  Collabora at', collaboraUrl);
  console.log('[Collabora] Opening documents via subdomain and /wopi on', window.location.host);
  window._collaDownloadPatched = true;

  // Patch window.api to handle creating templates
  if (window.api && !window._collaApiPatched) {
    const originalApi = window.api;
    window.api = async function(path, opts) {
      if (path === '/api/file/create' && opts && opts.method === 'POST' && opts.body) {
        try {
          const body = JSON.parse(opts.body);
          const filePath = body.path;
          const match = filePath.match(/\.(docx|xlsx|pptx|doc|xls|ppt|odt|ods|odp)$/i);
          if (match) {
            const fileType = match[1].toLowerCase();
            console.log('[Collabora] Intercepted new file creation for office type:', fileType, filePath);
            
            const wopiUrl = window.location.origin + '/wopi/create?name=' + encodeURIComponent(filePath) + '&type=' + fileType;
            const response = await fetch(wopiUrl, { method: 'POST' });
            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || 'Failed to create template file');
            }
            return { ok: true, path: filePath };
          }
        } catch (e) {
          console.error('[Collabora] Error creating template file:', e);
          throw e;
        }
      }
      return originalApi.apply(this, arguments);
    };
    window._collaApiPatched = true;
    console.log('[Collabora] window.api patched for templates ✓');
  }

  // Inject creation buttons in the workspace panel actions bar
  const injectDocButtons = () => {
    const newFileBtn = document.getElementById('btnNewFile');
    if (newFileBtn && !document.getElementById('btnNewDoc')) {
      const createBtn = (id, tooltip, iconSvg, type, ext) => {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'panel-icon-btn has-tooltip has-tooltip--bottom';
        btn.setAttribute('data-tooltip', tooltip);
        btn.innerHTML = iconSvg;
        btn.onclick = async () => {
          if (!window.S || !window.S.session) return;
          const name = await window.showPromptDialog({
            title: `New ${type}`,
            placeholder: `filename${ext}`,
            confirmLabel: 'Create'
          });
          if (!name || !name.trim()) return;
          let filename = name.trim();
          if (!filename.toLowerCase().endsWith(ext)) {
            filename += ext;
          }
          const relPath = window.S.currentDir === '.' ? filename : (window.S.currentDir + '/' + filename);
          try {
            await window.api('/api/file/create', {
              method: 'POST',
              body: JSON.stringify({
                session_id: window.S.session.session_id,
                path: relPath,
                content: ''
              })
            });
            if (window.showToast) window.showToast(`Created ${filename}`);
            if (window.loadDir) await window.loadDir(window.S.currentDir);
            if (window.openFile) window.openFile(relPath);
          } catch (e) {
            if (window.setStatus) window.setStatus(`Create failed: ${e.message}`);
          }
        };
        return btn;
      };

      const docIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
      const sheetIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`;
      const slideIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;

      const btnDoc = createBtn('btnNewDoc', 'New Document (.docx)', docIcon, 'Document', '.docx');
      const btnSheet = createBtn('btnNewSheet', 'New Spreadsheet (.xlsx)', sheetIcon, 'Spreadsheet', '.xlsx');
      const btnSlide = createBtn('btnNewSlide', 'New Presentation (.pptx)', slideIcon, 'Presentation', '.pptx');

      newFileBtn.parentNode.insertBefore(btnDoc, newFileBtn.nextSibling);
      btnDoc.parentNode.insertBefore(btnSheet, btnDoc.nextSibling);
      btnSheet.parentNode.insertBefore(btnSlide, btnSheet.nextSibling);
      console.log('[Collabora] Document buttons injected ✓');
    }
  };

  setInterval(injectDocButtons, 1000);
  
  const init = () => {
    if (window.downloadFile && window.openFile) {
      const originalDownload = window.downloadFile;
      const originalOpen = window.openFile;
      
      const handleColla = (path, originalFn, args, thisArg) => {
        if (path.match(/\.(docx|doc|xlsx|xls|pptx|ppt|odt|ods|odp|csv)$/i)) {
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
              previewPane.style.width = Math.max(200, newWidth) + 'px';
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
          
          closeBtn.onclick = () => {
            if (previewPane && previewPane.parentElement) {
              previewPane.parentElement.removeChild(previewPane);
              if (resizer && resizer.parentElement) resizer.parentElement.removeChild(resizer);
              workspace.style.display = ''; 
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
          
          const fileId = encodeURIComponent(path);
          const wopiSrc = encodeURIComponent(window.location.origin + '/wopi/files/' + fileId);
          iframe.src = collaboraUrl + '/browser/' + collaboraVersion + '/cool.html?WOPISrc=' + wopiSrc;
          
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

      console.log('[Collabora] File handlers patched ✓');
    } else {
      setTimeout(init, 500);
    }
  };
  init();
})();
