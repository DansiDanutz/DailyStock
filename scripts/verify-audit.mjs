import { execFileSync } from 'node:child_process';

let report;
try {
  execFileSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf8' });
  process.exit(0);
} catch (error) {
  report = JSON.parse(error.stdout);
}

const vulnerabilities = report.vulnerabilities || {};
const postcss = vulnerabilities.postcss;
const next = vulnerabilities.next;
const allowedSources = new Set([1117015, 1124252, 1124288]);
const postcssSources = (postcss?.via || [])
  .filter((item) => typeof item === 'object')
  .map((item) => item.source);
const validException = Object.keys(vulnerabilities).every((name) => name === 'next' || name === 'postcss')
  && postcss?.nodes?.length === 1
  && postcss.nodes[0] === 'node_modules/postcss'
  && postcssSources.length === allowedSources.size
  && postcssSources.every((source) => allowedSources.has(source))
  && (postcss.via || []).every((item) => typeof item !== 'object' || item.severity !== 'critical')
  && next?.nodes?.length === 1
  && next.nodes[0] === 'node_modules/next'
  && JSON.stringify(next.via) === JSON.stringify(['postcss']);

if (!validException) {
  console.error('Production advisory set no longer matches the approved Next.js PostCSS exception.');
  process.exit(1);
}

const nextVersion = JSON.parse(
  execFileSync('node', ['-p', "JSON.stringify(require('next/package.json').version)"], { encoding: 'utf8' }),
);
if (nextVersion !== '16.2.11') {
  console.error(`Audit exception is valid only for Next.js 16.2.11; found ${nextVersion}`);
  process.exit(1);
}

console.warn('Accepted upstream exception: Next.js bundled PostCSS advisories; revisit on the next stable release.');
