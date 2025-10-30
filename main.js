/************************
***** DECLARATIONS: *****
************************/
let cvs         //  canvas
let ctx         //  context'2d'
let description //  game description
let theme1      //  original theme
let theme2      //  original them v2
let bg          //  background
let bird        //  bird: yellow
let bird1       //  bird: red
let bird2       //  bird: blue
let pipes       //  top and bottom pipes
let ground      //  ground floor
let getReady    //  get ready screen
let gameOver    //  game over screen
let map         //  map of number images
let score       //  score counter
let gameState   //  state of game
let frame       //  ms/frame = 17; dx/frame = 2; fps = 59;
let degree      //  bird rotation degree
const SFX_SCORE = new Audio()         //  sound for scoring
const SFX_FLAP = new Audio()          //  sound for flying bird
const SFX_COLLISION = new Audio()     //  sound for collision
const SFX_LAWDA = new Audio()         // modi
const SFX_FALL = new Audio()          //  sound for falling to the ground
const SFX_SWOOSH = new Audio()        //  sound for changing game state

cvs = document.getElementById('game')
ctx = cvs.getContext('2d')
description = document.getElementById('description')
theme1 = new Image()
theme1.src = 'img/og-theme.png'
theme2 = new Image()
theme2.src = 'img/og-theme-2.png'
// Optional: load a custom bird image. If the file `img/custom-bird.png` exists
// it will be used in place of the bird frames from the sprite sheet.
const CUSTOM_BIRD_IMG = new Image()
let USE_CUSTOM_BIRD = false
let CUSTOM_BIRD_TRIED_ALTERNATE = false
// Set this to scale the custom bird relative to the game's bird size.
// 1 = same size, 2 = twice as large, etc. Change to taste.
const CUSTOM_BIRD_SCALE = 2
// Set to true to mirror (flip horizontally) the custom bird image.
const CUSTOM_BIRD_MIRROR = true
CUSTOM_BIRD_IMG.onload = () => {
    USE_CUSTOM_BIRD = true
    console.log('Custom bird loaded:', CUSTOM_BIRD_IMG.src)
}
CUSTOM_BIRD_IMG.onerror = () => {
    // attempt alternate common filename (underscore vs dash)
    if (!CUSTOM_BIRD_TRIED_ALTERNATE) {
        CUSTOM_BIRD_TRIED_ALTERNATE = true
        CUSTOM_BIRD_IMG.src = 'img/custom_bird.png'
        console.log('Custom bird not found at img/custom-bird.png, trying img/custom_bird.png')
        return
    }
    USE_CUSTOM_BIRD = false
    console.warn('No custom bird found at img/custom-bird.png or img/custom_bird.png — using spritesheet')
}
// primary name we try
CUSTOM_BIRD_IMG.src = 'img/custom-bird.png'

// Optional: load a custom pipe image. Tries dash and underscore variants.
const CUSTOM_PIPE_IMG = new Image()
let USE_CUSTOM_PIPE = false
let CUSTOM_PIPE_TRIED_ALTERNATE = false
// trimmed bounds of opaque pixels in the custom pipe image
let CUSTOM_PIPE_TRIM = null
// debug flag: log pipe sizing once to help diagnose squashing
let CUSTOM_PIPE_DEBUG_LOGGED = false
CUSTOM_PIPE_IMG.onload = () => {
    USE_CUSTOM_PIPE = true
    // compute trimmed (non-transparent) bounds so we can draw only the
    // visible portion and preserve aspect ratio (prevents horizontal
    // squashing of the subject when scaled into the pipe box)
    try {
        // create an offscreen canvas and examine alpha channel
        const oc = document.createElement('canvas')
        oc.width = CUSTOM_PIPE_IMG.naturalWidth || CUSTOM_PIPE_IMG.width
        oc.height = CUSTOM_PIPE_IMG.naturalHeight || CUSTOM_PIPE_IMG.height
        const ocCtx = oc.getContext('2d')
        ocCtx.drawImage(CUSTOM_PIPE_IMG, 0, 0)
        const imgData = ocCtx.getImageData(0, 0, oc.width, oc.height).data
        let minX = oc.width, minY = oc.height, maxX = 0, maxY = 0, found = false
        for (let y = 0; y < oc.height; y++) {
            for (let x = 0; x < oc.width; x++) {
                const a = imgData[(y * oc.width + x) * 4 + 3]
                if (a > 10) { // threshold to ignore near-transparent pixels
                    found = true
                    if (x < minX) minX = x
                    if (y < minY) minY = y
                    if (x > maxX) maxX = x
                    if (y > maxY) maxY = y
                }
            }
        }
        if (found) {
            CUSTOM_PIPE_TRIM = {
                sx: minX,
                sy: minY,
                sw: maxX - minX + 1,
                sh: maxY - minY + 1,
                iw: oc.width,
                ih: oc.height
            }
            console.log('Custom pipe trim computed:', CUSTOM_PIPE_TRIM)
        } else {
            CUSTOM_PIPE_TRIM = null
            console.warn('Custom pipe image appears fully transparent')
        }
    } catch (err) {
        CUSTOM_PIPE_TRIM = null
        console.warn('Failed to compute custom pipe trim:', err)
    }
    console.log('Custom pipe loaded:', CUSTOM_PIPE_IMG.src)
}
CUSTOM_PIPE_IMG.onerror = () => {
    if (!CUSTOM_PIPE_TRIED_ALTERNATE) {
        CUSTOM_PIPE_TRIED_ALTERNATE = true
        CUSTOM_PIPE_IMG.src = 'img/custom_pipe.png'
        console.log('Custom pipe not found at img/custom-pipe.png, trying img/custom_pipe.png')
        return
    }
    USE_CUSTOM_PIPE = false
    console.warn('No custom pipe found at img/custom-pipe.png or img/custom_pipe.png — using spritesheet')
}
CUSTOM_PIPE_IMG.src = 'img/custom-pipe.png'
frame = 0;
degree = Math.PI/180
SFX_SCORE.src = 'audio/sfx_point.wav'
SFX_FLAP.src = 'audio/sfx_wing.wav'
SFX_COLLISION.src = 'audio/sfx_hit.wav'
SFX_LAWDA.src = 'audio/lawda.wav'
SFX_FALL.src = 'audio/sfx_die.wav'
SFX_SWOOSH.src = 'audio/sfx_swooshing.wav'

