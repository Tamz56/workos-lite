"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { 
    ArrowLeft, 
    BookOpen, 
    Search, 
    Copy, 
    Check, 
    Save, 
    Link2, 
    Sparkles, 
    CheckCircle, 
    Circle, 
    HelpCircle, 
    Layers, 
    Users, 
    FileText 
} from "lucide-react";

// Mock Data for Vocabulary
interface VocabItem {
    id: string;
    term: string;
    translation: string;
    definition: string;
    example: string;
    howToUse: string;
    category: "core" | "process" | "people";
}

const VOCAB_DATA: VocabItem[] = [
    {
        id: "v1",
        term: "Problem Statement",
        translation: "คำแถลงปัญหา",
        definition: "ข้อความสั้นๆ ที่ระบุถึงปัญหาดั้งเดิม พื้นที่ที่เกิดผลกระทบ และความเสียหายที่เกิดขึ้นอย่างชัดเจน เพื่อให้ทุกคนเห็นภาพตรงกันก่อนแก้ไข",
        example: "Green Fineness เผชิญปัญหายอดเข้าดู Nature Series สูง แต่ไม่มีคนกดบันทึกหรือทำแบบฝึกหัดเพราะระบบเดิมไม่มีระบบแยกสล็อตตอนและบทความ",
        howToUse: "คำแถลงปัญหานี้ระบุผลกระทบกับเป้าหมายธุรกิจชัดเจนหรือยังครับ เพื่อใช้จัดลำดับความสำคัญก่อนพัฒนา",
        category: "core"
    },
    {
        id: "v2",
        term: "Stakeholder",
        translation: "ผู้มีส่วนได้ส่วนเสีย",
        definition: "บุคคล กลุ่มบุคคล หรือองค์กรที่มีความเกี่ยวข้อง มีส่วนได้ หรืออาจได้รับผลกระทบจากการดำเนินงาน โครงการ หรือผลิตภัณฑ์นั้นๆ",
        example: "คุณตั้ม (ผู้ใช้ระบบ/เจ้าของเนื้อหา), ทีมพัฒนา (Dev Team), และผู้อ่านทั่วไป (End Users)",
        howToUse: "เราต้องระบุให้ครบว่ามี Stakeholder ฝ่ายไหนบ้างที่มีส่วนตัดสินใจในฟังก์ชันนี้ จะได้ไม่เกิดปัญหาขอบเขตบวมภายหลัง",
        category: "people"
    },
    {
        id: "v3",
        term: "Requirement",
        translation: "ความต้องการระบบ",
        definition: "เงื่อนไขหรือความสามารถที่ระบบหรือซอฟต์แวร์จำเป็นต้องมี เพื่อให้สามารถแก้ปัญหาหรือบรรลุเป้าหมายตามที่ผู้ใช้งานต้องการได้จริง",
        example: "ระบบต้องแสดงรายละเอียดสถานะการเรียนรู้ (Day 1 Completed) ของผู้เรียนในหน้าสรุปโดยดึงจากความจำเบราว์เซอร์",
        howToUse: "นี่คือ Requirement ของระบบที่จะแก้ปัญหานี้ ไม่ใช่แค่ Feature ที่เสนอขึ้นมาลอยๆ ครับ",
        category: "core"
    },
    {
        id: "v4",
        term: "Business Requirement",
        translation: "ความต้องการทางธุรกิจ",
        definition: "เป้าหมายระดับสูงขององค์กรหรือธุรกิจที่ระบบนี้ต้องตอบสนอง เพื่อสร้างผลกำไร ลดต้นทุน หรือแก้ไขจุดติดขัดในภาพกว้าง",
        example: "Green Fineness ต้องการเพิ่มความน่าเชื่อถือและความลึกซึ้งในการฝึกทักษะ BA ของคุณตั้ม เพื่อนำไปคุยงานกับทีม dev ได้อย่างมืออาชีพ",
        howToUse: "ปุ่มแชร์นี้สอดคล้องกับ Business Requirement ในการเพิ่มยอดสมาชิกร่วมเรียนรู้อย่างไรบ้างครับ",
        category: "core"
    },
    {
        id: "v5",
        term: "Functional Requirement",
        translation: "ความต้องการเชิงฟังก์ชัน",
        definition: "ความสามารถหรือพฤติกรรมของระบบที่ต้องตอบสนองต่อผู้ใช้งานโดยตรง (ระบบต้องทำอะไรได้บ้าง)",
        example: "หน้าจอ Classroom ต้องกรองคำศัพท์ตามหมวดหมู่ Core BA, Process & Flow, หรือ People ได้แบบเรียลไทม์",
        howToUse: "นี่เป็น Functional Requirement ที่ฝั่ง Front-end ต้องกรองข้อมูลจำลองทันทีเมื่อผู้ใช้เปลี่ยนแท็บหมวดหมู่",
        category: "core"
    },
    {
        id: "v6",
        term: "Non-functional Requirement",
        translation: "ความต้องการเชิงคุณภาพ",
        definition: "ข้อกำหนดเชิงระบบที่เป็นคุณลักษณะทางด้านเทคนิค เช่น ความเร็วในการประมวลผล ความปลอดภัย ความน่าเชื่อถือ และความเสถียร",
        example: "หน้าสรุปบทเรียนและคำศัพท์ต้องโหลดขึ้นแสดงผลสมบูรณ์ในระดับที่แทบจะไม่รู้สึกว่ามี Delay (น้อยกว่า 1 วินาที)",
        howToUse: "เรามี Non-functional Requirement เรื่องความปลอดภัยของข้อมูล หรือเวลาโหลดหน้าเพจที่จำกัดเท่าใดครับ",
        category: "core"
    },
    {
        id: "v7",
        term: "User Story",
        translation: "เรื่องเล่าของผู้ใช้",
        definition: "การอธิบายความต้องการจากมุมมองของผู้ใช้งานด้วยโครงสร้างประโยค: ในฐานะ... ฉันต้องการ... เพื่อให้...",
        example: "ในฐานะนักเรียน BA ฉันต้องการบันทึกแบบร่างฝึกหัดลงในเบราว์เซอร์ เพื่อกลับมาแก้ไขต่อได้ภายหลังโดยข้อมูลไม่สูญหาย",
        howToUse: "ขอยึดตาม User Story นี้ในการคุยกับทีมดีไซเนอร์และโปรแกรมเมอร์เพื่อให้อิงกับมุมมองผู้ใช้จริงเป็นหลัก",
        category: "process"
    },
    {
        id: "v8",
        term: "Acceptance Criteria",
        translation: "เกณฑ์การยอมรับงาน",
        definition: "เงื่อนไขที่กำหนดไว้ชัดเจนเพื่อเป็นตัววัดว่าฟีเจอร์หรือระบบนั้นเสร็จสมบูรณ์และทำงานถูกต้องตามต้องการจริงสำหรับการตรวจรับ",
        example: "เมื่อบันทึกร่างแบบฝึกหัดแล้ว ต้องมีข้อความแจ้งเตือน 'บันทึกร่างลงเบราว์เซอร์แล้ว' พร้อมแสดงเวลาล่าสุดที่ปุ่มและเก็บสถานะไว้ได้หลังกดรีเฟรชหน้าจอ",
        howToUse: "เราต้องการระบุข้อกำหนดในการเทสระบบให้ชัดเจน หรือมี Acceptance Criteria อะไรบ้างที่จะถือว่างานชิ้นนี้ผ่านการตรวจรับ",
        category: "process"
    },
    {
        id: "v9",
        term: "Workflow",
        translation: "ลำดับขั้นตอนการทำงาน",
        definition: "ลำดับกระบวนการทำงานต่อเนื่องตั้งแต่เริ่มต้นจนจบ เพื่อแสดงการลื่นไหลของงานและการตัดสินใจในระบบ",
        example: "ลำดับการอ่านสรุปบทเรียน → ทำความเข้าใจคำศัพท์ → แกะเคส Nature Series → กรอกแบบฝึกหัด → กดเช็คบันทึกเสร็จสิ้น Day 1",
        howToUse: "ขอวาดภาพลำดับการทำงานหรือ Workflow ปัจจุบันของแอดมิน เพื่อดูจุดติดขัดที่มีอยู่ในปัจจุบัน",
        category: "process"
    },
    {
        id: "v10",
        term: "Current State (As-Is)",
        translation: "สถานะการทำงานปัจจุบัน",
        definition: "กระบวนการ ระบบ หรือโครงสร้างที่มีอยู่จริงในสภาวะปัจจุบันก่อนที่จะมีระบบซอฟต์แวร์ใหม่เข้ามาปรับเปลี่ยน",
        example: "ข้อมูล Nature Series ทุกอย่างรวมกันอยู่ในที่เดียว ทำให้เกิดปัญหา Episode Slot สับสนกับตัวเนื้อหาจริง",
        howToUse: "ก่อนจะออกระบบใหม่ ขอสรุป As-Is Workflow หรือขั้นตอนทำงานที่เป็นจริงในปัจจุบันก่อนนะครับ",
        category: "process"
    },
    {
        id: "v11",
        term: "Future State (To-Be)",
        translation: "สถานะการทำงานในอนาคต",
        definition: "วิสัยทัศน์หรือรูปแบบกระบวนการทำงานใหม่หลังจากติดตั้งระบบหรือปรับเปลี่ยนตามความต้องการแล้ว",
        example: "ระบบที่แยกโครงสร้าง Series Container, Episode Slot และ Library Article ออกจากกันอย่างเด็ดขาดและดึงค่าเฉพาะที่เผยแพร่แล้ว",
        howToUse: "แผนการทำงานของ To-Be Workflow นี้จะช่วยลดจำนวนขั้นตอนของแอดมินไปได้เกือบครึ่งหนึ่งเลยครับ",
        category: "process"
    },
    {
        id: "v12",
        term: "Root Cause",
        translation: "สาเหตุที่แท้จริง",
        definition: "ต้นตอที่อยู่ลึกที่สุดซึ่งทำให้เกิดปัญหานั้นๆ ขึ้นมา หากแก้ไขตรงนี้ปัญหาจะไม่กลับมาเกิดซ้ำอีก",
        example: "ความสับสนระหว่าง Episode Container และ Library Article ในตัว Data Model ที่ไม่ได้ออกแบบให้แยกจากกันตั้งแต่แรก",
        howToUse: "ปัญหาที่ปุ่มนี้บั๊กบ่อยไม่ใช่แค่โค้ดผิด แต่อาจเกิดจาก Root Cause ที่สับสนเรื่อง Data Model ในฐานข้อมูล",
        category: "core"
    },
    {
        id: "v13",
        term: "Pain Point",
        translation: "จุดติดขัดหลัก",
        definition: "ปัญหาเฉพาะหน้าที่สร้างความอึดอัดใจ ความยุ่งยาก หรือความเชื่องช้าให้กับผู้ใช้งานในกระบวนการปัจจุบัน",
        example: "แอดมินจัดการลำดับของบทความในซีรีส์ได้ยากมาก เพราะต้องคอยสร้างบทความใหม่ลงสล็อตโดยตรงไม่มีคลังเก็บของกลาง",
        howToUse: "ปัญหา Pain Point หลักของแอดมินตอนนี้คือการต้องมาคัดลอกบทความซ้ำซ้อนเพื่อผูกตอนครับ",
        category: "core"
    },
    {
        id: "v14",
        term: "Scope",
        translation: "ขอบเขตงาน",
        definition: "ขอบเขตของผลงาน ฟังก์ชันระบบ หรือขั้นตอนการทำงานทั้งหมดที่จะทำขึ้นในโครงการหรือ Sprint นี้อย่างชัดเจน",
        example: "BA Classroom v0.1 ครอบคลุมเฉพาะ Static Content, LocalStorage บน Day 1 โดยยังไม่ทำ Scoring หรือผูก Database/API หลัก",
        howToUse: "ฟังก์ชันความก้าวหน้านี้อยู่ในขอบเขตของ Sprint นี้หรือเปล่าครับ หรือควรเก็บไว้ทำในระยะถัดไป",
        category: "core"
    },
    {
        id: "v15",
        term: "Out of Scope",
        translation: "นอกเหนือขอบเขตงาน",
        definition: "รายการฟังก์ชัน ความต้องการ หรือระบบใดๆ ที่ตกลงกันไว้ชัดเจนว่าจะไม่ทำในเฟสหรือ Sprint นี้เพื่อรักษาความเร็วในการส่งมอบ",
        example: "ระบบจัดเกรดและคะแนนสอบอัตโนมัติ การวิเคราะห์ความถูกต้องด้วยปัญญาประดิษฐ์ (AI-grading)",
        howToUse: "ระบบสะสมแต้มและกระดานผู้นำนี้ขอจัดเป็น Out of Scope ของ v0.1 เพื่อไม่ให้กำหนดส่งงานล่าช้า",
        category: "core"
    },
    {
        id: "v16",
        term: "Source of Truth",
        translation: "แหล่งข้อมูลหลักที่ถูกต้องที่สุด",
        definition: "หลักการออกแบบระบบให้มีฐานข้อมูลอ้างอิงตำแหน่งเดียวที่ถือว่าถูกต้องและเป็นปัจจุบันที่สุด เพื่อไม่ให้ข้อมูลซ้ำซ้อนหรือขัดแย้งกัน",
        example: "Library Article เป็นแหล่งข้อมูลของตัวบทความจริง ส่วน Episode Slot เป็นเพียงแค่โครงที่ชี้ไปหาบทความเท่านั้น",
        howToUse: "ตกลงว่าตารางสารบัญนี้หรือตารางบทความหลักที่เป็น Source of Truth ของข้อมูลชุดนี้ครับ",
        category: "core"
    },
    {
        id: "v17",
        term: "Data Model",
        translation: "แบบจำลองข้อมูล",
        definition: "การวิเคราะห์และกำหนดโครงสร้าง ความสัมพันธ์ และข้อกำหนดของกลุ่มข้อมูลทั้งหมดที่จะใช้ในระบบเพื่อนำไปออกแบบฐานข้อมูล",
        example: "การกำหนดโครงสร้างความสัมพันธ์ระหว่าง Series (ซีรีส์), Episode Slot (สล็อตตอน), และ Library Article (บทความต้นฉบับ)",
        howToUse: "ก่อนที่ทีม dev จะเขียน Schema ฐานข้อมูล ขอตรวจทานแผนภาพ Data Model นี้เพื่อให้ตรงกับ Business Logic ก่อน",
        category: "core"
    },
    {
        id: "v18",
        term: "สิ่งที่มีข้อมูลที่ระบบต้องเก็บบันทึก",
        translation: "สิ่งที่มีข้อมูลที่ระบบต้องเก็บบันทึก",
        definition: "วัตถุ บุคคล สถานที่ หรือแนวคิดในระบบที่มีเอกลักษณ์ของตัวเอง และต้องการจัดเก็บรายละเอียดไว้ในฐานข้อมูล (มักจะกลายเป็น Table)",
        example: "Series คือหนึ่ง Entity ในระบบที่มี Attribute เช่น id, title, description, coverImage",
        howToUse: "เรามี Entity ที่ต้องเก็บข้อมูลอะไรบ้างในหน้าจอนี้ เพื่อนำไปใช้ออกแบบคลาสและตารางในระบบ",
        category: "core"
    },
    {
        id: "v19",
        term: "Relationship",
        translation: "ความสัมพันธ์ระหว่างข้อมูล",
        definition: "การระบุความเกี่ยวเนื่องกันระหว่าง Entity สองกลุ่มใน Data Model เช่น หนึ่งต่อหนึ่ง, หนึ่งต่อกลุ่ม หรือกลุ่มต่อกลุ่ม",
        example: "หนึ่ง Series มีได้หลาย Episode Slot (One-to-Many) และหนึ่ง Episode Slot เชื่อมกับหนึ่ง Library Article (One-to-One)",
        howToUse: "อยากยืนยันความสัมพันธ์หรือ Relationship ระหว่างบทความกับสล็อตว่าเป็นแบบหนึ่งต่อหนึ่งเท่านั้นใช่ไหมครับ",
        category: "core"
    },
    {
        id: "v20",
        term: "Logic",
        translation: "ตรรกะระบบหรือเงื่อนไขเงื่อนงำ",
        definition: "กฎการทำงานหรือเงื่อนไขทางเทคนิคที่ควบคุมการประมวลผลและการแสดงผลของโปรแกรมคอมพิวเตอร์ตามข้อกำหนดธุรกิจ",
        example: "ถ้าบทความใน Episode Slot ยังอยู่ในสถานะ Draft หน้าเว็บหลักสาธารณะต้องไม่แสดงตอนนั้นเป็นอันขาด",
        howToUse: "ขอสรุป Logic หรือเงื่อนไขในการแสดงผลของสล็อตว่างอีกครั้ง เพื่อให้พัฒนาการตรวจสอบได้ถูกต้อง",
        category: "core"
    },
    {
        id: "v21",
        term: "Edge Case",
        translation: "กรณีขอบของการใช้งาน",
        definition: "เหตุการณ์จำลองที่มีโอกาสเกิดขึ้นค่อนข้างน้อย แต่หากเกิดแล้วอาจนำไปสู่ข้อผิดพลาดของระบบหากไม่ได้เตรียมพร้อมรองรับไว้",
        example: "ผู้เรียนกดสำเร็จภารกิจ (Complete Day 1) แต่ข้อมูลในเบราว์เซอร์โดนลบทั้งหมดโดยบังเอิญ",
        howToUse: "ถ้าแอดมินลบบทความหลักทิ้ง แต่สล็อตในซีรีส์ยังชี้มาอยู่ ระบบจะแสดงผลอย่างไร? นี่คือ Edge Case ที่เราต้องหาทางรับมือ",
        category: "process"
    },
    {
        id: "v22",
        term: "UAT (User Acceptance Testing)",
        translation: "การทดสอบเพื่อการยอมรับของผู้ใช้",
        definition: "การตรวจรับและทดลองเล่นระบบงานโดยผู้ใช้จริงหรือลูกค้า เพื่อยืนยันว่าซอฟต์แวร์ที่พัฒนาขึ้นมาตรงตามพฤติกรรมที่ตกลงกันไว้จริง",
        example: "คุณตั้มทดลองกดใช้งานหน้าบทเรียน คำศัพท์ และจดบันทึกแบบฝึกหัด เพื่อตรวจสอบว่าระบบงานลื่นไหลและเข้าใจได้ง่าย",
        howToUse: "เราอยากให้ตัวแทนผู้ใช้งานเข้ามาร่วมทดสอบ UAT ในสัปดาห์หน้าเพื่อตรวจเช็กว่าระบบตรงกับที่คาดหวังไว้ไหม",
        category: "process"
    },
    {
        id: "v23",
        term: "QA Evidence",
        translation: "หลักฐานการประกันคุณภาพซอฟต์แวร์",
        definition: "ภาพ เอกสาร หรือรายงานผลการทดสอบที่แสดงให้เห็นว่าระบบได้ผ่านกระบวนการประกันคุณภาพและการตรวจทานตามเกณฑ์เกณฑ์ที่เหมาะสมแล้ว",
        example: "บันทึกวิดีโอแสดงการใช้งานจริง ภาพบันทึกหน้าจอผลการผ่าน Lint และผลลัพธ์การ Build Production ที่สำเร็จลุล่วง",
        howToUse: "ทีม dev รบกวนส่ง QA Evidence หรือภาพแคปหน้าจอการทดสอบกับเงื่อนไขต่างๆ มาพร้อมการขอส่งมอบงานด้วยครับ",
        category: "process"
    },
    {
        id: "v24",
        term: "Change Request (CR)",
        translation: "การขอเปลี่ยนแปลงความต้องการ",
        definition: "กระบวนการอย่างเป็นทางการในการเสนอขอปรับปรุง เพิ่มเติม หรือยกเลิกข้อกำหนดและสเปกของระบบที่เคยลงนามตกลงกันไว้ก่อนแล้ว",
        example: "การขอเพิ่มระบบนับคะแนนและจัดเกรดสอบอัตโนมัติในภายหลังหลังจากที่เริ่มพัฒนา v0.1 ไปแล้ว",
        howToUse: "ความต้องการเพิ่มเติมตรงนี้ถือเป็น Change Request ที่กระทบขอบเขตเดิม ขออนุญาตนำไปพิจารณาเรื่องงบประมาณและเวลากันอีกที",
        category: "core"
    },
    {
        id: "v25",
        term: "Priority",
        translation: "ลำดับความสำคัญ",
        definition: "การจัดอันดับคุณค่า ความรีบด่วน หรือความจำเป็นของระบบหรือฟังก์ชันต่างๆ เพื่อให้ตัดสินใจพัฒนาสิ่งที่มีประโยชน์สูงสุดก่อน",
        example: "เนื้อหา Lesson Summary และ Vocab ถือเป็น Must Have ส่วนระบบสะสมเหรียญตรา (Badges) ถือเป็น Won't Have ใน v0.1",
        howToUse: "อยากให้ทีมช่วยกันมาจัด Priority ของความต้องการเหล่านี้ เพื่อให้มั่นใจว่าของสำคัญที่สุดจะได้พัฒนาเสร็จก่อน",
        category: "process"
    },
    {
        id: "v26",
        term: "Dependency",
        translation: "ความเกี่ยวเนื่องพึ่งพากันของงาน",
        definition: "ความสัมพันธ์ที่การทำงานหรือระบบชิ้นหนึ่งจะไม่สามารถดำเนินไปได้ หากปราศจากความคืบหน้าหรือความสมบูรณ์ของงานอีกชิ้นหนึ่ง",
        example: "การทำหน้าบทเรียน Classroom ย่อยต้องรอโครงสร้าง dynamic route `/workspaces/[workspace]/classroom` ทำงานเสร็จก่อน",
        howToUse: "งานเขียนคีย์โภชนาการนี้มี Dependency กับระบบ Library Article หลัก ดังนั้นต้องรอคลังบทความพัฒนาให้แล้วเสร็จก่อน",
        category: "process"
    },
    {
        id: "v27",
        term: "Assumption",
        translation: "ข้อสมมติฐานเบื้องต้น",
        definition: "ข้อมูล ปัจจัย หรือเงื่อนไขของระบบที่เราเชื่อหรืออนุมานว่าเป็นจริงในการออกแบบระบบ โดยอาจจะยังไม่มีหลักฐานเชิงประจักษ์ครบถ้วน",
        example: "สมมติว่าผู้ใช้งานสามารถอ่านภาษาไทยและเข้าใจศัพท์พื้นฐานทางเทคโนโลยีไอทีเบื้องต้นเป็นอย่างดีอยู่แล้ว",
        howToUse: "นี่คือข้อสมมติฐานหรือ Assumption ที่เราใช้ออกแบบ ขอจดบันทึกไว้ในเอกสารเพื่อเป็นจุดยืนร่วมกันของทีม",
        category: "core"
    },
    {
        id: "v28",
        term: "Constraint",
        translation: "ข้อจำกัดเชิงระบบ",
        definition: "ขอบเขต บังคับ หรือเงื่อนไขที่จำกัดความยืดหยุ่นในการตัดสินใจเลือกออกแบบ เช่น งบประมาณ เวลา หรือมาตรฐานเทคโนโลยี",
        example: "ห้ามติดตั้ง npm package เพิ่มเติมเด็ดขาด และห้ามแตะต้องโครงสร้างฐานข้อมูล SQL หรือ API เดิมของ WorkOS-Lite",
        howToUse: "ด้วย Constraint ด้านระยะเวลาส่งมอบงานที่สั้น เราจำเป็นต้องใช้ข้อมูล Static Mockup เป็นทางออกที่ดีที่สุดไปก่อน",
        category: "core"
    },
    {
        id: "v29",
        term: "Risk",
        translation: "ความเสี่ยงของโครงการ",
        definition: "เหตุการณ์หรือสภาวะที่ยังไม่เกิดขึ้น แต่อาจเกิดขึ้นได้และมีแนวโน้มจะส่งผลเชิงลบต่อระยะเวลา งบประมาณ หรือคุณภาพของผลิตภัณฑ์",
        example: "ผู้ใช้อาจปิดฟังก์ชัน LocalStorage ในเบราว์เซอร์ ทำให้ข้อมูลแบบฝึกหัดไม่สามารถบันทึกเก็บไว้ได้",
        howToUse: "ความเสี่ยงหลักของการใช้ LocalStorage คือผู้ใช้เปิดแท็บไม่ระบุตัวตน (Incognito) แล้วบันทึกแบบร่างไม่ได้",
        category: "people"
    },
    {
        id: "v30",
        term: "Impact",
        translation: "ผลกระทบเชิงระบบ",
        definition: "ระดับความรุนแรงหรือปริมาณผลลัพธ์ที่จะเกิดขึ้นจากการกระทำ ปัญหา ความเสี่ยง หรือฟีเจอร์ใหม่ที่ปรับใส่ลงในโครงการ",
        example: "การแยกสล็อตตอนและบทความออกจากกันจะช่วยลดเวลาในการกรอกข้อมูลของแอดมินลงได้ 80% และลดความสับสนในการจัดซีรีส์อย่างชัดเจน",
        howToUse: "ถ้าเราตัดฟังก์ชันตัวกรองนี้ออก จะมี Impact ต่อผู้ใช้งานประเภท Domain Expert ในการค้นหาอย่างไรบ้างครับ",
        category: "core"
    }
];

