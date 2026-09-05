// client/src/components/ui/ConfirmDialog.jsx
import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  loading = false
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      showClose={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full shrink-0 ${confirmVariant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900 mb-1.5">{title}</h4>
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
