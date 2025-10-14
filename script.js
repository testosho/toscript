// =======================================================================
// == ToscripT - Full Corrected JavaScript (October 2025)
// =======================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL VARIABLES & DOM ELEMENTS ---
    let projectData = { projectInfo: { projectName: 'Untitled', scriptContent: '', scenes: [] } };
    let showSceneNumbers = true;
    let autoSaveInterval = null;
    let currentView = 'write';

    const mainHeader = document.getElementById('main-header');
    const scriptHeader = document.getElementById('script-header');
    const cardHeader = document.getElementById('card-header');
    const writeView = document.getElementById('write-view');
    const scriptView = document.getElementById('script-view');
    const cardView = document.getElementById('card-view');
    const editor = document.getElementById('rich-editor');
    const screenplayOutput = document.getElementById('screenplay-output');
    const menuPanel = document.getElementById('menu-panel');
    const sceneNavigatorPanel = document.getElementById('scene-navigator-panel');
    const fileInput = document.getElementById('file-input');

    const placeholderText = `TITLE: UNTITLED SCRIPT\n\nINT. ROOM - DAY\n\nThis is where your script begins.`;

    // --- 2. CORE HELPER FUNCTIONS ---

    // Gets the plain text from the rich editor for saving and parsing
    function getFountainText() {
        if (!editor) return "";
        let text = [];
        editor.childNodes.forEach(node => {
            if (node.nodeType === 1) { // It's an element (a <div> line)
                 text.push(node.textContent || "");
            }
        });
        return text.join('\n');
    }

    // Determines the screenplay element type of a line of text
    function getElementType(line, previousLineType) {
        const upperLine = line.trim().toUpperCase();
        
        if (upperLine.startsWith('INT.') || upperLine.startsWith('EXT.')) return 'scene-heading';
        if (upperLine.endsWith('TO:') || upperLine === 'FADE OUT.' || upperLine === 'FADE IN:' || upperLine === 'FADE TO BLACK:') return 'transition';
        if (upperLine.startsWith('(') && upperLine.endsWith(')')) return 'parenthetical';
        if (previousLineType === 'character' || previousLineType === 'parenthetical') return 'dialogue';
        if (upperLine.length > 0 && !upperLine.includes('.') && upperLine.length < 35 && upperLine === line.trim()) return 'character';
        
        return 'action'; // Default
    }

    // Downloads a file
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // --- 3. RICH TEXT EDITOR LOGIC ---

    // Saves the cursor's position within the editor
    function saveCursorPosition(context) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return null;
        const range = selection.getRangeAt(0);
        const startNode = range.startContainer;
        const startOffset = range.startOffset;

        let nodeIndex = -1;
        const nodes = Array.from(context.childNodes);
        let container = startNode;
        
        // Find the top-level <div> that contains the cursor
        while (container && container.parentNode !== context) {
            container = container.parentNode;
        }
        nodeIndex = nodes.indexOf(container);

        return { nodeIndex, startOffset };
    }

    // Restores the cursor's position
    function restoreCursorPosition(context, position) {
        if (!position || position.nodeIndex === -1) return;
        
        const targetNode = context.childNodes[position.nodeIndex];
        if (!targetNode) return;
        
        let textNode = targetNode.firstChild;
        if (!textNode) { // Handle empty lines
            targetNode.innerHTML = '';
            textNode = document.createTextNode('');
            targetNode.appendChild(textNode);
        };
        
        const selection = window.getSelection();
        const range = document.createRange();
        const maxOffset = textNode.textContent.length;
        const offset = Math.min(position.startOffset, maxOffset);
        
        range.setStart(textNode, offset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Formats a single line in the editor based on its content
    function formatLine(lineElement, previousLineType) {
        if (!lineElement || lineElement.nodeType !== 1) return 'action';
        const currentLineType = getElementType(lineElement.textContent, previousLineType);
        lineElement.className = `editor-${currentLineType}`;
        
        // Auto-casing rules
        if (currentLineType === 'scene-heading' || currentLineType === 'character' || currentLineType === 'transition') {
            lineElement.textContent = lineElement.textContent.toUpperCase();
        }
        return currentLineType;
    }

    // Initializes the rich editor with all its event listeners
    function initializeRichEditor() {
        if (!editor) return;

        const formatAllLines = () => {
            const pos = saveCursorPosition(editor);
            let previousLineType = null;
            Array.from(editor.childNodes).forEach(line => {
                previousLineType = formatLine(line, previousLineType);
            });
            restoreCursorPosition(editor, pos);
        };

        editor.addEventListener('input', () => {
            const selection = window.getSelection();
            if(!selection.anchorNode) return;
            const line = selection.anchorNode.parentNode;
            const prevLine = line.previousSibling;
            const prevLineType = prevLine ? prevLine.className.replace('editor-', '') : null;
            formatLine(line, prevLineType);
        });

        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.execCommand('insertHTML', false, '</div><div>');
                
                setTimeout(() => { // Format after the new div is inserted
                    const selection = window.getSelection();
                    const line = selection.anchorNode.parentNode;
                    const prevLine = line.previousSibling;
                    const prevLineType = prevLine ? prevLine.className.replace('editor-', '') : null;
                    formatLine(line, prevLineType);
                }, 1);
            }
        });
        
        window.formatScript = formatAllLines; // Make it globally accessible
    }

    // --- 4. CORE APP LOGIC (DATA, VIEWS, ACTIONS) ---

    // Handles clicks on the formatting toolbar buttons
    function handleActionBtn(action) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        const line = selection.anchorNode.parentNode;
        if (!line || !editor.contains(line)) return;

        let previousLineType = line.previousSibling ? line.previousSibling.className.replace('editor-', '') : null;

        const actions = {
            'character': 'character',
            'dialogue': 'dialogue',
            'parenthetical': 'parenthetical',
            'transition': 'transition',
            'scene': 'scene-heading'
        };

        if (actions[action]) {
            line.className = `editor-${actions[action]}`;
            formatLine(line, previousLineType);
        }
    }
    
    // Switches between Write, Script, and Card views
    function switchView(view) {
        currentView = view;
        
        [writeView, scriptView, cardView].forEach(v => v.classList.remove('active'));
        [mainHeader, scriptHeader, cardHeader].forEach(h => h.style.display = 'none');
        
        const viewMap = {
            'write': { view: writeView, header: mainHeader },
            'script': { view: scriptView, header: scriptHeader },
            'card': { view: cardView, header: cardHeader }
        };
        
        if(viewMap[view]) {
            viewMap[view].view.classList.add('active');
            viewMap[view].header.style.display = 'flex';
        }

        if (view === 'script') renderEnhancedScript();
        if (view === 'card') renderEnhancedCardView();

        document.body.dispatchEvent(new Event('viewchange'));
    }

    // Loads data from Local Storage
    function loadProjectData() {
        const savedData = localStorage.getItem('universalFilmProjectToScript');
        if (savedData) {
            try { projectData = JSON.parse(savedData); }
            catch (e) { console.warn('Failed to parse saved data.'); }
        }
        
        if (projectData.projectInfo.scriptContent && projectData.projectInfo.scriptContent.trim()) {
            editor.innerHTML = '<div>' + projectData.projectInfo.scriptContent.replace(/\n/g, '</div><div>') + '</div>';
        } else {
            editor.innerHTML = '<div>' + placeholderText.replace(/\n/g, '</div><div>') + '</div>';
        }
        setTimeout(window.formatScript, 50); // Format loaded text
    }

    // Saves data to Local Storage
    function saveProjectData() {
        projectData.projectInfo.scriptContent = getFountainText();
        localStorage.setItem('universalFilmProjectToScript', JSON.stringify(projectData));
        console.log("Project Saved.");
    }
    
    // Renders the formatted screenplay preview
    function renderEnhancedScript() {
        const text = getFountainText();
        if (!text.trim()) {
            screenplayOutput.innerHTML = '<div>Preview will appear here.</div>';
            return;
        }

        const lines = text.split('\n');
        let scriptHtml = '';
        let sceneCount = 0;
        let previousLineType = null;

        lines.forEach(line => {
            const currentLineType = getElementType(line, previousLineType);
            const lineHtml = line.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            if (!line.trim()) {
                scriptHtml += '<div class="empty-line"></div>';
            } else {
                if (currentLineType === 'scene-heading') {
                    sceneCount++;
                    const sceneNumHtml = showSceneNumbers ? `<span class="scene-number">${sceneCount}</span>` : '';
                    scriptHtml += `<div class="scene-heading">${lineHtml}${sceneNumHtml}</div>`;
                } else {
                     scriptHtml += `<div class="${currentLineType}">${lineHtml}</div>`;
                }
            }
            previousLineType = currentLineType;
        });
        screenplayOutput.innerHTML = scriptHtml;
    }
    
    // --- 5. INITIALIZATION & EVENT LISTENERS ---

    function initialize() {
        loadProjectData();
        initializeRichEditor();
        // Add other initializations if necessary
        
        // --- Setup All Event Listeners ---
        document.body.addEventListener('click', (e) => {
            // Main View Switching
            if (e.target.closest('#show-script-btn')) switchView('script');
            if (e.target.closest('#show-write-btn-header')) switchView('write');
            if (e.target.closest('#show-write-btn-card-header')) switchView('write');
            if (e.target.closest('#card-view-btn')) switchView('card');

            // Hamburger Menu Toggles
            if (e.target.closest('#hamburger-btn, #hamburger-btn-script, #hamburger-btn-card')) {
                menuPanel.classList.toggle('open');
            } else if (!e.target.closest('#menu-panel')) {
                menuPanel.classList.remove('open');
            }
            
            // Scene Navigator Toggles
            if (e.target.closest('#scene-navigator-btn, #scene-navigator-btn-script')) {
                sceneNavigatorPanel.classList.toggle('open');
            }
            if (e.target.closest('#close-navigator-btn')) {
                sceneNavigatorPanel.classList.remove('open');
            }
            
            // Toolbar Buttons
            const actionBtn = e.target.closest('.action-btn, .keyboard-btn');
            if(actionBtn) {
                handleActionBtn(actionBtn.dataset.action);
            }

            // Menu Links
            if (e.target.closest('#new-btn')) {
                 if(confirm('Start a new project? Unsaved changes will be lost.')) {
                    editor.innerHTML = '<div>' + placeholderText.replace(/\n/g, '</div><div>') + '</div>';
                    window.formatScript();
                    saveProjectData();
                 }
            }
            if (e.target.closest('#open-btn')) fileInput.click();
            if (e.target.closest('#save-fountain-btn')) {
                downloadBlob(new Blob([getFountainText()], { type: 'text/plain' }), 'screenplay.fountain');
            }
            if (e.target.closest('#save-pdf-btn')) {
                alert("PDF generation is a complex feature being rebuilt. Please check back later!");
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (readEvent) => {
                const content = readEvent.target.result;
                editor.innerHTML = '<div>' + content.replace(/\n/g, '</div><div>') + '</div>';
                window.formatScript();
                saveProjectData();
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Auto-save interval
        setInterval(saveProjectData, 30000); // Save every 30 seconds

        console.log("ToscripT Initialized Successfully.");
    }

    initialize(); // Run the application
});
