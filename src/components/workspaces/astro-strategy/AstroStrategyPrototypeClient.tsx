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
    HeartHandshake,
    Trash2
} from "lucide-react";

import { MOCK_PERSONAL_PROFILE } from "@/lib/types/astro-strategy";
import { deriveStrategyMode } from "@/lib/astro-strategy/strategy-rules";

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

interface ReflectionHistoryItem {
    id: string;
    version: number;
    createdAt: string;
    updatedAt?: string;
    reflectionDate: string;
    reflectionMode: string;
    reflectionSummary: string;
    noticedNotes: string;
    nextRightAction: string;
    strategyMode: string;
    dailyCheckinSnapshot: {
        energyLevel: string;
        clarityLevel: string;
        workloadPressure: string;
        focusCondition: string;
        bodySignal: string;
        todayIntention: string;
        cautionNote: string;
    };
    markdownSnapshot: string;
}

function generateUniqueId(): string {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" 
        ? crypto.randomUUID() 
        : `reflection-${Date.now()}`;
}

function getThaiTimestamp(): string {
    return new Date().toLocaleString("th-TH");
}

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

    // ASTRO-APP-DEV-015B: Daily Check-in Form States
    const [energyLevel, setEnergyLevel] = useState<string>("steady");
    const [clarityLevel, setClarityLevel] = useState<string>("clear");
    const [workloadPressure, setWorkloadPressure] = useState<string>("normal");
    const [focusCondition, setFocusCondition] = useState<string>("deep_focus");
    const [bodySignal, setBodySignal] = useState<string>("normal");
    const [todayIntention, setTodayIntention] = useState<string>("");
    const [cautionNote, setCautionNote] = useState<string>("");

    // ASTRO-APP-DEV-018B: Reflection Log Local Persistence States
    const [savedReflectionAt, setSavedReflectionAt] = useState<string>("");
    const [reflectionSaveStatus, setReflectionSaveStatus] = useState<string>("");

    // ASTRO-APP-DEV-019B: Reflection History List States
    const [historyLogs, setHistoryLogs] = useState<ReflectionHistoryItem[]>([]);
    const [historySaveStatus, setHistorySaveStatus] = useState<string>("");

    // ASTRO-APP-DEV-022B: Export History Markdown States
    const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
    const [copiedAllHistoryStatus, setCopiedAllHistoryStatus] = useState<string>("");

    // ASTRO-APP-DEV-023B: Weekly Review Summary States
    const [copiedWeeklyReviewStatus, setCopiedWeeklyReviewStatus] = useState<string>("");

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

            // Load Saved Reflection Log Draft - ASTRO-APP-DEV-018B
            try {
                const savedReflectionDraft = localStorage.getItem("astro-strategy:reflection-log:v1");
                if (savedReflectionDraft) {
                    const parsed = JSON.parse(savedReflectionDraft);
                    if (parsed && parsed.version === 1) {
                        if (parsed.reflectionMode) setReflectionMode(parsed.reflectionMode);
                        if (parsed.reflectionSummary) setReflectionSummary(parsed.reflectionSummary);
                        if (parsed.noticedNotes) setNoticedNotes(parsed.noticedNotes);
                        if (parsed.nextRightAction) setNextRightAction(parsed.nextRightAction);
                        if (parsed.savedAt) setSavedReflectionAt(parsed.savedAt);
                    }
                }
            } catch (err) {
                console.error("Failed to load saved reflection draft safely:", err);
            }

            // Load Reflection History Logs - ASTRO-APP-DEV-019B
            try {
                const savedHistory = localStorage.getItem("astro-strategy:reflection-history:v1");
                if (savedHistory) {
                    const parsed = JSON.parse(savedHistory);
                    if (Array.isArray(parsed)) {
                        const validLogs = parsed.filter((item: any) => item && item.version === 1);
                        setHistoryLogs(validLogs);
                    } else {
                        setHistoryLogs([]);
                    }
                } else {
                    setHistoryLogs([]);
                }
            } catch (err) {
                console.error("Failed to load reflection history safely:", err);
                setHistoryLogs([]);
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

    // ASTRO-APP-DEV-017B: Daily Check-in Presets and Reset UX
    const resetToday = () => {
        setEnergyLevel("steady");
        setClarityLevel("clear");
        setWorkloadPressure("normal");
        setFocusCondition("deep_focus");
        setBodySignal("normal");
        setTodayIntention("");
        setCautionNote("");
    };

    const applyCheckinPreset = (presetType: "stable" | "low_energy" | "deep_work" | "scattered") => {
        if (presetType === "stable") {
            setEnergyLevel("steady");
            setClarityLevel("clear");
            setWorkloadPressure("normal");
            setFocusCondition("deep_focus");
            setBodySignal("normal");
            setTodayIntention("");
            setCautionNote("");
        } else if (presetType === "low_energy") {
            setEnergyLevel("low");
            setClarityLevel("moderate");
            setWorkloadPressure("normal");
            setFocusCondition("recovery");
            setBodySignal("tired");
            setTodayIntention("");
            setCautionNote("");
        } else if (presetType === "deep_work") {
            setEnergyLevel("steady");
            setClarityLevel("clear");
            setWorkloadPressure("normal");
            setFocusCondition("deep_focus");
            setBodySignal("normal");
            setTodayIntention("วันนี้เหมาะกับการทำงานลึก งานคิดระบบ หรืองานที่ต้องใช้สมาธิต่อเนื่อง");
            setCautionNote("");
        } else if (presetType === "scattered") {
            setEnergyLevel("scattered");
            setClarityLevel("moderate");
            setWorkloadPressure("heavy");
            setFocusCondition("short_bursts");
            setBodySignal("tense");
            setTodayIntention("วันนี้ควรแบ่งงานเป็นรอบสั้น ๆ และลดการสลับบริบทมากเกินไป");
            setCautionNote("");
        }
    };

    // ASTRO-APP-DEV-018B: Reflection Log Local Persistence Handlers
    const handleSaveReflectionDraft = () => {
        if (typeof window !== "undefined") {
            try {
                const timestamp = getThaiTimestamp();
                const dataToSave = {
                    version: 1,
                    reflectionMode,
                    reflectionDate: dateStr,
                    reflectionSummary,
                    noticedNotes,
                    nextRightAction,
                    savedAt: timestamp
                };
                localStorage.setItem("astro-strategy:reflection-log:v1", JSON.stringify(dataToSave));
                setSavedReflectionAt(timestamp);
                setReflectionSaveStatus("บันทึกร่างสะท้อนคิดเรียบร้อยแล้ว!");
                setTimeout(() => setReflectionSaveStatus(""), 3550);
            } catch (err) {
                console.error("Failed to save reflection draft safely:", err);
                setReflectionSaveStatus("ล้มเหลวในการบันทึกร่าง");
                setTimeout(() => setReflectionSaveStatus(""), 3550);
            }
        }
    };

    const handleClearReflectionDraft = () => {
        if (typeof window !== "undefined") {
            if (window.confirm("คุณต้องการลบแบบร่างที่บันทึกไว้ใช่หรือไม่? (ข้อมูลที่กรอกปัจจุบันจะไม่หาย แต่จะไม่ถูกบันทึกในเครื่อง)")) {
                try {
                    localStorage.removeItem("astro-strategy:reflection-log:v1");
                    setSavedReflectionAt("");
                    setReflectionSaveStatus("ลบแบบร่างที่บันทึกแล้ว");
                    setTimeout(() => setReflectionSaveStatus(""), 3550);
                } catch (err) {
                    console.error("Failed to clear reflection draft safely:", err);
                }
            }
        }
    };

    // ASTRO-APP-DEV-019B: Reflection History List Handlers
    const handleSaveToHistory = () => {
        if (typeof window !== "undefined") {
            try {
                const timestamp = getThaiTimestamp();
                const newId = generateUniqueId();
                
                const newHistoryItem: ReflectionHistoryItem = {
                    id: newId,
                    version: 1,
                    createdAt: timestamp,
                    reflectionDate: dateStr,
                    reflectionMode,
                    reflectionSummary,
                    noticedNotes,
                    nextRightAction,
                    strategyMode: strategyResult ? strategyResult.strategyMode : "Stabilize",
                    dailyCheckinSnapshot: {
                        energyLevel,
                        clarityLevel,
                        workloadPressure,
                        focusCondition,
                        bodySignal,
                        todayIntention,
                        cautionNote
                    },
                    markdownSnapshot: getMarkdownContent()
                };

                const updatedHistory = [newHistoryItem, ...historyLogs].slice(0, 20);
                localStorage.setItem("astro-strategy:reflection-history:v1", JSON.stringify(updatedHistory));
                setHistoryLogs(updatedHistory);
                setHistorySaveStatus("บันทึกเข้าระบบประวัติเรียบร้อยแล้ว!");
                setTimeout(() => setHistorySaveStatus(""), 3500);
            } catch (err) {
                console.error("Failed to save to history:", err);
                if (err instanceof Error && err.name === "QuotaExceededError") {
                    setHistorySaveStatus("พื้นที่เก็บประวัติเต็ม กรุณาลบประวัติเก่าออกก่อน");
                } else {
                    setHistorySaveStatus("ล้มเหลวในการบันทึกประวัติ");
                }
                setTimeout(() => setHistorySaveStatus(""), 4500);
            }
        }
    };

    const handleLoadFromHistory = (log: ReflectionHistoryItem) => {
        if (typeof window !== "undefined") {
            if (window.confirm("คุณต้องการดึงข้อมูลสะท้อนคิดจากประวัติรายการนี้ใช่หรือไม่? การดึงข้อมูลจะเขียนทับอินพุตในแบบฟอร์มปัจจุบันของคุณ")) {
                if (log.reflectionMode) setReflectionMode(log.reflectionMode);
                if (log.reflectionSummary) setReflectionSummary(log.reflectionSummary);
                if (log.noticedNotes) setNoticedNotes(log.noticedNotes);
                if (log.nextRightAction) setNextRightAction(log.nextRightAction);
                
                setHistorySaveStatus(`โหลดประวัติของวันที่ ${log.reflectionDate} เรียบร้อย!`);
                setTimeout(() => setHistorySaveStatus(""), 3500);
            }
        }
    };

    const handleDeleteFromHistory = (id: string) => {
        if (typeof window !== "undefined") {
            if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบประวัติรายการนี้?")) {
                try {
                    const updatedHistory = historyLogs.filter(item => item.id !== id);
                    localStorage.setItem("astro-strategy:reflection-history:v1", JSON.stringify(updatedHistory));
                    setHistoryLogs(updatedHistory);
                    setHistorySaveStatus("ลบรายการประวัติสำเร็จ");
                    setTimeout(() => setHistorySaveStatus(""), 3000);
                } catch (err) {
                    console.error("Failed to delete history item safely:", err);
                }
            }
        }
    };

    const handleClearAllHistory = () => {
        if (typeof window !== "undefined") {
            if (window.confirm("คุณต้องการล้างคลังประวัติทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
                try {
                    localStorage.removeItem("astro-strategy:reflection-history:v1");
                    setHistoryLogs([]);
                    setHistorySaveStatus("ล้างคลังประวัติทั้งหมดแล้ว");
                    setTimeout(() => setHistorySaveStatus(""), 3000);
                } catch (err) {
                    console.error("Failed to clear all history safely:", err);
                }
            }
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

## Daily Check-in Context / บริบทเช็กอินวันนี้
- ระดับพลังงาน: ${energyLevelLabels[energyLevel] || energyLevel}
- ระดับความคิด: ${clarityLevelLabels[clarityLevel] || clarityLevel}
- ภาระงานวันนี้: ${workloadPressureLabels[workloadPressure] || workloadPressure}
- สภาวะสมาธิ: ${focusConditionLabels[focusCondition] || focusCondition}
- สัญญาณร่างกายที่สังเกตวันนี้: ${bodySignalLabels[bodySignal] || bodySignal}
- ความตั้งใจหลักวันนี้: ${todayIntention.trim() || "ยังไม่ได้กรอก"}
- ข้อควรระวังเสริม: ${cautionNote.trim() || "ไม่มี"}

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

    // ASTRO-APP-DEV-022B: Export History Markdown Handlers
    const generateHistoryFallbackMarkdown = (item: ReflectionHistoryItem): string => {
        const checkin = item.dailyCheckinSnapshot || {
            energyLevel: "steady",
            clarityLevel: "clear",
            workloadPressure: "normal",
            focusCondition: "deep_focus",
            bodySignal: "normal",
            todayIntention: "",
            cautionNote: ""
        };
        return `# Astro Reflection Log

Date: ${item.reflectionDate}
Mode: ${item.reflectionMode || "Stabilize"}

## Today’s Reflection
${item.reflectionSummary || "(ไม่มีข้อมูล)"}

## What I Noticed
${item.noticedNotes || "(ไม่มีข้อมูล)"}

## Next Right Action
${item.nextRightAction || "(ไม่มีข้อมูล)"}

## Daily Check-in Context / บริบทเช็กอินวันนี้
- ระดับพลังงาน: ${energyLevelLabels[checkin.energyLevel] || checkin.energyLevel || "steady"}
- ระดับความคิด: ${clarityLevelLabels[checkin.clarityLevel] || checkin.clarityLevel || "clear"}
- ภาระงานวันนี้: ${workloadPressureLabels[checkin.workloadPressure] || checkin.workloadPressure || "normal"}
- สภาวะสมาธิ: ${focusConditionLabels[checkin.focusCondition] || checkin.focusCondition || "deep_focus"}
- สัญญาณร่างกายที่สังเกตวันนี้: ${bodySignalLabels[checkin.bodySignal] || checkin.bodySignal || "normal"}
- ความตั้งใจหลักวันนี้: ${checkin.todayIntention ? checkin.todayIntention.trim() : "ยังไม่ได้กรอก"}
- ข้อควรระวังเสริม: ${checkin.cautionNote ? checkin.cautionNote.trim() : "ไม่มี"}

## Guardrail
บันทึกนี้ใช้เพื่อการสะท้อนคิดและวางแผนส่วนบุคคล ไม่ใช่คำแนะนำทางการแพทย์ การวินิจฉัย หรือการรักษา`;
    };

    const handleCopyHistoryItem = async (item: ReflectionHistoryItem) => {
        const markdown = item.markdownSnapshot || generateHistoryFallbackMarkdown(item);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(markdown);
                setCopiedHistoryId(item.id);
                setTimeout(() => setCopiedHistoryId(null), 2000);
            } else {
                alert("เบราว์เซอร์ของคุณไม่รองรับการคัดลอกลงคลิปบอร์ดอัตโนมัติ");
            }
        } catch (err) {
            console.error("Failed to copy history item:", err);
        }
    };

    const handleCopyAllHistory = async () => {
        if (historyLogs.length === 0) return;
        
        const timestamp = new Date().toLocaleString("th-TH");
        let content = `# Astro Reflection History Archive

Generated: ${timestamp} (เวลาท้องถิ่น)
Total Records: ${historyLogs.length}

`;

        historyLogs.forEach((item, index) => {
            const itemMarkdown = item.markdownSnapshot || generateHistoryFallbackMarkdown(item);
            content += `---

## Log ${index + 1} — ${item.reflectionDate || item.createdAt}

${itemMarkdown}

`;
        });

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(content);
                setCopiedAllHistoryStatus("คัดลอกทั้งหมดแล้ว! ✅");
                setTimeout(() => setCopiedAllHistoryStatus(""), 2000);
            } else {
                alert("เบราว์เซอร์ของคุณไม่รองรับการคัดลอกลงคลิปบอร์ดอัตโนมัติ");
            }
        } catch (err) {
            console.error("Failed to copy all history:", err);
            setCopiedAllHistoryStatus("เกิดข้อผิดพลาดในการคัดลอก");
            setTimeout(() => setCopiedAllHistoryStatus(""), 2500);
        }
    };

    // ASTRO-APP-DEV-023B: Weekly Review Summary Logic
    const generateWeeklyReviewMarkdown = (): string => {
        if (historyLogs.length === 0) return "# Astro Weekly Review Summary\n\nยังไม่มีประวัติการสะท้อนคิดที่ถูกบันทึกในเครื่อง";

        const timestamp = new Date().toLocaleString("th-TH");
        const latestLogs = historyLogs.slice(0, 5);
        
        // 1. หา Intention ล่าสุดที่มีการระบุ
        let latestIntention = "ยังไม่มีข้อมูลความตั้งใจล่าสุด";
        for (const log of historyLogs) {
            if (log.dailyCheckinSnapshot?.todayIntention?.trim()) {
                latestIntention = log.dailyCheckinSnapshot.todayIntention.trim();
                break;
            }
        }

        // 2. รวบรวม Caution Notes ย้อนหลัง 5 รายการ (ที่มีการระบุ)
        const recentCautions: string[] = [];
        latestLogs.forEach(log => {
            const note = log.dailyCheckinSnapshot?.cautionNote?.trim();
            if (note && !recentCautions.includes(note)) {
                recentCautions.push(note);
            }
        });

        let logsMarkdown = "";
        latestLogs.forEach((log) => {
            const dateDisplay = log.reflectionDate || log.createdAt;
            const summaryText = log.reflectionSummary ? log.reflectionSummary.trim() : "ไม่มีข้อมูลการสะท้อนคิด";
            logsMarkdown += `- ${dateDisplay} — โหมดสะท้อนคิด: ${log.reflectionMode || "Stabilize"} | โหมดกลยุทธ์: ${log.strategyMode || "Normal"}\n  สรุป: ${summaryText}\n`;
        });

        let cautionsMarkdown = "";
        if (recentCautions.length > 0) {
            recentCautions.forEach(note => {
                cautionsMarkdown += `- ${note}\n`;
            });
        } else {
            cautionsMarkdown = "ไม่มีข้อควรระวังล่าสุดในการจัดจังหวะส่วนตัวสัปดาห์นี้\n";
        }

        return `# Astro Weekly Review Summary

Generated At: ${timestamp} (เวลาท้องถิ่น)
Total Records in Archive: ${historyLogs.length}

## Recent Reflection Logs (บันทึกสะท้อนคิดล่าสุด 5 รายการ)
${logsMarkdown || "- ยังไม่มีบันทึกการสะท้อนคิด\n"}
## Latest Intention (เป้าหมายความตั้งใจล่าสุด)
> ${latestIntention}

## Recent Caution Notes (ข้อควรระวังล่าสุดในการจัดจังหวะส่วนตัว)
${cautionsMarkdown}
---
หมายเหตุ: สรุปนี้เป็นสรุปเชิงข้อมูลเชิงยุทธศาสตร์ที่สร้างจากประวัติสะท้อนคิด (Reflection History) และบริบทงานที่บันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ใช่การประเมินหรือคำแนะนำทางการแพทย์`;
    };

    const handleCopyWeeklyReview = async () => {
        if (historyLogs.length === 0) return;
        const markdown = generateWeeklyReviewMarkdown();
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(markdown);
                setCopiedWeeklyReviewStatus("คัดลอกสรุปสัปดาห์แล้ว! ✅");
                setTimeout(() => setCopiedWeeklyReviewStatus(""), 2000);
            } else {
                alert("เบราว์เซอร์ของคุณไม่รองรับการคัดลอกลงคลิปบอร์ดอัตโนมัติ");
            }
        } catch (err) {
            console.error("Failed to copy weekly review summary:", err);
            setCopiedWeeklyReviewStatus("เกิดข้อผิดพลาดในการคัดลอก");
            setTimeout(() => setCopiedWeeklyReviewStatus(""), 2000);
        }
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

    // ASTRO-APP-DEV-010B: Translation Maps for Daily Timing Brief v0.6
    const workRecommendationThaiMap: Record<string, string> = {
        "structure before expansion": "จัดระบบก่อนขยายงาน",
        "one checkpoint at a time": "ปิดงานให้เป็น checkpoint ทีละเรื่อง",
        "strategic planning": "วางแผนเชิงกลยุทธ์",
        "content system design": "ออกแบบระบบคอนเทนต์",
        "AI-assisted workflow building": "สร้าง workflow โดยใช้ AI ช่วยจัดระบบ",
        "knowledge synthesis": "สังเคราะห์องค์ความรู้",
        "green/nature-related work": "งานที่เกี่ยวข้องกับธรรมชาติและระบบความรู้สีเขียว"
    };

    const riskPreventionThaiMap: Record<string, string> = {
        "looping thoughts": "สังเกตภาวะคิดวนและหยุดพักก่อนตัดสินใจต่อ",
        "too much project switching": "ลดการสลับโปรเจกต์ถี่เกินไป",
        "urge to fix everything at once": "ไม่ต้องแก้ทุกอย่างพร้อมกัน ให้เลือกจุดเดียวที่สำคัญที่สุด",
        "difficulty stopping work": "ตั้งขอบเขตเวลาหยุดงานให้ชัด",
        "opening too many dev/content tasks": "หลีกเลี่ยงการเปิดงาน dev/content หลายชิ้นพร้อมกัน",
        "late-night screen work": "ระวังงานหน้าจอดึกเกินไป",
        "lack of reflection pause": "เว้นช่วง reflection สั้น ๆ ก่อนเปิดงานถัดไป"
    };

    const recoveryAnchorThaiMap: Record<string, string> = {
        "3-minute eye rest": "พักสายตา 3 นาที",
        "5-minute breathing pause": "หยุดหายใจช้า ๆ 5 นาที",
        "walk near trees": "เดินใกล้ต้นไม้หรือพื้นที่ธรรมชาติ",
        "write one reflection note": "เขียน reflection note สั้น ๆ หนึ่งบันทึก",
        "close one task before opening another": "ปิดงานหนึ่งเรื่องก่อนเปิดงานใหม่"
    };

    const strategyModeThaiMap: Record<string, string> = {
        "Stabilize & Structure": "ประคองและจัดระบบ (Stabilize & Structure)",
        "Focus & Deliver": "โฟกัสและส่งมอบงาน (Focus & Deliver)",
        "Pause & Calibrate": "พักจังหวะและปรับสมดุล (Pause & Calibrate)"
    };

    const guardrailThaiMap: Record<string, string> = {
        "For personal reflection and planning only. Not medical advice, diagnosis, or treatment.":
            "ใช้เพื่อการสะท้อนคิดและวางแผนส่วนบุคคลเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ การวินิจฉัย หรือการรักษา"
    };

    const reflectionPromptThaiMap: Record<string, string> = {
        "Stabilize & Structure": "วันนี้มีงานหรือโปรเจกต์ใดที่ควรปิดเป็น checkpoint เล็ก ๆ ก่อนเปิดเรื่องใหม่?",
        "Focus & Deliver": "วันนี้ output สำคัญที่สุดเพียงหนึ่งเรื่องที่ควรโฟกัสและส่งมอบให้ชัดเจนคืออะไร?",
        "Pause & Calibrate": "วันนี้มีสัญญาณใดที่บอกว่าควรพักจังหวะ ปรับสมดุล หรือชะลอก่อนเดินต่อ?"
    };

    const defaultReflectionPrompt =
        "วันนี้มีงานใดที่ควรทำให้น้อยลง แต่ชัดขึ้น หรือไม่?";

    // ASTRO-APP-DEV-015B: Daily Check-in Translation Maps
    const energyLevelLabels: Record<string, string> = {
        low: "ต่ำ / ควรเบาแรง",
        steady: "คงที่ / ทำงานต่อเนื่องได้",
        high: "สูง / เหมาะกับงานสำคัญ",
        scattered: "มีแรงแต่โฟกัสกระจาย"
    };

    const clarityLevelLabels: Record<string, string> = {
        clear: "ชัดเจน",
        moderate: "ปานกลาง",
        unclear: "ยังไม่ชัด"
    };

    const workloadPressureLabels: Record<string, string> = {
        light: "เบา",
        normal: "ปกติ",
        heavy: "หนัก",
        overloaded: "มากเกินไป"
    };

    const focusConditionLabels: Record<string, string> = {
        deep_focus: "เหมาะกับงานลึก",
        short_bursts: "เหมาะกับงานสั้นเป็นรอบ",
        distracted: "โฟกัสหลุดง่าย",
        recovery: "ควรฟื้นพลัง / ทบทวน"
    };

    const bodySignalLabels: Record<string, string> = {
        normal: "ปกติ",
        tired: "เหนื่อย",
        tense: "ตึง / กดดัน",
        needs_rest: "ควรพักมากขึ้น"
    };

    const profile = MOCK_PERSONAL_PROFILE;

    const dailyWorkRecommendations = [
        ...profile.workEnergyPattern.preferredWorkModes.slice(0, 2),
        ...profile.workEnergyPattern.energizingWork.slice(0, 2),
    ];

    const dailyRiskPrevention = [
        ...profile.personalWarningSigns.mental.slice(0, 2),
        ...profile.personalWarningSigns.workPattern.slice(0, 2),
    ];

    const dailyRecoveryAnchors = profile.practiceAnchors.shortAnchors.slice(0, 4);

    // ASTRO-APP-DEV-011B: Weekly Strategy View Translation Maps & Derived Variables
    const weeklyThemeThaiMap: Record<string, string> = {
        "structure before expansion": "Structure Before Expansion",
        "one checkpoint at a time": "One Checkpoint at a Time",
        "deep work with clear output": "Deep Work with Clear Output"
    };

    const weeklyWindowLabels = [
        "ช่วงต้นสัปดาห์",
        "ช่วงกลางสัปดาห์",
        "ช่วงปลายสัปดาห์"
    ];

    const weeklyThemeRaw = profile.workEnergyPattern.preferredWorkModes[0] ?? "structure before expansion";

    const weeklyBestWorkWindows = profile.workEnergyPattern.energizingWork.slice(0, 3);

    const weeklyCautionWindows = [
        ...profile.workEnergyPattern.drainingWork.slice(0, 2),
        ...profile.personalWarningSigns.workPattern.slice(0, 2),
    ];

    const weeklyRecoveryRhythm = [
        ...profile.practiceAnchors.shortAnchors.slice(0, 2),
        ...profile.practiceAnchors.eveningAnchors.slice(0, 2),
    ];

    const strategyResult = deriveStrategyMode(MOCK_PERSONAL_PROFILE);

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
                        <span className="font-mono">{dateStr}</span>
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
                                    
                                    {/* Quick Start Guide - ASTRO-APP-DEV-021 */}
                                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                                            <Compass className="w-4.5 h-4.5 text-indigo-400" />
                                            <h3 className="font-semibold text-sm text-slate-100">คู่มือการใช้งานด่วน (Quick Start Guide)</h3>
                                        </div>
                                        <div className="text-xs text-slate-350 space-y-3 leading-relaxed">
                                            <div className="flex gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center font-bold text-indigo-300 text-[10px] flex-shrink-0">1</span>
                                                <p>
                                                    <strong className="text-slate-200">ระบุเป้าหมายรอบเวลา</strong>: เลือกเดือนการพิจารณาและพิมพ์แผนยุทธศาสตร์ในแถบด้านบน เพื่อใช้เตือนใจตลอดรอบเดือน
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center font-bold text-indigo-300 text-[10px] flex-shrink-0">2</span>
                                                <p>
                                                    <strong className="text-slate-200">ประเมินสภาวะจริง</strong>: ตอบดรอปดาวน์ **Daily Check-in** ในแผงขวาตามสภาพจริง เพื่อปรับโหมดการทำงานประจำวันให้สอดรับกับสภาวะและบริบทงานของวันนี้มากขึ้น
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="w-5 h-5 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center font-bold text-indigo-300 text-[10px] flex-shrink-0">3</span>
                                                <p>
                                                    <strong className="text-slate-200">ทบทวนและทริกเกอร์บันทึก</strong>: สรุปผลงานที่เสร็จและข้อสังเกตลงในแท็บ **สะท้อนคิด** เพื่อคัดลอก Markdown หรือกดเก็บเข้าแฟ้มคลังประวัติศาสตร์
                                                </p>
                                            </div>
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
                                    {/* Strategy Mode Card */}
                                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-7 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                                    <Compass className="w-5 h-5 text-violet-400" /> Strategy Mode
                                                </h3>
                                                <p className="text-xs text-slate-400 font-medium">โหมดกลยุทธ์ส่วนบุคคลตามวิเคราะห์การแจ้งเตือนพฤติกรรม</p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/40 text-violet-200 border border-violet-400/20 self-start sm:self-center">
                                                {strategyModeThaiMap[strategyResult.strategyMode] || strategyResult.strategyMode}
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Trigger Signal & Reason */}
                                            <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-2">
                                                <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider block">
                                                    Trigger Signal & Reason
                                                </span>
                                                <p className="text-sm font-semibold text-slate-200">
                                                    {strategyResult.triggerSignal}
                                                </p>
                                                <p className="text-xs text-slate-400 leading-relaxed">
                                                    {strategyResult.reason}
                                                </p>
                                            </div>

                                            {/* Action & Recovery rhythm */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Recommended Move */}
                                                <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-1.5">
                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Recommended Move
                                                    </span>
                                                    <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed">
                                                        {strategyResult.recommendedMove}
                                                    </p>
                                                </div>

                                                {/* Recovery Support */}
                                                <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl space-y-1.5">
                                                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <HeartHandshake className="w-3.5 h-3.5" /> Recovery Support
                                                    </span>
                                                    <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed">
                                                        {recoveryAnchorThaiMap[strategyResult.recoverySupport] || strategyResult.recoverySupport}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Disclaimer Guardrail */}
                                        <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-3 leading-normal">
                                            * {guardrailThaiMap[strategyResult.guardrail] || strategyResult.guardrail}
                                        </div>
                                    </div>

                                    {/* Daily Check-in Card */}
                                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-7 space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                                    <ClipboardList className="w-5 h-5 text-violet-400" /> Daily Check-in
                                                </h3>
                                                <p className="text-xs text-slate-400 font-medium">เช็กอินสภาวะร่างกาย พลังงาน และระดับสมาธิของตนเองวันนี้</p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-violet-400/10 text-violet-300 border border-violet-300/20 self-start sm:self-center">
                                                สภาวะจริงวันนี้ (Check-in)
                                            </span>
                                        </div>

                                        {/* Quick Presets and Reset row */}
                                        <div className="flex flex-wrap items-center gap-2 bg-slate-955/40 p-3.5 rounded-xl border border-slate-800/80 text-xs">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block w-full sm:w-auto mr-1">
                                                Quick Presets / ตัวช่วยตั้งค่าเร็ว:
                                            </span>
                                            
                                            <button
                                                type="button"
                                                onClick={() => applyCheckinPreset("stable")}
                                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-800 hover:border-slate-700 transition-all active:scale-[0.98]"
                                            >
                                                วันคงที่
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyCheckinPreset("low_energy")}
                                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-800 hover:border-slate-700 transition-all active:scale-[0.98]"
                                            >
                                                วันพลังงานต่ำ
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyCheckinPreset("deep_work")}
                                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-800 hover:border-slate-700 transition-all active:scale-[0.98]"
                                            >
                                                วันงานลึก
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyCheckinPreset("scattered")}
                                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-800 hover:border-slate-700 transition-all active:scale-[0.98]"
                                            >
                                                วันโฟกัสกระจาย
                                            </button>

                                            <div className="sm:ml-auto w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={resetToday}
                                                    className="px-2.5 py-1.5 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 rounded-lg text-[11px] font-semibold border border-rose-500/20 hover:border-rose-500/30 transition-all flex items-center gap-1 active:scale-[0.97]"
                                                    title="ล้างข้อมูลการเช็กอินทั้งหมดกลับไปเป็นค่าดีฟอลต์"
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5 text-rose-400" /> เริ่มวันใหม่ / Reset
                                                </button>
                                            </div>

                                            {/* Guide Helper Text - ASTRO-APP-DEV-021B */}
                                            <div className="w-full text-[10px] text-slate-450 italic block leading-relaxed pt-2.5 border-t border-slate-800/60 mt-1">
                                                *คำแนะนำ: ใช้ตัวช่วยตั้งค่าด่วนเพื่อเริ่มต้นเช็กอิน จากนั้นปรับแต่ละช่องให้ตรงกับสภาวะและบริบทงานของวันนี้มากขึ้น
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {/* Energy Level */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-semibold block">ระดับพลังงาน (Energy)</label>
                                                <select
                                                    value={energyLevel}
                                                    onChange={(e) => setEnergyLevel(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                >
                                                    {Object.entries(energyLevelLabels).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Clarity Level */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-semibold block">ระดับความคิด (Clarity)</label>
                                                <select
                                                    value={clarityLevel}
                                                    onChange={(e) => setClarityLevel(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                >
                                                    {Object.entries(clarityLevelLabels).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Workload Pressure */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-semibold block">ภาระงานวันนี้ (Workload)</label>
                                                <select
                                                    value={workloadPressure}
                                                    onChange={(e) => setWorkloadPressure(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                >
                                                    {Object.entries(workloadPressureLabels).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Focus Condition */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-semibold block">สภาวะสมาธิ (Focus)</label>
                                                <select
                                                    value={focusCondition}
                                                    onChange={(e) => setFocusCondition(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                >
                                                    {Object.entries(focusConditionLabels).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Body Signal */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-semibold block">สัญญาณร่างกาย (Body Signal)</label>
                                                <select
                                                    value={bodySignal}
                                                    onChange={(e) => setBodySignal(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                                >
                                                    {Object.entries(bodySignalLabels).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Today Intention */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-semibold block">ความตั้งใจหลักวันนี้ (Today’s Intention)</label>
                                                <textarea
                                                    value={todayIntention}
                                                    onChange={(e) => setTodayIntention(e.target.value)}
                                                    placeholder="เช่น โฟกัสงานพัฒนาแกนตรรกะระบบ หรือ จัดทำบันทึกสรุปความต้องการให้เสร็จ..."
                                                    rows={2}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-700 leading-relaxed"
                                                ></textarea>
                                            </div>

                                            {/* Caution Note */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-semibold block">ข้อระวังเสริม (Caution Note - ไม่บังคับ)</label>
                                                <textarea
                                                    value={cautionNote}
                                                    onChange={(e) => setCautionNote(e.target.value)}
                                                    placeholder="ระบุข้อควรระวัง เช่น รู้สึกตึงบ่าไหล่เล็กน้อย หรือระวังความคิดวนซ้ำซ้อนรอบบ่าย..."
                                                    rows={2}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-700 leading-relaxed"
                                                ></textarea>
                                            </div>
                                        </div>

                                        {/* Summary section inside the card */}
                                        <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3 hover:border-slate-850 transition-all">
                                            <h4 className="text-xs font-bold text-violet-300 tracking-wider uppercase flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Today’s Check-in Summary (สรุปความพร้อมสภาวะจริงวันนี้)
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs leading-relaxed border-b border-slate-800/60 pb-3">
                                                <div>
                                                    <span className="text-slate-400 block font-medium">ระดับพลังงาน:</span>
                                                    <span className="text-slate-250 font-semibold">{energyLevelLabels[energyLevel] || energyLevel}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block font-medium">ระดับความคิด:</span>
                                                    <span className="text-slate-250 font-semibold">{clarityLevelLabels[clarityLevel] || clarityLevel}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block font-medium">ภาระงานวันนี้:</span>
                                                    <span className="text-slate-250 font-semibold">{workloadPressureLabels[workloadPressure] || workloadPressure}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block font-medium">สภาวะสมาธิ:</span>
                                                    <span className="text-slate-250 font-semibold">{focusConditionLabels[focusCondition] || focusCondition}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block font-medium">สัญญาณร่างกาย:</span>
                                                    <span className="text-slate-250 font-semibold">{bodySignalLabels[bodySignal] || bodySignal}</span>
                                                </div>
                                            </div>

                                            <div className="text-xs space-y-2 leading-relaxed">
                                                <div>
                                                    <span className="text-slate-400 font-medium block">ความตั้งใจหลักวันนี้:</span>
                                                    <p className="text-slate-250 font-medium whitespace-pre-wrap">{todayIntention.trim() || "(ยังไม่ได้กรอก)"}</p>
                                                </div>
                                                {cautionNote.trim() && (
                                                    <div>
                                                        <span className="text-slate-400 font-medium block">ข้อระวังเสริม:</span>
                                                        <p className="text-slate-250 font-medium whitespace-pre-wrap">{cautionNote.trim()}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

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
                                                    {dailyWorkRecommendations.map((item, idx) => (
                                                        <li key={idx}>{workRecommendationThaiMap[item] || item}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Risk Prevention */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-rose-400">
                                                    <ShieldAlert className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">การคุมความเสี่ยง (Risk Prevention)</h4>
                                                </div>
                                                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed">
                                                    {dailyRiskPrevention.map((item, idx) => (
                                                        <li key={idx}>{riskPreventionThaiMap[item] || item}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Recovery Anchor */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-violet-300">
                                                    <Activity className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">สมอใจฟื้นฟู (Recovery Anchor)</h4>
                                                </div>
                                                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed">
                                                    {dailyRecoveryAnchors.map((item, idx) => (
                                                        <li key={idx}>{recoveryAnchorThaiMap[item] || item}</li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Reflection Prompt */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-amber-400">
                                                    <MessageSquare className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">คำถามสะท้อนคิด (Reflection Prompt)</h4>
                                                </div>
                                                <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                                                    {`“${reflectionPromptThaiMap[strategyResult.strategyMode] || defaultReflectionPrompt}”`}
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
                                            <h4 className="text-lg font-bold text-slate-200">{weeklyThemeThaiMap[weeklyThemeRaw] || weeklyThemeRaw}</h4>
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
                                                    {weeklyBestWorkWindows.map((item, idx) => (
                                                        <li key={idx}>
                                                            <strong className="text-slate-200">{weeklyWindowLabels[idx] || `ช่วงที่ ${idx + 1}`}:</strong> {workRecommendationThaiMap[item] || item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Caution Windows */}
                                            <div className="bg-slate-950/50 border border-slate-800/70 p-6 rounded-xl space-y-3 hover:border-slate-800 transition-all">
                                                <div className="flex items-center gap-2 text-amber-300">
                                                    <ShieldAlert className="w-5 h-5" />
                                                    <h4 className="font-bold text-sm sm:text-base">Caution Windows</h4>
                                                </div>
                                                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed">
                                                    {weeklyCautionWindows.map((item, idx) => (
                                                        <li key={idx}>{riskPreventionThaiMap[item] || item}</li>
                                                    ))}
                                                </ul>
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
                                                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed">
                                                    {weeklyRecoveryRhythm.map((item, idx) => (
                                                        <li key={idx}>{recoveryAnchorThaiMap[item] || item}</li>
                                                    ))}
                                                </ul>
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
                                            <div className="py-12 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs bg-slate-950/10 space-y-1.5">
                                                <p className="font-semibold text-slate-400">ไม่มีบันทึกการสะท้อนคิดย้อนหลัง</p>
                                                <p className="text-[10px] text-slate-600 max-w-[220px] mx-auto leading-relaxed">
                                                    เขียนบันทึกชิ้นใหม่ทางด้านซ้ายเพื่อสะท้อนทบทวนความคิดของการทดลองวันนี้
                                                </p>
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
                                            <BookOpen className="w-5 h-5 text-violet-300" /> ส่งออกบันทึกสะท้อนคิด (Reflection Export / Review Log)
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

                                        {/* Daily Check-in Context Read-only Card */}
                                        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 sm:p-5 space-y-4">
                                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                                <ClipboardList className="w-4 h-4 text-violet-400" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-200">บริบทประเมินผลเช็กอินรายวัน (Daily Check-in Context)</span>
                                                    <span className="text-[10px] text-slate-400">บริบทเช็กอินวันนี้</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs leading-relaxed">
                                                <div>
                                                    <span className="text-slate-450 block font-medium">ระดับพลังงาน (Energy):</span>
                                                    <span className="text-slate-200 font-semibold">{energyLevelLabels[energyLevel] || energyLevel}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-450 block font-medium">ระดับความคิด (Clarity):</span>
                                                    <span className="text-slate-200 font-semibold">{clarityLevelLabels[clarityLevel] || clarityLevel}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-450 block font-medium">ภาระงานวันนี้ (Workload):</span>
                                                    <span className="text-slate-200 font-semibold">{workloadPressureLabels[workloadPressure] || workloadPressure}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-450 block font-medium">สภาวะสมาธิ (Focus):</span>
                                                    <span className="text-slate-200 font-semibold">{focusConditionLabels[focusCondition] || focusCondition}</span>
                                                </div>
                                                <div className="col-span-2 sm:col-span-3">
                                                    <span className="text-slate-450 block font-medium">สัญญาณร่างกาย (Body Signal):</span>
                                                    <span className="text-slate-200 font-semibold">{bodySignalLabels[bodySignal] || bodySignal}</span>
                                                </div>
                                            </div>

                                            <div className="text-xs space-y-2 leading-relaxed border-t border-slate-800/60 pt-3">
                                                <div>
                                                    <span className="text-slate-450 font-medium block">ความตั้งใจหลักวันนี้:</span>
                                                    <p className="text-slate-300 font-medium whitespace-pre-wrap italic">{todayIntention.trim() || "ยังไม่ได้กรอก"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-450 font-medium block">ข้อควรระวังเสริม:</span>
                                                    <p className="text-slate-300 font-medium whitespace-pre-wrap italic">{cautionNote.trim() || "ไม่มี"}</p>
                                                </div>
                                            </div>
                                        </div>

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

                                            {/* Button Explanations Card - ASTRO-APP-DEV-021B */}
                                            <div className="bg-slate-955/45 rounded-xl p-3.5 border border-slate-850/60 text-[10px] text-slate-400 leading-relaxed space-y-1.5 mt-2 mb-3">
                                                <div className="flex items-start gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 flex-shrink-0"></span>
                                                    <p>
                                                        <strong className="text-indigo-300 font-semibold">บันทึกเข้าประวัติ (Save as History)</strong>: 
                                                        จัดเก็บสะท้อนคิด, บริบทของวันนี้, และแผนงานแบบถาวรลงในคลังประวัติศาสตร์ย้อนหลังของเบราว์เซอร์ เพื่อใช้วิเคราะห์และเปรียบเทียบในอนาคต (จำกัดสูงสุด 20 บันทึก)
                                                    </p>
                                                </div>
                                                <div className="flex items-start gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1 flex-shrink-0"></span>
                                                    <p>
                                                        <strong className="text-slate-300 font-semibold">บันทึกร่างแบบชั่วคราว (Save Draft)</strong>: 
                                                        บันทึกเนื้อหาที่กำลังเขียนสะท้อนคิดเก็บไว้ในเบราว์เซอร์แบบทันที เพื่อป้องกันข้อมูลสูญหายเมื่อเผลอปิดหรือรีโหลดหน้าเว็บโดยไม่ได้ตั้งใจ
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Draft Persistence Actions */}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-slate-800/60 w-full">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveToHistory}
                                                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-indigo-950/20"
                                                >
                                                    <History className="w-3.5 h-3.5 text-indigo-200" /> บันทึกเข้าประวัติ (Save as History)
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleSaveReflectionDraft}
                                                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-slate-200 border border-slate-700/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                                                >
                                                    <Save className="w-3.5 h-3.5 text-slate-400" /> บันทึกร่างแบบชั่วคราว (Save Draft)
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleClearReflectionDraft}
                                                    className="w-full sm:w-auto px-4 py-2.5 bg-transparent hover:bg-rose-950/15 text-rose-400 hover:text-rose-350 border border-slate-800/80 hover:border-rose-900/20 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                                                >
                                                    ล้างแบบร่าง
                                                </button>

                                                {savedReflectionAt && (
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 sm:ml-auto">
                                                        <span>ดราฟต์เซฟ:</span>
                                                        <span className="font-mono text-slate-300 font-bold">{savedReflectionAt}</span>
                                                    </div>
                                                )}

                                                {reflectionSaveStatus && (
                                                    <div className="w-full text-xs text-emerald-400 font-medium animate-pulse pt-1">
                                                        {reflectionSaveStatus}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ASTRO-APP-DEV-023B: Weekly Review Summary Section */}
                                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 mt-6">
                                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Compass className="w-4.5 h-4.5 text-violet-400" />
                                                    <h4 className="text-sm font-semibold text-slate-200">บททบทวนภาพรวมรายสัปดาห์ (Weekly Review Summary)</h4>
                                                </div>
                                                {historyLogs.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyWeeklyReview}
                                                        className="text-[10px] text-violet-400 hover:text-violet-350 active:text-violet-500 font-semibold transition-colors flex items-center gap-1 border border-violet-500/20 px-2.5 py-1 rounded bg-violet-955/20 hover:bg-violet-955/35 active:scale-[0.98]"
                                                    >
                                                        <ClipboardList className="w-3.5 h-3.5 text-violet-300" />
                                                        {copiedWeeklyReviewStatus ? copiedWeeklyReviewStatus : "คัดลอกสรุปสัปดาห์"}
                                                    </button>
                                                )}
                                            </div>

                                            {historyLogs.length === 0 ? (
                                                <div className="text-center py-6 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-slate-500 italic space-y-1.5">
                                                    <p className="text-xs">ยังไม่มีข้อมูลสำหรับจัดทำบททบทวนประจำสัปดาห์</p>
                                                    <p className="text-[10px] text-slate-600 max-w-sm mx-auto leading-relaxed not-italic">
                                                        เมื่อคุณบันทึกสะท้อนคิดประจำวันเข้าสู่ระบบประวัติอย่างน้อย 1 รายการ คลังความรู้ท้องถิ่นนี้จะประมวลผลสรุปความตั้งใจหลัก โหมดกลยุทธ์ และข้อควรระวังให้โดยอัตโนมัติ
                                                    </p>
                                                </div>
                                            ) : (() => {
                                                const latestLogs = historyLogs.slice(0, 5);
                                                
                                                // ค้นหา Intention ล่าสุดที่มีข้อมูล
                                                let latestIntention = "ยังไม่มีข้อมูลความตั้งใจล่าสุด";
                                                for (const log of historyLogs) {
                                                    if (log.dailyCheckinSnapshot?.todayIntention?.trim()) {
                                                        latestIntention = log.dailyCheckinSnapshot.todayIntention.trim();
                                                        break;
                                                    }
                                                }

                                                // รวบรวม Caution Notes ล่าสุด (5 วันย้อนหลัง) ที่มีข้อมูลจริง
                                                const recentCautions: string[] = [];
                                                latestLogs.forEach(log => {
                                                    const note = log.dailyCheckinSnapshot?.cautionNote?.trim();
                                                    if (note && !recentCautions.includes(note)) {
                                                        recentCautions.push(note);
                                                    }
                                                });

                                                return (
                                                    <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* ฝั่งซ้าย: บันทึกล่าสุด */}
                                                            <div className="bg-slate-950/30 rounded-xl p-3.5 border border-slate-800/50 space-y-2">
                                                                <h5 className="font-semibold text-slate-350 flex items-center gap-1.5 pb-1.5 border-b border-slate-800/40">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                                                    ความเคลื่อนไหวสะท้อนคิด 5 รอบล่าสุด
                                                                </h5>
                                                                <ul className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                                                                    {latestLogs.map((log) => {
                                                                        const dateDisplay = log.reflectionDate || log.createdAt;
                                                                        return (
                                                                            <li key={log.id} className="space-y-0.5 border-b border-slate-900/50 pb-1.5 last:border-0 last:pb-0">
                                                                                <div className="flex justify-between items-center text-[10px]">
                                                                                    <span className="font-mono text-slate-400">{dateDisplay}</span>
                                                                                    <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold scale-90 border border-slate-700/60 text-[9px]">
                                                                                        {log.strategyMode}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                                                                                    &quot;{log.reflectionSummary || "(ไม่มีข้อความ)"}&quot;
                                                                                </p>
                                                                            </li>
                                                                        );
                                                                    })}
                                                                </ul>
                                                            </div>

                                                            {/* ฝั่งขวา: ข้อมูลสภาวะ/Caution Notes */}
                                                            <div className="space-y-3">
                                                                {/* ความตั้งใจล่าสุด */}
                                                                <div className="bg-slate-950/30 rounded-xl p-3.5 border border-slate-800/50 space-y-1.5">
                                                                    <h5 className="font-semibold text-slate-350 flex items-center gap-1.5">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-450"></span>
                                                                        ความตั้งใจหลักรอบล่าสุด (Latest Intention)
                                                                    </h5>
                                                                    <p className="text-[11px] text-emerald-400 italic bg-emerald-950/10 border border-emerald-500/10 p-2 rounded-lg leading-relaxed">
                                                                        &quot;{latestIntention}&quot;
                                                                    </p>
                                                                </div>

                                                                {/* ข้อควรระวังในการจัดจังหวะส่วนตัว */}
                                                                <div className="bg-slate-950/30 rounded-xl p-3.5 border border-slate-800/50 space-y-1.5">
                                                                    <h5 className="font-semibold text-slate-350 flex items-center gap-1.5">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-450"></span>
                                                                        ข้อควรระวังล่าสุดในการจัดจังหวะส่วนตัว
                                                                    </h5>
                                                                    {recentCautions.length > 0 ? (
                                                                        <ul className="list-disc list-inside space-y-1 pl-1 text-[10px] text-slate-400">
                                                                            {recentCautions.map((note, idx) => (
                                                                                <li key={idx} className="line-clamp-1" title={note}>
                                                                                    {note}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p className="text-[10px] text-slate-500 italic pl-1">
                                                                            ไม่มีข้อบันทึกเตือนความจำในสัปดาห์นี้
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Disclaimer */}
                                                        <div className="text-[9px] text-slate-500 leading-relaxed pt-2 border-t border-slate-850/40">
                                                            *หมายเหตุ: บททบทวนนี้ถูกคำนวณและสรุปโดยอัตโนมัติจากข้อมูลประวัติการสะท้อนคิดประจำวันและบริบทงานที่บันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ใช่ผลวินิจฉัยหรือคำแนะนำทางการแพทย์
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Reflection History List UI - ASTRO-APP-DEV-019B */}
                                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 mt-6">
                                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <History className="w-4.5 h-4.5 text-indigo-400" />
                                                    <h4 className="text-sm font-semibold text-slate-200">ประวัติการสะท้อนคิดย้อนหลัง (Reflection History - {historyLogs.length}/20)</h4>
                                                </div>
                                                {historyLogs.length > 0 && (
                                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={handleCopyAllHistory}
                                                            className="text-[10px] text-indigo-400 hover:text-indigo-350 active:text-indigo-500 font-semibold transition-colors flex items-center gap-1 border border-indigo-500/20 px-2.5 py-1 rounded bg-indigo-950/10 hover:bg-indigo-950/20 active:scale-[0.98]"
                                                        >
                                                            <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
                                                            {copiedAllHistoryStatus ? copiedAllHistoryStatus : "คัดลอกประวัติทั้งหมด"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleClearAllHistory}
                                                            className="text-[10px] text-rose-400 hover:text-rose-350 active:text-rose-500 font-semibold transition-colors flex items-center gap-1 border border-rose-500/20 px-2 py-1 rounded bg-rose-950/10 hover:bg-rose-950/20 active:scale-[0.98]"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> ล้างประวัติทั้งหมด
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {historySaveStatus && (
                                                <div className="text-xs text-indigo-350 font-medium animate-pulse">
                                                    {historySaveStatus}
                                                </div>
                                            )}

                                            {historyLogs.length === 0 ? (
                                                <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-slate-500 italic space-y-1.5">
                                                    <p className="text-xs">ยังไม่มีบันทึกประวัติการสะท้อนคิดถาวร</p>
                                                    <p className="text-[10px] text-slate-600 max-w-xs mx-auto leading-relaxed not-italic">
                                                        คุณสามารถเก็บบริบทและบันทึกของวันนี้ไว้เพื่อสังเกตแนวโน้มเชิงกลยุทธ์ย้อนหลัง โดยการกดปุ่ม <strong className="text-indigo-400 font-medium">&quot;บันทึกเข้าประวัติ (Save as History)&quot;</strong> ด้านบน
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                                                    {historyLogs.map((item) => (
                                                        <div 
                                                            key={item.id} 
                                                            className="bg-slate-955/65 border border-slate-850 rounded-lg p-3 space-y-2 text-xs transition-all hover:border-slate-750/80"
                                                        >
                                                            <div className="flex items-start justify-between gap-2 border-b border-slate-850 pb-1.5">
                                                                <div className="space-y-0.5">
                                                                    <span className="font-mono font-bold text-indigo-300 block text-[10px]">
                                                                        {item.createdAt}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 block">
                                                                        วันที่กิจกรรม: <span className="font-mono text-slate-300">{item.reflectionDate}</span>
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="px-1.5 py-0.5 rounded bg-violet-950/50 text-violet-300 border border-violet-400/20 text-[9px] font-semibold">
                                                                        {item.reflectionMode}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 text-[9px] font-semibold">
                                                                        {item.strategyMode}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-1 text-slate-300">
                                                                <p className="line-clamp-2 leading-relaxed">
                                                                    <span className="text-slate-450 font-medium">สรุปสะท้อนคิด:</span> {item.reflectionSummary || "(ไม่มี)"}
                                                                </p>
                                                                {item.nextRightAction && (
                                                                    <p className="line-clamp-1 leading-relaxed text-emerald-400/90">
                                                                        <span className="text-slate-450 font-medium">Next Right Action:</span> {item.nextRightAction}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-850/50">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyHistoryItem(item)}
                                                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-[10px] text-slate-200 font-semibold rounded transition-colors flex items-center gap-1 border border-slate-700/60 active:scale-[0.98]"
                                                                >
                                                                    <ClipboardList className="w-2.5 h-2.5 text-indigo-300" />
                                                                    {copiedHistoryId === item.id ? "คัดลอกแล้ว" : "คัดลอก"}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleLoadFromHistory(item)}
                                                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-[10px] text-slate-200 font-semibold rounded transition-colors flex items-center gap-1 border border-slate-700/60 active:scale-[0.98]"
                                                                >
                                                                    <RefreshCw className="w-2.5 h-2.5 text-indigo-300" /> โหลดมาแทนที่
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteFromHistory(item.id)}
                                                                    className="px-2 py-1 bg-slate-850 hover:bg-rose-950/20 text-[10px] text-rose-400 font-semibold rounded transition-colors flex items-center gap-1 border border-slate-800 hover:border-rose-500/20 active:scale-[0.98]"
                                                                    title="ลบรายการนี้"
                                                                >
                                                                    <Trash2 className="w-2.5 h-2.5" /> ลบ
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