const DEFAULT_EXERCISE_TEMPLATE = `### [BA-EXERCISE-DAY-1] Problem Statement & Scope Definition

**1. คำแถลงปัญหา (Problem Statement):**
- ปัญหาที่พบ: [ระบุปัญหาของ Nature Series เช่น ค้นหาสูตรอาหารสารอาหารได้ช้า]
- เกิดขึ้นกับใคร: [ระบุ Stakeholder เช่น ผู้รักสุขภาพ หรือนักกำหนดอาหาร]
- ผลกระทบที่เกิดขึ้น: [ระบุความเสียหาย เช่น เสียเวลาในการคำนวณสารอาหารด้วยมือเปล่า]

**2. กระบวนการทำงานปัจจุบัน (As-Is Workflow):**
- ขั้นตอนที่ 1: เปิดตำราอาหารหรือเสิร์ชหาสูตรทั่วไป
- ขั้นตอนที่ 2: จดปริมาณวัตถุดิบลงกระดาษ
- ขั้นตอนที่ 3: เปิดตารางสารอาหารแล้วกดเครื่องคิดเลขคำนวณทีละรายการ (ใช้เวลาเฉลี่ย 15 นาที)

**3. กระบวนการทำงานในอนาคต (To-Be Workflow):**
- ขั้นตอนที่ 1: เข้าสู่ระบบค้นหาสารอาหารอัจฉริยะ (Nutrient Search Engine)
- ขั้นตอนที่ 2: ค้นหาตามสารอาหารที่ต้องการ เช่น "โปรตีนสูง"
- ขั้นตอนที่ 3: ระบบคำนวณวัตถุดิบและแสดงผลสารอาหารในคลิกเดียว (ใช้เวลาเฉลี่ย 10 วินาที)`;

interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

