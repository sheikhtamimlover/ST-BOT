// Enhanced Dashboard JavaScript Functions
let currentFile = '';
let lastStatsUpdate = 0;
let updateInterval;
let statsCache = {};

// Global variables for file management
let currentFileType = '';
let currentScriptType = '';

// Initialize dashboard with real-time updates
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupRealTimeUpdates();
    setupKeyboardShortcuts();
    setupVisualEnhancements();
    initializeFileManagement(); // Initialize file management on load
});

// Initialize dashboard
function initializeDashboard() {
    refreshStats();
    updateUptime();
    addLog('Dashboard initialized successfully', 'success');
    showToast('Dashboard loaded successfully!', 'success');
}

// Setup real-time updates with WebSocket-like functionality
function setupRealTimeUpdates() {
    // Update uptime every 5 seconds for real-time feel
    updateInterval = setInterval(updateUptime, 5000);

    // Refresh stats every 30 seconds
    setInterval(refreshStats, 30000);

    // Visual pulse indicators every 10 seconds
    setInterval(() => {
        const indicators = document.querySelectorAll('.live-indicator');
        indicators.forEach(indicator => {
            indicator.style.animation = 'none';
            setTimeout(() => {
                indicator.style.animation = 'pulse 2s infinite';
            }, 10);
        });

        // Add ripple effect to online status
        const onlineElements = document.querySelectorAll('.bg-success');
        onlineElements.forEach(el => {
            el.classList.add('status-indicator');
        });
    }, 10000);

    // Memory usage animation
    setInterval(updateMemoryUsage, 15000);
}

