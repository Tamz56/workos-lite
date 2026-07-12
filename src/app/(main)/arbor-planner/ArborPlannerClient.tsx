"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageShell } from "@/components/layout/PageShell";
import { PlannerItemCard } from "@/components/arbor-planner/PlannerItemCard";
import {
    DELETE_CONFIRMATION, WORK_BLOCKS, calculateCapacity, getBangkokDate, groupPlannerItems, shiftPlannerDate,
} from "@/components/arbor-planner/plannerUi";
import type {
    EnrichedPlannerItem, PlannerDay, PlannerDayEnergyLevel, PlannerDayStatus, PlannerDayTemplate,
    PlannerEnergyLevel, PlannerItemStatus, PlannerPriority, PlannerScheduledBlock, PlannerSourceType, PlannerWorkMode,
} from "@/lib/planner/types";
import { calculateTimeRangeMinutes } from "@/lib/planner/time";

type DayData = PlannerDay | PlannerDayTemplate;
type Source = { id: string; title: string; status: string; type: PlannerSourceType; context: string; projectSlug?: string };
type SourceTask = { id: string; title: string; status: string; workspace: string };
type SourceProject = { id: string; slug: string; name: string; status: string };
type SourceProjectItem = { id: string; title: string; status: string };
type ItemForm = {
    work_mode: PlannerWorkMode; priority: PlannerPriority; estimated_minutes: string; start_time: string; end_time: string; energy_level: PlannerEnergyLevel | "";
    scheduled_block: PlannerScheduledBlock; planned_order: string; planner_status: PlannerItemStatus; is_main_task: boolean;
};

const initialItemForm: ItemForm = {
    work_mode: "focus", priority: "normal", estimated_minutes: "", start_time: "", end_time: "", energy_level: "", scheduled_block: "morning_focus",
    planned_order: "0", planner_status: "planned", is_main_task: false,
};
const fieldClass = "w-full rounded-lg border border-theme-input-border bg-theme-input-bg px-3 py-2 text-sm text-theme-primary outline-none focus:border-blue-500";
const primaryButton = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { cache: "no-store", ...init });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data as T;
}