const QUIZ_DATA: QuizQuestion[] = [
    {
        id: "q1",
        question: "จากกรณีศึกษา Nature Series อะไรคือ Symptom (อาการภายนอกที่มองเห็น)?",
        options: [
            "ก. โครงสร้าง Data Model ในฐานข้อมูลไม่แยก Series Container และ Article",
            "ข. แอดมินจัดการลำดับของซีรีส์ยาก และผู้เรียนสับสนการปะปนของสล็อตตอนกับตัวบทความ",
            "ค. อัตราการร่วงหล่นของหน้าเว็บหลักของ Green Fineness สูงขึ้น"
        ],
        correctIndex: 1,
        explanation: "ถูกต้องครับ! Symptom คืออาการภายนอกที่สัมผัสหรือรู้สึกติดขัดได้โดยตรง ส่วนข้อ ก. คือ Root Cause และข้อ ค. คือ Business Impact หรือผลกระทบทางธุรกิจ"
    },
    {
        id: "q2",
        question: "ในกรณีศึกษา Nature Series อะไรคือ Root Cause (สาเหตุที่แท้จริง)?",
        options: [
            "ก. ข้อมูลสารอาหารของวัตถุดิบสะกดผิดพลาดและไม่มีมาตรฐานเดียวกัน",
            "ข. แอดมินต้องคอยจดปริมาณสารอาหารลงในเครื่องเขียนและกระดาษ",
            "ค. การออกแบบ Data Model ที่ไม่แยกแยะบทบาทความรับผิดชอบระหว่าง Series Container, Episode Slot และ Library Article"
        ],
        correctIndex: 2,
        explanation: "ถูกต้องครับ! Root Cause คือต้นตอเชิงระบบการจัดสรรข้อมูลที่สับสน การแก้ปัญหาที่ยั่งยืนคือต้องแก้ไข Data Model แยกความรับผิดชอบโครงสร้างข้อมูลทั้งสามส่วน"
    },
    {
        id: "q3",
        question: "Requirement (ความต้องการระบบ) แตกต่างจาก Proposed Solution (ข้อเสนอแนวทางแก้) อย่างไร?",
        options: [
            "ก. Requirement เน้นบอกว่า 'ระบบต้องทำสิ่งใดเพื่อแก้ปัญหา' ส่วน Solution อธิบาย 'วิธีการเชิงเทคนิคหรือหน้าจอในการลงมือทำมัน'",
            "ข. Requirement เขียนขึ้นโดยฝ่ายกฎหมายเท่านั้น ส่วน Solution เขียนโดยลูกค้าภายนอก",
            "ค. สองคำนี้ไม่มีข้อแตกต่างใดๆ เลยในการทำงานจริงของ BA"
        ],
        correctIndex: 0,
        explanation: "ถูกต้องที่สุด! Requirement โฟกัสไปที่ 'What' (สิ่งที่ต้องมีเพื่อบรรลุวัตถุประสงค์) ในขณะที่ Solution โฟกัสไปที่ 'How' (จะดีไซน์หรือพัฒนาขึ้นมาอย่างไรด้วยเทคนิค)"
    },
    {
        id: "q4",
        question: "Stakeholder บทบาทใด ที่ต้องการความชัดเจนของ Acceptance Criteria (เกณฑ์การตรวจรับ) มากที่สุดเพื่อไปเขียนโค้ดและเทสระบบ?",
        options: [
            "ก. ลูกค้าทั่วไปหรือผู้ชิมอาหารปลายทาง",
            "ข. ทีมวิศวกรผู้พัฒนาและทีมประกันคุณภาพ (Developer & QA Team)",
            "ค. ฝ่ายบัญชีและจัดซื้อของ Green Fineness"
        ],
        correctIndex: 1,
        explanation: "ถูกต้องครับ! Developer และ QA ต้องการเงื่อนไขตรวจรับที่เป็นเหตุเป็นผลที่ชัดเจน (Acceptance Criteria) เพื่อนำไปแปลงเป็น Logic ในระดับโค้ดและสร้างชุดทดสอบได้อย่างถูกต้องไม่คลุมเครือ"
    },
    {
        id: "q5",
        question: "หาก EP03 ของ Nature Series ยังมีสถานะเป็น Draft (ยังไม่เผยแพร่) การแสดงผลหน้าสาธารณะ (Public Page) ตามหลัก AC ที่ถูกต้องควรเป็นอย่างไร?",
        options: [
            "ก. แสดงภาพค้างหรือหมุนหน้าจอค้างตลอดเวลาเพื่อให้ผู้อ่านเข้าใจว่ากำลังปรับปรุง",
            "ข. ซ่อนสล็อตตอน EP03 ไปก่อนโดยไม่นำขึ้นแสดงในหน้าเว็บหลัก จนกว่าตัวบทความจะปรับเปลี่ยนเป็นสถานะ Published",
            "ค. โชว์ชื่อสล็อตตอน EP03 แต่เมื่อผู้ใช้คลิกเข้าไป ให้ขึ้นแจ้งเตือนข้อผิดพลาด 404 บั๊กที่ไม่ได้บันทึก"
        ],
        correctIndex: 1,
        explanation: "ยอดเยี่ยมครับ! เพื่อรักษาประสบการณ์ผู้ใช้งาน (User Experience) และความถูกต้องของข้อมูล สล็อตของตอนว่างหรือตอนที่เป็นร่างควรถูกซ่อนไปก่อนโดยอัตโนมัติ"
    }
];

