import React from 'react';
import MessageCard from './MessageCard';

interface ResultProps {
  messages: string[];
  onReset: () => void;
  onHapticSuccess: () => void;
}

/**
 * Компонент результатов
 * Показывает сгенерированные сообщения
 */
const Result: React.FC<ResultProps> = ({ messages, onReset, onHapticSuccess }) => {
  return (
    <div className="py-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Готово! 🎣</h2>
        <button
          onClick={onReset}
          className="text-primary text-sm font-medium"
        >
          Ещё раз
        </button>
      </div>

      {/* Сообщения */}
      <div className="space-y-3">
        {messages.map((message, index) => (
          <MessageCard
            key={index}
            message={message}
            index={index}
            onCopy={onHapticSuccess}
          />
        ))}
      </div>

      {/* Подсказка */}
      <p className="text-center text-muted-foreground text-xs mt-6">
        Нажми на сообщение, чтобы скопировать
      </p>
    </div>
  );
};

export default Result;
