import { parseArborArticlePackage } from '../src/lib/content/articleStudio.js';
const gfContent006 = `topic_id: GF-CONTENT-006
title: ตัวอย่างบทความ GF-CONTENT-006

## Article Markdown / Draft

บทนำ: นี่คือย่อหน้าแรกของบทความที่เป็นภาษาไทย ซึ่งอธิบายภาพรวมของหัวข้ออย่างชัดเจน.

## Section 1

รายละเอียดเชิงลึกของส่วนที่หนึ่ง ซึ่งมีหลายย่อหน้าและคำอธิบายที่ยาวพอสมควรเพื่อทดสอบการจับเนื้อหา.

## Section 2

รายละเอียดเพิ่มเติมและตัวอย่างประกอบ เพื่อให้ระบบรู้ว่านี่คือร่างบทความจริง.
`;
const preview = parseArborArticlePackage(gfContent006);
console.log('requiredComplete=', preview.contentHealth?.requiredComplete);
console.log('missingFields=', preview.missingFields);
console.log('article_markdown snippet:\n', (preview.article_markdown||'').slice(0,300));
