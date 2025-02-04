import axios from 'axios';
import { CompanyContact } from '../types/companyContact';

export class EmailDiscoveryAgent {
  private sources = [
    'https://api.linkedin.com/professional-directories',
    'https://api.crunchbase.com/company-contacts',
    // Add more ethical sourcing APIs
  ];

  async discoverHREmails(industry?: string, companySize?: number): Promise<CompanyContact[]> {
    const contacts: CompanyContact[] = [];

    for (const source of this.sources) {
      try {
        const response = await axios.get(source, {
          params: { 
            industry, 
            minCompanySize: companySize 
          },
          headers: {
            'Authorization': `Bearer ${process.env.DISCOVERY_API_KEY}`
          }
        });

        const sourceContacts = response.data.filter(this.validateContact);
        contacts.push(...sourceContacts);
      } catch (error) {
        console.error(`Error discovering emails from ${source}:`, error);
      }
    }

    return this.deduplicateContacts(contacts);
  }

  private validateContact(contact: CompanyContact): boolean {
    // Implement robust email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(contact.email) && 
           contact.role.toLowerCase().includes('hr');
  }

  private deduplicateContacts(contacts: CompanyContact[]): CompanyContact[] {
    return Array.from(new Set(contacts.map(c => c.email)))
      .map(email => contacts.find(c => c.email === email)!)
      .filter(Boolean);
  }
}
