import React from 'react';

/**
 * Экран ошибки
 * Показывается, если приложение открыто вне Telegram
 */
const ErrorScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Иконка ошибки */}
      <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Заголовок */}
      <h1 className="text-xl font-bold text-center mb-3">
        Откройте в Telegram
      </h1>

      {/* Описание */}
      <p className="text-muted-foreground text-center text-sm max-w-xs">
        Это приложение работает только внутри Telegram. Откройте его через бот @YourBotName
      </p>

      {/* Telegram иконка */}
      <div className="mt-8">
        <svg
          className="w-12 h-12 text-primary opacity-50"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.099.154.231.17.325.015.093.034.305.019.471z"/>
        </svg>
      </div>
    </div>
  );
};

export default ErrorScreen;
