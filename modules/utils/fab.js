import {browser} from "wxt/browser";

const FAB_HOST_ID = "set-a-reminder-fab";
const DEFAULT_Z_INDEX = 2147483647;
const DEFAULT_POSITION_PERCENT = 55;

const fabIconSvg = (withMic = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 378.82 373.4">
 <g>
  <circle fill="#C1DBED" class="fill-foreground" cx="171.72" cy="315.52" r="47.69"/>
  <path fill="#C1DBED" class="fill-foreground" d="M293.01 278.7c-19.39,-16.98 -30.58,-41.44 -30.76,-67.18 -41.07,-10.1 -71.53,-47.15 -71.53,-91.33 0,-12.7 2.52,-24.81 7.09,-35.86 -8.27,-2.56 -17.02,-3.95 -26.09,-3.95 -49.9,0 -90.52,41.76 -90.52,93.1l0 37.07c0,0.1 0,0.21 0,0.31 0,26.04 -11.26,50.82 -30.87,67.94 -5.04,4.46 -7.92,10.87 -7.92,17.6 0,0.03 0,0.06 0,0.08 0,12.84 10.16,23.27 22.63,23.27l213.38 0c12.47,0 22.63,-10.45 22.63,-23.27 0,-6.78 -2.89,-13.24 -8.04,-17.78z"/>
  <path fill="#1D5D8E" class="fill-primary" d="M176.25 373.4c-29.95,-0.04 -54.22,-24.31 -54.26,-54.26 0,-5.99 4.86,-10.85 10.85,-10.85 6,0 10.86,4.86 10.86,10.85 0,17.96 14.61,32.56 32.55,32.56 17.94,0 32.56,-14.6 32.56,-32.56 0,-5.99 4.86,-10.85 10.85,-10.85 5.99,0 10.85,4.86 10.85,10.85 -0.04,29.95 -24.31,54.22 -54.26,54.26l0 0z"/>
  <path fill="#1D5D8E" class="fill-primary" d="M295.62 329.99l-238.74 0c-13.97,-0.03 -25.28,-11.37 -25.28,-25.35 0,-7.38 3.22,-14.4 8.81,-19.21 0.37,-0.32 0.76,-0.61 1.16,-0.87 21.21,-18.46 33.4,-45.22 33.4,-73.34 0,0 0,-0.02 0,-0.02l0 -40.37c0,-0.13 0,-0.28 0,-0.42 0,-46.72 32.17,-87.31 77.66,-97.98 0.81,-0.18 1.65,-0.28 2.5,-0.28 5.99,0 10.85,4.86 10.85,10.85 0,5.03 -3.45,9.4 -8.35,10.56 -35.71,8.37 -60.96,40.24 -60.96,76.92 0,0.11 0,0.23 0,0.35l0 40.37c0,34.94 -15.37,68.13 -42,90.73 -0.22,0.18 -0.41,0.34 -0.64,0.5 -0.5,0.63 -0.77,1.41 -0.77,2.21 0,0.01 0,0.02 0,0.03 0,1.97 1.65,3.62 3.62,3.62l238.74 0c1.97,0 3.62,-1.65 3.62,-3.62 0,-0.02 0,-0.03 0,-0.05 0,-0.8 -0.28,-1.57 -0.78,-2.19 -13.11,-10.97 -23.74,-24.69 -31.03,-40.15 -0.79,-1.55 -1.21,-3.27 -1.21,-5.01 0,-5.99 4.86,-10.85 10.85,-10.85 4.34,0 8.26,2.59 9.97,6.58 5.73,12.1 13.76,22.72 23.92,31.6 0.38,0.26 0.75,0.53 1.1,0.83 5.66,4.81 8.89,11.83 8.89,19.24 0,13.96 -11.36,25.32 -25.33,25.32l0 0z"/>
  <g class="fab-mic fill-primary" style="transform: scale(8) translate(25px, 2px); ${ ! withMic ? 'display: none;' : ''}">
     <path fill-rule="evenodd" clip-rule="evenodd" d="M8 0C5.23858 0 3 2.23858 3 5V13C3 15.7614 5.23858 18 8 18C10.7614 18 13 15.7614 13 13V5C13 2.23858 10.7614 0 8 0z"></path>
     <path d="M2 11.5882C2 11.0359 1.55228 10.5882 1 10.5882C0.44772 10.5882 0 11.0359 0 11.5882V13.647C0 17.4729 3.12354 20.4939 7 20.9425V22H5C4.44772 22 4 22.4477 4 23C4 23.5523 4.44772 24 5 24H11C11.5523 24 12 23.5523 12 23C12 22.4477 11.5523 22 11 22H9V20.9425C12.8765 20.4939 16 17.4729 16 13.647V11.5882C16 11.0359 15.5523 10.5882 15 10.5882C14.4477 10.5882 14 11.0359 14 11.5882V13.647C14 16.5143 11.4072 19 8 19C4.59282 19 2 16.5143 2 13.647V11.5882z"></path>
  </g>
  <g class="fab-plus" style="${ withMic ? 'display: none;' : ''}">
    <path fill="#1D5D8E" class="fill-primary" d="M284.77 214.24c-51.86,0 -94.05,-42.19 -94.05,-94.05 0,-51.86 42.19,-94.05 94.05,-94.05 51.86,0 94.05,42.19 94.05,94.05 0,51.86 -42.19,94.05 -94.05,94.05zm0 -166.4c-39.89,0 -72.34,32.46 -72.34,72.35 0,39.89 32.45,72.34 72.34,72.34 39.89,0 72.35,-32.45 72.35,-72.34 0,-39.89 -32.46,-72.35 -72.35,-72.35z"/>
    <line fill="none" class="stroke-primary" stroke="#1D5D8E" stroke-width="21" stroke-linecap="round" stroke-miterlimit="22.9256" x1="284.77" y1="78.02" x2="284.77" y2= "162.36" />
    <line fill="none" class="stroke-primary" stroke="#1D5D8E" stroke-width="21" stroke-linecap="round" stroke-miterlimit="22.9256" x1="242.6" y1="120.19" x2="326.94" y2= "120.19" />
  </g>
<!--  <path fill="none" stroke="#1D5D8E" class="stroke-primary" stroke-width="21" stroke-linecap="round" stroke-miterlimit="22.9256" d="M47.71 170.9c0,-62.23 46.12,-114.83 107.82,-122.96"/>-->
<!--  <path fill="none" stroke="#1D5D8E" class="stroke-primary" stroke-width="21" stroke-linecap="round" stroke-miterlimit="22.9256" d="M10.5 170.9c0,-82.72 62.61,-152.02 144.9,-160.4"/>-->
  </g>
</svg>`;

const fabStyles = `
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes fabFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .fab-root {
    --fab-foreground: #C1DBED;
    --fab-primary: #1D5D8E;
    --collapsed-opacity: 1;
    
    position: fixed;
    right: calc(0px + env(safe-area-inset-right, 0px));
    top: 50%;
    transform: translateY(-50%);
    z-index: ${DEFAULT_Z_INDEX};
    pointer-events: none;
    transition: opacity 0.6s ease;
    opacity: 0;
  }
  
  @media (prefers-color-scheme: dark) {
      .fab-root{
        --collapsed-opacity: 0.8;
      }
  }
  
  .fill-foreground{
    fill: var(--fab-foreground);
  }
  .fill-primary{
    fill: var(--fab-primary);
  }
  .stroke-primary{
    stroke: var(--fab-primary);
  }

  /* Левая сторона */
  .fab-root.fab-left {
    right: auto;
    left: calc(0px + env(safe-area-inset-left, 0px));
  }

  /* Анимация прилипания */
  .fab-root.snapping {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Состояние перетаскивания */
  .fab-root.dragging {
    transition: none !important;
    will-change: transform, top;
  }

  /* Скрываем крестик при перетаскивании */
  .fab-root.dragging .fab-close {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* Визуальная подсказка прилипания */
  .fab-root.will-snap-left .fab-btn,
  .fab-root.will-snap-right .fab-btn {
    opacity: 0.7;
  }

  /* Смонтированное состояние */
  .fab-root.mounted {
    animation: fabFadeIn 0.3s ease;
    opacity: 1;
  }

  .fab-root.mounted-welcome {
    opacity: 0;
  }

  /* Бездействие */
  .fab-root.mounted.idle {
    opacity: 0 !important;
    transition: opacity 0.6s ease;
  }

  .fab-root.mounted:not(.idle):hover {
    opacity: 1;
  }

  /* Кнопка закрытия */
  .fab-close {
    position: absolute;
    top: -6px;
    left: -6px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.8);
    border: none;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    z-index: 1;
  }

  /* Крестик справа когда FAB слева */
  .fab-root.fab-left .fab-close {
    left: auto;
    right: -6px;
  }

  .fab-root:hover .fab-close {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }

  .fab-close:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  .fab-close svg {
    width: 100%;
    height: 100%;
    transform: scale(3);
    transform-origin: center;
  }

  /* Свернутое состояние */
  .fab-root.collapsed .fab-btn {
    width: 19px;
    border-radius: 5px 0 0 5px;
    opacity: var(--collapsed-opacity);
    transform: translateX(6px);
  }
  
  .fab-root.fab-left.collapsed .fab-btn {
    border-radius: 0 5px 5px 0;
    transform: translateX(-6px);
  }

  .fab-root.collapsed .fab-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -20px;
    width: 38px;
    height: 100%;
    pointer-events: auto;
  }

  .fab-root.collapsed .fab-btn:hover {
    width: 22px;
    transform: translateX(4px);
    opacity: 1;
  }

  .fab-root.fab-left.collapsed .fab-btn:hover {
    transform: translateX(-4px);
  }

  .fab-root.collapsed .fab-icon,
  .fab-root.collapsed .fab-close {
    display: none;
  }

  /* Стрелка для свернутого состояния */
  .fab-arrow {
    display: none;
    width: 10px;
    height: 16px;
    color: var(--fab-primary);
    transform: scale(2);
    transform-origin: center;
    margin-right: 5px;
  }

  .fab-root.fab-left .fab-arrow {
    transform: scale(2) rotate(180deg);
    margin-right: 0;
    margin-left: 5px;
  }

  .fab-root.collapsed .fab-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab-arrow svg {
    width: 100%;
    height: 100%;
    stroke-width: 2.5;
  }

  /* Основная кнопка */
  .fab-btn {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 40px;
    border: none;
    color: var(--fab-primary);
    background: var(--fab-foreground);
    border-radius: 12px 0 0 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    cursor: pointer;
    user-select: none;
    padding: 0;
    font: 600 16px/1 system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif;
    transform: translateX(0);
    transition: opacity .2s ease, box-shadow .2s ease, filter .2s ease, transform .06s ease, background .2s ease;
    backdrop-filter: saturate(1.1) blur(0px);
  }

  .fab-root.fab-left .fab-btn {
    border-radius: 0 12px 12px 0;
  }

  .fab-btn:hover {
    box-shadow: 0 12px 32px rgba(0,0,0,.35);
    filter: saturate(1.15);
  }
  
  .fab-btn:hover .fill-foreground{
    fill: #ffe6ac;
  }
  
  .fab-btn:hover svg{
     /* transform: scale(1.1)*/
  }

  .fab-btn:active { transform: scale(.96); }

  .fab-btn:focus-visible {
    outline: 2px solid rgba(255,255,255,.95);
    outline-offset: -2px;
  }

  .fab-icon {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fab-icon svg {
    margin-top: -2px;
    height: 100%;
    width: 100%;
    flex: 0 0 max-content;
    transition: all .2s ease;
  }

  .dragging .fab-btn { cursor: grabbing; }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 1px, 1px);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .fab-btn { transition: none; }
  }
