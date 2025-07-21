// Audio Context初期化
let audioContext;
let currentSoundType = 0;
const activeKeys = new Set();
let isAlphabeticalMode = true; // true: アルファベット順, false: ピアノ配列
let isABCMode = false; // ABCモード（アルファベット学習）
let abcProgress = 0; // ABCモードの進行状況（0=A, 1=B, ... 25=Z）

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

// アルファベット順の音階配置（A-Zをドレミファソラシドの繰り返し）
const alphabeticalKeyMap = {
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

// ピアノ配列の音階配置（実際のピアノに近い配置、黒鍵含む）
const pianoKeyMap = {
    // 中段（A行とその上の黒鍵）- 中音部 C4-B4
    'A': 261.63, // C4
    'W': 277.18, // C#4（黒鍵）
    'S': 293.66, // D4
    'E': 311.13, // D#4（黒鍵）
    'D': 329.63, // E4
    'F': 349.23, // F4
    'T': 369.99, // F#4（黒鍵）
    'G': 392.00, // G4
    'Y': 415.30, // G#4（黒鍵）
    'H': 440.00, // A4
    'U': 466.16, // A#4（黒鍵）
    'J': 493.88, // B4
    'K': 523.25, // C5
    'O': 554.37, // C#5（黒鍵）
    'L': 587.33, // D5
    'P': 622.25, // D#5（黒鍵）
    ';': 659.25, // E5
    
    // 下段（Z行）- 低音部（1オクターブ下）
    'Z': 130.81, // C3
    'X': 146.83, // D3
    'C': 164.81, // E3
    'V': 174.61, // F3
    'B': 196.00, // G3
    'N': 220.00, // A3
    'M': 246.94, // B3
    ',': 261.63, // C4
    '.': 293.66, // D4
    '/': 329.63, // E4
    
    // 上段（Q行）- 高音部（1オクターブ上）
    'Q': 523.25, // C5
    '2': 554.37, // C#5（黒鍵）
    'W': 587.33, // D5
    '3': 622.25, // D#5（黒鍵）
    'E': 659.25, // E5
    'R': 698.46, // F5
    '5': 739.99, // F#5（黒鍵）
    'T': 783.99, // G5
    '6': 830.61, // G#5（黒鍵）
    'Y': 880.00, // A5
    '7': 932.33, // A#5（黒鍵）
    'U': 987.77, // B5
    'I': 1046.50 // C6
};

// 現在のキーマッピングを取得
function getCurrentKeyMap() {
    return isAlphabeticalMode ? alphabeticalKeyMap : pianoKeyMap;
}

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
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
        [' ']  // スペースキー
    ];
    
    keyboardLayout.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        // 行ごとのオフセットを設定
        if (rowIndex === 1) rowDiv.style.marginLeft = '20px';  // A行
        if (rowIndex === 2) rowDiv.style.marginLeft = '40px';  // Z行
        
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
            
            // ピアノ配列モードで黒鍵に該当するキーをマーク
            const blackKeys = ['2', '3', '5', '6', '7', 'W', 'E', 'T', 'Y', 'U', 'O', 'P', 'S', 'D', 'G', 'H', 'J'];
            if (blackKeys.includes(key)) {
                keyDiv.classList.add('black-key');
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
    
    // 0キーで音階モード切り替え
    if (key === '0') {
        isAlphabeticalMode = !isAlphabeticalMode;
        const modeName = isAlphabeticalMode ? 'アルファベット順' : 'ピアノ配列';
        document.getElementById('mode-display').textContent = modeName;
        return;
    }
    
    // ビジュアルフィードバック（スペースキーの場合は元のキーを使用）
    const visualKey = originalKey === ' ' ? ' ' : key;
    const keyElement = document.getElementById(`key-${visualKey}`);
    if (keyElement) {
        keyElement.classList.add('active');
    }
    
    // ABCモードの処理
    if (isABCMode) {
        const expectedKey = String.fromCharCode(65 + abcProgress);
        if (key === expectedKey) {
            // 正しいキーが押された
            playNote(alphabeticalKeyMap[key], currentSoundType, false, key);
            abcProgress++;
            
            if (abcProgress >= 26) {
                // 全て完了
                showSuccessAnimation();
            } else {
                updateABCDisplay();
            }
        } else {
            // 間違ったキーが押された - エラー音を鳴らす
            const errorOsc = audioContext.createOscillator();
            const errorGain = audioContext.createGain();
            errorOsc.frequency.setValueAtTime(100, audioContext.currentTime);
            errorOsc.type = 'sawtooth';
            errorGain.gain.setValueAtTime(0.1, audioContext.currentTime);
            errorGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            errorOsc.connect(errorGain);
            errorGain.connect(audioContext.destination);
            errorOsc.start();
            errorOsc.stop(audioContext.currentTime + 0.1);
        }
        return;
    }
    
    // 通常モードの音を再生
    const currentKeyMap = getCurrentKeyMap();
    if (currentKeyMap[key]) {
        playNote(currentKeyMap[key], currentSoundType, false, key);
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

// ABCモード関数
function updateABCDisplay() {
    if (!isABCMode) return;
    
    const nextLetter = String.fromCharCode(65 + abcProgress); // A=65
    document.getElementById('next-key').textContent = nextLetter;
    
    // 進行状況バーの更新
    const progressPercent = (abcProgress / 26) * 100;
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;
    
    // 次のキーをハイライト
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('next-key');
    });
    
    const nextKeyElement = document.getElementById(`key-${nextLetter}`);
    if (nextKeyElement) {
        nextKeyElement.classList.add('next-key');
    }
}

function startABCMode() {
    isABCMode = true;
    abcProgress = 0;
    isAlphabeticalMode = true; // ABCモードはアルファベット順を使用
    
    document.getElementById('abc-progress').style.display = 'block';
    document.getElementById('mode-display').textContent = 'ABCモード';
    updateABCDisplay();
}

function endABCMode() {
    isABCMode = false;
    document.getElementById('abc-progress').style.display = 'none';
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('next-key');
    });
}

function showSuccessAnimation() {
    const successDiv = document.getElementById('success-animation');
    successDiv.style.display = 'block';
    
    // 音声で「やったー！」を再生（女性の声）
    const utterance = new SpeechSynthesisUtterance('やったー！');
    utterance.lang = 'ja-JP';
    utterance.rate = 1.0;
    utterance.pitch = 1.5; // 高めのピッチで女性らしく
    utterance.volume = 0.8;
    
    // 利用可能な音声から女性の声を選択
    const voices = speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
        voice.lang.includes('ja') && (voice.name.includes('Female') || voice.name.includes('女性'))
    );
    if (femaleVoice) {
        utterance.voice = femaleVoice;
    }
    
    speechSynthesis.speak(utterance);
    
    // 3秒後にアニメーションを非表示
    setTimeout(() => {
        successDiv.style.display = 'none';
        abcProgress = 0;
        updateABCDisplay();
    }, 3000);
}

// モードボタンのイベントリスナー
document.getElementById('mode-piano').addEventListener('click', () => {
    endABCMode();
    document.getElementById('mode-piano').classList.add('active');
    document.getElementById('mode-abc').classList.remove('active');
    document.getElementById('mode-display').textContent = isAlphabeticalMode ? 'アルファベット順' : 'ピアノ配列';
});

document.getElementById('mode-abc').addEventListener('click', () => {
    startABCMode();
    document.getElementById('mode-abc').classList.add('active');
    document.getElementById('mode-piano').classList.remove('active');
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
    
    // 音声合成の初期化（女性の声を事前にロード）
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
    }
});