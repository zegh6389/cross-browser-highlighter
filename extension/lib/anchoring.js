/**
 * Anchoring library for robust text highlighting.
 * Handles creating unique selectors for DOM Ranges and restoring them.
 */

const Anchoring = {
  /**
   * Generates a unique selector for a given DOM Range.
   * @param {Range} range - The DOM Range to anchor.
   * @returns {Object} The anchor descriptor.
   */
  createAnchor: function(range) {
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endContainer = range.endContainer;
    const endOffset = range.endOffset;

    // Strategy 1: XPath (Existing)
    const xpathAnchor = {
      startXPath: this.getXPath(startContainer),
      startOffset: startOffset,
      endXPath: this.getXPath(endContainer),
      endOffset: endOffset,
    };

    // Strategy 2: Tag Index (Competitor's approach)
    // We anchor to the parent element of the text node
    const startParent = startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentNode : startContainer;
    const endParent = endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentNode : endContainer;

    const tagIndexAnchor = {
      startTag: startParent.tagName.toLowerCase(),
      startTagIndex: this.getTagIndex(startParent),
      startTextOffset: startContainer.nodeType === Node.TEXT_NODE ? this.getTextOffset(startParent, startContainer, startOffset) : 0,
      endTag: endParent.tagName.toLowerCase(),
      endTagIndex: this.getTagIndex(endParent),
      endTextOffset: endContainer.nodeType === Node.TEXT_NODE ? this.getTextOffset(endParent, endContainer, endOffset) : 0
    };

    return {
      ...xpathAnchor,
      ...tagIndexAnchor,
      text: range.toString(),
      context: this.getContext(range) // Prefix/Suffix for fuzzy matching later
    };
  },

  /**
   * Restores a Range from an anchor descriptor.
   * @param {Object} anchor - The anchor descriptor.
   * @returns {Range|null} The restored DOM Range, or null if not found.
   */
  restoreAnchor: function(anchor) {
    let range = null;

    // Try Strategy 1: XPath
    try {
      range = this.restoreXPath(anchor);
    } catch (e) {
      // console.warn("XPath restore failed", e);
    }

    // Try Strategy 2: Tag Index (if XPath failed or mismatch)
    if (!range || !this.verifyRange(range, anchor)) {
       // console.log("XPath failed or mismatch, trying TagIndex...");
       try {
         range = this.restoreTagIndex(anchor);
       } catch (e) {
         // console.warn("TagIndex restore failed", e);
       }
    }

    // Try Strategy 3: Fuzzy (Last resort)
    if (!range || !this.verifyRange(range, anchor)) {
       console.log("TagIndex failed or mismatch, trying Fuzzy...");
       range = this.fuzzyRestore(anchor);
    }

    return range;
  },

  verifyRange: function(range, anchor) {
      if (!range) return false;
      const text = range.toString().trim();
      const expected = anchor.text ? anchor.text.trim() : "";
      // Allow small differences or partial matches if text is long
      if (!expected) return true;
      return text === expected || text.includes(expected) || expected.includes(text);
  },

  restoreXPath: function(anchor) {
      if (!anchor.startXPath || !anchor.endXPath) return null;
      const startNode = this.getNodeByXPath(anchor.startXPath);
      const endNode = this.getNodeByXPath(anchor.endXPath);
      if (!startNode || !endNode) return null;

      const range = document.createRange();
      range.setStart(startNode, anchor.startOffset);
      range.setEnd(endNode, anchor.endOffset);
      return range;
  },

  restoreTagIndex: function(anchor) {
      if (anchor.startTagIndex === undefined || anchor.endTagIndex === undefined) return null;

      const startParent = document.getElementsByTagName(anchor.startTag)[anchor.startTagIndex];
      const endParent = document.getElementsByTagName(anchor.endTag)[anchor.endTagIndex];

      if (!startParent || !endParent) return null;

      const start = this.getTextNodeByOffset(startParent, anchor.startTextOffset);
      const end = this.getTextNodeByOffset(endParent, anchor.endTextOffset);

      if (!start || !end) return null;

      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      return range;
  },

  /**
   * Generates a unique XPath for a given node.
   * @param {Node} node 
   * @returns {string}
   */
  getXPath: function(node) {
    if (node.nodeType === Node.TEXT_NODE) {
       // If it's a text node, get the path to its parent and append text node index
       const parentPath = this.getXPath(node.parentNode);
       const index = this.getTextNodeIndex(node);
       return `${parentPath}/text()[${index + 1}]`;
    }

    if (node.nodeType === Node.ELEMENT_NODE && node.id) {
        return `//*[@id="${node.id}"]`;
    }
    
    if (node === document.body) {
        return '/html/body';
    }

    if (!node.parentNode) {
        return '';
    }

    const parentPath = this.getXPath(node.parentNode);
    const index = this.getElementIndex(node);
    const tagName = node.tagName.toLowerCase();
    
    return `${parentPath}/${tagName}[${index + 1}]`;
  },

  /**
   * Resolves an XPath to a DOM Node.
   * @param {string} xpath 
   * @returns {Node|null}
   */
  getNodeByXPath: function(xpath) {
    const result = document.evaluate(
        xpath, 
        document, 
        null, 
        XPathResult.FIRST_ORDERED_NODE_TYPE, 
        null
    );
    return result.singleNodeValue;
  },

  getTextNodeIndex: function(textNode) {
    let index = 0;
    let sibling = textNode.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.TEXT_NODE) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    return index;
  },

  getElementIndex: function(element) {
    let index = 0;
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === element.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }
    return index;
  },

  /**
   * Gets the global index of an element for its tag name.
   * @param {Element} element 
   * @returns {number}
   */
  getTagIndex: function(element) {
    const tagName = element.tagName;
    const allTags = document.getElementsByTagName(tagName);
    for (let i = 0; i < allTags.length; i++) {
      if (allTags[i] === element) {
        return i;
      }
    }
    return -1;
  },

  /**
   * Gets the text offset relative to the parent element's text content.
   * @param {Element} parent 
   * @param {Node} textNode 
   * @param {number} offset 
   * @returns {number}
   */
  getTextOffset: function(parent, textNode, offset) {
    let currentOffset = 0;
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      if (node === textNode) {
        return currentOffset + offset;
      }
      currentOffset += node.textContent.length;
    }
    return -1;
  },

  /**
   * Finds a text node within a parent element by text offset.
   * @param {Element} parent 
   * @param {number} offset 
   * @returns {Object} { node, offset }
   */
  getTextNodeByOffset: function(parent, offset) {
    let currentOffset = 0;
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      const length = node.textContent.length;
      if (currentOffset + length >= offset) {
        return { node: node, offset: offset - currentOffset };
      }
      currentOffset += length;
    }
    // If we overshoot (e.g. end of text), return the last node
    return { node: node, offset: node ? node.textContent.length : 0 };
  },
  
  getContext: function(range) {
      // Robust context retrieval
      const maxLength = 32;
      
      // Get Prefix
      let prefix = "";
      let node = range.startContainer;
      let offset = range.startOffset;
      
      // Walk backwards
      while (node && prefix.length < maxLength) {
          if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent;
              const end = (node === range.startContainer) ? offset : text.length;
              const chunk = text.substring(0, end);
              prefix = chunk + prefix;
          }
          
          // Move to previous node
          if (node.previousSibling) {
              node = node.previousSibling;
              while (node.lastChild) node = node.lastChild; // Go to deepest last child
          } else {
              node = node.parentNode;
          }
      }
      
      // Get Suffix
      let suffix = "";
      node = range.endContainer;
      offset = range.endOffset;
      
      // Walk forwards
      while (node && suffix.length < maxLength) {
          if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent;
              const start = (node === range.endContainer) ? offset : 0;
              const chunk = text.substring(start);
              suffix = suffix + chunk;
          }
          
          // Move to next node
          if (node.nextSibling) {
              node = node.nextSibling;
              while (node.firstChild) node = node.firstChild; // Go to deepest first child
          } else {
              node = node.parentNode;
          }
      }

      return {
          prefix: prefix.slice(-maxLength), // Take last N chars
          suffix: suffix.slice(0, maxLength) // Take first N chars
      };
  },

  /**
   * Fuzzy search for the text using context.
   */
  fuzzyRestore: function(anchor) {
      if (!anchor.text) return null;
      
      const searchStr = anchor.text;
      const prefix = anchor.context ? anchor.context.prefix : "";
      const suffix = anchor.context ? anchor.context.suffix : "";
      
      // Create a flat text representation of the body
      // We need to map indices back to nodes.
      const textNodes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let currentNode;
      let fullText = "";
      
      while (currentNode = walker.nextNode()) {
          textNodes.push({
              node: currentNode,
              start: fullText.length,
              length: currentNode.textContent.length
          });
          fullText += currentNode.textContent;
      }
      
      // Find matches
      let searchIndex = 0;
      let foundIndex = -1;
      
      // Simple strategy: Find all occurrences of the text, score them by context
      const candidates = [];
      
      while ((foundIndex = fullText.indexOf(searchStr, searchIndex)) !== -1) {
          // Check context
          const docPrefix = fullText.substring(Math.max(0, foundIndex - prefix.length), foundIndex);
          const docSuffix = fullText.substring(foundIndex + searchStr.length, foundIndex + searchStr.length + suffix.length);
          
          let score = 0;
          if (prefix && docPrefix === prefix) score += 2;
          else if (prefix && docPrefix.endsWith(prefix.slice(-10))) score += 1; // Partial match
          
          if (suffix && docSuffix === suffix) score += 2;
          else if (suffix && docSuffix.startsWith(suffix.slice(0, 10))) score += 1;
          
          candidates.push({ index: foundIndex, score: score });
          searchIndex = foundIndex + 1;
      }
      
      if (candidates.length === 0) return null;
      
      // Pick best candidate
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      
      // Map back to Range
      const startGlobal = best.index;
      const endGlobal = best.index + searchStr.length;
      
      const startNodeData = textNodes.find(t => startGlobal >= t.start && startGlobal < t.start + t.length);
      const endNodeData = textNodes.find(t => endGlobal > t.start && endGlobal <= t.start + t.length);
      
      if (!startNodeData || !endNodeData) return null;
      
      const range = document.createRange();
      range.setStart(startNodeData.node, startGlobal - startNodeData.start);
      range.setEnd(endNodeData.node, endGlobal - endNodeData.start);
      
      console.log("Fuzzy restored anchor:", anchor.text);
      return range;
  }
};

// Export for usage in other modules
if (typeof module !== 'undefined') {
    module.exports = Anchoring;
} else {
    window.Anchoring = Anchoring;
}
