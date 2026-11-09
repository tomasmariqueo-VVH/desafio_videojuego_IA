// --- 1. AUDIO SYNTH ENGINE (Tone.js 8-Bit NES Sound FX) ---
class NESAudio {
    constructor() {
        this.enabled = true;
        this.initialized = false;
        this.synth = null;
        this.noise = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.synth = new Tone.Synth({
                oscillator: { type: "square" },
                envelope: { attack: 0.005, decay: 0.08, sustain: 0.05, release: 0.08 }
            }).toDestination();

            this.noise = new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
            }).toDestination();

            Tone.Master.volume.value = -10;
            this.initialized = true;
        } catch (e) {
            console.warn("Audio init deferred:", e);
        }
    }

    playJump() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("B4", "16n", now);
            this.synth.frequency.setValueAtTime(280, now);
            this.synth.frequency.exponentialRampToValueAtTime(700, now + 0.12);
        } catch (e) { }
    }

    playCoin() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("B5", "16n", now);
            this.synth.triggerAttackRelease("E6", "8n", now + 0.06);
        } catch (e) { }
    }

    playStomp() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("D3", "16n", now);
            this.synth.frequency.setValueAtTime(200, now);
            this.synth.frequency.linearRampToValueAtTime(50, now + 0.08);
        } catch (e) { }
    }

    playKick() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("G4", "16n", now);
            this.synth.frequency.setValueAtTime(440, now);
            this.synth.frequency.exponentialRampToValueAtTime(110, now + 0.09);
        } catch (e) { }
    }

    playPowerupSpawn() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            const notes = ["C4", "E4", "G4", "C5"];
            notes.forEach((note, idx) => {
                this.synth.triggerAttackRelease(note, "32n", now + idx * 0.03);
            });
        } catch (e) { }
    }

    playPowerupCollect() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            const notes = ["G4", "B4", "D5", "G5", "B5", "E6"];
            notes.forEach((note, idx) => {
                this.synth.triggerAttackRelease(note, "16n", now + idx * 0.05);
            });
        } catch (e) { }
    }

    playBreakBrick() {
        if (!this.enabled || !this.initialized) return;
        try {
            this.noise.triggerAttackRelease("16n", Tone.now());
        } catch (e) { }
    }

    playBump() {
        if (!this.enabled || !this.initialized) return;
        try {
            this.synth.triggerAttackRelease("F2", "16n", Tone.now());
        } catch (e) { }
    }

    playHurt() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("G3", "16n", now);
            this.synth.triggerAttackRelease("E3", "16n", now + 0.07);
            this.synth.triggerAttackRelease("C3", "16n", now + 0.14);
        } catch (e) { }
    }

    playFlagSlide() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            this.synth.triggerAttackRelease("G4", "4n", now);
            this.synth.frequency.setValueAtTime(400, now);
            this.synth.frequency.linearRampToValueAtTime(150, now + 0.4);
        } catch (e) { }
    }

    playWinFanfare() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            const melody = [
                { note: "G4", dur: "16n", time: 0 },
                { note: "C5", dur: "16n", time: 0.1 },
                { note: "E5", dur: "16n", time: 0.2 },
                { note: "G5", dur: "16n", time: 0.3 },
                { note: "C6", dur: "8n", time: 0.4 },
                { note: "E6", dur: "8n", time: 0.55 },
                { note: "G6", dur: "4n", time: 0.7 }
            ];
            melody.forEach(m => {
                this.synth.triggerAttackRelease(m.note, m.dur, now + m.time);
            });
        } catch (e) { }
    }

    playDeath() {
        if (!this.enabled || !this.initialized) return;
        try {
            const now = Tone.now();
            const notes = ["B4", "F5", "F5", "F5", "E5", "D5", "C5"];
            notes.forEach((note, idx) => {
                this.synth.triggerAttackRelease(note, "16n", now + idx * 0.1);
            });
        } catch (e) { }
    }
}

const audio = new NESAudio();

// --- 2. GAME SETUP & ENGINE CONSTANTS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const TILE = 32;
const CANVAS_W = 800;
const CANVAS_H = 480;
const GROUND_Y_TILE = 13;
const GRAVITY = 0.52;

let gameMode = '1P'; // '1P' or '2P'
let singlePlayerChar = 'mario'; // 'mario' or 'luigi'
let gameState = 'START'; // START, PLAYING, GAMEOVER, VICTORY
let gameTime = 400;
let timeTimer = null;
let cameraX = 0;
let animationFrameId = null;

const keys = {
    p1_left: false, p1_right: false, p1_jump: false, p1_run: false,
    p2_left: false, p2_right: false, p2_jump: false, p2_run: false
};

// --- 3. PLAYER CLASS (MARIO & LUIGI) ---
class Player {
    constructor(id, name, character, startX, shirtColor, overallsColor) {
        this.id = id; // 'p1' or 'p2'
        this.name = name; // 'MARIO' or 'LUIGI'
        this.character = character;
        this.startX = startX;
        this.shirtColor = shirtColor;
        this.overallsColor = overallsColor;
        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.reset();
    }

    reset() {
        this.x = this.startX;
        this.y = (GROUND_Y_TILE * TILE) - 32;
        this.w = 28;
        this.h = 32;
        this.vx = 0;
        this.vy = 0;
        this.walkSpeed = 3.8;
        this.runSpeed = 5.6;
        this.jumpStrength = this.character === 'luigi' ? -13.2 : -12.2;
        this.friction = this.character === 'luigi' ? 0.82 : 0.72;
        this.grounded = false;
        this.facing = 'right';
        this.state = 'small';
        this.animFrame = 0;
        this.animTimer = 0;
        this.invulnerableTimer = 0;
        this.growTimer = 0;
        this.flagSliding = false;
        this.castleWalking = false;
        this.isDead = false;
        this.active = true;
    }

