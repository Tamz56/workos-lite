"use client";

import { Modal } from "@/components/ui/Modal";
import type { UiApprovalState } from "@/lib/project-import/client/projectImportUiTypes";

type Props = {
    open: boolean;
    entityLabel: string;
    batchReference: string | null;
    approval: UiApprovalState | null;
    eligibleRowCount: number;
    executing: boolean;
    focusRestoreRef?: React.RefObject<HTMLElement | null>;
    onCancel: () => void;
    onConfirm: () => void;
};

export function ExecuteConfirmationModal({
    open,
    entityLabel,
    batchReference,
    approval,
    eligibleRowCount,
    executing,
    focusRestoreRef,
    onCancel,
    onConfirm,
}: Props) {
    return (
        <Modal
            isOpen={open}
            title="ยืนยันการนำเข้าข้อมูล"
            onClose={onCancel}
            maxWidth="max-w-lg"
            closeOnOutsideClick={false}
            focusRestoreRef={focusRestoreRef}
            focusTrap
            dismissible={!executing}
        >
            <div className="space-y-4 text-sm text-neutral-700">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="font-bold text-neutral-900">{entityLabel}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                        Batch: {batchReference ?? "-"} · Approval: {approval?.approvalId ? `${approval.approvalId.slice(0, 20)}...` : "-"}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-neutral-700">
                        แถวที่นำเข้า: {eligibleRowCount} แถว
                    </div>
                </div>

                <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-600">
                    <li>เป็นการนำเข้าแบบ insert-only (เพิ่มข้อมูลใหม่เท่านั้น)</li>
                    <li>ไม่มีการเขียนทับ แก้ไข ลบ หรือยกเลิกการเก็บถาวรข้อมูลเดิม</li>
                    <li>ระบบจะตรวจสอบความถูกต้องของข้อมูลซ้ำอีกครั้งก่อนเขียน (stale-state revalidation)</li>
                    <li>การนำเข้าเป็น atomic transaction — ถ้าล้มเหลวจะย้อนกลับทั้งหมด</li>
                    <li>หากเครือข่ายขาดระหว่างดำเนินการ โปรดตรวจสอบประวัติก่อนลองใหม่</li>
                </ul>

                {executing && (
                    <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-800">
                        กำลังนำเข้าข้อมูล... กรุณาอย่าปิดหน้านี้
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={executing}
                        className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={executing}
                        className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-black text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                        {executing ? "กำลังนำเข้า..." : "ยืนยันนำเข้าข้อมูล"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
