import React, { useState } from "react";

/* ==============================
   SLIDE DATA
============================== */

const slides = [
  {
    gradient: "from-blue-600 to-indigo-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.275 2.694 2.722 3.038a22.5 22.5 0 005.556.734c2.09 0 4.1-.304 5.906-.882A23.1 23.1 0 0021 15.51V6.82c0-1.125-.834-2.07-1.955-2.265A48.5 48.5 0 0012 4c-2.868 0-5.63.381-8.045 1.555A2.25 2.25 0 002.25 7.82v7.69z" />
      </svg>
    ),
    title: "Пиши первым без страха",
    desc: "AI создаёт уникальные первые сообщения на основе профиля девушки — смешные, интригующие, цепляющие.",
  },
  {
    gradient: "from-violet-600 to-purple-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    title: "Веди диалог уверенно",
    desc: "Вставь её ответ — получи 3 варианта следующего шага. Реакции, провокации, флирт — по ситуации.",
  },
  {
    gradient: "from-pink-500 to-rose-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    title: "Больше свиданий",
    desc: "История диалога учит AI подбирать лучшие слова именно под неё. Чем больше пишешь — тем точнее советы.",
  },
];

/* ==============================
   COMPONENT
============================== */

interface OnboardingProps {
  onStart: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const goTo = (idx: number) => {
    setCurrent(idx);
    setAnimKey((k) => k + 1);
  };

  const next = () => {
    if (current < slides.length - 1) goTo(current + 1);
    else onStart();
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div
      className="min-h-screen flex flex-col bg-[#F6F7FB]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Icon */}
        <div
          className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center text-white shadow-2xl mb-10`}
          style={{ transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)" }}
        >
          {slide.icon}
        </div>

        {/* Text — re-mounts on slide change for animation */}
        <div key={animKey} className="text-center animate-slideContent">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {slide.title}
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-xs mx-auto">
            {slide.desc}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 flex flex-col items-center gap-5">
        {/* Dots */}
        <div className="flex gap-2 items-center">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? "28px" : "8px",
                height: "8px",
                background: i === current ? "#3B5BDB" : "#CBD5E1",
              }}
            />
          ))}
        </div>

        {/* Primary button */}
        <button
          onClick={next}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform"
          style={{
            background: isLast
              ? "linear-gradient(135deg, #E11D48, #F43F5E)"
              : "linear-gradient(135deg, #3B5BDB, #4F46E5)",
          }}
        >
          {isLast ? "Начать →" : "Далее"}
        </button>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onStart}
            className="text-sm text-gray-400 py-1 active:opacity-60 transition-opacity"
          >
            Пропустить
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
