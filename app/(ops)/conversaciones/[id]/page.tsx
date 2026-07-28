import { ConversationInspectorView } from "@/components/conversations/ConversationInspectorView";

export default async function ConversacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationInspectorView id={id} />;
}