export default function ArborPlannerClient() {
    const [date, setDate] = useState(() => getBangkokDate());
    const [day, setDay] = useState<DayData | null>(null);
    const [items, setItems] = useState<EnrichedPlannerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savingDay, setSavingDay] = useState(false);
    const [dayForm, setDayForm] = useState({ main_outcome: "", daily_capacity_minutes: "", energy_level: "" as PlannerDayEnergyLevel | "", status: "planning" as PlannerDayStatus });
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<EnrichedPlannerItem | null>(null);
    const [deleting, setDeleting] = useState<EnrichedPlannerItem | null>(null);
    const [itemBusy, setItemBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [dayData, itemData] = await Promise.all([
                requestJson<DayData>(`/api/planner/${date}`),
                requestJson<{ items: EnrichedPlannerItem[] }>(`/api/planner/${date}/items`),
            ]);
            setDay(dayData); setItems(itemData.items);
            setDayForm({
                main_outcome: dayData.main_outcome ?? "", daily_capacity_minutes: dayData.daily_capacity_minutes?.toString() ?? "",
                energy_level: dayData.energy_level ?? "", status: dayData.status,
            });
        } catch (reason) { setError(reason instanceof Error ? reason.message : "โหลด Planner ไม่สำเร็จ"); }
        finally { setLoading(false); }
    }, [date]);

    useEffect(() => { void load(); }, [load]);

    const persisted = day != null && !("_template" in day);
    const capacity = useMemo(() => calculateCapacity(items, day?.daily_capacity_minutes ?? null), [items, day]);
    const grouped = useMemo(() => groupPlannerItems(items), [items]);

    async function saveDay(create: boolean) {
        setSavingDay(true); setError(null);
        try {
            await requestJson(`/api/planner/${date}`, {
                method: create ? "POST" : "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    main_outcome: dayForm.main_outcome.trim() || null,
                    daily_capacity_minutes: dayForm.daily_capacity_minutes === "" ? null : Number(dayForm.daily_capacity_minutes),
                    energy_level: dayForm.energy_level || null, status: dayForm.status,
                }),
            });
            await load();
        } catch (reason) { setError(reason instanceof Error ? reason.message : "บันทึก Planner Day ไม่สำเร็จ"); }
        finally { setSavingDay(false); }
    }

    async function deleteItem() {
        if (!deleting) return;
        setItemBusy(true); setError(null);
        try {
            await requestJson(`/api/planner/${date}/items/${deleting.id}`, { method: "DELETE" });
            setDeleting(null); await load();
        } catch (reason) { setError(reason instanceof Error ? reason.message : "นำรายการออกไม่สำเร็จ"); }
        finally { setItemBusy(false); }
    }

    if (loading && !day) return <PageShell><div className="rounded-2xl border border-theme-border bg-theme-card-bg p-10 text-center text-theme-secondary">กำลังโหลด Planner...</div></PageShell>;

    return (
        <PageShell className="max-w-[1500px] mx-auto">
            <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-theme-border bg-theme-card-bg p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">Arbor Planner</div>
                    <h1 className="mt-1 text-2xl font-bold text-theme-primary">แผนงานประจำวัน</h1>
                    <p className="mt-1 text-sm text-theme-secondary">{new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" }).format(new Date(`${date}T12:00:00+07:00`))}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setDate(value => shiftPlannerDate(value, -1))} className="rounded-lg border border-theme-border px-3 py-2 text-sm text-theme-secondary hover:bg-theme-hover">← วันก่อน</button>
                    <input type="date" value={date} onChange={event => setDate(event.target.value)} className={fieldClass + " w-auto"} />
                    <button onClick={() => setDate(getBangkokDate())} className="rounded-lg border border-theme-border px-3 py-2 text-sm text-theme-secondary hover:bg-theme-hover">วันนี้</button>
                    <button onClick={() => setDate(value => shiftPlannerDate(value, 1))} className="rounded-lg border border-theme-border px-3 py-2 text-sm text-theme-secondary hover:bg-theme-hover">วันถัดไป →</button>
                    <span className="rounded-full bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-500">สถานะ: {day?.status ?? "planning"}</span>
                </div>
            </header>

            {error && <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}

            {!persisted ? (
                <section className="rounded-2xl border border-dashed border-theme-border bg-theme-card-bg p-6 sm:p-8">
                    <h2 className="text-xl font-bold text-theme-primary">ยังไม่มีแผนสำหรับวันนี้</h2>
                    <p className="mt-2 text-sm text-theme-secondary">กำหนดผลลัพธ์หลักและเวลาที่มี ก่อนเพิ่มงานจากโปรเจกต์ต่าง ๆ</p>
                    <DayForm value={dayForm} onChange={setDayForm} />
                    <button disabled={savingDay} onClick={() => void saveDay(true)} className={primaryButton + " mt-5"}>{savingDay ? "กำลังสร้างแผน..." : "สร้างแผนวันนี้"}</button>
                </section>
            ) : (
                <>
                    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
                        <div className="rounded-2xl border border-theme-border bg-theme-card-bg p-5">
                            <div className="flex items-center justify-between"><h2 className="font-bold text-theme-primary">Planner Day</h2><button disabled={savingDay} onClick={() => void saveDay(false)} className={primaryButton}>{savingDay ? "กำลังบันทึก..." : "บันทึกข้อมูลวัน"}</button></div>
                            <DayForm value={dayForm} onChange={setDayForm} compact />
                        </div>
                        <CapacitySummary data={capacity} />
                    </section>

                    <div className="my-6 flex items-center justify-between gap-3">
                        <div><h2 className="text-lg font-bold text-theme-primary">Work Blocks</h2><p className="text-sm text-theme-secondary">จัดงานตามจังหวะการทำงานของวันนี้</p></div>
                        <button onClick={() => setShowAdd(true)} className={primaryButton}>+ เพิ่มงานในแผน</button>
                    </div>

                    {items.length === 0 && <div className="mb-5 rounded-2xl border border-dashed border-theme-border bg-theme-card-bg p-8 text-center"><h3 className="font-bold text-theme-primary">ยังไม่มีงานในแผนวันนี้</h3><button onClick={() => setShowAdd(true)} className={primaryButton + " mt-4"}>เพิ่มงานแรก</button></div>}
                    <div className="space-y-4">
                        {WORK_BLOCKS.map(block => {
                            const blockItems = grouped[block.key];
                            const total = blockItems.reduce((sum, item) => sum + (item.estimated_minutes ?? 0), 0);
                            return <section key={block.key} className="rounded-2xl border border-theme-border bg-theme-card-bg p-4 sm:p-5">
                                <div className="mb-4 flex items-baseline justify-between gap-3"><div><h3 className="font-bold text-theme-primary">{block.label}</h3><p className="text-xs text-theme-muted">{block.description}</p></div><span className="text-xs font-semibold text-theme-secondary">{blockItems.length} งาน · {total} นาที</span></div>
                                {blockItems.length === 0 ? <div className="rounded-xl border border-dashed border-theme-border p-4 text-center text-xs text-theme-muted">ยังไม่มีงานในช่วงนี้</div> : <div className="grid gap-3 xl:grid-cols-2">{blockItems.map(item => <PlannerItemCard key={item.id} item={item} busy={itemBusy} onEdit={() => setEditing(item)} onDelete={() => setDeleting(item)} />)}</div>}
                            </section>;
                        })}
                    </div>
                </>
            )}

            <PlannerItemModal date={date} open={showAdd} onClose={() => setShowAdd(false)} onSaved={async () => { setShowAdd(false); await load(); }} />
            <PlannerItemModal date={date} open={editing != null} item={editing ?? undefined} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />
            <ConfirmDialog isOpen={deleting != null} title="นำงานออกจาก Planner" message={DELETE_CONFIRMATION} confirmText={itemBusy ? "กำลังนำออก..." : "นำออกจากแผน"} cancelText="ยกเลิก" danger onCancel={() => setDeleting(null)} onConfirm={deleteItem} />
        </PageShell>
    );
}

