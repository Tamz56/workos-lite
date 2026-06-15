"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
    Plus, 
    Search, 
    Copy, 
    Check, 
    Archive, 
    AlertCircle, 
    RefreshCw, 
    Sliders, 
    Eye, 
    Edit, 
    BookOpen, 
    Save, 
    ArrowUp,
    ArrowDown,
    Trash2,
    Edit2,
    Code,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    Sparkles
} from "lucide-react";

interface PromptInputField {
    name: string;
    label: string;
    value: string;
    placeholder?: string;
    helperText?: string;
    required?: boolean;
}

interface GuardrailPreset {
    id: string;
    name: string;
    category: string;
    description: string;
    content: string;
    risk_words: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
}

interface PromptTemplate {
    id: string;
    name: string;
    category: string;
    purpose: string | null;
    role: string | null;
    context: string | null;
    input_fields: string | null;
    instructions: string | null;
    constraints: string | null;
    output_format: string | null;
    review_checklist: string | null;
    notes: string | null;
    status: "draft" | "testing" | "active" | "archived";
    version: string;
    version_notes: string | null;
    guardrail_preset_ids: string | null;
    created_at: string;
    updated_at: string;
    active_version?: string | null;
}

interface PromptVersion {
    id: string;
    prompt_template_id: string;
    version: string;
    revision_notes: string | null;
    created_from_run_log_id: string | null;
    is_active: number;
    purpose: string | null;
    role: string | null;
    context: string | null;
    input_fields: string | null;
    instructions: string | null;
    constraints: string | null;
    output_format: string | null;
    review_checklist: string | null;
    notes: string | null;
    guardrail_preset_ids: string;
    created_at: string;
    updated_at: string;
}

interface PromptRunLog {
    id: string;
    promptTemplateId: string;
    inputSnapshot: PromptInputField[];
    compiledPromptSnapshot: string;
    outputNotes: string;
    rating: number;
    nextRevisionNotes: string;
    summary: string;
    runStatus: string;
    createdAt: string;
    updatedAt: string;
}

interface PromptWorkflow {
    id: string;
    name: string;
    description: string | null;
    status: "active" | "archived";
    created_at: string;
    updated_at: string;
    step_count?: number;
    steps?: PromptWorkflowStep[];
}

interface PromptWorkflowStep {
    id: string;
    workflow_id: string;
    prompt_template_id: string;
    step_name: string;
    step_description: string | null;
    step_instruction: string | null;
    sort_order: number;
    run_status?: "pending" | "in_progress" | "done" | "skipped";
    output_note?: string | null;
    last_run_at?: string | null;
    created_at: string;
    updated_at: string;
    template_name?: string;
    template_category?: string;
    template_status?: string;
    active_version?: string | null;
}

const CATEGORIES = ["Writing", "Review", "Marketing", "Coding", "General"];
const STATUSES = ["draft", "testing", "active", "archived"];

// Consistent styling for light inputs with high contrast text and focus styles
const INPUT_CLASS = "w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all text-xs shadow-sm";
const TEXTAREA_CLASS = "w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all text-xs font-mono leading-relaxed shadow-sm";
const SELECT_CLASS = "w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all text-xs shadow-sm";

let lastSafeInputFields: PromptInputField[] = [];

function safeParseInputFields(jsonStr: string | null): PromptInputField[] {
    if (!jsonStr) {
        lastSafeInputFields = [];
        return [];
    }
    const trimmed = jsonStr.trim();
    if (!trimmed) {
        lastSafeInputFields = [];
        return [];
    }
    try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
            return lastSafeInputFields;
        }
        const mapped = parsed.map(item => {
            const typedItem = item as Record<string, unknown>;
            return {
                name: String(typedItem.name || ""),
                label: String(typedItem.label || typedItem.name || ""),
                value: String(typedItem.value || ""),
                placeholder: typedItem.placeholder !== undefined ? String(typedItem.placeholder) : undefined,
                helperText: typedItem.helperText !== undefined ? String(typedItem.helperText) : undefined,
                required: typedItem.required === true
            };
        }).filter(item => item.name !== "");
        lastSafeInputFields = mapped;
        return mapped;
    } catch {
        return lastSafeInputFields;
    }
}

function cleanGreenFinenessClaims(text: string): string {
    let cleaned = text;
    cleaned = cleaned.replace(/เห็นผลแน่นอน/g, "อาจมีส่วนช่วยปรับปรุงกระบวนการหรือฟื้นฟูภายใต้การจัดการที่เหมาะสม");
    cleaned = cleaned.replace(/ดีที่สุด/g, "เหมาะสมภายใต้เงื่อนไขและบริบทนั้น ๆ");
    cleaned = cleaned.replace(/เพิ่มผลผลิตแน่นอน/g, "มีส่วนเกี่ยวข้องกับความสมบูรณ์และช่วยสนับสนุนโอกาสในการเพิ่มผลผลิต");
    cleaned = cleaned.replace(/ฟื้นฟูดินทันที/g, "อาจช่วยสนับสนุนความสมบูรณ์ของดินภายใต้เงื่อนไขและการจัดการที่เหมาะสม");
    cleaned = cleaned.replace(/ปลอดภัย\s*100%/g, "มีความปลอดภัยสูงและเป็นมิตรต่อสิ่งแวดล้อมเมื่อนำไปใช้อย่างถูกวิธี");
    cleaned = cleaned.replace(/รักษาโรค/g, "");
    return cleaned;
}

function checkFieldForSectionTags(text: string | null | undefined, fieldLabel: string): React.ReactNode {
    if (!text) return null;
    const targetTags = [
        "[ROLE]",
        "[PURPOSE]",
        "[CONTEXT]",
        "[INSTRUCTIONS]",
        "[CONSTRAINTS]",
        "[OUTPUT FORMAT]",
        "[REVIEW CHECKLIST]",
        "[GUARDRAILS]",
        "[NOTES]",
        "[USER INPUT]"
    ];
    
    const foundTags = targetTags.filter(tag => text.includes(tag));
    if (foundTags.length > 0) {
        return (
            <div className="mt-1 flex items-start gap-1.5 rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs font-semibold leading-5 text-amber-700 shadow-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                <span>
                    พบ {foundTags.join(", ")} ในช่อง {fieldLabel} — ถ้าเป็นข้อมูลเฉพาะบทความ ให้ย้ายไปกรอกที่ Test Input Area ด้านขวา ถ้าเป็นคำอธิบายระบบ ให้ลบ tag นี้ออกและเหลือเฉพาะเนื้อหา
                </span>
            </div>
        );
    }
    return null;
}

interface WfStepDraft {
    step_name: string;
    step_description: string;
    step_instruction: string;
    prompt_template_id: string | null;
    missingTemplate: boolean;
}

interface WfDraft {
    name: string;
    description: string;
    category: string;
    steps: WfStepDraft[];
}

function findConfidentTemplateMatch(stepName: string, templates: PromptTemplate[]): string | null {
    const sName = stepName.trim().toLowerCase();
    
    // Check template names for exact or confident match
    for (const tpl of templates) {
        const tName = tpl.name.trim().toLowerCase();
        
        // Exact match
        if (tName === sName) {
            return tpl.id;
        }
        
        // Special case 1: Article Outline
        if (sName === "article outline" && (tName.includes("article outline") || (tName.includes("outline") && tName.includes("article")))) {
            return tpl.id;
        }
        
        // Special case 2: Claim Risk Review
        if (sName === "claim risk review" && (tName.includes("claim risk") || tName.includes("claim reviewer") || (tName.includes("claim") && tName.includes("reviewer")))) {
            return tpl.id;
        }

        // Special case 3: Green Fineness Tone Review
        if (sName === "green fineness tone review" && (tName.includes("tone reviewer") || tName.includes("tone review") || (tName.includes("tone") && tName.includes("reviewer")))) {
            return tpl.id;
        }
        
        // Special case 4: SEO Metadata
        if (sName === "seo metadata" && tName.includes("seo")) {
            return tpl.id;
        }
        
        // Special case 5: Social Caption
        if (sName === "social caption" && (tName.includes("social") || tName.includes("caption") || tName.includes("copywriter"))) {
            return tpl.id;
        }
        
        // Special case 6: Research Brief
        if (sName === "research brief" && (tName.includes("research") || tName.includes("brief"))) {
            return tpl.id;
        }

        // Special case 7: Article Draft
        if (sName === "article draft" && (tName.includes("article draft") || tName.includes("article writer") || tName.includes("content writer"))) {
            return tpl.id;
        }
    }
    
    return null;
}

function generateArborWorkflowDraft(inputs: {
    brief: string;
    type: string;
    brandTone: string;
    stepCount: number;
    templates: PromptTemplate[];
}): WfDraft {
    const isGreenFineness = 
        inputs.brandTone.toLowerCase().includes("green fineness") || 
        inputs.brandTone.toLowerCase().includes("gf") ||
        inputs.brief.toLowerCase().includes("green fineness") ||
        inputs.brief.toLowerCase().includes("gf") ||
        inputs.type.toLowerCase().includes("green fineness") ||
        inputs.type.toLowerCase().includes("gf");

    let name = "";
    let description = "";
    let category = "Writing";
    let steps: WfStepDraft[] = [];

    if (isGreenFineness || inputs.type === "Green Fineness Article Production") {
        name = "Green Fineness Article Production";
        description = "กระบวนการสร้างและตรวจทานบทความวิชาการด้านการเกษตรอินทรีย์ ดิน และระบบนิเวศ ตามแนวทางความปลอดภัยของ Green Fineness";
        category = "Writing";
        
        const gfSteps = [
            {
                step_name: "Research Brief",
                step_description: "สรุปข้อมูลตั้งต้น บริบทของหัวข้อ และข้อเท็จจริงที่ควรใช้ในการเขียน",
                step_instruction: "รวบรวมงานวิจัยทางวิทยาศาสตร์เกี่ยวกับพืช ดิน จุลินทรีย์ และจัดระเบียบเป้าหมายบทความ"
            },
            {
                step_name: "Article Outline",
                step_description: "วางโครงสร้างบทความ H1, H2, H3 และลำดับการเล่า",
                step_instruction: "วางหัวข้อย่อยและโครงสร้างการเล่าเรื่องให้อ่านง่ายและดึงดูดใจผู้รักธรรมชาติ"
            },
            {
                step_name: "Claim Risk Review",
                step_description: "ตรวจคำกล่าวอ้างเรื่องดิน พืช จุลินทรีย์ ปุ๋ย ธาตุอาหาร ผลผลิต คาร์บอน และสิ่งแวดล้อมไม่ให้ฟันธงเกินไป",
                step_instruction: "ตรวจสอบคำสะกด คำเคลมเด็ดขาด (เช่น เห็นผลแน่นอน, ดีที่สุด) เพื่อแก้ไขให้เป็นถ้อยคำระมัดระวัง"
            },
            {
                step_name: "Article Draft",
                step_description: "ร่างเนื้อหาทั้งหมดด้วยภาษาไทยที่อ่านง่าย มีบริบท และไม่ขายแรง",
                step_instruction: "เขียนรายละเอียดแต่ละหัวข้อให้ลื่นไหลสม่ำเสมอ เน้นให้ความรู้เชิงสร้างสรรค์"
            },
            {
                step_name: "Green Fineness Tone Review",
                step_description: "ขัดเกลาภาษาให้สงบ ชัด และสอดคล้องกับโทน Green Fineness",
                step_instruction: "ปรับระดับความเป็นมิตรและภาษาธรรมชาติของบทความให้อยู่ใน Voice & Tone พรีเมียมของแบรนด์"
            },
            {
                step_name: "SEO Metadata",
                step_description: "ร่าง meta title, meta description, slug และคำสำคัญเบื้องต้น",
                step_instruction: "จัดทำ Title Tag และ Meta Description สำหรับการค้นหาของ Google"
            },
            {
                step_name: "Social Caption",
                step_description: "ย่อยประเด็นจากบทความเป็นโพสต์สั้นสำหรับเผยแพร่",
                step_instruction: "สรุปสาระสำคัญเป็น Hook ประโยคเด่น และแฮชแท็กชวนคุยแบบอบอุ่น"
            }
        ];

        const count = Math.min(Math.max(inputs.stepCount || 7, 3), 7);
        const selectedSteps = gfSteps.slice(0, count);

        steps = selectedSteps.map(s => {
            const matchedId = findConfidentTemplateMatch(s.step_name, inputs.templates);
            return {
                step_name: s.step_name,
                step_description: s.step_description,
                step_instruction: s.step_instruction,
                prompt_template_id: matchedId,
                missingTemplate: !matchedId
            };
        });
    } else {
        name = inputs.brief.substring(0, 30).trim() || "Workflow ทั่วไปจาก Arbor";
        description = `เวิร์กโฟลว์แผนการรันระบบคำสั่งที่สร้างอิงตามเป้าหมาย: ${inputs.brief}`;
        category = "Writing";
        
        const count = Math.min(Math.max(inputs.stepCount || 3, 2), 5);
        for (let i = 1; i <= count; i++) {
            let stepName = `ขั้นตอนที่ ${i}`;
            let stepDesc = `คำอธิบายสำหรับขั้นตอนที่ ${i}`;
            let stepInst = `คำสั่งเพิ่มเติมสำหรับการรันขั้นตอนที่ ${i}`;
            
            if (i === 1) {
                stepName = "Input Analysis & Prep";
                stepDesc = "ศึกษาความต้องการและจัดเตรียมหัวข้อนำเข้า";
                stepInst = "ระบุข้อมูลความก้าวหน้าและจัดเรียงข้อมูลอ้างอิงให้ชัดเจน";
            } else if (i === count) {
                stepName = "Final Review & Output";
                stepDesc = "ตรวจทานความถูกต้องและจัดรูปแบบเอาท์พุตสุดท้าย";
                stepInst = "ตรวจสอบความเสถียรของคำตอบและการจัดหน้าให้อ่านง่าย";
            } else {
                stepName = `Core Generation Phase ${i-1}`;
                stepDesc = `ดราฟท์ข้อมูลหลักขั้นตอนที่ ${i-1}`;
                stepInst = `เขียนเนื้อหาและประมวลผลคำตอบหลัก`;
            }

            const matchedId = findConfidentTemplateMatch(stepName, inputs.templates);
            steps.push({
                step_name: stepName,
                step_description: stepDesc,
                step_instruction: stepInst,
                prompt_template_id: matchedId,
                missingTemplate: !matchedId
            });
        }
    }

    return { name, description, category, steps };
}

