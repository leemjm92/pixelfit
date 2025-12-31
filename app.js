// --- UI & Application Logic ---

// Expose functions globally for HTML onclick handlers
window.feedPet = feedPet;
window.playPet = playPet;
window.switchTab = switchTab;
window.openWeighInModal = openWeighInModal;
window.openAddTaskModal = openAddTaskModal;
window.submitWeight = submitWeight;
window.submitNewTask = submitNewTask;
window.submitLogProgress = submitLogProgress;
window.submitMissingWeight = submitMissingWeight;
window.closeModal = closeModal;
window.showToast = showToast;
window.updateUI = updateUI;
window.updateChart = updateChart;
window.updateWorkoutChart = updateWorkoutChart;
window.onDBReady = onDBReady;

function showToast(msg, icon) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toastMessage').textContent = msg;
    document.getElementById('toastIcon').textContent = icon;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function onDBReady() {
    console.log("DB Ready. Updating UI...");
    drawPet();
    updateUI();
    updateChart();
}

// --- Pet Logic (Pixel Art Renderer) ---
const canvas = document.getElementById('petCanvas');
const ctx = canvas.getContext('2d');

function drawPet() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pixelSize = 4;
    const t = Date.now() / 500;
    const bounce = Math.sin(t * 5) * 2;
    
    const pet = getSetting('pet');
    if (!pet) {
         requestAnimationFrame(drawPet);
         return;
    }

    let mainColor = '#4ECDC4';
    if (pet.happiness < 30) mainColor = '#95A5A6'; 
    if (pet.happiness > 80) mainColor = '#FF6B6B'; 

    ctx.fillStyle = mainColor;
    const bodyY = 4 + (bounce > 0 ? 1 : 0);
    
    // Body
    ctx.fillRect(4 * pixelSize, (bodyY) * pixelSize, 8 * pixelSize, 8 * pixelSize);
    ctx.fillRect(3 * pixelSize, (bodyY - 1) * pixelSize, 2 * pixelSize, 2 * pixelSize);
    ctx.fillRect(11 * pixelSize, (bodyY - 1) * pixelSize, 2 * pixelSize, 2 * pixelSize);
    ctx.fillRect(4 * pixelSize, (bodyY + 8) * pixelSize, 2 * pixelSize, 2 * pixelSize);
    ctx.fillRect(10 * pixelSize, (bodyY + 8) * pixelSize, 2 * pixelSize, 2 * pixelSize);

    // Face
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(6 * pixelSize, (bodyY + 3) * pixelSize, 2 * pixelSize, 2 * pixelSize);
    ctx.fillRect(9 * pixelSize, (bodyY + 3) * pixelSize, 2 * pixelSize, 2 * pixelSize);
    
    ctx.fillStyle = '#000000';
    if (Math.sin(t * 3) > 0.95) {
         ctx.fillRect(6 * pixelSize, (bodyY + 4) * pixelSize, 2 * pixelSize, 1 * pixelSize);
         ctx.fillRect(9 * pixelSize, (bodyY + 4) * pixelSize, 2 * pixelSize, 1 * pixelSize);
    } else {
        ctx.fillRect(6 * pixelSize, (bodyY + 3) * pixelSize, 1 * pixelSize, 1 * pixelSize);
        ctx.fillRect(9 * pixelSize, (bodyY + 3) * pixelSize, 1 * pixelSize, 1 * pixelSize);
    }

    if (pet.happiness > 50) {
         ctx.fillRect(6 * pixelSize, (bodyY + 6) * pixelSize, 1 * pixelSize, 1 * pixelSize);
         ctx.fillRect(9 * pixelSize, (bodyY + 6) * pixelSize, 1 * pixelSize, 1 * pixelSize);
         ctx.fillRect(7 * pixelSize, (bodyY + 7) * pixelSize, 2 * pixelSize, 1 * pixelSize);
    } else {
         ctx.fillRect(7 * pixelSize, (bodyY + 6) * pixelSize, 2 * pixelSize, 1 * pixelSize);
    }

    requestAnimationFrame(drawPet);
}

