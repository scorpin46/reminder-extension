import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    failedTests: Array<{
        id: string;
        locale: string;
        text: string;
        error: string;
        actualDate: string | null;
        expectedDate: string;
        actualCleanText: string;
        expectedCleanText: string;
        parserSource: string;
        dateText: string;
    }>;
    allResults: Array<any>;
}

function analyzeLatestReport() {
    const reportFile = path.join(__dirname, 'reports', 'latest-report.json');

    if (!fs.existsSync(reportFile)) {
        console.log('❌ No report found. Run tests first: npx tsx tests/run-full-tests.ts');
        return;
    }

    const report: TestReport = JSON.parse(fs.readFileSync(reportFile, 'utf-8'));

    console.log('\n========== TEST REPORT ANALYSIS ==========\n');
    console.log(`📅 Date: ${new Date(report.summary.timestamp).toLocaleString()}`);
    console.log(`🎯 Pass Rate: ${report.summary.passRate}% (${report.summary.passed}/${report.summary.total})`);
    console.log(`❌ Failed: ${report.summary.failed}\n`);

    // Группировка ошибок по типу
    const errorsByType: Record<string, number> = {};
    const errorsByLocale: Record<string, number> = {};

    for (const test of report.failedTests) {
        const locale = test.locale.split('-')[0];
        errorsByLocale[locale] = (errorsByLocale[locale] || 0) + 1;

        if (test.error?.includes('Date mismatch')) {
            errorsByType['date_mismatch'] = (errorsByType['date_mismatch'] || 0) + 1;
        } else if (test.error?.includes('Clean text mismatch')) {
            errorsByType['clean_text_mismatch'] = (errorsByType['clean_text_mismatch'] || 0) + 1;
        } else if (test.error?.includes('Expected date, got null')) {
            errorsByType['no_date'] = (errorsByType['no_date'] || 0) + 1;
        } else if (test.error?.includes('Expected null date')) {
            errorsByType['unexpected_date'] = (errorsByType['unexpected_date'] || 0) + 1;
        } else {
            errorsByType['other'] = (errorsByType['other'] || 0) + 1;
        }
    }

    console.log('📊 ERRORS BY TYPE:');
    for (const [type, count] of Object.entries(errorsByType).sort((a,b) => b[1] - a[1])) {
        console.log(`   ${type}: ${count}`);
    }

    console.log('\n📊 FAILED TESTS BY LOCALE:');
    for (const [locale, count] of Object.entries(errorsByLocale).sort((a,b) => b[1] - a[1])) {
        const total = report.byLocale[locale]?.total || 0;
        console.log(`   ${locale}: ${count}/${total} failed (${Math.round(count/total*100)}%)`);
    }

    console.log('\n📋 DETAILED FAILED TESTS (first 20):');
    console.log('='.repeat(80));

    for (const test of report.failedTests.slice(0, 20)) {
        console.log(`\n❌ ${test.id} (${test.locale})`);
        console.log(`   Text: ${test.text}`);
        console.log(`   Error: ${test.error}`);
        console.log(`   Parser: ${test.parserSource}`);
        console.log(`   Expected date: ${test.expectedDate}`);
        console.log(`   Actual date:   ${test.actualDate}`);
        console.log(`   Expected clean: "${test.expectedCleanText}"`);
        console.log(`   Actual clean:   "${test.actualCleanText}"`);
    }

    if (report.failedTests.length > 20) {
        console.log(`\n... and ${report.failedTests.length - 20} more failed tests`);
    }
}

// Запуск анализа
analyzeLatestReport();