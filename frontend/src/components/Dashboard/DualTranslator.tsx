import React, { useEffect, useRef, useState } from 'react';
import { useTranslator } from '../../hooks/useTranslator';
import RoomJoin from './RoomJoin';

const DualTranslator: React.FC = () => {
  const {
    originalText,
    translatedText,
    isRecording,
    status,
    startRecording,
    stopRecording,
    toggleRecording,
    connectionStatus,
    recognitionLang,
    setRecognitionLang,
    websocketRef,
    clearAll,
    translateText,
    setOriginalText
  } = useTranslator();

  const dialects = ['de-DE', 'de-AT', 'ru-RU'];
  const dialectNames = {
    'de-DE': '🇩🇪 Deutschland',
    'de-AT': '🇦🇹 Österreich',
    'ru-RU': '🇷🇺 Русский'
  };

  const [dialect, setDialect] = useState(recognitionLang);
  const [dialectIndex, setDialectIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    speaker: string;
    lang: string;
    text: string;
    translation: string;
    timestamp: string;
  }>>([]);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleJoinRoom = (code: string, name: string) => {
    setRoomCode(code);
    setUsername(name);

    if (websocketRef?.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'join_room',
        room: code,
        username: name
      }));
      setIsConnected(true);
    }
  };

  // Hotkeys handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTextarea = target.tagName === 'TEXTAREA';
      
      // Enter - Start/Stop запись (НЕ в textarea или без Shift)
      if (e.code === 'Enter' && !isTextarea) {
        e.preventDefault();
        toggleRecording();
        return;
      }
      
      // Shift+Enter в textarea - обычный перенос (не блокируем)
      if (e.code === 'Enter' && isTextarea && e.shiftKey) {
        return; // Браузер сам обработает
      }
      
      // Ctrl/Cmd+Enter в textarea - ручной перевод
      if (e.code === 'Enter' && isTextarea && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        translateText();
        return;
      }
      
      // Cmd+L / Ctrl+L - переключение диалекта
      if (e.code === 'KeyL' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const nextIndex = (dialectIndex + 1) % dialects.length;
        setDialectIndex(nextIndex);
        const newDialect = dialects[nextIndex];
        setDialect(newDialect);
        setRecognitionLang(newDialect);
        return;
      }
      
      // Esc - Stop запись
      if (e.code === 'Escape') {
        e.preventDefault();
        stopRecording();
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialectIndex, isRecording]);

  useEffect(() => {
    if (translatedText && translatedText !== 'Перевод появится здесь...' && originalText) {
      const newEntry = {
        speaker: username || (dialect.startsWith('ru') ? 'RU' : 'DE'),
        lang: dialect,
        text: originalText,
        translation: translatedText,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };
      setConversationHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].text === originalText) return prev;
        return [...prev, newEntry];
      });
    }
  }, [translatedText]);

  useEffect(() => setDialect(recognitionLang), [recognitionLang]);
  
  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = leftPanelRef.current.scrollHeight;
  }, [originalText]);
  
  useEffect(() => {
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = rightPanelRef.current.scrollHeight;
  }, [translatedText]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Тихое копирование без уведомлений
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const getLanguageDirection = () => {
    return dialect.startsWith('ru') ? 'RU → DE' : 'DE → RU';
  };

  return (
    <>
      {!isConnected && <RoomJoin onJoin={handleJoinRoom} />}
      <div className="w-full h-screen flex flex-col bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600">
        <header className="flex justify-between items-center p-6">
          <h1 className="text-white text-3xl font-bold">🎤 Dual Translator</h1>
          
          <div className="px-4 py-2 bg-white/20 rounded-lg text-white font-semibold">
            {dialectNames[dialect as keyof typeof dialectNames]}
          </div>

          <div className="flex gap-3">
            <button
              onClick={toggleRecording}
              disabled={!connectionStatus.speech}
              className={`px-8 py-4 rounded-xl font-semibold text-white text-lg shadow-lg transition-all ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed'
              }`}
            >
              {isRecording ? '⏹️ Stop' : '▶️ Start'}
            </button>

            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-white text-sm"
            >
              🗑️ Очистить
            </button>
          </div>

          <div className="flex gap-3">
            <div 
              className={`w-3 h-3 rounded-full ${connectionStatus.ws ? 'bg-green-400' : 'bg-red-400'}`}
              title={connectionStatus.ws ? 'WebSocket' : 'WebSocket offline'}
            />
            <div 
              className={`w-3 h-3 rounded-full ${connectionStatus.ai ? 'bg-green-400' : 'bg-red-400'}`}
              title={connectionStatus.ai ? 'AI Server' : 'AI Server offline'}
            />
            <div 
              className={`w-3 h-3 rounded-full ${connectionStatus.speech ? 'bg-green-400' : 'bg-red-400'}`}
              title={connectionStatus.speech ? 'Микрофон' : 'Микрофон недоступен'}
            />
          </div>
        </header>

        <div className="px-6 pb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center text-white">
            <span>{status}</span>
            <span className="ml-3 text-sm opacity-70">
              {isConnected 
                ? `Комната: ${roomCode} | ${username}` 
                : `${getLanguageDirection()} | Cmd+L=язык, Enter=запись, Esc=стоп`
              }
            </span>
          </div>
        </div>

        <main className="flex-1 flex gap-4 px-6 pb-6">
          {/* Левая панель - Оригинал с textarea */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-semibold">🗣️ Оригинал</h2>
              <button
                onClick={() => copyToClipboard(originalText)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm"
                disabled={!originalText}
              >
                📋 Копировать
              </button>
            </div>
            
            <textarea
              ref={textareaRef}
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Начните говорить или печатать..."
              className="flex-1 bg-white/5 rounded-xl p-4 text-white text-lg leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>

          {/* Правая панель - Перевод */}
          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-semibold">🌐 Перевод</h2>
              <button
                onClick={() => copyToClipboard(translatedText)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm"
                disabled={!translatedText}
              >
                📋 Копировать
              </button>
            </div>
            
            <div ref={rightPanelRef} className="flex-1 bg-white/5 rounded-xl p-4 overflow-y-auto">
              <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                {translatedText || 'Перевод появится здесь...'}
              </p>
            </div>
          </div>
        </main>

        <footer className="bg-white/10 backdrop-blur-sm p-6 text-white">
          <h3 className="font-semibold mb-3 text-lg">🕐 История разговора</h3>
          <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
            {conversationHistory.length === 0 ? (
              <p className="text-white/50 text-center py-4">История пуста</p>
            ) : (
              conversationHistory.map((msg, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-3 border-l-4 border-white/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">{msg.speaker}</span>
                    <span className="text-sm opacity-70">{msg.timestamp}</span>
                  </div>
                  <div className="text-base">
                    <p className="mb-1">{msg.text}</p>
                    <p className="text-white/80 italic">→ {msg.translation}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </footer>
      </div>
    </>
  );
};

export default DualTranslator;