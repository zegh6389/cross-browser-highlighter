/**
 * Application constants
 */

/**
 * Usage limits
 */
export const LIMITS = {
  /** Free tier word limit for synced highlights */
  FREE_TIER_WORDS: 300,
  
  /** Maximum highlights per sync request */
  MAX_HIGHLIGHTS_PER_SYNC: 100,
  
  /** Maximum text length for a single highlight (characters) */
  MAX_HIGHLIGHT_TEXT_LENGTH: 10000,
  
  /** Maximum note length */
  MAX_NOTE_LENGTH: 5000,
  
  /** API rate limit: requests per minute */
  RATE_LIMIT_RPM: 60,
  
  /** Extension token expiry (milliseconds) */
  EXTENSION_TOKEN_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Stripe product/price configuration
 * These should match your Stripe dashboard
 */
export const STRIPE_CONFIG = {
  PRODUCT_NAME: 'Web Highlighter Pro',
  
  PRICES: {
    MONTHLY: {
      id: process.env.STRIPE_PRICE_ID_MONTHLY || 'price_monthly',
      amount: 999, // $9.99 in cents
      interval: 'month' as const,
      name: 'Monthly',
    },
    YEARLY: {
      id: process.env.STRIPE_PRICE_ID_YEARLY || 'price_yearly',
      amount: 9999, // $99.99 in cents
      interval: 'year' as const,
      name: 'Yearly',
      savings: '17%',
    },
  },
} as const;

/**
 * Highlight colors with display info
 */
export const HIGHLIGHT_COLORS = {
  yellow: {
    name: 'Yellow',
    bg: '#fef08a',
    border: '#facc15',
    textClass: 'text-yellow-900',
  },
  green: {
    name: 'Green',
    bg: '#bbf7d0',
    border: '#4ade80',
    textClass: 'text-green-900',
  },
  blue: {
    name: 'Blue',
    bg: '#bfdbfe',
    border: '#60a5fa',
    textClass: 'text-blue-900',
  },
  pink: {
    name: 'Pink',
    bg: '#fbcfe8',
    border: '#f472b6',
    textClass: 'text-pink-900',
  },
} as const;

/**
 * API routes
 */
export const API_ROUTES = {
  // Auth
  AUTH_SIGNUP: '/api/auth/signup',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_CALLBACK: '/api/auth/callback',
  AUTH_EXTENSION_TOKEN: '/api/auth/extension-token',
  AUTH_EXCHANGE_TOKEN: '/api/auth/exchange-token',
  
  // Highlights
  HIGHLIGHTS: '/api/highlights',
  HIGHLIGHTS_SYNC: '/api/highlights/sync',
  HIGHLIGHTS_EXPORT: '/api/highlights/export',
  
  // Usage
  USAGE: '/api/usage',
  USAGE_CAN_SYNC: '/api/usage/can-sync',
  
  // Stripe
  STRIPE_CHECKOUT: '/api/stripe/create-checkout',
  STRIPE_PORTAL: '/api/stripe/create-portal',
  STRIPE_WEBHOOK: '/api/stripe/webhook',
  
  // Admin
  ADMIN_USERS: '/api/admin/users',
  ADMIN_ANALYTICS: '/api/admin/analytics',
  ADMIN_CODES: '/api/admin/codes',
} as const;

/**
 * Web app routes
 */
export const APP_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  HIGHLIGHTS: '/highlights',
  SETTINGS: '/settings',
  SUBSCRIPTION: '/subscription',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_CODES: '/admin/codes',
} as const;

/**
 * Error codes for API responses
 */
export const ERROR_CODES = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Limit errors
  WORD_LIMIT_EXCEEDED: 'WORD_LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
