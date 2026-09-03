/* =========================================
   Event Presentation Slot - SF6 VER
========================================= */

const dataManagers = ['芳村', '大森'];
const dataPresenters = [
  '小嶋', '中和田', '荒木', '松谷', 
  '深野', '國利', '矢澤', '小林'
];
const dataAgencies = [
  '秋田ケーブルテレビ',
  '株式会社ビューフォート',
  '株式会社山田養蜂場',
  'アプロス株式会社'
];

const dataJudges = ['藪', '山内', '佐藤', '修作'];

let usedPresenters = JSON.parse(localStorage.getItem('slot_used_presenters')) || [];
let usedAgencies = (JSON.parse(localStorage.getItem('slot_used_agencies')) || []).filter(a => dataAgencies.includes(a));
let usedJudges = JSON.parse(localStorage.getItem('slot_used_judges')) || [];

let audioCtx;
function getAudioCtx() {
  if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTick() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.05);
  } catch(e) {}
}

function playWin() {
  try {
    const ctx = getAudioCtx();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.5);
      }, i * 100);
    });
  } catch(e) {}
}

function shootConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = []; const colors = ['#00ffff', '#ff00ff', '#ffffff'];
  for(let i=0; i<150; i++) {
    particles.push({
      x: canvas.width / 2, y: canvas.height / 2 + 100,
      r: Math.random() * 8 + 4, dx: Math.random() * 30 - 15, dy: Math.random() * -20 - 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10, tiltAngle: 0, tiltAngleInc: (Math.random() * 0.07) + 0.05
    });
  }
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleInc; p.y += (Math.cos(p.tiltAngle) + 1 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle) * 2; p.dy += 0.2; p.x += p.dx; p.y += p.dy;
      if (p.y <= canvas.height) active = true;
      ctx.beginPath(); ctx.lineWidth = p.r; ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r, p.y); ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r); ctx.stroke();
    });
    if(active) requestAnimationFrame(render); else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  render();
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class Slot {
  constructor(elementId, data, type) {
    this.reel = document.getElementById(elementId);
    this.baseData = data;
    this.type = type; 
    this.totalItems = 0;
    this.itemHeight = 0;
    this.initReel();
  }

  initReel() {
    this.reel.innerHTML = '';
    this.reel.style.transition = 'none';
    this.reel.style.transform = `translateY(0px)`;
    
    let fullData = [];
    for (let i = 0; i < 150; i++) fullData = fullData.concat(shuffleArray(this.baseData));
    this.totalItems = fullData.length;
    
    fullData.forEach(text => {
      const div = document.createElement('div');
      if (this.type === 'person') {
        div.className = 'person-item';
        div.innerHTML = `<img src="${text}.png" onerror="this.style.opacity='0.1'"><div class="name-bg">${text}</div>`;
      } else if (this.type === 'person-sub') {
        div.className = 'person-item-sub';
        div.innerHTML = `<img src="${text}.png" onerror="this.style.opacity='0.1'"><div class="name-bg">${text}</div>`;
      } else {
        div.className = 'agency-item';
        div.textContent = text;
      }
      this.reel.appendChild(div);
    });
  }

  startSpin() {
    this.itemHeight = this.reel.firstElementChild.getBoundingClientRect().height;
    this.reel.style.transition = 'none';
    this.reel.style.transform = `translateY(0px)`;
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const farIndex = this.totalItems - 10;
        const targetY = -(farIndex * this.itemHeight);
        this.reel.style.transition = `transform 100s linear`;
        this.reel.style.transform = `translateY(${targetY}px)`;
      });
    });
  }

  stopSpin(duration, forceTargetText) {
    return new Promise((resolve) => {
      const style = window.getComputedStyle(this.reel);
      const transformString = style.transform;
      let currentY = 0;
      if (transformString !== 'none') {
        const matrix = new DOMMatrixReadOnly(transformString);
        currentY = matrix.m42;
      }
      
      this.reel.style.transition = 'none';
      this.reel.style.transform = `translateY(${currentY}px)`;
      this.reel.offsetHeight; 
      
      const currentIndex = Math.floor(Math.abs(currentY) / this.itemHeight);
      let targetIndex = currentIndex + 8; 
      
      while (targetIndex < this.totalItems - 1) {
        let text = (this.type.includes('person')) ? this.reel.children[targetIndex].querySelector('.name-bg').textContent : this.reel.children[targetIndex].textContent;
        if (text === forceTargetText) break;
        targetIndex++;
      }
      
      const finalY = -(targetIndex * this.itemHeight);
      this.reel.style.transition = `transform ${duration}ms cubic-bezier(0.1, 0.9, 0.2, 1)`;
      this.reel.style.transform = `translateY(${finalY}px)`;
      
      setTimeout(() => {
        let selectedText = (this.type.includes('person')) ? this.reel.children[targetIndex].querySelector('.name-bg').textContent : this.reel.children[targetIndex].textContent;
        resolve(selectedText);
      }, duration);
    });
  }
}

