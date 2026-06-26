import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

import { Analytics } from '@vercel/analytics/react';
/* ============================================================
   CHIPTUNE BIRTHDAY MELODY — Web Audio API, no file needed
   ============================================================ */
  let _audioCtx = null;
  const getAudioCtx = () => {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _audioCtx;
  };

  const NOTE = {
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
    A4: 440.00, B4: 493.88, C5: 523.25,
  };

  const BIRTHDAY_MELODY = [
    [NOTE.C4, 0.75], [NOTE.C4, 0.25], [NOTE.D4, 1], [NOTE.C4, 1],
    [NOTE.F4, 1], [NOTE.E4, 2],
    [NOTE.C4, 0.75], [NOTE.C4, 0.25], [NOTE.D4, 1], [NOTE.C4, 1],
    [NOTE.G4, 1], [NOTE.F4, 2],
    [NOTE.C4, 0.75], [NOTE.C4, 0.25], [NOTE.C5, 1], [NOTE.A4, 1],
    [NOTE.F4, 1], [NOTE.E4, 1], [NOTE.D4, 2],
    [NOTE.A4, 0.75], [NOTE.A4, 0.25], [NOTE.F4, 1], [NOTE.G4, 1], [NOTE.F4, 2],
  ];

  let _melodyStopFns = [];

const playBirthdayMelody = ({ tempo = 105, volume = 0.18, loop = true } = {}) => {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const beatSeconds = 60 / tempo;
  let stopped = false;
  let activeOscillators = [];

    // Master gain — lets us fade the whole melody out smoothly
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);

    const scheduleSequence = (startTime) => {
      let t = startTime;
      BIRTHDAY_MELODY.forEach(([freq, beats]) => {
        const noteDuration = beats * beatSeconds;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.02);
        gain.gain.setValueAtTime(volume, t + noteDuration * 0.7);
        gain.gain.linearRampToValueAtTime(0, t + noteDuration * 0.95);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + noteDuration);

        activeOscillators.push(osc);
        t += noteDuration;
      });
      return t;
    };

    const totalDuration = BIRTHDAY_MELODY.reduce((sum, [, beats]) => sum + beats * beatSeconds, 0);

    const runLoop = (startTime) => {
      if (stopped) return;
      scheduleSequence(startTime);
      if (loop) {
        setTimeout(() => {
          if (!stopped) runLoop(ctx.currentTime + 0.05);
        }, (totalDuration - 0.1) * 1000);
      }
    };

    runLoop(ctx.currentTime + 0.05);

    const stopFn = ({ fadeMs = 0 } = {}) => {
      stopped = true;
      if (fadeMs > 0) {
        const now = ctx.currentTime;
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
        setTimeout(() => {
          activeOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) {}
          });
          activeOscillators = [];
        }, fadeMs);
      } else {
        activeOscillators.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
        activeOscillators = [];
      }
    };

    _melodyStopFns.push(stopFn);
    return stopFn;
  };

  const stopBirthdayMelody = (opts) => {
    _melodyStopFns.forEach(fn => fn(opts));
    _melodyStopFns = [];
  };

/* ============================================================
   FLOWER IMAGES
   ============================================================ */
const FLOWER_IMAGES = [
  '/flowers/777926535681510967-removebg-preview.png',
  '/flowers/Abstract_Red_Flower_Clipart__Watercolor_PNG_Graphics__Digital_Download_-removebg-preview.png',
  '/flowers/Download_premium_png_of_PNG_Crab_apple_blossoms_petals_illustration_elegant__by_Ning_about_pink_flower_png__transparent_pink_flowers__pink_flowers_watercolor__png__and_spring_png_17030251-removebg-preview.png',
  '/flowers/Dried_Flowers_PNG_Images___Free_PNG_Vector_Graphics__Effects___Backgrounds_-_rawpixel-removebg-preview.png',
  '/flowers/flower1-removebg-preview.png',
  '/flowers/Google_Search-removebg-preview.png',
  '/flowers/jpg_2_-removebg-preview.png',
  '/flowers/jpg_3_-removebg-preview.png',
  '/flowers/jpg_6_-removebg-preview.png',
  '/flowers/jpg_8_-removebg-preview.png',
  '/flowers/jpg_9_-removebg-preview.png',
  '/flowers/jpg_10_-removebg-preview.png',
  '/flowers/jpg_11_-removebg-preview.png',
  '/flowers/Kwiatuszek_dla_Ciebie_za_przeżycie_tego_tygodnia____-removebg-preview.png',
  '/flowers/Lily-removebg-preview.png',
  '/flowers/photo12.png',
  '/flowers/21.png',
  '/flowers/134.png',
  '/flowers/1111.png',
  '/flowers/123123.png',
  '/flowers/123123123.png',
];

