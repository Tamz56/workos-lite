# มาตรฐานแพ็กเกจนำเข้าข้อมูลสถิติและผลลัพธ์บทความ (Feedback Snapshot Import Package Specification)

เอกสารระบุข้อกำหนดในการนำข้อมูลสถิติประสิทธิภาพ (GA4 / Facebook Metrics), ผลลัพธ์จากการตอบรับของผู้ใช้ (Notable Feedback), และบทวิเคราะห์เชิงลึกจากระบบผู้ช่วย (Arbor Insight / Next Decision) นำส่งกลับเข้าสู่ Writing Lab ผ่านสกีมาการอัปเดตอย่างปลอดภัย

---

## 1. วัตถุประสงค์ (Purpose)
มาตรฐานนี้จัดทำขึ้นเพื่อให้ระบบ AI (เช่น Arbor หรือ ChatGPT) หรือทีมงานผู้ดูแลระบบสามารถเตรียมชุดข้อมูลผลลัพธ์ของบทความ (Performance / Feedback / Stats) ในรูปแบบ JSON เพื่ออัปโหลดปรับปรุงค่าในหน้า **Arbor Inbox** กลับเข้าสู่ **Writing Lab** ของแต่ละบทความเป้าหมายได้อย่างเป็นระบบและแม่นยำ

---

## 2. กรณีที่ควรใช้งาน (When to Use)
- **เมื่อบทความเผยแพร่ไปแล้วครบ 24 ชั่วโมง**: เพื่ออัปเดตสถิติการเปิดตัวแรกเริ่ม (Launch Phase Stats)
- **เมื่อครบรอบ 7 วัน หรือ 30 วัน**: เพื่อประเมินผลลัพธ์แนวโน้มทราฟฟิก (Organic Search Growth / Evergreen Status)
- **เมื่อทำการเก็บข้อมูลคำถาม/ข้อสงสัยของผู้ใช้ (Q&A/Confusion)**: จากหน้ากล่องข้อความหรือคอมเมนต์ เพื่อใช้ตัดสินใจสร้างคอนเทนต์ขยายผล (Infographic / Social Draft / Short Video)
- **เมื่อมีบทสรุปคำแนะนำการตลาดใหม่จาก AI (Arbor Insight)**: เพื่อช่วยวางแผนทิศทางคอนเทนต์ชิ้นต่อไป

---

## 3. แหล่งข้อมูลต้นทางที่รองรับ (Supported Source Data)
1. **Google Analytics 4 (GA4)**: Views, Users, Event counts, Average engagement time, Traffic source/medium
2. **Facebook Page / Group Insights**: Reach, Reactions, Comments, Shares, Link Clicks
3. **User Comments / Community Q&A**: ข้อความคำชม, ปัญหาการใช้งาน, คำถามยอดฮิต, ข้อสงสัยที่พบบ่อย
4. **Manual Observation**: ข้อสังเกตของบรรณาธิการ เช่น โทนเสียงภาษา, คำเตือนทางเทคนิค

---

## 4. โครงสร้างการแมปข้อมูล (Mapping to performanceFeedback)

ชุดข้อมูล JSON ภายใต้กลุ่มฟิลด์ `performanceFeedback` จะถูกแมปเข้าสู่ระบบฐานข้อมูลของ Writing Lab (คีย์ `notes.performanceFeedback` ของโปรเจกต์) ดังรายละเอียดดังต่อไปนี้:

| ฟิลด์ข้อมูล (JSON Key) | คำอธิบาย (Description) | ชนิดข้อมูล (Type) |
| :--- | :--- | :--- |
| **`snapshots.snap24h`** | ข้อมูลสถิติของบทความในระยะเวลา 24 ชั่วโมงแรก | Object |
| **`snapshots.snap7d`** | ข้อมูลสถิติของบทความในระยะเวลา 7 วันแรก | Object |
| **`snapshots.snap30d`** | ข้อมูลสถิติของบทความในระยะเวลา 30 วันแรก | Object |
| **`notableFeedback`** | ความเห็นและคำถามเด่นจากผู้อ่าน (comments, questions, confusion, language, followupTopic) | Object |
| **`arborInsight`** | การสรุปผลลัพธ์และคำแนะนำจาก AI (whatWorked, whatDidNotWork, topicSignal, recommendedAction, ฯลฯ) | Object |
| **`nextDecision`** | การระบุการตัดสินใจขยายผลชิ้นต่อไป (decision, priority, targetDate, notes) | Object |