function generateArborPromptDraft(inputs: {
    brief: string;
    category: string;
    brandTone: string;
    outputFormat: string;
}): Partial<PromptTemplate> {
    const isGreenFineness = 
        inputs.brandTone.toLowerCase().includes("green fineness") || 
        inputs.brandTone.toLowerCase().includes("gf") ||
        inputs.brief.toLowerCase().includes("green fineness") ||
        inputs.brief.toLowerCase().includes("gf");

    const cleanBrief = cleanGreenFinenessClaims(inputs.brief);
    
    let name = "";
    let purpose = "";
    let role = "";
    let context = "";
    let inputFields: PromptInputField[] = [];
    let instructions = "";
    let constraints = "";
    let outputFormat = inputs.outputFormat || "Markdown";
    let reviewChecklist = "";
    let notes = "";
    let guardrailPresetIds: string[] = [];

    if (isGreenFineness) {
        guardrailPresetIds = [
            "preset-gf-core-tone",
            "preset-scientific-claim-caution",
            "preset-soil-microbe-fertilizer",
            "preset-non-salesy-edu",
            "preset-gf-review-checklist"
        ];
    }

    if (inputs.category === "Writing") {
        name = isGreenFineness 
            ? "Green Fineness Educational Content Writer" 
            : "Content Outline and Draft Writer";
        purpose = isGreenFineness
            ? "สร้างสรรค์ร่างโครงร่างเนื้อหาและบทความวิชาการด้านการเกษตรอินทรีย์ ดิน และระบบนิเวศชีวภาพอย่างสร้างสรรค์และปลอดภัย"
            : "เพื่อสร้างสรรค์บทความเนื้อหาทั่วไปให้มีคุณภาพและจัดรูปแบบอย่างสมบูรณ์";
        role = isGreenFineness
            ? "คุณคือผู้เชี่ยวชาญด้านนิเวศวิทยาการเกษตรและบรรณาธิการสื่อสารความรู้ของ Green Fineness ผู้เชี่ยวชาญในการแปลงวิชาการดินและจุลินทรีย์ให้เป็นภาษาสงบ ชัดเจน และย่อยง่าย"
            : "คุณคือบรรณาธิการอาวุโสและนักเขียนเนื้อหาออนไลน์มืออาชีพที่มีความรอบรู้และจัดแต่งการเล่าเรื่องได้อย่างน่าติดตาม";
        context = isGreenFineness
            ? "งานเขียนสื่อสารข้อมูลเพื่อเผยแพร่บนเว็บไซต์และบล็อกความรู้ของแบรนด์ เพื่อสร้างความตระหนักรู้เรื่องคุณค่าทางธรรมชาติ ดินมีชีวิต (Living Soil) และชีวภาพของพืช"
            : "การสร้างสรรค์เนื้อหาสำหรับบล็อกและช่องทางออนไลน์ต่างๆ ตามหัวข้อความสนใจ";
        inputFields = [
            { name: "topic", label: "หัวข้อบทความ", value: isGreenFineness ? "ความสัมพันธ์ของอินทรียวัตถุกับโครงสร้างดินชีวภาพ" : "การดูแลรักษาสุขภาพในชีวิตประจำวัน" },
            { name: "target_audience", label: "กลุ่มเป้าหมาย", value: isGreenFineness ? "เกษตรกรรุ่นใหม่และผู้รักการปลูกพืชอินทรีย์" : "คนทำงานทั่วไป" }
        ];
        instructions = isGreenFineness
            ? "1. ศึกษาเป้าหมายของหัวข้อ {{topic}} เพื่อวิเคราะห์ข้อมูลอ้างอิงและประเด็นสำคัญเชิงวิทยาศาสตร์\n2. วางโครงร่างบทความโดยแบ่งลำดับเรื่องเป็นหัวข้อย่อย H2, H3 ตามความต้องการของกลุ่มเป้าหมาย {{target_audience}}\n3. อธิบายหลักวิทยาศาสตร์เกี่ยวกับดิน พืช หรือจุลินทรีย์อย่างเป็นธรรมชาติ มีความน่าเชื่อถือ\n4. เชื่อมโยงบริบทธรรมชาติบำบัด โดยใช้หลักคิด Green Fineness ในการถ่ายทอดเนื้อหาที่ไม่เน้นการขายเร่งเร้า"
            : "1. ศึกษาความต้องการของหัวข้อ {{topic}} และวิเคราะห์เป้าหมายผู้อ่าน {{target_audience}}\n2. กำหนดโครงร่างเนื้อหาด้วยการเกริ่นนำ ประเด็นหลัก และสรุปท้าย\n3. เขียนบรรยายเนื้อหาให้น่าสนใจและลื่นไหล\n4. ตรวจสอบการจัดรูปแบบตัวหนา หัวข้อ และรายการหัวข้อ";
        constraints = isGreenFineness
            ? "- ห้ามใช้คำกล่าวอ้างแบบเด็ดขาดหรือเกินจริง เช่น \"เห็นผลแน่นอน\" หรือ \"เพิ่มผลผลิตแน่นอน\" แต่ให้ใช้คำอธิบายที่รอบคอบ เช่น \"อาจช่วยสนับสนุนโอกาสในการเพิ่มผลผลิต\" หรือ \"ช่วยส่งเสริมตามปัจจัยแวดล้อมที่เหมาะสม\"\n- ห้ามเคลมความเร็วในการฟื้นตัวด้วยคำเช่น \"ฟื้นฟูดินทันที\" แต่ให้เปลี่ยนเป็น \"อาจช่วยสนับสนุนความสมบูรณ์ของดินภายใต้เงื่อนไขและการจัดการที่เหมาะสม\"\n- ห้ามใช้สำนวนการขายแบบเร่งเร้า (Non-salesy) หรือการการันตีความปลอดภัยแบบร้อยเปอร์เซ็นต์อย่าง \"ปลอดภัย 100%\" ให้ใช้คำว่า \"มีความปลอดภัยสูงและเป็นมิตรต่อสิ่งแวดล้อมเมื่อนำไปใช้อย่างถูกวิธี\"\n- High-risk Claim Avoidance: หลีกเลี่ยงถ้อยคำที่ทำให้เข้าใจว่าผลลัพธ์แน่นอน รวมถึงการกล่าวอ้างด้านพืช ดิน จุลินทรีย์ ปุ๋ย ธาตุอาหาร ผลผลิต คาร์บอน หรือสิ่งแวดล้อมเกินบริบทของข้อมูล"
            : "- หลีกเลี่ยงภาษาที่เป็นทางการเกินความจำเป็น\n- ตรวจสอบคำทับศัพท์ให้ถูกต้องและใช้สำนวนสากล\n- ห้ามคัดลอกข้อมูลที่เป็นลิขสิทธิ์โดยตรง";
        outputFormat = "บทความภาษาไทยเชิงการศึกษา (Educational Article) ความยาว 800-1200 คำ จัดรูปแบบด้วย Markdown พร้อมหัวข้อเรื่องหลักและประเด็นย่อย H2, H3";
        reviewChecklist = isGreenFineness
            ? "- ไม่มีคำกล่าวอ้างเรื่องพืช ผลผลิต ดิน หรือจุลินทรีย์ที่ฟันธงเกินจริง\n- มีการใช้คำที่มีความระมัดระวัง (Cautious scientific wording) ครบถ้วน\n- หลีกเลี่ยงคำโฆษณาเร่งรัดและน้ำเสียงยังคงสงบและอบอุ่น\n- ปฏิบัติตามเกณฑ์ High-risk Claim Avoidance (หลีกเลี่ยงถ้อยคำที่ทำให้เข้าใจว่าผลลัพธ์แน่นอน หรืออ้างอิงข้อมูลเกินจริง)"
            : "- โครงสร้างเรื่องมีความเป็นระบบลื่นไหล\n- โทนเสียงสม่ำเสมอตลอดทั้งบทความ\n- จัดหน้าด้วย Markdown ครบถ้วนและสวยงาม";
        notes = isGreenFineness
            ? "เทมเพลตนี้ได้รับการออกแบบตามแนวทาง Green Fineness Brand Guidelines โดยใช้ระบบความปลอดภัยของ guardrail presets ทั้ง 5 รายการในการสอดส่องและควบคุมน้ำเสียง"
            : "เหมาะสำหรับสร้างบทความสร้างชื่อเสียงให้กับเว็บบล็อกทั่วไป";
    } else if (inputs.category === "Review") {
        name = isGreenFineness 
            ? "Green Fineness Claim & Tone Reviewer" 
            : "Prompt Draft Claims Reviewer";
        purpose = isGreenFineness
            ? "ตรวจสอบคำเคลมเกี่ยวกับดิน ปุ๋ย และจุลินทรีย์ รวมถึงขัดเกลาสำนวนให้เข้ากับโทนเสียง Green Fineness"
            : "ตรวจทานความถูกต้อง ความสมบูรณ์ และการใช้ภาษาในดราฟท์คำสั่ง";
        role = isGreenFineness
            ? "คุณคือบรรณาธิการอาวุโสและผู้ตรวจสอบความเสี่ยงด้านการสื่อสาร (Claims Compliance Auditor) ของ Green Fineness"
            : "คุณคือผู้เชี่ยวชาญการตรวจเนื้อหาและปรับปรุงคุณภาพการเขียน";
        context = isGreenFineness
            ? "ทำหน้าที่คัดกรองดราฟท์ก่อนส่งออกเผยแพร่ เพื่อลดความเสี่ยงทางกฎหมายและรักษาภาพลักษณ์ของแบรนด์ในการเป็นแหล่งอ้างอิงความรู้ด้านธรรมชาติ"
            : "ตรวจสอบและประเมินเนื้อหาก่อนทำการบันทึกหรือส่งมอบ";
        inputFields = [
            { name: "draft_content", label: "เนื้อหาที่ต้องการตรวจสอบ", value: isGreenFineness ? "สูตรปุ๋ยหมักชีวภาพนี้ช่วยฟื้นฟูดินทันทีและเร่งผลผลิตพืชให้เห็นผลแน่นอนร้อยเปอร์เซ็นต์" : "สเปกบทความวิชาการเรื่องการทำงานของระบบขับถ่าย" }
        ];
        instructions = isGreenFineness
            ? "1. ตรวจสอบเนื้อหา {{draft_content}} เพื่อหาประโยคหรือถ้อยคำที่อ้างอิงเรื่องดิน พืช ผลผลิต หรือจุลินทรีย์ที่ฟันธงเกินไป\n2. ระบุจุดเสี่ยงและให้คำเสนอแนะในการปรับเปลี่ยนคำพูดด้วยคำที่ระมัดระวังเชิงวิทยาศาสตร์\n3. ปรับเปลี่ยนคำที่มีความเสี่ยงสูง เช่น เปลี่ยน \"เห็นผลแน่นอน\" เป็น \"อาจมีส่วนช่วยปรับปรุงกระบวนการหรือฟื้นฟูภายใต้การจัดการที่เหมาะสม\" หรือเปลี่ยน \"ฟื้นฟูดินทันที\" เป็น \"อาจช่วยสนับสนุนความสมบูรณ์ของดินภายใต้เงื่อนไขและการจัดการที่เหมาะสม\""
            : "1. อ่านเนื้อหา {{draft_content}} อย่างละเอียด\n2. ตรวจสอบข้อผิดพลาดของไวยากรณ์ การสะกดคำ และคำซ้ำซ้อน\n3. เสนอแนะการปรับปรุงเพื่อเพิ่มประสิทธิภาพในการอ่าน";
        constraints = isGreenFineness
            ? "- ห้ามอนุญาตให้คำว่า \"เห็นผลแน่นอน\", \"ดีที่สุด\", \"เพิ่มผลผลิตแน่นอน\", \"ฟื้นฟูดินทันที\", หรือ \"ปลอดภัย 100%\" หลุดไปเด็ดขาด ให้ระบุเป็นคำเตือนและแนะนำคำทดแทนเสมอ\n- ปฏิบัติตามหลัก High-risk Claim Avoidance ในการคัดกรองคำกล่าวอ้างเกินจริงและการันตีผลลัพธ์\n- แนะนำการแก้ไขอย่างสร้างสรรค์และเน้นเหตุผลทางวิทยาศาสตร์เป็นเกราะป้องกันแบรนด์"
            : "- ชี้แจงข้อบกพร่องเป็นหัวข้ออย่างสุภาพ\n- แนะนำแนวทางการปรับโครงสร้างหากประเด็นยาวเกินไป";
        outputFormat = "ตาราง Markdown แยกตามมิติ: ข้อความที่พบปัญหา -> ข้อเสนอแนะการปรับปรุงคำพูดใหม่ -> ระดับความเสี่ยง (สูง/กลาง/ต่ำ)";
        reviewChecklist = isGreenFineness
            ? "- สามารถแยกแยะคำอ้างอิงพืชผลและดินปุ๋ยชีวภาพได้ถูกต้องหรือไม่\n- คำเสนอแนะตรงตามแนวทางระมัดระวังของ Green Fineness หรือไม่\n- โทนคำเตือนไม่ดูรุนแรงแต่ชัดเจน"
            : "- ครอบคลุมข้อผิดพลาดสำคัญ\n- ให้คำแนะนำที่นำไปแก้ไขต่อได้ทันที";
        notes = isGreenFineness
            ? "ช่วยเสริมกำลังในการตรวจสอบของทีมบรรณาธิการก่อนการเผยแพร่ ทำงานร่วมกับ guardrail presets ทั้ง 5 รายการได้อย่างดี"
            : "บันทึกแนวทางคำเตือนที่พบบ่อยในการเขียน";
    } else if (inputs.category === "Marketing") {
        name = isGreenFineness 
            ? "Green Fineness Social Copywriter" 
            : "Social Post & Marketing Writer";
        purpose = isGreenFineness
            ? "สร้างสรรค์โพสต์โซเชียลมีเดียเพื่อให้ความรู้เชิงเกษตรและธรรมชาติอย่างอบอุ่นและมีปฏิสัมพันธ์ที่ดี"
            : "เพื่อร่างข้อความโพสต์โฆษณาประชาสัมพันธ์สินค้าและบริการทางออนไลน์";
        role = isGreenFineness
            ? "คุณคือผู้เชี่ยวชาญด้านการสื่อสารและการตลาดผ่านคอนเทนต์สร้างสรรค์ (Content Marketing Specialist) ของ Green Fineness"
            : "คุณคือปี้ไรเตอร์สายการตลาดที่สร้างโพสต์ที่ดึงดูดใจและเพิ่มยอดการคลิกมีปฏิสัมพันธ์ (Engagement)";
        context = isGreenFineness
            ? "การแปลงหัวข้อวิชาการให้เป็นภาษาสำหรับ Facebook Page, Group หรือโปรไฟล์ส่วนตัว เพื่อชวนคุยสร้างปฏิสัมพันธ์แบบไม่ยัดเยียด"
            : "การโปรโมตหัวข้อหรือแคมเปญให้เข้าถึงกลุ่มเป้าหมายในโซเชียลมีเดียหลัก";
        inputFields = [
            { name: "core_concept", label: "แนวคิดหรือข้อมูลหลัก", value: isGreenFineness ? "ความอัศจรรย์ของสิ่งมีชีวิตขนาดเล็กในดินอย่างจุลินทรีย์ไมคอร์ไรซา" : "เปิดตัวแอปพลิเคชันจัดการตารางงานใหม่ล่าสุด" },
            { name: "channel", label: "ช่องทางที่จะโพสต์", value: "Facebook Page" }
        ];
        instructions = isGreenFineness
            ? "1. นำข้อมูลจากแนวคิด {{core_concept}} มาย่อยเป็นคำอธิบายสั้นๆ ที่ชวนติดตาม\n2. ออกแบบ Hook ประโยคแรกให้น่าสนใจแบบเป็นมิตรโดยสอดคล้องกับช่องทาง {{channel}}\n3. นำเสนอประเด็นความสัมพันธ์แบบไม่เน้นการโฆษณาชวนเชื่อ (Non-salesy) อิงตามหลักวิชาการดินและพืชอย่างโปร่งใส\n4. ใส่คำกระตุ้นการมีปฏิสัมพันธ์แบบอบอุ่นและสร้างสรรค์"
            : "1. ศึกษาความโดดเด่นของหัวข้อ {{core_concept}} และวิเคราะห์สไตล์ของช่องทาง {{channel}}\n2. เขียนข้อความเปิดตัวที่สะดุดตาพร้อมคำเชิญชวน (CTA) ที่กระชับ\n3. เพิ่มแฮชแท็กที่เกี่ยวข้องเพื่อเพิ่มความสามารถในการค้นหา";
        constraints = isGreenFineness
            ? "- ห้ามใช้คำโฆษณาเกินจริง เช่น ดีที่สุด, ปลอดภัย 100%, เห็นผลแน่นอน\n- ห้ามใช้ภาษาเร่งเร้า กดดันให้ซื้อทันที หรือส่อเสียดเชิงลบ\n- เขียนอิงประโยชน์ธรรมชาติและวิถีเกษตรอินทรีย์อย่างมีสติ"
            : "- ความยาวกระชับเหมาะสมกับแต่ละช่องทาง\n- หลีกเลี่ยงข้อความที่ซับซ้อนเข้าใจยาก";
        outputFormat = "ร่างโพสต์โซเชียลมีเดียที่มีโครงสร้าง: ประโยคเปิดหัว (Hook) -> รายละเอียดเนื้อหาความรู้ -> คำถามชวนคุย -> แฮชแท็กที่แนะนำ";
        reviewChecklist = isGreenFineness
            ? "- น้ำเสียงมีความสงบ อบอุ่น และชวนพูดคุยอย่างเปิดกว้างหรือไม่\n- ไม่มีการการันตีผลผลิตพืช ดิน หรือจุลินทรีย์ที่ฟันธงเกินจริงหรือไม่\n- ไม่พบคำกระตุ้นแนวขายตรงเด็ดขาด"
            : "- ข้อความกระชับน่าสนใจ\n- มีคำเชิญชวนทำกิจกรรมชัดเจน";
        notes = isGreenFineness
            ? "นำไปใช้ออกแบบโพสต์รายสัปดาห์ในคลังคอนเทนต์ Green Fineness"
            : "สามารถประยุกต์ใช้ในการส่งเสริมสินค้าต่าง ๆ ได้ง่าย";
    } else {
        name = isGreenFineness 
            ? "Green Fineness Special Task Assistant" 
            : "Arbor General Assistant";
        purpose = isGreenFineness
            ? "ผู้ช่วยสนับสนุนกิจกรรมต่าง ๆ ภายใต้กรอบการรักษาโทนและจรรยาบรรณของ Green Fineness"
            : "ช่วยรันงานวิเคราะห์ คำนวณ หรือจัดทำชุดข้อมูลตามความต้องการทั่วไป";
        role = isGreenFineness
            ? "คุณคือที่ปรึกษาส่วนตัวและผู้ช่วยสนับสนุนภารกิจทั่วไปของ Green Fineness ที่เน้นความโปร่งใส ความถูกต้องทางวิทยาศาสตร์ และน้ำเสียงที่สุขุมอบอุ่น"
            : "คุณคือผู้ช่วยอัจฉริยะส่วนตัวที่มีความถนัดในการจัดระบบข้อมูลและทำงานตามชุดคำสั่งของมนุษย์ได้อย่างถูกต้องแม่นยำ";
        context = isGreenFineness
            ? "การสนับสนุนและคิดรอบด้านเกี่ยวกับดิน เกษตรกรรม และสิ่งแวดล้อมอย่างรอบคอบและปลอดภัย"
            : "การทำงานตามข้อมูลนำเข้าทั่วไปและวิเคราะห์ตามขั้นตอนเชิงเหตุผล";
        inputFields = [
            { name: "user_request", label: "ความต้องการเพิ่มเติม", value: isGreenFineness ? "อยากได้แนวทางการศึกษาความสัมพันธ์ของคาร์บอนในดินกับรากพืช" : "ช่วยจัดระเบียบข้อมูลงานวิจัยต่อไปนี้" }
        ];
        instructions = isGreenFineness
            ? "1. วิเคราะห์เจตนาและความต้องการของคำสั่ง {{user_request}}\n2. ร่างข้อมูลรายละเอียดสนับสนุนเชิงวิชาการตามหลักวิทยาศาสตร์ที่ระมัดระวัง\n3. จัดแต่งข้อความและการให้คำปรึกษาให้อยู่ในโทนเสียงที่สงบ สุภาพ และไม่ให้ความหวังที่ฟันธงเกินจริง"
            : "1. วิเคราะห์โครงสร้างความต้องการของคำสั่ง {{user_request}}\n2. แบ่งปัญหาย่อยเป็นส่วนๆ และลำดับขั้นวิธีแก้ไขอย่างชัดเจน\n3. นำเสนอผลลัพธ์พร้อมตัวอย่างที่เข้าใจได้ง่าย";
        constraints = isGreenFineness
            ? "- ยึดมั่นแนวทางการไม่เคลมสรรพคุณและควบคุมคำที่มีความเสี่ยงสูงอย่างเคร่งครัด\n- ห้ามนำเสนอแนวคิดหรือผลลัพธ์ที่เป็นอันตรายต่อสิ่งแวดล้อมหรือใช้สารเคมีพิษ\n- ห้ามใช้ข้อความที่ละเมิดลิขสิทธิ์ความรู้หรือการันตีผลลัพธ์การเจริญเติบโตของพืช"
            : "- ให้ข้อมูลที่ถูกต้องแม่นยำ\n- จัดระเบียบเนื้อหาให้เป็นระบบเพื่อความเข้าใจง่าย";
        outputFormat = "การตอบกลับอย่างมีระเบียบและรอบด้านด้วยรูปแบบ Markdown";
        reviewChecklist = isGreenFineness
            ? "- ปฏิบัติตามมาตรฐานการระมัดระวังและโทนเสียงของ Green Fineness ครบถ้วน\n- ใช้ถ้อยคำระมัดระวังในข้อเสนอแนะเชิงชีวภาพและดิน"
            : "- ตอบโจทย์ความต้องการของผู้ใช้อย่างครบถ้วน\n- รูปแบบคำตอบเป็นระเบียบชัดเจน";
        notes = isGreenFineness
            ? "ใช้สำหรับแก้ปัญหาและสืบค้นความรู้ภายในแบรนด์"
            : "เทมเพลตผู้ช่วยอเนกประสงค์ทั่วไป";
    }

    name = cleanGreenFinenessClaims(name);
    purpose = cleanGreenFinenessClaims(purpose);
    role = cleanGreenFinenessClaims(role);
    context = cleanGreenFinenessClaims(context);
    instructions = cleanGreenFinenessClaims(instructions);
    constraints = cleanGreenFinenessClaims(constraints);
    outputFormat = cleanGreenFinenessClaims(outputFormat);
    reviewChecklist = cleanGreenFinenessClaims(reviewChecklist);
    notes = cleanGreenFinenessClaims(notes);
    const finalNotes = cleanBrief ? `Brief: ${cleanBrief}\n\n${notes}` : notes;

    return {
        name,
        category: inputs.category,
        purpose,
        role,
        context,
        input_fields: JSON.stringify(inputFields),
        instructions,
        constraints,
        output_format: outputFormat,
        review_checklist: reviewChecklist,
        notes: finalNotes,
        guardrail_preset_ids: JSON.stringify(guardrailPresetIds)
    };
}

interface QuickPrompt {
    id: string;
    label: string;
    description: string;
    template: string;
}

interface QuickPromptGroup {
    name: string;
    color: string;
    prompts: QuickPrompt[];
}

const quickPromptGroups: QuickPromptGroup[] = [
  {
    name: "Arbor",
    color: "from-violet-600 to-indigo-600",
    prompts: [
      {
        id: "arbor-build-brief",
        label: "Build Brief",
        description: "แปลงไอเดียตั้งต้นเป็นโครงสร้าง Brief วิจัยกลยุทธ์",
        template: `คุณคือผู้เชี่ยวชาญด้านกลยุทธ์คอนเทนต์ของ Arbor โปรดช่วยแปลงไอเดีย/ข้อมูลนำเข้าต่อไปนี้ให้เป็นโครงร่าง Strategic Research Brief ที่มีข้อมูลวัตถุประสงค์ กลุ่มเป้าหมาย ประเด็นท้าทาย และแนวทางการนำเสนอเชิงวิทยาศาสตร์/ธรรมชาติ

ข้อมูลนำเข้า:
{{input}}`
      },
      {
        id: "arbor-choose-tool",
        label: "Choose Tool",
        description: "วิเคราะห์ลักษณะงานและแนะนำเครื่องมือที่เหมาะสมที่สุด",
        template: `โปรดช่วยวิเคราะห์ภารกิจ/โจทย์งานต่อไปนี้ และแนะนำว่าควรใช้เครื่องมือ หรือขั้นตอนเวิร์กโฟลว์ใดในการแก้ไขปัญหาเพื่อให้ได้ประสิทธิภาพสูงสุด พร้อมอธิบายเหตุผลประกอบ

โจทย์งาน:
{{input}}`
      },
      {
        id: "arbor-final-review",
        label: "Final Review",
        description: "ตรวจทานเนื้อหาตามเกณฑ์ความปลอดภัยและโทนเสียงของแบรนด์",
        template: `โปรดตรวจสอบเนื้อหาต่อไปนี้ตามเกณฑ์ความปลอดภัยและ Voice & Tone ของ Green Fineness (ความสุภาพ อบอุ่น อิงวิทยาศาสตร์ ไม่กล่าวอ้างสรรพคุณเกินจริง เช่น เห็นผลร้อยเปอร์เซ็นต์ หรือรักษาโรค) พร้อมแนะนำข้อความปรับปรุงแก้ไข

เนื้อหาที่ต้องการตรวจสอบ:
{{input}}`
      },
      {
        id: "arbor-synthesize-final",
        label: "Synthesize Final",
        description: "สังเคราะห์สรุปข้อมูลและบันทึกต่างๆ เข้าด้วยกันเป็นดราฟต์สุดท้าย",
        template: `โปรดช่วยรวบรวม สังเคราะห์ และเรียบเรียงข้อมูล วัตถุดิบ หรือโน้ตตกค้างต่อไปนี้ ให้กลายเป็นบทสรุปสุดท้ายที่ลื่นไหล อ่านง่าย และมีความยาวเป็นระเบียบชัดเจน

ข้อมูลวัตถุดิบ:
{{input}}`
      }
    ]
  },
  {
    name: "Gemini",
    color: "from-blue-600 to-cyan-600",
    prompts: [
      {
        id: "gemini-visual-brief",
        label: "Visual Brief",
        description: "สร้าง Visual Prompts หรือคำแนะนำการจัดวางหน้าตา UI",
        template: `คุณคือ UI/UX Designer และ Visual Art Director โปรดช่วยแปลงข้อมูล/คอนเซปต์ต่อไปนี้ ให้กลายเป็นแบบร่างคำแนะนำการออกแบบทางทัศนศิลป์ (Visual Brief) หรือข้อความสำหรับป้อน AI วาดภาพ (Image Prompt) ที่ละเอียดและสวยงาม

คอนเซปต์:
{{input}}`
      },
      {
        id: "gemini-agri-context",
        label: "Agriculture Context",
        description: "ถอดบทเรียนดิน จุลินทรีย์ และอินทรียวัตถุเชิงลึก",
        template: `โปรดช่วยอธิบายบริบททางวิทยาศาสตร์และข้อมูลเชิงลึกเกี่ยวกับระบบนิเวศดิน จุลินทรีย์ พืชอินทรีย์ หรือการปรับปรุงโครงสร้างดิน (Living Soil) ตามหัวข้อดังต่อไปนี้อย่างเป็นขั้นตอนและเข้าใจง่าย

หัวข้อที่สนใจ:
{{input}}`
      },
      {
        id: "gemini-content-ideas",
        label: "Content Ideas",
        description: "ระดมสมองคิดมุมมองการทำคอนเทนต์การศึกษา 5 แนวทาง",
        template: `โปรดช่วยระดมสมองและนำเสนุมุมมองหัวข้อคอนเทนต์การศึกษา (Educational Content Ideas) จำนวน 5 แนวทางที่น่าสนใจ อิงตามประเด็นหรือเป้าหมายต่อไปนี้

เป้าหมาย/ไอเดียหลัก:
{{input}}`
      },
      {
        id: "gemini-life-reflection",
        label: "Life Reflection",
        description: "สะท้อนคิดเกี่ยวกับรูปแบบการทำงานและระดับพลังงานชีวิต",
        template: `โปรดช่วยนำทางกระบวนการสะท้อนคิด (Life Reflection) โดยวิเคราะห์ระดับพลังงาน สมาธิ และพฤติกรรมการจัดการภารกิจรายวันจากข้อมูลบันทึกต่อไปนี้ พร้อมเสนอแนวทางปรับปรุงสมดุลชีวิตส่วนบุคคล

ข้อมูลบันทึก/ความรู้สึกปัจจุบัน:
{{input}}`
      }
    ]
  },
  {
    name: "NotebookLM",
    color: "from-emerald-600 to-teal-600",
    prompts: [
      {
        id: "notebooklm-search-sources",
        label: "Search Sources",
        description: "วางโครงร่างคำสืบค้นคีย์เวิร์ดวิจัยจากดราฟต์งาน",
        template: `โปรดวิเคราะห์ดราฟต์ข้อมูลต่อไปนี้ และเสนอรายการหัวข้อ คีย์เวิร์ด หรือคำถามสืบค้น (Search Queries) เพื่อนำไปใช้สืบค้นเอกสารอ้างอิงเชิงวิชาการเพิ่มเติมมาสนับสนุนตัวงานให้แน่นหนาขึ้น

ดราฟต์ข้อมูล:
{{input}}`
      },
      {
        id: "notebooklm-build-material-pack",
        label: "Build Material Pack",
        description: "สกัดข้อมูลอ้างอิงและประเด็นสำคัญเป็นแพ็กวัตถุดิบ",
        template: `โปรดวิเคราะห์เนื้อหาหรือข้อเท็จจริงต่อไปนี้ แล้วสกัดเฉพาะประเด็นสำคัญ ข้อมูลสถิติ ตัวเลขสำคัญ หรือข้อความที่เหมาะสมกับการใช้เป็นวัตถุดิบอ้างอิง (Material Pack) ในการเขียนงานเป็นข้อๆ อย่างชัดเจน

เนื้อหาต้นทาง:
{{input}}`
      },
      {
        id: "notebooklm-find-gaps",
        label: "Find Gaps",
        description: "วิเคราะห์จุดบอดทางตรรกะหรือข้อมูลที่ยังขาดหายในเนื้อหา",
        template: `โปรดช่วยตรวจสอบโครงสร้างข้อมูลต่อไปนี้ เพื่อค้นหาช่องว่างเชิงตรรกะ ข้อมูลที่ยังขาดการสนับสนุน หรือจุดบอดที่ควรระมัดระวังเป็นพิเศษเพื่อเสริมความน่าเชื่อถือ

โครงสร้างข้อมูล:
{{input}}`
      }
    ]
  },
  {
    name: "Antigravity",
    color: "from-pink-600 to-rose-600",
    prompts: [
      {
        id: "antigravity-impl-brief",
        label: "Implementation Brief",
        description: "ร่างเอกสารวางแผนพัฒนาระบบ (Goal, Scope, Risks, Matrix)",
        template: `โปรดแปลงคำอธิบายความต้องการพัฒนาระบบต่อไปนี้ ให้กลายเป็นร่างแผนการพัฒนาระบบทางเทคนิค (Technical Implementation Plan) โดยระบุ Goal, Scope, Non-scope, Proposed Changes, Verification Plan และ Risks & Edge Cases อย่างมีระบบ

ความต้องการของระบบ:
{{input}}`
      },
      {
        id: "antigravity-bug-fix",
        label: "Bug Fix Brief",
        description: "วิเคราะห์ข้อผิดพลาดของโค้ดและเสนอแนวทางแก้ไขที่ปลอดภัย",
        template: `โปรดตรวจสอบโค้ดสะดุดหรือข้อความแสดงข้อผิดพลาด (Error Message) ต่อไปนี้ และวิเคราะห์หาสาเหตุ พร้อมเสนอคำแนะนำการแก้ไข (Bug Fix Proposal) ที่กระทบโครงสร้างระบบน้อยที่สุดและปลอดภัยที่สุด

โค้ด/ข้อผิดพลาด:
{{input}}`
      },
      {
        id: "antigravity-commit-handoff",
        label: "Commit Handoff",
        description: "ร่างข้อความสรุปการแก้ไขและข้อความ Commit ตามแนวทางของระบบ",
        template: `โปรดช่วยร่างข้อความ Commit Message และข้อมูลรายงานการส่งมอบงาน (Handoff Summary) ตามรูปแบบมาตรฐานของระบบ จากรายการการแก้ไขในรอบพัฒนาต่อไปนี้

รายการการแก้ไข:
{{input}}`
      }
    ]
  }
];

