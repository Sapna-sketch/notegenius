/* ==========================================================================
   NoteGenius Frontend Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Global Application State ---
    let currentNoteData = null; // Stores currently generated note
    let modalNoteData = null;   // Stores note currently viewed in modal
    let savedNotesList = [];    // Cached saved notes list

    // --- DOM Elements ---
    
    // Theme Toggle
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    // Navigation Links (Header & Mobile Drawer)
    const navLinks = {
        home: [document.getElementById('nav-link-home'), document.getElementById('drawer-link-home'), document.getElementById('footer-link-home')],
        generator: [document.getElementById('nav-link-generator'), document.getElementById('drawer-link-generator'), document.getElementById('footer-link-generator'), document.getElementById('btn-header-get-started'), document.getElementById('btn-hero-cta'), document.getElementById('btn-empty-saved-cta')],
        saved: [document.getElementById('nav-link-saved'), document.getElementById('drawer-link-saved'), document.getElementById('footer-link-saved'), document.getElementById('btn-hero-saved')]
    };
    const navLogo = document.getElementById('nav-logo');
    
    // Views
    const views = {
        home: document.getElementById('home-section'),
        generator: document.getElementById('generator-section'),
        saved: document.getElementById('saved-notes-section')
    };
    
    // Mobile Drawer Elements
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const drawerCloseBtn = document.getElementById('drawer-close-btn');
    const drawerOverlay = document.getElementById('drawer-overlay');
    
    // Generator Page Input Panel
    const inputTitle = document.getElementById('input-note-title');
    const inputContent = document.getElementById('input-study-content');
    const btnClearInput = document.getElementById('btn-clear-input');
    const btnGenerate = document.getElementById('btn-generate-notes');
    const statusLabel = document.querySelector('.status-label');
    const statusDot = document.querySelector('.status-dot');
    
    // Generator Output Workspace
    const outputPanelEmpty = document.getElementById('output-panel-empty');
    const outputPanelActive = document.getElementById('output-panel-active');
    const outputNoteHeading = document.getElementById('output-note-title-heading');
    
    // Generator Tab Controls & Panes
    const tabButtons = document.querySelectorAll('.output-tabs .tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const renderedStructuredNotes = document.getElementById('rendered-structured-notes');
    const renderedKeyPoints = document.getElementById('rendered-key-points');
    const renderedSummary = document.getElementById('rendered-summary');
    
    // Generator Workspace Actions
    const btnSaveNote = document.getElementById('btn-save-note');
    const btnCopyWorkspace = document.getElementById('btn-copy-workspace');
    const btnDownloadDropdown = document.getElementById('btn-download-dropdown');
    const downloadDropdownMenu = document.getElementById('download-dropdown-menu');
    const btnDownloadTxt = document.getElementById('btn-download-txt');
    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    
    // Saved Notes Panel
    const savedNotesGrid = document.getElementById('saved-notes-grid');
    const savedNotesLoader = document.getElementById('saved-notes-loader');
    const savedNotesEmpty = document.getElementById('saved-notes-empty');
    const searchSavedInput = document.getElementById('search-saved-notes');
    
    // Detailed Note View Modal
    const noteModalOverlay = document.getElementById('note-modal-overlay');
    const modalNoteTitle = document.getElementById('modal-note-title');
    const modalTabButtons = document.querySelectorAll('.modal-tabs .modal-tab-btn');
    const modalTabPanes = document.querySelectorAll('.modal-tab-pane');
    const modalRenderedStructured = document.getElementById('modal-rendered-structured');
    const modalRenderedKey = document.getElementById('modal-rendered-key');
    const modalRenderedSummary = document.getElementById('modal-rendered-summary');
    const btnCloseModal = document.getElementById('btn-close-modal');
    
    // Modal Footer Actions
    const btnDeleteModalNote = document.getElementById('btn-delete-modal-note');
    const btnCopyModal = document.getElementById('btn-copy-modal');
    const btnModalDownloadDropdown = document.getElementById('btn-modal-download-dropdown');
    const modalDownloadDropdownMenu = document.getElementById('modal-download-dropdown-menu');
    const btnModalDownloadTxt = document.getElementById('btn-modal-download-txt');
    const btnModalDownloadPdf = document.getElementById('btn-modal-download-pdf');
    
    // Print/PDF Temp Container
    const printContainer = document.getElementById('print-container');
    const toastContainer = document.getElementById('toast-container');


    /* ==========================================================================
       1. Theme Management (Light / Dark Mode)
       ========================================================================== */
    
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.className = savedTheme;
        } else {
            // Default to light theme
            document.body.className = 'light-theme';
            localStorage.setItem('theme', 'light-theme');
        }
    };
    
    const toggleTheme = () => {
        if (document.body.classList.contains('light-theme')) {
            document.body.className = 'dark-theme';
            localStorage.setItem('theme', 'dark-theme');
            showToast('Switched to Dark Theme', 'info');
        } else {
            document.body.className = 'light-theme';
            localStorage.setItem('theme', 'light-theme');
            showToast('Switched to Light Theme', 'info');
        }
    };
    
    themeToggleBtn.addEventListener('click', toggleTheme);
    initTheme();


    /* ==========================================================================
       2. SPA Routing (View Swapping)
       ========================================================================== */
    
    const switchView = (targetView) => {
        // Hide all views, remove active classes from nav items
        Object.keys(views).forEach(key => {
            views[key].classList.remove('active-view');
        });
        
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.drawer-item').forEach(item => item.classList.remove('active'));
        
        // Show target view
        views[targetView].classList.add('active-view');
        
        // Highlight active headers
        const headerLink = document.getElementById(`nav-link-${targetView}`);
        if (headerLink) headerLink.classList.add('active');
        
        const drawerLink = document.getElementById(`drawer-link-${targetView}`);
        if (drawerLink) drawerLink.classList.add('active');
        
        // Close Mobile Drawer if open
        closeMobileDrawer();
        
        // Load initial data for specific views
        if (targetView === 'saved') {
            loadSavedNotes();
        }
        
        // Scroll to top of viewport
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Bind Navigation Link arrays to switchView function
    Object.keys(navLinks).forEach(key => {
        navLinks[key].forEach(element => {
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    switchView(key);
                });
            }
        });
    });
    
    if (navLogo) {
        navLogo.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('home');
        });
    }


    /* ==========================================================================
       3. Mobile Drawer Controls
       ========================================================================== */
    
    const openMobileDrawer = () => {
        mobileDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
    };
    
    const closeMobileDrawer = () => {
        mobileDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    };
    
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileDrawer);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeMobileDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeMobileDrawer);


    /* ==========================================================================
       4. Toast Notifications
       ========================================================================== */
    
    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-exclamation';
        
        toast.innerHTML = `
            <i class="fa-solid ${icon} toast-icon"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove toast
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    };


    /* ==========================================================================
       5. Checking Backend/API engine Status
       ========================================================================== */
    
    const checkEngineStatus = async () => {
        try {
            const response = await fetch('/api/status');
            if (response.ok) {
                const data = await response.json();
                if (data.gemini_active) {
                    statusDot.className = 'status-dot active';
                    statusLabel.textContent = 'Gemini AI Engine Active';
                } else {
                    statusDot.className = 'status-dot local';
                    statusLabel.textContent = 'Local NLP Summarizer Active';
                }
            } else {
                throw new Error();
            }
        } catch (error) {
            statusDot.className = 'status-dot local';
            statusLabel.textContent = 'Local NLP Summarizer Active (Offline Mode)';
        }
    };
    
    checkEngineStatus();


    /* ==========================================================================
       6. Generator Core: Generate Notes
       ========================================================================== */
    
    // Clear Input Inputs
    btnClearInput.addEventListener('click', () => {
        inputTitle.value = '';
        inputContent.value = '';
        showToast('Workspace cleared', 'info');
    });
    
    // Generation trigger
    btnGenerate.addEventListener('click', async () => {
        const title = inputTitle.value.trim();
        const content = inputContent.value.trim();
        
        if (!content) {
            showToast('Please paste your study content first!', 'error');
            inputContent.focus();
            return;
        }
        
        if (content.length < 50) {
            showToast('Content is too short! Paste at least 50 characters.', 'error');
            inputContent.focus();
            return;
        }
        
        // Toggle Loading Button State
        btnGenerate.classList.add('loading');
        btnGenerate.disabled = true;
        inputTitle.disabled = true;
        inputContent.disabled = true;
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    content: content
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                currentNoteData = {
                    title: result.title,
                    original_text: result.original_text,
                    summary: result.summary,
                    key_points: result.key_points,
                    structured_notes: result.structured_notes
                };
                
                // Render outputs using marked.js parser
                outputNoteHeading.textContent = currentNoteData.title;
                renderedStructuredNotes.innerHTML = marked.parse(currentNoteData.structured_notes);
                renderedKeyPoints.innerHTML = marked.parse(currentNoteData.key_points);
                renderedSummary.textContent = currentNoteData.summary;
                
                // Show Output Workspace
                outputPanelEmpty.style.display = 'none';
                outputPanelActive.style.display = 'flex';
                
                // Reset tab views to first tab
                switchTab('tab-structured-notes', tabButtons, tabPanes);
                
                // Enable Save Notes button
                btnSaveNote.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save to My Notes';
                btnSaveNote.disabled = false;
                
                showToast('Notes generated successfully!', 'success');
                
                // Scroll output workspace into view on mobile
                if (window.innerWidth <= 1024) {
                    outputPanelActive.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                showToast(result.message || 'Generation failed.', 'error');
            }
        } catch (error) {
            showToast('Network error occurred. Please try again.', 'error');
            console.error('Generation Network Error:', error);
        } finally {
            btnGenerate.classList.remove('loading');
            btnGenerate.disabled = false;
            inputTitle.disabled = false;
            inputContent.disabled = false;
        }
    });

    // Helper to switch active tabs
    const switchTab = (targetTabId, buttons, panes) => {
        buttons.forEach(btn => {
            if (btn.getAttribute('data-tab') === targetTabId || btn.getAttribute('data-modal-tab') === targetTabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        panes.forEach(pane => {
            if (pane.id === targetTabId) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    };
    
    // Tab switching for Generator output
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            switchTab(target, tabButtons, tabPanes);
        });
    });
    
    // Tab switching for Modal
    modalTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-modal-tab');
            switchTab(target, modalTabButtons, modalTabPanes);
        });
    });


    /* ==========================================================================
       7. Generator Workspace Actions (Save, Copy, Downloads)
       ========================================================================== */
    
    // Save generated notes to SQLite DB
    btnSaveNote.addEventListener('click', async () => {
        if (!currentNoteData) return;
        
        btnSaveNote.disabled = true;
        btnSaveNote.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentNoteData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showToast('Study notes saved successfully to database!', 'success');
                btnSaveNote.innerHTML = '<i class="fa-solid fa-circle-check"></i> Saved';
            } else {
                showToast(result.message || 'Failed to save notes.', 'error');
                btnSaveNote.disabled = false;
                btnSaveNote.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save to My Notes';
            }
        } catch (error) {
            showToast('Error saving note.', 'error');
            btnSaveNote.disabled = false;
            btnSaveNote.innerHTML = '<i class="fa-solid fa-bookmark"></i> Save to My Notes';
        }
    });

    // Copy Content to clipboard
    const copyToClipboard = (noteSource) => {
        if (!noteSource) return;
        
        // Find which tab is active to copy the correct text
        let textToCopy = '';
        let activeTabId = '';
        
        if (noteSource === 'workspace') {
            tabPanes.forEach(pane => {
                if (pane.classList.contains('active')) activeTabId = pane.id;
            });
            
            if (activeTabId === 'tab-structured-notes') {
                textToCopy = currentNoteData.structured_notes;
            } else if (activeTabId === 'tab-key-points') {
                textToCopy = currentNoteData.key_points;
            } else {
                textToCopy = currentNoteData.summary;
            }
        } else if (noteSource === 'modal') {
            modalTabPanes.forEach(pane => {
                if (pane.classList.contains('active')) activeTabId = pane.id;
            });
            
            if (activeTabId === 'modal-tab-structured') {
                textToCopy = modalNoteData.structured_notes;
            } else if (activeTabId === 'modal-tab-key') {
                textToCopy = modalNoteData.key_points;
            } else {
                textToCopy = modalNoteData.summary;
            }
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('Copied active tab text to clipboard!', 'success');
        }).catch(err => {
            showToast('Failed to copy text.', 'error');
        });
    };
    
    btnCopyWorkspace.addEventListener('click', () => copyToClipboard('workspace'));
    btnCopyModal.addEventListener('click', () => copyToClipboard('modal'));

    // Dropdown toggle logic
    const setupDropdown = (triggerBtn, dropdownMenu) => {
        triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('open');
        });
        
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('open');
        });
    };
    
    setupDropdown(btnDownloadDropdown, downloadDropdownMenu);
    setupDropdown(btnModalDownloadDropdown, modalDownloadDropdownMenu);

    // TXT File Downloader helper
    const downloadAsTxtFile = (note) => {
        if (!note) return;
        
        const timestamp = new Date(note.created_at || Date.now()).toLocaleDateString();
        const divider = '='.repeat(60);
        
        const fileContent = 
`NOTEGENIUS STUDY GUIDE: ${note.title.toUpperCase()}
Generated on: ${timestamp}
${divider}

