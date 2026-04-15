// context/SessionSummaryContext.tsx
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import SessionSummaryModal from "../Components/common/SessionSummaryModal";

export type SessionSummaryData = {
  title: string;
  xpEarned: number;
  accuracy?: number;
  streakPeak?: number;
  weakestArea?: string;
  improvedArea?: string;
  unlocked?: string[];
};

type SessionSummaryOptions = {
  onClose?: () => void;
};

type SessionSummaryState = {
  summary: SessionSummaryData;
  onClose?: () => void;
} | null;

type SessionSummaryContextType = {
  showSessionSummary: (
    summary: SessionSummaryData,
    options?: SessionSummaryOptions,
  ) => void;
  hideSessionSummary: () => void;
};

const SessionSummaryContext = createContext<
  SessionSummaryContextType | undefined
>(undefined);

export const SessionSummaryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [state, setState] = useState<SessionSummaryState>(null);
  const closeCallbackRef = useRef<(() => void) | undefined>(undefined);

  const showSessionSummary = (
    summary: SessionSummaryData,
    options?: SessionSummaryOptions,
  ) => {
    closeCallbackRef.current = options?.onClose;
    setState({
      summary,
      onClose: options?.onClose,
    });
  };

  const hideSessionSummary = () => {
    closeCallbackRef.current = undefined;
    setState(null);
  };

  const handleClose = () => {
    const callback = closeCallbackRef.current;
    closeCallbackRef.current = undefined;
    setState(null);
    callback?.();
  };

  const value = useMemo(
    () => ({
      showSessionSummary,
      hideSessionSummary,
    }),
    [],
  );

  return (
    <SessionSummaryContext.Provider value={value}>
      {children}

      <SessionSummaryModal
        visible={!!state}
        summary={state?.summary ?? null}
        onClose={handleClose}
      />
    </SessionSummaryContext.Provider>
  );
};

export const useSessionSummary = () => {
  const context = useContext(SessionSummaryContext);

  if (!context) {
    throw new Error(
      "useSessionSummary must be used within SessionSummaryProvider",
    );
  }

  return context;
};
