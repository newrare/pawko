/**
 * BackgroundAnimator — canvas particle background ported from the design preview.
 *
 * Three states, one fixed per instance:
 *   'calm'   — floating card suits, slow drift          (level selector)
 *   'shop'   — falling suits + coins, gentle wobble     (shop / ability)
 *   'plinko' — fast balls bouncing off a peg grid       (game scene)
 *
 * Usage:
 *   const bg = new BackgroundAnimator(rootEl, 'calm');
 *   // later:
 *   bg.destroy();
 */

/** @typedef {'calm'|'shop'|'plinko'} BgState */

/** @type {Record<BgState, object>} */
const STATES = {
  calm: {
    count: 9,
    trailLen: 52,
    trailAlphaMax: 0.08,
    headAlpha: 0.55,
    pegAlpha: 0,
    types: ["heart", "diamond", "club", "spade", "heart", "diamond", "club"],
  },
  shop: {
    count: 9,
    trailLen: 24,
    trailAlphaMax: 0.18,
    headAlpha: 0.65,
    pegAlpha: 0.008,
    types: [
      "heart",
      "diamond",
      "club",
      "spade",
      "coin",
      "heart",
      "diamond",
      "club",
      "coin",
    ],
  },
  plinko: {
    count: 17,
    trailLen: 11,
    trailAlphaMax: 0.35,
    headAlpha: 0.8,
    pegAlpha: 0.04,
    types: ["ball"],
  },
};

/**
 * @param {number} W
 * @param {number} H
 * @returns {Array<{x:number,y:number}>}
 */
function buildPegs(W, H) {
  const pegs = [];
  const cols = 9,
    rows = 7;
  const gx = W / (cols + 1);
  const gy = (H * 0.72) / (rows + 1);
  const startY = H * 0.06;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? gx / 2 : 0;
    for (let c = 0; c < cols; c++) {
      pegs.push({ x: gx * (c + 1) + offset, y: startY + gy * (r + 1) });
    }
  }
  return pegs;
}

export class BackgroundAnimator {
  /** @type {BgState} */ #state;
  /** @type {HTMLElement} */ #layer;
  /** @type {HTMLCanvasElement} */ #canvas;
  /** @type {CanvasRenderingContext2D} */ #ctx;
  /** @type {number} */ #W = 0;
  /** @type {number} */ #H = 0;
  /** @type {Array<object>} */ #particles = [];
  /** @type {Array<{x:number,y:number,t:number}>} */ #hitFlashes = [];
  /** @type {Array<{x:number,y:number}>} */ #pegs = [];
  /** @type {number} */ #frame = 0;
  /** @type {number | null} */ #rafId = null;

  /**
   * @param {HTMLElement} root  — element to prepend the background layer into
   * @param {BgState} state
   */
  constructor(root, state) {
    this.#state = state;
    this.#build(root);
    this.#onResize();
    window.addEventListener("resize", this.#onResize);
    this.#rafId = requestAnimationFrame(this.#tick);
  }

  destroy() {
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    window.removeEventListener("resize", this.#onResize);
    this.#layer.remove();
  }

  /* ─── DOM build ─────────────────────────────────────────────────────── */

  /** @param {HTMLElement} root */
  #build(root) {
    const layer = document.createElement("div");
    layer.className = "pk-bg-layer";
    layer.dataset.bgState = this.#state;

    const atmoCalm = document.createElement("div");
    atmoCalm.className = "pk-bg-atmo pk-bg-atmo--calm";

    const atmoShop = document.createElement("div");
    atmoShop.className = "pk-bg-atmo pk-bg-atmo--shop";

    const atmoPlinko = document.createElement("div");
    atmoPlinko.className = "pk-bg-atmo pk-bg-atmo--plinko";

    const canvas = document.createElement("canvas");

    const stripes = document.createElement("div");
    stripes.className = "pk-bg-stripes";

    const vignette = document.createElement("div");
    vignette.className = "pk-bg-vignette";

    layer.appendChild(atmoCalm);
    layer.appendChild(atmoShop);
    layer.appendChild(atmoPlinko);
    layer.appendChild(canvas);
    layer.appendChild(stripes);
    layer.appendChild(vignette);

    root.prepend(layer);

    this.#layer = layer;
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
  }

  /* ─── Resize ─────────────────────────────────────────────────────────── */

  #onResize = () => {
    this.#W = this.#canvas.width = this.#layer.clientWidth;
    this.#H = this.#canvas.height = this.#layer.clientHeight;
    this.#pegs = buildPegs(this.#W, this.#H);
  };

  /* ─── Particle factory ───────────────────────────────────────────────── */