[SUMMARY]
${note.summary}

${divider}

[KEY STUDY POINTS]
${note.key_points}

${divider}

[STRUCTURED STUDY OUTLINE]
${note.structured_notes}

${divider}
Generated with NoteGenius AI Notes Generator.
`;
        
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Sanitize title for filename
        const filename = note.title.toLowerCase().replace(/[^a-z0-9]/gi, '_') + '_study_guide.txt';
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('Study Guide downloaded as TXT!', 'success');
    };
    
    btnDownloadTxt.addEventListener('click', () => downloadAsTxtFile(currentNoteData));
    btnModalDownloadTxt.addEventListener('click', () => downloadAsTxtFile(modalNoteData));

    // PDF Printer helper (saves browser layout as PDF)
    const downloadAsPdf = (note) => {
        if (!note) return;
        
        const timestamp = new Date(note.created_at || Date.now()).toLocaleDateString();
        
        // Parse markdown notes to structured HTML for printing
        const structuredHtml = marked.parse(note.structured_notes);
        const keyPointsHtml = marked.parse(note.key_points);
        
        // Assemble clean HTML for the print layout container
        printContainer.innerHTML = `
            <h1>NoteGenius Study Notes: ${note.title}</h1>
            <p style="text-align: center; color: #555555; margin-bottom: 20px; font-style: italic;">
                Study Guide Generated on ${timestamp}
            </p>
            
            <div class="print-summary-box">
                <h3 style="margin-top: 0; color: #333;">Executive Summary</h3>
                <p>${note.summary}</p>
            </div>
            
            <h2>Key Takeaways & Points</h2>
            <div>${keyPointsHtml}</div>
            
            <h2 style="page-break-before: always;">Structured Lecture Outline</h2>
            <div>${structuredHtml}</div>
        `;
        
        showToast('Preparing Print Dialog. Choose "Save as PDF" to download.', 'info');
        
        // Short pause to allow DOM painting before printing
        setTimeout(() => {
            window.print();
        }, 300);
    };
    
    btnDownloadPdf.addEventListener('click', () => downloadAsPdf(currentNoteData));
    btnModalDownloadPdf.addEventListener('click', () => downloadAsPdf(modalNoteData));


    /* ==========================================================================
       8. Saved Notes View Logic (Database listing)
       ========================================================================== */
    
    const loadSavedNotes = async () => {
        savedNotesGrid.innerHTML = '';
        savedNotesGrid.style.display = 'none';
        savedNotesEmpty.style.display = 'none';
        savedNotesLoader.style.display = 'block';
        
        try {
            const response = await fetch('/api/notes');
            const result = await response.json();
            
            if (result.success) {
                savedNotesList = result.notes;
                renderSavedNotesGrid(savedNotesList);
            } else {
                showToast(result.message || 'Failed to read saved database.', 'error');
                savedNotesLoader.style.display = 'none';
                savedNotesEmpty.style.display = 'block';
            }
        } catch (error) {
            showToast('Error connecting to backend database.', 'error');
            savedNotesLoader.style.display = 'none';
            savedNotesEmpty.style.display = 'block';
        }
    };
    
    const renderSavedNotesGrid = (notes) => {
        savedNotesLoader.style.display = 'none';
        
        if (!notes || notes.length === 0) {
            savedNotesEmpty.style.display = 'block';
            savedNotesGrid.style.display = 'none';
            return;
        }
        
        savedNotesEmpty.style.display = 'none';
        savedNotesGrid.style.display = 'grid';
        savedNotesGrid.innerHTML = '';
        
        notes.forEach(note => {
            const dateObj = new Date(note.created_at);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const card = document.createElement('div');
            card.className = 'saved-card';
            card.innerHTML = `
                <div class="saved-card-header">
                    <h3 class="saved-card-title" title="${note.title}">${note.title}</h3>
                    <span class="saved-card-date">${formattedDate}</span>
                </div>
                <div class="saved-card-body">
                    <p class="saved-card-preview">${note.summary}</p>
                </div>
                <div class="saved-card-footer">
                    <button class="btn btn-secondary btn-sm btn-open-note" data-id="${note.id}">
                        <i class="fa-solid fa-folder-open"></i> Open Note
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-card-note" data-id="${note.id}" title="Delete Note">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            
            savedNotesGrid.appendChild(card);
        });
        
        // Bind Open Note buttons
        document.querySelectorAll('.btn-open-note').forEach(btn => {
            btn.addEventListener('click', () => {
                const noteId = btn.getAttribute('data-id');
                openNoteInModal(noteId);
            });
        });
        
        // Bind Delete Note card buttons
        document.querySelectorAll('.btn-delete-card-note').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const noteId = btn.getAttribute('data-id');
                confirmAndDeleteNote(noteId);
            });
        });
    };

    // Live search function
    searchSavedInput.addEventListener('input', () => {
        const query = searchSavedInput.value.toLowerCase().trim();
        const filteredNotes = savedNotesList.filter(note => 
            note.title.toLowerCase().includes(query) || 
            note.summary.toLowerCase().includes(query)
        );
        renderSavedNotesGrid(filteredNotes);
    });


    /* ==========================================================================
       9. Saved Note Detail Modal
       ========================================================================== */
    
    const openNoteInModal = async (noteId) => {
        try {
            const response = await fetch(`/api/notes/${noteId}`);
            const result = await response.json();
            
            if (result.success) {
                modalNoteData = result.note;
                
                modalNoteTitle.textContent = modalNoteData.title;
                modalRenderedStructured.innerHTML = marked.parse(modalNoteData.structured_notes);
                modalRenderedKey.innerHTML = marked.parse(modalNoteData.key_points);
                modalRenderedSummary.textContent = modalNoteData.summary;
                
                // Show modal overlay
                noteModalOverlay.classList.add('open');
                
                // Reset tab views to first tab
                switchTab('modal-tab-structured', modalTabButtons, modalTabPanes);
            } else {
                showToast(result.message || 'Could not fetch note details.', 'error');
            }
        } catch (error) {
            showToast('Network error loading note details.', 'error');
        }
    };
    
    const closeModal = () => {
        noteModalOverlay.classList.remove('open');
        modalNoteData = null;
    };
    
    btnCloseModal.addEventListener('click', closeModal);
    noteModalOverlay.addEventListener('click', (e) => {
        if (e.target === noteModalOverlay) {
            closeModal();
        }
    });

    // Delete notes operations
    const confirmAndDeleteNote = async (noteId) => {
        const confirmed = confirm('Are you sure you want to delete this note from the database? This cannot be undone.');
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (result.success) {
                showToast('Note deleted successfully', 'success');
                // Reload lists
                loadSavedNotes();
            } else {
                showToast(result.message || 'Failed to delete note', 'error');
            }
        } catch (error) {
            showToast('Error communicating with server to delete note.', 'error');
        }
    };
    
    btnDeleteModalNote.addEventListener('click', () => {
        if (!modalNoteData) return;
        const deleteId = modalNoteData.id;
        closeModal();
        confirmAndDeleteNote(deleteId);
    });

});
