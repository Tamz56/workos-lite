"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  MagnifyingGlassIcon, 
  BookOpenIcon, 
  ArrowPathIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon
} from "@heroicons/react/24/outline";

// Curated document mapping
const CURATED_LOOPS = [
  {
    id: "b2ff28fe-fb90-4bf6-ab48-a00cc9cc31de",
    title: "Arbor Loop Model v1.1 — Human-in-the-loop Work System Specification",
    category: "Foundation",
    role: "Core operating model",
    status: "Saved / Implementation-ready Spec",
    description: "กระบวนการทำงานร่วมกันแบบปิด (Closed Loop) 8 ขั้นตอนหลักระหว่างมนุษย์และ AI"
  },
  {
    id: "930e04a8-b51c-4c81-a3e2-81777b817d22",
    title: "Arbor Decision Gate v1 — Permission and Approval Layer for Arbor Loop",
    category: "Foundation",
    role: "Permission and approval layer",
    status: "Saved / Ready for Review",
    description: "ระดับสิทธิ์ควบคุมงาน (L0-L3) และประตูกลั่นกรองรักษาความปลอดภัย 12 ด่าน"
  },
  {
    id: "7e6eb736-1aff-4b73-a369-61c46fad4eb8",
    title: "Project Context v1 — Context Layer for Arbor Loop",
    category: "Foundation",
    role: "Project memory and context layer",
    status: "Saved / Ready for Review",
    description: "โครงสร้างมาตรฐานข้อมูลชั้นบริบทของแต่ละโครงการ โทนเสียง และคำสั่งยืนพื้น"
  },
  {
    id: "9207867b-f8c6-4a4a-89de-cabc401cd873",
    title: "Loop Template v1 — Reusable Loop Specification for ArborDesk",
    category: "Foundation",
    role: "Reusable loop structure",
    status: "Saved / Ready for Review",
    description: "โครงสร้างข้อมูลสกีมาของแม่แบบลูปความปลอดภัยและประวัติการรันลูปสำเร็จรูป"
  },
  {
    id: "0716dba8-80fd-48aa-b5f3-eee8d1f80454",
    title: "Arbor Foundation Source Index v1 — Source Map for WorkOS-Lite / ArborDesk",
    category: "Source Index",
    role: "Source map / coordination index",
    status: "Saved / Ready for Review",
    description: "ดัชนีแผนผังจุดเชื่อมโยงประวัติการตัดสินใจและข้อมูลรากฐานระบบ Arbor"
  },
  {
    id: "74ae11e8-3161-4a8c-b88a-eb0003c0a917",
    title: "Claim & Tone Review Loop v1 — Green Fineness Claim Safety and Tone Review Workflow",
    category: "Green Fineness Loops",
    role: "Claim safety / tone / format review loop",
    status: "Saved / Ready for Review",
    description: "ลูปรีวิวคัดกรองคำกล่าวอ้างเกษตรเกินจริง แบรนด์เสียง และ Safe Rewrite ภาษาไทย"
  },
  {
    id: "909918ee-5486-48e9-a799-d8f81c8f618c",
    title: "Green Fineness Website Publish Review Loop v1 — Pre-Publish Review Workflow for Website Articles",
    category: "Green Fineness Loops",
    role: "Website article pre-publish review loop",
    status: "Saved / Ready for Review",
    description: "ขั้นตอนการตรวจสอบความพร้อมของบทความวิชาการ/บทความเล่าเรื่องก่อนเผยแพร่จริง"
  },
  {
    id: "723e1b94-900b-499b-b007-165c1eb96179",
    title: "Green Fineness Social Pack Review Loop v1 — Pre-Publish Review Workflow for Social Content",
    category: "Green Fineness Loops",
    role: "Social content pre-publish review loop",
    status: "Saved / Ready for Review",
    description: "ขั้นตอนการตรวจสอบชุดโพสต์สื่อสังคมออนไลน์แยกตามประเภทช่องทางปลายทาง"
  },
  {
    id: "1e0f45b2-c888-414a-bb9f-106f38f2d42b",
    title: "WorkOS Daily Attention Loop v1 — Daily Focus and Decision System for WorkOS-Lite",
    category: "Attention System",
    role: "Daily Focus and Decision System",
    status: "Saved / Ready for Review",
    description: "ระบบช่วยเลือกว่าวันนี้ควรใช้ attention กับอะไร 1–3 เรื่อง อะไรให้ AI เตรียมได้ อะไรต้องตัดสินใจเอง และอะไรควรพักไว้ก่อน"
  },
  {
    id: "76f2d26e-d54e-40d5-9fd2-2ae2132150d2",
    title: "Daily Attention Brief Template v1 — 5-Minute Daily Focus Template",
    category: "Attention System",
    role: "Daily Use Template",
    status: "Saved / Ready to Use",
    description: "แม่แบบสั้นสำหรับใช้ตอนเช้าและปิดงานตอนเย็น เพื่อเลือก focus item รายวันโดยไม่สร้าง to-do list ยาวเกินจำเป็น"
  }
];

const CATEGORIES = ["All", "Foundation", "Source Index", "Green Fineness Loops", "Attention System"];

type LoadedDoc = {
  id: string;
  title: string;
  updated_at?: string;
  content_md?: string;
};

