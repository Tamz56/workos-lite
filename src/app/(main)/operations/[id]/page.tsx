import { HumanSessionGate } from "@/components/operations-review/HumanSessionGate";
import { OperationReviewDetail } from "@/components/operations-review/OperationReviewDetail";

export default async function OperationReviewDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <HumanSessionGate>
            <OperationReviewDetail operationId={id} />
        </HumanSessionGate>
    );
}
