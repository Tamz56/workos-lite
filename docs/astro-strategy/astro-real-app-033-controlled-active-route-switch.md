# DEV-033 — Controlled Active Route Switch Report

## Goal
เพื่อทำการสลับเส้นทางนำทางหลัก (Active Route Switch) ของระบบ Astro Strategy บนหน้าจอหลัก `/workspaces/astro-strategy` ให้ทำหน้าที่นำเสนอระบบวิเคราะห์แอปจริง (Real App Preview) แทนโปรโตไทป์เดิมอย่างปลอดภัยและเสถียร

## Scope
- แก้ไขไฟล์หน้าจอหลัก `src/app/(main)/workspaces/astro-strategy/page.tsx`
- รักษาความพร้อมของเส้นทางทดสอบเดิม `/workspaces/astro-strategy/real-app-preview` ให้เรียกใช้งานได้คงเดิม
- รักษาสภาพและคงความมีอยู่ของไฟล์คอมโพเนนต์โปรโตไทป์เดิม (`AstroStrategyPrototypeClient.tsx`)
- สร้างเอกสารชี้แจงการสลับเส้นทางและวิธี Rollback เผื่อกรณีฉุกเฉก

## Non-scope
- ไม่ปิดกั้นหรือลบเส้นทางย่อยเดิม
- ไม่เปลี่ยนแปลงโครงสร้าง Persistence คีย์ หรือตรรกะคำนวณส่วนกลาง

---

## Exact File Changed
* **[page.tsx](file:///Users/tamz/projects/workos-lite/src/app/%28main%29/workspaces/astro-strategy/page.tsx)**

## Before Route Behavior
- เมื่อผู้ใช้เข้าชมเส้นทางหลัก `/workspaces/astro-strategy` ระบบจะเรนเดอร์และแสดงคอมโพเนนต์โปรโตไทป์จำลองแรกเริ่ม `<AstroStrategyPrototypeClient />`

## After Route Behavior
- เมื่อผู้ใช้เข้าชมเส้นทางหลัก `/workspaces/astro-strategy` ระบบจะเรนเดอร์คอมโพเนนต์หลักของแอปจริง `<AstroRealAppPreview />` แสดงแผนภูมิ Today, Weekly, Monthly, Profile, และ Tools
- ทั้งนี้ เส้นทางพรีวิวเฉพาะทาง `/workspaces/astro-strategy/real-app-preview` ยังคงทำหน้าที่เรนเดอร์คอมโพเนนต์เดียวกันสำหรับการทดสอบทางเทคนิค

---

## Rollback Instruction
หากต้องการย้อนกลับ (Rollback) เพื่อเปิดใช้งานหน้าโปรโตไทป์เดิม ให้แก้ไขไฟล์ [src/app/(main)/workspaces/astro-strategy/page.tsx](file:///Users/tamz/projects/workos-lite/src/app/%28main%29/workspaces/astro-strategy/page.tsx) คืนกลับเป็นโค้ดเดิมดังนี้:

```tsx
import React from "react";
import AstroStrategyPrototypeClient from "@/components/workspaces/astro-strategy/AstroStrategyPrototypeClient";

export const metadata = {
    title: "Astro-Strategy Lab | ArborDesk",
    description: "Personal Astro Timing & Strategy App - v0.1 Prototype",
};

export default function AstroStrategyPage() {
    return <AstroStrategyPrototypeClient />;
}
```

---

## Verification Steps
1. **การโหลดและบิวด์ Next.js**: ตรวจสอบว่าคอมไพเลอร์ Webpack ของ Next.js บิวด์หน้าเพจและ Route ดังกล่าวเป็นแบบ Static/Dynamic ได้สำเร็จโดยไม่มี Typescript หรือ ESLint Error
2. **การคงอยู่ของตัวโปรโตไทป์ย่อย**: ตรวจเช็คว่าไฟล์ `AstroStrategyPrototypeClient.tsx` ยังไม่ได้ถูกลบหรือเคลื่อนย้าย
3. **การอ่านและเขียนข้อมูลต่อเนื่อง**: ตรวจสอบว่าข้อมูลใน LocalStorage ในกลุ่ม `astro-real-app:*` ยังอ่านเขียนได้ปกติ และข้อมูลโปรโตไทป์เดิมไม่ได้ถูกทำลาย

## Known Risks
- **การปะปนของข้อมูลช่วงเปลี่ยนผ่าน**: ผู้ใช้บางรายอาจมีประวัติเก่าค้างอยู่ในคีย์โปรโตไทป์ ซึ่งแก้ไขได้โดยการใช้เครื่องมือจำลองย้ายข้อมูล (Migration Tools) ที่จัดเตรียมไว้ในแผงควบคุมข้อมูลย่อยได้อย่างราบรื่น

## Recommendation for DEV-034
ดำเนินงานภารกิจถัดไปเพื่อปรับปรุงความเรียบร้อยรอบสุดท้าย เช่น การซ่อนป้ายเตือน "PREVIEW MODE" และ Data Tools ในสภาพแวดล้อมรันไทม์จริง หรือย้ายตัวล้างค่าพรีวิวไปจัดเก็บแยกเป็นสัดส่วน หรือดำเนินการทำความสะอาดโค้ดหลังการส่งมอบเป็นอันเสร็จสิ้น