function feedPet() {
    const credits = getSetting('credits');
    if (credits >= 50) {
        updateSetting('credits', credits - 50);
        
        const pet = getSetting('pet');
        pet.happiness = Math.min(100, pet.happiness + 20);
        updateSetting('pet', pet);
        
        showToast("Yum! Happiness +20", "🍎");
        recordActivity("Fed Pixel", "🍎");
    } else {
        showToast("Not enough credits!", "🚫");
    }
}

function playPet() {
     const credits = getSetting('credits');
     if (credits >= 20) {
        updateSetting('credits', credits - 20);
        
        const pet = getSetting('pet');
        pet.happiness = Math.min(100, pet.happiness + 10);
        updateSetting('pet', pet);
        
        showToast("Fun! Happiness +10", "🎾");
        recordActivity("Played with Pixel", "🎾");
    } else {
        showToast("Not enough credits!", "🚫");
    }
}

function recordActivity(title, icon) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    updateSetting('last_activity', {title, time: timeStr});
}

// --- UI Updates ---

function updateUI() {
    // Header
    const creditDisplay = document.getElementById('creditDisplay');
    if (creditDisplay) creditDisplay.textContent = getSetting('credits') || 0;
    
    const dateDisplay = document.getElementById('dateDisplay');
    if (dateDisplay) {
        const date = new Date();
        dateDisplay.textContent = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    }

    // Pet
    const pet = getSetting('pet');
    if (pet) {
        const hap = document.getElementById('happinessDisplay');
        if (hap) hap.textContent = pet.happiness + '%';
        
        const lvl = document.getElementById('levelDisplay');
        if (lvl) lvl.textContent = pet.level;
        
        const today = getTodayKey();
        const logs = getWeightLogs();
        const weighedIn = logs.some(l => l.date.startsWith(today));
        
        let msg = "I'm feeling great!";
        if (!weighedIn) msg = "Did you weigh in today?";
        else if (pet.happiness < 40) msg = "I'm sad... play with me?";
        
        const msgEl = document.getElementById('petMessage');
        if (msgEl) msgEl.textContent = `"${msg}"`;
    }
    
    // Last Activity
    const lastAct = getSetting('last_activity');
    if (lastAct) {
        const titleEl = document.getElementById('lastActivityTitle');
        if (titleEl) titleEl.textContent = lastAct.title;
        
        const timeEl = document.getElementById('lastActivityTime');
        if (timeEl) timeEl.textContent = lastAct.time;
    }

    // Tasks
    renderTasks();
    
    // Stats (Weights)
    const weightData = getWeightLogs().sort((a,b) => new Date(a.date) - new Date(b.date));
    
    if(weightData.length > 0) {
        const latest = weightData[weightData.length - 1].weight;
        const currentWeightDisplay = document.getElementById('currentWeightDisplay');
        if (currentWeightDisplay) currentWeightDisplay.textContent = latest + ' kg';
        
        if (weightData.length > 1) {
                const first = weightData[0].weight;
                const diff = (first - latest).toFixed(1);
                const totalLostDisplay = document.getElementById('totalLostDisplay');
                if (totalLostDisplay) totalLostDisplay.textContent = (diff > 0 ? '-' : '+') + Math.abs(diff) + ' kg';
        }
    }
    
    // Stats (Workouts)
    updateWorkoutStats();
}

// --- Task System ---

function findMissingWeighIns() {
    const logs = getWeightLogs().sort((a,b) => new Date(a.date) - new Date(b.date));
    if (logs.length === 0) return [];
    
    // Get oldest date
    const firstEntry = new Date(logs[0].date);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const missingDates = [];
    const existingDates = new Set(logs.map(l => l.date.split('T')[0]));
    
    // Iterate from first entry + 1 day until yesterday
    let current = new Date(firstEntry);
    current.setDate(current.getDate() + 1);
    
    while (current < today) {
        const dateStr = current.toISOString().split('T')[0];
        if (!existingDates.has(dateStr)) {
            missingDates.push(dateStr);
        }
        current.setDate(current.getDate() + 1);
    }
    return missingDates;
}

