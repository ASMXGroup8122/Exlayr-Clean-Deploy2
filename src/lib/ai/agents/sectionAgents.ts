import { findRelevantRules } from '../vectorSearch';
import { aiLogger } from '../logger';
import { openai } from '../config';

interface SectionAnalysisResult {
  isCompliant: boolean;
  suggestions?: string[];
  score?: number;
  matchedExample?: string;
  metadata?: any;
  contextualFeedback?: {
    compliant?: string[];
    nonCompliant?: string[];
  };
  sectionType?: 'general' | 'specific';
}

interface SectionAgent {
  analyze: (sectionTitle: string, sectionContent: string, documentContext?: Map<string, string>) => Promise<SectionAnalysisResult>;
}

class DocumentAnalysisAgent implements SectionAgent {
  async analyze(sectionTitle: string, sectionContent: string, documentContext?: Map<string, string>): Promise<SectionAnalysisResult> {
    // Get similar examples from vector search
    const searchResults = await findRelevantRules(sectionContent, 5, 'exchangedocs');
    
    // Modify prompt to include context if provided
    const contextString = documentContext ? 
        `\n\nFULL DOCUMENT CONTEXT (other sections):\n${Array.from(documentContext.entries()).filter(([title]) => title !== sectionTitle).map(([title, content]) => `--- START ${title} ---\n${content}\n--- END ${title} ---`).join('\n\n')}`
        : '';

    // Use GPT-4 to analyze the content against the examples
    const analysis = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: `You are an expert in analyzing financial documents. Compare this section against similar examples and identify:
1. Key differences in substance and completeness
2. Missing critical information
3. Areas where the content could be more specific or detailed
Focus on meaningful analysis, not superficial differences.`
      }, {
        role: "user",
        content: `SECTION TITLE: ${sectionTitle}
SECTION CONTENT:
${sectionContent}
${contextString}

SIMILAR EXAMPLES:
${searchResults.matchedExample}

Analyze this section and return JSON with:
1. score (0-100)
2. isCompliant (boolean)
3. criticalIssues (array of strings) - only real, substantive issues
4. improvements (array of strings) - specific, actionable suggestions
5. analysis (string) - brief explanation of your reasoning`
      }],
      response_format: { type: "json_object" }
    });

    try {
      const content = analysis.choices[0].message.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      const result = JSON.parse(content);
      
      // Only include suggestions if there are actual issues
      const suggestions = [
        ...(result.criticalIssues || []),
        ...(result.improvements || [])
      ].filter(Boolean);

      return {
        isCompliant: result.isCompliant,
        score: result.score,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        metadata: {
          analysis: result.analysis,
          vectorScore: searchResults.score
        }
      };
    } catch (e) {
      console.error('Failed to parse analysis:', e);
      return {
        isCompliant: false,
        score: 0,
        suggestions: ['Error analyzing section content']
      };
    }
  }
}

class RiskAnalysisAgent implements SectionAgent {
  async analyze(sectionTitle: string, sectionContent: string, documentContext?: Map<string, string>): Promise<SectionAnalysisResult> {
    if (!sectionTitle.toLowerCase().includes('risk')) {
      return {
        isCompliant: false,
        suggestions: ['This section should be analyzed by a different agent'],
        score: 0,
        contextualFeedback: {
          nonCompliant: ['This section is not a risk section and should be analyzed by a different agent']
        }
      };
    }

    // If it describes a risk and its impact, it's fine
    if (this.hasRiskAndImpact(sectionContent)) {
      return {
        isCompliant: true,
        score: 85,
        suggestions: [],
        contextualFeedback: {
          compliant: [
            'It clearly identifies the risk factor',
            'It explains the impact and consequences',
            'It links to specific business outcomes',
            'It uses appropriate forward-looking language',
            'It provides sufficient detail for investors to understand the risk'
          ]
        }
      };
    }

    // Only fail for actual problems
    if (this.hasPlaceholders(sectionContent)) {
      return {
        isCompliant: false,
        score: 40,
        suggestions: ['Risk section contains placeholder text or incomplete information'],
        contextualFeedback: {
          nonCompliant: [
            'The section contains placeholder text or incomplete information',
            'It lacks specific risk descriptions',
            "It does not explain potential impacts",
            'It fails to provide meaningful context',
            'It needs to be completed with actual content'
          ]
        }
      };
    }

    return {
      isCompliant: true,
      score: 75,
      suggestions: [],
      contextualFeedback: {
        compliant: [
          'It identifies the risk factor',
          'It describes potential impacts',
          'It provides business context',
          'It uses appropriate language',
          'It gives sufficient detail for understanding'
        ]
      }
    };
  }

