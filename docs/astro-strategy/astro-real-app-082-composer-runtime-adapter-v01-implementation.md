# ASTRO-REAL-APP-DEV-082 — Composer Runtime Adapter v0.1 Implementation

เอกสารรายงานผลการอิมพลีเมนต์โมดูลและฟังก์ชันประสานดวงกำเนิด ดวงดาวจร สุขภาพ และระดับสมาธิข้ามศาสตร์ (Strategy Composer) ในรูปตัวรันไทม์จำลอง v0.1

---

## 1. Goal (เป้าหมาย)

สร้างคอมโพเซอร์ประสานข้อมูลเชิงกลยุทธ์ (**Natal + Transit Strategy Composer**) แบบ pure TypeScript เพื่อทำการควบรวมสัญญาณกลยุทธ์และจัดระเบียบลำดับความขัดแย้งของข้อมูลทั้งหมดให้กลายเป็นคำสั่งและคำแนะนำกลยุทธ์สมาธิชิ้นเดียวที่เรียบง่ายตามแผนสัญญาเอาท์พุตที่กำหนดใน DEV-081

---

## 2. Scope & Files Added (ขอบเขตการทำงาน)

- เพิ่มชนิดข้อมูล TypeScript ใน [astroRealAppTypes.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts)
- สร้างไฟล์อแดปเตอร์ [astroRealAppNatalTransitStrategyComposer.ts](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/data/astroRealAppNatalTransitStrategyComposer.ts) และส่งออกฟังก์ชันหลัก `buildNatalTransitStrategyComposerOutput`

---

## 3. Implementation Details (รายละเอียดการอิมพลีเมนต์)

### 3.1 Priority Rules (ลำดับความสำคัญเชิงประมวลผล)
1. **ระดับสุขภาวะและความล้า (User Fatigue / Energy)**: ได้รับสิทธิ์ในการกำหนดผลลัพธ์สูงสุด หากพบเหนื่อยล้าสูง จะสลับโหมดหลักเข้าสู่ `Recover` หรือ `Pause` เสมอ โดยดวงดาวจรไม่มีสิทธิ์ override
2. **Today Engine Mode**: ประเมินความเสถียรของแอปเป็นอันดับถัดไป
3. **Reflection History & Logs**: หลักฐานพฤติกรรมและความเหนื่อยล้า
4. **Thai Transit Context**: สภาพวันจรปัจจุบัน
5. **Natal Baseline**: ดวงชะตากำเนิดของผู้ใช้อ้างอิงลัคนา
6. **Optional layers**: ยามและกำลังวันไทย กับธาตุจีน (ประเมินเป็น supporting notes เท่านั้น)

### 3.2 Conflict Resolution (ตรรกะประนีประนอมสัญญาณขัดแย้ง)
- หาก Today Engine แนะนำให้หยุดนิ่ง (Pause) แต่ Transit ชี้เป้าให้ลุยงานหนัก (Focus) -> ปรับเข้าหาจุดกลางความเสถียรที่ **Stabilize**
- หาก Today Engine บอกให้ลุย (Focus) แต่ Transit แนะนำให้ชะลอพลัง (Pause) -> ประนีประนอมที่ **Stabilize** ป้องกันความร้อนใจและการสลับงานเร็ว
- บันทึกตรรกะทั้งหมดระบุลงในฟิลด์ `conflictResolutionNotes` สั้นกระชับเชิงเหตุผลระบบ

### 3.3 Suppressed Signals (การกรองความถี่รบกวน)
- ระงับสัญญาณการเปิดหน้างานหนัก `TH_SIG_DEEP_WORK` หรือการแก้ไขโครงสร้างใหญ่ `TH_SIG_REFACTOR` ในวันที่ดัชนีเหนื่อยล้าสะสมสูง
- เก็บประวัติพร้อมบันทึกสาเหตุใน `suppressedSignals`

### 3.4 Copy Safety (ความปลอดภัยถ้อยคำ)
- คำแนะนำและประโยคคำชี้แนะทั้งหมดในอแดปเตอร์ ปราศจากคีย์เวิร์ดทำนายชะตาชีวิต/กาลกิณี/เคราะห์กรรม/คำขู่เชิงจิตวิทยา
- มุ่งเน้นการสะท้อนสติและการแนะนำเชิงปฏิบัติจริง เช่น "เหมาะแก่การดีบักและสะสางงานเดิม", "หากรู้สึกล้าสะสม แนะนำให้จัดลำดับสลับพัก"
- พ่วงท้ายด้วยคำประกาศ Disclaimer ด้านความอิสระและการวางแผนตามบริบทจริงของผู้ใช้

---

## 4. Preservation of Existing Behaviors

- **LocalStorage isolation:** ประมวลผลสดบน RAM ฝั่งไคลเอนต์เท่านั้น ไม่มีการบันทึกค่าเอาท์พุตของ Composer ลงหน่วยความจำ LocalStorage
- **Schema protection:** ไม่มีการเพิ่มฟิลด์หรือแก้ไขโครงสร้างตารางข้อมูลในประวัติ Reflection History ดั้งเดิม
- **No UI modification:** ในรอบ DEV-082 นี้ไม่มีการดัดแปลงแก้ไขและเชื่อมหน้า UI จริง เพื่อควบคุมผลกระทบและความสะอาดของซอร์สโค้ดเชิงลึก
