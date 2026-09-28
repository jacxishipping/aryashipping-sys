/**
 * Live ContainerTracking Supabase API Client
 * Connects directly to the ContainerTracking backend with automatic JWT token renewal,
 * live vessel AIS location lookup by IMO, and real-time container event stream updates.
 */

import { logger } from '@/lib/logger';

export interface SupabaseTrackingEvent {
  event_date: string;
  event_type: 'actual' | 'expected';
  event_recent?: boolean;
  action?: {
    action_name?: string;
  };
  location?: {
    port?: string;
    country?: string;
  };
  mode?: {
    vessel?: {
      vessel_name?: string;
      voyage_nr?: string;
      imo?: number;
    };
  };
}

export interface SupabaseTrackingData {
  container?: {
    number?: string;
    type?: string;
    completed?: boolean;
  };
  scac?: string;
  pol?: {
    port?: string;
    country?: string;
    etd_date?: string;
  };
  pod?: {
    port?: string;
    country?: string;
    eta_date?: string;
  };
  events?: SupabaseTrackingEvent[];
}

export interface VesselLiveLocation {
  imo: number;
  lat: number | null;
  lon: number | null;
  course: number | null;
}

class ContainerTrackingSupabaseClient {
  private supabaseUrl: string;
  private anonKey: string;
  private accessToken: string;
  private refreshToken: string;
  private userId: string;
  private subscriptionStatus: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_TRACKING_URL || 'https://wdnqhocjcjolsmgthfjm.supabase.co';
    this.anonKey = process.env.SUPABASE_TRACKING_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbnFob2NqY2pvbHNtZ3RoZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1Mjk3MTAsImV4cCI6MjA2MDEwNTcxMH0.FnfHss745CusFG1HNluhARQIqgwjvBhGVAgLU_bi8uc';
    this.accessToken = process.env.SUPABASE_TRACKING_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ik9DeUVoUTBoTWNxdGJNa2UiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3dkbnFob2NqY2pvbHNtZ3RoZmptLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0NTA3ZGJlMi01YTNkLTQyZWItOWY1Ny05OTU2OWI1NmNmNWQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzkwNTY4OTMzLCJpYXQiOjE3OTA1NjUzMzMsImVtYWlsIjoic2hrcmJhYmFyQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS082bzBQa2dWZGhkZjhYRDdJbE5CX3hMa0ppUkJ0WFhuOGt5UWNoVzJ6a3otNXdlST1zOTYtYyIsImVtYWlsIjoic2hrcmJhYmFyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJTaGFraXIgQmFiYXIiLCJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYW1lIjoiU2hha2lyIEJhYmFyIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS082bzBQa2dWZGhkZjhYRDdJbE5CX3hMa0ppUkJ0WFhuOGt5UWNoVzJ6a3otNXdlST1zOTYtYyIsInByb3ZpZGVyX2lkIjoiMTAyMjA0MDI3MTM3MDQ0MzU4NzI4Iiwic3ViIjoiMTAyMjA0MDI3MTM3MDQ0MzU4NzI4In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3OTAzNTMwOTN9XSwic2Vzc2lvbl9pZCI6IjYwMmMwNzMzLTBjNGMtNDc4Ny1hYmFmLTBjOTljMDNjZTYzNiIsImlzX2Fub255bW91cyI6ZmFsc2V9.LZLND3nqJ_9LjeXYMeODrohPzri9mUx6tl2aUD-FYR0';
    this.refreshToken = process.env.SUPABASE_TRACKING_REFRESH_TOKEN || 'osl3x2ix7cr7';
    this.userId = process.env.SUPABASE_TRACKING_USER_ID || '4507dbe2-5a3d-42eb-9f57-99569b56cf5d';
    this.subscriptionStatus = process.env.SUBSCRIPTION_STATUS || 'pro';
  }

  /**
   * Decode expiration time from JWT
   */
  private getTokenExpiry(jwt: string): number | null {
    try {
      const parts = jwt.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }

  /**
   * Automatically exchange refresh token for a fresh JWT access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    const url = `${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: this.anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!res.ok) {
        logger.warn(`Supabase tracking token refresh failed with HTTP ${res.status}`);
        return false;
      }

      const body = await res.json();
      if (body.access_token) {
        this.accessToken = body.access_token;
        if (body.refresh_token) {
          this.refreshToken = body.refresh_token;
        }
        logger.info('Supabase container tracking access token renewed successfully.');
        return true;
      }
    } catch (err) {
      logger.error('Error refreshing Supabase tracking token:', err);
    }
    return false;
  }

  /**
   * Ensure the access token is fresh before making API calls.
   */
  private async ensureFreshToken(): Promise<void> {
    const exp = this.getTokenExpiry(this.accessToken);
    const nowEpoch = Math.floor(Date.now() / 1000);
    // If expires in less than 5 minutes (300 seconds), renew it
    if (exp && exp - nowEpoch < 300) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Make an authenticated request with automatic retry on 401
   */
  private async authenticatedFetch(
    url: string,
    options: RequestInit,
    retries = 2
  ): Promise<Response> {
    await this.ensureFreshToken();

    for (let attempt = 0; attempt < retries; attempt++) {
      const headers = {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-client-info': 'jacxi-shipping-tracking/1.0',
        ...(options.headers || {}),
      };

      try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 && attempt < retries - 1) {
          const renewed = await this.refreshAccessToken();
          if (renewed) continue;
        }
        return response;
      } catch (error) {
        if (attempt === retries - 1) throw error;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error(`Request to ${url} failed after retries.`);
  }

  /**
   * Register a container with the tracking backend.
   */
  async registerContainer(trackingNumber: string): Promise<boolean> {
    const cleanNumber = trackingNumber.trim().toUpperCase();
    const url = `${this.supabaseUrl}/rest/v1/trackings_ids?on_conflict=user_id%2Ctracking_number`;

    const payload = {
      user_id: this.userId,
      tracking_number: cleanNumber,
      tracking_type: 'container',
      shipping_line: null,
      note: null,
      created_at: new Date().toISOString(),
      completed: false,
      subscription_status: this.subscriptionStatus,
    };

    try {
      const res = await this.authenticatedFetch(url, {
        method: 'POST',
        headers: {
          'content-profile': 'public',
          'accept-profile': 'public',
          prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (err) {
      logger.error(`Failed to register container ${cleanNumber} in Supabase:`, err);
      return false;
    }
  }

  /**
   * Fetch real-time container tracking data from update-tracking-v2 function.
   */
  async fetchContainerTracking(trackingNumber: string): Promise<SupabaseTrackingData | null> {
    const cleanNumber = trackingNumber.trim().toUpperCase();
    // Auto-register first if needed
    await this.registerContainer(cleanNumber).catch(() => {});

    const url = `${this.supabaseUrl}/functions/v1/update-tracking-v2`;

    try {
      const res = await this.authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify({ tracking_number: cleanNumber }),
      });

      if (!res.ok) {
        logger.warn(`update-tracking-v2 returned HTTP ${res.status} for ${cleanNumber}`);
        return null;
      }

      const body = await res.json();
      const trackingData: SupabaseTrackingData = (body?.data || body)?.data || body?.data || body;
      return trackingData;
    } catch (err) {
      logger.error(`Error fetching tracking for ${cleanNumber}:`, err);
      return null;
    }
  }

  /**
   * Get real-time live satellite GPS position of a vessel by IMO number.
   */
  async getLiveVesselLocation(imo: number | string): Promise<VesselLiveLocation | null> {
    const imoNum = parseInt(String(imo).replace(/\D/g, ''), 10);
    if (Number.isNaN(imoNum) || imoNum <= 0) return null;

    const url = `${this.supabaseUrl}/functions/v1/get-vessel-location`;

    try {
      const res = await this.authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify({ imo: imoNum }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return {
        imo: imoNum,
        lat: typeof data.lat === 'number' ? data.lat : null,
        lon: typeof data.lon === 'number' ? data.lon : null,
        course: typeof data.course === 'number' ? data.course : null,
      };
    } catch (err) {
      logger.error(`Error fetching vessel location for IMO ${imoNum}:`, err);
      return null;
    }
  }
}

export const containerTrackingClient = new ContainerTrackingSupabaseClient();