/* ============================================================
   ASSET PRELOADING — eliminates background pop-in flash
   ============================================================ */
const STATIC_BACKGROUNDS = [
  '/photos/background_1.png',
  '/photos/background_2.png',
  '/photos/background_3.png',
  '/photos/cover8.png',
  '/photos/catw.png',
  '/photos/catzemer_red.png',
  '/photos/penguin-trip.gif',
  '/photos/morio.png',
  '/flowers/tempachi.png',
  '/flowers/cake.gif',
];

const PRELOAD_IMAGES = [...STATIC_BACKGROUNDS, ...FLOWER_IMAGES];

function usePreloadImages(urls) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (urls.length === 0) { setReady(true); return; }
    let cancelled = false;
    let count = 0;

    urls.forEach((src) => {
      const img = new Image();
      const markLoaded = () => {
        if (cancelled) return;
        count += 1;
        setLoadedCount(count);
        if (count >= urls.length) setReady(true);
      };
      img.onload = markLoaded;
      img.onerror = markLoaded; // a missing file shouldn't block the game forever
      img.src = src;
    });

    return () => { cancelled = true; };
  }, [urls]);

  return { loadedCount, total: urls.length, ready };
}

/* ============================================================
   TYPEWRITER HOOK
   ============================================================ */
function useTypewriter(text, speed = 38, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);

  return { displayed, done };
}

/* ============================================================
   TYPEWRITER COMPONENT
   ============================================================ */
const Typewriter = ({ text, speed = 38, className = '', onDone }) => {
  const { displayed, done } = useTypewriter(text, speed);

  useEffect(() => {
    if (done && onDone) onDone();
  }, [done, onDone]);

  return <span className={className}>{displayed}</span>;
};

/* ============================================================
   CONFETTI BURST
   ============================================================ */
