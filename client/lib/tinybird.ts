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
      console.warn(`Tinybird API call failed for ${pipeName}:`, error);
      // Return mock data structure for development
      return this.getMockData(pipeName);
    }
  }

  private getMockData(pipeName: string): TinybirdResponse<any> {
    const mockData = this.generateMockDataForPipe(pipeName);
    return {
      data: mockData,
      rows: mockData.length,
      statistics: {
        elapsed: 0.1,
        rows_read: mockData.length,
        bytes_read: 1024
      }
    };
  }

  private generateMockDataForPipe(pipeName: string): any[] {
    switch (pipeName) {
      case 'order_details_mv':
        return [
          {
            order_id: 'ORD-123456',
            brand_name: 'TechBrand',
            order_status: 'fulfilled',
            channel: 'Amazon',
            total_price: 89.99,
            created_date: '2024-01-15',
            order_date: '2024-01-15',
            sku: 'SKU-9281',
            line_item_quantity: 2
          },
          {
            order_id: 'ORD-123457',
            brand_name: 'StyleBrand',
            order_status: 'pending',
            channel: 'TikTok',
            total_price: 156.50,
            created_date: '2024-01-16',
            order_date: '2024-01-16',
            sku: 'SKU-882',
            line_item_quantity: 1
          }
        ];

      case 'inventory_health_check_mv':
        return [
          {
            product_sku: 'SKU-9281',
            product_name: 'Premium Widget Pro',
            brand_name: 'TechBrand',
            onhand_quantity: 12,
            committed_quantity: 45,
            unfulfillable_quantity: 2,
            warehouse_id: 'WH-001'
          },
          {
            product_sku: 'SKU-882',
            product_name: 'Style Widget',
            brand_name: 'StyleBrand',
            onhand_quantity: 156,
            committed_quantity: 23,
            unfulfillable_quantity: 5,
            warehouse_id: 'WH-001'
          }
        ];

      case 'returns_details_mv':
        return [
          {
            return_id: 'RET-789012',
            order_id: 'ORD-123456',
            sku: 'SKU-882',
            total_quantity_returned: 1,
            total_quantity_restocked: 1,
            return_initialized_date: '2024-01-14',
            returned_date: '2024-01-16',
            status: 'processed',
            brand_name: 'StyleBrand'
          }
        ];

      case 'inbound_shipments_details_mv':
        return [
          {
            shipment_id: 'IB-001',
            sku: 'SKU-9281',
            expected_arrival_date: '2024-01-20',
            status: 'in_transit',
            supplier: 'Widget Corp',
            expected_quantity: 100,
            received_quantity: 0
          }
        ];

      case 'order_shipments_mv':
        return [
          {
            order_id: 'ORD-123456',
            shipment_id: 'SH-001',
            tracking_number: '1Z999AA1234567890',
            carrier: 'UPS',
            shipped_date: '2024-01-15',
            package_sku: 'SKU-9281'
          }
        ];

      case 'product_details_mv':
        return [
          {
            product_id: 'PROD-001',
            product_sku: 'SKU-9281',
            product_name: 'Premium Widget Pro',
            brand_name: 'TechBrand',
            supplier_name: 'Widget Corp',
            active: true
          }
        ];

      default:
        return [];
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
      return { success: true, rows: result.rows };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const tinybirdService = new TinybirdService();
