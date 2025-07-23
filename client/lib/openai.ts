const OPENAI_API_KEY = "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";

export interface InsightCard {
  id: string;
  title: string;
  description: string;
  financialImpact: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  suggestedActions: string[];
  rootCause: string;
  evidenceTrail: any[];
  confidence: number;
  agentName: string;
}

class OpenAIService {
  private async callOpenAI(messages: any[], model = "gpt-4o-mini") {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateOverviewInsights(data: any[]): Promise<InsightCard[]> {
    const prompt = `
You are the OverviewMonitorAgent for BrandBuddy, a decision engine that recommends and automates workflows.

BrandBuddy is not a BI tool — it's a decision engine that recommends or automates workflows.

Analyze this operational data and recommend workflow decisions:

Data Summary:
${JSON.stringify(data.slice(0, 10), null, 2)}

For each decision recommendation, follow this structure:
What happened → Why it matters ($) → What should be done → Confidence → Action

Focus on actionable operational decisions:
- Revenue-impacting decisions requiring immediate workflow automation
- Supply chain decisions that need escalation workflows
- Inventory decisions requiring restocking or markdown workflows
- SLA decisions needing vendor or process workflows

Return as JSON array with this exact structure:
[{
  "title": "Brief actionable decision title",
  "description": "What operational decision needs to be made",
  "financialImpact": number,
  "severity": "critical|high|medium|low",
  "tags": ["array", "of", "relevant", "tags"],
  "suggestedActions": ["Create Workflow", "Automate Process", "Escalate Decision"],
  "rootCause": "Why this decision is needed with $ impact context"
}]
`;

    try {
      const response = await this.callOpenAI([
        { role: "system", content: "You are an expert business intelligence analyst. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ]);
      
      return JSON.parse(response).map((insight: any, index: number) => ({
        id: `overview-${Date.now()}-${index}`,
        agentName: "OverviewMonitorAgent",
        confidence: 0.85,
        evidenceTrail: data.slice(0, 5),
        ...insight
      }));
    } catch (error) {
      console.error("Error generating overview insights:", error);
      return [];
    }
  }

  async generateOrderFlowInsights(orderData: any[]): Promise<InsightCard[]> {
    const prompt = `
You are the OrderFlowAgent for BrandBuddy. Analyze order flow data and identify channel-specific anomalies.

Order Data:
${JSON.stringify(orderData.slice(0, 15), null, 2)}

Focus on:
- Cancel rate spikes by channel
- Shipping method mismatches
- Carrier performance issues
- Revenue impact from delays

Generate 2-4 actionable insights with financial impact estimates.
Return as JSON array.
`;

    try {
      const response = await this.callOpenAI([
        { role: "system", content: "You are an order fulfillment expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ]);

      return JSON.parse(response).map((insight: any, index: number) => ({
        id: `orderflow-${Date.now()}-${index}`,
        agentName: "OrderFlowAgent",
        confidence: 0.8,
        evidenceTrail: orderData.slice(0, 5),
        ...insight
      }));
    } catch (error) {
      console.error("Error generating order flow insights:", error);
      return [];
    }
  }

  async generateInventoryInsights(inventoryData: any[]): Promise<InsightCard[]> {
    const prompt = `
You are the SKUHealthAgent for BrandBuddy. Analyze inventory health data.

Inventory Data:
${JSON.stringify(inventoryData.slice(0, 15), null, 2)}

Focus on:
- SKUs with critical stock levels (< 7 days on hand)
- Overstocked items (> 4x normal levels)
- Unfulfillable vs committed stock mismatches
- Revenue risk from stockouts

Generate 2-4 insights with specific SKU recommendations.
Return as JSON array.
`;

    try {
      const response = await this.callOpenAI([
        { role: "system", content: "You are an inventory management expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ]);

      return JSON.parse(response).map((insight: any, index: number) => ({
        id: `inventory-${Date.now()}-${index}`,
        agentName: "SKUHealthAgent",
        confidence: 0.9,
        evidenceTrail: inventoryData.slice(0, 5),
        ...insight
      }));
    } catch (error) {
      console.error("Error generating inventory insights:", error);
      return [];
    }
  }

  async generateReturnsInsights(returnsData: any[]): Promise<InsightCard[]> {
    const prompt = `
You are the ReturnsInsightAgent for BrandBuddy. Analyze return patterns and processing.

Returns Data:
${JSON.stringify(returnsData.slice(0, 15), null, 2)}

Focus on:
- SKUs with return rate spikes
- Return reason clustering and patterns
- Unbilled restocking fees
- Return processing SLA breaches
- Revenue impact from returns

Generate 2-4 actionable insights with financial impact.
Return as JSON array.
`;

    try {
      const response = await this.callOpenAI([
        { role: "system", content: "You are a returns analysis expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ]);

      return JSON.parse(response).map((insight: any, index: number) => ({
        id: `returns-${Date.now()}-${index}`,
        agentName: "ReturnsInsightAgent",
        confidence: 0.85,
        evidenceTrail: returnsData.slice(0, 5),
        ...insight
      }));
    } catch (error) {
      console.error("Error generating returns insights:", error);
      return [];
    }
  }

  async generateReplenishmentInsights(inboundData: any[], inventoryData: any[]): Promise<InsightCard[]> {
    const prompt = `
You are the ReplenishmentAgent for BrandBuddy. Analyze replenishment needs and supply chain risks.

Inbound Shipment Data:
${JSON.stringify(inboundData.slice(0, 10), null, 2)}

Inventory Data:
${JSON.stringify(inventoryData.slice(0, 10), null, 2)}

Focus on:
- SKUs forecasted to stockout
- Delayed inbound shipments
- Reorder point breaches
- Demand vs supply mismatches
- Financial impact of stockouts

Generate 2-4 urgent replenishment alerts.
Return as JSON array.
`;

    try {
      const response = await this.callOpenAI([
        { role: "system", content: "You are a supply chain expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ]);

      return JSON.parse(response).map((insight: any, index: number) => ({
        id: `replenishment-${Date.now()}-${index}`,
        agentName: "ReplenishmentAgent",
        confidence: 0.92,
        evidenceTrail: [...inboundData.slice(0, 3), ...inventoryData.slice(0, 3)],
        ...insight
      }));
    } catch (error) {
      console.error("Error generating replenishment insights:", error);
      return [];
    }
  }

  async generateSLAInsights(orderData: any[], shipmentData: any[], returnsData: any[]): Promise<InsightCard[]> {
    const prompt = `
You are the SLAWatchdogAgent for BrandBuddy. Analyze SLA performance across operations.

Order Data:
${JSON.stringify(orderData.slice(0, 8), null, 2)}

Shipment Data:
${JSON.stringify(shipmentData.slice(0, 8), null, 2)}

Returns Data:
${JSON.stringify(returnsData.slice(0, 8), null, 2)}

Focus on:
- Shipping SLA breaches
- Return processing delays
- OTIF (On Time In Full) performance
- Repeated SLA failures
- Contract compliance risks

Generate 2-4 SLA-related insights with escalation recommendations.
Return as JSON array.
`;

    try {
      const response = await this.callOpenAI([
        { role: "system", content: "You are an SLA monitoring expert. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ]);

      return JSON.parse(response).map((insight: any, index: number) => ({
        id: `sla-${Date.now()}-${index}`,
        agentName: "SLAWatchdogAgent",
        confidence: 0.88,
        evidenceTrail: [...orderData.slice(0, 3), ...shipmentData.slice(0, 3)],
        ...insight
      }));
    } catch (error) {
      console.error("Error generating SLA insights:", error);
      return [];
    }
  }

  async testConnection() {
    try {
      const response = await this.callOpenAI([
        { role: "user", content: "Say 'OpenAI connection successful' if this works." }
      ]);

      // Check if the response contains the expected success message or is a fallback
      const isActualConnection = response.includes('OpenAI connection successful');

      return {
        success: isActualConnection,
        message: isActualConnection ? response : 'Using demo mode - OpenAI API unavailable'
      };
    } catch (error) {
      console.warn('OpenAI connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'OpenAI API connection failed'
      };
    }
  }
}

export const openaiService = new OpenAIService();