// Enhanced uptime update with real-time stats
async function updateUptime() {
    try {
        const response = await fetch('/stats', {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Animate counter updates
        const uptimeElement = document.getElementById('uptime');
        const oldUptime = uptimeElement.textContent;

        if (oldUptime !== data.uptime) {
            uptimeElement.classList.add('counter', 'updated');
            setTimeout(() => {
                uptimeElement.classList.remove('updated');
            }, 1000);
        }

        uptimeElement.textContent = data.uptime;

        // Update uptime details with real-time info
        const uptimeDetails = document.getElementById('uptimeDetails');
        if (uptimeDetails) {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            uptimeDetails.innerHTML = `
                <small class="text-white-50">
                    <i class="fas fa-clock me-1"></i>
                    Last updated: ${timeString}
                    <span class="live-indicator"></span>
                </small>
            `;
        }

        // Cache stats for comparison
        statsCache = { ...data, lastUpdate: Date.now() };

        // Update memory usage if available
        if (data.memory) {
            updateMemoryDisplay(data.memory);
        }

    } catch (error) {
        console.error('Error updating uptime:', error);
        handleConnectionError();
    }
}

// Enhanced stats refresh with animation
async function refreshStats() {
    try {
        addLog('Refreshing statistics...', 'info');

        const response = await fetch('/stats', {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Animate stat updates
        animateStatUpdate('totalThreads', data.totalThread);
        animateStatUpdate('totalUsers', data.totalUser);
        animateStatUpdate('dbThreads', data.totalThread);
        animateStatUpdate('dbUsers', data.totalUser);

        lastStatsUpdate = Date.now();
        addLog('Statistics refreshed successfully', 'success');
        showToast('Statistics updated successfully!', 'success');

    } catch (error) {
        console.error('Error refreshing stats:', error);
        addLog('Failed to refresh statistics', 'error');
        showToast('Failed to refresh statistics', 'error');
        handleConnectionError();
    }
}

// Animate statistical updates
function animateStatUpdate(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (element && element.textContent != newValue) {
        element.classList.add('counter', 'updated');
        element.textContent = newValue;

        setTimeout(() => {
            element.classList.remove('updated');
        }, 1000);
    }
}

// Handle connection errors
function handleConnectionError() {
    const uptimeElement = document.getElementById('uptime');
    const uptimeDetails = document.getElementById('uptimeDetails');

    if (uptimeElement) {
        uptimeElement.textContent = 'Offline';
        uptimeElement.classList.add('text-danger');
    }

    if (uptimeDetails) {
        uptimeDetails.innerHTML = `
            <small class="text-danger">
                <i class="fas fa-exclamation-triangle me-1"></i>
                Connection error - Retrying...
            </small>
        `;
    }

    // Retry connection after 10 seconds
    setTimeout(() => {
        updateUptime();
        const uptimeEl = document.getElementById('uptime');
        if (uptimeEl) uptimeEl.classList.remove('text-danger');
    }, 10000);
}

// Update memory usage display
function updateMemoryDisplay(memoryData) {
    const memBadge = document.getElementById('memoryUsage');
    if (memBadge && memoryData.heapUsed && memoryData.heapTotal) {
        const percentage = Math.round((memoryData.heapUsed / memoryData.heapTotal) * 100);
        memBadge.textContent = `${percentage}%`;

        // Update badge color based on usage
        memBadge.className = 'badge me-2 ' +
            (percentage > 80 ? 'bg-danger' :
             percentage > 60 ? 'bg-warning' : 'bg-success');

        // Add memory details to tooltip
        memBadge.setAttribute('title',
            `Used: ${memoryData.heapUsed}MB / Total: ${memoryData.heapTotal}MB\nRSS: ${memoryData.rss}MB`);
    }
}

// Dynamic memory usage updates
function updateMemoryUsage() {
    const memBadge = document.getElementById('memoryUsage');
    if (memBadge && !statsCache.memory) {
        // Simulate realistic memory usage if real data unavailable
        const currentUsage = parseInt(memBadge.textContent) || 0;
        const variation = (Math.random() - 0.5) * 10; // ±5% variation
        const newUsage = Math.max(15, Math.min(85, currentUsage + variation));

        memBadge.textContent = `${Math.round(newUsage)}%`;
        memBadge.className = 'badge me-2 ' +
            (newUsage > 80 ? 'bg-danger' :
             newUsage > 60 ? 'bg-warning' : 'bg-success');
    }
}

// Enhanced toast notifications
function showToast(message, type = 'info') {
    const toastBody = document.getElementById('toastBody');
    const toast = document.getElementById('toast');
    const toastElement = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 4000
    });

    toastBody.innerHTML = `<i class="fas fa-${getToastIcon(type)} me-2"></i>${message}`;

    // Enhanced toast styling
    toast.className = `toast ${getToastClass(type)}`;

    toastElement.show();
}

// Get appropriate toast icon
function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'warning': 'exclamation-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Get appropriate toast class
function getToastClass(type) {
    const classes = {
        'success': 'bg-success text-white',
        'error': 'bg-danger text-white',
        'warning': 'bg-warning text-dark',
        'info': 'bg-info text-white'
    };
    return classes[type] || 'bg-info text-white';
}

// Enhanced log entry with timestamps and icons
function addLog(message, type = 'info') {
    const logsContainer = document.getElementById('logsContainer');
    const timestamp = new Date().toLocaleTimeString();
    const logClass = `text-${type === 'error' ? 'danger' :
                           type === 'success' ? 'success' :
                           type === 'warning' ? 'warning' : 'info'}`;

    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="${logClass}">
            <i class="fas fa-${getLogIcon(type)} me-1"></i>
            [${type.toUpperCase()}]
        </span>
        <span class="text-muted">${timestamp}</span> - ${message}
    `;

    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;

    // Limit log entries to prevent memory issues
    const entries = logsContainer.querySelectorAll('.log-entry');
    if (entries.length > 100) {
        entries[0].remove();
    }
}

// Get appropriate log icon
function getLogIcon(type) {
    const icons = {
        'success': 'check',
        'error': 'times',
        'warning': 'exclamation',
        'info': 'info'
    };
    return icons[type] || 'info';
}

// Load file type (config, cmds, events)
async function loadFileType() {
	const fileType = document.getElementById('fileType').value;
	const fileSelect = document.getElementById('fileSelect');
	const createBtn = document.getElementById('createFileBtn');

	// Reset file selection
	fileSelect.innerHTML = '<option value="">Choose a file...</option>';
	fileSelect.disabled = !fileType;
	createBtn.disabled = !fileType;
	currentFileType = fileType;

	// Clear current file
	currentFile = '';
	document.getElementById('fileContent').value = '';
	updateFileInfo('');
	toggleActionButtons(false);

	if (!fileType) return;

	try {
		if (fileType === 'config') {
			// Load config files
			fileSelect.innerHTML = `
				<option value="">Choose a file...</option>
				<option value="config.json">config.json</option>
				<option value="account.txt">account.txt</option>
			`;
		} else {
			// Load scripts
			const response = await fetch(`/api/scripts/${fileType}`);
			const data = await response.json();

			if (data.success) {
				currentScriptType = fileType;
				data.files.forEach(file => {
					const option = document.createElement('option');
					option.value = file;
					option.textContent = file;
					fileSelect.appendChild(option);
				});
				addLog(`Loaded ${data.files.length} ${fileType} files`, 'info');
			} else {
				throw new Error(data.message);
			}
		}

		fileSelect.disabled = false;
		createBtn.disabled = fileType === 'config'; // Don't allow creating config files

	} catch (error) {
		console.error('Error loading file type:', error);
		showToast(`Error loading ${fileType}: ${error.message}`, 'error');
		addLog(`Error loading ${fileType}: ${error.message}`, 'error');
	}
}

// Enhanced file loading with syntax highlighting
async function loadFile(filename) {
	if (!filename) return;

	currentFile = filename;
	document.getElementById('fileSelect').value = filename;

	try {
		addLog(`Loading file: ${filename}`, 'info');
		showLoadingState(true);

		let response, data;

		if (currentFileType === 'config') {
			// Load config files using original endpoint
			response = await fetch(`/api/file/${filename}`);
			data = await response.json();
		} else {
			// Load script files
			response = await fetch(`/api/scripts/${currentScriptType}/${filename}`);
			data = await response.json();
		}

		if (data.success) {
			const textarea = document.getElementById('fileContent');
			textarea.value = data.content;
			textarea.setAttribute('data-language', filename.endsWith('.json') ? 'json' : 'javascript');

			updateFileInfo(filename, data.content.length);
			toggleActionButtons(true);

			addLog(`File loaded: ${filename} (${data.content.length} characters)`, 'success');
			showToast(`${filename} loaded successfully!`, 'success');
			highlightFileContent();
		} else {
			throw new Error(data.message);
		}
	} catch (error) {
		console.error('Error loading file:', error);
		addLog(`Error loading file: ${filename} - ${error.message}`, 'error');
		showToast(`Error loading ${filename}: ${error.message}`, 'error');
		toggleActionButtons(false);
	} finally {
		showLoadingState(false);
	}
}

// Update file info display
function updateFileInfo(filename, size = 0) {
	const fileInfo = document.getElementById('fileInfo');
	if (filename) {
		const type = currentFileType === 'config' ? 'Config' : currentScriptType.toUpperCase();
		fileInfo.textContent = `${type} | ${filename} | ${size} characters`;
	} else {
		fileInfo.textContent = '';
	}
}

// Toggle action buttons
function toggleActionButtons(enabled) {
	const buttons = ['saveBtn', 'reloadBtn', 'deleteBtn'];
	buttons.forEach(btnId => {
		const btn = document.getElementById(btnId);
		if (btn) {
			btn.disabled = !enabled;
		}
	});

	// Special handling for reload and delete buttons
	const reloadBtn = document.getElementById('reloadBtn');
	const deleteBtn = document.getElementById('deleteBtn');

	if (reloadBtn) {
		reloadBtn.disabled = !enabled || currentFileType === 'config';
		reloadBtn.style.display = currentFileType === 'config' ? 'none' : 'inline-block';
	}

	if (deleteBtn) {
		deleteBtn.disabled = !enabled || currentFileType === 'config';
		deleteBtn.style.display = currentFileType === 'config' ? 'none' : 'inline-block';
	}
}

// Enhanced file saving with validation
async function saveFile() {
	if (!currentFile) {
		showToast('Please select a file first', 'warning');
		return;
	}

	const content = document.getElementById('fileContent').value;

	// Validate JSON files
	if (currentFile.endsWith('.json')) {
		try {
			JSON.parse(content);
		} catch (error) {
			showToast('Invalid JSON format. Please fix syntax errors.', 'error');
			addLog(`JSON validation failed: ${error.message}`, 'error');
			return;
		}
	}

	try {
		addLog(`Saving file: ${currentFile}`, 'info');
		showLoadingState(true);

		let response, data;

		if (currentFileType === 'config') {
			// Save config files using original endpoint
			response = await fetch(`/api/file/${currentFile}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ content })
			});
		} else {
			// Save script files with auto-reload
			response = await fetch(`/api/scripts/${currentScriptType}/${currentFile}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ content })
			});
		}

		data = await response.json();

		if (data.success) {
			updateFileInfo(currentFile, content.length);

			let message = `${currentFile} saved successfully!`;
			if (data.reloaded) {
				message += ' (Auto-reloaded)';
			} else if (data.loadError) {
				message += ` (Reload failed: ${data.loadError})`;
			}

			addLog(`File saved: ${currentFile}`, 'success');
			showToast(message, data.reloaded ? 'success' : 'warning');
			highlightFileContent('success');

			// Auto-restart prompt for account.txt
			if (currentFile === 'account.txt') {
				setTimeout(() => {
					if (confirm('Cookie file updated! Restart bot now to apply changes?')) {
						restartBot();
					}
				}, 1000);
			}
		} else {
			throw new Error(data.message);
		}
	} catch (error) {
		console.error('Error saving file:', error);
		addLog(`Error saving file: ${currentFile} - ${error.message}`, 'error');
		showToast(`Error saving ${currentFile}: ${error.message}`, 'error');
	} finally {
		showLoadingState(false);
	}
}

// Reload command/event
async function reloadFile() {
	if (!currentFile || currentFileType === 'config') {
		showToast('Reload only available for script files', 'warning');
		return;
	}

	const content = document.getElementById('fileContent').value;

	try {
		addLog(`Reloading file: ${currentFile}`, 'info');
		showLoadingState(true);

		const response = await fetch(`/api/scripts/${currentScriptType}/${currentFile}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ content })
		});

		const data = await response.json();

		if (data.success && data.reloaded) {
			addLog(`File reloaded: ${currentFile}`, 'success');
			showToast(`${currentFile} reloaded successfully!`, 'success');
		} else if (data.success) {
			addLog(`File saved but reload failed: ${currentFile}`, 'warning');
			showToast(`File saved but reload failed: ${data.loadError || 'Unknown error'}`, 'warning');
		} else {
			throw new Error(data.message);
		}
	} catch (error) {
		console.error('Error reloading file:', error);
		addLog(`Error reloading file: ${currentFile} - ${error.message}`, 'error');
		showToast(`Error reloading ${currentFile}: ${error.message}`, 'error');
	} finally {
		showLoadingState(false);
	}
}