`;

// ==================== АНИМАЦИИ ДЛЯ WELCOME ====================
const welcomeAnimations = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideInBounce {
    0% {
      opacity: 0;
      transform: translateX(30px) scale(0.95);
    }
    60% {
      opacity: 1;
      transform: translateX(-5px) scale(1.02);
    }
    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  @keyframes ripple {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(3);
      opacity: 0;
    }
  }
  @keyframes fabPulse {
    0%, 100% {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 20px rgba(29, 93, 142, .4);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 40px rgba(29, 93, 142, .6);
      transform: scale(1.05);
    }
  }
`;

// ==================== КЛАСС ДЛЯ ХРАНЕНИЯ НАСТРОЕК ====================
class FabStorage {
    constructor() {
        this.defaults = {
            fabTopPercent: DEFAULT_POSITION_PERCENT,
            fabCollapsed: false,
            fabSide: "right",
            fabVoiceMode: false
        };
    }

    async getPosition() {
        return this.get("fabTopPercent");
    }

    async getCollapsed() {
        return this.get("fabCollapsed");
    }

    async getSide() {
        return this.get("fabSide");
    }

    async setPosition(value) {
        await this.set({ fabTopPercent: value });
    }

    async setCollapsed(value) {
        await this.set({ fabCollapsed: value });
    }

