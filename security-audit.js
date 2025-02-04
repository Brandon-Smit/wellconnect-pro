const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runSecurityAudit() {
  console.log('🔒 Starting Security Audit');

  // NPM Audit
  try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf-8' });
    const auditReport = JSON.parse(auditResult);

    if (auditReport.vulnerabilities) {
      const criticalVulns = Object.values(auditReport.vulnerabilities)
        .filter(vuln => vuln.severity === 'critical');

      if (criticalVulns.length > 0) {
        console.error('🚨 Critical Vulnerabilities Detected:');
        criticalVulns.forEach(vuln => {
          console.error(`- ${vuln.name}: ${vuln.overview}`);
        });
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Error running npm audit:', error);
    process.exit(1);
  }

  // Dependency Check
  try {
    const packageJson = require('./package.json');
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const outdatedDeps = execSync('npm outdated --json', { encoding: 'utf-8' });
    const parsedOutdated = JSON.parse(outdatedDeps);

    const criticalOutdated = Object.entries(parsedOutdated)
      .filter(([dep, info]) => info.current !== info.wanted);

    if (criticalOutdated.length > 0) {
      console.warn('⚠️ Outdated Dependencies:');
      criticalOutdated.forEach(([dep, info]) => {
        console.warn(`- ${dep}: Current ${info.current}, Latest ${info.latest}`);
      });
    }
  } catch (error) {
    console.error('Error checking dependencies:', error);
  }

  console.log('✅ Security Audit Completed');
}

runSecurityAudit();
