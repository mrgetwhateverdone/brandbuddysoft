// Default fallback token and URL
const TINYBIRD_TOKEN =
  "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICJhNzAwYzQ2Ni03MTMwLTRkZmMtYTMzNS0yOGYyMDA1ZTRlNjgiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.8UMc_OIkIwtVWUnsYOgs-aiO61hY5Rl-bDsOoLe9Rwc";
const TINYBIRD_BASE_URL = "https://api.us-east.aws.tinybird.co/v0/pipes";

// Specific tokens for each materialized view
const MV_TOKENS = {
  inbound_shipments_details_mv:
    "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICJiZmI5ZmFhMC0xMzZiLTRkNGYtOTczMy02N2UxNTNkNDI5ZmEiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.Z0aYbeOtSoOVxeI0e4FO2g4TO4Ey1DjC36lsdfQb3I8",
  inventory_health_check_mv:
    "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICIzODc4NGVlNy0wMzIyLTQ3ZGEtOWVmMy04NTVhMDVlNGQ0MWIiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.mwcsdFH5EqhKNitjCXUhdqCiawEJahiAHz4u9F5TIqk",
  order_details_mv:
    "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICI1OGIxNjE3ZC0zOWNkLTQ4YjAtYjE5MS02YWY0OTRiMDFlOWQiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.tDjgkp7gvaXUL1mzXCIYUULQsU6KjebhAgn94J9MbYQ",
  order_shipments_mv:
    "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICJhNjQ2NjE3NS04YjJmLTQ3ODYtYjgxMC1kOGM5MjYwMWVlOGYiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.5sKQjdrd6kb5QzP4hrtOyfuM3Xwr0J21tNfkEtCld7k",
  product_details_mv:
    "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICIzNWNjMDM1ZS1hY2E3LTRlN2EtYjVjYy03Y2IzOGJjNWYyYTMiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.FB0QQVdFrdE4mVlpWI2ibCoHizntg-jpXgUkUVt7zz4",
  returns_details_mv:
    "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICI2OTYxMWZkMi0yYzQ1LTQ4YTQtYWJiYi02OWZmODk2M2I2NWYiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.acrD0O3dQfmUp9eViznxFGLPKriQc2By4fzrSbS8Vtc",
};

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
  private async fetchPipe<T = any>(
    pipeName: string,
    params: Record<string, any> = {},
  ): Promise<TinybirdResponse<T>> {
    // Check if we have saved connection config for user credentials
    const savedConfig = localStorage.getItem("brandbuddy_connections");
    let hasUserCredentials = false;
    let userToken = TINYBIRD_TOKEN;
    let userBaseUrl = TINYBIRD_BASE_URL;

    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config.tinybird?.token) {
          userToken = config.tinybird.token;
          hasUserCredentials = true;
        }
        if (config.tinybird?.baseUrl) {
          userBaseUrl =
            config.tinybird.baseUrl.replace(/\/$/, "") + "/v0/pipes";
        }
      } catch (e) {
        console.warn("Failed to parse saved connection config:", e);
      }
    }

    // If no user credentials are provided, throw an error instead of attempting API calls
    if (!hasUserCredentials) {
      throw new Error(
        "No Tinybird credentials configured. Please configure your API token in Settings.",
      );
    }

    try {
      // Try direct API call with user credentials
      const directUrl = new URL(`${userBaseUrl}/${pipeName}.json`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          directUrl.searchParams.append(key, String(value));
        }
      });

      const directResponse = await fetch(directUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        mode: "cors",
      });

      if (directResponse.ok) {
        return await directResponse.json();
      }

      const errorText = await directResponse.text();
      throw new Error(
        `Tinybird API error: ${directResponse.status} ${directResponse.statusText} - ${errorText}`,
      );
    } catch (error) {
      console.error(`Tinybird API call failed for ${pipeName}:`, error);
      throw new Error(
        `Failed to fetch data from Tinybird: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Inbound Shipments
  async getInboundShipments(
    filters: {
      brandId?: string;
      warehouseId?: string;
      status?: string;
      limit?: number;
    } = {},
  ) {
    return this.fetchPipe("inbound_shipments_details_mv", filters);
  }

  // Inventory Health Check
  async getInventoryHealth(
    filters: {
      brandId?: string;
      warehouseId?: string;
      productSku?: string;
      limit?: number;
    } = {},
  ) {
    return this.fetchPipe("inventory_health_check_mv", filters);
  }

  // Order Details
  async getOrderDetails(
    filters: {
      brandId?: string;
      channel?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {},
  ) {
    // Set default date range to last 2 years if not specified
    const defaultFilters = { ...filters };
    if (!defaultFilters.startDate && !defaultFilters.endDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 2);
      defaultFilters.startDate = startDate.toISOString().split("T")[0];
      defaultFilters.endDate = endDate.toISOString().split("T")[0];
    }
    return this.fetchPipe("order_details_mv", defaultFilters);
  }

  // Order Shipments
  async getOrderShipments(
    filters: {
      brandId?: string;
      orderId?: string;
      carrier?: string;
      limit?: number;
    } = {},
  ) {
    return this.fetchPipe("order_shipments_mv", filters);
  }

  // Product Details
  async getProductDetails(
    filters: {
      brandId?: string;
      productSku?: string;
      active?: boolean;
      limit?: number;
    } = {},
  ) {
    return this.fetchPipe("product_details_mv", filters);
  }

  // Returns Details
  async getReturnsDetails(
    filters: {
      brandId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {},
  ) {
    // Set default date range to last 2 years if not specified
    const defaultFilters = { ...filters };
    if (!defaultFilters.startDate && !defaultFilters.endDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 2);
      defaultFilters.startDate = startDate.toISOString().split("T")[0];
      defaultFilters.endDate = endDate.toISOString().split("T")[0];
    }
    return this.fetchPipe("returns_details_mv", defaultFilters);
  }

  // Test connection
  async testConnection() {
    try {
      // Check if user has configured credentials
      const savedConfig = localStorage.getItem("brandbuddy_connections");
      if (!savedConfig) {
        return {
          success: false,
          error: "No credentials configured",
          message:
            "Please configure your Tinybird API token in Settings to test connection",
        };
      }

      const config = JSON.parse(savedConfig);
      if (!config.tinybird?.token) {
        return {
          success: false,
          error: "No credentials configured",
          message:
            "Please configure your Tinybird API token in Settings to test connection",
        };
      }

      const result = await this.fetchPipe("order_details_mv", { limit: 1 });
      return {
        success: true,
        rows: result.rows,
        message: `Connected to Tinybird successfully! Found ${result.rows.toLocaleString()} records.`,
      };
    } catch (error) {
      console.warn("Tinybird connection test failed:", error);

      // Provide more specific error messages
      let message = "Connection failed";
      if (error instanceof Error) {
        if (error.message.includes("No Tinybird credentials")) {
          message = "Please configure your Tinybird API token in Settings";
        } else if (error.message.includes("CORS")) {
          message = "CORS error - please check your Tinybird configuration";
        } else if (
          error.message.includes("401") ||
          error.message.includes("403")
        ) {
          message = "Authentication failed - please check your API token";
        } else if (error.message.includes("404")) {
          message = "API endpoint not found - please check your base URL";
        } else if (error.message.includes("Failed to fetch")) {
          message =
            "Network error - please check your connection and try again";
        } else {
          message = error.message;
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message,
      };
    }
  }
}

export const tinybirdService = new TinybirdService();