    async setSide(value) {
        await this.set({ fabSide: value });
    }

    async getVoiceMode() {
        return this.get('fabVoiceMode');
    }

    async setVoiceMode(value) {
        await this.set({ fabVoiceMode: value });
    }

    async getAll() {
        return new Promise(resolve => {
            try {
                browser.storage.local.get(this.defaults, result => {
                    resolve(result);
                });
            } catch {
                resolve(this.defaults);
            }
        });
    }

    async get(key) {
        return new Promise(resolve => {
            try {
                browser.storage.local.get({ [key]: this.defaults[key] }, result => {
                    resolve(result[key]);
                });
            } catch {
                resolve(this.defaults[key]);
            }
        });
    }

    async set(data) {
        try {
            await browser.storage.local.set(data);
        } catch {
            // Игнорируем ошибки
        }
    }
}

// ==================== ДЕТЕКТОР БЕЗДЕЙСТВИЯ ====================
class IdleDetector {
    constructor(element, isWelcomePage = false) {
        this.timer = null;
        this.IDLE_TIMEOUT = 6000; // 6 секунд
        this.listeners = [];
        this.element = element;
        this.isWelcomePage = isWelcomePage;

        this.reset = () => {
            if (this.timer) clearTimeout(this.timer);
            this.element.classList.remove("idle");
            this.timer = setTimeout(() => {
                this.element.classList.add("idle");
            }, this.IDLE_TIMEOUT);
        };
    }

    start() {
        if (this.isWelcomePage) {
            this.element.classList.remove("idle");
            return;
        }
        this.reset();
        this.attachListeners();
    }

    stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.detachListeners();
        this.element.classList.remove("idle");
    }

    attachListeners() {
        ["pointermove", "pointerdown", "wheel", "keydown"].forEach(eventType => {
            document.addEventListener(eventType, this.reset);
            this.listeners.push([eventType, this.reset]);
        });
    }

    detachListeners() {
        this.listeners.forEach(([eventType, handler]) => {
            document.removeEventListener(eventType, handler);
        });
        this.listeners = [];
    }

    destroy() {
        this.stop();
    }
}

// ==================== ОБРАБОТЧИК ПЕРЕТАСКИВАНИЯ ====================
class DragHandler {
    constructor(buttonElement, rootElement, storage, options = {}) {
        this.button = buttonElement;
        this.root = rootElement;
        this.storage = storage;
        this.options = options;

        this.dragging = false;
        this.startX = 0;
        this.startY = 0;
        this.startPercent = 50;
        this.startViewportHeight = 0;
        this.currentSide = "right";
        this.dragStartSide = "right";
        this.currentPointerId = null;
        this.rafId = null;
        this.lastMoveEvent = null;

        // Константы
        this.CLICK_SLOP = 6; // Минимальное движение для распознавания перетаскивания
        this.SNAP_THRESHOLD = 0.25; // 25% экрана - порог смены стороны
        this.FAB_WIDTH = 32; // Ширина кнопки

        // Привязываем методы
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handlePointerCancel = this.handlePointerCancel.bind(this);

        this.attachListeners();
    }