  private hasRiskAndImpact(content: string): boolean {
    const lower = content.toLowerCase();
    // If it explains what could happen and why, it's fine
    return (
      (lower.includes('can') || lower.includes('could') || lower.includes('may')) &&
      (lower.includes('impact') || lower.includes('affect') || lower.includes('result'))
    );
  }

  private hasPlaceholders(content: string): boolean {
    return content.includes('TBD') || 
           content.includes('[') || 
           content.includes('XXX') ||
           content.includes('INSERT');
  }

  private getRiskContext(title: string, content: string): string {
    // Extract meaningful context about the risk type
    const match = title.match(/Risk Factor \d+:?\s*([A-Za-z]+)/i);
    if (match) return match[1].toLowerCase();

    // If no type in title, try to understand from content
    if (content.includes('currency') || content.includes('exchange rate')) return 'currency';
    if (content.includes('regulation') || content.includes('compliance')) return 'regulatory';
    return 'general';
  }

  private hasSpecificRiskInfo(content: string): boolean {
    // Look for actual specific risk information, not just keywords
    return (
      // Has specific trigger or cause
      content.includes('due to') || 
      content.includes('because of') ||
      // Has specific impact
      content.includes('could result in') ||
      content.includes('may lead to') ||
      // Has quantification or specific example
      /\d+%/.test(content) ||
      content.includes('for example')
    );
  }

  private findActualIssue(context: any): string | null {
    const content = context.content.toLowerCase();

    // Don't state the obvious - look for real issues
    switch(context.riskType) {
      case 'currency':
        if (!content.includes('exchange') && !content.includes('currency')) {
          return "Risk warning doesn't mention which currencies or exchange rates pose risks";
        }
        break;

      case 'regulatory':
        if (!content.includes('regulation') && !content.includes('law')) {
          return "Need to specify which regulations or legal requirements pose risks";
        }
        break;

      default:
        // Only flag if there's no clear risk description
        if (!this.hasReasonableRiskDescription(content)) {
          return "Risk warning needs to explain what specifically poses a risk";
        }
    }

    return null;
  }

  private hasReasonableRiskDescription(content: string): boolean {
    // Check if it actually describes a meaningful risk
    // Not just looking for keywords, but actual risk description
    const sentences = content.split(/[.!?]+/);
    
    return sentences.some(sentence => (
      // Has both a risk factor and potential consequence
      (sentence.includes('could') || sentence.includes('may')) &&
      sentence.includes('if') || sentence.includes('when') ||
      sentence.includes('due to')
    ));
  }

  private parseRiskContent(content: string) {
    return {
      mainRisk: this.extractMainRisk(content),
      triggers: this.extractTriggers(content),
      impacts: this.extractImpacts(content),
      specifics: {
        quantities: this.extractQuantities(content),
        regions: this.extractRegions(content),
        timeframes: this.extractTimeframes(content),
        entities: this.extractEntities(content)
      }
    };
  }

  private evaluateRiskWarning(analysis: any) {
    const { riskType, content, industry } = analysis;
    const suggestions: string[] = [];
    let score = 85; // Start high, deduct for real issues

    // Industry-specific analysis
    switch(industry) {
      case 'technology':
        if (!this.hasTechSpecificElements(content, riskType)) {
          score -= 15;
          suggestions.push(this.getTechImprovement(content, riskType));
        }
        break;
      case 'finance':
        if (!this.hasFinanceSpecificElements(content, riskType)) {
          score -= 15;
          suggestions.push(this.getFinanceImprovement(content, riskType));
        }
        break;
      // Add more industries
    }

    // Risk-type specific analysis
    switch(riskType) {
      case 'currency':
        if (!content.specifics.quantities.currencies.length) {
          score -= 10;
          suggestions.push(this.getCurrencyRiskImprovement(content));
        }
        break;
      case 'regulatory':
        if (!this.hasRegulatoryContext(content)) {
          score -= 10;
          suggestions.push(this.getRegulatoryImprovement(content));
        }
        break;
      case 'strategic':
        if (!this.hasStrategicContext(content)) {
          score -= 10;
          suggestions.push(this.getStrategicImprovement(content));
        }
        break;
      // Add more risk types
    }

    // Impact analysis
    if (!this.hasAdequateImpactDescription(content, riskType)) {
      score -= 10;
      suggestions.push(this.getImpactImprovement(content, riskType, industry));
    }

    return { score, suggestions: suggestions.filter(Boolean) };
  }

