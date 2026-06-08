# DEV-030 — Monthly Reflection Engine Integration Design & Specification

## Overview
การผสานรวมกลไกประมวลผลดาราศาสตร์หลัก (Astrology Engine) เข้าสู่ระบบสรุปรายเดือน (Monthly Reflection / Strategy Overview) ของหน้าจอ **Real App Preview** เพื่อแสดงผลภาพรวมกลยุทธ์เชิงสัญลักษณ์และการสะท้อนจังหวะชีวิตงานโดยวิเคราะห์ร่วมกับประวัติการบันทึกจริงของผู้ใช้ (Reflection History)

## Core Architectures & Changes

### 1. Model Definitions
เพิ่มประเภทข้อมูล `AstroMonthlyReflectionViewModel` ที่ท้ายไฟล์ `src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts` เพื่อรองรับโครงสร้างข้อมูลที่ใช้แสดงผลในหน้ารายเดือน

### 2. ViewModel & Calculation Logics
สร้างตัวจัดการมุมมองและคำนวณ `astroRealAppMonthlyReflectionViewModel.ts`
- **การคำนวณเดือนปัจจุบัน**: แทนที่จะประมวลผลล่วงหน้า 30 วันแบบทำนายอนาคต (Forecast) ระบบจะคำนวณจังหวะงานของเดือนปัจจุบัน (ตั้งแต่วันแรกถึงวันสุดท้ายของเดือน) โดยใช้ Birth Profile จาก `astro-real-app:birth-profile:v1`
- **การใช้ Reflection History เป็นข้อมูลเสริม (Optional Context)**:
  - หากผู้ใช้บันทึกประวัติสะท้อนคิดสะสมไว้ในระบบ ระบบจะคำนวณจังหวะและแนวโน้มสภาพการทำงานหลักที่พบบ่อย
  - หากไม่มีประวัติสะท้อนคิด ระบบจะแสดงแผนกลยุทธ์จำลองพร้อมคำแนะนำให้เริ่มจดบันทึก โดยไม่ขัดข้องหรือแอปพลิเคชันค้าง
- **ความปลอดภัยและการหลีกเลี่ยงถ้อยคำงมงาย**: หลีกเลี่ยงคำทำนายเชิงเคราะห์ร้าย, ชะตากรรม, หรือคำว่า "พลังงานเฉลี่ย" (ในเชิงตัวเลขตัดสิน) และปรับใช้คำที่เป็นกลาง (Neutral Work-Focused) เช่น "แนวโน้มสภาพการทำงาน" "โหมดที่พบบ่อย" "จังหวะหลักของเดือน"

### 3. UI Component (`AstroMonthlyPanel.tsx`)
คอมโพเนนต์ย่อยสำหรับแสดงตารางสรุปสถิติ, ธีมและจุดโฟกัสประจำเดือน (Focus Areas), ความเสี่ยงที่ควรเฝ้าระวัง (Risk Watch), จังหวะฟื้นฟู (Recovery Anchors) และสถิติแนวโน้มสภาพการทำงานที่เชื่อมโยงกับประวัติสะท้อนคิด

### 4. Main Preview (`AstroRealAppPreview.tsx`)
- เพิ่มแท็บใหม่ **"📅 สรุปรอบเดือน" (Monthly Strategy)**
- เรียกคำนวณ `buildMonthlyReflectionViewModel` ทั้งในการ Mount หน้าจอครั้งแรก และการสลับแท็บแบบสด ๆ พร้อมอัปเดตสถิติตามการลบหรือบันทึกประวัติสะท้อนคิดทันทีผ่าน Dependency tracking
- เพิ่มระบบความปลอดภัย Fallback เมื่อโปรไฟล์หรือข้อมูลล้มเหลว

## Safety & Guardrails Compliance
- **ไม่มีการแก้ไข**: `/workspaces/astro-strategy` (Active prototype route)
- **ไม่มีการแก้ไข**: `AstroStrategyPrototypeClient.tsx`
- **ไม่มีการเปลี่ยน**: Migration logic และ Reflection History schema
- **ไม่มีการเขียนทับ**: ข้อมูลสะท้อนคิดเก่า (Backward compatibility)
- **ไม่ทำนายชะตากรรม**: คุมโทนการนำเสนอให้อยู่ในกรอบแนวทางพัฒนาตนเองและการวางแผนกลยุทธ์การทำงานอย่างปลอดภัย
