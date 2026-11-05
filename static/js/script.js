class SoundSystem {
    constructor() {
        this.enabled = true;
        this.initialized = false;
        this.synth = null;
    }

    init() {
        if (this.initialized) return;
        try {
            // Create square wave synthesizer for 8-bit retro sounds
            this.synth = new Tone.Synth({
                oscillator: { type: "square" },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
            }).toDestination();
            Tone.Master.volume.value = -12; // Modest volume
            this.initialized = true;
        } catch (e) {
            console.log("Audio Init failed:", e);
        }
    }

    playJump() {
        if (!this.enabled || !this.initialized) return;
        try {
            this.synth.triggerAttackRelease("C5", "16n", Tone.now());
            this.synth.frequency.setValueAtTime(260, Tone.now());
            this.synth.frequency.exponentialRampToValueAtTime(600, Tone.now() + 0.12);
        } catch (e) { }
    }

    playCoin() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("B5", "16n", now);
            this.synth.triggerAttackRelease("E6", "8n", now + 0.08);
        } catch (e) { }
    }

    playStomp() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("E3", "16n", now);
            this.synth.frequency.setValueAtTime(150, now);
            this.synth.frequency.linearRampToValueAtTime(40, now + 0.08);
        } catch (e) { }
    }

    playBlockHit() {
        if (!this.enabled || !this.initialized) return;
        try {
            this.synth.triggerAttackRelease("G3", "16n", Tone.now());
        } catch (e) { }
    }

    playHurt() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("G3", "16n", now);
            this.synth.triggerAttackRelease("E3", "16n", now + 0.08);
            this.synth.triggerAttackRelease("C3", "16n", now + 0.16);
        } catch (e) { }
    }

    playWin() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            const notes = ["G4", "C5", "E5", "G5", "C6"];
            notes.forEach((note, idx) => {
                this.synth.triggerAttackRelease(note, "16n", now + idx * 0.1);
            });
        } catch (e) { }
    }
}

const sound = new SoundSystem();

// --- 2. GAME ENGINE CONFIGURATION & VARIABLES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Virtual Canvas Coordinates
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const GRAVITY = 0.55;
const LEVEL_WIDTH = 3400;

