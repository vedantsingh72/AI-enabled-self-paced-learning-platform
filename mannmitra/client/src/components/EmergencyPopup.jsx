const EmergencyPopup = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
        <h3 className="text-xl font-bold text-red-600">
          Immediate Support Available
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Please choose one option for immediate help:
        </p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="mm-btn-danger w-full"
          >
            Call emergency helpline
          </button>
          <button type="button" className="mm-btn-primary w-full">
            Chat counsellor now
          </button>
          <button type="button" className="mm-btn-secondary w-full">
            Share contact optional
          </button>
          <button type="button" onClick={onClose} className="mm-btn-success w-full">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
export default EmergencyPopup;
