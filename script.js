const TILE_TYPES = ['🐑', '🐺', '🥕', '🥬', '🔥', '🪵', 'bucket', 'fence', 'sun', 'moon'];
// Better emoji set
const EMOJIS = ['🐑', '🥕', '🥬', '🌽', '🔥', '🪵', '🧶', '🔔', '🏡', '🚜', '🌻', '🍄'];
const DOCK_CAPACITY = 7;
const TILE_SIZE = 48; // Matches CSS

let currentLevel = 1;
let boardTiles = [];
let dockTiles = [];
let isAnimating = false;

// DOM Elements
const boardEl = document.getElementById('game-board');
const dockEl = document.getElementById('dock');
const levelDisplay = document.getElementById('level-display');
const restartBtn = document.getElementById('restart-btn');
const modal = document.getElementById('game-over-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMsg = document.getElementById('modal-message');
const modalBtn = document.getElementById('modal-action-btn');
const effectsLayer = document.getElementById('effects-layer');

// User & Rank Elements
const loginModal = document.getElementById('login-modal');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const rankBtn = document.getElementById('rank-btn');
const rankModal = document.getElementById('rank-modal');
const closeRankBtn = document.getElementById('close-rank-btn');
const rankList = document.getElementById('rank-list');

let username = localStorage.getItem('sheep_username');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!username) {
        loginModal.classList.remove('hidden');
    } else {
        loginModal.classList.add('hidden');
        startLevel(1);
    }

    loginBtn.addEventListener('click', () => {
        const val = usernameInput.value.trim();
        if (val) {
            username = val;
            localStorage.setItem('sheep_username', username);
            loginModal.classList.add('hidden');
            startLevel(1);
        } else {
            alert('请输入一个响亮的名字！');
        }
    });

    rankBtn.addEventListener('click', showRank);
    closeRankBtn.addEventListener('click', () => rankModal.classList.add('hidden'));

    restartBtn.addEventListener('click', () => startLevel(currentLevel));
    modalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (modalTitle.innerText === '恭喜过关!') {
            startLevel(currentLevel + 1);
        } else {
            startLevel(currentLevel);
        }
    });
});

// Initialize LeanCloud (Replace with your own App ID and Key from https://console.leancloud.app/)
// 这是一个示例 ID，请务必替换为您自己的 LeanCloud AppID 和 AppKey，否则无法存储数据！
const APP_ID = 'CTFB2aOWEWOfM7sw4AI4vQwt-MdYXbMMI';
const APP_KEY = '4zlzhUaDbnMIUTGxIDdYvN4m';

try {
    if (typeof AV !== 'undefined') {
        AV.init({
            appId: APP_ID,
            appKey: APP_KEY,
            serverURL: "https://your-custom-domain.com" // 如果是国际版或已绑定域名，请填入；否则国内版需绑定域名
        });
    }
} catch (e) {
    console.error("LeanCloud init failed:", e);
}

// Remote API using LeanCloud
const API = {
    getScores: async () => {
        if (typeof AV === 'undefined') return JSON.parse(localStorage.getItem('sheep_scores') || '[]');
        try {
            const query = new AV.Query('Score');
            query.descending('level');
            query.limit(50);
            const results = await query.find();
            return results.map(r => ({
                name: r.get('name'),
                level: r.get('level')
            }));
        } catch (error) {
            console.warn('Fetch scores failed, using local:', error);
            return JSON.parse(localStorage.getItem('sheep_scores') || '[]');
        }
    },
    submitScore: async (name, level) => {
        // Save locally first as backup
        let localScores = JSON.parse(localStorage.getItem('sheep_scores') || '[]');
        const idx = localScores.findIndex(s => s.name === name);
        if (idx !== -1) {
            if (level > localScores[idx].level) localScores[idx].level = level;
        } else {
            localScores.push({ name, level, time: Date.now() });
        }
        localStorage.setItem('sheep_scores', JSON.stringify(localScores));

        if (typeof AV === 'undefined') return;
        
        try {
            // Check if user exists on cloud
            const query = new AV.Query('Score');
            query.equalTo('name', name);
            const results = await query.find();
            
            if (results.length > 0) {
                const record = results[0];
                if (level > record.get('level')) {
                    record.set('level', level);
                    await record.save();
                }
            } else {
                const Score = AV.Object.extend('Score');
                const score = new Score();
                score.set('name', name);
                score.set('level', level);
                await score.save();
            }
        } catch (error) {
            console.warn('Upload score failed:', error);
        }
    }
};

async function showRank() {
    rankModal.classList.remove('hidden');
    rankList.innerHTML = '<p style="text-align:center">加载中...</p>';
    
    const scores = await API.getScores();
    rankList.innerHTML = '';
    
    if (scores.length === 0) {
        rankList.innerHTML = '<p style="text-align:center">暂无数据，等你来战！</p>';
        return;
    }

    scores.forEach((s, i) => {
        const div = document.createElement('div');
        div.classList.add('rank-item');
        div.innerHTML = `
            <span class="rank-idx">${i + 1}</span>
            <span class="rank-name">${s.name}</span>
            <span class="rank-lvl">第 ${s.level} 关</span>
        `;
        rankList.appendChild(div);
    });
}