function DayForm({ value, onChange, compact = false }: { value: typeof initialDayForm; onChange: (value: typeof initialDayForm) => void; compact?: boolean }) {
    return <div className={`mt-5 grid gap-4 ${compact ? "md:grid-cols-2" : "max-w-3xl md:grid-cols-2"}`}>
        <label className="md:col-span-2 text-sm font-medium text-theme-secondary">Main Outcome<input value={value.main_outcome} onChange={event => onChange({ ...value, main_outcome: event.target.value })} placeholder="ผลลัพธ์หลักที่ต้องการให้เกิดขึ้นวันนี้" className={fieldClass + " mt-1"} /></label>
        <label className="text-sm font-medium text-theme-secondary">Daily Capacity Minutes<input type="number" min="0" value={value.daily_capacity_minutes} onChange={event => onChange({ ...value, daily_capacity_minutes: event.target.value })} className={fieldClass + " mt-1"} /></label>
        <label className="text-sm font-medium text-theme-secondary">Energy Level<select value={value.energy_level} onChange={event => onChange({ ...value, energy_level: event.target.value as PlannerDayEnergyLevel | "" })} className={fieldClass + " mt-1"}><option value="">ไม่ระบุ</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="recovery">Recovery</option></select></label>
        <label className="text-sm font-medium text-theme-secondary">Planner Day Status<select value={value.status} onChange={event => onChange({ ...value, status: event.target.value as PlannerDayStatus })} className={fieldClass + " mt-1"}><option value="planning">Planning</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
    </div>;
}
const initialDayForm = { main_outcome: "", daily_capacity_minutes: "", energy_level: "" as PlannerDayEnergyLevel | "", status: "planning" as PlannerDayStatus };

