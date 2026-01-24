import React from 'react';

/**
 * Компонент лоадера
 * Показывается во время генерации сообщений
 */
const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Точки загрузки */}
      <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-primary loader-dot" />
        <div className="w-3 h-3 rounded-full bg-primary loader-dot" />
        <div className="w-3 h-3 rounded-full bg-primary loader-dot" />
      </div>
      
      {/* Текст */}
      <p className="text-muted-foreground text-sm">Готовлю наживку…</p>
    </div>
  );
};

export default Loader;
