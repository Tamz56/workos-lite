# Implementation Report — ASTRO-REAL-APP-123 — Strategic Timing Static UI and Navigation Shell Implementation

* **รหัสงานหลัก**: ASTRO-REAL-APP-123
* **สถานะการดำเนินงาน**: Completed (ดำเนินการโครงสร้าง Static UI Shell และ Navigation Shell เรียบร้อยแล้ว)
* **ขอบเขตการทำงาน**: Limited Static UI Implementation (ไม่มีการใช้ timing engine, localStorage หรือการบันทึกจริง)

---

## 1. Architecture Inspected & Navigation Decision

* **Existing navigation mechanism**: โครงสร้างพรีวิวแอปจริง (Real App Preview) ใช้สถานะ `activeTab` (ชนิดข้อมูล `PreviewTab`) ในการสลับคอมโพเนนต์เนื้อหา และแมปปุ่มแสดงแท็บนำทางมาจากอาร์เรย์คงที่ `TAB_ITEMS` ในไฟล์ [AstroRealAppPreview.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx)
* **Selected mechanism**: แทรกแท็บรหัส `"timing"` เข้าไปใน `PreviewTab` และ `TAB_ITEMS` โดยตรง เพื่อให้เปิดหน้าวิเคราะห์ผ่าน client-side tab transition ร่วมกับผูก callback `onNavigateToTab` บน Daily Timing Summary Card เพื่อนำทางจากหน้าแรกมายังหน้านี้ได้อย่างไร้รอยต่อ
* **Reason**: เหมาะสมและล้อตามสถาปัตยกรรมนำทางเดิมของแอปพรีวิว ปลอดภัยจากการสร้าง route ใหม่ที่ไม่จำเป็น
* **Route change required**: **No** (ไม่มีการสร้างหรือแก้ไข Route หรือ API บนเบื้องหลังเซิร์ฟเวอร์จริง)

---

## 2. Files Modified & Created

### Files Modified:
1. **[AstroRealAppPreview.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx)**
   - นำเข้าคอมโพเนนต์ `AstroStrategicTimingPanel`
   - เพิ่มคีย์ `"timing"` ใน PreviewTab และแทรกเมนู `"🕰 ฤกษ์และจังหวะเวลา"` ในรายการ `TAB_ITEMS`
   - ผูกพร็อพ `onNavigateToTab` ให้กับ `AstroTodayPanel` เพื่อใช้ส่งข้ามหน้า และผูกเงื่อนไขสลับหน้าจอมายัง `AstroStrategicTimingPanel`
2. **[AstroTodayPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx)**
   - เพิ่มพร็อพ `onNavigateToTab` ในส่วน Interface และ Props
   - แทรกกล่องสรุปจังหวะเวลาประจำวันย่อย (Daily Timing Summary Card) เพื่อนำพาผู้ใช้กดเปิดวิเคราะห์เต็มรูปแบบได้

### Files Created:
3. **[AstroStrategicTimingPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroStrategicTimingPanel.tsx)**
   - คอมโพเนนต์หน้าจอวิเคราะห์จังหวะเวลาหลักเต็มรูปแบบ (Static UI Shell)

---

## 3. UI Coverage & Implemented Features

### 3.1 Stage Status Notice
* มีกล่องข้อความเตือนภัยสีม่วงเด่นชัดที่ด้านบนสุดของพาเนลวิเคราะห์:
  > **Stage 1 — Static Interface Preview**
  > ข้อมูลในหน้านี้เป็นตัวอย่างสำหรับตรวจโครงสร้างการใช้งาน ยังไม่ได้เชื่อมระบบคำนวณฤกษ์หรือบันทึกข้อมูลจริง

### 3.2 UI State Preview Selector (4 Required States)
แผงทดสอบจำลอง UI State ด้านบนอำนวยความสะดวกในการกดดูสภาวะหน้าจอต่าง ๆ ได้โดยตรง:
1. **Mock Event State**: แสดง Event ตัวอย่าง 1 รายการ ร่วมกับการแยกย่อย 4 Assessments (Travel, Meeting, Lending, Project Start) พร้อมแสดง 4 Timing Windows, High-Stakes Guardrail, Fixed Appointment Guidance, Source Layers, และ Confidence Preview
2. **Initial / Empty State**: แสดงปุ่มวิเคราะห์ในสถานะ Disabled และข้อแนะนำเริ่มต้นใช้งานแบบสถิต
3. **Insufficient Data State**: แสดงกล่องเตือนระดับความสมบูรณ์ข้อมูลขาดหาย (Insufficient Data) ปราศจากการวิเคราะห์เดาล่วงหน้า
4. **Saved Assessments Empty State**: แสดงข้อความจำลอง `"ยังไม่มีการประเมินที่บันทึกไว้ การบันทึกแบบ Local-first จะถูกเพิ่มใน Stage ถัดไป"`

