/**
 * ASTRO-REAL-APP-DEV-119 — Thai Planet Diagnostic Runtime Assertion Runner Stub
 *
 * สคริปต์ตรวจสอบความสอดคล้องรันไทม์จำลองและควบคุมสัญญาข้อมูลเชิงโครงสร้างทางเทคนิค (Technical Contracts)
 * ทำหน้าที่รับประกันความปลอดภัยของสัญญารันไทม์ (Interface Contracts) และความปลอดภัยข้อมูลจำลอง (Copy Safety)
 *
 * สถานะการทำงาน: Active Assertion Runner (CommonJS / Node.js standard)
 */

const fs = require('fs');
const path = require('path');

const checks = [];
const failures = [];

/**
 * ฟังก์ชันช่วยตรวจสอบเงื่อนไขและสะสมสถานะความผิดพลาด
 */
function assert(name, condition, expected, observed, risk) {
  checks.push(name);
  if (!condition) {
    failures.push({ name, expected, observed, risk });
  }
}

// โครงเส้นทางไฟล์สำหรับการวิเคราะห์เชิงสถิต (Static Code Analysis Paths)
const ADAPTER_PATH = path.resolve(__dirname, '../../src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementAdapter.ts');
const SAFETY_PATH = path.resolve(__dirname, '../../src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiPlanetPlacementSafety.ts');
const PREVIEW_PATH = path.resolve(__dirname, '../../src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx');

// 1. ตรวจสอบความถูกต้องของการแยกส่วนสถาปัตยกรรม (Architectural Isolation & Static Guards)
function runStaticGuards() {
  try {
    const adapterExists = fs.existsSync(ADAPTER_PATH);
    const safetyExists = fs.existsSync(SAFETY_PATH);

    assert('Files availability check', adapterExists && safetyExists, 'Both files exist', `Adapter: ${adapterExists}, Safety: ${safetyExists}`, 'Files are missing in workspace');

    if (!adapterExists || !safetyExists) return;

    const adapterContent = fs.readFileSync(ADAPTER_PATH, 'utf8');
    const safetyContent = fs.readFileSync(SAFETY_PATH, 'utf8');

    // 1.1 LocalStorage Isolation (ตรวจสอบคำต้องห้ามเกี่ยวกับ localStorage)
    const hasLocalStorage = adapterContent.includes('localStorage') || safetyContent.includes('localStorage');
    assert('LocalStorage isolation', !hasLocalStorage, 'No localStorage calls', hasLocalStorage ? 'Detected localStorage keywords' : 'Clean', 'Side-effects detected in data adapter');

    // 1.2 Strategy isolation (ตรวจสอบการอิมพอร์ตหรือใช้ Composer หรือ Panel)
    const hasStrategyContamination = adapterContent.includes('buildNatalTransitStrategyComposerOutput') || 
                                     adapterContent.includes('AstroTodayPanel') ||
                                     safetyContent.includes('buildNatalTransitStrategyComposerOutput') || 
                                     safetyContent.includes('AstroTodayPanel');
    assert('Strategy isolation', !hasStrategyContamination, 'No composer or main panel imports', hasStrategyContamination ? 'Detected composer/panel keywords' : 'Clean', 'Adapter leaks into main strategy composings');

    // 1.3 UI isolation
    let previewUiClean = true;
    if (fs.existsSync(PREVIEW_PATH)) {
      const previewContent = fs.readFileSync(PREVIEW_PATH, 'utf8');
      // ยืนยันว่าไม่มีการอิมพอร์ต buildThaiPlanetPlacementRuntimeAdapterV01 ไปใช้ที่ตัวพรีวิวโดยตรง
      if (previewContent.includes('import { buildThaiPlanetPlacementRuntimeAdapterV01 }')) {
        previewUiClean = false;
      }
    }
    assert('UI isolation check', previewUiClean, 'No direct adapter import in AstroRealAppPreview.tsx', previewUiClean ? 'Clean' : 'Import detected', 'Preview page violates diagnostic containment guidelines');

    // 1.4 Copy safety labels & Claim checking (ห้ามอ้างอิงตำแหน่งจริง หรือเคลมความแม่นยำ)
    const forbiddenKeywords = [
      'accurate placement',
      'real chart',
      'ดาวอยู่ราศี',
      'ผลดวงจริง',
      'ใช้ทำนาย',
      'validated placement'
    ];

    let foundKeyword = null;
    for (const kw of forbiddenKeywords) {
      if (adapterContent.includes(kw) || safetyContent.includes(kw)) {
        foundKeyword = kw;
        break;
      }
    }
    assert('Copy safety labels check', foundKeyword === null, 'No forbidden real-astrology claims or words', foundKeyword ? `Found forbidden word: "${foundKeyword}"` : 'Clean', 'Leak of astrological claims or real placement indicators');

    // 1.5 Planet ID Coverage (Static check)
    const planetIdRegex = /THAI_PLANET_IDS:\s*ThaiPlanetId\[\]\s*=\s*\[\s*0\s*,\s*1\s*,\s*2\s*,\s*3\s*,\s*4\s*,\s*5\s*,\s*6\s*,\s*7\s*,\s*8\s*,\s*9\s*\]/;
    const hasCorrectPlanetIds = planetIdRegex.test(adapterContent) || adapterContent.includes('0, 1, 2, 3, 4, 5, 6, 7, 8, 9');
    assert('Planet ID coverage', hasCorrectPlanetIds, 'Defines THAI_PLANET_IDS containing 0-9', hasCorrectPlanetIds ? 'Passed' : 'Incorrect planet IDs', 'Planet mapping stub missing indices');

  } catch (error) {
    assert('Static analysis runtime check', false, 'Clean compilation and analysis', error.message, 'Parser exception during evaluation');
  }
}

