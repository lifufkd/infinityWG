/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./core/lib/common.js":
/*!****************************!*\
  !*** ./core/lib/common.js ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-present eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

/** @module */



let textToRegExp =
/**
 * Converts raw text into a regular expression string
 * @param {string} text the string to convert
 * @return {string} regular expression representation of the text
 * @package
 */
exports.textToRegExp = text => text.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const regexpRegexp = /^\/(.*)\/([imu]*)$/;

/**
 * Make a regular expression from a text argument.
 *
 * If it can be parsed as a regular expression, parse it and the flags.
 *
 * @param {string} text the text argument.
 *
 * @return {?RegExp} a RegExp object or null in case of error.
 */
exports.makeRegExpParameter = function makeRegExpParameter(text) {
  let [, source, flags] = regexpRegexp.exec(text) || [null, textToRegExp(text)];

  try {
    return new RegExp(source, flags);
  }
  catch (e) {
    return null;
  }
};

let splitSelector = exports.splitSelector = function splitSelector(selector) {
  if (!selector.includes(",")) {
    return [selector];
  }

  let selectors = [];
  let start = 0;
  let level = 0;
  let sep = "";

  for (let i = 0; i < selector.length; i++) {
    let chr = selector[i];

    // ignore escaped characters
    if (chr == "\\") {
      i++;
    }
    // don't split within quoted text
    else if (chr == sep) {
      sep = "";             // e.g. [attr=","]
    }
    else if (sep == "") {
      if (chr == '"' || chr == "'") {
        sep = chr;
      }
      // don't split between parentheses
      else if (chr == "(") {
        level++;            // e.g. :matches(div,span)
      }
      else if (chr == ")") {
        level = Math.max(0, level - 1);
      }
      else if (chr == "," && level == 0) {
        selectors.push(selector.substring(start, i));
        start = i + 1;
      }
    }
  }

  selectors.push(selector.substring(start));
  return selectors;
};

function findTargetSelectorIndex(selector) {
  let index = 0;
  let whitespace = 0;
  let scope = [];

  // Start from the end of the string and go character by character, where each
  // character is a Unicode code point.
  for (let character of [...selector].reverse()) {
    let currentScope = scope[scope.length - 1];

    if (character == "'" || character == "\"") {
      // If we're already within the same type of quote, close the scope;
      // otherwise open a new scope.
      if (currentScope == character) {
        scope.pop();
      }
      else {
        scope.push(character);
      }
    }
    else if (character == "]" || character == ")") {
      // For closing brackets and parentheses, open a new scope only if we're
      // not within a quote. Within quotes these characters should have no
      // meaning.
      if (currentScope != "'" && currentScope != "\"") {
        scope.push(character);
      }
    }
    else if (character == "[") {
      // If we're already within a bracket, close the scope.
      if (currentScope == "]") {
        scope.pop();
      }
    }
    else if (character == "(") {
      // If we're already within a parenthesis, close the scope.
      if (currentScope == ")") {
        scope.pop();
      }
    }
    else if (!currentScope) {
      // At the top level (not within any scope), count the whitespace if we've
      // encountered it. Otherwise if we've hit one of the combinators,
      // terminate here; otherwise if we've hit a non-colon character,
      // terminate here.
      if (/\s/.test(character)) {
        whitespace++;
      }
      else if ((character == ">" || character == "+" || character == "~") ||
               (whitespace > 0 && character != ":")) {
        break;
      }
    }

    // Zero out the whitespace count if we've entered a scope.
    if (scope.length > 0) {
      whitespace = 0;
    }

    // Increment the index by the size of the character. Note that for Unicode
    // composite characters (like emoji) this will be more than one.
    index += character.length;
  }

  return selector.length - index + whitespace;
}

/**
 * Qualifies a CSS selector with a qualifier, which may be another CSS selector
 * or an empty string. For example, given the selector "div.bar" and the
 * qualifier "#foo", this function returns "div#foo.bar".
 * @param {string} selector The selector to qualify.
 * @param {string} qualifier The qualifier with which to qualify the selector.
 * @returns {string} The qualified selector.
 * @package
 */
exports.qualifySelector = function qualifySelector(selector, qualifier) {
  let qualifiedSelector = "";

  let qualifierTargetSelectorIndex = findTargetSelectorIndex(qualifier);
  let [, qualifierType = ""] =
    /^([a-z][a-z-]*)?/i.exec(qualifier.substring(qualifierTargetSelectorIndex));

  for (let sub of splitSelector(selector)) {
    sub = sub.trim();

    qualifiedSelector += ", ";

    let index = findTargetSelectorIndex(sub);

    // Note that the first group in the regular expression is optional. If it
    // doesn't match (e.g. "#foo::nth-child(1)"), type will be an empty string.
    let [, type = "", rest] =
      /^([a-z][a-z-]*)?\*?(.*)/i.exec(sub.substring(index));

    if (type == qualifierType) {
      type = "";
    }

    // If the qualifier ends in a combinator (e.g. "body #foo>"), we put the
    // type and the rest of the selector after the qualifier
    // (e.g. "body #foo>div.bar"); otherwise (e.g. "body #foo") we merge the
    // type into the qualifier (e.g. "body div#foo.bar").
    if (/[\s>+~]$/.test(qualifier)) {
      qualifiedSelector += sub.substring(0, index) + qualifier + type + rest;
    }
    else {
      qualifiedSelector += sub.substring(0, index) + type + qualifier + rest;
    }
  }

  // Remove the initial comma and space.
  return qualifiedSelector.substring(2);
};


/***/ }),

/***/ "./core/lib/content/elemHideEmulation.js":
/*!***********************************************!*\
  !*** ./core/lib/content/elemHideEmulation.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-present eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

/** @module */



const {makeRegExpParameter, splitSelector,
       qualifySelector} = __webpack_require__(/*! ../common */ "./core/lib/common.js");
const {filterToRegExp} = __webpack_require__(/*! ../patterns */ "./core/lib/patterns.js");

const DEFAULT_MIN_INVOCATION_INTERVAL = 3000;
let minInvocationInterval = DEFAULT_MIN_INVOCATION_INTERVAL;
const DEFAULT_MAX_SYCHRONOUS_PROCESSING_TIME = 50;
let maxSynchronousProcessingTime = DEFAULT_MAX_SYCHRONOUS_PROCESSING_TIME;

const abpSelectorRegexp = /:(-abp-[\w-]+|has|has-text|xpath|not)\(/;

let testInfo = null;

function toCSSStyleDeclaration(value) {
  return Object.assign(document.createElement("test"), {style: value}).style;
}

/**
 * Enables test mode, which tracks additional metadata about the inner
 * workings for test purposes. This also allows overriding internal
 * configuration.
 *
 * @param {object} options
 * @param {number} options.minInvocationInterval Overrides how long
 *   must be waited between filter processing runs
 * @param {number} options.maxSynchronousProcessingTime Overrides how
 *   long the thread may spend processing filters before it must yield
 *   its thread
 */
exports.setTestMode = function setTestMode(options) {
  if (typeof options.minInvocationInterval !== "undefined") {
    minInvocationInterval = options.minInvocationInterval;
  }
  if (typeof options.maxSynchronousProcessingTime !== "undefined") {
    maxSynchronousProcessingTime = options.maxSynchronousProcessingTime;
  }

  testInfo = {
    lastProcessedElements: new Set(),
    failedAssertions: []
  };
};

exports.getTestInfo = function getTestInfo() {
  return testInfo;
};

exports.clearTestMode = function() {
  minInvocationInterval = DEFAULT_MIN_INVOCATION_INTERVAL;
  maxSynchronousProcessingTime = DEFAULT_MAX_SYCHRONOUS_PROCESSING_TIME;
  testInfo = null;
};

/**
 * Creates a new IdleDeadline.
 *
 * Note: This function is synchronous and does NOT request an idle
 * callback.
 *
 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline}.
 * @return {IdleDeadline}
 */
function newIdleDeadline() {
  let startTime = performance.now();
  return {
    didTimeout: false,
    timeRemaining() {
      let elapsed = performance.now() - startTime;
      let remaining = maxSynchronousProcessingTime - elapsed;
      return Math.max(0, remaining);
    }
  };
}

/**
 * Returns a promise that is resolved when the browser is next idle.
 *
 * This is intended to be used for long running tasks on the UI thread
 * to allow other UI events to process.
 *
 * @return {Promise.<IdleDeadline>}
 *    A promise that is fulfilled when you can continue processing
 */
function yieldThread() {
  return new Promise(resolve => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(resolve);
    }
    else {
      setTimeout(() => {
        resolve(newIdleDeadline());
      }, 0);
    }
  });
}


function getCachedPropertyValue(object, name, defaultValueFunc = () => {}) {
  let value = object[name];
  if (typeof value == "undefined") {
    Object.defineProperty(object, name, {value: value = defaultValueFunc()});
  }
  return value;
}

/**
 * Return position of node from parent.
 * @param {Node} node the node to find the position of.
 * @return {number} One-based index like for :nth-child(), or 0 on error.
 */
function positionInParent(node) {
  let index = 0;
  for (let child of node.parentNode.children) {
    if (child == node) {
      return index + 1;
    }

    index++;
  }

  return 0;
}

function makeSelector(node, selector = "") {
  if (node == null) {
    return null;
  }
  if (!node.parentElement) {
    let newSelector = ":root";
    if (selector) {
      newSelector += " > " + selector;
    }
    return newSelector;
  }
  let idx = positionInParent(node);
  if (idx > 0) {
    let newSelector = `${node.tagName}:nth-child(${idx})`;
    if (selector) {
      newSelector += " > " + selector;
    }
    return makeSelector(node.parentElement, newSelector);
  }

  return selector;
}

function parseSelectorContent(content, startIndex) {
  let parens = 1;
  let quote = null;
  let i = startIndex;
  for (; i < content.length; i++) {
    let c = content[i];
    if (c == "\\") {
      // Ignore escaped characters
      i++;
    }
    else if (quote) {
      if (c == quote) {
        quote = null;
      }
    }
    else if (c == "'" || c == '"') {
      quote = c;
    }
    else if (c == "(") {
      parens++;
    }
    else if (c == ")") {
      parens--;
      if (parens == 0) {
        break;
      }
    }
  }

  if (parens > 0) {
    return null;
  }
  return {text: content.substring(startIndex, i), end: i};
}

/**
 * Stringified style objects
 * @typedef {Object} StringifiedStyle
 * @property {string} style CSS style represented by a string.
 * @property {string[]} subSelectors selectors the CSS properties apply to.
 */

/**
 * Produce a string representation of the stylesheet entry.
 * @param {CSSStyleRule} rule the CSS style rule.
 * @return {StringifiedStyle} the stringified style.
 */
function stringifyStyle(rule) {
  let styles = [];
  for (let i = 0; i < rule.style.length; i++) {
    let property = rule.style.item(i);
    let value = rule.style.getPropertyValue(property);
    let priority = rule.style.getPropertyPriority(property);
    styles.push(`${property}: ${value}${priority ? " !" + priority : ""};`);
  }
  styles.sort();
  return {
    style: styles.join(" "),
    subSelectors: splitSelector(rule.selectorText)
  };
}

let scopeSupported = null;

function tryQuerySelector(subtree, selector, all) {
  let elements = null;
  try {
    elements = all ? subtree.querySelectorAll(selector) :
      subtree.querySelector(selector);
    scopeSupported = true;
  }
  catch (e) {
    // Edge doesn't support ":scope"
    scopeSupported = false;
  }
  return elements;
}

/**
 * Query selector.
 *
 * If it is relative, will try :scope.
 *
 * @param {Node} subtree the element to query selector
 * @param {string} selector the selector to query
 * @param {bool} [all=false] true to perform querySelectorAll()
 *
 * @returns {?(Node|NodeList)} result of the query. null in case of error.
 */
function scopedQuerySelector(subtree, selector, all) {
  if (selector[0] == ">") {
    selector = ":scope" + selector;
    if (scopeSupported) {
      return all ? subtree.querySelectorAll(selector) :
        subtree.querySelector(selector);
    }
    if (scopeSupported == null) {
      return tryQuerySelector(subtree, selector, all);
    }
    return null;
  }
  return all ? subtree.querySelectorAll(selector) :
    subtree.querySelector(selector);
}

function scopedQuerySelectorAll(subtree, selector) {
  return scopedQuerySelector(subtree, selector, true);
}

class PlainSelector {
  constructor(selector) {
    this._selector = selector;
    this.maybeDependsOnAttributes = /[#.:]|\[.+\]/.test(selector);
    this.maybeContainsSiblingCombinators = /[~+]/.test(selector);
  }

  /**
   * Generator function returning a pair of selector string and subtree.
   * @param {string} prefix the prefix for the selector.
   * @param {Node} subtree the subtree we work on.
   * @param {Node[]} [targets] the nodes we are interested in.
   */
  *getSelectors(prefix, subtree, targets) {
    yield [prefix + this._selector, subtree];
  }
}

const incompletePrefixRegexp = /[\s>+~]$/;

class NotSelector {
  constructor(selectors) {
    this._innerPattern = new Pattern(selectors);
  }

  get dependsOnStyles() {
    return this._innerPattern.dependsOnStyles;
  }

  get dependsOnCharacterData() {
    return this._innerPattern.dependsOnCharacterData;
  }

  get maybeDependsOnAttributes() {
    return this._innerPattern.maybeDependsOnAttributes;
  }

  *getSelectors(prefix, subtree, targets) {
    for (let element of this.getElements(prefix, subtree, targets)) {
      yield [makeSelector(element), element];
    }
  }

  /**
   * Generator function returning selected elements.
   * @param {string} prefix the prefix for the selector.
   * @param {Node} subtree the subtree we work on.
   * @param {Node[]} [targets] the nodes we are interested in.
   */
  *getElements(prefix, subtree, targets) {
    let actualPrefix = (!prefix || incompletePrefixRegexp.test(prefix)) ?
      prefix + "*" : prefix;
    let elements = scopedQuerySelectorAll(subtree, actualPrefix);
    if (elements) {
      for (let element of elements) {
        // If the element is neither an ancestor nor a descendant of one of the
        // targets, we can skip it.
        if (targets && !targets.some(target => element.contains(target) ||
                                               target.contains(element))) {
          yield null;
          continue;
        }

        if (testInfo) {
          testInfo.lastProcessedElements.add(element);
        }

        if (!this._innerPattern.matches(element, subtree)) {
          yield element;
        }

        yield null;
      }
    }
  }

  setStyles(styles) {
    this._innerPattern.setStyles(styles);
  }
}

class HasSelector {
  constructor(selectors) {
    this._innerPattern = new Pattern(selectors);
  }

  get dependsOnStyles() {
    return this._innerPattern.dependsOnStyles;
  }

  get dependsOnCharacterData() {
    return this._innerPattern.dependsOnCharacterData;
  }

  get maybeDependsOnAttributes() {
    return this._innerPattern.maybeDependsOnAttributes;
  }

  *getSelectors(prefix, subtree, targets) {
    for (let element of this.getElements(prefix, subtree, targets)) {
      yield [makeSelector(element), element];
    }
  }

  /**
   * Generator function returning selected elements.
   * @param {string} prefix the prefix for the selector.
   * @param {Node} subtree the subtree we work on.
   * @param {Node[]} [targets] the nodes we are interested in.
   */
  *getElements(prefix, subtree, targets) {
    let actualPrefix = (!prefix || incompletePrefixRegexp.test(prefix)) ?
      prefix + "*" : prefix;
    let elements = scopedQuerySelectorAll(subtree, actualPrefix);
    if (elements) {
      for (let element of elements) {
        // If the element is neither an ancestor nor a descendant of one of the
        // targets, we can skip it.
        if (targets && !targets.some(target => element.contains(target) ||
                                               target.contains(element))) {
          yield null;
          continue;
        }

        if (testInfo) {
          testInfo.lastProcessedElements.add(element);
        }

        for (let selector of this._innerPattern.evaluate(element, targets)) {
          if (selector == null) {
            yield null;
          }
          else if (scopedQuerySelector(element, selector)) {
            yield element;
          }
        }

        yield null;
      }
    }
  }

  setStyles(styles) {
    this._innerPattern.setStyles(styles);
  }
}

class XPathSelector {
  constructor(textContent) {
    this.dependsOnCharacterData = true;
    this.maybeDependsOnAttributes = true;

    let evaluator = new XPathEvaluator();
    this._expression = evaluator.createExpression(textContent, null);
  }

  *getSelectors(prefix, subtree, targets) {
    for (let element of this.getElements(prefix, subtree, targets)) {
      yield [makeSelector(element), element];
    }
  }

  *getElements(prefix, subtree, targets) {
    let {ORDERED_NODE_SNAPSHOT_TYPE: flag} = XPathResult;
    let elements = prefix ? scopedQuerySelectorAll(subtree, prefix) : [subtree];
    for (let parent of elements) {
      let result = this._expression.evaluate(parent, flag, null);
      for (let i = 0, {snapshotLength} = result; i < snapshotLength; i++) {
        yield result.snapshotItem(i);
      }
    }
  }
}

class ContainsSelector {
  constructor(textContent) {
    this.dependsOnCharacterData = true;

    this._regexp = makeRegExpParameter(textContent);
  }

  *getSelectors(prefix, subtree, targets) {
    for (let element of this.getElements(prefix, subtree, targets)) {
      yield [makeSelector(element), subtree];
    }
  }

  *getElements(prefix, subtree, targets) {
    let actualPrefix = (!prefix || incompletePrefixRegexp.test(prefix)) ?
      prefix + "*" : prefix;

    let elements = scopedQuerySelectorAll(subtree, actualPrefix);

    if (elements) {
      let lastRoot = null;
      for (let element of elements) {
        // For a filter like div:-abp-contains(Hello) and a subtree like
        // <div id="a"><div id="b"><div id="c">Hello</div></div></div>
        // we're only interested in div#a
        if (lastRoot && lastRoot.contains(element)) {
          yield null;
          continue;
        }

        lastRoot = element;

        if (targets && !targets.some(target => element.contains(target) ||
                                               target.contains(element))) {
          yield null;
          continue;
        }

        if (testInfo) {
          testInfo.lastProcessedElements.add(element);
        }

        if (this._regexp && this._regexp.test(element.textContent)) {
          yield element;
        }
        else {
          yield null;
        }
      }
    }
  }
}

class PropsSelector {
  constructor(propertyExpression) {
    this.dependsOnStyles = true;
    this.maybeDependsOnAttributes = true;

    let regexpString;
    if (propertyExpression.length >= 2 && propertyExpression[0] == "/" &&
        propertyExpression[propertyExpression.length - 1] == "/") {
      regexpString = propertyExpression.slice(1, -1);
    }
    else {
      regexpString = filterToRegExp(propertyExpression);
    }

    this._regexp = new RegExp(regexpString, "i");

    this._subSelectors = [];
  }

  *getSelectors(prefix, subtree, targets) {
    for (let subSelector of this._subSelectors) {
      if (subSelector.startsWith("*") &&
          !incompletePrefixRegexp.test(prefix)) {
        subSelector = subSelector.substring(1);
      }

      yield [qualifySelector(subSelector, prefix), subtree];
    }
  }

  setStyles(styles) {
    this._subSelectors = [];
    for (let style of styles) {
      if (this._regexp.test(style.style)) {
        for (let subSelector of style.subSelectors) {
          let idx = subSelector.lastIndexOf("::");
          if (idx != -1) {
            subSelector = subSelector.substring(0, idx);
          }

          this._subSelectors.push(subSelector);
        }
      }
    }
  }
}

class Pattern {
  constructor(selectors, text, remove = false, css = null) {
    this.selectors = selectors;
    this.text = text;
    this.remove = remove;
    this.css = css;
  }

  get dependsOnStyles() {
    return getCachedPropertyValue(
      this, "_dependsOnStyles", () => this.selectors.some(
        selector => selector.dependsOnStyles
      )
    );
  }

  get maybeDependsOnAttributes() {
    // Observe changes to attributes if either there's a plain selector that
    // looks like an ID selector, class selector, or attribute selector in one
    // of the patterns (e.g. "a[href='https://example.com/']")
    // or there's a properties selector nested inside a has selector
    // (e.g. "div:-abp-has(:-abp-properties(color: blue))")
    return getCachedPropertyValue(
      this, "_maybeDependsOnAttributes", () => this.selectors.some(
        selector => selector.maybeDependsOnAttributes ||
                    (selector instanceof HasSelector &&
                     selector.dependsOnStyles)
      )
    );
  }

  get dependsOnCharacterData() {
    // Observe changes to character data only if there's a contains selector in
    // one of the patterns.
    return getCachedPropertyValue(
      this, "_dependsOnCharacterData", () => this.selectors.some(
        selector => selector.dependsOnCharacterData
      )
    );
  }

  get maybeContainsSiblingCombinators() {
    return getCachedPropertyValue(
      this, "_maybeContainsSiblingCombinators", () => this.selectors.some(
        selector => selector.maybeContainsSiblingCombinators
      )
    );
  }

  matchesMutationTypes(mutationTypes) {
    let mutationTypeMatchMap = getCachedPropertyValue(
      this, "_mutationTypeMatchMap", () => new Map([
        // All types of DOM-dependent patterns are affected by mutations of
        // type "childList".
        ["childList", true],
        ["attributes", this.maybeDependsOnAttributes],
        ["characterData", this.dependsOnCharacterData]
      ])
    );

    for (let mutationType of mutationTypes) {
      if (mutationTypeMatchMap.get(mutationType)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generator function returning CSS selectors for all elements that
   * match the pattern.
   *
   * This allows transforming from selectors that may contain custom
   * :-abp- selectors to pure CSS selectors that can be used to select
   * elements.
   *
   * The selectors returned from this function may be invalidated by DOM
   * mutations.
   *
   * @param {Node} subtree the subtree we work on
   * @param {Node[]} [targets] the nodes we are interested in. May be
   * used to optimize search.
   */
  *evaluate(subtree, targets) {
    let selectors = this.selectors;
    function* evaluateInner(index, prefix, currentSubtree) {
      if (index >= selectors.length) {
        yield prefix;
        return;
      }
      for (let [selector, element] of selectors[index].getSelectors(
        prefix, currentSubtree, targets
      )) {
        if (selector == null) {
          yield null;
        }
        else {
          yield* evaluateInner(index + 1, selector, element);
        }
      }
      // Just in case the getSelectors() generator above had to run some heavy
      // document.querySelectorAll() call which didn't produce any results, make
      // sure there is at least one point where execution can pause.
      yield null;
    }
    yield* evaluateInner(0, "", subtree);
  }

  /**
   * Checks if a pattern matches a specific element
   * @param {Node} [target] the element we're interested in checking for
   * matches on.
   * @param {Node} subtree the subtree we work on
   * @return {bool}
   */
  matches(target, subtree) {
    let targetFilter = [target];
    if (this.maybeContainsSiblingCombinators) {
      targetFilter = null;
    }

    let selectorGenerator = this.evaluate(subtree, targetFilter);
    for (let selector of selectorGenerator) {
      if (selector && target.matches(selector)) {
        return true;
      }
    }
    return false;
  }

  setStyles(styles) {
    for (let selector of this.selectors) {
      if (selector.dependsOnStyles) {
        selector.setStyles(styles);
      }
    }
  }
}

function extractMutationTypes(mutations) {
  let types = new Set();

  for (let mutation of mutations) {
    types.add(mutation.type);

    // There are only 3 types of mutations: "attributes", "characterData", and
    // "childList".
    if (types.size == 3) {
      break;
    }
  }

  return types;
}

function extractMutationTargets(mutations) {
  if (!mutations) {
    return null;
  }

  let targets = new Set();

  for (let mutation of mutations) {
    if (mutation.type == "childList") {
      // When new nodes are added, we're interested in the added nodes rather
      // than the parent.
      for (let node of mutation.addedNodes) {
        targets.add(node);
      }
      if (mutation.removedNodes.length > 0) {
        targets.add(mutation.target);
      }
    }
    else {
      targets.add(mutation.target);
    }
  }

  return [...targets];
}

function filterPatterns(patterns, {stylesheets, mutations}) {
  if (!stylesheets && !mutations) {
    return patterns.slice();
  }

  let mutationTypes = mutations ? extractMutationTypes(mutations) : null;

  return patterns.filter(
    pattern => (stylesheets && pattern.dependsOnStyles) ||
               (mutations && pattern.matchesMutationTypes(mutationTypes))
  );
}

function shouldObserveAttributes(patterns) {
  return patterns.some(pattern => pattern.maybeDependsOnAttributes);
}

function shouldObserveCharacterData(patterns) {
  return patterns.some(pattern => pattern.dependsOnCharacterData);
}

function shouldObserveStyles(patterns) {
  return patterns.some(pattern => pattern.dependsOnStyles);
}

/**
 * @callback hideElemsFunc
 * @param {Node[]} elements Elements on the page that should be hidden
 * @param {string[]} elementFilters
 *   The filter text that caused the elements to be hidden
 */

/**
 * @callback unhideElemsFunc
 * @param {Node[]} elements Elements on the page that should be hidden
 */

/**
 * @callback removeElemsFunc
 * @param {Node[]} elements Elements on the page that should be removed
 * @param {string[]} elementFilters
 *   The filter text that caused the elements to be removed
 * removed from the DOM
 */

/**
 * @callback cssElemsFunc
 * @param {Node[]} elements Elements on the page that should
 * apply inline CSS rules
 * @param {string[]} cssPatterns The CSS patterns to be applied
 */


/**
 * Manages the front-end processing of element hiding emulation filters.
 */
exports.ElemHideEmulation = class ElemHideEmulation {
  /**
   * @param {module:content/elemHideEmulation~hideElemsFunc} hideElemsFunc
   *   A callback that should be provided to do the actual element hiding.
   * @param {module:content/elemHideEmulation~unhideElemsFunc} unhideElemsFunc
   *   A callback that should be provided to unhide previously hidden elements.
   * @param {module:content/elemHideEmulation~removeElemsFunc} removeElemsFunc
   *   A callback that should be provided to remove elements from the DOM.
   * @param {module:content/elemHideEmulation~cssElemsFunc} cssElemsFunc
   *   A callback that should be provided to apply inline CSS rules to elements
  */
  constructor(
    hideElemsFunc = () => {},
    unhideElemsFunc = () => {},
    removeElemsFunc = () => {},
    cssElemsFunc = () => {}
  ) {
    this._filteringInProgress = false;
    this._nextFilteringScheduled = false;
    this._lastInvocation = -minInvocationInterval;
    this._scheduledProcessing = null;

    this.document = document;
    this.hideElemsFunc = hideElemsFunc;
    this.unhideElemsFunc = unhideElemsFunc;
    this.removeElemsFunc = removeElemsFunc;
    this.cssElemsFunc = cssElemsFunc;
    this.observer = new MutationObserver(this.observe.bind(this));
    this.hiddenElements = new Map();
  }

  isSameOrigin(stylesheet) {
    try {
      return new URL(stylesheet.href).origin == this.document.location.origin;
    }
    catch (e) {
      // Invalid URL, assume that it is first-party.
      return true;
    }
  }

  /**
   * Parse the selector
   * @param {string} selector the selector to parse
   * @return {Array} selectors is an array of objects,
   * or null in case of errors.
   */
  parseSelector(selector) {
    if (selector.length == 0) {
      return [];
    }

    let match = abpSelectorRegexp.exec(selector);
    if (!match) {
      return [new PlainSelector(selector)];
    }

    let selectors = [];
    if (match.index > 0) {
      selectors.push(new PlainSelector(selector.substring(0, match.index)));
    }

    let startIndex = match.index + match[0].length;
    let content = parseSelectorContent(selector, startIndex);
    if (!content) {
      console.warn(new SyntaxError("Failed to parse Adblock Plus " +
                                   `selector ${selector} ` +
                                   "due to unmatched parentheses."));
      return null;
    }

    if (match[1] == "-abp-properties") {
      selectors.push(new PropsSelector(content.text));
    }
    else if (match[1] == "-abp-has" || match[1] == "has") {
      let hasSelectors = this.parseSelector(content.text);
      if (hasSelectors == null) {
        return null;
      }
      selectors.push(new HasSelector(hasSelectors));
    }
    else if (match[1] == "-abp-contains" || match[1] == "has-text") {
      selectors.push(new ContainsSelector(content.text));
    }
    else if (match[1] === "xpath") {
      try {
        selectors.push(new XPathSelector(content.text));
      }
      catch ({message}) {
        console.warn(
          new SyntaxError(
            "Failed to parse Adblock Plus " +
            `selector ${selector}, invalid ` +
            `xpath: ${content.text} ` +
            `error: ${message}.`
          )
        );

        return null;
      }
    }
    else if (match[1] == "not") {
      let notSelectors = this.parseSelector(content.text);
      if (notSelectors == null) {
        return null;
      }

      // if all of the inner selectors are PlainSelectors, then we
      // don't actually need to use our selector at all. We're better
      // off delegating to the browser :not implementation.
      if (notSelectors.every(s => s instanceof PlainSelector)) {
        selectors.push(new PlainSelector(`:not(${content.text})`));
      }
      else {
        selectors.push(new NotSelector(notSelectors));
      }
    }
    else {
      // this is an error, can't parse selector.
      console.warn(new SyntaxError("Failed to parse Adblock Plus " +
                                   `selector ${selector}, invalid ` +
                                   `pseudo-class :${match[1]}().`));
      return null;
    }

    let suffix = this.parseSelector(selector.substring(content.end + 1));
    if (suffix == null) {
      return null;
    }

    selectors.push(...suffix);

    if (selectors.length == 1 && selectors[0] instanceof ContainsSelector) {
      console.warn(new SyntaxError("Failed to parse Adblock Plus " +
                                   `selector ${selector}, can't ` +
                                   "have a lonely :-abp-contains()."));
      return null;
    }
    return selectors;
  }

  /**
   * Reads the rules out of CSS stylesheets
   * @param {CSSStyleSheet[]} [stylesheets] The list of stylesheets to
   * read.
   * @return {CSSStyleRule[]}
   */
  _readCssRules(stylesheets) {
    let cssStyles = [];

    for (let stylesheet of stylesheets || []) {
      // Explicitly ignore third-party stylesheets to ensure consistent behavior
      // between Firefox and Chrome.
      if (!this.isSameOrigin(stylesheet)) {
        continue;
      }

      let rules;
      try {
        rules = stylesheet.cssRules;
      }
      catch (e) {
        // On Firefox, there is a chance that an InvalidAccessError
        // get thrown when accessing cssRules. Just skip the stylesheet
        // in that case.
        // See https://searchfox.org/mozilla-central/rev/f65d7528e34ef1a7665b4a1a7b7cdb1388fcd3aa/layout/style/StyleSheet.cpp#699
        continue;
      }

      if (!rules) {
        continue;
      }

      for (let rule of rules) {
        if (rule.type != rule.STYLE_RULE) {
          continue;
        }

        cssStyles.push(stringifyStyle(rule));
      }
    }
    return cssStyles;
  }

  /**
   * Processes the current document and applies all rules to it.
   * @param {CSSStyleSheet[]} [stylesheets]
   *    The list of new stylesheets that have been added to the document and
   *    made reprocessing necessary. This parameter shouldn't be passed in for
   *    the initial processing, all of document's stylesheets will be considered
   *    then and all rules, including the ones not dependent on styles.
   * @param {MutationRecord[]} [mutations]
   *    The list of DOM mutations that have been applied to the document and
   *    made reprocessing necessary. This parameter shouldn't be passed in for
   *    the initial processing, the entire document will be considered
   *    then and all rules, including the ones not dependent on the DOM.
   * @return {Promise}
   *    A promise that is fulfilled once all filtering is completed
   */
  async _addSelectors(stylesheets, mutations) {
    if (testInfo) {
      testInfo.lastProcessedElements.clear();
    }

    let deadline = newIdleDeadline();

    if (shouldObserveStyles(this.patterns)) {
      this._refreshPatternStyles();
    }

    let patternsToCheck = filterPatterns(
      this.patterns, {stylesheets, mutations}
    );

    let targets = extractMutationTargets(mutations);

    const elementsToHide = [];
    const elementsToHideFilters = [];
    const elementsToRemoveFilters = [];
    const elementsToRemove = [];
    const elementsToApplyCSS = [];
    const cssPatterns = [];
    let elementsToUnhide = new Set(this.hiddenElements.keys());
    for (let pattern of patternsToCheck) {
      let evaluationTargets = targets;

      // If the pattern appears to contain any sibling combinators, we can't
      // easily optimize based on the mutation targets. Since this is a
      // special case, skip the optimization. By setting it to null here we
      // make sure we process the entire DOM.
      if (pattern.maybeContainsSiblingCombinators) {
        evaluationTargets = null;
      }

      let generator = pattern.evaluate(this.document, evaluationTargets);
      for (let selector of generator) {
        if (selector != null) {
          for (let element of this.document.querySelectorAll(selector)) {
            if (pattern.remove) {
              elementsToRemove.push(element);
              elementsToRemoveFilters.push(pattern.text);
              elementsToUnhide.delete(element);
            }
            else if (pattern.css) {
              elementsToApplyCSS.push(element);
              cssPatterns.push(pattern);
            }
            else if (!this.hiddenElements.has(element)) {
              elementsToHide.push(element);
              elementsToHideFilters.push(pattern.text);
            }
            else {
              elementsToUnhide.delete(element);
            }
          }
        }

        if (deadline.timeRemaining() <= 0) {
          deadline = await yieldThread();
        }
      }
    }
    this._removeElems(elementsToRemove, elementsToRemoveFilters);
    this._applyCSSToElems(elementsToApplyCSS, cssPatterns);
    this._hideElems(elementsToHide, elementsToHideFilters);

    // The search for elements to hide it optimized to find new things
    // to hide quickly, by not checking all patterns and not checking
    // the full DOM. That's why we need to do a more thorough check
    // for each remaining element that might need to be unhidden,
    // checking all patterns.
    for (let elem of elementsToUnhide) {
      if (!elem.isConnected) {
        // elements that are no longer in the DOM should be unhidden
        // in case they're ever readded, and then forgotten about so
        // we don't cause a memory leak.
        continue;
      }
      let matchesAny = this.patterns.some(pattern => pattern.matches(
        elem, this.document
      ));
      if (matchesAny) {
        elementsToUnhide.delete(elem);
      }

      if (deadline.timeRemaining() <= 0) {
        deadline = await yieldThread();
      }
    }
    this._unhideElems(Array.from(elementsToUnhide));
  }

  _removeElems(elementsToRemove, elementFilters) {
    if (elementsToRemove.length > 0) {
      this.removeElemsFunc(elementsToRemove, elementFilters);
      for (let elem of elementsToRemove) {
        // they're not hidden anymore (if they ever were), they're
        // removed. There's no unhiding these ones!
        this.hiddenElements.delete(elem);
      }
    }
  }

  _applyCSSToElems(elements, cssPatterns) {
    if (elements.length > 0) {
      this.cssElemsFunc(elements, cssPatterns);
    }
  }

  _hideElems(elementsToHide, elementFilters) {
    if (elementsToHide.length > 0) {
      this.hideElemsFunc(elementsToHide, elementFilters);
      for (let i = 0; i < elementsToHide.length; i++) {
        this.hiddenElements.set(elementsToHide[i], elementFilters[i]);
      }
    }
  }

  _unhideElems(elementsToUnhide) {
    if (elementsToUnhide.length > 0) {
      this.unhideElemsFunc(elementsToUnhide);
      for (let elem of elementsToUnhide) {
        this.hiddenElements.delete(elem);
      }
    }
  }

  /**
   * Performed any scheduled processing.
   *
   * This function is asyncronous, and should not be run multiple
   * times in parallel. The flag `_filteringInProgress` is set and
   * unset so you can check if it's already running.
   * @return {Promise}
   *  A promise that is fulfilled once all filtering is completed
   */
  async _processFiltering() {
    if (this._filteringInProgress) {
      console.warn("ElemHideEmulation scheduling error: " +
                   "Tried to process filtering in parallel.");
      if (testInfo) {
        testInfo.failedAssertions.push(
          "Tried to process filtering in parallel"
        );
      }

      return;
    }

    let params = this._scheduledProcessing || {};
    this._scheduledProcessing = null;
    this._filteringInProgress = true;
    this._nextFilteringScheduled = false;
    await this._addSelectors(
      params.stylesheets,
      params.mutations
    );
    this._lastInvocation = performance.now();
    this._filteringInProgress = false;
    if (this._scheduledProcessing) {
      this._scheduleNextFiltering();
    }
  }

  /**
   * Appends new changes to the list of filters for the next time
   * filtering is run.
   * @param {CSSStyleSheet[]} [stylesheets]
   *    new stylesheets to be processed. This parameter should be omitted
   *    for full reprocessing.
   * @param {MutationRecord[]} [mutations]
   *    new DOM mutations to be processed. This parameter should be omitted
   *    for full reprocessing.
   */
  _appendScheduledProcessing(stylesheets, mutations) {
    if (!this._scheduledProcessing) {
      // There isn't anything scheduled yet. Make the schedule.
      this._scheduledProcessing = {stylesheets, mutations};
    }
    else if (!stylesheets && !mutations) {
      // The new request was to reprocess everything, and so any
      // previous filters are irrelevant.
      this._scheduledProcessing = {};
    }
    else if (this._scheduledProcessing.stylesheets ||
             this._scheduledProcessing.mutations) {
      // The previous filters are not to filter everything, so the new
      // parameters matter. Push them onto the appropriate lists.
      if (stylesheets) {
        if (!this._scheduledProcessing.stylesheets) {
          this._scheduledProcessing.stylesheets = [];
        }
        this._scheduledProcessing.stylesheets.push(...stylesheets);
      }
      if (mutations) {
        if (!this._scheduledProcessing.mutations) {
          this._scheduledProcessing.mutations = [];
        }
        this._scheduledProcessing.mutations.push(...mutations);
      }
    }
    else {
      // this._scheduledProcessing is already going to recheck
      // everything, so no need to do anything here.
    }
  }

  /**
   * Schedule filtering to be processed in the future, or start
   * processing immediately.
   *
   * If processing is already scheduled, this does nothing.
   */
  _scheduleNextFiltering() {
    if (this._nextFilteringScheduled || this._filteringInProgress) {
      // The next one has already been scheduled. Our new events are
      // on the queue, so nothing more to do.
      return;
    }

    if (this.document.readyState === "loading") {
      // Document isn't fully loaded yet, so schedule our first
      // filtering as soon as that's done.
      this.document.addEventListener(
        "DOMContentLoaded",
        () => this._processFiltering(),
        {once: true}
      );
      this._nextFilteringScheduled = true;
    }
    else if (performance.now() - this._lastInvocation <
             minInvocationInterval) {
      // It hasn't been long enough since our last filter. Set the
      // timeout for when it's time for that.
      setTimeout(
        () => this._processFiltering(),
        minInvocationInterval - (performance.now() - this._lastInvocation)
      );
      this._nextFilteringScheduled = true;
    }
    else {
      // We can actually just start filtering immediately!
      this._processFiltering();
    }
  }

  /**
   * Re-run filtering either immediately or queued.
   * @param {CSSStyleSheet[]} [stylesheets]
   *    new stylesheets to be processed. This parameter should be omitted
   *    for full reprocessing.
   * @param {MutationRecord[]} [mutations]
   *    new DOM mutations to be processed. This parameter should be omitted
   *    for full reprocessing.
   */
  queueFiltering(stylesheets, mutations) {
    this._appendScheduledProcessing(stylesheets, mutations);
    this._scheduleNextFiltering();
  }

  _refreshPatternStyles(stylesheet) {
    let allCssRules = this._readCssRules(this.document.styleSheets);
    for (let pattern of this.patterns) {
      pattern.setStyles(allCssRules);
    }
  }

  onLoad(event) {
    let stylesheet = event.target.sheet;
    if (stylesheet) {
      this.queueFiltering([stylesheet]);
    }
  }

  observe(mutations) {
    if (testInfo) {
      // In test mode, filter out any mutations likely done by us
      // (i.e. style="display: none !important"). This makes it easier to
      // observe how the code responds to DOM mutations.
      mutations = mutations.filter(
        ({type, attributeName, target: {style: newValue}, oldValue}) =>
          !(type == "attributes" && attributeName == "style" &&
            newValue.display == "none" &&
            toCSSStyleDeclaration(oldValue).display != "none")
      );

      if (mutations.length == 0) {
        return;
      }
    }

    this.queueFiltering(null, mutations);
  }

  apply(patterns) {
    if (this.patterns) {
      let removedPatterns = [];
      for (let oldPattern of this.patterns) {
        if (!patterns.find(newPattern => newPattern.text == oldPattern.text)) {
          removedPatterns.push(oldPattern);
        }
      }
      let elementsToUnhide = [];
      for (let pattern of removedPatterns) {
        for (let [element, filter] of this.hiddenElements) {
          if (filter == pattern.text) {
            elementsToUnhide.push(element);
          }
        }
      }
      if (elementsToUnhide.length > 0) {
        this._unhideElems(elementsToUnhide);
      }
    }

    this.patterns = [];
    for (let pattern of patterns) {
      let selectors = this.parseSelector(pattern.selector);
      if (selectors != null && selectors.length > 0) {
        this.patterns.push(
          new Pattern(selectors, pattern.text, pattern.remove, pattern.css)
        );
      }
    }

    if (this.patterns.length > 0) {
      this.queueFiltering();

      let attributes = shouldObserveAttributes(this.patterns);
      this.observer.observe(
        this.document,
        {
          childList: true,
          attributes,
          attributeOldValue: attributes && !!testInfo,
          characterData: shouldObserveCharacterData(this.patterns),
          subtree: true
        }
      );
      if (shouldObserveStyles(this.patterns)) {
        let onLoad = this.onLoad.bind(this);
        if (this.document.readyState === "loading") {
          this.document.addEventListener("DOMContentLoaded", onLoad, true);
        }
        this.document.addEventListener("load", onLoad, true);
      }
    }
  }

  disconnect() {
    this.observer.disconnect();
    this._unhideElems(Array.from(this.hiddenElements.keys()));
  }
};


/***/ }),

/***/ "./core/lib/patterns.js":
/*!******************************!*\
  !*** ./core/lib/patterns.js ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-present eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

/** @module */



/**
 * The maximum number of patterns that
 * `{@link module:patterns.compilePatterns compilePatterns()}` will compile
 * into regular expressions.
 * @type {number}
 */
const COMPILE_PATTERNS_MAX = 100;

/**
 * Regular expression used to match the `^` suffix in an otherwise literal
 * pattern.
 * @type {RegExp}
 */
let separatorRegExp = /[\x00-\x24\x26-\x2C\x2F\x3A-\x40\x5B-\x5E\x60\x7B-\x7F]/;

let filterToRegExp =
/**
 * Converts filter text into regular expression string
 * @param {string} text as in Filter()
 * @return {string} regular expression representation of filter text
 * @package
 */
exports.filterToRegExp = function filterToRegExp(text) {
  // remove multiple wildcards
  text = text.replace(/\*+/g, "*");

  // remove leading wildcard
  if (text[0] == "*") {
    text = text.substring(1);
  }

  // remove trailing wildcard
  if (text[text.length - 1] == "*") {
    text = text.substring(0, text.length - 1);
  }

  return text
    // remove anchors following separator placeholder
    .replace(/\^\|$/, "^")
    // escape special symbols
    .replace(/\W/g, "\\$&")
    // replace wildcards by .*
    .replace(/\\\*/g, ".*")
    // process separator placeholders (all ANSI characters but alphanumeric
    // characters and _%.-)
    .replace(/\\\^/g, `(?:${separatorRegExp.source}|$)`)
    // process extended anchor at expression start
    .replace(/^\\\|\\\|/, "^[\\w\\-]+:\\/+(?:[^\\/]+\\.)?")
    // process anchor at expression start
    .replace(/^\\\|/, "^")
    // process anchor at expression end
    .replace(/\\\|$/, "$");
};

/**
 * Regular expression used to match the `||` prefix in an otherwise literal
 * pattern.
 * @type {RegExp}
 */
let extendedAnchorRegExp = new RegExp(filterToRegExp("||") + "$");

/**
 * Regular expression for matching a keyword in a filter.
 * @type {RegExp}
 */
let keywordRegExp = /[^a-z0-9%*][a-z0-9%]{2,}(?=[^a-z0-9%*])/;

/**
 * Regular expression for matching all keywords in a filter.
 * @type {RegExp}
 */
let allKeywordsRegExp = new RegExp(keywordRegExp, "g");

/**
 * A `CompiledPatterns` object represents the compiled version of multiple URL
 * request patterns. It is returned by
 * `{@link module:patterns.compilePatterns compilePatterns()}`.
 */
class CompiledPatterns {
  /**
   * Creates an object with the given regular expressions for case-sensitive
   * and case-insensitive matching respectively.
   * @param {?RegExp} [caseSensitive]
   * @param {?RegExp} [caseInsensitive]
   * @private
   */
  constructor(caseSensitive, caseInsensitive) {
    this._caseSensitive = caseSensitive;
    this._caseInsensitive = caseInsensitive;
  }

  /**
   * Tests whether the given URL request matches the patterns used to create
   * this object.
   * @param {module:url.URLRequest} request
   * @returns {boolean}
   */
  test(request) {
    return ((this._caseSensitive &&
             this._caseSensitive.test(request.href)) ||
            (this._caseInsensitive &&
             this._caseInsensitive.test(request.lowerCaseHref)));
  }
}

/**
 * Compiles patterns from the given filters into a single
 * `{@link module:patterns~CompiledPatterns CompiledPatterns}` object.
 *
 * @param {module:filterClasses.URLFilter|
 *         Set.<module:filterClasses.URLFilter>} filters
 *   The filters. If the number of filters exceeds
 *   `{@link module:patterns~COMPILE_PATTERNS_MAX COMPILE_PATTERNS_MAX}`, the
 *   function returns `null`.
 *
 * @returns {?module:patterns~CompiledPatterns}
 *
 * @package
 */
exports.compilePatterns = function compilePatterns(filters) {
  let list = Array.isArray(filters) ? filters : [filters];

  // If the number of filters is too large, it may choke especially on low-end
  // platforms. As a precaution, we refuse to compile. Ideally we would check
  // the length of the regular expression source rather than the number of
  // filters, but this is far more straightforward and practical.
  if (list.length > COMPILE_PATTERNS_MAX) {
    return null;
  }

  let caseSensitive = "";
  let caseInsensitive = "";

  for (let filter of filters) {
    let source = filter.urlPattern.regexpSource;

    if (filter.matchCase) {
      caseSensitive += source + "|";
    }
    else {
      caseInsensitive += source + "|";
    }
  }

  let caseSensitiveRegExp = null;
  let caseInsensitiveRegExp = null;

  try {
    if (caseSensitive) {
      caseSensitiveRegExp = new RegExp(caseSensitive.slice(0, -1));
    }

    if (caseInsensitive) {
      caseInsensitiveRegExp = new RegExp(caseInsensitive.slice(0, -1));
    }
  }
  catch (error) {
    // It is possible in theory for the regular expression to be too large
    // despite COMPILE_PATTERNS_MAX
    return null;
  }

  return new CompiledPatterns(caseSensitiveRegExp, caseInsensitiveRegExp);
};

/**
 * Patterns for matching against URLs.
 *
 * Internally, this may be a RegExp or match directly against the
 * pattern for simple literal patterns.
 */
exports.Pattern = class Pattern {
  /**
   * @param {string} pattern pattern that requests URLs should be
   * matched against in filter text notation
   * @param {bool} matchCase `true` if comparisons must be case
   * sensitive
   */
  constructor(pattern, matchCase) {
    this.matchCase = matchCase || false;

    if (!this.matchCase) {
      pattern = pattern.toLowerCase();
    }

    if (pattern.length >= 2 &&
        pattern[0] == "/" &&
        pattern[pattern.length - 1] == "/") {
      // The filter is a regular expression - convert it immediately to
      // catch syntax errors
      pattern = pattern.substring(1, pattern.length - 1);
      this._regexp = new RegExp(pattern);
    }
    else {
      // Patterns like /foo/bar/* exist so that they are not treated as regular
      // expressions. We drop any superfluous wildcards here so our
      // optimizations can kick in.
      pattern = pattern.replace(/^\*+/, "").replace(/\*+$/, "");

      // No need to convert this filter to regular expression yet, do it on
      // demand
      this.pattern = pattern;
    }
  }

  /**
   * Checks whether the pattern is a string of literal characters with
   * no wildcards or any other special characters.
   *
   * If the pattern is prefixed with a `||` or suffixed with a `^` but otherwise
   * contains no special characters, it is still considered to be a literal
   * pattern.
   *
   * @returns {boolean}
   */
  isLiteralPattern() {
    return typeof this.pattern !== "undefined" &&
      !/[*^|]/.test(this.pattern.replace(/^\|{1,2}/, "").replace(/[|^]$/, ""));
  }

  /**
   * Regular expression to be used when testing against this pattern.
   *
   * null if the pattern is matched without using regular expressions.
   * @type {RegExp}
   */
  get regexp() {
    if (typeof this._regexp == "undefined") {
      this._regexp = this.isLiteralPattern() ?
        null : new RegExp(filterToRegExp(this.pattern));
    }
    return this._regexp;
  }

  /**
   * Pattern in regular expression notation. This will have a value
   * even if `regexp` returns null.
   * @type {string}
   */
  get regexpSource() {
    return this._regexp ? this._regexp.source : filterToRegExp(this.pattern);
  }

  /**
   * Checks whether the given URL request matches this filter's pattern.
   * @param {module:url.URLRequest} request The URL request to check.
   * @returns {boolean} `true` if the URL request matches.
   */
  matchesLocation(request) {
    let location = this.matchCase ? request.href : request.lowerCaseHref;
    let regexp = this.regexp;
    if (regexp) {
      return regexp.test(location);
    }

    let pattern = this.pattern;
    let startsWithAnchor = pattern[0] == "|";
    let startsWithExtendedAnchor = startsWithAnchor && pattern[1] == "|";
    let endsWithSeparator = pattern[pattern.length - 1] == "^";
    let endsWithAnchor = !endsWithSeparator &&
        pattern[pattern.length - 1] == "|";

    if (startsWithExtendedAnchor) {
      pattern = pattern.substr(2);
    }
    else if (startsWithAnchor) {
      pattern = pattern.substr(1);
    }

    if (endsWithSeparator || endsWithAnchor) {
      pattern = pattern.slice(0, -1);
    }

    let index = location.indexOf(pattern);

    while (index != -1) {
      // The "||" prefix requires that the text that follows does not start
      // with a forward slash.
      if ((startsWithExtendedAnchor ?
           location[index] != "/" &&
           extendedAnchorRegExp.test(location.substring(0, index)) :
           startsWithAnchor ?
           index == 0 :
           true) &&
          (endsWithSeparator ?
           !location[index + pattern.length] ||
           separatorRegExp.test(location[index + pattern.length]) :
           endsWithAnchor ?
           index == location.length - pattern.length :
           true)) {
        return true;
      }

      if (pattern == "") {
        return true;
      }

      index = location.indexOf(pattern, index + 1);
    }

    return false;
  }

  /**
   * Checks whether the pattern has keywords
   * @returns {boolean}
   */
  hasKeywords() {
    return this.pattern && keywordRegExp.test(this.pattern);
  }

  /**
   * Finds all keywords that could be associated with this pattern
   * @returns {string[]}
   */
  keywordCandidates() {
    if (!this.pattern) {
      return null;
    }
    return this.pattern.toLowerCase().match(allKeywordsRegExp);
  }
};


/***/ }),

/***/ "./node_modules/webextension-polyfill/dist/browser-polyfill.js":
/*!*********************************************************************!*\
  !*** ./node_modules/webextension-polyfill/dist/browser-polyfill.js ***!
  \*********************************************************************/
/***/ (function(module, exports) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (global, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [module], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
  } else { var mod; }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (module) {
  /* webextension-polyfill - v0.8.0 - Tue Apr 20 2021 11:27:38 */

  /* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */

  /* vim: set sts=2 sw=2 et tw=80: */

  /* This Source Code Form is subject to the terms of the Mozilla Public
   * License, v. 2.0. If a copy of the MPL was not distributed with this
   * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
  "use strict";

  if (typeof browser === "undefined" || Object.getPrototypeOf(browser) !== Object.prototype) {
    const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received.";
    const SEND_RESPONSE_DEPRECATION_WARNING = "Returning a Promise is the preferred way to send a reply from an onMessage/onMessageExternal listener, as the sendResponse will be removed from the specs (See https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage)"; // Wrapping the bulk of this polyfill in a one-time-use function is a minor
    // optimization for Firefox. Since Spidermonkey does not fully parse the
    // contents of a function until the first time it's called, and since it will
    // never actually need to be called, this allows the polyfill to be included
    // in Firefox nearly for free.

    const wrapAPIs = extensionAPIs => {
      // NOTE: apiMetadata is associated to the content of the api-metadata.json file
      // at build time by replacing the following "include" with the content of the
      // JSON file.
      const apiMetadata = {
        "alarms": {
          "clear": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "clearAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "get": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "bookmarks": {
          "create": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "get": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getChildren": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getRecent": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getSubTree": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getTree": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "move": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeTree": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "search": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "update": {
            "minArgs": 2,
            "maxArgs": 2
          }
        },
        "browserAction": {
          "disable": {
            "minArgs": 0,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "enable": {
            "minArgs": 0,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "getBadgeBackgroundColor": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getBadgeText": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getPopup": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getTitle": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "openPopup": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "setBadgeBackgroundColor": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setBadgeText": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setIcon": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "setPopup": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setTitle": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          }
        },
        "browsingData": {
          "remove": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "removeCache": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeCookies": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeDownloads": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeFormData": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeHistory": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeLocalStorage": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removePasswords": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removePluginData": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "settings": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "commands": {
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "contextMenus": {
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "update": {
            "minArgs": 2,
            "maxArgs": 2
          }
        },
        "cookies": {
          "get": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAll": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAllCookieStores": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "set": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "devtools": {
          "inspectedWindow": {
            "eval": {
              "minArgs": 1,
              "maxArgs": 2,
              "singleCallbackArg": false
            }
          },
          "panels": {
            "create": {
              "minArgs": 3,
              "maxArgs": 3,
              "singleCallbackArg": true
            },
            "elements": {
              "createSidebarPane": {
                "minArgs": 1,
                "maxArgs": 1
              }
            }
          }
        },
        "downloads": {
          "cancel": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "download": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "erase": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getFileIcon": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "open": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "pause": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeFile": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "resume": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "search": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "show": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          }
        },
        "extension": {
          "isAllowedFileSchemeAccess": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "isAllowedIncognitoAccess": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "history": {
          "addUrl": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "deleteAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "deleteRange": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "deleteUrl": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getVisits": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "search": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "i18n": {
          "detectLanguage": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAcceptLanguages": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "identity": {
          "launchWebAuthFlow": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "idle": {
          "queryState": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "management": {
          "get": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "getSelf": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "setEnabled": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "uninstallSelf": {
            "minArgs": 0,
            "maxArgs": 1
          }
        },
        "notifications": {
          "clear": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "create": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "getPermissionLevel": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "update": {
            "minArgs": 2,
            "maxArgs": 2
          }
        },
        "pageAction": {
          "getPopup": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getTitle": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "hide": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setIcon": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "setPopup": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "setTitle": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          },
          "show": {
            "minArgs": 1,
            "maxArgs": 1,
            "fallbackToNoCallback": true
          }
        },
        "permissions": {
          "contains": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "request": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "runtime": {
          "getBackgroundPage": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "getPlatformInfo": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "openOptionsPage": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "requestUpdateCheck": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "sendMessage": {
            "minArgs": 1,
            "maxArgs": 3
          },
          "sendNativeMessage": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "setUninstallURL": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "sessions": {
          "getDevices": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getRecentlyClosed": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "restore": {
            "minArgs": 0,
            "maxArgs": 1
          }
        },
        "storage": {
          "local": {
            "clear": {
              "minArgs": 0,
              "maxArgs": 0
            },
            "get": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "getBytesInUse": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "remove": {
              "minArgs": 1,
              "maxArgs": 1
            },
            "set": {
              "minArgs": 1,
              "maxArgs": 1
            }
          },
          "managed": {
            "get": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "getBytesInUse": {
              "minArgs": 0,
              "maxArgs": 1
            }
          },
          "sync": {
            "clear": {
              "minArgs": 0,
              "maxArgs": 0
            },
            "get": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "getBytesInUse": {
              "minArgs": 0,
              "maxArgs": 1
            },
            "remove": {
              "minArgs": 1,
              "maxArgs": 1
            },
            "set": {
              "minArgs": 1,
              "maxArgs": 1
            }
          }
        },
        "tabs": {
          "captureVisibleTab": {
            "minArgs": 0,
            "maxArgs": 2
          },
          "create": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "detectLanguage": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "discard": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "duplicate": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "executeScript": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "get": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getCurrent": {
            "minArgs": 0,
            "maxArgs": 0
          },
          "getZoom": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getZoomSettings": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "goBack": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "goForward": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "highlight": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "insertCSS": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "move": {
            "minArgs": 2,
            "maxArgs": 2
          },
          "query": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "reload": {
            "minArgs": 0,
            "maxArgs": 2
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "removeCSS": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "sendMessage": {
            "minArgs": 2,
            "maxArgs": 3
          },
          "setZoom": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "setZoomSettings": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "update": {
            "minArgs": 1,
            "maxArgs": 2
          }
        },
        "topSites": {
          "get": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "webNavigation": {
          "getAllFrames": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "getFrame": {
            "minArgs": 1,
            "maxArgs": 1
          }
        },
        "webRequest": {
          "handlerBehaviorChanged": {
            "minArgs": 0,
            "maxArgs": 0
          }
        },
        "windows": {
          "create": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "get": {
            "minArgs": 1,
            "maxArgs": 2
          },
          "getAll": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getCurrent": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "getLastFocused": {
            "minArgs": 0,
            "maxArgs": 1
          },
          "remove": {
            "minArgs": 1,
            "maxArgs": 1
          },
          "update": {
            "minArgs": 2,
            "maxArgs": 2
          }
        }
      };

      if (Object.keys(apiMetadata).length === 0) {
        throw new Error("api-metadata.json has not been included in browser-polyfill");
      }
      /**
       * A WeakMap subclass which creates and stores a value for any key which does
       * not exist when accessed, but behaves exactly as an ordinary WeakMap
       * otherwise.
       *
       * @param {function} createItem
       *        A function which will be called in order to create the value for any
       *        key which does not exist, the first time it is accessed. The
       *        function receives, as its only argument, the key being created.
       */


      class DefaultWeakMap extends WeakMap {
        constructor(createItem, items = undefined) {
          super(items);
          this.createItem = createItem;
        }

        get(key) {
          if (!this.has(key)) {
            this.set(key, this.createItem(key));
          }

          return super.get(key);
        }

      }
      /**
       * Returns true if the given object is an object with a `then` method, and can
       * therefore be assumed to behave as a Promise.
       *
       * @param {*} value The value to test.
       * @returns {boolean} True if the value is thenable.
       */


      const isThenable = value => {
        return value && typeof value === "object" && typeof value.then === "function";
      };
      /**
       * Creates and returns a function which, when called, will resolve or reject
       * the given promise based on how it is called:
       *
       * - If, when called, `chrome.runtime.lastError` contains a non-null object,
       *   the promise is rejected with that value.
       * - If the function is called with exactly one argument, the promise is
       *   resolved to that value.
       * - Otherwise, the promise is resolved to an array containing all of the
       *   function's arguments.
       *
       * @param {object} promise
       *        An object containing the resolution and rejection functions of a
       *        promise.
       * @param {function} promise.resolve
       *        The promise's resolution function.
       * @param {function} promise.reject
       *        The promise's rejection function.
       * @param {object} metadata
       *        Metadata about the wrapped method which has created the callback.
       * @param {boolean} metadata.singleCallbackArg
       *        Whether or not the promise is resolved with only the first
       *        argument of the callback, alternatively an array of all the
       *        callback arguments is resolved. By default, if the callback
       *        function is invoked with only a single argument, that will be
       *        resolved to the promise, while all arguments will be resolved as
       *        an array if multiple are given.
       *
       * @returns {function}
       *        The generated callback function.
       */


      const makeCallback = (promise, metadata) => {
        return (...callbackArgs) => {
          if (extensionAPIs.runtime.lastError) {
            promise.reject(new Error(extensionAPIs.runtime.lastError.message));
          } else if (metadata.singleCallbackArg || callbackArgs.length <= 1 && metadata.singleCallbackArg !== false) {
            promise.resolve(callbackArgs[0]);
          } else {
            promise.resolve(callbackArgs);
          }
        };
      };

      const pluralizeArguments = numArgs => numArgs == 1 ? "argument" : "arguments";
      /**
       * Creates a wrapper function for a method with the given name and metadata.
       *
       * @param {string} name
       *        The name of the method which is being wrapped.
       * @param {object} metadata
       *        Metadata about the method being wrapped.
       * @param {integer} metadata.minArgs
       *        The minimum number of arguments which must be passed to the
       *        function. If called with fewer than this number of arguments, the
       *        wrapper will raise an exception.
       * @param {integer} metadata.maxArgs
       *        The maximum number of arguments which may be passed to the
       *        function. If called with more than this number of arguments, the
       *        wrapper will raise an exception.
       * @param {boolean} metadata.singleCallbackArg
       *        Whether or not the promise is resolved with only the first
       *        argument of the callback, alternatively an array of all the
       *        callback arguments is resolved. By default, if the callback
       *        function is invoked with only a single argument, that will be
       *        resolved to the promise, while all arguments will be resolved as
       *        an array if multiple are given.
       *
       * @returns {function(object, ...*)}
       *       The generated wrapper function.
       */


      const wrapAsyncFunction = (name, metadata) => {
        return function asyncFunctionWrapper(target, ...args) {
          if (args.length < metadata.minArgs) {
            throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
          }

          if (args.length > metadata.maxArgs) {
            throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
          }

          return new Promise((resolve, reject) => {
            if (metadata.fallbackToNoCallback) {
              // This API method has currently no callback on Chrome, but it return a promise on Firefox,
              // and so the polyfill will try to call it with a callback first, and it will fallback
              // to not passing the callback if the first call fails.
              try {
                target[name](...args, makeCallback({
                  resolve,
                  reject
                }, metadata));
              } catch (cbError) {
                console.warn(`${name} API method doesn't seem to support the callback parameter, ` + "falling back to call it without a callback: ", cbError);
                target[name](...args); // Update the API method metadata, so that the next API calls will not try to
                // use the unsupported callback anymore.

                metadata.fallbackToNoCallback = false;
                metadata.noCallback = true;
                resolve();
              }
            } else if (metadata.noCallback) {
              target[name](...args);
              resolve();
            } else {
              target[name](...args, makeCallback({
                resolve,
                reject
              }, metadata));
            }
          });
        };
      };
      /**
       * Wraps an existing method of the target object, so that calls to it are
       * intercepted by the given wrapper function. The wrapper function receives,
       * as its first argument, the original `target` object, followed by each of
       * the arguments passed to the original method.
       *
       * @param {object} target
       *        The original target object that the wrapped method belongs to.
       * @param {function} method
       *        The method being wrapped. This is used as the target of the Proxy
       *        object which is created to wrap the method.
       * @param {function} wrapper
       *        The wrapper function which is called in place of a direct invocation
       *        of the wrapped method.
       *
       * @returns {Proxy<function>}
       *        A Proxy object for the given method, which invokes the given wrapper
       *        method in its place.
       */


      const wrapMethod = (target, method, wrapper) => {
        return new Proxy(method, {
          apply(targetMethod, thisObj, args) {
            return wrapper.call(thisObj, target, ...args);
          }

        });
      };

      let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
      /**
       * Wraps an object in a Proxy which intercepts and wraps certain methods
       * based on the given `wrappers` and `metadata` objects.
       *
       * @param {object} target
       *        The target object to wrap.
       *
       * @param {object} [wrappers = {}]
       *        An object tree containing wrapper functions for special cases. Any
       *        function present in this object tree is called in place of the
       *        method in the same location in the `target` object tree. These
       *        wrapper methods are invoked as described in {@see wrapMethod}.
       *
       * @param {object} [metadata = {}]
       *        An object tree containing metadata used to automatically generate
       *        Promise-based wrapper functions for asynchronous. Any function in
       *        the `target` object tree which has a corresponding metadata object
       *        in the same location in the `metadata` tree is replaced with an
       *        automatically-generated wrapper function, as described in
       *        {@see wrapAsyncFunction}
       *
       * @returns {Proxy<object>}
       */

      const wrapObject = (target, wrappers = {}, metadata = {}) => {
        let cache = Object.create(null);
        let handlers = {
          has(proxyTarget, prop) {
            return prop in target || prop in cache;
          },

          get(proxyTarget, prop, receiver) {
            if (prop in cache) {
              return cache[prop];
            }

            if (!(prop in target)) {
              return undefined;
            }

            let value = target[prop];

            if (typeof value === "function") {
              // This is a method on the underlying object. Check if we need to do
              // any wrapping.
              if (typeof wrappers[prop] === "function") {
                // We have a special-case wrapper for this method.
                value = wrapMethod(target, target[prop], wrappers[prop]);
              } else if (hasOwnProperty(metadata, prop)) {
                // This is an async method that we have metadata for. Create a
                // Promise wrapper for it.
                let wrapper = wrapAsyncFunction(prop, metadata[prop]);
                value = wrapMethod(target, target[prop], wrapper);
              } else {
                // This is a method that we don't know or care about. Return the
                // original method, bound to the underlying object.
                value = value.bind(target);
              }
            } else if (typeof value === "object" && value !== null && (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))) {
              // This is an object that we need to do some wrapping for the children
              // of. Create a sub-object wrapper for it with the appropriate child
              // metadata.
              value = wrapObject(value, wrappers[prop], metadata[prop]);
            } else if (hasOwnProperty(metadata, "*")) {
              // Wrap all properties in * namespace.
              value = wrapObject(value, wrappers[prop], metadata["*"]);
            } else {
              // We don't need to do any wrapping for this property,
              // so just forward all access to the underlying object.
              Object.defineProperty(cache, prop, {
                configurable: true,
                enumerable: true,

                get() {
                  return target[prop];
                },

                set(value) {
                  target[prop] = value;
                }

              });
              return value;
            }

            cache[prop] = value;
            return value;
          },

          set(proxyTarget, prop, value, receiver) {
            if (prop in cache) {
              cache[prop] = value;
            } else {
              target[prop] = value;
            }

            return true;
          },

          defineProperty(proxyTarget, prop, desc) {
            return Reflect.defineProperty(cache, prop, desc);
          },

          deleteProperty(proxyTarget, prop) {
            return Reflect.deleteProperty(cache, prop);
          }

        }; // Per contract of the Proxy API, the "get" proxy handler must return the
        // original value of the target if that value is declared read-only and
        // non-configurable. For this reason, we create an object with the
        // prototype set to `target` instead of using `target` directly.
        // Otherwise we cannot return a custom object for APIs that
        // are declared read-only and non-configurable, such as `chrome.devtools`.
        //
        // The proxy handlers themselves will still use the original `target`
        // instead of the `proxyTarget`, so that the methods and properties are
        // dereferenced via the original targets.

        let proxyTarget = Object.create(target);
        return new Proxy(proxyTarget, handlers);
      };
      /**
       * Creates a set of wrapper functions for an event object, which handles
       * wrapping of listener functions that those messages are passed.
       *
       * A single wrapper is created for each listener function, and stored in a
       * map. Subsequent calls to `addListener`, `hasListener`, or `removeListener`
       * retrieve the original wrapper, so that  attempts to remove a
       * previously-added listener work as expected.
       *
       * @param {DefaultWeakMap<function, function>} wrapperMap
       *        A DefaultWeakMap object which will create the appropriate wrapper
       *        for a given listener function when one does not exist, and retrieve
       *        an existing one when it does.
       *
       * @returns {object}
       */


      const wrapEvent = wrapperMap => ({
        addListener(target, listener, ...args) {
          target.addListener(wrapperMap.get(listener), ...args);
        },

        hasListener(target, listener) {
          return target.hasListener(wrapperMap.get(listener));
        },

        removeListener(target, listener) {
          target.removeListener(wrapperMap.get(listener));
        }

      });

      const onRequestFinishedWrappers = new DefaultWeakMap(listener => {
        if (typeof listener !== "function") {
          return listener;
        }
        /**
         * Wraps an onRequestFinished listener function so that it will return a
         * `getContent()` property which returns a `Promise` rather than using a
         * callback API.
         *
         * @param {object} req
         *        The HAR entry object representing the network request.
         */


        return function onRequestFinished(req) {
          const wrappedReq = wrapObject(req, {}
          /* wrappers */
          , {
            getContent: {
              minArgs: 0,
              maxArgs: 0
            }
          });
          listener(wrappedReq);
        };
      }); // Keep track if the deprecation warning has been logged at least once.

      let loggedSendResponseDeprecationWarning = false;
      const onMessageWrappers = new DefaultWeakMap(listener => {
        if (typeof listener !== "function") {
          return listener;
        }
        /**
         * Wraps a message listener function so that it may send responses based on
         * its return value, rather than by returning a sentinel value and calling a
         * callback. If the listener function returns a Promise, the response is
         * sent when the promise either resolves or rejects.
         *
         * @param {*} message
         *        The message sent by the other end of the channel.
         * @param {object} sender
         *        Details about the sender of the message.
         * @param {function(*)} sendResponse
         *        A callback which, when called with an arbitrary argument, sends
         *        that value as a response.
         * @returns {boolean}
         *        True if the wrapped listener returned a Promise, which will later
         *        yield a response. False otherwise.
         */


        return function onMessage(message, sender, sendResponse) {
          let didCallSendResponse = false;
          let wrappedSendResponse;
          let sendResponsePromise = new Promise(resolve => {
            wrappedSendResponse = function (response) {
              if (!loggedSendResponseDeprecationWarning) {
                console.warn(SEND_RESPONSE_DEPRECATION_WARNING, new Error().stack);
                loggedSendResponseDeprecationWarning = true;
              }

              didCallSendResponse = true;
              resolve(response);
            };
          });
          let result;

          try {
            result = listener(message, sender, wrappedSendResponse);
          } catch (err) {
            result = Promise.reject(err);
          }

          const isResultThenable = result !== true && isThenable(result); // If the listener didn't returned true or a Promise, or called
          // wrappedSendResponse synchronously, we can exit earlier
          // because there will be no response sent from this listener.

          if (result !== true && !isResultThenable && !didCallSendResponse) {
            return false;
          } // A small helper to send the message if the promise resolves
          // and an error if the promise rejects (a wrapped sendMessage has
          // to translate the message into a resolved promise or a rejected
          // promise).


          const sendPromisedResult = promise => {
            promise.then(msg => {
              // send the message value.
              sendResponse(msg);
            }, error => {
              // Send a JSON representation of the error if the rejected value
              // is an instance of error, or the object itself otherwise.
              let message;

              if (error && (error instanceof Error || typeof error.message === "string")) {
                message = error.message;
              } else {
                message = "An unexpected error occurred";
              }

              sendResponse({
                __mozWebExtensionPolyfillReject__: true,
                message
              });
            }).catch(err => {
              // Print an error on the console if unable to send the response.
              console.error("Failed to send onMessage rejected reply", err);
            });
          }; // If the listener returned a Promise, send the resolved value as a
          // result, otherwise wait the promise related to the wrappedSendResponse
          // callback to resolve and send it as a response.


          if (isResultThenable) {
            sendPromisedResult(result);
          } else {
            sendPromisedResult(sendResponsePromise);
          } // Let Chrome know that the listener is replying.


          return true;
        };
      });

      const wrappedSendMessageCallback = ({
        reject,
        resolve
      }, reply) => {
        if (extensionAPIs.runtime.lastError) {
          // Detect when none of the listeners replied to the sendMessage call and resolve
          // the promise to undefined as in Firefox.
          // See https://github.com/mozilla/webextension-polyfill/issues/130
          if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
            resolve();
          } else {
            reject(new Error(extensionAPIs.runtime.lastError.message));
          }
        } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
          // Convert back the JSON representation of the error into
          // an Error instance.
          reject(new Error(reply.message));
        } else {
          resolve(reply);
        }
      };

      const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
        if (args.length < metadata.minArgs) {
          throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
        }

        if (args.length > metadata.maxArgs) {
          throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
        }

        return new Promise((resolve, reject) => {
          const wrappedCb = wrappedSendMessageCallback.bind(null, {
            resolve,
            reject
          });
          args.push(wrappedCb);
          apiNamespaceObj.sendMessage(...args);
        });
      };

      const staticWrappers = {
        devtools: {
          network: {
            onRequestFinished: wrapEvent(onRequestFinishedWrappers)
          }
        },
        runtime: {
          onMessage: wrapEvent(onMessageWrappers),
          onMessageExternal: wrapEvent(onMessageWrappers),
          sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
            minArgs: 1,
            maxArgs: 3
          })
        },
        tabs: {
          sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
            minArgs: 2,
            maxArgs: 3
          })
        }
      };
      const settingMetadata = {
        clear: {
          minArgs: 1,
          maxArgs: 1
        },
        get: {
          minArgs: 1,
          maxArgs: 1
        },
        set: {
          minArgs: 1,
          maxArgs: 1
        }
      };
      apiMetadata.privacy = {
        network: {
          "*": settingMetadata
        },
        services: {
          "*": settingMetadata
        },
        websites: {
          "*": settingMetadata
        }
      };
      return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
    };

    if (typeof chrome != "object" || !chrome || !chrome.runtime || !chrome.runtime.id) {
      throw new Error("This script should only be loaded in a browser extension.");
    } // The build process adds a UMD wrapper around this file, which makes the
    // `module` variable available.


    module.exports = wrapAPIs(chrome);
  } else {
    module.exports = browser;
  }
});


/***/ }),

/***/ "./sdk/content/allowlisting.js":
/*!*************************************!*\
  !*** ./sdk/content/allowlisting.js ***!
  \*************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "startOneClickAllowlisting": () => (/* binding */ startOneClickAllowlisting),
/* harmony export */   "stopOneClickAllowlisting": () => (/* binding */ stopOneClickAllowlisting)
/* harmony export */ });
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! webextension-polyfill */ "./node_modules/webextension-polyfill/dist/browser-polyfill.js");
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../errors.js */ "./sdk/errors.js");
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */




const MAX_ERROR_THRESHOLD = 30;
const MAX_QUEUED_EVENTS = 20;
const EVENT_INTERVAL_MS = 100;

let errorCount = 0;
let eventProcessingInterval = null;
let eventProcessingInProgress = false;
let eventQueue = [];

function isEventTrusted(event) {
  return Object.getPrototypeOf(event) === CustomEvent.prototype &&
    !Object.hasOwnProperty.call(event, "detail");
}

async function allowlistDomain(event) {
  if (!isEventTrusted(event)) {
    return false;
  }

  return (0,_errors_js__WEBPACK_IMPORTED_MODULE_1__.ignoreNoConnectionError)(
    webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__.runtime.sendMessage({
      type: "ewe:allowlist-page",
      timestamp: event.detail.timestamp,
      signature: event.detail.signature
    })
  );
}

async function processNextEvent() {
  if (eventProcessingInProgress) {
    return;
  }

  try {
    eventProcessingInProgress = true;
    let event = eventQueue.shift();
    if (event) {
      try {
        let allowlistingResult = await allowlistDomain(event);
        if (allowlistingResult === true) {
          document.dispatchEvent(new Event("domain_allowlisting_success"));
          stopOneClickAllowlisting();
        }
        else {
          throw new Error("Domain allowlisting rejected");
        }
      }
      catch (e) {
        errorCount++;
        if (errorCount >= MAX_ERROR_THRESHOLD) {
          stopOneClickAllowlisting();
        }
      }
    }

    if (!eventQueue.length) {
      stopProcessingInterval();
    }
  }
  finally {
    eventProcessingInProgress = false;
  }
}

function onDomainAllowlistingRequest(event) {
  if (eventQueue.length >= MAX_QUEUED_EVENTS) {
    return;
  }

  eventQueue.push(event);
  startProcessingInterval();
}

function startProcessingInterval() {
  if (!eventProcessingInterval) {
    processNextEvent();
    eventProcessingInterval = setInterval(processNextEvent, EVENT_INTERVAL_MS);
  }
}

function stopProcessingInterval() {
  clearInterval(eventProcessingInterval);
  eventProcessingInterval = null;
}

function stopOneClickAllowlisting() {
  document.removeEventListener("domain_allowlisting_request",
                               onDomainAllowlistingRequest, true);
  eventQueue = [];
  stopProcessingInterval();
}

function startOneClickAllowlisting() {
  document.addEventListener("domain_allowlisting_request",
                            onDomainAllowlistingRequest, true);
}


/***/ }),

/***/ "./sdk/content/element-collapsing.js":
/*!*******************************************!*\
  !*** ./sdk/content/element-collapsing.js ***!
  \*******************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "hideElement": () => (/* binding */ hideElement),
/* harmony export */   "startElementCollapsing": () => (/* binding */ startElementCollapsing),
/* harmony export */   "unhideElement": () => (/* binding */ unhideElement)
/* harmony export */ });
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! webextension-polyfill */ "./node_modules/webextension-polyfill/dist/browser-polyfill.js");
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../errors.js */ "./sdk/errors.js");
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */




let collapsedSelectors = new Set();
let observers = new WeakMap();

function getURLFromElement(element) {
  if (element.localName == "object") {
    if (element.data) {
      return element.data;
    }

    for (let child of element.children) {
      if (child.localName == "param" && child.name == "movie" && child.value) {
        return new URL(child.value, document.baseURI).href;
      }
    }

    return null;
  }

  return element.currentSrc || element.src;
}

function getSelectorForBlockedElement(element) {
  // Setting the "display" CSS property to "none" doesn't have any effect on
  // <frame> elements (in framesets). So we have to hide it inline through
  // the "visibility" CSS property.
  if (element.localName == "frame") {
    return null;
  }

  // If the <video> or <audio> element contains any <source> children,
  // we cannot address it in CSS by the source URL; in that case we
  // don't "collapse" it using a CSS selector but rather hide it directly by
  // setting the style="..." attribute.
  if (element.localName == "video" || element.localName == "audio") {
    for (let child of element.children) {
      if (child.localName == "source") {
        return null;
      }
    }
  }

  let selector = "";
  for (let attr of ["src", "srcset"]) {
    let value = element.getAttribute(attr);
    if (value && attr in element) {
      selector += "[" + attr + "=" + CSS.escape(value) + "]";
    }
  }

  return selector ? element.localName + selector : null;
}

function hideElement(element, properties) {
  let {style} = element;

  if (!properties) {
    if (element.localName == "frame") {
      properties = [["visibility", "hidden"]];
    }
    else {
      properties = [["display", "none"]];
    }
  }

  for (let [key, value] of properties) {
    style.setProperty(key, value, "important");
  }

  if (observers.has(element)) {
    observers.get(element).disconnect();
  }

  let observer = new MutationObserver(() => {
    for (let [key, value] of properties) {
      if (style.getPropertyValue(key) != value ||
          style.getPropertyPriority(key) != "important") {
        style.setProperty(key, value, "important");
      }
    }
  });
  observer.observe(
    element, {
      attributes: true,
      attributeFilter: ["style"]
    }
  );
  observers.set(element, observer);
}

function unhideElement(element) {
  let observer = observers.get(element);
  if (observer) {
    observer.disconnect();
    observers.delete(element);
  }

  let property = element.localName == "frame" ? "visibility" : "display";
  element.style.removeProperty(property);
}

function collapseElement(element) {
  let selector = getSelectorForBlockedElement(element);
  if (!selector) {
    hideElement(element);
    return;
  }

  if (!collapsedSelectors.has(selector)) {
    (0,_errors_js__WEBPACK_IMPORTED_MODULE_1__.ignoreNoConnectionError)(
      webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__.runtime.sendMessage({
        type: "ewe:inject-css",
        selector
      })
    );
    collapsedSelectors.add(selector);
  }
}

function hideInAboutBlankFrames(selector, urls) {
  // Resources (e.g. images) loaded into about:blank frames
  // are (sometimes) loaded with the frameId of the main_frame.
  for (let frame of document.querySelectorAll("iframe[src='about:blank']")) {
    if (!frame.contentDocument) {
      continue;
    }

    for (let element of frame.contentDocument.querySelectorAll(selector)) {
      // Use hideElement, because we don't have the correct frameId
      // for the "ewe:inject-css" message.
      if (urls.has(getURLFromElement(element))) {
        hideElement(element);
      }
    }
  }
}

function startElementCollapsing() {
  let deferred = null;

  webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__.runtime.onMessage.addListener((message, sender) => {
    if (!message || message.type != "ewe:collapse") {
      return;
    }

    if (document.readyState == "loading") {
      if (!deferred) {
        deferred = new Map();
        document.addEventListener("DOMContentLoaded", () => {
          // Under some conditions a hostile script could try to trigger
          // the event again. Since we set deferred to `null`, then
          // we assume that we should just return instead of throwing
          // a TypeError.
          if (!deferred) {
            return;
          }

          for (let [selector, urls] of deferred) {
            for (let element of document.querySelectorAll(selector)) {
              if (urls.has(getURLFromElement(element))) {
                collapseElement(element);
              }
            }

            hideInAboutBlankFrames(selector, urls);
          }

          deferred = null;
        });
      }

      let urls = deferred.get(message.selector) || new Set();
      deferred.set(message.selector, urls);
      urls.add(message.url);
    }
    else {
      for (let element of document.querySelectorAll(message.selector)) {
        if (getURLFromElement(element) == message.url) {
          collapseElement(element);
        }
      }

      hideInAboutBlankFrames(message.selector, new Set([message.url]));
    }
    return false;
  });
}


/***/ }),

/***/ "./sdk/content/element-hiding-tracer.js":
/*!**********************************************!*\
  !*** ./sdk/content/element-hiding-tracer.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ElementHidingTracer": () => (/* binding */ ElementHidingTracer)
/* harmony export */ });
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! webextension-polyfill */ "./node_modules/webextension-polyfill/dist/browser-polyfill.js");
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../errors.js */ "./sdk/errors.js");
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */




class ElementHidingTracer {
  constructor(selectors) {
    this.selectors = new Map(selectors);

    this.observer = new MutationObserver(() => {
      this.observer.disconnect();
      setTimeout(() => this.trace(), 1000);
    });

    if (document.readyState == "loading") {
      document.addEventListener("DOMContentLoaded", () => this.trace());
    }
    else {
      this.trace();
    }
  }

  log(filters, selectors = []) {
    (0,_errors_js__WEBPACK_IMPORTED_MODULE_1__.ignoreNoConnectionError)(webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__.runtime.sendMessage(
      {type: "ewe:trace-elem-hide", filters, selectors}
    ));
  }

  trace() {
    let filters = [];
    let selectors = [];

    for (let [selector, filter] of this.selectors) {
      try {
        if (document.querySelector(selector)) {
          this.selectors.delete(selector);
          if (filter) {
            filters.push(filter);
          }
          else {
            selectors.push(selector);
          }
        }
      }
      catch (e) {
        console.error(e.toString());
      }
    }

    if (filters.length > 0 || selectors.length > 0) {
      this.log(filters, selectors);
    }

    this.observer.observe(document, {childList: true,
                                     attributes: true,
                                     subtree: true});
  }

  disconnect() {
    this.observer.disconnect();
  }
}


/***/ }),

/***/ "./sdk/content/subscribe-links.js":
/*!****************************************!*\
  !*** ./sdk/content/subscribe-links.js ***!
  \****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "handleSubscribeLinks": () => (/* binding */ handleSubscribeLinks),
/* harmony export */   "subscribeLinksEnabled": () => (/* binding */ subscribeLinksEnabled)
/* harmony export */ });
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! webextension-polyfill */ "./node_modules/webextension-polyfill/dist/browser-polyfill.js");
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../errors.js */ "./sdk/errors.js");
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */




const ALLOWED_DOMAINS = new Set([
  "abpchina.org",
  "abpindo.blogspot.com",
  "abpvn.com",
  "adblock.ee",
  "adblock.gardar.net",
  "adblockplus.me",
  "adblockplus.org",
  "abptestpages.org",
  "commentcamarche.net",
  "droit-finances.commentcamarche.com",
  "easylist.to",
  "eyeo.com",
  "fanboy.co.nz",
  "filterlists.com",
  "forums.lanik.us",
  "gitee.com",
  "gitee.io",
  "github.com",
  "github.io",
  "gitlab.com",
  "gitlab.io",
  "gurud.ee",
  "hugolescargot.com",
  "i-dont-care-about-cookies.eu",
  "journaldesfemmes.fr",
  "journaldunet.com",
  "linternaute.com",
  "spam404.com",
  "stanev.org",
  "void.gr",
  "xfiles.noads.it",
  "zoso.ro"
]);

function isDomainAllowed(domain) {
  if (domain.endsWith(".")) {
    domain = domain.substring(0, domain.length - 1);
  }

  while (true) {
    if (ALLOWED_DOMAINS.has(domain)) {
      return true;
    }
    let index = domain.indexOf(".");
    if (index == -1) {
      return false;
    }
    domain = domain.substr(index + 1);
  }
}

function subscribeLinksEnabled(url) {
  let {protocol, hostname} = new URL(url);
  return hostname == "localhost" ||
    protocol == "https:" && isDomainAllowed(hostname);
}

function handleSubscribeLinks() {
  document.addEventListener("click", event => {
    if (event.button == 2 || !event.isTrusted) {
      return;
    }

    let link = event.target;
    while (!(link instanceof HTMLAnchorElement)) {
      link = link.parentNode;

      if (!link) {
        return;
      }
    }

    let queryString = null;
    if (link.protocol == "http:" || link.protocol == "https:") {
      if (link.host == "subscribe.adblockplus.org" && link.pathname == "/") {
        queryString = link.search.substr(1);
      }
    }
    else {
      // Firefox doesn't seem to populate the "search" property for
      // links with non-standard URL schemes so we need to extract the query
      // string manually.
      let match = /^abp:\/*subscribe\/*\?(.*)/i.exec(link.href);
      if (match) {
        queryString = match[1];
      }
    }

    if (!queryString) {
      return;
    }

    let title = null;
    let url = null;
    for (let param of queryString.split("&")) {
      let parts = param.split("=", 2);
      if (parts.length != 2 || !/\S/.test(parts[1])) {
        continue;
      }
      switch (parts[0]) {
        case "title":
          title = decodeURIComponent(parts[1]);
          break;
        case "location":
          url = decodeURIComponent(parts[1]);
          break;
      }
    }
    if (!url) {
      return;
    }

    if (!title) {
      title = url;
    }

    title = title.trim();
    url = url.trim();
    if (!/^(https?|ftp):/.test(url)) {
      return;
    }

    (0,_errors_js__WEBPACK_IMPORTED_MODULE_1__.ignoreNoConnectionError)(
      webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__.runtime.sendMessage({type: "ewe:subscribe-link-clicked",
                                   title, url})
    );

    event.preventDefault();
    event.stopPropagation();
  }, true);
}


/***/ }),

/***/ "./sdk/errors.js":
/*!***********************!*\
  !*** ./sdk/errors.js ***!
  \***********************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ERROR_DISABLED_RULE_LIMIT_REACHED": () => (/* binding */ ERROR_DISABLED_RULE_LIMIT_REACHED),
/* harmony export */   "ERROR_DUPLICATE_FILTERS": () => (/* binding */ ERROR_DUPLICATE_FILTERS),
/* harmony export */   "ERROR_FILTER_NOT_FOUND": () => (/* binding */ ERROR_FILTER_NOT_FOUND),
/* harmony export */   "ERROR_TOO_MANY_FILTERS": () => (/* binding */ ERROR_TOO_MANY_FILTERS),
/* harmony export */   "ignoreNoConnectionError": () => (/* binding */ ignoreNoConnectionError)
/* harmony export */ });
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */

const ERROR_NO_CONNECTION = "Could not establish connection. " +
      "Receiving end does not exist.";
const ERROR_CLOSED_CONNECTION = "A listener indicated an asynchronous " +
      "response by returning true, but the message channel closed before a " +
      "response was received";
// https://bugzilla.mozilla.org/show_bug.cgi?id=1578697
const ERROR_MANAGER_DISCONNECTED = "Message manager disconnected";

const ERROR_DISABLED_RULE_LIMIT_REACHED = "The number of disabled static " +
      "rules exceeds the disabled rule count limit.";

const ERROR_DUPLICATE_FILTERS = "storage_duplicate_filters";
const ERROR_FILTER_NOT_FOUND = "filter_not_found";
const ERROR_TOO_MANY_FILTERS = "too_many_filters";

function ignoreNoConnectionError(promise) {
  return promise.catch(error => {
    if (typeof error == "object" &&
        (error.message == ERROR_NO_CONNECTION ||
         error.message == ERROR_CLOSED_CONNECTION ||
         error.message == ERROR_MANAGER_DISCONNECTED)) {
      return;
    }

    throw error;
  });
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!******************************!*\
  !*** ./sdk/content/index.js ***!
  \******************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! webextension-polyfill */ "./node_modules/webextension-polyfill/dist/browser-polyfill.js");
/* harmony import */ var adblockpluscore_lib_content_elemHideEmulation_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! adblockpluscore/lib/content/elemHideEmulation.js */ "./core/lib/content/elemHideEmulation.js");
/* harmony import */ var _errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../errors.js */ "./sdk/errors.js");
/* harmony import */ var _element_collapsing_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./element-collapsing.js */ "./sdk/content/element-collapsing.js");
/* harmony import */ var _allowlisting_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./allowlisting.js */ "./sdk/content/allowlisting.js");
/* harmony import */ var _element_hiding_tracer_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./element-hiding-tracer.js */ "./sdk/content/element-hiding-tracer.js");
/* harmony import */ var _subscribe_links_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./subscribe-links.js */ "./sdk/content/subscribe-links.js");
/*
 * This file is part of eyeo's Web Extension Ad Blocking Toolkit (EWE),
 * Copyright (C) 2006-present eyeo GmbH
 *
 * EWE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * EWE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EWE.  If not, see <http://www.gnu.org/licenses/>.
 */











let tracer;
let elemHideEmulation;

async function initContentFeatures() {
  if ((0,_subscribe_links_js__WEBPACK_IMPORTED_MODULE_6__.subscribeLinksEnabled)(window.location.href)) {
    (0,_subscribe_links_js__WEBPACK_IMPORTED_MODULE_6__.handleSubscribeLinks)();
  }

  let response = await (0,_errors_js__WEBPACK_IMPORTED_MODULE_2__.ignoreNoConnectionError)(
    webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__.runtime.sendMessage({type: "ewe:content-hello"})
  );

  if (response) {
    await applyContentFeatures(response);
  }
}

async function removeContentFeatures() {
  if (tracer) {
    tracer.disconnect();
  }
}

async function applyContentFeatures(response) {
  if (response.tracedSelectors) {
    tracer = new _element_hiding_tracer_js__WEBPACK_IMPORTED_MODULE_5__.ElementHidingTracer(response.tracedSelectors);
  }

  const hideElements = (elements, filters) => {
    for (let element of elements) {
      (0,_element_collapsing_js__WEBPACK_IMPORTED_MODULE_3__.hideElement)(element, response.cssProperties);
    }

    if (tracer) {
      tracer.log(filters);
    }
  };

  const unhideElements = elements => {
    for (let element of elements) {
      (0,_element_collapsing_js__WEBPACK_IMPORTED_MODULE_3__.unhideElement)(element);
    }
  };

  const removeElements = (elements, filters) => {
    for (const element of elements) {
      element.remove();
    }

    if (tracer) {
      tracer.log(filters);
    }
  };

  const applyInlineCSS = (elements, cssPatterns) => {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      const pattern = cssPatterns[i];

      for (const [key, value] of Object.entries(pattern.css)) {
        element.style.setProperty(key, value, "important");
      }
    }

    if (tracer) {
      const filterTexts = cssPatterns.map(pattern => pattern.text);
      tracer.log(filterTexts);
    }
  };

  if (response.emulatedPatterns.length > 0) {
    if (!elemHideEmulation) {
      elemHideEmulation = new adblockpluscore_lib_content_elemHideEmulation_js__WEBPACK_IMPORTED_MODULE_1__.ElemHideEmulation(hideElements, unhideElements,
                                                removeElements, applyInlineCSS);
    }
    elemHideEmulation.apply(response.emulatedPatterns);
  }
  else if (elemHideEmulation) {
    elemHideEmulation.apply(response.emulatedPatterns);
  }
}

function onMessage(message) {
  if (typeof message == "object" && message != null &&
    message.type && message.type == "ewe:apply-content-features") {
    removeContentFeatures();
    applyContentFeatures(message);
  }
}
webextension_polyfill__WEBPACK_IMPORTED_MODULE_0__.runtime.onMessage.addListener(onMessage);

(0,_element_collapsing_js__WEBPACK_IMPORTED_MODULE_3__.startElementCollapsing)();
(0,_allowlisting_js__WEBPACK_IMPORTED_MODULE_4__.startOneClickAllowlisting)();
initContentFeatures();

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxTQUFTLGtDQUFrQztBQUMzQztBQUNBO0FBQ0E7QUFDQSx1QkFBdUIsZ0JBQWdCLFVBQVUsb0JBQW9CO0FBQ3JFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBLHFDQUFxQztBQUNyQztBQUNBLG1EQUFtRDtBQUNuRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw2QkFBNkI7QUFDN0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUU0QztBQUNTOztBQUVyRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVPO0FBQ1AsT0FBTyxvQkFBb0I7QUFDM0I7QUFDQTtBQUNBOztBQUVPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsSUFBSSxtRUFBdUI7QUFDM0IsTUFBTSxzRUFBMkIsRUFBRTtBQUNuQyw4Q0FBOEM7QUFDOUM7O0FBRUE7QUFDQTtBQUNBLEdBQUc7QUFDSDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFTztBQUNQOztBQUVPO0FBQ0E7QUFDQTs7QUFFQTtBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsR0FBRztBQUNIOzs7Ozs7O1VDM0NBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7O1dDdEJBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EseUNBQXlDLHdDQUF3QztXQUNqRjtXQUNBO1dBQ0E7Ozs7O1dDUEE7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkJBQTZCO0FBQzdCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFNEM7O0FBR2M7O0FBRUw7QUFFcEI7QUFDMkI7QUFDRztBQUNrQjs7QUFFakY7QUFDQTs7QUFFQTtBQUNBLE1BQU0sMEVBQXFCO0FBQzNCLElBQUkseUVBQW9CO0FBQ3hCOztBQUVBLHVCQUF1QixtRUFBdUI7QUFDOUMsSUFBSSxzRUFBMkIsRUFBRSwwQkFBMEI7QUFDM0Q7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsaUJBQWlCLDBFQUFtQjtBQUNwQzs7QUFFQTtBQUNBO0FBQ0EsTUFBTSxtRUFBVztBQUNqQjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsTUFBTSxxRUFBYTtBQUNuQjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0Esb0JBQW9CLHFCQUFxQjtBQUN6QztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLDhCQUE4QiwrRkFBaUI7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGdGQUFxQzs7QUFFckMsOEVBQXNCO0FBQ3RCLDJFQUF5QjtBQUN6QiIsInNvdXJjZXMiOlsid2VicGFjazovL0BleWVvL3dlYmV4dC1hZC1maWx0ZXJpbmctc29sdXRpb24vLi9jb3JlL2xpYi9jb21tb24uanMiLCJ3ZWJwYWNrOi8vQGV5ZW8vd2ViZXh0LWFkLWZpbHRlcmluZy1zb2x1dGlvbi8uL2NvcmUvbGliL2NvbnRlbnQvZWxlbUhpZGVFbXVsYXRpb24uanMiLCJ3ZWJwYWNrOi8vQGV5ZW8vd2ViZXh0LWFkLWZpbHRlcmluZy1zb2x1dGlvbi8uL2NvcmUvbGliL3BhdHRlcm5zLmpzIiwid2VicGFjazovL0BleWVvL3dlYmV4dC1hZC1maWx0ZXJpbmctc29sdXRpb24vLi9ub2RlX21vZHVsZXMvd2ViZXh0ZW5zaW9uLXBvbHlmaWxsL2Rpc3QvYnJvd3Nlci1wb2x5ZmlsbC5qcyIsIndlYnBhY2s6Ly9AZXllby93ZWJleHQtYWQtZmlsdGVyaW5nLXNvbHV0aW9uLy4vc2RrL2NvbnRlbnQvYWxsb3dsaXN0aW5nLmpzIiwid2VicGFjazovL0BleWVvL3dlYmV4dC1hZC1maWx0ZXJpbmctc29sdXRpb24vLi9zZGsvY29udGVudC9lbGVtZW50LWNvbGxhcHNpbmcuanMiLCJ3ZWJwYWNrOi8vQGV5ZW8vd2ViZXh0LWFkLWZpbHRlcmluZy1zb2x1dGlvbi8uL3Nkay9jb250ZW50L2VsZW1lbnQtaGlkaW5nLXRyYWNlci5qcyIsIndlYnBhY2s6Ly9AZXllby93ZWJleHQtYWQtZmlsdGVyaW5nLXNvbHV0aW9uLy4vc2RrL2NvbnRlbnQvc3Vic2NyaWJlLWxpbmtzLmpzIiwid2VicGFjazovL0BleWVvL3dlYmV4dC1hZC1maWx0ZXJpbmctc29sdXRpb24vLi9zZGsvZXJyb3JzLmpzIiwid2VicGFjazovL0BleWVvL3dlYmV4dC1hZC1maWx0ZXJpbmctc29sdXRpb24vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vQGV5ZW8vd2ViZXh0LWFkLWZpbHRlcmluZy1zb2x1dGlvbi93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vQGV5ZW8vd2ViZXh0LWFkLWZpbHRlcmluZy1zb2x1dGlvbi93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL0BleWVvL3dlYmV4dC1hZC1maWx0ZXJpbmctc29sdXRpb24vd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9AZXllby93ZWJleHQtYWQtZmlsdGVyaW5nLXNvbHV0aW9uLy4vc2RrL2NvbnRlbnQvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIEFkYmxvY2sgUGx1cyA8aHR0cHM6Ly9hZGJsb2NrcGx1cy5vcmcvPixcbiAqIENvcHlyaWdodCAoQykgMjAwNi1wcmVzZW50IGV5ZW8gR21iSFxuICpcbiAqIEFkYmxvY2sgUGx1cyBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIHZlcnNpb24gMyBhc1xuICogcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24uXG4gKlxuICogQWRibG9jayBQbHVzIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogYWxvbmcgd2l0aCBBZGJsb2NrIFBsdXMuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqIEBtb2R1bGUgKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbmxldCB0ZXh0VG9SZWdFeHAgPVxuLyoqXG4gKiBDb252ZXJ0cyByYXcgdGV4dCBpbnRvIGEgcmVndWxhciBleHByZXNzaW9uIHN0cmluZ1xuICogQHBhcmFtIHtzdHJpbmd9IHRleHQgdGhlIHN0cmluZyB0byBjb252ZXJ0XG4gKiBAcmV0dXJuIHtzdHJpbmd9IHJlZ3VsYXIgZXhwcmVzc2lvbiByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGV4dFxuICogQHBhY2thZ2VcbiAqL1xuZXhwb3J0cy50ZXh0VG9SZWdFeHAgPSB0ZXh0ID0+IHRleHQucmVwbGFjZSgvWy0vXFxcXF4kKis/LigpfFtcXF17fV0vZywgXCJcXFxcJCZcIik7XG5cbmNvbnN0IHJlZ2V4cFJlZ2V4cCA9IC9eXFwvKC4qKVxcLyhbaW11XSopJC87XG5cbi8qKlxuICogTWFrZSBhIHJlZ3VsYXIgZXhwcmVzc2lvbiBmcm9tIGEgdGV4dCBhcmd1bWVudC5cbiAqXG4gKiBJZiBpdCBjYW4gYmUgcGFyc2VkIGFzIGEgcmVndWxhciBleHByZXNzaW9uLCBwYXJzZSBpdCBhbmQgdGhlIGZsYWdzLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IHRoZSB0ZXh0IGFyZ3VtZW50LlxuICpcbiAqIEByZXR1cm4gez9SZWdFeHB9IGEgUmVnRXhwIG9iamVjdCBvciBudWxsIGluIGNhc2Ugb2YgZXJyb3IuXG4gKi9cbmV4cG9ydHMubWFrZVJlZ0V4cFBhcmFtZXRlciA9IGZ1bmN0aW9uIG1ha2VSZWdFeHBQYXJhbWV0ZXIodGV4dCkge1xuICBsZXQgWywgc291cmNlLCBmbGFnc10gPSByZWdleHBSZWdleHAuZXhlYyh0ZXh0KSB8fCBbbnVsbCwgdGV4dFRvUmVnRXhwKHRleHQpXTtcblxuICB0cnkge1xuICAgIHJldHVybiBuZXcgUmVnRXhwKHNvdXJjZSwgZmxhZ3MpO1xuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn07XG5cbmxldCBzcGxpdFNlbGVjdG9yID0gZXhwb3J0cy5zcGxpdFNlbGVjdG9yID0gZnVuY3Rpb24gc3BsaXRTZWxlY3RvcihzZWxlY3Rvcikge1xuICBpZiAoIXNlbGVjdG9yLmluY2x1ZGVzKFwiLFwiKSkge1xuICAgIHJldHVybiBbc2VsZWN0b3JdO1xuICB9XG5cbiAgbGV0IHNlbGVjdG9ycyA9IFtdO1xuICBsZXQgc3RhcnQgPSAwO1xuICBsZXQgbGV2ZWwgPSAwO1xuICBsZXQgc2VwID0gXCJcIjtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdG9yLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGNociA9IHNlbGVjdG9yW2ldO1xuXG4gICAgLy8gaWdub3JlIGVzY2FwZWQgY2hhcmFjdGVyc1xuICAgIGlmIChjaHIgPT0gXCJcXFxcXCIpIHtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgLy8gZG9uJ3Qgc3BsaXQgd2l0aGluIHF1b3RlZCB0ZXh0XG4gICAgZWxzZSBpZiAoY2hyID09IHNlcCkge1xuICAgICAgc2VwID0gXCJcIjsgICAgICAgICAgICAgLy8gZS5nLiBbYXR0cj1cIixcIl1cbiAgICB9XG4gICAgZWxzZSBpZiAoc2VwID09IFwiXCIpIHtcbiAgICAgIGlmIChjaHIgPT0gJ1wiJyB8fCBjaHIgPT0gXCInXCIpIHtcbiAgICAgICAgc2VwID0gY2hyO1xuICAgICAgfVxuICAgICAgLy8gZG9uJ3Qgc3BsaXQgYmV0d2VlbiBwYXJlbnRoZXNlc1xuICAgICAgZWxzZSBpZiAoY2hyID09IFwiKFwiKSB7XG4gICAgICAgIGxldmVsKys7ICAgICAgICAgICAgLy8gZS5nLiA6bWF0Y2hlcyhkaXYsc3BhbilcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGNociA9PSBcIilcIikge1xuICAgICAgICBsZXZlbCA9IE1hdGgubWF4KDAsIGxldmVsIC0gMSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChjaHIgPT0gXCIsXCIgJiYgbGV2ZWwgPT0gMCkge1xuICAgICAgICBzZWxlY3RvcnMucHVzaChzZWxlY3Rvci5zdWJzdHJpbmcoc3RhcnQsIGkpKTtcbiAgICAgICAgc3RhcnQgPSBpICsgMTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzZWxlY3RvcnMucHVzaChzZWxlY3Rvci5zdWJzdHJpbmcoc3RhcnQpKTtcbiAgcmV0dXJuIHNlbGVjdG9ycztcbn07XG5cbmZ1bmN0aW9uIGZpbmRUYXJnZXRTZWxlY3RvckluZGV4KHNlbGVjdG9yKSB7XG4gIGxldCBpbmRleCA9IDA7XG4gIGxldCB3aGl0ZXNwYWNlID0gMDtcbiAgbGV0IHNjb3BlID0gW107XG5cbiAgLy8gU3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBzdHJpbmcgYW5kIGdvIGNoYXJhY3RlciBieSBjaGFyYWN0ZXIsIHdoZXJlIGVhY2hcbiAgLy8gY2hhcmFjdGVyIGlzIGEgVW5pY29kZSBjb2RlIHBvaW50LlxuICBmb3IgKGxldCBjaGFyYWN0ZXIgb2YgWy4uLnNlbGVjdG9yXS5yZXZlcnNlKCkpIHtcbiAgICBsZXQgY3VycmVudFNjb3BlID0gc2NvcGVbc2NvcGUubGVuZ3RoIC0gMV07XG5cbiAgICBpZiAoY2hhcmFjdGVyID09IFwiJ1wiIHx8IGNoYXJhY3RlciA9PSBcIlxcXCJcIikge1xuICAgICAgLy8gSWYgd2UncmUgYWxyZWFkeSB3aXRoaW4gdGhlIHNhbWUgdHlwZSBvZiBxdW90ZSwgY2xvc2UgdGhlIHNjb3BlO1xuICAgICAgLy8gb3RoZXJ3aXNlIG9wZW4gYSBuZXcgc2NvcGUuXG4gICAgICBpZiAoY3VycmVudFNjb3BlID09IGNoYXJhY3Rlcikge1xuICAgICAgICBzY29wZS5wb3AoKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBzY29wZS5wdXNoKGNoYXJhY3Rlcik7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGNoYXJhY3RlciA9PSBcIl1cIiB8fCBjaGFyYWN0ZXIgPT0gXCIpXCIpIHtcbiAgICAgIC8vIEZvciBjbG9zaW5nIGJyYWNrZXRzIGFuZCBwYXJlbnRoZXNlcywgb3BlbiBhIG5ldyBzY29wZSBvbmx5IGlmIHdlJ3JlXG4gICAgICAvLyBub3Qgd2l0aGluIGEgcXVvdGUuIFdpdGhpbiBxdW90ZXMgdGhlc2UgY2hhcmFjdGVycyBzaG91bGQgaGF2ZSBub1xuICAgICAgLy8gbWVhbmluZy5cbiAgICAgIGlmIChjdXJyZW50U2NvcGUgIT0gXCInXCIgJiYgY3VycmVudFNjb3BlICE9IFwiXFxcIlwiKSB7XG4gICAgICAgIHNjb3BlLnB1c2goY2hhcmFjdGVyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoY2hhcmFjdGVyID09IFwiW1wiKSB7XG4gICAgICAvLyBJZiB3ZSdyZSBhbHJlYWR5IHdpdGhpbiBhIGJyYWNrZXQsIGNsb3NlIHRoZSBzY29wZS5cbiAgICAgIGlmIChjdXJyZW50U2NvcGUgPT0gXCJdXCIpIHtcbiAgICAgICAgc2NvcGUucG9wKCk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGNoYXJhY3RlciA9PSBcIihcIikge1xuICAgICAgLy8gSWYgd2UncmUgYWxyZWFkeSB3aXRoaW4gYSBwYXJlbnRoZXNpcywgY2xvc2UgdGhlIHNjb3BlLlxuICAgICAgaWYgKGN1cnJlbnRTY29wZSA9PSBcIilcIikge1xuICAgICAgICBzY29wZS5wb3AoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoIWN1cnJlbnRTY29wZSkge1xuICAgICAgLy8gQXQgdGhlIHRvcCBsZXZlbCAobm90IHdpdGhpbiBhbnkgc2NvcGUpLCBjb3VudCB0aGUgd2hpdGVzcGFjZSBpZiB3ZSd2ZVxuICAgICAgLy8gZW5jb3VudGVyZWQgaXQuIE90aGVyd2lzZSBpZiB3ZSd2ZSBoaXQgb25lIG9mIHRoZSBjb21iaW5hdG9ycyxcbiAgICAgIC8vIHRlcm1pbmF0ZSBoZXJlOyBvdGhlcndpc2UgaWYgd2UndmUgaGl0IGEgbm9uLWNvbG9uIGNoYXJhY3RlcixcbiAgICAgIC8vIHRlcm1pbmF0ZSBoZXJlLlxuICAgICAgaWYgKC9cXHMvLnRlc3QoY2hhcmFjdGVyKSkge1xuICAgICAgICB3aGl0ZXNwYWNlKys7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICgoY2hhcmFjdGVyID09IFwiPlwiIHx8IGNoYXJhY3RlciA9PSBcIitcIiB8fCBjaGFyYWN0ZXIgPT0gXCJ+XCIpIHx8XG4gICAgICAgICAgICAgICAod2hpdGVzcGFjZSA+IDAgJiYgY2hhcmFjdGVyICE9IFwiOlwiKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBaZXJvIG91dCB0aGUgd2hpdGVzcGFjZSBjb3VudCBpZiB3ZSd2ZSBlbnRlcmVkIGEgc2NvcGUuXG4gICAgaWYgKHNjb3BlLmxlbmd0aCA+IDApIHtcbiAgICAgIHdoaXRlc3BhY2UgPSAwO1xuICAgIH1cblxuICAgIC8vIEluY3JlbWVudCB0aGUgaW5kZXggYnkgdGhlIHNpemUgb2YgdGhlIGNoYXJhY3Rlci4gTm90ZSB0aGF0IGZvciBVbmljb2RlXG4gICAgLy8gY29tcG9zaXRlIGNoYXJhY3RlcnMgKGxpa2UgZW1vamkpIHRoaXMgd2lsbCBiZSBtb3JlIHRoYW4gb25lLlxuICAgIGluZGV4ICs9IGNoYXJhY3Rlci5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4gc2VsZWN0b3IubGVuZ3RoIC0gaW5kZXggKyB3aGl0ZXNwYWNlO1xufVxuXG4vKipcbiAqIFF1YWxpZmllcyBhIENTUyBzZWxlY3RvciB3aXRoIGEgcXVhbGlmaWVyLCB3aGljaCBtYXkgYmUgYW5vdGhlciBDU1Mgc2VsZWN0b3JcbiAqIG9yIGFuIGVtcHR5IHN0cmluZy4gRm9yIGV4YW1wbGUsIGdpdmVuIHRoZSBzZWxlY3RvciBcImRpdi5iYXJcIiBhbmQgdGhlXG4gKiBxdWFsaWZpZXIgXCIjZm9vXCIsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBcImRpdiNmb28uYmFyXCIuXG4gKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgVGhlIHNlbGVjdG9yIHRvIHF1YWxpZnkuXG4gKiBAcGFyYW0ge3N0cmluZ30gcXVhbGlmaWVyIFRoZSBxdWFsaWZpZXIgd2l0aCB3aGljaCB0byBxdWFsaWZ5IHRoZSBzZWxlY3Rvci5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBxdWFsaWZpZWQgc2VsZWN0b3IuXG4gKiBAcGFja2FnZVxuICovXG5leHBvcnRzLnF1YWxpZnlTZWxlY3RvciA9IGZ1bmN0aW9uIHF1YWxpZnlTZWxlY3RvcihzZWxlY3RvciwgcXVhbGlmaWVyKSB7XG4gIGxldCBxdWFsaWZpZWRTZWxlY3RvciA9IFwiXCI7XG5cbiAgbGV0IHF1YWxpZmllclRhcmdldFNlbGVjdG9ySW5kZXggPSBmaW5kVGFyZ2V0U2VsZWN0b3JJbmRleChxdWFsaWZpZXIpO1xuICBsZXQgWywgcXVhbGlmaWVyVHlwZSA9IFwiXCJdID1cbiAgICAvXihbYS16XVthLXotXSopPy9pLmV4ZWMocXVhbGlmaWVyLnN1YnN0cmluZyhxdWFsaWZpZXJUYXJnZXRTZWxlY3RvckluZGV4KSk7XG5cbiAgZm9yIChsZXQgc3ViIG9mIHNwbGl0U2VsZWN0b3Ioc2VsZWN0b3IpKSB7XG4gICAgc3ViID0gc3ViLnRyaW0oKTtcblxuICAgIHF1YWxpZmllZFNlbGVjdG9yICs9IFwiLCBcIjtcblxuICAgIGxldCBpbmRleCA9IGZpbmRUYXJnZXRTZWxlY3RvckluZGV4KHN1Yik7XG5cbiAgICAvLyBOb3RlIHRoYXQgdGhlIGZpcnN0IGdyb3VwIGluIHRoZSByZWd1bGFyIGV4cHJlc3Npb24gaXMgb3B0aW9uYWwuIElmIGl0XG4gICAgLy8gZG9lc24ndCBtYXRjaCAoZS5nLiBcIiNmb286Om50aC1jaGlsZCgxKVwiKSwgdHlwZSB3aWxsIGJlIGFuIGVtcHR5IHN0cmluZy5cbiAgICBsZXQgWywgdHlwZSA9IFwiXCIsIHJlc3RdID1cbiAgICAgIC9eKFthLXpdW2Etei1dKik/XFwqPyguKikvaS5leGVjKHN1Yi5zdWJzdHJpbmcoaW5kZXgpKTtcblxuICAgIGlmICh0eXBlID09IHF1YWxpZmllclR5cGUpIHtcbiAgICAgIHR5cGUgPSBcIlwiO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSBxdWFsaWZpZXIgZW5kcyBpbiBhIGNvbWJpbmF0b3IgKGUuZy4gXCJib2R5ICNmb28+XCIpLCB3ZSBwdXQgdGhlXG4gICAgLy8gdHlwZSBhbmQgdGhlIHJlc3Qgb2YgdGhlIHNlbGVjdG9yIGFmdGVyIHRoZSBxdWFsaWZpZXJcbiAgICAvLyAoZS5nLiBcImJvZHkgI2Zvbz5kaXYuYmFyXCIpOyBvdGhlcndpc2UgKGUuZy4gXCJib2R5ICNmb29cIikgd2UgbWVyZ2UgdGhlXG4gICAgLy8gdHlwZSBpbnRvIHRoZSBxdWFsaWZpZXIgKGUuZy4gXCJib2R5IGRpdiNmb28uYmFyXCIpLlxuICAgIGlmICgvW1xccz4rfl0kLy50ZXN0KHF1YWxpZmllcikpIHtcbiAgICAgIHF1YWxpZmllZFNlbGVjdG9yICs9IHN1Yi5zdWJzdHJpbmcoMCwgaW5kZXgpICsgcXVhbGlmaWVyICsgdHlwZSArIHJlc3Q7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcXVhbGlmaWVkU2VsZWN0b3IgKz0gc3ViLnN1YnN0cmluZygwLCBpbmRleCkgKyB0eXBlICsgcXVhbGlmaWVyICsgcmVzdDtcbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgdGhlIGluaXRpYWwgY29tbWEgYW5kIHNwYWNlLlxuICByZXR1cm4gcXVhbGlmaWVkU2VsZWN0b3Iuc3Vic3RyaW5nKDIpO1xufTtcbiIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBBZGJsb2NrIFBsdXMgPGh0dHBzOi8vYWRibG9ja3BsdXMub3JnLz4sXG4gKiBDb3B5cmlnaHQgKEMpIDIwMDYtcHJlc2VudCBleWVvIEdtYkhcbiAqXG4gKiBBZGJsb2NrIFBsdXMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSB2ZXJzaW9uIDMgYXNcbiAqIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLlxuICpcbiAqIEFkYmxvY2sgUGx1cyBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggQWRibG9jayBQbHVzLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKiBAbW9kdWxlICovXG5cblwidXNlIHN0cmljdFwiO1xuXG5jb25zdCB7bWFrZVJlZ0V4cFBhcmFtZXRlciwgc3BsaXRTZWxlY3RvcixcbiAgICAgICBxdWFsaWZ5U2VsZWN0b3J9ID0gcmVxdWlyZShcIi4uL2NvbW1vblwiKTtcbmNvbnN0IHtmaWx0ZXJUb1JlZ0V4cH0gPSByZXF1aXJlKFwiLi4vcGF0dGVybnNcIik7XG5cbmNvbnN0IERFRkFVTFRfTUlOX0lOVk9DQVRJT05fSU5URVJWQUwgPSAzMDAwO1xubGV0IG1pbkludm9jYXRpb25JbnRlcnZhbCA9IERFRkFVTFRfTUlOX0lOVk9DQVRJT05fSU5URVJWQUw7XG5jb25zdCBERUZBVUxUX01BWF9TWUNIUk9OT1VTX1BST0NFU1NJTkdfVElNRSA9IDUwO1xubGV0IG1heFN5bmNocm9ub3VzUHJvY2Vzc2luZ1RpbWUgPSBERUZBVUxUX01BWF9TWUNIUk9OT1VTX1BST0NFU1NJTkdfVElNRTtcblxuY29uc3QgYWJwU2VsZWN0b3JSZWdleHAgPSAvOigtYWJwLVtcXHctXSt8aGFzfGhhcy10ZXh0fHhwYXRofG5vdClcXCgvO1xuXG5sZXQgdGVzdEluZm8gPSBudWxsO1xuXG5mdW5jdGlvbiB0b0NTU1N0eWxlRGVjbGFyYXRpb24odmFsdWUpIHtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRlc3RcIiksIHtzdHlsZTogdmFsdWV9KS5zdHlsZTtcbn1cblxuLyoqXG4gKiBFbmFibGVzIHRlc3QgbW9kZSwgd2hpY2ggdHJhY2tzIGFkZGl0aW9uYWwgbWV0YWRhdGEgYWJvdXQgdGhlIGlubmVyXG4gKiB3b3JraW5ncyBmb3IgdGVzdCBwdXJwb3Nlcy4gVGhpcyBhbHNvIGFsbG93cyBvdmVycmlkaW5nIGludGVybmFsXG4gKiBjb25maWd1cmF0aW9uLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5taW5JbnZvY2F0aW9uSW50ZXJ2YWwgT3ZlcnJpZGVzIGhvdyBsb25nXG4gKiAgIG11c3QgYmUgd2FpdGVkIGJldHdlZW4gZmlsdGVyIHByb2Nlc3NpbmcgcnVuc1xuICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMubWF4U3luY2hyb25vdXNQcm9jZXNzaW5nVGltZSBPdmVycmlkZXMgaG93XG4gKiAgIGxvbmcgdGhlIHRocmVhZCBtYXkgc3BlbmQgcHJvY2Vzc2luZyBmaWx0ZXJzIGJlZm9yZSBpdCBtdXN0IHlpZWxkXG4gKiAgIGl0cyB0aHJlYWRcbiAqL1xuZXhwb3J0cy5zZXRUZXN0TW9kZSA9IGZ1bmN0aW9uIHNldFRlc3RNb2RlKG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zLm1pbkludm9jYXRpb25JbnRlcnZhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1pbkludm9jYXRpb25JbnRlcnZhbCA9IG9wdGlvbnMubWluSW52b2NhdGlvbkludGVydmFsO1xuICB9XG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5tYXhTeW5jaHJvbm91c1Byb2Nlc3NpbmdUaW1lICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbWF4U3luY2hyb25vdXNQcm9jZXNzaW5nVGltZSA9IG9wdGlvbnMubWF4U3luY2hyb25vdXNQcm9jZXNzaW5nVGltZTtcbiAgfVxuXG4gIHRlc3RJbmZvID0ge1xuICAgIGxhc3RQcm9jZXNzZWRFbGVtZW50czogbmV3IFNldCgpLFxuICAgIGZhaWxlZEFzc2VydGlvbnM6IFtdXG4gIH07XG59O1xuXG5leHBvcnRzLmdldFRlc3RJbmZvID0gZnVuY3Rpb24gZ2V0VGVzdEluZm8oKSB7XG4gIHJldHVybiB0ZXN0SW5mbztcbn07XG5cbmV4cG9ydHMuY2xlYXJUZXN0TW9kZSA9IGZ1bmN0aW9uKCkge1xuICBtaW5JbnZvY2F0aW9uSW50ZXJ2YWwgPSBERUZBVUxUX01JTl9JTlZPQ0FUSU9OX0lOVEVSVkFMO1xuICBtYXhTeW5jaHJvbm91c1Byb2Nlc3NpbmdUaW1lID0gREVGQVVMVF9NQVhfU1lDSFJPTk9VU19QUk9DRVNTSU5HX1RJTUU7XG4gIHRlc3RJbmZvID0gbnVsbDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBJZGxlRGVhZGxpbmUuXG4gKlxuICogTm90ZTogVGhpcyBmdW5jdGlvbiBpcyBzeW5jaHJvbm91cyBhbmQgZG9lcyBOT1QgcmVxdWVzdCBhbiBpZGxlXG4gKiBjYWxsYmFjay5cbiAqXG4gKiBTZWUge0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9JZGxlRGVhZGxpbmV9LlxuICogQHJldHVybiB7SWRsZURlYWRsaW5lfVxuICovXG5mdW5jdGlvbiBuZXdJZGxlRGVhZGxpbmUoKSB7XG4gIGxldCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgcmV0dXJuIHtcbiAgICBkaWRUaW1lb3V0OiBmYWxzZSxcbiAgICB0aW1lUmVtYWluaW5nKCkge1xuICAgICAgbGV0IGVsYXBzZWQgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0VGltZTtcbiAgICAgIGxldCByZW1haW5pbmcgPSBtYXhTeW5jaHJvbm91c1Byb2Nlc3NpbmdUaW1lIC0gZWxhcHNlZDtcbiAgICAgIHJldHVybiBNYXRoLm1heCgwLCByZW1haW5pbmcpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IGlzIHJlc29sdmVkIHdoZW4gdGhlIGJyb3dzZXIgaXMgbmV4dCBpZGxlLlxuICpcbiAqIFRoaXMgaXMgaW50ZW5kZWQgdG8gYmUgdXNlZCBmb3IgbG9uZyBydW5uaW5nIHRhc2tzIG9uIHRoZSBVSSB0aHJlYWRcbiAqIHRvIGFsbG93IG90aGVyIFVJIGV2ZW50cyB0byBwcm9jZXNzLlxuICpcbiAqIEByZXR1cm4ge1Byb21pc2UuPElkbGVEZWFkbGluZT59XG4gKiAgICBBIHByb21pc2UgdGhhdCBpcyBmdWxmaWxsZWQgd2hlbiB5b3UgY2FuIGNvbnRpbnVlIHByb2Nlc3NpbmdcbiAqL1xuZnVuY3Rpb24geWllbGRUaHJlYWQoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICBpZiAodHlwZW9mIHJlcXVlc3RJZGxlQ2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmVxdWVzdElkbGVDYWxsYmFjayhyZXNvbHZlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShuZXdJZGxlRGVhZGxpbmUoKSk7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gIH0pO1xufVxuXG5cbmZ1bmN0aW9uIGdldENhY2hlZFByb3BlcnR5VmFsdWUob2JqZWN0LCBuYW1lLCBkZWZhdWx0VmFsdWVGdW5jID0gKCkgPT4ge30pIHtcbiAgbGV0IHZhbHVlID0gb2JqZWN0W25hbWVdO1xuICBpZiAodHlwZW9mIHZhbHVlID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7dmFsdWU6IHZhbHVlID0gZGVmYXVsdFZhbHVlRnVuYygpfSk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJldHVybiBwb3NpdGlvbiBvZiBub2RlIGZyb20gcGFyZW50LlxuICogQHBhcmFtIHtOb2RlfSBub2RlIHRoZSBub2RlIHRvIGZpbmQgdGhlIHBvc2l0aW9uIG9mLlxuICogQHJldHVybiB7bnVtYmVyfSBPbmUtYmFzZWQgaW5kZXggbGlrZSBmb3IgOm50aC1jaGlsZCgpLCBvciAwIG9uIGVycm9yLlxuICovXG5mdW5jdGlvbiBwb3NpdGlvbkluUGFyZW50KG5vZGUpIHtcbiAgbGV0IGluZGV4ID0gMDtcbiAgZm9yIChsZXQgY2hpbGQgb2Ygbm9kZS5wYXJlbnROb2RlLmNoaWxkcmVuKSB7XG4gICAgaWYgKGNoaWxkID09IG5vZGUpIHtcbiAgICAgIHJldHVybiBpbmRleCArIDE7XG4gICAgfVxuXG4gICAgaW5kZXgrKztcbiAgfVxuXG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBtYWtlU2VsZWN0b3Iobm9kZSwgc2VsZWN0b3IgPSBcIlwiKSB7XG4gIGlmIChub2RlID09IG51bGwpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoIW5vZGUucGFyZW50RWxlbWVudCkge1xuICAgIGxldCBuZXdTZWxlY3RvciA9IFwiOnJvb3RcIjtcbiAgICBpZiAoc2VsZWN0b3IpIHtcbiAgICAgIG5ld1NlbGVjdG9yICs9IFwiID4gXCIgKyBzZWxlY3RvcjtcbiAgICB9XG4gICAgcmV0dXJuIG5ld1NlbGVjdG9yO1xuICB9XG4gIGxldCBpZHggPSBwb3NpdGlvbkluUGFyZW50KG5vZGUpO1xuICBpZiAoaWR4ID4gMCkge1xuICAgIGxldCBuZXdTZWxlY3RvciA9IGAke25vZGUudGFnTmFtZX06bnRoLWNoaWxkKCR7aWR4fSlgO1xuICAgIGlmIChzZWxlY3Rvcikge1xuICAgICAgbmV3U2VsZWN0b3IgKz0gXCIgPiBcIiArIHNlbGVjdG9yO1xuICAgIH1cbiAgICByZXR1cm4gbWFrZVNlbGVjdG9yKG5vZGUucGFyZW50RWxlbWVudCwgbmV3U2VsZWN0b3IpO1xuICB9XG5cbiAgcmV0dXJuIHNlbGVjdG9yO1xufVxuXG5mdW5jdGlvbiBwYXJzZVNlbGVjdG9yQ29udGVudChjb250ZW50LCBzdGFydEluZGV4KSB7XG4gIGxldCBwYXJlbnMgPSAxO1xuICBsZXQgcXVvdGUgPSBudWxsO1xuICBsZXQgaSA9IHN0YXJ0SW5kZXg7XG4gIGZvciAoOyBpIDwgY29udGVudC5sZW5ndGg7IGkrKykge1xuICAgIGxldCBjID0gY29udGVudFtpXTtcbiAgICBpZiAoYyA9PSBcIlxcXFxcIikge1xuICAgICAgLy8gSWdub3JlIGVzY2FwZWQgY2hhcmFjdGVyc1xuICAgICAgaSsrO1xuICAgIH1cbiAgICBlbHNlIGlmIChxdW90ZSkge1xuICAgICAgaWYgKGMgPT0gcXVvdGUpIHtcbiAgICAgICAgcXVvdGUgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChjID09IFwiJ1wiIHx8IGMgPT0gJ1wiJykge1xuICAgICAgcXVvdGUgPSBjO1xuICAgIH1cbiAgICBlbHNlIGlmIChjID09IFwiKFwiKSB7XG4gICAgICBwYXJlbnMrKztcbiAgICB9XG4gICAgZWxzZSBpZiAoYyA9PSBcIilcIikge1xuICAgICAgcGFyZW5zLS07XG4gICAgICBpZiAocGFyZW5zID09IDApIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKHBhcmVucyA+IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4ge3RleHQ6IGNvbnRlbnQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGkpLCBlbmQ6IGl9O1xufVxuXG4vKipcbiAqIFN0cmluZ2lmaWVkIHN0eWxlIG9iamVjdHNcbiAqIEB0eXBlZGVmIHtPYmplY3R9IFN0cmluZ2lmaWVkU3R5bGVcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBzdHlsZSBDU1Mgc3R5bGUgcmVwcmVzZW50ZWQgYnkgYSBzdHJpbmcuXG4gKiBAcHJvcGVydHkge3N0cmluZ1tdfSBzdWJTZWxlY3RvcnMgc2VsZWN0b3JzIHRoZSBDU1MgcHJvcGVydGllcyBhcHBseSB0by5cbiAqL1xuXG4vKipcbiAqIFByb2R1Y2UgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHN0eWxlc2hlZXQgZW50cnkuXG4gKiBAcGFyYW0ge0NTU1N0eWxlUnVsZX0gcnVsZSB0aGUgQ1NTIHN0eWxlIHJ1bGUuXG4gKiBAcmV0dXJuIHtTdHJpbmdpZmllZFN0eWxlfSB0aGUgc3RyaW5naWZpZWQgc3R5bGUuXG4gKi9cbmZ1bmN0aW9uIHN0cmluZ2lmeVN0eWxlKHJ1bGUpIHtcbiAgbGV0IHN0eWxlcyA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHJ1bGUuc3R5bGUubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgcHJvcGVydHkgPSBydWxlLnN0eWxlLml0ZW0oaSk7XG4gICAgbGV0IHZhbHVlID0gcnVsZS5zdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKHByb3BlcnR5KTtcbiAgICBsZXQgcHJpb3JpdHkgPSBydWxlLnN0eWxlLmdldFByb3BlcnR5UHJpb3JpdHkocHJvcGVydHkpO1xuICAgIHN0eWxlcy5wdXNoKGAke3Byb3BlcnR5fTogJHt2YWx1ZX0ke3ByaW9yaXR5ID8gXCIgIVwiICsgcHJpb3JpdHkgOiBcIlwifTtgKTtcbiAgfVxuICBzdHlsZXMuc29ydCgpO1xuICByZXR1cm4ge1xuICAgIHN0eWxlOiBzdHlsZXMuam9pbihcIiBcIiksXG4gICAgc3ViU2VsZWN0b3JzOiBzcGxpdFNlbGVjdG9yKHJ1bGUuc2VsZWN0b3JUZXh0KVxuICB9O1xufVxuXG5sZXQgc2NvcGVTdXBwb3J0ZWQgPSBudWxsO1xuXG5mdW5jdGlvbiB0cnlRdWVyeVNlbGVjdG9yKHN1YnRyZWUsIHNlbGVjdG9yLCBhbGwpIHtcbiAgbGV0IGVsZW1lbnRzID0gbnVsbDtcbiAgdHJ5IHtcbiAgICBlbGVtZW50cyA9IGFsbCA/IHN1YnRyZWUucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikgOlxuICAgICAgc3VidHJlZS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICBzY29wZVN1cHBvcnRlZCA9IHRydWU7XG4gIH1cbiAgY2F0Y2ggKGUpIHtcbiAgICAvLyBFZGdlIGRvZXNuJ3Qgc3VwcG9ydCBcIjpzY29wZVwiXG4gICAgc2NvcGVTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gZWxlbWVudHM7XG59XG5cbi8qKlxuICogUXVlcnkgc2VsZWN0b3IuXG4gKlxuICogSWYgaXQgaXMgcmVsYXRpdmUsIHdpbGwgdHJ5IDpzY29wZS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IHN1YnRyZWUgdGhlIGVsZW1lbnQgdG8gcXVlcnkgc2VsZWN0b3JcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciB0aGUgc2VsZWN0b3IgdG8gcXVlcnlcbiAqIEBwYXJhbSB7Ym9vbH0gW2FsbD1mYWxzZV0gdHJ1ZSB0byBwZXJmb3JtIHF1ZXJ5U2VsZWN0b3JBbGwoKVxuICpcbiAqIEByZXR1cm5zIHs/KE5vZGV8Tm9kZUxpc3QpfSByZXN1bHQgb2YgdGhlIHF1ZXJ5LiBudWxsIGluIGNhc2Ugb2YgZXJyb3IuXG4gKi9cbmZ1bmN0aW9uIHNjb3BlZFF1ZXJ5U2VsZWN0b3Ioc3VidHJlZSwgc2VsZWN0b3IsIGFsbCkge1xuICBpZiAoc2VsZWN0b3JbMF0gPT0gXCI+XCIpIHtcbiAgICBzZWxlY3RvciA9IFwiOnNjb3BlXCIgKyBzZWxlY3RvcjtcbiAgICBpZiAoc2NvcGVTdXBwb3J0ZWQpIHtcbiAgICAgIHJldHVybiBhbGwgPyBzdWJ0cmVlLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpIDpcbiAgICAgICAgc3VidHJlZS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB9XG4gICAgaWYgKHNjb3BlU3VwcG9ydGVkID09IG51bGwpIHtcbiAgICAgIHJldHVybiB0cnlRdWVyeVNlbGVjdG9yKHN1YnRyZWUsIHNlbGVjdG9yLCBhbGwpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gYWxsID8gc3VidHJlZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSA6XG4gICAgc3VidHJlZS5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbn1cblxuZnVuY3Rpb24gc2NvcGVkUXVlcnlTZWxlY3RvckFsbChzdWJ0cmVlLCBzZWxlY3Rvcikge1xuICByZXR1cm4gc2NvcGVkUXVlcnlTZWxlY3RvcihzdWJ0cmVlLCBzZWxlY3RvciwgdHJ1ZSk7XG59XG5cbmNsYXNzIFBsYWluU2VsZWN0b3Ige1xuICBjb25zdHJ1Y3RvcihzZWxlY3Rvcikge1xuICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgdGhpcy5tYXliZURlcGVuZHNPbkF0dHJpYnV0ZXMgPSAvWyMuOl18XFxbLitcXF0vLnRlc3Qoc2VsZWN0b3IpO1xuICAgIHRoaXMubWF5YmVDb250YWluc1NpYmxpbmdDb21iaW5hdG9ycyA9IC9bfitdLy50ZXN0KHNlbGVjdG9yKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0b3IgZnVuY3Rpb24gcmV0dXJuaW5nIGEgcGFpciBvZiBzZWxlY3RvciBzdHJpbmcgYW5kIHN1YnRyZWUuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggdGhlIHByZWZpeCBmb3IgdGhlIHNlbGVjdG9yLlxuICAgKiBAcGFyYW0ge05vZGV9IHN1YnRyZWUgdGhlIHN1YnRyZWUgd2Ugd29yayBvbi5cbiAgICogQHBhcmFtIHtOb2RlW119IFt0YXJnZXRzXSB0aGUgbm9kZXMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqL1xuICAqZ2V0U2VsZWN0b3JzKHByZWZpeCwgc3VidHJlZSwgdGFyZ2V0cykge1xuICAgIHlpZWxkIFtwcmVmaXggKyB0aGlzLl9zZWxlY3Rvciwgc3VidHJlZV07XG4gIH1cbn1cblxuY29uc3QgaW5jb21wbGV0ZVByZWZpeFJlZ2V4cCA9IC9bXFxzPit+XSQvO1xuXG5jbGFzcyBOb3RTZWxlY3RvciB7XG4gIGNvbnN0cnVjdG9yKHNlbGVjdG9ycykge1xuICAgIHRoaXMuX2lubmVyUGF0dGVybiA9IG5ldyBQYXR0ZXJuKHNlbGVjdG9ycyk7XG4gIH1cblxuICBnZXQgZGVwZW5kc09uU3R5bGVzKCkge1xuICAgIHJldHVybiB0aGlzLl9pbm5lclBhdHRlcm4uZGVwZW5kc09uU3R5bGVzO1xuICB9XG5cbiAgZ2V0IGRlcGVuZHNPbkNoYXJhY3RlckRhdGEoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lubmVyUGF0dGVybi5kZXBlbmRzT25DaGFyYWN0ZXJEYXRhO1xuICB9XG5cbiAgZ2V0IG1heWJlRGVwZW5kc09uQXR0cmlidXRlcygpIHtcbiAgICByZXR1cm4gdGhpcy5faW5uZXJQYXR0ZXJuLm1heWJlRGVwZW5kc09uQXR0cmlidXRlcztcbiAgfVxuXG4gICpnZXRTZWxlY3RvcnMocHJlZml4LCBzdWJ0cmVlLCB0YXJnZXRzKSB7XG4gICAgZm9yIChsZXQgZWxlbWVudCBvZiB0aGlzLmdldEVsZW1lbnRzKHByZWZpeCwgc3VidHJlZSwgdGFyZ2V0cykpIHtcbiAgICAgIHlpZWxkIFttYWtlU2VsZWN0b3IoZWxlbWVudCksIGVsZW1lbnRdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0b3IgZnVuY3Rpb24gcmV0dXJuaW5nIHNlbGVjdGVkIGVsZW1lbnRzLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcHJlZml4IHRoZSBwcmVmaXggZm9yIHRoZSBzZWxlY3Rvci5cbiAgICogQHBhcmFtIHtOb2RlfSBzdWJ0cmVlIHRoZSBzdWJ0cmVlIHdlIHdvcmsgb24uXG4gICAqIEBwYXJhbSB7Tm9kZVtdfSBbdGFyZ2V0c10gdGhlIG5vZGVzIHdlIGFyZSBpbnRlcmVzdGVkIGluLlxuICAgKi9cbiAgKmdldEVsZW1lbnRzKHByZWZpeCwgc3VidHJlZSwgdGFyZ2V0cykge1xuICAgIGxldCBhY3R1YWxQcmVmaXggPSAoIXByZWZpeCB8fCBpbmNvbXBsZXRlUHJlZml4UmVnZXhwLnRlc3QocHJlZml4KSkgP1xuICAgICAgcHJlZml4ICsgXCIqXCIgOiBwcmVmaXg7XG4gICAgbGV0IGVsZW1lbnRzID0gc2NvcGVkUXVlcnlTZWxlY3RvckFsbChzdWJ0cmVlLCBhY3R1YWxQcmVmaXgpO1xuICAgIGlmIChlbGVtZW50cykge1xuICAgICAgZm9yIChsZXQgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgICAgICAvLyBJZiB0aGUgZWxlbWVudCBpcyBuZWl0aGVyIGFuIGFuY2VzdG9yIG5vciBhIGRlc2NlbmRhbnQgb2Ygb25lIG9mIHRoZVxuICAgICAgICAvLyB0YXJnZXRzLCB3ZSBjYW4gc2tpcCBpdC5cbiAgICAgICAgaWYgKHRhcmdldHMgJiYgIXRhcmdldHMuc29tZSh0YXJnZXQgPT4gZWxlbWVudC5jb250YWlucyh0YXJnZXQpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jb250YWlucyhlbGVtZW50KSkpIHtcbiAgICAgICAgICB5aWVsZCBudWxsO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRlc3RJbmZvKSB7XG4gICAgICAgICAgdGVzdEluZm8ubGFzdFByb2Nlc3NlZEVsZW1lbnRzLmFkZChlbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5faW5uZXJQYXR0ZXJuLm1hdGNoZXMoZWxlbWVudCwgc3VidHJlZSkpIHtcbiAgICAgICAgICB5aWVsZCBlbGVtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgeWllbGQgbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzZXRTdHlsZXMoc3R5bGVzKSB7XG4gICAgdGhpcy5faW5uZXJQYXR0ZXJuLnNldFN0eWxlcyhzdHlsZXMpO1xuICB9XG59XG5cbmNsYXNzIEhhc1NlbGVjdG9yIHtcbiAgY29uc3RydWN0b3Ioc2VsZWN0b3JzKSB7XG4gICAgdGhpcy5faW5uZXJQYXR0ZXJuID0gbmV3IFBhdHRlcm4oc2VsZWN0b3JzKTtcbiAgfVxuXG4gIGdldCBkZXBlbmRzT25TdHlsZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lubmVyUGF0dGVybi5kZXBlbmRzT25TdHlsZXM7XG4gIH1cblxuICBnZXQgZGVwZW5kc09uQ2hhcmFjdGVyRGF0YSgpIHtcbiAgICByZXR1cm4gdGhpcy5faW5uZXJQYXR0ZXJuLmRlcGVuZHNPbkNoYXJhY3RlckRhdGE7XG4gIH1cblxuICBnZXQgbWF5YmVEZXBlbmRzT25BdHRyaWJ1dGVzKCkge1xuICAgIHJldHVybiB0aGlzLl9pbm5lclBhdHRlcm4ubWF5YmVEZXBlbmRzT25BdHRyaWJ1dGVzO1xuICB9XG5cbiAgKmdldFNlbGVjdG9ycyhwcmVmaXgsIHN1YnRyZWUsIHRhcmdldHMpIHtcbiAgICBmb3IgKGxldCBlbGVtZW50IG9mIHRoaXMuZ2V0RWxlbWVudHMocHJlZml4LCBzdWJ0cmVlLCB0YXJnZXRzKSkge1xuICAgICAgeWllbGQgW21ha2VTZWxlY3RvcihlbGVtZW50KSwgZWxlbWVudF07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRvciBmdW5jdGlvbiByZXR1cm5pbmcgc2VsZWN0ZWQgZWxlbWVudHMuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggdGhlIHByZWZpeCBmb3IgdGhlIHNlbGVjdG9yLlxuICAgKiBAcGFyYW0ge05vZGV9IHN1YnRyZWUgdGhlIHN1YnRyZWUgd2Ugd29yayBvbi5cbiAgICogQHBhcmFtIHtOb2RlW119IFt0YXJnZXRzXSB0aGUgbm9kZXMgd2UgYXJlIGludGVyZXN0ZWQgaW4uXG4gICAqL1xuICAqZ2V0RWxlbWVudHMocHJlZml4LCBzdWJ0cmVlLCB0YXJnZXRzKSB7XG4gICAgbGV0IGFjdHVhbFByZWZpeCA9ICghcHJlZml4IHx8IGluY29tcGxldGVQcmVmaXhSZWdleHAudGVzdChwcmVmaXgpKSA/XG4gICAgICBwcmVmaXggKyBcIipcIiA6IHByZWZpeDtcbiAgICBsZXQgZWxlbWVudHMgPSBzY29wZWRRdWVyeVNlbGVjdG9yQWxsKHN1YnRyZWUsIGFjdHVhbFByZWZpeCk7XG4gICAgaWYgKGVsZW1lbnRzKSB7XG4gICAgICBmb3IgKGxldCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgICAgIC8vIElmIHRoZSBlbGVtZW50IGlzIG5laXRoZXIgYW4gYW5jZXN0b3Igbm9yIGEgZGVzY2VuZGFudCBvZiBvbmUgb2YgdGhlXG4gICAgICAgIC8vIHRhcmdldHMsIHdlIGNhbiBza2lwIGl0LlxuICAgICAgICBpZiAodGFyZ2V0cyAmJiAhdGFyZ2V0cy5zb21lKHRhcmdldCA9PiBlbGVtZW50LmNvbnRhaW5zKHRhcmdldCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNvbnRhaW5zKGVsZW1lbnQpKSkge1xuICAgICAgICAgIHlpZWxkIG51bGw7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGVzdEluZm8pIHtcbiAgICAgICAgICB0ZXN0SW5mby5sYXN0UHJvY2Vzc2VkRWxlbWVudHMuYWRkKGVsZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgc2VsZWN0b3Igb2YgdGhpcy5faW5uZXJQYXR0ZXJuLmV2YWx1YXRlKGVsZW1lbnQsIHRhcmdldHMpKSB7XG4gICAgICAgICAgaWYgKHNlbGVjdG9yID09IG51bGwpIHtcbiAgICAgICAgICAgIHlpZWxkIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKHNjb3BlZFF1ZXJ5U2VsZWN0b3IoZWxlbWVudCwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICB5aWVsZCBlbGVtZW50O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHlpZWxkIG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2V0U3R5bGVzKHN0eWxlcykge1xuICAgIHRoaXMuX2lubmVyUGF0dGVybi5zZXRTdHlsZXMoc3R5bGVzKTtcbiAgfVxufVxuXG5jbGFzcyBYUGF0aFNlbGVjdG9yIHtcbiAgY29uc3RydWN0b3IodGV4dENvbnRlbnQpIHtcbiAgICB0aGlzLmRlcGVuZHNPbkNoYXJhY3RlckRhdGEgPSB0cnVlO1xuICAgIHRoaXMubWF5YmVEZXBlbmRzT25BdHRyaWJ1dGVzID0gdHJ1ZTtcblxuICAgIGxldCBldmFsdWF0b3IgPSBuZXcgWFBhdGhFdmFsdWF0b3IoKTtcbiAgICB0aGlzLl9leHByZXNzaW9uID0gZXZhbHVhdG9yLmNyZWF0ZUV4cHJlc3Npb24odGV4dENvbnRlbnQsIG51bGwpO1xuICB9XG5cbiAgKmdldFNlbGVjdG9ycyhwcmVmaXgsIHN1YnRyZWUsIHRhcmdldHMpIHtcbiAgICBmb3IgKGxldCBlbGVtZW50IG9mIHRoaXMuZ2V0RWxlbWVudHMocHJlZml4LCBzdWJ0cmVlLCB0YXJnZXRzKSkge1xuICAgICAgeWllbGQgW21ha2VTZWxlY3RvcihlbGVtZW50KSwgZWxlbWVudF07XG4gICAgfVxuICB9XG5cbiAgKmdldEVsZW1lbnRzKHByZWZpeCwgc3VidHJlZSwgdGFyZ2V0cykge1xuICAgIGxldCB7T1JERVJFRF9OT0RFX1NOQVBTSE9UX1RZUEU6IGZsYWd9ID0gWFBhdGhSZXN1bHQ7XG4gICAgbGV0IGVsZW1lbnRzID0gcHJlZml4ID8gc2NvcGVkUXVlcnlTZWxlY3RvckFsbChzdWJ0cmVlLCBwcmVmaXgpIDogW3N1YnRyZWVdO1xuICAgIGZvciAobGV0IHBhcmVudCBvZiBlbGVtZW50cykge1xuICAgICAgbGV0IHJlc3VsdCA9IHRoaXMuX2V4cHJlc3Npb24uZXZhbHVhdGUocGFyZW50LCBmbGFnLCBudWxsKTtcbiAgICAgIGZvciAobGV0IGkgPSAwLCB7c25hcHNob3RMZW5ndGh9ID0gcmVzdWx0OyBpIDwgc25hcHNob3RMZW5ndGg7IGkrKykge1xuICAgICAgICB5aWVsZCByZXN1bHQuc25hcHNob3RJdGVtKGkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBDb250YWluc1NlbGVjdG9yIHtcbiAgY29uc3RydWN0b3IodGV4dENvbnRlbnQpIHtcbiAgICB0aGlzLmRlcGVuZHNPbkNoYXJhY3RlckRhdGEgPSB0cnVlO1xuXG4gICAgdGhpcy5fcmVnZXhwID0gbWFrZVJlZ0V4cFBhcmFtZXRlcih0ZXh0Q29udGVudCk7XG4gIH1cblxuICAqZ2V0U2VsZWN0b3JzKHByZWZpeCwgc3VidHJlZSwgdGFyZ2V0cykge1xuICAgIGZvciAobGV0IGVsZW1lbnQgb2YgdGhpcy5nZXRFbGVtZW50cyhwcmVmaXgsIHN1YnRyZWUsIHRhcmdldHMpKSB7XG4gICAgICB5aWVsZCBbbWFrZVNlbGVjdG9yKGVsZW1lbnQpLCBzdWJ0cmVlXTtcbiAgICB9XG4gIH1cblxuICAqZ2V0RWxlbWVudHMocHJlZml4LCBzdWJ0cmVlLCB0YXJnZXRzKSB7XG4gICAgbGV0IGFjdHVhbFByZWZpeCA9ICghcHJlZml4IHx8IGluY29tcGxldGVQcmVmaXhSZWdleHAudGVzdChwcmVmaXgpKSA/XG4gICAgICBwcmVmaXggKyBcIipcIiA6IHByZWZpeDtcblxuICAgIGxldCBlbGVtZW50cyA9IHNjb3BlZFF1ZXJ5U2VsZWN0b3JBbGwoc3VidHJlZSwgYWN0dWFsUHJlZml4KTtcblxuICAgIGlmIChlbGVtZW50cykge1xuICAgICAgbGV0IGxhc3RSb290ID0gbnVsbDtcbiAgICAgIGZvciAobGV0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICAgICAgLy8gRm9yIGEgZmlsdGVyIGxpa2UgZGl2Oi1hYnAtY29udGFpbnMoSGVsbG8pIGFuZCBhIHN1YnRyZWUgbGlrZVxuICAgICAgICAvLyA8ZGl2IGlkPVwiYVwiPjxkaXYgaWQ9XCJiXCI+PGRpdiBpZD1cImNcIj5IZWxsbzwvZGl2PjwvZGl2PjwvZGl2PlxuICAgICAgICAvLyB3ZSdyZSBvbmx5IGludGVyZXN0ZWQgaW4gZGl2I2FcbiAgICAgICAgaWYgKGxhc3RSb290ICYmIGxhc3RSb290LmNvbnRhaW5zKGVsZW1lbnQpKSB7XG4gICAgICAgICAgeWllbGQgbnVsbDtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxhc3RSb290ID0gZWxlbWVudDtcblxuICAgICAgICBpZiAodGFyZ2V0cyAmJiAhdGFyZ2V0cy5zb21lKHRhcmdldCA9PiBlbGVtZW50LmNvbnRhaW5zKHRhcmdldCkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNvbnRhaW5zKGVsZW1lbnQpKSkge1xuICAgICAgICAgIHlpZWxkIG51bGw7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGVzdEluZm8pIHtcbiAgICAgICAgICB0ZXN0SW5mby5sYXN0UHJvY2Vzc2VkRWxlbWVudHMuYWRkKGVsZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX3JlZ2V4cCAmJiB0aGlzLl9yZWdleHAudGVzdChlbGVtZW50LnRleHRDb250ZW50KSkge1xuICAgICAgICAgIHlpZWxkIGVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgeWllbGQgbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBQcm9wc1NlbGVjdG9yIHtcbiAgY29uc3RydWN0b3IocHJvcGVydHlFeHByZXNzaW9uKSB7XG4gICAgdGhpcy5kZXBlbmRzT25TdHlsZXMgPSB0cnVlO1xuICAgIHRoaXMubWF5YmVEZXBlbmRzT25BdHRyaWJ1dGVzID0gdHJ1ZTtcblxuICAgIGxldCByZWdleHBTdHJpbmc7XG4gICAgaWYgKHByb3BlcnR5RXhwcmVzc2lvbi5sZW5ndGggPj0gMiAmJiBwcm9wZXJ0eUV4cHJlc3Npb25bMF0gPT0gXCIvXCIgJiZcbiAgICAgICAgcHJvcGVydHlFeHByZXNzaW9uW3Byb3BlcnR5RXhwcmVzc2lvbi5sZW5ndGggLSAxXSA9PSBcIi9cIikge1xuICAgICAgcmVnZXhwU3RyaW5nID0gcHJvcGVydHlFeHByZXNzaW9uLnNsaWNlKDEsIC0xKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZWdleHBTdHJpbmcgPSBmaWx0ZXJUb1JlZ0V4cChwcm9wZXJ0eUV4cHJlc3Npb24pO1xuICAgIH1cblxuICAgIHRoaXMuX3JlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwU3RyaW5nLCBcImlcIik7XG5cbiAgICB0aGlzLl9zdWJTZWxlY3RvcnMgPSBbXTtcbiAgfVxuXG4gICpnZXRTZWxlY3RvcnMocHJlZml4LCBzdWJ0cmVlLCB0YXJnZXRzKSB7XG4gICAgZm9yIChsZXQgc3ViU2VsZWN0b3Igb2YgdGhpcy5fc3ViU2VsZWN0b3JzKSB7XG4gICAgICBpZiAoc3ViU2VsZWN0b3Iuc3RhcnRzV2l0aChcIipcIikgJiZcbiAgICAgICAgICAhaW5jb21wbGV0ZVByZWZpeFJlZ2V4cC50ZXN0KHByZWZpeCkpIHtcbiAgICAgICAgc3ViU2VsZWN0b3IgPSBzdWJTZWxlY3Rvci5zdWJzdHJpbmcoMSk7XG4gICAgICB9XG5cbiAgICAgIHlpZWxkIFtxdWFsaWZ5U2VsZWN0b3Ioc3ViU2VsZWN0b3IsIHByZWZpeCksIHN1YnRyZWVdO1xuICAgIH1cbiAgfVxuXG4gIHNldFN0eWxlcyhzdHlsZXMpIHtcbiAgICB0aGlzLl9zdWJTZWxlY3RvcnMgPSBbXTtcbiAgICBmb3IgKGxldCBzdHlsZSBvZiBzdHlsZXMpIHtcbiAgICAgIGlmICh0aGlzLl9yZWdleHAudGVzdChzdHlsZS5zdHlsZSkpIHtcbiAgICAgICAgZm9yIChsZXQgc3ViU2VsZWN0b3Igb2Ygc3R5bGUuc3ViU2VsZWN0b3JzKSB7XG4gICAgICAgICAgbGV0IGlkeCA9IHN1YlNlbGVjdG9yLmxhc3RJbmRleE9mKFwiOjpcIik7XG4gICAgICAgICAgaWYgKGlkeCAhPSAtMSkge1xuICAgICAgICAgICAgc3ViU2VsZWN0b3IgPSBzdWJTZWxlY3Rvci5zdWJzdHJpbmcoMCwgaWR4KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLl9zdWJTZWxlY3RvcnMucHVzaChzdWJTZWxlY3Rvcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgUGF0dGVybiB7XG4gIGNvbnN0cnVjdG9yKHNlbGVjdG9ycywgdGV4dCwgcmVtb3ZlID0gZmFsc2UsIGNzcyA9IG51bGwpIHtcbiAgICB0aGlzLnNlbGVjdG9ycyA9IHNlbGVjdG9ycztcbiAgICB0aGlzLnRleHQgPSB0ZXh0O1xuICAgIHRoaXMucmVtb3ZlID0gcmVtb3ZlO1xuICAgIHRoaXMuY3NzID0gY3NzO1xuICB9XG5cbiAgZ2V0IGRlcGVuZHNPblN0eWxlcygpIHtcbiAgICByZXR1cm4gZ2V0Q2FjaGVkUHJvcGVydHlWYWx1ZShcbiAgICAgIHRoaXMsIFwiX2RlcGVuZHNPblN0eWxlc1wiLCAoKSA9PiB0aGlzLnNlbGVjdG9ycy5zb21lKFxuICAgICAgICBzZWxlY3RvciA9PiBzZWxlY3Rvci5kZXBlbmRzT25TdHlsZXNcbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgZ2V0IG1heWJlRGVwZW5kc09uQXR0cmlidXRlcygpIHtcbiAgICAvLyBPYnNlcnZlIGNoYW5nZXMgdG8gYXR0cmlidXRlcyBpZiBlaXRoZXIgdGhlcmUncyBhIHBsYWluIHNlbGVjdG9yIHRoYXRcbiAgICAvLyBsb29rcyBsaWtlIGFuIElEIHNlbGVjdG9yLCBjbGFzcyBzZWxlY3Rvciwgb3IgYXR0cmlidXRlIHNlbGVjdG9yIGluIG9uZVxuICAgIC8vIG9mIHRoZSBwYXR0ZXJucyAoZS5nLiBcImFbaHJlZj0naHR0cHM6Ly9leGFtcGxlLmNvbS8nXVwiKVxuICAgIC8vIG9yIHRoZXJlJ3MgYSBwcm9wZXJ0aWVzIHNlbGVjdG9yIG5lc3RlZCBpbnNpZGUgYSBoYXMgc2VsZWN0b3JcbiAgICAvLyAoZS5nLiBcImRpdjotYWJwLWhhcyg6LWFicC1wcm9wZXJ0aWVzKGNvbG9yOiBibHVlKSlcIilcbiAgICByZXR1cm4gZ2V0Q2FjaGVkUHJvcGVydHlWYWx1ZShcbiAgICAgIHRoaXMsIFwiX21heWJlRGVwZW5kc09uQXR0cmlidXRlc1wiLCAoKSA9PiB0aGlzLnNlbGVjdG9ycy5zb21lKFxuICAgICAgICBzZWxlY3RvciA9PiBzZWxlY3Rvci5tYXliZURlcGVuZHNPbkF0dHJpYnV0ZXMgfHxcbiAgICAgICAgICAgICAgICAgICAgKHNlbGVjdG9yIGluc3RhbmNlb2YgSGFzU2VsZWN0b3IgJiZcbiAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yLmRlcGVuZHNPblN0eWxlcylcbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgZ2V0IGRlcGVuZHNPbkNoYXJhY3RlckRhdGEoKSB7XG4gICAgLy8gT2JzZXJ2ZSBjaGFuZ2VzIHRvIGNoYXJhY3RlciBkYXRhIG9ubHkgaWYgdGhlcmUncyBhIGNvbnRhaW5zIHNlbGVjdG9yIGluXG4gICAgLy8gb25lIG9mIHRoZSBwYXR0ZXJucy5cbiAgICByZXR1cm4gZ2V0Q2FjaGVkUHJvcGVydHlWYWx1ZShcbiAgICAgIHRoaXMsIFwiX2RlcGVuZHNPbkNoYXJhY3RlckRhdGFcIiwgKCkgPT4gdGhpcy5zZWxlY3RvcnMuc29tZShcbiAgICAgICAgc2VsZWN0b3IgPT4gc2VsZWN0b3IuZGVwZW5kc09uQ2hhcmFjdGVyRGF0YVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuICBnZXQgbWF5YmVDb250YWluc1NpYmxpbmdDb21iaW5hdG9ycygpIHtcbiAgICByZXR1cm4gZ2V0Q2FjaGVkUHJvcGVydHlWYWx1ZShcbiAgICAgIHRoaXMsIFwiX21heWJlQ29udGFpbnNTaWJsaW5nQ29tYmluYXRvcnNcIiwgKCkgPT4gdGhpcy5zZWxlY3RvcnMuc29tZShcbiAgICAgICAgc2VsZWN0b3IgPT4gc2VsZWN0b3IubWF5YmVDb250YWluc1NpYmxpbmdDb21iaW5hdG9yc1xuICAgICAgKVxuICAgICk7XG4gIH1cblxuICBtYXRjaGVzTXV0YXRpb25UeXBlcyhtdXRhdGlvblR5cGVzKSB7XG4gICAgbGV0IG11dGF0aW9uVHlwZU1hdGNoTWFwID0gZ2V0Q2FjaGVkUHJvcGVydHlWYWx1ZShcbiAgICAgIHRoaXMsIFwiX211dGF0aW9uVHlwZU1hdGNoTWFwXCIsICgpID0+IG5ldyBNYXAoW1xuICAgICAgICAvLyBBbGwgdHlwZXMgb2YgRE9NLWRlcGVuZGVudCBwYXR0ZXJucyBhcmUgYWZmZWN0ZWQgYnkgbXV0YXRpb25zIG9mXG4gICAgICAgIC8vIHR5cGUgXCJjaGlsZExpc3RcIi5cbiAgICAgICAgW1wiY2hpbGRMaXN0XCIsIHRydWVdLFxuICAgICAgICBbXCJhdHRyaWJ1dGVzXCIsIHRoaXMubWF5YmVEZXBlbmRzT25BdHRyaWJ1dGVzXSxcbiAgICAgICAgW1wiY2hhcmFjdGVyRGF0YVwiLCB0aGlzLmRlcGVuZHNPbkNoYXJhY3RlckRhdGFdXG4gICAgICBdKVxuICAgICk7XG5cbiAgICBmb3IgKGxldCBtdXRhdGlvblR5cGUgb2YgbXV0YXRpb25UeXBlcykge1xuICAgICAgaWYgKG11dGF0aW9uVHlwZU1hdGNoTWFwLmdldChtdXRhdGlvblR5cGUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0b3IgZnVuY3Rpb24gcmV0dXJuaW5nIENTUyBzZWxlY3RvcnMgZm9yIGFsbCBlbGVtZW50cyB0aGF0XG4gICAqIG1hdGNoIHRoZSBwYXR0ZXJuLlxuICAgKlxuICAgKiBUaGlzIGFsbG93cyB0cmFuc2Zvcm1pbmcgZnJvbSBzZWxlY3RvcnMgdGhhdCBtYXkgY29udGFpbiBjdXN0b21cbiAgICogOi1hYnAtIHNlbGVjdG9ycyB0byBwdXJlIENTUyBzZWxlY3RvcnMgdGhhdCBjYW4gYmUgdXNlZCB0byBzZWxlY3RcbiAgICogZWxlbWVudHMuXG4gICAqXG4gICAqIFRoZSBzZWxlY3RvcnMgcmV0dXJuZWQgZnJvbSB0aGlzIGZ1bmN0aW9uIG1heSBiZSBpbnZhbGlkYXRlZCBieSBET01cbiAgICogbXV0YXRpb25zLlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IHN1YnRyZWUgdGhlIHN1YnRyZWUgd2Ugd29yayBvblxuICAgKiBAcGFyYW0ge05vZGVbXX0gW3RhcmdldHNdIHRoZSBub2RlcyB3ZSBhcmUgaW50ZXJlc3RlZCBpbi4gTWF5IGJlXG4gICAqIHVzZWQgdG8gb3B0aW1pemUgc2VhcmNoLlxuICAgKi9cbiAgKmV2YWx1YXRlKHN1YnRyZWUsIHRhcmdldHMpIHtcbiAgICBsZXQgc2VsZWN0b3JzID0gdGhpcy5zZWxlY3RvcnM7XG4gICAgZnVuY3Rpb24qIGV2YWx1YXRlSW5uZXIoaW5kZXgsIHByZWZpeCwgY3VycmVudFN1YnRyZWUpIHtcbiAgICAgIGlmIChpbmRleCA+PSBzZWxlY3RvcnMubGVuZ3RoKSB7XG4gICAgICAgIHlpZWxkIHByZWZpeDtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgW3NlbGVjdG9yLCBlbGVtZW50XSBvZiBzZWxlY3RvcnNbaW5kZXhdLmdldFNlbGVjdG9ycyhcbiAgICAgICAgcHJlZml4LCBjdXJyZW50U3VidHJlZSwgdGFyZ2V0c1xuICAgICAgKSkge1xuICAgICAgICBpZiAoc2VsZWN0b3IgPT0gbnVsbCkge1xuICAgICAgICAgIHlpZWxkIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgeWllbGQqIGV2YWx1YXRlSW5uZXIoaW5kZXggKyAxLCBzZWxlY3RvciwgZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEp1c3QgaW4gY2FzZSB0aGUgZ2V0U2VsZWN0b3JzKCkgZ2VuZXJhdG9yIGFib3ZlIGhhZCB0byBydW4gc29tZSBoZWF2eVxuICAgICAgLy8gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgpIGNhbGwgd2hpY2ggZGlkbid0IHByb2R1Y2UgYW55IHJlc3VsdHMsIG1ha2VcbiAgICAgIC8vIHN1cmUgdGhlcmUgaXMgYXQgbGVhc3Qgb25lIHBvaW50IHdoZXJlIGV4ZWN1dGlvbiBjYW4gcGF1c2UuXG4gICAgICB5aWVsZCBudWxsO1xuICAgIH1cbiAgICB5aWVsZCogZXZhbHVhdGVJbm5lcigwLCBcIlwiLCBzdWJ0cmVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgYSBwYXR0ZXJuIG1hdGNoZXMgYSBzcGVjaWZpYyBlbGVtZW50XG4gICAqIEBwYXJhbSB7Tm9kZX0gW3RhcmdldF0gdGhlIGVsZW1lbnQgd2UncmUgaW50ZXJlc3RlZCBpbiBjaGVja2luZyBmb3JcbiAgICogbWF0Y2hlcyBvbi5cbiAgICogQHBhcmFtIHtOb2RlfSBzdWJ0cmVlIHRoZSBzdWJ0cmVlIHdlIHdvcmsgb25cbiAgICogQHJldHVybiB7Ym9vbH1cbiAgICovXG4gIG1hdGNoZXModGFyZ2V0LCBzdWJ0cmVlKSB7XG4gICAgbGV0IHRhcmdldEZpbHRlciA9IFt0YXJnZXRdO1xuICAgIGlmICh0aGlzLm1heWJlQ29udGFpbnNTaWJsaW5nQ29tYmluYXRvcnMpIHtcbiAgICAgIHRhcmdldEZpbHRlciA9IG51bGw7XG4gICAgfVxuXG4gICAgbGV0IHNlbGVjdG9yR2VuZXJhdG9yID0gdGhpcy5ldmFsdWF0ZShzdWJ0cmVlLCB0YXJnZXRGaWx0ZXIpO1xuICAgIGZvciAobGV0IHNlbGVjdG9yIG9mIHNlbGVjdG9yR2VuZXJhdG9yKSB7XG4gICAgICBpZiAoc2VsZWN0b3IgJiYgdGFyZ2V0Lm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzZXRTdHlsZXMoc3R5bGVzKSB7XG4gICAgZm9yIChsZXQgc2VsZWN0b3Igb2YgdGhpcy5zZWxlY3RvcnMpIHtcbiAgICAgIGlmIChzZWxlY3Rvci5kZXBlbmRzT25TdHlsZXMpIHtcbiAgICAgICAgc2VsZWN0b3Iuc2V0U3R5bGVzKHN0eWxlcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RNdXRhdGlvblR5cGVzKG11dGF0aW9ucykge1xuICBsZXQgdHlwZXMgPSBuZXcgU2V0KCk7XG5cbiAgZm9yIChsZXQgbXV0YXRpb24gb2YgbXV0YXRpb25zKSB7XG4gICAgdHlwZXMuYWRkKG11dGF0aW9uLnR5cGUpO1xuXG4gICAgLy8gVGhlcmUgYXJlIG9ubHkgMyB0eXBlcyBvZiBtdXRhdGlvbnM6IFwiYXR0cmlidXRlc1wiLCBcImNoYXJhY3RlckRhdGFcIiwgYW5kXG4gICAgLy8gXCJjaGlsZExpc3RcIi5cbiAgICBpZiAodHlwZXMuc2l6ZSA9PSAzKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHlwZXM7XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RNdXRhdGlvblRhcmdldHMobXV0YXRpb25zKSB7XG4gIGlmICghbXV0YXRpb25zKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBsZXQgdGFyZ2V0cyA9IG5ldyBTZXQoKTtcblxuICBmb3IgKGxldCBtdXRhdGlvbiBvZiBtdXRhdGlvbnMpIHtcbiAgICBpZiAobXV0YXRpb24udHlwZSA9PSBcImNoaWxkTGlzdFwiKSB7XG4gICAgICAvLyBXaGVuIG5ldyBub2RlcyBhcmUgYWRkZWQsIHdlJ3JlIGludGVyZXN0ZWQgaW4gdGhlIGFkZGVkIG5vZGVzIHJhdGhlclxuICAgICAgLy8gdGhhbiB0aGUgcGFyZW50LlxuICAgICAgZm9yIChsZXQgbm9kZSBvZiBtdXRhdGlvbi5hZGRlZE5vZGVzKSB7XG4gICAgICAgIHRhcmdldHMuYWRkKG5vZGUpO1xuICAgICAgfVxuICAgICAgaWYgKG11dGF0aW9uLnJlbW92ZWROb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRhcmdldHMuYWRkKG11dGF0aW9uLnRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGFyZ2V0cy5hZGQobXV0YXRpb24udGFyZ2V0KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gWy4uLnRhcmdldHNdO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJQYXR0ZXJucyhwYXR0ZXJucywge3N0eWxlc2hlZXRzLCBtdXRhdGlvbnN9KSB7XG4gIGlmICghc3R5bGVzaGVldHMgJiYgIW11dGF0aW9ucykge1xuICAgIHJldHVybiBwYXR0ZXJucy5zbGljZSgpO1xuICB9XG5cbiAgbGV0IG11dGF0aW9uVHlwZXMgPSBtdXRhdGlvbnMgPyBleHRyYWN0TXV0YXRpb25UeXBlcyhtdXRhdGlvbnMpIDogbnVsbDtcblxuICByZXR1cm4gcGF0dGVybnMuZmlsdGVyKFxuICAgIHBhdHRlcm4gPT4gKHN0eWxlc2hlZXRzICYmIHBhdHRlcm4uZGVwZW5kc09uU3R5bGVzKSB8fFxuICAgICAgICAgICAgICAgKG11dGF0aW9ucyAmJiBwYXR0ZXJuLm1hdGNoZXNNdXRhdGlvblR5cGVzKG11dGF0aW9uVHlwZXMpKVxuICApO1xufVxuXG5mdW5jdGlvbiBzaG91bGRPYnNlcnZlQXR0cmlidXRlcyhwYXR0ZXJucykge1xuICByZXR1cm4gcGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4ubWF5YmVEZXBlbmRzT25BdHRyaWJ1dGVzKTtcbn1cblxuZnVuY3Rpb24gc2hvdWxkT2JzZXJ2ZUNoYXJhY3RlckRhdGEocGF0dGVybnMpIHtcbiAgcmV0dXJuIHBhdHRlcm5zLnNvbWUocGF0dGVybiA9PiBwYXR0ZXJuLmRlcGVuZHNPbkNoYXJhY3RlckRhdGEpO1xufVxuXG5mdW5jdGlvbiBzaG91bGRPYnNlcnZlU3R5bGVzKHBhdHRlcm5zKSB7XG4gIHJldHVybiBwYXR0ZXJucy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi5kZXBlbmRzT25TdHlsZXMpO1xufVxuXG4vKipcbiAqIEBjYWxsYmFjayBoaWRlRWxlbXNGdW5jXG4gKiBAcGFyYW0ge05vZGVbXX0gZWxlbWVudHMgRWxlbWVudHMgb24gdGhlIHBhZ2UgdGhhdCBzaG91bGQgYmUgaGlkZGVuXG4gKiBAcGFyYW0ge3N0cmluZ1tdfSBlbGVtZW50RmlsdGVyc1xuICogICBUaGUgZmlsdGVyIHRleHQgdGhhdCBjYXVzZWQgdGhlIGVsZW1lbnRzIHRvIGJlIGhpZGRlblxuICovXG5cbi8qKlxuICogQGNhbGxiYWNrIHVuaGlkZUVsZW1zRnVuY1xuICogQHBhcmFtIHtOb2RlW119IGVsZW1lbnRzIEVsZW1lbnRzIG9uIHRoZSBwYWdlIHRoYXQgc2hvdWxkIGJlIGhpZGRlblxuICovXG5cbi8qKlxuICogQGNhbGxiYWNrIHJlbW92ZUVsZW1zRnVuY1xuICogQHBhcmFtIHtOb2RlW119IGVsZW1lbnRzIEVsZW1lbnRzIG9uIHRoZSBwYWdlIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWRcbiAqIEBwYXJhbSB7c3RyaW5nW119IGVsZW1lbnRGaWx0ZXJzXG4gKiAgIFRoZSBmaWx0ZXIgdGV4dCB0aGF0IGNhdXNlZCB0aGUgZWxlbWVudHMgdG8gYmUgcmVtb3ZlZFxuICogcmVtb3ZlZCBmcm9tIHRoZSBET01cbiAqL1xuXG4vKipcbiAqIEBjYWxsYmFjayBjc3NFbGVtc0Z1bmNcbiAqIEBwYXJhbSB7Tm9kZVtdfSBlbGVtZW50cyBFbGVtZW50cyBvbiB0aGUgcGFnZSB0aGF0IHNob3VsZFxuICogYXBwbHkgaW5saW5lIENTUyBydWxlc1xuICogQHBhcmFtIHtzdHJpbmdbXX0gY3NzUGF0dGVybnMgVGhlIENTUyBwYXR0ZXJucyB0byBiZSBhcHBsaWVkXG4gKi9cblxuXG4vKipcbiAqIE1hbmFnZXMgdGhlIGZyb250LWVuZCBwcm9jZXNzaW5nIG9mIGVsZW1lbnQgaGlkaW5nIGVtdWxhdGlvbiBmaWx0ZXJzLlxuICovXG5leHBvcnRzLkVsZW1IaWRlRW11bGF0aW9uID0gY2xhc3MgRWxlbUhpZGVFbXVsYXRpb24ge1xuICAvKipcbiAgICogQHBhcmFtIHttb2R1bGU6Y29udGVudC9lbGVtSGlkZUVtdWxhdGlvbn5oaWRlRWxlbXNGdW5jfSBoaWRlRWxlbXNGdW5jXG4gICAqICAgQSBjYWxsYmFjayB0aGF0IHNob3VsZCBiZSBwcm92aWRlZCB0byBkbyB0aGUgYWN0dWFsIGVsZW1lbnQgaGlkaW5nLlxuICAgKiBAcGFyYW0ge21vZHVsZTpjb250ZW50L2VsZW1IaWRlRW11bGF0aW9ufnVuaGlkZUVsZW1zRnVuY30gdW5oaWRlRWxlbXNGdW5jXG4gICAqICAgQSBjYWxsYmFjayB0aGF0IHNob3VsZCBiZSBwcm92aWRlZCB0byB1bmhpZGUgcHJldmlvdXNseSBoaWRkZW4gZWxlbWVudHMuXG4gICAqIEBwYXJhbSB7bW9kdWxlOmNvbnRlbnQvZWxlbUhpZGVFbXVsYXRpb25+cmVtb3ZlRWxlbXNGdW5jfSByZW1vdmVFbGVtc0Z1bmNcbiAgICogICBBIGNhbGxiYWNrIHRoYXQgc2hvdWxkIGJlIHByb3ZpZGVkIHRvIHJlbW92ZSBlbGVtZW50cyBmcm9tIHRoZSBET00uXG4gICAqIEBwYXJhbSB7bW9kdWxlOmNvbnRlbnQvZWxlbUhpZGVFbXVsYXRpb25+Y3NzRWxlbXNGdW5jfSBjc3NFbGVtc0Z1bmNcbiAgICogICBBIGNhbGxiYWNrIHRoYXQgc2hvdWxkIGJlIHByb3ZpZGVkIHRvIGFwcGx5IGlubGluZSBDU1MgcnVsZXMgdG8gZWxlbWVudHNcbiAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgaGlkZUVsZW1zRnVuYyA9ICgpID0+IHt9LFxuICAgIHVuaGlkZUVsZW1zRnVuYyA9ICgpID0+IHt9LFxuICAgIHJlbW92ZUVsZW1zRnVuYyA9ICgpID0+IHt9LFxuICAgIGNzc0VsZW1zRnVuYyA9ICgpID0+IHt9XG4gICkge1xuICAgIHRoaXMuX2ZpbHRlcmluZ0luUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICB0aGlzLl9uZXh0RmlsdGVyaW5nU2NoZWR1bGVkID0gZmFsc2U7XG4gICAgdGhpcy5fbGFzdEludm9jYXRpb24gPSAtbWluSW52b2NhdGlvbkludGVydmFsO1xuICAgIHRoaXMuX3NjaGVkdWxlZFByb2Nlc3NpbmcgPSBudWxsO1xuXG4gICAgdGhpcy5kb2N1bWVudCA9IGRvY3VtZW50O1xuICAgIHRoaXMuaGlkZUVsZW1zRnVuYyA9IGhpZGVFbGVtc0Z1bmM7XG4gICAgdGhpcy51bmhpZGVFbGVtc0Z1bmMgPSB1bmhpZGVFbGVtc0Z1bmM7XG4gICAgdGhpcy5yZW1vdmVFbGVtc0Z1bmMgPSByZW1vdmVFbGVtc0Z1bmM7XG4gICAgdGhpcy5jc3NFbGVtc0Z1bmMgPSBjc3NFbGVtc0Z1bmM7XG4gICAgdGhpcy5vYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHRoaXMub2JzZXJ2ZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmhpZGRlbkVsZW1lbnRzID0gbmV3IE1hcCgpO1xuICB9XG5cbiAgaXNTYW1lT3JpZ2luKHN0eWxlc2hlZXQpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG5ldyBVUkwoc3R5bGVzaGVldC5ocmVmKS5vcmlnaW4gPT0gdGhpcy5kb2N1bWVudC5sb2NhdGlvbi5vcmlnaW47XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAvLyBJbnZhbGlkIFVSTCwgYXNzdW1lIHRoYXQgaXQgaXMgZmlyc3QtcGFydHkuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgdGhlIHNlbGVjdG9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciB0aGUgc2VsZWN0b3IgdG8gcGFyc2VcbiAgICogQHJldHVybiB7QXJyYXl9IHNlbGVjdG9ycyBpcyBhbiBhcnJheSBvZiBvYmplY3RzLFxuICAgKiBvciBudWxsIGluIGNhc2Ugb2YgZXJyb3JzLlxuICAgKi9cbiAgcGFyc2VTZWxlY3RvcihzZWxlY3Rvcikge1xuICAgIGlmIChzZWxlY3Rvci5sZW5ndGggPT0gMCkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGxldCBtYXRjaCA9IGFicFNlbGVjdG9yUmVnZXhwLmV4ZWMoc2VsZWN0b3IpO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybiBbbmV3IFBsYWluU2VsZWN0b3Ioc2VsZWN0b3IpXTtcbiAgICB9XG5cbiAgICBsZXQgc2VsZWN0b3JzID0gW107XG4gICAgaWYgKG1hdGNoLmluZGV4ID4gMCkge1xuICAgICAgc2VsZWN0b3JzLnB1c2gobmV3IFBsYWluU2VsZWN0b3Ioc2VsZWN0b3Iuc3Vic3RyaW5nKDAsIG1hdGNoLmluZGV4KSkpO1xuICAgIH1cblxuICAgIGxldCBzdGFydEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG4gICAgbGV0IGNvbnRlbnQgPSBwYXJzZVNlbGVjdG9yQ29udGVudChzZWxlY3Rvciwgc3RhcnRJbmRleCk7XG4gICAgaWYgKCFjb250ZW50KSB7XG4gICAgICBjb25zb2xlLndhcm4obmV3IFN5bnRheEVycm9yKFwiRmFpbGVkIHRvIHBhcnNlIEFkYmxvY2sgUGx1cyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBzZWxlY3RvciAke3NlbGVjdG9yfSBgICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJkdWUgdG8gdW5tYXRjaGVkIHBhcmVudGhlc2VzLlwiKSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAobWF0Y2hbMV0gPT0gXCItYWJwLXByb3BlcnRpZXNcIikge1xuICAgICAgc2VsZWN0b3JzLnB1c2gobmV3IFByb3BzU2VsZWN0b3IoY29udGVudC50ZXh0KSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKG1hdGNoWzFdID09IFwiLWFicC1oYXNcIiB8fCBtYXRjaFsxXSA9PSBcImhhc1wiKSB7XG4gICAgICBsZXQgaGFzU2VsZWN0b3JzID0gdGhpcy5wYXJzZVNlbGVjdG9yKGNvbnRlbnQudGV4dCk7XG4gICAgICBpZiAoaGFzU2VsZWN0b3JzID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICBzZWxlY3RvcnMucHVzaChuZXcgSGFzU2VsZWN0b3IoaGFzU2VsZWN0b3JzKSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKG1hdGNoWzFdID09IFwiLWFicC1jb250YWluc1wiIHx8IG1hdGNoWzFdID09IFwiaGFzLXRleHRcIikge1xuICAgICAgc2VsZWN0b3JzLnB1c2gobmV3IENvbnRhaW5zU2VsZWN0b3IoY29udGVudC50ZXh0KSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKG1hdGNoWzFdID09PSBcInhwYXRoXCIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHNlbGVjdG9ycy5wdXNoKG5ldyBYUGF0aFNlbGVjdG9yKGNvbnRlbnQudGV4dCkpO1xuICAgICAgfVxuICAgICAgY2F0Y2ggKHttZXNzYWdlfSkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgbmV3IFN5bnRheEVycm9yKFxuICAgICAgICAgICAgXCJGYWlsZWQgdG8gcGFyc2UgQWRibG9jayBQbHVzIFwiICtcbiAgICAgICAgICAgIGBzZWxlY3RvciAke3NlbGVjdG9yfSwgaW52YWxpZCBgICtcbiAgICAgICAgICAgIGB4cGF0aDogJHtjb250ZW50LnRleHR9IGAgK1xuICAgICAgICAgICAgYGVycm9yOiAke21lc3NhZ2V9LmBcbiAgICAgICAgICApXG4gICAgICAgICk7XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKG1hdGNoWzFdID09IFwibm90XCIpIHtcbiAgICAgIGxldCBub3RTZWxlY3RvcnMgPSB0aGlzLnBhcnNlU2VsZWN0b3IoY29udGVudC50ZXh0KTtcbiAgICAgIGlmIChub3RTZWxlY3RvcnMgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgYWxsIG9mIHRoZSBpbm5lciBzZWxlY3RvcnMgYXJlIFBsYWluU2VsZWN0b3JzLCB0aGVuIHdlXG4gICAgICAvLyBkb24ndCBhY3R1YWxseSBuZWVkIHRvIHVzZSBvdXIgc2VsZWN0b3IgYXQgYWxsLiBXZSdyZSBiZXR0ZXJcbiAgICAgIC8vIG9mZiBkZWxlZ2F0aW5nIHRvIHRoZSBicm93c2VyIDpub3QgaW1wbGVtZW50YXRpb24uXG4gICAgICBpZiAobm90U2VsZWN0b3JzLmV2ZXJ5KHMgPT4gcyBpbnN0YW5jZW9mIFBsYWluU2VsZWN0b3IpKSB7XG4gICAgICAgIHNlbGVjdG9ycy5wdXNoKG5ldyBQbGFpblNlbGVjdG9yKGA6bm90KCR7Y29udGVudC50ZXh0fSlgKSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2VsZWN0b3JzLnB1c2gobmV3IE5vdFNlbGVjdG9yKG5vdFNlbGVjdG9ycykpO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIHRoaXMgaXMgYW4gZXJyb3IsIGNhbid0IHBhcnNlIHNlbGVjdG9yLlxuICAgICAgY29uc29sZS53YXJuKG5ldyBTeW50YXhFcnJvcihcIkZhaWxlZCB0byBwYXJzZSBBZGJsb2NrIFBsdXMgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgc2VsZWN0b3IgJHtzZWxlY3Rvcn0sIGludmFsaWQgYCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBwc2V1ZG8tY2xhc3MgOiR7bWF0Y2hbMV19KCkuYCkpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IHN1ZmZpeCA9IHRoaXMucGFyc2VTZWxlY3RvcihzZWxlY3Rvci5zdWJzdHJpbmcoY29udGVudC5lbmQgKyAxKSk7XG4gICAgaWYgKHN1ZmZpeCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBzZWxlY3RvcnMucHVzaCguLi5zdWZmaXgpO1xuXG4gICAgaWYgKHNlbGVjdG9ycy5sZW5ndGggPT0gMSAmJiBzZWxlY3RvcnNbMF0gaW5zdGFuY2VvZiBDb250YWluc1NlbGVjdG9yKSB7XG4gICAgICBjb25zb2xlLndhcm4obmV3IFN5bnRheEVycm9yKFwiRmFpbGVkIHRvIHBhcnNlIEFkYmxvY2sgUGx1cyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBzZWxlY3RvciAke3NlbGVjdG9yfSwgY2FuJ3QgYCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiaGF2ZSBhIGxvbmVseSA6LWFicC1jb250YWlucygpLlwiKSk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGVjdG9ycztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWFkcyB0aGUgcnVsZXMgb3V0IG9mIENTUyBzdHlsZXNoZWV0c1xuICAgKiBAcGFyYW0ge0NTU1N0eWxlU2hlZXRbXX0gW3N0eWxlc2hlZXRzXSBUaGUgbGlzdCBvZiBzdHlsZXNoZWV0cyB0b1xuICAgKiByZWFkLlxuICAgKiBAcmV0dXJuIHtDU1NTdHlsZVJ1bGVbXX1cbiAgICovXG4gIF9yZWFkQ3NzUnVsZXMoc3R5bGVzaGVldHMpIHtcbiAgICBsZXQgY3NzU3R5bGVzID0gW107XG5cbiAgICBmb3IgKGxldCBzdHlsZXNoZWV0IG9mIHN0eWxlc2hlZXRzIHx8IFtdKSB7XG4gICAgICAvLyBFeHBsaWNpdGx5IGlnbm9yZSB0aGlyZC1wYXJ0eSBzdHlsZXNoZWV0cyB0byBlbnN1cmUgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAgLy8gYmV0d2VlbiBGaXJlZm94IGFuZCBDaHJvbWUuXG4gICAgICBpZiAoIXRoaXMuaXNTYW1lT3JpZ2luKHN0eWxlc2hlZXQpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBsZXQgcnVsZXM7XG4gICAgICB0cnkge1xuICAgICAgICBydWxlcyA9IHN0eWxlc2hlZXQuY3NzUnVsZXM7XG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICAvLyBPbiBGaXJlZm94LCB0aGVyZSBpcyBhIGNoYW5jZSB0aGF0IGFuIEludmFsaWRBY2Nlc3NFcnJvclxuICAgICAgICAvLyBnZXQgdGhyb3duIHdoZW4gYWNjZXNzaW5nIGNzc1J1bGVzLiBKdXN0IHNraXAgdGhlIHN0eWxlc2hlZXRcbiAgICAgICAgLy8gaW4gdGhhdCBjYXNlLlxuICAgICAgICAvLyBTZWUgaHR0cHM6Ly9zZWFyY2hmb3gub3JnL21vemlsbGEtY2VudHJhbC9yZXYvZjY1ZDc1MjhlMzRlZjFhNzY2NWI0YTFhN2I3Y2RiMTM4OGZjZDNhYS9sYXlvdXQvc3R5bGUvU3R5bGVTaGVldC5jcHAjNjk5XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXJ1bGVzKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgICAgIGlmIChydWxlLnR5cGUgIT0gcnVsZS5TVFlMRV9SVUxFKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBjc3NTdHlsZXMucHVzaChzdHJpbmdpZnlTdHlsZShydWxlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjc3NTdHlsZXM7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIHRoZSBjdXJyZW50IGRvY3VtZW50IGFuZCBhcHBsaWVzIGFsbCBydWxlcyB0byBpdC5cbiAgICogQHBhcmFtIHtDU1NTdHlsZVNoZWV0W119IFtzdHlsZXNoZWV0c11cbiAgICogICAgVGhlIGxpc3Qgb2YgbmV3IHN0eWxlc2hlZXRzIHRoYXQgaGF2ZSBiZWVuIGFkZGVkIHRvIHRoZSBkb2N1bWVudCBhbmRcbiAgICogICAgbWFkZSByZXByb2Nlc3NpbmcgbmVjZXNzYXJ5LiBUaGlzIHBhcmFtZXRlciBzaG91bGRuJ3QgYmUgcGFzc2VkIGluIGZvclxuICAgKiAgICB0aGUgaW5pdGlhbCBwcm9jZXNzaW5nLCBhbGwgb2YgZG9jdW1lbnQncyBzdHlsZXNoZWV0cyB3aWxsIGJlIGNvbnNpZGVyZWRcbiAgICogICAgdGhlbiBhbmQgYWxsIHJ1bGVzLCBpbmNsdWRpbmcgdGhlIG9uZXMgbm90IGRlcGVuZGVudCBvbiBzdHlsZXMuXG4gICAqIEBwYXJhbSB7TXV0YXRpb25SZWNvcmRbXX0gW211dGF0aW9uc11cbiAgICogICAgVGhlIGxpc3Qgb2YgRE9NIG11dGF0aW9ucyB0aGF0IGhhdmUgYmVlbiBhcHBsaWVkIHRvIHRoZSBkb2N1bWVudCBhbmRcbiAgICogICAgbWFkZSByZXByb2Nlc3NpbmcgbmVjZXNzYXJ5LiBUaGlzIHBhcmFtZXRlciBzaG91bGRuJ3QgYmUgcGFzc2VkIGluIGZvclxuICAgKiAgICB0aGUgaW5pdGlhbCBwcm9jZXNzaW5nLCB0aGUgZW50aXJlIGRvY3VtZW50IHdpbGwgYmUgY29uc2lkZXJlZFxuICAgKiAgICB0aGVuIGFuZCBhbGwgcnVsZXMsIGluY2x1ZGluZyB0aGUgb25lcyBub3QgZGVwZW5kZW50IG9uIHRoZSBET00uXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqICAgIEEgcHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCBvbmNlIGFsbCBmaWx0ZXJpbmcgaXMgY29tcGxldGVkXG4gICAqL1xuICBhc3luYyBfYWRkU2VsZWN0b3JzKHN0eWxlc2hlZXRzLCBtdXRhdGlvbnMpIHtcbiAgICBpZiAodGVzdEluZm8pIHtcbiAgICAgIHRlc3RJbmZvLmxhc3RQcm9jZXNzZWRFbGVtZW50cy5jbGVhcigpO1xuICAgIH1cblxuICAgIGxldCBkZWFkbGluZSA9IG5ld0lkbGVEZWFkbGluZSgpO1xuXG4gICAgaWYgKHNob3VsZE9ic2VydmVTdHlsZXModGhpcy5wYXR0ZXJucykpIHtcbiAgICAgIHRoaXMuX3JlZnJlc2hQYXR0ZXJuU3R5bGVzKCk7XG4gICAgfVxuXG4gICAgbGV0IHBhdHRlcm5zVG9DaGVjayA9IGZpbHRlclBhdHRlcm5zKFxuICAgICAgdGhpcy5wYXR0ZXJucywge3N0eWxlc2hlZXRzLCBtdXRhdGlvbnN9XG4gICAgKTtcblxuICAgIGxldCB0YXJnZXRzID0gZXh0cmFjdE11dGF0aW9uVGFyZ2V0cyhtdXRhdGlvbnMpO1xuXG4gICAgY29uc3QgZWxlbWVudHNUb0hpZGUgPSBbXTtcbiAgICBjb25zdCBlbGVtZW50c1RvSGlkZUZpbHRlcnMgPSBbXTtcbiAgICBjb25zdCBlbGVtZW50c1RvUmVtb3ZlRmlsdGVycyA9IFtdO1xuICAgIGNvbnN0IGVsZW1lbnRzVG9SZW1vdmUgPSBbXTtcbiAgICBjb25zdCBlbGVtZW50c1RvQXBwbHlDU1MgPSBbXTtcbiAgICBjb25zdCBjc3NQYXR0ZXJucyA9IFtdO1xuICAgIGxldCBlbGVtZW50c1RvVW5oaWRlID0gbmV3IFNldCh0aGlzLmhpZGRlbkVsZW1lbnRzLmtleXMoKSk7XG4gICAgZm9yIChsZXQgcGF0dGVybiBvZiBwYXR0ZXJuc1RvQ2hlY2spIHtcbiAgICAgIGxldCBldmFsdWF0aW9uVGFyZ2V0cyA9IHRhcmdldHM7XG5cbiAgICAgIC8vIElmIHRoZSBwYXR0ZXJuIGFwcGVhcnMgdG8gY29udGFpbiBhbnkgc2libGluZyBjb21iaW5hdG9ycywgd2UgY2FuJ3RcbiAgICAgIC8vIGVhc2lseSBvcHRpbWl6ZSBiYXNlZCBvbiB0aGUgbXV0YXRpb24gdGFyZ2V0cy4gU2luY2UgdGhpcyBpcyBhXG4gICAgICAvLyBzcGVjaWFsIGNhc2UsIHNraXAgdGhlIG9wdGltaXphdGlvbi4gQnkgc2V0dGluZyBpdCB0byBudWxsIGhlcmUgd2VcbiAgICAgIC8vIG1ha2Ugc3VyZSB3ZSBwcm9jZXNzIHRoZSBlbnRpcmUgRE9NLlxuICAgICAgaWYgKHBhdHRlcm4ubWF5YmVDb250YWluc1NpYmxpbmdDb21iaW5hdG9ycykge1xuICAgICAgICBldmFsdWF0aW9uVGFyZ2V0cyA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGxldCBnZW5lcmF0b3IgPSBwYXR0ZXJuLmV2YWx1YXRlKHRoaXMuZG9jdW1lbnQsIGV2YWx1YXRpb25UYXJnZXRzKTtcbiAgICAgIGZvciAobGV0IHNlbGVjdG9yIG9mIGdlbmVyYXRvcikge1xuICAgICAgICBpZiAoc2VsZWN0b3IgIT0gbnVsbCkge1xuICAgICAgICAgIGZvciAobGV0IGVsZW1lbnQgb2YgdGhpcy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgaWYgKHBhdHRlcm4ucmVtb3ZlKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRzVG9SZW1vdmUucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgICAgZWxlbWVudHNUb1JlbW92ZUZpbHRlcnMucHVzaChwYXR0ZXJuLnRleHQpO1xuICAgICAgICAgICAgICBlbGVtZW50c1RvVW5oaWRlLmRlbGV0ZShlbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHBhdHRlcm4uY3NzKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRzVG9BcHBseUNTUy5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgICAgICBjc3NQYXR0ZXJucy5wdXNoKHBhdHRlcm4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIXRoaXMuaGlkZGVuRWxlbWVudHMuaGFzKGVsZW1lbnQpKSB7XG4gICAgICAgICAgICAgIGVsZW1lbnRzVG9IaWRlLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgICAgIGVsZW1lbnRzVG9IaWRlRmlsdGVycy5wdXNoKHBhdHRlcm4udGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgZWxlbWVudHNUb1VuaGlkZS5kZWxldGUoZWxlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRlYWRsaW5lLnRpbWVSZW1haW5pbmcoKSA8PSAwKSB7XG4gICAgICAgICAgZGVhZGxpbmUgPSBhd2FpdCB5aWVsZFRocmVhZCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3JlbW92ZUVsZW1zKGVsZW1lbnRzVG9SZW1vdmUsIGVsZW1lbnRzVG9SZW1vdmVGaWx0ZXJzKTtcbiAgICB0aGlzLl9hcHBseUNTU1RvRWxlbXMoZWxlbWVudHNUb0FwcGx5Q1NTLCBjc3NQYXR0ZXJucyk7XG4gICAgdGhpcy5faGlkZUVsZW1zKGVsZW1lbnRzVG9IaWRlLCBlbGVtZW50c1RvSGlkZUZpbHRlcnMpO1xuXG4gICAgLy8gVGhlIHNlYXJjaCBmb3IgZWxlbWVudHMgdG8gaGlkZSBpdCBvcHRpbWl6ZWQgdG8gZmluZCBuZXcgdGhpbmdzXG4gICAgLy8gdG8gaGlkZSBxdWlja2x5LCBieSBub3QgY2hlY2tpbmcgYWxsIHBhdHRlcm5zIGFuZCBub3QgY2hlY2tpbmdcbiAgICAvLyB0aGUgZnVsbCBET00uIFRoYXQncyB3aHkgd2UgbmVlZCB0byBkbyBhIG1vcmUgdGhvcm91Z2ggY2hlY2tcbiAgICAvLyBmb3IgZWFjaCByZW1haW5pbmcgZWxlbWVudCB0aGF0IG1pZ2h0IG5lZWQgdG8gYmUgdW5oaWRkZW4sXG4gICAgLy8gY2hlY2tpbmcgYWxsIHBhdHRlcm5zLlxuICAgIGZvciAobGV0IGVsZW0gb2YgZWxlbWVudHNUb1VuaGlkZSkge1xuICAgICAgaWYgKCFlbGVtLmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIC8vIGVsZW1lbnRzIHRoYXQgYXJlIG5vIGxvbmdlciBpbiB0aGUgRE9NIHNob3VsZCBiZSB1bmhpZGRlblxuICAgICAgICAvLyBpbiBjYXNlIHRoZXkncmUgZXZlciByZWFkZGVkLCBhbmQgdGhlbiBmb3Jnb3R0ZW4gYWJvdXQgc29cbiAgICAgICAgLy8gd2UgZG9uJ3QgY2F1c2UgYSBtZW1vcnkgbGVhay5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBsZXQgbWF0Y2hlc0FueSA9IHRoaXMucGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4ubWF0Y2hlcyhcbiAgICAgICAgZWxlbSwgdGhpcy5kb2N1bWVudFxuICAgICAgKSk7XG4gICAgICBpZiAobWF0Y2hlc0FueSkge1xuICAgICAgICBlbGVtZW50c1RvVW5oaWRlLmRlbGV0ZShlbGVtKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRlYWRsaW5lLnRpbWVSZW1haW5pbmcoKSA8PSAwKSB7XG4gICAgICAgIGRlYWRsaW5lID0gYXdhaXQgeWllbGRUaHJlYWQoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fdW5oaWRlRWxlbXMoQXJyYXkuZnJvbShlbGVtZW50c1RvVW5oaWRlKSk7XG4gIH1cblxuICBfcmVtb3ZlRWxlbXMoZWxlbWVudHNUb1JlbW92ZSwgZWxlbWVudEZpbHRlcnMpIHtcbiAgICBpZiAoZWxlbWVudHNUb1JlbW92ZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnJlbW92ZUVsZW1zRnVuYyhlbGVtZW50c1RvUmVtb3ZlLCBlbGVtZW50RmlsdGVycyk7XG4gICAgICBmb3IgKGxldCBlbGVtIG9mIGVsZW1lbnRzVG9SZW1vdmUpIHtcbiAgICAgICAgLy8gdGhleSdyZSBub3QgaGlkZGVuIGFueW1vcmUgKGlmIHRoZXkgZXZlciB3ZXJlKSwgdGhleSdyZVxuICAgICAgICAvLyByZW1vdmVkLiBUaGVyZSdzIG5vIHVuaGlkaW5nIHRoZXNlIG9uZXMhXG4gICAgICAgIHRoaXMuaGlkZGVuRWxlbWVudHMuZGVsZXRlKGVsZW0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIF9hcHBseUNTU1RvRWxlbXMoZWxlbWVudHMsIGNzc1BhdHRlcm5zKSB7XG4gICAgaWYgKGVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuY3NzRWxlbXNGdW5jKGVsZW1lbnRzLCBjc3NQYXR0ZXJucyk7XG4gICAgfVxuICB9XG5cbiAgX2hpZGVFbGVtcyhlbGVtZW50c1RvSGlkZSwgZWxlbWVudEZpbHRlcnMpIHtcbiAgICBpZiAoZWxlbWVudHNUb0hpZGUubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5oaWRlRWxlbXNGdW5jKGVsZW1lbnRzVG9IaWRlLCBlbGVtZW50RmlsdGVycyk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVsZW1lbnRzVG9IaWRlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuaGlkZGVuRWxlbWVudHMuc2V0KGVsZW1lbnRzVG9IaWRlW2ldLCBlbGVtZW50RmlsdGVyc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgX3VuaGlkZUVsZW1zKGVsZW1lbnRzVG9VbmhpZGUpIHtcbiAgICBpZiAoZWxlbWVudHNUb1VuaGlkZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLnVuaGlkZUVsZW1zRnVuYyhlbGVtZW50c1RvVW5oaWRlKTtcbiAgICAgIGZvciAobGV0IGVsZW0gb2YgZWxlbWVudHNUb1VuaGlkZSkge1xuICAgICAgICB0aGlzLmhpZGRlbkVsZW1lbnRzLmRlbGV0ZShlbGVtKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybWVkIGFueSBzY2hlZHVsZWQgcHJvY2Vzc2luZy5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBpcyBhc3luY3Jvbm91cywgYW5kIHNob3VsZCBub3QgYmUgcnVuIG11bHRpcGxlXG4gICAqIHRpbWVzIGluIHBhcmFsbGVsLiBUaGUgZmxhZyBgX2ZpbHRlcmluZ0luUHJvZ3Jlc3NgIGlzIHNldCBhbmRcbiAgICogdW5zZXQgc28geW91IGNhbiBjaGVjayBpZiBpdCdzIGFscmVhZHkgcnVubmluZy5cbiAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICogIEEgcHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCBvbmNlIGFsbCBmaWx0ZXJpbmcgaXMgY29tcGxldGVkXG4gICAqL1xuICBhc3luYyBfcHJvY2Vzc0ZpbHRlcmluZygpIHtcbiAgICBpZiAodGhpcy5fZmlsdGVyaW5nSW5Qcm9ncmVzcykge1xuICAgICAgY29uc29sZS53YXJuKFwiRWxlbUhpZGVFbXVsYXRpb24gc2NoZWR1bGluZyBlcnJvcjogXCIgK1xuICAgICAgICAgICAgICAgICAgIFwiVHJpZWQgdG8gcHJvY2VzcyBmaWx0ZXJpbmcgaW4gcGFyYWxsZWwuXCIpO1xuICAgICAgaWYgKHRlc3RJbmZvKSB7XG4gICAgICAgIHRlc3RJbmZvLmZhaWxlZEFzc2VydGlvbnMucHVzaChcbiAgICAgICAgICBcIlRyaWVkIHRvIHByb2Nlc3MgZmlsdGVyaW5nIGluIHBhcmFsbGVsXCJcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBwYXJhbXMgPSB0aGlzLl9zY2hlZHVsZWRQcm9jZXNzaW5nIHx8IHt9O1xuICAgIHRoaXMuX3NjaGVkdWxlZFByb2Nlc3NpbmcgPSBudWxsO1xuICAgIHRoaXMuX2ZpbHRlcmluZ0luUHJvZ3Jlc3MgPSB0cnVlO1xuICAgIHRoaXMuX25leHRGaWx0ZXJpbmdTY2hlZHVsZWQgPSBmYWxzZTtcbiAgICBhd2FpdCB0aGlzLl9hZGRTZWxlY3RvcnMoXG4gICAgICBwYXJhbXMuc3R5bGVzaGVldHMsXG4gICAgICBwYXJhbXMubXV0YXRpb25zXG4gICAgKTtcbiAgICB0aGlzLl9sYXN0SW52b2NhdGlvbiA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIHRoaXMuX2ZpbHRlcmluZ0luUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5fc2NoZWR1bGVkUHJvY2Vzc2luZykge1xuICAgICAgdGhpcy5fc2NoZWR1bGVOZXh0RmlsdGVyaW5nKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGVuZHMgbmV3IGNoYW5nZXMgdG8gdGhlIGxpc3Qgb2YgZmlsdGVycyBmb3IgdGhlIG5leHQgdGltZVxuICAgKiBmaWx0ZXJpbmcgaXMgcnVuLlxuICAgKiBAcGFyYW0ge0NTU1N0eWxlU2hlZXRbXX0gW3N0eWxlc2hlZXRzXVxuICAgKiAgICBuZXcgc3R5bGVzaGVldHMgdG8gYmUgcHJvY2Vzc2VkLiBUaGlzIHBhcmFtZXRlciBzaG91bGQgYmUgb21pdHRlZFxuICAgKiAgICBmb3IgZnVsbCByZXByb2Nlc3NpbmcuXG4gICAqIEBwYXJhbSB7TXV0YXRpb25SZWNvcmRbXX0gW211dGF0aW9uc11cbiAgICogICAgbmV3IERPTSBtdXRhdGlvbnMgdG8gYmUgcHJvY2Vzc2VkLiBUaGlzIHBhcmFtZXRlciBzaG91bGQgYmUgb21pdHRlZFxuICAgKiAgICBmb3IgZnVsbCByZXByb2Nlc3NpbmcuXG4gICAqL1xuICBfYXBwZW5kU2NoZWR1bGVkUHJvY2Vzc2luZyhzdHlsZXNoZWV0cywgbXV0YXRpb25zKSB7XG4gICAgaWYgKCF0aGlzLl9zY2hlZHVsZWRQcm9jZXNzaW5nKSB7XG4gICAgICAvLyBUaGVyZSBpc24ndCBhbnl0aGluZyBzY2hlZHVsZWQgeWV0LiBNYWtlIHRoZSBzY2hlZHVsZS5cbiAgICAgIHRoaXMuX3NjaGVkdWxlZFByb2Nlc3NpbmcgPSB7c3R5bGVzaGVldHMsIG11dGF0aW9uc307XG4gICAgfVxuICAgIGVsc2UgaWYgKCFzdHlsZXNoZWV0cyAmJiAhbXV0YXRpb25zKSB7XG4gICAgICAvLyBUaGUgbmV3IHJlcXVlc3Qgd2FzIHRvIHJlcHJvY2VzcyBldmVyeXRoaW5nLCBhbmQgc28gYW55XG4gICAgICAvLyBwcmV2aW91cyBmaWx0ZXJzIGFyZSBpcnJlbGV2YW50LlxuICAgICAgdGhpcy5fc2NoZWR1bGVkUHJvY2Vzc2luZyA9IHt9O1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9zY2hlZHVsZWRQcm9jZXNzaW5nLnN0eWxlc2hlZXRzIHx8XG4gICAgICAgICAgICAgdGhpcy5fc2NoZWR1bGVkUHJvY2Vzc2luZy5tdXRhdGlvbnMpIHtcbiAgICAgIC8vIFRoZSBwcmV2aW91cyBmaWx0ZXJzIGFyZSBub3QgdG8gZmlsdGVyIGV2ZXJ5dGhpbmcsIHNvIHRoZSBuZXdcbiAgICAgIC8vIHBhcmFtZXRlcnMgbWF0dGVyLiBQdXNoIHRoZW0gb250byB0aGUgYXBwcm9wcmlhdGUgbGlzdHMuXG4gICAgICBpZiAoc3R5bGVzaGVldHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9zY2hlZHVsZWRQcm9jZXNzaW5nLnN0eWxlc2hlZXRzKSB7XG4gICAgICAgICAgdGhpcy5fc2NoZWR1bGVkUHJvY2Vzc2luZy5zdHlsZXNoZWV0cyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3NjaGVkdWxlZFByb2Nlc3Npbmcuc3R5bGVzaGVldHMucHVzaCguLi5zdHlsZXNoZWV0cyk7XG4gICAgICB9XG4gICAgICBpZiAobXV0YXRpb25zKSB7XG4gICAgICAgIGlmICghdGhpcy5fc2NoZWR1bGVkUHJvY2Vzc2luZy5tdXRhdGlvbnMpIHtcbiAgICAgICAgICB0aGlzLl9zY2hlZHVsZWRQcm9jZXNzaW5nLm11dGF0aW9ucyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3NjaGVkdWxlZFByb2Nlc3NpbmcubXV0YXRpb25zLnB1c2goLi4ubXV0YXRpb25zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyB0aGlzLl9zY2hlZHVsZWRQcm9jZXNzaW5nIGlzIGFscmVhZHkgZ29pbmcgdG8gcmVjaGVja1xuICAgICAgLy8gZXZlcnl0aGluZywgc28gbm8gbmVlZCB0byBkbyBhbnl0aGluZyBoZXJlLlxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTY2hlZHVsZSBmaWx0ZXJpbmcgdG8gYmUgcHJvY2Vzc2VkIGluIHRoZSBmdXR1cmUsIG9yIHN0YXJ0XG4gICAqIHByb2Nlc3NpbmcgaW1tZWRpYXRlbHkuXG4gICAqXG4gICAqIElmIHByb2Nlc3NpbmcgaXMgYWxyZWFkeSBzY2hlZHVsZWQsIHRoaXMgZG9lcyBub3RoaW5nLlxuICAgKi9cbiAgX3NjaGVkdWxlTmV4dEZpbHRlcmluZygpIHtcbiAgICBpZiAodGhpcy5fbmV4dEZpbHRlcmluZ1NjaGVkdWxlZCB8fCB0aGlzLl9maWx0ZXJpbmdJblByb2dyZXNzKSB7XG4gICAgICAvLyBUaGUgbmV4dCBvbmUgaGFzIGFscmVhZHkgYmVlbiBzY2hlZHVsZWQuIE91ciBuZXcgZXZlbnRzIGFyZVxuICAgICAgLy8gb24gdGhlIHF1ZXVlLCBzbyBub3RoaW5nIG1vcmUgdG8gZG8uXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJsb2FkaW5nXCIpIHtcbiAgICAgIC8vIERvY3VtZW50IGlzbid0IGZ1bGx5IGxvYWRlZCB5ZXQsIHNvIHNjaGVkdWxlIG91ciBmaXJzdFxuICAgICAgLy8gZmlsdGVyaW5nIGFzIHNvb24gYXMgdGhhdCdzIGRvbmUuXG4gICAgICB0aGlzLmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgIFwiRE9NQ29udGVudExvYWRlZFwiLFxuICAgICAgICAoKSA9PiB0aGlzLl9wcm9jZXNzRmlsdGVyaW5nKCksXG4gICAgICAgIHtvbmNlOiB0cnVlfVxuICAgICAgKTtcbiAgICAgIHRoaXMuX25leHRGaWx0ZXJpbmdTY2hlZHVsZWQgPSB0cnVlO1xuICAgIH1cbiAgICBlbHNlIGlmIChwZXJmb3JtYW5jZS5ub3coKSAtIHRoaXMuX2xhc3RJbnZvY2F0aW9uIDxcbiAgICAgICAgICAgICBtaW5JbnZvY2F0aW9uSW50ZXJ2YWwpIHtcbiAgICAgIC8vIEl0IGhhc24ndCBiZWVuIGxvbmcgZW5vdWdoIHNpbmNlIG91ciBsYXN0IGZpbHRlci4gU2V0IHRoZVxuICAgICAgLy8gdGltZW91dCBmb3Igd2hlbiBpdCdzIHRpbWUgZm9yIHRoYXQuXG4gICAgICBzZXRUaW1lb3V0KFxuICAgICAgICAoKSA9PiB0aGlzLl9wcm9jZXNzRmlsdGVyaW5nKCksXG4gICAgICAgIG1pbkludm9jYXRpb25JbnRlcnZhbCAtIChwZXJmb3JtYW5jZS5ub3coKSAtIHRoaXMuX2xhc3RJbnZvY2F0aW9uKVxuICAgICAgKTtcbiAgICAgIHRoaXMuX25leHRGaWx0ZXJpbmdTY2hlZHVsZWQgPSB0cnVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIFdlIGNhbiBhY3R1YWxseSBqdXN0IHN0YXJ0IGZpbHRlcmluZyBpbW1lZGlhdGVseSFcbiAgICAgIHRoaXMuX3Byb2Nlc3NGaWx0ZXJpbmcoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmUtcnVuIGZpbHRlcmluZyBlaXRoZXIgaW1tZWRpYXRlbHkgb3IgcXVldWVkLlxuICAgKiBAcGFyYW0ge0NTU1N0eWxlU2hlZXRbXX0gW3N0eWxlc2hlZXRzXVxuICAgKiAgICBuZXcgc3R5bGVzaGVldHMgdG8gYmUgcHJvY2Vzc2VkLiBUaGlzIHBhcmFtZXRlciBzaG91bGQgYmUgb21pdHRlZFxuICAgKiAgICBmb3IgZnVsbCByZXByb2Nlc3NpbmcuXG4gICAqIEBwYXJhbSB7TXV0YXRpb25SZWNvcmRbXX0gW211dGF0aW9uc11cbiAgICogICAgbmV3IERPTSBtdXRhdGlvbnMgdG8gYmUgcHJvY2Vzc2VkLiBUaGlzIHBhcmFtZXRlciBzaG91bGQgYmUgb21pdHRlZFxuICAgKiAgICBmb3IgZnVsbCByZXByb2Nlc3NpbmcuXG4gICAqL1xuICBxdWV1ZUZpbHRlcmluZyhzdHlsZXNoZWV0cywgbXV0YXRpb25zKSB7XG4gICAgdGhpcy5fYXBwZW5kU2NoZWR1bGVkUHJvY2Vzc2luZyhzdHlsZXNoZWV0cywgbXV0YXRpb25zKTtcbiAgICB0aGlzLl9zY2hlZHVsZU5leHRGaWx0ZXJpbmcoKTtcbiAgfVxuXG4gIF9yZWZyZXNoUGF0dGVyblN0eWxlcyhzdHlsZXNoZWV0KSB7XG4gICAgbGV0IGFsbENzc1J1bGVzID0gdGhpcy5fcmVhZENzc1J1bGVzKHRoaXMuZG9jdW1lbnQuc3R5bGVTaGVldHMpO1xuICAgIGZvciAobGV0IHBhdHRlcm4gb2YgdGhpcy5wYXR0ZXJucykge1xuICAgICAgcGF0dGVybi5zZXRTdHlsZXMoYWxsQ3NzUnVsZXMpO1xuICAgIH1cbiAgfVxuXG4gIG9uTG9hZChldmVudCkge1xuICAgIGxldCBzdHlsZXNoZWV0ID0gZXZlbnQudGFyZ2V0LnNoZWV0O1xuICAgIGlmIChzdHlsZXNoZWV0KSB7XG4gICAgICB0aGlzLnF1ZXVlRmlsdGVyaW5nKFtzdHlsZXNoZWV0XSk7XG4gICAgfVxuICB9XG5cbiAgb2JzZXJ2ZShtdXRhdGlvbnMpIHtcbiAgICBpZiAodGVzdEluZm8pIHtcbiAgICAgIC8vIEluIHRlc3QgbW9kZSwgZmlsdGVyIG91dCBhbnkgbXV0YXRpb25zIGxpa2VseSBkb25lIGJ5IHVzXG4gICAgICAvLyAoaS5lLiBzdHlsZT1cImRpc3BsYXk6IG5vbmUgIWltcG9ydGFudFwiKS4gVGhpcyBtYWtlcyBpdCBlYXNpZXIgdG9cbiAgICAgIC8vIG9ic2VydmUgaG93IHRoZSBjb2RlIHJlc3BvbmRzIHRvIERPTSBtdXRhdGlvbnMuXG4gICAgICBtdXRhdGlvbnMgPSBtdXRhdGlvbnMuZmlsdGVyKFxuICAgICAgICAoe3R5cGUsIGF0dHJpYnV0ZU5hbWUsIHRhcmdldDoge3N0eWxlOiBuZXdWYWx1ZX0sIG9sZFZhbHVlfSkgPT5cbiAgICAgICAgICAhKHR5cGUgPT0gXCJhdHRyaWJ1dGVzXCIgJiYgYXR0cmlidXRlTmFtZSA9PSBcInN0eWxlXCIgJiZcbiAgICAgICAgICAgIG5ld1ZhbHVlLmRpc3BsYXkgPT0gXCJub25lXCIgJiZcbiAgICAgICAgICAgIHRvQ1NTU3R5bGVEZWNsYXJhdGlvbihvbGRWYWx1ZSkuZGlzcGxheSAhPSBcIm5vbmVcIilcbiAgICAgICk7XG5cbiAgICAgIGlmIChtdXRhdGlvbnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucXVldWVGaWx0ZXJpbmcobnVsbCwgbXV0YXRpb25zKTtcbiAgfVxuXG4gIGFwcGx5KHBhdHRlcm5zKSB7XG4gICAgaWYgKHRoaXMucGF0dGVybnMpIHtcbiAgICAgIGxldCByZW1vdmVkUGF0dGVybnMgPSBbXTtcbiAgICAgIGZvciAobGV0IG9sZFBhdHRlcm4gb2YgdGhpcy5wYXR0ZXJucykge1xuICAgICAgICBpZiAoIXBhdHRlcm5zLmZpbmQobmV3UGF0dGVybiA9PiBuZXdQYXR0ZXJuLnRleHQgPT0gb2xkUGF0dGVybi50ZXh0KSkge1xuICAgICAgICAgIHJlbW92ZWRQYXR0ZXJucy5wdXNoKG9sZFBhdHRlcm4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBsZXQgZWxlbWVudHNUb1VuaGlkZSA9IFtdO1xuICAgICAgZm9yIChsZXQgcGF0dGVybiBvZiByZW1vdmVkUGF0dGVybnMpIHtcbiAgICAgICAgZm9yIChsZXQgW2VsZW1lbnQsIGZpbHRlcl0gb2YgdGhpcy5oaWRkZW5FbGVtZW50cykge1xuICAgICAgICAgIGlmIChmaWx0ZXIgPT0gcGF0dGVybi50ZXh0KSB7XG4gICAgICAgICAgICBlbGVtZW50c1RvVW5oaWRlLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZWxlbWVudHNUb1VuaGlkZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuX3VuaGlkZUVsZW1zKGVsZW1lbnRzVG9VbmhpZGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucGF0dGVybnMgPSBbXTtcbiAgICBmb3IgKGxldCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XG4gICAgICBsZXQgc2VsZWN0b3JzID0gdGhpcy5wYXJzZVNlbGVjdG9yKHBhdHRlcm4uc2VsZWN0b3IpO1xuICAgICAgaWYgKHNlbGVjdG9ycyAhPSBudWxsICYmIHNlbGVjdG9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMucGF0dGVybnMucHVzaChcbiAgICAgICAgICBuZXcgUGF0dGVybihzZWxlY3RvcnMsIHBhdHRlcm4udGV4dCwgcGF0dGVybi5yZW1vdmUsIHBhdHRlcm4uY3NzKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLnBhdHRlcm5zLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMucXVldWVGaWx0ZXJpbmcoKTtcblxuICAgICAgbGV0IGF0dHJpYnV0ZXMgPSBzaG91bGRPYnNlcnZlQXR0cmlidXRlcyh0aGlzLnBhdHRlcm5zKTtcbiAgICAgIHRoaXMub2JzZXJ2ZXIub2JzZXJ2ZShcbiAgICAgICAgdGhpcy5kb2N1bWVudCxcbiAgICAgICAge1xuICAgICAgICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICAgICAgICBhdHRyaWJ1dGVzLFxuICAgICAgICAgIGF0dHJpYnV0ZU9sZFZhbHVlOiBhdHRyaWJ1dGVzICYmICEhdGVzdEluZm8sXG4gICAgICAgICAgY2hhcmFjdGVyRGF0YTogc2hvdWxkT2JzZXJ2ZUNoYXJhY3RlckRhdGEodGhpcy5wYXR0ZXJucyksXG4gICAgICAgICAgc3VidHJlZTogdHJ1ZVxuICAgICAgICB9XG4gICAgICApO1xuICAgICAgaWYgKHNob3VsZE9ic2VydmVTdHlsZXModGhpcy5wYXR0ZXJucykpIHtcbiAgICAgICAgbGV0IG9uTG9hZCA9IHRoaXMub25Mb2FkLmJpbmQodGhpcyk7XG4gICAgICAgIGlmICh0aGlzLmRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwibG9hZGluZ1wiKSB7XG4gICAgICAgICAgdGhpcy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBvbkxvYWQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgb25Mb2FkLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBkaXNjb25uZWN0KCkge1xuICAgIHRoaXMub2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX3VuaGlkZUVsZW1zKEFycmF5LmZyb20odGhpcy5oaWRkZW5FbGVtZW50cy5rZXlzKCkpKTtcbiAgfVxufTtcbiIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBBZGJsb2NrIFBsdXMgPGh0dHBzOi8vYWRibG9ja3BsdXMub3JnLz4sXG4gKiBDb3B5cmlnaHQgKEMpIDIwMDYtcHJlc2VudCBleWVvIEdtYkhcbiAqXG4gKiBBZGJsb2NrIFBsdXMgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSB2ZXJzaW9uIDMgYXNcbiAqIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLlxuICpcbiAqIEFkYmxvY2sgUGx1cyBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggQWRibG9jayBQbHVzLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qKiBAbW9kdWxlICovXG5cblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBwYXR0ZXJucyB0aGF0XG4gKiBge0BsaW5rIG1vZHVsZTpwYXR0ZXJucy5jb21waWxlUGF0dGVybnMgY29tcGlsZVBhdHRlcm5zKCl9YCB3aWxsIGNvbXBpbGVcbiAqIGludG8gcmVndWxhciBleHByZXNzaW9ucy5cbiAqIEB0eXBlIHtudW1iZXJ9XG4gKi9cbmNvbnN0IENPTVBJTEVfUEFUVEVSTlNfTUFYID0gMTAwO1xuXG4vKipcbiAqIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIG1hdGNoIHRoZSBgXmAgc3VmZml4IGluIGFuIG90aGVyd2lzZSBsaXRlcmFsXG4gKiBwYXR0ZXJuLlxuICogQHR5cGUge1JlZ0V4cH1cbiAqL1xubGV0IHNlcGFyYXRvclJlZ0V4cCA9IC9bXFx4MDAtXFx4MjRcXHgyNi1cXHgyQ1xceDJGXFx4M0EtXFx4NDBcXHg1Qi1cXHg1RVxceDYwXFx4N0ItXFx4N0ZdLztcblxubGV0IGZpbHRlclRvUmVnRXhwID1cbi8qKlxuICogQ29udmVydHMgZmlsdGVyIHRleHQgaW50byByZWd1bGFyIGV4cHJlc3Npb24gc3RyaW5nXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBhcyBpbiBGaWx0ZXIoKVxuICogQHJldHVybiB7c3RyaW5nfSByZWd1bGFyIGV4cHJlc3Npb24gcmVwcmVzZW50YXRpb24gb2YgZmlsdGVyIHRleHRcbiAqIEBwYWNrYWdlXG4gKi9cbmV4cG9ydHMuZmlsdGVyVG9SZWdFeHAgPSBmdW5jdGlvbiBmaWx0ZXJUb1JlZ0V4cCh0ZXh0KSB7XG4gIC8vIHJlbW92ZSBtdWx0aXBsZSB3aWxkY2FyZHNcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFwqKy9nLCBcIipcIik7XG5cbiAgLy8gcmVtb3ZlIGxlYWRpbmcgd2lsZGNhcmRcbiAgaWYgKHRleHRbMF0gPT0gXCIqXCIpIHtcbiAgICB0ZXh0ID0gdGV4dC5zdWJzdHJpbmcoMSk7XG4gIH1cblxuICAvLyByZW1vdmUgdHJhaWxpbmcgd2lsZGNhcmRcbiAgaWYgKHRleHRbdGV4dC5sZW5ndGggLSAxXSA9PSBcIipcIikge1xuICAgIHRleHQgPSB0ZXh0LnN1YnN0cmluZygwLCB0ZXh0Lmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHRleHRcbiAgICAvLyByZW1vdmUgYW5jaG9ycyBmb2xsb3dpbmcgc2VwYXJhdG9yIHBsYWNlaG9sZGVyXG4gICAgLnJlcGxhY2UoL1xcXlxcfCQvLCBcIl5cIilcbiAgICAvLyBlc2NhcGUgc3BlY2lhbCBzeW1ib2xzXG4gICAgLnJlcGxhY2UoL1xcVy9nLCBcIlxcXFwkJlwiKVxuICAgIC8vIHJlcGxhY2Ugd2lsZGNhcmRzIGJ5IC4qXG4gICAgLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKVxuICAgIC8vIHByb2Nlc3Mgc2VwYXJhdG9yIHBsYWNlaG9sZGVycyAoYWxsIEFOU0kgY2hhcmFjdGVycyBidXQgYWxwaGFudW1lcmljXG4gICAgLy8gY2hhcmFjdGVycyBhbmQgXyUuLSlcbiAgICAucmVwbGFjZSgvXFxcXFxcXi9nLCBgKD86JHtzZXBhcmF0b3JSZWdFeHAuc291cmNlfXwkKWApXG4gICAgLy8gcHJvY2VzcyBleHRlbmRlZCBhbmNob3IgYXQgZXhwcmVzc2lvbiBzdGFydFxuICAgIC5yZXBsYWNlKC9eXFxcXFxcfFxcXFxcXHwvLCBcIl5bXFxcXHdcXFxcLV0rOlxcXFwvKyg/OlteXFxcXC9dK1xcXFwuKT9cIilcbiAgICAvLyBwcm9jZXNzIGFuY2hvciBhdCBleHByZXNzaW9uIHN0YXJ0XG4gICAgLnJlcGxhY2UoL15cXFxcXFx8LywgXCJeXCIpXG4gICAgLy8gcHJvY2VzcyBhbmNob3IgYXQgZXhwcmVzc2lvbiBlbmRcbiAgICAucmVwbGFjZSgvXFxcXFxcfCQvLCBcIiRcIik7XG59O1xuXG4vKipcbiAqIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIG1hdGNoIHRoZSBgfHxgIHByZWZpeCBpbiBhbiBvdGhlcndpc2UgbGl0ZXJhbFxuICogcGF0dGVybi5cbiAqIEB0eXBlIHtSZWdFeHB9XG4gKi9cbmxldCBleHRlbmRlZEFuY2hvclJlZ0V4cCA9IG5ldyBSZWdFeHAoZmlsdGVyVG9SZWdFeHAoXCJ8fFwiKSArIFwiJFwiKTtcblxuLyoqXG4gKiBSZWd1bGFyIGV4cHJlc3Npb24gZm9yIG1hdGNoaW5nIGEga2V5d29yZCBpbiBhIGZpbHRlci5cbiAqIEB0eXBlIHtSZWdFeHB9XG4gKi9cbmxldCBrZXl3b3JkUmVnRXhwID0gL1teYS16MC05JSpdW2EtejAtOSVdezIsfSg/PVteYS16MC05JSpdKS87XG5cbi8qKlxuICogUmVndWxhciBleHByZXNzaW9uIGZvciBtYXRjaGluZyBhbGwga2V5d29yZHMgaW4gYSBmaWx0ZXIuXG4gKiBAdHlwZSB7UmVnRXhwfVxuICovXG5sZXQgYWxsS2V5d29yZHNSZWdFeHAgPSBuZXcgUmVnRXhwKGtleXdvcmRSZWdFeHAsIFwiZ1wiKTtcblxuLyoqXG4gKiBBIGBDb21waWxlZFBhdHRlcm5zYCBvYmplY3QgcmVwcmVzZW50cyB0aGUgY29tcGlsZWQgdmVyc2lvbiBvZiBtdWx0aXBsZSBVUkxcbiAqIHJlcXVlc3QgcGF0dGVybnMuIEl0IGlzIHJldHVybmVkIGJ5XG4gKiBge0BsaW5rIG1vZHVsZTpwYXR0ZXJucy5jb21waWxlUGF0dGVybnMgY29tcGlsZVBhdHRlcm5zKCl9YC5cbiAqL1xuY2xhc3MgQ29tcGlsZWRQYXR0ZXJucyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG9iamVjdCB3aXRoIHRoZSBnaXZlbiByZWd1bGFyIGV4cHJlc3Npb25zIGZvciBjYXNlLXNlbnNpdGl2ZVxuICAgKiBhbmQgY2FzZS1pbnNlbnNpdGl2ZSBtYXRjaGluZyByZXNwZWN0aXZlbHkuXG4gICAqIEBwYXJhbSB7P1JlZ0V4cH0gW2Nhc2VTZW5zaXRpdmVdXG4gICAqIEBwYXJhbSB7P1JlZ0V4cH0gW2Nhc2VJbnNlbnNpdGl2ZV1cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNvbnN0cnVjdG9yKGNhc2VTZW5zaXRpdmUsIGNhc2VJbnNlbnNpdGl2ZSkge1xuICAgIHRoaXMuX2Nhc2VTZW5zaXRpdmUgPSBjYXNlU2Vuc2l0aXZlO1xuICAgIHRoaXMuX2Nhc2VJbnNlbnNpdGl2ZSA9IGNhc2VJbnNlbnNpdGl2ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUZXN0cyB3aGV0aGVyIHRoZSBnaXZlbiBVUkwgcmVxdWVzdCBtYXRjaGVzIHRoZSBwYXR0ZXJucyB1c2VkIHRvIGNyZWF0ZVxuICAgKiB0aGlzIG9iamVjdC5cbiAgICogQHBhcmFtIHttb2R1bGU6dXJsLlVSTFJlcXVlc3R9IHJlcXVlc3RcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICB0ZXN0KHJlcXVlc3QpIHtcbiAgICByZXR1cm4gKCh0aGlzLl9jYXNlU2Vuc2l0aXZlICYmXG4gICAgICAgICAgICAgdGhpcy5fY2FzZVNlbnNpdGl2ZS50ZXN0KHJlcXVlc3QuaHJlZikpIHx8XG4gICAgICAgICAgICAodGhpcy5fY2FzZUluc2Vuc2l0aXZlICYmXG4gICAgICAgICAgICAgdGhpcy5fY2FzZUluc2Vuc2l0aXZlLnRlc3QocmVxdWVzdC5sb3dlckNhc2VIcmVmKSkpO1xuICB9XG59XG5cbi8qKlxuICogQ29tcGlsZXMgcGF0dGVybnMgZnJvbSB0aGUgZ2l2ZW4gZmlsdGVycyBpbnRvIGEgc2luZ2xlXG4gKiBge0BsaW5rIG1vZHVsZTpwYXR0ZXJuc35Db21waWxlZFBhdHRlcm5zIENvbXBpbGVkUGF0dGVybnN9YCBvYmplY3QuXG4gKlxuICogQHBhcmFtIHttb2R1bGU6ZmlsdGVyQ2xhc3Nlcy5VUkxGaWx0ZXJ8XG4gKiAgICAgICAgIFNldC48bW9kdWxlOmZpbHRlckNsYXNzZXMuVVJMRmlsdGVyPn0gZmlsdGVyc1xuICogICBUaGUgZmlsdGVycy4gSWYgdGhlIG51bWJlciBvZiBmaWx0ZXJzIGV4Y2VlZHNcbiAqICAgYHtAbGluayBtb2R1bGU6cGF0dGVybnN+Q09NUElMRV9QQVRURVJOU19NQVggQ09NUElMRV9QQVRURVJOU19NQVh9YCwgdGhlXG4gKiAgIGZ1bmN0aW9uIHJldHVybnMgYG51bGxgLlxuICpcbiAqIEByZXR1cm5zIHs/bW9kdWxlOnBhdHRlcm5zfkNvbXBpbGVkUGF0dGVybnN9XG4gKlxuICogQHBhY2thZ2VcbiAqL1xuZXhwb3J0cy5jb21waWxlUGF0dGVybnMgPSBmdW5jdGlvbiBjb21waWxlUGF0dGVybnMoZmlsdGVycykge1xuICBsZXQgbGlzdCA9IEFycmF5LmlzQXJyYXkoZmlsdGVycykgPyBmaWx0ZXJzIDogW2ZpbHRlcnNdO1xuXG4gIC8vIElmIHRoZSBudW1iZXIgb2YgZmlsdGVycyBpcyB0b28gbGFyZ2UsIGl0IG1heSBjaG9rZSBlc3BlY2lhbGx5IG9uIGxvdy1lbmRcbiAgLy8gcGxhdGZvcm1zLiBBcyBhIHByZWNhdXRpb24sIHdlIHJlZnVzZSB0byBjb21waWxlLiBJZGVhbGx5IHdlIHdvdWxkIGNoZWNrXG4gIC8vIHRoZSBsZW5ndGggb2YgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiBzb3VyY2UgcmF0aGVyIHRoYW4gdGhlIG51bWJlciBvZlxuICAvLyBmaWx0ZXJzLCBidXQgdGhpcyBpcyBmYXIgbW9yZSBzdHJhaWdodGZvcndhcmQgYW5kIHByYWN0aWNhbC5cbiAgaWYgKGxpc3QubGVuZ3RoID4gQ09NUElMRV9QQVRURVJOU19NQVgpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGxldCBjYXNlU2Vuc2l0aXZlID0gXCJcIjtcbiAgbGV0IGNhc2VJbnNlbnNpdGl2ZSA9IFwiXCI7XG5cbiAgZm9yIChsZXQgZmlsdGVyIG9mIGZpbHRlcnMpIHtcbiAgICBsZXQgc291cmNlID0gZmlsdGVyLnVybFBhdHRlcm4ucmVnZXhwU291cmNlO1xuXG4gICAgaWYgKGZpbHRlci5tYXRjaENhc2UpIHtcbiAgICAgIGNhc2VTZW5zaXRpdmUgKz0gc291cmNlICsgXCJ8XCI7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY2FzZUluc2Vuc2l0aXZlICs9IHNvdXJjZSArIFwifFwiO1xuICAgIH1cbiAgfVxuXG4gIGxldCBjYXNlU2Vuc2l0aXZlUmVnRXhwID0gbnVsbDtcbiAgbGV0IGNhc2VJbnNlbnNpdGl2ZVJlZ0V4cCA9IG51bGw7XG5cbiAgdHJ5IHtcbiAgICBpZiAoY2FzZVNlbnNpdGl2ZSkge1xuICAgICAgY2FzZVNlbnNpdGl2ZVJlZ0V4cCA9IG5ldyBSZWdFeHAoY2FzZVNlbnNpdGl2ZS5zbGljZSgwLCAtMSkpO1xuICAgIH1cblxuICAgIGlmIChjYXNlSW5zZW5zaXRpdmUpIHtcbiAgICAgIGNhc2VJbnNlbnNpdGl2ZVJlZ0V4cCA9IG5ldyBSZWdFeHAoY2FzZUluc2Vuc2l0aXZlLnNsaWNlKDAsIC0xKSk7XG4gICAgfVxuICB9XG4gIGNhdGNoIChlcnJvcikge1xuICAgIC8vIEl0IGlzIHBvc3NpYmxlIGluIHRoZW9yeSBmb3IgdGhlIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBiZSB0b28gbGFyZ2VcbiAgICAvLyBkZXNwaXRlIENPTVBJTEVfUEFUVEVSTlNfTUFYXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gbmV3IENvbXBpbGVkUGF0dGVybnMoY2FzZVNlbnNpdGl2ZVJlZ0V4cCwgY2FzZUluc2Vuc2l0aXZlUmVnRXhwKTtcbn07XG5cbi8qKlxuICogUGF0dGVybnMgZm9yIG1hdGNoaW5nIGFnYWluc3QgVVJMcy5cbiAqXG4gKiBJbnRlcm5hbGx5LCB0aGlzIG1heSBiZSBhIFJlZ0V4cCBvciBtYXRjaCBkaXJlY3RseSBhZ2FpbnN0IHRoZVxuICogcGF0dGVybiBmb3Igc2ltcGxlIGxpdGVyYWwgcGF0dGVybnMuXG4gKi9cbmV4cG9ydHMuUGF0dGVybiA9IGNsYXNzIFBhdHRlcm4ge1xuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhdHRlcm4gcGF0dGVybiB0aGF0IHJlcXVlc3RzIFVSTHMgc2hvdWxkIGJlXG4gICAqIG1hdGNoZWQgYWdhaW5zdCBpbiBmaWx0ZXIgdGV4dCBub3RhdGlvblxuICAgKiBAcGFyYW0ge2Jvb2x9IG1hdGNoQ2FzZSBgdHJ1ZWAgaWYgY29tcGFyaXNvbnMgbXVzdCBiZSBjYXNlXG4gICAqIHNlbnNpdGl2ZVxuICAgKi9cbiAgY29uc3RydWN0b3IocGF0dGVybiwgbWF0Y2hDYXNlKSB7XG4gICAgdGhpcy5tYXRjaENhc2UgPSBtYXRjaENhc2UgfHwgZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMubWF0Y2hDYXNlKSB7XG4gICAgICBwYXR0ZXJuID0gcGF0dGVybi50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIGlmIChwYXR0ZXJuLmxlbmd0aCA+PSAyICYmXG4gICAgICAgIHBhdHRlcm5bMF0gPT0gXCIvXCIgJiZcbiAgICAgICAgcGF0dGVybltwYXR0ZXJuLmxlbmd0aCAtIDFdID09IFwiL1wiKSB7XG4gICAgICAvLyBUaGUgZmlsdGVyIGlzIGEgcmVndWxhciBleHByZXNzaW9uIC0gY29udmVydCBpdCBpbW1lZGlhdGVseSB0b1xuICAgICAgLy8gY2F0Y2ggc3ludGF4IGVycm9yc1xuICAgICAgcGF0dGVybiA9IHBhdHRlcm4uc3Vic3RyaW5nKDEsIHBhdHRlcm4ubGVuZ3RoIC0gMSk7XG4gICAgICB0aGlzLl9yZWdleHAgPSBuZXcgUmVnRXhwKHBhdHRlcm4pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIFBhdHRlcm5zIGxpa2UgL2Zvby9iYXIvKiBleGlzdCBzbyB0aGF0IHRoZXkgYXJlIG5vdCB0cmVhdGVkIGFzIHJlZ3VsYXJcbiAgICAgIC8vIGV4cHJlc3Npb25zLiBXZSBkcm9wIGFueSBzdXBlcmZsdW91cyB3aWxkY2FyZHMgaGVyZSBzbyBvdXJcbiAgICAgIC8vIG9wdGltaXphdGlvbnMgY2FuIGtpY2sgaW4uXG4gICAgICBwYXR0ZXJuID0gcGF0dGVybi5yZXBsYWNlKC9eXFwqKy8sIFwiXCIpLnJlcGxhY2UoL1xcKiskLywgXCJcIik7XG5cbiAgICAgIC8vIE5vIG5lZWQgdG8gY29udmVydCB0aGlzIGZpbHRlciB0byByZWd1bGFyIGV4cHJlc3Npb24geWV0LCBkbyBpdCBvblxuICAgICAgLy8gZGVtYW5kXG4gICAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcGF0dGVybiBpcyBhIHN0cmluZyBvZiBsaXRlcmFsIGNoYXJhY3RlcnMgd2l0aFxuICAgKiBubyB3aWxkY2FyZHMgb3IgYW55IG90aGVyIHNwZWNpYWwgY2hhcmFjdGVycy5cbiAgICpcbiAgICogSWYgdGhlIHBhdHRlcm4gaXMgcHJlZml4ZWQgd2l0aCBhIGB8fGAgb3Igc3VmZml4ZWQgd2l0aCBhIGBeYCBidXQgb3RoZXJ3aXNlXG4gICAqIGNvbnRhaW5zIG5vIHNwZWNpYWwgY2hhcmFjdGVycywgaXQgaXMgc3RpbGwgY29uc2lkZXJlZCB0byBiZSBhIGxpdGVyYWxcbiAgICogcGF0dGVybi5cbiAgICpcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBpc0xpdGVyYWxQYXR0ZXJuKCkge1xuICAgIHJldHVybiB0eXBlb2YgdGhpcy5wYXR0ZXJuICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAhL1sqXnxdLy50ZXN0KHRoaXMucGF0dGVybi5yZXBsYWNlKC9eXFx8ezEsMn0vLCBcIlwiKS5yZXBsYWNlKC9bfF5dJC8sIFwiXCIpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWd1bGFyIGV4cHJlc3Npb24gdG8gYmUgdXNlZCB3aGVuIHRlc3RpbmcgYWdhaW5zdCB0aGlzIHBhdHRlcm4uXG4gICAqXG4gICAqIG51bGwgaWYgdGhlIHBhdHRlcm4gaXMgbWF0Y2hlZCB3aXRob3V0IHVzaW5nIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG4gICAqIEB0eXBlIHtSZWdFeHB9XG4gICAqL1xuICBnZXQgcmVnZXhwKCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5fcmVnZXhwID09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIHRoaXMuX3JlZ2V4cCA9IHRoaXMuaXNMaXRlcmFsUGF0dGVybigpID9cbiAgICAgICAgbnVsbCA6IG5ldyBSZWdFeHAoZmlsdGVyVG9SZWdFeHAodGhpcy5wYXR0ZXJuKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9yZWdleHA7XG4gIH1cblxuICAvKipcbiAgICogUGF0dGVybiBpbiByZWd1bGFyIGV4cHJlc3Npb24gbm90YXRpb24uIFRoaXMgd2lsbCBoYXZlIGEgdmFsdWVcbiAgICogZXZlbiBpZiBgcmVnZXhwYCByZXR1cm5zIG51bGwuXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICBnZXQgcmVnZXhwU291cmNlKCkge1xuICAgIHJldHVybiB0aGlzLl9yZWdleHAgPyB0aGlzLl9yZWdleHAuc291cmNlIDogZmlsdGVyVG9SZWdFeHAodGhpcy5wYXR0ZXJuKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gVVJMIHJlcXVlc3QgbWF0Y2hlcyB0aGlzIGZpbHRlcidzIHBhdHRlcm4uXG4gICAqIEBwYXJhbSB7bW9kdWxlOnVybC5VUkxSZXF1ZXN0fSByZXF1ZXN0IFRoZSBVUkwgcmVxdWVzdCB0byBjaGVjay5cbiAgICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgVVJMIHJlcXVlc3QgbWF0Y2hlcy5cbiAgICovXG4gIG1hdGNoZXNMb2NhdGlvbihyZXF1ZXN0KSB7XG4gICAgbGV0IGxvY2F0aW9uID0gdGhpcy5tYXRjaENhc2UgPyByZXF1ZXN0LmhyZWYgOiByZXF1ZXN0Lmxvd2VyQ2FzZUhyZWY7XG4gICAgbGV0IHJlZ2V4cCA9IHRoaXMucmVnZXhwO1xuICAgIGlmIChyZWdleHApIHtcbiAgICAgIHJldHVybiByZWdleHAudGVzdChsb2NhdGlvbik7XG4gICAgfVxuXG4gICAgbGV0IHBhdHRlcm4gPSB0aGlzLnBhdHRlcm47XG4gICAgbGV0IHN0YXJ0c1dpdGhBbmNob3IgPSBwYXR0ZXJuWzBdID09IFwifFwiO1xuICAgIGxldCBzdGFydHNXaXRoRXh0ZW5kZWRBbmNob3IgPSBzdGFydHNXaXRoQW5jaG9yICYmIHBhdHRlcm5bMV0gPT0gXCJ8XCI7XG4gICAgbGV0IGVuZHNXaXRoU2VwYXJhdG9yID0gcGF0dGVybltwYXR0ZXJuLmxlbmd0aCAtIDFdID09IFwiXlwiO1xuICAgIGxldCBlbmRzV2l0aEFuY2hvciA9ICFlbmRzV2l0aFNlcGFyYXRvciAmJlxuICAgICAgICBwYXR0ZXJuW3BhdHRlcm4ubGVuZ3RoIC0gMV0gPT0gXCJ8XCI7XG5cbiAgICBpZiAoc3RhcnRzV2l0aEV4dGVuZGVkQW5jaG9yKSB7XG4gICAgICBwYXR0ZXJuID0gcGF0dGVybi5zdWJzdHIoMik7XG4gICAgfVxuICAgIGVsc2UgaWYgKHN0YXJ0c1dpdGhBbmNob3IpIHtcbiAgICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnN1YnN0cigxKTtcbiAgICB9XG5cbiAgICBpZiAoZW5kc1dpdGhTZXBhcmF0b3IgfHwgZW5kc1dpdGhBbmNob3IpIHtcbiAgICAgIHBhdHRlcm4gPSBwYXR0ZXJuLnNsaWNlKDAsIC0xKTtcbiAgICB9XG5cbiAgICBsZXQgaW5kZXggPSBsb2NhdGlvbi5pbmRleE9mKHBhdHRlcm4pO1xuXG4gICAgd2hpbGUgKGluZGV4ICE9IC0xKSB7XG4gICAgICAvLyBUaGUgXCJ8fFwiIHByZWZpeCByZXF1aXJlcyB0aGF0IHRoZSB0ZXh0IHRoYXQgZm9sbG93cyBkb2VzIG5vdCBzdGFydFxuICAgICAgLy8gd2l0aCBhIGZvcndhcmQgc2xhc2guXG4gICAgICBpZiAoKHN0YXJ0c1dpdGhFeHRlbmRlZEFuY2hvciA/XG4gICAgICAgICAgIGxvY2F0aW9uW2luZGV4XSAhPSBcIi9cIiAmJlxuICAgICAgICAgICBleHRlbmRlZEFuY2hvclJlZ0V4cC50ZXN0KGxvY2F0aW9uLnN1YnN0cmluZygwLCBpbmRleCkpIDpcbiAgICAgICAgICAgc3RhcnRzV2l0aEFuY2hvciA/XG4gICAgICAgICAgIGluZGV4ID09IDAgOlxuICAgICAgICAgICB0cnVlKSAmJlxuICAgICAgICAgIChlbmRzV2l0aFNlcGFyYXRvciA/XG4gICAgICAgICAgICFsb2NhdGlvbltpbmRleCArIHBhdHRlcm4ubGVuZ3RoXSB8fFxuICAgICAgICAgICBzZXBhcmF0b3JSZWdFeHAudGVzdChsb2NhdGlvbltpbmRleCArIHBhdHRlcm4ubGVuZ3RoXSkgOlxuICAgICAgICAgICBlbmRzV2l0aEFuY2hvciA/XG4gICAgICAgICAgIGluZGV4ID09IGxvY2F0aW9uLmxlbmd0aCAtIHBhdHRlcm4ubGVuZ3RoIDpcbiAgICAgICAgICAgdHJ1ZSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXR0ZXJuID09IFwiXCIpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGluZGV4ID0gbG9jYXRpb24uaW5kZXhPZihwYXR0ZXJuLCBpbmRleCArIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgcGF0dGVybiBoYXMga2V5d29yZHNcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBoYXNLZXl3b3JkcygpIHtcbiAgICByZXR1cm4gdGhpcy5wYXR0ZXJuICYmIGtleXdvcmRSZWdFeHAudGVzdCh0aGlzLnBhdHRlcm4pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIGFsbCBrZXl3b3JkcyB0aGF0IGNvdWxkIGJlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHBhdHRlcm5cbiAgICogQHJldHVybnMge3N0cmluZ1tdfVxuICAgKi9cbiAga2V5d29yZENhbmRpZGF0ZXMoKSB7XG4gICAgaWYgKCF0aGlzLnBhdHRlcm4pIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5wYXR0ZXJuLnRvTG93ZXJDYXNlKCkubWF0Y2goYWxsS2V5d29yZHNSZWdFeHApO1xuICB9XG59O1xuIiwiLyogd2ViZXh0ZW5zaW9uLXBvbHlmaWxsIC0gdjAuOC4wIC0gVHVlIEFwciAyMCAyMDIxIDExOjI3OjM4ICovXG4vKiAtKi0gTW9kZTogaW5kZW50LXRhYnMtbW9kZTogbmlsOyBqcy1pbmRlbnQtbGV2ZWw6IDIgLSotICovXG4vKiB2aW06IHNldCBzdHM9MiBzdz0yIGV0IHR3PTgwOiAqL1xuLyogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy4gKi9cblwidXNlIHN0cmljdFwiO1xuXG5pZiAodHlwZW9mIGJyb3dzZXIgPT09IFwidW5kZWZpbmVkXCIgfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKGJyb3dzZXIpICE9PSBPYmplY3QucHJvdG90eXBlKSB7XG4gIGNvbnN0IENIUk9NRV9TRU5EX01FU1NBR0VfQ0FMTEJBQ0tfTk9fUkVTUE9OU0VfTUVTU0FHRSA9IFwiVGhlIG1lc3NhZ2UgcG9ydCBjbG9zZWQgYmVmb3JlIGEgcmVzcG9uc2Ugd2FzIHJlY2VpdmVkLlwiO1xuICBjb25zdCBTRU5EX1JFU1BPTlNFX0RFUFJFQ0FUSU9OX1dBUk5JTkcgPSBcIlJldHVybmluZyBhIFByb21pc2UgaXMgdGhlIHByZWZlcnJlZCB3YXkgdG8gc2VuZCBhIHJlcGx5IGZyb20gYW4gb25NZXNzYWdlL29uTWVzc2FnZUV4dGVybmFsIGxpc3RlbmVyLCBhcyB0aGUgc2VuZFJlc3BvbnNlIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBzcGVjcyAoU2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2RvY3MvTW96aWxsYS9BZGQtb25zL1dlYkV4dGVuc2lvbnMvQVBJL3J1bnRpbWUvb25NZXNzYWdlKVwiO1xuXG4gIC8vIFdyYXBwaW5nIHRoZSBidWxrIG9mIHRoaXMgcG9seWZpbGwgaW4gYSBvbmUtdGltZS11c2UgZnVuY3Rpb24gaXMgYSBtaW5vclxuICAvLyBvcHRpbWl6YXRpb24gZm9yIEZpcmVmb3guIFNpbmNlIFNwaWRlcm1vbmtleSBkb2VzIG5vdCBmdWxseSBwYXJzZSB0aGVcbiAgLy8gY29udGVudHMgb2YgYSBmdW5jdGlvbiB1bnRpbCB0aGUgZmlyc3QgdGltZSBpdCdzIGNhbGxlZCwgYW5kIHNpbmNlIGl0IHdpbGxcbiAgLy8gbmV2ZXIgYWN0dWFsbHkgbmVlZCB0byBiZSBjYWxsZWQsIHRoaXMgYWxsb3dzIHRoZSBwb2x5ZmlsbCB0byBiZSBpbmNsdWRlZFxuICAvLyBpbiBGaXJlZm94IG5lYXJseSBmb3IgZnJlZS5cbiAgY29uc3Qgd3JhcEFQSXMgPSBleHRlbnNpb25BUElzID0+IHtcbiAgICAvLyBOT1RFOiBhcGlNZXRhZGF0YSBpcyBhc3NvY2lhdGVkIHRvIHRoZSBjb250ZW50IG9mIHRoZSBhcGktbWV0YWRhdGEuanNvbiBmaWxlXG4gICAgLy8gYXQgYnVpbGQgdGltZSBieSByZXBsYWNpbmcgdGhlIGZvbGxvd2luZyBcImluY2x1ZGVcIiB3aXRoIHRoZSBjb250ZW50IG9mIHRoZVxuICAgIC8vIEpTT04gZmlsZS5cbiAgICBjb25zdCBhcGlNZXRhZGF0YSA9IHtcbiAgICAgIFwiYWxhcm1zXCI6IHtcbiAgICAgICAgXCJjbGVhclwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJjbGVhckFsbFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJib29rbWFya3NcIjoge1xuICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0Q2hpbGRyZW5cIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0UmVjZW50XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdldFN1YlRyZWVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0VHJlZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJtb3ZlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJyZW1vdmVUcmVlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcImJyb3dzZXJBY3Rpb25cIjoge1xuICAgICAgICBcImRpc2FibGVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBcImVuYWJsZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0QmFkZ2VCYWNrZ3JvdW5kQ29sb3JcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0QmFkZ2VUZXh0XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdldFBvcHVwXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdldFRpdGxlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcIm9wZW5Qb3B1cFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXRCYWRnZUJhY2tncm91bmRDb2xvclwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIFwic2V0QmFkZ2VUZXh0XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXRJY29uXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInNldFBvcHVwXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXRUaXRsZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcImJyb3dzaW5nRGF0YVwiOiB7XG4gICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZUNhY2hlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZUNvb2tpZXNcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwicmVtb3ZlRG93bmxvYWRzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZUZvcm1EYXRhXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZUhpc3RvcnlcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwicmVtb3ZlTG9jYWxTdG9yYWdlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZVBhc3N3b3Jkc1wiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJyZW1vdmVQbHVnaW5EYXRhXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInNldHRpbmdzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJjb21tYW5kc1wiOiB7XG4gICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJjb250ZXh0TWVudXNcIjoge1xuICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJyZW1vdmVBbGxcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwidXBkYXRlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJjb29raWVzXCI6IHtcbiAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdldEFsbENvb2tpZVN0b3Jlc1wiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJkZXZ0b29sc1wiOiB7XG4gICAgICAgIFwiaW5zcGVjdGVkV2luZG93XCI6IHtcbiAgICAgICAgICBcImV2YWxcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMixcbiAgICAgICAgICAgIFwic2luZ2xlQ2FsbGJhY2tBcmdcIjogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwicGFuZWxzXCI6IHtcbiAgICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMyxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAzLFxuICAgICAgICAgICAgXCJzaW5nbGVDYWxsYmFja0FyZ1wiOiB0cnVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcImVsZW1lbnRzXCI6IHtcbiAgICAgICAgICAgIFwiY3JlYXRlU2lkZWJhclBhbmVcIjoge1xuICAgICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcImRvd25sb2Fkc1wiOiB7XG4gICAgICAgIFwiY2FuY2VsXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImRvd25sb2FkXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImVyYXNlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdldEZpbGVJY29uXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcIm9wZW5cIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBcInBhdXNlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZUZpbGVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwicmVzdW1lXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG93XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMSxcbiAgICAgICAgICBcImZhbGxiYWNrVG9Ob0NhbGxiYWNrXCI6IHRydWVcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwiZXh0ZW5zaW9uXCI6IHtcbiAgICAgICAgXCJpc0FsbG93ZWRGaWxlU2NoZW1lQWNjZXNzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9LFxuICAgICAgICBcImlzQWxsb3dlZEluY29nbml0b0FjY2Vzc1wiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwiaGlzdG9yeVwiOiB7XG4gICAgICAgIFwiYWRkVXJsXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImRlbGV0ZUFsbFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZWxldGVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZWxldGVVcmxcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0VmlzaXRzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInNlYXJjaFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwiaTE4blwiOiB7XG4gICAgICAgIFwiZGV0ZWN0TGFuZ3VhZ2VcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0QWNjZXB0TGFuZ3VhZ2VzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJpZGVudGl0eVwiOiB7XG4gICAgICAgIFwibGF1bmNoV2ViQXV0aEZsb3dcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcImlkbGVcIjoge1xuICAgICAgICBcInF1ZXJ5U3RhdGVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcIm1hbmFnZW1lbnRcIjoge1xuICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0U2VsZlwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXRFbmFibGVkXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcInVuaW5zdGFsbFNlbGZcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcIm5vdGlmaWNhdGlvbnNcIjoge1xuICAgICAgICBcImNsZWFyXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgfSxcbiAgICAgICAgXCJnZXRBbGxcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0UGVybWlzc2lvbkxldmVsXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9LFxuICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicGFnZUFjdGlvblwiOiB7XG4gICAgICAgIFwiZ2V0UG9wdXBcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0VGl0bGVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiaGlkZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIFwic2V0SWNvblwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXRQb3B1cFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDEsXG4gICAgICAgICAgXCJmYWxsYmFja1RvTm9DYWxsYmFja1wiOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIFwic2V0VGl0bGVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBcInNob3dcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxLFxuICAgICAgICAgIFwiZmFsbGJhY2tUb05vQ2FsbGJhY2tcIjogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJwZXJtaXNzaW9uc1wiOiB7XG4gICAgICAgIFwiY29udGFpbnNcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0QWxsXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJyZXF1ZXN0XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJydW50aW1lXCI6IHtcbiAgICAgICAgXCJnZXRCYWNrZ3JvdW5kUGFnZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJnZXRQbGF0Zm9ybUluZm9cIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAwXG4gICAgICAgIH0sXG4gICAgICAgIFwib3Blbk9wdGlvbnNQYWdlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9LFxuICAgICAgICBcInJlcXVlc3RVcGRhdGVDaGVja1wiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZW5kTWVzc2FnZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDNcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZW5kTmF0aXZlTWVzc2FnZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDIsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzZXRVbmluc3RhbGxVUkxcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInNlc3Npb25zXCI6IHtcbiAgICAgICAgXCJnZXREZXZpY2VzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdldFJlY2VudGx5Q2xvc2VkXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInJlc3RvcmVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInN0b3JhZ2VcIjoge1xuICAgICAgICBcImxvY2FsXCI6IHtcbiAgICAgICAgICBcImNsZWFyXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0Qnl0ZXNJblVzZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcInNldFwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm1hbmFnZWRcIjoge1xuICAgICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwiZ2V0Qnl0ZXNJblVzZVwiOiB7XG4gICAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInN5bmNcIjoge1xuICAgICAgICAgIFwiY2xlYXJcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRcIjoge1xuICAgICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICAgIH0sXG4gICAgICAgICAgXCJnZXRCeXRlc0luVXNlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwicmVtb3ZlXCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9LFxuICAgICAgICAgIFwic2V0XCI6IHtcbiAgICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInRhYnNcIjoge1xuICAgICAgICBcImNhcHR1cmVWaXNpYmxlVGFiXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcImNyZWF0ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXRlY3RMYW5ndWFnZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJkaXNjYXJkXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImR1cGxpY2F0ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJleGVjdXRlU2NyaXB0XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJnZXRDdXJyZW50XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9LFxuICAgICAgICBcImdldFpvb21cIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0Wm9vbVNldHRpbmdzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdvQmFja1wiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJnb0ZvcndhcmRcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiaGlnaGxpZ2h0XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImluc2VydENTU1wiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtb3ZlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcInF1ZXJ5XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInJlbG9hZFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgfSxcbiAgICAgICAgXCJyZW1vdmVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwicmVtb3ZlQ1NTXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcInNlbmRNZXNzYWdlXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMixcbiAgICAgICAgICBcIm1heEFyZ3NcIjogM1xuICAgICAgICB9LFxuICAgICAgICBcInNldFpvb21cIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAxLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgIH0sXG4gICAgICAgIFwic2V0Wm9vbVNldHRpbmdzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcInVwZGF0ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwidG9wU2l0ZXNcIjoge1xuICAgICAgICBcImdldFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDBcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwid2ViTmF2aWdhdGlvblwiOiB7XG4gICAgICAgIFwiZ2V0QWxsRnJhbWVzXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdldEZyYW1lXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJ3ZWJSZXF1ZXN0XCI6IHtcbiAgICAgICAgXCJoYW5kbGVyQmVoYXZpb3JDaGFuZ2VkXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJ3aW5kb3dzXCI6IHtcbiAgICAgICAgXCJjcmVhdGVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAwLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAxXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ2V0XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMSxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMlxuICAgICAgICB9LFxuICAgICAgICBcImdldEFsbFwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDAsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJnZXRDdXJyZW50XCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcImdldExhc3RGb2N1c2VkXCI6IHtcbiAgICAgICAgICBcIm1pbkFyZ3NcIjogMCxcbiAgICAgICAgICBcIm1heEFyZ3NcIjogMVxuICAgICAgICB9LFxuICAgICAgICBcInJlbW92ZVwiOiB7XG4gICAgICAgICAgXCJtaW5BcmdzXCI6IDEsXG4gICAgICAgICAgXCJtYXhBcmdzXCI6IDFcbiAgICAgICAgfSxcbiAgICAgICAgXCJ1cGRhdGVcIjoge1xuICAgICAgICAgIFwibWluQXJnc1wiOiAyLFxuICAgICAgICAgIFwibWF4QXJnc1wiOiAyXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKE9iamVjdC5rZXlzKGFwaU1ldGFkYXRhKS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImFwaS1tZXRhZGF0YS5qc29uIGhhcyBub3QgYmVlbiBpbmNsdWRlZCBpbiBicm93c2VyLXBvbHlmaWxsXCIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEEgV2Vha01hcCBzdWJjbGFzcyB3aGljaCBjcmVhdGVzIGFuZCBzdG9yZXMgYSB2YWx1ZSBmb3IgYW55IGtleSB3aGljaCBkb2VzXG4gICAgICogbm90IGV4aXN0IHdoZW4gYWNjZXNzZWQsIGJ1dCBiZWhhdmVzIGV4YWN0bHkgYXMgYW4gb3JkaW5hcnkgV2Vha01hcFxuICAgICAqIG90aGVyd2lzZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNyZWF0ZUl0ZW1cbiAgICAgKiAgICAgICAgQSBmdW5jdGlvbiB3aGljaCB3aWxsIGJlIGNhbGxlZCBpbiBvcmRlciB0byBjcmVhdGUgdGhlIHZhbHVlIGZvciBhbnlcbiAgICAgKiAgICAgICAga2V5IHdoaWNoIGRvZXMgbm90IGV4aXN0LCB0aGUgZmlyc3QgdGltZSBpdCBpcyBhY2Nlc3NlZC4gVGhlXG4gICAgICogICAgICAgIGZ1bmN0aW9uIHJlY2VpdmVzLCBhcyBpdHMgb25seSBhcmd1bWVudCwgdGhlIGtleSBiZWluZyBjcmVhdGVkLlxuICAgICAqL1xuICAgIGNsYXNzIERlZmF1bHRXZWFrTWFwIGV4dGVuZHMgV2Vha01hcCB7XG4gICAgICBjb25zdHJ1Y3RvcihjcmVhdGVJdGVtLCBpdGVtcyA9IHVuZGVmaW5lZCkge1xuICAgICAgICBzdXBlcihpdGVtcyk7XG4gICAgICAgIHRoaXMuY3JlYXRlSXRlbSA9IGNyZWF0ZUl0ZW07XG4gICAgICB9XG5cbiAgICAgIGdldChrZXkpIHtcbiAgICAgICAgaWYgKCF0aGlzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgdGhpcy5zZXQoa2V5LCB0aGlzLmNyZWF0ZUl0ZW0oa2V5KSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3VwZXIuZ2V0KGtleSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBvYmplY3QgaXMgYW4gb2JqZWN0IHdpdGggYSBgdGhlbmAgbWV0aG9kLCBhbmQgY2FuXG4gICAgICogdGhlcmVmb3JlIGJlIGFzc3VtZWQgdG8gYmVoYXZlIGFzIGEgUHJvbWlzZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIHRlc3QuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHZhbHVlIGlzIHRoZW5hYmxlLlxuICAgICAqL1xuICAgIGNvbnN0IGlzVGhlbmFibGUgPSB2YWx1ZSA9PiB7XG4gICAgICByZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSBcImZ1bmN0aW9uXCI7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW5kIHJldHVybnMgYSBmdW5jdGlvbiB3aGljaCwgd2hlbiBjYWxsZWQsIHdpbGwgcmVzb2x2ZSBvciByZWplY3RcbiAgICAgKiB0aGUgZ2l2ZW4gcHJvbWlzZSBiYXNlZCBvbiBob3cgaXQgaXMgY2FsbGVkOlxuICAgICAqXG4gICAgICogLSBJZiwgd2hlbiBjYWxsZWQsIGBjaHJvbWUucnVudGltZS5sYXN0RXJyb3JgIGNvbnRhaW5zIGEgbm9uLW51bGwgb2JqZWN0LFxuICAgICAqICAgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCB0aGF0IHZhbHVlLlxuICAgICAqIC0gSWYgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIGV4YWN0bHkgb25lIGFyZ3VtZW50LCB0aGUgcHJvbWlzZSBpc1xuICAgICAqICAgcmVzb2x2ZWQgdG8gdGhhdCB2YWx1ZS5cbiAgICAgKiAtIE90aGVyd2lzZSwgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgdG8gYW4gYXJyYXkgY29udGFpbmluZyBhbGwgb2YgdGhlXG4gICAgICogICBmdW5jdGlvbidzIGFyZ3VtZW50cy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwcm9taXNlXG4gICAgICogICAgICAgIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSByZXNvbHV0aW9uIGFuZCByZWplY3Rpb24gZnVuY3Rpb25zIG9mIGFcbiAgICAgKiAgICAgICAgcHJvbWlzZS5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBwcm9taXNlLnJlc29sdmVcbiAgICAgKiAgICAgICAgVGhlIHByb21pc2UncyByZXNvbHV0aW9uIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IHByb21pc2UucmVqZWN0XG4gICAgICogICAgICAgIFRoZSBwcm9taXNlJ3MgcmVqZWN0aW9uIGZ1bmN0aW9uLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBtZXRhZGF0YVxuICAgICAqICAgICAgICBNZXRhZGF0YSBhYm91dCB0aGUgd3JhcHBlZCBtZXRob2Qgd2hpY2ggaGFzIGNyZWF0ZWQgdGhlIGNhbGxiYWNrLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gbWV0YWRhdGEuc2luZ2xlQ2FsbGJhY2tBcmdcbiAgICAgKiAgICAgICAgV2hldGhlciBvciBub3QgdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQgd2l0aCBvbmx5IHRoZSBmaXJzdFxuICAgICAqICAgICAgICBhcmd1bWVudCBvZiB0aGUgY2FsbGJhY2ssIGFsdGVybmF0aXZlbHkgYW4gYXJyYXkgb2YgYWxsIHRoZVxuICAgICAqICAgICAgICBjYWxsYmFjayBhcmd1bWVudHMgaXMgcmVzb2x2ZWQuIEJ5IGRlZmF1bHQsIGlmIHRoZSBjYWxsYmFja1xuICAgICAqICAgICAgICBmdW5jdGlvbiBpcyBpbnZva2VkIHdpdGggb25seSBhIHNpbmdsZSBhcmd1bWVudCwgdGhhdCB3aWxsIGJlXG4gICAgICogICAgICAgIHJlc29sdmVkIHRvIHRoZSBwcm9taXNlLCB3aGlsZSBhbGwgYXJndW1lbnRzIHdpbGwgYmUgcmVzb2x2ZWQgYXNcbiAgICAgKiAgICAgICAgYW4gYXJyYXkgaWYgbXVsdGlwbGUgYXJlIGdpdmVuLlxuICAgICAqXG4gICAgICogQHJldHVybnMge2Z1bmN0aW9ufVxuICAgICAqICAgICAgICBUaGUgZ2VuZXJhdGVkIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNvbnN0IG1ha2VDYWxsYmFjayA9IChwcm9taXNlLCBtZXRhZGF0YSkgPT4ge1xuICAgICAgcmV0dXJuICguLi5jYWxsYmFja0FyZ3MpID0+IHtcbiAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICBwcm9taXNlLnJlamVjdChuZXcgRXJyb3IoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgIH0gZWxzZSBpZiAobWV0YWRhdGEuc2luZ2xlQ2FsbGJhY2tBcmcgfHxcbiAgICAgICAgICAgICAgICAgICAoY2FsbGJhY2tBcmdzLmxlbmd0aCA8PSAxICYmIG1ldGFkYXRhLnNpbmdsZUNhbGxiYWNrQXJnICE9PSBmYWxzZSkpIHtcbiAgICAgICAgICBwcm9taXNlLnJlc29sdmUoY2FsbGJhY2tBcmdzWzBdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwcm9taXNlLnJlc29sdmUoY2FsbGJhY2tBcmdzKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9O1xuXG4gICAgY29uc3QgcGx1cmFsaXplQXJndW1lbnRzID0gKG51bUFyZ3MpID0+IG51bUFyZ3MgPT0gMSA/IFwiYXJndW1lbnRcIiA6IFwiYXJndW1lbnRzXCI7XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGEgd3JhcHBlciBmdW5jdGlvbiBmb3IgYSBtZXRob2Qgd2l0aCB0aGUgZ2l2ZW4gbmFtZSBhbmQgbWV0YWRhdGEuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAqICAgICAgICBUaGUgbmFtZSBvZiB0aGUgbWV0aG9kIHdoaWNoIGlzIGJlaW5nIHdyYXBwZWQuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG1ldGFkYXRhXG4gICAgICogICAgICAgIE1ldGFkYXRhIGFib3V0IHRoZSBtZXRob2QgYmVpbmcgd3JhcHBlZC5cbiAgICAgKiBAcGFyYW0ge2ludGVnZXJ9IG1ldGFkYXRhLm1pbkFyZ3NcbiAgICAgKiAgICAgICAgVGhlIG1pbmltdW0gbnVtYmVyIG9mIGFyZ3VtZW50cyB3aGljaCBtdXN0IGJlIHBhc3NlZCB0byB0aGVcbiAgICAgKiAgICAgICAgZnVuY3Rpb24uIElmIGNhbGxlZCB3aXRoIGZld2VyIHRoYW4gdGhpcyBudW1iZXIgb2YgYXJndW1lbnRzLCB0aGVcbiAgICAgKiAgICAgICAgd3JhcHBlciB3aWxsIHJhaXNlIGFuIGV4Y2VwdGlvbi5cbiAgICAgKiBAcGFyYW0ge2ludGVnZXJ9IG1ldGFkYXRhLm1heEFyZ3NcbiAgICAgKiAgICAgICAgVGhlIG1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50cyB3aGljaCBtYXkgYmUgcGFzc2VkIHRvIHRoZVxuICAgICAqICAgICAgICBmdW5jdGlvbi4gSWYgY2FsbGVkIHdpdGggbW9yZSB0aGFuIHRoaXMgbnVtYmVyIG9mIGFyZ3VtZW50cywgdGhlXG4gICAgICogICAgICAgIHdyYXBwZXIgd2lsbCByYWlzZSBhbiBleGNlcHRpb24uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBtZXRhZGF0YS5zaW5nbGVDYWxsYmFja0FyZ1xuICAgICAqICAgICAgICBXaGV0aGVyIG9yIG5vdCB0aGUgcHJvbWlzZSBpcyByZXNvbHZlZCB3aXRoIG9ubHkgdGhlIGZpcnN0XG4gICAgICogICAgICAgIGFyZ3VtZW50IG9mIHRoZSBjYWxsYmFjaywgYWx0ZXJuYXRpdmVseSBhbiBhcnJheSBvZiBhbGwgdGhlXG4gICAgICogICAgICAgIGNhbGxiYWNrIGFyZ3VtZW50cyBpcyByZXNvbHZlZC4gQnkgZGVmYXVsdCwgaWYgdGhlIGNhbGxiYWNrXG4gICAgICogICAgICAgIGZ1bmN0aW9uIGlzIGludm9rZWQgd2l0aCBvbmx5IGEgc2luZ2xlIGFyZ3VtZW50LCB0aGF0IHdpbGwgYmVcbiAgICAgKiAgICAgICAgcmVzb2x2ZWQgdG8gdGhlIHByb21pc2UsIHdoaWxlIGFsbCBhcmd1bWVudHMgd2lsbCBiZSByZXNvbHZlZCBhc1xuICAgICAqICAgICAgICBhbiBhcnJheSBpZiBtdWx0aXBsZSBhcmUgZ2l2ZW4uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7ZnVuY3Rpb24ob2JqZWN0LCAuLi4qKX1cbiAgICAgKiAgICAgICBUaGUgZ2VuZXJhdGVkIHdyYXBwZXIgZnVuY3Rpb24uXG4gICAgICovXG4gICAgY29uc3Qgd3JhcEFzeW5jRnVuY3Rpb24gPSAobmFtZSwgbWV0YWRhdGEpID0+IHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiBhc3luY0Z1bmN0aW9uV3JhcHBlcih0YXJnZXQsIC4uLmFyZ3MpIHtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgbWV0YWRhdGEubWluQXJncykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXQgbGVhc3QgJHttZXRhZGF0YS5taW5BcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5taW5BcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtZXRhZGF0YS5tYXhBcmdzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhdCBtb3N0ICR7bWV0YWRhdGEubWF4QXJnc30gJHtwbHVyYWxpemVBcmd1bWVudHMobWV0YWRhdGEubWF4QXJncyl9IGZvciAke25hbWV9KCksIGdvdCAke2FyZ3MubGVuZ3RofWApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICBpZiAobWV0YWRhdGEuZmFsbGJhY2tUb05vQ2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIFRoaXMgQVBJIG1ldGhvZCBoYXMgY3VycmVudGx5IG5vIGNhbGxiYWNrIG9uIENocm9tZSwgYnV0IGl0IHJldHVybiBhIHByb21pc2Ugb24gRmlyZWZveCxcbiAgICAgICAgICAgIC8vIGFuZCBzbyB0aGUgcG9seWZpbGwgd2lsbCB0cnkgdG8gY2FsbCBpdCB3aXRoIGEgY2FsbGJhY2sgZmlyc3QsIGFuZCBpdCB3aWxsIGZhbGxiYWNrXG4gICAgICAgICAgICAvLyB0byBub3QgcGFzc2luZyB0aGUgY2FsbGJhY2sgaWYgdGhlIGZpcnN0IGNhbGwgZmFpbHMuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtyZXNvbHZlLCByZWplY3R9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoY2JFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYCR7bmFtZX0gQVBJIG1ldGhvZCBkb2Vzbid0IHNlZW0gdG8gc3VwcG9ydCB0aGUgY2FsbGJhY2sgcGFyYW1ldGVyLCBgICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZmFsbGluZyBiYWNrIHRvIGNhbGwgaXQgd2l0aG91dCBhIGNhbGxiYWNrOiBcIiwgY2JFcnJvcik7XG5cbiAgICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpO1xuXG4gICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgQVBJIG1ldGhvZCBtZXRhZGF0YSwgc28gdGhhdCB0aGUgbmV4dCBBUEkgY2FsbHMgd2lsbCBub3QgdHJ5IHRvXG4gICAgICAgICAgICAgIC8vIHVzZSB0aGUgdW5zdXBwb3J0ZWQgY2FsbGJhY2sgYW55bW9yZS5cbiAgICAgICAgICAgICAgbWV0YWRhdGEuZmFsbGJhY2tUb05vQ2FsbGJhY2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgbWV0YWRhdGEubm9DYWxsYmFjayA9IHRydWU7XG5cbiAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAobWV0YWRhdGEubm9DYWxsYmFjaykge1xuICAgICAgICAgICAgdGFyZ2V0W25hbWVdKC4uLmFyZ3MpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbbmFtZV0oLi4uYXJncywgbWFrZUNhbGxiYWNrKHtyZXNvbHZlLCByZWplY3R9LCBtZXRhZGF0YSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBXcmFwcyBhbiBleGlzdGluZyBtZXRob2Qgb2YgdGhlIHRhcmdldCBvYmplY3QsIHNvIHRoYXQgY2FsbHMgdG8gaXQgYXJlXG4gICAgICogaW50ZXJjZXB0ZWQgYnkgdGhlIGdpdmVuIHdyYXBwZXIgZnVuY3Rpb24uIFRoZSB3cmFwcGVyIGZ1bmN0aW9uIHJlY2VpdmVzLFxuICAgICAqIGFzIGl0cyBmaXJzdCBhcmd1bWVudCwgdGhlIG9yaWdpbmFsIGB0YXJnZXRgIG9iamVjdCwgZm9sbG93ZWQgYnkgZWFjaCBvZlxuICAgICAqIHRoZSBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBvcmlnaW5hbCBtZXRob2QuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4gICAgICogICAgICAgIFRoZSBvcmlnaW5hbCB0YXJnZXQgb2JqZWN0IHRoYXQgdGhlIHdyYXBwZWQgbWV0aG9kIGJlbG9uZ3MgdG8uXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gbWV0aG9kXG4gICAgICogICAgICAgIFRoZSBtZXRob2QgYmVpbmcgd3JhcHBlZC4gVGhpcyBpcyB1c2VkIGFzIHRoZSB0YXJnZXQgb2YgdGhlIFByb3h5XG4gICAgICogICAgICAgIG9iamVjdCB3aGljaCBpcyBjcmVhdGVkIHRvIHdyYXAgdGhlIG1ldGhvZC5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSB3cmFwcGVyXG4gICAgICogICAgICAgIFRoZSB3cmFwcGVyIGZ1bmN0aW9uIHdoaWNoIGlzIGNhbGxlZCBpbiBwbGFjZSBvZiBhIGRpcmVjdCBpbnZvY2F0aW9uXG4gICAgICogICAgICAgIG9mIHRoZSB3cmFwcGVkIG1ldGhvZC5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm94eTxmdW5jdGlvbj59XG4gICAgICogICAgICAgIEEgUHJveHkgb2JqZWN0IGZvciB0aGUgZ2l2ZW4gbWV0aG9kLCB3aGljaCBpbnZva2VzIHRoZSBnaXZlbiB3cmFwcGVyXG4gICAgICogICAgICAgIG1ldGhvZCBpbiBpdHMgcGxhY2UuXG4gICAgICovXG4gICAgY29uc3Qgd3JhcE1ldGhvZCA9ICh0YXJnZXQsIG1ldGhvZCwgd3JhcHBlcikgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBQcm94eShtZXRob2QsIHtcbiAgICAgICAgYXBwbHkodGFyZ2V0TWV0aG9kLCB0aGlzT2JqLCBhcmdzKSB7XG4gICAgICAgICAgcmV0dXJuIHdyYXBwZXIuY2FsbCh0aGlzT2JqLCB0YXJnZXQsIC4uLmFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGxldCBoYXNPd25Qcm9wZXJ0eSA9IEZ1bmN0aW9uLmNhbGwuYmluZChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcblxuICAgIC8qKlxuICAgICAqIFdyYXBzIGFuIG9iamVjdCBpbiBhIFByb3h5IHdoaWNoIGludGVyY2VwdHMgYW5kIHdyYXBzIGNlcnRhaW4gbWV0aG9kc1xuICAgICAqIGJhc2VkIG9uIHRoZSBnaXZlbiBgd3JhcHBlcnNgIGFuZCBgbWV0YWRhdGFgIG9iamVjdHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0XG4gICAgICogICAgICAgIFRoZSB0YXJnZXQgb2JqZWN0IHRvIHdyYXAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW3dyYXBwZXJzID0ge31dXG4gICAgICogICAgICAgIEFuIG9iamVjdCB0cmVlIGNvbnRhaW5pbmcgd3JhcHBlciBmdW5jdGlvbnMgZm9yIHNwZWNpYWwgY2FzZXMuIEFueVxuICAgICAqICAgICAgICBmdW5jdGlvbiBwcmVzZW50IGluIHRoaXMgb2JqZWN0IHRyZWUgaXMgY2FsbGVkIGluIHBsYWNlIG9mIHRoZVxuICAgICAqICAgICAgICBtZXRob2QgaW4gdGhlIHNhbWUgbG9jYXRpb24gaW4gdGhlIGB0YXJnZXRgIG9iamVjdCB0cmVlLiBUaGVzZVxuICAgICAqICAgICAgICB3cmFwcGVyIG1ldGhvZHMgYXJlIGludm9rZWQgYXMgZGVzY3JpYmVkIGluIHtAc2VlIHdyYXBNZXRob2R9LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFttZXRhZGF0YSA9IHt9XVxuICAgICAqICAgICAgICBBbiBvYmplY3QgdHJlZSBjb250YWluaW5nIG1ldGFkYXRhIHVzZWQgdG8gYXV0b21hdGljYWxseSBnZW5lcmF0ZVxuICAgICAqICAgICAgICBQcm9taXNlLWJhc2VkIHdyYXBwZXIgZnVuY3Rpb25zIGZvciBhc3luY2hyb25vdXMuIEFueSBmdW5jdGlvbiBpblxuICAgICAqICAgICAgICB0aGUgYHRhcmdldGAgb2JqZWN0IHRyZWUgd2hpY2ggaGFzIGEgY29ycmVzcG9uZGluZyBtZXRhZGF0YSBvYmplY3RcbiAgICAgKiAgICAgICAgaW4gdGhlIHNhbWUgbG9jYXRpb24gaW4gdGhlIGBtZXRhZGF0YWAgdHJlZSBpcyByZXBsYWNlZCB3aXRoIGFuXG4gICAgICogICAgICAgIGF1dG9tYXRpY2FsbHktZ2VuZXJhdGVkIHdyYXBwZXIgZnVuY3Rpb24sIGFzIGRlc2NyaWJlZCBpblxuICAgICAqICAgICAgICB7QHNlZSB3cmFwQXN5bmNGdW5jdGlvbn1cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtQcm94eTxvYmplY3Q+fVxuICAgICAqL1xuICAgIGNvbnN0IHdyYXBPYmplY3QgPSAodGFyZ2V0LCB3cmFwcGVycyA9IHt9LCBtZXRhZGF0YSA9IHt9KSA9PiB7XG4gICAgICBsZXQgY2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgbGV0IGhhbmRsZXJzID0ge1xuICAgICAgICBoYXMocHJveHlUYXJnZXQsIHByb3ApIHtcbiAgICAgICAgICByZXR1cm4gcHJvcCBpbiB0YXJnZXQgfHwgcHJvcCBpbiBjYWNoZTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXQocHJveHlUYXJnZXQsIHByb3AsIHJlY2VpdmVyKSB7XG4gICAgICAgICAgaWYgKHByb3AgaW4gY2FjaGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZVtwcm9wXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIShwcm9wIGluIHRhcmdldCkpIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IHZhbHVlID0gdGFyZ2V0W3Byb3BdO1xuXG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGEgbWV0aG9kIG9uIHRoZSB1bmRlcmx5aW5nIG9iamVjdC4gQ2hlY2sgaWYgd2UgbmVlZCB0byBkb1xuICAgICAgICAgICAgLy8gYW55IHdyYXBwaW5nLlxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHdyYXBwZXJzW3Byb3BdID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIHNwZWNpYWwtY2FzZSB3cmFwcGVyIGZvciB0aGlzIG1ldGhvZC5cbiAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwTWV0aG9kKHRhcmdldCwgdGFyZ2V0W3Byb3BdLCB3cmFwcGVyc1twcm9wXSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhhc093blByb3BlcnR5KG1ldGFkYXRhLCBwcm9wKSkge1xuICAgICAgICAgICAgICAvLyBUaGlzIGlzIGFuIGFzeW5jIG1ldGhvZCB0aGF0IHdlIGhhdmUgbWV0YWRhdGEgZm9yLiBDcmVhdGUgYVxuICAgICAgICAgICAgICAvLyBQcm9taXNlIHdyYXBwZXIgZm9yIGl0LlxuICAgICAgICAgICAgICBsZXQgd3JhcHBlciA9IHdyYXBBc3luY0Z1bmN0aW9uKHByb3AsIG1ldGFkYXRhW3Byb3BdKTtcbiAgICAgICAgICAgICAgdmFsdWUgPSB3cmFwTWV0aG9kKHRhcmdldCwgdGFyZ2V0W3Byb3BdLCB3cmFwcGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBtZXRob2QgdGhhdCB3ZSBkb24ndCBrbm93IG9yIGNhcmUgYWJvdXQuIFJldHVybiB0aGVcbiAgICAgICAgICAgICAgLy8gb3JpZ2luYWwgbWV0aG9kLCBib3VuZCB0byB0aGUgdW5kZXJseWluZyBvYmplY3QuXG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuYmluZCh0YXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICAgICAgICAoaGFzT3duUHJvcGVydHkod3JhcHBlcnMsIHByb3ApIHx8XG4gICAgICAgICAgICAgICAgICAgICAgaGFzT3duUHJvcGVydHkobWV0YWRhdGEsIHByb3ApKSkge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBhbiBvYmplY3QgdGhhdCB3ZSBuZWVkIHRvIGRvIHNvbWUgd3JhcHBpbmcgZm9yIHRoZSBjaGlsZHJlblxuICAgICAgICAgICAgLy8gb2YuIENyZWF0ZSBhIHN1Yi1vYmplY3Qgd3JhcHBlciBmb3IgaXQgd2l0aCB0aGUgYXBwcm9wcmlhdGUgY2hpbGRcbiAgICAgICAgICAgIC8vIG1ldGFkYXRhLlxuICAgICAgICAgICAgdmFsdWUgPSB3cmFwT2JqZWN0KHZhbHVlLCB3cmFwcGVyc1twcm9wXSwgbWV0YWRhdGFbcHJvcF0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaGFzT3duUHJvcGVydHkobWV0YWRhdGEsIFwiKlwiKSkge1xuICAgICAgICAgICAgLy8gV3JhcCBhbGwgcHJvcGVydGllcyBpbiAqIG5hbWVzcGFjZS5cbiAgICAgICAgICAgIHZhbHVlID0gd3JhcE9iamVjdCh2YWx1ZSwgd3JhcHBlcnNbcHJvcF0sIG1ldGFkYXRhW1wiKlwiXSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gYW55IHdyYXBwaW5nIGZvciB0aGlzIHByb3BlcnR5LFxuICAgICAgICAgICAgLy8gc28ganVzdCBmb3J3YXJkIGFsbCBhY2Nlc3MgdG8gdGhlIHVuZGVybHlpbmcgb2JqZWN0LlxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNhY2hlLCBwcm9wLCB7XG4gICAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgZ2V0KCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXJnZXRbcHJvcF07XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHNldCh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjYWNoZVtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXQocHJveHlUYXJnZXQsIHByb3AsIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgICAgIGlmIChwcm9wIGluIGNhY2hlKSB7XG4gICAgICAgICAgICBjYWNoZVtwcm9wXSA9IHZhbHVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVmaW5lUHJvcGVydHkocHJveHlUYXJnZXQsIHByb3AsIGRlc2MpIHtcbiAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eShjYWNoZSwgcHJvcCwgZGVzYyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVsZXRlUHJvcGVydHkocHJveHlUYXJnZXQsIHByb3ApIHtcbiAgICAgICAgICByZXR1cm4gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eShjYWNoZSwgcHJvcCk7XG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICAvLyBQZXIgY29udHJhY3Qgb2YgdGhlIFByb3h5IEFQSSwgdGhlIFwiZ2V0XCIgcHJveHkgaGFuZGxlciBtdXN0IHJldHVybiB0aGVcbiAgICAgIC8vIG9yaWdpbmFsIHZhbHVlIG9mIHRoZSB0YXJnZXQgaWYgdGhhdCB2YWx1ZSBpcyBkZWNsYXJlZCByZWFkLW9ubHkgYW5kXG4gICAgICAvLyBub24tY29uZmlndXJhYmxlLiBGb3IgdGhpcyByZWFzb24sIHdlIGNyZWF0ZSBhbiBvYmplY3Qgd2l0aCB0aGVcbiAgICAgIC8vIHByb3RvdHlwZSBzZXQgdG8gYHRhcmdldGAgaW5zdGVhZCBvZiB1c2luZyBgdGFyZ2V0YCBkaXJlY3RseS5cbiAgICAgIC8vIE90aGVyd2lzZSB3ZSBjYW5ub3QgcmV0dXJuIGEgY3VzdG9tIG9iamVjdCBmb3IgQVBJcyB0aGF0XG4gICAgICAvLyBhcmUgZGVjbGFyZWQgcmVhZC1vbmx5IGFuZCBub24tY29uZmlndXJhYmxlLCBzdWNoIGFzIGBjaHJvbWUuZGV2dG9vbHNgLlxuICAgICAgLy9cbiAgICAgIC8vIFRoZSBwcm94eSBoYW5kbGVycyB0aGVtc2VsdmVzIHdpbGwgc3RpbGwgdXNlIHRoZSBvcmlnaW5hbCBgdGFyZ2V0YFxuICAgICAgLy8gaW5zdGVhZCBvZiB0aGUgYHByb3h5VGFyZ2V0YCwgc28gdGhhdCB0aGUgbWV0aG9kcyBhbmQgcHJvcGVydGllcyBhcmVcbiAgICAgIC8vIGRlcmVmZXJlbmNlZCB2aWEgdGhlIG9yaWdpbmFsIHRhcmdldHMuXG4gICAgICBsZXQgcHJveHlUYXJnZXQgPSBPYmplY3QuY3JlYXRlKHRhcmdldCk7XG4gICAgICByZXR1cm4gbmV3IFByb3h5KHByb3h5VGFyZ2V0LCBoYW5kbGVycyk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBzZXQgb2Ygd3JhcHBlciBmdW5jdGlvbnMgZm9yIGFuIGV2ZW50IG9iamVjdCwgd2hpY2ggaGFuZGxlc1xuICAgICAqIHdyYXBwaW5nIG9mIGxpc3RlbmVyIGZ1bmN0aW9ucyB0aGF0IHRob3NlIG1lc3NhZ2VzIGFyZSBwYXNzZWQuXG4gICAgICpcbiAgICAgKiBBIHNpbmdsZSB3cmFwcGVyIGlzIGNyZWF0ZWQgZm9yIGVhY2ggbGlzdGVuZXIgZnVuY3Rpb24sIGFuZCBzdG9yZWQgaW4gYVxuICAgICAqIG1hcC4gU3Vic2VxdWVudCBjYWxscyB0byBgYWRkTGlzdGVuZXJgLCBgaGFzTGlzdGVuZXJgLCBvciBgcmVtb3ZlTGlzdGVuZXJgXG4gICAgICogcmV0cmlldmUgdGhlIG9yaWdpbmFsIHdyYXBwZXIsIHNvIHRoYXQgIGF0dGVtcHRzIHRvIHJlbW92ZSBhXG4gICAgICogcHJldmlvdXNseS1hZGRlZCBsaXN0ZW5lciB3b3JrIGFzIGV4cGVjdGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtEZWZhdWx0V2Vha01hcDxmdW5jdGlvbiwgZnVuY3Rpb24+fSB3cmFwcGVyTWFwXG4gICAgICogICAgICAgIEEgRGVmYXVsdFdlYWtNYXAgb2JqZWN0IHdoaWNoIHdpbGwgY3JlYXRlIHRoZSBhcHByb3ByaWF0ZSB3cmFwcGVyXG4gICAgICogICAgICAgIGZvciBhIGdpdmVuIGxpc3RlbmVyIGZ1bmN0aW9uIHdoZW4gb25lIGRvZXMgbm90IGV4aXN0LCBhbmQgcmV0cmlldmVcbiAgICAgKiAgICAgICAgYW4gZXhpc3Rpbmcgb25lIHdoZW4gaXQgZG9lcy5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgY29uc3Qgd3JhcEV2ZW50ID0gd3JhcHBlck1hcCA9PiAoe1xuICAgICAgYWRkTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lciwgLi4uYXJncykge1xuICAgICAgICB0YXJnZXQuYWRkTGlzdGVuZXIod3JhcHBlck1hcC5nZXQobGlzdGVuZXIpLCAuLi5hcmdzKTtcbiAgICAgIH0sXG5cbiAgICAgIGhhc0xpc3RlbmVyKHRhcmdldCwgbGlzdGVuZXIpIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldC5oYXNMaXN0ZW5lcih3cmFwcGVyTWFwLmdldChsaXN0ZW5lcikpO1xuICAgICAgfSxcblxuICAgICAgcmVtb3ZlTGlzdGVuZXIodGFyZ2V0LCBsaXN0ZW5lcikge1xuICAgICAgICB0YXJnZXQucmVtb3ZlTGlzdGVuZXIod3JhcHBlck1hcC5nZXQobGlzdGVuZXIpKTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBvblJlcXVlc3RGaW5pc2hlZFdyYXBwZXJzID0gbmV3IERlZmF1bHRXZWFrTWFwKGxpc3RlbmVyID0+IHtcbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gbGlzdGVuZXI7XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogV3JhcHMgYW4gb25SZXF1ZXN0RmluaXNoZWQgbGlzdGVuZXIgZnVuY3Rpb24gc28gdGhhdCBpdCB3aWxsIHJldHVybiBhXG4gICAgICAgKiBgZ2V0Q29udGVudCgpYCBwcm9wZXJ0eSB3aGljaCByZXR1cm5zIGEgYFByb21pc2VgIHJhdGhlciB0aGFuIHVzaW5nIGFcbiAgICAgICAqIGNhbGxiYWNrIEFQSS5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVxXG4gICAgICAgKiAgICAgICAgVGhlIEhBUiBlbnRyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBuZXR3b3JrIHJlcXVlc3QuXG4gICAgICAgKi9cbiAgICAgIHJldHVybiBmdW5jdGlvbiBvblJlcXVlc3RGaW5pc2hlZChyZXEpIHtcbiAgICAgICAgY29uc3Qgd3JhcHBlZFJlcSA9IHdyYXBPYmplY3QocmVxLCB7fSAvKiB3cmFwcGVycyAqLywge1xuICAgICAgICAgIGdldENvbnRlbnQ6IHtcbiAgICAgICAgICAgIG1pbkFyZ3M6IDAsXG4gICAgICAgICAgICBtYXhBcmdzOiAwLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBsaXN0ZW5lcih3cmFwcGVkUmVxKTtcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvLyBLZWVwIHRyYWNrIGlmIHRoZSBkZXByZWNhdGlvbiB3YXJuaW5nIGhhcyBiZWVuIGxvZ2dlZCBhdCBsZWFzdCBvbmNlLlxuICAgIGxldCBsb2dnZWRTZW5kUmVzcG9uc2VEZXByZWNhdGlvbldhcm5pbmcgPSBmYWxzZTtcblxuICAgIGNvbnN0IG9uTWVzc2FnZVdyYXBwZXJzID0gbmV3IERlZmF1bHRXZWFrTWFwKGxpc3RlbmVyID0+IHtcbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gbGlzdGVuZXI7XG4gICAgICB9XG5cbiAgICAgIC8qKlxuICAgICAgICogV3JhcHMgYSBtZXNzYWdlIGxpc3RlbmVyIGZ1bmN0aW9uIHNvIHRoYXQgaXQgbWF5IHNlbmQgcmVzcG9uc2VzIGJhc2VkIG9uXG4gICAgICAgKiBpdHMgcmV0dXJuIHZhbHVlLCByYXRoZXIgdGhhbiBieSByZXR1cm5pbmcgYSBzZW50aW5lbCB2YWx1ZSBhbmQgY2FsbGluZyBhXG4gICAgICAgKiBjYWxsYmFjay4gSWYgdGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHJldHVybnMgYSBQcm9taXNlLCB0aGUgcmVzcG9uc2UgaXNcbiAgICAgICAqIHNlbnQgd2hlbiB0aGUgcHJvbWlzZSBlaXRoZXIgcmVzb2x2ZXMgb3IgcmVqZWN0cy5cbiAgICAgICAqXG4gICAgICAgKiBAcGFyYW0geyp9IG1lc3NhZ2VcbiAgICAgICAqICAgICAgICBUaGUgbWVzc2FnZSBzZW50IGJ5IHRoZSBvdGhlciBlbmQgb2YgdGhlIGNoYW5uZWwuXG4gICAgICAgKiBAcGFyYW0ge29iamVjdH0gc2VuZGVyXG4gICAgICAgKiAgICAgICAgRGV0YWlscyBhYm91dCB0aGUgc2VuZGVyIG9mIHRoZSBtZXNzYWdlLlxuICAgICAgICogQHBhcmFtIHtmdW5jdGlvbigqKX0gc2VuZFJlc3BvbnNlXG4gICAgICAgKiAgICAgICAgQSBjYWxsYmFjayB3aGljaCwgd2hlbiBjYWxsZWQgd2l0aCBhbiBhcmJpdHJhcnkgYXJndW1lbnQsIHNlbmRzXG4gICAgICAgKiAgICAgICAgdGhhdCB2YWx1ZSBhcyBhIHJlc3BvbnNlLlxuICAgICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICAgKiAgICAgICAgVHJ1ZSBpZiB0aGUgd3JhcHBlZCBsaXN0ZW5lciByZXR1cm5lZCBhIFByb21pc2UsIHdoaWNoIHdpbGwgbGF0ZXJcbiAgICAgICAqICAgICAgICB5aWVsZCBhIHJlc3BvbnNlLiBGYWxzZSBvdGhlcndpc2UuXG4gICAgICAgKi9cbiAgICAgIHJldHVybiBmdW5jdGlvbiBvbk1lc3NhZ2UobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpIHtcbiAgICAgICAgbGV0IGRpZENhbGxTZW5kUmVzcG9uc2UgPSBmYWxzZTtcblxuICAgICAgICBsZXQgd3JhcHBlZFNlbmRSZXNwb25zZTtcbiAgICAgICAgbGV0IHNlbmRSZXNwb25zZVByb21pc2UgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICB3cmFwcGVkU2VuZFJlc3BvbnNlID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmICghbG9nZ2VkU2VuZFJlc3BvbnNlRGVwcmVjYXRpb25XYXJuaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybihTRU5EX1JFU1BPTlNFX0RFUFJFQ0FUSU9OX1dBUk5JTkcsIG5ldyBFcnJvcigpLnN0YWNrKTtcbiAgICAgICAgICAgICAgbG9nZ2VkU2VuZFJlc3BvbnNlRGVwcmVjYXRpb25XYXJuaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpZENhbGxTZW5kUmVzcG9uc2UgPSB0cnVlO1xuICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXN1bHQgPSBsaXN0ZW5lcihtZXNzYWdlLCBzZW5kZXIsIHdyYXBwZWRTZW5kUmVzcG9uc2UpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICByZXN1bHQgPSBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaXNSZXN1bHRUaGVuYWJsZSA9IHJlc3VsdCAhPT0gdHJ1ZSAmJiBpc1RoZW5hYmxlKHJlc3VsdCk7XG5cbiAgICAgICAgLy8gSWYgdGhlIGxpc3RlbmVyIGRpZG4ndCByZXR1cm5lZCB0cnVlIG9yIGEgUHJvbWlzZSwgb3IgY2FsbGVkXG4gICAgICAgIC8vIHdyYXBwZWRTZW5kUmVzcG9uc2Ugc3luY2hyb25vdXNseSwgd2UgY2FuIGV4aXQgZWFybGllclxuICAgICAgICAvLyBiZWNhdXNlIHRoZXJlIHdpbGwgYmUgbm8gcmVzcG9uc2Ugc2VudCBmcm9tIHRoaXMgbGlzdGVuZXIuXG4gICAgICAgIGlmIChyZXN1bHQgIT09IHRydWUgJiYgIWlzUmVzdWx0VGhlbmFibGUgJiYgIWRpZENhbGxTZW5kUmVzcG9uc2UpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBIHNtYWxsIGhlbHBlciB0byBzZW5kIHRoZSBtZXNzYWdlIGlmIHRoZSBwcm9taXNlIHJlc29sdmVzXG4gICAgICAgIC8vIGFuZCBhbiBlcnJvciBpZiB0aGUgcHJvbWlzZSByZWplY3RzIChhIHdyYXBwZWQgc2VuZE1lc3NhZ2UgaGFzXG4gICAgICAgIC8vIHRvIHRyYW5zbGF0ZSB0aGUgbWVzc2FnZSBpbnRvIGEgcmVzb2x2ZWQgcHJvbWlzZSBvciBhIHJlamVjdGVkXG4gICAgICAgIC8vIHByb21pc2UpLlxuICAgICAgICBjb25zdCBzZW5kUHJvbWlzZWRSZXN1bHQgPSAocHJvbWlzZSkgPT4ge1xuICAgICAgICAgIHByb21pc2UudGhlbihtc2cgPT4ge1xuICAgICAgICAgICAgLy8gc2VuZCB0aGUgbWVzc2FnZSB2YWx1ZS5cbiAgICAgICAgICAgIHNlbmRSZXNwb25zZShtc2cpO1xuICAgICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgIC8vIFNlbmQgYSBKU09OIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBlcnJvciBpZiB0aGUgcmVqZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgIC8vIGlzIGFuIGluc3RhbmNlIG9mIGVycm9yLCBvciB0aGUgb2JqZWN0IGl0c2VsZiBvdGhlcndpc2UuXG4gICAgICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgICAgIGlmIChlcnJvciAmJiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciB8fFxuICAgICAgICAgICAgICAgIHR5cGVvZiBlcnJvci5tZXNzYWdlID09PSBcInN0cmluZ1wiKSkge1xuICAgICAgICAgICAgICBtZXNzYWdlID0gZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1lc3NhZ2UgPSBcIkFuIHVuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWRcIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgX19tb3pXZWJFeHRlbnNpb25Qb2x5ZmlsbFJlamVjdF9fOiB0cnVlLFxuICAgICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgIC8vIFByaW50IGFuIGVycm9yIG9uIHRoZSBjb25zb2xlIGlmIHVuYWJsZSB0byBzZW5kIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gc2VuZCBvbk1lc3NhZ2UgcmVqZWN0ZWQgcmVwbHlcIiwgZXJyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJZiB0aGUgbGlzdGVuZXIgcmV0dXJuZWQgYSBQcm9taXNlLCBzZW5kIHRoZSByZXNvbHZlZCB2YWx1ZSBhcyBhXG4gICAgICAgIC8vIHJlc3VsdCwgb3RoZXJ3aXNlIHdhaXQgdGhlIHByb21pc2UgcmVsYXRlZCB0byB0aGUgd3JhcHBlZFNlbmRSZXNwb25zZVxuICAgICAgICAvLyBjYWxsYmFjayB0byByZXNvbHZlIGFuZCBzZW5kIGl0IGFzIGEgcmVzcG9uc2UuXG4gICAgICAgIGlmIChpc1Jlc3VsdFRoZW5hYmxlKSB7XG4gICAgICAgICAgc2VuZFByb21pc2VkUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VuZFByb21pc2VkUmVzdWx0KHNlbmRSZXNwb25zZVByb21pc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGV0IENocm9tZSBrbm93IHRoYXQgdGhlIGxpc3RlbmVyIGlzIHJlcGx5aW5nLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICBjb25zdCB3cmFwcGVkU2VuZE1lc3NhZ2VDYWxsYmFjayA9ICh7cmVqZWN0LCByZXNvbHZlfSwgcmVwbHkpID0+IHtcbiAgICAgIGlmIChleHRlbnNpb25BUElzLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIC8vIERldGVjdCB3aGVuIG5vbmUgb2YgdGhlIGxpc3RlbmVycyByZXBsaWVkIHRvIHRoZSBzZW5kTWVzc2FnZSBjYWxsIGFuZCByZXNvbHZlXG4gICAgICAgIC8vIHRoZSBwcm9taXNlIHRvIHVuZGVmaW5lZCBhcyBpbiBGaXJlZm94LlxuICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvd2ViZXh0ZW5zaW9uLXBvbHlmaWxsL2lzc3Vlcy8xMzBcbiAgICAgICAgaWYgKGV4dGVuc2lvbkFQSXMucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSA9PT0gQ0hST01FX1NFTkRfTUVTU0FHRV9DQUxMQkFDS19OT19SRVNQT05TRV9NRVNTQUdFKSB7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZXh0ZW5zaW9uQVBJcy5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocmVwbHkgJiYgcmVwbHkuX19tb3pXZWJFeHRlbnNpb25Qb2x5ZmlsbFJlamVjdF9fKSB7XG4gICAgICAgIC8vIENvbnZlcnQgYmFjayB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZXJyb3IgaW50b1xuICAgICAgICAvLyBhbiBFcnJvciBpbnN0YW5jZS5cbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihyZXBseS5tZXNzYWdlKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHJlcGx5KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3Qgd3JhcHBlZFNlbmRNZXNzYWdlID0gKG5hbWUsIG1ldGFkYXRhLCBhcGlOYW1lc3BhY2VPYmosIC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmIChhcmdzLmxlbmd0aCA8IG1ldGFkYXRhLm1pbkFyZ3MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhdCBsZWFzdCAke21ldGFkYXRhLm1pbkFyZ3N9ICR7cGx1cmFsaXplQXJndW1lbnRzKG1ldGFkYXRhLm1pbkFyZ3MpfSBmb3IgJHtuYW1lfSgpLCBnb3QgJHthcmdzLmxlbmd0aH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gbWV0YWRhdGEubWF4QXJncykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIGF0IG1vc3QgJHttZXRhZGF0YS5tYXhBcmdzfSAke3BsdXJhbGl6ZUFyZ3VtZW50cyhtZXRhZGF0YS5tYXhBcmdzKX0gZm9yICR7bmFtZX0oKSwgZ290ICR7YXJncy5sZW5ndGh9YCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHdyYXBwZWRDYiA9IHdyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrLmJpbmQobnVsbCwge3Jlc29sdmUsIHJlamVjdH0pO1xuICAgICAgICBhcmdzLnB1c2god3JhcHBlZENiKTtcbiAgICAgICAgYXBpTmFtZXNwYWNlT2JqLnNlbmRNZXNzYWdlKC4uLmFyZ3MpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHN0YXRpY1dyYXBwZXJzID0ge1xuICAgICAgZGV2dG9vbHM6IHtcbiAgICAgICAgbmV0d29yazoge1xuICAgICAgICAgIG9uUmVxdWVzdEZpbmlzaGVkOiB3cmFwRXZlbnQob25SZXF1ZXN0RmluaXNoZWRXcmFwcGVycyksXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgcnVudGltZToge1xuICAgICAgICBvbk1lc3NhZ2U6IHdyYXBFdmVudChvbk1lc3NhZ2VXcmFwcGVycyksXG4gICAgICAgIG9uTWVzc2FnZUV4dGVybmFsOiB3cmFwRXZlbnQob25NZXNzYWdlV3JhcHBlcnMpLFxuICAgICAgICBzZW5kTWVzc2FnZTogd3JhcHBlZFNlbmRNZXNzYWdlLmJpbmQobnVsbCwgXCJzZW5kTWVzc2FnZVwiLCB7bWluQXJnczogMSwgbWF4QXJnczogM30pLFxuICAgICAgfSxcbiAgICAgIHRhYnM6IHtcbiAgICAgICAgc2VuZE1lc3NhZ2U6IHdyYXBwZWRTZW5kTWVzc2FnZS5iaW5kKG51bGwsIFwic2VuZE1lc3NhZ2VcIiwge21pbkFyZ3M6IDIsIG1heEFyZ3M6IDN9KSxcbiAgICAgIH0sXG4gICAgfTtcbiAgICBjb25zdCBzZXR0aW5nTWV0YWRhdGEgPSB7XG4gICAgICBjbGVhcjoge21pbkFyZ3M6IDEsIG1heEFyZ3M6IDF9LFxuICAgICAgZ2V0OiB7bWluQXJnczogMSwgbWF4QXJnczogMX0sXG4gICAgICBzZXQ6IHttaW5BcmdzOiAxLCBtYXhBcmdzOiAxfSxcbiAgICB9O1xuICAgIGFwaU1ldGFkYXRhLnByaXZhY3kgPSB7XG4gICAgICBuZXR3b3JrOiB7XCIqXCI6IHNldHRpbmdNZXRhZGF0YX0sXG4gICAgICBzZXJ2aWNlczoge1wiKlwiOiBzZXR0aW5nTWV0YWRhdGF9LFxuICAgICAgd2Vic2l0ZXM6IHtcIipcIjogc2V0dGluZ01ldGFkYXRhfSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHdyYXBPYmplY3QoZXh0ZW5zaW9uQVBJcywgc3RhdGljV3JhcHBlcnMsIGFwaU1ldGFkYXRhKTtcbiAgfTtcblxuICBpZiAodHlwZW9mIGNocm9tZSAhPSBcIm9iamVjdFwiIHx8ICFjaHJvbWUgfHwgIWNocm9tZS5ydW50aW1lIHx8ICFjaHJvbWUucnVudGltZS5pZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgc2NyaXB0IHNob3VsZCBvbmx5IGJlIGxvYWRlZCBpbiBhIGJyb3dzZXIgZXh0ZW5zaW9uLlwiKTtcbiAgfVxuXG4gIC8vIFRoZSBidWlsZCBwcm9jZXNzIGFkZHMgYSBVTUQgd3JhcHBlciBhcm91bmQgdGhpcyBmaWxlLCB3aGljaCBtYWtlcyB0aGVcbiAgLy8gYG1vZHVsZWAgdmFyaWFibGUgYXZhaWxhYmxlLlxuICBtb2R1bGUuZXhwb3J0cyA9IHdyYXBBUElzKGNocm9tZSk7XG59IGVsc2Uge1xuICBtb2R1bGUuZXhwb3J0cyA9IGJyb3dzZXI7XG59XG4iLCIvKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgZXllbydzIFdlYiBFeHRlbnNpb24gQWQgQmxvY2tpbmcgVG9vbGtpdCAoRVdFKSxcbiAqIENvcHlyaWdodCAoQykgMjAwNi1wcmVzZW50IGV5ZW8gR21iSFxuICpcbiAqIEVXRSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIHZlcnNpb24gMyBhc1xuICogcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24uXG4gKlxuICogRVdFIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogYWxvbmcgd2l0aCBFV0UuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuaW1wb3J0IGJyb3dzZXIgZnJvbSBcIndlYmV4dGVuc2lvbi1wb2x5ZmlsbFwiO1xuaW1wb3J0IHtpZ25vcmVOb0Nvbm5lY3Rpb25FcnJvcn0gZnJvbSBcIi4uL2Vycm9ycy5qc1wiO1xuXG5jb25zdCBNQVhfRVJST1JfVEhSRVNIT0xEID0gMzA7XG5jb25zdCBNQVhfUVVFVUVEX0VWRU5UUyA9IDIwO1xuY29uc3QgRVZFTlRfSU5URVJWQUxfTVMgPSAxMDA7XG5cbmxldCBlcnJvckNvdW50ID0gMDtcbmxldCBldmVudFByb2Nlc3NpbmdJbnRlcnZhbCA9IG51bGw7XG5sZXQgZXZlbnRQcm9jZXNzaW5nSW5Qcm9ncmVzcyA9IGZhbHNlO1xubGV0IGV2ZW50UXVldWUgPSBbXTtcblxuZnVuY3Rpb24gaXNFdmVudFRydXN0ZWQoZXZlbnQpIHtcbiAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZihldmVudCkgPT09IEN1c3RvbUV2ZW50LnByb3RvdHlwZSAmJlxuICAgICFPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChldmVudCwgXCJkZXRhaWxcIik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFsbG93bGlzdERvbWFpbihldmVudCkge1xuICBpZiAoIWlzRXZlbnRUcnVzdGVkKGV2ZW50KSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBpZ25vcmVOb0Nvbm5lY3Rpb25FcnJvcihcbiAgICBicm93c2VyLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogXCJld2U6YWxsb3dsaXN0LXBhZ2VcIixcbiAgICAgIHRpbWVzdGFtcDogZXZlbnQuZGV0YWlsLnRpbWVzdGFtcCxcbiAgICAgIHNpZ25hdHVyZTogZXZlbnQuZGV0YWlsLnNpZ25hdHVyZVxuICAgIH0pXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NOZXh0RXZlbnQoKSB7XG4gIGlmIChldmVudFByb2Nlc3NpbmdJblByb2dyZXNzKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBldmVudFByb2Nlc3NpbmdJblByb2dyZXNzID0gdHJ1ZTtcbiAgICBsZXQgZXZlbnQgPSBldmVudFF1ZXVlLnNoaWZ0KCk7XG4gICAgaWYgKGV2ZW50KSB7XG4gICAgICB0cnkge1xuICAgICAgICBsZXQgYWxsb3dsaXN0aW5nUmVzdWx0ID0gYXdhaXQgYWxsb3dsaXN0RG9tYWluKGV2ZW50KTtcbiAgICAgICAgaWYgKGFsbG93bGlzdGluZ1Jlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiZG9tYWluX2FsbG93bGlzdGluZ19zdWNjZXNzXCIpKTtcbiAgICAgICAgICBzdG9wT25lQ2xpY2tBbGxvd2xpc3RpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEb21haW4gYWxsb3dsaXN0aW5nIHJlamVjdGVkXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBlcnJvckNvdW50Kys7XG4gICAgICAgIGlmIChlcnJvckNvdW50ID49IE1BWF9FUlJPUl9USFJFU0hPTEQpIHtcbiAgICAgICAgICBzdG9wT25lQ2xpY2tBbGxvd2xpc3RpbmcoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghZXZlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHN0b3BQcm9jZXNzaW5nSW50ZXJ2YWwoKTtcbiAgICB9XG4gIH1cbiAgZmluYWxseSB7XG4gICAgZXZlbnRQcm9jZXNzaW5nSW5Qcm9ncmVzcyA9IGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIG9uRG9tYWluQWxsb3dsaXN0aW5nUmVxdWVzdChldmVudCkge1xuICBpZiAoZXZlbnRRdWV1ZS5sZW5ndGggPj0gTUFYX1FVRVVFRF9FVkVOVFMpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBldmVudFF1ZXVlLnB1c2goZXZlbnQpO1xuICBzdGFydFByb2Nlc3NpbmdJbnRlcnZhbCgpO1xufVxuXG5mdW5jdGlvbiBzdGFydFByb2Nlc3NpbmdJbnRlcnZhbCgpIHtcbiAgaWYgKCFldmVudFByb2Nlc3NpbmdJbnRlcnZhbCkge1xuICAgIHByb2Nlc3NOZXh0RXZlbnQoKTtcbiAgICBldmVudFByb2Nlc3NpbmdJbnRlcnZhbCA9IHNldEludGVydmFsKHByb2Nlc3NOZXh0RXZlbnQsIEVWRU5UX0lOVEVSVkFMX01TKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzdG9wUHJvY2Vzc2luZ0ludGVydmFsKCkge1xuICBjbGVhckludGVydmFsKGV2ZW50UHJvY2Vzc2luZ0ludGVydmFsKTtcbiAgZXZlbnRQcm9jZXNzaW5nSW50ZXJ2YWwgPSBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcE9uZUNsaWNrQWxsb3dsaXN0aW5nKCkge1xuICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiZG9tYWluX2FsbG93bGlzdGluZ19yZXF1ZXN0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Eb21haW5BbGxvd2xpc3RpbmdSZXF1ZXN0LCB0cnVlKTtcbiAgZXZlbnRRdWV1ZSA9IFtdO1xuICBzdG9wUHJvY2Vzc2luZ0ludGVydmFsKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydE9uZUNsaWNrQWxsb3dsaXN0aW5nKCkge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiZG9tYWluX2FsbG93bGlzdGluZ19yZXF1ZXN0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Eb21haW5BbGxvd2xpc3RpbmdSZXF1ZXN0LCB0cnVlKTtcbn1cbiIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBleWVvJ3MgV2ViIEV4dGVuc2lvbiBBZCBCbG9ja2luZyBUb29sa2l0IChFV0UpLFxuICogQ29weXJpZ2h0IChDKSAyMDA2LXByZXNlbnQgZXllbyBHbWJIXG4gKlxuICogRVdFIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgdmVyc2lvbiAzIGFzXG4gKiBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbi5cbiAqXG4gKiBFV0UgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIEVXRS4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5pbXBvcnQgYnJvd3NlciBmcm9tIFwid2ViZXh0ZW5zaW9uLXBvbHlmaWxsXCI7XG5pbXBvcnQge2lnbm9yZU5vQ29ubmVjdGlvbkVycm9yfSBmcm9tIFwiLi4vZXJyb3JzLmpzXCI7XG5cbmxldCBjb2xsYXBzZWRTZWxlY3RvcnMgPSBuZXcgU2V0KCk7XG5sZXQgb2JzZXJ2ZXJzID0gbmV3IFdlYWtNYXAoKTtcblxuZnVuY3Rpb24gZ2V0VVJMRnJvbUVsZW1lbnQoZWxlbWVudCkge1xuICBpZiAoZWxlbWVudC5sb2NhbE5hbWUgPT0gXCJvYmplY3RcIikge1xuICAgIGlmIChlbGVtZW50LmRhdGEpIHtcbiAgICAgIHJldHVybiBlbGVtZW50LmRhdGE7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgY2hpbGQgb2YgZWxlbWVudC5jaGlsZHJlbikge1xuICAgICAgaWYgKGNoaWxkLmxvY2FsTmFtZSA9PSBcInBhcmFtXCIgJiYgY2hpbGQubmFtZSA9PSBcIm1vdmllXCIgJiYgY2hpbGQudmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBVUkwoY2hpbGQudmFsdWUsIGRvY3VtZW50LmJhc2VVUkkpLmhyZWY7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4gZWxlbWVudC5jdXJyZW50U3JjIHx8IGVsZW1lbnQuc3JjO1xufVxuXG5mdW5jdGlvbiBnZXRTZWxlY3RvckZvckJsb2NrZWRFbGVtZW50KGVsZW1lbnQpIHtcbiAgLy8gU2V0dGluZyB0aGUgXCJkaXNwbGF5XCIgQ1NTIHByb3BlcnR5IHRvIFwibm9uZVwiIGRvZXNuJ3QgaGF2ZSBhbnkgZWZmZWN0IG9uXG4gIC8vIDxmcmFtZT4gZWxlbWVudHMgKGluIGZyYW1lc2V0cykuIFNvIHdlIGhhdmUgdG8gaGlkZSBpdCBpbmxpbmUgdGhyb3VnaFxuICAvLyB0aGUgXCJ2aXNpYmlsaXR5XCIgQ1NTIHByb3BlcnR5LlxuICBpZiAoZWxlbWVudC5sb2NhbE5hbWUgPT0gXCJmcmFtZVwiKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBJZiB0aGUgPHZpZGVvPiBvciA8YXVkaW8+IGVsZW1lbnQgY29udGFpbnMgYW55IDxzb3VyY2U+IGNoaWxkcmVuLFxuICAvLyB3ZSBjYW5ub3QgYWRkcmVzcyBpdCBpbiBDU1MgYnkgdGhlIHNvdXJjZSBVUkw7IGluIHRoYXQgY2FzZSB3ZVxuICAvLyBkb24ndCBcImNvbGxhcHNlXCIgaXQgdXNpbmcgYSBDU1Mgc2VsZWN0b3IgYnV0IHJhdGhlciBoaWRlIGl0IGRpcmVjdGx5IGJ5XG4gIC8vIHNldHRpbmcgdGhlIHN0eWxlPVwiLi4uXCIgYXR0cmlidXRlLlxuICBpZiAoZWxlbWVudC5sb2NhbE5hbWUgPT0gXCJ2aWRlb1wiIHx8IGVsZW1lbnQubG9jYWxOYW1lID09IFwiYXVkaW9cIikge1xuICAgIGZvciAobGV0IGNoaWxkIG9mIGVsZW1lbnQuY2hpbGRyZW4pIHtcbiAgICAgIGlmIChjaGlsZC5sb2NhbE5hbWUgPT0gXCJzb3VyY2VcIikge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBsZXQgc2VsZWN0b3IgPSBcIlwiO1xuICBmb3IgKGxldCBhdHRyIG9mIFtcInNyY1wiLCBcInNyY3NldFwiXSkge1xuICAgIGxldCB2YWx1ZSA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKGF0dHIpO1xuICAgIGlmICh2YWx1ZSAmJiBhdHRyIGluIGVsZW1lbnQpIHtcbiAgICAgIHNlbGVjdG9yICs9IFwiW1wiICsgYXR0ciArIFwiPVwiICsgQ1NTLmVzY2FwZSh2YWx1ZSkgKyBcIl1cIjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2VsZWN0b3IgPyBlbGVtZW50LmxvY2FsTmFtZSArIHNlbGVjdG9yIDogbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhpZGVFbGVtZW50KGVsZW1lbnQsIHByb3BlcnRpZXMpIHtcbiAgbGV0IHtzdHlsZX0gPSBlbGVtZW50O1xuXG4gIGlmICghcHJvcGVydGllcykge1xuICAgIGlmIChlbGVtZW50LmxvY2FsTmFtZSA9PSBcImZyYW1lXCIpIHtcbiAgICAgIHByb3BlcnRpZXMgPSBbW1widmlzaWJpbGl0eVwiLCBcImhpZGRlblwiXV07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcHJvcGVydGllcyA9IFtbXCJkaXNwbGF5XCIsIFwibm9uZVwiXV07XG4gICAgfVxuICB9XG5cbiAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIHByb3BlcnRpZXMpIHtcbiAgICBzdHlsZS5zZXRQcm9wZXJ0eShrZXksIHZhbHVlLCBcImltcG9ydGFudFwiKTtcbiAgfVxuXG4gIGlmIChvYnNlcnZlcnMuaGFzKGVsZW1lbnQpKSB7XG4gICAgb2JzZXJ2ZXJzLmdldChlbGVtZW50KS5kaXNjb25uZWN0KCk7XG4gIH1cblxuICBsZXQgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigoKSA9PiB7XG4gICAgZm9yIChsZXQgW2tleSwgdmFsdWVdIG9mIHByb3BlcnRpZXMpIHtcbiAgICAgIGlmIChzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKGtleSkgIT0gdmFsdWUgfHxcbiAgICAgICAgICBzdHlsZS5nZXRQcm9wZXJ0eVByaW9yaXR5KGtleSkgIT0gXCJpbXBvcnRhbnRcIikge1xuICAgICAgICBzdHlsZS5zZXRQcm9wZXJ0eShrZXksIHZhbHVlLCBcImltcG9ydGFudFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuICBvYnNlcnZlci5vYnNlcnZlKFxuICAgIGVsZW1lbnQsIHtcbiAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICBhdHRyaWJ1dGVGaWx0ZXI6IFtcInN0eWxlXCJdXG4gICAgfVxuICApO1xuICBvYnNlcnZlcnMuc2V0KGVsZW1lbnQsIG9ic2VydmVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVuaGlkZUVsZW1lbnQoZWxlbWVudCkge1xuICBsZXQgb2JzZXJ2ZXIgPSBvYnNlcnZlcnMuZ2V0KGVsZW1lbnQpO1xuICBpZiAob2JzZXJ2ZXIpIHtcbiAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgb2JzZXJ2ZXJzLmRlbGV0ZShlbGVtZW50KTtcbiAgfVxuXG4gIGxldCBwcm9wZXJ0eSA9IGVsZW1lbnQubG9jYWxOYW1lID09IFwiZnJhbWVcIiA/IFwidmlzaWJpbGl0eVwiIDogXCJkaXNwbGF5XCI7XG4gIGVsZW1lbnQuc3R5bGUucmVtb3ZlUHJvcGVydHkocHJvcGVydHkpO1xufVxuXG5mdW5jdGlvbiBjb2xsYXBzZUVsZW1lbnQoZWxlbWVudCkge1xuICBsZXQgc2VsZWN0b3IgPSBnZXRTZWxlY3RvckZvckJsb2NrZWRFbGVtZW50KGVsZW1lbnQpO1xuICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgaGlkZUVsZW1lbnQoZWxlbWVudCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKCFjb2xsYXBzZWRTZWxlY3RvcnMuaGFzKHNlbGVjdG9yKSkge1xuICAgIGlnbm9yZU5vQ29ubmVjdGlvbkVycm9yKFxuICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgdHlwZTogXCJld2U6aW5qZWN0LWNzc1wiLFxuICAgICAgICBzZWxlY3RvclxuICAgICAgfSlcbiAgICApO1xuICAgIGNvbGxhcHNlZFNlbGVjdG9ycy5hZGQoc2VsZWN0b3IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhpZGVJbkFib3V0QmxhbmtGcmFtZXMoc2VsZWN0b3IsIHVybHMpIHtcbiAgLy8gUmVzb3VyY2VzIChlLmcuIGltYWdlcykgbG9hZGVkIGludG8gYWJvdXQ6YmxhbmsgZnJhbWVzXG4gIC8vIGFyZSAoc29tZXRpbWVzKSBsb2FkZWQgd2l0aCB0aGUgZnJhbWVJZCBvZiB0aGUgbWFpbl9mcmFtZS5cbiAgZm9yIChsZXQgZnJhbWUgb2YgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImlmcmFtZVtzcmM9J2Fib3V0OmJsYW5rJ11cIikpIHtcbiAgICBpZiAoIWZyYW1lLmNvbnRlbnREb2N1bWVudCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgZm9yIChsZXQgZWxlbWVudCBvZiBmcmFtZS5jb250ZW50RG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpIHtcbiAgICAgIC8vIFVzZSBoaWRlRWxlbWVudCwgYmVjYXVzZSB3ZSBkb24ndCBoYXZlIHRoZSBjb3JyZWN0IGZyYW1lSWRcbiAgICAgIC8vIGZvciB0aGUgXCJld2U6aW5qZWN0LWNzc1wiIG1lc3NhZ2UuXG4gICAgICBpZiAodXJscy5oYXMoZ2V0VVJMRnJvbUVsZW1lbnQoZWxlbWVudCkpKSB7XG4gICAgICAgIGhpZGVFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRFbGVtZW50Q29sbGFwc2luZygpIHtcbiAgbGV0IGRlZmVycmVkID0gbnVsbDtcblxuICBicm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIpID0+IHtcbiAgICBpZiAoIW1lc3NhZ2UgfHwgbWVzc2FnZS50eXBlICE9IFwiZXdlOmNvbGxhcHNlXCIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PSBcImxvYWRpbmdcIikge1xuICAgICAgaWYgKCFkZWZlcnJlZCkge1xuICAgICAgICBkZWZlcnJlZCA9IG5ldyBNYXAoKTtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgKCkgPT4ge1xuICAgICAgICAgIC8vIFVuZGVyIHNvbWUgY29uZGl0aW9ucyBhIGhvc3RpbGUgc2NyaXB0IGNvdWxkIHRyeSB0byB0cmlnZ2VyXG4gICAgICAgICAgLy8gdGhlIGV2ZW50IGFnYWluLiBTaW5jZSB3ZSBzZXQgZGVmZXJyZWQgdG8gYG51bGxgLCB0aGVuXG4gICAgICAgICAgLy8gd2UgYXNzdW1lIHRoYXQgd2Ugc2hvdWxkIGp1c3QgcmV0dXJuIGluc3RlYWQgb2YgdGhyb3dpbmdcbiAgICAgICAgICAvLyBhIFR5cGVFcnJvci5cbiAgICAgICAgICBpZiAoIWRlZmVycmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZm9yIChsZXQgW3NlbGVjdG9yLCB1cmxzXSBvZiBkZWZlcnJlZCkge1xuICAgICAgICAgICAgZm9yIChsZXQgZWxlbWVudCBvZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICBpZiAodXJscy5oYXMoZ2V0VVJMRnJvbUVsZW1lbnQoZWxlbWVudCkpKSB7XG4gICAgICAgICAgICAgICAgY29sbGFwc2VFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGhpZGVJbkFib3V0QmxhbmtGcmFtZXMoc2VsZWN0b3IsIHVybHMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRlZmVycmVkID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGxldCB1cmxzID0gZGVmZXJyZWQuZ2V0KG1lc3NhZ2Uuc2VsZWN0b3IpIHx8IG5ldyBTZXQoKTtcbiAgICAgIGRlZmVycmVkLnNldChtZXNzYWdlLnNlbGVjdG9yLCB1cmxzKTtcbiAgICAgIHVybHMuYWRkKG1lc3NhZ2UudXJsKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBmb3IgKGxldCBlbGVtZW50IG9mIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwobWVzc2FnZS5zZWxlY3RvcikpIHtcbiAgICAgICAgaWYgKGdldFVSTEZyb21FbGVtZW50KGVsZW1lbnQpID09IG1lc3NhZ2UudXJsKSB7XG4gICAgICAgICAgY29sbGFwc2VFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGhpZGVJbkFib3V0QmxhbmtGcmFtZXMobWVzc2FnZS5zZWxlY3RvciwgbmV3IFNldChbbWVzc2FnZS51cmxdKSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59XG4iLCIvKlxuICogVGhpcyBmaWxlIGlzIHBhcnQgb2YgZXllbydzIFdlYiBFeHRlbnNpb24gQWQgQmxvY2tpbmcgVG9vbGtpdCAoRVdFKSxcbiAqIENvcHlyaWdodCAoQykgMjAwNi1wcmVzZW50IGV5ZW8gR21iSFxuICpcbiAqIEVXRSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIHZlcnNpb24gMyBhc1xuICogcHVibGlzaGVkIGJ5IHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb24uXG4gKlxuICogRVdFIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuICogYWxvbmcgd2l0aCBFV0UuICBJZiBub3QsIHNlZSA8aHR0cDovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuaW1wb3J0IGJyb3dzZXIgZnJvbSBcIndlYmV4dGVuc2lvbi1wb2x5ZmlsbFwiO1xuaW1wb3J0IHtpZ25vcmVOb0Nvbm5lY3Rpb25FcnJvcn0gZnJvbSBcIi4uL2Vycm9ycy5qc1wiO1xuXG5leHBvcnQgY2xhc3MgRWxlbWVudEhpZGluZ1RyYWNlciB7XG4gIGNvbnN0cnVjdG9yKHNlbGVjdG9ycykge1xuICAgIHRoaXMuc2VsZWN0b3JzID0gbmV3IE1hcChzZWxlY3RvcnMpO1xuXG4gICAgdGhpcy5vYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKCgpID0+IHtcbiAgICAgIHRoaXMub2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnRyYWNlKCksIDEwMDApO1xuICAgIH0pO1xuXG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT0gXCJsb2FkaW5nXCIpIHtcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHRoaXMudHJhY2UoKSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy50cmFjZSgpO1xuICAgIH1cbiAgfVxuXG4gIGxvZyhmaWx0ZXJzLCBzZWxlY3RvcnMgPSBbXSkge1xuICAgIGlnbm9yZU5vQ29ubmVjdGlvbkVycm9yKGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZShcbiAgICAgIHt0eXBlOiBcImV3ZTp0cmFjZS1lbGVtLWhpZGVcIiwgZmlsdGVycywgc2VsZWN0b3JzfVxuICAgICkpO1xuICB9XG5cbiAgdHJhY2UoKSB7XG4gICAgbGV0IGZpbHRlcnMgPSBbXTtcbiAgICBsZXQgc2VsZWN0b3JzID0gW107XG5cbiAgICBmb3IgKGxldCBbc2VsZWN0b3IsIGZpbHRlcl0gb2YgdGhpcy5zZWxlY3RvcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKSkge1xuICAgICAgICAgIHRoaXMuc2VsZWN0b3JzLmRlbGV0ZShzZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGZpbHRlcikge1xuICAgICAgICAgICAgZmlsdGVycy5wdXNoKGZpbHRlcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VsZWN0b3JzLnB1c2goc2VsZWN0b3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlLnRvU3RyaW5nKCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmaWx0ZXJzLmxlbmd0aCA+IDAgfHwgc2VsZWN0b3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMubG9nKGZpbHRlcnMsIHNlbGVjdG9ycyk7XG4gICAgfVxuXG4gICAgdGhpcy5vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LCB7Y2hpbGRMaXN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VidHJlZTogdHJ1ZX0pO1xuICB9XG5cbiAgZGlzY29ubmVjdCgpIHtcbiAgICB0aGlzLm9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgfVxufVxuIiwiLypcbiAqIFRoaXMgZmlsZSBpcyBwYXJ0IG9mIGV5ZW8ncyBXZWIgRXh0ZW5zaW9uIEFkIEJsb2NraW5nIFRvb2xraXQgKEVXRSksXG4gKiBDb3B5cmlnaHQgKEMpIDIwMDYtcHJlc2VudCBleWVvIEdtYkhcbiAqXG4gKiBFV0UgaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSB2ZXJzaW9uIDMgYXNcbiAqIHB1Ymxpc2hlZCBieSB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLlxuICpcbiAqIEVXRSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2VcbiAqIGFsb25nIHdpdGggRVdFLiAgSWYgbm90LCBzZWUgPGh0dHA6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbmltcG9ydCBicm93c2VyIGZyb20gXCJ3ZWJleHRlbnNpb24tcG9seWZpbGxcIjtcbmltcG9ydCB7aWdub3JlTm9Db25uZWN0aW9uRXJyb3J9IGZyb20gXCIuLi9lcnJvcnMuanNcIjtcblxuY29uc3QgQUxMT1dFRF9ET01BSU5TID0gbmV3IFNldChbXG4gIFwiYWJwY2hpbmEub3JnXCIsXG4gIFwiYWJwaW5kby5ibG9nc3BvdC5jb21cIixcbiAgXCJhYnB2bi5jb21cIixcbiAgXCJhZGJsb2NrLmVlXCIsXG4gIFwiYWRibG9jay5nYXJkYXIubmV0XCIsXG4gIFwiYWRibG9ja3BsdXMubWVcIixcbiAgXCJhZGJsb2NrcGx1cy5vcmdcIixcbiAgXCJhYnB0ZXN0cGFnZXMub3JnXCIsXG4gIFwiY29tbWVudGNhbWFyY2hlLm5ldFwiLFxuICBcImRyb2l0LWZpbmFuY2VzLmNvbW1lbnRjYW1hcmNoZS5jb21cIixcbiAgXCJlYXN5bGlzdC50b1wiLFxuICBcImV5ZW8uY29tXCIsXG4gIFwiZmFuYm95LmNvLm56XCIsXG4gIFwiZmlsdGVybGlzdHMuY29tXCIsXG4gIFwiZm9ydW1zLmxhbmlrLnVzXCIsXG4gIFwiZ2l0ZWUuY29tXCIsXG4gIFwiZ2l0ZWUuaW9cIixcbiAgXCJnaXRodWIuY29tXCIsXG4gIFwiZ2l0aHViLmlvXCIsXG4gIFwiZ2l0bGFiLmNvbVwiLFxuICBcImdpdGxhYi5pb1wiLFxuICBcImd1cnVkLmVlXCIsXG4gIFwiaHVnb2xlc2NhcmdvdC5jb21cIixcbiAgXCJpLWRvbnQtY2FyZS1hYm91dC1jb29raWVzLmV1XCIsXG4gIFwiam91cm5hbGRlc2ZlbW1lcy5mclwiLFxuICBcImpvdXJuYWxkdW5ldC5jb21cIixcbiAgXCJsaW50ZXJuYXV0ZS5jb21cIixcbiAgXCJzcGFtNDA0LmNvbVwiLFxuICBcInN0YW5ldi5vcmdcIixcbiAgXCJ2b2lkLmdyXCIsXG4gIFwieGZpbGVzLm5vYWRzLml0XCIsXG4gIFwiem9zby5yb1wiXG5dKTtcblxuZnVuY3Rpb24gaXNEb21haW5BbGxvd2VkKGRvbWFpbikge1xuICBpZiAoZG9tYWluLmVuZHNXaXRoKFwiLlwiKSkge1xuICAgIGRvbWFpbiA9IGRvbWFpbi5zdWJzdHJpbmcoMCwgZG9tYWluLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBpZiAoQUxMT1dFRF9ET01BSU5TLmhhcyhkb21haW4pKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgbGV0IGluZGV4ID0gZG9tYWluLmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChpbmRleCA9PSAtMSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBkb21haW4gPSBkb21haW4uc3Vic3RyKGluZGV4ICsgMSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN1YnNjcmliZUxpbmtzRW5hYmxlZCh1cmwpIHtcbiAgbGV0IHtwcm90b2NvbCwgaG9zdG5hbWV9ID0gbmV3IFVSTCh1cmwpO1xuICByZXR1cm4gaG9zdG5hbWUgPT0gXCJsb2NhbGhvc3RcIiB8fFxuICAgIHByb3RvY29sID09IFwiaHR0cHM6XCIgJiYgaXNEb21haW5BbGxvd2VkKGhvc3RuYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhbmRsZVN1YnNjcmliZUxpbmtzKCkge1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZXZlbnQgPT4ge1xuICAgIGlmIChldmVudC5idXR0b24gPT0gMiB8fCAhZXZlbnQuaXNUcnVzdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGxpbmsgPSBldmVudC50YXJnZXQ7XG4gICAgd2hpbGUgKCEobGluayBpbnN0YW5jZW9mIEhUTUxBbmNob3JFbGVtZW50KSkge1xuICAgICAgbGluayA9IGxpbmsucGFyZW50Tm9kZTtcblxuICAgICAgaWYgKCFsaW5rKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgcXVlcnlTdHJpbmcgPSBudWxsO1xuICAgIGlmIChsaW5rLnByb3RvY29sID09IFwiaHR0cDpcIiB8fCBsaW5rLnByb3RvY29sID09IFwiaHR0cHM6XCIpIHtcbiAgICAgIGlmIChsaW5rLmhvc3QgPT0gXCJzdWJzY3JpYmUuYWRibG9ja3BsdXMub3JnXCIgJiYgbGluay5wYXRobmFtZSA9PSBcIi9cIikge1xuICAgICAgICBxdWVyeVN0cmluZyA9IGxpbmsuc2VhcmNoLnN1YnN0cigxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBGaXJlZm94IGRvZXNuJ3Qgc2VlbSB0byBwb3B1bGF0ZSB0aGUgXCJzZWFyY2hcIiBwcm9wZXJ0eSBmb3JcbiAgICAgIC8vIGxpbmtzIHdpdGggbm9uLXN0YW5kYXJkIFVSTCBzY2hlbWVzIHNvIHdlIG5lZWQgdG8gZXh0cmFjdCB0aGUgcXVlcnlcbiAgICAgIC8vIHN0cmluZyBtYW51YWxseS5cbiAgICAgIGxldCBtYXRjaCA9IC9eYWJwOlxcLypzdWJzY3JpYmVcXC8qXFw/KC4qKS9pLmV4ZWMobGluay5ocmVmKTtcbiAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICBxdWVyeVN0cmluZyA9IG1hdGNoWzFdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghcXVlcnlTdHJpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgdGl0bGUgPSBudWxsO1xuICAgIGxldCB1cmwgPSBudWxsO1xuICAgIGZvciAobGV0IHBhcmFtIG9mIHF1ZXJ5U3RyaW5nLnNwbGl0KFwiJlwiKSkge1xuICAgICAgbGV0IHBhcnRzID0gcGFyYW0uc3BsaXQoXCI9XCIsIDIpO1xuICAgICAgaWYgKHBhcnRzLmxlbmd0aCAhPSAyIHx8ICEvXFxTLy50ZXN0KHBhcnRzWzFdKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHN3aXRjaCAocGFydHNbMF0pIHtcbiAgICAgICAgY2FzZSBcInRpdGxlXCI6XG4gICAgICAgICAgdGl0bGUgPSBkZWNvZGVVUklDb21wb25lbnQocGFydHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwibG9jYXRpb25cIjpcbiAgICAgICAgICB1cmwgPSBkZWNvZGVVUklDb21wb25lbnQocGFydHNbMV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXVybCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGl0bGUpIHtcbiAgICAgIHRpdGxlID0gdXJsO1xuICAgIH1cblxuICAgIHRpdGxlID0gdGl0bGUudHJpbSgpO1xuICAgIHVybCA9IHVybC50cmltKCk7XG4gICAgaWYgKCEvXihodHRwcz98ZnRwKTovLnRlc3QodXJsKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlnbm9yZU5vQ29ubmVjdGlvbkVycm9yKFxuICAgICAgYnJvd3Nlci5ydW50aW1lLnNlbmRNZXNzYWdlKHt0eXBlOiBcImV3ZTpzdWJzY3JpYmUtbGluay1jbGlja2VkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlLCB1cmx9KVxuICAgICk7XG5cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICB9LCB0cnVlKTtcbn1cbiIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBleWVvJ3MgV2ViIEV4dGVuc2lvbiBBZCBCbG9ja2luZyBUb29sa2l0IChFV0UpLFxuICogQ29weXJpZ2h0IChDKSAyMDA2LXByZXNlbnQgZXllbyBHbWJIXG4gKlxuICogRVdFIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgdmVyc2lvbiAzIGFzXG4gKiBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbi5cbiAqXG4gKiBFV0UgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIEVXRS4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5jb25zdCBFUlJPUl9OT19DT05ORUNUSU9OID0gXCJDb3VsZCBub3QgZXN0YWJsaXNoIGNvbm5lY3Rpb24uIFwiICtcbiAgICAgIFwiUmVjZWl2aW5nIGVuZCBkb2VzIG5vdCBleGlzdC5cIjtcbmNvbnN0IEVSUk9SX0NMT1NFRF9DT05ORUNUSU9OID0gXCJBIGxpc3RlbmVyIGluZGljYXRlZCBhbiBhc3luY2hyb25vdXMgXCIgK1xuICAgICAgXCJyZXNwb25zZSBieSByZXR1cm5pbmcgdHJ1ZSwgYnV0IHRoZSBtZXNzYWdlIGNoYW5uZWwgY2xvc2VkIGJlZm9yZSBhIFwiICtcbiAgICAgIFwicmVzcG9uc2Ugd2FzIHJlY2VpdmVkXCI7XG4vLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD0xNTc4Njk3XG5jb25zdCBFUlJPUl9NQU5BR0VSX0RJU0NPTk5FQ1RFRCA9IFwiTWVzc2FnZSBtYW5hZ2VyIGRpc2Nvbm5lY3RlZFwiO1xuXG5leHBvcnQgY29uc3QgRVJST1JfRElTQUJMRURfUlVMRV9MSU1JVF9SRUFDSEVEID0gXCJUaGUgbnVtYmVyIG9mIGRpc2FibGVkIHN0YXRpYyBcIiArXG4gICAgICBcInJ1bGVzIGV4Y2VlZHMgdGhlIGRpc2FibGVkIHJ1bGUgY291bnQgbGltaXQuXCI7XG5cbmV4cG9ydCBjb25zdCBFUlJPUl9EVVBMSUNBVEVfRklMVEVSUyA9IFwic3RvcmFnZV9kdXBsaWNhdGVfZmlsdGVyc1wiO1xuZXhwb3J0IGNvbnN0IEVSUk9SX0ZJTFRFUl9OT1RfRk9VTkQgPSBcImZpbHRlcl9ub3RfZm91bmRcIjtcbmV4cG9ydCBjb25zdCBFUlJPUl9UT09fTUFOWV9GSUxURVJTID0gXCJ0b29fbWFueV9maWx0ZXJzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpZ25vcmVOb0Nvbm5lY3Rpb25FcnJvcihwcm9taXNlKSB7XG4gIHJldHVybiBwcm9taXNlLmNhdGNoKGVycm9yID0+IHtcbiAgICBpZiAodHlwZW9mIGVycm9yID09IFwib2JqZWN0XCIgJiZcbiAgICAgICAgKGVycm9yLm1lc3NhZ2UgPT0gRVJST1JfTk9fQ09OTkVDVElPTiB8fFxuICAgICAgICAgZXJyb3IubWVzc2FnZSA9PSBFUlJPUl9DTE9TRURfQ09OTkVDVElPTiB8fFxuICAgICAgICAgZXJyb3IubWVzc2FnZSA9PSBFUlJPUl9NQU5BR0VSX0RJU0NPTk5FQ1RFRCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aHJvdyBlcnJvcjtcbiAgfSk7XG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgcGFydCBvZiBleWVvJ3MgV2ViIEV4dGVuc2lvbiBBZCBCbG9ja2luZyBUb29sa2l0IChFV0UpLFxuICogQ29weXJpZ2h0IChDKSAyMDA2LXByZXNlbnQgZXllbyBHbWJIXG4gKlxuICogRVdFIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgdmVyc2lvbiAzIGFzXG4gKiBwdWJsaXNoZWQgYnkgdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbi5cbiAqXG4gKiBFV0UgaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlXG4gKiBhbG9uZyB3aXRoIEVXRS4gIElmIG5vdCwgc2VlIDxodHRwOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG5pbXBvcnQgYnJvd3NlciBmcm9tIFwid2ViZXh0ZW5zaW9uLXBvbHlmaWxsXCI7XG5cbmltcG9ydCB7RWxlbUhpZGVFbXVsYXRpb259XG4gIGZyb20gXCJhZGJsb2NrcGx1c2NvcmUvbGliL2NvbnRlbnQvZWxlbUhpZGVFbXVsYXRpb24uanNcIjtcblxuaW1wb3J0IHtpZ25vcmVOb0Nvbm5lY3Rpb25FcnJvcn0gZnJvbSBcIi4uL2Vycm9ycy5qc1wiO1xuaW1wb3J0IHtzdGFydEVsZW1lbnRDb2xsYXBzaW5nLCBoaWRlRWxlbWVudCwgdW5oaWRlRWxlbWVudH1cbiAgZnJvbSBcIi4vZWxlbWVudC1jb2xsYXBzaW5nLmpzXCI7XG5pbXBvcnQge3N0YXJ0T25lQ2xpY2tBbGxvd2xpc3Rpbmd9IGZyb20gXCIuL2FsbG93bGlzdGluZy5qc1wiO1xuaW1wb3J0IHtFbGVtZW50SGlkaW5nVHJhY2VyfSBmcm9tIFwiLi9lbGVtZW50LWhpZGluZy10cmFjZXIuanNcIjtcbmltcG9ydCB7c3Vic2NyaWJlTGlua3NFbmFibGVkLCBoYW5kbGVTdWJzY3JpYmVMaW5rc30gZnJvbSBcIi4vc3Vic2NyaWJlLWxpbmtzLmpzXCI7XG5cbmxldCB0cmFjZXI7XG5sZXQgZWxlbUhpZGVFbXVsYXRpb247XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRDb250ZW50RmVhdHVyZXMoKSB7XG4gIGlmIChzdWJzY3JpYmVMaW5rc0VuYWJsZWQod2luZG93LmxvY2F0aW9uLmhyZWYpKSB7XG4gICAgaGFuZGxlU3Vic2NyaWJlTGlua3MoKTtcbiAgfVxuXG4gIGxldCByZXNwb25zZSA9IGF3YWl0IGlnbm9yZU5vQ29ubmVjdGlvbkVycm9yKFxuICAgIGJyb3dzZXIucnVudGltZS5zZW5kTWVzc2FnZSh7dHlwZTogXCJld2U6Y29udGVudC1oZWxsb1wifSlcbiAgKTtcblxuICBpZiAocmVzcG9uc2UpIHtcbiAgICBhd2FpdCBhcHBseUNvbnRlbnRGZWF0dXJlcyhyZXNwb25zZSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVtb3ZlQ29udGVudEZlYXR1cmVzKCkge1xuICBpZiAodHJhY2VyKSB7XG4gICAgdHJhY2VyLmRpc2Nvbm5lY3QoKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBhcHBseUNvbnRlbnRGZWF0dXJlcyhyZXNwb25zZSkge1xuICBpZiAocmVzcG9uc2UudHJhY2VkU2VsZWN0b3JzKSB7XG4gICAgdHJhY2VyID0gbmV3IEVsZW1lbnRIaWRpbmdUcmFjZXIocmVzcG9uc2UudHJhY2VkU2VsZWN0b3JzKTtcbiAgfVxuXG4gIGNvbnN0IGhpZGVFbGVtZW50cyA9IChlbGVtZW50cywgZmlsdGVycykgPT4ge1xuICAgIGZvciAobGV0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICAgIGhpZGVFbGVtZW50KGVsZW1lbnQsIHJlc3BvbnNlLmNzc1Byb3BlcnRpZXMpO1xuICAgIH1cblxuICAgIGlmICh0cmFjZXIpIHtcbiAgICAgIHRyYWNlci5sb2coZmlsdGVycyk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHVuaGlkZUVsZW1lbnRzID0gZWxlbWVudHMgPT4ge1xuICAgIGZvciAobGV0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICAgIHVuaGlkZUVsZW1lbnQoZWxlbWVudCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHJlbW92ZUVsZW1lbnRzID0gKGVsZW1lbnRzLCBmaWx0ZXJzKSA9PiB7XG4gICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgICBlbGVtZW50LnJlbW92ZSgpO1xuICAgIH1cblxuICAgIGlmICh0cmFjZXIpIHtcbiAgICAgIHRyYWNlci5sb2coZmlsdGVycyk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGFwcGx5SW5saW5lQ1NTID0gKGVsZW1lbnRzLCBjc3NQYXR0ZXJucykgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcbiAgICAgIGNvbnN0IHBhdHRlcm4gPSBjc3NQYXR0ZXJuc1tpXTtcblxuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMocGF0dGVybi5jc3MpKSB7XG4gICAgICAgIGVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoa2V5LCB2YWx1ZSwgXCJpbXBvcnRhbnRcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRyYWNlcikge1xuICAgICAgY29uc3QgZmlsdGVyVGV4dHMgPSBjc3NQYXR0ZXJucy5tYXAocGF0dGVybiA9PiBwYXR0ZXJuLnRleHQpO1xuICAgICAgdHJhY2VyLmxvZyhmaWx0ZXJUZXh0cyk7XG4gICAgfVxuICB9O1xuXG4gIGlmIChyZXNwb25zZS5lbXVsYXRlZFBhdHRlcm5zLmxlbmd0aCA+IDApIHtcbiAgICBpZiAoIWVsZW1IaWRlRW11bGF0aW9uKSB7XG4gICAgICBlbGVtSGlkZUVtdWxhdGlvbiA9IG5ldyBFbGVtSGlkZUVtdWxhdGlvbihoaWRlRWxlbWVudHMsIHVuaGlkZUVsZW1lbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlRWxlbWVudHMsIGFwcGx5SW5saW5lQ1NTKTtcbiAgICB9XG4gICAgZWxlbUhpZGVFbXVsYXRpb24uYXBwbHkocmVzcG9uc2UuZW11bGF0ZWRQYXR0ZXJucyk7XG4gIH1cbiAgZWxzZSBpZiAoZWxlbUhpZGVFbXVsYXRpb24pIHtcbiAgICBlbGVtSGlkZUVtdWxhdGlvbi5hcHBseShyZXNwb25zZS5lbXVsYXRlZFBhdHRlcm5zKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBvbk1lc3NhZ2UobWVzc2FnZSkge1xuICBpZiAodHlwZW9mIG1lc3NhZ2UgPT0gXCJvYmplY3RcIiAmJiBtZXNzYWdlICE9IG51bGwgJiZcbiAgICBtZXNzYWdlLnR5cGUgJiYgbWVzc2FnZS50eXBlID09IFwiZXdlOmFwcGx5LWNvbnRlbnQtZmVhdHVyZXNcIikge1xuICAgIHJlbW92ZUNvbnRlbnRGZWF0dXJlcygpO1xuICAgIGFwcGx5Q29udGVudEZlYXR1cmVzKG1lc3NhZ2UpO1xuICB9XG59XG5icm93c2VyLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKG9uTWVzc2FnZSk7XG5cbnN0YXJ0RWxlbWVudENvbGxhcHNpbmcoKTtcbnN0YXJ0T25lQ2xpY2tBbGxvd2xpc3RpbmcoKTtcbmluaXRDb250ZW50RmVhdHVyZXMoKTtcbiJdLCJuYW1lcyI6WyJicm93c2VyIiwiT2JqZWN0IiwiZ2V0UHJvdG90eXBlT2YiLCJwcm90b3R5cGUiLCJDSFJPTUVfU0VORF9NRVNTQUdFX0NBTExCQUNLX05PX1JFU1BPTlNFX01FU1NBR0UiLCJTRU5EX1JFU1BPTlNFX0RFUFJFQ0FUSU9OX1dBUk5JTkciLCJ3cmFwQVBJcyIsImV4dGVuc2lvbkFQSXMiLCJhcGlNZXRhZGF0YSIsImtleXMiLCJsZW5ndGgiLCJFcnJvciIsIkRlZmF1bHRXZWFrTWFwIiwiV2Vha01hcCIsImNvbnN0cnVjdG9yIiwiY3JlYXRlSXRlbSIsIml0ZW1zIiwidW5kZWZpbmVkIiwiZ2V0Iiwia2V5IiwiaGFzIiwic2V0IiwiaXNUaGVuYWJsZSIsInZhbHVlIiwidGhlbiIsIm1ha2VDYWxsYmFjayIsInByb21pc2UiLCJtZXRhZGF0YSIsImNhbGxiYWNrQXJncyIsInJ1bnRpbWUiLCJsYXN0RXJyb3IiLCJyZWplY3QiLCJtZXNzYWdlIiwic2luZ2xlQ2FsbGJhY2tBcmciLCJyZXNvbHZlIiwicGx1cmFsaXplQXJndW1lbnRzIiwibnVtQXJncyIsIndyYXBBc3luY0Z1bmN0aW9uIiwibmFtZSIsImFzeW5jRnVuY3Rpb25XcmFwcGVyIiwidGFyZ2V0IiwiYXJncyIsIm1pbkFyZ3MiLCJtYXhBcmdzIiwiUHJvbWlzZSIsImZhbGxiYWNrVG9Ob0NhbGxiYWNrIiwiY2JFcnJvciIsImNvbnNvbGUiLCJ3YXJuIiwibm9DYWxsYmFjayIsIndyYXBNZXRob2QiLCJtZXRob2QiLCJ3cmFwcGVyIiwiUHJveHkiLCJhcHBseSIsInRhcmdldE1ldGhvZCIsInRoaXNPYmoiLCJjYWxsIiwiaGFzT3duUHJvcGVydHkiLCJGdW5jdGlvbiIsImJpbmQiLCJ3cmFwT2JqZWN0Iiwid3JhcHBlcnMiLCJjYWNoZSIsImNyZWF0ZSIsImhhbmRsZXJzIiwicHJveHlUYXJnZXQiLCJwcm9wIiwicmVjZWl2ZXIiLCJkZWZpbmVQcm9wZXJ0eSIsImNvbmZpZ3VyYWJsZSIsImVudW1lcmFibGUiLCJkZXNjIiwiUmVmbGVjdCIsImRlbGV0ZVByb3BlcnR5Iiwid3JhcEV2ZW50Iiwid3JhcHBlck1hcCIsImFkZExpc3RlbmVyIiwibGlzdGVuZXIiLCJoYXNMaXN0ZW5lciIsInJlbW92ZUxpc3RlbmVyIiwib25SZXF1ZXN0RmluaXNoZWRXcmFwcGVycyIsIm9uUmVxdWVzdEZpbmlzaGVkIiwicmVxIiwid3JhcHBlZFJlcSIsImdldENvbnRlbnQiLCJsb2dnZWRTZW5kUmVzcG9uc2VEZXByZWNhdGlvbldhcm5pbmciLCJvbk1lc3NhZ2VXcmFwcGVycyIsIm9uTWVzc2FnZSIsInNlbmRlciIsInNlbmRSZXNwb25zZSIsImRpZENhbGxTZW5kUmVzcG9uc2UiLCJ3cmFwcGVkU2VuZFJlc3BvbnNlIiwic2VuZFJlc3BvbnNlUHJvbWlzZSIsInJlc3BvbnNlIiwic3RhY2siLCJyZXN1bHQiLCJlcnIiLCJpc1Jlc3VsdFRoZW5hYmxlIiwic2VuZFByb21pc2VkUmVzdWx0IiwibXNnIiwiZXJyb3IiLCJfX21veldlYkV4dGVuc2lvblBvbHlmaWxsUmVqZWN0X18iLCJjYXRjaCIsIndyYXBwZWRTZW5kTWVzc2FnZUNhbGxiYWNrIiwicmVwbHkiLCJ3cmFwcGVkU2VuZE1lc3NhZ2UiLCJhcGlOYW1lc3BhY2VPYmoiLCJ3cmFwcGVkQ2IiLCJwdXNoIiwic2VuZE1lc3NhZ2UiLCJzdGF0aWNXcmFwcGVycyIsImRldnRvb2xzIiwibmV0d29yayIsIm9uTWVzc2FnZUV4dGVybmFsIiwidGFicyIsInNldHRpbmdNZXRhZGF0YSIsImNsZWFyIiwicHJpdmFjeSIsInNlcnZpY2VzIiwid2Vic2l0ZXMiLCJjaHJvbWUiLCJpZCIsIm1vZHVsZSIsImV4cG9ydHMiXSwic291cmNlUm9vdCI6IiJ9