---

## 5. กฎความปลอดภัยและการทำ Deep Merge (Safety & Merge Rules)
- **ห้ามทำการอัปเดตอัตโนมัติ (No Auto-Apply)**: แพ็กเกจข้อมูลที่ส่งเข้ามาต้องผ่านสถานะ Inbox Preview และให้ผู้ใช้ตรวจสอบความแตกต่าง (Old vs Proposed) พร้อมกดยืนยันการเขียนทับที่หน้าเว็บก่อนเสมอ
- **การป้องการการสูญหายของคีย์เดิม (Preserve Existing Keys)**: การอัปเดตสถิติจะใช้กระบวนการ **Deep Merge** เท่านั้น
  * ตัวอย่าง: หากคุณส่งอัปเดตเฉพาะสถิติ `snap30d` ข้อมูลของ `snap24h` และ `snap7d` ที่เคยอยู่ในระบบจะต้องยังอยู่ครบถ้วนและห้ามถูกเขียนทับด้วยข้อมูลว่าง
- **ระบบเตือนการ Overwrite ข้อมูล**: หากฟิลด์ที่จะถูกเขียนทับมีค่าที่ไม่เป็นค่าว่าง (Non-empty) ระบบหน้าจอจะขึ้นแถบสีส้มเตือนผู้ใช้อย่างชัดเจนป้องกันการเขียนทับโดยไม่ตั้งใจ

---

## 6. ลำดับขั้นตอนการทำงาน (Example Workflow)
1. **คัดลอก Prompt Template** (จากหัวข้อที่ 8) ไปคุยกับ Arbor หรือ ChatGPT
2. **ป้อนข้อมูลสถิติดิบ** จาก GA4 / Facebook / ไฟล์คอมเมนต์ให้ AI วิเคราะห์
3. AI จะทำการส่งคืนโค้ด JSON ตามมาตรฐานสกีมา `workos-writing-lab-update-v0.1`
4. คัดลอกโค้ด JSON ไปวางที่หน้าเว็บ **Arbor Inbox** (เมนูนำเข้า)
5. กดยืนยันและตรวจสอบที่ **Preview Area** (จะแสดงค่า Old vs Proposed แยกตามหัวข้ออย่างเด่นชัด)
6. หากตรวจสอบแล้วถูกต้อง ให้กดปุ่ม **Confirm Apply Updates** ระบบจะทำการบันทึกข้อมูลปรับปรุงลง Writing Lab อย่างสมบูรณ์

---

## 7. รายการตรวจสอบความถูกต้อง (QA Checklist)
- [ ] ไฟล์มีโครงสร้างเป็น Valid JSON (สามารถใช้ JSON validator ตรวจเช็คเบื้องต้นได้)
- [ ] ไม่มีคอมเมนต์บรรทัดค้างอยู่ในไฟล์ (เพราะสกีมา JSON มาตรฐานไม่รับคอมเมนต์)
- [ ] ไม่มีเครื่องหมายจุลภาคค้างอยู่ที่บรรทัดสุดท้าย (No trailing commas)
- [ ] ระบุ `schemaVersion` ตรงตามรุ่น `"workos-writing-lab-update-v0.1"`
- [ ] ระบุ `target.type` เป็น `"writing_lab_project"`
- [ ] ระบุ `target.projectSlug` หรือ `target.projectId` ให้ตรงกับบทความในระบบจริง
- [ ] ข้อมูลภายใน `fields.performanceFeedback` มีคีย์หลักครบถ้วนตามความต้องการ