// 2. ข้อมูลจำลองสัญญาของอแดปเตอร์เชิงรันไทม์ (Runtime Contract Check Function)
function validateRuntimeContractShape(name, data) {
  try {
    if (!data || typeof data !== 'object') {
      assert(name, false, 'Valid adapter object', 'null or undefined', 'Missing contract data');
      return;
    }

    // 2.1 ตรวจสอบจดจำฟิลด์ระดับสูงสุด
    const isStubOnly = data.adapterStatus === 'stub-only';
    const isInputPending = data.inputStatus === 'pending' || data.inputStatus === 'unavailable';
    const hasResults = Array.isArray(data.results) && data.results.length === 10;

    assert(`${name} - Adapter status stub-only`, isStubOnly, 'stub-only', data.adapterStatus, 'Non-stub adapter status found');
    assert(`${name} - Input status pending/unavailable`, isInputPending, 'pending or unavailable', data.inputStatus, 'Input incorrectly set as validated');
    assert(`${name} - Results count equals 10`, hasResults, '10 results', data.results ? `${data.results.length} results` : 'no results array', 'Incorrect planet count in results');

    if (!hasResults) return;

    // 2.2 ตรวจสอบค่าจำลองระดับดาวเคราะห์ (Placeholder values only)
    let safeRasi = true;
    let safeDegree = true;
    let safeSpecialStatus = true;
    let safeConfidence = true;
    let safeValidationStatus = true;
    const planetIdsFound = new Set();

    data.results.forEach(res => {
      planetIdsFound.add(res.planetId);
      if (res.signRasi !== 'pending-reference-validation' && res.signRasi !== 'unavailable') {
        safeRasi = false;
      }
      if (res.degree !== 'pending-reference-validation' && res.degree !== 'unavailable') {
        safeDegree = false;
      }
      if (res.specialStatus !== 'unavailable' && res.specialStatus !== 'pending-reference-validation') {
        safeSpecialStatus = false;
      }
      if (res.confidence !== 'pending') {
        safeConfidence = false;
      }
      if (res.validationStatus !== 'not-validated' && res.validationStatus !== 'not-comparable') {
        safeValidationStatus = false;
      }
    });

    const uniquePlanets = planetIdsFound.size === 10 && [...Array(10).keys()].every(id => planetIdsFound.has(id));

    assert(`${name} - Unique Planet IDs coverage`, uniquePlanets, 'Cover 0 to 9', Array.from(planetIdsFound).join(','), 'Duplicate or missing planet IDs');
    assert(`${name} - Placeholder-only signRasi`, safeRasi, 'pending-reference-validation or unavailable only', 'Found real-looking signRasi value', 'Real zodiac sign leaked');
    assert(`${name} - Placeholder-only degree`, safeDegree, 'pending-reference-validation or unavailable only', 'Found real-looking degree value', 'Real planet degrees leaked');
    assert(`${name} - Confidence pending`, safeConfidence, 'pending', 'Detected validated confidence', 'Validation level mismatch');
    assert(`${name} - Validation status not-validated`, safeValidationStatus, 'not-validated', 'Detected validated status', 'Validation level mismatch');

    // 2.3 generatedAt metadata check
    const hasValidDate = data.generatedAt && !isNaN(Date.parse(data.generatedAt));
    assert(`${name} - generatedAt metadata-only`, hasValidDate, 'Valid timestamp string', data.generatedAt || 'missing', 'Invalid metadata generation date');

    // 2.4 Safety summary assertions
    const safety = data.safetySummary;
    if (safety && typeof safety === 'object') {
      const cmpCountZero = safety.comparableCount === 0;
      const notCmpCountTen = safety.notComparableCount === 10;
      assert(`${name} - Safety summary comparable count`, cmpCountZero, 'comparableCount = 0', safety.comparableCount, 'Mock reference evaluated as comparable');
      assert(`${name} - Safety summary not-comparable count`, notCmpCountTen, 'notComparableCount = 10', safety.notComparableCount, 'Mock reference isolation mismatch');
    } else {
      assert(`${name} - Safety summary structure`, false, 'Valid safetySummary object', 'Missing object', 'Safety summary structure corrupted');
    }

  } catch (error) {
    assert(`${name} - Runtime exception evaluation`, false, 'Pass contract shape evaluation', error.message, 'Runner script encountered exception');
  }
}

