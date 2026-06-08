# ASTRO-REAL-APP-DEV-043 — Export / Backup Data Plan

เอกสารการออกแบบสถาปัตยกรรมและแผนความมั่นคงปลอดภัยของการส่งออกและสำรองข้อมูล (Export / Backup Data Plan) สำหรับ Astro Real App MVP-v3

## Goal
ออกแบบกลไกการส่งออกข้อมูลดิบในเครื่องคอมพิวเตอร์ผู้ใช้งาน (Local Storage client-side export) ในรูปแบบไฟล์ JSON เพื่อสำรองข้อมูลสำคัญส่วนบุคคล เช่น โปรไฟล์ดวงเกิด ประวัติสะท้อนคิด แผนยุทธศาสตร์ และสถานะ Onboarding ทั้งหมดได้อย่างถูกต้อง ปลอดภัย และไร้ความเสี่ยงด้านการสูญหายหรือข้อมูลรั่วไหล

---

## Scope & Non-Scope

### ขอบเขตแผนการส่งออกข้อมูล (Scope)
1. กำหนดโครงสร้างเอกสารส่งออก (JSON Envelope Structure) และ Metadata ครบถ้วน
2. กำหนดกลุ่มคีย์ LocalStorage เป้าหมายที่จะนำเข้าสู่ไฟล์สำรองข้อมูล
3. อธิบายหลักการความปลอดภัยด้านข้อมูลส่วนบุคคล (PII/Privacy) และระเบียบจัดตั้งชื่อไฟล์สำรองข้อมูล
4. เสนอกระบวนการตรวจสอบก่อนส่งออกไฟล์ (Pre-export validation)
5. กำหนดแผน manual QA เพื่อทดสอบความคงอยู่ของข้อมูลเมื่อเริ่มทำงานจริง

### นอกเหนือขอบเขตแผนการพัฒนา (Non-Scope)
- ไม่เริ่มเขียนโปรแกรมรันไทม์หรืออิมพลีเมนต์ฟังก์ชันการเขียนไฟล์/ดาวน์โหลดไฟล์ในเฟสนี้
- ไม่เขียนโปรแกรมระบบนำเข้าข้อมูลและระบบกู้คืนข้อมูล (Import/Restore) ซึ่งสงวนไว้สำหรับเฟสถัดไป
- ไม่ดัดแปลงรูปแบบคีย์ LocalStorage ดั้งเดิม

---

## Why Export/Backup comes before Import/Restore

การออกแบบและพัฒนาฟังก์ชันการส่งออกและสำรองข้อมูล (Export/Backup) จะต้องทำเสร็จสมบูรณ์เป็นอันดับแรกก่อนจะเริ่มพัฒนาฟังก์ชันการนำเข้าและกู้คืน (Import/Restore):
1. **Safety First / Safe Fallback**: เพื่อป้องกันอุบัติเหตุข้อมูลสูญหายจากบั๊กหรือข้อผิดพลาดระหว่างทดสอบฟังก์ชันเขียน/กู้คืนข้อมูลในเครื่องจริง ผู้ใช้จะมีไฟล์ดาวน์โหลดดิบเก็บไว้อย่างปลอดภัยล่วงหน้า
2. **Data Integrity Testing**: ไฟล์ส่งออกที่ถูกต้องตามสกีมาจะกลายเป็นข้อมูลจำลอง (Mock payloads) ชั้นดีสำหรับการพัฒนาและตรวจสอบความเข้ากันได้ของระบบนำเข้าในเฟสถัดไป

---

## LocalStorage Key Inventory

### คีย์ที่จะถูกรวบรวมในการสำรองข้อมูล (Included Keys)
- `astro-real-app:birth-profile:v1` (โปรไฟล์ดวงเกิดที่กรอกแล้ว)
- `astro-real-app:reflection-history:v1` (ประวัติการสะท้อนคิด)
- `astro-real-app:planning-notes:v1` (แผนยุทธศาสตร์)
- `astro-real-app:reflection-draft:v1` (ดราฟต์บันทึกที่พิมพ์ค้างอยู่)
- `astro-real-app:onboarding:v1` (สถานะการปิด/เปิดแผงคำแนะนำ)

### คีย์ที่จะไม่นำมารวมในระบบสำรองข้อมูล (Excluded Keys)
- คีย์ดั้งเดิมของระบบโปรโตไทป์เก่า (เช่น `astro-strategy:*`, `astro.strategy.*`) เพื่อป้องกันไม่ให้ข้อมูลข้ามเวอร์ชันที่โครงสร้างไม่ตรงกันมาทำให้ระบบใหม่ชำรุด
- คีย์บันทึกผลการทดสอบการย้ายข้อมูล (Migration Dry Run Reports)
- คีย์ทดสอบชั่วคราวระดับ debug (ถ้ามี)

---

## Proposed Export JSON Envelope

