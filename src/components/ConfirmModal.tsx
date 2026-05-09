import React from "react";
import { X, AlertTriangle, Trash2, ShieldCheck, ShieldOff } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  type: "danger" | "warning" | "info";
  loading?: boolean;
}

const iconMap = {
  danger: <Trash2 size={20} className="text-red-600" />,
  warning: <AlertTriangle size={20} className="text-amber-600" />,
  info: <ShieldCheck size={20} className="text-blue-600" />,
};

const colorMap = {
  danger: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    button: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  type,
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = colorMap[type];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg} ${colors.border}`}>
              {iconMap[type]}
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{description}</p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 ${colors.button}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {confirmText}
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
