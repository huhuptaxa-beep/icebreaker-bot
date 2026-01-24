import React from 'react';

interface OnboardingProps {
  onStart: () => void;
}

/**
 * Экран онбординга
 * Показывается при первом запуске приложения
 */
const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Иконка */}
      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-8">
        <svg
          className="w-10 h-10 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>

      {/* Заголовок */}
      <h1 className="text-2xl font-bold text-center mb-3 leading-tight">
        Не думай — пиши первый
      </h1>

      {/* Подзаголовок */}
      <p className="text-muted-foreground text-center text-base mb-12 max-w-xs">
        Дам уникальные слова — только для неё
      </p>

      {/* Кнопка */}
      <button onClick={onStart} className="btn-primary max-w-xs">
        Начать
      </button>
    </div>
  );
};

export default Onboarding;