function startLevel(level) {
    currentLevel = level;
    levelDisplay.innerText = `第 ${level} 关`;
    boardTiles = [];
    dockTiles = [];
    boardEl.innerHTML = '';
    dockEl.innerHTML = '';
    isAnimating = false;
    modal.classList.add('hidden');

    generateTiles(level);
    updateTileStates();
}

function generateTiles(level) {
    // Difficulty scaling
    let numTypes, numSets;
    
    if (level === 1) {
        numTypes = 3;
        numSets = 7; // 21 tiles
    } else if (level === 2) {
        // Reduced difficulty significantly
        numTypes = 6;
        numSets = 12; // 36 tiles (was 60)
    } else {
        // Gradual increase
        numTypes = Math.min(EMOJIS.length, 6 + Math.floor((level - 2) / 2));
        numSets = 15 + (level - 2) * 3;
    }

    const selectedTypes = EMOJIS.slice(0, numTypes);
    
    // Create pool
    let pool = [];
    for (let i = 0; i < numSets; i++) {
        for (let j = 0; j < 3; j++) {
            pool.push(selectedTypes[i % numTypes]);
        }
    }
    pool.sort(() => Math.random() - 0.5);

    // Layout config
    const boardRect = boardEl.getBoundingClientRect();
    const centerX = boardRect.width / 2 - TILE_SIZE / 2;
    const centerY = boardRect.height / 2 - TILE_SIZE / 2;
    const spreadX = level === 1 ? 80 : 40;
    const spreadY = level === 1 ? 100 : 40;

    pool.forEach((type, index) => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.innerText = type;
        
        // Entrance animation delay
        tile.style.animation = `popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 0.02}s backwards`;
        
        let x, y;
        
        if (level === 1 && index < 12) {
             // Grid layout for tutorial feel
             const col = index % 3;
             const row = Math.floor(index / 3);
             x = centerX + (col - 1) * 50;
             y = centerY + (row - 1.5) * 55;
        } else {
        // Random pile with quantization
            // Increase spread slightly for better playability
            const spreadX = level === 1 ? 100 : 120;
            const spreadY = level === 1 ? 120 : 150;
            const offsetX = (Math.random() - 0.5) * spreadX;
            const offsetY = (Math.random() - 0.5) * spreadY;
            x = centerX + offsetX;
            y = centerY + offsetY;
        }

        // Quantize to half-tile steps for neat stacking but random enough
        x = Math.round(x / (TILE_SIZE / 2)) * (TILE_SIZE / 2);
        y = Math.round(y / (TILE_SIZE / 2)) * (TILE_SIZE / 2);

        // Boundary
        x = Math.max(10, Math.min(boardRect.width - TILE_SIZE - 10, x));
        y = Math.max(10, Math.min(boardRect.height - TILE_SIZE - 10, y));

        tile.style.left = `${x}px`;
        tile.style.top = `${y}px`;
        tile.style.zIndex = index;
        
        tile.dataset.id = index;
        tile.dataset.type = type;
        
        tile.addEventListener('click', () => onTileClick(index));
        
        boardEl.appendChild(tile);
        
        boardTiles.push({
            id: index,
            type: type,
            x: x,
            y: y,
            z: index,
            el: tile,
            disabled: false
        });
    });
}

function updateTileStates() {
    boardTiles.forEach(tile => {
        tile.disabled = false;
        tile.el.classList.remove('disabled');
        
        for (let other of boardTiles) {
            if (other.id === tile.id) continue;
            if (other.z > tile.z) {
                // Using a slightly smaller box for collision to be more forgiving
                const margin = 4; 
                const overlap = !(tile.x + TILE_SIZE - margin <= other.x + margin || 
                                  tile.x + margin >= other.x + TILE_SIZE - margin || 
                                  tile.y + TILE_SIZE - margin <= other.y + margin || 
                                  tile.y + margin >= other.y + TILE_SIZE - margin);
                
                if (overlap) {
                    tile.disabled = true;
                    tile.el.classList.add('disabled');
                    break;
                }
            }
        }
    });
}

