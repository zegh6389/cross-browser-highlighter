/**
 * Shared Utilities
 */
const Utils = {
  /**
   * Normalizes a URL by removing tracking parameters.
   * This ensures highlights persist across different referral links.
   * @param {string} urlString 
   * @returns {string}
   */
  normalizeUrl: function(urlString) {
    try {
      const url = new URL(urlString);
      
      // List of parameters to strip
      const trackingParams = [
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "fbclid", "gclid", "ref", "source"
      ];

      trackingParams.forEach(param => url.searchParams.delete(param));

      // We keep the hash because some Single Page Apps (SPAs) use it for routing.
      // We keep other params because they might determine page content (e.g. ?article_id=123)
      
      return url.toString();
    } catch (e) {
      console.warn("Invalid URL for normalization:", urlString);
      return urlString;
    }
  }
};

// Export for different environments
if (typeof module !== 'undefined') {
    module.exports = Utils;
} else {
    window.Utils = Utils;
}
