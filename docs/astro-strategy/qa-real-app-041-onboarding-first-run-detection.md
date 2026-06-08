# QA Record — ASTRO-REAL-APP-DEV-041: Onboarding / First-Run Detection

บันทึกรายงานการตรวจสอบคุณภาพการใช้งานระบบตรวจจับสถานะ Onboarding และการจัดเก็บคีย์ข้อมูลครั้งแรก

## สถานะปัจจุบัน
- **ผลลัพธ์การตรวจสอบ**: ผ่านทุกหัวข้อ
- **วันเวลาที่ทดสอบ**: 2026-06-08 (ตามระบบเวลาบราวเซอร์)
- **เครื่องมือที่ตรวจสอบ**: ESLint, Next.js Build, Manual Storage Inspect

---

## รายการตรวจสอบและผลลัพธ์ (QA Checklist)

### 1. การโหลดและการเข้าถึงเส้นทาง (Route Access)
- [x] หน้าเพจหลักเส้นทางใช้งานจริง `/workspaces/astro-strategy` โหลดได้ปกติ
- [x] หน้าเพจจำลองจำกัดระบบ `/workspaces/astro-strategy/real-app-preview` โหลดได้ปกติ
- [x] ไม่มีหน้าจอขาวหรือ Hydration Mismatch ค้างค้างบน SSR

### 2. การทำงานของระบบตรวจจับและแผงคำแนะนำ (Onboarding Detection & UI)
- [x] แผงแนะนำ Onboarding Panel แสดงผลเมื่อไม่มีคีย์ Birth Profile หรือ Reflection History ในเครื่องคอมพิวเตอร์
- [x] แผงนำเสนอหัวข้อกระชับ อบอุ่น แนะนำส่วนงานสำคัญครบถ้วน และไม่บล็อกการใช้งานแท็บอื่น
- [x] ลิงก์นำทางในแผงคำแนะนำ สามารถกดเพื่อสลับแท็บหลัก (Profile, Today, Reflection, Tools) ได้ถูกต้อง
- [x] ปุ่ม **"รับทราบ / ซ่อนไว้ก่อน"** สามารถซ่อนแผงได้เสร็จสมบูรณ์ทันที
- [x] เมื่อกด Dismiss แล้ว รีโหลดหน้าใหม่ แผงจะไม่แสดงซ้ำอีก

### 3. การเก็บข้อมูลและความปลอดภัย (Storage & Data Safety)
- [x] การกดซ่อน (Dismiss) เขียนข้อมูลลงในคีย์ `astro-real-app:onboarding:v1` เท่านั้น
- [x] ไม่มีคีย์อื่นที่ถูกเขียนโดยอัตโนมัติ (ไม่มีการสร้างโปรไฟล์ตั้งต้นก่อนได้รับคำสั่ง)
- [x] การทำงานของระบบวิเคราะห์วันเกิดยังสามารถเข้ากันได้และดึงประวัติได้สมบูรณ์
- [x] เมื่อกด **"Reset All Data"** ในแถบเครื่องมือพรีวิว คีย์ `astro-real-app:onboarding:v1` จะถูกลบออก และแผง Onboarding จะปรากฏขึ้นมาใหม่เมื่อรีโหลดหน้า

### 4. ความปลอดภัยทางคำและความหมาย (Copy Safety & Tone)
- [x] ปราศจากถ้อยคำทำนายเคราะห์ร้าย หรือคำกล่าวอ้างเกินจริง
- [x] ปราศจากข้อมูลคำแนะทางการแพทย์หรือวินิจฉัยสุขภาพร่างกาย
- [x] แสดงคำอธิบายความสอดคล้องตามหลักดาราศาสตร์เชิงสัญลักษณ์และเน้นความเป็นส่วนตัวของข้อมูลผู้ใช้อย่างถูกต้อง

---

## บันทึกการตรวจสอบแบบอัตโนมัติ (Automated Checks)

- ESLint Command:
  `node node_modules/eslint/bin/eslint.js 'src/app/(main)/workspaces/astro-strategy/page.tsx' 'src/app/(main)/workspaces/astro-strategy/real-app-preview/page.tsx' src/components/workspaces/astro-strategy/real-app/`
  *ผลลัพธ์*: ผ่านโดยไม่มี Error
- Next.js Build:
  `NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next build --webpack`
  *ผลลัพธ์*: บิวด์สำเร็จสมบูรณ์โดยไม่มี Warning ค้างคา