// Background music (mumkin.wav) - play on page load if allowed,
// otherwise start on the first user interaction (click/space).
const BG_MUSIC = new Audio('audio/mumkin.wav')
BG_MUSIC.loop = true
BG_MUSIC.volume = 0.6 // 0.0 - 1.0
try { BG_MUSIC.preload = 'auto' } catch (e) {}
let bgMusicStarted = false

function tryStartBgMusic() {
    if (bgMusicStarted) return
    try {
        const p = BG_MUSIC.play()
        if (p && typeof p.then === 'function') {
            p.then(() => { bgMusicStarted = true })
             .catch(err => console.warn('Background music play rejected (will wait for user gesture)', err))
        }
    } catch (err) {
        console.warn('Background music play error:', err)
    }
}

// Try to start immediately (may be blocked by autoplay policy)
tryStartBgMusic()

// --- New: support multiple custom pipe configs ---
// Each entry holds: { img: Image, src: string, gap: number, trim: object|null, loaded: bool }
let customPipeConfigs = []
// index used for round-robin selection
let nextCustomIndex = 0
// Cheat: infinite mode when URL contains ?code=69
const CHEAT_INFINITE = (typeof window !== 'undefined') && (new URLSearchParams(window.location.search).get('code') === '69')

function computeTrimForImage(img) {
    try {
        const oc = document.createElement('canvas')
        oc.width = img.naturalWidth || img.width
        oc.height = img.naturalHeight || img.height
        const ocCtx = oc.getContext('2d')
        ocCtx.drawImage(img, 0, 0)
        const imgData = ocCtx.getImageData(0, 0, oc.width, oc.height).data
        let minX = oc.width, minY = oc.height, maxX = 0, maxY = 0, found = false
        for (let y = 0; y < oc.height; y++) {
            for (let x = 0; x < oc.width; x++) {
                const a = imgData[(y * oc.width + x) * 4 + 3]
                if (a > 10) {
                    found = true
                    if (x < minX) minX = x
                    if (y < minY) minY = y
                    if (x > maxX) maxX = x
                    if (y > maxY) maxY = y
                }
            }
        }
        if (found) {
            return {
                sx: minX,
                sy: minY,
                sw: maxX - minX + 1,
                sh: maxY - minY + 1,
                iw: oc.width,
                ih: oc.height
            }
        }
    } catch (err) {
        console.warn('computeTrimForImage failed', err)
    }
    return null
}

function addCustomPipe(src, gap) {
    const cfg = {
        img: new Image(),
        src: src,
        gap: typeof gap === 'number' ? gap : pipes.gap,
        trim: null,
        loaded: false
    }
    cfg.img.onload = () => {
        cfg.trim = computeTrimForImage(cfg.img)
        cfg.loaded = true
        console.log('Loaded custom pipe', src, 'trim=', cfg.trim)
        updateCustomPipesList()
    }
    cfg.img.onerror = () => {
        console.warn('Failed to load custom pipe image:', src)
        cfg.loaded = false
        updateCustomPipesList()
    }
    cfg.img.src = src
    customPipeConfigs.push(cfg)
    updateCustomPipesList()
    return customPipeConfigs.length - 1
}

// Probe an image path and call `onSuccess(src, gap)` only if it loads.
function probeImageAndAdd(src, gap) {
    const probe = new Image()
    probe.onload = () => {
        // only add when confirmed loadable
        addCustomPipe(src, gap)
    }
    probe.onerror = () => {
        // silently ignore missing images (avoid cluttering the list)
    }
    probe.src = src
}

// Auto-register sequential files named like custom-pipe1.png, custom-pipe2.png, ...
// Tries both relative directories 'images' and 'img' and both dash/underscore variants.
function autoRegisterSequence(options) {
    // Probe the `img/custom/pipes` directory for custom pipes (no user prompt)
    // We probe the base name without a number first (custom-pipe.png),
    // then the numbered sequence custom-pipe1.png, custom-pipe2.png, ...
    const opts = Object.assign({ dirs: ['img/custom/pipes'], baseNames: ['custom-pipe', 'custom_pipe'], ext: 'png', max: 8 }, options || {})
    for (const dir of opts.dirs) {
        for (const base of opts.baseNames) {
            // probe the un-numbered base first (e.g. custom-pipe.png)
            probeImageAndAdd(`${dir}/${base}.${opts.ext}`)
            // then probe numbered variants
            for (let i = 1; i <= opts.max; i++) {
                const path = `${dir}/${base}${i}.${opts.ext}`
                probeImageAndAdd(path)
            }
        }
    }
}