let slotManager, slotMainAttacker, slotSubAttacker, slotAgency;
let isWaitingForStop = false; 
let globalTickInterval = null; 
let judgeInterval = null;

let battleTimerInterval = null;
let strategyTimerInterval = null;
let battleP1Hp = 100;
let battleP2Hp = 100;

let p1LagTimer = null;
let p2LagTimer = null;
function updateBattleHpHud({instantLag = false} = {}) {
  const p1Bar = document.getElementById('p1-hp-bar');
  const p2Bar = document.getElementById('p2-hp-bar');
  const p1Lag = document.getElementById('p1-hp-lag');
  const p2Lag = document.getElementById('p2-hp-lag');
  const p1Value = document.getElementById('p1-hp-value');
  const p2Value = document.getElementById('p2-hp-value');
  if (p1Bar) p1Bar.style.width = battleP1Hp + '%';
  if (p2Bar) p2Bar.style.width = battleP2Hp + '%';
  if (p1Value) p1Value.textContent = `${battleP1Hp} / 100`;
  if (p2Value) p2Value.textContent = `${battleP2Hp} / 100`;

  clearTimeout(p1LagTimer); clearTimeout(p2LagTimer);
  const lagDelay = instantLag ? 0 : 360;
  p1LagTimer = setTimeout(() => { if (p1Lag) p1Lag.style.width = battleP1Hp + '%'; }, lagDelay);
  p2LagTimer = setTimeout(() => { if (p2Lag) p2Lag.style.width = battleP2Hp + '%'; }, lagDelay);
}

function showDamageNumber(side, damage) {
  const wrapper = document.querySelector(side === 'left' ? '.left-hp' : '.right-hp');
  if (!wrapper) return;
  const pop = document.createElement('div');
  pop.className = `damage-pop ${side === 'left' ? 'damage-pop-left' : 'damage-pop-right'} ${damage >= 50 ? 'is-critical' : damage >= 30 ? 'is-heavy' : ''}`;
  pop.textContent = `-${damage}`;
  wrapper.appendChild(pop);
  requestAnimationFrame(() => pop.classList.add('is-showing'));
  setTimeout(() => pop.remove(), 780);
}

function premiumHitFeedback(side, damage) {
  const fighter = document.getElementById(side === 'left' ? 'fighter-1p' : 'fighter-2p');
  if (!fighter) return;
  fighter.classList.remove('fighter-hit', 'fighter-hit-heavy');
  void fighter.offsetWidth;
  fighter.classList.add(damage >= 30 ? 'fighter-hit-heavy' : 'fighter-hit');
  showDamageNumber(side, damage);
  setTimeout(() => fighter.classList.remove('fighter-hit', 'fighter-hit-heavy'), damage >= 30 ? 360 : 240);
}
let isBattleActive = false;

let koTimeout = null;
let challengerBackTimeout = null;

let managerWinner, mainWinner, subWinner, agencyWinner, judgeWinner;

let currentJudgeNodes = [];
let currentLightIndex = 0;

const vegetables = [
  'はくさい.png', 'トマト.png', 'かぼちゃ.png', 'れんこん.png',
  'パプリカ.png', 'にんじん.png', 'ほうれんそう.png'
];