function CapacitySummary({ data }: { data: ReturnType<typeof calculateCapacity> }) {
    const styles = { within: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500", near: "border-amber-500/30 bg-amber-500/10 text-amber-500", over: "border-red-500/30 bg-red-500/10 text-red-500" };
    const label = { within: "Within capacity", near: "Near capacity", over: "Over capacity" }[data.state];
    return <section className={`rounded-2xl border p-5 ${styles[data.state]}`}><div className="flex items-center justify-between"><h2 className="font-bold">Capacity Summary</h2><span className="rounded-full bg-current/10 text-xs font-bold">{label}</span></div><div className="mt-5 grid grid-cols-2 gap-4 text-sm"><Metric label="Planned" value={`${data.planned} นาที`} /><Metric label="Capacity" value={data.capacity == null ? "ไม่ระบุ" : `${data.capacity} นาที`} /><Metric label="Remaining" value={data.remaining == null ? "ไม่ระบุ" : `${data.remaining} นาที`} /><Metric label="Unestimated" value={`${data.unestimated} งาน`} /></div></section>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div><div className="text-xs opacity-75">{label}</div><div className="mt-1 text-lg font-bold">{value}</div></div>; }

function PlannerItemModal({ date, open, item, onClose, onSaved }: { date: string; open: boolean; item?: EnrichedPlannerItem; onClose: () => void; onSaved: () => Promise<void> }) {
    const [form, setForm] = useState<ItemForm>(initialItemForm);
    const [sources, setSources] = useState<Source[]>([]);
    const [selected, setSelected] = useState<Source | null>(null);
    const [filters, setFilters] = useState({ type: "all", status: "all", context: "all", search: "" });
    const [loadingSources, setLoadingSources] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        if (item) setForm({ work_mode: item.work_mode, priority: item.priority, estimated_minutes: item.estimated_minutes?.toString() ?? "", start_time: item.start_time ?? "", end_time: item.end_time ?? "", energy_level: item.energy_level ?? "", scheduled_block: item.scheduled_block ?? "flexible", planned_order: item.planned_order.toString(), planner_status: item.planner_status, is_main_task: item.is_main_task === 1 });
        else { setForm(initialItemForm); setSelected(null); void loadSources(); }
    }, [open, item]);

    async function loadSources() {
        setLoadingSources(true);
        try {
            const [tasks, projects] = await Promise.all([requestJson<SourceTask[]>("/api/tasks?limit=500"), requestJson<SourceProject[]>("/api/projects")]);
            const projectItems = (await Promise.all(projects.map(async project => {
                const rows = await requestJson<SourceProjectItem[]>(`/api/projects/${encodeURIComponent(project.slug)}/items`);
                return rows.map(row => ({ id: row.id, title: row.title, status: row.status, type: "project_item" as const, context: project.name, projectSlug: project.slug }));
            }))).flat();
            setSources([...tasks.map(task => ({ id: task.id, title: task.title, status: task.status, type: "task" as const, context: task.workspace })), ...projectItems]);
        } catch (reason) { setError(reason instanceof Error ? reason.message : "โหลดงานต้นทางไม่สำเร็จ"); }
        finally { setLoadingSources(false); }
    }

    const contexts = Array.from(new Set(sources.map(source => source.context).filter(Boolean))).sort();
    const shown = sources.filter(source => (filters.type === "all" || source.type === filters.type) && (filters.status === "all" || source.status === filters.status) && (filters.context === "all" || source.context === filters.context) && (!filters.search || `${source.title} ${source.id}`.toLowerCase().includes(filters.search.toLowerCase())));

    async function save() {
        if (!item && !selected) { setError("กรุณาเลือกงานต้นทาง"); return; }
        setSaving(true); setError(null);
        try {
            const exactMinutes = form.start_time && form.end_time ? calculateTimeRangeMinutes(form.start_time, form.end_time) : null;
            const payload = { ...form, start_time: form.start_time || null, end_time: form.end_time || null, estimated_minutes: exactMinutes ?? (form.estimated_minutes === "" ? null : Number(form.estimated_minutes)), energy_level: form.energy_level || null, planned_order: Number(form.planned_order) };
            await requestJson(item ? `/api/planner/${date}/items/${item.id}` : `/api/planner/${date}/items`, { method: item ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item ? payload : { ...payload, source_type: selected!.type, source_id: selected!.id }) });
            await onSaved();
        } catch (reason) { setError(reason instanceof Error ? reason.message : "บันทึกรายการไม่สำเร็จ"); }
        finally { setSaving(false); }
    }

    return <Modal isOpen={open} title={item ? "แก้ไขงานใน Planner" : "เพิ่มงานใน Planner"} onClose={onClose} maxWidth="max-w-4xl">
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}
        {!item && <div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><select className={fieldClass} value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}><option value="all">ทุก Source Type</option><option value="task">Task</option><option value="project_item">Project Item</option></select><select className={fieldClass} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="all">ทุกสถานะ</option>{Array.from(new Set(sources.map(s => s.status))).map(status => <option key={status}>{status}</option>)}</select><select className={fieldClass} value={filters.context} onChange={e => setFilters({ ...filters, context: e.target.value })}><option value="all">ทุก Workspace / Project</option>{contexts.map(context => <option key={context}>{context}</option>)}</select><input className={fieldClass} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} placeholder="ค้นหาชื่องาน" /></div><div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-theme-border p-2">{loadingSources ? <div className="p-5 text-center text-sm text-theme-muted">กำลังโหลดงานต้นทาง...</div> : shown.length === 0 ? <div className="p-5 text-center text-sm text-theme-muted">ไม่พบงานที่ตรงกับตัวกรอง</div> : shown.map(source => <button key={`${source.type}-${source.id}`} onClick={() => setSelected(source)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === source.id && selected.type === source.type ? "border-blue-500 bg-blue-500/10" : "border-theme-border hover:bg-theme-hover"}`}><div className="text-sm font-semibold text-theme-primary">{source.title}</div><div className="mt-1 text-xs text-theme-muted">{source.type} · {source.status} · {source.context}</div></button>)}</div></div>}
        {item && <div className="mb-4 rounded-lg bg-theme-hover p-3 text-sm text-theme-secondary">งานต้นทาง: <strong>{item.source_missing ? "ไม่พบงานต้นทาง" : item.source_title}</strong><br /><span className="text-xs">Source type และ Source ID ไม่สามารถเปลี่ยนได้</span></div>}
        <ItemFields form={form} onChange={setForm} />
        <div className="mt-6 flex justify-end gap-2 border-t border-theme-border pt-4"><button disabled={saving} onClick={onClose} className="rounded-lg border border-theme-border px-4 py-2 text-sm text-theme-secondary">ยกเลิก</button><button disabled={saving || (!item && !selected)} onClick={() => void save()} className={primaryButton}>{saving ? (item ? "กำลังอัปเดต..." : "กำลังเพิ่ม...") : (item ? "บันทึกการแก้ไข" : "เพิ่มในแผน")}</button></div>
    </Modal>;
}

