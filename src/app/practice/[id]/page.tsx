import { notFound } from "next/navigation";
import QuestionPractice from "@/components/question-practice";
import { CACHE_ACTIVITY } from "@/lib/cache-activity";
import { QUESTIONS } from "@/lib/curriculum";

const activities = [...QUESTIONS, CACHE_ACTIVITY];
type Params = { params: Promise<{ id: string }> };
export const dynamicParams = false;

export function generateStaticParams() {
  return activities.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const activity = activities.find((item) => item.id === id);
  return {
    title: activity
      ? activity.title + " · Interview Practice"
      : "Interview Practice",
  };
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  const question = activities.find((item) => item.id === id);
  if (!question) notFound();
  return <QuestionPractice key={id} question={question} />;
}
