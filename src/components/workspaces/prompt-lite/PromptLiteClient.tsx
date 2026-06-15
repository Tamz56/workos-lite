"use client";

import React, { useState } from "react";
import { 
    Sparkles, 
    Copy, 
    Check, 
    Trash2, 
    ArrowLeft, 
    BookOpen, 
    Search, 
    Sliders, 
    Eye, 
    FileText, 
    Code, 
    HelpCircle 
} from "lucide-react";
import Link from "next/link";

interface QuickPromptItem {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    hoverColor: string;
    activeBg: string;
    textColor: string;
    borderColor: string;
    template: string;
}

export default function PromptLiteClient() {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [copied, setCopied] = useState(false);
    const [activePromptId, setActivePromptId] = useState<string | null>(null);

    const prompts: QuickPromptItem[] = [
        {
            id: "understand",
            label: "Understand",
            description: "ช่วยอธิบายเนื้อหาและหลักการให้เข้าใจง่ายเชิงลึก",
            icon: <BookOpen className="w-4 h-4" />,
            color: "from-violet-500 to-purple-600",
            hoverColor: "hover:border-violet-300 hover:bg-violet-50/20",
            activeBg: "bg-violet-600 border-violet-600 text-white",
            textColor: "text-violet-700",
            borderColor: "border-violet-100",
            template: `คุณคือผู้ช่วยอธิบายความรู้เชิงระบบ
โปรดอธิบายเรื่องต่อไปนี้ให้เข้าใจง่าย แต่ไม่ลดทอนความถูกต้อง
เรื่องที่ต้องการเข้าใจ:
{{input}}
กรุณาตอบเป็น:
1. สรุปสั้น
2. เรื่องนี้คืออะไร
3. ทำงานอย่างไร
4. ทำไมจึงสำคัญ
5. ตัวอย่างเปรียบเทียบ
6. ความเข้าใจผิดที่พบบ่อย
7. คำถามต่อยอดที่ควรถามต่อ`
        },
        {
            id: "research",
            label: "Research",
            description: "วิเคราะห์หัวข้อและวางคำสืบค้นวิจัยใน NotebookLM",
            icon: <Search className="w-4 h-4" />,
            color: "from-emerald-500 to-teal-600",
            hoverColor: "hover:border-emerald-300 hover:bg-emerald-50/20",
            activeBg: "bg-emerald-600 border-emerald-600 text-white",
            textColor: "text-emerald-700",
            borderColor: "border-emerald-100",
            template: `คุณคือผู้ช่วยวิจัย
โปรดช่วยแตกหัวข้อต่อไปนี้ให้เป็นคำถามสืบค้น คีย์เวิร์ด และประเด็นที่ควรหาแหล่งอ้างอิงเพิ่มเติม
หัวข้อ:
{{input}}
กรุณาตอบเป็น:
1. หัวข้อหลัก
2. ประเด็นย่อย
3. คีย์เวิร์ดภาษาไทย
4. คีย์เวิร์ดภาษาอังกฤษ
5. คำถามสำหรับค้นข้อมูล
6. แหล่งข้อมูลที่ควรใช้
7. จุดที่ต้องระวังการสรุปเกินข้อมูล
8. ขั้นถัดไป`
        },
        {
            id: "plan",
            label: "Plan",
            description: "แปลงไอเดียหรือโจทย์ปัญหาให้เป็นแผนงานอย่างเป็นขั้นตอน",
            icon: <Sliders className="w-4 h-4" />,
            color: "from-amber-500 to-orange-600",
            hoverColor: "hover:border-amber-300 hover:bg-amber-50/20",
            activeBg: "bg-amber-600 border-amber-600 text-white",
            textColor: "text-amber-700",
            borderColor: "border-amber-100",
            template: `คุณคือที่ปรึกษาด้านการวางแผนงาน
โปรดแปลงไอเดียหรือโจทย์ต่อไปนี้ให้เป็นแผนทำงานที่เป็นระบบและทำต่อได้จริง
โจทย์:
{{input}}
กรุณาตอบเป็น:
1. เป้าหมาย
2. สิ่งที่รู้แน่
3. สมมติฐาน
4. ขอบเขตงาน
5. ขั้นตอนทำงาน
6. สิ่งที่ต้องเตรียม
7. ความเสี่ยง
8. ขั้นถัดไป 1 ขั้น`
        },
        {
            id: "review",
            label: "Review",
            description: "ตรวจสอบคำกล่าวอ้างเกินจริงและความปลอดภัยเนื้อหา",
            icon: <Eye className="w-4 h-4" />,
            color: "from-rose-500 to-red-600",
            hoverColor: "hover:border-rose-300 hover:bg-rose-50/20",
            activeBg: "bg-rose-600 border-rose-600 text-white",
            textColor: "text-rose-700",
            borderColor: "border-rose-100",
            template: `คุณคือผู้ตรวจคุณภาพและความเสี่ยงของเนื้อหา
โปรดตรวจข้อความต่อไปนี้ว่าชัดเจน ถูกทิศทาง และมีความเสี่ยงด้านการสื่อสารหรือไม่
ข้อความ:
{{input}}
กรุณาตอบเป็น:
1. สถานะ Passed / Partial / Failed
2. จุดที่ดี
3. จุดที่ไม่ชัด
4. ความเสี่ยงในการตีความ
5. ประโยคที่ควรปรับ
6. เวอร์ชันปรับปรุง
7. ขั้นถัดไป`
        },
        {
            id: "summarize",
            label: "Summarize",
            description: "สรุปและสังเคราะห์ประเด็นจากวัตถุดิบและบทความดิบ",
            icon: <FileText className="w-4 h-4" />,
            color: "from-indigo-500 to-blue-600",
            hoverColor: "hover:border-indigo-300 hover:bg-indigo-50/20",
            activeBg: "bg-indigo-600 border-indigo-600 text-white",
            textColor: "text-indigo-700",
            borderColor: "border-indigo-100",
            template: `คุณคือผู้ช่วยสรุปและสังเคราะห์ข้อมูล
โปรดสรุปข้อมูลต่อไปนี้ให้เป็นบทสรุปที่อ่านง่าย เป็นระบบ และนำไปใช้ต่อได้
ข้อมูล:
{{input}}
กรุณาตอบเป็น:
1. TL;DR
2. ประเด็นหลัก
3. สิ่งที่รู้แน่
4. สิ่งที่ยังไม่ชัด
5. ข้อสรุปที่นำไปใช้ต่อได้
6. ขั้นถัดไป`
        },
        {
            id: "visual",
            label: "Visual",
            description: "ร่างรายละเอียดศิลปะ (Visual Brief) และคำสั่งวาดภาพ",
            icon: <Sparkles className="w-4 h-4" />,
            color: "from-cyan-500 to-sky-600",
            hoverColor: "hover:border-cyan-300 hover:bg-cyan-50/20",
            activeBg: "bg-cyan-600 border-cyan-600 text-white",
            textColor: "text-cyan-700",
            borderColor: "border-cyan-100",
            template: `คุณคือ Visual Art Director และ Prompt Engineer
โปรดแปลงคอนเซปต์ต่อไปนี้ให้เป็น Visual Brief และ Image Prompt สำหรับใช้กับ AI สร้างภาพ
คอนเซปต์:
{{input}}
กรุณาตอบเป็น:
1. Visual Concept
2. Mood & Tone
3. Composition
4. Key Visual Elements
5. Image Prompt ภาษาไทย
6. Image Prompt ภาษาอังกฤษ
7. Negative Prompt
8. Alt Text
9. Caption`
        },
        {
            id: "dev-brief",
            label: "Dev Brief",
            description: "ร่างเอกสารวางแผนพัฒนาระบบโค้ดและข้อมูลเทคนิค",
            icon: <Code className="w-4 h-4" />,
            color: "from-pink-500 to-rose-600",
            hoverColor: "hover:border-pink-300 hover:bg-pink-50/20",
            activeBg: "bg-pink-600 border-pink-600 text-white",
            textColor: "text-pink-700",
            borderColor: "border-pink-100",
            template: `คุณคือ Technical Product Assistant
โปรดแปลงโจทย์ต่อไปนี้ให้เป็น brief สำหรับ AI coding หรือ developer
โจทย์:
{{input}}
กรุณาตอบเป็น:
1. Goal
2. Scope
3. Non-scope
4. Proposed Changes
5. Files likely involved
6. Verification Plan
7. Risks
8. Do-not-touch areas`
        }
    ];

    const handlePromptClick = (pItem: QuickPromptItem) => {
        setActivePromptId(pItem.id);
        const valueToUse = input.trim() || "[วางข้อมูลที่นี่]";
        const compiled = pItem.template.replace(/\{\{\s*input\s*\}\}/g, valueToUse);
        setOutput(compiled);
    };

    const handleCopy = () => {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 overflow-hidden font-sans">
            {/* Top Bar Header */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                    <Link 
                        href="/workspaces/prompt-studio"
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all shadow-xs"
                        title="กลับหน้า Prompt Studio"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                            <h1 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Prompt Lite</h1>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Universal Prompt Helper — ช่วยขยายไอเดียและสร้างชุดคำสั่งสำเร็จรูปสำหรับส่งต่อไปใช้งานกับ AI อื่น ๆ
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/workspaces/prompt-studio"
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition shadow-xs"
                    >
                        เปิด Prompt Studio หลัก
                    </Link>
                </div>
            </div>

            {/* Instruction Area */}
            <div className="flex-shrink-0 bg-indigo-50/50 border-b border-indigo-100 px-6 py-2 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] text-indigo-900 font-medium">
                    คู่มือการใช้งาน: วางเรื่องที่อยากถาม แล้วเลือกประเภท prompt เพื่อใช้กับ AI ตัวอื่น (ระบบจะขยายข้อมูลนำเข้าเป็น Prompt ขนาดใหญ่ที่ช่องด้านขวาสำหรับนำไปใช้ต่อได้ทันที)
                </span>
            </div>

            {/* Layout Main Container */}
            <div className="flex flex-1 overflow-hidden p-6 gap-6 flex-col lg:flex-row">
                
                {/* Left Card: Input & Selection */}
                <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[300px]">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                            1. ป้อนข้อความตั้งต้น (Input Area)
                        </span>
                        {input && (
                            <button
                                onClick={() => setInput("")}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-red-500 active:text-red-600 hover:bg-slate-200/50 rounded-md transition-all cursor-pointer"
                            >
                                <Trash2 className="w-3 h-3" />
                                <span>ล้างข้อมูล</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 p-4 flex flex-col space-y-4 overflow-hidden">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="วางประเด็นที่ต้องการศึกษา, ดราฟต์ข้อความสั้น, คอนเซปต์ภาพ หรือโจทย์งานที่นี่..."
                            className="flex-1 w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all text-xs leading-relaxed font-sans shadow-inner resize-none"
                        />

                        {/* Prompt Type Section */}
                        <div className="flex-shrink-0 flex flex-col space-y-2">
                            <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                                2. เลือกประเภทคำสั่งที่ต้องการสร้าง (Select Prompt Type)
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                                {prompts.map((p) => {
                                    const isActive = activePromptId === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => handlePromptClick(p)}
                                            className={`flex flex-col items-start p-3 text-left border rounded-xl transition-all cursor-pointer group relative overflow-hidden shadow-xs ${
                                                isActive
                                                    ? p.activeBg
                                                    : `bg-white ${p.borderColor} ${p.hoverColor}`
                                            }`}
                                            title={p.description}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <div className={`p-1 rounded-md transition-all ${
                                                    isActive ? "bg-white/20 text-white" : `${p.textColor} bg-slate-100/60`
                                                }`}>
                                                    {p.icon}
                                                </div>
                                                <span className="text-[10px] font-bold tracking-wide">
                                                    {p.label}
                                                </span>
                                            </div>
                                            <span className={`text-[8.5px] font-medium leading-tight mt-1.5 ${
                                                isActive ? "text-white/80" : "text-slate-500"
                                            }`}>
                                                {p.description}
                                            </span>
                                            {/* Decorative Background Glow on hover */}
                                            {!isActive && (
                                                <div className={`absolute inset-0 bg-gradient-to-r ${p.color} opacity-0 group-hover:opacity-[0.025] transition-all`} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Card: Output Box */}
                <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[300px]">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                            3. ผลลัพธ์คำสั่งสำเร็จรูป (Generated Prompt)
                        </span>
                        
                        <div className="flex items-center gap-2">
                            {output && (
                                <>
                                    <button
                                        onClick={() => setOutput("")}
                                        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-red-500 active:text-red-600 hover:bg-slate-200/50 rounded-md transition-all cursor-pointer"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>ล้างผลลัพธ์</span>
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        onClick={handleCopy}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-xs ${
                                            copied 
                                                ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                                : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                        }`}
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copied ? "คัดลอกสำเร็จ!" : "คัดลอก Prompt"}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 p-4 flex flex-col overflow-hidden bg-slate-50/50">
                        <textarea
                            readOnly
                            value={output}
                            placeholder="โปรดเลือกประเภทปุ่มคำสั่ง (Prompt Type) ด้านซ้ายเพื่อสร้างคำสั่งสำเร็จรูปที่นี่..."
                            className="flex-1 w-full bg-white border border-slate-200 rounded-xl p-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all text-xs font-mono leading-relaxed shadow-inner select-all resize-none overflow-y-auto custom-scrollbar"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
