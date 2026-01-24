import React, { useState } from 'react';

interface MessageCardProps {
  message: string;
  index: number;
  onCopy: () => void;
}

/**
 * Карточка с сгенерированным сообщением
 * Включает кнопку копирования
 */
const MessageCard: React.FC<MessageCardProps> = ({ message, index, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      onCopy();
      
      // Сбрасываем состояние через 2 секунды
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  return (
    <div className="message-card mb-3">
      {/* Номер сообщения */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Вариант {index + 1}</span>
        <button
          onClick={handleCopy}
          className={`btn-copy ${copied ? 'btn-copy-success' : ''}`}
        >
          {copied ? (
            <>
              <svg
                className="w-3 h-3 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Скопировано
            </>
          ) : (
            <>
              <svg
                className="w-3 h-3 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Скопировать
            </>
          )}
        </button>
      </div>
      
      {/* Текст сообщения */}
      <p className="text-foreground text-sm leading-relaxed">{message}</p>
    </div>
  );
};

export default MessageCard;