    handlePointerDown(event) {
        if (event.button !== 0) return; // Только левая кнопка мыши

        this.cleanupDragListeners();
        this.button.setPointerCapture(event.pointerId);
        this.currentPointerId = event.pointerId;
        this.dragging = true;
        this.root.classList.add("dragging");

        this.startX = event.clientX;
        this.startY = event.clientY;
        this.dragStartSide = this.currentSide;
        this.startViewportHeight = window.innerHeight || 600;

        // Получаем текущую позицию в процентах
        const currentTopStyle = this.root.style.top;
        if (currentTopStyle && currentTopStyle.includes("%")) {
            this.startPercent = parseFloat(currentTopStyle);
        } else {
            const computedTop = parseFloat(getComputedStyle(this.root).top);
            const topInPixels = isNaN(computedTop) ? this.startViewportHeight / 2 : computedTop;
            this.startPercent = (topInPixels / this.startViewportHeight) * 100;
        }

        document.addEventListener("pointermove", this.handlePointerMove, { passive: false });
        document.addEventListener("pointerup", this.handlePointerUp);
        document.addEventListener("pointercancel", this.handlePointerCancel);

        if (this.options.onDragStart) this.options.onDragStart();
        event.preventDefault();
    }

    handlePointerMove(event) {
        if (!this.dragging || event.pointerId !== this.currentPointerId) return;

        const deltaX = event.clientX - this.startX;
        const deltaY = event.clientY - this.startY;
        event.preventDefault();

        this.lastMoveEvent = { deltaX, deltaY };

        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(() => {
                this.rafId = null;
                if (!this.lastMoveEvent) return;

                const { deltaX, deltaY } = this.lastMoveEvent;

                // Рассчитываем новую позицию в процентах
                const newTopPercent = (this.startPercent / 100 * this.startViewportHeight + deltaY) / this.startViewportHeight * 100;
                const clampedTop = this.clamp(newTopPercent, 5, 95);

                this.root.style.top = `${clampedTop}%`;
                this.root.style.transform = `translateY(-50%) translateX(${deltaX}px)`;

                // Визуальная подсказка, к какой стороне прилипнет
                if (this.calculateSnapSide(this.dragStartSide, deltaX) === "left") {
                    this.root.classList.add("will-snap-left");
                    this.root.classList.remove("will-snap-right");
                } else {
                    this.root.classList.add("will-snap-right");
                    this.root.classList.remove("will-snap-left");
                }
            });
        }
    }

    handlePointerUp(event) {
        if (!this.dragging || event.pointerId !== this.currentPointerId) return;

        this.cleanupDragListeners();

        if (this.currentPointerId !== null) {
            try {
                this.button.releasePointerCapture(this.currentPointerId);
            } catch { }
        }

        this.root.classList.remove("dragging", "will-snap-left", "will-snap-right");

        const deltaX = event.clientX - this.startX;
        const deltaY = event.clientY - this.startY;
        const wasDragged = Math.abs(deltaX) > this.CLICK_SLOP || Math.abs(deltaY) > this.CLICK_SLOP;

        this.dragging = false;
        this.currentPointerId = null;

        if (wasDragged) {
            // Было перетаскивание - прилипаем
            const finalTopInPixels = this.startPercent / 100 * this.startViewportHeight + deltaY;
            const finalTopPercent = this.clamp(finalTopInPixels / this.startViewportHeight * 100, 5, 95);
            const snapSide = this.calculateSnapSide(this.dragStartSide, deltaX);

            this.root.style.transform = "translateY(-50%)";
            this.root.classList.add("snapping");

            if (snapSide !== this.currentSide) {
                this.setSide(snapSide);
            }

            this.setTopPercent(finalTopPercent);

            setTimeout(() => {
                this.root.classList.remove("snapping");
            }, 300);
        } else {
            // Был клик - сворачиваем/разворачиваем
            this.root.style.transform = "translateY(-50%)";

            if (this.root.classList.contains("collapsed")) {
                this.root.classList.remove("collapsed");
                this.storage.setCollapsed(false).catch(() => {});
            } else {
                if (this.options.onClick) this.options.onClick();
            }
        }

        if (this.options.onDragEnd) this.options.onDragEnd(wasDragged);
    }

    handlePointerCancel(event) {
        if (!this.dragging || event.pointerId !== this.currentPointerId) return;

        this.cleanupDragListeners();

        if (this.currentPointerId !== null) {
            try {
                this.button.releasePointerCapture(this.currentPointerId);
            } catch { }
        }

        this.root.classList.remove("dragging", "will-snap-left", "will-snap-right");
        this.root.style.transform = "translateY(-50%)";
        this.dragging = false;
        this.currentPointerId = null;

        if (this.options.onDragEnd) this.options.onDragEnd(false);
    }

    setTopPercent(value) {
        value = this.clamp(value, 5, 95);
        this.root.style.top = `${value}%`;
        this.storage.setPosition(value).catch(() => {});
        if (this.options.onPositionChange) this.options.onPositionChange(value, this.currentSide);
    }

    setSide(side) {
        this.currentSide = side;
        this.storage.setSide(side).catch(() => {});
        if (this.options.onSideChange) this.options.onSideChange(side);
    }

    async initialize() {
        const side = await this.storage.getSide();
        this.currentSide = side;
        if (this.options.onSideChange) this.options.onSideChange(side);
    }

    getTopPercent() {
        const top = parseFloat(this.root.style.top);
        return isNaN(top) ? 50 : top;
    }

    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    calculateSnapSide(currentSide, deltaX) {
        const threshold = window.innerWidth * this.SNAP_THRESHOLD;

        if (currentSide === "left") {
            // Если были слева и перетащили вправо больше порога - прилипаем к правой
            return deltaX > threshold ? "right" : "left";
        } else {
            // Если были справа и перетащили влево больше порога - прилипаем к левой
            return deltaX < -threshold ? "left" : "right";
        }
    }

    attachListeners() {
        this.button.addEventListener("pointerdown", this.handlePointerDown);
    }

    cleanupDragListeners() {
        document.removeEventListener("pointermove", this.handlePointerMove, { passive: false });
        document.removeEventListener("pointerup", this.handlePointerUp);
        document.removeEventListener("pointercancel", this.handlePointerCancel);

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.lastMoveEvent = null;
    }

    destroy() {
        this.button.removeEventListener("pointerdown", this.handlePointerDown);
        this.cleanupDragListeners();
    }
}