    growToSuper() {
        if (this.state === 'super') return;
        this.state = 'super';
        this.growTimer = 30;
        this.h = 58;
        this.y -= 26;
        audio.playPowerupCollect();
        updateHUD();
    }

    shrinkToSmall() {
        this.state = 'small';
        this.h = 32;
        this.invulnerableTimer = 110;
        audio.playHurt();
        updateHUD();
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.vy = -12;
        audio.playDeath();
        this.lives--;
        updateHUD();
    }

    update(leftKey, rightKey, jumpKey, runKey) {
        if (!this.active) return;

        if (this.isDead) {
            this.vy += GRAVITY;
            this.y += this.vy;
            return;
        }

        if (this.flagSliding) {
            this.y += 3;
            if (this.y >= (GROUND_Y_TILE * TILE) - this.h) {
                this.y = (GROUND_Y_TILE * TILE) - this.h;
                this.flagSliding = false;
                this.castleWalking = true;
                audio.playWinFanfare();
            }
            return;
        }

        if (this.castleWalking) {
            this.facing = 'right';
            this.vx = 2.0;
            this.x += this.vx;
            this.animTimer++;
            if (this.animTimer % 6 === 0) this.animFrame = (this.animFrame + 1) % 3;

            if (this.x >= 204 * TILE + 10) {
                checkVictoryConditions();
            }
            return;
        }

        if (this.growTimer > 0) this.growTimer--;

        const maxSpd = runKey ? this.runSpeed : this.walkSpeed;

        if (leftKey) {
            this.vx = -maxSpd;
            this.facing = 'left';
        } else if (rightKey) {
            this.vx = maxSpd;
            this.facing = 'right';
        } else {
            this.vx *= this.friction;
            if (Math.abs(this.vx) < 0.1) this.vx = 0;
        }

        if (jumpKey && this.grounded) {
            this.vy = this.jumpStrength;
            this.grounded = false;
            audio.playJump();
        }

        this.vy += GRAVITY;

        // X Movement & Collision
        this.x += this.vx;
        checkPlayerCollisionX(this);

        // Lock player to non-scrolling camera border
        if (this.x < cameraX) {
            this.x = cameraX;
            this.vx = 0;
        }

        // Y Movement & Collision
        this.y += this.vy;
        this.grounded = false;
        checkPlayerCollisionY(this);

        // Pit Fall Check
        if (this.y > CANVAS_H + 50) {
            this.die();
        }

        if (this.invulnerableTimer > 0) this.invulnerableTimer--;

        // Animation
        if (Math.abs(this.vx) > 0.4 && this.grounded) {
            this.animTimer++;
            if (this.animTimer % (runKey ? 4 : 7) === 0) {
                this.animFrame = (this.animFrame + 1) % 3;
            }
        } else {
            this.animFrame = 0;
        }
    }

    draw() {
        if (!this.active) return;
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0) return;

        ctx.save();
        ctx.translate(Math.floor(this.x - cameraX), Math.floor(this.y));

        if (this.facing === 'left') {
            ctx.scale(-1, 1);
            ctx.translate(-this.w, 0);
        }

        const isSuper = this.state === 'super';
        const currentH = isSuper ? 58 : 32;

        if (this.growTimer > 0 && Math.floor(this.growTimer / 3) % 2 === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, this.w, currentH);
            ctx.restore();
            return;
        }

        if (isSuper) {
            // Cap
            ctx.fillStyle = this.shirtColor;
            ctx.fillRect(4, 0, 20, 8);
            ctx.fillRect(10, 2, 14, 4);

            // Face
            ctx.fillStyle = '#fdba74';
            ctx.fillRect(6, 8, 16, 14);

            // Mustache & Eye
            ctx.fillStyle = '#451a03';
            ctx.fillRect(16, 16, 8, 4);
            ctx.fillRect(16, 10, 3, 4);

            // Shirt & Arms
            ctx.fillStyle = this.shirtColor;
            ctx.fillRect(2, 22, 24, 14);

            // Overalls & Suspenders
            ctx.fillStyle = this.overallsColor;
            ctx.fillRect(4, 28, 20, 20);
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(6, 32, 3, 3);
            ctx.fillRect(19, 32, 3, 3);

            // Shoes
            ctx.fillStyle = '#78350f';
            if (!this.grounded) {
                ctx.fillRect(0, 48, 12, 10);
                ctx.fillRect(16, 44, 12, 10);
            } else if (this.animFrame === 1) {
                ctx.fillRect(2, 50, 10, 8);
                ctx.fillRect(16, 48, 10, 8);
            } else if (this.animFrame === 2) {
                ctx.fillRect(0, 48, 10, 8);
                ctx.fillRect(18, 50, 10, 8);
            } else {
                ctx.fillRect(2, 50, 10, 8);
                ctx.fillRect(16, 50, 10, 8);
            }
        } else {
            // Small Form
            ctx.fillStyle = this.shirtColor;
            ctx.fillRect(4, 0, 20, 6);
            ctx.fillRect(10, 0, 14, 4);

            // Face
            ctx.fillStyle = '#fdba74';
            ctx.fillRect(6, 6, 16, 10);

            // Mustache & Eye
            ctx.fillStyle = '#451a03';
            ctx.fillRect(16, 11, 7, 3);
            ctx.fillRect(16, 7, 2, 3);

            // Shirt
            ctx.fillStyle = this.shirtColor;
            ctx.fillRect(2, 16, 24, 6);

            // Overalls
            ctx.fillStyle = this.overallsColor;
            ctx.fillRect(4, 18, 20, 10);

            // Shoes
            ctx.fillStyle = '#78350f';
            if (!this.grounded) {
                ctx.fillRect(0, 24, 10, 8);
                ctx.fillRect(16, 22, 10, 8);
            } else if (this.animFrame === 1) {
                ctx.fillRect(2, 26, 10, 6);
                ctx.fillRect(14, 24, 10, 6);
            } else if (this.animFrame === 2) {
                ctx.fillRect(0, 24, 10, 6);
                ctx.fillRect(16, 26, 10, 6);
            } else {
                ctx.fillRect(2, 26, 10, 6);
                ctx.fillRect(16, 26, 10, 6);
            }
        }

        ctx.restore();
    }
}

