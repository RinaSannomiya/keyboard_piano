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
    { name: 'エレピ', type: 'triangle', decay: 0.6 }
];

// キーと音程のマッピング（C4を基準）
const keyToNote = {
    'A': 261.63, // C4
    'W': 277.18, // C#4
    'S': 293.66, // D4
    'E': 311.13, // D#4
    'D': 329.63, // E4
    'F': 349.23, // F4
    'T': 369.99, // F#4
    'G': 392.00, // G4
    'Y': 415.30, // G#4
    'H': 440.00, // A4
    'U': 466.16, // A#4
    'J': 493.88, // B4
    'K': 523.25, // C5
    'O': 554.37, // C#5
    'L': 587.33, // D5
    'P': 622.25, // D#5
    'Z': 659.25, // E5
    'X': 698.46, // F5
    'C': 739.99, // F#5
    'V': 783.99, // G5
    'B': 830.61, // G#5
    'N': 880.00, // A5
    'M': 932.33, // A#5
    'Q': 987.77, // B5
    'R': 1046.50, // C6
    'I': 1108.73  // C#6
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
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 音を再生する関数
function playNote(frequency, soundType, isDrum = false) {
    initAudioContext();
    
    const now = audioContext.currentTime;
    const volume = document.getElementById('volume').value / 100;
    
    if (isDrum) {
        playDrumSound(frequency, soundType, volume);
    } else {
        playToneSound(frequency, soundType, volume);
    }
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
    const allKeys = Object.keys(keyToNote).concat(Object.keys(drumSounds)).concat(['1','2','3','4','5','6','7','8','9']);
    
    allKeys.forEach(key => {
        const keyDiv = document.createElement('div');
        keyDiv.className = 'key';
        keyDiv.id = `key-${key}`;
        keyDiv.textContent = key === ' ' ? 'SPACE' : key;
        
        if (drumSounds[key]) {
            keyDiv.classList.add('drum');
        }
        
        container.appendChild(keyDiv);
    });
}

// キーボードイベント処理
document.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    
    // 既に押されているキーは無視
    if (activeKeys.has(key)) return;
    activeKeys.add(key);
    
    // 数字キーで音色変更
    if (key >= '1' && key <= '9') {
        currentSoundType = parseInt(key) - 1;
        document.getElementById('current-sound').textContent = soundTypes[currentSoundType].name;
        return;
    }
    
    // ビジュアルフィードバック
    const keyElement = document.getElementById(`key-${key}`);
    if (keyElement) {
        keyElement.classList.add('active');
    }
    
    // 音を再生
    if (keyToNote[key]) {
        playNote(keyToNote[key], currentSoundType);
    } else if (drumSounds[e.key]) {
        const drum = drumSounds[e.key];
        playNote(drum.freq, drum.type, true);
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    activeKeys.delete(key);
    
    // ビジュアルフィードバック解除
    const keyElement = document.getElementById(`key-${key}`);
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