// ==================== ОВЕРЛЕЙ ДЛЯ WELCOME PAGE ====================
class WelcomeOverlay {
    constructor(fabRoot) {
        this.overlayContainer = null;
        this.styleSheet = null;
        this.observer = null;
        this.resizeHandler = null;
        this.resizeTimeout = null;
        this.currentSide = "right";
        this.fabRoot = fabRoot;
    }

    show() {
        this.createOverlay();
        this.updateRipplePosition();
        setTimeout(() => this.showElements(), 50);
    }

    dismiss() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }

        if (this.resizeHandler) {
            window.removeEventListener("resize", this.resizeHandler);
            this.resizeHandler = null;
        }

        this.fabRoot.style.animation = "";

        if (this.overlayContainer) {
            this.overlayContainer.style.animation = "fadeIn 0.3s ease-in reverse";
            setTimeout(() => {
                if (this.overlayContainer) this.overlayContainer.remove();
                if (this.styleSheet) this.styleSheet.remove();
                this.overlayContainer = null;
                this.styleSheet = null;
            }, 300);
        }
    }

    isVisible() {
        return this.overlayContainer !== null;
    }

    hideRipples() {
        if (!this.overlayContainer) return;
        const ripple = this.overlayContainer.querySelector("div");
        if (ripple) ripple.style.opacity = "0";
    }

    showRipples() {
        if (!this.overlayContainer) return;
        const ripple = this.overlayContainer.querySelector("div");
        if (ripple) ripple.style.opacity = "1";
    }

    updateSide(side) {
        this.currentSide = side;
        this.updateRipplePosition();
    }

    createOverlay() {
        this.overlayContainer = document.createElement("div");
        this.overlayContainer.id = "fab-welcome-overlay";
        this.overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483646;
      pointer-events: none;
      animation: fadeIn 0.4s ease-in;
    `;

        const ripple = this.createRippleEffect();
        this.overlayContainer.appendChild(ripple);

        this.styleSheet = document.createElement("style");
        this.styleSheet.textContent = welcomeAnimations;
        document.head.appendChild(this.styleSheet);

        document.body.appendChild(this.overlayContainer);
        this.fabRoot.style.animation = "fabPulse 2s ease-in-out infinite";

        this.observer = new MutationObserver(() => {
            this.updateRipplePosition();
        });
        this.observer.observe(this.fabRoot, { attributes: true, attributeFilter: ["style"] });

        this.resizeHandler = () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = window.setTimeout(() => {
                this.updateRipplePosition();
            }, 50);
        };
        window.addEventListener("resize", this.resizeHandler);
    }

    createRippleEffect() {
        const container = document.createElement("div");
        container.style.cssText = `
      position: fixed;
      width: 60px;
      height: 60px;
      pointer-events: none;
      z-index: 2147483645;
      opacity: 0;
      transition: opacity 0.4s ease;
      will-change: opacity;
    `;

        for (let i = 0; i < 3; i++) {
            const ripple = document.createElement("div");
            ripple.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        border: 2px solid rgba(29, 93, 142, .6);
        border-radius: 50%;
        animation: ripple 3s ease-out ${i * 1}s infinite;
      `;
            container.appendChild(ripple);
        }

        return container;
    }

    updateRipplePosition() {
        if (!this.overlayContainer) return;

        const ripple = this.overlayContainer.querySelector("div");
        if (!ripple) return;

        const topPercent = parseFloat(this.fabRoot.style.top) || 50;
        const viewportHeight = window.innerHeight;
        const topInPixels = (topPercent * viewportHeight) / 100;

        ripple.style.top = `${topInPixels - 30}px`;

        if (this.currentSide === "left") {
            ripple.style.left = "-14px";
            ripple.style.right = "auto";
        } else {
            ripple.style.right = "-14px";
            ripple.style.left = "auto";
        }
    }

    showElements() {
        if (!this.overlayContainer) return;
        const ripple = this.overlayContainer.querySelector("div");
        this.fabRoot.style.opacity = "1";
        if (ripple) ripple.style.opacity = "1";
    }
}

// ==================== МЕНЕДЖЕР Z-INDEX ====================
class ZIndexManager {
    constructor(element) {
        this.element = element;
    }

    start() {
        this.element.style.zIndex = String(DEFAULT_Z_INDEX);
    }

    forceToTop() { }

    destroy() { }
}

// ==================== МЕССЕНДЖЕР ДЛЯ WELCOME PAGE ====================
class WelcomeMessenger {
    constructor(isEnabled) {
        this.isEnabled = isEnabled;
        this.messageHandler = null;
    }

    startListening(getFabState) {
        if (!this.isEnabled) return;

        this.messageHandler = (event) => {
            if (this.isValidQuery(event) && event.data.action === "QUERY_FAB_STATE") {
                const state = getFabState();
                this.sendStateResponse(state.side, state.topPercent);
            }
        };

        window.addEventListener("message", this.messageHandler);
    }