  #spawn() {
    const s = this.#state;
    const cfg = STATES[s];
    const type = cfg.types[Math.floor(Math.random() * cfg.types.length)];
    const isSuit = ["heart", "diamond", "club", "spade"].includes(type);
    const r =
      type === "ball"
        ? 7 + Math.random() * 5
        : type === "coin"
          ? 8 + Math.random() * 4
          : isSuit
            ? 11 + Math.random() * 7
            : 6 + Math.random() * 4;

    const W = this.#W,
      H = this.#H;

    if (s === "calm") {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.12 + Math.random() * 0.2;
      return {
        x: W * 0.15 + Math.random() * W * 0.7,
        y: H * 0.15 + Math.random() * H * 0.7,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r,
        type,
        trail: [],
        wobble: Math.random() * Math.PI * 2,
        wobbleFreq: 0.005 + Math.random() * 0.006,
        wobbleAmp: 0.3 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.01,
        pstate: "calm",
        lastHit: -99,
      };
    }

    if (s === "shop") {
      return {
        x: W * 0.08 + Math.random() * W * 0.84,
        y: -r - 2,
        vx: (Math.random() - 0.5) * 0.9,
        vy: 0.5 + Math.random() * 0.6,
        r,
        type,
        trail: [],
        wobble: Math.random() * Math.PI * 2,
        wobbleFreq: 0.018 + Math.random() * 0.012,
        wobbleAmp: 0.25 + Math.random() * 0.4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed:
          (Math.random() < 0.5 ? 1 : -1) * (0.02 + Math.random() * 0.035),
        pstate: "shop",
        lastHit: -99,
      };
    }