function removeCustomPipe(index) {
    if (index >= 0 && index < customPipeConfigs.length) {
        customPipeConfigs.splice(index, 1)
        updateCustomPipesList()
        // clamp round-robin index to valid range
        if (customPipeConfigs.length === 0) nextCustomIndex = 0
        else nextCustomIndex = nextCustomIndex % customPipeConfigs.length
    }
}

function clearCustomPipes() {
    customPipeConfigs = []
    updateCustomPipesList()
    nextCustomIndex = 0
}

function updateCustomPipesList() {
    const list = document.getElementById('custom-pipes-list')
    if (!list) return
    list.innerHTML = ''
    customPipeConfigs.forEach((c, i) => {
        const entry = document.createElement('div')
        entry.className = 'custom-pipe-entry'
        const text = document.createElement('div')
        text.style.flex = '1'
        text.textContent = `${i}: ${c.src} (gap: ${c.gap}) ${c.loaded ? '' : '[not loaded]'} `
        const rm = document.createElement('button')
        rm.textContent = 'Remove'
        rm.onclick = () => removeCustomPipe(i)
        entry.appendChild(text)
        entry.appendChild(rm)
        list.appendChild(entry)
    })
}

// make audio playback failures visible and guard against browser autoplay rejections
function safePlay(sfx, label) {
    if (!sfx) return
    try {
        // ensure audio is ready to play (hint to browser)
        try { sfx.preload = 'auto' } catch (e) {}
        // call play and handle promise rejection (common with autoplay policies)
        const p = sfx.play()
        if (p && typeof p.catch === 'function') {
            p.catch(err => console.warn('Audio play rejected for', label, err))
        }
    } catch (err) {
        console.warn('safePlay error for', label, err)
    }
}

