export default function EmergencyHelpPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400/90">
        Safety
      </p>
      <h2 className="mt-2 mm-heading md:text-3xl">Emergency mental health help</h2>
      <p className="mt-2 mm-subtle">
        If there is immediate danger of self-harm or harm to others, call local
        emergency services now. Do not wait for chat replies.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="mm-card">
          <h3 className="font-semibold text-slate-900">Immediate Actions (First 5 minutes)</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Call emergency services and share exact location.</li>
            <li>Stay with a trusted person; do not isolate yourself.</li>
            <li>Move away from sharp objects, medicines, or unsafe places.</li>
            <li>Use slow breathing: inhale 4s, hold 4s, exhale 6s.</li>
            <li>Message a trusted contact: &quot;I need urgent support now.&quot;</li>
          </ul>
        </div>
        <div className="mm-card">
          <h3 className="font-semibold text-slate-900">Emergency Contact Checklist</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Your institute counselling center/front office</li>
            <li>Hostel warden / resident advisor</li>
            <li>Local ambulance / police / emergency number</li>
            <li>Parent, guardian, or trusted friend</li>
            <li>Nearest hospital emergency department</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 mm-card">
        <h3 className="font-semibold text-slate-900">Safety Plan Template</h3>
        <div className="mt-2 space-y-2 text-sm text-slate-600">
          <p>1) My warning signs: panic, hopeless thoughts, withdrawal.</p>
          <p>2) My coping steps: breathing, water, short walk, grounding.</p>
          <p>3) People I can call now: friend, mentor, counsellor.</p>
          <p>4) Safe places: common room, office, library, clinic.</p>
          <p>5) Professional help: institute counsellor and emergency room.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/30 p-4">
        <h3 className="font-semibold text-red-300">Crisis Warning Signs</h3>
        <p className="mt-2 text-sm text-red-200/90">
          Seek urgent help if there are suicidal thoughts, self-harm intent,
          extreme panic, loss of contact with reality, or inability to stay safe.
        </p>
      </div>
    </div>
  );
}