    /* plinko */
    return {
      x: W * 0.12 + Math.random() * W * 0.76,
      y: -r - 2,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 0.9 + Math.random() * 0.9,
      r,
      type: "ball",
      trail: [],
      wobble: 0,
      wobbleFreq: 0,
      wobbleAmp: 0,
      rotation: 0,
      rotSpeed: 0,
      pstate: "plinko",
      lastHit: -99,
    };
  }

  /* ─── Update ─────────────────────────────────────────────────────────── */

  /** @param {object} p */
  #update(p) {
    const s = p.pstate;
    const W = this.#W,
      H = this.#H;

    if (s === "calm") {
      p.wobble += p.wobbleFreq;
      p.vx += Math.sin(p.wobble) * p.wobbleAmp * 0.009;
      p.vy += Math.cos(p.wobble * 0.6) * p.wobbleAmp * 0.005;
      p.vx *= 0.994;
      p.vy *= 0.994;
      p.rotation += p.rotSpeed;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -p.r - 5) p.x = W + p.r + 5;
      if (p.x > W + p.r + 5) p.x = -p.r - 5;
      if (p.y < -p.r - 5) p.y = H + p.r + 5;
      if (p.y > H + p.r + 5) p.y = -p.r - 5;
    }

    if (s === "shop") {
      p.wobble += p.wobbleFreq;
      p.vx += Math.sin(p.wobble) * p.wobbleAmp * 0.014;
      p.vx *= 0.955;
      p.vy += 0.022;
      p.vy *= 0.998;
      p.rotation += p.rotSpeed;
      p.x += p.vx;
      p.y += p.vy;
    }

    if (s === "plinko") {
      p.vy += 0.14;
      p.vx *= 0.975;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < p.r) {
        p.x = p.r;
        p.vx = Math.abs(p.vx) * 0.5;
      }
      if (p.x > W - p.r) {
        p.x = W - p.r;
        p.vx = -Math.abs(p.vx) * 0.5;
      }
      for (const peg of this.#pegs) {
        const dx = p.x - peg.x,
          dy = p.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p.r + 5.5 && this.#frame - p.lastHit > 7) {
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          const nx = dx / dist,
            ny = dy / dist;
          p.vx = nx * speed * 0.45 + (Math.random() - 0.5) * 1.8;
          p.vy = Math.abs(ny) * speed * 0.4 + 0.7;
          p.lastHit = this.#frame;
          this.#hitFlashes.push({ x: peg.x, y: peg.y, t: 0 });
          break;
        }
      }
    }

    p.trail.push({ x: p.x, y: p.y });
    const maxLen = STATES[this.#state].trailLen;
    if (p.trail.length > maxLen) p.trail.shift();
  }

  /** @param {object} p @returns {boolean} */
  #isDead(p) {
    if (p.pstate === "calm") return false;
    return p.y > this.#H + p.r + 20;
  }

  /* ─── Draw helpers ───────────────────────────────────────────────────── */

  /**
   * @param {number} x @param {number} y @param {number} r @param {number} a
   */
  #drawBall(x, y, r, a) {
    const ctx = this.#ctx;
    const g = ctx.createRadialGradient(
      x - r * 0.32,
      y - r * 0.32,
      r * 0.08,
      x,
      y,
      r,
    );
    g.addColorStop(0, `rgba(110,60,80,${a})`);
    g.addColorStop(0.6, `rgba(80,40,55,${a * 0.85})`);
    g.addColorStop(1, `rgba(50,22,35,${a * 0.55})`);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(160,100,120,${a * 0.14})`;
    ctx.fill();
  }

  /**
   * @param {number} x @param {number} y @param {number} r
   * @param {number} rot @param {number} a
   */
  #drawCoin(x, y, r, rot, a) {
    const ctx = this.#ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
    g.addColorStop(0, `rgba(160,120,55,${a})`);
    g.addColorStop(0.45, `rgba(110,80,28,${a})`);
    g.addColorStop(1, `rgba(60,40,12,${a * 0.7})`);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(10,2,5,${a * 0.25})`;
    ctx.lineWidth = r * 0.1;
    ctx.stroke();
    ctx.fillStyle = `rgba(8,2,4,${a * 0.4})`;
    ctx.font = `bold ${Math.round(r * 1.08)}px Georgia`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 1);
    ctx.restore();
  }

  /**
   * @param {number} x @param {number} y @param {number} r
   * @param {string} suit @param {number} a
   */
  #drawSuit(x, y, r, suit, a) {
    const glyphs = { heart: "♥", diamond: "♦", club: "♣", spade: "♠" };
    const isRed = suit === "heart" || suit === "diamond";
    const ctx = this.#ctx;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `${Math.round(r * 2.1)}px Georgia`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowBlur = r * 0.8;
    ctx.shadowColor = isRed ? "rgba(90,18,30,.5)" : "rgba(100,72,20,.5)";
    ctx.fillStyle = isRed ? "#5c1422" : "#6e5018";
    ctx.fillText(glyphs[suit], x, y);
    ctx.restore();
  }

  /** @param {object} p */
  #drawTrail(p) {
    if (p.pstate !== "plinko") return;
    const len = p.trail.length;
    if (len < 2) return;
    const maxA = STATES[this.#state].trailAlphaMax;
    const ctx = this.#ctx;
    for (let i = 1; i < len; i++) {
      const ratio = i / len;
      const a = ratio * ratio * maxA;
      const w = ratio * p.r * 1.3;
      if (w < 0.2) continue;
      const t0 = p.trail[i - 1],
        t1 = p.trail[i];
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.strokeStyle = `rgba(160,88,104,${a})`;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  /** @param {object} p */
  #drawParticle(p) {
    const a = STATES[this.#state].headAlpha;
    if (p.type === "ball") {
      this.#drawBall(p.x, p.y, p.r, a);
    } else if (p.type === "coin") {
      this.#drawCoin(p.x, p.y, p.r, p.rotation, a);
    } else {
      this.#drawSuit(p.x, p.y, p.r, p.type, a);
    }
  }

  #drawPegs() {
    const pegAlpha = STATES[this.#state].pegAlpha;
    if (pegAlpha < 0.003) return;
    const ctx = this.#ctx;
    for (const peg of this.#pegs) {
      const g = ctx.createRadialGradient(
        peg.x - 1.5,
        peg.y - 1.5,
        0.8,
        peg.x,
        peg.y,
        5,
      );
      g.addColorStop(0, `rgba(160,88,104,${pegAlpha * 2.2})`);
      g.addColorStop(1, `rgba(106,24,40,${pegAlpha})`);
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  #drawHitFlashes() {
    this.#hitFlashes = this.#hitFlashes.filter((h) => h.t < 16);
    const ctx = this.#ctx;
    for (const h of this.#hitFlashes) {
      const p = h.t / 16;
      ctx.beginPath();
      ctx.arc(h.x, h.y, p * 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(204,40,64,${(1 - p) * 0.55})`;
      ctx.fill();
      h.t++;
    }
  }

  /* ─── Main loop ──────────────────────────────────────────────────────── */

  #tick = () => {
    this.#frame++;
    const ctx = this.#ctx;
    const W = this.#W,
      H = this.#H;
    const cfg = STATES[this.#state];

    ctx.clearRect(0, 0, W, H);

    this.#drawPegs();
    if (this.#state === "plinko") this.#drawHitFlashes();

    for (let i = this.#particles.length - 1; i >= 0; i--) {
      this.#update(this.#particles[i]);
      if (this.#isDead(this.#particles[i])) this.#particles.splice(i, 1);
    }
    while (this.#particles.length < cfg.count) {
      this.#particles.push(this.#spawn());
    }

    for (const p of this.#particles) this.#drawTrail(p);
    for (const p of this.#particles) this.#drawParticle(p);

    this.#rafId = requestAnimationFrame(this.#tick);
  };
}
