import { HumanSessionGate } from "@/components/operations-review/HumanSessionGate";
import { OperationsReviewList } from "@/components/operations-review/OperationsReviewList";

export default function OperationsReviewPage() {
    return (
        <HumanSessionGate>
            <OperationsReviewList />
        </HumanSessionGate>
    );
}