const ConfettiBurst = ({ active }) => {
  if (!active) return null;
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: ['#ff4d6d','#ffd700','#a855f7','#22d3ee','#fb923c','#4ade80'][i % 6],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.6}s`,
    duration: `${1.2 + Math.random() * 1}s`,
    shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? '0' : '50%',
  }));

  return (
    <div className="particles-container" style={{ zIndex: 60 }}>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: '-20px',
            background: p.color,
            borderRadius: p.shape,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

/* ============================================================
   FLOATING SPARKLES
   ============================================================ */
const FloatingSparkles = ({ emojis = ['✨','⭐','💫'], count = 6 }) => {
  const items = Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: emojis[i % emojis.length],
    left: `${10 + (i / count) * 80}%`,
    bottom: `${2 + Math.random() * 15}%`,
    delay: `${i * 0.4}s`,
    duration: `${2 + Math.random() * 2}s`,
  }));

  return (
    <>
      {items.map(s => (
        <span
          key={s.id}
          className="sparkle"
          style={{
            left: s.left,
            bottom: s.bottom,
            animationDuration: s.duration,
            animationDelay: s.delay,
            zIndex: 2,
            position: 'absolute',
          }}
        >
          {s.emoji}
        </span>
      ))}
    </>
  );
};

/* ============================================================
   DATE BUTTONS — yes grows, no runs away
   ============================================================ */
  const DateButtons = ({ onYes, onNo, onYesClick }) => {
    const [noCount, setNoCount] = useState(0);
    const [noPos, setNoPos] = useState({ x: 0, y: 0 });

    const noLabels = ['NO', 'NO...', 'YOU WISH', 'TWIN STOP...', 'BOLLL', 'FINE... YES YOU\'RE MY FAVORITE'];
    const yesScale = 1 + noCount * 0.3;

    const handleNo = () => {
      if (onNo) onNo();
      const newCount = Math.min(noCount + 1, noLabels.length - 1);
      setNoCount(newCount);
      setNoPos({
        x: (Math.random() - 0.5) * 300,
        y: (Math.random() - 0.5) * 200,
      });
    };

    const handleYes = () => {
      if (onYesClick) onYesClick();
      onYes();
    };

    return (
      <div className="date-buttons-row">
        <button
          className="game-btn primary"
          onClick={handleYes}
          style={{
            transform: `scale(${yesScale})`,
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: 2,
          }}
        >
          YES 
        </button>

        <button
          className="game-btn"
          onClick={handleNo}
          style={{
            transform: `translate(${noPos.x}px, ${noPos.y}px)`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: 2,
            opacity: noCount >= noLabels.length - 1 ? 0.4 : 1,
            pointerEvents: noCount >= noLabels.length - 1 ? 'none' : 'all',
          }}
        >
          {noLabels[noCount]}
        </button>
      </div>
    );
  };

/* ============================================================
   CHARACTER SPRITE
   ============================================================ */
const CharacterSprite = ({ reacting = false }) => (
  <div className="sprite-zone pop-in">
    <img
      className={`sprite-img ${reacting ? 'react' : ''}`}
      src="/photos/morio.png"
      alt="Game character"
    />
    <div className="sprite-shadow" />
  </div>
);

/* ============================================================
   INTRO START BUTTON — mirrors typing completion externally
   ============================================================ */
const IntroStartButton = ({ text, onNext }) => {
  const { done } = useTypewriter(text, 60);
  if (!done) return null;
  return (
    <button className="dialogue-arrow intro-start-btn" onClick={onNext} aria-label="Continue">
      ▶  START
    </button>
  );
};

/* ============================================================
   DIALOGUE BOX
   ============================================================ */
  const DialogueBox = ({ speaker, text, speed, onNext, showArrow = true, onAllDone, children }) => {
    const { displayed, done } = useTypewriter(text || '', speed || 38);
    const firedRef = useRef(false);

    useEffect(() => {
      if (done && onAllDone && !firedRef.current) {
        firedRef.current = true;
        onAllDone();
      }
    }, [done, onAllDone]);

    return (
    <div className="dialogue-box">
      {speaker && <div className="speaker-plate">{speaker}</div>}
      <div className="dialogue-text-inner">
        {text ? displayed : children}
      </div>
      {showArrow && done && (
        <button className="dialogue-arrow" onClick={onNext} aria-label="Continue">
          ▶  START
        </button>
      )}
    </div>
  );
};

/* ============================================================
   PIXEL TERRAIN / CLOUDS
   ============================================================ */
const GrassGround = () => (
  <div className="terrain">
    <div className="ground-strip ground-grass" />
  </div>
);

const PixelClouds = ({ dark = false }) => (
  <div className="pixel-clouds">
    {[
      { w: 90, h: 36, top: '12%', left: '8%', opacity: 0.9 },
      { w: 60, h: 26, top: '20%', left: '55%', opacity: 0.7 },
      { w: 110, h: 40, top: '8%', left: '75%', opacity: 0.8 },
    ].map((c, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: c.top, left: c.left,
          width: c.w, height: c.h,
          background: dark ? 'rgba(100,70,130,0.4)' : `rgba(255,255,255,${c.opacity})`,
          borderRadius: '50px',
          imageRendering: 'pixelated',
          boxShadow: dark ? 'none' : `0 ${c.h * 0.5}px 0 ${c.w * 0.3}px ${dark ? 'rgba(100,70,130,0.3)' : 'rgba(255,255,255,0.7)'}`,
        }}
      />
    ))}
  </div>
);

/* ============================================================
   SCREEN FLASH / FADE
   ============================================================ */
const ScreenFlash = ({ active, color = 'white' }) => {
  if (!active) return null;
  return <div className="screen-flash" style={{ background: color }} />;
};

const FadeTransition = ({ phase }) => {
  if (!phase) return null;
  return <div className={`fade-overlay ${phase === 'in' ? 'fading-in' : 'fading-out'}`} />;
};

/* ============================================================
   STAR FIELD
   ============================================================ */
const StarField = () => {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 3,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${1.5 + Math.random() * 2}s`,
  }));

  return (
    <div className="star-field">
      {stars.map(s => (
        <div
          key={s.id}
          className="star-dot"
          style={{ width: s.size, height: s.size, top: s.top, left: s.left, animationDuration: s.duration, animationDelay: s.delay }}
        />
      ))}
    </div>
  );
};

