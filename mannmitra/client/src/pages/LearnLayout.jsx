import { Outlet } from "react-router-dom";
import { AdaptiveLearningProvider } from "../context/AdaptiveLearningContext";
import LearningPrivacyModal from "../components/LearningPrivacyModal";
import { LearningEnergyMeter } from "../components/LearningEnergyMeter";

export default function LearnLayout() {
  return (
    <AdaptiveLearningProvider>
      <div className="border-b border-stone-200 bg-white px-4 py-2 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Adaptive study</p>
          <LearningEnergyMeter />
        </div>
      </div>
      <LearningPrivacyModal />
      <Outlet />
    </AdaptiveLearningProvider>
  );
}
