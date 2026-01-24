import React, { useState } from 'react';
import ChipSelect from './ChipSelect';
import Loader from './Loader';
import Result from './Result';
import { generateMessages } from '../api/api';
import { toast } from 'sonner';

interface FormProps {
  telegramId: number;
  onHapticFeedback: (type?: 'light' | 'medium' | 'heavy') => void;
  onHapticSuccess: () => void;
}

// Опции для выбора платформы
const platformOptions = [
  { value: 'tinder', label: 'Tinder' },
  { value: 'pure', label: 'Pure' },
  { value: 'twinby', label: 'Twinby' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'real', label: 'Реальная жизнь' },
];

// Опции для выбора стадии
const stageOptions = [
  { value: 'first', label: 'Первое сообщение' },
  { value: 'transition', label: 'Переход в мессенджер' },
  { value: 'chatting', label: 'Уже общаемся' },
];

/**
 * Основная форма приложения
 * Содержит выбор платформы, стадии и поле ввода
 */
const Form: React.FC<FormProps> = ({ telegramId, onHapticFeedback, onHapticSuccess }) => {
  // Состояние формы
  const [platform, setPlatform] = useState('');
  const [stage, setStage] = useState('');
  const [girlInfo, setGirlInfo] = useState('');
  
  // Состояние загрузки и результатов
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  // Обработчик выбора платформы
  const handlePlatformChange = (value: string) => {
    onHapticFeedback('light');
    setPlatform(value);
  };

  // Обработчик выбора стадии
  const handleStageChange = (value: string) => {
    onHapticFeedback('light');
    setStage(value);
  };

  // Проверка заполненности формы
  const isFormValid = platform && stage && girlInfo.trim().length > 0;

  // Генерация сообщений
  const handleGenerate = async () => {
    if (!isFormValid) return;

    onHapticFeedback('medium');
    setLoading(true);

    try {
      const response = await generateMessages({
        telegram_id: telegramId,
        platform,
        stage,
        girl_info: girlInfo,
      });
      
      if (response.success) {
        setMessages(response.messages);
        onHapticSuccess();
      } else {
        throw new Error(response.error || 'Ошибка генерации');
      }
    } catch (error) {
      console.error('Ошибка генерации:', error);
      toast.error(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Сброс результатов
  const handleReset = () => {
    onHapticFeedback('light');
    setMessages([]);
  };

  // Если есть результаты — показываем их
  if (messages.length > 0) {
    return (
      <Result
        messages={messages}
        onReset={handleReset}
        onHapticSuccess={onHapticSuccess}
      />
    );
  }

  // Если загрузка — показываем лоадер
  if (loading) {
    return <Loader />;
  }

  // Основная форма
  return (
    <div className="py-4">
      {/* Выбор платформы */}
      <ChipSelect
        options={platformOptions}
        value={platform}
        onChange={handlePlatformChange}
        label="Где познакомились?"
      />

      {/* Выбор стадии */}
      <ChipSelect
        options={stageOptions}
        value={stage}
        onChange={handleStageChange}
        label="Стадия общения"
      />

      {/* Поле ввода информации */}
      <div className="section-gap">
        <label className="label-text">Детали</label>
        <textarea
          value={girlInfo}
          onChange={(e) => setGirlInfo(e.target.value)}
          placeholder="Множество образов на фото, кудрявые волосы, любит поэзию&#10;&#10;Был вкуснейший ужин, уют и улыбка"
          className="input-field min-h-[120px]"
          rows={4}
        />
      </div>

      {/* Кнопка генерации */}
      <button
        onClick={handleGenerate}
        disabled={!isFormValid}
        className="btn-primary mt-2"
      >
        Сгенерировать сообщение
      </button>
    </div>
  );
};

export default Form;