  private extractQuantities(content: string) {
      return {
      percentages: content.match(/\d+(?:\.\d+)?%/g) || [],
      currencies: content.match(/(?:USD|EUR|GBP|JPY)\s*\d+(?:\.\d+)?(?:\s*(?:million|billion|m|b))?/g) || [],
      timeframes: content.match(/(?:\d+\s*(?:year|month|quarter|day|week)s?)/g) || []
    };
  }

  private getCurrencyRiskImprovement(content: any): string {
    const regions = content.specifics.regions;
    if (regions.length === 0) {
      return "Consider specifying which currencies pose risks based on your operational regions";
    }
    
    const suggestion = regions.map((region: string) => {
      switch(region.toLowerCase()) {
        case 'europe': return 'EUR fluctuations';
        case 'uk': return 'GBP volatility';
        case 'japan': return 'JPY exchange rates';
        default: return 'local currency movements';
      }
    });

    return `Consider quantifying exposure to ${suggestion.join(', ')} and their potential impact on financial results`;
  }

  private getStrategicImprovement(content: any): string {
    const mainRisk = content.mainRisk;
    if (!mainRisk) return '';

    if (mainRisk.includes('competition')) {
      return 'Consider specifying how competitive pressures could impact market share or pricing power';
    }
    if (mainRisk.includes('technology')) {
      return 'Consider detailing how technological changes could affect your competitive position';
    }
    return 'Consider linking strategic risks to specific business objectives or market position';
  }

  private hasAdequateImpactDescription(content: any, riskType: string): boolean {
    const impacts = content.impacts;
    if (!impacts || impacts.length === 0) return false;

    switch(riskType) {
      case 'financial':
        return impacts.some((i: string) => 
          i.includes('revenue') || 
          i.includes('profit') || 
          i.includes('margin')
        );
      case 'operational':
        return impacts.some((i: string) => 
          i.includes('operations') || 
          i.includes('service') || 
          i.includes('production')
        );
      default:
        return impacts.length > 0;
    }
  }

  private getImpactImprovement(content: any, riskType: string, industry: string): string {
    const baseImpact = this.getBaseImpact(riskType);
    const industryContext = this.getIndustryContext(industry);
    
    return `Consider specifying how ${content.mainRisk} could ${baseImpact}${industryContext}`;
  }

  private getBaseImpact(riskType: string): string {
    const impacts: Record<string, string> = {
      financial: 'affect financial performance through reduced revenues or increased costs',
      operational: 'disrupt normal business operations or service delivery',
      strategic: 'impact competitive position or market share',
      regulatory: 'result in non-compliance penalties or operational restrictions',
      technology: 'affect system reliability or service capabilities',
      market: 'influence pricing power or customer demand'
    };
    return impacts[riskType] || 'impact business performance';
  }

  private getIndustryContext(industry: string): string {
    const contexts: Record<string, string> = {
      technology: ', particularly in rapidly evolving technology markets',
      finance: ', especially given market volatility and regulatory requirements',
      manufacturing: ' across your production and supply chain operations',
      retail: ' in your customer-facing operations and market positioning'
    };
    return contexts[industry] || '';
  }

  private addImpact(content: string, riskType: string): string {
    const impacts: Record<string, string> = {
      strategic: 'which could adversely affect market position and competitiveness',
      financial: 'which could materially impact financial performance',
      operational: 'which could disrupt normal business operations',
      technology: 'which could affect system reliability and service delivery',
      regulatory: 'which could result in regulatory non-compliance and penalties'
    };
    return `${content.trim()}, ${impacts[riskType] || 'which could adversely affect the business'}.`;
  }

