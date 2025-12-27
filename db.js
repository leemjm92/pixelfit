// --- Database Initialization (Client-Side State) ---

// In-memory state mirroring the server DB
let appState = {
    settings: {},
    weight_logs: [],
    challenges: [],
    activity_logs: []
};

let dbReady = false;
let useLocalStorage = false; // Fallback mode for GitHub Pages

// Helper to show toast (will be defined in app.js)
function dbShowToast(msg, icon) {
    if (typeof window.showToast === 'function') {
        window.showToast(msg, icon);
    } else {
        console.log(`Toast: ${icon} ${msg}`);
    }
}

async function initDB() {
    console.log("Initializing DB...");
    try {
        // Try connecting to Python Backend
        const res = await fetch('/api/all');
        if (!res.ok) throw new Error("Server not reachable");
        
        const data = await res.json();
        appState = data;
        useLocalStorage = false;
        console.log("Connected to Python Backend.");

    } catch (e) {
        console.warn("Backend unavailable. Falling back to LocalStorage (GitHub Pages Mode).");
        useLocalStorage = true;
        loadFromLocalStorage();
        dbShowToast("Offline Mode (Local Storage)", "💾");
    }

    // Normalize defaults
    if (!appState.settings) appState.settings = {};
    if (!appState.settings.credits) appState.settings.credits = 0;
    if (!appState.settings.pet) appState.settings.pet = {level: 1, happiness: 50, xp: 0};
    if (!appState.weight_logs) appState.weight_logs = [];
    if (!appState.challenges) appState.challenges = [];
    if (!appState.activity_logs) appState.activity_logs = [];

    dbReady = true;
    if (typeof window.onDBReady === 'function') {
        window.onDBReady();
    }
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('pixelFitState_v2');
    if (saved) {
        appState = JSON.parse(saved);
    }
}

function saveToLocalStorage() {
    if (useLocalStorage) {
        localStorage.setItem('pixelFitState_v2', JSON.stringify(appState));
    }
}

// --- Data Access Wrappers (Sync Reads, Async Writes) ---

// 1. Settings
function getSetting(key) {
    return appState.settings[key] || null;
}

function updateSetting(key, value) {
    appState.settings[key] = value;
    
    if (useLocalStorage) {
        saveToLocalStorage();
    } else {
        fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        }).catch(e => console.error("Sync failed for setting:", key, e));
    }

    if (typeof window.updateUI === 'function') window.updateUI();
}

function addCredits(amount) {
    let current = getSetting('credits') || 0;
    updateSetting('credits', current + amount);
    dbShowToast(`+${amount} Credits!`, '💰');
}

// 2. Challenges
function getChallenges() {
    return appState.challenges || [];
}

function addChallenge(name, goal) {
    const id = Date.now();
    const task = { id, name, goal };
    
    appState.challenges.push(task);
    
    if (useLocalStorage) {
        saveToLocalStorage();
    } else {
        fetch('/api/challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        }).catch(e => console.error("Sync failed for challenge", e));
    }
    
    if (typeof window.updateUI === 'function') window.updateUI();
}

function deleteChallenge(id) {
    appState.challenges = appState.challenges.filter(c => c.id !== id);
    
    if (useLocalStorage) {
        saveToLocalStorage();
    } else {
        fetch('/api/challenge/delete', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        }).catch(e => console.error("Sync failed for delete challenge", e));
    }

    if (typeof window.updateUI === 'function') window.updateUI();
}

// 3. Weight Logs
function getWeightLogs() {
    return appState.weight_logs || [];
}

function addWeightLog(weight, dateStr = null) {
    const timestamp = Date.now();
    const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
    
    const log = { id: timestamp, date, weight, timestamp };
    
    appState.weight_logs.push(log);
    
    if (useLocalStorage) {
        saveToLocalStorage();
    } else {
        fetch('/api/weight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log)
        }).catch(e => console.error("Sync failed for weight", e));
    }

    if (typeof window.updateUI === 'function') window.updateUI();
    if (typeof window.updateChart === 'function') window.updateChart();
}

// 4. Activity Logs
function getActivityLogs(dateStr = null, taskId = null) {
    let logs = appState.activity_logs || [];
    if (dateStr) {
        logs = logs.filter(l => l.date.startsWith(dateStr));
    }
    if (taskId) {
        logs = logs.filter(l => l.task_id === taskId);
    }
    return logs;
}

function addActivityLog(val, taskId) {
    const timestamp = Date.now();
    const date = getTodayKey(); 
    
    const log = { id: timestamp, date, type: 'workout', val, task_id: taskId, timestamp };
    
    appState.activity_logs.push(log);
    
    if (useLocalStorage) {
        saveToLocalStorage();
    } else {
        fetch('/api/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log)
        }).catch(e => console.error("Sync failed for activity", e));
    }

    if (typeof window.updateUI === 'function') window.updateUI();
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}