ไฟล์สำรองข้อมูลจะมีโครงสร้างครอบด้วย Metadata เพื่อความปลอดภัยในการระบุเวอร์ชันและเช็คจุดเชื่อมต่อ:

```json
{
  "$schema": "https://arbor-desk.com/schemas/astro-strategy-backup-v1.json",
  "metadata": {
    "appName": "Astro Strategy Lab",
    "exportVersion": 1,
    "exportedAt": "2026-06-08T15:00:00.000Z",
    "routeContext": "preview",
    "source": "ArborDesk Client Export v1.0",
    "schemaVersions": {
      "birth-profile": 1,
      "reflection-history": 1,
      "planning-notes": 1,
      "reflection-draft": 1,
      "onboarding": 1
    },
    "includedKeys": [
      "astro-real-app:birth-profile:v1",
      "astro-real-app:reflection-history:v1",
      "astro-real-app:planning-notes:v1",
      "astro-real-app:reflection-draft:v1",
      "astro-real-app:onboarding:v1"
    ]
  },
  "data": {
    "astro-real-app:birth-profile:v1": {
      "version": 1,
      "updatedAt": "2026-06-08T14:00:00.000Z",
      "data": {
        "displayName": "คุณตั้ม",
        "birthDate": "1980-06-05",
        "birthTime": "06:45",
        "birthPlace": "Siriraj Hospital, Bangkok, Thailand",
        "timezone": "Asia/Bangkok"
      }
    },
    "astro-real-app:reflection-history:v1": {
      "version": 1,
      "updatedAt": "2026-06-08T14:00:00.000Z",
      "data": []
    },
    "astro-real-app:planning-notes:v1": {
      "version": 1,
      "updatedAt": "2026-06-08T14:00:00.000Z",
      "data": {
        "focusNext": "",
        "slowDown": "",
        "nextSmallAction": "",
        "reviewLater": ""
      }
    },
    "astro-real-app:reflection-draft:v1": null,
    "astro-real-app:onboarding:v1": {
      "version": 1,
      "updatedAt": "2026-06-08T14:00:00.000Z",
      "isDismissed": true
    }
  }
}
```

---

## Privacy & Security Considerations

- **Client-Side Processing Only**: ข้อมูลทั้งหมดจะถูกประกอบสร้างและส่งออกตรงผ่านหน้าเบราว์เซอร์ (Client-side anchor download) โดยไม่มีการรวบรวมหรืออัปโหลดขึ้นเซิร์ฟเวอร์ใด ๆ ทั้งสิ้น
- **Personally Identifiable Information (PII)**: ไฟล์ JSON จะประกอบไปด้วยข้อมูลวันเกิด เวลาเกิด และสถานที่เกิดอันละเอียดอ่อนของผู้ใช้ ดังนั้นระบบควรแสดงกล่องข้อความเตือนอย่างมีมนุษยธรรมเพื่อให้ผู้ใช้ระมัดระวังในการเก็บรักษาไฟล์สำรองดังกล่าว
- **Human-Readable format**: ส่งออกเป็นแบบข้อความตรงที่เปิดอ่านได้เพื่อความโปร่งใส ให้ผู้ใช้ตรวจสอบข้อมูลดิบของตนเองได้

---

## File Naming Convention & Pre-export Validation

- **รูปแบบชื่อไฟล์**: 
  `astro-strategy-backup-[YYYY-MM-DD]-[displayName].json`
  *ตัวอย่าง*: `astro-strategy-backup-2026-06-08-tumz.json`
- **การตรวจสอบข้อมูลก่อนการบันทึก (Validation)**:
  - ตรวจสอบความถูกต้องของสกีมา JSON ของคีย์แต่ละตัวในหน่วยความจำ
  - หากคีย์บางรายการว่างเปล่า (เช่น ยังไม่มีดราฟต์พิมพ์ค้าง) ให้แทนที่ด้วยค่า `null` ในโครงสร้างข้อมูล โดยห้ามบล็อกการดาวน์โหลด

---

## Manual QA Plan & Future Recommendations

### แผนการตรวจสอบแบบสัมผัสจริง (Manual QA Plan)
1. สร้างบันทึกประวัติสะสมจำลองและโน้ตกลยุทธ์
2. กดส่งออกไฟล์เพื่อดาวน์โหลดไฟล์ลงเครื่องคอมพิวเตอร์
3. เปิดเช็คไฟล์ JSON ด้วย Text Editor เพื่อตรวจสอบความถูกต้องของ Metadata และความปลอดภัยของข้อมูล
4. ทดลองดาวน์โหลดไฟล์ในทั้งเส้นทางพรีวิวและเส้นทางจริง (ตามสิทธิ์การเข้าใช้แท็บที่อนุญาต)

### ข้อเสนอแนะในขั้นตอนถัดไป (Future DEV-044 Recommendation)
- พัฒนาระบบส่งออกข้อมูลและเชื่อมต่อปุ่มสั่งสำรองข้อมูลในหน้าพรีวิวให้ตรงตามข้อกำหนดในแผนงานนี้