// UI Displays
const scoreDisplay = document.getElementById('score-display');
const coinsDisplay = document.getElementById('coins-display');
const livesDisplay = document.getElementById('lives-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const victoryScreen = document.getElementById('victory-screen');

// Controls State
const keys = {
    left: false,
    right: false,
    jump: false,
    jumpPressed: false
};

let gameState = 'START'; // START, PLAYING, GAMEOVER, VICTORY
let score = 0;
let coins = 0;
let lives = 3;
let cameraX = 0;
let animationFrameId = null;

// --- 3. GAME OBJECT DEFINITIONS ---

// Player (Mario-inspired character)
const player = {
    x: 100,
    y: 300,
    w: 28,
    h: 36,
    vx: 0,
    vy: 0,
    speed: 4.5,
    jumpStrength: -12.5,
    grounded: false,
    facing: 'right',
    animFrame: 0,
    animTimer: 0,
    invulnerableTimer: 0,

    reset() {
        this.x = 100;
        this.y = 300;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.invulnerableTimer = 0;
    },

    update() {
        // Movement horizontal
        if (keys.left) {
            this.vx = -this.speed;
            this.facing = 'left';
        } else if (keys.right) {
            this.vx = this.speed;
            this.facing = 'right';
        } else {
            this.vx *= 0.7; // Friction
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        // Jump trigger
        if (keys.jump && this.grounded) {
            this.vy = this.jumpStrength;
            this.grounded = false;
            sound.playJump();
        }

        // Apply Gravity
        this.vy += GRAVITY;

        // Move X
        this.x += this.vx;
        checkCollisionX(this);

        // Move Y
        this.y += this.vy;
        this.grounded = false;
        checkCollisionY(this);

        // Boundary bounds
        if (this.x < 0) this.x = 0;

        // Pit Death Check
        if (this.y > CANVAS_HEIGHT + 100) {
            playerHurt(true); // Instant death pit
        }

        // Invulnerability flicker timer
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

        // Animation timer
        if (Math.abs(this.vx) > 0.5 && this.grounded) {
            this.animTimer++;
            if (this.animTimer % 6 === 0) {
                this.animFrame = (this.animFrame + 1) % 3;
            }
        } else {
            this.animFrame = 0;
        }
    },

    draw() {
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
            return; // Invulnerability blinking
        }

        ctx.save();
        ctx.translate(this.x - cameraX, this.y);

        if (this.facing === 'left') {
            ctx.scale(-1, 1);
            ctx.translate(-this.w, 0);
        }

        // Drawing Red Cap & Shirt Character (Mario Style)
        // Overalls (Blue)
        ctx.fillStyle = "#1d4ed8";
        ctx.fillRect(4, 16, 20, 16);

        // Red Shirt & Arms
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(2, 14, 24, 8);

        // Head/Face (Skin tone)
        ctx.fillStyle = "#fed7aa";
        ctx.fillRect(6, 4, 16, 12);

        // Mustache / Eye
        ctx.fillStyle = "#451a03";
        ctx.fillRect(16, 10, 6, 3); // Mustache
        ctx.fillRect(16, 6, 2, 3);  // Eye

        // Red Cap
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(4, 0, 20, 6);
        ctx.fillRect(10, 0, 14, 4); // Visor brim

        // Shoes (Brown)
        ctx.fillStyle = "#78350f";
        if (!this.grounded) {
            // Jump pose
            ctx.fillRect(0, 28, 10, 8);
            ctx.fillRect(16, 24, 10, 8);
        } else if (this.animFrame === 1) {
            // Walking pose 1
            ctx.fillRect(2, 30, 10, 6);
            ctx.fillRect(14, 28, 10, 6);
        } else if (this.animFrame === 2) {
            // Walking pose 2
            ctx.fillRect(0, 28, 10, 6);
            ctx.fillRect(16, 30, 10, 6);
        } else {
            // Idle
            ctx.fillRect(2, 30, 10, 6);
            ctx.fillRect(16, 30, 10, 6);
        }

        ctx.restore();
    }
};

// World Objects Containers
let platforms = [];
let coinsList = [];
let enemies = [];
let particles = [];
let flag = { x: 3100, y: 130, w: 10, h: 260 };

// Level Generator
function initLevel() {
    platforms = [];
    coinsList = [];
    enemies = [];
    particles = [];

    const GROUND_Y = 390;

    // 1. Ground Segments (with Pits)
    const groundSegments = [
        { start: 0, end: 900 },
        { start: 1020, end: 1750 },
        { start: 1880, end: 2500 },
        { start: 2600, end: 3400 }
    ];

    groundSegments.forEach(seg => {
        platforms.push({
            x: seg.start,
            y: GROUND_Y,
            w: seg.end - seg.start,
            h: 60,
            type: 'ground'
        });
    });

    // 2. Elevated Platforms & Brick Blocks
    const structureData = [
        // Section 1
        { x: 300, y: 270, type: 'question', item: 'coin' },
        { x: 340, y: 270, type: 'brick' },
        { x: 380, y: 270, type: 'question', item: 'coin' },
        { x: 420, y: 270, type: 'brick' },
        { x: 380, y: 160, type: 'question', item: 'coin' },

        // Pipes (Green)
        { x: 600, y: 320, w: 50, h: 70, type: 'pipe' },
        { x: 780, y: 280, w: 50, h: 110, type: 'pipe' },

        // Section 2 (Over Pit 1)
        { x: 960, y: 280, w: 80, h: 20, type: 'brick' },

        { x: 1150, y: 270, type: 'brick' },
        { x: 1190, y: 270, type: 'question', item: 'coin' },
        { x: 1230, y: 270, type: 'brick' },

        // High Staircase
        { x: 1400, y: 350, w: 40, h: 40, type: 'block' },
        { x: 1440, y: 310, w: 40, h: 80, type: 'block' },
        { x: 1480, y: 270, w: 40, h: 120, type: 'block' },
        { x: 1520, y: 230, w: 40, h: 160, type: 'block' },

        // Section 3
        { x: 1950, y: 270, type: 'question', item: 'coin' },
        { x: 2050, y: 270, type: 'brick' },
        { x: 2090, y: 160, type: 'question', item: 'coin' },
        { x: 2130, y: 270, type: 'brick' },

        // Final Castle Steps
        { x: 2700, y: 350, w: 30, h: 40, type: 'block' },
        { x: 2730, y: 310, w: 30, h: 80, type: 'block' },
        { x: 2760, y: 270, w: 30, h: 120, type: 'block' },
        { x: 2790, y: 230, w: 30, h: 160, type: 'block' },
        { x: 2820, y: 190, w: 30, h: 200, type: 'block' }
    ];

    structureData.forEach(s => {
        platforms.push({
            x: s.x,
            y: s.y,
            w: s.w || 40,
            h: s.h || 40,
            type: s.type,
            hit: false,
            item: s.item || null
        });
    });

    // 3. Floating Coins
    const coinPositions = [
        { x: 340, y: 230 }, { x: 420, y: 230 },
        { x: 615, y: 270 }, { x: 795, y: 230 },
        { x: 980, y: 230 }, { x: 1010, y: 230 },
        { x: 1190, y: 220 }, { x: 1600, y: 250 },
        { x: 1640, y: 250 }, { x: 1680, y: 250 },
        { x: 2050, y: 220 }, { x: 2130, y: 220 },
        { x: 2400, y: 330 }, { x: 2450, y: 300 }, { x: 2500, y: 330 }
    ];

    coinPositions.forEach(c => {
        coinsList.push({ x: c.x, y: c.y, w: 16, h: 22, collected: false, floatOffset: Math.random() * 5 });
    });

    // 4. Enemies (Goombas)
    const enemyPositions = [
        { x: 450, minX: 300, maxX: 580 },
        { x: 700, minX: 660, maxX: 760 },
        { x: 1100, minX: 1040, maxX: 1350 },
        { x: 1300, minX: 1040, maxX: 1350 },
        { x: 1650, minX: 1550, maxX: 1800 },
        { x: 2000, minX: 1900, maxX: 2200 },
        { x: 2300, minX: 2200, maxX: 2450 },
        { x: 2650, minX: 2600, maxX: 2700 }
    ];

    enemyPositions.forEach(e => {
        enemies.push({
            x: e.x,
            y: GROUND_Y - 28,
            w: 28,
            h: 28,
            vx: -1.2,
            minX: e.minX,
            maxX: e.maxX,
            alive: true,
            squishTimer: 0
        });
    });
}

// --- 4. COLLISION DETECTION LOGIC ---

function checkCollisionX(obj) {
    for (let p of platforms) {
        if (isColliding(obj, p)) {
            if (obj.vx > 0) {
                obj.x = p.x - obj.w;
            } else if (obj.vx < 0) {
                obj.x = p.x + p.w;
            }
        }
    }
}

function checkCollisionY(obj) {
    for (let p of platforms) {
        if (isColliding(obj, p)) {
            if (obj.vy > 0) {
                // Landing on top of platform
                obj.y = p.y - obj.h;
                obj.vy = 0;
                obj.grounded = true;
            } else if (obj.vy < 0) {
                // Hitting platform from below
                obj.y = p.y + p.h;
                obj.vy = 0;

                // Question block hit reaction
                if (p.type === 'question' && !p.hit) {
                    p.hit = true;
                    sound.playBlockHit();
                    spawnCoinParticle(p.x + p.w / 2, p.y - 10);
                    addScore(200);
                    addCoin();
                } else if (p.type === 'brick') {
                    sound.playBlockHit();
                    spawnDebris(p.x + p.w / 2, p.y + p.h / 2);
                }
            }
        }
    }
}

function isColliding(a, b) {
    return a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;
}

// Handle Hurt / Respawn
function playerHurt(instantKill = false) {
    if (player.invulnerableTimer > 0 && !instantKill) return;

    sound.playHurt();
    lives--;
    updateHUD();

    if (lives <= 0 || instantKill && lives <= 0) {
        triggerGameOver();
    } else {
        // Respawn player
        player.reset();
        player.invulnerableTimer = 90; // ~1.5s invincibility
    }
}

function addScore(pts) {
    score += pts;
    updateHUD();
}

function addCoin() {
    coins++;
    sound.playCoin();
    if (coins >= 100) {
        coins = 0;
        lives++;
    }
    updateHUD();
}

function updateHUD() {
    scoreDisplay.textContent = String(score).padStart(6, '0');
    coinsDisplay.textContent = String(coins).padStart(2, '0');
    livesDisplay.textContent = 'x' + lives;
}

// --- 5. VISUAL EFFECTS & PARTICLES ---
function spawnCoinParticle(x, y) {
    particles.push({
        x: x, y: y,
        vy: -6,
        life: 25,
        type: 'coin'
    });
}

function spawnDebris(x, y) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 5 - 2,
            life: 20,
            type: 'brick'
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx || 0;
        p.y += p.vy || 0;
        if (p.type === 'coin') p.vy += 0.3;
        if (p.type === 'brick') p.vy += 0.4;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x - cameraX, p.y);
        if (p.type === 'coin') {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'brick') {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-4, -4, 8, 8);
        }
        ctx.restore();
    });
}

