// Audio Context初期化
let audioContext;
let currentSoundType = 0;
const activeKeys = new Set();

// 音色定義
const soundTypes = [
    { name: 'ピアノ', type: 'sine', decay: 0.5 },
    { name: 'オルガン', type: 'triangle', decay: 0.8 },
    { name: 'シンセ', type: 'sawtooth', decay: 0.3 },
    { name: 'スクエア', type: 'square', decay: 0.2 },
    { name: 'ベル', type: 'sine', decay: 1.0 },
    { name: 'フルート', type: 'sine', decay: 0.7 },
    { name: 'ストリングス', type: 'sawtooth', decay: 1.2 },
    { name: 'ブラス', type: 'sawtooth', decay: 0.4 },
    { name: 'アルファベット音声', type: 'voice', decay: 0.0 }
];

// キーと音程のマッピング（A-Zをドレミファソラシドの繰り返し）
const keyToNote = {
    'A': 261.63, // C4 (ド)
    'B': 293.66, // D4 (レ)
    'C': 329.63, // E4 (ミ)
    'D': 349.23, // F4 (ファ)
    'E': 392.00, // G4 (ソ)
    'F': 440.00, // A4 (ラ)
    'G': 493.88, // B4 (シ)
    'H': 523.25, // C5 (ド)
    'I': 587.33, // D5 (レ)
    'J': 659.25, // E5 (ミ)
    'K': 698.46, // F5 (ファ)
    'L': 783.99, // G5 (ソ)
    'M': 880.00, // A5 (ラ)
    'N': 987.77, // B5 (シ)
    'O': 1046.50, // C6 (ド)
    'P': 1174.66, // D6 (レ)
    'Q': 1318.51, // E6 (ミ)
    'R': 1396.91, // F6 (ファ)
    'S': 1567.98, // G6 (ソ)
    'T': 1760.00, // A6 (ラ)
    'U': 1975.53, // B6 (シ)
    'V': 2093.00, // C7 (ド)
    'W': 2349.32, // D7 (レ)
    'X': 2637.02, // E7 (ミ)
    'Y': 2793.83, // F7 (ファ)
    'Z': 3135.96  // G7 (ソ)
};

// 打楽器音の定義
const drumSounds = {
    ' ': { freq: 60, type: 'kick', decay: 0.1 },
    ',': { freq: 200, type: 'snare', decay: 0.05 },
    '.': { freq: 800, type: 'hihat', decay: 0.03 },
    '/': { freq: 400, type: 'tom', decay: 0.08 },
    ';': { freq: 1500, type: 'crash', decay: 0.3 },
    "'": { freq: 3000, type: 'ride', decay: 0.2 }
};

// Audio Context初期化関数
function initAudioContext() {
    if (!audioContext || audioContext.state === 'suspended') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // サスペンド状態の場合は再開
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
}

// 音を再生する関数
function playNote(frequency, soundType, isDrum = false, keyPressed = null) {
    initAudioContext();
    
    const now = audioContext.currentTime;
    const volume = document.getElementById('volume').value / 100;
    
    // アルファベット音声モードの場合
    if (soundType === 8 && keyPressed && !isDrum) {
        speakLetter(keyPressed);
        return;
    }
    
    if (isDrum) {
        playDrumSound(frequency, soundType, volume);
    } else {
        playToneSound(frequency, soundType, volume);
    }
}

// アルファベットを読み上げる関数
function speakLetter(letter) {
    const utterance = new SpeechSynthesisUtterance(letter.toLowerCase());
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = document.getElementById('volume').value / 100;
    speechSynthesis.speak(utterance);
}

// 楽器音を再生
function playToneSound(frequency, soundType, volume) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    // オシレーター設定
    oscillator.type = soundTypes[soundType].type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    // フィルター設定（音色に深みを加える）
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency * 4, audioContext.currentTime);
    filter.Q.setValueAtTime(1, audioContext.currentTime);
    
    // エンベロープ設定
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + soundTypes[soundType].decay);
    
    // 接続
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 再生
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + soundTypes[soundType].decay + 0.1);
}

// 打楽器音を再生
function playDrumSound(frequency, type, volume) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const noiseGain = audioContext.createGain();
    
    if (type === 'kick') {
        // キックドラム
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
    } else if (type === 'snare' || type === 'hihat') {
        // スネアとハイハット（ノイズ使用）
        const bufferSize = audioContext.sampleRate * 0.1;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        noiseGain.gain.setValueAtTime(volume * 0.5, audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        noise.start(audioContext.currentTime);
        
    } else {
        // その他の打楽器
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(volume * 0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
}

// キーボードビジュアル作成
function createKeyboardVisual() {
    const container = document.getElementById('keyboard-visual');
    
    // キーボード配列（QWERTY配列）
    const keyboardLayout = [
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
        [' ']  // スペースキー
    ];
    
    keyboardLayout.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        // 行ごとのオフセットを設定
        if (rowIndex === 2) rowDiv.style.marginLeft = '20px';  // A行
        if (rowIndex === 3) rowDiv.style.marginLeft = '40px';  // Z行
        
        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.id = `key-${key}`;
            
            if (key === ' ') {
                keyDiv.textContent = 'SPACE';
                keyDiv.classList.add('space-key');
            } else {
                keyDiv.textContent = key;
            }
            
            if (drumSounds[key]) {
                keyDiv.classList.add('drum');
            }
            
            rowDiv.appendChild(keyDiv);
        });
        
        container.appendChild(rowDiv);
    });
}

// キーボードイベント処理
document.addEventListener('keydown', (e) => {
    // preventDefault でブラウザのデフォルト動作を防ぐ
    e.preventDefault();
    
    const key = e.key.toUpperCase();
    const originalKey = e.key;
    
    // 既に押されているキーは無視
    if (activeKeys.has(originalKey)) return;
    activeKeys.add(originalKey);
    
    // 数字キーで音色変更
    if (key >= '1' && key <= '9') {
        currentSoundType = parseInt(key) - 1;
        document.getElementById('current-sound').textContent = soundTypes[currentSoundType].name;
        return;
    }
    
    // ビジュアルフィードバック（スペースキーの場合は元のキーを使用）
    const visualKey = originalKey === ' ' ? ' ' : key;
    const keyElement = document.getElementById(`key-${visualKey}`);
    if (keyElement) {
        keyElement.classList.add('active');
    }
    
    // 音を再生
    if (keyToNote[key]) {
        playNote(keyToNote[key], currentSoundType, false, key);
    } else if (drumSounds[originalKey]) {
        const drum = drumSounds[originalKey];
        playNote(drum.freq, drum.type, true);
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    const originalKey = e.key;
    activeKeys.delete(originalKey);
    
    // ビジュアルフィードバック解除
    const visualKey = originalKey === ' ' ? ' ' : key;
    const keyElement = document.getElementById(`key-${visualKey}`);
    if (keyElement) {
        keyElement.classList.remove('active');
    }
});

// 音量コントロール
document.getElementById('volume').addEventListener('input', (e) => {
    document.getElementById('volume-display').textContent = e.target.value;
});

// 初期化
createKeyboardVisual();

// 初回クリックでAudioContext起動
document.addEventListener('click', () => {
    initAudioContext();
}, { once: true });

// デバッグ用コンソール出力を追加
window.addEventListener('load', () => {
    console.log('キーボードピアノ: 読み込み完了');
    console.log('キーを押して演奏してください');
});