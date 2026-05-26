"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, 
    Sparkles, 
    Calendar, 
    Clock, 
    CheckCircle, 
    AlertTriangle, 
    Info, 
    BookOpen, 
    User, 
    Compass, 
    HelpCircle, 
    Save, 
    RefreshCw,
    Activity,
    ClipboardList,
    ShieldAlert,
    BookMarked,
    Flame,
    History,
    MessageSquare,
    Zap,
    HeartHandshake
} from "lucide-react";

import { MOCK_PERSONAL_PROFILE } from "@/lib/types/astro-strategy";

// Mock timing outcomes dataset based on Category
interface TimingResult {
    rating: "excellent" | "fair" | "warning" | "postpone";
    ratingLabel: string;
    badgeColor: string;
    astroReading: string;
    strategicLogic: string;
    preparations: string[];
    risks: string[];
    finalRecommendation: string;
}

const TIMING_TEMPLATES: Record<string, TimingResult[]> = {
    finance: [
        {
            rating: "excellent",
            ratingLabel: "เหมาะสมมาก (ส่งเสริมความมั่นคง)",
            badgeColor: "bg-violet-950/40 text-violet-300 border border-violet-500/20",
            astroReading: "ตามความเชื่อที่ได้รับการบอกเล่า ในเชิงสัญลักษณ์ช่วงเวลานี้เป็นช่วงที่ดาวการค้ารูปธรรมโคจรทำมุมประสานพลังกับดาวแห่งความมั่นคง ส่งผลให้เกิดโครงสร้างพลังงานที่เหนียวแน่นและสามารถสะสมผลประโยชน์ในระยะยาวได้ดี",
            strategicLogic: "สอดคล้องกับช่วงเปลี่ยนผ่านรอบงบประมาณประจำสัปดาห์ ซึ่งระบบสภาพคล่องของคู่ค้าส่วนใหญ่กำลังมีความพร้อม และความตึงเครียดของตลาดค่อนข้างต่ำ เหมาะแก่การตัดสินใจเรื่องตัวเลขสำคัญ",
            preparations: [
                "ตรวจสอบเอกสารเงื่อนไขดอกเบี้ยและการแบ่งปันผลกำไรอย่างละเอียดถี่ถ้วน",
                "เตรียมเงินสำรองสภาพคล่องเพื่อรองรับรอบสัญญาขั้นต่ำ",
                "วางเป้าหมายผลตอบแทนขั้นต่ำ (Floor Rate) ในการต่อรองให้ชัดเจน"
            ],
            risks: [
                "การละเลยไม่ตรวจสอบบันทึกธุรกรรมย้อนหลังของคู่ค้าอย่างละเอียด",
                "การประเมินสภาพคล่องตึงตัวเกินไปจนพลาดโอกาสลงทุนต่อเนื่อง"
            ],
            finalRecommendation: "เป็นจังหวะที่ยอดเยี่ยมในการลงนามสัญญาทางการเงินระยะยาว การกู้ยืมเพื่อการลงทุน หรือการปิดดีลพันธมิตรที่มีมูลค่าสูง"
        },
        {
            rating: "warning",
            ratingLabel: "ควรระวัง (ระวังข้อพิพาทด้านผลตอบแทน)",
            badgeColor: "bg-amber-950/40 text-amber-200 border border-amber-500/20",
            astroReading: "ตามความเชื่อที่ได้รับการบอกเล่า ในเชิงสัญลักษณ์ช่วงเวลานี้กระแสพลังงานมีความผันผวนและอาจเกิดจุดหักเหที่รวดเร็ว การตัดสินใจทางด้านการเงินที่อาศัยเพียงความรู้สึกร่วมมีโอกาสสูงที่จะเผชิญสภาวะฝุ่นตลบในภายหลัง",
            strategicLogic: "เป็นสัปดาห์ที่มีการประกาศดัชนีเศรษฐกิจสำคัญภายนอก และคู่ค้าส่วนใหญ่กำลังประเมินท่าทีของตลาดใหม่ การตัดสินใจด้านการเงินขนาดใหญ่อาจเผชิญเงื่อนไขที่เปลี่ยนแปลงไปภายหลัง",
            preparations: [
                "จัดเตรียมแผนป้องกันความเสี่ยง (Hedging) หรือเงื่อนไขยืดหยุ่น in สัญญาชำระเงิน",
                "ทบทวนรายงานเครดิตและความน่าเชื่อถือทางการเงินของคู่ค้าอีกครั้ง",
                "เตรียมทางออกฉุกเฉินหากต้องยกเลิกดีลกลางคัน"
            ],
            risks: [
                "การตกลงปากเปล่าเรื่องดอกเบี้ยหรือค่าธรรมเนียมที่ไม่มีหลักฐานบันทึก",
                "การลงนามในสัญญาชำระเงินโดยไม่ได้ระบุเงื่อนไขการปรับอัตราแลกเปลี่ยน/ดอกเบี้ย"
            ],
            finalRecommendation: "ชะลอการโอนเงินก้อนใหญ่หรือการเซ็นสัญญาผูกพันระยะยาวออกไปก่อนอย่างน้อย 3-5 วันทำการ เพื่อรอดูทิศทางความชัดเจนของดัชนีตลาดการเงินหลัก"
        }
    ],
    negotiate: [
        {
            rating: "excellent",
            ratingLabel: "เหมาะสมมาก (สร้างพันธมิตร/เจรจาราบรื่น)",
            badgeColor: "bg-violet-950/40 text-violet-300 border border-violet-500/20",
            astroReading: "ตามความเชื่อที่ได้รับการบอกเล่า ในเชิงสัญลักษณ์ช่วงเวลานี้พลังงานของดาวสื่อสารและดาวศิลปศาสตร์ประสานงานกันอย่างลงตัว ส่งเสริมการทำความเข้าใจร่วมกัน การลดความขัดแย้ง และการสร้างความพึงพอใจทั้งสองฝ่าย",
            strategicLogic: "ตรงกับช่วงกลางสัปดาห์ที่ผู้ร่วมเจรจามีภาระงานเร่งด่วนน้อยที่สุด ทำให้มีความพร้อมในการเปิดใจรับฟังข้อเสนอใหม่ๆ และการอภิปรายเงื่อนไขเป็นไปอย่างสร้างสรรค์และไม่รีบร้อน",
            preparations: [
                "จัดทำข้อเสนอทางเลือก (Option A / Option B) เพื่อความยืดหยุ่นในการตัดสินใจร่วมกัน",
                "ทบทวนเป้าหมายร่วมกันและจุดยืนที่ยอมรับได้ทั้งสองฝ่าย (BATNA) ก่อนเริ่มการประชุม",
                "จัดเตรียมบรรยากาศการประชุมที่ผ่อนคลายและเอื้อต่อการสนทนาอย่างกัลยาณมิตร"
            ],
            risks: [
                "การเสนอเงื่อนไขที่ตึงตัวจนเกินไปจนปิดโอกาสในการประนีประนอมในจุดเล็กๆ",
                "การไม่บันทึกความตกลงเบื้องต้นในแต่ละหัวข้อทำให้ต้องกลับมาคุยซ้ำจุดเดิม"
            ],
            finalRecommendation: "เป็นเวลาที่ดีที่สุดในการนัดหมายเจรจาสัญญาสำคัญ การเปิดตัวพันธมิตรทางธุรกิจ หรือการไกล่เกลี่ยข้อพิพาทที่ค้างคามานาน"
        },
        {
            rating: "postpone",
            ratingLabel: "ควรเลื่อนออกไป (ระวังการสื่อสารคลาดเคลื่อน)",
            badgeColor: "bg-rose-950/40 text-rose-300 border border-rose-500/20",
            astroReading: "ตามความเชื่อที่ได้รับการบอกเล่า ในเชิงสัญลักษณ์ช่วงเวลานี้พลังงานของธาตุไฟค่อนข้างแรงและร้อนรนเป็นพิเศษ การสื่อสารและเจรจาพูดคุยมีโอกาสเกิดอารมณ์กระทบกระทั่งหรือถ้อยคำที่สร้างความเข้าใจคลาดเคลื่อนได้สูง",
            strategicLogic: "ช่วงปลายสัปดาห์หรือวันที่มีกำหนดส่งมอบงานใหญ่ขององค์กร ซึ่งคู่เจรจาอาจเผชิญความเครียดสะสมจากงานส่วนตัว ทำให้ระดับความอดทนในการต่อรองต่ำลงเป็นพิเศษ",
            preparations: [
                "หลีกเลี่ยงการใช้น้ำเสียงเชิงตำหนิหรือกดดันเป้าหมายส่วนตัวของคู่สนทนา",
                "เตรียมร่างบันทึกการคุยอย่างรัดกุมเพื่อกันความจำคลาดเคลื่อน",
                "ปรึกษาผู้ใหญ่หรือบุคคลที่สามที่เป็นกลางให้เข้ามาช่วยร่วมรับฟัง"
            ],
            risks: [
                "การปะทะอารมณ์จากเรื่องเล็กน้อยจนนำไปสู่การยกเลิกความร่วมมือระยะยาว",
                "การเข้าใจผิดในเงื่อนไขการส่งมอบงานและการชำระงวดเงิน"
            ],
            finalRecommendation: "หากเป็นไปได้ แนะนำให้เสนอเลื่อนการประชุมนัดสำคัญนี้ออกไปเป็นช่วงสัปดาห์หน้า แต่หากเลื่อนไม่ได้ ให้เน้นการรับฟังข้อมูลของอีกฝ่ายให้มากกว่าการเสนอเงื่อนไขของตนเอง และห้ามตัดสินใจขั้นสุดท้ายในที่ประชุมทันที"
        }
    ],
    launch: [
        {
            rating: "excellent",
            ratingLabel: "เหมาะสมมาก (กระจายความรู้/แคมเปญ)",
            badgeColor: "bg-violet-950/40 text-violet-300 border border-violet-500/20",
            astroReading: "ตามความเชื่อที่ได้รับการบอกเล่า ในเชิงสัญลักษณ์ช่วงเวลานี้ธาตุลมและไฟมีกำลังสูงและกระฉับกระเฉง ส่งเสริมการมองเห็น การแพร่กระจายของข่าวสาร และการสร้างความประทับใจแรกพบอย่างมีเสน่ห์ดึงดูดใจผู้คน",
            strategicLogic: "ตรงกับจังหวะเวลาที่กลุ่มเป้าหมายมีการใช้งานสื่อสังคมออนไลน์หรือการรับข่าวสารอย่างสม่ำเสมอ และไม่มีข่าวอุตสาหกรรมขนาดใหญ่อื่นๆ มาแย่งชิงความสนใจของสาธารณะในวันดังกล่าว",
            preparations: [
                "ตรวจสอบการทำงานของระบบเซิร์ฟเวอร์ หน้าดาวน์โหลด และลิงก์ชำระเงินว่าพร้อม 100%",
                "จัดแคมเปญสื่อสารช่วงเช้าเพื่อดักรับทราฟฟิกของผู้ใช้ตลอดวัน",
                "เตรียมคำแถลงการสนับสนุนหรือแผนบริการลูกค้าหลังการขายรองรับคำถามฉับพลัน"
            ],
            risks: [
                "ระบบล่มจากการเข้ามาชมพร้อมกันโดยไม่มีการเตือนล่วงหน้า",
                "การสื่อสารคุณสมบัติผลิตภัณฑ์ที่เกินจริงจนทำให้เกิดความคาดหวังที่เกินระดับความสามารถปัจจุบัน"
            ],
            finalRecommendation: "จังหวะนี้เหมาะสำหรับการกดปุ่มเปิดตัว (Publish) ผลงาน เว็บไซต์ หรือระบบใหม่สู่สาธารณะอย่างเป็นทางการ ช่วยสร้าง Momentum แรกที่สดใสและน่าเชื่อถือ"
        },
        {
            rating: "fair",
            ratingLabel: "พอใช้ได้ (เน้นปรับแต่งเฉพาะกลุ่ม)",
            badgeColor: "bg-amber-950/40 text-amber-200 border border-amber-500/20",
            astroReading: "ตามความเชื่อที่ได้รับการบอกเล่า ในเชิงสัญลักษณ์ช่วงเวลานี้พลังงานมีลักษณะนิ่งสงบแต่อยู่ในมุมอับ ซึ่งไม่เน้นความหวือหวาเพื่อดึงดูดคนหมู่มาก แต่เหมาะกับการสร้างความสัมพันธ์อย่างลึกซึ้งและจริงใจกับคนกลุ่มเล็ก",
            strategicLogic: "จังหวะตลาดอยู่ในระดับกลางๆ การโฆษณาวงกว้างอาจได้ผลลัพธ์ไม่เต็มที่เมื่อเทียบกับงบประมาณที่ใช้ แต่เหมาะอย่างยิ่งสำหรับการทดสอบระบบรุ่นทดลอง (Soft Launch) หรือคุยกับฐานแฟนคลับกลุ่มหลักก่อน",
            preparations: [
                "เน้นเป้าหมายผู้ใช้กลุ่มปิด (Alpha/Beta Test) เพื่อเก็บรวบรวมฟีดแบ็กคุณภาพสูง",
                "จัดทำเครื่องมือกู้ข้อมูลและช่องทางแจ้งบั๊กหลังใช้งานอย่างเข้าถึงง่าย",
                "เตรียมนโยบายคืนเงินหรือชดเชยที่ชัดเจนเพื่อแสดงความรับผิดชอบ"
            ],
            risks: [
                "การตั้งความหวังยอดลงทะเบียนหรือยอดขายรวมในระดับสูงเกินควร",
                "ระบบหลังบ้านบางฟังก์ชันอาจพบปัญหาคอขวดที่ต้องแก้ไขในทันที"
            ],
            finalRecommendation: "สามารถดำเนินการได้ในรูปแบบ Soft Launch หรือนำเสนอเป็นการทดลองเรียน/ทดลองเล่นเฉพาะกลุ่ม หลีกเลี่ยงการทุ่มงบตลาดขนาดใหญ่จนกว่าจังหวะของรอบเวลาถัดไปจะมาถึง"
        }
    ],
    document: [
        {
            rating: "excellent",
            ratingLabel: "เหมาะสมมาก (จัดระเบียบโครงสร้าง)",
            badgeColor: "bg-violet-950/40 text-violet-300 border border-violet-500/20",
            astroReading: "ตามความเชื่อที่ได้รับการบอกเล่า ในเชิงสัญลักษณ์กระแสพลังงานในช่วงนี้มีธาตุดินนำอย่างชัดเจนและมีระเบียบวินัยสูงมาก มีคุณสมบัติช่วยเพิ่มสมาธิ ความละเอียดประณีต และความทนทานต่อการตรวจสอบจุดบกพร่องทางตัวอักษร",
            strategicLogic: "เป็นจังหวะที่ไม่มีตารางนัดหมายประชุมด่วนแทรกซ้อน ทีมงานสามารถใช้เวลาจดจ่อกับการเรียบเรียงเอกสารสำคัญและวิเคราะห์คู่สัญญาได้อย่างสงบ ปราศจากเสียงรบกวนภายนอก",
            preparations: [
                "พิมพ์ข้อความและตรวจสอบคำสะกดผิด หรือช่องโหว่ทางกฎหมายของสัญญาอย่างน้อย 2 รอบ",
                "บันทึกเวอร์ชันของเอกสารอย่างเป็นระบบเพื่อป้องกันการเขียนทับกรณีมีความก้าวหน้าใหม่",
                "จัดทำรายการตรวจสอบ (Checklist) เกณฑ์การตรวจรับงานอย่างชัดเจน"
            ],
            risks: [
                "การปล่อยปละละเลยข้อความที่เป็นตัวพิมพ์เล็ก (Fine Print) หรือเชิงอรรถในสัญญาสำคัญ",
                "ระบบคลาวด์จัดเก็บไฟล์เสียหายหรือไม่ได้ซิงค์ข้อมูลล่าสุด"
            ],
            finalRecommendation: "ใช้ประโยชน์จากพลังเงียบในช่วงนี้เพื่อทำการชำระกฎหมาย ทบทวนเอกสารสัญญา วางแผนระบบฐานข้อมูล หรือจัดวางระเบียบนโยบายบริษัทอย่างสมบูรณ์แบบ"
        },
        {
            rating: "warning",
            ratingLabel: "ควรระวัง (ระวังข้อผิดพลาดทางภาษีและกฎหมาย)",
            badgeColor: "bg-amber-950/40 text-amber-200 border border-amber-500/20",
            astroReading: "ตามความเชื่อที่ได้รับการบอกเล่า ในเชิงสัญลักษณ์ช่วงเวลานี้ดาวดวงน้อยใหญ่โคจรทำมุมขัดแย้งในเรือนที่เกี่ยวกับความจริงและความซื่อตรง ส่งผลให้เอกสารหรือการรับส่งข้อมูลมีโอกาสผิดรูป ผิดตัวอักษร หรือเกิดการตีความคลาดเคลื่อนสูง",
            strategicLogic: "ระดับสมาธิของพนักงานและคู่เจรจาอาจมีความรีบร้อนเนื่องจากใกล้สิ้นเดือน การพิมพ์หรือคัดลอกข้อมูลตัวเลขบัญชีมีโอกาสเกิด Human Error ได้ง่ายขึ้นกว่าปกติหลายเท่าตัว",
            preparations: [
                "ใช้เครื่องมือตรวจสอบคำผิดอัตโนมัติควบคู่กับการอ่านออกเสียงตรวจทานด้วยตนเอง",
                "กำหนดให้มีบุคคลที่สองร่วมตรวจสอบ (Double-check) ก่อนส่งอีเมลหรือยื่นคำร้องราชการ",
                "สำรองข้อมูลออฟไลน์เพิ่มอีก 1 ชุดป้องกันระบบเครือข่ายขัดข้อง"
            ],
            risks: [
                "การเซ็นชื่อยินยอมในสัญญาโดยไม่ได้อ่านเงื่อนไขข้อจำกัดความรับผิดชอบอย่างครบถ้วน",
                "การใช้ไฟล์แบบร่างเวอร์ชันเก่าไปยื่นขอความร่วมมือหรือทำสัญญาจริง"
            ],
            finalRecommendation: "พึงหลีกเลี่ยงการยื่นจดทะเบียนนิติกรรมสำคัญหรือยื่นแบบภาษีที่มีเงื่อนไขจำกัดเวลากระชั้นชิดในวันนี้ หากจำเป็นต้องทำ ให้เว้นระยะเวลาสงบใจ 10 นาทีก่อนกดส่ง เพื่อตรวจสอบรายละเอียดอย่างใจเย็นที่สุด"
        }
    ]
};