/* ============================================================
   FLOWER CAKE SCREEN — Phase 1 of flower gift
   ============================================================ */
  const FlowerCakeScreen = ({ onDone, onBlow }) => {
  const [blowing, setBlowing] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);


  const handleBlow = () => {
    if (blowing) return;
    setBlowing(true);
    setShowSparkles(true);
    if (onBlow) onBlow();
    setTimeout(() => onDone(), 2000);
  };

  // Generate sparkle particles
  const sparkles = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * 360 + (Math.random() * 20 - 10);
    const distance = 40 + Math.random() * 80;
    const dx = Math.cos((angle * Math.PI) / 180) * distance;
    const dy = Math.sin((angle * Math.PI) / 180) * distance - 60; // bias upward
    const colors = ['#ffcc44', '#ff9922', '#ffee88', '#ff6600', '#fff0aa', '#ffffff'];
    return {
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 5,
      dx,
      dy,
      delay: Math.random() * 120,
      dur: 0.6 + Math.random() * 0.4,
    };
  });

  return (
    <div className="scene active scene-enter flower-cake-scene">

      {/* Candle snuff sparkle burst */}
      {showSparkles && (
        <div className="candle-sparkle-container">
          {sparkles.map(s => (
            <div
              key={s.id}
              className="candle-spark"
              style={{
                width: s.size,
                height: s.size,
                background: s.color,
                boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
                '--dx': `${s.dx}px`,
                '--dy': `${s.dy}px`,
                '--dur': `${s.dur}s`,
                animationDelay: `${s.delay}ms`,
              }}
            />
          ))}
        </div>
      )}


      {/* Cake + button */}
      {!blowing && (
        <>
          <div className="flower-cake-content">
            <img
              src="/flowers/cake.gif"
              alt="Birthday cake"
              className="flower-cake-img"
            />
            <button className="flower-blow-btn-dark" onClick={handleBlow}>
              🕯️ BLOW THE CANDLE
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================
   FLOWER BLOOM SCREEN — Phase 2, spiral animation
   ============================================================ */
/* ============================================================
   FLOWER BLOOM SCREEN — Phase 2, spiral animation
   ============================================================ */
const FlowerBloomScreen = ({ onDone }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const IS_MOBILE = W < 768;

    const centerX = W / 2;
    const centerY = H / 2;
    
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    const flowerSize = IS_MOBILE ? 85 : 130;
    const staggerMs = IS_MOBILE ? 70 : 55;
    const batchSize = 4;
    
    // ⚡ SLOWER INDIVIDUAL BLOOM TIME FOR SMOOTHNESS
    const bloomDur = 0.9;                   

    const spacing = flowerSize * 0.42; 
    const positions = [];
    
    let theta = 0;
    let radius = 0;
    let offScreenStreak = 0;
    const maxOffScreenStreak = 20; 

    while (radius < maxRadius) {
      const x = centerX + Math.cos(theta) * radius;
      const y = centerY + Math.sin(theta) * radius;
      
      const sz = flowerSize * 1.25;
      const margin = sz * 0.3; 
      const isOnScreen = x + margin > 0 && x - margin < W && y + margin > 0 && y - margin < H;

      if (isOnScreen) {
        positions.push({ x, y, angle: theta });
        offScreenStreak = 0;
      } else {
        offScreenStreak++;
        if (offScreenStreak >= maxOffScreenStreak) break;
      }

      const dTheta = flowerSize / (radius + spacing);
      theta += Math.max(dTheta, 0.15);
      radius = (theta / (2 * Math.PI)) * spacing;
    }

    const fragment = document.createDocumentFragment();
    const timers = [];
    const elements = [];
    let finishedAnimationsCount = 0;

    // Process in batches of `batchSize`
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      const batchIdx = Math.floor(i / batchSize);

      batch.forEach(({ x, y, angle }, j) => {
        const sz = flowerSize * (0.85 + Math.random() * 0.4);
        const rot = (angle * 180 / Math.PI) + Math.random() * 30 - 15;
        const src = FLOWER_IMAGES[Math.floor(Math.random() * FLOWER_IMAGES.length)];

        const el = document.createElement('div');
        el.style.cssText = `
          position: absolute;
          width: ${sz}px;
          height: ${sz}px;
          left: ${x - sz / 2}px;
          top: ${y - sz / 2}px;
          opacity: 0;
          transform: scale(0) rotate(${rot}deg);
          
          /* ⚡ SMOOTH OVERLAP TRANSITIONS ⚡ */
          transition: transform ${bloomDur}s cubic-bezier(0.25, 1, 0.5, 1),
                      opacity ${bloomDur * 0.8}s ease-out;
                      
          will-change: transform, opacity;
          z-index: ${i + j}; /* Keeps newer flowers on top */
          pointer-events: none;
        `;

        // 🛡️ ACCURATE DETECTOR: Triggers precisely when this specific flower finishes dropping
        el.addEventListener('animationend', (e) => {
          if (e.animationName === 'flowerDropStraight') {
            finishedAnimationsCount++;
            // Switch screens ONLY when the very last flower has cleared the screen
            if (finishedAnimationsCount >= elements.length) {
              if (typeof onDone === 'function') onDone();
            }
          }
        });

        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
        img.onerror = function() { this.style.display = 'none'; };
        el.appendChild(img);

        fragment.appendChild(el);
        elements.push(el);

        const tId = setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = `scale(1) rotate(${rot}deg)`;
        }, batchIdx * staggerMs);
        
        timers.push(tId);
      });
    }

    container.appendChild(fragment);

    // ========================================================
    // ⚡ DROP CONTROLLER (Stays static, then drops) ⚡
    // ========================================================
    const lastBatchIndex = Math.floor((positions.length - 1) / batchSize);
    const lastBatchTriggerTime = lastBatchIndex * staggerMs;
    const dropDelay = 1000; // Wait 1 full second after growth finishes

    const dropTriggerTimer = setTimeout(() => {
      elements.forEach((el) => {
        el.style.animationDelay = `${Math.random() * 0.12}s`; 
        el.classList.add('flower-fall-exit');
      });
    }, lastBatchTriggerTime + dropDelay);

    timers.push(dropTriggerTimer);

    return () => {
      timers.forEach(clearTimeout);
      elements.forEach(el => el.remove());
    };
  }, [onDone]);

  return (
    <div className="scene active flower-bloom-scene" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
    </div>
  );
};


