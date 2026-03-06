// === Spicetify Pomodoro Timer (Background Sync Fixed) ===

(function waitForSpicetify() {
  if (!window.Spicetify || !Spicetify.Player) {
    setTimeout(waitForSpicetify, 500);
    return;
  }

  // --- CONFIG ---
  let workMinutes = 25;
  let breakMinutes = 5;
  let secondsLeft = workMinutes * 60; 
  let isWork = true;
  let interval = null;
  let endTime = null; 

  //  Audio
  let isAlarmPlaying = false;
  let alarmInterval = null;
  let audioCtx = null;

  // --- UI Container  ---
  const container = document.createElement("div");
  container.id = "spicetify-pomodoro";
  container.style.cssText = `
    position: fixed;
    top: 35%;
    left: 35%;
    background: var(--spice-main);
    color: var(--spice-text);
    padding: 16px;
    border-radius: 14px;
    z-index: 999999;
    font-size: 14px;
    text-align: center;
    min-width: 200px;
    user-select: none;
    box-shadow: 0 8px 20px rgba(0,0,0,.45);
    border: 1px solid var(--spice-button);
  `;

  const header = document.createElement("div");
  header.innerText = "Pomodoro";
  header.style.fontWeight = "700";
  header.style.cursor = "grab";
  header.style.marginBottom = "8px";
  header.style.textTransform = "uppercase";
  header.style.letterSpacing = "1px";

  const label = document.createElement("div");
  label.style.opacity = "0.8";
  label.style.fontSize = "12px";

  const timeDisplay = document.createElement("div");
  timeDisplay.style.fontSize = "32px";
  timeDisplay.style.fontWeight = "bold";
  timeDisplay.style.margin = "8px 0";
  timeDisplay.style.fontVariantNumeric = "tabular-nums";

  const inputs = document.createElement("div");
  inputs.style.display = "flex";
  inputs.style.justifyContent = "space-between";
  inputs.style.gap = "8px";
  inputs.style.marginBottom = "10px";

  const workInput = document.createElement("input");
  workInput.type = "number";
  workInput.min = "1";
  workInput.value = workMinutes;
  workInput.style.width = "50px";
  workInput.style.background = "var(--spice-card)";
  workInput.style.border = "none";
  workInput.style.color = "var(--spice-text)";
  workInput.style.padding = "4px";
  workInput.style.borderRadius = "4px";
  workInput.style.textAlign = "center";

  const breakInput = document.createElement("input");
  breakInput.type = "number";
  breakInput.min = "1";
  breakInput.value = breakMinutes;
  breakInput.style.width = "50px";
  breakInput.style.background = "var(--spice-card)";
  breakInput.style.border = "none";
  breakInput.style.color = "var(--spice-text)";
  breakInput.style.padding = "4px";
  breakInput.style.borderRadius = "4px";
  breakInput.style.textAlign = "center";

  inputs.append(
    makeInputBox("Focus (m)", workInput),
    makeInputBox("Break (m)", breakInput)
  );

  const btns = document.createElement("div");
  btns.style.display = "flex";
  btns.style.gap = "8px";

  const startBtn = document.createElement("button");
  startBtn.innerText = "Start";
  startBtn.style.flex = "1";
  startBtn.style.padding = "6px";
  startBtn.style.cursor = "pointer";
  startBtn.style.backgroundColor = "var(--spice-button)";
  startBtn.style.color = "var(--spice-main)";
  startBtn.style.border = "none";
  startBtn.style.borderRadius = "14px";
  startBtn.style.fontWeight = "bold";

  const resetBtn = document.createElement("button");
  resetBtn.innerText = "Reset";
  resetBtn.style.flex = "1";
  resetBtn.style.padding = "6px";
  resetBtn.style.cursor = "pointer";
  resetBtn.style.backgroundColor = "transparent";
  resetBtn.style.color = "var(--spice-text)";
  resetBtn.style.border = "1px solid var(--spice-text)";
  resetBtn.style.borderRadius = "14px";

  btns.append(startBtn, resetBtn);
  container.append(header, label, timeDisplay, inputs, btns);
  document.body.appendChild(container);

  // ---------------- Helper Logic ----------------

  function makeInputBox(text, input) {
    const box = document.createElement("div");
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.fontSize = "10px";
    box.style.alignItems = "center";
    const t = document.createElement("span");
    t.innerText = text;
    t.style.marginBottom = "2px";
    box.append(t, input);
    return box;
  }

  function format(sec) {
    
    if (sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // --- AUDIO LOGIC ---
  function playBeep() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); 
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  }

  function triggerAlarm() {
    if (isAlarmPlaying) return;
    isAlarmPlaying = true;
    playBeep();
    alarmInterval = setInterval(() => playBeep(), 600);
  }

  function stopAlarm() {
    if (alarmInterval) clearInterval(alarmInterval);
    alarmInterval = null;
    isAlarmPlaying = false;
  }

  // ---------------- CORE LOGIC (TIME SYNC FIX) ----------------

  function updateUI() {
    label.textContent = isWork ? "Focus Mode" : "Chill Mode";
    timeDisplay.textContent = format(secondsLeft);
    timeDisplay.style.color = isWork ? "var(--spice-text)" : "#1db954"; 
  }

  function tick() {
    const now = Date.now();
  
    const remaining = Math.ceil((endTime - now) / 1000);

    if (remaining <= 0) {
      secondsLeft = 0;
      updateUI();
      clearInterval(interval);
      interval = null;

      // RUN OUT OF TIME - SWITCH MODE
      if (isWork) {
        triggerAlarm();
        Spicetify.showNotification("Time's up! Click to break.");
        startBtn.innerText = "Start Break"; 
        startBtn.style.backgroundColor = "#1db954";
      } else {
        triggerAlarm();
        Spicetify.showNotification("Break over! Click to focus.");
        isWork = true; 
        secondsLeft = workMinutes * 60;
        startBtn.innerText = "Start Focus";
        startBtn.style.backgroundColor = "var(--spice-button)";
        updateUI();
      }
    } else {
      secondsLeft = remaining; // UPDTAE SECONDS LEFT BASED ON TIME DIFFERENCE
      updateUI();
    }
  }

  startBtn.onclick = () => {
    // 1. TURN OFF ALARM IF CLICKED WHILE ALARM RINGING
    if (isAlarmPlaying) stopAlarm();

    // 2. IF RUNNING, DO NOTHING (OR YOU CAN IMPLEMENT PAUSE LOGIC HERE)
    if (interval) return;

    // 3.TRANSFORM MODE IF TIME RAN OUT BUT USER DIDN'T CLICK START YET
    if (secondsLeft <= 0 && isWork) {
        isWork = false;
        breakMinutes = parseInt(breakInput.value, 10);
        secondsLeft = breakMinutes * 60;
        
        // **QUAN TRỌNG:** Thiết lập mốc thời gian kết thúc mới
        endTime = Date.now() + (secondsLeft * 1000);

        startBtn.innerText = "Running...";
        startBtn.style.backgroundColor = "var(--spice-button)";
        updateUI();
        interval = setInterval(tick, 1000);
        return;
    }

    // 4. Logic Start NEW FOCUS/ BREAK SESSION
    if (startBtn.innerText.includes("Start")) {
        workMinutes = parseInt(workInput.value, 10);
        
        if (secondsLeft <= 0) {
             secondsLeft = workMinutes * 60;
        }
        
        endTime = Date.now() + (secondsLeft * 1000);
    }

    startBtn.innerText = "Running...";
    updateUI();
    interval = setInterval(tick, 1000);
  };

  resetBtn.onclick = () => {
    clearInterval(interval);
    interval = null;
    stopAlarm();
    
    isWork = true;
    workMinutes = parseInt(workInput.value, 10);
    secondsLeft = workMinutes * 60;
    
    endTime = null;

    startBtn.innerText = "Start";
    startBtn.style.backgroundColor = "var(--spice-button)";
    updateUI();
  };

  // ---------------- Smooth Dragging ----------------
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let rafId = null;

  header.addEventListener("mousedown", (e) => {
    dragging = true;
    offsetX = e.clientX - container.offsetLeft;
    offsetY = e.clientY - container.offsetTop;
    container.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      container.style.left = e.clientX - offsetX + "px";
      container.style.top = e.clientY - offsetY + "px";
      rafId = null;
    });
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    container.style.cursor = "grab";
  });

  updateUI();
})();