const player1 = new Player('p1', 'MARIO', 'mario', 70, '#dc2626', '#2563eb');
const player2 = new Player('p2', 'LUIGI', 'luigi', 110, '#00a800', '#1e3a8a');
let players = [player1];

// --- 4. MAP & WORLD 1-1 GENERATOR ---
let mapTiles = [];
let mapWidthCols = 212;
let coinsList = [];
let enemies = [];
let mushrooms = [];
let particles = [];
let flagpole = { col: 198, x: 198 * TILE, y: 3 * TILE, w: 10, h: 10 * TILE };

function buildWorld1_1() {
    mapTiles = Array.from({ length: 15 }, () => new Array(mapWidthCols).fill(0));
    coinsList = [];
    enemies = [];
    mushrooms = [];
    particles = [];

    for (let c = 0; c < mapWidthCols; c++) {
        if ((c >= 69 && c <= 70) || (c >= 86 && c <= 88) || (c >= 153 && c <= 154)) continue;
        mapTiles[13][c] = 1;
        mapTiles[14][c] = 1;
    }

    const setTile = (r, c, type) => { if (r >= 0 && r < 15 && c >= 0 && c < mapWidthCols) mapTiles[r][c] = type; };

    const placePipe = (c, heightTiles) => {
        const topR = 13 - heightTiles;
        setTile(topR, c, 6);
        setTile(topR, c + 1, 7);
        for (let r = topR + 1; r < 13; r++) {
            setTile(r, c, 8);
            setTile(r, c + 1, 9);
        }
    };

    const placeStair = (startC, height, ascending = true) => {
        for (let step = 1; step <= height; step++) {
            const c = ascending ? (startC + step - 1) : (startC + (height - step));
            for (let r = 13 - step; r < 13; r++) {
                setTile(r, c, 10);
            }
        }
    };

    // Bricks & ? Blocks
    setTile(9, 16, 3); setTile(9, 17, 2); setTile(9, 18, 4); setTile(9, 19, 2); setTile(9, 20, 3); setTile(5, 22, 3);
    setTile(9, 77, 2); setTile(9, 78, 4); setTile(9, 79, 2);
    for (let c = 80; c <= 84; c++) setTile(9, c, 2);
    for (let c = 80; c <= 83; c++) setTile(5, c, 2);
    setTile(5, 84, 3);
    setTile(8, 64, 12);

    for (let c = 100; c <= 107; c++) setTile(9, c, 2);
    setTile(9, 101, 3); setTile(9, 106, 11);
    for (let c = 109; c <= 112; c++) setTile(5, c, 2);
    setTile(5, 109, 4);

    setTile(9, 118, 2); setTile(9, 119, 4); setTile(9, 120, 2); setTile(9, 129, 3); setTile(9, 130, 3);
    setTile(9, 168, 2); setTile(9, 169, 2); setTile(9, 170, 3); setTile(9, 171, 2); setTile(9, 172, 2); setTile(9, 173, 2);

    // Pipes
    placePipe(28, 2); placePipe(38, 3); placePipe(46, 4); placePipe(57, 4); placePipe(95, 2); placePipe(163, 2);

    // Stairs
    placeStair(134, 4, true); placeStair(140, 4, false);
    placeStair(148, 4, true);
    setTile(12, 152, 10); setTile(11, 152, 10); setTile(10, 152, 10); setTile(9, 152, 10);
    setTile(12, 155, 10);
    placeStair(181, 8, true); setTile(12, 197, 10);

    // Coins
    [[20, 8], [22, 4], [30, 9], [40, 9], [80, 4], [82, 4], [102, 8], [105, 8], [120, 8], [122, 8], [170, 8]].forEach(([c, r]) => {
        coinsList.push({ x: c * TILE + 8, y: r * TILE + 4, w: 16, h: 22, collected: false });
    });

    // Enemies
    const enemySpawns = [
        { type: 'goomba', col: 22 }, { type: 'goomba', col: 34 }, { type: 'goomba', col: 40 },
        { type: 'goomba', col: 42 }, { type: 'goomba', col: 50 }, { type: 'goomba', col: 52 },
        { type: 'goomba', col: 80 }, { type: 'goomba', col: 82 }, { type: 'goomba', col: 97 },
        { type: 'koopa', col: 107 }, { type: 'goomba', col: 114 }, { type: 'goomba', col: 116 },
        { type: 'goomba', col: 125 }, { type: 'goomba', col: 127 }, { type: 'goomba', col: 174 }, { type: 'goomba', col: 176 }
    ];

    enemySpawns.forEach(e => {
        if (e.type === 'goomba') {
            enemies.push({ type: 'goomba', x: e.col * TILE, y: (GROUND_Y_TILE * TILE) - 28, w: 28, h: 28, vx: -1.2, vy: 0, grounded: true, alive: true, squishTimer: 0 });
        } else {
            enemies.push({ type: 'koopa', x: e.col * TILE, y: (GROUND_Y_TILE * TILE) - 40, w: 28, h: 40, vx: -1.0, vy: 0, grounded: true, alive: true, state: 'walk' });
        }
    });
}

