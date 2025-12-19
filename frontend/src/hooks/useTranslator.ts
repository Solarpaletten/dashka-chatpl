import { useState, useEffect, useRef } from 'react';

type TranslationMode = 'manual' | 'auto';

export const useTranslator = () => {
  // State management
  const [translationMode, setTranslationMode] = useState<TranslationMode>('auto');
  const [currentRole, setCurrentRole] = useState<'user' | 'steuerberater'>('user');
  const [currentMode, setCurrentMode] = useState<'text' | 'voice'>('text');
  const [inputText, setInputText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('🟢 Готов');
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState<string>('ru-RU');

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState({
    ai: false,
    ws: false,
    speech: false
  });

  // Refs
  const recognitionRef = useRef<any>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // API Configuration
  const config = {
    aiServer: import.meta.env.VITE_API_URL || "http://localhost:8080",
    wsServer: import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws",
  };

  // Initialize system
  useEffect(() => {
    initSystem();
    return () => cleanup();
  }, []);

  // Realtime translation with debounce
  useEffect(() => {
    if (!originalText || originalText.length < 3) {
      if (originalText.length === 0) {
        setTranslatedText('');
      }
      return;
    }

    const timer = setTimeout(() => {
      performTranslation(originalText);
    }, 500);

    return () => clearTimeout(timer);
  }, [originalText]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = recognitionLang;
    }
  }, [recognitionLang]);

  const initSystem = async () => {
    await checkAIServer();
    initWebSocket();
    initSpeechRecognition();
    setStatus('🟢 Готов');
  };

  const cleanup = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (websocketRef.current) websocketRef.current.close();
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  const checkAIServer = async () => {
    try {
      const response = await fetch(`${config.aiServer}/health`);
      setConnectionStatus(prev => ({ ...prev, ai: response.ok }));
    } catch {
      setConnectionStatus(prev => ({ ...prev, ai: false }));
    }
  };

  const initWebSocket = () => {
    try {
      const ws = new WebSocket(config.wsServer);
      
      ws.onopen = () => {
        setConnectionStatus(prev => ({ ...prev, ws: true }));
        reconnectAttemptsRef.current = 0;
        setStatus('🟢 Подключено');
      };
      
      ws.onclose = () => {
        setConnectionStatus(prev => ({ ...prev, ws: false }));
        scheduleReconnect();
      };
      
      ws.onerror = () => {
        setConnectionStatus(prev => ({ ...prev, ws: false }));
      };
      
      websocketRef.current = ws;
    } catch {
      setConnectionStatus(prev => ({ ...prev, ws: false }));
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    const delays = [1000, 2000, 5000, 10000, 30000];
    const delay = delays[Math.min(reconnectAttemptsRef.current, delays.length - 1)];
    
    setStatus(`🔴 Переподключение через ${delay/1000}s...`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      initWebSocket();
    }, delay);
  };

  const initSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setConnectionStatus(prev => ({ ...prev, speech: false }));
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = recognitionLang;

    recognition.onstart = () => {
      setConnectionStatus(prev => ({ ...prev, speech: true }));
      setStatus('🎤 Запись...');
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        setOriginalText(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'audio-capture') {
        setStatus(`❌ Ошибка: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch (err) {
          setIsRecording(false);
        }
      }
    };

    recognitionRef.current = recognition;
    setConnectionStatus(prev => ({ ...prev, speech: true }));
  };

  const detectLanguage = async (text: string): Promise<string> => {
    try {
      const response = await fetch(`${config.aiServer}/detect-language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const result = await response.json();
      return result.detected_language || 'RU';
    } catch {
      return 'RU';
    }
  };

  const performTranslation = async (text: string) => {
    if (!text.trim() || text.length < 3) return;

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsTranslating(true);
    setStatus('🔄 Перевод...');

    try {
      let fromLang: string;
      let toLang: string;

      if (translationMode === 'auto') {
        const detected = await detectLanguage(text);
        setRecognitionLang(detected === 'RU' ? 'ru-RU' : 'de-DE');

        if (detected === 'RU') {
          fromLang = 'RU';
          toLang = 'DE';
        } else {
          fromLang = detected;
          toLang = 'RU';
        }
      } else {
        fromLang = currentRole === 'user' ? 'RU' : 'DE';
        toLang = currentRole === 'user' ? 'DE' : 'RU';
      }

      const response = await fetch(`${config.aiServer}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source_language: fromLang,
          target_language: toLang
        }),
        signal: abortControllerRef.current.signal
      });

      const result = await response.json();
      const translation = result.translated_text || '';

      setTranslatedText(translation);
      setStatus(`✅ ${fromLang} → ${toLang}`);

      // Озвучка перевода
      const targetLangCode = toLang.toLowerCase();
      if ('speechSynthesis' in window && translation) {
        const utterance = new SpeechSynthesisUtterance(translation);
        utterance.lang = targetLangCode === 'ru' ? 'ru-RU' : 'de-DE';
        utterance.rate = 0.9;

        const speakNow = () => {
          const voices = speechSynthesis.getVoices();
          const voice = voices.find(v => v.lang.startsWith(targetLangCode));
          if (voice) utterance.voice = voice;
          speechSynthesis.speak(utterance);
        };

        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.addEventListener('voiceschanged', speakNow, { once: true });
        } else {
          speakNow();
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Игнорируем отменённые запросы
      }
      setStatus('❌ Ошибка перевода');
      setTranslatedText('Ошибка: ' + error.message);
    } finally {
      setIsTranslating(false);
    }
  };

  // Раздельные методы Start/Stop
  const startRecording = () => {
    if (!recognitionRef.current) {
      setStatus('❌ Микрофон недоступен');
      return;
    }
    if (!connectionStatus.speech) {
      setStatus('❌ Speech recognition не готов');
      return;
    }
    setIsRecording(true);
    setStatus('🎤 Запись...');
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Start recording error:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setStatus('⏹️ Остановлено');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Stop recording error:', err);
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleTranslationMode = () => {
    const newMode = translationMode === 'manual' ? 'auto' : 'manual';
    setTranslationMode(newMode);
    setStatus(newMode === 'auto' ? '🤖 Auto режим' : '🎯 Manual режим');

    const newLang = newMode === 'manual'
      ? (currentRole === 'user' ? 'ru-RU' : 'de-DE')
      : 'ru-RU';

    setRecognitionLang(newLang);

    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
      recognitionRef.current.stop();
    }

    initSpeechRecognition();
  };

  const handleRoleChange = (role: 'user' | 'steuerberater') => {
    if (translationMode === 'manual') {
      setCurrentRole(role);
      if (recognitionRef.current) {
        recognitionRef.current.lang = role === 'user' ? 'ru-RU' : 'de-DE';
      }
    }
  };

  const translateText = async () => {
    if (inputText.trim()) {
      await performTranslation(inputText.trim());
    }
  };

  const clearAll = () => {
    stopRecording();
    setInputText('');
    setOriginalText('');
    setTranslatedText('');
    setStatus('🟢 Готов');
  };

  const pasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch { }
  };

  const copyResult = async () => {
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        // Тихое копирование без уведомлений
      } catch { }
    }
  };

  return {
    translationMode,
    currentRole,
    currentMode,
    inputText,
    originalText,
    translatedText,
    isRecording,
    status,
    isTranslating,
    autoTranslate,
    connectionStatus,
    setCurrentMode,
    setInputText,
    setAutoTranslate,
    handleRoleChange,
    startRecording,
    stopRecording,
    toggleRecording,
    translateText,
    clearAll,
    pasteText,
    copyResult,
    performTranslation,
    toggleTranslationMode,
    recognitionLang,
    setRecognitionLang,
    websocketRef,
    setOriginalText
  };
};