// --- 6. RENDERING GAME WORLD ---

function drawBackground() {
    // Sky Gradient
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Parallax Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const cloudPositions = [100, 400, 800, 1200, 1700, 2200, 2800];
    cloudPositions.forEach(cx => {
        let screenX = (cx - cameraX * 0.3) % (CANVAS_WIDTH + 200) - 100;
        ctx.beginPath();
        ctx.arc(screenX, 80, 24, 0, Math.PI * 2);
        ctx.arc(screenX + 20, 70, 30, 0, Math.PI * 2);
        ctx.arc(screenX + 45, 80, 22, 0, Math.PI * 2);
        ctx.fill();
    });

    // Parallax Retro Hills
    ctx.fillStyle = '#00a800';
    const hillPositions = [50, 600, 1100, 1700, 2300, 2900];
    hillPositions.forEach(hx => {
        let screenX = hx - cameraX * 0.6;
        ctx.beginPath();
        ctx.moveTo(screenX, 390);
        ctx.quadraticCurveTo(screenX + 60, 310, screenX + 120, 390);
        ctx.fill();
    });
}

function drawPlatforms() {
    platforms.forEach(p => {
        // Skip offscreen platforms for performance
        if (p.x + p.w < cameraX || p.x > cameraX + CANVAS_WIDTH) return;

        ctx.save();
        ctx.translate(p.x - cameraX, p.y);

        if (p.type === 'ground') {
            // Top Grass layer
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(0, 0, p.w, 12);
            // Underground Dirt
            ctx.fillStyle = '#78350f';
            ctx.fillRect(0, 12, p.w, p.h - 12);
            // Dirt texture detail
            ctx.fillStyle = '#451a03';
            for (let x = 8; x < p.w; x += 32) {
                ctx.fillRect(x, 24, 12, 12);
            }
        } else if (p.type === 'brick') {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(0, 0, p.w, p.h);
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, p.w, p.h);
            ctx.beginPath();
            ctx.moveTo(0, p.h / 2); ctx.lineTo(p.w, p.h / 2);
            ctx.moveTo(p.w / 2, 0); ctx.lineTo(p.w / 2, p.h / 2);
            ctx.stroke();
        } else if (p.type === 'question') {
            ctx.fillStyle = p.hit ? '#78716c' : '#f59e0b';
            ctx.fillRect(0, 0, p.w, p.h);
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, p.w, p.h);

            if (!p.hit) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 20px "Press Start 2P", sans-serif';
                ctx.fillText('?', 12, 28);
            }
        } else if (p.type === 'pipe') {
            // Green Mario Pipe
            ctx.fillStyle = '#15803d';
            ctx.fillRect(0, 0, p.w, p.h);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(4, 0, 8, p.h); // Highlight
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = 3;
            ctx.strokeRect(0, 0, p.w, p.h);
            // Pipe Lip Top
            ctx.fillRect(-3, 0, p.w + 6, 16);
            ctx.strokeRect(-3, 0, p.w + 6, 16);
        } else if (p.type === 'block') {
            // Solid Staircase Block
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(0, 0, p.w, p.h);
            ctx.strokeStyle = '#7c2d12';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, p.w, p.h);
        }

        ctx.restore();
    });
}