function renderAgencyStatus() {
  const list = document.getElementById('agency-status-list');
  if (!list) return;
  list.innerHTML = '';
  dataAgencies.forEach(name => {
    const item = document.createElement('div');
    item.className = 'agency-status-item' + (usedAgencies.includes(name) ? ' is-used' : '');
    item.textContent = name;
    list.appendChild(item);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const iconGridTop = document.getElementById('icon-grid-top');
  const iconGridBottom = document.getElementById('icon-grid-bottom');
  const judgeGrid = document.getElementById('judge-grid');

  dataManagers.forEach(name => {
    const div = document.createElement('div');
    div.className = 'grid-item';
    div.innerHTML = `<img src="${name}.png" onerror="this.style.opacity='0.2'"><div class="name-label">${name}</div>`;
    iconGridTop.appendChild(div);
  });

  dataPresenters.forEach(name => {
    const div = document.createElement('div');
    div.className = 'grid-item';
    div.innerHTML = `
      <img src="${name}.png" onerror="this.style.opacity='0.2'">
      <div class="eliminated-marker"><img src="バツ.png" alt="eliminated"></div>
      <div class="name-label">${name}</div>
    `;
    if (usedPresenters.includes(name)) {
      div.classList.add('is-eliminated');
    }
    iconGridBottom.appendChild(div);
  });

  dataJudges.forEach(name => {
    const div = document.createElement('div');
    div.className = 'judge-item';
    div.dataset.name = name;
    div.innerHTML = `
      <img src="${name}.png" onerror="this.style.opacity='0.2'">
      <div class="eliminated-marker"><img src="バツ.png" alt="eliminated"></div>
      <div class="name-label">${name}</div>
    `;
    if (usedJudges.includes(name)) {
      div.classList.add('is-eliminated');
    }
    judgeGrid.appendChild(div);
  });

  renderAgencyStatus();

  slotManager = new Slot('reel-manager', dataManagers, 'person');
  slotMainAttacker = new Slot('reel-main-attacker', dataPresenters, 'person');
  slotSubAttacker = new Slot('reel-sub-attacker', dataPresenters, 'person-sub');
  slotAgency = new Slot('reel-agency', dataAgencies, 'agency');

  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const resetBtn = document.getElementById('reset-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const bgmBtn = document.getElementById('bgm-btn');
  const masterVolumeSlider = document.getElementById('master-volume');
  const masterVolumeValue = document.getElementById('master-volume-value');
  
  const bgmAudio = document.getElementById('bgm-audio');
  const fightSe = document.getElementById('fight-se');
  const clashSe = document.getElementById('clash-se');
  
  const round1Se = document.getElementById('round1-se');
  const fight2Se = document.getElementById('fight2-se');
  const koSe = document.getElementById('ko-se');
  const uwaSe = document.getElementById('uwa-se');
  const challengerSe = document.getElementById('challenger-se');
  const kamehamehaSe = document.getElementById('kamehameha-se');
  const strategySe = document.getElementById('strategy-se');
  
  const SELECT_BGM_VOLUME = 0.15;
  const BATTLE_BGM_VOLUME = 0.04;
  let battleBgmMode = false;
  let masterVolume = Math.max(0, Math.min(1, Number(localStorage.getItem('rpg-master-volume') ?? '1')));
  let volumeBeforeMute = masterVolume > 0 ? masterVolume : 0.5;
  let isBgmPlaying = false;

  const baseSeVolumes = new Map([
    [round1Se,1],[fight2Se,1],[koSe,1],[uwaSe,1],[challengerSe,1],[kamehamehaSe,1],[strategySe,1],[fightSe,1],[clashSe,1]
  ].filter(([audio]) => !!audio));

  const applyMasterVolume = () => {
    if (bgmAudio) bgmAudio.volume = (battleBgmMode ? BATTLE_BGM_VOLUME : SELECT_BGM_VOLUME) * masterVolume;
    baseSeVolumes.forEach((base,audio)=>{ audio.volume = base * masterVolume; });
    if (masterVolumeSlider) masterVolumeSlider.value = String(Math.round(masterVolume*100));
    if (masterVolumeValue) masterVolumeValue.textContent = `${Math.round(masterVolume*100)}%`;
    if (bgmBtn) {
      bgmBtn.textContent = masterVolume === 0 ? '🔇' : masterVolume < .45 ? '🔉' : '🔊';
      bgmBtn.style.color = masterVolume === 0 ? 'rgba(255,255,255,0.3)' : '#fff';
    }
  };
  const setMasterVolume = (v) => {
    masterVolume = Math.max(0, Math.min(1, v));
    if (masterVolume > 0) volumeBeforeMute = masterVolume;
    localStorage.setItem('rpg-master-volume', String(masterVolume));
    applyMasterVolume();
  };
  if (masterVolumeSlider) masterVolumeSlider.addEventListener('input',(e)=>{
    setMasterVolume(Number(e.target.value)/100);
    if (!isBgmPlaying && masterVolume > 0) bgmAudio.play().then(()=>{isBgmPlaying=true;applyMasterVolume();}).catch(()=>{});
  });
  applyMasterVolume();

  const attemptPlayBgm = () => {
    if (!isBgmPlaying) {
      applyMasterVolume(); 
      bgmAudio.play().then(() => {
        bgmBtn.textContent = '🔊';
        bgmBtn.style.color = '#fff';
        isBgmPlaying = true;
      }).catch(e => {
        console.log("自動再生待機中...");
      });
    }
  };

  attemptPlayBgm();
  document.addEventListener('click', attemptPlayBgm, { once: true });
  document.addEventListener('keydown', attemptPlayBgm, { once: true });

  bgmBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (masterVolume > 0) { volumeBeforeMute = masterVolume; setMasterVolume(0); }
    else {
      setMasterVolume(volumeBeforeMute || 0.5);
      if (!isBgmPlaying) bgmAudio.play().then(()=>{isBgmPlaying=true;applyMasterVolume();}).catch(e=>console.error(e));
    }
  });

  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      document.exitFullscreen();
    }
  });

  function triggerKO() {
    isBattleActive = false;
    if (battleTimerInterval) clearInterval(battleTimerInterval);

    const fightText = document.getElementById('fight-text');
    const roundText = document.getElementById('round-text');
    
    fightText.textContent = "K.O.";
    fightText.classList.remove('anim-fight');
    roundText.classList.remove('anim-round');
    
    void fightText.offsetWidth; 
    fightText.classList.add('anim-ko'); 
    
    if (uwaSe) {
      uwaSe.currentTime = 0;
      uwaSe.play().catch(e => {});
    }

    koTimeout = setTimeout(() => {
      if (koSe) {
        koSe.currentTime = 0;
        koSe.play().catch(e => {});
      }
      
      setTimeout(() => {
        document.getElementById('challenger-wrapper').classList.remove('d-none');
      }, 1000);
      
    }, 800);
  }

  document.getElementById('challenger-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (challengerSe) {
      challengerSe.currentTime = 0;
      challengerSe.play().catch(e => {});
    }
    
    document.getElementById('challenger-wrapper').classList.add('d-none');
    
    challengerBackTimeout = setTimeout(() => {
      document.getElementById('back-select-btn').click();
    }, 3500);
  });


  function executeAttack(attackerType, damage, projectileSrc) {
    if (!isBattleActive || battleP1Hp <= 0 || battleP2Hp <= 0) return;

    const isKame = projectileSrc.includes('かめはめ波');
    let delayBeforeShoot = 0;
    if (isKame) {
      if (kamehamehaSe) {
        kamehamehaSe.currentTime = 0;
        kamehamehaSe.play().catch(e => {});
      }
      delayBeforeShoot = 1850;
    }

    setTimeout(() => {
      if (!isBattleActive) return;

      // V3: draw the attack itself in Three.js instead of flying a flat PNG.
      const duration = window.BattleArena3D?.attack(projectileSrc, attackerType, damage) || 0;

      // Fallback only when WebGL/Three.js is unavailable.
      if (!duration) {
        const projImg = document.createElement('img');
        const fallbackProjectileSrc = /\.[a-z0-9]+$/i.test(projectileSrc) ? projectileSrc : `${projectileSrc}.png`;
        projImg.src = fallbackProjectileSrc;
        projImg.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;object-fit:contain;filter:drop-shadow(0 0 18px rgba(255,255,255,.6));';
        const startRect = document.getElementById(attackerType === 1 ? 'fighter-1p' : 'fighter-2p').getBoundingClientRect();
        const targetRect = document.getElementById(attackerType === 1 ? 'fighter-2p' : 'fighter-1p').getBoundingClientRect();
        projImg.style.width = isKame ? '58vw' : (projectileSrc.includes('車') ? '210px' : '135px');
        projImg.style.left = (startRect.left + startRect.width/2) + 'px';
        projImg.style.top = (startRect.top + startRect.height/2) + 'px';
        document.body.appendChild(projImg);
        requestAnimationFrame(()=>{projImg.style.transition='all .55s cubic-bezier(.15,.8,.2,1)';projImg.style.left=(targetRect.left+targetRect.width/2)+'px';projImg.style.top=(targetRect.top+targetRect.height/2)+'px';});
        setTimeout(()=>projImg.remove(),650);
      }

      const impactDelay = duration || 650;
      setTimeout(() => {
        if (!isBattleActive) return;
        if (clashSe) {
          baseSeVolumes.set(clashSe,0.8); applyMasterVolume();
          clashSe.currentTime = 0;
          clashSe.play().catch(e => {});
        }

        if (attackerType === 1) {
          battleP2Hp = Math.max(0, battleP2Hp - damage);
          updateBattleHpHud();
          premiumHitFeedback('right', damage);
        } else {
          battleP1Hp = Math.max(0, battleP1Hp - damage);
          updateBattleHpHud();
          premiumHitFeedback('left', damage);
        }
        if (battleP1Hp === 0 || battleP2Hp === 0) triggerKO();
      }, impactDelay);
    }, delayBeforeShoot);
  }

  document.querySelectorAll('.p1-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const damage = parseInt(e.target.getAttribute('data-damage'));
      const projectile = e.target.getAttribute('data-projectile');
      executeAttack(1, damage, projectile);
    });
  });

  document.querySelectorAll('.p2-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const damage = parseInt(e.target.getAttribute('data-damage'));
      const projectile = e.target.getAttribute('data-projectile');
      executeAttack(2, damage, projectile);
    });
  });

  document.getElementById('veg-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isBattleActive || battleP1Hp <= 0 || battleP2Hp <= 0) return;

    const vegImg = document.createElement('img');
    const randomVeg = vegetables[Math.floor(Math.random() * vegetables.length)];
    vegImg.src = randomVeg;
    vegImg.style.position = 'fixed';
    vegImg.style.width = '100px';
    vegImg.style.height = '100px';
    vegImg.style.objectFit = 'contain';
    vegImg.style.zIndex = '9999';
    vegImg.style.pointerEvents = 'none';
    vegImg.style.transition = 'all 0.4s ease-in';
    vegImg.style.filter = 'drop-shadow(0 0 10px rgba(0,255,0,0.8))';

    const subRect = document.getElementById('battle-sub-img').getBoundingClientRect();
    vegImg.style.left = subRect.left + 'px';
    vegImg.style.top = subRect.top + 'px';
    vegImg.style.transform = 'rotate(0deg)';

    document.body.appendChild(vegImg);

    setTimeout(() => {
      const targetRect = document.getElementById('fighter-1p').getBoundingClientRect();
      const targetX = targetRect.left + (targetRect.width / 2) - 50; 
      const targetY = targetRect.top + (targetRect.height / 2) - 50;

      vegImg.style.left = targetX + 'px';
      vegImg.style.top = targetY + 'px';
      vegImg.style.transform = 'rotate(720deg) scale(1.5)';
    }, 20);

    setTimeout(() => {
      vegImg.remove();
      
      if (clashSe) {
        baseSeVolumes.set(clashSe,0.4); applyMasterVolume();
        clashSe.currentTime = 0;
        clashSe.play().catch(e => {});
      }
      
      battleP1Hp -= 3;
      if (battleP1Hp < 0) battleP1Hp = 0;
      updateBattleHpHud();
      window.BattleArena3D?.hit('left', 3);
      premiumHitFeedback('left', 3);
      
      const p1Fighter = document.getElementById('fighter-1p');
      p1Fighter.style.filter = 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)';
      setTimeout(() => { p1Fighter.style.filter = ''; }, 150);

      if (battleP1Hp === 0) {
        triggerKO();
      }
    }, 420);
  });

  startBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    const currentAvailablePresenters = dataPresenters.filter(p => !usedPresenters.includes(p));
    const currentAvailableAgencies = dataAgencies.filter(a => !usedAgencies.includes(a));
    const currentAvailableJudges = dataJudges.filter(j => !usedJudges.includes(j));

    if (currentAvailablePresenters.length < 2) {
        alert('発表者の残りが2名未満です。RESETボタンから履歴をクリアしてください。');
        return;
    }
    if (currentAvailableAgencies.length === 0) {
        alert('すべての代理店が選出されました。RESETボタンから履歴をクリアしてください。');
        return;
    }
    if (currentAvailableJudges.length === 0) {
        alert('すべての審査員が選出されました。RESETボタンから履歴をクリアしてください。');
        return;
    }

    isWaitingForStop = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    if (fightSe) {
      fightSe.currentTime = 0; 
      fightSe.play().catch(e => console.error(e));
    }
    if (!isBgmPlaying) {
      battleBgmMode = false;
      applyMasterVolume();
      bgmAudio.play().catch(e => console.error(e));
      bgmBtn.textContent = '🔊';
      bgmBtn.style.color = '#fff';
      isBgmPlaying = true;
    }

    document.querySelectorAll('.initial-hatena').forEach(el => {
      el.style.opacity = '0';
      setTimeout(() => el.style.display = 'none', 300);
    });

    document.getElementById('reel-manager').style.opacity = '1';
    document.getElementById('reel-main-attacker').style.opacity = '1';
    document.getElementById('reel-sub-attacker').style.opacity = '1';

    const gridItems = document.getElementById('icon-grid-bottom').children;
    let delay = 0;
    for (let item of gridItems) {
      const itemName = item.querySelector('.name-label').textContent;
      if (usedPresenters.includes(itemName) && !item.classList.contains('is-eliminated')) {
        setTimeout(() => { item.classList.add('is-eliminated'); }, delay);
        delay += 400; 
      }
    }

    const shuffledPresenters = shuffleArray(currentAvailablePresenters);
    mainWinner = shuffledPresenters[0];
    subWinner = shuffledPresenters[1];
    agencyWinner = currentAvailableAgencies[Math.floor(Math.random() * currentAvailableAgencies.length)];
    managerWinner = dataManagers[Math.floor(Math.random() * dataManagers.length)];
    judgeWinner = currentAvailableJudges[Math.floor(Math.random() * currentAvailableJudges.length)];

    currentJudgeNodes = Array.from(document.querySelectorAll('.judge-item')).filter(node => !node.classList.contains('is-eliminated'));
    currentLightIndex = 0;
    
    if (currentJudgeNodes.length > 0) {
      judgeInterval = setInterval(() => {
          currentJudgeNodes.forEach(n => n.classList.remove('is-active', 'is-winner'));
          currentJudgeNodes[currentLightIndex].classList.add('is-active');
          currentLightIndex = (currentLightIndex + 1) % currentJudgeNodes.length;
      }, 100);
    }

    slotManager.initReel();
    slotMainAttacker.initReel();
    slotSubAttacker.initReel();
    slotAgency.baseData = currentAvailableAgencies;
    slotAgency.initReel();

    slotManager.startSpin();
    slotMainAttacker.startSpin();
    slotSubAttacker.startSpin();
    slotAgency.startSpin();

    globalTickInterval = setInterval(playTick, 100);
  });

  stopBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!isWaitingForStop) return; 
    
    isWaitingForStop = false;
    stopBtn.disabled = true; 

    if (judgeInterval) {
        clearInterval(judgeInterval);
        
        const winnerNode = document.querySelector(`.judge-item[data-name="${judgeWinner}"]`);
        const winnerIdx = currentJudgeNodes.indexOf(winnerNode);

        if (winnerIdx !== -1) {
            let currentDelay = 100; 
            let extraSpins = 2 * currentJudgeNodes.length; 
            let stepsLeft = extraSpins + ((winnerIdx - currentLightIndex + currentJudgeNodes.length) % currentJudgeNodes.length);

            function doRouletteStep() {
                currentJudgeNodes.forEach(n => n.classList.remove('is-active'));
                currentJudgeNodes[currentLightIndex].classList.add('is-active');

                if (stepsLeft > 0) {
                    stepsLeft--;
                    currentLightIndex = (currentLightIndex + 1) % currentJudgeNodes.length;
                    currentDelay += 30; 
                    setTimeout(doRouletteStep, currentDelay);
                } else {
                    currentJudgeNodes.forEach(n => n.classList.remove('is-active'));
                    winnerNode.classList.add('is-active', 'is-winner'); 
                }
            }
            doRouletteStep();
        }
    }

    const p1 = slotManager.stopSpin(2000, managerWinner); 
    const p2 = slotMainAttacker.stopSpin(3500, mainWinner); 
    const p3 = slotSubAttacker.stopSpin(4500, subWinner); 
    const p4 = slotAgency.stopSpin(5500, agencyWinner); 

    setTimeout(() => { clearInterval(globalTickInterval); }, 5000);

    const results = await Promise.all([p1, p2, p3, p4]);
    
    // 🌟 VS画面とバトル画面の「審査員」の情報をセット
    document.getElementById('splash-judge-img').src = judgeWinner + '.png';
    document.getElementById('splash-judge-name').textContent = judgeWinner;
    document.getElementById('battle-judge-img').src = judgeWinner + '.png';
    document.getElementById('battle-judge-name').textContent = judgeWinner;

    const splashOverlay = document.getElementById('vs-splash-overlay');
    document.getElementById('splash-left-img').src = results[0] + '.png';
    document.getElementById('splash-left-name').textContent = results[0];
    document.getElementById('splash-right-img').src = results[1] + '.png';
    document.getElementById('splash-right-name').textContent = results[1];
    document.getElementById('splash-sub-img').src = results[2] + '.png';
    document.getElementById('splash-sub-name').textContent = results[2];

    splashOverlay.classList.add('is-active');
    
    if (clashSe) { baseSeVolumes.set(clashSe,1.0); applyMasterVolume(); }

    requestAnimationFrame(() => {
      splashOverlay.classList.add('is-animating');
      setTimeout(() => {
        if (clashSe) {
          clashSe.currentTime = 0; 
          clashSe.play().catch(e => {});
        }
      }, 200);
    });

    setTimeout(() => {
      splashOverlay.classList.remove('is-active', 'is-animating');
      
      document.getElementById('select-screen').classList.add('d-none');
      const battleScreen = document.getElementById('battle-screen');
      battleScreen.classList.remove('d-none');
      
      document.getElementById('battle-p1-img').src = results[0] + '.png'; 
      document.getElementById('battle-p1-name').textContent = results[0];
      
      document.getElementById('battle-p2-img').src = results[1] + '.png'; 
      document.getElementById('battle-p2-name').textContent = results[1];
      
      document.getElementById('battle-sub-img').src = results[2] + '.png';
      document.getElementById('battle-sub-name').textContent = results[2];
      document.getElementById('battle-agency-label').textContent = results[3];
      
      let timeLeft = 600;
      battleP1Hp = 100;
      battleP2Hp = 100;
      isBattleActive = false; 

      document.getElementById('battle-timer').textContent = timeLeft;
      updateBattleHpHud();
      window.BattleArena3D?.show();

      if (battleTimerInterval) clearInterval(battleTimerInterval);
      if (strategyTimerInterval) clearInterval(strategyTimerInterval);

      const roundText = document.getElementById('round-text');
      const fightText = document.getElementById('fight-text');
      
      fightText.textContent = "FIGHT!!";
      fightText.style.color = "#ff003c";
      fightText.classList.remove('anim-ko');
      
      roundText.classList.remove('anim-round');
      fightText.classList.remove('anim-fight');
      void roundText.offsetWidth; 

      const strategyOverlay = document.getElementById('strategy-overlay');
      const strategyTimerEl = document.getElementById('strategy-timer');
      strategyOverlay.classList.remove('d-none');
      let strategyTime = 60;
      strategyTimerEl.textContent = strategyTime;

      if (strategySe) {
        strategySe.currentTime = 0;
        strategySe.play().catch(e => {});
        
        let boost1 = new Audio(strategySe.src);
        let boost2 = new Audio(strategySe.src);
        boost1.play().catch(e=>{});
        boost2.play().catch(e=>{});

        let prevVol = bgmAudio.volume;
        bgmAudio.volume = 0.02; 
        setTimeout(() => {
            if (isBgmPlaying) bgmAudio.volume = prevVol;
        }, 2500); 
      }

      const startRoundOne = () => {
          if (strategyTimerInterval) clearInterval(strategyTimerInterval);
          strategyOverlay.classList.add('d-none');
          battleBgmMode = true;
          applyMasterVolume();

          roundText.classList.add('anim-round');
          fightText.classList.add('anim-fight');

          if (round1Se) {
            round1Se.currentTime = 0;
            round1Se.play().catch(e => {});
          }

          setTimeout(() => {
              if(fight2Se) {
                  fight2Se.currentTime = 0;
                  fight2Se.play().catch(e=> {});
              }
          }, 1500);

          setTimeout(() => {
            isBattleActive = true;

            battleTimerInterval = setInterval(() => {
              if(!isBattleActive) return; 
              timeLeft--;
              if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(battleTimerInterval);
              }
              document.getElementById('battle-timer').textContent = timeLeft;
            }, 1000);

          }, 2500);
      };

      strategyTimerInterval = setInterval(() => {
          strategyTime--;
          if (strategyTime <= 0) {
              startRoundOne();
          } else {
              strategyTimerEl.textContent = strategyTime;
          }
      }, 1000);

      document.getElementById('skip-strategy-btn').onclick = () => {
          startRoundOne();
      };
      
      usedPresenters.push(results[1], results[2]);
      localStorage.setItem('slot_used_presenters', JSON.stringify(usedPresenters));
      usedAgencies.push(results[3]);
      localStorage.setItem('slot_used_agencies', JSON.stringify(usedAgencies));
      renderAgencyStatus();
      
      usedJudges.push(judgeWinner);
      localStorage.setItem('slot_used_judges', JSON.stringify(usedJudges));
      
    }, 3500);
  });

  document.getElementById('back-select-btn').addEventListener('click', () => {
    if (battleTimerInterval) clearInterval(battleTimerInterval);
    if (strategyTimerInterval) clearInterval(strategyTimerInterval);
    
    if (koTimeout) clearTimeout(koTimeout);
    if (challengerBackTimeout) clearTimeout(challengerBackTimeout);

    isBattleActive = false;
    
    if (clashSe) { baseSeVolumes.set(clashSe,1.0); applyMasterVolume(); }

    window.BattleArena3D?.hide();
    document.getElementById('battle-screen').classList.add('d-none');
    document.getElementById('strategy-overlay').classList.add('d-none'); 
    
    document.getElementById('challenger-wrapper').classList.add('d-none');
    
    document.getElementById('select-screen').classList.remove('d-none');
    battleBgmMode = false;
    applyMasterVolume();
    
    const gridItems = document.getElementById('icon-grid-bottom').children;
    let delay = 500; 
    for (let item of gridItems) {
      const itemName = item.querySelector('.name-label').textContent;
      if (usedPresenters.includes(itemName) && !item.classList.contains('is-eliminated')) {
        setTimeout(() => { item.classList.add('is-eliminated'); }, delay);
        delay += 400; 
      }
    }

    const judgeItems = document.getElementById('judge-grid').children;
    let judgeDelay = 500;
    for (let item of judgeItems) {
      const itemName = item.querySelector('.name-label').textContent;
      if (usedJudges.includes(itemName) && !item.classList.contains('is-eliminated')) {
        setTimeout(() => { item.classList.add('is-eliminated'); }, judgeDelay);
        judgeDelay += 400;
      }
      item.classList.remove('is-active', 'is-winner');
    }

    document.getElementById('reel-manager').style.opacity = '0';
    document.getElementById('reel-main-attacker').style.opacity = '0';
    document.getElementById('reel-sub-attacker').style.opacity = '0';

    document.querySelectorAll('.initial-hatena').forEach(el => {
      el.style.display = 'flex';
      setTimeout(() => el.style.opacity = '1', 50);
    });
    
    startBtn.disabled = false;
  });

  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if(confirm('これまでの当選履歴をすべてクリアしますか？')) {
      localStorage.removeItem('slot_used_presenters');
      localStorage.removeItem('slot_used_agencies');
      localStorage.removeItem('slot_used_judges');
      usedPresenters = [];
      usedAgencies = [];
      usedJudges = [];
      renderAgencyStatus();
      
      slotMainAttacker.baseData = dataPresenters;
      slotSubAttacker.baseData = dataPresenters;
      slotAgency.baseData = dataAgencies;
      slotMainAttacker.initReel();
      slotSubAttacker.initReel();
      slotAgency.initReel();
      
      const gridItems = document.getElementById('icon-grid-bottom').children;
      for (let item of gridItems) {
        item.classList.remove('is-eliminated');
      }

      const judgeItemsReset = document.getElementById('judge-grid').children;
      for (let item of judgeItemsReset) {
        item.classList.remove('is-eliminated', 'is-active', 'is-winner');
      }

      document.getElementById('reel-manager').style.opacity = '0';
      document.getElementById('reel-main-attacker').style.opacity = '0';
      document.getElementById('reel-sub-attacker').style.opacity = '0';

      document.querySelectorAll('.initial-hatena').forEach(el => {
        el.style.display = 'flex';
        setTimeout(() => el.style.opacity = '1', 50);
      });
      alert('履歴をクリアしました。全員が再び当たるようになりました。');
    }
  });
});