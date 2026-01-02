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
window.attackBoss = attackBoss;
window.petThePet = petThePet;

function showToast(msg, icon) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toastMessage').innerHTML = msg;
    document.getElementById('toastIcon').textContent = icon;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function onDBReady() {
    console.log("DB Ready. Updating UI...");
    updatePetState();
    drawPet();
    updateUI();
    updateChart();
    
    // Start decay loop (check every minute)
    setInterval(updatePetState, 60000);

    // Add Pet Interaction Listener
    const canvas = document.getElementById('petCanvas');
    if (canvas) {
        canvas.addEventListener('click', petThePet);
    }
}

// --- Pet Logic (Pixel Art Renderer) ---
const canvas = document.getElementById('petCanvas');
const ctx = canvas.getContext('2d');

function petThePet() {
    const pet = getSetting('pet');
    if (!pet) return;

    const now = Date.now();
    const lastPet = pet.last_pet_interaction || 0;
    const cooldown = 60000; // 1 minute

    if (now - lastPet < cooldown) {
        showToast("Pixel is tired... wait a bit!", "💤");
        return;
    }

    // Success
    pet.happiness = Math.min(100, pet.happiness + 2);
    pet.last_pet_interaction = now;
    updateSetting('pet', pet);
    
    showHeartAnimation();
    showToast("Pixel loves you! +2 Happiness", "❤️");
    updateUI();
}

function showHeartAnimation() {
    const container = document.querySelector('.pet-canvas-container');
    if (!container) return;
    
    const heart = document.createElement('div');
    heart.textContent = '❤️';
    heart.style.position = 'absolute';
    heart.style.left = '50%';
    heart.style.top = '50%';
    heart.style.transform = 'translate(-50%, -50%)';
    heart.style.fontSize = '32px';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = '10';
    // Reuse the floatUp animation from style.css
    heart.style.animation = 'floatUp 1s ease-out forwards';
    
    container.appendChild(heart);
    setTimeout(() => heart.remove(), 1000);
}

function getXPRequired(level) {
    let req = 100;
    const baseIncrement = 10;
    
    // Calculate cumulative requirement
    for (let i = 2; i <= level; i++) {
        // Determine segment: 1-10=0, 11-20=1, 21-30=2...
        // Note: For level 11, we are calculating the jump from 10->11.
        // The user says "1-10 base rate... 11-20 1.1x". 
        // Usually this means the levels *in* that range have that difficulty.
        // So jump to level 2 (in seg 0) uses mult 0.
        // Jump to level 11 (in seg 1) uses mult 1.
        const segment = Math.floor((i - 1) / 10);
        
        // Multiplier: 1.2 ^ segment
        // Seg 0: 1x
        // Seg 1: 1.2x
        // Seg 2: 1.44x (approx 1.45x)
        const multiplier = Math.pow(1.2, segment);
        
        req += (baseIncrement * multiplier);
    }
    
    return Math.floor(req);
}

function updatePetState() {
    const pet = getSetting('pet');
    if (!pet) return;

    // Initialize last update time if missing
    if (!pet.last_happiness_update) {
        pet.last_happiness_update = Date.now();
        updateSetting('pet', pet);
        return;
    }

    const now = Date.now();
    const elapsedSeconds = (now - pet.last_happiness_update) / 1000;
    
    // Base decay: 1 point every 15 minutes (900s)
    // If happiness is lower, decay is faster.
    // Ranges: 100-95 (Seg 0), 95-90 (Seg 1)...
    // Rate Multiplier = 1.1 ^ Segment
    // Segment = floor((100 - happiness) / 5)
    
    // We simulate step by step to handle crossing thresholds
    let remainingTime = elapsedSeconds;
    let changed = false;
    const baseSecondsPerPoint = 900; 

    while (remainingTime > 0 && pet.happiness > 0) {
        const segment = Math.floor((100 - pet.happiness) / 5);
        const rateMultiplier = Math.pow(1.1, segment); // 1x, 1.1x, 1.21x...
        const secondsForOnePoint = baseSecondsPerPoint / rateMultiplier;
        
        if (remainingTime >= secondsForOnePoint) {
            pet.happiness = Math.max(0, pet.happiness - 1);
            remainingTime -= secondsForOnePoint;
            changed = true;
        } else {
            break;
        }
    }

    if (changed) {
        pet.last_happiness_update = now - (remainingTime * 1000); // Preserve fractional time
        updateSetting('pet', pet);
        updateUI(); // Refresh UI if happiness changed
    } else {
        // Just update timestamp to avoid large delta later
        // But only if we have accumulated significant time (e.g. > 1 min) without drop
        // Actually, better to NOT update timestamp if no drop happened, so we accumulate time
        // untill a drop occurs.
        // HOWEVER, if the user closes the app, we need to save the "progress" towards the next drop.
        // So we should strictly track `last_happiness_update`. 
        // My logic above: `remainingTime` is the left over. 
        // So `last_happiness_update` should be `now - remainingTime*1000`.
        // This effectively saves the "partial" decay.
        if (elapsedSeconds > 60) {
             pet.last_happiness_update = now - (remainingTime * 1000);
             updateSetting('pet', pet);
        }
    }
}

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