gameState = {
    //loads game on ready screen, tick to change state of game
    current: 0,
    getReady: 0,
    //on play game state: bird flaps and flies
    play: 1,
    //game over screen: button||click takes player to ready screen
    gameOver: 2
}
//background
bg = {
    //object's key-value properties pinpointing its location
    imgX: 0,
    imgY: 0,
    width: 276,
    height: 228,
    //x,y coordinates of where image should be drawn on canvas
    x: 0,
    //https://stackoverflow.com/questions/7043509/this-inside-object
    //reason why 'y' cannot be defined as this.height or bg.height
    y: cvs.height - 228,
    w: 276,
    h: 228,
    dx: .2,
    //object's render function that utilizes all above values to draw image onto canvas
    render: function() {
        ctx.drawImage(theme1, this.imgX,this.imgY,this.width,this.height, this.x,this.y,this.w,this.h)

        //image repeat and tile to fit canvas
        ctx.drawImage(theme1, this.imgX,this.imgY,this.width,this.height, this.x + this.width,this.y,this.w,this.h)

        //image repeat again for continuous animation
        ctx.drawImage(theme1, this.imgX,this.imgY,this.width,this.height, this.x + this.width*2,this.y,this.w,this.h)
    },

    position: function () {
        //still img on get ready frame
        if (gameState.current == gameState.getReady) {
            this.x = 0
        }    
        //ANIMATION: slowly move background on play game state by decrementing x
        if (gameState.current == gameState.play) {
            this.x = (this.x-this.dx) % (this.w)
        }
    }
}
//top and bottom pipes
pipes = {
    //object's key-value properties pinpointing its location
    //top pipe image x,y coordinate
    top: {
        imgX: 56,
        imgY: 323,
    },
    //bot pipe image x,y coordinate
    bot: {
        imgX: 84,
        imgY:323,
    },
    width: 26,
    height: 160,
    //pipes' values for drawing on canvas
    w: 55,
    h: 300,
    gap: 85,
    dx: 2,
    //acceptable y values must be -260 <= y <= -40
    minY: -260,
    maxY: -40,
    
    pipeGenerator: [],
    
    reset: function() {
        this.pipeGenerator = []
    },
    //object's render function that utilizes all above values to draw image onto canvas
    render: function() {
        //draw whatever is in the pipeGenerator
        for (let i = 0; i < this.pipeGenerator.length; i++) {
            let pipe = this.pipeGenerator[i]
            let gapHere = (pipe.gap !== undefined) ? pipe.gap : this.gap
            let topPipe = pipe.y
            let bottomPipe = pipe.y + gapHere + this.h

            // If this specific pipe references a custom config, try to draw it
            if (pipe.customIndex !== undefined) {
                const cfg = customPipeConfigs[pipe.customIndex]
                if (cfg && cfg.loaded) {
                    const src = cfg.trim ? cfg.trim : { sx: 0, sy: 0, sw: cfg.img.naturalWidth || cfg.img.width, sh: cfg.img.naturalHeight || cfg.img.height }
                    const scale = this.h / src.sh
                    const dw = Math.round(src.sw * scale * 1.5)
                    const dh = this.h

                    if (!CUSTOM_PIPE_DEBUG_LOGGED) {
                        CUSTOM_PIPE_DEBUG_LOGGED = true
                        try {
                            console.log('Custom pipe sizes (per-pipe):', { src: src, dest: { dw: dw, dh: dh, boxW: this.w, boxH: this.h } })
                        } catch (e) {}
                    }

                    // top (flipped)
                    ctx.save()
                    ctx.beginPath()
                    ctx.rect(pipe.x, topPipe, this.w, this.h)
                    ctx.clip()
                    const topDx = pipe.x + Math.round((this.w - dw) / 2)
                    const topDy = topPipe
                    ctx.translate(topDx + dw / 2, topDy + dh / 2)
                    ctx.scale(1, -1)
                    ctx.drawImage(cfg.img, src.sx, src.sy, src.sw, src.sh, -dw / 2, -dh / 2, dw, dh)
                    ctx.restore()

                    // bottom (normal)
                    ctx.save()
                    ctx.beginPath()
                    ctx.rect(pipe.x, bottomPipe, this.w, this.h)
                    ctx.clip()
                    const botDx = pipe.x + Math.round((this.w - dw) / 2)
                    const botDy = bottomPipe
                    ctx.drawImage(cfg.img, src.sx, src.sy, src.sw, src.sh, botDx, botDy, dw, dh)
                    ctx.restore()
                    continue
                }
            }

            // fallback to global single custom pipe image if available
            if (USE_CUSTOM_PIPE && CUSTOM_PIPE_IMG.complete) {
                const src = CUSTOM_PIPE_TRIM ? CUSTOM_PIPE_TRIM : { sx: 0, sy: 0, sw: CUSTOM_PIPE_IMG.naturalWidth || CUSTOM_PIPE_IMG.width, sh: CUSTOM_PIPE_IMG.naturalHeight || CUSTOM_PIPE_IMG.height }
                const scale = this.h / src.sh
                const dw = Math.round(src.sw * scale * 1.5)
                const dh = this.h
                ctx.save()
                ctx.beginPath()
                ctx.rect(pipe.x, topPipe, this.w, this.h)
                ctx.clip()
                const topDx = pipe.x + Math.round((this.w - dw) / 2)
                const topDy = topPipe
                ctx.translate(topDx + dw / 2, topDy + dh / 2)
                ctx.scale(1, -1)
                ctx.drawImage(CUSTOM_PIPE_IMG, src.sx, src.sy, src.sw, src.sh, -dw / 2, -dh / 2, dw, dh)
                ctx.restore()
                ctx.save()
                ctx.beginPath()
                ctx.rect(pipe.x, bottomPipe, this.w, this.h)
                ctx.clip()
                const botDx = pipe.x + Math.round((this.w - dw) / 2)
                const botDy = bottomPipe
                ctx.drawImage(CUSTOM_PIPE_IMG, src.sx, src.sy, src.sw, src.sh, botDx, botDy, dw, dh)
                ctx.restore()
            } else {
                ctx.drawImage(theme2, this.top.imgX,this.top.imgY,this.width,this.height, pipe.x,topPipe,this.w,this.h)
                ctx.drawImage(theme2, this.bot.imgX,this.bot.imgY,this.width,this.height, pipe.x,bottomPipe,this.w,this.h)
            }
        }
    },
    position: function() {
        //if game is not in session, do nothing
        if (gameState.current !== gameState.play) {
            return
        }
        //if game is in session, generate set of pipes forever
        if (gameState.current == gameState.play) {
            
            //when pipes reach this frame, generate another set
            if (frame%100 == 0) {
                        // Random selection among loaded custom pipe configs (if any)
                        let customIndex = undefined
                        if (customPipeConfigs.length > 0) {
                            // gather indices of loaded configs
                            const loaded = []
                            for (let j = 0; j < customPipeConfigs.length; j++) {
                                if (customPipeConfigs[j] && customPipeConfigs[j].loaded) loaded.push(j)
                            }
                            if (loaded.length > 0) {
                                customIndex = loaded[Math.floor(Math.random() * loaded.length)]
                            } else {
                                // if none are fully marked loaded yet, fall back to any config (round-robin)
                                customIndex = nextCustomIndex % customPipeConfigs.length
                                nextCustomIndex = (nextCustomIndex + 1) % customPipeConfigs.length
                            }
                        }
                        const cfgGap = (customIndex !== undefined && customIndex !== -1) ? customPipeConfigs[customIndex].gap : undefined
                this.pipeGenerator.push(
                    {
                        //spawn off canvas
                        x: cvs.width,
                        //random y-coordinates
                        y: Math.floor((Math.random() * (this.maxY-this.minY+1)) + this.minY),
                        // if there's a chosen custom, mark it here
                        customIndex: customIndex,
                        gap: cfgGap
                    }
                )
                // no sequence counter needed when choosing randomly
            }
            //iterate for all pipes generated (animation, collision, deletion)
            for (let i = 0; i < this.pipeGenerator.length; i++) {

                //decleration for bird and pipes' parameters (COLLISION)
                let pg = this.pipeGenerator[i]
                let b = {
                    left: bird.x - bird.r,
                    right: bird.x + bird.r,
                    top: bird.y - bird.r,
                    bottom: bird.y + bird.r,
                }
                let gapHere = (pg.gap !== undefined) ? pg.gap : this.gap
                let p = {
                    top: {
                        top: pg.y,
                        bottom: pg.y + this.h
                    },
                    bot: {
                        top: pg.y + this.h + gapHere,
                        bottom: pg.y + this.h*2 + gapHere
                    },
                    left: pg.x,
                    right: pg.x + this.w
                }

                //ANIMATION: set of pipes scroll from the right of canvas by decrementing x
                pg.x -= this.dx
                
                //delete pipes as they scroll off the canvas (memory management)
                if(pg.x < -this.w) {
                    this.pipeGenerator.shift()
                        //score up
                        score.current++
                        SFX_SCORE.play()
                    }

                //PIPE COLLISION
                //collision with top pipe
                if (b.left < p.right &&
                    b.right > p.left &&
                    b.top < p.top.bottom &&
                    b.bottom > p.top.top) {
                        // in infinite-cheat mode, collisions don't end the game
                        if (!CHEAT_INFINITE) {
                            gameState.current = gameState.gameOver
                            SFX_LAWDA.play()
                        }
                        // collision sound as feedback
                        SFX_COLLISION.play()
                        
                }
                //collision with bottom pipe
                if (b.left < p.right &&
                    b.right > p.left &&
                    b.top < p.bot.bottom &&
                    b.bottom > p.bot.top) {
                        // in infinite-cheat mode, collisions don't end the game
                        if (!CHEAT_INFINITE) {
                            gameState.current = gameState.gameOver
                            SFX_LAWDA.play()
                        }
                        // collision sound as feedback
                        SFX_COLLISION.play()
                        
                }
            }
        }
    }
}
//ground floor
ground = {
    //object's key-value properties pinpointing its location
    imgX: 276,
    imgY: 0,
    width: 224,
    height: 112,
    //values for drawing on canvas
    x: 0,
    y:cvs.height - 112,
    w:224,
    h:112,
    dx: 2,
    render: function() {
        ctx.drawImage(theme1, this.imgX,this.imgY,this.width,this.height, this.x,this.y,this.w,this.h)
        //image repeat and tile to fit canvas
        ctx.drawImage(theme1, this.imgX,this.imgY,this.width,this.height, this.x + this.width,this.y,this.w,this.h)
    },
    //ANIMATION:  ground scrolls to the left in a continuous loop when game state is at play
    //needs to be at the same rate of pipes' scroll speed
    position: function() {
        if (gameState.current == gameState.getReady) {
            this.x = 0
        }
        if (gameState.current == gameState.play) {
            //modulus keeps this.x value infinitely cycling back to zero
            this.x = (this.x-this.dx) % (this.w/2)
        }
    }
}
//map of number images
map = [
    num0 = {
        imgX: 496,
        imgY: 60,
        width: 12,
        height: 18
    },
    num1 = {
        imgX: 135,
        imgY: 455,
        width: 10,
        height: 18
    },
    num2 = {
        imgX: 292,
        imgY: 160,
        width: 12,
        height: 18
    },
    num3 = {
        imgX: 306,
        imgY: 160,
        width: 12,
        height: 18
    },
    num4 = {
        imgX: 320,
        imgY: 160,
        width: 12,
        height: 18
    },
    num5 = {
        imgX: 334,
        imgY: 160,
        width: 12,
        height: 18
    },
    num6 = {
        imgX: 292,
        imgY: 184,
        width: 12,
        height: 18
    },
    num7 = {
        imgX: 306,
        imgY: 184,
        width: 12,
        height: 18
    },
    num8 = {
        imgX: 320,
        imgY: 184,
        width: 12,
        height: 18
    },
    num9 = {
        imgX: 334,
        imgY: 184,
        width: 12,
        height: 18
    }    
]
//current score, top score, tracker
score = {
    current: 0,
    best: null, // DO THIS STRETCH GOAL
    //values for drawing mapped numbers on canvas
    x: cvs.width/2,
    y: 40,
    w: 15,
    h: 25,
    reset: function() {
        this.current = 0
    },
    //display the score
    render: function() {
        if (gameState.current == gameState.play ||
            gameState.current == gameState.gameOver) {
            //change current score number value to string value and access each place value
            let string = this.current.toString()
            let ones = string.charAt(string.length-1)
            let tens = string.charAt(string.length-2)
            let hundreds = string.charAt(string.length-3)

            //if current score has thousands place value: the game is over
            if (this.current >= 1000) {
                gameState.current = gameState.gameOver
            
            //if current score has ones, tens, and hundreds place value only
            } else if (this.current >= 100) {
                ctx.drawImage(theme2, map[ones].imgX,map[ones].imgY,map[ones].width,map[ones].height, ( (this.x-this.w/2) + (this.w) + 3 ),this.y,this.w,this.h)

                ctx.drawImage(theme2, map[tens].imgX,map[tens].imgY,map[tens].width,map[tens].height, ( (this.x-this.w/2) ),this.y,this.w,this.h)

                ctx.drawImage(theme2, map[hundreds].imgX,map[hundreds].imgY,map[hundreds].width,map[hundreds].height, (   (this.x-this.w/2) - (this.w) - 3 ),this.y,this.w,this.h)

            //if current score has ones and tens place value only
            } else if (this.current >= 10) {
                ctx.drawImage(theme2, map[ones].imgX,map[ones].imgY,map[ones].width,map[ones].height, ( (this.x-this.w/2) + (this.w/2) + 3 ),this.y,this.w,this.h)

                ctx.drawImage(theme2, map[tens].imgX,map[tens].imgY,map[tens].width,map[tens].height, ( (this.x-this.w/2) - (this.w/2) - 3 ),this.y,this.w,this.h)
            
            //if current score has ones place value only
            } else {
                ctx.drawImage(theme2, map[ones].imgX,map[ones].imgY,map[ones].width,map[ones].height, ( this.x-this.w/2 ),this.y,this.w,this.h)
            }
        }
    }
}    
//bird : YELLOW BIRD
bird = {
    animation: [
        {imgX: 276, imgY: 114},  //  position 0
        {imgX: 276, imgY: 140},  //  position 1
        {imgX: 276, imgY: 166},  //  position 2
        {imgX: 276, imgY: 140}   //  position 1
    ],
    fr: 0,
    //object's key-value properties pinpointing its location
    width: 34,
    height: 24,
    //values for drawing on canvas (scaled up)
    x: 50,
    y: 160,
    w: 40, // reduced ~50% from 51
    h: 27, // reduced ~50% from 36
    //bird's radius (scaled)
    r: 15, // reduced ~50% from 18
    //how much the bird flies per flap()
    fly: 5.25,
    //gravity increments the velocity per frame
    gravity: .32,
    //velocity = pixels the bird will drop in a frame
    velocity: 0,
    //object's render function that utilizes all above values to draw image onto canvas
    render: function() {
        // If user supplied a custom image and it loaded, draw it instead of
        // drawing from the sprite sheet. The custom image will be scaled to
        // the bird's width/height (this.w/this.h).
        if (USE_CUSTOM_BIRD && CUSTOM_BIRD_IMG.complete) {
            ctx.save()
            ctx.translate(this.x, this.y)
            ctx.rotate(this.rotation)
            // apply optional horizontal mirror
            if (CUSTOM_BIRD_MIRROR) ctx.scale(-1, 1)
            // scale custom image around the bird center
            const dw = this.w * CUSTOM_BIRD_SCALE
            const dh = this.h * CUSTOM_BIRD_SCALE
            ctx.drawImage(CUSTOM_BIRD_IMG, -dw/2, -dh/2, dw, dh)
            ctx.restore()
        } else {
            let bird = this.animation[this.fr]
            //save all previous setting
            ctx.save()
            //target center of bird
            ctx.translate(this.x, this.y)
            //rotate bird by degree
            ctx.rotate(this.rotation)
            ctx.drawImage(theme1, bird.imgX,bird.imgY,this.width,this.height, -this.w/2,-this.h/2,this.w,this.h)
            ctx.restore()
            //bird is centered on x,y position
            // ctx.drawImage(theme1, bird.imgX,bird.imgY,this.width,this.height, this.x-this.w/2,this.y-this.h/2,this.w,this.h)
        }
    },
    //bird flies
    flap: function() {
        this.velocity = - this.fly
    },
    //function checks gameState and updates bird's position
    position: function() {
        if (gameState.current == gameState.getReady) {
            this.y = 160
            this.rotation = 0 * degree
            //bird animation changes every 20 frames
            if (frame%20 == 0) {
                this.fr += 1
            }
            //when bird animation reaches its last value, reset animation
            if (this.fr > this.animation.length - 1) {
                this.fr = 0
            }

        } else {
            // cheat: keep bird centered and skip physics when infinite-cheat active
            if (CHEAT_INFINITE) {
                this.y = cvs.height / 2
                this.velocity = 0
                this.rotation = 0
                // advance wing animation so it still looks alive
                if (frame%4 == 0) {
                    this.fr += 1
                }
                if (this.fr > this.animation.length - 1) this.fr = 0
                return
            }
            //bird animation changes every 4 frames
            if (frame%4 == 0) {
                this.fr += 1
            }
            //when bird animation reaches its last value, reset animation
            if (this.fr > this.animation.length - 1) {
                this.fr = 0
            }

            //bird falls to gravity
            this.velocity += this.gravity
            this.y += this.velocity

            //bird rotation
            if (this.velocity <= this.fly) {
                this.rotation = -15 * degree
            } else if (this.velocity >= this.fly+2) {
                this.rotation = 70 * degree
                this.fr = 1
            } else {
                this.rotation = 0
            }

            //check collision with ground
            if (this.y+this.h/2 >= cvs.height-ground.h) {
                this.y = cvs.height-ground.h - this.h/2
                //stop flapping when it hits the ground
                if (frame%1 == 0) {
                    this.fr = 2
                    this.rotation = 70 * degree
                }
                //then the game is over
                if (gameState.current == gameState.play) {
                    if (!CHEAT_INFINITE) {
                        gameState.current = gameState.gameOver
                        SFX_FALL.play()
                        SFX_LAWDA.play()
                    } else {
                        // keep bird centered vertically in cheat mode
                        this.y = cvs.height / 2
                        this.velocity = 0
                        this.rotation = 0
                        this.fr = 1
                    }
                }
            }
            
            //bird cannot fly above canvas
            if (this.y-this.h/2 <= 0) {
                this.y = this.r
            }

        }
    }
}
//bird1 : RED BIRD
bird1 = {
    //ANIMATION: bird  //DO THIS STRETCH GOAL
    animation: [
        {imgX: 115, imgY: 381},  //  position 0
        {imgX: 115, imgY: 407},  //  position 1
        {imgX: 115, imgY: 433},  //  position 2
        {imgX: 115, imgY: 407}   //  position 1
    ],
    fr: 0,
    //object's key-value properties pinpointing its location
    width: 18,
    height: 12,
    //values for drawing on canvas (scaled up)
    x: 50,
    y: 160,
    w: 26, // reduced ~50% from 51
    h: 18, // reduced ~50% from 36
    //bird's radius (scaled)
    r: 9, // reduced ~50% from 18
    //how much the bird flies per flap()
    fly: 5.25,
    //gravity increments the velocity per frame
    gravity: .32,
    //velocity = pixels the bird will drop in a frame
    velocity: 0,
    //object's render function that utilizes all above values to draw image onto canvas
    render: function() {
        let bird = this.animation[this.fr]
        //bird is centered on x,y position
        ctx.drawImage(theme2, bird.imgX,bird.imgY,this.width,this.height, this.x-this.w/2,this.y-this.h/2,this.w,this.h)
    },
    //bird flies
    flap: function() {
        this.velocity = - this.fly
    },
    //function checks gameState and updates bird's position
    position: function() {
        if (gameState.current == gameState.getReady) {
            this.y = 160
            //bird animation changes every 20 frames
            if (frame%20 == 0) {
                this.fr += 1
            }
            //when bird animation reaches its last value, reset animation
            if (this.fr > this.animation.length - 1) {
                this.fr = 0
            }

        } else {
            // cheat: keep bird1 centered and skip physics when infinite-cheat active
            if (CHEAT_INFINITE) {
                this.y = cvs.height / 2
                this.velocity = 0
                // advance wing animation so it still looks alive
                if (frame%4 == 0) {
                    this.fr += 1
                }
                if (this.fr > this.animation.length - 1) this.fr = 0
                return
            }
            //bird animation changes every 4 frames
            if (frame%4 == 0) {
                this.fr += 1
            }
            //when bird animation reaches its last value, reset animation
            if (this.fr > this.animation.length - 1) {
                this.fr = 0
            }

            //bird falls to gravity
            this.velocity += this.gravity
            this.y += this.velocity

            //check collision with ground
            if (this.y+this.h/2 >= cvs.height-ground.h) {
                this.y = cvs.height-ground.h - this.h/2
                //stop flapping when it hits the ground
                if (frame%1 == 0) {
                    this.fr = 2
                }
                //then the game is over
                if (gameState.current == gameState.play) {
                    if (!CHEAT_INFINITE) {
                        gameState.current = gameState.gameOver
                        SFX_FALL.play()
                        SFX_LAWDA.play()
                    } else {
                        // keep bird1 centered vertically in cheat mode
                        this.y = cvs.height / 2
                        this.velocity = 0
                        this.fr = 1
                    }
                }
            }
            
            //bird cannot fly above canvas
            if (this.y-this.h/2 <= 0) {
                this.y = this.r
            }
        }
    }
}
//bird2 : BLUE BIRD
bird2 = {
    //ANIMATION: bird  //DO THIS STRETCH GOAL
    animation: [
        {imgX: 87, imgY: 491},   //  position 0
        {imgX: 115, imgY: 329},  //  position 1
        {imgX: 115, imgY: 355},  //  position 2
        {imgX: 115, imgY: 329}   //  position 1
    ],
    fr: 0,
    //object's key-value properties pinpointing its location
    //ANIMATION: bird2  //DO THIS STRETCH GOAL
    imgX: 87,
    imgY: 491,
    width: 18,
    height: 12,
    //values for drawing on canvas (scaled up)
    x: 50,
    y: 160,
    w: 26, // reduced ~50% from 51
    h: 18, // reduced ~50% from 36
    //bird's radius (scaled)
    r: 9, // reduced ~50% from 18
    //how much the bird flies per flap()
    fly: 5.25,
    //gravity increments the velocity per frame
    gravity: .32,
    //velocity = pixels the bird will drop in a frame
    velocity: 0,
    //object's render function that utilizes all above values to draw image onto canvas
    render: function() {
        let bird = this.animation[this.fr]
        //bird is centered on x,y position
        ctx.drawImage(theme2, bird.imgX,bird.imgY,this.width,this.height, this.x-this.w/2,this.y-this.h/2,this.w,this.h)
    },
    //bird flies
    flap: function() {
        this.velocity = - this.fly
    },
    //function checks gameState and updates bird's position
    position: function() {
        if (gameState.current == gameState.getReady) {
            this.y = 160
            //bird animation changes every 20 frames
            if (frame%20 == 0) {
                this.fr += 1
            }
            //when bird animation reaches its last value, reset animation
            if (this.fr > this.animation.length - 1) {
                this.fr = 0
            }

        } else {
            // cheat: keep bird2 centered and skip physics when infinite-cheat active
            if (CHEAT_INFINITE) {
                this.y = cvs.height / 2
                this.velocity = 0
                // advance wing animation so it still looks alive
                if (frame%4 == 0) {
                    this.fr += 1
                }
                if (this.fr > this.animation.length - 1) this.fr = 0
                return
            }
            //bird animation changes every 4 frames
            if (frame%4 == 0) {
                this.fr += 1
            }
            //when bird animation reaches its last value, reset animation
            if (this.fr > this.animation.length - 1) {
                this.fr = 0
            }

            //bird falls to gravity
            this.velocity += this.gravity
            this.y += this.velocity

            //check collision with ground
            if (this.y+this.h/2 >= cvs.height-ground.h) {
                this.y = cvs.height-ground.h - this.h/2
                //stop flapping when it hits the ground
                if (frame%1 == 0) {
                    this.fr = 2
                }
                //then the game is over
                if (gameState.current == gameState.play) {
                    if (!CHEAT_INFINITE) {
                        gameState.current = gameState.gameOver
                        SFX_FALL.play()
                        SFX_LAWDA.play()
                    } else {
                        // keep bird2 centered vertically in cheat mode
                        this.y = cvs.height / 2
                        this.velocity = 0
                        this.fr = 1
                    }
                }
            }
            
            //bird cannot fly above canvas
            if (this.y-this.h/2 <= 0) {
                this.y = this.r
            }
        }
    }
}
//get ready screen
getReady = {
    //object's key-value properties pinpointing its location
    imgX: 0,
    imgY: 228,
    width: 174,
    height: 160,
    //values for drawing on canvas
    x: cvs.width/2 - 174/2,
    y: cvs.height/2 - 160,
    w: 174,
    h: 160,
    //object's render function that utilizes all above values to draw image onto canvas
    render: function() {
        //only draw this if the game state is on get ready
        if (gameState.current == gameState.getReady) {    
            ctx.drawImage(theme1, this.imgX,this.imgY,this.width,this.height, this.x,this.y,this.w,this.h)
        }
    }
}
//game over screen
gameOver = {
    //object's key-value properties pinpointing its location
    imgX: 174,
    imgY: 228,
    width: 226,
    height: 158,
    //values for drawing on canvas
    x: cvs.width/2 - 226/2,
    y: cvs.height/2 - 160,
    w: 226,
    h:160,
    //object's render function that utilizes all above values to draw image onto canvas
    render: function() {
        //only draw this if the game state is on game over
        if (gameState.current == gameState.gameOver) {
            ctx.drawImage(theme1, this.imgX,this.imgY,this.width,this.height, this.x,this.y,this.w,this.h)
            description.style.visibility = "visible"
        }
    }
}
/************************
***** FUNCTIONS: ********
************************/
//anything to be drawn on canvas goes in here
let draw = () => {
    //this clears canvas to default bg color
    ctx.fillStyle = '#00bbc4'
    ctx.fillRect(0,0, cvs.width,cvs.height)
    //things to draw
    bg.render()
    pipes.render()
    ground.render()
    score.render()
    bird.render()
    getReady.render()
    gameOver.render()
}
//updates on animation and position goes in here
let update = () => {
    //things to update
    bird.position()
    bg.position()
    pipes.position()
    ground.position()
}
//game looper
let loop = () => {
    draw()
    update()
    frame++
    //average of requestAnimationFrame is 50-60fps
    // requestAnimationFrame(loop)
}
loop()
setInterval(loop, 17)

