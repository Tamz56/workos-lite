"use client";

import TrashIcon from "../icons/TrashIcon";

type Props = {
    title?: string;
    disabled?: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
};

export default function DangerIconButton({
    title = "Delete",
    disabled,
    onClick,
    className = "",
}: Props) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
            className={[
                "inline-flex items-center justify-center",
                "h-9 w-9 rounded-lg",
                "border border-gray-200 bg-white",
                "text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200",
                "transition-colors disabled:opacity-50",
                className,
            ].join(" ")}
        >
            <TrashIcon />
        </button>
    );
}