// Default reflection logs for initial state
interface ReflectionLog {
    id: string;
    date: string;
    title: string;
    text: string;
    rating: string;
    activityName: string;
}

const DEFAULT_REFLECTIONS: ReflectionLog[] = [
    {
        id: "r1",
        date: "2026-05-18",
        title: "เรียนรู้รอบเวลา Focus & Expand ในชีวิตจริง",
        text: "ตามความเชื่อที่ได้รับการบอกเล่าเชิงจังหวะเวลา ช่วงต้นสัปดาห์เป็นช่วงธาตุไฟรุ่งเรือง ได้ทดลองใช้เวลาดังกล่าวเข้าพบพันธมิตรเพื่อพูดคุยโปรเจกต์ใหม่ ผลปรากฏว่าคู่สนทนาตอบรับข้อเสนอเกือบทั้งหมดในเชิงสัญลักษณ์ของการแผ่ขยายตัว ส่วนในเชิงกลยุทธ์ เราเตรียมแผนงานไปดีและมีสไลด์ที่กระชับมาก จึงช่วยเสริมจังหวะเวลาให้ออกดอกออกผลได้จริง",
        rating: "เหมาะสมมาก",
        activityName: "คุยพันธมิตรใหม่"
    },
    {
        id: "r2",
        date: "2026-05-12",
        title: "หลีกเลี่ยงความขัดแย้งในช่วงไฟแรง",
        text: "ช่วงดังกล่าวคำแนะนำแจ้งให้ระวังธาตุไฟและการปะทะอารมณ์ เดิมทีตั้งใจจะส่งอีเมลทวงถามยอดเงินที่ค้างคาด้วยคำพูดที่ดุดัน แต่เลือกกลยุทธ์ชะลอการตอบโต้ไปก่อน 1 วันตามใบแนะนำ ผลลัพธ์คือวันรุ่งขึ้นคู่ค้าโอนเงินเข้ามาพร้อมคำขอโทษอย่างสุภาพ ช่วยรักษาความสัมพันธ์ระยะยาวและลดความตึงเครียดของสมองลงได้มาก",
        rating: "ควรระวัง",
        activityName: "ส่งอีเมลทวงเงิน"
    }
];