function renderTasks() {
    const list = document.getElementById('tasksList');
    if (!list) return;
    list.innerHTML = '';
    
    const today = getTodayKey();

    // 1. Weigh In Card State
    const weighInCard = document.getElementById('weighInTask');
    const weighInCheckbox = document.getElementById('weighInCheckbox');
    
    const logs = getWeightLogs();
    const weighedIn = logs.some(l => l.date.startsWith(today));

    if (weighInCard && weighInCheckbox) {
        if (weighedIn) {
            weighInCard.classList.add('completed');
            weighInCheckbox.innerHTML = '✔';
            weighInCard.onclick = null;
        } else {
            weighInCard.classList.remove('completed');
            weighInCheckbox.innerHTML = '';
            weighInCard.onclick = openWeighInModal;
        }
    }
    
    // 2. Missing Weigh-ins
    const missingDates = findMissingWeighIns();
    const missingContainer = document.getElementById('missingWeighInContainer');
    if (missingContainer) {
        missingContainer.innerHTML = '';
        
        if (missingDates.length > 0) {
            const missedDiv = document.createElement('div');
            missedDiv.className = 'task-card task-card-static';
            missedDiv.style.border = '2px solid #FFD93D';
            missedDiv.innerHTML = `
                <div class="task-info">
                    <div class="task-icon-box" style="background: #FFF9C4; color: #FBC02D;">⚠️</div>
                    <div class="task-details">
                        <h3>Missing Weigh-In</h3>
                        <p>${missingDates.length} previous day(s) missed</p>
                    </div>
                </div>
            `;
            missedDiv.onclick = () => openMissingWeighInModal(missingDates[0]);
            missingContainer.appendChild(missedDiv);
        }
    }

    // 3. Custom Tasks with Swipe Logic
    const tasks = getChallenges();
    
    tasks.forEach(task => {
        // Sum logs for today for this task
        const logs = getActivityLogs(today, task.id);
        const currentAmount = logs.reduce((acc, log) => acc + log.val, 0);
        
        const isComplete = currentAmount >= task.goal;
        const percent = Math.min((currentAmount / task.goal) * 100, 100);
        
        // Create Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'task-card-wrapper';
        
        // Background Delete Layer
        const deleteBg = document.createElement('div');
        deleteBg.className = 'delete-bg';
        deleteBg.textContent = 'DELETE';
        wrapper.appendChild(deleteBg);
        
        // Card
        const div = document.createElement('div');
        div.className = `task-card ${isComplete ? 'completed' : ''}`;
        div.innerHTML = `
            <div class="task-info">
                <div class="task-icon-box" style="color: ${isComplete ? '#CCC' : '#FF6B6B'}">⚡</div>
                <div class="task-details">
                    <h3>${task.name}</h3>
                    <p>${isComplete ? 'Goal Reached!' : 'Target: ' + task.goal + ' reps'}</p>
                    
                    <div class="task-progress-bar-bg">
                        <div class="task-progress-bar-fill" style="width: ${percent}%"></div>
                    </div>
                </div>
                <div class="task-progress-container">
                        <div class="task-progress-text">${currentAmount}/${task.goal}</div>
                </div>
            </div>
        `;
        
        div.onclick = () => {
            if (!div.classList.contains('swiped')) {
                openLogProgressModal(task.id, task.name);
            }
        };
        
        // Swipe Logic
        let startX = 0;
        let currentTranslate = 0;
        let isDragging = false;
        
        div.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            div.classList.add('swiping');
        }, {passive: true});
        
        div.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            
            if (diff < 0) {
                currentTranslate = Math.max(diff, -100); 
                div.style.transform = `translateX(${currentTranslate}px)`;
            }
        }, {passive: true});
        
        div.addEventListener('touchend', () => {
            isDragging = false;
            div.classList.remove('swiping');
            
            if (currentTranslate < -80) { 
                    if (confirm('Delete this challenge?')) {
                        deleteTask(task.id);
                    } else {
                        div.style.transform = 'translateX(0)';
                    }
            } else {
                div.style.transform = 'translateX(0)';
            }
            currentTranslate = 0;
        });
        
        wrapper.appendChild(div);
        list.appendChild(wrapper);
    });
}