    stopListening() {
        if (this.messageHandler) {
            window.removeEventListener("message", this.messageHandler);
            this.messageHandler = undefined;
        }
    }

    sendFabReady(side, topPercent) {
        this.postMessage({ action: "SAR__FAB_READY", side, topPercent, defaultPercent: DEFAULT_POSITION_PERCENT });
    }

    sendFabClicked() {
        this.postMessage({ action: "SAR__FAB_CLICKED" });
    }

    sendSideChanged(side, topPercent) {
        // this.postMessage({ action: "SAR__FAB_SIDE_CHANGED", side, topPercent, defaultPercent: DEFAULT_POSITION_PERCENT });
    }

    sendPositionChanged(side, topPercent) {
        this.postMessage({ action: "SAR__FAB_POSITION_CHANGED", side, topPercent, defaultPercent: DEFAULT_POSITION_PERCENT });
    }

    sendStateResponse(side, topPercent) {
        this.postMessage({ action: "SAR__FAB_STATE_RESPONSE", side, topPercent, defaultPercent: DEFAULT_POSITION_PERCENT });
    }

    postMessage(data) {
        if (!this.isEnabled) return;
        window.postMessage({
            ...data,
            source: "fab-extension",
            timestamp: Date.now()
        }, window.location.origin);
    }

    isValidQuery(event) {
        if (event.origin !== window.location.origin) return false;
        const data = event.data;
        return !!(data && typeof data === "object" &&
            data.source === "fab-welcome-page" &&
            data.action === "QUERY_FAB_STATE");
    }
}


export class FloatingFab {
    constructor(options = {}) {
        this.welcomeOverlay = null;
        this.currentSide = "right";
        this.options = options;
        this.storage = new FabStorage();

        // Создаем хост
        this.host = this.createHost();
        this.shadow = this.host.attachShadow({ mode: "open" });

        // Создаем UI
        const { root, button, closeButton } = this.createUI();
        this.root = root;
        this.button = button;
        this.closeButton = closeButton;

        // Инициализируем компоненты
        this.idleDetector = new IdleDetector(this.root, this.options.isWelcomePage);
        this.dragHandler = new DragHandler(this.button, this.root, this.storage, {
            onClick: () => this.handleButtonClick(),
            onSideChange: (side) => this.handleSideChange(side),
            onPositionChange: (percent, side) => this.handlePositionChange(percent, side),
            onDragStart: () => this.handleDragStart(),
            onDragEnd: () => this.handleDragEnd()
        });

        this.zIndexManager = new ZIndexManager(this.host);
        this.welcomeMessenger = new WelcomeMessenger(this.options.isWelcomePage || false);

        // Для welcome page
        if (this.options.isWelcomePage) {
            this.welcomeOverlay = new WelcomeOverlay(this.root);
        }

        // Обработчики событий
        this.closeHandler = (event) => this.handleCloseClick(event);
        this.closeButton.addEventListener("click", this.closeHandler);

        if (this.options.isWelcomePage) {
            this.messageHandler = (event) => this.handleMessage(event);
            window.addEventListener("message", this.messageHandler);
        }

        this.welcomeMessenger.startListening(() => ({
            side: this.currentSide,
            topPercent: this.dragHandler.getTopPercent()
        }));
    }

    async init() {
        await this.mount();
        console.log('initFabFunc');

        return this;
    }

    createHost() {
        const host = document.createElement("div");
        host.id = FAB_HOST_ID;
        host.style.position = "fixed";
        host.style.top = "0";
        host.style.right = "0";
        host.style.width = "0";
        host.style.height = "0";
        host.style.zIndex = DEFAULT_Z_INDEX.toString();
        host.style.pointerEvents = "none";
        host.style.overflow = "hidden";
        host.style.background = "transparent";
        host.style.border = "none";
        host.style.outline = "none";
        host.style.boxShadow = "none";
        host.style.opacity = "1";
        host.style.margin = "0";
        host.style.padding = "0";
        return host;
    }

    createUI() {
        const style = document.createElement("style");
        style.textContent = fabStyles;

        const root = document.createElement("div");
        root.className = "fab-root";

        const closeButton = this.createCloseButton();
        const mainButton = this.createMainButton();

        root.appendChild(closeButton);
        root.appendChild(mainButton);

        this.shadow.append(style, root);

        return { root, button: mainButton, closeButton };
    }

    createCloseButton() {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fab-close";
        button.setAttribute("aria-label", "Close FAB");
        button.title = "Close";
        button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
        return button;
    }

    createMainButton() {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "fab-btn";
        button.setAttribute("aria-label", "Open");
        button.title = "Open";

        const icon = document.createElement("div");
        icon.className = "fab-icon";
        icon.innerHTML = fabIconSvg();

        const arrow = document.createElement("div");
        arrow.className = "fab-arrow";
        arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6 L8 12 L16 18 Z" /></svg>`;

        const srText = document.createElement("span");
        srText.className = "sr-only";
        srText.textContent = "Open";

        button.append(icon, arrow, srText);
        return button;
    }

    async mount() {
        (document.documentElement || document.body).appendChild(this.host);

        const settings = await this.storage.getAll();
        this.mountAt(settings.fabTopPercent);
        await this.initializeDragHandler(settings.fabSide);

        if (settings.fabCollapsed) {
            this.root.classList.add("collapsed");
        }

        const voiceMode = !! await this.storage.getVoiceMode();
        const plusEl = this.root.querySelector('.fab-plus');
        const micEl = this.root.querySelector('.fab-mic');
        
        if (plusEl){
            plusEl.style.display = voiceMode ? "none" : "block";
        }

        if (micEl){
            micEl.style.display = voiceMode ? "block" : "none";
        }
        
        await this.startOptionalFeatures();
    }

