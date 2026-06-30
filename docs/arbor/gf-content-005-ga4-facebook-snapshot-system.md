# มาตรฐานระบบแยกสถิติ GA4 + Facebook Insight (GA4 + Facebook Insight Snapshot System)

เอกสารระบุข้อกำหนดในการนำส่งข้อมูลสถิติประสิทธิภาพที่แบ่งแยกเป็นสองฝั่งหลักอย่างชัดเจน ระหว่าง **Facebook Insight** (Post-level / Distribution signal) และ **GA4** (Article-level / Website signal) พร้อมการวิเคราะห์รวมเป็น **Combined Content Decision** กลับเข้าสู่ Writing Lab ผ่านสกีมาการอัปเดต `workos-writing-lab-update-v0.1`

---

## 1. วัตถุประสงค์ (Purpose)
ระบบนี้ช่วยให้สามารถบันทึกประสิทธิภาพของบทความแต่ละชิ้นหลังเผยแพร่แยกฝั่งกันอย่างละเอียด โดยมีจุดประสงค์หลักเพื่อ:
- **Facebook Snapshots**: วิเคราะห์ความสามารถในการแจกจ่าย (Distribution Signal) ผ่านสถิติระดับโพสต์ (Post-level metrics) เช่น Reach, Reactions, Comments, Shares, Link Clicks และ Saves
- **GA4 Snapshots**: วิเคราะห์พฤติกรรมการเข้าอ่านจริงบนเว็บไซต์ (Website Signal) ผ่านสถิติระดับหน้าเว็บ (Article-level metrics) เช่น Views, Active Users, Average Engagement Time, Bounce Rate และทราฟฟิกแยกตามช่องทาง
- **Combined Analysis & Decision**: รวมสัญญาณต่างๆ เพื่อประเมินสรุปและตัดสินใจเชิงกลยุทธ์ต่อเนื้อหาในขั้นตอนถัดไป

---

## 2. กรณีที่ใช้งาน (When to Use)
- **Launch Phase (24h / 7d)**: บันทึกข้อมูลเพื่อเปรียบเทียบระหว่างแรงส่งช่วงแรกบนโซเชียลมีเดียกับทราฟฟิกจริงบนเว็บไซต์
- **Evergreen Review (30d / 90d / Evergreen)**: ประเมินการเข้าถึงออแกนิกบน Google (SEO Signal) เทียบกับการรักษาความน่าสนใจบนโพสต์เดิม
- **Combined Audit**: นำส่งข้อมูลวิเคราะห์ภาพรวมบทเรียนความสำเร็จ (What Worked) และแนวทางแก้ไข (What Did Not Work) พร้อมปรับ Next Content Decision

---

## 3. สกีมาโครงสร้างข้อมูล (JSON Schema Structure)

สกีมาที่ใช้คือ `workos-writing-lab-update-v0.1` ภายใต้ฟิลด์ `performanceFeedback` จะมีโครงสร้างย่อยประกอบด้วย:

### A. Facebook Snapshots (`facebookSnapshots`)
ประกอบด้วยอ็อบเจกต์ระบุคีย์ช่วงเวลา ได้แก่ `snap24h`, `snap7d`, `snap30d`, `snap90d` โดยมีคีย์ภายในดังนี้:
- `snapshotDate`: วันที่บันทึกข้อมูล (string, YYYY-MM-DD)
- `platform`: ช่องทางที่โพสต์ ("facebook_page", "facebook_group", "personal_profile")
- `postUrl`: ลิงก์ตรงของโพสต์บน Facebook (string)
- `publishedDate`: วันที่เผยแพร่โพสต์จริง (string, YYYY-MM-DD)
- `reach`: ยอดผู้เข้าถึง/ยอดวิวโพสต์ (number)
- `reactions`: ยอดผู้แสดงความรู้สึกบนโพสต์ (number)
- `comments`: ยอดความคิดเห็นสะสมบนโพสต์ (number)
- `shares`: ยอดแชร์ของโพสต์ (number)
- `linkClicks`: ยอดคลิกเข้าสู่บทความจากโพสต์ (number)
- `saves`: ยอดเซฟ/บันทึกโพสต์ (number)
- `notableComments`: ความเห็นเด่นของผู้อ่านที่น่าสังเกต (string)
- `audienceQuestions`: คำถามยอดฮิตจากผู้เขียน (string)
- `confusion`: จุดที่ลูกค้างงหรือสับสน (string)
- `audienceLanguage`: คำศัพท์หรือคำพูดที่น่าสนใจของกลุ่มเป้าหมาย (string)
- `notes`: บันทึกข้อสังเกตเพิ่มเติมเฉพาะช่วงเวลานี้ (string)