function ItemFields({ form, onChange }: { form: ItemForm; onChange: (form: ItemForm) => void }) {
    const exactMinutes = form.start_time && form.end_time ? calculateTimeRangeMinutes(form.start_time, form.end_time) : null;
    const hasAnyExactTime = Boolean(form.start_time || form.end_time);
    return <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Work Mode" value={form.work_mode} values={["focus", "production", "ai_preparation", "ai_execution", "review", "maintenance"]} onChange={value => onChange({ ...form, work_mode: value as PlannerWorkMode })} />
        <SelectField label="Priority" value={form.priority} values={["critical", "high", "normal", "low"]} onChange={value => onChange({ ...form, priority: value as PlannerPriority })} />
        <label className="text-sm font-medium text-theme-secondary">Start Time<input type="time" value={form.start_time} onChange={e => onChange({ ...form, start_time: e.target.value })} className={fieldClass + " mt-1"} /></label>
        <label className="text-sm font-medium text-theme-secondary">End Time<input type="time" value={form.end_time} onChange={e => onChange({ ...form, end_time: e.target.value })} className={fieldClass + " mt-1"} /></label>
        <label className="text-sm font-medium text-theme-secondary">Estimated Minutes<input type="number" min="0" disabled={hasAnyExactTime} value={exactMinutes ?? form.estimated_minutes} onChange={e => onChange({ ...form, estimated_minutes: e.target.value })} className={fieldClass + " mt-1 disabled:cursor-not-allowed disabled:opacity-60"} /><span className="mt-1 block text-xs text-theme-muted">{exactMinutes != null ? `คำนวณจากช่วงเวลา: ${exactMinutes} นาที` : hasAnyExactTime ? "กรุณาระบุ Start Time และ End Time ให้ครบ" : "กรอกระยะเวลาเองเมื่อไม่ใช้ช่วงเวลาที่แน่นอน"}</span></label>
        <SelectField label="Energy Level" value={form.energy_level} values={["", "high", "medium", "low"]} onChange={value => onChange({ ...form, energy_level: value as PlannerEnergyLevel | "" })} />
        <SelectField label="Scheduled Block" value={form.scheduled_block} values={WORK_BLOCKS.map(block => block.key)} onChange={value => onChange({ ...form, scheduled_block: value as PlannerScheduledBlock })} />
        <label className="text-sm font-medium text-theme-secondary">Planned Order<input type="number" min="0" value={form.planned_order} onChange={e => onChange({ ...form, planned_order: e.target.value })} className={fieldClass + " mt-1"} /></label>
        <SelectField label="Planner Status" value={form.planner_status} values={["planned", "ready", "doing", "waiting", "review", "completed", "carried_forward", "blocked"]} onChange={value => onChange({ ...form, planner_status: value as PlannerItemStatus })} />
        <label className="flex items-center gap-2 self-end rounded-lg border border-theme-border p-2.5 text-sm text-theme-secondary"><input type="checkbox" checked={form.is_main_task} onChange={e => onChange({ ...form, is_main_task: e.target.checked })} /> ตั้งเป็นงานหลัก</label>
    </div>;
}
function SelectField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) { return <label className="text-sm font-medium text-theme-secondary">{label}<select value={value} onChange={event => onChange(event.target.value)} className={fieldClass + " mt-1"}>{values.map(option => <option key={option || "none"} value={option}>{option || "ไม่ระบุ"}</option>)}</select></label>; }