---

## 8. แม่แบบคำสั่งควบคุม AI (Prompt Template for ChatGPT / Arbor)

คุณสามารถนำโครงร่าง Prompt นี้ไปใช้งานกับ AI เพื่อแปลงข้อมูลดิบให้เป็นโครงสร้าง JSON แพ็กเกจที่ถูกต้องได้ทันที:

```markdown
คุณคือผู้ช่วยจัดการข้อมูลสถิติบทความ (Content Analytics Assistant) สำหรับระบบ Green Fineness และ WorkOS-Arbor

หน้าที่ของคุณคือ รับข้อมูลดิบสถิติ/ผลลัพธ์ของบทความ แล้วแปลงผลให้กลายเป็นไฟล์ JSON อัปเดตตามมาตรฐานสกีมา "workos-writing-lab-update-v0.1"

กรุณาปฏิบัติตามกฎต่อไปนี้อย่างเคร่งครัด:
1. ห้ามใส่ Comment ใน JSON บรรทัดใดๆ ทั้งสิ้น
2. ห้ามทิ้งเครื่องหมาย Comma ไว้ที่ท้ายรายการตัวสุดท้าย (No trailing commas)
3. รักษารูปแบบสกีมา JSON ด้านล่างนี้ให้ตรงเป๊ะ
4. วิเคราะห์สรุป Notable Feedback, Arbor Insight และเลือก Next Decision (การตัดสินใจขั้นถัดไป) จากข้อมูลดิบที่ป้อนให้

นี่คือโครงร่างต้นแบบของสกีมา JSON ที่คุณต้องผลิตคืนมา:
{
  "schemaVersion": "workos-writing-lab-update-v0.1",
  "source": "Arbor",
  "importBatchTitle": "คำอธิบายชุดสถิติบทความ (เช่น Green Fineness Feedback Snapshot - [ระบุเดือน/ปี])",
  "target": {
    "type": "writing_lab_project",
    "projectSlug": "[ระบุ slug ของบทความปลายทางใน Writing Lab]"
  },
  "fields": {
    "performanceFeedback": {
      "snapshots": {
        // ให้เลือกใส่อย่างน้อย 1 ชุด หรือใส่ให้ครบตามสถิติที่มี
        "snap24h": {
          "snapshotDate": "[วันที่ดึงข้อมูล เช่น YYYY-MM-DD]",
          "views": "[ตัวเลขยอดวิวเป็น string เช่น '150']",
          "users": "[ตัวเลขผู้ใช้เป็น string เช่น '120']",
          "events": "[ตัวเลขจำนวน Event เป็น string เช่น '210']",
          "engagementTime": "[เวลาเฉลี่ย เช่น '1m 15s']",
          "sourceMedium": "[ช่องทางหลัก เช่น 'Facebook / post']",
          "fbReach": "[ยอด Reach บน FB เช่น '1200']",
          "fbReactions": "[ยอด Reaction เช่น '45']",
          "fbComments": "[ยอดคอมเมนต์ เช่น '12']",
          "fbShares": "[ยอดแชร์ เช่น '8']",
          "fbClicks": "[ยอดคลิกลิงก์ เช่น '72']",
          "notes": "[บันทึกย่อการวิเคราะห์ 24 ชั่วโมง]"
        },
        "snap7d": {
          "snapshotDate": "[วันที่ดึงข้อมูล เช่น YYYY-MM-DD]",
          "views": "[ตัวเลขยอดวิว เช่น '820']",
          "users": "[ตัวเลขผู้ใช้ เช่น '680']",
          "events": "[ตัวเลข Event เช่น '1050']",
          "engagementTime": "[เวลาเฉลี่ย เช่น '1m 32s']",
          "sourceMedium": "[ช่องทางหลัก เช่น 'google / organic']",
          "fbReach": "[ยอด Reach เช่น '2500']",
          "fbReactions": "[ยอด Reaction เช่น '98']",
          "fbComments": "[ยอดคอมเมนต์ เช่น '24']",
          "fbShares": "[ยอดแชร์ เช่น '15']",
          "fbClicks": "[ยอดคลิก เช่น '180']",
          "notes": "[บันทึกย่อการวิเคราะห์ 7 วัน]"
        },
        "snap30d": {
          "snapshotDate": "[วันที่ดึงข้อมูล เช่น YYYY-MM-DD]",
          "views": "[ตัวเลขยอดวิว เช่น '2450']",
          "users": "[ตัวเลขผู้ใช้ เช่น '1980']",
          "events": "[ตัวเลข Event เช่น '3200']",
          "engagementTime": "[เวลาเฉลี่ย เช่น '1m 45s']",
          "sourceMedium": "[ช่องทางหลัก เช่น 'google / organic']",
          "fbReach": "[ยอด Reach เช่น '3100']",
          "fbReactions": "[ยอด Reaction เช่น '115']",
          "fbComments": "[ยอดคอมเมนต์ เช่น '32']",
          "fbShares": "[ยอดแชร์ เช่น '18']",
          "fbClicks": "[ยอดคลิก เช่น '210']",
          "notes": "[บันทึกย่อการวิเคราะห์ 30 วัน]"
        }
      },
      "notableFeedback": {
        "comments": "[สรุปคอมเมนต์เชิงบวก/ความเห็นทั่วไปของผู้อ่าน]",
        "questions": "[สรุปคำถามค้างคาใจที่ผู้อ่านต้องการคำตอบเพิ่มเติม]",
        "confusion": "[จุดที่ผู้อ่านอ่านแล้วสับสนหรือเข้าใจผิด]",
        "language": "[วิเคราะห์โทนเสียง ภาษาที่ใช้ และความถูกต้องในการสื่อสาร]",
        "followupTopic": "[หัวข้อ/ประเด็นเพิ่มเติมที่ผู้ใช้สนใจและขยายผลเป็นบทความอื่นได้]"
      },
      "arborInsight": {
        "whatWorked": "[อะไรที่ทำได้ดีในบทความนี้ เช่น การพาดหัว ดราม่าหรือเนื้อหาที่มีคุณค่า]",
        "whatDidNotWork": "[อะไรที่ควรปรับปรุง เช่น ข้อมูลน้อยเกินไป หรือภาพไม่ชัดเจน]",
        "topicSignal": "[สัญญาณความสนใจของหัวข้อนี้ในตลาด]",
        "trafficSignal": "[การเติบโตของช่องทางเข้าชมบทความ]",
        "engagementSignal": "[การมีส่วนร่วมของผู้อ่าน เช่น อยู่บนหน้าเว็บนาน]",
        "repostPotential": "[ประเมินโอกาสนำกลับมาแชร์ซ้ำ หรือแชร์ในกลุ่มย่อย]",
        "followupPotential": "[ประเมินโอกาสทำบทความเชื่อมโยงถัดไป]",
        "recommendedAction": "[ข้อแนะนำปฏิบัติถัดไปที่แนะนำทันที]"
      },
      "nextDecision": {
        // decision ต้องเป็นหนึ่งในค่าเหล่านี้:
        // 'Repost later', 'Make infographic', 'Write follow-up article', 
        // 'Create short explainer', 'Create video script', 'Improve headline', 
        // 'Improve image', 'Keep as evergreen'
        "decision": "[เลือกค่าจากรายการที่อนุญาตด้านบน]",
        "priority": "[ความสำคัญ: High, Medium, Low]",
        "targetDate": "[กำหนดเวลาเป้าหมาย เช่น YYYY-MM-DD]",
        "notes": "[บันทึกเหตุผลประกอบการตัดสินใจของขั้นตอนถัดไป]"
      }
    }
  }
}

เมื่อคุณพร้อมแล้ว โปรดแจ้งให้ฉันส่งข้อมูลดิบเพื่อเริ่มประมวลผลเป็นไฟล์ JSON อัปเดตข้อมูลบทความดังกล่าว
```
