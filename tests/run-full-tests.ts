import { TextParserProvider } from '../modules/textParserProvider.js';
import testData from './test-data-full.json' assert { type: 'json' };
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestCase {
    id: string;
    locale: string;
    text: string;
    expected: {
        hasDate: boolean;
        dateOffset?: { days?: number; hours?: number; minutes?: number };
        weekday?: number;
        hours?: number;
        minutes?: number;
        cleanText?: string;
    };
}

interface TestResult {
    id: string;
    locale: string;
    text: string;
    passed: boolean;
    error?: string;
    actualDate: string | null;
    expectedDate: string;
    actualCleanText: string;
    expectedCleanText: string;
    parserSource: string;
    dateText: string;
    timestamp: string;
}

interface TestReport {
    summary: {
        total: number;
        passed: number;
        failed: number;
        passRate: number;
        timestamp: string;
        referenceDate: string;
    };
    byLocale: Record<string, {
        total: number;
        passed: number;
        failed: number;
        passRate: number;
    }>;
    failedTests: TestResult[];
    allResults: TestResult[];
}


function calculateExpectedDate(referenceDate: Date, test: TestCase): Date | null {
    if (!test.expected.hasDate) return null;
   
    const expectedDate = new Date(referenceDate);
    let expectedDateOld = new Date(expectedDate);

  
    if (test.expected.dateOffset) {
        if (test.expected.dateOffset.days) {
            expectedDate.setDate(expectedDate.getDate() + test.expected.dateOffset.days);
        }
        if (test.expected.dateOffset.hours) {
            expectedDate.setHours(test.expected.dateOffset.hours);
        }
        if (test.expected.dateOffset.minutes) {
            expectedDate.setMinutes(test.expected.dateOffset.minutes);
        }
        return expectedDate;
    }

    if (test.expected.weekday !== undefined) {
        const currentDay = referenceDate.getDay();
        let daysToAdd = test.expected.weekday - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        expectedDate.setDate(referenceDate.getDate() + daysToAdd);
        if (test.expected.hours !== undefined) {
            expectedDate.setHours(test.expected.hours);
        }
        if (test.expected.minutes !== undefined) {
            expectedDate.setMinutes(test.expected.minutes);
        }
        return expectedDate;
    }

    return null;
}

async function runTests() {
    const referenceDate = new Date(testData.referenceDate);
    const timestamp = new Date().toISOString();

    console.log('\n========== RUNNING FULL TESTS ==========\n');
    console.log(`Reference date: ${referenceDate.toLocaleString()}`);
    console.log(`Total tests: ${testData.tests.length}\n`);

    const results: TestResult[] = [];
    const byLocale: Record<string, { total: number; passed: number; failed: number }> = {};

    for (const test of testData.tests as TestCase[]) {
        const parser = new TextParserProvider(test.locale);
        const result = parser.parse(test.text);

        let passed = true;
        let errorMsg = '';
        let expectedDateStr = 'null';

        // Проверка даты
        if (test.expected.hasDate) {
            if (!result.date) {
                passed = false;
                errorMsg = `Expected date, got null`;
                expectedDateStr = 'expected date';
            } else {
                const expectedDate = calculateExpectedDate(referenceDate, test);
                if (expectedDate) {
                    expectedDateStr = expectedDate.toISOString();
                    const actualTime = Math.floor(result.date.getTime() / 60000);
                    const expectedTime = Math.floor(expectedDate.getTime() / 60000);

                    if (actualTime !== expectedTime) {
                        passed = false;
                        errorMsg = `Date mismatch. Expected: ${expectedDate.toISOString()}, Got: ${result.date.toISOString()}`;
                    }
                }
            }
        } else {
            if (result.date) {
                passed = false;
                errorMsg = `Expected null date, got: ${result.date.toISOString()}`;
                expectedDateStr = 'null';
            }
        }

        // Проверка cleanText
        if (test.expected.cleanText && result.cleanText !== test.expected.cleanText) {
            passed = false;
            errorMsg = errorMsg
                ? `${errorMsg}; Clean text mismatch. Expected: "${test.expected.cleanText}", Got: "${result.cleanText}"`
                : `Clean text mismatch. Expected: "${test.expected.cleanText}", Got: "${result.cleanText}"`;
        }

        // Статистика по локалям
        const localeKey = test.locale.split('-')[0];
        if (!byLocale[localeKey]) {
            byLocale[localeKey] = { total: 0, passed: 0, failed: 0 };
        }
        byLocale[localeKey].total++;

        const testResult: TestResult = {
            id: test.id,
            locale: test.locale,
            text: test.text,
            passed: passed,
            error: errorMsg || undefined,
            actualDate: result.date?.toISOString() || null,
            expectedDate: expectedDateStr,
            actualCleanText: result.cleanText,
            expectedCleanText: test.expected.cleanText || '',
            parserSource: result.parserSource || 'none',
            dateText: result.dateText || '',
            timestamp: timestamp
        };

        if (passed) {
            byLocale[localeKey].passed++;
            console.log(`✅ ${test.id} (${test.locale}): ${result.parserSource}`);
        } else {
            byLocale[localeKey].failed++;
            console.log(`❌ ${test.id} (${test.locale}): ${errorMsg.substring(0, 100)}...`);
        }

        results.push(testResult);
    }

    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;

    // Формируем отчет
    const report: TestReport = {
        summary: {
            total: results.length,
            passed: passedCount,
            failed: failedCount,
            passRate: Math.round(passedCount / results.length * 100),
            timestamp: timestamp,
            referenceDate: testData.referenceDate
        },
        byLocale: {},
        failedTests: results.filter(r => !r.passed),
        allResults: results
    };

    // Заполняем byLocale
    for (const [locale, stats] of Object.entries(byLocale)) {
        report.byLocale[locale] = {
            total: stats.total,
            passed: stats.passed,
            failed: stats.failed,
            passRate: Math.round(stats.passed / stats.total * 100)
        };
    }

    // Сохраняем отчет в файл
    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }

    const summaryFile = path.join(reportDir, 'latest-report.json');

    fs.writeFileSync(summaryFile, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY BY LANGUAGE');
    console.log('='.repeat(60));

    for (const [locale, stats] of Object.entries(report.byLocale).sort()) {
        const icon = stats.passRate === 100 ? '✅' : stats.passRate >= 80 ? '⚠️' : '❌';
        console.log(`${icon} ${locale}: ${stats.passed}/${stats.total} (${stats.passRate}%)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL: ${passedCount}/${results.length} passed (${report.summary.passRate}%)`);
    console.log('='.repeat(60));
    console.log(`\n📁 Report saved to: ${reportFile}`);
    console.log(`📁 Latest report: ${summaryFile}`);

    return report;
}

// Запуск тестов
runTests().catch(console.error);