  private async searchPerplexity(query: string): Promise<string | null> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'pplx-7b-online',
          messages: [{
            role: 'user',
            content: `${query}. Provide a brief, specific insight (max 2 sentences) that would be relevant for a risk warning section.`
          }]
        })
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error querying Perplexity:', error);
      return null;
    }
  }

  private extractRegions(content: string): string {
    const regions = content.match(/\b(?:Asia|Europe|Americas?|Africa|Middle East|Oceania|Global)\b/gi) || [];
    return regions.length > 0 ? regions.join(', ') : 'global markets';
  }

  private hasSpecificRiskIdentification(content: string): boolean {
    // Check if the content has specific details rather than just generic statements
    const lower = content.toLowerCase();
    
    // Look for specific terms, numbers, or detailed descriptions
    return (
      /\d+%/.test(content) || // Percentages
      /\b(?:USD|EUR|GBP|JPY)\b/.test(content) || // Currency codes
      /\b(?:increase|decrease|change|fluctuation)\b/i.test(content) || // Change indicators
      content.includes('due to') || // Causal relationships
      content.includes('because') ||
      content.includes('as a result of')
    );
  }

  private getRiskTypeFromTitle(sectionTitle: string): string {
    // Extract risk type from title, handling numbered risk factors
    const match = sectionTitle.match(/Risk Factor \d+:?\s*([A-Za-z]+)\s*Risks?/i) ||
                 sectionTitle.match(/([A-Za-z]+)\s*Risks?/i);
    return match ? match[1].toLowerCase() : 'general';
  }

  private extractRiskFactor(content: string): string {
    // Look for the core risk being described
    const sentences = content.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('risk') || 
          sentence.toLowerCase().includes('could') ||
          sentence.includes('may')) {
        return sentence.trim();
      }
    }
    return content.split(/[.!?]+/)[0].trim(); // Take first sentence if no clear risk statement
  }

  private extractTrigger(content: string): string | null {
    // Look for what causes or could trigger the risk
    const triggerPatterns = [
      /(?:due to|because of|arising from|as a result of)(.*?)(?:\.|$)/i,
      /(?:if|when|should)(.*?)(?:occur|happen|materialize)/i,
      /(?:changes in|fluctuations in|developments in)(.*?)(?:could|may|might)/i
    ];

    for (const pattern of triggerPatterns) {
      const match = content.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  }

  private extractImpact(content: string): string | null {
    // Look for the consequences/impact description
    const impactPatterns = [
      /(?:could|may|might)(.*?)(?:\.|$)/i,
      /(?:resulting in|leading to|causing)(.*?)(?:\.|$)/i,
      /(?:impact on|affect|effect on)(.*?)(?:\.|$)/i
    ];

    for (const pattern of impactPatterns) {
      const match = content.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  }

  private assessSpecificity(content: string): {
    isSpecific: boolean;
    missingContext?: string;
    improvement?: string;
  } {
    const lower = content.toLowerCase();
    const riskType = this.getRiskTypeFromTitle(content);

    // Risk-type specific checks
    switch (riskType) {
      case 'currency':
        if (!content.match(/\b(USD|EUR|GBP|JPY)\b/)) {
          return {
            isSpecific: false,
            missingContext: 'specific currencies',
            improvement: 'Specify which currencies pose risks'
          };
        }
        break;

      case 'regulatory':
        if (!content.match(/\b(regulations?|laws?|rules?|requirements?)\b/i)) {
          return {
            isSpecific: false,
            missingContext: 'regulatory framework',
            improvement: 'Specify which regulations or regulatory changes pose risks'
          };
        }
        break;

      case 'technology':
        if (!content.match(/\b(systems?|platforms?|software|infrastructure|technology)\b/i)) {
          return {
            isSpecific: false,
            missingContext: 'technical context',
            improvement: 'Specify which technological aspects pose risks'
          };
        }
        break;

      case 'strategic':
        if (!content.match(/\b(market position|competitive|strategy|initiatives?)\b/i)) {
    return {
            isSpecific: false,
            missingContext: 'strategic context',
            improvement: 'Clarify how this affects strategic positioning'
          };
        }
        break;
    }

    return { isSpecific: true };
  }

  private isWellFormed(components: any): boolean {
    // Don't be overly strict - check if it makes sense as a risk warning
    return (
      components.riskFactor && // Has a clear risk statement
      (components.trigger || components.impact) && // Has either what causes it or what it causes
      components.specificity.isSpecific // Is specific enough for its type
    );
  }

  private async generateImprovement(analysis: any) {
    const { riskType, components, originalWarning } = analysis;
    
    // Don't suggest changes unless we can make it materially better
    if (this.isWellFormed(components)) {
      return { isMateriallyBetter: false };
    }

    let betterVersion = originalWarning;
    const improvements: string[] = [];

    // Risk type specific improvements
    switch (riskType.toLowerCase()) {
      case 'strategic':
        if (!components.impact?.includes('competitive')) {
          betterVersion = this.enhanceStrategicRisk(betterVersion);
          improvements.push('Added competitive impact context');
        }
        break;

      case 'currency':
        if (!components.impact?.includes('financial')) {
          betterVersion = this.enhanceCurrencyRisk(betterVersion);
          improvements.push('Added financial impact context');
        }
        break;

      case 'technology':
        if (!components.impact?.includes('operations')) {
          betterVersion = this.enhanceTechRisk(betterVersion);
          improvements.push('Added operational impact context');
        }
        break;
    }

    // Add missing components if needed
    if (!components.trigger && !originalWarning.includes('could')) {
      betterVersion = this.addForwardLooking(betterVersion);
      improvements.push('Added forward-looking language');
    }

    if (!components.impact && components.riskFactor) {
      betterVersion = this.addImpact(betterVersion, riskType);
      improvements.push('Added specific impact description');
    }

    return improvements.length > 0 ? {
      isMateriallyBetter: true,
      betterVersion,
      improvements
    } : {
      isMateriallyBetter: false
    };
  }

  private enhanceStrategicRisk(content: string): string {
    return content.replace(
      /(risk|impact|affect)(.*?)(\.|\n|$)/i,
      '$1$2, which could adversely impact competitive position and long-term growth$3'
    );
  }

  private enhanceCurrencyRisk(content: string): string {
    return content.replace(
      /(risk|impact|affect)(.*?)(\.|\n|$)/i,
      '$1$2, potentially affecting financial results and reported earnings$3'
    );
  }

  private enhanceTechRisk(content: string): string {
    return content.replace(
      /(risk|impact|affect)(.*?)(\.|\n|$)/i,
      '$1$2, potentially disrupting operations and service delivery$3'
    );
  }

  private addForwardLooking(content: string): string {
    return content.replace(
      /^(.*?)(risk|impact|affect)(.*?)(\.|\n|$)/i,
      '$1could $2$3$4'
    );
  }

  private extractMainRisk(content: string): string {
    const sentences = content.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('risk') || 
          sentence.toLowerCase().includes('could') ||
          sentence.toLowerCase().includes('may')) {
        return sentence.trim();
      }
    }
    return sentences[0].trim();
  }

  private extractTriggers(content: string): string[] {
    const triggers: string[] = [];
    const triggerPatterns = [
      /(?:due to|because of|arising from|as a result of)(.*?)(?:\.|$)/i,
      /(?:if|when|should)(.*?)(?:occur|happen|materialize)/i,
      /(?:changes in|fluctuations in|developments in)(.*?)(?:could|may|might)/i
    ];

    for (const pattern of triggerPatterns) {
      const matches = content.match(new RegExp(pattern, 'g'));
      if (matches) {
        triggers.push(...matches.map(m => m.replace(pattern, '$1').trim()));
      }
    }
    return triggers;
  }

  private extractImpacts(content: string): string[] {
    const impacts: string[] = [];
    const impactPatterns = [
      /(?:could|may|might)(.*?)(?:\.|$)/i,
      /(?:resulting in|leading to|causing)(.*?)(?:\.|$)/i,
      /(?:impact on|affect|effect on)(.*?)(?:\.|$)/i
    ];

    for (const pattern of impactPatterns) {
      const matches = content.match(new RegExp(pattern, 'g'));
      if (matches) {
        impacts.push(...matches.map(m => m.replace(pattern, '$1').trim()));
      }
    }
    return impacts;
  }

  private extractTimeframes(content: string): string[] {
    return content.match(/(?:\d+\s*(?:year|month|quarter|day|week)s?)/g) || [];
  }

  private extractEntities(content: string): string[] {
    const entities: string[] = [];
    const entityPatterns = [
      /\b(?:board|directors?|management|committee|shareholders?|stakeholders?)\b/gi,
      /\b(?:customers?|clients?|partners?|suppliers?|vendors?)\b/gi
    ];

    for (const pattern of entityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        entities.push(...matches);
      }
    }
    return [...new Set(entities)]; // Remove duplicates
  }

  private hasTechSpecificElements(content: string, riskType: string): boolean {
    const techTerms = [
      'technology', 'systems', 'platforms', 'software', 'infrastructure',
      'digital', 'cybersecurity', 'data', 'network', 'cloud'
    ];
    return techTerms.some(term => content.toLowerCase().includes(term));
  }

  private hasFinanceSpecificElements(content: string, riskType: string): boolean {
    const financeTerms = [
      'financial', 'revenue', 'profit', 'margin', 'costs', 'expenses',
      'earnings', 'cash flow', 'capital', 'investment'
    ];
    return financeTerms.some(term => content.toLowerCase().includes(term));
  }

  private hasRegulatoryContext(content: string): boolean {
    const regulatoryTerms = [
      'regulation', 'regulatory', 'compliance', 'law', 'legal',
      'requirements', 'standards', 'guidelines', 'rules'
    ];
    return regulatoryTerms.some(term => content.toLowerCase().includes(term));
  }

  private hasStrategicContext(content: string): boolean {
    const strategicTerms = [
      'strategy', 'strategic', 'competitive', 'market position',
      'business objectives', 'growth', 'development', 'initiatives'
    ];
    return strategicTerms.some(term => content.toLowerCase().includes(term));
  }

  private getTechImprovement(content: string, riskType: string): string {
    return 'Consider specifying how technological changes could affect your systems and operations';
  }

  private getFinanceImprovement(content: string, riskType: string): string {
    return 'Consider quantifying potential financial impacts with specific metrics or ranges';
  }

  private getRegulatoryImprovement(content: string): string {
    return 'Consider specifying which regulations or regulatory changes pose risks';
  }
}