function onTileClick(id) {
    if (isAnimating) return;
    
    const tileObj = boardTiles.find(t => t.id === id);
    if (!tileObj || tileObj.disabled) return;

    if (dockTiles.length >= DOCK_CAPACITY) return;

    // Logic: Remove from board
    boardTiles = boardTiles.filter(t => t.id !== id);
    updateTileStates();

    // Determine insert position in dock
    // We want to group same types.
    let insertIndex = dockTiles.length;
    const existingIndex = dockTiles.findIndex(t => t.type === tileObj.type);
    
    if (existingIndex !== -1) {
        // Find last of this type
        let lastOfType = existingIndex;
        while (lastOfType < dockTiles.length && dockTiles[lastOfType].type === tileObj.type) {
            lastOfType++;
        }
        insertIndex = lastOfType;
    }

    // Insert into dock array
    dockTiles.splice(insertIndex, 0, tileObj);

    // Animation: Fly to dock
    isAnimating = true;
    
    // Calculate target screen position
    // We need to know where the slot IS visually.
    // Since we are inserting, the positions of subsequent items will shift.
    // We can simulate the new layout to get the target rect.
    
    // 1. Create a placeholder in the DOM at the target index
    const placeholder = document.createElement('div');
    placeholder.style.width = `${TILE_SIZE}px`;
    placeholder.style.height = `${TILE_SIZE}px`;
    placeholder.style.margin = '0'; // Controlled by flex gap in CSS
    placeholder.style.visibility = 'hidden';
    
    // Insert placeholder at correct DOM position
    if (insertIndex < dockEl.children.length) {
        dockEl.insertBefore(placeholder, dockEl.children[insertIndex]);
    } else {
        dockEl.appendChild(placeholder);
    }
    
    // Force layout to get coordinates
    const targetRect = placeholder.getBoundingClientRect();
    
    // Apply FLIP-like animation
    // 2. Keep element on board but change to fixed/absolute
    const startRect = tileObj.el.getBoundingClientRect();
    
    tileObj.el.style.position = 'fixed';
    tileObj.el.style.left = `${startRect.left}px`;
    tileObj.el.style.top = `${startRect.top}px`;
    tileObj.el.style.zIndex = 2000;
    tileObj.el.classList.add('flying-tile');
    
    // 3. Trigger move
    // Double RAF to ensure style application
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            tileObj.el.style.left = `${targetRect.left}px`;
            tileObj.el.style.top = `${targetRect.top}px`;
            tileObj.el.style.transform = 'scale(1)';
        });
    });

    // 4. Handle Transition End cleanly
    const onTransitionEnd = () => {
        tileObj.el.removeEventListener('transitionend', onTransitionEnd);
        
        // Final Check: Replace placeholder
        if (placeholder.parentNode) {
            placeholder.replaceWith(tileObj.el);
        }
        
        // Reset styles to match static flow in dock
        Object.assign(tileObj.el.style, {
            position: '',
            left: '',
            top: '',
            zIndex: '',
            transform: '',
            transition: ''
        });
        
        tileObj.el.classList.remove('flying-tile', 'disabled');
        
        isAnimating = false;
        checkMatch();
    };

    tileObj.el.addEventListener('transitionend', onTransitionEnd);
    
    // Fallback in case event doesn't fire
    setTimeout(() => {
        if (isAnimating) onTransitionEnd();
    }, 500);
}

// Removed renderDock entirely to prevent flickering
// function renderDock() { ... }

function checkMatch() {
    let counts = {};
    dockTiles.forEach(t => counts[t.type] = (counts[t.type] || 0) + 1);
    
    let typeToRemove = Object.keys(counts).find(type => counts[type] >= 3);
    
    if (typeToRemove) {
        isAnimating = true;
        
        // Short delay to let the user see the 3rd tile land
        setTimeout(() => {
            const toRemove = dockTiles.filter(t => t.type === typeToRemove).slice(0, 3);
            
            // 1. Visual Highlight/Combo effect
            toRemove.forEach(t => {
                t.el.classList.add('match-anim');
            });

            // 2. Wait for animation then remove
            setTimeout(() => {
                toRemove.forEach(t => {
                    t.el.style.opacity = '0';
                    t.el.style.transform = 'scale(0)';
                });

                setTimeout(() => {
                    toRemove.forEach(t => t.el.remove());
                    
                    // Update array logic
                    let removedCount = 0;
                    dockTiles = dockTiles.filter(t => {
                        if (t.type === typeToRemove && removedCount < 3) {
                            removedCount++;
                            return false;
                        }
                        return true;
                    });
                    
                    isAnimating = false;
                    checkWinLose();
                }, 200); // Matches CSS transition time
            }, 300); // Wait for 'match-anim' highlight
        }, 150);
    } else {
        checkWinLose();
    }
}

function checkWinLose() {
    if (boardTiles.length === 0 && dockTiles.length === 0) {
        setTimeout(() => {
            showModal('win');
        }, 300);
    } else if (dockTiles.length >= DOCK_CAPACITY) {
        setTimeout(() => {
            showModal('lose');
        }, 300);
    }
}

function showModal(type) {
    modal.classList.remove('hidden');
    if (type === 'win') {
        modalIcon.innerText = '🎉';
        modalTitle.innerText = '恭喜过关!';
        modalMsg.innerText = `第 ${currentLevel} 关挑战成功！`;
        modalBtn.innerText = '下一关';
        API.submitScore(username, currentLevel + 1); // Update score (passed level)
    } else {
        modalIcon.innerText = '😭';
        modalTitle.innerText = '游戏结束';
        modalMsg.innerText = '槽位已满，大侠请重新来过！';
        modalBtn.innerText = '再试一次';
        API.submitScore(username, currentLevel);
    }
}