### B. GA4 Snapshots (`ga4Snapshots`)
ประกอบด้วยอ็อบเจกต์ระบุคีย์ช่วงเวลา ได้แก่ `snap24h`, `snap7d`, `snap30d`, `snap90d` โดยมีคีย์ภายในดังนี้:
- `snapshotDate`: วันที่บันทึกข้อมูล (string, YYYY-MM-DD)
- `publishedUrl`: ลิงก์จริงบนเว็บบล็อก (string)
- `pageTitle`: หัวข้อหน้าเว็บที่แสดงผล (string)
- `views`: จำนวนครั้งที่เปิดดูหน้าเว็บ (number)
- `activeUsers`: จำนวนผู้ใช้งานจริง (number)
- `events`: ยอดการกระทำของผู้ใช้อื่นๆ (number)
- `averageEngagementTime`: เวลาเฉลี่ยที่มีส่วนร่วมกับบทความ (number, วินาที)
- `bounceRate`: อัตราส่วนการออกจากหน้าเว็บทันที (string / number)
- `sourceMedium`: ช่องทางนำเข้าทราฟฟิกหลัก เช่น "fb / post", "google / organic" (string)
- `organicUsers`: ยอดผู้เข้าชมจากการค้นหาออแกนิก (number)
- `referralUsers`: ยอดผู้เข้าชมจากการส่งต่อของหน้าเว็บภายนอก (number)
- `notes`: บันทึกข้อสังเกตพฤติกรรมบนเว็บ (string)

### C. Combined Analysis (`combinedAnalysis`)
สรุปประเมินผลลัพธ์ในมิติต่างๆ เพื่อการวางแผน:
- `performanceSummary`: สรุปบทวิเคราะห์รวมผลลัพธ์การเผยแพร่ภาพรวม (string)
- `distributionSignal`: สัญญาณประเมินประสิทธิภาพการกระจายข่าว (string)
- `websiteSignal`: สัญญาณพฤติกรรมบนเว็บไซต์ (string)
- `topicSignal`: สัญญาณความสนใจในหัวข้อเนื้อหาชิ้นนี้ (string)
- `hookSignal`: สัญญาณประเมินคุณภาพของประโยคเปิดหัวเรื่อง (string)
- `imageSignal`: สัญญาณประเมินภาพหรืออินโฟกราฟิกประกอบ (string)
- `ctaSignal`: สัญญาณประเมินผลของการกระตุ้นให้ตอบสนอง (string)
- `seoSignal`: สัญญาณความคืบหน้าด้าน SEO (string)
- `commentSignal`: สัญญาณความคิดเห็นคำติชมหลัก (string)
- `whatWorked`: จุดที่สำเร็จหรือได้ยอดปฏิสัมพันธ์สูง (string)
- `whatDidNotWork`: จุดที่ควรปรับปรุงแก้ไข (string)
- `recommendedAction`: ข้อแนะนำเชิงกลยุทธ์ก้าวถัดไป (string)

---

## 4. แม่แบบพร้อมท์สั่งการ AI (Prompt Template for AI Analytics)

นำข้อความนี้คัดลอกส่งไปคุยกับ ChatGPT/Arbor เพื่อให้ระบบประเมินผลและสร้าง JSON อัปเดตได้อย่างถูกต้อง:

