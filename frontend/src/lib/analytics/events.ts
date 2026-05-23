/** Analytics event names (keep aligned with shared/analytics-events.ts). */
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  SESSION_START: 'session_start',
  PRODUCT_VIEWED: 'product_viewed',
  PRODUCT_ADDED_TO_CART: 'product_added_to_cart',
  CART_OPENED: 'cart_opened',
  CHECKOUT_STARTED: 'checkout_started',
  ORDER_CREATED: 'order_created',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  SCHEDULED_ORDER_SELECTED: 'scheduled_order_selected',
  ADDRESS_SELECTED: 'address_selected',
  SEARCH_USED: 'search_used',
  API_ERROR: 'api_error',
  CART_ACTION_FAILED: 'cart_action_failed',
  FRONTEND_ERROR: 'frontend_error',
  SLOW_REQUEST: 'slow_request',
  PERFORMANCE: 'performance',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
