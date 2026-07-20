import { LabelClient } from "@/components/label-client";

export default async function ProductLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LabelClient productId={id} />;
}