/*************************
***** EVENT HANDLERS ***** 
*************************/
//on mouse click // tap screen
cvs.addEventListener('click', () => {
    // ensure background music starts on first user interaction if autoplay was blocked
    tryStartBgMusic()
    //if ready screen >> go to play state
        if (gameState.current == gameState.getReady) {
        gameState.current = gameState.play
    }
    //if play state >> bird keeps flying
    if (gameState.current == gameState.play) {
        bird.flap()
        SFX_FLAP.play()
        description.style.visibility = "hidden"
    }
    //if game over screen >> go to ready screen
    if (gameState.current == gameState.gameOver) {
        pipes.reset()
        score.reset()
        gameState.current = gameState.getReady
        SFX_SWOOSH.play()
    }
})
//on spacebar
document.body.addEventListener('keydown', (e) => {
    // try to start background music on first key press (spacebar)
    if (e.keyCode == 32) tryStartBgMusic()
    //if ready screen >> go to play state
    if (e.keyCode == 32) {
        if (gameState.current == gameState.getReady) {
            gameState.current = gameState.play
        }
        //if play state >> bird keeps flying
        if (gameState.current == gameState.play) {
            bird.flap()
            SFX_FLAP.play()
            description.style.visibility = "hidden"
        }
        //if game over screen >> go to ready screen
        if (gameState.current == gameState.gameOver) {
            pipes.reset()
            score.reset()
            SFX_SWOOSH.play()
            gameState.current = gameState.getReady
        }
    }
})

// wire up custom pipes UI (buttons in index.html)
document.addEventListener('DOMContentLoaded', () => {
    // initial render of list
    updateCustomPipesList()
    // auto-register images named custom-pipe1..N in img/custom/pipes (probes before adding)
    autoRegisterSequence({ max: 12 })
})