### 3.3 Event Decomposition (แยกแยะ 4 Assessments อิสระ)
* แสดง Event โครงการร่วมแปลงวิจัย และแยกประเมินกิจกรรม 4 ชิ้น (Travel, Meeting/Negotiation, Lending/Payment, Project Start) พร้อมกล่องระบุชัดเจน: `"ผลของ Assessment หนึ่งไม่ถูกนำไปใช้ตัดสินอีก Assessment โดยอัตโนมัติ"`

### 3.4 Capacity Preview (จำลองความจุ 3 ระดับ)
* สามารถคลิกเลือกจำลองปริมาณเก็บข้อมูล 3 ระดับ (85 ปกติ, 95 เตือนใกล้เต็ม, 100 เต็มความจุ)
* ในระดับ 100: บล็อกปุ่มกดสร้าง และปิดการทำงานของปุ่มสั่งการลบ/ส่งออกสำรองทั้งหมด (แสดงเป็นสถานะ Disabled และกำกับด้วย Tooltip `Available in a later stage` หรือป้ายกำกับชัดเจน) ปราศจากตรรกะ Pruning ข้อมูลดิบอัตโนมัติ

### 3.5 Predetermined High-Stakes Guardrail
* ดึงข้อมูลตรวจสอบจาก `Lending / Payment — High-Stakes Mock Assessment` แนะนำเฉพาะหัวข้อทางปฏิบัติการป้องกันภัยด้านกฎหมายและการเงิน (เช่น ตรวจเงินสำรองจำเป็น, กันงบเดินทาง, ตรวจแหล่งเงินคืน, ทำเอกสารสัญญา) โดยไม่มีการพยากรณ์ความแม่นยำ 100% หรือรับประกันได้เงินคืน

### 3.6 4 Levels of Timing Windows
* แสดง 4 ช่วงเวลาจำลอง (Supportive, Usable with Conditions, Caution, Recovery/Prep) ติดป้ายกำกับ `Mock Timing Result — ยังไม่ได้เชื่อมระบบคำนวณ` ทุกช่วงเวลา แสดงผลด้วยทั้งป้ายชื่อและคำบรรยายอย่างสมบูรณ์ (ไม่พึ่งพิงเฉพาะการเปลี่ยนสีของกรอบ)

### 3.7 Fixed Appointment Guidance
* แสดงรายการ Checklist กลยุทธ์เนื้อหาปฏิบัติการ 7 ประการ (เป้าหมาย, คุยตัวเลข, แยกเงินสดย่อย, ปฏิเสธเซ็นเมื่อเอกสารไม่ครบ, สรุปสร้อยความ, follow-up checkpoint, คูลลิ่งออฟพาวส์) และไม่แนะนำให้ยกเลิกนัดหมายเพียงเพราะทับซ้อนช่วงเวลา Caution

### 3.8 Planning & Reflection Previews
* กล่องแสดงภาพร่าง (Draft Previews) ระดับบน แสดงเป็นฟิลด์อ่านอย่างเดียว (Read-only) โดยไม่มีการเชื่อมต่อ API หรือเขียน Storage จริง ปุ่มส่งออกทั้งหมดระบุข้อความจำลอง `Coming in a later stage` ชัดเจน

---

## 4. Verification Results

* **TypeScript Type Check**: ผ่านการตรวจสอบด้วยคำสั่ง `./node_modules/.bin/tsc --noEmit` สมบูรณ์ ปราศจากข้อผิดพลาดในฝั่งชนิดข้อมูล
* **Targeted ESLint**: ผ่านการตรวจสอบ ESLint ปราศจาก Warning หรือ Error ตกค้าง
  ```bash
  node node_modules/eslint/bin/eslint.js \
    'src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx' \
    'src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx' \
    'src/components/workspaces/astro-strategy/real-app/components/AstroStrategicTimingPanel.tsx'
  ```
  *(ผลลัพธ์: Clean - 0 problems)*

---

## 5. Exclusions & Limitations

* ไม่มีระบบคำนวณจังหวะฤกษ์ยามจริง (No calculation engine/horoscope logic)
* ไม่มีตรรกะการจัดเก็บข้อมูลเบราว์เซอร์จริง (No localStorage database)
* ปุ่มและกลไกทั้งหมดถูกปิดกั้นเพื่อป้องกันข้อผิดพลาดเชิงลึกใน Stage แรก

---

## 6. Recommended Next Stage

* **`ASTRO-REAL-APP-124`** — Strategic Timing Runtime Types and Persistence Stub (จัดทำโครงร่าง Adaptor Stub เพื่อจำลองกระบวนการกู้คืนและการทดสอบความสอดคล้องของ LocalStorage จริงในอนาคต)