function deleteTask(id) {
    deleteChallenge(id);
}

function updateWorkoutStats() {
    const container = document.getElementById('workoutStatsList');
    if (!container) return;
    container.innerHTML = '';
    
    const tasks = getChallenges();
    
    if (tasks.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; font-size:12px;">No challenges active.</p>';
        return;
    }
    
    tasks.forEach(task => {
        // Get all logs for this task (all time)
        const logs = getActivityLogs(null, task.id);
        const total = logs.reduce((acc, log) => acc + log.val, 0);

        const row = document.createElement('div');
        row.className = 'task-card task-card-static';
        row.style.cursor = 'default';
        row.style.display = 'block';
        row.style.padding = '15px';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600;">${task.name}</span>
                <span style="color:var(--primary); font-weight:700;">${total} Reps</span>
            </div>
        `;
        container.appendChild(row);
    });
}

// --- Task Interactions ---

let activeTaskId = null;

function openLogProgressModal(taskId, taskName) {
    activeTaskId = taskId;
    document.getElementById('logProgressTitle').textContent = 'Log ' + taskName;
    document.getElementById('logProgressAmount').value = '';
    document.getElementById('logProgressModal').style.display = 'flex';
    document.getElementById('logProgressAmount').focus();
}

function submitLogProgress() {
    const amt = parseInt(document.getElementById('logProgressAmount').value);
    if (activeTaskId && amt > 0) {
        addActivityLog(amt, activeTaskId);
        addCredits(amt);
        
        const pet = getSetting('pet');
        if (pet) {
            pet.xp += (amt / 10); 
            if (pet.xp >= 100) {
                pet.level++;
                pet.xp = 0;
                showToast("Level Up!", "⭐");
            }
            updateSetting('pet', pet);
        }
        
        closeModal('logProgressModal');
    }
}

// --- Weigh In Logic ---
function openWeighInModal() {
    document.getElementById('weightInput').value = '';
    document.getElementById('weighInModal').style.display = 'flex';
}

function submitWeight() {
    const val = parseFloat(document.getElementById('weightInput').value);
    if (val) {
        addWeightLog(val);
        addCredits(100);
        closeModal('weighInModal');
    }
}

// --- Missing Weigh In Logic ---
function openMissingWeighInModal(dateStr) {
    document.getElementById('missingDateInput').value = dateStr;
    document.getElementById('missingWeightInput').value = '';
    document.getElementById('missingWeighInModal').style.display = 'flex';
}

function submitMissingWeight() {
    const dateStr = document.getElementById('missingDateInput').value;
    const val = parseFloat(document.getElementById('missingWeightInput').value);
    
    if (dateStr && val) {
        // We use noon to avoid timezone rolling to previous day
        const isoDate = new Date(dateStr + 'T12:00:00.000Z').toISOString();
        addWeightLog(val, isoDate);
        addCredits(50); 
        closeModal('missingWeighInModal');
    }
}

// --- Add Task Logic ---
function openAddTaskModal() {
    document.getElementById('newTaskName').value = '';
    document.getElementById('newTaskGoal').value = '';
    document.getElementById('addTaskModal').style.display = 'flex';
}

function submitNewTask() {
    const name = document.getElementById('newTaskName').value;
    const goal = parseInt(document.getElementById('newTaskGoal').value) || 50;
    
    if (name) {
        addChallenge(name, goal);
        closeModal('addTaskModal');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none';
}

// --- Navigation ---
function switchTab(tabId) {
    document.querySelectorAll('.content-area').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tabId);
    if(targetTab) targetTab.classList.add('active');
    
    const icons = document.querySelectorAll('.nav-item');
    icons.forEach(i => i.classList.remove('active'));
     
    if(tabId === 'home') icons[0].classList.add('active');
    if(tabId === 'tasks') icons[1].classList.add('active');
    if(tabId === 'stats') {
         icons[2].classList.add('active');
         updateChart();
         updateWorkoutStats(); // Keeps the list populated if we ever unhide it
         updateWorkoutChart(); // Updates the new chart
    }
}

// --- Chart ---
let chartInstance;
function updateChart() {
    const ctxEl = document.getElementById('weightChart');
    if (!ctxEl) return;
    const ctx = ctxEl.getContext('2d');
    
    const data = getWeightLogs().sort((a,b) => new Date(a.date) - new Date(b.date));
    const recentData = data.slice(-10); // Last 10
    
    const labels = recentData.map(d => new Date(d.date).toLocaleDateString('en-US', {day:'numeric', month:'short'}));
    const values = recentData.map(d => d.weight);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight',
                data: values,
                borderColor: '#4ECDC4',
                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#FFFFFF',
                pointBorderColor: '#FF6B6B',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                        grid: { borderDash: [5, 5], color: '#EEE' },
                        border: { display: false }
                },
                x: {
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

let activeStatsTaskId = null;
let workoutChartInstance;

function updateWorkoutChart() {
    const selector = document.getElementById('workoutStatsSelector');
    const ctxEl = document.getElementById('workoutChart');
    if (!selector || !ctxEl) return;
    
    const tasks = getChallenges();
    if (tasks.length === 0) {
        selector.style.display = 'none';
        ctxEl.style.display = 'none';
        return;
    } else {
        selector.style.display = 'flex';
        ctxEl.style.display = 'block';
    }

    // Set default active task if none or not found
    if (!activeStatsTaskId || !tasks.find(t => t.id === activeStatsTaskId)) {
        activeStatsTaskId = tasks[0].id;
    }

    // Rebuild Selector Buttons
    selector.innerHTML = '';
    tasks.forEach(task => {
        const btn = document.createElement('div');
        btn.className = 'selector-btn';
        if (task.id === activeStatsTaskId) btn.classList.add('active');
        btn.textContent = task.name;
        btn.onclick = () => {
            activeStatsTaskId = task.id;
            updateWorkoutChart();
        };
        selector.appendChild(btn);
    });

    // Attach Scroll Listener for Masking
    selector.onscroll = updateScrollMask;
    // Initial check (delay slightly to ensure layout rendering)
    setTimeout(updateScrollMask, 0);

    const task = tasks.find(t => t.id === activeStatsTaskId);
    if (!task) return;

    // Prepare Data for Last 7 Days
    const labels = [];
    const completedData = [];
    const remainingData = [];
    
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        labels.push(d.toLocaleDateString('en-US', {weekday: 'short'}));
        
        const logs = getActivityLogs(dateKey, task.id);
        const totalDone = logs.reduce((acc, l) => acc + l.val, 0);
        
        let done = totalDone;
        let remaining = Math.max(0, task.goal - totalDone);
        
        completedData.push(done);
        remainingData.push(remaining);
    }

    const ctx = ctxEl.getContext('2d');
    if (workoutChartInstance) workoutChartInstance.destroy();

    workoutChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Completed',
                    data: completedData,
                    backgroundColor: '#4ECDC4', // Teal/Green
                    borderRadius: 4,
                    barPercentage: 0.6
                },
                {
                    label: 'Remaining',
                    data: remainingData,
                    backgroundColor: '#EEEEEE',
                    borderRadius: 4,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.raw;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { borderDash: [5, 5], color: '#EEE' },
                    border: { display: false },
                    suggestedMax: task.goal,
                    ticks: {
                        stepSize: 10
                    }
                }
            }
        }
    });
}

function updateScrollMask() {
    const el = document.getElementById('workoutStatsSelector');
    if (!el) return;
    
    const atStart = el.scrollLeft <= 2; 
    const atEnd = Math.abs(el.scrollWidth - el.clientWidth - el.scrollLeft) <= 2;
    const hasOverflow = el.scrollWidth > el.clientWidth;

    el.classList.remove('mask-left', 'mask-right', 'mask-both');

    if (!hasOverflow) return;

    if (atStart && !atEnd) {
        el.classList.add('mask-right');
    } else if (!atStart && atEnd) {
        el.classList.add('mask-left');
    } else if (!atStart && !atEnd) {
        el.classList.add('mask-both');
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
     // Init DB with timeout safety
     setTimeout(initDB, 100);
});