// --- 5. RENDERERS ---
function drawBackground() {
    const drawCamX = Math.floor(cameraX);
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const clouds = [{ col: 8, r: 3, w: 2 }, { col: 19, r: 2, w: 3 }, { col: 36, r: 3, w: 1 }, { col: 56, r: 2, w: 2 }, { col: 74, r: 3, w: 3 }, { col: 104, r: 2, w: 2 }, { col: 130, r: 3, w: 1 }, { col: 160, r: 2, w: 3 }, { col: 190, r: 3, w: 2 }];
    clouds.forEach(cl => {
        let x = Math.floor(cl.col * TILE - drawCamX * 0.4);
        let y = cl.r * TILE;
        if (x + 120 < 0 || x > CANVAS_W + 100) return;
        ctx.beginPath();
        ctx.arc(x + 20, y + 20, 18, 0, Math.PI * 2); ctx.arc(x + 40, y + 10, 24, 0, Math.PI * 2); ctx.arc(x + 60, y + 20, 18, 0, Math.PI * 2);
        if (cl.w >= 2) ctx.arc(x + 80, y + 10, 22, 0, Math.PI * 2);
        if (cl.w >= 3) ctx.arc(x + 100, y + 20, 18, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#00a800';
    const bushes = [{ col: 11, w: 3 }, { col: 23, w: 1 }, { col: 41, w: 2 }, { col: 59, w: 3 }, { col: 89, w: 2 }, { col: 117, w: 1 }, { col: 137, w: 3 }, { col: 167, w: 2 }];
    bushes.forEach(b => {
        let x = Math.floor(b.col * TILE - drawCamX);
        let y = (GROUND_Y_TILE * TILE) - 20;
        if (x + 100 < 0 || x > CANVAS_W) return;
        ctx.beginPath();
        ctx.arc(x + 15, y, 16, 0, Math.PI * 2); ctx.arc(x + 35, y - 8, 22, 0, Math.PI * 2); ctx.arc(x + 55, y, 16, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawTileMap() {
    const drawCamX = Math.floor(cameraX);
    const startCol = Math.max(0, Math.floor(drawCamX / TILE));
    const endCol = Math.min(mapWidthCols - 1, Math.ceil((drawCamX + CANVAS_W) / TILE));

    for (let r = 0; r < 15; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const tile = mapTiles[r][c];
            if (tile === 0 || tile === 11 || tile === 12) continue;

            const x = Math.floor(c * TILE - drawCamX);
            const y = Math.floor(r * TILE);

            ctx.save();
            ctx.translate(x, y);

            if (tile === 1) {
                ctx.fillStyle = '#d97706'; ctx.fillRect(0, 0, TILE, TILE);
                ctx.fillStyle = '#451a03'; ctx.fillRect(0, 0, TILE, 4); ctx.fillRect(0, 14, TILE, 4); ctx.fillRect(14, 0, 4, TILE);
            } else if (tile === 2) {
                ctx.fillStyle = '#b45309'; ctx.fillRect(0, 0, TILE, TILE);
                ctx.strokeStyle = '#451a03'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, TILE, TILE);
                ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(TILE, 16); ctx.moveTo(16, 0); ctx.lineTo(16, 16); ctx.moveTo(8, 16); ctx.lineTo(8, 32); ctx.stroke();
            } else if (tile === 3 || tile === 4) {
                ctx.fillStyle = '#f59e0b'; ctx.fillRect(0, 0, TILE, TILE);
                ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, TILE, TILE);
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px "Press Start 2P", sans-serif'; ctx.fillText('?', 8, 24);
            } else if (tile === 5) {
                ctx.fillStyle = '#78716c'; ctx.fillRect(0, 0, TILE, TILE);
                ctx.strokeStyle = '#292524'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, TILE, TILE);
            } else if (tile === 6) {
                ctx.fillStyle = '#00a800'; ctx.fillRect(-2, 0, TILE + 2, TILE);
                ctx.fillStyle = '#b8f818'; ctx.fillRect(4, 0, 6, TILE - 2);
                ctx.fillStyle = '#003800'; ctx.fillRect(-2, 0, TILE + 2, 3); ctx.fillRect(-2, 0, 3, TILE); ctx.fillRect(-2, TILE - 3, TILE + 2, 3);
            } else if (tile === 7) {
                ctx.fillStyle = '#00a800'; ctx.fillRect(0, 0, TILE + 2, TILE);
                ctx.fillStyle = '#005000'; ctx.fillRect(TILE - 10, 0, 10, TILE);
                ctx.fillStyle = '#003800'; ctx.fillRect(0, 0, TILE + 2, 3); ctx.fillRect(TILE - 1, 0, 3, TILE); ctx.fillRect(0, TILE - 3, TILE + 2, 3);
            } else if (tile === 8) {
                ctx.fillStyle = '#00a800'; ctx.fillRect(0, 0, TILE, TILE);
                ctx.fillStyle = '#b8f818'; ctx.fillRect(6, 0, 6, TILE);
                ctx.fillStyle = '#003800'; ctx.fillRect(0, 0, 3, TILE);
            } else if (tile === 9) {
                ctx.fillStyle = '#00a800'; ctx.fillRect(0, 0, TILE, TILE);
                ctx.fillStyle = '#005000'; ctx.fillRect(TILE - 12, 0, 10, TILE);
                ctx.fillStyle = '#003800'; ctx.fillRect(TILE - 3, 0, 3, TILE);
            } else if (tile === 10) {
                ctx.fillStyle = '#ea580c'; ctx.fillRect(0, 0, TILE, TILE);
                ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, TILE, TILE);
            }

            ctx.restore();
        }
    }
}

function drawFlagpoleAndCastle() {
    const drawCamX = Math.floor(cameraX);
    const flagX = Math.floor(198 * TILE - drawCamX);
    if (flagX > -50 && flagX < CANVAS_W + 50) {
        ctx.save();
        ctx.translate(flagX, 3 * TILE);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(12, 0, 8, 10 * TILE);
        ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.arc(16, -6, 12, 0, Math.PI * 2); ctx.fill();

        let leadPlayer = players.find(p => p.flagSliding) || players[0];
        let flagYOffset = leadPlayer.flagSliding ? Math.min((leadPlayer.y - 3 * TILE), 9 * TILE) : 0;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.moveTo(12, flagYOffset + 10); ctx.lineTo(-40, flagYOffset + 25); ctx.lineTo(12, flagYOffset + 40); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    const castleX = Math.floor(202 * TILE - drawCamX);
    if (castleX > -200 && castleX < CANVAS_W + 200) {
        ctx.save();
        ctx.translate(castleX, 8 * TILE);
        ctx.fillStyle = '#b45309'; ctx.fillRect(0, 0, 5 * TILE, 5 * TILE);
        for (let i = 0; i < 5; i += 2) ctx.fillRect(i * TILE, -16, TILE, 16);
        ctx.fillStyle = '#000000'; ctx.fillRect(2 * TILE - 4, 3 * TILE, 36, 2 * TILE);
        ctx.beginPath(); ctx.arc(2 * TILE + 14, 3 * TILE, 18, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#16a34a'; ctx.fillRect(2.5 * TILE - 2, -40, 4, 24);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(2.5 * TILE + 2, -40, 20, 12);
        ctx.restore();
    }
}

// --- 6. PHYSICS & TILE COLLISIONS ---
function checkPlayerCollisionX(p) {
    const startC = Math.floor(p.x / TILE);
    const endC = Math.floor((p.x + p.w - 1) / TILE);
    const startR = Math.floor(p.y / TILE);
    const endR = Math.floor((p.y + p.h - 1) / TILE);

    for (let r = startR; r <= endR; r++) {
        for (let c = startC; c <= endC; c++) {
            if (r >= 0 && r < 15 && c >= 0 && c < mapWidthCols) {
                const tile = mapTiles[r][c];
                if (tile !== 0 && tile !== 11 && tile !== 12) {
                    if (p.vx > 0) p.x = c * TILE - p.w;
                    else if (p.vx < 0) p.x = (c + 1) * TILE;
                    p.vx = 0;
                    return;
                }
            }
        }
    }
}

function checkPlayerCollisionY(p) {
    const startC = Math.floor(p.x / TILE);
    const endC = Math.floor((p.x + p.w) / TILE);
    const startR = Math.floor(p.y / TILE);
    const endR = Math.floor((p.y + p.h) / TILE);

    for (let r = startR; r <= endR; r++) {
        for (let c = startC; c <= endC; c++) {
            if (r >= 0 && r < 15 && c >= 0 && c < mapWidthCols) {
                const tile = mapTiles[r][c];
                if (tile !== 0 && tile !== 11 && tile !== 12) {
                    if (p.vy > 0) {
                        p.y = r * TILE - p.h;
                        p.vy = 0;
                        p.grounded = true;
                    } else if (p.vy < 0) {
                        p.y = (r + 1) * TILE;
                        p.vy = 0;
                        handleBlockHit(p, r, c, tile);
                    }
                }
            }
        }
    }
}

function handleBlockHit(p, r, c, tile) {
    if (tile === 3) {
        mapTiles[r][c] = 5;
        audio.playCoin();
        spawnCoinParticle(c * TILE + 8, (r - 1) * TILE);
        p.score += 200;
        addCoin(p);
    } else if (tile === 4) {
        mapTiles[r][c] = 5;
        audio.playPowerupSpawn();
        mushrooms.push({ x: c * TILE + 2, y: (r - 1) * TILE, w: 28, h: 28, vx: 1.8, vy: -2 });
    } else if (tile === 2) {
        if (p.state === 'super') {
            mapTiles[r][c] = 0;
            audio.playBreakBrick();
            spawnDebris(c * TILE + 16, r * TILE + 16);
            p.score += 50;
        } else {
            audio.playBump();
        }
    } else if (tile === 11) {
        mapTiles[r][c] = 5;
        audio.playCoin();
        spawnCoinParticle(c * TILE + 8, (r - 1) * TILE);
        p.score += 200;
        addCoin(p);
    } else if (tile === 12) {
        mapTiles[r][c] = 5;
        audio.playPowerupSpawn();
        mushrooms.push({ x: c * TILE + 2, y: (r - 1) * TILE, w: 28, h: 28, vx: 1.8, vy: -2 });
    }
    updateHUD();
}

// --- 7. POWERUPS & ENEMY UPDATES ---
function updateMushrooms() {
    for (let i = mushrooms.length - 1; i >= 0; i--) {
        let m = mushrooms[i];
        m.vy += GRAVITY;
        m.x += m.vx;

        const startC = Math.floor(m.x / TILE);
        const endC = Math.floor((m.x + m.w) / TILE);
        const r = Math.floor(m.y / TILE);

        if (mapTiles[r] && (mapTiles[r][startC] > 0 || mapTiles[r][endC] > 0)) m.vx = -m.vx;

        m.y += m.vy;
        const bottomR = Math.floor((m.y + m.h) / TILE);
        if (mapTiles[bottomR] && (mapTiles[bottomR][startC] > 0 || mapTiles[bottomR][endC] > 0)) {
            m.y = bottomR * TILE - m.h;
            m.vy = 0;
        }

        players.forEach(p => {
            if (p.active && !p.isDead && isColliding(p, m)) {
                p.growToSuper();
                p.score += 1000;
                mushrooms.splice(i, 1);
            }
        });
    }
}

function drawMushrooms() {
    mushrooms.forEach(m => {
        const x = m.x - cameraX;
        if (x < -30 || x > CANVAS_W + 30) return;
        ctx.save();
        ctx.translate(x, m.y);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath(); ctx.arc(14, 14, 14, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(14, 6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, 12, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(22, 12, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(6, 14, 16, 14);
        ctx.restore();
    });
}

function updateAndDrawEnemies() {
    enemies.forEach(e => {
        if (!e.alive) {
            if (e.squishTimer > 0) {
                e.squishTimer--;
                ctx.save();
                ctx.translate(e.x - cameraX, e.y + 18);
                ctx.fillStyle = '#78350f';
                ctx.fillRect(0, 0, e.w, 10);
                ctx.restore();
            }
            return;
        }

        e.vy += GRAVITY;

        // Smart Edge Detection AI
        if (e.grounded && (e.type === 'goomba' || e.state === 'walk')) {
            let nextX = e.vx > 0 ? e.x + e.w + 4 : e.x - 4;
            let groundR = Math.floor((e.y + e.h + 2) / TILE);
            let groundC = Math.floor(nextX / TILE);
            if (groundR < 15 && groundC >= 0 && groundC < mapWidthCols) {
                if (mapTiles[groundR][groundC] === 0) e.vx = -e.vx;
            }
        }

        if (e.state !== 'shell') {
            e.x += e.vx;
            const c = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TILE);
            const r = Math.floor(e.y / TILE);
            if (mapTiles[r] && mapTiles[r][c] > 0) {
                e.vx = -e.vx;
                if (e.state === 'moving_shell') audio.playBump();
            }
        }

        e.y += e.vy;
        e.grounded = false;
        const bottomR = Math.floor((e.y + e.h) / TILE);
        const centerC = Math.floor((e.x + e.w / 2) / TILE);
        if (mapTiles[bottomR] && mapTiles[bottomR][centerC] > 0) {
            e.y = bottomR * TILE - e.h;
            e.vy = 0;
            e.grounded = true;
        }

        if (e.y > CANVAS_H + 50) { e.alive = false; return; }

        if (e.state === 'moving_shell') {
            enemies.forEach(other => {
                if (other !== e && other.alive && isColliding(e, other)) {
                    other.alive = false;
                    audio.playKick();
                    spawnDebris(other.x + 14, other.y + 14);
                }
            });
        }

        // Render
        const drawX = e.x - cameraX;
        if (drawX > -40 && drawX < CANVAS_W + 40) {
            ctx.save();
            ctx.translate(drawX, e.y);
            if (e.type === 'goomba') {
                ctx.fillStyle = '#92400e';
                ctx.beginPath(); ctx.arc(14, 12, 14, Math.PI, 0); ctx.fillRect(0, 12, 28, 10); ctx.fill();
                ctx.fillStyle = '#ffffff'; ctx.fillRect(4, 8, 6, 8); ctx.fillRect(18, 8, 6, 8);
                ctx.fillStyle = '#000000'; ctx.fillRect(8, 10, 2, 4); ctx.fillRect(18, 10, 2, 4);
            } else {
                if (e.state === 'walk') {
                    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.ellipse(14, 22, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(20, 10, 8, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#000000'; ctx.fillRect(22, 7, 3, 4);
                } else {
                    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(14, 12, 13, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = '#15803d'; ctx.lineWidth = 3; ctx.stroke();
                }
            }
            ctx.restore();
        }

        // Player Collision Checks
        players.forEach(p => {
            if (!p.active || p.isDead || !isColliding(p, e)) return;

            const isStomping = p.vy > 0 && (p.y + p.h - p.vy <= e.y + 14);

            if (e.type === 'goomba') {
                if (isStomping) {
                    e.alive = false; e.squishTimer = 25; p.vy = -8;
                    audio.playStomp(); p.score += 100;
                } else { playerHurt(p); }
            } else if (e.type === 'koopa') {
                if (e.state === 'walk') {
                    if (isStomping) {
                        e.state = 'shell'; e.h = 24; e.y += 16; e.vx = 0; p.vy = -8;
                        audio.playStomp(); p.score += 200;
                    } else { playerHurt(p); }
                } else if (e.state === 'shell') {
                    e.state = 'moving_shell'; e.vx = p.x < e.x ? 6.8 : -6.8; p.vy = -8;
                    audio.playKick(); p.score += 400;
                } else if (e.state === 'moving_shell') {
                    if (isStomping) {
                        e.state = 'shell'; e.vx = 0; p.vy = -8;
                        audio.playStomp();
                    } else { playerHurt(p); }
                }
            }
        });
    });
}

// --- 8. PARTICLES, HUD & GAME CONTROL ---
function playerHurt(p) {
    if (p.invulnerableTimer > 0 || p.growTimer > 0 || p.isDead) return;
    if (p.state === 'super') p.shrinkToSmall();
    else {
        p.die();
        checkGameOverConditions();
    }
}

function isColliding(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnCoinParticle(x, y) { particles.push({ x: x, y: y, vy: -6, life: 25, type: 'coin' }); }
function spawnDebris(x, y) {
    for (let i = 0; i < 4; i++) {
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 2, life: 20, type: 'brick' });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx || 0; p.y += p.vy || 0;
        if (p.type === 'coin') p.vy += 0.35;
        if (p.type === 'brick') p.vy += 0.45;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x - cameraX, p.y);
        if (p.type === 'coin') {
            ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'brick') {
            ctx.fillStyle = '#b45309'; ctx.fillRect(-4, -4, 8, 8);
        }
        ctx.restore();
    });
}

function drawCoins() {
    coinsList.forEach(c => {
        if (c.collected) return;
        const drawX = c.x - cameraX;
        if (drawX < -20 || drawX > CANVAS_W + 20) return;

        ctx.save();
        ctx.translate(drawX + 8, c.y + 11);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        players.forEach(p => {
            if (p.active && !p.isDead && isColliding(p, c)) {
                c.collected = true;
                p.score += 200;
                addCoin(p);
            }
        });
    });
}

function addCoin(p) {
    p.coins++;
    if (p.coins >= 100) { p.coins = 0; p.lives++; }
    updateHUD();
}

function updateHUD() {
    document.getElementById('hud-p1-score').textContent = String(player1.score).padStart(6, '0');
    document.getElementById('hud-p1-coins').textContent = String(player1.coins).padStart(2, '0');
    document.getElementById('hud-p1-lives').textContent = 'x' + player1.lives;
    document.getElementById('hud-p1-name').textContent = player1.character.toUpperCase();

    const p2Box = document.getElementById('hud-p2-box');
    if (gameMode === '2P') {
        p2Box.classList.remove('opacity-50');
        document.getElementById('hud-p2-score').textContent = String(player2.score).padStart(6, '0');
        document.getElementById('hud-p2-coins').textContent = String(player2.coins).padStart(2, '0');
        document.getElementById('hud-p2-lives').textContent = 'x' + player2.lives;
    } else {
        p2Box.classList.add('opacity-50');
    }

    document.getElementById('hud-time').textContent = String(gameTime).padStart(3, '0');
}

function selectGameMode(mode) {
    gameMode = mode;
    const card1P = document.getElementById('mode-1p-card');
    const card2P = document.getElementById('mode-2p-card');

    if (mode === '1P') {
        card1P.className = "bg-slate-900 border-2 border-amber-400 rounded-xl p-3 cursor-pointer flex flex-col items-center gap-2 transition-all transform scale-105 shadow-xl w-56 select-none hover:bg-slate-800";
        card2P.className = "bg-slate-950 border-2 border-slate-800 rounded-xl p-3 cursor-pointer flex flex-col items-center gap-2 transition-all shadow-md w-56 select-none hover:bg-slate-900 opacity-70";
    } else {
        card2P.className = "bg-slate-900 border-2 border-green-400 rounded-xl p-3 cursor-pointer flex flex-col items-center gap-2 transition-all transform scale-105 shadow-xl w-56 select-none hover:bg-slate-800";
        card1P.className = "bg-slate-950 border-2 border-slate-800 rounded-xl p-3 cursor-pointer flex flex-col items-center gap-2 transition-all shadow-md w-56 select-none hover:bg-slate-900 opacity-70";
    }
    updateHUD();
}

function selectSingleChar(char) {
    singlePlayerChar = char;
    const btnM = document.getElementById('pick-mario-btn');
    const btnL = document.getElementById('pick-luigi-btn');

    if (char === 'mario') {
        btnM.className = "px-2 py-1 bg-red-950 border border-red-500 rounded text-[9px] font-pixel text-red-400 hover:bg-red-900 transition";
        btnL.className = "px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-pixel text-slate-500 hover:bg-green-950 hover:text-green-400 transition";
    } else {
        btnL.className = "px-2 py-1 bg-green-950 border border-green-500 rounded text-[9px] font-pixel text-green-400 hover:bg-green-900 transition";
        btnM.className = "px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[9px] font-pixel text-slate-500 hover:bg-red-950 hover:text-red-400 transition";
    }
}

function startGame() {
    audio.init();
    gameTime = 400;
    cameraX = 0;

    if (gameMode === '1P') {
        player1.character = singlePlayerChar;
        player1.name = singlePlayerChar.toUpperCase();
        player1.shirtColor = singlePlayerChar === 'luigi' ? '#00a800' : '#dc2626';
        player1.overallsColor = singlePlayerChar === 'luigi' ? '#1e3a8a' : '#2563eb';
        player1.reset();
        player2.active = false;
        players = [player1];
    } else {
        player1.character = 'mario';
        player1.name = 'MARIO';
        player1.shirtColor = '#dc2626';
        player1.overallsColor = '#2563eb';
        player1.reset();

        player2.character = 'luigi';
        player2.name = 'LUIGI';
        player2.shirtColor = '#00a800';
        player2.overallsColor = '#1e3a8a';
        player2.reset();
        player2.active = true;
        players = [player1, player2];
    }

    buildWorld1_1();
    updateHUD();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');

    if (timeTimer) clearInterval(timeTimer);
    timeTimer = setInterval(() => {
        if (gameState === 'PLAYING') {
            gameTime--;
            updateHUD();
            if (gameTime <= 0) players.forEach(p => p.die());
        }
    }, 1000);

    gameState = 'PLAYING';
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

function checkGameOverConditions() {
    const activePlayers = players.filter(p => p.active);
    const allDead = activePlayers.every(p => p.isDead);

    if (allDead) {
        setTimeout(() => {
            gameState = 'GAMEOVER';
            document.getElementById('final-score-p1-lose').textContent = String(player1.score).padStart(6, '0');

            const p2LoseBox = document.getElementById('p2-final-score-lose-box');
            if (gameMode === '2P') {
                p2LoseBox.classList.remove('hidden');
                document.getElementById('final-score-p2-lose').textContent = String(player2.score).padStart(6, '0');
            } else {
                p2LoseBox.classList.add('hidden');
            }

            document.getElementById('game-over-screen').classList.remove('hidden');
        }, 1800);
    }
}

function checkVictoryConditions() {
    if (gameState === 'VICTORY') return;
    gameState = 'VICTORY';
    const timeBonus = gameTime * 50;
    player1.score += timeBonus;
    if (gameMode === '2P') player2.score += timeBonus;

    document.getElementById('final-score-p1-win').textContent = player1.score;

    const p2WinBox = document.getElementById('p2-final-score-win-box');
    if (gameMode === '2P') {
        p2WinBox.classList.remove('hidden');
        document.getElementById('final-score-p2-win').textContent = player2.score;
    } else {
        p2WinBox.classList.add('hidden');
    }

    document.getElementById('final-time-win').textContent = timeBonus;
    document.getElementById('victory-screen').classList.remove('hidden');
}

// --- 9. MAIN GAME LOOP & INPUT CONTROLLERS ---
function gameLoop() {
    if (gameState !== 'PLAYING') return;

    // Player Updates
    player1.update(keys.p1_left, keys.p1_right, keys.p1_jump, keys.p1_run);
    if (gameMode === '2P') {
        player2.update(keys.p2_left, keys.p2_right, keys.p2_jump, keys.p2_run);
    }

    updateMushrooms();
    updateParticles();

    // Flagpole Collisions
    players.forEach(p => {
        if (p.active && !p.isDead && !p.flagSliding && !p.castleWalking && p.x >= flagpole.x - 10) {
            p.x = flagpole.x - 12;
            p.flagSliding = true;
            p.vx = 0;
            audio.playFlagSlide();
            p.score += 2000;
        }
    });

    // Camera Tracking (Follows the furthest player ahead)
    const activePlayers = players.filter(p => p.active && !p.isDead);
    if (activePlayers.length > 0) {
        const leadX = Math.max(...activePlayers.map(p => p.x));
        if (leadX - cameraX > 320) {
            cameraX = leadX - 320;
        }
    }

    // Render Pipeline
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground();
    drawTileMap();
    drawCoins();
    drawFlagpoleAndCastle();
    drawMushrooms();
    updateAndDrawEnemies();
    drawParticles();

    player1.draw();
    if (gameMode === '2P') player2.draw();

    animationFrameId = requestAnimationFrame(gameLoop);
}

// Global Keyboard Mapping
window.addEventListener('keydown', (e) => {
    audio.init();

    if (gameState === 'START') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') selectGameMode('1P');
        if (e.code === 'ArrowDown' || e.code === 'KeyS') selectGameMode('2P');
        if (e.code === 'Enter' || e.code === 'Space') { startGame(); return; }
    } else if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
        if (e.code === 'Enter' || e.code === 'KeyR') { startGame(); return; }
    }

    // Player 1 Controls (Mario)
    if (e.code === 'KeyA') keys.p1_left = true;
    if (e.code === 'KeyD') keys.p1_right = true;
    if (e.code === 'Space' || e.code === 'KeyW') keys.p1_jump = true;
    if (e.code === 'KeyS' || e.code === 'ShiftLeft') keys.p1_run = true;

    // Player 2 Controls (Luigi)
    if (e.code === 'ArrowLeft') keys.p2_left = true;
    if (e.code === 'ArrowRight') keys.p2_right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyM') keys.p2_jump = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyN') keys.p2_run = true;
});

window.addEventListener('keyup', (e) => {
    // Player 1 Controls
    if (e.code === 'KeyA') keys.p1_left = false;
    if (e.code === 'KeyD') keys.p1_right = false;
    if (e.code === 'Space' || e.code === 'KeyW') keys.p1_jump = false;
    if (e.code === 'KeyS' || e.code === 'ShiftLeft') keys.p1_run = false;

    // Player 2 Controls
    if (e.code === 'ArrowLeft') keys.p2_left = false;
    if (e.code === 'ArrowRight') keys.p2_right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyM') keys.p2_jump = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyN') keys.p2_run = false;
});

// Touch Control Binding for Mobile (P1)
const bindTouch = (elem, keyName) => {
    elem.addEventListener('touchstart', (e) => { e.preventDefault(); audio.init(); keys[keyName] = true; });
    elem.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
};

bindTouch(document.getElementById('btn-left'), 'p1_left');
bindTouch(document.getElementById('btn-right'), 'p1_right');
bindTouch(document.getElementById('btn-jump'), 'p1_jump');
bindTouch(document.getElementById('btn-run'), 'p1_run');

// UI Event Listeners
document.getElementById('mode-1p-card').addEventListener('click', () => selectGameMode('1P'));
document.getElementById('mode-2p-card').addEventListener('click', () => selectGameMode('2P'));
document.getElementById('pick-mario-btn').addEventListener('click', (e) => { e.stopPropagation(); selectSingleChar('mario'); selectGameMode('1P'); });
document.getElementById('pick-luigi-btn').addEventListener('click', (e) => { e.stopPropagation(); selectSingleChar('luigi'); selectGameMode('1P'); });

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn-lose').addEventListener('click', startGame);
document.getElementById('restart-btn-win').addEventListener('click', startGame);

document.getElementById('sound-btn').addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    document.getElementById('sound-icon').className = audio.enabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark text-slate-500";
});

// Init Title Preview
buildWorld1_1();
selectGameMode('1P');
drawBackground();
drawTileMap();