/* ============================================================
   FLOWER LETTER SCREEN — Phase 3, final letter
   ============================================================ */
const FlowerLetterScreen = ({ onRestart }) => (
  <div className="scene active scene-enter flower-letter-scene">
    <div className="flower-letter-inner">
      <div className="flower-letter-card">
        <div className="flower-letter-body">
          <p>
            My dear Medina,
          </p>
          <p>
            My mind is always cluttered. Tasks, deadlines, things I told myself I'd finish two weeks ago. And yet, amidst this chaos, I find myself thinking of you.
          </p>
          <p>
            I think of you when i come across things that you would've loved.
          </p>
          <p>
            I think of you when I'm on a run and my heart rate hits somewhere it shouldn't, and instead of stopping I think about the times we had.
          </p>
          <p>
            I think of you when i achieve the things we once talked about. Bits and pieces of you are going to linger in me for a long time. Maybe forever.
          </p>
          <p>
            I suppose i think of you everyday. Not obsessively, not in the way that consumes me or keeps me from living my life, it is more like a passive thought. Something that passes through quietly, i will be in the middle of my day and suddenly wonder how you're doing, what you're up to, whether life has been kind to you.
          </p>
          <p>
            I have always wanted to tell you about my day and hear about yours…like we always did … even if you'd always complain that I never share anything. At times I find myself trying to do a lot of things I never used to do just to distract myself from my own thoughts. Sometimes I manage to ignore my thoughts completely and convince myself that I am too busy to feel. And it works. But sometimes it doesn't, and tbh i don't mind feeling the ache if it means i get to remember the moments we shared.
          </p>
          <p>
            I sometimes wonder if you miss me the way I miss you. I would like to imagine that sometimes when my heart aches bad, you feel it as well and you think of me.
          </p>
          <p>
            I hope you achieve every dream you've ever spoken about and every dream you've kept to yourself. I also really hope things get easier for you whether its your health or the moments you're not feeling the best. I will always keep you in my duas, there will always be a place for you in my heart.
          </p>
          <p>
            Gëzuar ditëlindjen, Medina.
          </p>
          <p>  
            You saved my life too. You just didn't know it.
          </p>
        </div>
      </div>
      <button className="flower-restart-btn" onClick={onRestart}>
        PLAY AGAIN
      </button>
    </div>
  </div>
);

/* ============================================================
   SCREENS DATA
   ============================================================ */
const SCREENS = {
  START:        'START',
  INTRO:        'INTRO',
  QUIZ_1:       'QUIZ_1',
  SUCCESS_1:    'SUCCESS_1',
  QUIZ_2:       'QUIZ_2',
  SUCCESS_2:    'SUCCESS_2',
  QUIZ_3:       'QUIZ_3',
  WRONG:        'WRONG',
  ALL_CORRECT:  'ALL_CORRECT',
  FLOWER_CAKE:  'FLOWER_CAKE',
  FLOWER_BLOOM: 'FLOWER_BLOOM',
  FLOWER_LETTER:'FLOWER_LETTER',
};

const BG_MAP = {
  [SCREENS.START]:         'bg-start',
  [SCREENS.INTRO]:         'bg-meadow',
  [SCREENS.WRONG]:         'bg-wrong',
  [SCREENS.SUCCESS_1]:     'bg-success',
  [SCREENS.SUCCESS_2]:     'bg-success',
  [SCREENS.ALL_CORRECT]:   'bg-meadow',
  [SCREENS.FLOWER_CAKE]:   'bg-flower-cake',
  [SCREENS.FLOWER_BLOOM]:  'bg-flower-bloom',
  [SCREENS.FLOWER_LETTER]: 'bg-flower-letter',
};

/* ============================================================
   MAIN APP
   ============================================================ */