export default function BaClassroomClient({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    
    // Core States
    const [currentDay, setCurrentDay] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<"lesson" | "vocab" | "case" | "phrases" | "tech" | "exercise" | "review">("lesson");
    
    // Interactive states preserved in localStorage
    const [masteredVocab, setMasteredVocab] = useState<string[]>([]);
    const [exerciseText, setExerciseText] = useState<string>("");
    const [day1Completed, setDay1Completed] = useState<boolean>(false);
    const [lastSaved, setLastSaved] = useState<string>("");
    
    // Interactive Quiz States
    const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
    const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

    // Tech Stack Working Checklist State (Persistent in localStorage)
    const [techChecklist, setTechChecklist] = useState<Record<string, boolean>>({});

    // UI states
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [copied, setCopied] = useState<boolean>(false);
    const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);
    const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
    const [showCompleteAnimation, setShowCompleteAnimation] = useState<boolean>(false);
    const [isMounted, setIsMounted] = useState<boolean>(false);

    // Hydration check and LocalStorage retrieval
    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== "undefined") {
            const savedVocab = localStorage.getItem("workos.classroom.vocab.mastered");
            if (savedVocab) {
                try {
                    setMasteredVocab(JSON.parse(savedVocab));
                } catch (e) {
                    console.error("Failed to parse vocab", e);
                }
            }
            
            const savedExercise = localStorage.getItem("workos.classroom.exercise.day1");
            setExerciseText(savedExercise || DEFAULT_EXERCISE_TEMPLATE);
            
            const completed = localStorage.getItem("workos.classroom.day1.completed") === "true";
            setDay1Completed(completed);

            const savedChecklist = localStorage.getItem("workos.classroom.tech.checklist");
            if (savedChecklist) {
                try {
                    setTechChecklist(JSON.parse(savedChecklist));
                } catch (e) {
                    console.error("Failed to parse checklist", e);
                }
            }
        }
    }, []);

    // Save mastered vocabulary to localStorage
    const handleToggleVocab = (vocabId: string) => {
        setMasteredVocab(prev => {
            const next = prev.includes(vocabId) 
                ? prev.filter(id => id !== vocabId) 
                : [...prev, vocabId];
            
            localStorage.setItem("workos.classroom.vocab.mastered", JSON.stringify(next));
            return next;
        });
    };

    // Save draft exercise
    const handleSaveDraft = () => {
        localStorage.setItem("workos.classroom.exercise.day1", exerciseText);
        const now = new Date().toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSaved(now);
        
        // Custom event to trigger animation/toast
        const toastEvent = new CustomEvent("task-updated");
        window.dispatchEvent(toastEvent);
    };

    // Reset draft exercise
    const handleResetDraft = () => {
        if (window.confirm("คุณต้องการรีเซ็ตแบบฝึกหัดกลับเป็นเทมเพลตเริ่มต้นใช่หรือไม่?")) {
            setExerciseText(DEFAULT_EXERCISE_TEMPLATE);
            localStorage.setItem("workos.classroom.exercise.day1", DEFAULT_EXERCISE_TEMPLATE);
            setLastSaved("");
        }
    };

    // Toggle complete day progress
    const handleToggleDayComplete = () => {
        const nextState = !day1Completed;
        setDay1Completed(nextState);
        localStorage.setItem("workos.classroom.day1.completed", String(nextState));
        
        if (nextState) {
            setShowCompleteAnimation(true);
            setTimeout(() => {
                setShowCompleteAnimation(false);
            }, 3000);
        }
    };

    // Copy exercise content to clipboard
    const handleCopyExercise = () => {
        navigator.clipboard.writeText(exerciseText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Copy conversation phrase to clipboard
    const handleCopyPhrase = (phrase: string) => {
        navigator.clipboard.writeText(phrase);
        setCopiedPhrase(phrase);
        setTimeout(() => setCopiedPhrase(null), 2000);
    };

    // Handle Quiz Answer click
    const handleSelectQuizAnswer = (questionId: string, optionIndex: number) => {
        setQuizAnswers(prev => ({
            ...prev,
            [questionId]: optionIndex
        }));
    };

    // Toggle Tech Checklist item
    const handleToggleChecklist = (itemId: string) => {
        setTechChecklist(prev => {
            const next = {
                ...prev,
                [itemId]: !prev[itemId]
            };
            localStorage.setItem("workos.classroom.tech.checklist", JSON.stringify(next));
            return next;
        });
    };

    // Vocab search and filter logic
    const filteredVocab = VOCAB_DATA.filter(item => {
        const matchesSearch = item.term.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              item.translation.includes(searchQuery) ||
                              item.definition.includes(searchQuery);
        
        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });

    if (!isMounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-theme-app text-neutral-400 font-bold uppercase tracking-widest text-sm">
                <span className="animate-spin mr-3 text-xl">🎓</span> Loading Classroom...
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-theme-app text-theme-primary transition-theme relative overflow-x-hidden">
            
            {/* Celebration overlay */}
            {showCompleteAnimation && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-fade-in text-white p-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-800 p-8 rounded-3xl border border-indigo-400/30 text-center max-w-md shadow-2xl scale-in duration-300 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/20">
                            <Sparkles size={40} className="text-yellow-300 animate-pulse" />
                        </div>
                        <h2 className="text-3xl font-black mb-3">ยินดีด้วยครับ! 🎉</h2>
                        <p className="text-indigo-100 text-sm font-medium mb-6">
                            คุณผ่านการทบทวนบทเรียนและส่งแบบฝึกหัดของ **Day 1 - Problem Statement** เรียบร้อยแล้ว สั่งสมทักษะ BA เพิ่มขึ้นอีกขั้น!
                        </p>
                        <button 
                            onClick={() => setShowCompleteAnimation(false)} 
                            className="px-6 py-2.5 bg-white text-indigo-700 rounded-xl text-sm font-black hover:bg-indigo-50 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            )}

            {/* Mock Task Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Link2 size={20} />
                                </div>
                                <h3 className="text-lg font-black text-theme-primary">ผูกแบบฝึกหัดเข้ากับ Task</h3>
                            </div>
                            <button 
                                onClick={() => setShowLinkModal(false)}
                                className="p-1.5 hover:bg-theme-hover rounded-lg text-theme-muted transition-colors"
                            >
                                <LucideIcons.X size={18} />
                            </button>
                        </div>
                        
                        <p className="text-xs text-theme-secondary mb-4 leading-relaxed">
                            ระบบกำลังทำงานในห้องเรียนโหมดจำลอง (Prototype Mode) จะไม่มีการเขียนข้อมูลลง API หลัก เพื่อรักษาความสะอาดของโครงการหลัก
                        </p>

                        <div className="bg-theme-panel p-4 rounded-2xl border border-theme-border/60 mb-6 space-y-3">
                            <div className="flex items-center justify-between text-xs border-b border-theme-border/30 pb-2">
                                <span className="font-bold text-theme-muted">TASK TARGET</span>
                                <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase">
                                    [BA-SPRINT-CLASSROOM-001]
                                </span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-theme-muted uppercase tracking-wider">เนื้อหาที่จะแนบไป</span>
                                <p className="text-xs font-mono text-theme-secondary line-clamp-3 bg-theme-card p-2 rounded-lg border border-theme-border/40">
                                    {exerciseText}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setShowLinkModal(false)}
                                className="flex-1 py-2.5 bg-theme-hover hover:brightness-95 text-theme-primary rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button 
                                onClick={() => {
                                    alert("จำลองสถานะ: แนบเนื้อหาแบบฝึกหัดเข้ากับ Task [BA-SPRINT-CLASSROOM-001] เรียบร้อยแล้ว!");
                                    setShowLinkModal(false);
                                }}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-black transition-all shadow-md active:scale-95"
                            >
                                ยืนยันการผูก Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Toolbar */}
            <header className="px-6 py-4 bg-theme-panel border-b border-theme-border flex items-center justify-between z-30 shadow-sm sticky top-0 transition-theme">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push(`/workspaces/${workspaceId}`)}
                        className="p-2 hover:bg-theme-hover rounded-xl text-theme-secondary transition-colors cursor-pointer group flex items-center gap-1"
                        title="กลับไปยังพื้นที่ทำงานหลัก"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-xs font-bold hidden sm:inline">Back</span>
                    </button>
                    <div className="w-px h-6 bg-theme-border hidden sm:block" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black text-theme-primary tracking-tight">BA Sprint Classroom</h1>
                            <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                v0.1
                            </span>
                        </div>
                        <p className="text-[10px] text-theme-muted font-bold uppercase tracking-widest">
                            Business Analyst Learning Lab
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        day1Completed 
                            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800/40 dark:text-green-300"
                            : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-300"
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${day1Completed ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                        <span>Day 1: {day1Completed ? "สำเร็จแล้ว (Completed)" : "กำลังเรียนรู้ (Reading Mode)"}</span>
                    </div>
                </div>
            </header>

            {/* Main scrollable body */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    
                    {/* Day Tabs / Lesson Day Selector */}
                    <div className="bg-theme-card border border-theme-border rounded-3xl p-2.5 shadow-sm transition-theme flex flex-wrap gap-1.5">
                        {[
                            { day: 1, title: "Day 1 — Problem Statement", active: true },
                            { day: 2, title: "Day 2 — Requirements Gathering", active: false },
                            { day: 3, title: "Day 3 — Stakeholder Management", active: false },
                            { day: 4, title: "Day 4 — Process Mapping (BPMN)", active: false },
                            { day: 5, title: "Day 5 — Sprint Review & Retro", active: false },
                        ].map((d) => (
                            <button
                                key={d.day}
                                onClick={() => {
                                    if (d.day === 1) {
                                        setCurrentDay(1);
                                    } else {
                                        alert(`บทเรียน ${d.title} จะเปิดให้เข้าใช้งานในเวอร์ชันถัดไป (v0.2) ตอนนี้อยู่ระหว่างจัดทำข้อมูลเรียนจำลอง`);
                                    }
                                }}
                                className={`flex-1 min-w-[160px] text-left px-4 py-2.5 rounded-2xl text-xs font-black transition-all duration-200 active:scale-98 cursor-pointer ${
                                    currentDay === d.day
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{d.title}</span>
                                    {d.day === 1 ? (
                                        day1Completed ? (
                                            <CheckCircle size={14} className="text-green-300 fill-green-600" />
                                        ) : (
                                            <Circle size={12} className="text-white/60" />
                                        )
                                    ) : (
                                        <span className="text-[9px] bg-theme-panel/20 text-theme-muted px-1.5 py-0.5 rounded-md uppercase font-bold">
                                            Locked
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Classroom Tab Selector */}
                    <div className="flex border-b border-theme-border/60 gap-1 overflow-x-auto pb-px custom-scrollbar">
                        {[
                            { id: "lesson", label: "1. Lesson Summary", icon: <Layers size={14} /> },
                            { id: "vocab", label: "2. Key Vocabulary", icon: <BookOpen size={14} /> },
                            { id: "case", label: "3. Case Study", icon: <Users size={14} /> },
                            { id: "phrases", label: "4. BA Phrases", icon: <LucideIcons.MessageSquare size={14} /> },
                            { id: "tech", label: "5. Tech Stack & Flow", icon: <LucideIcons.Cpu size={14} /> },
                            { id: "exercise", label: "6. Exercise Template", icon: <FileText size={14} /> },
                            { id: "review", label: "7. Review Status", icon: <Sparkles size={14} /> },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id as any)}
                                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                                    activeTab === t.id
                                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                        : "border-transparent text-theme-muted hover:text-theme-primary"
                                }`}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Contents */}
                    <div className="transition-all duration-300">
                        
                        {/* Tab 1: Lesson Summary */}
                        {activeTab === "lesson" && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                
                                {/* 6 Detailed Sections Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    
                                    {/* Section 1: BA Role in Software Team */}
                                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <Users size={18} />
                                            <h3 className="text-sm font-black uppercase tracking-wider">1. BA คือใครในทีมซอฟต์แวร์?</h3>
                                        </div>
                                        <h4 className="text-base font-black">สะพานเชื่อมมุมมองธุรกิจและการผลิตโค้ด</h4>
                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                            Business Analyst (BA) ไม่ใช่คนจดบันทึกการประชุม แต่เป็น **{"\""}สะพานเชื่อมสายตา{"\""}** 
                                            ระหว่างฝ่ายธุรกิจที่มีวิสัยทัศน์หรือความเดือดร้อน และฝ่ายโปรแกรมเมอร์ที่ต้องการสเปกทางระบบที่ชัดเจน 
                                            หน้าที่หลักของ BA คือการถอดรหัสความต้องการคลุมเครือของ Stakeholders ให้กลายมาเป็น Logic 
                                            และคุณสมบัติของซอฟต์แวร์ที่วัดผลได้ เพื่อควบคุมไม่ให้ขอบเขตโครงการบวม (Scope Creep)
                                        </p>
                                    </div>

                                    {/* Section 2: Problem vs Symptom vs Root Cause */}
                                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <HelpCircle size={18} />
                                            <h3 className="text-sm font-black uppercase tracking-wider">2. Symptom vs Problem vs Root Cause</h3>
                                        </div>
                                        <h4 className="text-base font-black">การค้นหาสาเหตุต้นตอที่แท้จริง</h4>
                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                            ความล้มเหลวส่วนใหญ่เกิดจากการสับสนระหว่างอาการไข้และโรคที่แท้จริง:
                                        </p>
                                        <ul className="text-xs text-theme-secondary space-y-1.5 list-disc pl-4 font-medium">
                                            <li><span className="font-bold text-amber-600">Symptom (อาการ)</span>: อาการภายนอกที่ผู้ใช้เจอบ่อย เช่น {"\""}สับสนการลำดับบทความ EP01/EP02{"\""}</li>
                                            <li><span className="font-bold text-red-500">Problem (ปัญหา)</span>: สิ่งกระทบเป้าหมายงาน เช่น {"\""}แอดมินจัดโครงซีรีส์ได้ยากลำบากมาก{"\""}</li>
                                            <li><span className="font-bold text-green-600">Root Cause (ต้นตอ)</span>: สาเหตุแท้จริงเชิงระบบ เช่น {"\""}Data Model ในระบบปะปนข้อมูลสล็อตกับบทความต้นฉบับเข้าด้วยกัน{"\""}</li>
                                        </ul>
                                    </div>

                                    {/* Section 3: Requirement vs Solution vs Feature */}
                                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <Layers size={18} />
                                            <h3 className="text-sm font-black uppercase tracking-wider">3. Requirement vs Solution vs Feature</h3>
                                        </div>
                                        <h4 className="text-base font-black">สามเหลี่ยมความเข้าใจสำหรับทีมออกแบบ</h4>
                                        <p className="text-xs text-theme-secondary leading-relaxed font-medium">
                                            เรามักจะเข้าใจว่า Feature คือ Requirement แต่จริงๆ แล้ว:
                                        </p>
                                        <div className="bg-theme-panel p-3.5 rounded-2xl border border-theme-border/50 text-[11px] space-y-2">
                                            <div>
                                                <span className="font-black text-indigo-600 block">💡 Requirement (ความต้องการระบบ - WHAT)</span>
                                                ระบบต้องแยกบริหารจัดการสล็อตลำดับตอน (Episode Slot) และเนื้อหาบทความ (Library Article) ออกจากกันชัดเจน
                                            </div>
                                            <div>
                                                <span className="font-black text-emerald-600 block">🛠️ Proposed Solution (วิธีการแก้ - HOW)</span>
                                                ออกแบบให้จัดลำดับสล็อตเปล่าได้ล่วงหน้า แล้วให้แอดมินกดผูกลิงก์บทความที่ Published แล้วทีหลัง
                                            </div>
                                            <div>
                                                <span className="font-black text-violet-600 block">📱 Feature (ลูกเล่นซอฟต์แวร์ - THE OUTCOME)</span>
                                                หน้าจอจำลองการ์ดแท็บข้อมูลการเรียน, แผงตัวกรองคำศัพท์เรียลไทม์ และปุ่มแนบ Task
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 4: Current State vs Future State */}
                                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <LucideIcons.TrendingUp size={18} />
                                            <h3 className="text-sm font-black uppercase tracking-wider">4. Current State vs Future State</h3>
                                        </div>
                                        <h4 className="text-base font-black">As-Is & To-Be: วาดแผนภูมิวิถีชีวิตผู้ใช้</h4>
                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                            การวิเคราะห์สิ่งที่เป็นอยู่ในปัจจุบัน (**As-Is Current State**) 
                                            ช่วยให้เราค้นพบจุดที่เกิดการสูญเสียทรัพยากร ความรู้สึกหงุดหงิด หรือบั๊กสะสมในฝั่งผู้ใช้งาน 
                                            เพื่อนำมาใช้ออกแบบขั้นตอนในฝัน (**To-Be Future State**) 
                                            สิ่งนี้จะช่วยสร้างคุณค่าธุรกิจและประหยัดเวลาการทำงานให้กับแอดมินหรือผู้อ่านได้อย่างจับต้องได้จริง
                                        </p>
                                    </div>

                                    {/* Section 5: Stakeholder Role vs Person */}
                                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <Users size={18} />
                                            <h3 className="text-sm font-black uppercase tracking-wider">5. Stakeholder Role vs Person</h3>
                                        </div>
                                        <h4 className="text-base font-black">บทบาทสำคัญกว่าชื่อรายบุคคล</h4>
                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                            ในการรวบรวม Requirement ของซอฟต์แวร์ เราต้องกำหนดตาม **บทบาทหน้าที่ (Role)** 
                                            และสิทธิ์ในการเข้าถึงระบบงาน ไม่ใช่อิงกับชื่อคนใดคนหนึ่ง (Person) เช่น การระบุความต้องการของ 
                                            **Domain Admin** หรือ **End-User Reader** ซึ่งบทบาทเหล่านี้จะคงอยู่คู่สถาปัตยกรรมซอฟต์แวร์เสมอ 
                                            แม้ว่าพนักงานภายในองค์กรจะมีการเปลี่ยนตำแหน่งงานหรือย้ายเข้าออกก็ตาม
                                        </p>
                                    </div>

                                    {/* Section 6: BA Day 1 Output */}
                                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-3">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <FileText size={18} />
                                            <h3 className="text-sm font-black uppercase tracking-wider">6. BA Day 1 Output</h3>
                                        </div>
                                        <h4 className="text-base font-black">สิ่งที่เป็นรูปธรรมที่ต้องส่งมอบในวันแรก</h4>
                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                            เมื่องานสเปกวันแรกเริ่มต้นขึ้น BA จะต้องส่งมอบเอกสารดังนี้:
                                        </p>
                                        <ul className="text-xs text-theme-secondary space-y-1.5 list-disc pl-4 font-medium">
                                            <li>**Problem Statement** (คำแถลงปัญหา) ที่มีเป้าหมายและผลกระทบที่วัดเป็นตัวเลขได้</li>
                                            <li>**Stakeholder Matrix** รายละเอียดสิทธิ์และหน้าที่ผู้เกี่ยวข้องเบื้องต้น</li>
                                            <li>**Initial Scope boundary** (ขอบเขตขีดความกั้นเบื้องต้น) ระบุสเปกในขอบเขตและนอกขอบเขต</li>
                                        </ul>
                                    </div>

                                </div>

                                {/* Comparison & Core Table */}
                                <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-4">
                                    <h3 className="text-base font-black">ตัวอย่างการวิเคราะห์เปรียบเทียบเชิงลึก (Day 1)</h3>
                                    <div className="overflow-x-auto border border-theme-border/60 rounded-2xl bg-theme-panel">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-theme-hover border-b border-theme-border text-theme-primary font-black uppercase tracking-wider">
                                                    <th className="p-3 w-1/2">Problem (ปัญหา / อาการไข้)</th>
                                                    <th className="p-3 w-1/2">Requirement (ความต้องการ / ยารักษา)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-theme-border/40 text-theme-secondary">
                                                <tr>
                                                    <td className="p-3 font-medium align-top leading-relaxed">
                                                        <div className="text-red-500 font-bold mb-1">❌ สิ่งที่เป็นความทรมานของผู้ใช้</div>
                                                        ผู้ใช้งานคำนวณแคลอรีและคุณค่าโภชนาการได้ช้า ต้องเปิดเว็บสลับไปมาและคำนวณด้วยเครื่องคิดเลขทีละรายการ
                                                    </td>
                                                    <td className="p-3 font-medium align-top leading-relaxed">
                                                        <div className="text-green-500 font-bold mb-1">✅ เงื่อนไขการบรรลุเป้าหมายที่ต้องการ</div>
                                                        ระบบค้นหาอาหารที่ป้อนชื่อหรือหมวดหมู่แล้ว ดึงค่าโปรตีน คาร์โบไฮเดรต และไขมัน มาแสดงผลและคำนวณรวมให้อัตโนมัติในหน้ารายงาน
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="p-3 font-medium align-top leading-relaxed">
                                                        <div className="text-red-500 font-bold mb-1">❌ โฟกัสที่เหตุการณ์ดั้งเดิม (Why)</div>
                                                        ทำไมข้อมูลการกำหนดอาหารของ Ava Farm จึงล่าช้า? เพราะข้อมูลอาหารสะกดผิดพลาดและไม่มีมาตรฐานเดียวกัน
                                                    </td>
                                                    <td className="p-3 font-medium align-top leading-relaxed">
                                                        <div className="text-green-500 font-bold mb-1">✅ โฟกัสที่ความสามารถของเครื่องมือ (What)</div>
                                                        หน้าระบบต้องมีตัวคัดกรองโภชนาการ และการล็อกรูปแบบชุดข้อมูลดั้งเดิมของ AVAONE ให้คงรูปไม่โดนแก้ไขตามใจชอบ
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Mindset Card */}
                                <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                        <Sparkles size={18} />
                                        <h3 className="text-base font-black uppercase tracking-wider">BA Mindset: The {"\""}Ask Why{"\""} Principle</h3>
                                    </div>
                                    
                                    <p className="text-xs text-theme-secondary leading-relaxed">
                                        เมื่อผู้ใช้งานบอกคุณว่า **{"\""}ผมต้องการให้ทำฟังก์ชันแชร์ปุ่มสีน้ำเงินแชร์สไลด์ขึ้นเฟซบุ๊ก{"\""}** 
                                        งานของคุณในฐานะ BA ไม่ใช่การจด Requirement ข้อนี้ลงกระดาษ แต่เป็นการถามคำถามนำเพื่อวิเคราะห์ปัญหา:
                                    </p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            { step: "1. ค้นหาเหตุผลดั้งเดิม", desc: "ผู้ใช้ต้องการแชร์เพื่อวัตถุประสงค์อะไร? เพื่อรายงานผลงาน หรือให้เพื่อนมาตรวจ?" },
                                            { step: "2. หาวิธีที่เรียบง่ายที่สุด", desc: "ปุ่มแชร์ส่งภาพสารอาหารข้ามแอปพลิเคชัน อาจแก้ปัญหาได้ตรงจุดกว่าการแชร์สไลด์ทั้งหมด" },
                                            { step: "3. ผลลัพธ์ที่สร้างความเชื่อมั่น", desc: "ผลงานส่งต่อลื่นไหล ไม่เกิดบั๊ก ข้อมูลปลอดภัย และนำมาใช้งานวัดผลการทำงานต่อได้ง่าย" }
                                        ].map((m, i) => (
                                            <div key={i} className="bg-theme-panel p-3.5 rounded-2xl border border-theme-border/50 text-xs">
                                                <span className="font-black text-indigo-600 block mb-1">{m.step}</span>
                                                <span className="text-theme-secondary leading-relaxed">{m.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Interactive Reflection Quiz (Collapsible Accordion) */}
                                <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-6">
                                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                        <LucideIcons.HelpCircle size={20} className="animate-pulse" />
                                        <div>
                                            <h3 className="text-base font-black text-theme-primary">🧠 Quick Knowledge Check: ทบทวนความเข้าใจ (Day 1)</h3>
                                            <span className="text-[10px] text-theme-muted font-bold block">คำถามทดสอบสถานการณ์จริง ลองตอบเพื่อทดสอบความแม่นยำก่อนเขียนข้อกำหนดจริง</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {QUIZ_DATA.map((q) => {
                                            const isExpanded = expandedQuiz === q.id;
                                            const answeredIndex = quizAnswers[q.id];
                                            const isAnswered = answeredIndex !== undefined;

                                            return (
                                                <div 
                                                    key={q.id} 
                                                    className="border border-theme-border/60 rounded-2xl overflow-hidden transition-all duration-200 bg-theme-panel"
                                                >
                                                    {/* Accordion Trigger Header */}
                                                    <button
                                                        onClick={() => setExpandedQuiz(isExpanded ? null : q.id)}
                                                        className="w-full flex items-center justify-between p-4 text-left font-black text-xs hover:bg-theme-hover text-theme-primary transition-colors cursor-pointer"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-5 h-5 bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-full flex items-center justify-center text-[10px]">
                                                                {q.id.replace("q", "Q")}
                                                            </span>
                                                            {q.question}
                                                        </span>
                                                        <span className="text-theme-muted">
                                                            {isExpanded ? <LucideIcons.ChevronUp size={16} /> : <LucideIcons.ChevronDown size={16} />}
                                                        </span>
                                                    </button>

                                                    {/* Accordion Content Panel */}
                                                    {isExpanded && (
                                                        <div className="p-4 border-t border-theme-border/30 bg-theme-card space-y-4 animate-slide-down">
                                                            <div className="space-y-2">
                                                                {q.options.map((option, idx) => {
                                                                    const isSelected = answeredIndex === idx;
                                                                    const isCorrectOption = idx === q.correctIndex;
                                                                    
                                                                    let btnClass = "bg-theme-panel border-theme-border text-theme-secondary hover:bg-theme-hover hover:border-theme-border";
                                                                    
                                                                    if (isAnswered) {
                                                                        if (isCorrectOption) {
                                                                            btnClass = "bg-green-50 border-green-300 text-green-700 dark:bg-green-950/20 dark:border-green-800/40 dark:text-green-300 font-bold";
                                                                        } else if (isSelected) {
                                                                            btnClass = "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/20 dark:border-red-800/40 dark:text-red-300 font-bold";
                                                                        } else {
                                                                            btnClass = "bg-theme-panel border-theme-border/40 text-theme-muted opacity-60";
                                                                        }
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => handleSelectQuizAnswer(q.id, idx)}
                                                                            disabled={isAnswered}
                                                                            className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between ${btnClass} ${!isAnswered ? 'cursor-pointer active:scale-99' : 'cursor-default'}`}
                                                                        >
                                                                            <span>{option}</span>
                                                                            {isAnswered && isCorrectOption && <CheckCircle size={16} className="text-green-600 flex-shrink-0 ml-2" />}
                                                                            {isAnswered && isSelected && !isCorrectOption && <LucideIcons.XCircle size={16} className="text-red-600 flex-shrink-0 ml-2" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Feedback Explanation */}
                                                            {isAnswered && (
                                                                <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                                                                    answeredIndex === q.correctIndex
                                                                        ? "bg-green-50/40 border-green-200/50 text-theme-primary dark:bg-green-950/5 dark:border-green-800/20"
                                                                        : "bg-amber-50/40 border-amber-200/50 text-theme-primary dark:bg-amber-950/5 dark:border-amber-800/20"
                                                                }`}>
                                                                    <div className="flex gap-2">
                                                                        <span className="font-black">
                                                                            {answeredIndex === q.correctIndex ? "🎉 คำตอบถูกต้อง:" : "💡 ลองคิดอีกนิดหรือศึกษาเฉลย:"}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-1 text-theme-secondary font-medium">{q.explanation}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Key Vocabulary */}
                        {activeTab === "vocab" && (
                            <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
                                
                                {/* Search and filters */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-theme-border/40 pb-4">
                                    <div className="relative flex-1 max-w-md">
                                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="ค้นหาคำศัพท์ คำแปล หรือคำอธิบาย..."
                                            className="w-full pl-10 pr-4 py-2 border border-theme-input-border bg-theme-input text-sm rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                    
                                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                                        {[
                                            { id: "all", label: "คำศัพท์ทั้งหมด" },
                                            { id: "core", label: "Core BA" },
                                            { id: "process", label: "Process & Flow" },
                                            { id: "people", label: "People" }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setCategoryFilter(tab.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                                    categoryFilter === tab.id
                                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                                                        : "hover:bg-theme-hover text-theme-muted"
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Vocabulary Cards list */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredVocab.length > 0 ? (
                                        filteredVocab.map(item => {
                                            const isMastered = masteredVocab.includes(item.id);
                                            return (
                                                <div 
                                                    key={item.id}
                                                    className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                                                        isMastered 
                                                            ? "bg-green-50/20 border-green-200 dark:bg-green-950/5 dark:border-green-800/40"
                                                            : "bg-theme-panel border-theme-border/80 hover:border-theme-border"
                                                    }`}
                                                >
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base font-black text-theme-primary">{item.term}</span>
                                                                <span className="text-[10px] text-theme-muted bg-theme-hover px-2 py-0.5 rounded-md font-bold capitalize">
                                                                    {item.category}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleToggleVocab(item.id)}
                                                                className={`p-1.5 rounded-xl transition-all active:scale-90 cursor-pointer ${
                                                                    isMastered 
                                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                                                        : "bg-theme-card text-theme-muted border border-theme-border hover:text-indigo-600 hover:border-indigo-200"
                                                                }`}
                                                                title={isMastered ? "เรียนรู้แล้ว" : "ทำเครื่องหมายว่าเข้าใจแล้ว"}
                                                            >
                                                                {isMastered ? <CheckCircle size={16} /> : <Circle size={16} />}
                                                            </button>
                                                        </div>
                                                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                                                            {item.translation}
                                                        </p>
                                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                                            {item.definition}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2 pt-2 border-t border-theme-border/30">
                                                        <div className="text-[11px] leading-relaxed text-theme-muted italic">
                                                            <span className="font-bold uppercase not-italic text-theme-primary block mb-0.5">ตัวอย่างจาก Nature Series:</span>
                                                            {"\""}{item.example}{"\""}
                                                        </div>

                                                        {/* How to use with team container */}
                                                        <div className="bg-indigo-50/20 dark:bg-indigo-950/10 p-2.5 rounded-xl border border-indigo-100/30 dark:border-indigo-900/20 text-[11px] leading-relaxed text-theme-secondary">
                                                            <span className="font-black text-indigo-600 dark:text-indigo-400 block mb-0.5">💬 ใช้คุยกับทีม:</span>
                                                            {"\""}{item.howToUse}{"\""}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-2 text-center py-10 text-theme-muted font-bold text-xs bg-theme-panel rounded-2xl border border-theme-border/60">
                                            ไม่พบคำศัพท์ตามที่คุณค้นหาในคลังสารบบ v0.1
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Case Study (Standard 8-Column Grid) */}
                        {activeTab === "case" && (
                            <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center gap-2 border-b border-theme-border/40 pb-4">
                                    <Sparkles className="text-indigo-600" size={20} />
                                    <div>
                                        <h3 className="text-base font-black text-theme-primary">Case Study: Nature Series Nutrient Planner</h3>
                                        <span className="text-[10px] text-theme-muted font-bold block">วิเคราะห์กรณีศึกษาตัวอย่างด้วยกรอบมาตรฐาน 8 ช่อง (BA 8-Column Standard Matrix)</span>
                                    </div>
                                </div>

                                <p className="text-xs text-theme-secondary leading-relaxed">
                                    กรณีศึกษาการแก้ไขข้อผิดพลาดระบบหลังบ้านของ **Nature Series** 
                                    ที่แยกความสับสนปนเปกันระหว่างตู้เก็บสารบัญตอนกับบทความจริงออกเป็นโครงสร้างที่ใช้งานง่ายและลดขอบเขตบวม:
                                </p>

                                {/* 8-Column Standard Grid layout */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        {
                                            id: 1,
                                            title: "1. Situation (สถานการณ์)",
                                            desc: "Green Fineness ต้องการสร้างซีรีส์บทความสุขภาพชุด \"Nature Series\" เพื่อให้ผู้อ่านศึกษาและคำนวณสารอาหารอย่างเป็นระบบเป็นลำดับทีละตอนอย่างเข้าใจง่าย",
                                            theme: "border-l-blue-500 bg-blue-50/10"
                                        },
                                        {
                                            id: 2,
                                            title: "2. Problem (ปัญหาหลัก)",
                                            desc: "แอดมินจัดการปรับแต่งตอนได้ลำบาก ระบบบริหารเดิมปะปนข้อมูลตู้เก็บซีรีส์ (Series), ลำดับสล็อตตอน (Episode Slot) และเนื้อหาบทความ (Library Article) เป็นกองเดียวกันหมด",
                                            theme: "border-l-red-500 bg-red-50/10"
                                        },
                                        {
                                            id: 3,
                                            title: "3. Root Cause (สาเหตุแท้จริง)",
                                            desc: "ข้อมูลระดับโมเดล (Data Model) ไม่ได้รับการออกแบบให้แยกบทบาทความรับผิดชอบอย่างเป็นเอกเทศระหว่าง container (ตัวเก็บชุดตอน), slot (จองลำดับ) และ article (บทความจริง)",
                                            theme: "border-l-amber-500 bg-amber-50/10"
                                        },
                                        {
                                            id: 4,
                                            title: "4. Requirement (ความต้องการ)",
                                            desc: "ระบบบริหารต้องแบ่งแยกแผงจัดการ (1) Series Container สำหรับสร้างซีรีส์ (2) Episode Slot สำหรับจัดลำดับ และ (3) Library Article คลังเก็บบทความกลางออกจากกัน",
                                            theme: "border-l-indigo-500 bg-indigo-50/10"
                                        },
                                        {
                                            id: 5,
                                            title: "5. Proposed Solution (แนวทางออกแบบ)",
                                            desc: "แอดมินจัดโครงซีรีส์และสล็อตจองตำแหน่งว่างไว้ล่วงหน้า จากนั้นใช้วิธีค้นหาบทความกลางที่มีสถานะเป็น Published แล้วจากระบบ Library นำมาผูกโยงเข้ากับสล็อตอย่างรวดเร็ว",
                                            theme: "border-l-emerald-500 bg-emerald-50/10"
                                        },
                                        {
                                            id: 6,
                                            title: "6. Acceptance Criteria (เกณฑ์ UAT)",
                                            desc: "หากสล็อตตอน (Episode Slot) ใดก็ตามยังไม่ได้ทำการจับคู่บทความ หรือบทความยังมีสถานะเป็น Draft ระบบในส่วนหน้าจอฝั่งสาธารณะ (Public View) จะต้องทำการซ่อนสล็อตนั้นโดยอัตโนมัติ",
                                            theme: "border-l-violet-500 bg-violet-50/10"
                                        },
                                        {
                                            id: 7,
                                            title: "7. UAT Evidence (หลักฐานการตรวจ)",
                                            desc: "ผลการทดสอบ: การเพิ่ม EP03 ในฐานะ Draft ในหลังบ้าน สล็อตที่สามไม่นำมาแสดงผลขึ้นในส่วนหน้าจอสารบัญซีรีส์ฝั่งผู้ใช้งานทั่วไป ระบบรักษาความสะอาดของอินเตอร์เฟสได้สำเร็จ 100%",
                                            theme: "border-l-teal-500 bg-teal-50/10"
                                        },
                                        {
                                            id: 8,
                                            title: "8. Business Value (คุณค่าทางธุรกิจ)",
                                            desc: "แอดมินใช้เวลาในการเรียบเรียงลำดับซีรีส์ลดลง 80% ป้องกันข้อผิดพลาดบทความว่างเปล่าหน้าบ้าน และลดอัตราการกดปิดแอปพลิเคชัน (Drop-off Rate) ได้อย่างมีนัยสำคัญ",
                                            theme: "border-l-pink-500 bg-pink-50/10"
                                        }
                                    ].map((col) => (
                                        <div 
                                            key={col.id} 
                                            className={`p-4 border border-theme-border/60 border-l-4 rounded-2xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${col.theme}`}
                                        >
                                            <div>
                                                <h4 className="text-xs font-black text-theme-primary mb-2 uppercase tracking-wide border-b border-theme-border/20 pb-1.5">{col.title}</h4>
                                                <p className="text-[11px] text-theme-secondary leading-relaxed font-medium">{col.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tab 4: BA Conversation Phrases */}
                        {activeTab === "phrases" && (
                            <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between border-b border-theme-border/40 pb-4">
                                    <div className="flex items-center gap-2">
                                        <LucideIcons.MessageSquare className="text-indigo-600" size={20} />
                                        <div>
                                            <h3 className="text-base font-black text-theme-primary">💬 BA Developer Conversation Phrases</h3>
                                            <span className="text-[10px] text-theme-muted font-bold block">ชุดคำและประโยคทองคำสำหรับใช้เจรจา ออกแบบระบบ และกั้นขอบเขตงานกับทีมพัฒนา (Dev Team)</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-theme-secondary leading-relaxed">
                                    ในการคุยงานกับโปรแกรมเมอร์ ดีไซเนอร์ หรือบริษัทพัฒนาซอฟต์แวร์ 
                                    การใช้ภาษาที่แบ่งหมวดหมู่ตรรกะได้ชัดเจนจะช่วยป้องกันความสับสนและยกระดับความเป็นมืออาชีพของคุณ 
                                    คุณสามารถคลิกเลือกเพื่อคัดลอกประโยคไปใช้สื่อสารได้ทันที:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        {
                                            category: "1. การคัดแยกวัตถุประสงค์ (Focus & Alignment)",
                                            phrases: [
                                                { text: "ขอแยกวิเคราะห์ก่อนนะครับว่าข้อความนี้เป็น Problem (ปัญหาเดิม), Requirement (ความต้องการระบบ) หรือ Proposed Solution (แนวทางออกแบบที่อยากได้)", use: "ใช้ถามเมื่อ Stakeholder นำเสนอหลายอย่างสลับกันจนทีมพัฒนาสับสน" },
                                                { text: "ฟังก์ชันนี้สร้างขึ้นมาเพื่อแก้ปัญหากระดูกสันหลังข้อใดของผู้ใช้ และสอดคล้องกับเป้าหมายธุรกิจอย่างไรบ้างครับ", use: "ใช้ตรวจสอบจุดยืนของ Feature ใหม่ที่จะทำเพื่อให้มั่นใจว่าคุ้มค่าเงินทุน" }
                                            ]
                                        },
                                        {
                                            category: "2. กระบวนการทำงานและภาพรวม (Workflow & State)",
                                            phrases: [
                                                { text: "ตอนนี้ As-Is (กระบวนการทำงานปัจจุบัน) ของแอดมินเป็นอย่างไร และ To-Be (กระบวนการใหม่ในฝัน) ที่ต้องการคืออะไรเพื่อนำมาเปรียบเทียบความคุ้มค่า", use: "ใช้เพื่อเปรียบเทียบลำดับขั้นตอนการทำงานทั้งเก่ายืนยันผลลัพธ์ที่จะเปลี่ยนไป" },
                                                { text: "มีสถานะหรือสเตตัสอะไรบ้างในแต่ละขั้นตอนการส่งมอบบทความ เพื่อให้ระบบตรวจสอบความสมบูรณ์ได้ครบทุก Flow", use: "ใช้ให้โปรแกรมเมอร์เขียนตรรกะ State Engine ได้สมบูรณ์" }
                                            ]
                                        },
                                        {
                                            category: "3. แหล่งอ้างอิงข้อมูล (Source of Truth)",
                                            phrases: [
                                                { text: "ข้อมูลดิบชุดไหนควรเป็น Source of Truth (แหล่งอ้างอิงหลักที่ถูกต้องที่สุด) เพื่อให้มั่นใจว่าจะไม่มีการสร้างข้อมูลที่ซ้ำซ้อนขึ้นมาในระบบ", use: "ใช้คุมงานออกแบบฐานข้อมูลของทีมโปรแกรมเมอร์ไม่ให้พังในอนาคต" },
                                                { text: "ตารางสล็อตตอนหรือคลังบทความกลางที่จะให้เป็นตัวถือสิทธิ์ข้อมูลหลักตัวจริง", use: "ใช้สถาปนาสิทธิ์ในฝั่งสถาปัตยกรรมข้อมูลเพื่อความเป็นหนึ่งเดียว" }
                                            ]
                                        },
                                        {
                                            category: "4. เกณฑ์ตรวจรับงาน (Acceptance Criteria)",
                                            phrases: [
                                                { text: "เกณฑ์การยอมรับงานหรือ Acceptance Criteria ในกรณีนี้คืออะไรบ้างครับ ถ้าทีมพัฒนาสร้างเสร็จแล้วเราจะรู้ได้อย่างไรว่าทำงานได้ถูกต้อง", use: "ใช้กำหนดสเปกและเตรียมเขียนเคสตรวจรับงานอย่างชัดเจน" },
                                                { text: "ถ้าผลลัพธ์ UAT ออกมาเป็นตามเงื่อนไขนี้ (เช่น ซ่อนตอนที่ยังเป็น Draft) ถือว่าระบบผ่านการทดสอบยอมรับงานใช่ไหมครับ", use: "ใช้สรุปเงื่อนไขทางธุรกิจที่ตกลงร่วมกันกับผู้รับสิทธิ์ตรวจรับ" }
                                            ]
                                        },
                                        {
                                            category: "5. การกำหนดขอบเขตงาน (Scope & Constraints)",
                                            phrases: [
                                                { text: "เราต้องการระบุข้อกำหนดในการเทสระบบให้ชัดเจน หรือมีอะไรบ้างที่จะขอจัดไว้ให้เป็น Out of Scope ของ Sprint นี้เพื่อความรวดเร็วในการเปิดตัว", use: "ใช้ปฏิเสธการขอฟีเจอร์พร่ำเพรื่อเพื่อคุมระยะเวลาส่งของโครงการ" },
                                                { text: "เพื่อไม่ให้โครงการติดหล่ม ขอยึดขอบเขตตามสเปกนี้นะครับ ส่วนการตั้งค่าปุ่มแชร์ขยับไปพัฒนาในรอบหน้า", use: "ใช้เพื่อเจรจากับลูกค้าเมื่อเกิดคำร้องขอสิ่งใหม่ที่เกินงบ" }
                                            ]
                                        },
                                        {
                                            category: "6. การประเมินผลกระทบ (Impact & Edge Cases)",
                                            phrases: [
                                                { text: "หากเราปรับปรุง Logic หรือลบข้อมูลบทความหลักตรงนี้ทิ้ง จะส่งผลกระทบ (Impact) ต่อหน้าจอซีรีส์หรือลำดับตอนใดบ้างครับ", use: "ใช้ตรวจสอบความเสี่ยงเชิงสถาปัตยกรรมระบบก่อนมีการปรับปรุงโค้ดหลังบ้าน" },
                                                { text: "พฤติกรรมของระบบใน Edge Case ต่างๆ เช่น ข้อมูลลบครึ่งๆ กลางๆ ควรตอบสนองต่อผู้ใช้งานอย่างไรเพื่อความปลอดภัย", use: "ใช้สอบถามเงื่อนไขที่เกิดขึ้นยากแต่จะทำให้แอปล่มถ้าไม่คุม" }
                                            ]
                                        }
                                    ].map((cat, i) => (
                                        <div key={i} className="bg-theme-panel p-5 rounded-2xl border border-theme-border/60 space-y-3">
                                            <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide border-b border-theme-border/20 pb-2">{cat.category}</h4>
                                            
                                            <div className="space-y-3">
                                                {cat.phrases.map((phrase, pi) => {
                                                    const isPhraseCopied = copiedPhrase === phrase.text;
                                                    return (
                                                        <div key={pi} className="p-3 bg-theme-card rounded-xl border border-theme-border/40 hover:border-theme-border/80 transition-all space-y-2 relative group">
                                                            <p className="text-xs font-black text-theme-primary leading-relaxed pr-8">
                                                                {"\""}{phrase.text}{"\""}
                                                            </p>
                                                            <p className="text-[10px] text-theme-muted font-medium italic">
                                                                📌 {phrase.use}
                                                            </p>
                                                            <button 
                                                                onClick={() => handleCopyPhrase(phrase.text)}
                                                                className="absolute top-2.5 right-2.5 p-1.5 hover:bg-theme-hover rounded-lg text-theme-muted hover:text-indigo-600 transition-all cursor-pointer"
                                                                title="คัดลอกประโยค"
                                                            >
                                                                {isPhraseCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tab 5: Tech Stack & Dev Workflow (NEW SECTION) */}
                        {activeTab === "tech" && (
                            <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-8 animate-in fade-in duration-300">
                                
                                {/* Header banner */}
                                <div className="flex items-center gap-2 border-b border-theme-border/40 pb-4">
                                    <LucideIcons.Cpu className="text-indigo-600" size={20} />
                                    <div>
                                        <h3 className="text-base font-black text-theme-primary">Tech Stack & Dev Workflow</h3>
                                        <span className="text-[10px] text-theme-muted font-bold block">คู่มือสะพานความรู้เชิงเทคนิคสำหรับ Business Analyst ในการเข้าใจและคุยงานกับทีมพัฒนา</span>
                                    </div>
                                </div>

                                {/* 1. Web App Development Flow */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <Layers size={16} />
                                        <h4 className="text-sm font-black uppercase tracking-wider">1. Web App Development Flow (ขั้นตอนการพัฒนาเว็บแอปพลิเคชัน)</h4>
                                    </div>
                                    <p className="text-xs text-theme-secondary leading-relaxed">
                                        นี่คือกระบวนการพัฒนาซอฟต์แวร์จากจุดเริ่มต้นทางธุรกิจไปจนถึงการใช้งานจริงบนคลาวด์ เพื่อให้ BA มองเห็นภาพรวมการสร้างฟีเจอร์อย่างเป็นขั้นตอน:
                                    </p>
                                    
                                    <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900/60 pl-6 ml-3 space-y-6">
                                        {[
                                            { step: "1. Business Need / Problem", label: "ระบุความเดือดร้อนของผู้ใช้หรือเป้าหมายธุรกิจอย่างชัดเจนเชิงสถิติ" },
                                            { step: "2. Requirement / Workflow", label: "ถอดสเปกออกมาเป็น User Story, Flow ลำดับงาน และ Acceptance Criteria ตรวจงาน" },
                                            { step: "3. Data Model / Database Design", label: "กำหนดความสัมพันธ์ข้อมูล โครงสร้าง Attribute (Schema) และจัดเตรียมตารางจัดเก็บ" },
                                            { step: "4. Backend / API Logic", label: "เขียนโค้ดหลังบ้านจัดการตรวจสอบความปลอดภัย การเขียนตรรกะธุรกิจ และสปริง Route API รับส่งข้อมูล JSON" },
                                            { step: "5. Frontend / UI", label: "ตัดหน้าจอ วาดโครงสร้าง HTML หน้าตาเว็บให้ตรงตาม UI Design และประกอบ Component หลัก" },
                                            { step: "6. State / Interaction", label: "ควบคุมพฤติกรรมโต้ตอบ เช่น กดปุ่มกรอง ลิงก์เก็บประจุร่างลงเบราว์เซอร์ แสดงผลแจ้งเตือน Toast" },
                                            { step: "7. Styling / Responsive / Theme", label: "ตกแต่งรายละเอียดความพรีเมียมด้วย CSS (Tailwind) คุมมิติหน้าจอและเฉดสีการสลับ Dark Theme" },
                                            { step: "8. Testing / QA", label: "ตรวจทานไวยากรณ์ด้วย Linter, ทดลอง QA ตรวจรับ UAT เงื่อนไขขอบเขตต่างๆ เพื่อจับผิดบั๊กก่อนคอมไพล์" },
                                            { step: "9. Build", label: "สั่งคอมไพล์รวบรวม โค้ดจะถูกแปรรูปและบีบอัดลดขนาดเป็นไฟล์หน้าบ้านประสิทธิภาพสูงพร้อมรัน (Production-ready)" },
                                            { step: "10. Deploy", label: "ส่งมอบไฟล์ Build ขึ้นไปเผยแพร่และทำงานจริงบน Cloud Server เพื่อให้มี URL สาธารณะใช้งานได้จริง" },
                                            { step: "11. Monitor / Improve", label: "ตรวจสุขภาพความเร็วหน้าเว็บ ตรวจจับอัตราการไหลออก และวิเคราะห์เพื่อวางแผนพัฒนา Sprint ถัดไป" }
                                        ].map((item, idx) => (
                                            <div key={idx} className="relative group">
                                                {/* Bullet indicator */}
                                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-theme-card border-2 border-indigo-500 flex items-center justify-center text-[8px] font-black text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                    {idx + 1}
                                                </div>
                                                <h5 className="text-xs font-black text-theme-primary">{item.step}</h5>
                                                <p className="text-[11px] text-theme-secondary mt-0.5 leading-relaxed font-medium">{item.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Tool Stack Map */}
                                <div className="space-y-4 pt-4 border-t border-theme-border/30">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <LucideIcons.Sliders size={16} />
                                        <h4 className="text-sm font-black uppercase tracking-wider">2. WorkOS-Lite Tool Stack Map (แผนผังเครื่องมือพัฒนาของระบบ)</h4>
                                    </div>
                                    <p className="text-xs text-theme-secondary leading-relaxed">
                                        ทำความเข้าใจบทบาทของแต่ละเทคโนโลยีที่ทีมพัฒนาใช้ประกอบร่างในการพัฒนาโครงการ WorkOS-Lite เพื่อให้ BA สื่อสารกับ Dev ได้เข้าใจตรงกัน:
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[
                                            { name: "Next.js", role: "App Framework / Server Routing", desc: "แกนหลักของแอป ทำหน้าที่จัดการโครงสร้างโฟลเดอร์หน้าเพจ, รัน Backend API ในตัว และทำระบบ Build ปลายทางให้เร็วและมีมาตรฐาน SEO ที่ยอดเยี่ยม" },
                                            { name: "React", role: "UI Library / Components", desc: "หัวใจหลักหน้าบ้าน ทำหน้าที่แยกชิ้นส่วนของหน้าจอออกเป็นชิ้นเลโก้ย่อย (Components) และมีหน้าที่เปลี่ยนภาพดีไซน์สไตล์เป็นของจริงที่คลิกเปลี่ยนสถานะโต้ตอบได้" },
                                            { name: "TypeScript", role: "Static Type Safety Check", desc: "ภาษาครอบทับ JavaScript ที่คอยบังคับตรวจสอบชนิดของข้อมูลในระบบให้ปลอดภัย เช่น ป้องกันไม่ให้อ่านเลขในช่องอักษร ช่วยดักบั๊กตั้งแต่ตอนพิมพ์สเปกโค้ด" },
                                            { name: "Node.js", role: "JavaScript Runtime", desc: "ตัวรันไทม์จำลองสภาพแวดล้อมที่ทำให้ภาษา JavaScript สามารถรันทำงานทำงานหลังบ้านได้ ไม่จำกัดอยู่เฉพาะแค่ในตัวเบราว์เซอร์ผู้ใช้อีกต่อไป" },
                                            { name: "npm", role: "Package Manager / Scripts", desc: "คลังสคริปต์กลาง คอยมีหน้าที่บริหารจัดการดาวน์โหลด ปรับปรุง จัดหาชุดห้องสมุดของบุคคลภายนอก และรันคำสั่งเบื้องหลัง เช่น npm run build, npm run lint" },
                                            { name: "Tailwind CSS", role: "Utility CSS Styling", desc: "ตัวตกแต่งหน้าตาดีไซน์ระดับโมเดิร์น ใช้รหัสคำสั้นๆ คอยกำกับทำให้สร้าง Layout, แอนิเมชัน และสีสันที่พรีเมียมได้รวดเร็วโดยแทบไม่ต้องเขียนคลาส CSS ยาวๆ" },
                                            { name: "Lucide React", role: "Vector Icon Pack", desc: "คลังภาพสัญญะและเวกเตอร์ไอคอนยุคใหม่ คมชัดและไม่กินกำลังการโหลดเพจ เพิ่มความพรีเมียมให้กับการ์ด ปุ่ม และเมนูในแอปทั้งหมด" },
                                            { name: "SQLite / better-sqlite3", role: "Relational Local DB", desc: "ฐานข้อมูลเก็บไฟล์เดี่ยวแบบไร้เซิร์ฟเวอร์ ให้ความเร็วและความเบาหวิวสูงสุด บันทึกข้อมูล Task และ Project ต่างๆ ของ WorkOS-Lite ได้อย่างแม่นยำและเสถียร" },
                                            { name: "Zod", role: "Schema Validation", desc: "ตัวควบคุมตรวจสอบข้อมูลขาเข้าของ API เพื่อเป็นปราการด่านแรกดักจับสแปม ข้อมูลแปลกปลอม หรือข้อมูลไม่ครบถ้วน ก่อนจะก้าวเข้าไปบันทึกในฐานข้อมูลจริง" },
                                            { name: "NextAuth", role: "Security Authentication", desc: "ระบบรักษาความปลอดภัย ยืนยันตัวตนคนล็อกอินเข้าระบบ ปกป้องข้อมูลส่วนตัวระดับบริหารไม่ให้คนนอกเจาะลึก" },
                                            { name: "Tiptap", role: "Rich Text Editor Frame", desc: "โครงสร้างจัดแต่งข้อความของ Writing Desk ช่วยให้ผู้ใช้เขียนร่าง ตกแต่งฟอนต์ และเก็บผลลัพธ์เป็นโครงสร้าง Markdown ได้อย่างอิสระ" },
                                            { name: "Git", role: "Version Control Engine", desc: "กลไกถ่ายภาพประวัติการสร้างโค้ด คอยควบคุมและจดจำส่วนต่างของสเปกไฟล์ ป้องกันการทำสเปกทับซ้อนเมื่อทำงานเป็นทีม" },
                                            { name: "Codex / Antigravity / ATGT", role: "Dev Autonomous Agent", desc: "หุ่นยนต์ผู้ช่วยพัฒนาเชิงลึกของ Google DeepMind คอยตรวจเช็กความสะอาด ตรวจสอบ Linter คอมไพล์งาน และปิดช่องบั๊กอย่างแม่นยำ" }
                                        ].map((tool, idx) => (
                                            <div key={idx} className="p-4 bg-theme-panel border border-theme-border/60 rounded-2xl flex flex-col justify-between space-y-2 hover:border-theme-border transition-all">
                                                <div>
                                                    <div className="flex justify-between items-start gap-1">
                                                        <span className="text-xs font-black text-theme-primary">{tool.name}</span>
                                                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-md uppercase tracking-wider">{tool.role}</span>
                                                    </div>
                                                    <p className="text-[11px] text-theme-secondary mt-2 leading-relaxed font-medium">{tool.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Glossary by Layer */}
                                <div className="space-y-4 pt-4 border-t border-theme-border/30">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <BookOpen size={16} />
                                        <h4 className="text-sm font-black uppercase tracking-wider">3. Glossary by Layer (พจนานุกรมคำศัพท์แยกตามชั้นระบบ)</h4>
                                    </div>
                                    <p className="text-xs text-theme-secondary leading-relaxed">
                                        คำศัพท์เชิงเทคนิคที่ BA ต้องรู้โดยแบ่งออกตามระดับชั้นการประยุกต์ใช้งานซอฟต์แวร์จริง:
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            {
                                                title: "📋 Requirement & Scope",
                                                items: [
                                                    { term: "Functional Req", def: "คุณลักษณะที่ระบบต้องทำได้ชัดเจน เช่น ปุ่มต้องกดแชร์บทความได้" },
                                                    { term: "Out of Scope", def: "ข้อกำหนดที่ตกลงกันว่าจะไม่ทำในเฟสนี้เพื่อรักษาเวลาส่งมอบ" }
                                                ]
                                            },
                                            {
                                                title: "🗄️ Database Layer",
                                                items: [
                                                    { term: "Database Schema", def: "แผนผังการเชื่อมสัมพันธ์และสเปกโครงสร้างของตารางข้อมูลทั้งหมด" },
                                                    { term: "Prisma Schema", def: "ไฟล์แผนผัง ORM ที่เขียนเชื่อมตาราง Database เข้ากับโค้ดฝั่ง Server" }
                                                ]
                                            },
                                            {
                                                title: "⚙️ Backend / API Layer",
                                                items: [
                                                    { term: "API Route", def: "เส้นทางปลายทาง URL บน Server (เช่น /api/tasks) ที่รับและส่ง JSON" },
                                                    { term: "JSON payload", def: "โครงสร้างข้อมูลแบบกล่องข้อความอักษรที่ Front-end ส่งไปขอใช้บริการ" }
                                                ]
                                            },
                                            {
                                                title: "🖥️ Frontend / UI Layer",
                                                items: [
                                                    { term: "Component", def: "ส่วนประกอบหน้าเว็บอิสระที่แยกออกมาเพื่อให้นำกลับมาใช้ซ้ำได้" },
                                                    { term: "DOM", def: "แผนผังตัวแทนสิ่งของหน้าจอที่เบราว์เซอร์ใช้อ่านและสั่งปาดหน้าดีไซน์" }
                                                ]
                                            },
                                            {
                                                title: "🎨 Styling Layer",
                                                items: [
                                                    { term: "Tailwind Utility", def: "รหัสคำสั่งตกแต่งสไตล์สำเร็จรูปป้อนคลาสตรงหน้าจอเพื่อประหยัดเวลา" },
                                                    { term: "Responsive grid", def: "ระบบจัดสัดส่วนหน้ารองรับจอขนาดต่างๆ หด/ขยายได้สวยงาม" }
                                                ]
                                            },
                                            {
                                                title: "💾 State / Storage Layer",
                                                items: [
                                                    { term: "Local State", def: "ตัวแปรจดจำความจริงของชิ้น Component หากลบหรือปิดแท็บจะรีเซ็ตใหม่" },
                                                    { term: "localStorage", def: "หน่วยความจำกึ่งถาวรฝังติดเบราว์เซอร์ผู้ใช้ ไม่หายไปเมื่อรีเฟรชหน้า" }
                                                ]
                                            },
                                            {
                                                title: "🧪 Testing Layer",
                                                items: [
                                                    { term: "Linter (ESLint)", def: "บอทผู้ตรวจเช็กไวยากรณ์ในการเขียนพิมพ์สเปกโค้ดไม่ให้พังก่อนคอมไพล์" },
                                                    { term: "UAT QA Scenario", def: "สถานการณ์จำลองขั้นตอนการใช้งานจริงเพื่อการทดสอบตรวจรับงาน" }
                                                ]
                                            },
                                            {
                                                title: "🚀 Deploy Layer",
                                                items: [
                                                    { term: "Production Build", def: "ผลลัพธ์บีบอัดโค้ดพร้อมรันใช้งานจริงบนตัวเว็บฝั่งเซิร์ฟเวอร์" },
                                                    { term: "Cloud Hosting", def: "พื้นที่ฝากเว็บไซต์บนอินเทอร์เน็ตเพื่อให้ผู้ใช้อื่นพิมพ์ URL เข้าถึงแอป" }
                                                ]
                                            },
                                            {
                                                title: "🌿 Git Layer",
                                                items: [
                                                    { term: "Commit History", def: "รายการประวัติการบันทึกส่วนต่างภาพถ่ายโค้ด ป้องกันการแก้งานสลับขั้ว" },
                                                    { term: "Repository (Repo)", def: "แหล่งพิกัดจองโค้ดหลักของโครงการทั้งหมดที่จะใช้ทำงานร่วมกัน" }
                                                ]
                                            }
                                        ].map((layer, idx) => (
                                            <div key={idx} className="bg-theme-panel p-4.5 rounded-2xl border border-theme-border/60 space-y-3">
                                                <h5 className="text-xs font-black text-indigo-600 dark:text-indigo-400">{layer.title}</h5>
                                                <div className="space-y-2">
                                                    {layer.items.map((item, iidx) => (
                                                        <div key={iidx} className="text-[11px] leading-relaxed">
                                                            <strong className="text-theme-primary block">{item.term}</strong>
                                                            <span className="text-theme-secondary font-medium">{item.def}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. Next.js / React / Tailwind Basics */}
                                <div className="space-y-4 pt-4 border-t border-theme-border/30">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <Sparkles size={16} />
                                        <h4 className="text-sm font-black uppercase tracking-wider">4. Next.js / React / Tailwind Basics (ความรู้พื้นฐานฉบับพกพา)</h4>
                                    </div>
                                    <p className="text-xs text-theme-secondary leading-relaxed">
                                        ไกด์ความรู้โครงสร้างและการใช้งานแบบง่ายเพื่อให้ BA เข้าใจโครงสร้างเมื่อคุยกับ Dev หรือต้องอ่านไฟล์โค้ดเบื้องต้น:
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                                        {[
                                            { concept: "page.tsx", desc: "ตัวชี้วัดหน้าจอในระบบ Next.js เมื่อต้องการเพิ่มหน้าเพจใหม่ จะต้องสร้างโฟลเดอร์และสร้างไฟล์ page.tsx นี้ขึ้นมา" },
                                            { concept: "route / dynamic route", desc: "เส้นทางการเดินทางเข้าสู่หน้า เช่น /docs หรือ dynamic /workspaces/[workspace] ที่แปลงวงเล็บเป็น ID ข้อมูลได้หลากหลาย" },
                                            { concept: "Component (คอมโพเนนต์)", desc: "ชิ้นเลโก้หน้าจอ เช่น ปุ่ม การ์ด ที่ห่อสไตล์และพฤติกรรมโต้ตอบไว้ข้างในเพื่อให้นำกลับมาวางใหม่ได้หลายจุด" },
                                            { concept: "client vs server component", desc: "Client ทำงานคำนวณบนเบราว์เซอร์ผู้ใช้เพื่อโต้ตอบเร็ว (ใช้ use client) ส่วน Server ทำหน้าที่เตรียมข้อมูลดั้งเดิมก่อนส่งจอ" },
                                            { concept: "useState (React Hook)", desc: "กลไกReactจดจำตัวแปรสถานะ เช่น คีย์สถานะ checkbox เมื่อตัวแปรนี้เปลี่ยน หน้าจอจะอัปเดตสไตล์วาดภาพตามทันที" },
                                            { concept: "useEffect (React Hook)", desc: "ตารางประมวลผลพิเศษที่สั่งทำงานหลังจากจอวาดเสร็จ เช่น การดึงค่าเก็บประจุร่างแบบฝึกหัดจาก localStorage เมื่อเปิดเว็บ" },
                                            { concept: "className / Tailwind class", desc: "ช่องว่างจ้างงานคลาสสไตล์ เช่น rounded-3xl, bg-theme-card คอยปั้นสี มิติความพรีเมียมให้กิ่งไม้หน้าจอสวยงาม" }
                                        ].map((item, idx) => (
                                            <div key={idx} className="p-3.5 bg-theme-panel rounded-xl border border-theme-border/60 leading-relaxed">
                                                <strong className="text-indigo-600 dark:text-indigo-400 block mb-1">{item.concept}</strong>
                                                <span className="text-theme-secondary font-medium text-[11px] block">{item.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 5. BA-to-Dev Working Checklist */}
                                <div className="space-y-4 pt-4 border-t border-theme-border/30">
                                    <div className="flex items-center gap-2 text-indigo-600">
                                        <CheckCircle size={16} className="animate-pulse" />
                                        <h4 className="text-sm font-black uppercase tracking-wider">5. Interactive BA-to-Dev Working Checklist (เช็คลิสต์ตรวจงานก่อนส่งมอบ)</h4>
                                    </div>
                                    <p className="text-xs text-theme-secondary leading-relaxed">
                                        เช็คลิสต์จดความพร้อมของคุณตั้มในฐานะ BA เพื่อใช้ตรวจสอบความสมบูรณ์ของ Requirement ก่อนส่งมอบไปให้โปรแกรมเมอร์ลงมือเขียนโค้ดจริง (ข้อมูลได้รับการจดจำในเบราว์เซอร์ของคุณตั้มโดยอัตโนมัติ):
                                    </p>

                                    <div className="bg-theme-panel p-6 rounded-2xl border border-theme-border/60 space-y-3.5">
                                        {[
                                            { id: "c1", title: "1. Problem ชัดไหม? (Symptom vs Problem vs Root cause ชัดเจนและแยกออกจากกันได้)", desc: "มีคำแถลงปัญหาที่มีตัวเลขเป้าหมายธุรกิจชัดเจน ไม่ใช่กระโดดไปฟีเจอร์เลย" },
                                            { id: "c2", title: "2. Scope / Non-scope ชัดไหม? (ขอบข่ายขอบกั้นงานมีลายลักษณ์อักษร)", desc: "ระบุครบว่างานชิ้นใดทำในเฟสนี้ และสิ่งใดจะจัดให้เป็น Out of Scope เพื่อประหยัดเวลา" },
                                            { id: "c3", title: "3. User Flow ชัดไหม? (ขั้นตอนวิถีชีวิตผู้ใช้ As-Is และ To-Be)", desc: "มีลำดับการคลิกและขั้นตอนพฤติกรรมการตัดสินใจแสดงการเชื่อมต่อข้ามหน้าจอชัดเจน" },
                                            { id: "c4", title: "4. Data Source / Source of Truth ชัดไหม? (แหล่งถือความถูกต้องข้อมูล)", desc: "สรุปแน่ชัดว่าฐานข้อมูลตำแหน่งใดมีสิทธิ์แก้ไขข้อมูลหลักเพื่อไม่ให้ข้อมูลซ้ำพัง" },
                                            { id: "c5", title: "5. UI States ชัดไหม? (สถานะหน้าจอครบรสชาติ)", desc: "ระบุความต้องการหน้าจอช่วงโหลดค้าง (Loading), สล็อตตอนว่างเปล่า (Empty) หรือระบบล่ม (Error)" },
                                            { id: "c6", title: "6. Edge Case มีไหม? (เตรียมรองรับพฤติกรรมขอบขอบที่มีโอกาสพัง)", desc: "คิดทางแก้งานเมื่อเกิดเหตุผิดปรกติ เช่น ผู้ใช้พิมพ์ข้อมูลคาไว้แล้วปิดแอปกระทันหัน" },
                                            { id: "c7", title: "7. Acceptance Criteria มีไหม? (เกณฑ์ตัดสินความสมบูรณ์ที่เทสได้)", desc: "เงื่อนไข UAT ที่จับต้องได้ ไม่เขียนว่า 'ดีไซน์สวยขึ้น' แต่เขียนว่า 'ถ้า EP3 ดราฟต์อยู่ หน้ารวมต้องไม่แสดง'" },
                                            { id: "c8", title: "8. Lint / Build / Manual QA ต้องผ่านไหม? (ความสะอาดทางโค้ดเชิงลึก)", desc: "การันตีกฎข้อบังคับ Linter 0 Errors และคอมไพล์ผ่านร้อยเปอร์เซ็นต์ด้วย QA Evidence" },
                                            { id: "c9", title: "9. Git Status / Diff ต้องตรวจไหม? (กรองคราบส่วนต่างการแก้งาน)", desc: "เช็กไฟล์ที่แก้ไขจริง ป้องกันการแนบงาน Refactor รกรุงรังนอกกรอบเข้าไปใน Branch" }
                                        ].map((item) => {
                                            const isChecked = !!techChecklist[item.id];
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleToggleChecklist(item.id)}
                                                    className="w-full text-left p-3.5 bg-theme-card border border-theme-border/40 hover:border-theme-border rounded-xl transition-all flex items-start gap-3 active:scale-[0.99] cursor-pointer"
                                                >
                                                    <span className="mt-0.5 flex-shrink-0">
                                                        {isChecked ? (
                                                            <CheckCircle size={18} className="text-green-600 fill-green-100 dark:fill-green-950/20" />
                                                        ) : (
                                                            <Circle size={18} className="text-theme-muted" />
                                                        )}
                                                    </span>
                                                    <div className="space-y-1">
                                                        <span className={`text-xs font-black block ${isChecked ? 'line-through text-theme-muted' : 'text-theme-primary'}`}>
                                                            {item.title}
                                                        </span>
                                                        <span className="text-[11px] text-theme-secondary font-medium leading-relaxed block">
                                                            {item.desc}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Completion Stats banner */}
                                    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40 rounded-2xl text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                        <span>ความพร้อมส่งมอบ Requirement ของคุณตั้ม:</span>
                                        <span className="font-black bg-indigo-100 dark:bg-indigo-900 px-3 py-1 rounded-xl">
                                            {Object.values(techChecklist).filter(Boolean).length} / 9 ประเด็น
                                        </span>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* Tab 6: Exercise Template */}
                        {activeTab === "exercise" && (
                            <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between border-b border-theme-border/40 pb-4">
                                    <div className="flex items-center gap-2">
                                        <FileText className="text-indigo-600" size={20} />
                                        <div>
                                            <h3 className="text-base font-black text-theme-primary">Day 1 Exercise Workspace</h3>
                                            <span className="text-[10px] text-theme-muted font-bold block">กรอกคำตอบของคุณตามกรณีศึกษาลงในฟอร์มจำลองเพื่อพัฒนาทักษะ</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={handleCopyExercise}
                                            className="px-3 py-1.5 bg-theme-panel hover:bg-theme-hover border border-theme-border rounded-xl text-xs font-black text-theme-secondary transition-all flex items-center gap-1.5 cursor-pointer"
                                            title="คัดลอกร่างแบบฝึกหัดทั้งหมดเข้า Clipboard"
                                        >
                                            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                            {copied ? "คัดลอกแล้ว!" : "Copy Clean"}
                                        </button>
                                        <button 
                                            onClick={handleResetDraft}
                                            className="px-3 py-1.5 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300 rounded-xl text-xs font-black transition-all cursor-pointer hover:brightness-95"
                                        >
                                            Reset Draft
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider block">
                                        แบบร่างแบบฝึกหัดของคุณ (ข้อมูลจัดเก็บอัตโนมัติในเบราว์เซอร์)
                                    </label>
                                    <textarea
                                        value={exerciseText}
                                        onChange={(e) => setExerciseText(e.target.value)}
                                        rows={12}
                                        className="w-full p-4 font-mono text-xs text-theme-secondary bg-theme-panel border border-theme-input-border rounded-2xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-theme"
                                    />
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                                    <div className="text-xs text-theme-muted">
                                        {lastSaved && (
                                            <span className="flex items-center gap-1">
                                                <CheckCircle size={14} className="text-green-600" />
                                                บันทึกร่างลงเบราว์เซอร์แล้วเมื่อ {lastSaved}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveDraft}
                                            className="px-5 py-2.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 hover:bg-indigo-100/80 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Save size={14} />
                                            บันทึกแบบร่าง (Save Draft)
                                        </button>
                                        
                                        <button
                                            onClick={() => setShowLinkModal(true)}
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
                                        >
                                            <Link2 size={14} />
                                            Link / Append to Task
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 7: Review Status */}
                        {activeTab === "review" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                                <div className="md:col-span-2 space-y-6">
                                    {/* Primary Review Status Tracker */}
                                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-6">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <Sparkles size={18} />
                                            <h3 className="text-base font-black uppercase tracking-wider">Day 1 Completion Metrics</h3>
                                        </div>

                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                            นี่คือรายงานวิเคราะห์ความสำเร็จของการเรียนรู้และความก้าวหน้าของบทเรียน **Day 1 — Problem Statement** 
                                            แบบเรียลไทม์ที่จัดทำโดยระบบจำลองของห้องเรียน:
                                        </p>

                                        {/* Status items grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            
                                            {/* Metrics: Vocab */}
                                            <div className="bg-theme-panel p-4 rounded-2xl border border-theme-border/60">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black text-theme-muted uppercase tracking-wider">คลังคำศัพท์ที่เรียนรู้แล้ว</span>
                                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                                                        {masteredVocab.length} / {VOCAB_DATA.length} คำ
                                                    </span>
                                                </div>
                                                <div className="w-full bg-theme-hover h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className="bg-indigo-600 h-full transition-all duration-500" 
                                                        style={{ width: `${(masteredVocab.length / VOCAB_DATA.length) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-theme-muted font-bold block mt-2">
                                                    {masteredVocab.length === VOCAB_DATA.length ? "🌟 ยอดเยี่ยมมาก! คุณเรียนรู้ครบทุกคำศัพท์แล้ว" : "อ่านและสลับสถานะเพิ่มเติมได้ในแท็บ Vocabulary"}
                                                </span>
                                            </div>

                                            {/* Metrics: Exercise */}
                                            <div className="bg-theme-panel p-4 rounded-2xl border border-theme-border/60">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black text-theme-muted uppercase tracking-wider">สถานะแบบฝึกหัดคำแถลงปัญหา</span>
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                                        exerciseText !== DEFAULT_EXERCISE_TEMPLATE 
                                                            ? "bg-green-50 text-green-700"
                                                            : "bg-amber-50 text-amber-700"
                                                    }`}>
                                                        {exerciseText !== DEFAULT_EXERCISE_TEMPLATE ? "ร่างแล้ว" : "ใช้ค่าเริ่มต้น"}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-theme-hover h-2 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-500 ${exerciseText !== DEFAULT_EXERCISE_TEMPLATE ? 'bg-green-600' : 'bg-amber-400'}`}
                                                        style={{ width: exerciseText !== DEFAULT_EXERCISE_TEMPLATE ? '100%' : '30%' }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-theme-muted font-bold block mt-2">
                                                    {exerciseText !== DEFAULT_EXERCISE_TEMPLATE ? "✓ ตรวจพบความคืบหน้าการร่างเนื้อหาเฉพาะของตัวผู้ใช้เอง" : "กรอกข้อมูลและบันทึกในแท็บ Exercise Template"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Submit action */}
                                        <div className="border-t border-theme-border/40 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-sm font-black">เสร็จสิ้นภารกิจการทบทวนความรู้ใช่หรือไม่?</h4>
                                                <p className="text-theme-muted text-[11px] leading-relaxed">
                                                    ทำความเข้าใจบทเรียน เรียนรู้คำศัพท์ และทดลองเขียนแบบฝึกหัดเสร็จสมบูรณ์แล้ว ให้คลิกเปลี่ยนสถานะได้ที่นี่
                                                </p>
                                            </div>
                                            
                                            <button
                                                onClick={handleToggleDayComplete}
                                                className={`px-6 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-md flex items-center gap-2 cursor-pointer ${
                                                    day1Completed
                                                        ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                                                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                                                }`}
                                            >
                                                {day1Completed ? (
                                                    <>
                                                        <LucideIcons.RotateCcw size={14} />
                                                        ยกเลิกสถานะ Day 1
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle size={14} />
                                                        ทำเครื่องหมาย: สำเร็จภารกิจ Day 1
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Task Information card */}
                                    <div className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                            <FileText size={18} />
                                            <h3 className="text-sm font-black uppercase tracking-wider">ArborDesk Linked Task</h3>
                                        </div>
                                        
                                        <p className="text-xs text-theme-secondary leading-relaxed">
                                            แบบทดสอบต้นแบบนี้อ้างอิงกับ Task โครงสร้างหลักในระบบดังนี้:
                                        </p>

                                        <div className="p-3.5 bg-theme-panel rounded-2xl border border-theme-border/60 text-xs space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-black text-theme-primary">[BA-SPRINT-CLASSROOM-001]</span>
                                                <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                                                    In Progress
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-theme-secondary">
                                                Build BA Classroom Prototype v0.1
                                            </p>
                                            <div className="text-[10px] text-theme-muted font-medium border-t border-theme-border/30 pt-2 flex items-center justify-between">
                                                <span>กระบวนการจำลอง:</span>
                                                <span className="font-bold text-indigo-600">Local Testing</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium encouragement quote */}
                                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-indigo-900/30 space-y-2 relative overflow-hidden">
                                        <span className="text-xs font-black text-indigo-400 block tracking-widest uppercase">BA Quote</span>
                                        <p className="text-xs italic leading-relaxed text-indigo-100">
                                            {"\""}A problem well stated is a problem half solved.{"\""}
                                        </p>
                                        <span className="text-[10px] font-bold block text-indigo-300 text-right">— Charles Kettering</span>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}
