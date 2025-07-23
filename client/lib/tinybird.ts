const TINYBIRD_TOKEN = "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICJhNzAwYzQ2Ni03MTMwLTRkZmMtYTMzNS0yOGYyMDA1ZTRlNjgiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.8UMc_OIkIwtVWUnsYOgs-aiO61hY5Rl-bDsOoLe9Rwc";
const TINYBIRD_BASE_URL = "https://api.us-east-aws.tinybird.co/v0/pipes";

export interface TinybirdResponse<T = any> {
  data: T[];
  rows: number;
  statistics: {
    elapsed: number;
    rows_read: number;
    bytes_read: number;
  };
}

class TinybirdService {
  private async fetchPipe<T = any>(pipeName: string, params: Record<string, any> = {}): Promise<TinybirdResponse<T>> {
    const url = new URL(`${TINYBIRD_BASE_URL}/${pipeName}.json`);
    
    // Add parameters to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Tinybird API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Inbound Shipments
  async getInboundShipments(filters: {
    brandId?: string;
    warehouseId?: string;
    status?: string;
    limit?: number;
  } = {}) {
    return this.fetchPipe('inbound_shipments_details_mv', filters);
  }

  // Inventory Health Check
  async getInventoryHealth(filters: {
    brandId?: string;
    warehouseId?: string;
    productSku?: string;
    limit?: number;
  } = {}) {
    return this.fetchPipe('inventory_health_check_mv', filters);
  }

  // Order Details
  async getOrderDetails(filters: {
    brandId?: string;
    channel?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}) {
    return this.fetchPipe('order_details_mv', filters);
  }

  // Order Shipments
  async getOrderShipments(filters: {
    brandId?: string;
    orderId?: string;
    carrier?: string;
    limit?: number;
  } = {}) {
    return this.fetchPipe('order_shipments_mv', filters);
  }

  // Product Details
  async getProductDetails(filters: {
    brandId?: string;
    productSku?: string;
    active?: boolean;
    limit?: number;
  } = {}) {
    return this.fetchPipe('product_details_mv', filters);
  }

  // Returns Details
  async getReturnsDetails(filters: {
    brandId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}) {
    return this.fetchPipe('returns_details_mv', filters);
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.fetchPipe('order_details_mv', { limit: 1 });
      return { success: true, rows: result.rows };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const tinybirdService = new TinybirdService();