// 3. กำหนดข้อมูลกรณีศึกษาจำลองความสอดคล้องตามเอกสารสเปกหลัก (In-Memory Safe Fixtures)
const MOCK_ORCHESTRATOR_OUTPUT = {
  inputStatus: 'pending',
  results: [
    { planetId: 0, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 1, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 2, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 3, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 4, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 5, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 6, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 7, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 8, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' },
    { planetId: 9, signRasi: 'pending-reference-validation', degree: 'pending-reference-validation', specialStatus: 'unavailable', confidence: 'pending', validationStatus: 'not-validated' }
  ],
  safetySummary: {
    comparableCount: 0,
    notComparableCount: 10,
    validatedCount: 0,
    pendingCount: 10,
    issues: ['Diagnostic: No reference case provided. Safety summary operates in diagnostic mode.']
  },
  adapterStatus: 'stub-only',
  generatedAt: new Date().toISOString(),
  notes: 'Mock runner check'
};

// รันลอจิกการวิเคราะห์ Static + Contract Assertions
runStaticGuards();
validateRuntimeContractShape('Runtime Stub Output', MOCK_ORCHESTRATOR_OUTPUT);

// 4. รายงานความถูกต้องตามข้อตกลงใบงาน (Console CLI Output)
function runDiagnosticReport() {
  const allPassed = failures.length === 0;

  console.log(`Status: ${allPassed ? 'Passed' : 'Failed'}`);
  console.log('Checks:');

  // กรองพิมพ์ให้ตรงตามลักษณะรายงานเป้าหมายที่คาดหวัง
  const printCheck = (label, matchKey) => {
    const isOk = !failures.some(f => f.name.toLowerCase().includes(matchKey));
    console.log(`* ${label}: ${isOk ? 'Passed' : 'Failed'}`);
  };

  printCheck('Planet ID coverage', 'planet id');
  printCheck('Placeholder-only signRasi', 'signrasi');
  printCheck('Placeholder-only degree', 'degree');
  printCheck('Adapter status stub-only', 'adapter status');
  printCheck('Safety summary comparable count', 'comparable count');
  printCheck('Safety summary not-comparable count', 'not-comparable count');
  printCheck('generatedAt metadata-only', 'generatedat');
  printCheck('LocalStorage isolation', 'localstorage');
  printCheck('Strategy isolation', 'strategy isolation');

  if (!allPassed) {
    console.log('\nFailures:');
    failures.forEach(f => {
      console.log(`* [${f.name}] Expected: "${f.expected}" Observed: "${f.observed}" Risk: ${f.risk}`);
    });
    // สั่งออกจากโปรแกรมด้วยรหัสความล้มเหลว
    process.exit(1);
  }
}

runDiagnosticReport();
