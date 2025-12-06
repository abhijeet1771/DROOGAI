/**
 * Test Automation Framework Detector
 * Auto-detects which framework is being used (Selenium, Playwright, WebdriverIO)
 */

export type TestFramework = 'selenium' | 'playwright' | 'webdriverio' | 'unknown';

export interface FrameworkDetection {
  framework: TestFramework;
  confidence: number;
  indicators: string[];
}

export class FrameworkDetector {
  /**
   * Detect test automation framework from file content
   */
  detectFramework(fileContent: string, filename: string): FrameworkDetection {
    const indicators: string[] = [];
    let seleniumScore = 0;
    let playwrightScore = 0;
    let webdriverioScore = 0;

    const contentLower = fileContent.toLowerCase();

    // Selenium indicators
    if (/import.*selenium|from selenium|org\.openqa\.selenium/.test(fileContent)) {
      seleniumScore += 3;
      indicators.push('Selenium imports');
    }
    if (/WebDriver|ChromeDriver|FirefoxDriver|EdgeDriver/.test(fileContent)) {
      seleniumScore += 2;
      indicators.push('WebDriver classes');
    }
    if (/@FindBy|FindBy\(|By\.(id|name|xpath|cssSelector)/.test(fileContent)) {
      seleniumScore += 2;
      indicators.push('Selenium locators');
    }
    if (/PageFactory|PageObject/.test(fileContent)) {
      seleniumScore += 1;
      indicators.push('PageFactory/PageObject');
    }

    // Playwright indicators
    if (/import.*playwright|from playwright|@playwright/.test(fileContent)) {
      playwrightScore += 3;
      indicators.push('Playwright imports');
    }
    if (/page\.|browser\.|context\./.test(contentLower)) {
      playwrightScore += 2;
      indicators.push('Playwright API (page, browser, context)');
    }
    if (/locator\(|getByRole|getByText|getByTestId/.test(contentLower)) {
      playwrightScore += 2;
      indicators.push('Playwright locators');
    }
    if (/test\(|expect\(/.test(contentLower) && playwrightScore > 0) {
      playwrightScore += 1;
      indicators.push('Playwright test syntax');
    }

    // WebdriverIO indicators
    if (/import.*webdriverio|from webdriverio|@wdio/.test(fileContent)) {
      webdriverioScore += 3;
      indicators.push('WebdriverIO imports');
    }
    if (/\$\(|\$\$\(|browser\./.test(fileContent)) {
      webdriverioScore += 2;
      indicators.push('WebdriverIO API ($, $$, browser)');
    }
    if (/describe\(|it\(|before\(|after\(/.test(contentLower) && webdriverioScore > 0) {
      webdriverioScore += 1;
      indicators.push('WebdriverIO test syntax');
    }

    // File name patterns
    if (/pageobject|page\.java|page\.ts|page\.js/.test(filename.toLowerCase())) {
      if (seleniumScore > playwrightScore && seleniumScore > webdriverioScore) {
        seleniumScore += 1;
      }
    }

    // Determine framework
    let framework: TestFramework = 'unknown';
    let confidence = 0;

    if (seleniumScore > playwrightScore && seleniumScore > webdriverioScore && seleniumScore > 0) {
      framework = 'selenium';
      confidence = Math.min(seleniumScore / 5, 1.0);
    } else if (playwrightScore > seleniumScore && playwrightScore > webdriverioScore && playwrightScore > 0) {
      framework = 'playwright';
      confidence = Math.min(playwrightScore / 5, 1.0);
    } else if (webdriverioScore > seleniumScore && webdriverioScore > playwrightScore && webdriverioScore > 0) {
      framework = 'webdriverio';
      confidence = Math.min(webdriverioScore / 5, 1.0);
    }

    return {
      framework,
      confidence,
      indicators,
    };
  }

  /**
   * Detect framework from multiple files
   */
  detectFromFiles(files: Array<{ filename: string; content: string }>): FrameworkDetection {
    const detections = files.map(f => this.detectFramework(f.content, f.filename));
    
    // Count framework occurrences
    const frameworkCounts: Record<TestFramework, number> = {
      selenium: 0,
      playwright: 0,
      webdriverio: 0,
      unknown: 0,
    };

    detections.forEach(d => {
      if (d.framework !== 'unknown') {
        frameworkCounts[d.framework]++;
      }
    });

    // Find most common framework
    let mostCommon: TestFramework = 'unknown';
    let maxCount = 0;
    for (const [fw, count] of Object.entries(frameworkCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = fw as TestFramework;
      }
    }

    // Calculate average confidence
    const relevantDetections = detections.filter(d => d.framework === mostCommon);
    const avgConfidence = relevantDetections.length > 0
      ? relevantDetections.reduce((sum, d) => sum + d.confidence, 0) / relevantDetections.length
      : 0;

    // Collect all indicators
    const allIndicators = [...new Set(detections.flatMap(d => d.indicators))];

    return {
      framework: mostCommon,
      confidence: avgConfidence,
      indicators: allIndicators,
    };
  }
}