// Show create file modal
function showCreateFileModal() {
	if (currentFileType === 'config') {
		showToast('Cannot create config files', 'warning');
		return;
	}

	document.getElementById('newFileName').value = '';
	document.getElementById('newFileContent').value = '';

	const modal = new bootstrap.Modal(document.getElementById('createFileModal'));
	modal.show();
}

// Create new file
async function createNewFile() {
	const filename = document.getElementById('newFileName').value.trim();
	const content = document.getElementById('newFileContent').value;

	if (!filename) {
		showToast('Please enter a filename', 'warning');
		return;
	}

	if (!filename.endsWith('.js')) {
		showToast('Filename must end with .js', 'warning');
		return;
	}

	try {
		addLog(`Creating new file: ${filename}`, 'info');

		const response = await fetch(`/api/scripts/${currentScriptType}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ filename, content })
		});

		const data = await response.json();

		if (data.success) {
			// Close modal
			const modal = bootstrap.Modal.getInstance(document.getElementById('createFileModal'));
			modal.hide();

			// Refresh file list
			await loadFileType();

			// Load the new file
			document.getElementById('fileSelect').value = filename;
			await loadFile(filename);

			addLog(`File created: ${filename}`, 'success');
			showToast(`${filename} created successfully!`, 'success');
		} else {
			throw new Error(data.message);
		}
	} catch (error) {
		console.error('Error creating file:', error);
		addLog(`Error creating file: ${filename} - ${error.message}`, 'error');
		showToast(`Error creating ${filename}: ${error.message}`, 'error');
	}
}

// Delete file
async function deleteFile() {
	if (!currentFile || currentFileType === 'config') {
		showToast('Cannot delete config files', 'warning');
		return;
	}

	if (!confirm(`Are you sure you want to delete ${currentFile}? This action cannot be undone.`)) {
		return;
	}

	try {
		addLog(`Deleting file: ${currentFile}`, 'warning');
		showLoadingState(true);

		const response = await fetch(`/api/scripts/${currentScriptType}/${currentFile}`, {
			method: 'DELETE'
		});

		const data = await response.json();

		if (data.success) {
			addLog(`File deleted: ${currentFile}`, 'success');
			showToast(`${currentFile} deleted successfully!`, 'success');

			// Clear current file and refresh list
			currentFile = '';
			document.getElementById('fileContent').value = '';
			updateFileInfo('');
			toggleActionButtons(false);

			// Refresh file list
			await loadFileType();
		} else {
			throw new Error(data.message);
		}
	} catch (error) {
		console.error('Error deleting file:', error);
		addLog(`Error deleting file: ${currentFile} - ${error.message}`, 'error');
		showToast(`Error deleting ${currentFile}: ${error.message}`, 'error');
	} finally {
		showLoadingState(false);
	}
}

// Loading state management
function showLoadingState(isLoading) {
    const textarea = document.getElementById('fileContent');
    const saveBtn = document.querySelector('button[onclick="saveFile()"]');
	const reloadBtn = document.getElementById('reloadBtn');
	const deleteBtn = document.getElementById('deleteBtn');
	const createFileBtn = document.getElementById('createFileBtn');


    if (isLoading) {
        textarea.classList.add('loading');
        textarea.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
		if (reloadBtn) reloadBtn.disabled = true;
		if (deleteBtn) deleteBtn.disabled = true;
		if (createFileBtn) createFileBtn.disabled = true;
    } else {
        textarea.classList.remove('loading');
        textarea.disabled = false;
        if (saveBtn) saveBtn.disabled = false;
		if (reloadBtn) reloadBtn.disabled = false;
		if (deleteBtn) deleteBtn.disabled = false;
		if (createFileBtn) createFileBtn.disabled = false;
		// Re-enable create button if a file type is selected
		if(currentFileType && currentFileType !== 'config') {
			createFileBtn.disabled = false;
		}
    }
}

// Visual file content highlighting
function highlightFileContent(type = 'info') {
    const textarea = document.getElementById('fileContent');
    const colors = {
        'info': '#e8f5e8',
        'success': '#d4edda',
        'error': '#f8d7da'
    };

    textarea.style.backgroundColor = colors[type];
    setTimeout(() => {
        textarea.style.backgroundColor = '';
    }, 1000);
}

// Enhanced restart functionality
async function restartBot() {
    if (!confirm('Are you sure you want to restart the bot? This will temporarily stop all bot functions.')) {
        return;
    }

    try {
        addLog('Initiating bot restart...', 'warning');
        showToast('Restarting bot...', 'warning');

        const response = await fetch('/api/restart', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.status === 'success') {
            addLog('Bot restart initiated successfully', 'success');

            // Enhanced countdown with progress
            let countdown = 15;
            const countdownInterval = setInterval(() => {
                const progress = Math.round(((15 - countdown) / 15) * 100);
                showToast(`Bot restarting... ${countdown}s (${progress}%)`, 'info');
                countdown--;

                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    showToast('Bot should be online now. Refreshing page...', 'success');
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                }
            }, 1000);

            // Clear existing intervals
            if (updateInterval) clearInterval(updateInterval);

        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error restarting bot:', error);
        addLog('Error during bot restart', 'error');
        showToast('Error restarting bot', 'error');
    }
}

// Enhanced keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+S to save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveFile();
        }

        // Ctrl+Shift+F to format JSON
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
            e.preventDefault();
            formatJSON();
        }

        // Ctrl+Shift+C to copy
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            copyContent();
        }

        // Ctrl+R to refresh stats
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            refreshStats();
        }

		// Ctrl+Shift+R to reload current script file
		if (e.ctrlKey && e.shiftKey && e.key === 'R') {
			e.preventDefault();
			reloadFile();
		}

		// Ctrl+N to create new file
		if (e.ctrlKey && e.key === 'n') {
			e.preventDefault();
			showCreateFileModal();
		}

		// Ctrl+D to delete current file
		if (e.ctrlKey && e.key === 'd') {
			e.preventDefault();
			deleteFile();
		}
    });
}

// Setup visual enhancements
function setupVisualEnhancements() {
    // Add hover effects to cards
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Add tooltips to badges
    document.querySelectorAll('.badge').forEach(badge => {
        if (!badge.hasAttribute('title')) {
            badge.setAttribute('title', 'Real-time data');
        }
    });
}

// Enhanced JSON formatting
function formatJSON() {
    const textarea = document.getElementById('fileContent');
    const content = textarea.value;

    try {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        textarea.value = formatted;
        showToast('JSON formatted successfully!', 'success');
        addLog('JSON content formatted', 'info');
        highlightFileContent('success');
    } catch (error) {
        showToast('Invalid JSON format', 'error');
        addLog('Failed to format JSON: Invalid format', 'error');
        highlightFileContent('error');
    }
}

// Enhanced copy functionality
async function copyContent() {
    const content = document.getElementById('fileContent').value;

    try {
        await navigator.clipboard.writeText(content);
        showToast('Content copied to clipboard!', 'success');
        addLog(`Content copied to clipboard (${content.length} characters)`, 'info');
    } catch (error) {
        console.error('Error copying content:', error);
        showToast('Failed to copy content', 'error');
    }
}

// Load selected file from dropdown
function loadSelectedFile() {
	const select = document.getElementById('fileSelect');
	if (select.value) {
		loadFile(select.value);
	} else {
		currentFile = '';
		document.getElementById('fileContent').value = '';
		updateFileInfo('');
		toggleActionButtons(false);
	}
}

// Initialize file management
function initializeFileManagement() {
	// Reset all selections
	document.getElementById('fileType').value = '';
	document.getElementById('fileSelect').innerHTML = '<option value="">Choose a file...</option>';
	document.getElementById('fileSelect').disabled = true;
	document.getElementById('createFileBtn').disabled = true;
	document.getElementById('fileContent').value = '';
	updateFileInfo('');
	toggleActionButtons(false);
}

// View logs functionality
function viewLogs() {
    const logsContainer = document.getElementById('logsContainer');
    logsContainer.scrollTop = logsContainer.scrollHeight;
    showToast('Viewing latest logs', 'info');
}

// Clear logs with confirmation
function clearLogs() {
    if (confirm('Are you sure you want to clear all logs?')) {
        document.getElementById('logsContainer').innerHTML = '';
        addLog('Logs cleared by user', 'info');
        showToast('Logs cleared successfully!', 'success');
    }
}

// Enhanced logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        showToast('Logging out...', 'info');

        fetch('/logout', { method: 'POST' })
            .then(() => {
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            })
            .catch(error => {
                console.error('Logout error:', error);
                window.location.href = '/login';
            });
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});