export default function PromptStudioClient() {
    // State
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [copiedArbor, setCopiedArbor] = useState(false);
    const [showQuickGuide, setShowQuickGuide] = useState(false);

    // Quick Prompt Panel / Prompt Studio Lite States
    const [quickInput, setQuickInput] = useState("");
    const [quickOutput, setQuickOutput] = useState("");
    const [quickCopied, setQuickCopied] = useState(false);

    // AI-Assisted Generator States
    const [showGenModal, setShowGenModal] = useState(false);
    const [genStep, setGenStep] = useState<"input" | "generating" | "preview">("input");
    const [genBrief, setGenBrief] = useState("");
    const [genCategory, setGenCategory] = useState("Writing");
    const [genBrandTone, setGenBrandTone] = useState("Green Fineness");
    const [genOutputFormat, setGenOutputFormat] = useState("Markdown");
    const [isEditingDraftInModal, setIsEditingDraftInModal] = useState(false);
    const [draftEditFields, setDraftEditFields] = useState<Partial<PromptTemplate>>({});
    
    // Editor State
    const [editorFields, setEditorFields] = useState<Partial<PromptTemplate>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
    
    // Test Input Values state
    const [testValues, setTestValues] = useState<Record<string, string>>({});

    // Tab view state: compiled (default) or template structure
    const [previewTab, setPreviewTab] = useState<"compiled" | "template">("compiled");

    // Collapsible status for raw JSON editor
    const [showAdvancedJson, setShowAdvancedJson] = useState(false);

    // Field Builder form states
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [fieldForm, setFieldForm] = useState<Partial<PromptInputField>>({
        name: "",
        label: "",
        value: "",
        placeholder: "",
        helperText: "",
        required: false
    });
    const [fieldValidationError, setFieldValidationError] = useState<string | null>(null);

    // Run Log / History State
    const [runLogs, setRunLogs] = useState<PromptRunLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logForm, setLogForm] = useState({
        rating: 5,
        outputNotes: "",
        nextRevisionNotes: "",
        summary: "",
        runStatus: "needs_revision"
    });
    const [isSavingLog, setIsSavingLog] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState<"playground" | "history" | "versions" | "quick-prompt">("playground");
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Filters for Run History
    const [logStatusFilter, setLogStatusFilter] = useState<string>("active");
    const [logRatingFilter, setLogRatingFilter] = useState<string>("all");

    // Versions State
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [newVersionForm, setNewVersionForm] = useState({ version: "", revisionNotes: "" });
    const [isSavingVersion, setIsSavingVersion] = useState(false);
    const [logVersionFormOpenId, setLogVersionFormOpenId] = useState<string | null>(null);
    const [logVersionInputs, setLogVersionInputs] = useState<Record<string, { version: string; notes: string }>>({});

    // Workflows States
    const [sidebarTab, setSidebarTab] = useState<"templates" | "workflows">("templates");
    const [workflows, setWorkflows] = useState<PromptWorkflow[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [selectedWorkflow, setSelectedWorkflow] = useState<PromptWorkflow | null>(null);
    const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
    const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
    const [workflowForm, setWorkflowForm] = useState({ name: "", description: "" });
    const [isEditingWorkflowMeta, setIsEditingWorkflowMeta] = useState(false);
    const [workflowMetaForm, setWorkflowMetaForm] = useState({ name: "", description: "" });
    const [stepOutputNotes, setStepOutputNotes] = useState<Record<string, string>>({});
    const [copiedStepId, setCopiedStepId] = useState<string | null>(null);

    useEffect(() => {
        if (selectedWorkflow && selectedWorkflow.steps) {
            const notes: Record<string, string> = {};
            selectedWorkflow.steps.forEach(step => {
                notes[step.id] = step.output_note || "";
            });
            setStepOutputNotes(notes);
        } else {
            setStepOutputNotes({});
        }
    }, [selectedWorkflow]);

    // Step states
    const [stepForm, setStepForm] = useState({ promptTemplateId: "", stepName: "", stepDescription: "", stepInstruction: "" });
    const [isAddingStep, setIsAddingStep] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepForm, setEditingStepForm] = useState({ step_name: "", step_description: "", step_instruction: "" });

    // Workflow Generator States
    const [showWfGenModal, setShowWfGenModal] = useState(false);
    const [wfGenStep, setWfGenStep] = useState<"input" | "generating" | "preview">("input");
    const [wfGenBrief, setWfGenBrief] = useState("");
    const [wfGenType, setWfGenType] = useState("Green Fineness Article Production");
    const [wfGenBrandTone, setWfGenBrandTone] = useState("Green Fineness");
    const [wfGenStepCount, setWfGenStepCount] = useState(7);
    const [wfIsEditingDraftInModal, setWfIsEditingDraftInModal] = useState(false);
    const [wfDraftEditFields, setWfDraftEditFields] = useState<Partial<WfDraft>>({});

    // Master Prompt Import State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState("");
    const [applyUserInput, setApplyUserInput] = useState(true);
    const [importPreview, setImportPreview] = useState<{
        sections: Record<string, string>;
        detectedInputs: Record<string, string>;
        summary: Record<string, "found" | "missing">;
        warnings: string[];
    } | null>(null);

    const handleMasterPromptImportPreview = () => {
        if (!importText.trim()) return;

        const targetTags = [
            "[ROLE]",
            "[PURPOSE]",
            "[CONTEXT]",
            "[INSTRUCTIONS]",
            "[CONSTRAINTS]",
            "[OUTPUT FORMAT]",
            "[REVIEW CHECKLIST]",
            "[GUARDRAILS]",
            "[NOTES]",
            "[USER INPUT]"
        ];

        // 1. หา index ของแต่ละ tag ที่เกิดขึ้นจริงในข้อความ
        const occurrences: { tag: string; index: number }[] = [];
        targetTags.forEach(tag => {
            const index = importText.indexOf(tag);
            if (index !== -1) {
                occurrences.push({ tag, index });
            }
        });

        // เรียงลำดับตำแหน่ง tag
        occurrences.sort((a, b) => a.index - b.index);

        const rawSections: Record<string, string> = {};
        for (let i = 0; i < occurrences.length; i++) {
            const current = occurrences[i];
            const start = current.index + current.tag.length;
            const end = (i + 1 < occurrences.length) ? occurrences[i + 1].index : importText.length;
            
            rawSections[current.tag] = importText.substring(start, end).trim();
        }

        const cleanContent = (content: string) => {
            if (!content) return "";
            let cleaned = content;
            targetTags.forEach(tag => {
                const regex = new RegExp(`^\\s*\\${tag}\\s*`, 'i');
                cleaned = cleaned.replace(regex, '');
            });
            return cleaned.trim();
        };

        const parsedSections: Record<string, string> = {};
        targetTags.forEach(tag => {
            if (rawSections[tag] !== undefined) {
                parsedSections[tag] = cleanContent(rawSections[tag]);
            }
        });

        // สกัด USER INPUT
        const detectedInputs: Record<string, string> = {};
        const userInputRaw = parsedSections["[USER INPUT]"] || "";
        if (userInputRaw) {
            const lines = userInputRaw.split('\n');
            const mapping: Record<string, string> = {
                "หัวข้อบทความ": "topic_title",
                "ชื่อตอน": "topic_title",
                "รหัสตอน": "episode_code",
                "เป้าหมายของงาน": "content_goal",
                "ประเภทเนื้อหา": "content_type",
                "ข้อมูลต้นทาง": "source_notes",
                "draft": "source_notes",
                "notebooklm": "source_notes",
                "url บทความจริง ถ้ามี": "article_url",
                "url บทความจริง": "article_url",
                "url ภาพที่มีแล้ว": "image_urls",
                "จำนวนภาพที่ต้องการ": "number_of_images",
                "ขั้นตอนที่ต้องการให้ทำต่อ": "next_step"
            };

            lines.forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const label = line.substring(0, colonIndex).replace(/^[-*\s]+/, '').trim().toLowerCase();
                    const value = line.substring(colonIndex + 1).trim();
                    
                    if (label && value) {
                        for (const [key, fieldKey] of Object.entries(mapping)) {
                            if (label.includes(key.toLowerCase())) {
                                detectedInputs[fieldKey] = value;
                                break;
                            }
                        }
                    }
                }
            });
        }

        // สรุปหัวข้อที่พบ/ไม่พบ
        const summary: Record<string, "found" | "missing"> = {};
        targetTags.forEach(tag => {
            const tagKey = tag.replace("[", "").replace("]", "");
            summary[tagKey] = rawSections[tag] !== undefined ? "found" : "missing";
        });

        // ตรวจสอบเงื่อนไข Non-blocking warnings
        const warnings: string[] = [];
        const criticalSections = ["[ROLE]", "[PURPOSE]", "[CONTEXT]", "[INSTRUCTIONS]", "[CONSTRAINTS]"];
        criticalSections.forEach(tag => {
            const tagKey = tag.replace("[", "").replace("]", "");
            if (summary[tagKey] === "missing") {
                warnings.push(`ไม่พบหัวข้อ ${tag} ในเอกสารนำเข้า`);
            }
        });

        setImportPreview({
            sections: parsedSections,
            detectedInputs,
            summary,
            warnings
        });
    };

    const handleApplyImport = () => {
        if (!importPreview) return;

        const { sections, detectedInputs } = importPreview;

        const newFields: Partial<PromptTemplate> = {
            ...editorFields
        };

        if (sections["[ROLE]"] !== undefined) newFields.role = sections["[ROLE]"];
        if (sections["[PURPOSE]"] !== undefined) newFields.purpose = sections["[PURPOSE]"];
        if (sections["[CONTEXT]"] !== undefined) newFields.context = sections["[CONTEXT]"];
        if (sections["[INSTRUCTIONS]"] !== undefined) newFields.instructions = sections["[INSTRUCTIONS]"];
        if (sections["[CONSTRAINTS]"] !== undefined) newFields.constraints = sections["[CONSTRAINTS]"];
        if (sections["[OUTPUT FORMAT]"] !== undefined) newFields.output_format = sections["[OUTPUT FORMAT]"];
        if (sections["[REVIEW CHECKLIST]"] !== undefined) newFields.review_checklist = sections["[REVIEW CHECKLIST]"];

        let finalNotes = editorFields.notes || "";
        if (sections["[NOTES]"] !== undefined) {
            finalNotes = sections["[NOTES]"];
        }
        
        // สำหรับ [GUARDRAILS]: หากตรวจพบเนื้อหา ให้แทรกต่อท้าย Notes
        const guardrailsContent = sections["[GUARDRAILS]"] || "";
        if (guardrailsContent) {
            const appendStr = `\n\nImported Guardrails:\n${guardrailsContent}`;
            if (!finalNotes.includes("Imported Guardrails")) {
                finalNotes = finalNotes ? (finalNotes + appendStr) : `Imported Guardrails:\n${guardrailsContent}`;
            }
        }
        newFields.notes = finalNotes;

        // สำหรับ [USER INPUT]: นำไปใช้กับ Test values & input_fields ถ้าติ๊ก checkbox ไว้
        if (applyUserInput && Object.keys(detectedInputs).length > 0) {
            // 1. อัปเดต testValues
            setTestValues(prev => ({
                ...prev,
                ...detectedInputs
            }));

            // 2. อัปเดต editorFields.input_fields
            const currentFields = safeParseInputFields(editorFields.input_fields || null);
            const updatedFields = [...currentFields];
            
            const labelMap: Record<string, string> = {
                "topic_title": "หัวข้อบทความ / ชื่อตอน",
                "episode_code": "รหัสตอน",
                "content_goal": "เป้าหมายของงาน",
                "content_type": "ประเภทเนื้อหา",
                "source_notes": "ข้อมูลต้นทาง / Draft",
                "article_url": "URL บทความจริง",
                "image_urls": "URL ภาพ",
                "number_of_images": "จำนวนภาพ",
                "next_step": "ขั้นตอนถัดไป"
            };

            Object.entries(detectedInputs).forEach(([key, val]) => {
                if (!updatedFields.some(f => f.name === key)) {
                    updatedFields.push({
                        name: key,
                        label: labelMap[key] || key,
                        value: "",
                        required: false
                    });
                }
            });

            newFields.input_fields = JSON.stringify(updatedFields);
        }

        setEditorFields(newFields);
        setShowImportModal(false);
        setImportText("");
        setImportPreview(null);
    };

    // Guardrail Presets State
    const [guardrailPresets, setGuardrailPresets] = useState<GuardrailPreset[]>([]);
    
    // Load Templates
    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        setApiError(null);
        try {
            const res = await fetch("/api/prompt-templates");
            if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลเทมเพลตได้");
            const data = await res.json() as PromptTemplate[];
            setTemplates(data);
            if (data.length > 0 && !selectedId) {
                setSelectedId(data[0].id);
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
            setApiError(errMsg);
        } finally {
            setIsLoading(false);
        }
    }, [selectedId]);

    const fetchGuardrailPresets = useCallback(async () => {
        try {
            const res = await fetch("/api/prompt-guardrail-presets");
            if (res.ok) {
                const data = await res.json() as GuardrailPreset[];
                setGuardrailPresets(data);
            }
        } catch (err) {
            console.error("Failed to fetch guardrail presets:", err);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
        fetchGuardrailPresets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const parseGuardrailIds = (jsonStr: string | null | undefined): string[] => {
        if (!jsonStr) return [];
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse guardrail_preset_ids:", e);
            return [];
        }
    };

    const handleToggleGuardrail = (presetId: string) => {
        const currentIds = parseGuardrailIds(editorFields.guardrail_preset_ids);
        let newIds: string[];
        if (currentIds.includes(presetId)) {
            newIds = currentIds.filter(id => id !== presetId);
        } else {
            newIds = [...currentIds, presetId];
        }
        
        setEditorFields(prev => ({
            ...prev,
            guardrail_preset_ids: JSON.stringify(newIds)
        }));
    };

    const fetchRunLogs = useCallback(async () => {
        if (!selectedId || selectedId === "new-template") {
            setRunLogs([]);
            return;
        }
        setIsLoadingLogs(true);
        try {
            const res = await fetch(`/api/prompt-run-logs?promptTemplateId=${selectedId}&runStatus=${logStatusFilter}&ratingFilter=${logRatingFilter}`);
            if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลประวัติการทดสอบได้");
            const data = await res.json() as PromptRunLog[];
            setRunLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingLogs(false);
        }
    }, [selectedId, logStatusFilter, logRatingFilter]);

    useEffect(() => {
        fetchRunLogs();
    }, [fetchRunLogs]);

    const fetchVersions = useCallback(async () => {
        if (!selectedId || selectedId === "new-template") {
            setVersions([]);
            return;
        }
        setIsLoadingVersions(true);
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions`);
            if (res.ok) {
                const data = await res.json() as PromptVersion[];
                setVersions(data);
            }
        } catch (err) {
            console.error("Failed to fetch versions:", err);
        } finally {
            setIsLoadingVersions(false);
        }
    }, [selectedId]);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    const fetchWorkflows = useCallback(async () => {
        setIsLoadingWorkflows(true);
        try {
            const res = await fetch("/api/prompt-workflows");
            if (res.ok) {
                const data = await res.json() as PromptWorkflow[];
                setWorkflows(data);
            }
        } catch (err) {
            console.error("Failed to fetch workflows:", err);
        } finally {
            setIsLoadingWorkflows(false);
        }
    }, []);

    const fetchWorkflowDetails = useCallback(async () => {
        if (!selectedWorkflowId) {
            setSelectedWorkflow(null);
            return;
        }
        setIsLoadingWorkflows(true);
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}`);
            if (res.ok) {
                const data = await res.json() as PromptWorkflow;
                setSelectedWorkflow(data);
                setWorkflowMetaForm({
                    name: data.name,
                    description: data.description || ""
                });
            }
        } catch (err) {
            console.error("Failed to fetch workflow details:", err);
        } finally {
            setIsLoadingWorkflows(false);
        }
    }, [selectedWorkflowId]);

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    useEffect(() => {
        fetchWorkflowDetails();
    }, [fetchWorkflowDetails]);

    const handleCreateWorkflow = async () => {
        if (!workflowForm.name.trim()) {
            alert("กรุณากรอกชื่อเวิร์กโฟลว์");
            return;
        }
        setIsSavingWorkflow(true);
        try {
            const res = await fetch("/api/prompt-workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: workflowForm.name.trim(),
                    description: workflowForm.description.trim() || null
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถสร้างเวิร์กโฟลว์ได้");
            const newWf = await res.json() as PromptWorkflow;
            await fetchWorkflows();
            setSelectedWorkflowId(newWf.id);
            setWorkflowForm({ name: "", description: "" });
            alert("สร้างเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
            alert(errMsg);
        } finally {
            setIsSavingWorkflow(false);
        }
    };

    const handleUpdateWorkflowMeta = async () => {
        if (!selectedWorkflowId) return;
        if (!workflowMetaForm.name.trim()) {
            alert("กรุณากรอกชื่อเวิร์กโฟลว์");
            return;
        }
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: workflowMetaForm.name.trim(),
                    description: workflowMetaForm.description.trim() || null
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถอัปเดตเวิร์กโฟลว์ได้");
            await fetchWorkflowDetails();
            await fetchWorkflows();
            setIsEditingWorkflowMeta(false);
            alert("อัปเดตข้อมูลเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleArchiveWorkflow = async () => {
        if (!selectedWorkflowId) return;
        if (!confirm("คุณต้องการเก็บถาวร (Archive) เวิร์กโฟลว์นี้ใช่หรือไม่? ขั้นตอนทั้งหมดในเวิร์กโฟลว์จะยังคงอยู่แต่อยู่ในหมวดเก็บถาวร")) return;
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "archived" })
            });
            if (!res.ok) throw new Error("ไม่สามารถเก็บถาวรเวิร์กโฟลว์ได้");
            setSelectedWorkflowId(null);
            await fetchWorkflows();
            alert("เก็บถาวรเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleAddStep = async () => {
        if (!selectedWorkflowId) return;
        if (!stepForm.promptTemplateId) {
            alert("กรุณาเลือกเทมเพลต Prompt");
            return;
        }
        setIsAddingStep(true);
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt_template_id: stepForm.promptTemplateId,
                    step_name: stepForm.stepName.trim() || null,
                    step_description: stepForm.stepDescription.trim() || null,
                    step_instruction: stepForm.stepInstruction.trim() || null
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถเพิ่มขั้นตอนได้");
            await fetchWorkflowDetails();
            setStepForm({ promptTemplateId: "", stepName: "", stepDescription: "", stepInstruction: "" });
            alert("เพิ่มขั้นตอนในเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        } finally {
            setIsAddingStep(false);
        }
    };

    const handleMoveStep = async (stepId: string, direction: "up" | "down") => {
        if (!selectedWorkflowId) return;
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${stepId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direction })
            });
            if (!res.ok) throw new Error("ไม่สามารถเปลี่ยนลำดับได้");
            await fetchWorkflowDetails();
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleDeleteStep = async (stepId: string) => {
        if (!selectedWorkflowId) return;
        if (!confirm("คุณต้องการลบขั้นตอนนี้ออกจากเวิร์กโฟลว์ใช่หรือไม่? (การดำเนินการนี้จะไม่ส่งผลต่อ Prompt Template หลัก)")) return;
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${stepId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("ไม่สามารถลบขั้นตอนได้");
            await fetchWorkflowDetails();
            alert("ลบขั้นตอนออกจากเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleStartEditStep = (step: PromptWorkflowStep) => {
        setEditingStepId(step.id);
        setEditingStepForm({
            step_name: step.step_name,
            step_description: step.step_description || "",
            step_instruction: step.step_instruction || ""
        });
    };

    const handleUpdateStepDetails = async (stepId: string) => {
        if (!selectedWorkflowId) return;
        if (!editingStepForm.step_name.trim()) {
            alert("กรุณากรอกชื่อขั้นตอน");
            return;
        }
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${stepId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    step_name: editingStepForm.step_name.trim(),
                    step_description: editingStepForm.step_description.trim() || null,
                    step_instruction: editingStepForm.step_instruction.trim() || null
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถอัปเดตข้อมูลขั้นตอนได้");
            await fetchWorkflowDetails();
            setEditingStepId(null);
            alert("อัปเดตข้อมูลขั้นตอนสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const compileStepPrompt = useCallback((step: PromptWorkflowStep, template: PromptTemplate | undefined) => {
        if (!template) return "";
        const name = step.step_name || template.name;
        const role = template.role || "";
        const purpose = template.purpose || "";
        const context = template.context || "";
        // If step has step_instruction, use it as instruction override, otherwise use template's instructions
        const instructions = step.step_instruction?.trim() || template.instructions || "";
        const constraints = template.constraints || "";
        const outputFormat = template.output_format || "";
        
        const blocks: string[] = [];
        blocks.push(`[WORKFLOW STEP]\nStep: ${name}`);
        if (step.step_instruction?.trim()) {
            blocks.push(`[STEP INSTRUCTION]\n${step.step_instruction.trim()}`);
        }
        blocks.push(`[LINKED TEMPLATE]\nTemplate: ${template.name}`);
        if (purpose) blocks.push(`[PURPOSE]\n${purpose}`);
        if (role) blocks.push(`[ROLE]\n${role}`);
        if (context) blocks.push(`[CONTEXT]\n${context}`);
        if (instructions) blocks.push(`[INSTRUCTIONS]\n${instructions}`);
        if (constraints) blocks.push(`[CONSTRAINTS]\n${constraints}`);
        if (outputFormat) blocks.push(`[OUTPUT FORMAT]\n${outputFormat}`);
        blocks.push(`[MANUAL NOTE]\nกรุณากรอก input ที่จำเป็นเองก่อนรัน`);

        return blocks.join("\n\n");
    }, []);

    const handleCopyStepPrompt = useCallback((step: PromptWorkflowStep) => {
        const template = templates.find(t => t.id === step.prompt_template_id);
        const promptText = compileStepPrompt(step, template);
        if (!promptText) return;
        navigator.clipboard.writeText(promptText);
        setCopiedStepId(step.id);
        setTimeout(() => setCopiedStepId(null), 2000);
    }, [templates, compileStepPrompt]);

    const handleUpdateStepRunStatus = useCallback(async (stepId: string, runStatus: "pending" | "in_progress" | "done" | "skipped") => {
        if (!selectedWorkflowId) return;
        
        const now = runStatus === "done" || runStatus === "in_progress" || runStatus === "skipped" ? new Date().toISOString() : null;
        
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${stepId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    run_status: runStatus,
                    last_run_at: now
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถอัปเดตสถานะขั้นตอนได้");
            await fetchWorkflowDetails();
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    }, [selectedWorkflowId, fetchWorkflowDetails]);

    const handleSaveStepOutputNote = useCallback(async (stepId: string) => {
        if (!selectedWorkflowId) return;
        const note = stepOutputNotes[stepId] ?? "";
        
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${stepId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    output_note: note
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถบันทึกโน้ตได้");
            await fetchWorkflowDetails();
            alert("บันทึกโน้ตสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    }, [selectedWorkflowId, stepOutputNotes, fetchWorkflowDetails]);

    const handleResetWorkflowProgress = useCallback(async () => {
        if (!selectedWorkflow || !selectedWorkflow.steps || selectedWorkflow.steps.length === 0) return;
        if (!confirm("การ Reset Progress จะล้างสถานะและ Output Notes ของทุกขั้นตอนใน Workflow นี้ ต้องการดำเนินการต่อหรือไม่?")) return;
        
        try {
            const resetPromises = selectedWorkflow.steps.map(step => 
                fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${step.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        run_status: "pending",
                        output_note: "",
                        last_run_at: null
                    })
                })
            );
            
            const responses = await Promise.all(resetPromises);
            const failed = responses.filter(r => !r.ok);
            if (failed.length > 0) {
                throw new Error("บางขั้นตอนรีเซ็ตไม่สำเร็จ");
            }
            
            await fetchWorkflowDetails();
            alert("รีเซ็ตสถานะเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการรีเซ็ต";
            alert(errMsg);
        }
    }, [selectedWorkflow, selectedWorkflowId, fetchWorkflowDetails]);


    const handleSaveRunLog = async () => {
        if (!selectedId || selectedId === "new-template") return;
        setIsSavingLog(true);
        setApiError(null);
        try {
            const res = await fetch("/api/prompt-run-logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    promptTemplateId: selectedId,
                    inputSnapshot: currentInputFields.map(f => ({
                        ...f,
                        value: testValues[f.name] || ""
                    })),
                    compiledPromptSnapshot: compiledActivePrompt,
                    outputNotes: logForm.outputNotes,
                    rating: logForm.rating,
                    nextRevisionNotes: logForm.nextRevisionNotes,
                    summary: logForm.summary,
                    runStatus: logForm.runStatus
                })
            });

            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถบันทึกประวัติการทดสอบได้");
            }

            setLogForm({
                rating: 5,
                outputNotes: "",
                nextRevisionNotes: "",
                summary: "",
                runStatus: "needs_revision"
            });

            fetchRunLogs();
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกประวัติ";
            setApiError(errMsg);
        } finally {
            setIsSavingLog(false);
        }
    };

    const handleUpdateRunLog = async (logId: string, updates: Partial<PromptRunLog>) => {
        setApiError(null);
        try {
            const res = await fetch("/api/prompt-run-logs", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: logId,
                    summary: updates.summary,
                    runStatus: updates.runStatus,
                    outputNotes: updates.outputNotes,
                    rating: updates.rating,
                    nextRevisionNotes: updates.nextRevisionNotes
                })
            });

            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถอัปเดตประวัติการทดสอบได้");
            }

            fetchRunLogs();
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปเดตข้อมูล";
            setApiError(errMsg);
        }
    };

    const handleArchiveRunLog = async (logId: string) => {
        if (!confirm("คุณต้องการจัดเก็บ (Archive) ประวัติการรันนี้ใช่หรือไม่? (ประวัตินี้จะถูกซ่อนจากมุมมองหลัก)")) return;
        await handleUpdateRunLog(logId, { runStatus: "archived" });
    };

    const handleCreateVersion = async (vString: string, notesString: string, runLogId: string | null = null) => {
        if (!selectedId || selectedId === "new-template") return;
        if (!vString.trim()) {
            alert("กรุณากรอกเลขเวอร์ชัน");
            return;
        }
        setIsSavingVersion(true);
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    version: vString.trim(),
                    revision_notes: notesString.trim() || null,
                    created_from_run_log_id: runLogId
                })
            });
            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถสร้างเวอร์ชันได้");
            }
            await fetchVersions();
            await fetchTemplates();
            alert("บันทึกเวอร์ชันสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกเวอร์ชัน";
            alert(errMsg);
        } finally {
            setIsSavingVersion(false);
        }
    };

    const handleMarkVersionActive = async (versionId: string) => {
        if (!selectedId) return;
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions/${versionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: true })
            });
            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถตั้งค่าเวอร์ชัน Active ได้");
            }
            await fetchVersions();
            await fetchTemplates();
            alert("ตั้งเป็นเวอร์ชัน Active สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleRestoreVersion = async (version: PromptVersion) => {
        if (!selectedId) return;
        if (!confirm(`คุณต้องการกู้คืนเนื้อหาเทมเพลตนี้กลับเป็นรุ่น ${version.version} ใช่หรือไม่?\nการดำเนินการนี้จะเปลี่ยนฟิลด์ในห้องแก้ไขปัจจุบันทั้งหมด (ประวัติเวอร์ชันเดิมและรันล็อกจะยังอยู่ครบ)`)) {
            return;
        }
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions/${version.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restore: true })
            });
            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถกู้คืนเวอร์ชันได้");
            }
            await fetchTemplates();
            await fetchVersions();
            alert("กู้คืนรุ่นสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleDeleteVersion = async (versionId: string) => {
        if (!selectedId) return;
        if (!confirm("คุณต้องการลบประวัติเวอร์ชันนี้ใช่หรือไม่? (การดำเนินการนี้ไม่สามารถกู้คืนได้)")) {
            return;
        }
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions/${versionId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถลบเวอร์ชันได้");
            }
            await fetchVersions();
            alert("ลบประวัติเวอร์ชันสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    useEffect(() => {
        setLogForm({
            rating: 5,
            outputNotes: "",
            nextRevisionNotes: "",
            summary: "",
            runStatus: "needs_revision"
        });
        setExpandedLogId(null);
        setNewVersionForm({ version: "", revisionNotes: "" });
        setLogVersionFormOpenId(null);
        setLogVersionInputs({});
    }, [selectedId]);

    // Set editor fields when template is selected
    const activeTemplate = useMemo(() => {
        const temp = templates.find(t => t.id === selectedId);
        if (temp) {
            setEditorFields({ ...temp });
            
            // Set default test values from input_fields
            const parsedInputs = safeParseInputFields(temp.input_fields);
            const initialValues: Record<string, string> = {};
            parsedInputs.forEach(f => {
                initialValues[f.name] = f.value;
            });
            setTestValues(initialValues);
            setJsonValidationError(null);
            
            // Reset field form
            setEditingFieldIndex(null);
            setFieldForm({
                name: "",
                label: "",
                value: "",
                placeholder: "",
                helperText: "",
                required: false
            });
            setFieldValidationError(null);
        }
        return temp;
    }, [selectedId, templates]);

    // Parse input fields list safely for rendering list in Field Builder
    const currentInputFields = useMemo(() => {
        return safeParseInputFields(editorFields.input_fields || null);
    }, [editorFields.input_fields]);

    // Validate Field Name Rules live
    const validateFieldNameLive = (name: string, index: number | null): string | null => {
        if (!name.trim()) {
            return "Field Name ห้ามว่าง";
        }
        const nameRegex = /^[a-zA-Z0-9_]+$/;
        if (!nameRegex.test(name)) {
            return "Field Name ต้องใช้ภาษาอังกฤษ ตัวเลข และเครื่องหมาย _ เท่านั้น (ห้ามเว้นวรรคหรือมีภาษาไทย)";
        }
        const isDuplicate = currentInputFields.some((f, idx) => f.name === name && idx !== index);
        if (isDuplicate) {
            return `ชื่อตัวแปร "${name}" มีการใช้งานซ้ำใน Prompt นี้แล้ว`;
        }
        return null;
    };

    // Synchronize currentFields back to editorFields.input_fields JSON
    const updateInputFieldsList = (newFields: PromptInputField[]) => {
        const jsonStr = JSON.stringify(newFields);
        setEditorFields(prev => ({ ...prev, input_fields: jsonStr }));
        setJsonValidationError(null);

        // Sync test values to match new fields config immediately
        setTestValues(prev => {
            const updated: Record<string, string> = {};
            newFields.forEach(f => {
                updated[f.name] = prev[f.name] !== undefined ? prev[f.name] : f.value;
            });
            return updated;
        });
    };

    // Handle JSON changes inside raw collapsible text-area safely
    const handleJsonChange = (val: string) => {
        setEditorFields(prev => ({ ...prev, input_fields: val }));
        if (!val.trim()) {
            setJsonValidationError(null);
            return;
        }
        try {
            const parsed = JSON.parse(val);
            if (!Array.isArray(parsed)) {
                setJsonValidationError(
                    "JSON ไม่ถูกต้อง กรุณาใส่เฉพาะ array ของ input fields เช่น:\n[\n  { \"name\": \"topic\", \"label\": \"หัวข้อ\", \"value\": \"\" }\n]"
                );
            } else {
                setJsonValidationError(null);
                // Sync values
                const initialValues: Record<string, string> = {};
                parsed.forEach((f: unknown) => {
                    const typedF = f as Record<string, unknown>;
                    if (typedF && typeof typedF === "object" && typedF.name) {
                        initialValues[String(typedF.name)] = String(typedF.value || "");
                    }
                });
                setTestValues(initialValues);
            }
        } catch {
            setJsonValidationError(
                "JSON ไม่ถูกต้อง กรุณาใส่เฉพาะ array ของ input fields เช่น:\n[\n  { \"name\": \"topic\", \"label\": \"หัวข้อ\", \"value\": \"\" }\n]"
            );
        }
    };

    // Filter Templates
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.purpose && t.purpose.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (t.role && t.role.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
            const matchesStatus = statusFilter === "All" || t.status === statusFilter;
            
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [templates, searchTerm, categoryFilter, statusFilter]);

    // 1. Template Structure (Raw prompt with placeholders like {{topic}}, no [USER INPUT] block)
    const templateStructurePrompt = useMemo(() => {
        const blocks: string[] = [];
        
        const name = editorFields.name || activeTemplate?.name || "";
        const role = editorFields.role || activeTemplate?.role || "";
        const purpose = editorFields.purpose || activeTemplate?.purpose || "";
        const context = editorFields.context || activeTemplate?.context || "";
        const instructions = editorFields.instructions || activeTemplate?.instructions || "";
        const constraints = editorFields.constraints || activeTemplate?.constraints || "";
        const outputFormat = editorFields.output_format || activeTemplate?.output_format || "";
        const reviewChecklist = editorFields.review_checklist || activeTemplate?.review_checklist || "";
        const notes = editorFields.notes || activeTemplate?.notes || "";

        if (name) blocks.push(`# PROMPT TEMPLATE: ${name}`);
        if (role) blocks.push(`[ROLE]\n${role}`);
        if (purpose) blocks.push(`[PURPOSE]\n${purpose}`);
        if (context) blocks.push(`[CONTEXT]\n${context}`);
        if (instructions) blocks.push(`[INSTRUCTIONS]\n${instructions}`);
        if (constraints) blocks.push(`[CONSTRAINTS]\n${constraints}`);
        if (outputFormat) blocks.push(`[OUTPUT FORMAT]\n${outputFormat}`);
        if (reviewChecklist) blocks.push(`[REVIEW CHECKLIST]\n${reviewChecklist}`);

        // Construct [GUARDRAILS] section if presets are applied
        const appliedPresetIds = parseGuardrailIds(editorFields.guardrail_preset_ids || activeTemplate?.guardrail_preset_ids);
        const appliedPresets = appliedPresetIds
            .map(id => guardrailPresets.find(p => p.id === id))
            .filter(Boolean) as GuardrailPreset[];

        if (appliedPresets.length > 0) {
            const guardrailLines = appliedPresets.map(preset => `- ${preset.name}: ${preset.content}`);
            blocks.push(`[GUARDRAILS]\n${guardrailLines.join("\n")}`);
        }

        if (notes) blocks.push(`[NOTES]\n${notes}`);

        return blocks.join("\n\n");
    }, [editorFields, activeTemplate, guardrailPresets]);

    // 2. Compiled Prompt (Substituted placeholders & appended [USER INPUT] block)
    const compiledActivePrompt = useMemo(() => {
        const blocks: string[] = [];
        
        const name = editorFields.name || activeTemplate?.name || "";
        const role = editorFields.role || activeTemplate?.role || "";
        const purpose = editorFields.purpose || activeTemplate?.purpose || "";
        const context = editorFields.context || activeTemplate?.context || "";
        const instructions = editorFields.instructions || activeTemplate?.instructions || "";
        const constraints = editorFields.constraints || activeTemplate?.constraints || "";
        const outputFormat = editorFields.output_format || activeTemplate?.output_format || "";
        const reviewChecklist = editorFields.review_checklist || activeTemplate?.review_checklist || "";
        const notes = editorFields.notes || activeTemplate?.notes || "";

        if (name) blocks.push(`# PROMPT: ${name}`);
        if (role) blocks.push(`[ROLE]\n${role}`);
        if (purpose) blocks.push(`[PURPOSE]\n${purpose}`);
        if (context) blocks.push(`[CONTEXT]\n${context}`);
        if (instructions) blocks.push(`[INSTRUCTIONS]\n${instructions}`);
        if (constraints) blocks.push(`[CONSTRAINTS]\n${constraints}`);
        if (outputFormat) blocks.push(`[OUTPUT FORMAT]\n${outputFormat}`);
        if (reviewChecklist) blocks.push(`[REVIEW CHECKLIST]\n${reviewChecklist}`);

        // Construct [GUARDRAILS] section if presets are applied
        const appliedPresetIds = parseGuardrailIds(editorFields.guardrail_preset_ids || activeTemplate?.guardrail_preset_ids);
        const appliedPresets = appliedPresetIds
            .map(id => guardrailPresets.find(p => p.id === id))
            .filter(Boolean) as GuardrailPreset[];

        if (appliedPresets.length > 0) {
            const guardrailLines = appliedPresets.map(preset => `- ${preset.name}: ${preset.content}`);
            blocks.push(`[GUARDRAILS]\n${guardrailLines.join("\n")}`);
        }

        if (notes) blocks.push(`[NOTES]\n${notes}`);

        // Construct [USER INPUT] section dynamically if variables exist
        if (currentInputFields.length > 0) {
            const userInputLines = currentInputFields.map(field => {
                const val = testValues[field.name] || "";
                return `${field.label || field.name}: ${val}`;
            });
            blocks.push(`[USER INPUT]\n${userInputLines.join("\n")}`);
        }

        let result = blocks.join("\n\n");

        // Substitute placeholders (e.g. {{topic}} -> topic value)
        for (const [key, val] of Object.entries(testValues)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
            result = result.replace(regex, val || "");
        }

        return result;
    }, [editorFields, activeTemplate, testValues, currentInputFields, guardrailPresets]);

    // Get active prompt value based on current tab selection
    const activePreviewText = useMemo(() => {
        return previewTab === "compiled" ? compiledActivePrompt : templateStructurePrompt;
    }, [previewTab, compiledActivePrompt, templateStructurePrompt]);

    // Copy to clipboard with success feedback
    const handleCopy = () => {
        if (!activePreviewText) return;
        navigator.clipboard.writeText(activePreviewText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Build Arbor context Markdown summary
    const buildArborContextMarkdown = () => {
        const name = editorFields.name || activeTemplate?.name || "Not available";
        const category = editorFields.category || activeTemplate?.category || "Not available";
        const purpose = editorFields.purpose || activeTemplate?.purpose || "Not available";
        const role = editorFields.role || activeTemplate?.role || "Not available";
        const context = editorFields.context || activeTemplate?.context || "Not available";
        const instructions = editorFields.instructions || activeTemplate?.instructions || "Not available";
        const constraints = editorFields.constraints || activeTemplate?.constraints || "Not available";
        const outputFormat = editorFields.output_format || activeTemplate?.output_format || "Not available";
        const reviewChecklist = editorFields.review_checklist || activeTemplate?.review_checklist || "Not available";
        const notes = editorFields.notes || activeTemplate?.notes || "Not available";

        // Variables / placeholders
        let variablesMarkdown = "None defined";
        if (currentInputFields && currentInputFields.length > 0) {
            variablesMarkdown = currentInputFields.map((field, idx) => {
                return `${idx + 1}. **${field.label || field.name}** (\`{{${field.name}}}\`)\n` +
                       `   - Required: ${field.required ? "Yes" : "No"}\n` +
                       `   - Default: ${field.value || "None"}\n` +
                       `   - Placeholder: ${field.placeholder || "None"}\n` +
                       `   - Helper Text: ${field.helperText || "None"}`;
            }).join("\n\n");
        }

        // Simulator Test Inputs
        let testInputsMarkdown = "None simulated";
        if (currentInputFields && currentInputFields.length > 0) {
            testInputsMarkdown = currentInputFields.map(field => {
                const val = testValues[field.name] || "";
                return `- **${field.label || field.name}** (\`{{${field.name}}}\`): ${val || "(empty)"}`;
            }).join("\n");
        }

        // Guardrails
        const appliedPresetIds = parseGuardrailIds(editorFields.guardrail_preset_ids || activeTemplate?.guardrail_preset_ids);
        const appliedPresets = appliedPresetIds
            .map(id => guardrailPresets.find(p => p.id === id))
            .filter(Boolean) as GuardrailPreset[];
        
        let guardrailsMarkdown = "None applied";
        if (appliedPresets.length > 0) {
            guardrailsMarkdown = appliedPresets.map(preset => `- **${preset.name}**: ${preset.content}`).join("\n");
        }

        // Return formatted markdown
        return `# Arbor Context - Prompt Studio

## Workspace Info
- **Workspace/Page**: Prompt Studio (WorkOS-Lite / ArborDesk)
- **Active Template ID**: ${selectedId || "None selected"}

## Template Metadata
- **Name**: ${name}
- **Category**: ${category}
- **Status**: ${editorFields.status || activeTemplate?.status || "draft"}
- **Version**: ${editorFields.version || activeTemplate?.version || "1.0.0"}

## Persona & Purpose
- **Purpose**: ${purpose}
- **Role**: ${role}
- **Context**: ${context}

## Prompt Body
### Instructions
\`\`\`
${instructions}
\`\`\`

### Constraints
\`\`\`
${constraints}
\`\`\`

### Output Format
\`\`\`
${outputFormat}
\`\`\`

### Review Checklist
\`\`\`
${reviewChecklist}
\`\`\`

### Notes / Brief
\`\`\`
${notes}
\`\`\`

### Applied Guardrails
${guardrailsMarkdown}

## Variables / Input Fields
${variablesMarkdown}

## Simulator Test Inputs (Playground)
${testInputsMarkdown}

## Compiled Active Prompt (Playground Output)
\`\`\`
${compiledActivePrompt || "Not available"}
\`\`\`

## Template Structure (Raw Layout)
\`\`\`
${templateStructurePrompt || "Not available"}
\`\`\`
`;
    };

    const handleCopyArborContext = () => {
        const markdown = buildArborContextMarkdown();
        navigator.clipboard.writeText(markdown);
        setCopiedArbor(true);
        setTimeout(() => setCopiedArbor(false), 2000);
    };

    // Quick Prompt Panel Helpers
    const buildQuickPrompt = (template: string, input: string) => {
        const valueToUse = input.trim() || "[วางข้อมูลที่นี่]";
        return template.replace(/\{\{\s*input\s*\}\}/g, valueToUse);
    };

    const handleQuickPromptClick = (template: string) => {
        const generated = buildQuickPrompt(template, quickInput);
        setQuickOutput(generated);
    };

    const handleCopyQuickOutput = () => {
        if (!quickOutput) return;
        navigator.clipboard.writeText(quickOutput);
        setQuickCopied(true);
        setTimeout(() => setQuickCopied(false), 2000);
    };

    // Create New Template
    const handleCreateNew = () => {
        const newTemp: Partial<PromptTemplate> = {
            id: "",
            name: "เทมเพลตใหม่",
            category: "General",
            purpose: "",
            role: "",
            context: "",
            input_fields: "[]",
            instructions: "",
            constraints: "",
            output_format: "",
            review_checklist: "",
            notes: "",
            status: "draft",
            version: "1.0.0",
            version_notes: "เริ่มต้นสร้างเทมเพลต"
        };
        setEditorFields(newTemp);
        setSelectedId("new-template");
        setTestValues({});
        setJsonValidationError(null);
        setPreviewTab("compiled"); 
        setEditingFieldIndex(null);
        setFieldForm({
            name: "",
            label: "",
            value: "",
            placeholder: "",
            helperText: "",
            required: false
        });
        setFieldValidationError(null);
    };

    const handleTriggerMockGenerate = () => {
        setGenStep("generating");
        
        setTimeout(() => {
            const draft = generateArborPromptDraft({
                brief: genBrief,
                category: genCategory,
                brandTone: genBrandTone,
                outputFormat: genOutputFormat
            });
            setDraftEditFields(draft);
            setGenStep("preview");
        }, 1000);
    };

    const handleApplyDraft = () => {
        if (draftEditFields.input_fields) {
            try {
                const parsed = JSON.parse(draftEditFields.input_fields);
                if (!Array.isArray(parsed)) {
                    alert("รูปแบบ JSON ของตัวแปรอินพุตต้องเป็นอาเรย์: [ { 'name': '...', 'label': '...', 'value': '...' } ]");
                    return;
                }
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : "รูปแบบข้อความ JSON ไม่ถูกต้อง";
                alert("รูปแบบ JSON ของตัวแปรอินพุตไม่ถูกต้อง: " + errMsg);
                return;
            }
        }

        setEditorFields(prev => ({
            ...prev,
            name: draftEditFields.name || prev.name,
            category: draftEditFields.category || prev.category,
            purpose: draftEditFields.purpose !== undefined ? draftEditFields.purpose : prev.purpose,
            role: draftEditFields.role !== undefined ? draftEditFields.role : prev.role,
            context: draftEditFields.context !== undefined ? draftEditFields.context : prev.context,
            input_fields: draftEditFields.input_fields !== undefined ? draftEditFields.input_fields : prev.input_fields,
            instructions: draftEditFields.instructions !== undefined ? draftEditFields.instructions : prev.instructions,
            constraints: draftEditFields.constraints !== undefined ? draftEditFields.constraints : prev.constraints,
            output_format: draftEditFields.output_format !== undefined ? draftEditFields.output_format : prev.output_format,
            review_checklist: draftEditFields.review_checklist !== undefined ? draftEditFields.review_checklist : prev.review_checklist,
            notes: draftEditFields.notes !== undefined ? draftEditFields.notes : prev.notes,
            guardrail_preset_ids: draftEditFields.guardrail_preset_ids !== undefined ? draftEditFields.guardrail_preset_ids : prev.guardrail_preset_ids
        }));

        // Sync test values to match new fields config immediately
        const parsedInputs = safeParseInputFields(draftEditFields.input_fields || null);
        const initialValues: Record<string, string> = {};
        parsedInputs.forEach(f => {
            initialValues[f.name] = f.value;
        });
        setTestValues(initialValues);

        setSidebarTab("templates");
        setShowGenModal(false);
        alert("โหลดร่างคำสั่งเข้าสู่ห้องแก้ไขเรียบร้อยแล้ว! (กรุณากด 'บันทึก' ด้านบนเพื่อเซฟลงฐานข้อมูล)");
    };

    const handleTriggerWfMockGenerate = () => {
        setWfGenStep("generating");
        setTimeout(() => {
            const draft = generateArborWorkflowDraft({
                brief: wfGenBrief,
                type: wfGenType,
                brandTone: wfGenBrandTone,
                stepCount: wfGenStepCount,
                templates
            });
            setWfDraftEditFields(draft);
            setWfGenStep("preview");
        }, 1000);
    };

    const handleCreateWorkflowFromDraft = async () => {
        if (!wfDraftEditFields.name?.trim()) {
            alert("กรุณากรอกชื่อเวิร์กโฟลว์");
            return;
        }

        const steps = wfDraftEditFields.steps || [];
        const missingTemplateStep = steps.find(s => !s.prompt_template_id);
        if (missingTemplateStep) {
            alert("ยังมีขั้นตอนที่ไม่ได้จับคู่กับ Prompt Template กรุณาเลือก template ให้ครบก่อนสร้าง Workflow");
            return;
        }

        if (!confirm(`คุณต้องการสร้างเวิร์กโฟลว์ "${wfDraftEditFields.name.trim()}" และเริ่มนำเข้าขั้นตอนการทำงานทั้งหมดจำนวน ${steps.length} ขั้นตอนใช่หรือไม่?`)) {
            return;
        }

        setIsSavingWorkflow(true);
        try {
            // 1. Create Workflow
            const wfRes = await fetch("/api/prompt-workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: wfDraftEditFields.name.trim(),
                    description: wfDraftEditFields.description?.trim() || null
                })
            });
            if (!wfRes.ok) throw new Error("ไม่สามารถสร้างเวิร์กโฟลว์ได้");
            const newWf = await wfRes.json() as PromptWorkflow;

            // 2. Create steps sequentially
            for (const step of steps) {
                const stepRes = await fetch(`/api/prompt-workflows/${newWf.id}/steps`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt_template_id: step.prompt_template_id,
                        step_name: step.step_name.trim() || null,
                        step_description: step.step_description?.trim() || null,
                        step_instruction: step.step_instruction?.trim() || null
                    })
                });
                if (!stepRes.ok) {
                    throw new Error(`ไม่สามารถเพิ่มขั้นตอน "${step.step_name}" เข้าสู่เวิร์กโฟลว์ได้`);
                }
            }

            // Refresh list and select the newly created workflow
            await fetchWorkflows();
            setSelectedWorkflowId(newWf.id);
            setSidebarTab("workflows");
            setShowWfGenModal(false);
            alert("สร้างเวิร์กโฟลว์และนำเข้าขั้นตอนการทำงานสำเร็จแล้ว!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดทางเทคนิคในการสร้างเวิร์กโฟลว์";
            alert(errMsg);
        } finally {
            setIsSavingWorkflow(false);
        }
    };

    // Save Template (POST or PATCH)
    const handleSave = async () => {
        if (jsonValidationError) {
            alert("JSON ไม่ถูกต้อง กรุณาใส่เฉพาะ array ของ input fields เช่น:\n[\n  { \"name\": \"topic\", \"label\": \"หัวข้อ\", \"value\": \"\" }\n]");
            setApiError("ไม่สามารถบันทึกได้เนื่องจากรูปแบบ JSON ของ Input Fields ผิดพลาด");
            return;
        }
        if (!editorFields.name || !editorFields.category) {
            setApiError("กรุณากรอกชื่อและเลือกหมวดหมู่ก่อนบันทึก");
            return;
        }

        setIsSaving(true);
        setApiError(null);
        try {
            const isNew = selectedId === "new-template";
            const url = isNew ? "/api/prompt-templates" : `/api/prompt-templates/${selectedId}`;
            const method = isNew ? "POST" : "PATCH";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editorFields)
            });

            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "บันทึกข้อมูลไม่สำเร็จ");
            }

            const savedData = await res.json() as PromptTemplate;
            
            if (isNew) {
                setTemplates(prev => [savedData, ...prev]);
                setSelectedId(savedData.id);
            } else {
                setTemplates(prev => prev.map(t => t.id === savedData.id ? savedData : t));
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
            setApiError(errMsg);
        } finally {
            setIsSaving(false);
        }
    };

    // Archive Template (DELETE via status update)
    const handleArchive = async () => {
        if (!selectedId || selectedId === "new-template") return;
        if (!confirm("คุณต้องการจะย้ายเทมเพลตนี้ไปยังสถานะถังขยะ/จัดเก็บเอกสาร (Archive) ใช่หรือไม่?")) return;

        setIsSaving(true);
        setApiError(null);
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "เกิดข้อผิดพลาดในการลบเทมเพลต");
            }

            const data = await res.json() as { success: boolean; template: PromptTemplate };
            if (data.success && data.template) {
                const updated = data.template;
                setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "ล้มเหลวในการจัดเก็บเทมเพลต";
            setApiError(errMsg);
        } finally {
            setIsSaving(false);
        }
    };

    // Builder GUI Actions
    const handleFieldFormChange = (key: keyof PromptInputField, val: string | boolean) => {
        setFieldForm(prev => {
            const updated = { ...prev, [key]: val };
            if (key === "name") {
                const err = validateFieldNameLive(String(val), editingFieldIndex);
                setFieldValidationError(err);
            }
            return updated;
        });
    };

    // Submit Field (Add or Edit)
    const handleSubmitField = () => {
        const name = fieldForm.name?.trim() || "";
        const err = validateFieldNameLive(name, editingFieldIndex);
        if (err) {
            setFieldValidationError(err);
            return;
        }

        const newField: PromptInputField = {
            name,
            label: fieldForm.label?.trim() || name,
            value: fieldForm.value || "",
            placeholder: fieldForm.placeholder?.trim() || undefined,
            helperText: fieldForm.helperText?.trim() || undefined,
            required: fieldForm.required === true
        };

        const fields = [...currentInputFields];
        if (editingFieldIndex !== null) {
            // Update
            fields[editingFieldIndex] = newField;
        } else {
            // Add
            fields.push(newField);
        }

        updateInputFieldsList(fields);

        // Reset form
        setEditingFieldIndex(null);
        setFieldForm({
            name: "",
            label: "",
            value: "",
            placeholder: "",
            helperText: "",
            required: false
        });
        setFieldValidationError(null);
    };

    // Edit Field (Load into form)
    const handleEditField = (index: number) => {
        const target = currentInputFields[index];
        setEditingFieldIndex(index);
        setFieldForm({ ...target });
        setFieldValidationError(null);
    };

    // Delete Field
    const handleDeleteField = (index: number) => {
        if (!confirm("คุณต้องการที่จะลบตัวแปรนี้ออกใช่หรือไม่? (การลบจะลบการเชื่อมต่ออินพุตของตัวแปรนี้ออกด้วย)")) return;
        const fields = currentInputFields.filter((_, idx) => idx !== index);
        updateInputFieldsList(fields);
        if (editingFieldIndex === index) {
            setEditingFieldIndex(null);
            setFieldForm({
                name: "",
                label: "",
                value: "",
                placeholder: "",
                helperText: "",
                required: false
            });
            setFieldValidationError(null);
        }
    };

    // Reorder Fields (Move Up / Down)
    const handleMoveField = (index: number, direction: "up" | "down") => {
        const fields = [...currentInputFields];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return;

        // Swap
        const temp = fields[index];
        fields[index] = fields[targetIndex];
        fields[targetIndex] = temp;

        updateInputFieldsList(fields);

        // Shift editing index if currently editing the swapped fields
        if (editingFieldIndex === index) {
            setEditingFieldIndex(targetIndex);
        } else if (editingFieldIndex === targetIndex) {
            setEditingFieldIndex(index);
        }
    };

    // Cancel edit state
    const handleCancelEdit = () => {
        setEditingFieldIndex(null);
        setFieldForm({
            name: "",
            label: "",
            value: "",
            placeholder: "",
            helperText: "",
            required: false
        });
        setFieldValidationError(null);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 overflow-hidden font-sans">
            {/* Header Alert area for API Errors */}
            {apiError && (
                <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3 flex items-center justify-between text-sm animate-fadeIn flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>{apiError}</span>
                    </div>
                    <button 
                        onClick={() => setApiError(null)} 
                        className="text-red-400 hover:text-red-200 text-xs px-2 py-1 font-bold rounded animate-pulse"
                    >
                        ปิด
                    </button>
                </div>
            )}

            {/* Layout container */}
            <div className="flex flex-1 overflow-hidden">
                {/* 1. Left Column: Prompt Library & Workflows */}
                <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-100/60 flex-shrink-0">
                    {/* Tab Switcher */}
                    <div className="bg-slate-200/50 p-1 rounded-lg flex gap-1 mx-3 my-2.5 border border-slate-200/40 flex-shrink-0">
                        <button
                            onClick={() => {
                                setSidebarTab("templates");
                                setSelectedWorkflowId(null);
                                if (templates.length > 0 && !selectedId) {
                                    setSelectedId(templates[0].id);
                                }
                            }}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                sidebarTab === "templates"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Templates ({templates.filter(t => t.status !== "archived").length})
                        </button>
                        <button
                            onClick={() => {
                                setSidebarTab("workflows");
                                setSelectedId(null);
                                fetchWorkflows();
                            }}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                sidebarTab === "workflows"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Workflows ({workflows.length})
                        </button>
                    </div>

                    {sidebarTab === "templates" ? (
                        <>
                            {/* Filters & Actions */}
                            <div className="p-4 border-b border-slate-200 bg-white/45 space-y-3 flex-shrink-0">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Prompt Library
                                    </h2>
                                    <button
                                        onClick={handleCreateNew}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> สร้างใหม่
                                    </button>
                                </div>

                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาชื่อ, สรรพคุณ..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 text-xs rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all shadow-sm"
                                    />
                                </div>

                                {/* Category filter */}
                                <div className="flex gap-2">
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className={SELECT_CLASS}
                                    >
                                        <option className="text-slate-800" value="All">หมวดหมู่ทั้งหมด</option>
                                        {CATEGORIES.map(cat => (
                                            <option className="text-slate-800" key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>

                                    {/* Status filter */}
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className={SELECT_CLASS}
                                    >
                                        <option className="text-slate-800" value="All">สถานะทั้งหมด</option>
                                        <option className="text-slate-800" value="active">Active</option>
                                        <option className="text-slate-800" value="draft">Draft</option>
                                        <option className="text-slate-800" value="testing">Testing</option>
                                        <option className="text-slate-800" value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* Template List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                                {isLoading ? (
                                    <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                                        <span>กำลังโหลดข้อมูล...</span>
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-xs">
                                        ไม่พบเทมเพลตที่ตรงกับเงื่อนไข
                                    </div>
                                ) : (
                                    filteredTemplates.map(t => {
                                        const isActive = t.id === selectedId;
                                        
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedId(t.id)}
                                                className={`p-3 text-left cursor-pointer transition-all rounded-xl border ${
                                                    isActive 
                                                        ? "bg-white text-slate-900 border-slate-200 border-l-4 border-l-blue-500 shadow-sm font-semibold" 
                                                        : "hover:bg-slate-200/50 text-slate-600 border-transparent"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <h3 className={`font-semibold text-xs truncate max-w-[180px] ${isActive ? "text-slate-900" : "text-slate-700"}`}>{t.name}</h3>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-medium border ${
                                                        t.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                        t.status === "testing" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                        t.status === "archived" ? "bg-slate-100 text-slate-500 border-slate-200" :
                                                        "bg-slate-100 text-slate-500 border-slate-200"
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">{t.purpose || "ไม่มีคำอธิบาย"}</p>
                                                
                                                <div className="flex justify-between items-center mt-2 text-[9px] text-slate-500">
                                                    <span>{t.category}</span>
                                                    <span>
                                                        {t.active_version ? (
                                                            <span className="text-emerald-600 font-bold">Active: {t.active_version}</span>
                                                        ) : (
                                                            `v${t.version}`
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Workflow Actions */}
                            <div className="p-4 border-b border-slate-200 bg-white/45 space-y-3 flex-shrink-0">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sliders className="w-3.5 h-3.5 text-slate-500" /> Workflows
                                    </h2>
                                </div>

                                {/* Create Workflow Form (inline) */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-sm">
                                    <span className="text-[9px] text-slate-600 font-bold block uppercase tracking-wider">สร้างเซ็ตเวิร์กโฟลว์ใหม่</span>
                                    <input
                                        type="text"
                                        placeholder="ชื่อเวิร์กโฟลว์..."
                                        value={workflowForm.name}
                                        onChange={(e) => setWorkflowForm(prev => ({ ...prev, name: e.target.value }))}
                                        className={INPUT_CLASS}
                                    />
                                    <input
                                        type="text"
                                        placeholder="คำอธิบาย (ไม่บังคับ)..."
                                        value={workflowForm.description}
                                        onChange={(e) => setWorkflowForm(prev => ({ ...prev, description: e.target.value }))}
                                        className={INPUT_CLASS}
                                    />
                                    <button
                                        onClick={handleCreateWorkflow}
                                        disabled={isSavingWorkflow}
                                        className="w-full py-2 text-center text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer transition shadow-sm disabled:opacity-50"
                                    >
                                        {isSavingWorkflow ? "กำลังบันทึก..." : "สร้าง"}
                                    </button>

                                    {/* Arbor Workflow Assistant Button */}
                                    <div className="border-t border-slate-100 pt-2.5 mt-1.5">
                                        <button
                                            onClick={() => {
                                                setWfGenBrief("");
                                                setWfGenType("Green Fineness Article Production");
                                                setWfGenBrandTone("Green Fineness");
                                                setWfGenStepCount(7);
                                                setWfGenStep("input");
                                                setWfDraftEditFields({});
                                                setWfIsEditingDraftInModal(false);
                                                setShowWfGenModal(true);
                                            }}
                                            className="w-full py-2 text-center text-xs rounded-lg font-bold transition cursor-pointer bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm flex items-center justify-center gap-1.5 border border-transparent"
                                            title="ให้ Arbor ช่วยร่างเวิร์กโฟลว์ตามโจทย์ความต้องการ"
                                        >
                                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                            <span>ให้ Arbor ช่วยร่าง Workflow</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Workflow List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                                {isLoadingWorkflows ? (
                                    <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                                        <span>กำลังโหลด...</span>
                                    </div>
                                ) : workflows.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-xs italic">
                                        ยังไม่มีเวิร์กโฟลว์ (สามารถสร้างใหม่ด้านบน)
                                    </div>
                                ) : (
                                    workflows.map(wf => {
                                        const isActive = wf.id === selectedWorkflowId;
                                        return (
                                            <div
                                                key={wf.id}
                                                onClick={() => {
                                                    setSelectedWorkflowId(wf.id);
                                                    setSelectedId(null);
                                                }}
                                                className={`p-3 text-left cursor-pointer transition-all rounded-xl border ${
                                                    isActive 
                                                        ? "bg-white text-slate-900 border-slate-200 border-l-4 border-l-blue-500 shadow-sm font-semibold" 
                                                        : "hover:bg-slate-200/50 text-slate-600 border-transparent"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <h3 className={`font-semibold text-xs truncate max-w-[170px] ${isActive ? "text-slate-900" : "text-slate-700"}`}>{wf.name}</h3>
                                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold font-mono border border-slate-200">
                                                        {wf.step_count || 0} ขั้น
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">{wf.description || "ไม่มีคำอธิบาย"}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* 2. Center Column: Prompt Editor or Workflow Editor */}
                {sidebarTab === "templates" ? (
                    <div className="flex-1 border-r border-slate-200 flex flex-col bg-slate-50 overflow-hidden">
                    {/* Editor Toolbar */}
                    <div className="p-4 border-b border-slate-200/80 flex justify-between items-center bg-white flex-shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-2.5">
                            <Edit className="w-4 h-4 text-blue-600" />
                            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                {selectedId === "new-template" ? "สร้างเทมเพลตใหม่" : "แก้ไข Prompt Template"}
                            </h2>
                            {selectedId && selectedId !== "new-template" && activeTemplate?.active_version && (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 px-2 py-0.5 rounded text-[10px] font-extrabold">
                                    Active: {activeTemplate.active_version}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setGenBrief("");
                                    setGenCategory(editorFields.category || "Writing");
                                    setGenBrandTone("Green Fineness");
                                    setGenOutputFormat("Markdown");
                                    setGenStep("input");
                                    setDraftEditFields({});
                                    setIsEditingDraftInModal(false);
                                    setShowGenModal(true);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm border border-transparent"
                                title="ให้ Arbor ช่วยร่าง Prompt Template จาก Brief"
                            >
                                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                <span>ให้ Arbor ช่วยร่าง</span>
                            </button>
                            <button
                                onClick={() => {
                                    setImportText("");
                                    setImportPreview(null);
                                    setShowImportModal(true);
                                }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-sm border border-transparent"
                                title="นำเข้า Prompt เต็มรูปแบบแล้วแยกส่วนลงฟิลด์อัตโนมัติ"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>นำเข้า Prompt เต็ม</span>
                            </button>
                            <button
                                onClick={() => setShowQuickGuide(!showQuickGuide)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer border ${
                                    showQuickGuide 
                                        ? "bg-blue-50 text-blue-600 border-blue-200" 
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                                title="คำแนะนำการใช้งานด่วน"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>{showQuickGuide ? "ซ่อนแนะนำ" : "คู่มือการใช้"}</span>
                            </button>
                            <button
                                onClick={handleCopyArborContext}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer border ${
                                    copiedArbor 
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                                title="คัดลอก Markdown Context ทั้งหมดส่งต่อให้ Arbor"
                            >
                                {copiedArbor ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                <span>{copiedArbor ? "คัดลอกแล้ว!" : "Copy Arbor Context"}</span>
                            </button>
                            {selectedId && selectedId !== "new-template" && (
                                <button
                                    onClick={handleArchive}
                                    disabled={isSaving || editorFields.status === "archived"}
                                    title="ย้ายไปยัง Archived"
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <Archive className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-md transition shadow-sm cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</span>
                            </button>
                        </div>
                    </div>

                    {showQuickGuide && (
                        <div className="mx-6 mt-4 p-4.5 bg-blue-50/40 border border-blue-100 rounded-2xl animate-fadeIn space-y-3 flex-shrink-0">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-blue-600" />
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">คู่มือการใช้งาน Prompt Studio ด่วน (Quick Guide)</h3>
                                </div>
                                <button 
                                    onClick={() => setShowQuickGuide(false)}
                                    className="text-slate-400 hover:text-slate-650 text-xs font-semibold cursor-pointer"
                                >
                                    ปิดคำแนะนำ
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <strong>Prompt Studio</strong> เป็นเครื่องมือหลักสำหรับใช้ในการสร้าง (create), ทดสอบ (test), ปรับปรุง (improve), จัดเวอร์ชัน (version) และรวบรวมคำสั่ง Prompts ให้เป็นเวิร์กโฟลว์ (workflows) เพื่อนำไปใช้งานซ้ำในขั้นตอนการผลิตเนื้อหาที่มีสไตล์และมาตรฐานคุณภาพเดียวกัน
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 text-[11px]">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-700">✍️ 1. Prompt Templates & Inputs</h4>
                                    <p className="text-slate-500 leading-normal">
                                        ร่างข้อความหลัก และกำหนดตัวแปร <strong>Input Fields</strong> (เช่น หัวข้อ, กลุ่มเป้าหมาย) เพื่อปรับเปลี่ยนเนื้อหาเวลาทำคำสั่งส่งไปรันจริงได้โดยไม่ต้องแก้ไขเทมเพลตซ้ำ ๆ
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-700">🛡️ 2. Green Fineness Guardrails</h4>
                                    <p className="text-slate-500 leading-normal">
                                        แนวทางควบคุมความเสี่ยงและการใช้ภาษา ช่วยให้ข้อเสนอแนะและข้อห้ามใช้ (เช่น คำเคลมการแพทย์เกินจริง) สอดแทรกเข้าไปในผลลัพธ์เพื่อรักษาคุณภาพแบรนด์และโทนเสียงให้สม่ำเสมอ
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-700">🧪 3. Playground & Test History</h4>
                                    <p className="text-slate-500 leading-normal">
                                        ทดลองรันส่งข้อมูลพารามิเตอร์จำลองและบันทึกประวัติการทดสอบ (Test History) เพื่อประเมินผลลัพธ์และความพร้อมก่อนนำไปใช้งานจริง
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-700">🔄 4. Version Management</h4>
                                    <p className="text-slate-500 leading-normal">
                                        ล็อกความก้าวหน้าการแก้ไขเป็นเวอร์ชันต่าง ๆ เพื่อป้องกันข้อมูลสูญหาย และสามารถกู้คืนเทมเพลตกลับไปเป็นเวอร์ชันก่อนหน้าได้ตลอดเวลา
                                    </p>
                                </div>
                             </div>
                         </div>
                     )}

                    {/* Form Fields */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs custom-scrollbar">
                        {/* Meta Grid Card */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
                            <div>
                                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                                    ข้อมูลทั่วไป (Metadata)
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium border-b border-slate-100 pb-2">
                                    กำหนดชื่อและหมวดหมู่ของเทมเพลตเพื่อจัดระเบียบและเรียกใช้งานได้ง่ายในระบบคลังคำสั่ง
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ชื่อ Prompt *</label>
                                    <input
                                        type="text"
                                        value={editorFields.name || ""}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="เช่น Green Fineness Content Writer"
                                        className={INPUT_CLASS}
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">หมวดหมู่ *</label>
                                    <select
                                        value={editorFields.category || ""}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, category: e.target.value }))}
                                        className={SELECT_CLASS}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option className="bg-white text-slate-800" key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">สถานะ</label>
                                    <select
                                        value={editorFields.status || "draft"}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, status: e.target.value as PromptTemplate["status"] }))}
                                        className={SELECT_CLASS}
                                    >
                                        {STATUSES.map(st => (
                                            <option className="bg-white text-slate-800" key={st} value={st}>{st}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Version & Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">เวอร์ชัน</label>
                                    <input
                                        type="text"
                                        value={editorFields.version || "1.0.0"}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, version: e.target.value }))}
                                        placeholder="1.0.0"
                                        className={INPUT_CLASS + " font-mono"}
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บันทึกเวอร์ชัน (Version Notes)</label>
                                    <input
                                        type="text"
                                        value={editorFields.version_notes || ""}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, version_notes: e.target.value }))}
                                        placeholder="เช่น เริ่มต้นเทมเพลต หรือ แก้ไข instructions เพิ่มเติม"
                                        className={INPUT_CLASS}
                                    />
                                </div>
                            </div>

                            {/* Purpose */}
                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">วัตถุประสงค์ (Purpose)</label>
                                <input
                                    type="text"
                                    value={editorFields.purpose || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, purpose: e.target.value }))}
                                    placeholder="จุดประสงค์หลักในการรัน Prompt นี้"
                                    className={INPUT_CLASS}
                                />
                                {checkFieldForSectionTags(editorFields.purpose, "วัตถุประสงค์ (Purpose)")}
                            </div>
                        </div>

                        {/* Input Fields Section (HUMAN-FRIENDLY BUILDER + COLLAPSIBLE JSON) */}
                        <div className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden shadow-sm">
                            {/* Builder Header */}
                            <div className="bg-slate-100/80 p-3 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-extrabold text-slate-800 flex items-center gap-1.5 font-sans text-xs">
                                    <Sliders className="w-4 h-4 text-blue-600" />
                                    <span>Input Fields Builder</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {currentInputFields.length} ฟิลด์ตัวแปร
                                </span>
                            </div>

                            <div className="p-4 space-y-4">
                                <p className="text-xs text-slate-700 leading-relaxed font-medium pb-2 border-b border-slate-100">
                                    กำหนดฟิลด์ตัวแปร (เช่น topic, target_audience) เพื่อนำไปใช้อ้างอิงในเนื้อหาเทมเพลต Prompt ผ่านเครื่องหมายปีกกาคู่ <code>{"{{ชื่อตัวแปร}}"}</code> ได้โดยอัตโนมัติ
                                </p>
                                {/* List of Configured Fields */}
                                {currentInputFields.length === 0 ? (
                                    <p className="text-slate-600 text-xs text-center py-5 bg-white rounded-xl border border-dashed border-slate-200 shadow-inner leading-relaxed font-medium">
                                        ยังไม่มีตัวแปรอินพุตใด ๆ เริ่มเพิ่มตัวแปรที่ต้องการในแบบฟอร์ม &quot;เพิ่มตัวแปรนำเข้าใหม่&quot; ด้านล่างนี้เพื่อนำไปเรียกใช้ในร่างคำสั่งหลัก
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {currentInputFields.map((field, idx) => (
                                            <div 
                                                key={field.name + "-" + idx}
                                                className={`flex items-center justify-between p-3 rounded-lg border text-xs bg-white transition ${
                                                    editingFieldIndex === idx ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200"
                                                }`}
                                            >
                                                <div className="space-y-0.5 max-w-[70%]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{field.label}</span>
                                                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                                            &#123;&#123;{field.name}&#125;&#125;
                                                        </span>
                                                        {field.required && (
                                                            <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-bold border border-red-200/50">
                                                                Required
                                                            </span>
                                                        )}
                                                    </div>
                                                    {field.value && (
                                                        <p className="text-[10px] text-slate-600 truncate">
                                                            <span className="text-slate-400">Default:</span> {field.value}
                                                        </p>
                                                    )}
                                                    {field.placeholder && (
                                                        <p className="text-[10px] text-slate-500 truncate">
                                                            <span className="text-slate-400">Placeholder:</span> {field.placeholder}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Reorder and Edit Actions */}
                                                <div className="flex items-center gap-1.5">
                                                    {/* Move Up */}
                                                    <button
                                                        onClick={() => handleMoveField(idx, "up")}
                                                        disabled={idx === 0}
                                                        title="เลื่อนขึ้น"
                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-35 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition cursor-pointer"
                                                    >
                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Move Down */}
                                                    <button
                                                        onClick={() => handleMoveField(idx, "down")}
                                                        disabled={idx === currentInputFields.length - 1}
                                                        title="เลื่อนลง"
                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-35 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition cursor-pointer"
                                                    >
                                                        <ArrowDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => handleEditField(idx)}
                                                        title="แก้ไขตัวแปร"
                                                        className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer ml-1"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDeleteField(idx)}
                                                        title="ลบตัวแปร"
                                                        className="p-1 text-slate-400 hover:text-red-650 rounded hover:bg-red-50 transition cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Field Editor Form */}
                                <div className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3 shadow-sm animate-fadeIn">
                                    <span className="font-bold text-slate-700 text-xs block border-b border-slate-100 pb-1.5">
                                        {editingFieldIndex !== null ? "แก้ไขข้อมูลฟิลด์ตัวแปร" : "เพิ่มตัวแปรนำเข้าใหม่"}
                                    </span>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Field Name */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">
                                                Field Name (ตัวคีย์ในโค้ด) *
                                            </label>
                                            <input
                                                type="text"
                                                value={fieldForm.name || ""}
                                                onChange={(e) => handleFieldFormChange("name", e.target.value)}
                                                placeholder="เช่น target_audience"
                                                className={`w-full bg-white border rounded p-2 text-slate-800 caret-blue-500 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all text-xs font-mono ${
                                                    fieldValidationError 
                                                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" 
                                                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/15"
                                                }`}
                                            />
                                            {fieldValidationError && (
                                                <p className="text-red-600 text-[9px] mt-1 font-mono flex items-center gap-1">
                                                    <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                                                    {fieldValidationError}
                                                </p>
                                            )}
                                        </div>

                                        {/* Label */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">
                                                Label (ป้ายแสดงภาษาไทย) *
                                            </label>
                                            <input
                                                type="text"
                                                value={fieldForm.label || ""}
                                                onChange={(e) => handleFieldFormChange("label", e.target.value)}
                                                placeholder="เช่น กลุ่มเป้าหมายบทความ"
                                                className={INPUT_CLASS}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Default Value */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ค่าเริ่มต้น (Default)</label>
                                            <input
                                                type="text"
                                                value={fieldForm.value || ""}
                                                onChange={(e) => handleFieldFormChange("value", e.target.value)}
                                                placeholder="ใส่ค่าเริ่มต้น (ถ้ามี)"
                                                className={INPUT_CLASS}
                                            />
                                        </div>

                                        {/* Placeholder */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">คำแนะนำไกด์ (Placeholder)</label>
                                            <input
                                                type="text"
                                                value={fieldForm.placeholder || ""}
                                                onChange={(e) => handleFieldFormChange("placeholder", e.target.value)}
                                                placeholder="คำจางๆ แสดงในช่องกรอก"
                                                className={INPUT_CLASS}
                                            />
                                        </div>

                                        {/* Helper Text */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ข้อความอธิบายเพิ่ม (Helper)</label>
                                            <input
                                                type="text"
                                                value={fieldForm.helperText || ""}
                                                onChange={(e) => handleFieldFormChange("helperText", e.target.value)}
                                                placeholder="แสดงใต้ช่องป้อนข้อความ"
                                                className={INPUT_CLASS}
                                            />
                                        </div>
                                    </div>

                                    {/* Required */}
                                    <div className="flex items-center gap-2 py-1">
                                        <input
                                            type="checkbox"
                                            id="field-form-required"
                                            checked={fieldForm.required || false}
                                            onChange={(e) => handleFieldFormChange("required", e.target.checked)}
                                            className="w-3.5 h-3.5 accent-blue-600 rounded bg-white border-slate-300 focus:ring-blue-500/20"
                                        />
                                        <label htmlFor="field-form-required" className="text-slate-600 text-xs font-semibold cursor-pointer select-none">
                                            กำหนดเป็นฟิลด์จำเป็นที่ผู้ใช้ต้องกรอก (Required Field)
                                        </label>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        {editingFieldIndex !== null && (
                                            <button
                                                onClick={handleCancelEdit}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-semibold text-xs border border-slate-200 transition cursor-pointer"
                                            >
                                                ยกเลิก
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSubmitField}
                                            disabled={!!fieldValidationError || !fieldForm.name}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-md font-bold text-xs transition cursor-pointer"
                                        >
                                            {editingFieldIndex !== null ? "บันทึกการแก้ไข" : "เพิ่มตัวแปร"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* COLLAPSIBLE RAW JSON (Advanced Mode) */}
                            <div className="border-t border-slate-200">
                                <button
                                    onClick={() => setShowAdvancedJson(!showAdvancedJson)}
                                    className="w-full p-3 bg-slate-100/50 hover:bg-slate-100/80 transition flex justify-between items-center text-xs font-semibold text-slate-600 border-t border-transparent"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Code className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Advanced JSON Editor (สำหรับผู้พัฒนา)</span>
                                    </span>
                                    {showAdvancedJson ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                </button>

                                {showAdvancedJson && (
                                    <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 animate-slideDown">
                                        <textarea
                                            rows={4}
                                            value={editorFields.input_fields || "[]"}
                                            onChange={(e) => handleJsonChange(e.target.value)}
                                            className={`w-full bg-white border rounded p-2.5 text-slate-800 caret-blue-500 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all text-xs font-mono ${
                                                jsonValidationError 
                                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" 
                                                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/15"
                                            }`}
                                        />
                                        {jsonValidationError ? (
                                            <p className="text-red-600 text-[10px] flex items-start gap-1 font-mono whitespace-pre-wrap">
                                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                                <span>{jsonValidationError}</span>
                                            </p>
                                        ) : (
                                            <p className="text-slate-500 text-[9px]">
                                                * การแก้ไขข้อความตรงนี้จะซิงค์กลับไปหา Field Builder ด้านบนโดยอัตโนมัติหากโครงสร้างถูกต้อง
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Role & Context */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บทบาท (Role / Persona)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.role || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, role: e.target.value }))}
                                    placeholder="เช่น คุณคือบรรณาธิการตรวจทานบทความวิชาการเกษตรอินทรีย์..."
                                    className={TEXTAREA_CLASS}
                                />
                                {checkFieldForSectionTags(editorFields.role, "บทบาท (Role)")}
                            </div>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บริบท (Context)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.context || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, context: e.target.value }))}
                                    placeholder="บริบทโดยรอบ ข้อมูลพื้นฐาน องค์กร หรือกลุ่มเป้าหมาย..."
                                    className={TEXTAREA_CLASS}
                                />
                                {checkFieldForSectionTags(editorFields.context, "บริบท (Context)")}
                            </div>
                        </div>

                        {/* Instructions & Constraints */}
                        <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ขั้นตอนดำเนินงาน (Instructions)</label>
                            <textarea
                                rows={5}
                                value={editorFields.instructions || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, instructions: e.target.value }))}
                                placeholder="ขั้นตอนการทำงาน 1, 2, 3 ทีละสเตป..."
                                className={TEXTAREA_CLASS}
                            />
                            {checkFieldForSectionTags(editorFields.instructions, "ขั้นตอนดำเนินงาน (Instructions)")}
                        </div>

                        <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ข้อจำกัด / กฎเกณฑ์ (Constraints)</label>
                            <textarea
                                rows={3}
                                value={editorFields.constraints || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, constraints: e.target.value }))}
                                placeholder="สิ่งที่ห้ามทำเด็ดขาด เช่น ห้ามใช้สารเคมี, ห้ามใช้สัญลักษณ์นี้..."
                                className={TEXTAREA_CLASS}
                            />
                            {checkFieldForSectionTags(editorFields.constraints, "ข้อจำกัด / กฎเกณฑ์ (Constraints)")}
                        </div>

                        {/* Green Fineness Guardrails Preset Selection Panel */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                            <label className="block text-slate-800 font-bold mb-1 text-xs uppercase tracking-wider">Green Fineness Guardrails (แนวทางความปลอดภัยของแบรนด์)</label>
                            <span className="text-xs text-slate-500 block mb-3 leading-relaxed">
                                Guardrails คือกฎการควบคุมความเสี่ยงและการใช้ภาษา ซึ่งจะถูกรวมเข้าไปใน Compiled Prompt เพื่อช่วยรักษาโทนเสียง การกล่าวอ้างสรรพคุณ (Claims) และคุณภาพของผลลัพธ์ให้สอดคล้องตามเกณฑ์มาตรฐานความปลอดภัยของ Green Fineness อยู่เสมอ
                            </span>
                            
                            {guardrailPresets.length === 0 ? (
                                <p className="text-slate-600 text-xs leading-relaxed font-medium">กำลังโหลดข้อมูล Presets หรือไม่พบข้อมูลในระบบ...</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {guardrailPresets.map((preset) => {
                                        const appliedIds = parseGuardrailIds(editorFields.guardrail_preset_ids);
                                        const isApplied = appliedIds.includes(preset.id);
                                        
                                        // Safe parse risk words
                                        let parsedRiskWords: { word: string; suggestedAlternatives: string[] }[] = [];
                                        if (preset.risk_words) {
                                            try {
                                                parsedRiskWords = JSON.parse(preset.risk_words);
                                            } catch (e) {
                                                console.error("Failed to parse risk words", e);
                                            }
                                        }

                                        return (
                                            <div
                                                key={preset.id}
                                                onClick={() => handleToggleGuardrail(preset.id)}
                                                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                                                    isApplied
                                                        ? "bg-blue-50 border-blue-300 hover:bg-blue-100/70 text-slate-900 ring-1 ring-blue-400/20 shadow-sm"
                                                        : "bg-white border-slate-200 hover:bg-slate-50/70 text-slate-700 shadow-sm"
                                                }`}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-start gap-2.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={isApplied}
                                                            onChange={() => {}} // handled by onClick on container
                                                            className="mt-1 accent-blue-600 cursor-pointer w-4 h-4 flex-shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-extrabold text-xs text-slate-800 truncate">{preset.name}</span>
                                                                <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold border uppercase tracking-wider ${
                                                                    preset.category === "tone" ? "bg-cyan-50 text-cyan-600 border-cyan-200" :
                                                                    preset.category === "claims" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                                    preset.category === "sales" ? "bg-purple-50 text-purple-600 border-purple-200" :
                                                                    preset.category === "review" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                                    "bg-slate-100 text-slate-500 border-slate-200"
                                                                }`}>
                                                                    {preset.category}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-slate-500 block mt-1.5 leading-5">{preset.description}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {parsedRiskWords.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-400 leading-normal">
                                                        <span className="text-amber-600 font-semibold block mb-1">Risk Word Bank & Alternatives:</span>
                                                        <ul className="space-y-1 pl-1.5 list-disc list-inside">
                                                            {parsedRiskWords.map((rw, index) => (
                                                                <li key={index} className="truncate text-slate-600">
                                                                    <strong className="text-red-600 font-mono">&quot;{rw.word}&quot;</strong> ➔ <span>{rw.suggestedAlternatives.join(", ")}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Output & Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">รูปแบบผลลัพธ์ (Output Format)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.output_format || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, output_format: e.target.value }))}
                                    placeholder="จัดรูปแบบคำตอบ เช่น แสดงเป็น Markdown Table หรือ JSON..."
                                    className={TEXTAREA_CLASS}
                                />
                                {checkFieldForSectionTags(editorFields.output_format, "รูปแบบผลลัพธ์ (Output Format)")}
                            </div>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">รายการเช็คตรวจสอบก่อนส่ง (Review Checklist)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.review_checklist || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, review_checklist: e.target.value }))}
                                    placeholder="การประเมินคุณภาพด้วยตนเองก่อนสรุปผล..."
                                    className={TEXTAREA_CLASS}
                                />
                                {checkFieldForSectionTags(editorFields.review_checklist, "รายการเช็คตรวจสอบก่อนส่ง (Review Checklist)")}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บันทึกเพิ่มเติม (Notes)</label>
                            <textarea
                                rows={2}
                                value={editorFields.notes || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="บันทึกข้อความภายในที่ไม่ได้ Compile ไปยัง Prompt"
                                className={TEXTAREA_CLASS}
                            />
                            {checkFieldForSectionTags(editorFields.notes, "บันทึกเพิ่มเติม (Notes)")}
                        </div>
                    </div>
                </div>
                ) : (
                    /* Workflow Editor Workspace */
                    <div className="flex-1 border-r border-slate-200 flex flex-col bg-slate-50 overflow-hidden">
                        {selectedWorkflowId && selectedWorkflow ? (
                            <>
                                {/* Editor Toolbar */}
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/80 sticky top-0 backdrop-blur-md z-10 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <Sliders className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        {isEditingWorkflowMeta ? (
                                            <div className="flex items-center gap-2 flex-1 max-w-md">
                                                <input
                                                    type="text"
                                                    value={workflowMetaForm.name}
                                                    onChange={(e) => setWorkflowMetaForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className={INPUT_CLASS}
                                                    placeholder="ชื่อเวิร์กโฟลว์"
                                                />
                                                <input
                                                    type="text"
                                                    value={workflowMetaForm.description}
                                                    onChange={(e) => setWorkflowMetaForm(prev => ({ ...prev, description: e.target.value }))}
                                                    className={INPUT_CLASS}
                                                    placeholder="คำอธิบาย"
                                                />
                                                <button
                                                    onClick={handleUpdateWorkflowMeta}
                                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-semibold cursor-pointer transition shadow-sm flex-shrink-0"
                                                >
                                                    บันทึก
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingWorkflowMeta(false)}
                                                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-semibold cursor-pointer transition shadow-sm flex-shrink-0"
                                                >
                                                    ยกเลิก
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                                                        {selectedWorkflow.name}
                                                    </h2>
                                                    <button
                                                        onClick={() => {
                                                            setWorkflowMetaForm({
                                                                name: selectedWorkflow.name,
                                                                description: selectedWorkflow.description || ""
                                                            });
                                                            setIsEditingWorkflowMeta(true);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition"
                                                        title="แก้ไขชื่อและรายละเอียด"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {selectedWorkflow.description && (
                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{selectedWorkflow.description}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {selectedWorkflow.steps && selectedWorkflow.steps.length > 0 && (
                                            <button
                                                onClick={handleResetWorkflowProgress}
                                                title="ล้างสถานะการรันและโน้ตของทุกขั้นตอนในเวิร์กโฟลว์นี้"
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-blue-650 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition cursor-pointer text-xs font-semibold bg-white shadow-sm"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                <span>Reset Progress</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleArchiveWorkflow}
                                            title="เก็บถาวรเวิร์กโฟลว์"
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition cursor-pointer text-xs font-semibold bg-white shadow-sm"
                                        >
                                            <Archive className="w-3.5 h-3.5" />
                                            <span>Archive</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Main Steps & Setup Panel */}
                                <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs custom-scrollbar">
                                    {/* Workflow Steps List */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">ขั้นตอนการทำงาน ({selectedWorkflow.steps?.length || 0})</h3>
                                            <span className="text-[10px] text-slate-400">เรียงตามลำดับก่อนหลัง</span>
                                        </div>

                                        {!selectedWorkflow.steps || selectedWorkflow.steps.length === 0 ? (
                                            <div className="border border-dashed border-slate-200 bg-slate-100/30 rounded-xl p-8 text-center text-slate-500 italic">
                                                ยังไม่มีขั้นตอนในเวิร์กโฟลว์นี้ เริ่มเพิ่มขั้นตอนแรกของคุณโดยกรอกฟอร์มด้านล่าง
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedWorkflow.steps.map((step, index) => {
                                                    const isEditing = editingStepId === step.id;
                                                    return (
                                                        <div key={step.id} className="border border-slate-200/80 rounded-xl bg-white p-4 space-y-3 shadow-sm hover:border-slate-300 transition-all">
                                                            <div className="flex justify-between items-start gap-4">
                                                                <div className="flex items-start gap-3 min-w-0">
                                                                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 mt-0.5 shadow-sm">
                                                                        {index + 1}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <h4 className="font-bold text-slate-800 text-xs truncate">{step.step_name}</h4>
                                                                            {/* Run Status Badge */}
                                                                            {(() => {
                                                                                const status = step.run_status || "pending";
                                                                                let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
                                                                                let label = "Pending";
                                                                                if (status === "in_progress") {
                                                                                    badgeClass = "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
                                                                                    label = "In Progress";
                                                                                } else if (status === "done") {
                                                                                    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                                                    label = "Done";
                                                                                } else if (status === "skipped") {
                                                                                    badgeClass = "bg-slate-50 text-slate-500 border-slate-200/60";
                                                                                    label = "Skipped";
                                                                                }
                                                                                return (
                                                                                    <span className={`text-[8px] px-1.5 py-0.2 rounded-full border font-bold uppercase tracking-wider ${badgeClass}`}>
                                                                                        {label}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        {step.step_description && (
                                                                            <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{step.step_description}</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Step Control Buttons */}
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    <button
                                                                        onClick={() => handleMoveStep(step.id, "up")}
                                                                        disabled={index === 0}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition cursor-pointer"
                                                                        title="เลื่อนขึ้น"
                                                                    >
                                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleMoveStep(step.id, "down")}
                                                                        disabled={index === (selectedWorkflow.steps?.length || 1) - 1}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition cursor-pointer"
                                                                        title="เลื่อนลง"
                                                                    >
                                                                        <ArrowDown className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStartEditStep(step)}
                                                                        className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer"
                                                                        title="แก้ไขขั้นตอน"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteStep(step.id)}
                                                                        className="p-1 text-slate-400 hover:text-red-650 rounded hover:bg-slate-100 transition cursor-pointer"
                                                                        title="ลบขั้นตอนออกจากเวิร์กโฟลว์"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Step Inline Edit Form */}
                                                            {isEditing && (
                                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-2 mt-2 shadow-inner">
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 font-bold mb-1">ชื่อขั้นตอน *</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editingStepForm.step_name}
                                                                            onChange={(e) => setEditingStepForm(prev => ({ ...prev, step_name: e.target.value }))}
                                                                            className={INPUT_CLASS}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 font-bold mb-1">คำอธิบาย</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editingStepForm.step_description}
                                                                            onChange={(e) => setEditingStepForm(prev => ({ ...prev, step_description: e.target.value }))}
                                                                            className={INPUT_CLASS}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 font-bold mb-1">คำแนะนำ/คำสั่งการรันเฉพาะ (Instruction Override)</label>
                                                                        <textarea
                                                                            rows={3}
                                                                            value={editingStepForm.step_instruction}
                                                                            onChange={(e) => setEditingStepForm(prev => ({ ...prev, step_instruction: e.target.value }))}
                                                                            className={TEXTAREA_CLASS}
                                                                            placeholder="เขียนกำกับว่าขั้นตอนนี้ควรป้อนข้อมูลหรือรัน Prompt อย่างไร..."
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-2 justify-end pt-1">
                                                                        <button
                                                                            onClick={() => handleUpdateStepDetails(step.id)}
                                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-semibold cursor-pointer transition shadow-sm"
                                                                        >
                                                                            บันทึกการแก้ไข
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingStepId(null)}
                                                                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-semibold cursor-pointer transition shadow-sm"
                                                                        >
                                                                            ยกเลิก
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Linked Prompt Template Details */}
                                                            <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-500">เทมเพลต:</span>
                                                                        <span className="text-slate-755 font-semibold">{step.template_name}</span>
                                                                        <span className="bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded font-mono border border-slate-200">
                                                                            {step.template_category}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-500">Active Version:</span>
                                                                        {step.active_version ? (
                                                                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] px-1.5 py-0.2 rounded font-bold">
                                                                                v{step.active_version}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-600 text-[10px] font-medium leading-relaxed">ไม่มี (ใช้เวอร์ชันล่าสุด)</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => {
                                                                        setSidebarTab("templates");
                                                                        setSelectedId(step.prompt_template_id);
                                                                    }}
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 transition cursor-pointer font-semibold shadow-sm"
                                                                >
                                                                    <BookOpen className="w-3 h-3 text-blue-500" />
                                                                    <span>เปิดแก้ไขเทมเพลต</span>
                                                                </button>
                                                            </div>

                                                            {/* Step Instruction Display */}
                                                            {step.step_instruction && !isEditing && (
                                                                <div className="bg-slate-50 border border-slate-200/50 rounded-lg p-2.5 shadow-sm">
                                                                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mb-1">คำสั่งการใช้งานเฉพาะขั้นตอนนี้:</span>
                                                                    <p className="text-slate-700 text-[10px] font-mono whitespace-pre-wrap leading-relaxed">{step.step_instruction}</p>
                                                                </div>
                                                            )}

                                                            {/* Manual Run Checklist Section */}
                                                            {!isEditing && (
                                                                <div className="border-t border-slate-100 pt-3 mt-3 space-y-3">
                                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                                        {/* Status selection buttons */}
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="text-[10px] font-bold text-slate-500 mr-1">สถานะการรัน:</span>
                                                                            {[
                                                                                { value: "pending", label: "Pending", bg: "bg-slate-100 text-slate-700 border-slate-200", activeBg: "bg-slate-200 text-slate-900 border-slate-400 ring-1 ring-slate-500/10 font-bold" },
                                                                                { value: "in_progress", label: "In Progress", bg: "bg-amber-50 text-amber-700 border-amber-200", activeBg: "bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-500/10 font-bold" },
                                                                                { value: "done", label: "Done", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", activeBg: "bg-emerald-100 text-emerald-900 border-emerald-400 ring-1 ring-emerald-500/10 font-bold" },
                                                                                { value: "skipped", label: "Skipped", bg: "bg-slate-50 text-slate-500 border-slate-200/60", activeBg: "bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400/10 font-bold" }
                                                                            ].map(statusOpt => {
                                                                                const isActive = (step.run_status || "pending") === statusOpt.value;
                                                                                return (
                                                                                    <button
                                                                                        key={statusOpt.value}
                                                                                        onClick={() => handleUpdateStepRunStatus(step.id, statusOpt.value as "pending" | "in_progress" | "done" | "skipped")}
                                                                                        className={`px-2 py-0.5 text-[9px] rounded-md border transition-all cursor-pointer font-semibold ${
                                                                                            isActive ? statusOpt.activeBg : `${statusOpt.bg} hover:brightness-95`
                                                                                        }`}
                                                                                    >
                                                                                        {statusOpt.label}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Copy / Timestamp controls */}
                                                                        <div className="flex items-center gap-2">
                                                                            {step.last_run_at && (
                                                                                <span className="text-[9px] text-slate-400 font-mono">
                                                                                    รันเมื่อ: {new Date(step.last_run_at).toLocaleString("th-TH")}
                                                                                </span>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleCopyStepPrompt(step)}
                                                                                className="flex items-center gap-1 px-2.5 py-1 text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg transition cursor-pointer font-semibold shadow-sm"
                                                                            >
                                                                                <Copy className="w-2.5 h-2.5" />
                                                                                <span>{copiedStepId === step.id ? "คัดลอกแล้ว!" : "Copy Step Prompt"}</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Output Notes Textarea & Save */}
                                                                    <div className="space-y-1.5">
                                                                        <div className="flex justify-between items-center">
                                                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">ผลลัพธ์ / โน้ตเพิ่มเติม (Output Note):</label>
                                                                            <button
                                                                                onClick={() => handleSaveStepOutputNote(step.id)}
                                                                                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[9px] font-semibold cursor-pointer transition shadow-sm"
                                                                            >
                                                                                บันทึกโน้ต
                                                                            </button>
                                                                        </div>
                                                                        <textarea
                                                                            rows={2}
                                                                            value={stepOutputNotes[step.id] ?? ""}
                                                                            onChange={(e) => setStepOutputNotes(prev => ({ ...prev, [step.id]: e.target.value }))}
                                                                            placeholder="บันทึกผลลัพธ์จากการรันขั้นตอนนี้ (เช่น ผลลัพธ์ที่ได้จาก LLM)..."
                                                                            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all text-[11px] leading-relaxed shadow-sm font-sans"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Step Form */}
                                    <div className="border border-slate-200/80 rounded-xl p-4 bg-white shadow-sm space-y-4">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <Plus className="w-3.5 h-3.5 text-blue-500" /> เพิ่มขั้นตอนใหม่
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">เลือก Prompt Template *</label>
                                                <select
                                                    value={stepForm.promptTemplateId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const matchedTpl = templates.find(t => t.id === val);
                                                        setStepForm(prev => ({
                                                            ...prev,
                                                            promptTemplateId: val,
                                                            stepName: matchedTpl ? matchedTpl.name : ""
                                                        }));
                                                    }}
                                                    className={SELECT_CLASS}
                                                >
                                                    <option className="text-slate-400" value="">-- เลือกเทมเพลต --</option>
                                                    {templates
                                                        .filter(t => t.status !== "archived")
                                                        .map(t => (
                                                            <option className="text-slate-800" key={t.id} value={t.id}>
                                                                {t.name} ({t.category}) {t.active_version ? `[v${t.active_version}]` : `[v${t.version}]`}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ชื่อขั้นตอน (ว่างไว้เพื่อใช้ชื่อเทมเพลต)</label>
                                                <input
                                                    type="text"
                                                    value={stepForm.stepName}
                                                    onChange={(e) => setStepForm(prev => ({ ...prev, stepName: e.target.value }))}
                                                    placeholder="เช่น สร้างร่างบทความเกริ่นนำ"
                                                    className={INPUT_CLASS}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">คำอธิบายขั้นตอน</label>
                                                <input
                                                    type="text"
                                                    value={stepForm.stepDescription}
                                                    onChange={(e) => setStepForm(prev => ({ ...prev, stepDescription: e.target.value }))}
                                                    placeholder="วัตถุประสงค์ของขั้นตอนนี้..."
                                                    className={INPUT_CLASS}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">คำแนะนำสั่งงานเฉพาะขั้นตอน (Instruction Override)</label>
                                                <textarea
                                                    rows={2}
                                                    value={stepForm.stepInstruction}
                                                    onChange={(e) => setStepForm(prev => ({ ...prev, stepInstruction: e.target.value }))}
                                                    placeholder="เขียนระบุเฉพาะขั้นตอนนี้ เช่น ให้นำเนื้อหาจากขั้นตอนที่ 1 มาวิเคราะห์ต่อ..."
                                                    className={TEXTAREA_CLASS}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <button
                                                onClick={handleAddStep}
                                                disabled={isAddingStep || !stepForm.promptTemplateId}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-sm"
                                            >
                                                {isAddingStep ? (
                                                    <>
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        <span>กำลังเพิ่ม...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>เพิ่มขั้นตอน</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6 max-w-2xl mx-auto text-slate-600 custom-scrollbar justify-center">
                                <div className="text-center space-y-2">
                                    <Sliders className="w-10 h-10 text-blue-500 mx-auto mb-1 animate-pulse" />
                                    <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">คู่มือระบบเวิร์กโฟลว์ (Workflow Guide)</h2>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                                        เรียงร้อยหลายคำสั่ง Prompt Templates เข้าด้วยกันเป็นขั้นตอนตามลำดับ เพื่อการผลิตเนื้อหาที่มีคุณภาพและเป็นระบบระเบียบ
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                        🚀 วิธีเริ่มต้นใช้งานเวิร์กโฟลว์
                                    </h3>
                                    <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-600">
                                        <li>สร้างเซ็ตเวิร์กโฟลว์ใหม่ที่แถบเมนูด้านซ้าย (แท็บ <strong className="text-blue-600 font-semibold">Workflows</strong>)</li>
                                        <li>คลิกเลือกเวิร์กโฟลว์ที่ต้องการเปิดขึ้นมาเพื่อจัดการโครงสร้าง</li>
                                        <li>ผูกขั้นตอนการทำงานโดยกรอกชื่อ เลือกเทมเพลต Prompt ที่เกี่ยวข้อง และบันทึกทีละขั้นตอน</li>
                                        <li>จัดลำดับขั้นตอนต่าง ๆ ให้สอดคล้องกันเพื่อใช้ในการผลิตผลงาน</li>
                                    </ol>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                        💡 กรณีศึกษาเวิร์กโฟลว์: Green Fineness Article Production
                                    </h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        ระบบงานการเขียนบทความ Green Fineness ที่เชื่อมโยง 7 ขั้นตอนตามมาตรฐานของแบรนด์:
                                    </p>
                                    <div className="space-y-3 pt-1 text-[11px]">
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">1</span>
                                            <div>
                                                <strong className="text-slate-700 block">Research Brief</strong>
                                                <span className="text-slate-500">สรุปข้อมูลตั้งต้น บริบทของหัวข้อ และข้อเท็จจริงที่ควรใช้ในการเขียน</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">2</span>
                                            <div>
                                                <strong className="text-slate-700 block">Article Outline</strong>
                                                <span className="text-slate-500">วางโครงสร้างบทความ H1, H2, H3 และลำดับการเล่า</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">3</span>
                                            <div>
                                                <strong className="text-slate-700 block">Claim Risk Review</strong>
                                                <span className="text-slate-500">ตรวจคำกล่าวอ้างเรื่องดิน พืช จุลินทรีย์ ปุ๋ย ธาตุอาหาร ผลผลิต และสิ่งแวดล้อมไม่ให้ฟันธงเกินไป</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">4</span>
                                            <div>
                                                <strong className="text-slate-700 block">Article Draft</strong>
                                                <span className="text-slate-500">ร่างเนื้อหาทั้งหมดด้วยภาษาไทยที่อ่านง่าย มีบริบท และไม่ขายแรง</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">5</span>
                                            <div>
                                                <strong className="text-slate-700 block">Green Fineness Tone Review</strong>
                                                <span className="text-slate-500">ขัดเกลาภาษาให้สงบ ชัด และสอดคล้องกับโทน Green Fineness</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">6</span>
                                            <div>
                                                <strong className="text-slate-700 block">SEO Metadata</strong>
                                                <span className="text-slate-500">ร่าง meta title, meta description, slug และคำสำคัญเบื้องต้น</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">7</span>
                                            <div>
                                                <strong className="text-slate-700 block">Social Caption</strong>
                                                <span className="text-slate-500">ย่อยประเด็นจากบทความเป็นโพสต์สั้นสำหรับเผยแพร่</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Right Column: Preview & Test Input Area */}
                {sidebarTab === "templates" && (
                    <div className="w-[420px] flex flex-col bg-slate-100/70 border-l border-slate-200 overflow-hidden flex-shrink-0">
                    {/* Main Tab selector for Playground vs History */}
                    <div className="bg-slate-200/50 p-1 rounded-lg flex gap-1 mx-3 my-2.5 border border-slate-200/40 flex-shrink-0">
                        <button
                            onClick={() => setRightPanelTab("playground")}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                rightPanelTab === "playground"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Playground
                        </button>
                        <button
                            onClick={() => setRightPanelTab("history")}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                rightPanelTab === "history"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Test History
                        </button>
                        <button
                            onClick={() => setRightPanelTab("versions")}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                rightPanelTab === "versions"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Versions
                        </button>
                        <button
                            onClick={() => setRightPanelTab("quick-prompt")}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                rightPanelTab === "quick-prompt"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Prompt Lite
                        </button>
                    </div>

                    {rightPanelTab === "playground" && (
                        <>
                            {/* Test Variables Area */}
                            <div className="p-4 border-b border-slate-200 bg-white/40 flex flex-col flex-shrink-0">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sliders className="w-4 h-4 text-blue-500" />
                                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Test Input Area</h2>
                                </div>
                                
                                {currentInputFields.length === 0 ? (
                                    <p className="text-[11px] text-slate-500 italic">
                                        {"ไม่มีตัวแปรที่กำหนดไว้ในเทมเพลตนี้ (สามารถเพิ่มตัวแปรในช่อง Input Fields Builder ด้านข้าง)"}
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                        {currentInputFields.map(field => (
                                            <div key={field.name} className="flex flex-col text-xs">
                                                <label className="text-slate-600 font-semibold mb-0.5 flex justify-between items-center">
                                                    <span className="flex items-center gap-1">
                                                        <span>{field.label}</span>
                                                        {field.required && <span className="text-red-500 text-[10px] font-bold">*</span>}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-mono">&#123;&#123;{field.name}&#125;&#125;</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={testValues[field.name] || ""}
                                                    placeholder={field.placeholder || `กรอกค่าของ ${field.label}...`}
                                                    onChange={(e) => setTestValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                    className={INPUT_CLASS}
                                                />
                                                {field.helperText && (
                                                    <span className="text-[10px] text-slate-600 mt-0.5 font-medium leading-relaxed">
                                                        {field.helperText}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tab Navigation for Preview Area */}
                            <div className="bg-slate-200/50 p-1 rounded-lg flex gap-1 mx-3 my-2 border border-slate-200/40 flex-shrink-0">
                                <button
                                    onClick={() => setPreviewTab("compiled")}
                                    className={`flex-1 text-center py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                                        previewTab === "compiled"
                                            ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                            : "text-slate-600 hover:bg-slate-200/40"
                                    }`}
                                >
                                    Compiled Prompt (พร้อมใช้)
                                </button>
                                <button
                                    onClick={() => setPreviewTab("template")}
                                    className={`flex-1 text-center py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                                        previewTab === "template"
                                            ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                            : "text-slate-600 hover:bg-slate-200/40"
                                    }`}
                                >
                                    Template Structure (โครงสร้าง)
                                </button>
                            </div>

                            {/* Compile Preview Area */}
                            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                                <div className="py-1.5 px-3 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                {previewTab === "compiled" ? "Compiled Result" : "Template Spec"}
                                            </h2>
                                        </div>
                                        {previewTab === "compiled" ? (
                                            <div className="mt-0.5 text-[11px] leading-4 text-slate-700 font-medium">
                                                <span>ⓘ [USER INPUT] ใน Compiled Result อาจมาจาก Test Input Area โดยอัตโนมัติ ไม่ต้องลบ เว้นแต่มี warning ใต้ช่อง Template หลักด้านซ้าย</span>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-slate-600 mt-0.5 leading-normal font-medium">
                                                โครงสร้างโครงร่างพารามิเตอร์และตัวแปรแบบ Raw Spec
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {previewTab === "compiled" && selectedId && selectedId !== "new-template" && (
                                            <button
                                                onClick={() => setRightPanelTab("history")}
                                                className="flex items-center gap-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                                            >
                                                <Sliders className="w-3 h-3 text-blue-500" />
                                                <span>บันทึก Test</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCopy}
                                            disabled={!activePreviewText}
                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                                                copied 
                                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                                    : "bg-blue-600 hover:bg-blue-500 text-white border-transparent"
                                            }`}
                                        >
                                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            <span>
                                                {copied 
                                                    ? "คัดลอกสำเร็จ!" 
                                                    : previewTab === "compiled" 
                                                        ? "คัดลอก Prompt" 
                                                        : "คัดลอก Spec"
                                                }
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Prompt rendering panel */}
                                <div className="flex-1 m-2.5 p-4 overflow-y-auto bg-white border border-slate-200/60 rounded-xl shadow-inner font-mono text-sm text-slate-800 select-text whitespace-pre-wrap leading-6 custom-scrollbar">
                                    {activePreviewText ? (
                                        activePreviewText
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center py-10 space-y-2.5 max-w-[280px] mx-auto h-full">
                                            <Eye className="w-8 h-8 text-slate-300" />
                                            <p className="text-slate-700 font-semibold text-xs">พรีวิว Compiled Prompt</p>
                                            <p className="text-slate-600 text-[11px] leading-relaxed font-medium">
                                                กรอกร่างคำสั่งหลักในหน้าต่างตรงกลาง และป้อนตัวแปรจำลองที่ช่องกรอกทดสอบ &quot;Test Input Area&quot; เพื่อเรนเดอร์ดูข้อความ Prompt สำเร็จรูปที่พร้อมใช้ป้อน AI ได้ที่นี่ครับ
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {rightPanelTab === "history" && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                            {!selectedId || selectedId === "new-template" ? (
                                <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-600 font-medium leading-relaxed">
                                    กรุณาบันทึกเทมเพลตคำสั่งหลักนี้ก่อน เพื่อเปิดใช้ระบบประเมินคะแนนและเก็บบันทึกประวัติการทดสอบในระบบคลังคำสั่ง
                                </div>
                            ) : (
                                <>
                                    {/* Save Test Run form */}
                                    <div className="p-4 border-b border-slate-200 bg-white/40 flex flex-col flex-shrink-0 space-y-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">บันทึกผลการทดสอบ (Record Test Run)</span>
                                            <span className="text-[10px] text-slate-600 mt-0.5 leading-normal font-medium">
                                                ประเมินผลคำตอบของ AI ด้วยการให้คะแนนและบันทึกข้อเสนอแนะสำหรับการปรับปรุงเทมเพลตในรุ่นถัดไป
                                            </span>
                                        </div>
                                        
                                        {/* Summary */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">สรุปการทดสอบ (Summary)</label>
                                            <input
                                                type="text"
                                                value={logForm.summary}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, summary: e.target.value }))}
                                                placeholder="เช่น Outline ดี แต่ claim ยังแรง..."
                                                className={INPUT_CLASS}
                                            />
                                        </div>

                                        {/* Run Status Selector */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">สถานะผลการรัน (Run Status)</label>
                                            <select
                                                value={logForm.runStatus}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, runStatus: e.target.value }))}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="text-slate-800" value="needs_revision">⚠️ Needs Revision (ต้องปรับปรุง)</option>
                                                <option className="text-slate-800" value="useful">✅ Useful (พร้อมใช้งาน)</option>
                                            </select>
                                        </div>

                                        {/* Rating Selector */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ระดับคะแนน (Rating)</label>
                                            <select
                                                value={logForm.rating}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="text-slate-800" value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                                                <option className="text-slate-800" value={4}>⭐⭐⭐⭐ (4/5)</option>
                                                <option className="text-slate-800" value={3}>⭐⭐⭐ (3/5)</option>
                                                <option className="text-slate-800" value={2}>⭐⭐ (2/5)</option>
                                                <option className="text-slate-800" value={1}>⭐ (1/5)</option>
                                            </select>
                                        </div>

                                        {/* Output Notes */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บันทึกผลลัพธ์ (Output Notes)</label>
                                            <textarea
                                                rows={2}
                                                value={logForm.outputNotes}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, outputNotes: e.target.value }))}
                                                placeholder="เช่น ตอบคำถามได้ดี, ภาษาค่อนข้างทางการเกินไปนิด..."
                                                className={TEXTAREA_CLASS}
                                            />
                                        </div>

                                        {/* Next Revision Notes */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">สิ่งที่ควรปรับปรุงในเวอร์ชันหน้า (Next Revision Notes)</label>
                                            <textarea
                                                rows={2}
                                                value={logForm.nextRevisionNotes}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, nextRevisionNotes: e.target.value }))}
                                                placeholder="เช่น ปรับ tone ให้กระชับขึ้น หรือห้ามใช้ภาษาคำย่อ..."
                                                className={TEXTAREA_CLASS}
                                            />
                                        </div>

                                        {/* Save Button */}
                                        <button
                                            onClick={handleSaveRunLog}
                                            disabled={isSavingLog}
                                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                                        >
                                            {isSavingLog ? "กำลังบันทึก..." : "บันทึกผลการทดสอบ (Save Run Log)"}
                                        </button>
                                    </div>

                                    {/* History List */}
                                    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                                        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ประวัติการทดสอบ ({runLogs.length})</h3>
                                        </div>

                                        {/* Filters Bar */}
                                        <div className="p-2 border-b border-slate-200 bg-white flex gap-2 flex-shrink-0 text-[10px]">
                                            <div className="flex-1 col-span-1">
                                                <select
                                                    value={logStatusFilter}
                                                    onChange={(e) => setLogStatusFilter(e.target.value)}
                                                    className={SELECT_CLASS + " !p-1"}
                                                >
                                                    <option className="text-slate-800" value="active">Active (ซ่อนจัดเก็บ)</option>
                                                    <option className="text-slate-800" value="useful">Useful (พร้อมใช้งาน)</option>
                                                    <option className="text-slate-800" value="needs_revision">Needs Revision (ต้องแก้ไข)</option>
                                                    <option className="text-slate-800" value="archived">Archived (จัดเก็บแล้ว)</option>
                                                    <option className="text-slate-800" value="all">สถานะทั้งหมด</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 col-span-1">
                                                <select
                                                    value={logRatingFilter}
                                                    onChange={(e) => setLogRatingFilter(e.target.value)}
                                                    className={SELECT_CLASS + " !p-1"}
                                                >
                                                    <option className="text-slate-800" value="all">คะแนนทั้งหมด</option>
                                                    <option className="text-slate-800" value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                                                    <option className="text-slate-800" value="4plus">⭐⭐⭐⭐+ (4+/5)</option>
                                                    <option className="text-slate-800" value="3minus">⭐⭐⭐ หรือน้อยกว่า</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                                            {isLoadingLogs ? (
                                                <div className="text-center text-slate-600 text-xs font-medium py-8">กำลังโหลดประวัติ...</div>
                                            ) : runLogs.length === 0 ? (
                                                <p className="text-slate-600 text-xs text-center py-8 px-4 leading-relaxed font-medium">
                                                    ยังไม่มีประวัติการบันทึกผลการรัน. เมื่อนำ Prompt ไปทดสอบกับ AI แล้ว สามารถระบุบันทึกผลการประเมินที่ฟอร์มด้านบนเพื่อเริ่มเก็บข้อมูลรอบแรกได้ครับ
                                                </p>
                                            ) : (
                                                runLogs.map(log => {
                                                    const isExpanded = expandedLogId === log.id;
                                                    const formattedDate = new Date(log.createdAt).toLocaleString("th-TH", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    });

                                                    return (
                                                        <div key={log.id} className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5 text-xs shadow-sm hover:border-slate-300 transition-all">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-[10px] text-slate-400 font-mono">{formattedDate}</span>
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                                                                        log.runStatus === "useful" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                                        log.runStatus === "archived" ? "bg-slate-100 text-slate-500 border-slate-200" :
                                                                        "bg-amber-50 text-amber-600 border-amber-200"
                                                                    }`}>
                                                                        {log.runStatus === "useful" ? "Useful" :
                                                                         log.runStatus === "archived" ? "Archived" : "Needs Revision"}
                                                                    </span>
                                                                </div>
                                                                <span className="text-amber-500 font-bold flex-shrink-0">
                                                                    {"⭐".repeat(log.rating)} ({log.rating}/5)
                                                                </span>
                                                            </div>

                                                            {log.summary && (
                                                                <h4 className="font-bold text-slate-800 border-l-2 border-blue-500 pl-2 py-0.5">
                                                                    {log.summary}
                                                                </h4>
                                                            )}

                                                            {log.outputNotes && (
                                                                <div>
                                                                    <span className="text-[10px] text-slate-500 block font-bold">ผลทดสอบ:</span>
                                                                    <p className="text-slate-700 leading-relaxed">{log.outputNotes}</p>
                                                                </div>
                                                            )}

                                                            {log.nextRevisionNotes && (
                                                                <div>
                                                                    <span className="text-[10px] text-slate-500 block font-bold">บันทึกปรับปรุงในรุ่นถัดไป:</span>
                                                                    <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200/60 leading-relaxed">{log.nextRevisionNotes}</p>
                                                                </div>
                                                            )}

                                                            {/* Actions Row */}
                                                            <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5 mt-1">
                                                                <div className="flex gap-1.5">
                                                                    {log.nextRevisionNotes && (
                                                                        <button
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(log.nextRevisionNotes);
                                                                                alert("คัดลอกบันทึกปรับปรุงเรียบร้อย!");
                                                                            }}
                                                                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                        >
                                                                            คัดลอก Notes
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setLogVersionFormOpenId(logVersionFormOpenId === log.id ? null : log.id);
                                                                            if (!logVersionInputs[log.id]) {
                                                                                setLogVersionInputs(prev => ({
                                                                                    ...prev,
                                                                                    [log.id]: { version: "", notes: log.nextRevisionNotes || "" }
                                                                                }));
                                                                            }
                                                                        }}
                                                                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                    >
                                                                        {logVersionFormOpenId === log.id ? "ยกเลิก" : "บันทึกเป็นเวอร์ชัน"}
                                                                    </button>
                                                                </div>
                                                                
                                                                {log.runStatus !== "archived" && (
                                                                    <button
                                                                        onClick={() => handleArchiveRunLog(log.id)}
                                                                        className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                    >
                                                                        Archive
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Collapsible snapshot */}
                                                            <div className="border-t border-slate-200 pt-2.5 mt-1">
                                                                <button
                                                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                                    className="w-full text-left text-[10px] text-slate-400 hover:text-slate-700 font-semibold flex justify-between items-center cursor-pointer"
                                                                >
                                                                    <span>{isExpanded ? "ซ่อนรายละเอียด Prompt Snapshot" : "ดูรายละเอียด Prompt Snapshot"}</span>
                                                                    <span>{isExpanded ? "▲" : "▼"}</span>
                                                                </button>

                                                                {isExpanded && (
                                                                    <div className="mt-2 space-y-2 animate-fadeIn">
                                                                        {/* Variables */}
                                                                        {log.inputSnapshot && log.inputSnapshot.length > 0 && (
                                                                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                                                                <span className="text-[9px] text-slate-500 font-bold block mb-1">ตัวแปรอินพุต:</span>
                                                                                <div className="space-y-1 text-[9px] font-mono">
                                                                                    {log.inputSnapshot.map((varItem: PromptInputField) => (
                                                                                        <div key={varItem.name} className="truncate">
                                                                                            <span className="text-slate-500">{varItem.label || varItem.name}:</span> <span className="text-slate-800">{varItem.value}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Prompt */}
                                                                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[9px] text-slate-600 whitespace-pre-wrap select-text leading-normal max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                                                                            {log.compiledPromptSnapshot}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {rightPanelTab === "versions" && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                            {!selectedId || selectedId === "new-template" ? (
                                <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-600 font-medium leading-relaxed">
                                    กรุณาบันทึกเทมเพลตนี้ก่อน เพื่อเริ่มต้นจัดเก็บและจัดการประวัติรุ่น (Versions) ของคำสั่งนี้
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                                    {/* Save Current as Version Form */}
                                    <div className="p-4 border-b border-slate-200 bg-white/40 space-y-3 flex-shrink-0">
                                        <div className="flex flex-col gap-0.5 mb-1">
                                            <div className="flex items-center gap-2">
                                                <Save className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">บันทึกเวอร์ชันใหม่จากหน้าแก้ไข</span>
                                            </div>
                                            <span className="text-[10px] text-slate-600 leading-normal font-medium">
                                                ล็อกบันทึกสถานะของ Prompt ฉบับปัจจุบันนี้เก็บเป็นประวัติรุ่น (เช่น v1.0.0) เพื่อให้มั่นใจว่าสามารถคืนค่า (Restore) ย้อนกลับมาใช้ได้เสมอ
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-1">
                                                <input
                                                    type="text"
                                                    value={newVersionForm.version}
                                                    onChange={(e) => setNewVersionForm(prev => ({ ...prev, version: e.target.value }))}
                                                    placeholder="เช่น 1.0.0"
                                                    className={INPUT_CLASS + " font-mono"}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="text"
                                                    value={newVersionForm.revisionNotes}
                                                    onChange={(e) => setNewVersionForm(prev => ({ ...prev, revisionNotes: e.target.value }))}
                                                    placeholder="บันทึกการแก้ไขในรุ่นนี้..."
                                                    className={INPUT_CLASS}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                handleCreateVersion(newVersionForm.version, newVersionForm.revisionNotes);
                                                setNewVersionForm({ version: "", revisionNotes: "" });
                                            }}
                                            disabled={isSavingVersion}
                                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                                        >
                                            {isSavingVersion ? "กำลังบันทึก..." : "บันทึกเวอร์ชัน (Save Version)"}
                                        </button>
                                    </div>

                                    {/* Versions List */}
                                    <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ประวัติเวอร์ชัน ({versions.length})</h3>
                                    </div>

                                    <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                                        {isLoadingVersions ? (
                                            <div className="text-center text-slate-600 text-xs font-medium py-8">กำลังโหลดรายการเวอร์ชัน...</div>
                                        ) : versions.length === 0 ? (
                                            <p className="text-slate-600 text-xs text-center py-8 px-4 leading-relaxed font-medium">
                                                ยังไม่มีการบันทึกรุ่นเวอร์ชันสำหรับเทมเพลตนี้. สามารถระบุเลขรุ่น (เช่น 1.0.0) และระบุบันทึกการแก้ไขที่ฟอร์มด้านบนเพื่อเริ่มบันทึกเวอร์ชันแรกได้เลยครับ
                                            </p>
                                        ) : (
                                            versions.map(v => {
                                                const formattedDate = new Date(v.created_at).toLocaleString("th-TH", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                });

                                                return (
                                                    <div key={v.id} className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5 text-xs shadow-sm hover:border-slate-300 transition-all">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-slate-800 font-mono text-xs">v{v.version}</span>
                                                                {v.is_active === 1 && (
                                                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-mono">{formattedDate}</span>
                                                        </div>

                                                        {v.revision_notes && (
                                                            <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                                                                {v.revision_notes}
                                                            </p>
                                                        )}

                                                        {v.created_from_run_log_id && (
                                                            <div className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold">
                                                                <span>⚡ สร้างเชื่อมโยงจากประวัติการรัน</span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5 mt-1">
                                                            <div className="flex gap-1.5">
                                                                {v.is_active !== 1 && (
                                                                    <button
                                                                        onClick={() => handleMarkVersionActive(v.id)}
                                                                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                    >
                                                                        เปิดใช้งาน (Active)
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleRestoreVersion(v)}
                                                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                >
                                                                    คืนค่านี้ (Restore)
                                                                </button>
                                                            </div>

                                                            <button
                                                                onClick={() => handleDeleteVersion(v.id)}
                                                                className="px-2.5 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                                                                disabled={v.is_active === 1}
                                                                title={v.is_active === 1 ? "ไม่สามารถลบเวอร์ชันที่ใช้งานอยู่ได้" : "ลบเวอร์ชัน"}
                                                            >
                                                                ลบ
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {rightPanelTab === "quick-prompt" && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                            <div className="p-4 border-b border-slate-200 bg-white flex flex-col flex-shrink-0 space-y-1">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quick Prompt Panel</h2>
                                </div>
                                <span className="text-[10px] text-slate-600 leading-normal font-medium">
                                    Prompt Studio Lite: ช่วยสร้างคำสั่งสำเร็จรูปสำหรับส่งต่อไปใช้งานในแพลตฟอร์มอื่น ๆ อย่างรวดเร็ว
                                </span>
                            </div>

                            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar text-xs">
                                {/* Textarea input */}
                                <div className="flex flex-col space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                                    <label className="text-slate-800 font-bold text-[10px] uppercase tracking-wider">
                                        ป้อนข้อความนำเข้า (Input)
                                    </label>
                                    <textarea
                                        value={quickInput}
                                        onChange={(e) => setQuickInput(e.target.value)}
                                        placeholder="วางไอเดีย ดราฟต์ ข้อมูลต้นทาง ผลลัพธ์จากเครื่องมืออื่น หรือ brief งานที่นี่..."
                                        className="w-full h-24 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all text-xs leading-relaxed font-sans shadow-inner resize-none"
                                    />
                                </div>

                                {/* Prompt button groups */}
                                {quickPromptGroups.map(group => (
                                    <div key={group.name} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm space-y-2.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1 h-3 rounded bg-gradient-to-b ${group.color}`} />
                                            <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">
                                                {group.name}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.prompts.map(prompt => (
                                                <button
                                                    key={prompt.id}
                                                    onClick={() => handleQuickPromptClick(prompt.template)}
                                                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 active:bg-slate-200 border border-slate-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm text-left truncate max-w-[170px]"
                                                    title={prompt.description}
                                                >
                                                    {prompt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Generated Output Box */}
                                <div className="flex flex-col space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-800 font-bold text-[10px] uppercase tracking-wider">ผลลัพธ์คำสั่ง (Generated Prompt)</span>
                                        {quickOutput && (
                                            <button
                                                onClick={handleCopyQuickOutput}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm ${
                                                    quickCopied 
                                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                                        : "bg-blue-600 hover:bg-blue-500 text-white border-transparent"
                                                }`}
                                            >
                                                {quickCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                <span>{quickCopied ? "คัดลอกแล้ว!" : "คัดลอก Prompt"}</span>
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        readOnly
                                        value={quickOutput}
                                        placeholder="โปรดเลือกคลิกปุ่ม Quick Prompt ด้านบนเพื่อสร้างคำสั่งสำเร็จรูปที่นี่..."
                                        className="w-full h-40 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder:text-slate-500 focus:outline-none transition-all text-xs font-mono leading-relaxed shadow-inner select-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* AI-Assisted Generator Modal */}
            {showGenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn text-xs">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-800">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-violet-600" />
                                <h3 className="font-extrabold text-slate-800 text-sm">
                                    {genStep === "input" && "ให้ Arbor ช่วยร่าง Prompt Template"}
                                    {genStep === "generating" && "กำลังประมวลผลร่าง..."}
                                    {genStep === "preview" && "ร่างเทมเพลตจาก Arbor"}
                                </h3>
                            </div>
                            {genStep !== "generating" && (
                                <button
                                    onClick={() => setShowGenModal(false)}
                                    className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
                                >
                                    ปิด
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {genStep === "input" && (
                                <div className="space-y-4">
                                    <p className="text-slate-500 text-[11px] leading-relaxed">
                                        ระบุวัตถุประสงค์และบริบทที่คุณต้องการให้ระบบช่วยร่าง Arbor จะช่วยออกแบบโครงสร้าง Role, Context, Instructions, Constraints และแนะนำตัวแปร Input Fields ให้กับคุณโดยอัตโนมัติ
                                    </p>

                                    {/* Brief / Goal */}
                                    <div className="space-y-1">
                                        <label className="block text-slate-600 font-bold">รายละเอียดหรือเป้าหมาย (Brief / Goal) *</label>
                                        <textarea
                                            rows={4}
                                            value={genBrief}
                                            onChange={(e) => setGenBrief(e.target.value)}
                                            placeholder="เช่น ช่วยร่างพร้อมเขียนโครงร่างบทความเกี่ยวกับการแนะนำปุ๋ยชีวภาพและการเตรียมดินปลูกผักสวนครัวอินทรีย์..."
                                            className={TEXTAREA_CLASS}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Category */}
                                        <div className="space-y-1">
                                            <label className="block text-slate-600 font-bold">หมวดหมู่การใช้งาน (Category)</label>
                                            <select
                                                value={genCategory}
                                                onChange={(e) => setGenCategory(e.target.value)}
                                                className={SELECT_CLASS}
                                            >
                                                {CATEGORIES.map(cat => (
                                                    <option className="text-slate-800" key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Brand/Tone */}
                                        <div className="space-y-1">
                                            <label className="block text-slate-600 font-bold">แบรนด์ / โทนเสียง (Brand / Tone)</label>
                                            <select
                                                value={genBrandTone}
                                                onChange={(e) => setGenBrandTone(e.target.value)}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="text-slate-800" value="Green Fineness">Green Fineness (โทนพรีเมียม ระมัดระวัง)</option>
                                                <option className="text-slate-800" value="Professional">Professional (เป็นทางการ)</option>
                                                <option className="text-slate-800" value="Creative">Creative / Friendly (เป็นมิตรและสร้างสรรค์)</option>
                                                <option className="text-slate-800" value="General">General / Neutral (ทั่วไป)</option>
                                            </select>
                                        </div>

                                        {/* Output Format */}
                                        <div className="space-y-1">
                                            <label className="block text-slate-600 font-bold">รูปแบบผลลัพธ์ (Output Format)</label>
                                            <input
                                                type="text"
                                                value={genOutputFormat}
                                                onChange={(e) => setGenOutputFormat(e.target.value)}
                                                placeholder="เช่น Markdown Table, บทความ หรือ JSON"
                                                className={INPUT_CLASS}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {genStep === "generating" && (
                                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                                    <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                                    <div className="text-center space-y-1.5">
                                        <p className="font-bold text-slate-700">Arbor กำลังวิเคราะห์และร่างเทมเพลต...</p>
                                        <p className="text-[11px] text-slate-600 font-medium">กำหนด Persona และโครงสร้างตัวแปรอินพุต...</p>
                                    </div>
                                </div>
                            )}

                            {genStep === "preview" && (
                                <div className="space-y-4">
                                    <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-3 flex items-start gap-2.5">
                                        <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                                        <div className="space-y-1 leading-relaxed">
                                            <p className="font-bold text-violet-800 text-[11px]">ร่างสเปกเทมเพลตพร้อมให้คุณรีวิว</p>
                                            <p className="text-slate-500 text-[10px]">
                                                คุณสามารถตรวจสอบข้อมูลร่าง หรือแก้ไขแต่ละช่องได้โดยคลิกปุ่ม &quot;แก้ไขรายละเอียดในร่าง (Edit manually)&quot; เมื่อพอใจแล้วให้กด &quot;นำสเปกนี้ไปใช้&quot; เพื่อเติมข้อมูลลงใน Editor ฝั่งซ้าย
                                            </p>
                                        </div>
                                    </div>

                                    {/* Suggested Guardrails Recommendation Notice */}
                                    {draftEditFields.guardrail_preset_ids && 
                                     JSON.parse(draftEditFields.guardrail_preset_ids).length > 0 && (
                                        <div className="bg-emerald-50/60 border border-emerald-200 text-emerald-800 rounded-xl p-3 space-y-1 text-[10px] leading-relaxed">
                                            <p className="font-bold">🛡️ แนะนำให้เปิดใช้งาน Guardrail presets ทั้ง 5 รายการ:</p>
                                            <ul className="list-disc list-inside space-y-0.5 pl-1.5 text-emerald-700">
                                                <li>Green Fineness Core Tone (ปรับสำนวนให้สงบ ไม่ขายแรง)</li>
                                                <li>Scientific Claim Caution (ใช้ภาษาเชิงวิทยาศาสตร์อย่างระมัดระวัง)</li>
                                                <li>Soil / Microbe / Fertilizer Claim Guardrail (ควบคุมการกล่าวอ้างสรรพคุณดินปุ๋ย)</li>
                                                <li>Non-salesy Educational Content (เน้นให้ความรู้เชิงสร้างสรรค์ ไม่ขายตรง)</li>
                                                <li>Green Fineness Review Checklist (เช็คลิสต์ตรวจสอบคุณภาพก่อนเผยแพร่)</li>
                                            </ul>
                                        </div>
                                    )}

                                    {/* Editable or Preview Fields list */}
                                    <div className="space-y-4 border border-slate-200 rounded-2xl bg-slate-50/30 p-4.5">
                                        {isEditingDraftInModal ? (
                                            /* EDITABLE FORM FIELDS */
                                            <div className="space-y-3.5">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="block text-slate-500 font-bold text-[10px] uppercase">ชื่อเทมเพลต</label>
                                                        <input
                                                            type="text"
                                                            value={draftEditFields.name || ""}
                                                            onChange={(e) => setDraftEditFields(prev => ({ ...prev, name: e.target.value }))}
                                                            className={INPUT_CLASS}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-slate-500 font-bold text-[10px] uppercase">หมวดหมู่</label>
                                                        <select
                                                            value={draftEditFields.category || "Writing"}
                                                            onChange={(e) => setDraftEditFields(prev => ({ ...prev, category: e.target.value }))}
                                                            className={SELECT_CLASS}
                                                        >
                                                            {CATEGORIES.map(cat => (
                                                                <option className="text-slate-800" key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-slate-500 font-bold text-[10px] uppercase">วัตถุประสงค์ (Purpose)</label>
                                                    <input
                                                        type="text"
                                                        value={draftEditFields.purpose || ""}
                                                        onChange={(e) => setDraftEditFields(prev => ({ ...prev, purpose: e.target.value }))}
                                                        className={INPUT_CLASS}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="block text-slate-500 font-bold text-[10px] uppercase">บทบาท (Role / Persona)</label>
                                                        <textarea
                                                            rows={3}
                                                            value={draftEditFields.role || ""}
                                                            onChange={(e) => setDraftEditFields(prev => ({ ...prev, role: e.target.value }))}
                                                            className={TEXTAREA_CLASS}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-slate-500 font-bold text-[10px] uppercase">บริบท (Context)</label>
                                                        <textarea
                                                            rows={3}
                                                            value={draftEditFields.context || ""}
                                                            onChange={(e) => setDraftEditFields(prev => ({ ...prev, context: e.target.value }))}
                                                            className={TEXTAREA_CLASS}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-slate-500 font-bold text-[10px] uppercase">ตัวแปรอินพุต (Input Fields JSON)</label>
                                                    <textarea
                                                        rows={2}
                                                        value={draftEditFields.input_fields || "[]"}
                                                        onChange={(e) => setDraftEditFields(prev => ({ ...prev, input_fields: e.target.value }))}
                                                        className={TEXTAREA_CLASS + " font-mono text-[10px]"}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-slate-500 font-bold text-[10px] uppercase">ขั้นตอนการดำเนินงาน (Instructions)</label>
                                                    <textarea
                                                        rows={3}
                                                        value={draftEditFields.instructions || ""}
                                                        onChange={(e) => setDraftEditFields(prev => ({ ...prev, instructions: e.target.value }))}
                                                        className={TEXTAREA_CLASS}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="block text-slate-500 font-bold text-[10px] uppercase">ข้อจำกัด (Constraints)</label>
                                                    <textarea
                                                        rows={3}
                                                        value={draftEditFields.constraints || ""}
                                                        onChange={(e) => setDraftEditFields(prev => ({ ...prev, constraints: e.target.value }))}
                                                        className={TEXTAREA_CLASS}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="block text-slate-500 font-bold text-[10px] uppercase">รูปแบบผลลัพธ์ (Output Format)</label>
                                                        <textarea
                                                            rows={2}
                                                            value={draftEditFields.output_format || ""}
                                                            onChange={(e) => setDraftEditFields(prev => ({ ...prev, output_format: e.target.value }))}
                                                            className={TEXTAREA_CLASS}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-slate-500 font-bold text-[10px] uppercase">เช็คลิสต์ประเมิน (Review Checklist)</label>
                                                        <textarea
                                                            rows={2}
                                                            value={draftEditFields.review_checklist || ""}
                                                            onChange={(e) => setDraftEditFields(prev => ({ ...prev, review_checklist: e.target.value }))}
                                                            className={TEXTAREA_CLASS}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* STATIC PREVIEW BLOCKS */
                                            <div className="space-y-3 text-[11px] leading-relaxed">
                                                <div>
                                                    <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Template Name / Category</strong>
                                                    <p className="text-slate-800 font-bold text-xs">{draftEditFields.name} ({draftEditFields.category})</p>
                                                </div>
                                                {draftEditFields.purpose && (
                                                    <div>
                                                        <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Purpose (วัตถุประสงค์)</strong>
                                                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200">{draftEditFields.purpose}</p>
                                                    </div>
                                                )}
                                                {draftEditFields.role && (
                                                    <div>
                                                        <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Role / Persona (บทบาท)</strong>
                                                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap">{draftEditFields.role}</p>
                                                    </div>
                                                )}
                                                {draftEditFields.context && (
                                                    <div>
                                                        <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Context (บริบท)</strong>
                                                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap">{draftEditFields.context}</p>
                                                    </div>
                                                )}
                                                {draftEditFields.instructions && (
                                                    <div>
                                                        <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Instructions (ขั้นตอนดำเนินงาน)</strong>
                                                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap">{draftEditFields.instructions}</p>
                                                    </div>
                                                )}
                                                {draftEditFields.constraints && (
                                                    <div>
                                                        <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Constraints (ข้อจำกัด)</strong>
                                                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap text-red-700 bg-red-50/20 border-red-100">{draftEditFields.constraints}</p>
                                                    </div>
                                                )}
                                                {draftEditFields.output_format && (
                                                    <div>
                                                        <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Output Format (รูปแบบคำตอบ)</strong>
                                                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap">{draftEditFields.output_format}</p>
                                                    </div>
                                                )}
                                                {draftEditFields.review_checklist && (
                                                    <div>
                                                        <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Review Checklist (เช็คลิสต์คุณภาพ)</strong>
                                                        <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap">{draftEditFields.review_checklist}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                            <div>
                                {genStep === "preview" && (
                                    <button
                                        onClick={() => setIsEditingDraftInModal(!isEditingDraftInModal)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                            isEditingDraftInModal 
                                                ? "bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300"
                                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {isEditingDraftInModal ? "ดูตัวอย่างพรีวิว" : "แก้ไขรายละเอียดในร่าง (Edit manually)"}
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {genStep === "input" && (
                                    <>
                                        <button
                                            onClick={() => setShowGenModal(false)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={handleTriggerMockGenerate}
                                            disabled={!genBrief.trim()}
                                            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                        >
                                            เริ่มการร่างด้วย Arbor
                                        </button>
                                    </>
                                )}

                                {genStep === "preview" && (
                                    <>
                                        <button
                                            onClick={() => setGenStep("input")}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                            ย้อนกลับ
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowGenModal(false);
                                            }}
                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                            Discard (ทิ้งร่าง)
                                        </button>
                                        <button
                                            onClick={handleApplyDraft}
                                            className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                                        >
                                            Use this Draft (นำไปใช้)
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI-Assisted Workflow Generator Modal */}
            {showWfGenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn text-xs">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-800">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-violet-600" />
                                <h3 className="font-extrabold text-slate-800 text-sm">
                                    {wfGenStep === "input" && "ให้ Arbor ช่วยร่าง Workflow"}
                                    {wfGenStep === "generating" && "กำลังประมวลผลร่างแผนงาน..."}
                                    {wfGenStep === "preview" && "ร่างแผนงานเวิร์กโฟลว์จาก Arbor"}
                                </h3>
                            </div>
                            {wfGenStep !== "generating" && (
                                <button
                                    onClick={() => setShowWfGenModal(false)}
                                    className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
                                >
                                    ปิด
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {wfGenStep === "input" && (
                                <div className="space-y-4">
                                    <p className="text-slate-500 text-[11px] leading-relaxed">
                                        ระบุวัตถุประสงค์และบริบทของเวิร์กโฟลว์ที่คุณต้องการให้ระบบช่วยร่าง Arbor จะช่วยออกแบบโครงสร้างลำดับขั้นตอน ชื่อขั้นตอน คำอธิบาย และคำแนะนำการใช้งานของเวิร์กโฟลว์ให้กับคุณโดยอัตโนมัติ
                                    </p>

                                    {/* Brief / Goal */}
                                    <div className="space-y-1">
                                        <label className="block text-slate-600 font-bold">รายละเอียดหรือเป้าหมาย (Workflow Brief / Goal) *</label>
                                        <textarea
                                            rows={4}
                                            value={wfGenBrief}
                                            onChange={(e) => setWfGenBrief(e.target.value)}
                                            placeholder="เช่น ช่วยร่างกระบวนการและโครงสร้างเวิร์กโฟลว์ในการผลิตบทความให้ความรู้ทางวิชาการและ SEO ของ Green Fineness..."
                                            className={TEXTAREA_CLASS}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Type */}
                                        <div className="space-y-1">
                                            <label className="block text-slate-600 font-bold">ประเภทเวิร์กโฟลว์ (Workflow Type)</label>
                                            <select
                                                value={wfGenType}
                                                onChange={(e) => setWfGenType(e.target.value)}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="text-slate-800" value="Green Fineness Article Production">Green Fineness Article Production (7 ขั้นตอนหลัก)</option>
                                                <option className="text-slate-800" value="Marketing Campaign">Marketing Campaign / Ads Workflow</option>
                                                <option className="text-slate-800" value="General Writing">General Writing & Review Workflow</option>
                                                <option className="text-slate-800" value="Other">อื่นๆ (General / Custom)</option>
                                            </select>
                                        </div>

                                        {/* Brand/Tone */}
                                        <div className="space-y-1">
                                            <label className="block text-slate-600 font-bold">แบรนด์ / โทนเสียง (Brand / Tone)</label>
                                            <select
                                                value={wfGenBrandTone}
                                                onChange={(e) => setWfGenBrandTone(e.target.value)}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="text-slate-800" value="Green Fineness">Green Fineness (โทนพรีเมียม ระมัดระวัง)</option>
                                                <option className="text-slate-800" value="Professional">Professional (เป็นทางการ)</option>
                                                <option className="text-slate-800" value="Creative">Creative / Friendly (เป็นมิตรและสร้างสรรค์)</option>
                                                <option className="text-slate-800" value="General">General / Neutral (ทั่วไป)</option>
                                            </select>
                                        </div>

                                        {/* Step Count */}
                                        <div className="space-y-1">
                                            <label className="block text-slate-600 font-bold">จำนวนขั้นตอนแนะนำ (Step Count)</label>
                                            <input
                                                type="number"
                                                min={2}
                                                max={10}
                                                value={wfGenStepCount}
                                                onChange={(e) => setWfGenStepCount(parseInt(e.target.value) || 7)}
                                                className={INPUT_CLASS}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {wfGenStep === "generating" && (
                                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                                    <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                                    <div className="text-center space-y-1.5">
                                        <p className="font-bold text-slate-700">Arbor กำลังวิเคราะห์และร่างเวิร์กโฟลว์...</p>
                                        <p className="text-[11px] text-slate-600 font-medium">กำหนดลำดับขั้นตอนและค้นหาแมปปิ้งกับคลังคำสั่งที่มีอยู่เดิม...</p>
                                    </div>
                                </div>
                            )}

                            {wfGenStep === "preview" && (
                                <div className="space-y-4">
                                    <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-3 flex items-start gap-2.5">
                                        <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                                        <div className="space-y-1 leading-relaxed">
                                            <p className="font-bold text-violet-800 text-[11px]">ร่างสเปกแผนงานเวิร์กโฟลว์พร้อมให้คุณรีวิว</p>
                                            <p className="text-slate-500 text-[10px]">
                                                คุณสามารถเปลี่ยนหัวข้อ รายละเอียดของขั้นตอน หรือทำการจับคู่เทมเพลตคำสั่งซื้อเพิ่มเติมได้ด้วยตนเอง
                                            </p>
                                        </div>
                                    </div>

                                    {/* Edit or Preview Meta Fields */}
                                    <div className="space-y-3.5 border border-slate-200 rounded-2xl bg-slate-50/30 p-4.5">
                                        {wfIsEditingDraftInModal ? (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="block text-slate-500 font-bold text-[10px] uppercase">ชื่อเวิร์กโฟลว์</label>
                                                        <input
                                                            type="text"
                                                            value={wfDraftEditFields.name || ""}
                                                            onChange={(e) => setWfDraftEditFields(prev => ({ ...prev, name: e.target.value }))}
                                                            className={INPUT_CLASS}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="block text-slate-500 font-bold text-[10px] uppercase">หมวดหมู่</label>
                                                        <input
                                                            type="text"
                                                            value={wfDraftEditFields.category || "Writing"}
                                                            onChange={(e) => setWfDraftEditFields(prev => ({ ...prev, category: e.target.value }))}
                                                            className={INPUT_CLASS}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-slate-500 font-bold text-[10px] uppercase">คำอธิบายเวิร์กโฟลว์</label>
                                                    <textarea
                                                        rows={2}
                                                        value={wfDraftEditFields.description || ""}
                                                        onChange={(e) => setWfDraftEditFields(prev => ({ ...prev, description: e.target.value }))}
                                                        className={TEXTAREA_CLASS}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1 text-[11px] leading-relaxed">
                                                <strong className="text-slate-500 block uppercase tracking-wider text-[9px] mb-0.5">Workflow Name / Description</strong>
                                                <p className="text-slate-800 font-bold text-xs">{wfDraftEditFields.name} ({wfDraftEditFields.category})</p>
                                                <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-200 mt-1">{wfDraftEditFields.description}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* List of Steps with Template Selector and Warning Badges */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                                            <h4 className="font-bold text-slate-700 text-xs">ลำดับขั้นตอนการรันแผนงาน ({wfDraftEditFields.steps?.length || 0})</h4>
                                            <span className="text-[10px] text-red-500 font-semibold">* ทุกขั้นตอนต้องระบุ Prompt Template ให้ครบ</span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {wfDraftEditFields.steps?.map((step, idx) => {
                                                const isStepMissing = !step.prompt_template_id;
                                                return (
                                                    <div key={idx} className="border border-slate-200 rounded-xl bg-white p-3.5 space-y-3 shadow-sm">
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex items-start gap-2 min-w-0">
                                                                <div className="w-5 h-5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    {wfIsEditingDraftInModal ? (
                                                                        <div className="space-y-2">
                                                                            <input
                                                                                type="text"
                                                                                value={step.step_name}
                                                                                onChange={(e) => {
                                                                                    const updatedSteps = [...(wfDraftEditFields.steps || [])];
                                                                                    updatedSteps[idx] = { ...step, step_name: e.target.value };
                                                                                    setWfDraftEditFields(prev => ({ ...prev, steps: updatedSteps }));
                                                                                }}
                                                                                className={INPUT_CLASS}
                                                                                placeholder="ชื่อขั้นตอน..."
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                value={step.step_description}
                                                                                onChange={(e) => {
                                                                                    const updatedSteps = [...(wfDraftEditFields.steps || [])];
                                                                                    updatedSteps[idx] = { ...step, step_description: e.target.value };
                                                                                    setWfDraftEditFields(prev => ({ ...prev, steps: updatedSteps }));
                                                                                }}
                                                                                className={INPUT_CLASS}
                                                                                placeholder="คำอธิบาย..."
                                                                            />
                                                                            <textarea
                                                                                rows={2}
                                                                                value={step.step_instruction}
                                                                                onChange={(e) => {
                                                                                    const updatedSteps = [...(wfDraftEditFields.steps || [])];
                                                                                    updatedSteps[idx] = { ...step, step_instruction: e.target.value };
                                                                                    setWfDraftEditFields(prev => ({ ...prev, steps: updatedSteps }));
                                                                                }}
                                                                                className={TEXTAREA_CLASS}
                                                                                placeholder="คำแนะนำเพิ่มเติมสำหรับขั้นตอนนี้..."
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <h5 className="font-bold text-slate-800 text-[11px]">{step.step_name}</h5>
                                                                            <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{step.step_description}</p>
                                                                            {step.step_instruction && (
                                                                                <div className="mt-1 bg-slate-50 p-2 border border-slate-100 rounded text-[9px] font-mono text-slate-600 whitespace-pre-wrap">
                                                                                    {step.step_instruction}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Status Badges */}
                                                            <div className="flex-shrink-0">
                                                                {isStepMissing ? (
                                                                    <span className="bg-red-50 text-red-600 border border-red-200 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                                        ⚠️ Missing Template
                                                                    </span>
                                                                ) : (
                                                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                                        ✓ Matched
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Template Link Selector (Manual Linking inside Modal) */}
                                                        <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[10px]">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-slate-500">จับคู่กับ Template:</span>
                                                                <select
                                                                    value={step.prompt_template_id || ""}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value || null;
                                                                        const updatedSteps = [...(wfDraftEditFields.steps || [])];
                                                                        updatedSteps[idx] = { 
                                                                            ...step, 
                                                                            prompt_template_id: val,
                                                                            missingTemplate: !val
                                                                        };
                                                                        setWfDraftEditFields(prev => ({ ...prev, steps: updatedSteps }));
                                                                    }}
                                                                    className="bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 font-semibold"
                                                                >
                                                                    <option value="">-- ยังไม่ได้ระบุ (Missing Prompt Template) --</option>
                                                                    {templates.map(tpl => (
                                                                        <option key={tpl.id} value={tpl.id}>
                                                                            {tpl.name} ({tpl.category})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                            <div>
                                {wfGenStep === "preview" && (
                                    <button
                                        onClick={() => setWfIsEditingDraftInModal(!wfIsEditingDraftInModal)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                            wfIsEditingDraftInModal 
                                                ? "bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300"
                                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {wfIsEditingDraftInModal ? "ดูตัวอย่างพรีวิว" : "แก้ไขรายละเอียดในร่าง (Edit manually)"}
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {wfGenStep === "input" && (
                                    <>
                                        <button
                                            onClick={() => setShowWfGenModal(false)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={handleTriggerWfMockGenerate}
                                            disabled={!wfGenBrief.trim()}
                                            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                        >
                                            เริ่มการร่างด้วย Arbor
                                        </button>
                                    </>
                                )}

                                {wfGenStep === "preview" && (
                                    <>
                                        <button
                                            onClick={() => setWfGenStep("input")}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                            ย้อนกลับ
                                        </button>
                                        <button
                                            onClick={() => setShowWfGenModal(false)}
                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                            Discard (ทิ้งร่าง)
                                        </button>
                                        <div className="flex flex-col items-end">
                                            <button
                                                onClick={handleCreateWorkflowFromDraft}
                                                className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                                            >
                                                สร้าง Workflow จากร่างนี้
                                            </button>
                                            <span className="text-[10px] text-slate-600 mt-1 block font-medium">
                                                * ไม่มีการบันทึกฐานข้อมูลจนกว่าจะกดปุ่มนี้
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Master Prompt Import / Section Splitter Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn text-xs">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden text-slate-800">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-amber-600" />
                                <h3 className="font-extrabold text-slate-800 text-sm">
                                    {!importPreview ? "นำเข้าและแยกส่วน Master Prompt" : "พรีวิวและตรวจสอบความถูกต้องการแยกส่วน (Preview Split)"}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportText("");
                                    setImportPreview(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
                            >
                                ปิด
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {!importPreview ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 leading-relaxed">
                                        💡 <strong>คำแนะนำ:</strong> ใช้เครื่องมือนี้เมื่อมี Prompt แบบเต็มที่มีหัวข้อ <code>[ROLE]</code>, <code>[PURPOSE]</code>, <code>[USER INPUT]</code> เป็นต้น เพื่อให้ระบบช่วยแยกส่วนลงฟิลด์ต่าง ๆ ให้โดยอัตโนมัติ ไม่ต้องคัดลอกแยกฟิลด์ด้วยมือ
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <label className="text-slate-600 font-bold">วาง Master Prompt ที่ต้องการนำเข้า:</label>
                                        <textarea
                                            value={importText}
                                            onChange={(e) => setImportText(e.target.value)}
                                            placeholder="ตัวอย่าง:&#13;[ROLE]&#13;คุณคือผู้เชี่ยวชาญ...&#13;&#13;[PURPOSE]&#13;เพื่อเขียนบทความ...&#13;&#13;[USER INPUT]&#13;- หัวข้อบทความ: ความสำคัญของดิน"
                                            className="w-full h-80 bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all text-xs font-mono leading-relaxed shadow-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="applyUserInputCheck"
                                            checked={applyUserInput}
                                            onChange={(e) => setApplyUserInput(e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                        />
                                        <label htmlFor="applyUserInputCheck" className="text-slate-700 font-medium cursor-pointer">
                                            Apply detected USER INPUT to Test Input Area (นำเข้าค่าตัวแปรทดสอบด้วย)
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Section Detection Summary */}
                                    <div>
                                        <h4 className="font-bold text-slate-700 mb-2 uppercase tracking-wider text-[10px]">สรุปการตรวจพบแต่ละหัวข้อ (Section Detection Summary)</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                            {Object.entries(importPreview.summary).map(([tagKey, status]) => (
                                                <div 
                                                    key={tagKey} 
                                                    className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                                                        status === "found" 
                                                            ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                                                            : "bg-slate-50 border-slate-100 text-slate-400"
                                                    }`}
                                                >
                                                    <div className="text-[10px] truncate">[{tagKey}]</div>
                                                    <div className="text-[9px] mt-0.5">{status === "found" ? "✓ พบ" : "✗ ไม่พบ"}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Warnings if any */}
                                    {importPreview.warnings.length > 0 && (
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 space-y-1">
                                            <div className="font-bold flex items-center gap-1.5 text-xs">
                                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                                <span>คำเตือน (ข้อเสนอแนะแบบไม่บล็อกการใช้งาน):</span>
                                            </div>
                                            <ul className="list-disc list-inside text-[11px] leading-relaxed pl-1">
                                                {importPreview.warnings.map((warn, i) => (
                                                    <li key={i}>{warn}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Guardrails helper message */}
                                    {importPreview.summary["GUARDRAILS"] === "found" && (
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 leading-normal">
                                            ⚠️ **ตรวจพบข้อมูล [GUARDRAILS]:** ระบบจะทำการเขียนข้อมูลของ Guardrail ลงไปในส่วน **[บันทึกเพิ่มเติม (Notes)]** ภายใต้หัวข้อ <em>&quot;Imported Guardrails&quot;</em> ให้โดยอัตโนมัติ เนื่องจากสิทธิ์ของ Preset จริงในระบบจะต้องเลือกแยกอีกครั้งทางด้านล่าง
                                        </div>
                                    )}

                                    {/* Parsed Fields Preview */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">รายละเอียดพรีวิวเนื้อหาฟิลด์ปลายทาง</h4>
                                        <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[350px] overflow-y-auto bg-slate-50 shadow-inner">
                                            {Object.entries(importPreview.sections).map(([tag, val]) => {
                                                if (tag === "[USER INPUT]" && !applyUserInput) return null;
                                                return (
                                                    <div key={tag} className="p-3 space-y-1 bg-white">
                                                        <span className="font-bold text-slate-700 text-[10px] tracking-wide text-blue-600 uppercase">{tag}</span>
                                                        <pre className="text-[11px] font-mono text-slate-800 leading-relaxed whitespace-pre-wrap p-2 bg-slate-50 rounded-lg border border-slate-100 max-h-[120px] overflow-y-auto">
                                                            {val || "(ไม่มีเนื้อหา)"}
                                                        </pre>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Parsed USER INPUT items */}
                                    {applyUserInput && Object.keys(importPreview.detectedInputs).length > 0 && (
                                        <div className="p-4.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
                                            <h4 className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                                                <span>✓ ตรวจพบตัวแปรทดสอบจำลอง (Detected USER INPUT)</span>
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                                {Object.entries(importPreview.detectedInputs).map(([key, val]) => (
                                                    <div key={key} className="flex items-center gap-2 p-1.5 bg-white border border-emerald-100/50 rounded-lg">
                                                        <span className="font-bold text-emerald-700">{key}:</span>
                                                        <span className="text-slate-600 truncate" title={val}>{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end items-center gap-2 flex-shrink-0">
                            {!importPreview ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowImportModal(false);
                                            setImportText("");
                                        }}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleMasterPromptImportPreview}
                                        disabled={!importText.trim()}
                                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                                    >
                                        แสดงตัวอย่างแยกฟิลด์ (Preview Split)
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setImportPreview(null)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                                    >
                                        ย้อนกลับไปแก้ไข
                                    </button>
                                    <div className="flex flex-col items-end">
                                        <button
                                            onClick={handleApplyImport}
                                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm"
                                        >
                                            ยืนยันนำเข้าข้อมูลลง Editor (Apply)
                                        </button>
                                        <span className="text-[10px] text-slate-600 mt-1 block font-medium">
                                            * จะทำการอัปเดต React State ในหน้าจอหลักเท่านั้น (ยังไม่บันทึกเข้า Database)
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