export default function LoopsCatalogue() {
  const [docs, setDocs] = useState<LoadedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/docs?project_id=WniiRWTaGeEY7gt3XAsm7", {
        cache: "no-store"
      });
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocs(data.docs || []);
    } catch (err: any) {
      console.error("Failed to load loops metadata", err);
      setError(err?.message || "Failed to load loops metadata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Process and merge loaded documents with curated specifications
  const items = useMemo(() => {
    return CURATED_LOOPS.map(curated => {
      const dbDoc = docs.find(d => d.id === curated.id);
      return {
        ...curated,
        isMissing: !dbDoc,
        dbDoc: dbDoc || null,
        updatedAt: dbDoc?.updated_at || null
      };
    });
  }, [docs]);

  // Filter based on category and search query
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const categoryMatch = selectedCategory === "All" || item.category === selectedCategory;
      
      const query = search.trim().toLowerCase();
      if (!query) return categoryMatch;

      const titleMatch = item.title.toLowerCase().includes(query);
      const roleMatch = item.role.toLowerCase().includes(query);
      const categoryTextMatch = item.category.toLowerCase().includes(query);
      const statusMatch = item.status.toLowerCase().includes(query);
      const idMatch = item.id.toLowerCase().includes(query);

      return categoryMatch && (titleMatch || roleMatch || categoryTextMatch || statusMatch || idMatch);
    });
  }, [items, selectedCategory, search]);

  return (
    <div className="space-y-6">
      
      {/* Read-only Notice Banner */}
      <div className="flex items-start gap-3 p-4 border border-blue-200/50 bg-blue-500/5 dark:border-blue-900/40 dark:bg-blue-900/10 rounded-2xl">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Arbor Loops read-only catalogue v0.1</p>
          <p className="text-[11px] text-theme-secondary font-medium">
            หน้านี้ใช้สำหรับการเปิดอ่าน ค้นหา และนำทางเข้าอ่านเอกสารข้อกำหนดลูปการทำงานหลักของระบบ 
            ไม่มีฟังก์ชันการรันคำสั่งอัตโนมัติหรือการแก้ไขสเปกบนแท็บนี้โดยตรง
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-theme-card border border-theme-border rounded-[24px] p-4 shadow-sm">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-theme-border/20 sm:border-none pb-2 sm:pb-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-tight transition-all active:scale-95 ${
                selectedCategory === cat
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                  : "text-theme-muted hover:text-theme-primary hover:bg-theme-input/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อ บทบาท สถานะ หรือ ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-theme-input border border-theme-border rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none focus:bg-theme-card focus:border-theme-border/80 text-theme-primary placeholder:text-theme-muted transition-all"
          />
        </div>
      </div>

      {/* Main Grid View */}
      {loading && docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <ArrowPathIcon className="w-8 h-8 text-theme-muted animate-spin" />
          <p className="text-theme-muted text-xs font-bold">กำลังค้นหารายชื่อเอกสารลูป...</p>
        </div>
      ) : error ? (
        <div className="p-8 border border-red-200/50 bg-red-500/5 rounded-3xl text-center space-y-4">
          <p className="text-red-600 font-bold text-sm">เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}</p>
          <button 
            onClick={fetchDocs}
            className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-2xl text-xs font-black transition-all active:scale-95"
          >
            ลองอีกครั้ง
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 bg-theme-card border border-theme-border rounded-[32px] text-center text-theme-muted font-bold text-xs italic">
          ไม่พบข้อกำหนดลูปตามเงื่อนไขที่เลือก
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map(item => {
            const formattedDate = item.updatedAt
              ? new Date(item.updatedAt).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })
              : null;

            return (
              <div 
                key={item.id}
                className={`bg-theme-card border rounded-[28px] p-6 shadow-sm flex flex-col justify-between transition-all group ${
                  item.isMissing
                    ? "border-amber-200 bg-amber-500/5 dark:border-amber-900/40"
                    : "border-theme-border hover:border-theme-border/80"
                }`}
              >
                <div className="space-y-4">
                  
                  {/* Category and Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100/50 dark:border-transparent">
                      {item.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight border ${
                      item.isMissing
                        ? "bg-amber-100 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
                        : "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400"
                    }`}>
                      {item.isMissing ? "Missing / Not Found" : item.status}
                    </span>
                  </div>

                  {/* Title and Role */}
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-theme-primary leading-snug group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[10px] font-black text-theme-muted uppercase tracking-wider">
                      Role: {item.role}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-theme-secondary leading-relaxed font-medium">
                    {item.description}
                  </p>

                  {/* Document ID with copy button */}
                  <div className="flex items-center gap-2 bg-theme-input/50 dark:bg-zinc-900/30 p-2 rounded-xl border border-theme-border/30 w-fit">
                    <code className="text-[9px] font-bold text-theme-muted select-all">
                      ID: {item.id}
                    </code>
                    <button
                      onClick={() => handleCopyId(item.id)}
                      className="p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-border/20 rounded transition-all active:scale-90"
                      title="Copy Document ID"
                    >
                      {copiedId === item.id ? (
                        <span className="text-[8px] font-black text-green-600">Copied!</span>
                      ) : (
                        <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-4 border-t border-theme-border/30 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-theme-muted">
                    {formattedDate ? `ปรับปรุงล่าสุด: ${formattedDate}` : ""}
                  </span>
                  {item.isMissing ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 italic">
                      <ShieldCheckIcon className="w-4 h-4 text-amber-500" />
                      เอกสารยังไม่ได้บันทึกในระบบ
                    </div>
                  ) : (
                    <a
                      href={`/docs/${item.id}`}
                      className="bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    >
                      <BookOpenIcon className="w-3.5 h-3.5 shrink-0" />
                      Open Document
                    </a>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