```markdown
คุณคือผู้เชี่ยวชาญการวิเคราะห์ข้อมูลความคืบหน้าคอนเทนต์ (Content Analytics Specialist) ประจำโปรเจกต์ Green Fineness
หน้าที่ของคุณคือรับสถิติข้อมูลดิบจาก 2 แหล่งหลัก ได้แก่ Google Analytics 4 (GA4) และ Facebook Insight แล้วประเมินผลรวมกันเพื่อสรุปแนวทางการตัดสินใจเนื้อหาในอนาคต

กรุณาแปลงข้อมูลผลลัพธ์ทั้งหมดให้กลายเป็นไฟล์ JSON ที่ถูกต้อง 100% ตามข้อกำหนดต่อไปนี้:
1. ห้ามใส่คอมเมนต์บรรทัดค้างอยู่ในโครงสร้าง JSON เด็ดขาด
2. ห้ามทิ้งเครื่องหมายจุลภาคค้างไว้ที่บรรทัดสุดท้าย (No trailing commas)
3. ใช้มาตรฐานสกีมา: "workos-writing-lab-update-v0.1"

นี่คือตัวอย่างโครงสร้าง JSON ที่คุณต้องผลิตส่งคืน:
{
  "schemaVersion": "workos-writing-lab-update-v0.1",
  "action": "apply_update",
  "target": {
    "type": "writing_lab_project",
    "projectId": "[ป้อน ID บทความ]",
    "projectSlug": "[ป้อน Slug บทความ]"
  },
  "fields": {
    "performanceFeedback": {
      "facebookSnapshots": {
        "snap24h": {
          "snapshotDate": "YYYY-MM-DD",
          "window": "24h",
          "platform": "facebook_page",
          "postUrl": "[ป้อนลิงก์โพสต์]",
          "publishedDate": "YYYY-MM-DD",
          "reach": 1500,
          "reactions": 60,
          "comments": 15,
          "shares": 5,
          "linkClicks": 95,
          "saves": 18,
          "notableComments": "ความเห็นเด่น...",
          "audienceQuestions": "คำถามยอดฮิต...",
          "confusion": "สับสนเรื่อง...",
          "audienceLanguage": "ภาษาที่ลูกค้าใช้...",
          "notes": "หมายเหตุสั้นๆ..."
        }
      },
      "ga4Snapshots": {
        "snap24h": {
          "snapshotDate": "YYYY-MM-DD",
          "window": "24h",
          "publishedUrl": "[ป้อนลิงก์เว็บ]",
          "pageTitle": "[ป้อนชื่อหัวข้อ]",
          "views": 480,
          "activeUsers": 410,
          "events": 850,
          "averageEngagementTime": 150,
          "bounceRate": "35%",
          "sourceMedium": "fb / post",
          "organicUsers": 12,
          "referralUsers": 5,
          "notes": "หมายเหตุพฤติกรรมอ่านเว็บ..."
        }
      },
      "combinedAnalysis": {
        "performanceSummary": "วิเคราะห์ภาพรวมผลลัพธ์...",
        "distributionSignal": "การประเมิน Reach/Shares...",
        "websiteSignal": "การประเมินเวลาอ่านเฉลี่ย...",
        "topicSignal": "ความคุ้มค่า/ความน่าสนใจของหัวข้อ...",
        "hookSignal": "ประสิทธิภาพประโยคพาดหัว...",
        "imageSignal": "ประสิทธิภาพรูปภาพประกอบ...",
        "ctaSignal": "ยอดคลิกไปซื้อหรือสอบถาม...",
        "seoSignal": "อันดับ SEO ใน Search Result...",
        "commentSignal": "ข้อความ/ข้อเสนอแนะหลัก...",
        "whatWorked": "ส่วนที่ทำแล้วเวิร์กและควรคงไว้...",
        "whatDidNotWork": "ส่วนที่ไม่เวิร์กและควรเปลี่ยน...",
        "recommendedAction": "คำแนะนำก้าวถัดไปที่ปฏิบัติได้ทันที..."
      },
      "nextDecision": {
        "decision": "Repost later / Make infographic / Write follow-up article / Keep as evergreen",
        "priority": "High / Medium / Low",
        "targetDate": "YYYY-MM-DD",
        "notes": "เหตุผลการตัดสินใจ..."
      }
    }
  }
}

ส่งคืนเพียงบล็อกโค้ด JSON ที่ทำการวิเคราะห์เรียบร้อยแล้วเท่านั้น
```