function gainPetXP(amt) {
    const pet = getSetting('pet');
    if (!pet) return;
    
    // Default to 0 if missing
    if (typeof pet.xp === 'undefined') pet.xp = 0;
    
    pet.xp += amt;
    const req = getXPRequired(pet.level);
    
    if (pet.xp >= req) {
        pet.level++;
        pet.xp = Math.max(0, pet.xp - req); // Keep overflow
        // Level up is a major event, always show toast even if we just showed rewards
        // Use a slight delay or just overwrite
        setTimeout(() => showToast(`Level Up! Lvl ${pet.level}`, "⭐"), 500); 
    }
    
    updateSetting('pet', pet);
}

function grantRewards(credits, xp) {
    // 1. Add Credits (Silent)
    if (credits > 0) addCredits(credits, true);
    
    // 2. Show Reward Toast
    const xpFormatted = xp % 1 === 0 ? xp : xp.toFixed(1);
    showToast(`+${credits} Credits<br><span style="font-size:0.9em; opacity:0.9;">+${xpFormatted} XP</span>`, "🎉");
    
    // 3. Add XP
    if (xp > 0) gainPetXP(xp);
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
        if (hap) hap.textContent = Math.floor(pet.happiness) + '%';
        
        const lvl = document.getElementById('levelDisplay');
        if (lvl) lvl.textContent = pet.level;

        const xpFill = document.getElementById('xpBarFill');
        const xpText = document.getElementById('xpText');
        if (xpFill && xpText) {
            const req = getXPRequired(pet.level);
            const percent = Math.min(100, (pet.xp / req) * 100);
            xpFill.style.width = percent + '%';
            xpText.textContent = `${Math.floor(pet.xp)} / ${req}`;
        }
        
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
                onTaskClick(task);
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

// --- Boss Battle Logic ---

let activeBossTaskId = null;
let bossAnimFrameId = null;

const BOSS_SPRITE_CONFIG = {
    img: 'art/push-up-boss/push-up-headbutt-v1.png',
    width: 256,
    height: 256,
    cols: 5,
    totalFrames: 25,
    fps: 15
};

function startBossAnimation() {
    const el = document.getElementById('bossSprite');
    if (!el) return;

    el.style.width = `${BOSS_SPRITE_CONFIG.width}px`;
    el.style.height = `${BOSS_SPRITE_CONFIG.height}px`;
    el.style.backgroundImage = `url('${BOSS_SPRITE_CONFIG.img}')`;
    
    let frame = 0;
    let lastTime = 0;
    const interval = 1000 / BOSS_SPRITE_CONFIG.fps;

    function loop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const delta = timestamp - lastTime;

        if (delta > interval) {
            const col = frame % BOSS_SPRITE_CONFIG.cols;
            const row = Math.floor(frame / BOSS_SPRITE_CONFIG.cols);
            el.style.backgroundPosition = `-${col * BOSS_SPRITE_CONFIG.width}px -${row * BOSS_SPRITE_CONFIG.height}px`;
            frame = (frame + 1) % BOSS_SPRITE_CONFIG.totalFrames;
            lastTime = timestamp - (delta % interval);
        }
        bossAnimFrameId = requestAnimationFrame(loop);
    }
    stopBossAnimation();
    bossAnimFrameId = requestAnimationFrame(loop);
}

function stopBossAnimation() {
    if (bossAnimFrameId) {
        cancelAnimationFrame(bossAnimFrameId);
        bossAnimFrameId = null;
    }
}

