import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

/* ==============================
   TYPES
============================== */

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

/* ==============================
   CONTEXT
============================== */

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useAppToast = () => useContext(ToastContext);

let _nextId = 0;

/* ==============================
   PROVIDER
============================== */

export const AppToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++_nextId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — top of screen, above everything */}
      <div
        className="fixed top-0 left-0 right-0 z-[200] flex flex-col gap-2 px-4 pointer-events-none"
        style={{ paddingTop: "env(safe-area-inset-top, 12px)" }}
      >
        {toasts.map((t) => (
          <ToastBubble key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/* ==============================
   SINGLE TOAST BUBBLE
============================== */

const STYLES: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: "linear-gradient(135deg,#16a34a,#15803d)", icon: "✓" },
  error:   { bg: "linear-gradient(135deg,#dc2626,#b91c1c)", icon: "✕" },
  info:    { bg: "linear-gradient(135deg,#2A2A2A,#1A1A1A)", icon: "i" },
};

const ToastBubble: React.FC<{
  toast: ToastItem;
  onDismiss: () => void;
}> = ({ toast, onDismiss }) => {
  const [phase, setPhase] = useState<"in" | "visible" | "out">("in");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // slide in
    const t1 = setTimeout(() => setPhase("visible"), 10);
    // start slide out
    const t2 = setTimeout(() => setPhase("out"), 2700);
    // remove after animation
    timerRef.current = setTimeout(onDismiss, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(timerRef.current);
    };
  }, []);

  const style = STYLES[toast.type];

  const translateY =
    phase === "in" ? "-60px" : phase === "out" ? "-60px" : "0px";
  const opacity = phase === "visible" ? 1 : 0;

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-medium select-none cursor-pointer"
      style={{
        background: style.bg,
        transform: `translateY(${translateY})`,
        opacity,
        transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease",
        maxWidth: "100%",
      }}
      onClick={onDismiss}
    >
      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/25 text-xs font-bold flex-shrink-0">
        {style.icon}
      </span>
      <span className="flex-1">{toast.message}</span>
    </div>
  );
};