function drawCoins() {
    coinsList.forEach(c => {
        if (c.collected) return;
        if (c.x + c.w < cameraX || c.x > cameraX + CANVAS_WIDTH) return;

        ctx.save();
        ctx.translate(c.x - cameraX + c.w / 2, c.y + c.h / 2);

        // Coin spin animation logic
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Player pickup collision check
        if (isColliding(player, c)) {
            c.collected = true;
            addScore(200);
            addCoin();
        }
    });
}

function updateAndDrawEnemies() {
    enemies.forEach(e => {
        if (!e.alive) {
            if (e.squishTimer > 0) {
                e.squishTimer--;
                // Draw squished goomba
                ctx.save();
                ctx.translate(e.x - cameraX, e.y + 18);
                ctx.fillStyle = '#78350f';
                ctx.fillRect(0, 0, e.w, 10);
                ctx.restore();
            }
            return;
        }

        // Patrol movement
        e.x += e.vx;
        if (e.x <= e.minX || e.x >= e.maxX) {
            e.vx *= -1;
        }

        // Draw Goomba Enemy
        ctx.save();
        ctx.translate(e.x - cameraX, e.y);

        // Body (Brown Mushroom)
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.arc(14, 12, 14, Math.PI, 0);
        ctx.fillRect(0, 12, 28, 10);
        ctx.fill();

        // Eyes (Angry)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, 8, 6, 8);
        ctx.fillRect(18, 8, 6, 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(8, 10, 2, 4);
        ctx.fillRect(18, 10, 2, 4);

        // Feet
        ctx.fillStyle = '#451a03';
        ctx.fillRect(0, 22, 10, 6);
        ctx.fillRect(18, 22, 10, 6);

        ctx.restore();

        // Collision with player
        if (isColliding(player, e)) {
            // Stomp check: Player falling on top of Goomba
            if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 12) {
                e.alive = false;
                e.squishTimer = 30; // 0.5s visible flat goomba
                player.vy = -7; // Rebound jump
                sound.playStomp();
                addScore(100);
            } else {
                playerHurt();
            }
        }
    });
}