    async initializeDragHandler(savedSide) {
        try {
            await this.dragHandler.initialize();
        } catch {
            this.currentSide = savedSide;
            this.handleSideChange(savedSide);
        }
    }

    async startOptionalFeatures() {
        try {
            this.idleDetector.start();
        } catch { }

        try {
            this.zIndexManager.start();
        } catch { }

        if (this.welcomeOverlay) {
            try {
                this.welcomeOverlay.updateSide(this.currentSide);
                this.welcomeOverlay.show();
                this.welcomeMessenger.sendFabReady(this.currentSide, this.dragHandler.getTopPercent());
            } catch { }
        }
    }

    mountAt(positionPercent) {
        if (typeof positionPercent !== "number" || Number.isNaN(positionPercent)) {
            positionPercent = DEFAULT_POSITION_PERCENT;
        }

        this.dragHandler.setTopPercent(positionPercent);

        if (this.options.isWelcomePage) {
            this.root.classList.add("mounted-welcome");
        } else {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.root.classList.add("mounted");
                });
            });
        }
    }

    async handleCloseClick(event) {
        event.stopPropagation();
        this.root.classList.add("collapsed");
        try {
            await this.storage.setCollapsed(true);
        } catch {
            await this.retrySetCollapsed();
        }
    }

    async retrySetCollapsed() {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.storage.setCollapsed(true);
        } catch { }
    }

    handleButtonClick() {
        if (this.welcomeOverlay?.isVisible()) {
            this.welcomeOverlay.dismiss();
        }
        this.welcomeMessenger.sendFabClicked();
        this.zIndexManager.forceToTop();
        if (this.options.onButtonClick) this.options.onButtonClick();
    }

    show() {
        this.host.style.display = "";
        if (this.options.isWelcomePage && this.welcomeOverlay?.isVisible()) {
            this.welcomeOverlay.showRipples();
        }
    }

    hide() {
        this.host.style.display = "none";
        if (this.welcomeOverlay?.isVisible()) {
            this.welcomeOverlay.hideRipples();
        }
    }

    handleSideChange(side) {
        this.currentSide = side;
        if (side === "left") {
            this.root.classList.add("fab-left");
        } else {
            this.root.classList.remove("fab-left");
        }

        if (this.welcomeOverlay?.isVisible()) {
            this.welcomeOverlay.updateSide(side);
        }

        this.welcomeMessenger.sendSideChanged(side, this.dragHandler.getTopPercent());
    }

    handlePositionChange(percent, side) {
        this.welcomeMessenger.sendPositionChanged(side, percent);
    }

    handleDragStart() {
        if (this.welcomeOverlay?.isVisible()) {
            this.welcomeOverlay.hideRipples();
        }
    }

    handleDragEnd() {
        if (this.welcomeOverlay?.isVisible()) {
            this.welcomeOverlay.showRipples();
        }
    }

    isValidMessage(event) {
        if (event.origin !== window.location.origin) return false;
        const data = event.data;
        if (!data || typeof data !== "object" || data.source !== "fab-extension") return false;
        const validTypes = ["DISMISS_WELCOME_OVERLAY", "SHOW_WELCOME_OVERLAY"];
        return typeof data.action === "string" && validTypes.includes(data.action);
    }

    handleMessage(event) {
        if (!this.isValidMessage(event)) return;
        const data = event.data;

        if (data.action === "DISMISS_WELCOME_OVERLAY" && this.welcomeOverlay?.isVisible()) {
            this.welcomeOverlay.dismiss();
        }

        if (data.action === "SHOW_WELCOME_OVERLAY" && this.welcomeOverlay && !this.welcomeOverlay.isVisible()) {
            this.welcomeOverlay.updateSide(this.currentSide);
            this.welcomeOverlay.show();
        }
    }

    destroy() {
        try {
            if (this.closeHandler) {
                this.closeButton.removeEventListener("click", this.closeHandler);
            }
        } catch { }

        try {
            if (this.messageHandler) {
                window.removeEventListener("message", this.messageHandler);
            }
        } catch { }

        try {
            this.welcomeMessenger.stopListening();
        } catch { }

        try {
            this.idleDetector.destroy();
        } catch { }

        try {
            this.dragHandler.destroy();
        } catch { }

        try {
            this.zIndexManager.destroy();
        } catch { }

        try {
            this.welcomeOverlay?.dismiss();
        } catch { }

        try {
            this.host.remove();
        } catch { }
    }

    static run() {
        // Запускаем только в главном окне, не в iframe
        if (window !== window.top) return;

        // Очищаем старый экземпляр если есть
        document.dispatchEvent(new CustomEvent("FAB_CLEANUP"));
        const oldHost = document.getElementById(FAB_HOST_ID);
        if (oldHost) oldHost.remove();

        const isWelcomePage = (() => {
            const { hostname, pathname } = window.location;
            return pathname.startsWith("/welcome")
                // && (hostname === "localhost" || hostname === "127.0.0.1")
                && window.location.protocol === 'chrome-extension:' && window.location.hostname === browser.runtime.id
        })();


        let fabInstance = null;
        let isPanelOpen = false;
        let isFabEnabled = true;
        let visibilityChangeHandler = null;
        let isQuerying = false;
        let queryTimeout = null;

        // СОХРАНЯЕМ ССЫЛКУ НА СЛУШАТЕЛЬ ДЛЯ ВОЗМОЖНОСТИ УДАЛЕНИЯ
        let messageListener = null;

        // Функция проверки состояния панели
        const queryPanelState = () => {
            if (isQuerying) return;
            isQuerying = true;

            const timeout = setTimeout(() => {
                isQuerying = false;
            }, 1000);

            try {
                browser.runtime.sendMessage({ action: "SAR__CHECK_OPEN_PANEL" }, response => {
                    clearTimeout(timeout);
                    isQuerying = false;

                    if (browser.runtime.lastError) return;

                    isPanelOpen = response?.success && response?.isOpen || false;

                    if (!isPanelOpen && isFabEnabled) {
                        fabInstance?.show();
                    } else {
                        fabInstance?.hide();
                    }
                });
            } catch {
                clearTimeout(timeout);
                isQuerying = false;
            }
        };

        // Настройка обработчика видимости страницы
        const setupVisibilityHandler = () => {
            if (visibilityChangeHandler) {
                document.removeEventListener("visibilitychange", visibilityChangeHandler);
            }

            visibilityChangeHandler = () => {
                if (document.hidden) return;

                if (queryTimeout) {
                    clearTimeout(queryTimeout);
                    queryTimeout = null;
                }

                queryTimeout = setTimeout(() => {
                    queryPanelState();
                    queryTimeout = null;
                }, 250);
            };

            document.addEventListener("visibilitychange", visibilityChangeHandler);
        };

        const cleanupVisibilityHandler = () => {
            if (queryTimeout) {
                clearTimeout(queryTimeout);
                queryTimeout = null;
            }

            if (visibilityChangeHandler) {
                document.removeEventListener("visibilitychange", visibilityChangeHandler);
                visibilityChangeHandler = null;
            }
        };

        // Обработчик очистки
        const cleanupHandler = () => {
            cleanupVisibilityHandler();

            // УДАЛЯЕМ СЛУШАТЕЛЬ ПРИ ОЧИСТКЕ
            if (messageListener && browser.runtime) {
                browser.runtime.onMessage.removeListener(messageListener);
                messageListener = null;
            }

            fabInstance?.destroy();
            fabInstance = null;
            document.removeEventListener("FAB_CLEANUP", cleanupHandler);
        };

        document.addEventListener("FAB_CLEANUP", cleanupHandler);
        window.addEventListener("beforeunload", cleanupVisibilityHandler);

        // РЕГИСТРИРУЕМ СЛУШАТЕЛЬ СРАЗУ, ДО ВСЕХ АСИНХРОННЫХ ОПЕРАЦИЙ
        messageListener = (message, sender, sendResponse) => {
            console.log('Message received in FAB:', message);

            // PING для проверки активности
            if (message.action === "PING_FAB") {
                sendResponse({ success: true, message: "FAB is active" });
                return false; // Синхронный ответ
            }

            // Переинициализация
            if (message.action === "SAR__REINIT_FAB") {
                (async () => {
                    console.log('SAR__REINIT_FAB')

                    try {
                        cleanupVisibilityHandler();

                        fabInstance?.destroy();
                        fabInstance = null;
                        isPanelOpen = false;

                        fabInstance = await new FloatingFab({
                            isWelcomePage: isWelcomePage,
                            onButtonClick: () => {
                                try {
                                    browser.runtime.sendMessage({ action: "SAR__OPEN_FROM_FAB" });
                                } catch { }
                            }
                        }).init();

                        // setupVisibilityHandler(); //отключил по отсутствию необходимости
                        queryPanelState();

                        sendResponse({ success: true, message: "FAB reinitialized" });
                    } catch (error) {
                        console.error('Reinit error:', error);
                        sendResponse({ success: false, error: "Failed to reinitialize FAB" });
                    }
                })();
                return true; // ВАЖНО: возвращаем true для асинхронного ответа
            }

            // Скрыть FAB когда панель открыта
            if (message.action === "HIDE_FAB_PANEL_OPEN") {
                isPanelOpen = true;
                fabInstance?.hide();
                sendResponse({ success: true });
                return false;
            }

            // Показать FAB когда панель закрыта
            if (message.action === "SHOW_FAB_PANEL_CLOSED") {
                isPanelOpen = false;
                if (isFabEnabled) {
                    fabInstance?.show();
                }
                sendResponse({ success: true });
                return false;
            }

            // Установка видимости FAB
            if (message.action === "SET_FAB_VISIBILITY") {
                isFabEnabled = message.visible;
                if (!isPanelOpen) {
                    if (isFabEnabled) {
                        fabInstance?.show();
                    } else {
                        fabInstance?.hide();
                    }
                }
                sendResponse({ success: true });
                return false;
            }

            return false;
        };

        // РЕГИСТРИРУЕМ СЛУШАТЕЛЬ СРАЗУ
        try{
            browser.runtime.onMessage.addListener(messageListener);
            console.log('Message listener registered');

        } catch (error) {
            
        }
        // Инициализация при загрузке
        browser.storage && browser.storage.local.get(["fabVisible"], async (result) => {
            isFabEnabled = result.fabVisible !== undefined ? result.fabVisible : true;

            try {
                fabInstance = await new FloatingFab({
                    isWelcomePage: isWelcomePage,
                    onButtonClick: () => {
                        try {
                            browser.runtime.sendMessage({ action: "SAR__OPEN_FROM_FAB" });
                        } catch { }
                    }
                }).init();

                queryPanelState();
                // setupVisibilityHandler();//отключил по отсутствию необходимости
            } catch (error) {
                console.error('FAB init error:', error);
                return;
            }
        });
    }
}