class FinancialAnalysisAgent implements SectionAgent {
  async analyze(sectionTitle: string, sectionContent: string, documentContext?: Map<string, string>): Promise<SectionAnalysisResult> {
    aiLogger.logActivity('analysis', `Financial Analysis Agent analyzing section: ${sectionTitle}`);
    
    // Check if section title contains financial-related keywords
    if (!sectionTitle.toLowerCase().includes('financial') && 
        !sectionTitle.toLowerCase().includes('accounting') &&
        !sectionTitle.toLowerCase().includes('revenue')) {
      aiLogger.logActivity('analysis', `Section "${sectionTitle}" is not a financial section`, {
        isCompliant: false,
        score: 0,
        suggestions: ['This section should be analyzed by a different agent']
      });
      return {
        isCompliant: false,
        suggestions: ['This section should be analyzed by a different agent'],
        score: 0
      };
    }

    // Check content quality
    const contentQualityResult = await this.checkContentQuality(sectionContent);
    if (!contentQualityResult.isValid) {
      aiLogger.logActivity('analysis', `Content quality check failed for section: ${sectionTitle}`, {
        isCompliant: false,
        score: 0,
        suggestions: contentQualityResult.suggestions
      });
      return {
        isCompliant: false,
        suggestions: contentQualityResult.suggestions,
        score: 0
      };
    }

    // Get analysis results from vector search
    const analysisResult = await findRelevantRules(sectionContent, 5, 'exchangedocs');
    
    aiLogger.logActivity('analysis', `Financial analysis complete for section: ${sectionTitle}`, {
      isCompliant: analysisResult.isCompliant,
      score: analysisResult.score,
      suggestions: analysisResult.suggestions,
      agent: 'Financial Analysis Agent'
    });

    return analysisResult;
  }