function drawFlag() {
    ctx.save();
    ctx.translate(flag.x - cameraX, flag.y);

    // Pole
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, flag.w, flag.h);

    // Top Gold Ball
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(5, -6, 12, 0, Math.PI * 2);
    ctx.fill();

    // Red Flag
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(60, 25);
    ctx.lineTo(10, 40);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Win Trigger Check
    if (player.x + player.w >= flag.x && gameState === 'PLAYING') {
        triggerVictory();
    }
}

// --- 7. GAME STATE MANAGEMENT ---

function startGame() {
    sound.init();
    score = 0;
    coins = 0;
    lives = 3;
    updateHUD();

    player.reset();
    initLevel();

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');

    gameState = 'PLAYING';
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('final-score-lose').textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function triggerVictory() {
    gameState = 'VICTORY';
    sound.playWin();
    document.getElementById('final-score-win').textContent = score;
    document.getElementById('final-coins-win').textContent = coins;
    victoryScreen.classList.remove('hidden');
}

// Main Game Loop
function gameLoop() {
    if (gameState !== 'PLAYING') return;

    // 1. Update Game States
    player.update();
    updateParticles();

    // Smooth Camera Follow Player
    cameraX = player.x - CANVAS_WIDTH / 3;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > LEVEL_WIDTH - CANVAS_WIDTH) cameraX = LEVEL_WIDTH - CANVAS_WIDTH;

    // 2. Render Scene
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground();
    drawPlatforms();
    drawCoins();
    drawFlag();
    updateAndDrawEnemies();
    drawParticles();
    player.draw();

    // Loop Call
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- 8. INPUT CONTROL LISTENERS ---

// Keyboard Controls
window.addEventListener('keydown', (e) => {
    sound.init();
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!keys.jump) keys.jump = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') keys.jump = false;
});

// Touch Controls for Mobile
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnJump = document.getElementById('btn-jump');

const bindTouch = (elem, keyName) => {
    elem.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sound.init();
        keys[keyName] = true;
    });
    elem.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys[keyName] = false;
    });
};

bindTouch(btnLeft, 'left');
bindTouch(btnRight, 'right');
bindTouch(btnJump, 'jump');

// Buttons Click Handlers
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn-lose').addEventListener('click', startGame);
document.getElementById('restart-btn-win').addEventListener('click', startGame);

// Sound Toggle Button
const soundBtn = document.getElementById('sound-btn');
const soundIcon = document.getElementById('sound-icon');

soundBtn.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    if (sound.enabled) {
        soundIcon.className = "fa-solid fa-volume-high text-yellow-400";
    } else {
        soundIcon.className = "fa-solid fa-volume-xmark text-slate-500";
    }
});

// Initial Background Draw on Load
initLevel();
drawBackground();
drawPlatforms();