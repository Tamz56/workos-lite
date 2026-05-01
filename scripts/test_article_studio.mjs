import fs from 'fs';
import { parseArborArticlePackage } from '../src/lib/content/articleStudio.js';

function runCase(name, input, expectPresent, expectHealthRequired) {
  const preview = parseArborArticlePackage(input);
  const present = !!(preview && preview.article_markdown && preview.article_markdown.trim().length > 0);

  if (present !== expectPresent) {
    console.error(`FAIL ${name}: expected present=${expectPresent} got present=${present}`);
    console.error('Detected article_markdown:', JSON.stringify(preview.article_markdown || '', null, 2));
    process.exitCode = 2;
    return;
  }

  if (typeof expectHealthRequired === 'number') {
    const actual = preview.contentHealth ? preview.contentHealth.requiredComplete : null;
    if (actual !== expectHealthRequired) {
      console.error(`FAIL ${name}: expected requiredComplete=${expectHealthRequired} got ${actual}`);
      process.exitCode = 2;
      return;
    }
  }

  console.log(`OK  ${name}: present=${present}`);
}

const cases = [
  {
    name: 'Article Markdown / Draft heading',
    input: '# Title\n\n## Article Markdown / Draft\n\nThis is a full article draft with multiple paragraphs.\n\nSecond paragraph here.\n',
    expect: true,
  },
  {
    name: 'Draft heading',
    input: '# Title\n\n## Draft\n\nContent of the draft goes here. More than a sentence to qualify.\n',
    expect: true,
  },
  {
    name: 'Thai heading บทความ',
    input: '# หัวข้อ\n\n## บทความ\n\nนี่คือเนื้อหาบทความที่มีความยาวและประโยคครบถ้วน\n',
    expect: true,
  },
  {
    name: 'Outline-only should not count',
    input: '# Title\n\n- Point one\n- Point two\n- Point three\n',
    expect: false,
  },
  {
    name: 'Body-only markdown after metadata',
    input: 'topic_id: GF-CONTENT-999\nslug: some-slug\n\nThis is the article body that follows metadata. It should be treated as draft.',
    expect: true,
  }
];

  // GF-CONTENT-006 real-like sample
  const gfContent006 = `topic_id: GF-CONTENT-006
  title: ตัวอย่างบทความ GF-CONTENT-006

  ## Article Markdown / Draft

  บทนำ: นี่คือย่อหน้าแรกของบทความที่เป็นภาษาไทย ซึ่งอธิบายภาพรวมของหัวข้ออย่างชัดเจน.

  ## Section 1

  รายละเอียดเชิงลึกของส่วนที่หนึ่ง ซึ่งมีหลายย่อหน้าและคำอธิบายที่ยาวพอสมควรเพื่อทดสอบการจับเนื้อหา.

  ## Section 2

  รายละเอียดเพิ่มเติมและตัวอย่างประกอบ เพื่อให้ระบบรู้ว่านี่คือร่างบทความจริง.
  `;

  cases.push({ name: 'GF-CONTENT-006 sample', input: gfContent006, expect: true, expectHealthRequired: 3 });

for (const c of cases) runCase(c.name, c.input, c.expect);

if (process.exitCode === 0) console.log('All tests passed');