export default function AstroStrategyPrototypeClient() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState<boolean>(false);
    
    // Core Navigation & Tabs
    const [activeTab, setActiveTab] = useState<"cycle" | "timing" | "reflection">("cycle");
    
    // Tab 1: Current Cycle States
    const [cyclePeriod, setCyclePeriod] = useState<string>("พฤษภาคม 2026");
    const [cycleGoal, setCycleGoal] = useState<string>("");
    const [cycleSaved, setCycleSaved] = useState<boolean>(false);
    
    // Tab 2: Check Timing States
    const [activityName, setActivityName] = useState<string>("");
    const [activityCategory, setActivityCategory] = useState<string>("finance");
    const [activityDate, setActivityDate] = useState<string>("2026-05-26");
    const [isChecking, setIsChecking] = useState<boolean>(false);
    const [timingResult, setTimingResult] = useState<TimingResult | null>(null);

    // Tab 3: My Chart & Reflection States
    const [birthDate, setBirthDate] = useState<string>("");
    const [birthTime, setBirthTime] = useState<string>("");
    const [birthPlace, setBirthPlace] = useState<string>("");
    const [birthDataSaved, setBirthDataSaved] = useState<boolean>(false);
    
    const [reflections, setReflections] = useState<ReflectionLog[]>([]);
    const [newRefTitle, setNewRefTitle] = useState<string>("");
    const [newRefText, setNewRefText] = useState<string>("");
    const [newRefRating, setNewRefRating] = useState<string>("เหมาะสมมาก");
    const [newRefActivity, setNewRefActivity] = useState<string>("");
    const [reflectionSavedMessage, setReflectionSavedMessage] = useState<string>("");

    // ASTRO-APP-DEV-008B: Reflection Export States
    const [reflectionSummary, setReflectionSummary] = useState<string>("วันนี้เหมาะกับการจัดระบบ ตรวจงานที่ค้าง และไม่เปิดหลายโปรเจกต์พร้อมกันมากเกินไป");
    const [reflectionMode, setReflectionMode] = useState<string>("Stabilize");
    const [noticedNotes, setNoticedNotes] = useState<string>("พลังงานเหมาะกับงานหลังบ้าน ควรพักตาเป็นช่วง ๆ และทำงานให้เล็กลงแต่ชัดขึ้น");
    const [nextRightAction, setNextRightAction] = useState<string>("ปิดงานที่ค้าง 1 เรื่องให้เป็น checkpoint ก่อนเริ่มงานใหม่");
    const [copyStatus, setCopyStatus] = useState<string>("");

    // Hydration check and LocalStorage loading
    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== "undefined") {
            // Load Cycle Goal
            const savedGoal = localStorage.getItem("astro.strategy.cycleGoal");
            if (savedGoal) setCycleGoal(savedGoal);
            
            const savedPeriod = localStorage.getItem("astro.strategy.cyclePeriod");
            if (savedPeriod) setCyclePeriod(savedPeriod);

            // Load Birth Data
            const savedBirthDate = localStorage.getItem("astro.strategy.birthDate");
            const savedBirthTime = localStorage.getItem("astro.strategy.birthTime");
            const savedBirthPlace = localStorage.getItem("astro.strategy.birthPlace");
            if (savedBirthDate) setBirthDate(savedBirthDate);
            if (savedBirthTime) setBirthTime(savedBirthTime);
            if (savedBirthPlace) setBirthPlace(savedBirthPlace);

            // Load Reflections
            const savedReflections = localStorage.getItem("astro.strategy.reflections");
            if (savedReflections) {
                try {
                    setReflections(JSON.parse(savedReflections));
                } catch (e) {
                    console.error("Failed to parse reflections", e);
                    setReflections(DEFAULT_REFLECTIONS);
                }
            } else {
                setReflections(DEFAULT_REFLECTIONS);
                localStorage.setItem("astro.strategy.reflections", JSON.stringify(DEFAULT_REFLECTIONS));
            }
        }
    }, []);

    // Save cycle target
    const handleSaveCycle = () => {
        localStorage.setItem("astro.strategy.cycleGoal", cycleGoal);
        localStorage.setItem("astro.strategy.cyclePeriod", cyclePeriod);
        setCycleSaved(true);
        setTimeout(() => setCycleSaved(false), 2500);
    };

    // Calculate timing result deterministically based on date and category
    const handleCheckTiming = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activityName.trim()) {
            alert("กรุณากรอกชื่อกิจกรรมหลักที่ต้องการตรวจสอบก่อนครับ");
            return;
        }

        setIsChecking(true);
        setTimingResult(null);

        // Simulate elegant loader for modern app experience (800ms)
        setTimeout(() => {
            const templates = TIMING_TEMPLATES[activityCategory] || TIMING_TEMPLATES.finance;
            
            // Deterministic selection based on characters in activity name and date day to make it feel alive
            const dateNum = new Date(activityDate).getDate() || 1;
            const seed = (activityName.length + dateNum) % templates.length;
            const result = templates[seed];

            setTimingResult(result);
            setIsChecking(false);

            // Custom event trigger
            window.dispatchEvent(new CustomEvent("task-updated"));
        }, 800);
    };

    // Save birth data
    const handleSaveBirthData = () => {
        localStorage.setItem("astro.strategy.birthDate", birthDate);
        localStorage.setItem("astro.strategy.birthTime", birthTime);
        localStorage.setItem("astro.strategy.birthPlace", birthPlace);
        setBirthDataSaved(true);
        setTimeout(() => setBirthDataSaved(false), 2500);
    };

    // Add reflection log
    const handleAddReflection = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRefTitle.trim() || !newRefText.trim()) {
            alert("กรุณากรอกหัวข้อและเนื้อหาการสะท้อนคิดให้ครบถ้วนก่อนบันทึกครับ");
            return;
        }

        const newLog: ReflectionLog = {
            id: `r-${Date.now()}`,
            date: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD
            title: newRefTitle,
            text: newRefText,
            rating: newRefRating,
            activityName: newRefActivity || "กิจกรรมทั่วไป"
        };

        const updated = [newLog, ...reflections];
        setReflections(updated);
        localStorage.setItem("astro.strategy.reflections", JSON.stringify(updated));

        // Reset fields
        setNewRefTitle("");
        setNewRefText("");
        setNewRefActivity("");
        setReflectionSavedMessage("บันทึกประวัติการสะท้อนคิดสำเร็จแล้ว!");
        setTimeout(() => setReflectionSavedMessage(""), 3000);
        
        window.dispatchEvent(new CustomEvent("task-updated"));
    };

    // Clear reflections
    const handleResetReflections = () => {
        if (window.confirm("คุณต้องการล้างประวัติการสะท้อนคิดทั้งหมดและกลับไปใช้ข้อมูลจำลองเริ่มต้นใช่หรือไม่?")) {
            setReflections(DEFAULT_REFLECTIONS);
            localStorage.setItem("astro.strategy.reflections", JSON.stringify(DEFAULT_REFLECTIONS));
        }
    };

    // ASTRO-APP-DEV-008B: derived markdown content and copy handler
    const dateStr = isMounted ? new Date().toISOString().slice(0, 10) : "2026-05-26";

    const getMarkdownContent = () => {
        return `# Astro Reflection Log

Date: ${dateStr}
Mode: ${reflectionMode}

## Today’s Reflection
${reflectionSummary || "(ไม่มีข้อมูล)"}

## What I Noticed
${noticedNotes || "(ไม่มีข้อมูล)"}

## Next Right Action
${nextRightAction || "(ไม่มีข้อมูล)"}

## Guardrail
บันทึกนี้ใช้เพื่อการสะท้อนคิดและวางแผนส่วนบุคคล ไม่ใช่คำแนะนำทางการแพทย์ การวินิจฉัย หรือการรักษา`;
    };

    const handleCopyMarkdown = async () => {
        const markdown = getMarkdownContent();
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(markdown);
                setCopyStatus("คัดลอกลงคลิปบอร์ดเรียบร้อยแล้ว!");
            } else {
                setCopyStatus("คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกจากกล่อง Preview");
            }
        } catch (err) {
            console.error("Failed to copy:", err);
            setCopyStatus("คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกจากกล่อง Preview");
        }
        setTimeout(() => setCopyStatus(""), 2500);
    };

    if (!isMounted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-violet-400" />
                    <span>กำลังโหลดศูนย์ทดสอบฤกษ์ยามและกลยุทธ์...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100 font-sans pb-16">
            {/* Top Navigation Bar */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.push("/dashboard")}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white transition-all text-slate-400 flex items-center justify-center border border-slate-700/50"
                            title="ย้อนกลับ"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-lg text-slate-100 tracking-tight">Astro-Strategy Lab</h1>
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-violet-400/10 text-violet-300 rounded-full border border-violet-300/20 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" /> v0.1 Prototype
                                </span>
                            </div>
                            <span className="text-xs text-slate-400 hidden sm:inline-block">ระบบจัดลำดับและวิเคราะห์จังหวะชีวิตเชิงกลยุทธ์ส่วนบุคคล</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/80">
                        <Calendar className="w-4 h-4 text-amber-300" />
                        <span className="font-mono">2026-05-25</span>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {/* Hero Principle Banner Card with Glassmorphism */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm mb-8 shadow-xl shadow-slate-950/40">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-violet-950/5 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-10 w-60 h-60 bg-amber-950/5 rounded-full blur-3xl -z-10"></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="p-3 bg-violet-400/10 text-violet-300 rounded-xl border border-violet-300/20 h-fit w-fit">
                            <Compass className="w-8 h-8 animate-pulse" />
                        </div>
                        <div className="space-y-2 max-w-3xl">
                            <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                                “ฤกษ์ยามที่ดีที่สุด คือจังหวะเวลาที่คุณเตรียมความพร้อมไว้สมบูรณ์ที่สุด”
                            </h2>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                ห้องปฏิบัติการวางแผนยุทธศาสตร์และสัญลักษณ์จังหวะดาราศาสตร์ 
                                เพื่อการคัดเลือกจังหวะเวลาที่เอื้ออำนวยมากที่สุดในการเริ่มดำเนินกิจกรรมที่สำคัญ 
                                หลีกเลี่ยงอารมณ์ชั่ววูบ และเสริมประสิทธิภาพการบริหารการจัดการความเสี่ยงแบบมืออาชีพ
                            </p>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 text-sm text-slate-300 border-t border-slate-800/50">
                                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> สอดคล้องกับเจตจำนงค์ที่แน่วแน่</span>
                                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> แยกส่วนความเชื่อและกลยุทธ์ออกจากกัน</span>
                                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> เน้นผลลัพธ์ที่เป็นรูปธรรม</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Horizontal Navigation Tabs */}
                <div className="flex space-x-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80 mb-8 max-w-md">
                    <button
                        onClick={() => setActiveTab("cycle")}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            activeTab === "cycle"
                                ? "bg-violet-950/60 text-violet-200 border border-violet-400/25 shadow-md shadow-violet-950/40"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/30"
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        รอบเวลาปัจจุบัน
                    </button>
                    <button
                        onClick={() => setActiveTab("timing")}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            activeTab === "timing"
                                ? "bg-violet-950/60 text-violet-200 border border-violet-400/25 shadow-md shadow-violet-950/40"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/30"
                        }`}
                    >
                        <Activity className="w-4 h-4" />
                        ตรวจสอบฤกษ์ยาม
                    </button>
                    <button
                        onClick={() => setActiveTab("reflection")}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            activeTab === "reflection"
                                ? "bg-violet-950/60 text-violet-200 border border-violet-400/25 shadow-md shadow-violet-950/40"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/30"
                        }`}
                    >
                        <BookMarked className="w-4 h-4" />
                        ชาร์ตและการสะท้อนคิด
                    </button>
                </div>

                {/* Tab content area */}
                <div className="transition-all duration-300">
                    
                    {/* TAB 1: CURRENT CYCLE */}
                    {activeTab === "cycle" && (
                        <div className="space-y-8 animate-fadeIn">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Left Input & Setting Card */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
                                        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                                            <Calendar className="w-5 h-5 text-violet-300" />
                                            <h3 className="font-semibold text-slate-100">เลือกช่วงเวลารอบวงจร</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">รอบเดือนการพิจารณา</label>
                                                <select
                                                    value={cyclePeriod}
                                                    onChange={(e) => {
                                                        setCyclePeriod(e.target.value);
                                                        setCycleSaved(false);
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                >
                                                    <option value="พฤษภาคม 2026">พฤษภาคม 2026 (รอบไฟเสถียร)</option>
                                                    <option value="มิถุนายน 2026">มิถุนายน 2026 (รอบลมเคลื่อนไหว)</option>
                                                    <option value="กรกฎาคม 2026">กรกฎาคม 2026 (รอบน้ำฟื้นฟู)</option>
                                                    <option value="สิงหาคม 2026">สิงหาคม 2026 (รอบดินเตรียมเสบียง)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">เป้าหมายและบริบทหลักรอบนี้ (Context)</label>
                                                <textarea
                                                    value={cycleGoal}
                                                    onChange={(e) => {
                                                        setCycleGoal(e.target.value);
                                                        setCycleSaved(false);
                                                    }}
                                                    placeholder="เช่น กำลังพิจารณาเซ็นสัญญาจ้างพัฒนาซอฟต์แวร์ใหม่ หรือต้องการเปิดตัวระบบคลังความรู้ Green Fineness..."
                                                    rows={5}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-750 leading-relaxed"
                                                ></textarea>
                                                <span className="text-[11px] text-slate-500 block leading-tight">
                                                    *ข้อมูลนี้จะบันทึกลงใน Browser ของคุณ เพื่อนำไปประกอบการพิจารณาเปรียบเทียบในประวัติ
                                                </span>
                                            </div>

                                            <button
                                                onClick={handleSaveCycle}
                                                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-slate-100 border border-slate-700/60 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                {cycleSaved ? "บันทึกร่างรอบเวลาแล้ว!" : "บันทึกร่างรอบเวลา"}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-r from-slate-955/40 to-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-3">
                                        <h4 className="text-sm font-semibold text-amber-250 tracking-wider uppercase flex items-center gap-2">
                                            <Info className="w-4 h-4 text-amber-300" /> คำแนะนำทางศีลธรรม
                                        </h4>
                                        <p className="text-sm text-slate-200 leading-relaxed font-medium">
                                            กฎและจังหวะของดาราศาสตร์เป็นเพียงสัญวิทยาเชิงสัญลักษณ์เพื่อสะท้อนความเชื่อมโยงของระบบธรรมชาติ 
                                            ชีวิตมนุษย์ขับเคลื่อนด้วยการกระทำเป็นหลัก ปัญญาและการเจรจาที่เป็นธรรมจะเป็นเกราะคุ้มครองที่แท้จริง
                                        </p>
                                    </div>
                                </div>

                                {/* Right Output / Cycle Dashboard */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Daily Timing Brief Card */}
                                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-2">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-amber-400" /> Daily Timing Brief
                                                </h3>
                                                <p className="text-sm text-slate-400 font-medium">สรุปจังหวะวันนี้ (ภาพรวมสำหรับใช้สะท้อนจังหวะงาน การใช้พลัง และการดูแลตนเองในวันนี้)</p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-200 border border-amber-500/20 self-start sm:self-center">
                                                วันนี้ (Daily)
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Today's Mode & Strategic Direction */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all sm:col-span-2">
                                                <div className="flex items-center gap-2 text-violet-300">
                                                    <Compass className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">Today’s Mode: Stabilize & Structure</h4>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    <strong>ทิศทางกลยุทธ์ (Strategic Direction):</strong> วันนี้เหมาะกับการจัดระบบ ตรวจงานที่ค้าง และวางแผนก่อนขยายงานใหม่
                                                </p>
                                            </div>

                                            {/* Work Recommendation */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-emerald-400">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">คำแนะนำการทำงาน (Work Recommendation)</h4>
                                                </div>
                                                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed">
                                                    <li>เหมาะกับการจัด task</li>
                                                    <li>ตรวจ logic ของโปรเจกต์</li>
                                                    <li>สรุปสิ่งที่ทำสำเร็จ</li>
                                                    <li>วางแผนงานรอบถัดไป</li>
                                                </ul>
                                            </div>

                                            {/* Risk Prevention */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-rose-400">
                                                    <ShieldAlert className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">การคุมความเสี่ยง (Risk Prevention)</h4>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    หลีกเลี่ยงการเปิดหลายโปรเจกต์พร้อมกันมากเกินไป เพราะอาจทำให้พลังงานกระจายและคิดวน
                                                </p>
                                            </div>

                                            {/* Recovery Anchor */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-violet-300">
                                                    <Activity className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">สมอใจฟื้นฟู (Recovery Anchor)</h4>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    พักตา 3 นาทีหลังทำงานหน้าจอเป็นช่วง ๆ และใช้การหายใจช้า ๆ เพื่อพากลับมาที่ปัจจุบัน
                                                </p>
                                            </div>

                                            {/* Reflection Prompt */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-amber-400">
                                                    <MessageSquare className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">คำถามสะท้อนคิด (Reflection Prompt)</h4>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                                                    “วันนี้มีงานใดที่ควร ‘ทำให้น้อยลง แต่ชัดขึ้น’ หรือไม่”
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-4 leading-normal">
                                            *ข้อความนี้เป็น mock brief สำหรับการสะท้อนตนเองและวางแผนส่วนบุคคลเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ การวินิจฉัย หรือการรักษา
                                        </div>
                                    </div>

                                    {/* Weekly Strategy View Card - ASTRO-APP-DEV-007B */}
                                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-2">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                                    <Calendar className="w-5 h-5 text-violet-300" /> Weekly Strategy View
                                                </h3>
                                                <p className="text-sm text-slate-400 font-medium">ภาพรวมกลยุทธ์และการจัดสรรเวลาในสัปดาห์นี้</p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/40 text-violet-300 border border-violet-400/20 self-start sm:self-center">
                                                สัปดาห์นี้ (Weekly)
                                            </span>
                                        </div>

                                        {/* Weekly Theme Banner */}
                                        <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-2 hover:border-slate-800 transition-all">
                                            <span className="text-[10px] font-bold text-violet-300 tracking-wider uppercase block">Theme ของสัปดาห์นี้</span>
                                            <h4 className="text-lg font-bold text-slate-200">Structure Before Expansion</h4>
                                        </div>

                                        {/* Two Column Grid for Windows */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Best Work Windows */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-violet-300">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">Best Work Windows</h4>
                                                </div>
                                                <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
                                                    <li><strong className="text-slate-200">ช่วงต้นสัปดาห์:</strong> เหมาะกับการจัดระบบ ตรวจ task และเคลียร์งานค้าง</li>
                                                    <li><strong className="text-slate-200">ช่วงกลางสัปดาห์:</strong> เหมาะกับการตัดสินใจเชิงโครงสร้างและวางแผนรอบต่อไป</li>
                                                    <li><strong className="text-slate-200">ช่วงปลายสัปดาห์:</strong> เหมาะกับ reflection และสรุปบทเรียน</li>
                                                </ul>
                                            </div>

                                            {/* Caution Windows */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-amber-300">
                                                    <ShieldAlert className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">Caution Windows</h4>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed pt-1">
                                                    หลีกเลี่ยงการเปิดหลายโปรเจกต์พร้อมกัน หากยังไม่ได้ปิดงานเดิมให้ชัดเจนเพื่อป้องกันสมาธิกระจาย
                                                </p>
                                            </div>
                                        </div>

                                        {/* Two Column Grid for Rhythm & Focus */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Recovery Rhythm */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-violet-300">
                                                    <Activity className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">จังหวะการฟื้นฟู (Recovery Rhythm)</h4>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed pt-1">
                                                    ใช้สมาธิสั้น 5–10 นาที หรือพักสายตาเป็นช่วง ๆ โดยเฉพาะหลังจากลุยงานหน้าจอที่ต้องใช้สมองหนักอย่างต่อเนื่อง
                                                </p>
                                            </div>

                                            {/* Strategic Focus */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-amber-300">
                                                    <Flame className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">จุดโฟกัสเชิงกลยุทธ์ (Strategic Focus)</h4>
                                                </div>
                                                <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-300 leading-relaxed pt-1">
                                                    <li>ปิดงานที่ commit แล้วให้เป็น checkpoint ที่ชัดเจน</li>
                                                    <li>วางแผนและทำต้นแบบ v0.3 แบบไม่เพิ่ม scope เกินความจำเป็น</li>
                                                    <li>รักษาจังหวะการสร้างสมาธิและการพักผ่อนให้มีความสมดุลอย่างต่อเนื่อง</li>
                                                </ol>
                                            </div>
                                        </div>

                                        {/* Disclaimer Guardrail */}
                                        <div className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-4 leading-normal">
                                            *ข้อมูลนี้เป็นแนวทางจำลองเพื่อสนับสนุนกระบวนการสะท้อนคิดและการจัดการตนเองเชิงพฤติกรรมเท่านั้น ไม่ได้มีจุดประสงค์เพื่อใช้เป็นคำแนะนำทางการแพทย์ การรักษาโรค หรือการวินิจฉัยสุขภาพ
                                        </div>
                                    </div>

                                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-2">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold text-slate-100">สรุปการพิจารณารอบเวลาปัจจุบัน</h3>
                                                <p className="text-sm text-slate-400 font-medium">ภาพรวมอิทธิพลเชิงสัญลักษณ์และการจัดสรรกลยุทธ์ส่วนบุคคล</p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/40 text-violet-300 border border-violet-400/20 self-start sm:self-center">
                                                {cyclePeriod}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Work Mode */}
                                            <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-violet-300">
                                                    <Compass className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">Work Mode (โหมดการทำงาน)</h4>
                                                </div>
                                                <p className="text-base font-bold text-slate-200">
                                                    Consolidate & Review (จัดระเบียบและชำระโครงสร้างภายใน)
                                                </p>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    เน้นการทบทวนเอกสารสัญญา นโยบายการบริหารงาน และการรวบรวมข้อตกลงที่ค้างคา มากกว่าการบุกเบิกตลาดหรือลงทุนความเสี่ยงสูงแบบไร้แบบแผน
                                                </p>
                                            </div>

                                            {/* Recommended Focus */}
                                            <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-emerald-400">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">Recommended Focus (ประเด็นที่ควรเน้น)</h4>
                                                </div>
                                                <p className="text-base font-bold text-slate-200">
                                                    สร้างความกระจ่างชัดเจนเชิงลายลักษณ์อักษร
                                                </p>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    ประสานงานกับที่ปรึกษาและทีมเทคนิค เพื่อจัดวางแผนผัง Data Model หรือทบทวนรายละเอียดระบบให้เรียบร้อยสมบูรณ์ ป้องกันการบานปลายของขอบเขตงาน
                                                </p>
                                            </div>

                                            {/* Slow Down */}
                                            <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-amber-400">
                                                    <AlertTriangle className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">Slow Down (เรื่องที่ควรชะลอ)</h4>
                                                </div>
                                                <p className="text-base font-bold text-slate-200">
                                                    การตกลงปากเปล่าเรื่องการเงินและขอบเขตงาน
                                                </p>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    ชะลอการตอบตกลงเงื่อนไขที่ไม่มีตัวเลขชัดเจน หรือการรีบร้อนเซ็นสัญญากู้ยืมเงินที่ยังไม่ได้ผ่านการจำลองความเสี่ยงในระดับแย่ที่สุด (Worst-case scenario)
                                                </p>
                                            </div>

                                            {/* Risk Prevention */}
                                            <div className="bg-slate-950/60 border border-slate-850 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-rose-400">
                                                    <ShieldAlert className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">Risk Prevention (การคุมความเสี่ยง)</h4>
                                                </div>
                                                <p className="text-base font-bold text-slate-200">
                                                    ความสับสนเชิงโครงสร้างข้อมูลและลิขสิทธิ์
                                                </p>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    สแกนหาข้อตกลงที่ซ้ำซ้อน ตรวจทานความครอบคลุมของสิทธิ์และกรรมสิทธิ์ในเนื้อหา/ซอฟต์แวร์ที่กำลังจ้างทำ เพื่อป้องกันข้ออ้างทางกฎหมายในภายหลัง
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "timing" && (
                        <div className="space-y-8 animate-fadeIn">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Left Form Area */}
                                <div className="lg:col-span-1">
                                    <form onSubmit={handleCheckTiming} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
                                        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                                            <Activity className="w-5 h-5 text-violet-300" />
                                            <h3 className="font-semibold text-slate-100">ป้อนกิจกรรมทางกลยุทธ์</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">ชื่องาน/กิจกรรมหลัก</label>
                                                <input
                                                    type="text"
                                                    value={activityName}
                                                    onChange={(e) => setActivityName(e.target.value)}
                                                    placeholder="เช่น นัดคุยทนายตรวจสอบร่างดีลร้านค้า"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-700"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">หมวดหมู่กิจกรรม</label>
                                                <select
                                                    value={activityCategory}
                                                    onChange={(e) => setActivityCategory(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                >
                                                    <option value="finance">การเงิน/การลงทุน/ชำระเงิน</option>
                                                    <option value="negotiate">การเจรจา/พูดคุยต่อรอง/ลงนามความร่วมมือ</option>
                                                    <option value="launch">เปิดตัวผลิตภัณฑ์/Publish ผลงาน/แคมเปญการสื่อสาร</option>
                                                    <option value="document">งานเอกสารสำคัญ/ปรับแก้กฎหมาย/วาง Data Model</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">วันที่ต้องการดำเนินการ</label>
                                                <input
                                                    type="date"
                                                    value={activityDate}
                                                    onChange={(e) => setActivityDate(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all font-mono"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isChecking}
                                                className="w-full py-3 px-4 bg-gradient-to-r from-violet-900 to-slate-900 hover:from-violet-850 hover:to-slate-850 disabled:from-slate-800 disabled:to-slate-800 border border-violet-500/10 text-slate-100 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                                            >
                                                {isChecking ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                                                        กำลังคำนวณและประมวลฤกษ์...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4 text-amber-300" />
                                                        ตรวจสอบฤกษ์ยามกลยุทธ์
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Right Result Area */}
                                <div className="lg:col-span-2 space-y-6">
                                    {timingResult ? (
                                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6 animate-fadeIn">
                                            {/* Header Result */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-4">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-violet-300 tracking-wider uppercase block">
                                                        ผลวิเคราะห์สำหรับกิจกรรม: {activityName}
                                                    </span>
                                                    <h3 className="text-xl font-bold text-slate-100">ผลการประเมินจังหวะเวลา</h3>
                                                    <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-500" /> วางแผนสำหรับวันที่: {activityDate}
                                                    </p>
                                                </div>

                                                <span className={`px-4 py-2 rounded-xl text-sm font-bold text-center border shadow-sm ${timingResult.badgeColor}`}>
                                                    {timingResult.ratingLabel}
                                                </span>
                                            </div>

                                            {/* Results Grid Sections */}
                                            <div className="space-y-6">
                                                
                                                {/* 1. Astrology Reading (Thai, Non-fatalistic, Symbolism focus) */}
                                                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl space-y-2">
                                                    <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
                                                        <Compass className="w-4 h-4 text-purple-400" /> คำอ่านเชิงดวง (ในเชิงสัญลักษณ์)
                                                    </h4>
                                                    <p className="text-sm text-slate-300 leading-relaxed">
                                                        {timingResult.astroReading}
                                                    </p>
                                                    <span className="text-[10px] text-slate-500 block">
                                                        *เป็นอิทธิพลทางสัญศาสตร์เชิงธรรมชาติ ควรใช้เป็นความรู้ประกอบความรอบคอบ มิใช่ข้อลิขิตชะตาฟ้า
                                                    </span>
                                                </div>

                                                {/* 2. Strategic Logic (Pure business rationality) */}
                                                <div className="bg-slate-950/40 border border-slate-850 p-5 rounded-xl space-y-2">
                                                    <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
                                                        <ClipboardList className="w-4 h-4 text-violet-300" /> เหตุผลเชิงกลยุทธ์และจังหวะตลาด
                                                    </h4>
                                                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                                                        {timingResult.strategicLogic}
                                                    </p>
                                                </div>

                                                {/* 3. Action preparations and Risk safeguards */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    
                                                    {/* To Prepare */}
                                                    <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-xl space-y-3">
                                                        <h4 className="text-sm font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4 text-emerald-400" /> สิ่งที่ควรเตรียมรับมือ
                                                        </h4>
                                                        <ul className="space-y-2.5">
                                                            {timingResult.preparations.map((prep, i) => (
                                                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2 leading-relaxed">
                                                                    <span className="text-emerald-500 font-bold mt-0.5">•</span>
                                                                    <span>{prep}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    {/* Risks */}
                                                    <div className="bg-slate-950/40 border border-slate-850 p-6 rounded-xl space-y-3">
                                                        <h4 className="text-sm font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
                                                            <ShieldAlert className="w-4 h-4 text-amber-400" /> ปัจจัยเสี่ยงที่ต้องคุม
                                                        </h4>
                                                        <ul className="space-y-2.5">
                                                            {timingResult.risks.map((risk, i) => (
                                                                <li key={i} className="text-sm text-slate-300 flex items-start gap-2 leading-relaxed">
                                                                    <span className="text-amber-500 font-bold mt-0.5">!</span>
                                                                    <span>{risk}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                </div>

                                                {/* 4. Final Recommendation */}
                                                <div className="bg-indigo-950/10 border border-indigo-500/10 rounded-xl p-5 space-y-2">
                                                    <h4 className="text-xs font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 animate-pulse" /> คำแนะนำเชิงบริหารจัดการขั้นสุดท้าย (Final Strategic Recommendation)
                                                    </h4>
                                                    <p className="text-sm text-slate-200 leading-relaxed">
                                                        {timingResult.finalRecommendation}
                                                    </p>
                                                    <p className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 mt-2 leading-relaxed">
                                                        <strong className="text-slate-300">ความเห็นของระบบ:</strong> ความน่าจะเป็นที่จะเกิดผลลัพธ์ที่ดีเกิดจากการเตรียมประเด็นเจรจาที่เป็นระบบ และจิตใจที่เปี่ยมด้วยสติสัมปชัญญะ หากทำตามรายการตรวจสอบ (Checklist) ข้างต้น โอกาสจะบรรลุความสงบสุขทางธุรกิจจะมีสูงที่สุด
                                                    </p>
                                                </div>

                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900/20 border border-slate-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 text-slate-500 h-full min-h-[300px]">
                                            <div className="p-4 bg-slate-900/80 text-slate-400 rounded-2xl border border-slate-800/80">
                                                <Compass className="w-10 h-10 animate-spin-slow text-slate-600" />
                                            </div>
                                            <div className="space-y-1 max-w-sm">
                                                <h4 className="font-semibold text-slate-300 text-sm">ยังไม่มีผลลัพธ์ปรากฏ</h4>
                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    กรุณากรอกข้อมูลกิจกรรมทางกลยุทธ์ในแผงด้านซ้าย 
                                                    แล้วกดปุ่มตรวจสอบเพื่อจำลองผลลัพธ์เชิงตัวอย่างที่มีรายละเอียดสูง
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}

                    {/* TAB 3: MY CHART & REFLECTION */}
                    {activeTab === "reflection" && (
                        <div className="space-y-8 animate-fadeIn">
                            
                            {/* Personal Birth Data Box & Lineage */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Birth Data Settings */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
                                        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                                            <User className="w-5 h-5 text-indigo-400" />
                                            <h3 className="font-semibold text-slate-100">ข้อมูลพื้นดวงกลยุทธ์ (My Chart)</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">วัน/เดือน/ปี เกิด (ค.ศ.)</label>
                                                <input
                                                    type="date"
                                                    value={birthDate}
                                                    onChange={(e) => {
                                                        setBirthDate(e.target.value);
                                                        setBirthDataSaved(false);
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">เวลาเกิดโดยประมาณ (น.)</label>
                                                <input
                                                    type="time"
                                                    value={birthTime}
                                                    onChange={(e) => {
                                                        setBirthTime(e.target.value);
                                                        setBirthDataSaved(false);
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400">สถานที่เกิด (จังหวัด/ประเทศ)</label>
                                                <input
                                                    type="text"
                                                    value={birthPlace}
                                                    onChange={(e) => {
                                                        setBirthPlace(e.target.value);
                                                        setBirthDataSaved(false);
                                                    }}
                                                    placeholder="เช่น กรุงเทพฯ, ประเทศไทย"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-800"
                                                />
                                            </div>

                                            <button
                                                onClick={handleSaveBirthData}
                                                className="w-full py-2.5 px-4 bg-slate-850 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border border-slate-750 transition-all"
                                            >
                                                <Save className="w-4 h-4 text-violet-300" />
                                                {birthDataSaved ? "บันทึกข้อมูลดวงชะตาแล้ว!" : "บันทึกข้อมูลพื้นดวง"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lineage & Wai Kru (กตัญญูบูชาครู) */}
                                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-850 pb-2.5">
                                            <Flame className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                                            <h4 className="text-sm font-semibold text-amber-400 tracking-wider uppercase">
                                                น้อมเคารพบูชาครู (Wai Kru)
                                            </h4>
                                        </div>
                                        <p className="text-sm text-slate-200 leading-relaxed">
                                            ตามความเชื่อที่ได้รับการบอกเล่าและการศึกษาเชิงสัญศาสตร์ โหราศาสตร์และการคิดคำนวณจังหวะชีวิต 
                                            มีรากฐานมาจากความอุตสาหะของปราชญ์และครูบาอาจารย์ในอดีตหลายชั่วอายุคน 
                                            เราขอนอบน้อมระลึกถึงพระคุณของครูบารวมถึงคุณธรรมในการถือจริยธรรมของนักพยากรณ์ 
                                            ซึ่งเน้นการช่วยเหลือเกื้อกูลจิตใจเพื่อนมนุษย์ มิใช่เพื่อความโอ้อวดกิเลสหรือเอารัดเอาเปรียบผู้อื่น
                                        </p>
                                    </div>
                                </div>

                                {/* Base Chart Summary & Ethical Note */}
                                <div className="lg:col-span-2 space-y-6">
                                    
                                    {/* Base Chart Result Card */}
                                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-5">
                                        <div className="border-b border-slate-800 pb-3">
                                            <h3 className="text-lg font-bold text-slate-100">บทสรุปชาร์ตชีวิตเชิงยุทธศาสตร์ (Base Chart Summary)</h3>
                                            <p className="text-xs text-slate-400">การตีความโครงสร้างพลังงานและแนวโน้มพรสวรรค์ตามสัญลักษณ์หลัก</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-4 bg-slate-955/60 border border-slate-850 rounded-xl space-y-1 text-center">
                                                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold block">ธาตุหลักเด่น (Dominant)</span>
                                                <span className="text-base font-bold text-amber-200">ดิน (Earth) & ลม (Air)</span>
                                                <span className="text-[10px] text-slate-500 block leading-tight">เน้นความเสถียรและทักษะการสื่อสารร่วมกัน</span>
                                            </div>
                                            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1 text-center">
                                                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold block">จุดแกร่งทางยุทธศาสตร์</span>
                                                <span className="text-sm font-bold text-emerald-400">การประเมินวิเคราะห์ความเสี่ยง</span>
                                                <span className="text-[10px] text-slate-500 block leading-tight">วางแบบจำลองและเอกสารได้แม่นยำ</span>
                                            </div>
                                            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1 text-center">
                                                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold block">สิ่งที่ต้องขัดเกลาจิตใจ</span>
                                                <span className="text-sm font-bold text-amber-400">ความระแวดระวังที่สูงเกินไป</span>
                                                <span className="text-[10px] text-slate-500 block leading-tight">ป้องกันสภาวะสมองล้าและคิดวนเวียน</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <h4 className="text-sm font-bold text-slate-300 tracking-wider uppercase">บันทึกส่วนตัวเชิงสัญลักษณ์ส่วนบุคคล (Spiritual Personal Note)</h4>
                                            <p className="text-sm text-slate-300 leading-relaxed">
                                                ตามความเชื่อที่ได้รับการบอกเล่าและการตีความเชิงสัญลักษณ์ 
                                                ผู้มีโครงสร้างเด่นธาตุดินมักได้รับการเกื้อหนุนให้จดจำรายละเอียดรายละเอียดของเอกสารและสัญญาได้รวดเร็ว 
                                                แต่หากทำงานล้าเกินไปอาจเกิดสภาวะธาตุลมกำเริบ ทำให้ใจร้อนรนเป็นพิเศษ 
                                                ควรใช้เครื่องมือในแอปพลิเคชันนี้น้อมจัดระเบียบสมาธิและแบ่งเวลาทำความสะอาดสภาพแวดล้อมเพื่อสร้างความปลอดโปร่งในสัญศาสตร์ของชีวิต
                                            </p>
                                        </div>

                                        {/* Ethical Reminder */}
                                        <div className="border-t border-slate-800/80 pt-4 flex items-start gap-3">
                                            <Info className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" />
                                            <div className="space-y-1">
                                                <span className="text-[11px] font-bold text-amber-300 tracking-wider uppercase block">
                                                    จรรยาบรรณวิชาชีพและข้อพิจารณาทางจริยธรรม
                                                </span>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    ข้อมูลเชิงลึกและคำพยากรณ์ดวงชะตาทั้งหมดในหน้าเว็บบอร์ดนี้มีเจตจำนงในการช่วยเหลือให้มนุษย์นำสิ่งแวดล้อมมาบริหารเชิงจิตวิทยาส่วนบุคคล 
                                                    ห้ามมิให้นำคำพยากรณ์เหล่านี้ไปใช้วางกุศโลบายลวงผู้อื่น หรือสร้างความกังวลใจอย่างร้ายแรงต่อเพื่อนมนุษย์ 
                                                    กฎหมายการค้าและธรรมาภิบาลทางจริยธรรมยังคงเป็น Source of Truth ที่ยิ่งใหญ่ที่สุดในโลกใบนี้
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Practice & Recovery Profile Card */}
                                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
                                        <div className="border-b border-slate-800 pb-3">
                                            <h3 className="text-xl font-bold text-slate-100">Practice & Recovery Profile</h3>
                                            <p className="text-sm text-slate-400 font-medium mt-0.5">พื้นที่บันทึกเส้นทางการฝึก การฟื้นตัว และการจัดระบบชีวิต เพื่อใช้ประกอบการสะท้อนคิดส่วนตัว</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* 1. Practice Background */}
                                            <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-xl space-y-3">
                                                <h4 className="text-sm font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-2">
                                                    <BookOpen className="w-4 h-4" /> Practice Background (ประวัติการปฏิบัติ)
                                                </h4>
                                                <ul className="space-y-2 text-sm text-slate-300">
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-violet-400 font-bold">•</span>
                                                        <span>เริ่มฝึกปฏิบัติสมาธิเจริญสติมาแล้วประมาณ {MOCK_PERSONAL_PROFILE.practiceProfile.meditationStartedApprox === "around 10 months ago" ? "10 เดือน" : MOCK_PERSONAL_PROFILE.practiceProfile.meditationStartedApprox}</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-violet-400 font-bold">•</span>
                                                        <span>ความสม่ำเสมอในปัจจุบัน: {MOCK_PERSONAL_PROFILE.practiceProfile.currentConsistency === "not fully consistent recently" ? "ช่วงที่ผ่านมายังไม่ต่อเนื่อง" : MOCK_PERSONAL_PROFILE.practiceProfile.currentConsistency}</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-violet-400 font-bold">•</span>
                                                        <span>เคยอุปสมบทในบวรพระพุทธศาสนา: {MOCK_PERSONAL_PROFILE.practiceProfile.formerOrdination === "3 Buddhist rains" ? "3 พรรษา" : MOCK_PERSONAL_PROFILE.practiceProfile.formerOrdination}</span>
                                                    </li>
                                                </ul>
                                            </div>

                                            {/* 2. Health Turning Points */}
                                            <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-xl space-y-3">
                                                <h4 className="text-sm font-bold text-rose-400 tracking-wider uppercase flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4" /> Health Turning Points (จุดเปลี่ยนทางสุขภาพ)
                                                </h4>
                                                <ul className="space-y-2 text-sm text-slate-300">
                                                    {MOCK_PERSONAL_PROFILE.recoveryProfile.healthTurningPoints.map((pt, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <span className="text-rose-500 font-bold">•</span>
                                                            <span>
                                                                {pt.type === "eye_condition" ? "ภาวะบวม/มีน้ำในวุ้นตา (รับการตรวจรักษาประมาณ 4 เดือน)" : 
                                                                 pt.type === "respiratory_condition" ? "ภาวะหอบหืด / อาการไอเรื้อรังและหายใจติดขัด" : 
                                                                 pt.summary}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* 3. Recovery & Regulation Practices */}
                                            <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-xl space-y-3 sm:col-span-2">
                                                <h4 className="text-sm font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-2">
                                                    <Activity className="w-4 h-4" /> Recovery & Regulation Practices (แนวทางปรับสมดุล)
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-slate-300">
                                                    {MOCK_PERSONAL_PROFILE.recoveryProfile.recoveryTools.map((tool, idx) => {
                                                        let label = tool;
                                                        if (tool === "meditation") label = "การฝึกสมาธิเจริญสติเพื่อให้จิตใจมั่นคงและเกิดสมาธิ";
                                                        else if (tool === "calming audio") label = "Sound healing / เปิดคลื่นเสียงผ่อนคลายเพื่อช่วยพักสมอง";
                                                        else if (tool === "chakra learning") label = "ศึกษาเรียนรู้ระบบจักระเพื่อทำความเข้าใจกลไกพลังงานภายใน";
                                                        else if (tool === "AI-assisted work organization") label = "จัดระเบียบโครงสร้างงานโดยมี AI ช่วยสนับสนุน";

                                                        return (
                                                            <div key={idx} className="flex items-start gap-2">
                                                                <span className="text-emerald-500 font-bold mt-0.5">•</span>
                                                                <span>{label}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Reflection Use & Disclaimers */}
                                        <div className="space-y-4 border-t border-slate-800/80 pt-4">
                                            <div className="space-y-1.5">
                                                <h4 className="text-sm font-bold text-slate-300 tracking-wider uppercase">การบันทึกเพื่อการสะท้อนคิด (Reflection Use)</h4>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    ข้อมูลชุดนี้ถูกรวบรวมไว้และบันทึกในระบบเพื่อให้ผู้ใช้สามารถสังเกตความเกี่ยวเนื่อง 
                                                    รวมถึงจับคู่ความสัมพันธ์ของพลังงานส่วนบุคคล จังหวะกระบวนการทำงาน สมาธิจดจ่อ การเหนื่อยล้าสะสม 
                                                    และการเตรียมความพร้อมเพื่อวางแผนฟื้นตัวอย่างเหมาะสมในแต่ละสัปดาห์ 
                                                    โดยเน้นไปที่การใช้เป็นข้อมูลสะท้อนตนเองในเชิงสัญลักษณ์เพื่อช่วยให้สังเกตจังหวะชีวิตได้ดีขึ้น 
                                                    และไม่ใช้แทนคำแนะนำจากแพทย์หรือผู้เชี่ยวชาญ
                                                </p>
                                            </div>

                                            {/* English Disclaimer */}
                                            <div className="bg-slate-955/60 border border-slate-850 p-5 rounded-xl flex items-start gap-3">
                                                <Info className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" />
                                                <div className="space-y-1">
                                                    <span className="text-[11px] font-bold text-amber-300 tracking-wider uppercase block">
                                                        ข้อพิจารณาความเป็นส่วนตัวและการจำกัดความรับผิดชอบ (Disclaimer)
                                                    </span>
                                                    <p className="text-sm text-slate-200 font-mono tracking-tight leading-relaxed">
                                                        “{MOCK_PERSONAL_PROFILE.interpretationBoundary.disclaimer}”
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Reflection Log Input & History */}
                            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <div className="space-y-0.5">
                                        <h3 className="text-lg font-bold text-slate-100">บันทึกการสะท้อนคิดจังหวะเวลา (Reflection Log)</h3>
                                        <p className="text-xs text-slate-400">เปรียบเทียบคำพยากรณ์รอบเวลากับเหตุการณ์ที่เผชิญจริง เพื่อทบทวนการเรียนรู้</p>
                                    </div>
                                    <button 
                                        onClick={handleResetReflections}
                                        className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
                                        title="ล้างข้อมูลและใช้ข้อมูลเริ่มต้น"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> ล้างข้อมูลทั้งหมด
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                    {/* Left Form: Add Reflection */}
                                    <form onSubmit={handleAddReflection} className="lg:col-span-2 space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-850">
                                        <h4 className="text-sm font-semibold text-slate-200">เขียนบันทึกสะท้อนคิดชิ้นใหม่</h4>
                                        
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-400">หัวเรื่องบันทึก</label>
                                                <input
                                                    type="text"
                                                    value={newRefTitle}
                                                    onChange={(e) => setNewRefTitle(e.target.value)}
                                                    placeholder="เช่น รีวิวการใช้ฤกษ์วันเปิดตัวแอป"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-400">กิจกรรมที่ทดลองทำ</label>
                                                <input
                                                    type="text"
                                                    value={newRefActivity}
                                                    onChange={(e) => setNewRefActivity(e.target.value)}
                                                    placeholder="เช่น ดีลสัญญาร้านอาหารใหม่"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-400">ผลประเมินในใบคำแนะนำ</label>
                                                    <select
                                                        value={newRefRating}
                                                        onChange={(e) => setNewRefRating(e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                    >
                                                        <option value="เหมาะสมมาก">เหมาะสมมาก</option>
                                                        <option value="พอใช้ได้">พอใช้ได้</option>
                                                        <option value="ควรระวัง">ควรระวัง</option>
                                                        <option value="ควรเลื่อนออกไป">ควรเลื่อนออกไป</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-400">วันที่สังเกตการณ์</label>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={new Date().toLocaleDateString("en-CA")}
                                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 font-mono focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] text-slate-400">บันทึกสิ่งที่เกิดขึ้นจริงและการเปรียบเทียบ</label>
                                                <textarea
                                                    value={newRefText}
                                                    onChange={(e) => setNewRefText(e.target.value)}
                                                    placeholder="บันทึกความรู้สึก อุปสรรค และการเตรียมความพร้อมจริง เช่น โน้มน้าวตามคำชี้แนะได้ราบรื่น..."
                                                    rows={4}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-700 leading-relaxed"
                                                ></textarea>
                                            </div>

                                            {reflectionSavedMessage && (
                                                <span className="text-xs text-emerald-400 font-medium block">
                                                    {reflectionSavedMessage}
                                                </span>
                                            )}

                                            <button
                                                type="submit"
                                                className="w-full py-2 px-3 bg-slate-855 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                            >
                                                <Save className="w-3.5 h-3.5" />
                                                เก็บบันทึกประวัติสะท้อนคิด
                                            </button>
                                        </div>
                                    </form>

                                    {/* Right List: History Logs */}
                                    <div className="lg:col-span-3 space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                                        <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">บันทึกอดีตที่จัดเก็บไว้ ({reflections.length} รายการ)</h4>
                                        
                                        {reflections.length > 0 ? (
                                            <div className="space-y-4">
                                                {reflections.map((ref) => {
                                                    let badgeClass = "bg-slate-950 text-slate-400";
                                                    if (ref.rating === "เหมาะสมมาก") badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                                                    if (ref.rating === "พอใช้ได้") badgeClass = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
                                                    if (ref.rating === "ควรระวัง") badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                                                    if (ref.rating === "ควรเลื่อนออกไป") badgeClass = "bg-rose-500/10 text-rose-400 border border-rose-500/20";

                                                    return (
                                                        <div key={ref.id} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-3 shadow-sm hover:border-slate-800 transition-all duration-300">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                                                                <div className="space-y-0.5">
                                                                    <h5 className="font-bold text-xs text-slate-200">{ref.title}</h5>
                                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                                        กิจกรรม: {ref.activityName} • วันที่บันทึก: {ref.date}
                                                                    </span>
                                                                </div>
                                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md self-start sm:self-center ${badgeClass}`}>
                                                                    ใบชี้แนะ: {ref.rating}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-300 leading-relaxed">
                                                                {ref.text}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="py-12 border border-dashed border-slate-800 rounded-xl text-center text-slate-600 text-xs">
                                                ไม่มีบันทึกการสะท้อนคิดที่ผ่านมา
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Reflection Export / Review Log - ASTRO-APP-DEV-008B */}
                            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-6 mt-8">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-2">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-violet-300" /> Reflection Export / Review Log
                                        </h3>
                                        <p className="text-sm text-slate-400 font-medium">
                                            เครื่องมือจัดรูปแบบบันทึกสะท้อนคิดเป็น Markdown เพื่อคัดลอกไปใช้ต่อใน WorkOS, journal หรือ task note
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/40 text-violet-300 border border-violet-400/20 self-start sm:self-center">
                                        ส่งออกข้อมูล (Export)
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left inputs */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold text-slate-200">แก้ไขข้อมูลสรุปสะท้อนคิด</h4>

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-400 font-medium">Energy / Work Mode</label>
                                                    <select
                                                        value={reflectionMode}
                                                        onChange={(e) => setReflectionMode(e.target.value)}
                                                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-400/50 w-full"
                                                    >
                                                        <option value="Focus">Focus</option>
                                                        <option value="Stabilize">Stabilize</option>
                                                        <option value="Restore">Restore</option>
                                                        <option value="Communicate">Communicate</option>
                                                        <option value="Reflect">Reflect</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-400 font-medium">วันที่บันทึก (Date)</label>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={dateStr}
                                                        className="bg-slate-900 border border-slate-800/80 rounded-xl px-4 py-2.5 text-sm text-slate-400 font-mono w-full focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400 font-medium">Reflection Summary (สรุปสะท้อนคิดวันนี้)</label>
                                                <textarea
                                                    value={reflectionSummary}
                                                    onChange={(e) => setReflectionSummary(e.target.value)}
                                                    rows={3}
                                                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-400/50 w-full leading-relaxed"
                                                ></textarea>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400 font-medium">What I Noticed (สิ่งที่สังเกตเห็นจากการจับคู่จังหวะเวลา)</label>
                                                <textarea
                                                    value={noticedNotes}
                                                    onChange={(e) => setNoticedNotes(e.target.value)}
                                                    rows={3}
                                                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-400/50 w-full leading-relaxed"
                                                ></textarea>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-xs text-slate-400 font-medium">Next Right Action (ก้าวถัดไปที่ต้องทำทันที)</label>
                                                <input
                                                    type="text"
                                                    value={nextRightAction}
                                                    onChange={(e) => setNextRightAction(e.target.value)}
                                                    className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-400/50 w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Preview */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-slate-200">พรีวิวและกล่องสำรองคัดลอก (Markdown Preview)</h4>
                                            {copyStatus && (
                                                <span className="text-xs text-emerald-400 font-medium animate-pulse">
                                                    {copyStatus}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <textarea
                                                readOnly
                                                value={getMarkdownContent()}
                                                rows={10}
                                                className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono focus:outline-none w-full leading-relaxed resize-none cursor-text select-all"
                                                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                                title="คลิกเพื่อเลือกโค้ดทั้งหมดสำหรับคัดลอกด้วยตนเอง"
                                            ></textarea>

                                            <button
                                                type="button"
                                                onClick={handleCopyMarkdown}
                                                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
                                            >
                                                <ClipboardList className="w-4 h-4 text-violet-300" />
                                                {copyStatus ? "คัดลอกลงคลิปบอร์ดแล้ว!" : "คัดลอกเป็น Markdown (Copy Markdown)"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