  private async checkContentQuality(content: string) {
    const suggestions: string[] = [];

    if (!content.match(/\d+/)) {
      suggestions.push('Financial section should include numerical data');
    }

    if (!content.toLowerCase().includes('revenue') && 
        !content.toLowerCase().includes('expense') && 
        !content.toLowerCase().includes('profit')) {
      suggestions.push('Financial section should discuss key financial metrics');
    }

    if (!content.includes('\n')) {
      suggestions.push('Consider breaking financial data into separate paragraphs for better readability');
    }

    return {
      isValid: suggestions.length === 0,
      suggestions
    };
  }
}

class GovernanceAnalysisAgent implements SectionAgent {
  async analyze(sectionTitle: string, sectionContent: string, documentContext?: Map<string, string>): Promise<SectionAnalysisResult> {
    aiLogger.logActivity('analysis', `Governance Analysis Agent analyzing section: ${sectionTitle}`);
    
    // Check if section title contains governance-related keywords
    if (!sectionTitle.toLowerCase().includes('governance') && 
        !sectionTitle.toLowerCase().includes('board') &&
        !sectionTitle.toLowerCase().includes('management')) {
      aiLogger.logActivity('analysis', `Section "${sectionTitle}" is not a governance section`, {
        isCompliant: false,
        score: 0,
        suggestions: ['This section should be analyzed by a different agent']
      });
      return {
        isCompliant: false,
        suggestions: ['This section should be analyzed by a different agent'],
        score: 0
      };
    }

    // Check content quality
    const contentQualityResult = await this.checkContentQuality(sectionContent);
    if (!contentQualityResult.isValid) {
      aiLogger.logActivity('analysis', `Content quality check failed for section: ${sectionTitle}`, {
        isCompliant: false,
        score: 0,
        suggestions: contentQualityResult.suggestions
      });
      return {
        isCompliant: false,
        suggestions: contentQualityResult.suggestions,
        score: 0
      };
    }

    // Get analysis results from vector search
    const analysisResult = await findRelevantRules(sectionContent, 5, 'exchangedocs');
    
    aiLogger.logActivity('analysis', `Governance analysis complete for section: ${sectionTitle}`, {
      isCompliant: analysisResult.isCompliant,
      score: analysisResult.score,
      suggestions: analysisResult.suggestions,
      agent: 'Governance Analysis Agent'
    });

    return analysisResult;
  }

