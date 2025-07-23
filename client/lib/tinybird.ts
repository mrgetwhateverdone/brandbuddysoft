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
    try {
      // Try to use server-side proxy first
      const proxyUrl = `/api/tinybird/${pipeName}`;
      const queryParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      const fullUrl = queryParams.toString() ? `${proxyUrl}?${queryParams.toString()}` : proxyUrl;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }

      // If proxy fails, fall back to direct API call (will likely fail due to CORS)
      const directUrl = new URL(`${TINYBIRD_BASE_URL}/${pipeName}.json`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          directUrl.searchParams.append(key, String(value));
        }
      });

      const directResponse = await fetch(directUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (!directResponse.ok) {
        throw new Error(`Tinybird API error: ${directResponse.status} ${directResponse.statusText}`);
      }

      return await directResponse.json();
    } catch (error) {
      console.error(`Tinybird API call failed for ${pipeName}:`, error);
      throw new Error(`Failed to fetch data from Tinybird: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      return {
        success: true,
        rows: result.rows,
        message: result.rows > 0 ? 'Connected to Tinybird successfully' : 'Connected but no data available'
      };
    } catch (error) {
      console.warn('Tinybird connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Using mock data - Tinybird connection failed'
      };
    }
  }
}

export const tinybirdService = new TinybirdService();
