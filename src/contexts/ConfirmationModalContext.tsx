'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CentralConfirmationModal } from '@/components/common/CentralConfirmationModal';

export type ModalType = 'success' | 'error';

export interface ModalOptions {
  title: string;
  message: string;
  referenceText?: string;
  badgeText?: string;
  duration?: number;
  autoClose?: boolean;
  onCloseCallback?: () => void;
}

export interface ModalState extends ModalOptions {
  isOpen: boolean;
  type: ModalType;
}

interface ConfirmationModalContextType {
  showSuccess: (options: ModalOptions) => void;
  showError: (options: ModalOptions) => void;
  closeModal: () => void;
}

const ConfirmationModalContext = createContext<ConfirmationModalContextType>({
  showSuccess: () => {},
  showError: () => {},
  closeModal: () => {},
});

const INITIAL_STATE: ModalState = {
  isOpen: false,
  type: 'success',
  title: '',
  message: '',
  referenceText: '',
  badgeText: '',
  duration: 2800,
  autoClose: true,
};

export function ConfirmationModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>(INITIAL_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<(() => void) | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const closeModal = useCallback(() => {
    clearTimer();
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (callbackRef.current) {
      const cb = callbackRef.current;
      callbackRef.current = undefined;
      setTimeout(() => cb(), 50);
    }
  }, [clearTimer]);

  const showModal = useCallback(
    (type: ModalType, options: ModalOptions) => {
      clearTimer();
      callbackRef.current = options.onCloseCallback;

      const defaultDuration = type === 'success' ? 2800 : 4800;
      const duration = options.duration ?? defaultDuration;
      const autoClose = options.autoClose !== false;

      setModalState({
        isOpen: true,
        type,
        title: options.title,
        message: options.message,
        referenceText: options.referenceText,
        badgeText: options.badgeText,
        duration,
        autoClose,
      });

      if (autoClose && duration > 0) {
        timerRef.current = setTimeout(() => {
          closeModal();
        }, duration);
      }
    },
    [clearTimer, closeModal]
  );

  const showSuccess = useCallback(
    (options: ModalOptions) => showModal('success', options),
    [showModal]
  );

  const showError = useCallback(
    (options: ModalOptions) => showModal('error', { autoClose: false, ...options }),
    [showModal]
  );

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return (
    <ConfirmationModalContext.Provider value={{ showSuccess, showError, closeModal }}>
      {children}
      <CentralConfirmationModal modalState={modalState} onClose={closeModal} />
    </ConfirmationModalContext.Provider>
  );
}

export const useConfirmationModal = () => useContext(ConfirmationModalContext);