  private async checkContentQuality(content: string) {
    const suggestions: string[] = [];

    if (!content.toLowerCase().includes('board') || 
        !content.toLowerCase().includes('director')) {
      suggestions.push('Governance section should discuss board composition and directors');
    }

    if (!content.toLowerCase().includes('committee')) {
      suggestions.push('Consider including information about board committees');
    }

    if (!content.includes('\n')) {
      suggestions.push('Consider breaking governance information into separate paragraphs for better readability');
    }

    return {
      isValid: suggestions.length === 0,
      suggestions
    };
  }
}

class GeneralAnalysisAgent implements SectionAgent {
  // Helper to classify subsection type based on title/id
  private getSubsectionType(title: string, id: string): string {
      const lowerTitle = title.toLowerCase();
      const lowerId = id.toLowerCase();
      if (lowerTitle.includes('warning')) return 'warning';
      if (lowerTitle.includes('overview') || lowerTitle.includes('introduction') || lowerTitle.includes('summary')) return 'introductory';
      if (lowerId.startsWith('sec4_')) return 'detailed_risk'; // Assuming sec4 is always risk
      if (lowerId.startsWith('sec3_') && (lowerId.includes('finan') || lowerId.includes('statements'))) return 'detailed_financial';
      // Add more classifications as needed
      return 'general_detail'; // Default
  }

