import React, { useState } from 'react';
import ChipSelect from './ChipSelect';
import Loader from './Loader';
import Result from './Result';
import { generateMessages } from '../api/api';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface FormProps {
  telegramId: number;
  onHapticFeedback: (type?: 'light' | 'medium' | 'heavy') => void;
  onHapticSuccess: () => void;
}

// Опции для выбора стадии
const stageOptions = [
  { value: 'first', label: 'Первое сообщение' },
  { value: 'transition', label: 'Переход в мессенджер' },
  { value: 'chatting', label: 'Уже общаемся' },
];

/**
 * Основная форма приложения
 * Содержит выбор стадии и поле ввода
 */
const Form: React.FC<FormProps> = ({ telegramId, onHapticFeedback, onHapticSuccess }) => {
  // Состояние формы
  const [stage, setStage] = useState('');
  const [girlInfo, setGirlInfo] = useState('');
  const [instructionOpen, setInstructionOpen] = useState(false);
  
  // Состояние загрузки и результатов
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  // Обработчик выбора стадии
  const handleStageChange = (value: string) => {
    onHapticFeedback('light');
    setStage(value);
  };

  // Открытие инструкции
  const handleOpenInstruction = () => {
    onHapticFeedback('light');
    setInstructionOpen(true);
  };

  // Проверка заполненности формы
  const isFormValid = stage && girlInfo.trim().length > 0;

  // Генерация сообщений
  const handleGenerate = async () => {
    if (!isFormValid) return;

    onHapticFeedback('medium');
    setLoading(true);

    try {
      const response = await generateMessages({
        telegram_id: telegramId,
        platform: 'default',
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
      {/* Выбор стадии */}
      <ChipSelect
        options={stageOptions}
        value={stage}
        onChange={handleStageChange}
        label="Стадия общения"
      />

      {/* Поле ввода информации */}
      <div className="section-gap">
        <div className="flex items-center justify-between">
          <label className="label-text">Детали</label>
          <button
            type="button"
            onClick={handleOpenInstruction}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Инструкция"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
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

      {/* Bottom Sheet с инструкцией */}
      <Sheet open={instructionOpen} onOpenChange={setInstructionOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8">
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg">Как заполнить</SheetTitle>
          </SheetHeader>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Напиши всё, что ты о ней знаешь или заметил. Детали внешности, факты из её описания или интересов. Чем живее описание — тем лучше получится сообщение.
          </p>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Form;
