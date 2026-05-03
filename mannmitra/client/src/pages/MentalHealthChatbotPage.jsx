import MentalHealthChatbot from "../components/MentalHealthChatbot";

/** Full-page Talk mate chat (signed-in students). Landing uses embedded variant. */
export default function MentalHealthChatbotPage() {
  return (
    <div className="px-4 py-6 md:px-8">
      <MentalHealthChatbot variant="page" />
    </div>
  );
}
