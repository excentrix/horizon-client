/**
 * Web Push Notification Manager
 * Handles service worker registration and push subscriptions
 */

const SERVICE_WORKER_PATH = '/service-worker.js';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string;

  constructor(vapidPublicKey?: string) {
    this.vapidPublicKey = vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('Push notifications are not supported in this browser');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
        scope: '/',
      });

      console.log('Service Worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  /**
   * Request permission for notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(token?: string): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return null;
    }

    // Ensure service worker is registered
    if (!this.registration) {
      this.registration = await this.registerServiceWorker();
      if (!this.registration) {
        return null;
      }
    }

    // Request permission if not already granted
    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Notification permission denied');
        return null;
      }
    }

    try {
      // Convert VAPID key from base64 to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      // Subscribe to push
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });

      console.log('Push subscription created:', subscription);

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription, token);

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        console.log('Unsubscribed from push notifications');
        
        // Notify backend
        await this.removeSubscriptionFromBackend();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      const reg = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
      this.registration = reg || null;
    }

    if (!this.registration) {
      return null;
    }

    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Send subscription to backend
   */
  private async sendSubscriptionToBackend(
    subscription: PushSubscription,
    token?: string
  ): Promise<void> {
    const subscriptionData = this.serializeSubscription(subscription);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/notifications/push-subscriptions/`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(subscriptionData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save subscription: ${response.statusText}`);
      }

      console.log('Subscription saved to backend');
    } catch (error) {
      console.error('Failed to send subscription to backend:', error);
      throw error;
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscriptionFromBackend(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/push-subscriptions/unsubscribe_all/`, {
        method: 'POST',
        credentials: 'include',
      });

      console.log('Subscription removed from backend');
    } catch (error) {
      console.error('Failed to remove subscription from backend:', error);
    }
  }

  /**
   * Serialize push subscription for API
   */
  private serializeSubscription(subscription: PushSubscription): PushSubscriptionData {
    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: key ? this.arrayBufferToBase64(key) : '',
        auth: auth ? this.arrayBufferToBase64(auth) : '',
      },
    };
  }

  /**
   * Convert base64 string to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return window.btoa(binary);
  }
}

// Singleton instance
let pushManager: PushNotificationManager | null = null;

export function getPushManager(): PushNotificationManager {
  if (!pushManager) {
    pushManager = new PushNotificationManager();
  }
  return pushManager;
}
