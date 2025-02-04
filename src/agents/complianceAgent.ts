import { CompanyContact } from '../types/companyContact';

export class ComplianceAgent {
  private blocklist: Set<string> = new Set();
  private optOutList: Set<string> = new Set();

  isEligibleForOutreach(contact: CompanyContact): boolean {
    return !this.isBlocked(contact) && 
           !this.hasOptedOut(contact) && 
           this.meetsEthicalStandards(contact);
  }

  blockContact(email: string) {
    this.blocklist.add(email);
  }

  optOutContact(email: string) {
    this.optOutList.add(email);
  }

  private isBlocked(contact: CompanyContact): boolean {
    return this.blocklist.has(contact.email);
  }

  private hasOptedOut(contact: CompanyContact): boolean {
    return this.optOutList.has(contact.email);
  }

  private meetsEthicalStandards(contact: CompanyContact): boolean {
    const unethicalKeywords = [
      'nonprofit', 
      'education', 
      'healthcare', 
      'government'
    ];

    return !unethicalKeywords.some(keyword => 
      contact.industry.toLowerCase().includes(keyword)
    );
  }

  generateComplianceReport() {
    return {
      totalBlocked: this.blocklist.size,
      totalOptedOut: this.optOutList.size,
      ethicalStandardsApplied: true
    };
  }
}