function onTaskClick(task) {
    // Check if task has a boss (either in task object or in settings)
    const bossState = getBossState(task.id);
    
    // If no state exists but we want to force bosses for all tasks (for now):
    if (!bossState) {
        // Init default boss state
         const newBoss = {
            hp: 100,
            maxHp: 100,
            level: 1,
            image: 'boss-pushup-anim'
        };
        updateBossState(task.id, newBoss);
        openBossBattle(task.id, task.name, newBoss);
    } else {
        openBossBattle(task.id, task.name, bossState);
    }
}

function openBossBattle(taskId, taskName, bossData) {
    activeBossTaskId = taskId;
    
    document.getElementById('bossName').textContent = taskName + " Boss";
    document.querySelector('.boss-level').textContent = "Lvl " + bossData.level;
    
    // Update HP Bar
    const hpPercent = (bossData.hp / bossData.maxHp) * 100;
    document.getElementById('bossHpBar').style.width = hpPercent + '%';
    document.getElementById('bossHpText').textContent = `${Math.ceil(bossData.hp)}/${bossData.maxHp}`;
    
    // Reset inputs
    document.getElementById('bossAttackInput').value = '';
    
    document.getElementById('bossBattleModal').style.display = 'flex';
    document.getElementById('bossAttackInput').focus();
    
    startBossAnimation();
}

function attackBoss() {
    const dmg = parseInt(document.getElementById('bossAttackInput').value);
    if (!activeBossTaskId || !dmg || dmg <= 0) return;

    // 1. Log the activity (Standard App Logic)
    addActivityLog(dmg, activeBossTaskId);
    grantRewards(dmg, dmg / 5); // Base rewards

    // 2. Boss Logic
    const bossState = getBossState(activeBossTaskId);
    if (!bossState) return;

    // Visuals
    const sprite = document.getElementById('bossSprite');
    const container = sprite.parentElement;
    
    container.classList.remove('boss-hit');
    void container.offsetWidth; // Trigger reflow
    container.classList.add('boss-hit');
    
    // Show Damage Number
    const arena = document.querySelector('.boss-arena');
    const dmgNum = document.createElement('div');
    dmgNum.className = 'damage-number';
    dmgNum.textContent = `-${dmg}`;
    dmgNum.style.left = '50%';
    dmgNum.style.top = '50%';
    arena.appendChild(dmgNum);
    setTimeout(() => dmgNum.remove(), 1000);

    // Apply Damage
    bossState.hp -= dmg;
    
    if (bossState.hp <= 0) {
        bossState.hp = 0;
        updateBossState(activeBossTaskId, bossState);
        updateBossUI(bossState);
        setTimeout(() => bossDefeated(activeBossTaskId, bossState), 600); // Wait for anim
    } else {
        updateBossState(activeBossTaskId, bossState);
        updateBossUI(bossState);
        // Clear input for next attack
        document.getElementById('bossAttackInput').value = '';
        document.getElementById('bossAttackInput').focus();
    }
}

function updateBossUI(bossState) {
    const hpPercent = (bossState.hp / bossState.maxHp) * 100;
    document.getElementById('bossHpBar').style.width = hpPercent + '%';
    document.getElementById('bossHpText').textContent = `${Math.ceil(bossState.hp)}/${bossState.maxHp}`;
}

function bossDefeated(taskId, bossState) {
    // 1. Victory Rewards
    const bonusCredits = 500 * bossState.level;
    const bonusXP = 100 * bossState.level;
    grantRewards(bonusCredits, bonusXP);
    
    showToast(`BOSS DEFEATED!<br>+${bonusCredits}c +${bonusXP}xp`, "🏆");
    
    // 2. Level Up Boss
    bossState.level++;
    bossState.maxHp = Math.floor(bossState.maxHp * 1.5);
    bossState.hp = bossState.maxHp;
    
    updateBossState(taskId, bossState);
    
    closeModal('bossBattleModal');
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
        // addCredits & gainPetXP replaced by grantRewards
        grantRewards(amt, amt / 10);
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
        // addCredits & gainPetXP replaced by grantRewards
        grantRewards(100, 50);
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
        // addCredits & gainPetXP replaced by grantRewards
        grantRewards(50, 25);
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
    if(id === 'bossBattleModal') stopBossAnimation();
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