  async analyze(sectionTitle: string, sectionContent: string, documentContext?: Map<string, string>): Promise<SectionAnalysisResult> {
    const searchResults = await findRelevantRules(sectionContent, 3, 'exchangedocs');
    
    // Correctly Prepare context string (still useful for checking if info exists elsewhere)
    const contextString = documentContext ? 
        `\n\nFULL DOCUMENT CONTEXT (other sections - for reference only):\n${Array.from(documentContext.entries())
            .filter(([title]) => title !== sectionTitle)
            .map(([title, content]) => `--- START ${title} ---\n${content.substring(0, 150)}...\n--- END ${title} ---`)
            .join('\n\n')}`
        : '';
    
    // Determine subsection type (Pass ID if available - Requires updating analyze call)
    // For now, using title - adjust if ID is passed separately
    const subsectionId = sectionTitle; // Placeholder: Assume title is unique enough for now
    const subsectionType = this.getSubsectionType(sectionTitle, subsectionId);
    
    // Construct System Prompt based on type
    let systemPrompt = `You are an expert Stock Exchange Listing Reviewer evaluating a subsection titled "${sectionTitle}" (Type: ${subsectionType}).
Your primary task is to assess compliance by comparing the SECTION CONTENT *directly* against the structure, detail, and information in the provided SIMILAR EXAMPLES (which represent compliant documents).
Use the SIMILAR EXAMPLES as the sole basis for determining what constitutes a compliant standard for this section type.
Identify specific deviations, omissions, or lack of clarity in the SECTION CONTENT when compared ONLY to these benchmarks.
Check the FULL DOCUMENT CONTEXT only to verify if information seemingly missing from the SECTION CONTENT is present elsewhere. If it is, do NOT critique the current section for that omission unless its absence here makes this section misleading or unclear.
Phrase feedback as very concise (1-2 sentences max), actionable critique points directed at the author, citing deviations from *standard requirements* or *patterns observed in compliant documents*. Limit critique to 2-3 most important points.
**CRITICAL: Do NOT use the words 'example', 'examples', or 'benchmark' in your response's critiquePoints.** Instead of saying "Lacks X shown in examples", say "Lacks the standard breakdown for X typically found in compliant documents" or "Does not specify Y, a standard requirement for this section." Do not mention the comparison process.`;

    console.log(`[Agent ${sectionTitle}] Calling OpenAI with type-specific prompt (${subsectionType})...`);
    const analysis = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: systemPrompt // Use the constructed prompt
      }, {
        role: "user",
        content: `SECTION TITLE: ${sectionTitle}
SECTION CONTENT:
${sectionContent}
${contextString}

SIMILAR EXAMPLES (Use as the *only* compliance benchmark):
${searchResults.matchedExample}

Based ONLY on comparison with the SIMILAR EXAMPLES (checking context for omissions), return JSON with:
1. isCompliant (boolean): True if SECTION CONTENT meets the standard shown in the examples, False otherwise.
2. critiquePoints (array of strings, max 3): Concise critique points based *only* on deviations from the standard requirements demonstrated by the examples. **Do NOT use the word 'example' or 'benchmark' in these strings.**
3. score (0-100): Score reflecting compliance level compared to the examples.
4. analysis (string): Brief internal reasoning for compliance assessment based on comparison.`
      }],
      response_format: { type: "json_object" }
    });
    console.log(`[Agent ${sectionTitle}] OpenAI call complete.`);

    try {
      const rawContent = analysis.choices[0].message.content;
      console.log(`[Agent ${sectionTitle}] Raw OpenAI Response Content:\n`, rawContent);
      if (!rawContent) {
        throw new Error('No content in OpenAI response');
      }
      
      console.log(`[Agent ${sectionTitle}] Attempting JSON parse...`);
      const result = JSON.parse(rawContent);
      console.log(`[Agent ${sectionTitle}] JSON Parsed Result:`, JSON.stringify(result));
      
      // Use critiquePoints as the suggestions
      const suggestions = result.critiquePoints || [];
      const isCompliant = suggestions.length === 0 ? result.isCompliant ?? true : false;

      console.log(`[Agent ${sectionTitle}] Processed Result: compliant=${isCompliant}, score=${result.score}, suggestions=${suggestions.length}`);
      return {
        isCompliant: isCompliant,
        score: result.score,
        suggestions: suggestions,
        metadata: {
          analysis: result.analysis,
          vectorScore: searchResults.score
        }
      };
    } catch (e) {
      console.error(`[Agent ${sectionTitle}] Failed to parse analysis JSON:`, e);
      // Log the content that failed to parse
      console.error(`[Agent ${sectionTitle}] Content that failed parsing:`, analysis.choices[0].message.content); 
      return {
        isCompliant: false,
        score: 0,
        suggestions: ['Error analyzing section content'],
        contextualFeedback: {
          nonCompliant: ['Unable to analyze section content']
        },
        sectionType: 'general'
      };
    }
  }
}

export const sectionAgents = {
  risk: new RiskAnalysisAgent(),
  financial: new FinancialAnalysisAgent(),
  governance: new GovernanceAnalysisAgent(),
  general: new GeneralAnalysisAgent()
}; 

// Export the general analyzer as the default document analyzer
export const documentAnalyzer = new GeneralAnalysisAgent(); 