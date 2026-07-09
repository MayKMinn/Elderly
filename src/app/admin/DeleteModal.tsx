import { AlertTriangle, X } from "lucide-react";

interface DeleteModalProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteModal({ name, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex justify-end p-3">
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"
          >
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>

        <div className="px-6 pb-6 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#fff7ed" }}
          >
            <AlertTriangle size={28} style={{ color: "#f97316" }} />
          </div>
          <h2 className="text-base mb-2" style={{ color: "#1a2b42", fontWeight: 700 }}>
            Delete {name}?
          </h2>
          <p className="text-sm" style={{ color: "#6b7a99" }}>
            This action cannot be undone. This will permanently remove Mary Wilson's profile and all associated data.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2 rounded-lg text-sm text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#ef4444" }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