export default function App() {
  const [screen, setScreen]           = useState(SCREENS.START);
 // const [screen, setScreen] = useState(SCREENS.ALL_CORRECT);
  const [gateOpen, setGateOpen]       = useState(false);
  const [contentFade, setContentFade] = useState(false);
  const [lastQuiz, setLastQuiz]       = useState('');
  const [flash, setFlash]             = useState(false);
  const [confetti, setConfetti]       = useState(false);
  const [wipe, setWipe]               = useState(null);
  const [spriteReact, setSpriteReact] = useState(false);
  const { loadedCount, total, ready: assetsReady } = usePreloadImages(PRELOAD_IMAGES);

  const bgmRef = useRef(null);
  const startSfxRef = useRef(null);
  const correctSfxRef = useRef(null);
  const incorrectSfxRef = useRef(null);

  const playSfx = (ref) => {
    if (ref.current) {
      ref.current.currentTime = 0;
      ref.current.play().catch(() => {});
    }
  };

  const fadeOutAudio = (ref, duration = 1200) => {
    const audio = ref.current;
    if (!audio) return;
    const steps = 24;
    const stepTime = duration / steps;
    const startVolume = audio.volume || 1;
    let count = 0;

    const fade = setInterval(() => {
      count++;
      audio.volume = Math.max(0, startVolume * (1 - count / steps));
      if (count >= steps) {
        clearInterval(fade);
        audio.pause();
        audio.currentTime = 0;
        audio.volume = startVolume;
      }
    }, stepTime);
  };

  /* ---- Transition helper ---- */
const transition = useCallback((toScreen, opts = {}) => {
  const delay = opts.delay || 0;
  const fadeOutMs = opts.fadeOutMs || 450;
  const holdMs = opts.holdMs || 0;
  const fadeInMs = opts.fadeInMs || 450;

  setTimeout(() => {
    setWipe('in');
    setTimeout(() => {
      if (opts.quiz) setLastQuiz(opts.quiz);
      setScreen(toScreen);
      setFlash(false);
      setConfetti(false);
      setTimeout(() => {
        setWipe('out');
        setTimeout(() => setWipe(null), fadeInMs);
      }, holdMs);
    }, fadeOutMs);
  }, delay);
}, []);

  /* ---- Start game ---- */
  const handleStart = () => {
    if (bgmRef.current) bgmRef.current.play().catch(() => {});
    playSfx(startSfxRef);
    setContentFade(true);
    setGateOpen(true);
    setTimeout(() => {
      setScreen(SCREENS.INTRO);
      setGateOpen(false);
      setContentFade(false);
    }, 1400);
  };

  /* ---- Correct answer ---- */
  const handleCorrect = (nextScreen) => {
    setTimeout(() => playSfx(correctSfxRef), 400);
    setFlash(true);
    setTimeout(() => setFlash(false), 10000);
    setSpriteReact(true);
    setTimeout(() => setSpriteReact(false), 500);
    setConfetti(true);
    transition(nextScreen, { delay: 1100 });
  };

  /* ---- Wrong answer ---- */
  const handleWrong = (quizScreen) => {
    setTimeout(() => playSfx(incorrectSfxRef), 400);
    setSpriteReact(true);
    setTimeout(() => setSpriteReact(false), 500);
    transition(SCREENS.WRONG, { quiz: quizScreen });
  };

  const bgClass = BG_MAP[screen] || '';

  return (
    <div className={`game-window ${bgClass}`}>
      <Analytics />
      <audio ref={startSfxRef} src="/sound/start.mp3" />
      <audio ref={correctSfxRef} src="/sound/correct.mp3" />
      <audio ref={incorrectSfxRef} src="/sound/incorrect.mp3" />
      <div className="scanlines" />
      <ScreenFlash active={flash} />
      <ConfettiBurst active={confetti} />
      <FadeTransition phase={wipe} />

{/* ── START ── */}
      {(screen === SCREENS.START || gateOpen) && (
        <div className="scene active start-scene scene-enter" style={{ zIndex: 50 }}>
          <StarField />
          <div className={`gate gate-left ${gateOpen ? 'open' : ''}`}>
            <span className="gate-ornament">🌸</span>
          </div>
          <div className={`gate gate-right ${gateOpen ? 'open' : ''}`}>
            <span className="gate-ornament">🌸</span>
          </div>
          <div className={`start-title-wrap ${contentFade ? 'fading' : ''}`}>
            <div className="start-title">HAPPY BIRTHDAY!</div>
            <p className="press-start-hint">PRESS START TO BEGIN YOUR QUEST</p>
            <button
              className="start-btn"
              onClick={handleStart}
              disabled={!assetsReady}
            >
              {assetsReady ? '▶ START' : 'LOADING...'}
            </button>
          </div>
        </div>
      )}

      {/* ── INTRO ── */}
      {screen === SCREENS.INTRO && (
        <div className="scene active scene-enter">
          <FloatingSparkles emojis={['🌸','💕','🌼']} count={5} />
          <PixelClouds />
          <div className="dialogue-scene">
            <div className="pop-in intro-stack">
              <DialogueBox
                text={"HI, MORIO!\n\nTO RECEIVE YOUR GIFT,\nYOU MUST COMPLETE EACH LEVEL.\n\nGOOD LUCK AND HAVE FUN!"}
                speed={60}
                showArrow={false}
              />
              <IntroStartButton onNext={() => transition(SCREENS.QUIZ_1)} text={"HI, MORIO!\n\nTO RECEIVE YOUR GIFT,\nYOU MUST COMPLETE EACH LEVEL.\n\nGOOD LUCK AND HAVE FUN!"} />
            </div>
          </div>
          <CharacterSprite reacting={spriteReact} />
        </div>
      )}

      {/* ── QUIZ 1 ── */}
      {screen === SCREENS.QUIZ_1 && (
        <div className="scene active scene-enter">
          <div style={{ position:'absolute', inset:0, backgroundImage:'url(/photos/cover8.png)', backgroundSize:'cover', backgroundPosition:'center', zIndex:0 }} />
          <FloatingSparkles emojis={['🎂','❤️','🍰','🎶']} count={6} />
          <div className="quiz-scene" style={{ position:'relative', zIndex:1 }}>
            <div className="level-badge">⚔ LEVEL 1 </div>
            <div className="quiz-card">
              <p className="quiz-question">
                <Typewriter text={"What is the best juice in the world?"} speed={40} />
              </p>
            </div>
            <div className="quiz-buttons two-options">
              <button className="quiz-btn" onClick={() => handleWrong(SCREENS.QUIZ_1)}>Santal
              </button>
              <button className="quiz-btn" onClick={() => handleCorrect(SCREENS.SUCCESS_1)}> Capri-Sun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS 1 ── */}
      {screen === SCREENS.SUCCESS_1 && (
        <div className="scene active scene-enter">
          <FloatingSparkles emojis={['⭐','✨','🌟','💫']} count={10} />
          <div className="success-scene-centered" style={{ position:'relative', zIndex:1 }}>
            <div className="success-spacer" />
            <img src="/photos/catw.png" alt="Cat" className="success-cat-img" />
            <p className="success-title pop-text">CONGRATULATIONS!</p>
            <button className="game-btn primary success-btn-spaced" onClick={() => transition(SCREENS.QUIZ_2)}>
              ▶ PROCEED TO LEVEL 2
            </button>
            <div className="success-spacer" />
          </div>
        </div>
      )}

      {/* ── QUIZ 2 ── */}
      {screen === SCREENS.QUIZ_2 && (
        <div className="scene active scene-enter">
          <div style={{ position:'absolute', inset:0, backgroundImage:'url(/photos/background_2.png)', backgroundSize:'cover', backgroundPosition:'center', filter:'blur(4px)', transform:'scale(1.05)', zIndex:0 }} />
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1, background:'radial-gradient(ellipse at 50% 80%, rgba(136,34,204,0.3) 0%, transparent 70%)' }} />
          <FloatingSparkles emojis={['🫶','💕','💜','✨','🌟']} count={8} />
          <PixelClouds dark />
          <div className="quiz-scene" style={{ position:'relative', zIndex:2 }}>
            <div className="level-badge" style={{ color:'#d7a8f0', borderColor:'rgba(215,168,240,0.4)' }}>
              LEVEL 2
            </div>
            <div className="quiz-card" style={{ borderColor:'#9b59b6' }}>
              <p className="quiz-question">
                <Typewriter text={"HOW MANY TIMES HAS ERGI DEACTIVATED SINCE WE STARTED TALKING?"} speed={40} />
              </p>
            </div>
            <div className="quiz-buttons three-options">
              <button className="quiz-btn" onClick={() => handleWrong(SCREENS.QUIZ_2)}>
                2 TIMES
              </button>
              <button className="quiz-btn" onClick={() => handleWrong(SCREENS.QUIZ_2)}>
                4 TIMES
              </button>
              <button className="quiz-btn" onClick={() => handleCorrect(SCREENS.SUCCESS_2)}>
                TOO MANY TO COUNT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS 2 ── */}
      {screen === SCREENS.SUCCESS_2 && (
        <div className="scene active scene-enter">
          <FloatingSparkles emojis={['🌸','🫶','💕','🌷','✨']} count={10} />
          <div className="success-scene-centered" style={{ position:'relative', zIndex:1 }}>
            <div className="success-spacer" />
            <img src="/photos/catzemer_red.png" alt="Cat" className="success-cat-img-wide" />
            <p className="success-title pop-text">CONGRATULATIONS!</p>
            <p className="success-subtitle pop-text-delayed">bro said 'im just an avoidant bitch' and meant it </p>
            <button className="game-btn primary success-btn-spaced" onClick={() => transition(SCREENS.QUIZ_3)}>
              💖 FINAL CHALLENGE
            </button>
            <div className="success-spacer" />
          </div>
        </div>
      )}

      {/* ── QUIZ 3 ── */}
      {screen === SCREENS.QUIZ_3 && (
        <div className="scene active scene-enter">
          <div style={{ position:'absolute', inset:0, backgroundImage:'url(/photos/background_2.png)', backgroundSize:'cover', backgroundPosition:'center', filter:'blur(4px)', transform:'scale(1.05)', zIndex:0 }} />
          <FloatingSparkles emojis={['💌','💖','🌹','✨','💝']} count={8} />
          <div className="quiz-scene" style={{ position:'relative', zIndex:1 }}>
            <div className="level-badge">💖 FINAL LEVEL </div>
            <div className="quiz-card">
              <p className="quiz-question">
                <Typewriter text={" Is Medina my favorite person?"} speed={40} />
              </p>
            </div>
            {/* YES leads to the all-correct celebration, then the flower gift sequence */}
            <DateButtons
              onYesClick={() => playSfx(correctSfxRef)}
              onNo={() => playSfx(incorrectSfxRef)}
              onYes={() => transition(SCREENS.ALL_CORRECT)}
            />
          </div>
        </div>
      )}

      {/* ── WRONG ── */}
      {screen === SCREENS.WRONG && (
        <div className="scene active scene-enter">
          <div style={{ position:'absolute', inset:0, backgroundImage:'url(/photos/cover8.png)', backgroundSize:'cover', backgroundPosition:'center', zIndex:0 }} />
          <div className="wrong-scene" style={{ position:'relative', zIndex:1 }}>
            <img
              src="/photos/penguin-trip.gif"
              alt="Penguin"
              className="wrong-penguin-img"
              style={{ width:'clamp(160px,30vw,280px)', imageRendering:'pixelated', marginBottom:'12px', display:'block' }}
            />
            <button className="game-btn" onClick={() => transition(lastQuiz)}>
              TRY AGAIN
            </button>
          </div>
        </div>
      )}

      {/* ── ALL CORRECT ── */}
      {screen === SCREENS.ALL_CORRECT && (
        <div className="scene active scene-enter">
          <FloatingSparkles emojis={['🌸','💕','🌼']} count={5} />
          <PixelClouds />
          <div className="dialogue-scene">
            <div className="pop-in">
            <DialogueBox
              text={"CONGRATULATIONS, MORIO!\n\nYOU ANSWERED EVERY\nQUESTION CORRECTLY!\n\nNOW... CLOSE YOUR EYES\nAND MAKE A WISH"}
              speed={50}
              showArrow={false}
              onAllDone={() => {
                if (bgmRef.current) {
                  bgmRef.current.pause();
                  bgmRef.current.currentTime = 0;
                }
                const cakeScreenDelay = 2000 + 450; // matches transition's delay + fadeOutMs
                setTimeout(() => {
                  playBirthdayMelody({ tempo: 105, volume: 0.18, loop: true });
                }, cakeScreenDelay);
                transition(SCREENS.FLOWER_CAKE, { delay: 2000 });
              }}
            />
            </div>
          </div>
          <CharacterSprite reacting={spriteReact} />
        </div>
      )}

      {/* ── FLOWER CAKE ── */}
      {screen === SCREENS.FLOWER_CAKE && (
        <FlowerCakeScreen
          onDone={() => setScreen(SCREENS.FLOWER_BLOOM)}
          onBlow={() => stopBirthdayMelody()}
        />
      )}

      {/* ── FLOWER BLOOM ── */}
      {screen === SCREENS.FLOWER_BLOOM && (
        <FlowerBloomScreen 
          onDone={() => setScreen(SCREENS.FLOWER_LETTER)} 
          FLOWER_IMAGES={FLOWER_IMAGES} 
        />
      )}

      {/* ── FLOWER LETTER ── */}
      {screen === SCREENS.FLOWER_LETTER && (
        <FlowerLetterScreen onRestart={() => transition(SCREENS.START)} />
      )}
    </div>
  );
}