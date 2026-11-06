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
                } catch(e){}
            }

            playCoin() {
                if (!this.enabled || !this.initialized) return;
                try {
                    const now = Tone.now();
                    this.synth.triggerAttackRelease("B5", "16n", now);
                    this.synth.triggerAttackRelease("E6", "8n", now + 0.06);
                } catch(e){}
            }

            playStomp() {
                if (!this.enabled || !this.initialized) return;
                try {
                    const now = Tone.now();
                    this.synth.triggerAttackRelease("D3", "16n", now);
                    this.synth.frequency.setValueAtTime(200, now);
                    this.synth.frequency.linearRampToValueAtTime(50, now + 0.08);
                } catch(e){}
            }

            playKick() {
                if (!this.enabled || !this.initialized) return;
                try {
                    const now = Tone.now();
                    this.synth.triggerAttackRelease("G4", "16n", now);
                    this.synth.frequency.setValueAtTime(440, now);
                    this.synth.frequency.exponentialRampToValueAtTime(110, now + 0.09);
                } catch(e){}
            }

            playPowerupSpawn() {
                if (!this.enabled || !this.initialized) return;
                try {
                    const now = Tone.now();
                    const notes = ["C4", "E4", "G4", "C5"];
                    notes.forEach((note, idx) => {
                        this.synth.triggerAttackRelease(note, "32n", now + idx * 0.03);
                    });
                } catch(e){}
            }

            playPowerupCollect() {
                if (!this.enabled || !this.initialized) return;
                try {
                    const now = Tone.now();
                    const notes = ["G4", "B4", "D5", "G5", "B5", "E6"];
                    notes.forEach((note, idx) => {
                        this.synth.triggerAttackRelease(note, "16n", now + idx * 0.05);
                    });
                } catch(e){}
            }

            playBreakBrick() {
                if (!this.enabled || !this.initialized) return;
                try {
                    this.noise.triggerAttackRelease("16n", Tone.now());
                } catch(e){}
            }

            playBump() {
                if (!this.enabled || !this.initialized) return;
                try {
                    this.synth.triggerAttackRelease("F2", "16n", Tone.now());
                } catch(e){}
            }

            playHurt() {
                if (!this.enabled || !this.initialized) return;
                try {
                    const now = Tone.now();
                    this.synth.triggerAttackRelease("G3", "16n", now);
                    this.synth.triggerAttackRelease("E3", "16n", now + 0.07);
                    this.synth.triggerAttackRelease("C3", "16n", now + 0.14);
                } catch(e){}
            }

            playFlagSlide() {
                if (!this.enabled || !this.initialized) return;
                try {
                    const now = Tone.now();
                    this.synth.triggerAttackRelease("G4", "4n", now);
                    this.synth.frequency.setValueAtTime(400, now);
                    this.synth.frequency.linearRampToValueAtTime(150, now + 0.4);
                } catch(e){}
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
                        { note: "C6", dur: "8n",  time: 0.4 },
                        { note: "E6", dur: "8n",  time: 0.55 },
                        { note: "G6", dur: "4n",  time: 0.7 }
                    ];
                    melody.forEach(m => {
                        this.synth.triggerAttackRelease(m.note, m.dur, now + m.time);
                    });
                } catch(e){}
            }

            playDeath() {
                if (!this.enabled || !this.initialized) return;
                try {
                    const now = Tone.now();
                    const notes = ["B4", "F5", "F5", "F5", "E5", "D5", "C5"];
                    notes.forEach((note, idx) => {
                        this.synth.triggerAttackRelease(note, "16n", now + idx * 0.1);
                    });
                } catch(e){}
            }
        }

        const audio = new NESAudio();

        // --- 2. GAME CONSTANTS & ENGINE SETUP ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const TILE = 32; // Grid Size 32x32px
        const CANVAS_W = 800;
        const CANVAS_H = 480; // 15 Tiles High (0 to 14)
        const GROUND_Y_TILE = 13; // Ground surface at Tile 13 (Y = 416px)
        const GRAVITY = 0.52;

        let gameState = 'START'; // START, PLAYING, GAMEOVER, VICTORY, FLAG_SLIDE
        let score = 0;
        let coins = 0;
        let lives = 3;
        let gameTime = 400;
        let timeTimer = null;
        let cameraX = 0;
        let animationFrameId = null;

        const keys = { left: false, right: false, jump: false, run: false };

        // --- 3. MARIO PLAYER ENTITY ---
        const mario = {
            x: 80,
            y: (GROUND_Y_TILE * TILE) - 32,
            w: 28,
            h: 32, // Small: 32px, Super: 60px
            vx: 0,
            vy: 0,
            walkSpeed: 3.8,
            runSpeed: 5.6,
            jumpStrength: -12.2,
            grounded: false,
            facing: 'right',
            state: 'small', // 'small' or 'super'
            animFrame: 0,
            animTimer: 0,
            invulnerableTimer: 0,
            growTimer: 0,
            flagSliding: false,
            castleWalking: false,
            isDead: false,

            reset() {
                this.x = 80;
                this.y = (GROUND_Y_TILE * TILE) - 32;
                this.w = 28;
                this.h = 32;
                this.vx = 0;
                this.vy = 0;
                this.grounded = false;
                this.facing = 'right';
                this.state = 'small';
                this.invulnerableTimer = 0;
                this.growTimer = 0;
                this.flagSliding = false;
                this.castleWalking = false;
                this.isDead = false;
                updateHUD();
            },

            growToSuper() {
                if (this.state === 'super') return;
                this.state = 'super';
                this.growTimer = 30; // Growth transition flash
                this.h = 58;
                this.y -= 26;
                audio.playPowerupCollect();
                updateHUD();
            },

            shrinkToSmall() {
                this.state = 'small';
                this.h = 32;
                this.invulnerableTimer = 110; // ~1.8 seconds invincibility
                audio.playHurt();
                updateHUD();
            },

            update() {
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
                    
                    // Enter Castle Doorway (around Col 204)
                    if (this.x >= 204 * TILE + 10) {
                        triggerVictory();
                    }
                    return;
                }

                if (this.growTimer > 0) {
                    this.growTimer--;
                }

                const maxSpd = keys.run ? this.runSpeed : this.walkSpeed;

                // Horizontal Controls
                if (keys.left) {
                    this.vx = -maxSpd;
                    this.facing = 'left';
                } else if (keys.right) {
                    this.vx = maxSpd;
                    this.facing = 'right';
                } else {
                    this.vx *= 0.72;
                    if (Math.abs(this.vx) < 0.1) this.vx = 0;
                }

                // Jump Controls
                if (keys.jump && this.grounded) {
                    this.vy = this.jumpStrength;
                    this.grounded = false;
                    audio.playJump();
                }

                // Apply Gravity
                this.vy += GRAVITY;

                // X-Axis Movement & Tile Collision
                this.x += this.vx;
                checkMarioCollisionX();

                // Lock Mario from moving back past the Camera position (NES SMB rule)
                if (this.x < cameraX) {
                    this.x = cameraX;
                    this.vx = 0;
                }

                // Y-Axis Movement & Tile Collision
                this.y += this.vy;
                this.grounded = false;
                checkMarioCollisionY();

                // Pit Fall Death Check
                if (this.y > CANVAS_H + 50) {
                    marioDie();
                }

                // Invulnerability flicker countdown
                if (this.invulnerableTimer > 0) {
                    this.invulnerableTimer--;
                }

                // Leg Walking Animation
                if (Math.abs(this.vx) > 0.4 && this.grounded) {
                    this.animTimer++;
                    if (this.animTimer % (keys.run ? 4 : 7) === 0) {
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
                ctx.translate(Math.floor(this.x - cameraX), Math.floor(this.y));

                if (this.facing === 'left') {
                    ctx.scale(-1, 1);
                    ctx.translate(-this.w, 0);
                }

                const isSuper = this.state === 'super';
                const currentH = isSuper ? 58 : 32;

                // Growth flashing transition
                if (this.growTimer > 0 && Math.floor(this.growTimer / 3) % 2 === 0) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, this.w, currentH);
                    ctx.restore();
                    return;
                }

                if (isSuper) {
                    // --- SUPER MARIO (Tall Retro Sprite) ---
                    // Red Hat
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(4, 0, 20, 8);
                    ctx.fillRect(10, 2, 14, 4);

                    // Face & Ear
                    ctx.fillStyle = '#fdba74';
                    ctx.fillRect(6, 8, 16, 14);

                    // Mustache & Eye
                    ctx.fillStyle = '#451a03';
                    ctx.fillRect(16, 16, 8, 4);
                    ctx.fillRect(16, 10, 3, 4);

                    // Red Shirt & Arms
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(2, 22, 24, 14);

                    // Blue Overalls & Suspenders
                    ctx.fillStyle = '#2563eb';
                    ctx.fillRect(4, 28, 20, 20);
                    ctx.fillStyle = '#f59e0b'; // Yellow Buttons
                    ctx.fillRect(6, 32, 3, 3);
                    ctx.fillRect(19, 32, 3, 3);

                    // Brown Shoes
                    ctx.fillStyle = '#78350f';
                    if (!this.grounded) {
                        // Jump pose
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
                    // --- SMALL MARIO (Classic Retro Sprite) ---
                    // Red Cap
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(4, 0, 20, 6);
                    ctx.fillRect(10, 0, 14, 4);

                    // Face
                    ctx.fillStyle = '#fdba74';
                    ctx.fillRect(6, 6, 16, 10);

                    // Mustache & Eye
                    ctx.fillStyle = '#451a03';
                    ctx.fillRect(16, 11, 7, 3);
                    ctx.fillRect(16, 7, 2, 3);

                    // Red Shirt
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(2, 16, 24, 6);

                    // Blue Overalls
                    ctx.fillStyle = '#2563eb';
                    ctx.fillRect(4, 18, 20, 10);

                    // Brown Shoes
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
        };

        // --- 4. MAP & WORLD 1-1 LAYOUT GENERATOR ---
        let mapTiles = [];
        let mapWidthCols = 212; // ~6,784px total width
        let coinsList = [];
        let enemies = [];
        let mushrooms = [];
        let particles = [];
        let flagpole = { col: 198, x: 198 * TILE, y: 3 * TILE, w: 10, h: 10 * TILE };

        // Tile Type Key:
        // 0: Empty Sky, 1: Ground, 2: Brick, 3: Question (Coin), 4: Question (Mushroom), 5: Hit Empty Block
        // 6: Pipe Top Left, 7: Pipe Top Right, 8: Pipe Shaft Left, 9: Pipe Shaft Right
        // 10: Stair Solid Block, 11: Hidden Brick (Coin), 12: Hidden Brick (1-Up)

        function buildWorld1_1() {
            mapTiles = Array.from({ length: 15 }, () => new Array(mapWidthCols).fill(0));
            coinsList = [];
            enemies = [];
            mushrooms = [];
            particles = [];

            // 1. Base Ground Segments (Cols 0 to 211, with 3 Pits)
            for (let c = 0; c < mapWidthCols; c++) {
                // Pit 1: Cols 69-70 | Pit 2: Cols 86-88 | Pit 3: Cols 153-154
                if ((c >= 69 && c <= 70) || (c >= 86 && c <= 88) || (c >= 153 && c <= 154)) {
                    continue; // Leave as empty abyss
                }
                mapTiles[13][c] = 1;
                mapTiles[14][c] = 1;
            }

            // Helper to place structures
            const setTile = (r, c, type) => { if (r >= 0 && r < 15 && c >= 0 && c < mapWidthCols) mapTiles[r][c] = type; };

            // Helper to place pipes
            const placePipe = (c, heightTiles) => {
                const topR = 13 - heightTiles;
                setTile(topR, c, 6);
                setTile(topR, c + 1, 7);
                for (let r = topR + 1; r < 13; r++) {
                    setTile(r, c, 8);
                    setTile(r, c + 1, 9);
                }
            };

            // Helper for staircases
            const placeStair = (startC, height, ascending = true) => {
                for (let step = 1; step <= height; step++) {
                    const c = ascending ? (startC + step - 1) : (startC + (height - step));
                    for (let r = 13 - step; r < 13; r++) {
                        setTile(r, c, 10);
                    }
                }
            };

            // 2. QUESTION BLOCKS & BRICK GROUPS (Matching NES World 1-1)
            // Group 1: Cols 16..20 (Height 4) & High ? Block at Col 22 (Height 8)
            setTile(9, 16, 3); // ? Coin
            setTile(9, 17, 2); // Brick
            setTile(9, 18, 4); // ? Mushroom
            setTile(9, 19, 2); // Brick
            setTile(9, 20, 3); // ? Coin
            setTile(5, 22, 3); // High ? Coin

            // Group 2: Cols 77..84 (Height 4 & Height 8)
            setTile(9, 77, 2);
            setTile(9, 78, 4); // ? Mushroom
            setTile(9, 79, 2);
            for (let c = 80; c <= 84; c++) setTile(9, c, 2);
            for (let c = 80; c <= 83; c++) setTile(5, c, 2);
            setTile(5, 84, 3); // ? Coin

            // Hidden 1-Up Block at Col 64 (Height 5)
            setTile(8, 64, 12);

            // Group 3: Canopy Bricks (Cols 100..112)
            for (let c = 100; c <= 107; c++) setTile(9, c, 2);
            setTile(9, 101, 3); // ? Coin
            setTile(9, 106, 11); // Multi-coin brick
            for (let c = 109; c <= 112; c++) setTile(5, c, 2);
            setTile(5, 109, 4); // ? Mushroom

            // Group 4: Cols 118..124
            setTile(9, 118, 2);
            setTile(9, 119, 4); // ? Mushroom
            setTile(9, 120, 2);
            setTile(9, 129, 3); // ? Coin
            setTile(9, 130, 3); // ? Coin

            // Group 5: Cols 168..173
            setTile(9, 168, 2);
            setTile(9, 169, 2);
            setTile(9, 170, 3); // ? Coin
            setTile(9, 171, 2);
            setTile(9, 172, 2);
            setTile(9, 173, 2);

            // 3. PIPES (NES 1-1 Heights & Positions)
            placePipe(28, 2); // Col 28, Height 2
            placePipe(38, 3); // Col 38, Height 3
            placePipe(46, 4); // Col 46, Height 4
            placePipe(57, 4); // Col 57, Height 4
            placePipe(95, 2); // Col 95, Height 2
            placePipe(163, 2); // Col 163, Height 2

            // 4. STAIRCASES
            placeStair(134, 4, true);  // Stair 1A: Cols 134-137 Ascending
            placeStair(140, 4, false); // Stair 1B: Cols 140-143 Descending

            placeStair(148, 4, true);  // Stair 2A: Cols 148-151 Ascending
            setTile(12, 152, 10); setTile(11, 152, 10); setTile(10, 152, 10); setTile(9, 152, 10);
            setTile(12, 155, 10);      // Landing step over Pit 3

            placeStair(181, 8, true);  // Mega Staircase: Cols 181-188 (1 to 8 steps high!)

            // Castle Base Step at Col 197
            setTile(12, 197, 10);

            // 5. FLOATING COINS
            const coinCoords = [
                [20, 8], [22, 4], [30, 9], [40, 9],
                [80, 4], [82, 4], [102, 8], [105, 8],
                [120, 8], [122, 8], [170, 8]
            ];
            coinCoords.forEach(([c, r]) => {
                coinsList.push({ x: c * TILE + 8, y: r * TILE + 4, w: 16, h: 22, collected: false });
            });

            // 6. ENEMIES (Goombas & Koopa Troopas)
            const enemySpawns = [
                { type: 'goomba', col: 22 },
                { type: 'goomba', col: 34 },
                { type: 'goomba', col: 40 },
                { type: 'goomba', col: 42 },
                { type: 'goomba', col: 50 },
                { type: 'goomba', col: 52 },
                { type: 'goomba', col: 80 },
                { type: 'goomba', col: 82 },
                { type: 'goomba', col: 97 },
                { type: 'koopa',  col: 107 },
                { type: 'goomba', col: 114 },
                { type: 'goomba', col: 116 },
                { type: 'goomba', col: 125 },
                { type: 'goomba', col: 127 },
                { type: 'goomba', col: 174 },
                { type: 'goomba', col: 176 }
            ];

            enemySpawns.forEach(e => {
                if (e.type === 'goomba') {
                    enemies.push({
                        type: 'goomba',
                        x: e.col * TILE,
                        y: (GROUND_Y_TILE * TILE) - 28,
                        w: 28,
                        h: 28,
                        vx: -1.2,
                        vy: 0,
                        grounded: true,
                        alive: true,
                        squishTimer: 0
                    });
                } else if (e.type === 'koopa') {
                    enemies.push({
                        type: 'koopa',
                        x: e.col * TILE,
                        y: (GROUND_Y_TILE * TILE) - 40,
                        w: 28,
                        h: 40,
                        vx: -1.0,
                        vy: 0,
                        grounded: true,
                        alive: true,
                        state: 'walk'
                    });
                }
            });
        }

        // --- 5. TILEMAP & BACKGROUND RENDERER ---

        function drawBackground() {
            const drawCamX = Math.floor(cameraX);
            ctx.fillStyle = '#5c94fc'; // NES Mario Blue
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            // Retro Pixel Clouds (Single, Double, Triple)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            const clouds = [
                { col: 8, r: 3, w: 2 }, { col: 19, r: 2, w: 3 }, { col: 36, r: 3, w: 1 },
                { col: 56, r: 2, w: 2 }, { col: 74, r: 3, w: 3 }, { col: 104, r: 2, w: 2 },
                { col: 130, r: 3, w: 1 }, { col: 160, r: 2, w: 3 }, { col: 190, r: 3, w: 2 }
            ];

            clouds.forEach(cl => {
                let x = Math.floor(cl.col * TILE - drawCamX * 0.4); // Parallax
                let y = cl.r * TILE;
                if (x + 120 < 0 || x > CANVAS_W + 100) return;

                ctx.beginPath();
                ctx.arc(x + 20, y + 20, 18, 0, Math.PI * 2);
                ctx.arc(x + 40, y + 10, 24, 0, Math.PI * 2);
                ctx.arc(x + 60, y + 20, 18, 0, Math.PI * 2);
                if (cl.w >= 2) ctx.arc(x + 80, y + 10, 22, 0, Math.PI * 2);
                if (cl.w >= 3) ctx.arc(x + 100, y + 20, 18, 0, Math.PI * 2);
                ctx.fill();
            });

            // Green Bushes
            ctx.fillStyle = '#00a800';
            const bushes = [
                { col: 11, w: 3 }, { col: 23, w: 1 }, { col: 41, w: 2 },
                { col: 59, w: 3 }, { col: 89, w: 2 }, { col: 117, w: 1 },
                { col: 137, w: 3 }, { col: 167, w: 2 }
            ];

            bushes.forEach(b => {
                let x = Math.floor(b.col * TILE - drawCamX);
                let y = (GROUND_Y_TILE * TILE) - 20;
                if (x + 100 < 0 || x > CANVAS_W) return;

                ctx.beginPath();
                ctx.arc(x + 15, y, 16, 0, Math.PI * 2);
                ctx.arc(x + 35, y - 8, 22, 0, Math.PI * 2);
                ctx.arc(x + 55, y, 16, 0, Math.PI * 2);
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
                    if (tile === 0 || tile === 11 || tile === 12) continue; // Skip empty & hidden

                    const x = Math.floor(c * TILE - drawCamX);
                    const y = Math.floor(r * TILE);

                    ctx.save();
                    ctx.translate(x, y);

                    if (tile === 1) {
                        // --- GROUND TILE ---
                        ctx.fillStyle = '#d97706'; // Terracotta NES Ground
                        ctx.fillRect(0, 0, TILE, TILE);
                        ctx.fillStyle = '#451a03';
                        ctx.fillRect(0, 0, TILE, 4);
                        ctx.fillRect(0, 14, TILE, 4);
                        ctx.fillRect(14, 0, 4, TILE);
                    } else if (tile === 2) {
                        // --- BRICK TILE ---
                        ctx.fillStyle = '#b45309';
                        ctx.fillRect(0, 0, TILE, TILE);
                        ctx.strokeStyle = '#451a03';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(0, 0, TILE, TILE);
                        ctx.beginPath();
                        ctx.moveTo(0, 16); ctx.lineTo(TILE, 16);
                        ctx.moveTo(16, 0); ctx.lineTo(16, 16);
                        ctx.moveTo(8, 16); ctx.lineTo(8, 32);
                        ctx.stroke();
                    } else if (tile === 3 || tile === 4) {
                        // --- QUESTION BLOCK ---
                        ctx.fillStyle = '#f59e0b';
                        ctx.fillRect(0, 0, TILE, TILE);
                        ctx.strokeStyle = '#78350f';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(0, 0, TILE, TILE);
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 18px "Press Start 2P", sans-serif';
                        ctx.fillText('?', 8, 24);
                    } else if (tile === 5) {
                        // --- HIT EMPTY BLOCK ---
                        ctx.fillStyle = '#78716c';
                        ctx.fillRect(0, 0, TILE, TILE);
                        ctx.strokeStyle = '#292524';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(0, 0, TILE, TILE);
                    } else if (tile === 6) {
                        // --- WARP PIPE TOP LEFT (Cap Overhang) ---
                        ctx.fillStyle = '#00a800';
                        ctx.fillRect(-2, 0, TILE + 2, TILE);
                        // Highlight Bar
                        ctx.fillStyle = '#b8f818';
                        ctx.fillRect(4, 0, 6, TILE - 2);
                        // Top Rim Outline & Shading
                        ctx.fillStyle = '#003800';
                        ctx.fillRect(-2, 0, TILE + 2, 3); // Top border
                        ctx.fillRect(-2, 0, 3, TILE);     // Left cap border
                        ctx.fillRect(-2, TILE - 3, TILE + 2, 3); // Bottom cap lip line
                    } else if (tile === 7) {
                        // --- WARP PIPE TOP RIGHT (Cap Overhang) ---
                        ctx.fillStyle = '#00a800';
                        ctx.fillRect(0, 0, TILE + 2, TILE);
                        // Dark Shadow Right Side
                        ctx.fillStyle = '#005000';
                        ctx.fillRect(TILE - 10, 0, 10, TILE);
                        // Top Rim Outline & Right Edge
                        ctx.fillStyle = '#003800';
                        ctx.fillRect(0, 0, TILE + 2, 3);
                        ctx.fillRect(TILE - 1, 0, 3, TILE);
                        ctx.fillRect(0, TILE - 3, TILE + 2, 3);
                    } else if (tile === 8) {
                        // --- WARP PIPE SHAFT LEFT ---
                        ctx.fillStyle = '#00a800';
                        ctx.fillRect(0, 0, TILE, TILE);
                        // Continuous Highlight Bar
                        ctx.fillStyle = '#b8f818';
                        ctx.fillRect(6, 0, 6, TILE);
                        // Outer Left Border
                        ctx.fillStyle = '#003800';
                        ctx.fillRect(0, 0, 3, TILE);
                    } else if (tile === 9) {
                        // --- WARP PIPE SHAFT RIGHT ---
                        ctx.fillStyle = '#00a800';
                        ctx.fillRect(0, 0, TILE, TILE);
                        // Continuous Inner Shadow Bar
                        ctx.fillStyle = '#005000';
                        ctx.fillRect(TILE - 12, 0, 10, TILE);
                        // Outer Right Border
                        ctx.fillStyle = '#003800';
                        ctx.fillRect(TILE - 3, 0, 3, TILE);
                    } else if (tile === 10) {
                        // --- STAIRCASE SOLID BLOCK ---
                        ctx.fillStyle = '#ea580c';
                        ctx.fillRect(0, 0, TILE, TILE);
                        ctx.strokeStyle = '#7c2d12';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(0, 0, TILE, TILE);
                    }

                    ctx.restore();
                }
            }
        }

        function drawFlagpoleAndCastle() {
            const drawCamX = Math.floor(cameraX);
            // Flagpole at Col 198 (X = 6336px)
            const flagX = Math.floor(198 * TILE - drawCamX);
            if (flagX > -50 && flagX < CANVAS_W + 50) {
                ctx.save();
                ctx.translate(flagX, 3 * TILE);

                // Green Pole
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(12, 0, 8, 10 * TILE);

                // Golden Orb Top
                ctx.fillStyle = '#eab308';
                ctx.beginPath();
                ctx.arc(16, -6, 12, 0, Math.PI * 2);
                ctx.fill();

                // Flag Banner (Sliding down if triggered)
                let flagYOffset = mario.flagSliding ? Math.min((mario.y - 3 * TILE), 9 * TILE) : 0;
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.moveTo(12, flagYOffset + 10);
                ctx.lineTo(-40, flagYOffset + 25);
                ctx.lineTo(12, flagYOffset + 40);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }

            // Brick Castle at Cols 202..207
            const castleX = Math.floor(202 * TILE - drawCamX);
            if (castleX > -200 && castleX < CANVAS_W + 200) {
                ctx.save();
                ctx.translate(castleX, 8 * TILE);

                // Main Castle Bricks (5x5 tiles)
                ctx.fillStyle = '#b45309';
                ctx.fillRect(0, 0, 5 * TILE, 5 * TILE);

                // Battlements (Top crenellations)
                for (let i = 0; i < 5; i += 2) {
                    ctx.fillRect(i * TILE, -16, TILE, 16);
                }

                // Dark Doorway Center
                ctx.fillStyle = '#000000';
                ctx.fillRect(2 * TILE - 4, 3 * TILE, 36, 2 * TILE);
                ctx.beginPath();
                ctx.arc(2 * TILE + 14, 3 * TILE, 18, Math.PI, 0);
                ctx.fill();

                // Castle Flag Top
                ctx.fillStyle = '#16a34a';
                ctx.fillRect(2.5 * TILE - 2, -40, 4, 24);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(2.5 * TILE + 2, -40, 20, 12);

                ctx.restore();
            }
        }

        // --- 6. PHYSICS COLLISION DETECTION ---

        function checkMarioCollisionX() {
            const startC = Math.floor(mario.x / TILE);
            const endC = Math.floor((mario.x + mario.w - 1) / TILE);
            const startR = Math.floor(mario.y / TILE);
            const endR = Math.floor((mario.y + mario.h - 1) / TILE);

            for (let r = startR; r <= endR; r++) {
                for (let c = startC; c <= endC; c++) {
                    if (r >= 0 && r < 15 && c >= 0 && c < mapWidthCols) {
                        const tile = mapTiles[r][c];
                        if (tile !== 0 && tile !== 11 && tile !== 12) {
                            if (mario.vx > 0) {
                                mario.x = c * TILE - mario.w;
                            } else if (mario.vx < 0) {
                                mario.x = (c + 1) * TILE;
                            }
                            mario.vx = 0;
                            return;
                        }
                    }
                }
            }
        }

        function checkMarioCollisionY() {
            // Inset horizontal probes slightly to prevent getting snagged on vertical wall seams when jumping
            const insetLeftC = Math.floor((mario.x + 4) / TILE);
            const insetRightC = Math.floor((mario.x + mario.w - 4) / TILE);
            const topR = Math.floor(mario.y / TILE);
            const bottomR = Math.floor((mario.y + mario.h) / TILE);

            if (mario.vy >= 0) {
                // Falling Downwards: probe beneath feet
                for (let c = insetLeftC; c <= insetRightC; c++) {
                    if (bottomR >= 0 && bottomR < 15 && c >= 0 && c < mapWidthCols) {
                        const tile = mapTiles[bottomR][c];
                        if (tile !== 0 && tile !== 11 && tile !== 12) {
                            mario.y = bottomR * TILE - mario.h;
                            mario.vy = 0;
                            mario.grounded = true;
                            return;
                        }
                    }
                }
            } else if (mario.vy < 0) {
                // Jumping Upwards: probe above head
                for (let c = insetLeftC; c <= insetRightC; c++) {
                    if (topR >= 0 && topR < 15 && c >= 0 && c < mapWidthCols) {
                        const tile = mapTiles[topR][c];
                        if (tile !== 0 && tile !== 11 && tile !== 12) {
                            mario.y = (topR + 1) * TILE;
                            mario.vy = 0;
                            handleBlockHit(topR, c, tile);
                            return;
                        }
                    }
                }
            }
        }

        function checkMarioCollisionY() {
            const startC = Math.floor(mario.x / TILE);
            const endC = Math.floor((mario.x + mario.w) / TILE);
            const startR = Math.floor(mario.y / TILE);
            const endR = Math.floor((mario.y + mario.h) / TILE);

            for (let r = startR; r <= endR; r++) {
                for (let c = startC; c <= endC; c++) {
                    if (r >= 0 && r < 15 && c >= 0 && c < mapWidthCols) {
                        const tile = mapTiles[r][c];

                        if (tile !== 0 && tile !== 11 && tile !== 12) {
                            if (mario.vy > 0) {
                                // Landing on Top
                                mario.y = r * TILE - mario.h;
                                mario.vy = 0;
                                mario.grounded = true;
                            } else if (mario.vy < 0) {
                                // Hitting Block from Below
                                mario.y = (r + 1) * TILE;
                                mario.vy = 0;
                                handleBlockHit(r, c, tile);
                            }
                        }
                    }
                }
            }
        }

        function handleBlockHit(r, c, tile) {
            if (tile === 3) {
                // ? Block with Coin
                mapTiles[r][c] = 5; // Turn to empty hit block
                audio.playCoin();
                spawnCoinParticle(c * TILE + 8, (r - 1) * TILE);
                addScore(200);
                addCoin();
            } else if (tile === 4) {
                // ? Block with Super Mushroom
                mapTiles[r][c] = 5;
                audio.playPowerupSpawn();
                mushrooms.push({
                    x: c * TILE + 2,
                    y: (r - 1) * TILE,
                    w: 28,
                    h: 28,
                    vx: 1.8,
                    vy: -2,
                    grounded: false
                });
            } else if (tile === 2) {
                // Regular Brick Block
                if (mario.state === 'super') {
                    // Super Mario breaks bricks!
                    mapTiles[r][c] = 0;
                    audio.playBreakBrick();
                    spawnDebris(c * TILE + 16, r * TILE + 16);
                    addScore(50);
                } else {
                    // Small Mario bumps block
                    audio.playBump();
                }
            } else if (tile === 11) {
                // Hidden Coin Brick
                mapTiles[r][c] = 5;
                audio.playCoin();
                spawnCoinParticle(c * TILE + 8, (r - 1) * TILE);
                addScore(200);
                addCoin();
            } else if (tile === 12) {
                // Hidden 1-Up Mushroom Brick
                mapTiles[r][c] = 5;
                audio.playPowerupSpawn();
                mushrooms.push({
                    x: c * TILE + 2,
                    y: (r - 1) * TILE,
                    w: 28,
                    h: 28,
                    vx: 1.8,
                    vy: -2,
                    grounded: false
                });
            }
        }

        // --- 7. POWER-UPS & ENEMY AI SYSTEM ---

        function updateMushrooms() {
            for (let i = mushrooms.length - 1; i >= 0; i--) {
                let m = mushrooms[i];

                m.vy += GRAVITY;
                m.x += m.vx;

                // X Collision with blocks/pipes
                const startC = Math.floor(m.x / TILE);
                const endC = Math.floor((m.x + m.w) / TILE);
                const r = Math.floor(m.y / TILE);

                if (mapTiles[r] && (mapTiles[r][startC] > 0 || mapTiles[r][endC] > 0)) {
                    m.vx = -m.vx;
                }

                m.y += m.vy;
                const bottomR = Math.floor((m.y + m.h) / TILE);
                if (mapTiles[bottomR] && (mapTiles[bottomR][startC] > 0 || mapTiles[bottomR][endC] > 0)) {
                    m.y = bottomR * TILE - m.h;
                    m.vy = 0;
                }

                // Player Pick Up
                if (isColliding(mario, m)) {
                    mario.growToSuper();
                    addScore(1000);
                    mushrooms.splice(i, 1);
                }
            }
        }

        function drawMushrooms() {
            mushrooms.forEach(m => {
                const x = m.x - cameraX;
                if (x < -30 || x > CANVAS_W + 30) return;

                ctx.save();
                ctx.translate(x, m.y);

                // Red Cap with White Dots
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(14, 14, 14, Math.PI, 0);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(14, 6, 4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(6, 12, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(22, 12, 3, 0, Math.PI * 2); ctx.fill();

                // Cream Stem
                ctx.fillStyle = '#fef3c7';
                ctx.fillRect(6, 14, 16, 14);

                ctx.restore();
            });
        }

        function updateAndDrawEnemies() {
            enemies.forEach(e => {
                if (!e.alive) {
                    if (e.squishTimer > 0) {
                        e.squishTimer--;
                        // Squished Goomba Rendering
                        ctx.save();
                        ctx.translate(e.x - cameraX, e.y + 18);
                        ctx.fillStyle = '#78350f';
                        ctx.fillRect(0, 0, e.w, 10);
                        ctx.restore();
                    }
                    return;
                }

                // Apply Gravity
                e.vy += GRAVITY;

                // --- SMART PATROL AI (CHECK FOR CLIFFS BEFORE STEPPING) ---
                if (e.grounded && (e.type === 'goomba' || e.state === 'walk')) {
                    let nextX = e.vx > 0 ? e.x + e.w + 4 : e.x - 4;
                    let groundTileR = Math.floor((e.y + e.h + 2) / TILE);
                    let groundTileC = Math.floor(nextX / TILE);

                    // Check if ground tile in front is empty abyss
                    if (groundTileR < 15 && groundTileC >= 0 && groundTileC < mapWidthCols) {
                        let tileBelow = mapTiles[groundTileR][groundTileC];
                        if (tileBelow === 0) {
                            e.vx = -e.vx; // Reverse walking direction at cliff edge!
                        }
                    }
                }

                // X-Axis Movement & Wall Collision
                if (e.state !== 'shell') {
                    e.x += e.vx;

                    const c = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TILE);
                    const r = Math.floor(e.y / TILE);
                    if (mapTiles[r] && mapTiles[r][c] > 0) {
                        e.vx = -e.vx;
                        if (e.state === 'moving_shell') audio.playBump();
                    }
                }

                // Y-Axis Movement & Landing Collision
                e.y += e.vy;
                e.grounded = false;

                const bottomR = Math.floor((e.y + e.h) / TILE);
                const centerC = Math.floor((e.x + e.w / 2) / TILE);
                if (mapTiles[bottomR] && mapTiles[bottomR][centerC] > 0) {
                    e.y = bottomR * TILE - e.h;
                    e.vy = 0;
                    e.grounded = true;
                }

                // Despawn if fallen in pit
                if (e.y > CANVAS_H + 50) {
                    e.alive = false;
                    return;
                }

                // Moving Shell wipes out other enemies
                if (e.state === 'moving_shell') {
                    enemies.forEach(other => {
                        if (other !== e && other.alive && isColliding(e, other)) {
                            other.alive = false;
                            audio.playKick();
                            addScore(500);
                            spawnDebris(other.x + 14, other.y + 14);
                        }
                    });
                }

                // --- DRAWING & PLAYER COLLISION ---
                const drawX = e.x - cameraX;
                if (drawX < -40 || drawX > CANVAS_W + 40) return;

                if (e.type === 'goomba') {
                    // Goomba Graphic
                    ctx.save();
                    ctx.translate(drawX, e.y);
                    ctx.fillStyle = '#92400e';
                    ctx.beginPath();
                    ctx.arc(14, 12, 14, Math.PI, 0);
                    ctx.fillRect(0, 12, 28, 10);
                    ctx.fill();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(4, 8, 6, 8); ctx.fillRect(18, 8, 6, 8);
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(8, 10, 2, 4); ctx.fillRect(18, 10, 2, 4);
                    ctx.restore();

                    // Collision with Mario
                    if (isColliding(mario, e) && !mario.isDead) {
                        if (mario.vy > 0 && mario.y + mario.h - mario.vy <= e.y + 12) {
                            e.alive = false;
                            e.squishTimer = 25;
                            mario.vy = -8;
                            audio.playStomp();
                            addScore(100);
                        } else {
                            marioHurt();
                        }
                    }
                } else if (e.type === 'koopa') {
                    // Koopa Troopa Graphic
                    ctx.save();
                    ctx.translate(drawX, e.y);

                    if (e.state === 'walk') {
                        // Shell & Head
                        ctx.fillStyle = '#22c55e';
                        ctx.beginPath(); ctx.ellipse(14, 22, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#fef08a';
                        ctx.beginPath(); ctx.arc(20, 10, 8, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(22, 7, 3, 4);
                    } else {
                        // Shell Form
                        ctx.fillStyle = '#22c55e';
                        ctx.beginPath(); ctx.arc(14, 12, 13, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = '#15803d'; ctx.lineWidth = 3; ctx.stroke();
                    }
                    ctx.restore();

                    // Collision with Mario
                    if (isColliding(mario, e) && !mario.isDead) {
                        const isStomping = mario.vy > 0 && (mario.y + mario.h - mario.vy <= e.y + 14);

                        if (e.state === 'walk') {
                            if (isStomping) {
                                e.state = 'shell';
                                e.h = 24;
                                e.y += 16;
                                e.vx = 0;
                                mario.vy = -8;
                                audio.playStomp();
                                addScore(200);
                            } else {
                                marioHurt();
                            }
                        } else if (e.state === 'shell') {
                            e.state = 'moving_shell';
                            e.vx = mario.x < e.x ? 6.8 : -6.8;
                            mario.vy = -8;
                            audio.playKick();
                            addScore(400);
                        } else if (e.state === 'moving_shell') {
                            if (isStomping) {
                                e.state = 'shell';
                                e.vx = 0;
                                mario.vy = -8;
                                audio.playStomp();
                            } else {
                                marioHurt();
                            }
                        }
                    }
                }
            });
        }

        // --- 8. PARTICLES, HUD & GAME MANAGEMENT ---

        function marioHurt() {
            if (mario.invulnerableTimer > 0 || mario.growTimer > 0 || mario.isDead) return;

            if (mario.state === 'super') {
                mario.shrinkToSmall();
            } else {
                marioDie();
            }
        }

        function marioDie() {
            if (mario.isDead) return;
            mario.isDead = true;
            mario.vy = -12;
            audio.playDeath();
            lives--;
            updateHUD();

            setTimeout(() => {
                if (lives <= 0) {
                    triggerGameOver();
                } else {
                    mario.reset();
                    cameraX = 0;
                    buildWorld1_1();
                }
            }, 2600);
        }

        function isColliding(a, b) {
            return a.x < b.x + b.w &&
                   a.x + a.w > b.x &&
                   a.y < b.y + b.h &&
                   a.y + a.h > b.y;
        }

        function spawnCoinParticle(x, y) {
            particles.push({ x: x, y: y, vy: -6, life: 25, type: 'coin' });
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
                    ctx.fillStyle = '#fbbf24';
                    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
                } else if (p.type === 'brick') {
                    ctx.fillStyle = '#b45309';
                    ctx.fillRect(-4, -4, 8, 8);
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

                if (isColliding(mario, c)) {
                    c.collected = true;
                    addScore(200);
                    addCoin();
                }
            });
        }

        function addScore(pts) {
            score += pts;
            updateHUD();
        }

        function addCoin() {
            coins++;
            if (coins >= 100) {
                coins = 0;
                lives++;
            }
            updateHUD();
        }

        function updateHUD() {
            document.getElementById('hud-score').textContent = String(score).padStart(6, '0');
            document.getElementById('hud-coins').textContent = String(coins).padStart(2, '0');
            document.getElementById('hud-lives').textContent = 'x' + lives;
            document.getElementById('hud-time').textContent = String(gameTime).padStart(3, '0');
            document.getElementById('hud-name').textContent = mario.state === 'super' ? 'SUPER MARIO' : 'MARIO';
        }

        // --- 9. MAIN GAME LOOP & INPUT LISTENERS ---

        function startGame() {
            audio.init();
            score = 0;
            coins = 0;
            lives = 3;
            gameTime = 400;
            cameraX = 0; // Reset camera offset so Mario starts cleanly at column 0

            mario.reset();
            buildWorld1_1();

            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('victory-screen').classList.add('hidden');

            if (timeTimer) clearInterval(timeTimer);
            timeTimer = setInterval(() => {
                if (gameState === 'PLAYING' && !mario.isDead) {
                    gameTime--;
                    updateHUD();
                    if (gameTime <= 0) marioDie();
                }
            }, 1000);

            gameState = 'PLAYING';
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            gameLoop();
        }

        function triggerGameOver() {
            gameState = 'GAMEOVER';
            document.getElementById('final-score-lose').textContent = String(score).padStart(6, '0');
            document.getElementById('game-over-screen').classList.remove('hidden');
        }

        function triggerVictory() {
            gameState = 'VICTORY';
            const timeBonus = gameTime * 50;
            score += timeBonus;
            updateHUD();

            document.getElementById('final-score-win').textContent = score;
            document.getElementById('final-coins-win').textContent = coins;
            document.getElementById('final-time-win').textContent = timeBonus;
            document.getElementById('victory-screen').classList.remove('hidden');
        }

        function gameLoop() {
            if (gameState !== 'PLAYING') return;

            // Updates
            mario.update();
            updateMushrooms();
            updateParticles();

            // Check Flagpole Trigger (Col 198, X = 6336px)
            if (!mario.flagSliding && !mario.castleWalking && mario.x >= flagpole.x - 10) {
                mario.x = flagpole.x - 12;
                mario.flagSliding = true;
                mario.vx = 0;
                audio.playFlagSlide();
                addScore(2000);
            }

            // NES Strict Forward-Only Camera Movement
            if (mario.x - cameraX > 320) {
                cameraX = mario.x - 320;
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
            mario.draw();

            animationFrameId = requestAnimationFrame(gameLoop);
        }

        // Keyboard Controllers
        window.addEventListener('keydown', (e) => {
            audio.init();
            
            // Allow restarting using Enter or R key when on modal screens
            if (gameState === 'START' || gameState === 'GAMEOVER' || gameState === 'VICTORY') {
                if (e.code === 'Enter' || e.code === 'KeyR') {
                    startGame();
                    return;
                }
            }

            if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
            if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'KeyZ' || e.code === 'ArrowUp') {
                if (!keys.jump) keys.jump = true;
            }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') keys.run = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
            if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
            if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'KeyZ' || e.code === 'ArrowUp') keys.jump = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') keys.run = false;
        });

        // Touch Control Binding
        const bindTouch = (elem, keyName) => {
            elem.addEventListener('touchstart', (e) => { e.preventDefault(); audio.init(); keys[keyName] = true; });
            elem.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
        };

        bindTouch(document.getElementById('btn-left'), 'left');
        bindTouch(document.getElementById('btn-right'), 'right');
        bindTouch(document.getElementById('btn-jump'), 'jump');
        bindTouch(document.getElementById('btn-run'), 'run');

        // Buttons
        document.getElementById('start-btn').addEventListener('click', startGame);
        document.getElementById('restart-btn-lose').addEventListener('click', startGame);
        document.getElementById('restart-btn-win').addEventListener('click', startGame);

        document.getElementById('sound-btn').addEventListener('click', () => {
            audio.enabled = !audio.enabled;
            document.getElementById('sound-icon').className = audio.enabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark text-slate-500";
        });

        // Initial setup
        buildWorld1_1();
        drawBackground();
        drawTileMap();