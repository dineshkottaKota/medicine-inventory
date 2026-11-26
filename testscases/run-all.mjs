import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
function runStep(label, args, cwd) {
  console.log(`\n=== ${label} ===`);
  const result =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], {
          cwd,
          stdio: 'inherit',
        })
      : spawnSync('npm', args, {
          cwd,
          stdio: 'inherit',
        });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runStep('Backend Test Suite', ['test'], path.join(repoRoot, 'backend'));
runStep('Frontend Test Suite', ['test'], path.join(repoRoot, 'frontend'));
console.log('\nAll backend and frontend test cases passed.');
