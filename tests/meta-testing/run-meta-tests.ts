/**
 * Meta Testing Runner
 *
 * Executes 3 different chat scenarios to test QuickBooks MCP server
 * from different user perspectives and workflows.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestScenario {
  scenario: string;
  persona: string;
  description: string;
  conversation: Array<{
    step: number;
    user_message: string;
    tool_calls: Array<{
      tool: string;
      params: any;
    }>;
    validation: any;
  }>;
  success_criteria: any;
}

interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  steps_completed: number;
  steps_total: number;
  errors: string[];
  metrics: {
    total_tools_called: number;
    successful_calls: number;
    failed_calls: number;
    avg_response_time: number;
  };
}

class MetaTestRunner {
  private serverProcess: any;
  private results: TestResult[] = [];

  async startServer(): Promise<void> {
    console.log('🚀 Starting QuickBooks MCP Server...\n');

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['dist/index.js'], {
        env: { ...process.env, TRANSPORT: 'stdio' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.serverProcess.stderr.on('data', (data: Buffer) => {
        const message = data.toString();
        if (message.includes('running')) {
          console.log('✅ Server started successfully\n');
          resolve();
        }
      });

      this.serverProcess.on('error', (error: Error) => {
        reject(error);
      });

      setTimeout(() => resolve(), 2000); // Give server time to start
    });
  }

  async runScenario(scenarioFile: string): Promise<TestResult> {
    const scenarioPath = path.join(__dirname, 'scenarios', scenarioFile);
    const scenario: TestScenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf-8'));

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Running: ${scenario.scenario}`);
    console.log(`👤 Persona: ${scenario.persona}`);
    console.log(`📝 ${scenario.description}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();
    const errors: string[] = [];
    let steps_completed = 0;
    let successful_calls = 0;
    let failed_calls = 0;
    const response_times: number[] = [];

    for (const step of scenario.conversation) {
      console.log(`\n🔹 Step ${step.step}: ${step.user_message}`);

      for (const tool_call of step.tool_calls) {
        const toolStartTime = Date.now();

        try {
          console.log(`   🔧 Calling: ${tool_call.tool}`);
          console.log(`   📥 Params:`, JSON.stringify(tool_call.params, null, 2));

          const result = await this.callTool(tool_call.tool, tool_call.params);
          const toolDuration = Date.now() - toolStartTime;
          response_times.push(toolDuration);

          // Validate result
          const validation = this.validateResult(result, step.validation);

          if (validation.passed) {
            console.log(`   ✅ Success (${toolDuration}ms)`);
            successful_calls++;
            steps_completed++;
          } else {
            console.log(`   ❌ Validation failed: ${validation.error}`);
            errors.push(`Step ${step.step}: ${validation.error}`);
            failed_calls++;
          }
        } catch (error) {
          const toolDuration = Date.now() - toolStartTime;
          response_times.push(toolDuration);

          console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
          errors.push(`Step ${step.step}: ${error instanceof Error ? error.message : String(error)}`);
          failed_calls++;
        }
      }
    }

    const duration = Date.now() - startTime;
    const passed = errors.length === 0 &&
                   steps_completed === scenario.conversation.length &&
                   duration < (scenario.success_criteria.total_time_under_ms || 30000);

    const result: TestResult = {
      scenario: scenario.scenario,
      passed,
      duration,
      steps_completed,
      steps_total: scenario.conversation.length,
      errors,
      metrics: {
        total_tools_called: successful_calls + failed_calls,
        successful_calls,
        failed_calls,
        avg_response_time: response_times.reduce((a, b) => a + b, 0) / response_times.length || 0
      }
    };

    this.results.push(result);
    return result;
  }

  async callTool(toolName: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        },
        id: Date.now()
      };

      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('Tool call timeout'));
      }, 10000);

      this.serverProcess.stdout.once('data', (data: Buffer) => {
        clearTimeout(timeout);
        responseData = data.toString();

        try {
          const response = JSON.parse(responseData);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });

      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  validateResult(result: any, validation: any): { passed: boolean; error?: string } {
    if (!result) {
      return { passed: false, error: 'No result returned' };
    }

    // Check for required content
    if (validation.should_contain) {
      const resultStr = JSON.stringify(result);
      for (const term of validation.should_contain) {
        if (!resultStr.includes(term)) {
          return { passed: false, error: `Missing expected content: ${term}` };
        }
      }
    }

    // Check response type
    if (validation.response_type === 'json') {
      try {
        JSON.parse(JSON.stringify(result));
      } catch {
        return { passed: false, error: 'Invalid JSON response' };
      }
    }

    return { passed: true };
  }

  printSummary(): void {
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 META TESTING SUMMARY');
    console.log(`${'='.repeat(60)}\n`);

    const totalPassed = this.results.filter(r => r.passed).length;
    const totalFailed = this.results.length - totalPassed;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${status} - ${result.scenario}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Steps: ${result.steps_completed}/${result.steps_total}`);
      console.log(`   Tools: ${result.metrics.successful_calls}/${result.metrics.total_tools_called} successful`);
      console.log(`   Avg Response: ${Math.round(result.metrics.avg_response_time)}ms`);

      if (result.errors.length > 0) {
        console.log(`   Errors:`);
        result.errors.forEach(err => console.log(`     - ${err}`));
      }
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Total: ${totalPassed}/${this.results.length} scenarios passed`);
    console.log(`${'='.repeat(60)}\n`);

    // Save detailed results
    const reportPath = path.join(__dirname, 'results', `meta-test-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: totalPassed,
        failed: totalFailed
      },
      results: this.results
    }, null, 2));

    console.log(`📄 Detailed report saved: ${reportPath}\n`);
  }

  async cleanup(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      console.log('🛑 Server stopped\n');
    }
  }
}

// Main execution
async function main() {
  const runner = new MetaTestRunner();
  const scenarios = process.argv.slice(2);

  const scenarioFiles = scenarios.length > 0
    ? scenarios.map(s => `${s}.json`)
    : ['chat1-accountant.json', 'chat2-operations.json', 'chat3-owner.json'];

  try {
    await runner.startServer();

    for (const scenarioFile of scenarioFiles) {
      await runner.runScenario(scenarioFile);
    }

    runner.printSummary();
    process.exit(runner.results.every(r => r.passed) ? 0 : 1);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Run if called directly
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main();
}

export { MetaTestRunner, TestResult, TestScenario };
