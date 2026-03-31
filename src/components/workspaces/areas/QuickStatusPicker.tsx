"use client";

import React, { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

type TaskStatus = "inbox" | "planned" | "done";

interface QuickStatusPickerProps {
    status: TaskStatus;
    onStatusChange: (newStatus: TaskStatus) => void;
    disabled?: boolean;
}

const statusConfig: Record<TaskStatus, { label: string; bg: string; text: string; hover: string }> = {
    inbox: { 
        label: "Inbox", 
        bg: "bg-neutral-200", 
        text: "text-neutral-600",
        hover: "hover:bg-neutral-300"
    },
    planned: { 
        label: "Planned", 
        bg: "bg-blue-500", 
        text: "text-white",
        hover: "hover:bg-blue-600"
    },
    done: { 
        label: "Done", 
        bg: "bg-emerald-500", 
        text: "text-white",
        hover: "hover:bg-emerald-600"
    },
};

export default function QuickStatusPicker({ status, onStatusChange, disabled }: QuickStatusPickerProps) {
    const current = statusConfig[status] || statusConfig.inbox;

    return (
        <Menu as="div" className="relative inline-block text-left w-20 h-7" onClick={(e) => e.stopPropagation()}>
            <div>
                <Menu.Button 
                    disabled={disabled}
                    className={`group w-full h-full flex items-center justify-center gap-1 rounded-[2px] text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm active:scale-[0.98] ${current.bg} ${current.text} ${current.hover} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <span className="truncate ml-1">{current.label}</span>
                </Menu.Button>
            </div>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute left-0 mt-1 w-32 origin-top-left rounded-md bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
                    <div className="py-1">
                        {(Object.keys(statusConfig) as TaskStatus[]).map((s) => {
                            const config = statusConfig[s];
                            const isSelected = s === status;
                            
                            return (
                                <Menu.Item key={s}>
                                    {({ active }) => (
                                        <button
                                            onClick={() => onStatusChange(s)}
                                            className={`${
                                                active ? "bg-neutral-50" : ""
                                            } ${
                                                isSelected ? "bg-neutral-100/50" : ""
                                            } flex w-full items-center px-3 py-2 text-xs font-bold transition-colors`}
                                        >
                                            <div className={`w-3 h-3 rounded-sm mr-2 ${config.bg} border border-black/5 shrink-0`} />
                                            <span className={`flex-1 text-left uppercase tracking-tight ${isSelected ? "text-black" : "text-neutral-600"}`}>
                                                {config.label}
                                            </span>
                                            {isSelected && (
                                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                            )}
                                        </button>
                                    )}
                                </Menu.Item>
                            );
                        })}
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
}
