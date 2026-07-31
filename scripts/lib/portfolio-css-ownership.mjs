import { createHash } from 'node:crypto';
import { rename, rm } from 'node:fs/promises';

const PORTFOLIO_SURFACE_PATTERN = /(?:portfolio|route-topbar|route-centered|hero-title|#simulations|#app-frame|window-overlay|button-bar|shell-bottom-band|shell-tab|abs-icon-btn)/i;

function skipSpaceAndComments(source, start) {
  let index = start;
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index += 1;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      if (end < 0) throw new Error(`Unclosed CSS comment at offset ${index}.`);
      index = end + 2;
      continue;
    }
    break;
  }
  return index;
}

function readPrelude(source, start, end) {
  let quote = '';
  let escaped = false;
  let roundDepth = 0;
  let squareDepth = 0;
  for (let index = start; index < end; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') roundDepth += 1;
    else if (char === ')') roundDepth -= 1;
    else if (char === '[') squareDepth += 1;
    else if (char === ']') squareDepth -= 1;
    else if ((char === '{' || char === ';') && roundDepth === 0 && squareDepth === 0) {
      return { prelude: source.slice(start, index).trim(), delimiter: char, index };
    }
  }
  return { prelude: source.slice(start, end).trim(), delimiter: '', index: end };
}

function findBlockEnd(source, openIndex, end) {
  let depth = 1;
  let quote = '';
  let escaped = false;
  for (let index = openIndex + 1; index < end; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (source.startsWith('/*', index)) {
      const commentEnd = source.indexOf('*/', index + 2);
      if (commentEnd < 0) throw new Error(`Unclosed CSS comment at offset ${index}.`);
      index = commentEnd + 1;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  if (quote) throw new Error(`Unclosed CSS string in block at offset ${openIndex}.`);
  throw new Error(`Unclosed CSS block at offset ${openIndex}.`);
}

export function splitSelectorList(input) {
  const selectors = [];
  let start = 0;
  let quote = '';
  let escaped = false;
  let roundDepth = 0;
  let squareDepth = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') roundDepth += 1;
    else if (char === ')') roundDepth -= 1;
    else if (char === '[') squareDepth += 1;
    else if (char === ']') squareDepth -= 1;
    else if (char === ',' && roundDepth === 0 && squareDepth === 0) {
      selectors.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(input.slice(start).trim());
  if (quote || roundDepth !== 0 || squareDepth !== 0 || selectors.some((selector) => !selector)) {
    throw new Error(`Malformed selector list: ${input}`);
  }
  return selectors;
}

function consumeStringOrComment(source, start) {
  if (source.startsWith('/*', start)) {
    const end = source.indexOf('*/', start + 2);
    if (end < 0) throw new Error(`Unclosed CSS comment at offset ${start}.`);
    return end + 2;
  }
  const quote = source[start];
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    if (escaped) escaped = false;
    else if (source[index] === '\\') escaped = true;
    else if (source[index] === quote) return index + 1;
  }
  throw new Error(`Unclosed CSS string at offset ${start}.`);
}

function splitTopLevel(source, delimiter) {
  const parts = [];
  let start = 0;
  const stack = [];
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (source.startsWith('/*', index) || char === '"' || char === "'") {
      index = consumeStringOrComment(source, index) - 1;
      continue;
    }
    if (char === '\\') {
      index += 1;
      continue;
    }
    if ('([{'.includes(char)) stack.push(char);
    else if (')]}'.includes(char)) {
      const expected = { ')': '(', ']': '[', '}': '{' }[char];
      if (stack.pop() !== expected) throw new Error(`Malformed CSS structure near offset ${index}.`);
    } else if (char === delimiter && stack.length === 0) {
      parts.push(source.slice(start, index));
      start = index + 1;
    }
  }
  if (stack.length) throw new Error('Unclosed CSS value structure.');
  parts.push(source.slice(start));
  return parts;
}

function findTopLevelColon(source) {
  const stack = [];
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (source.startsWith('/*', index) || char === '"' || char === "'") {
      index = consumeStringOrComment(source, index) - 1;
      continue;
    }
    if (char === '\\') index += 1;
    else if ('([{'.includes(char)) stack.push(char);
    else if (')]}'.includes(char)) stack.pop();
    else if (char === ':' && stack.length === 0) return index;
  }
  return -1;
}

function parseDeclarations(block) {
  const properties = [];
  for (const rawDeclaration of splitTopLevel(block, ';')) {
    const declaration = rawDeclaration.replace(/\/\*[\s\S]*?\*\//g, ' ').trim();
    if (!declaration) continue;
    const colon = findTopLevelColon(declaration);
    if (colon < 0) throw new Error(`Malformed CSS declaration: ${declaration}`);
    const property = declaration.slice(0, colon).trim();
    if (!/^(?:--(?:[A-Za-z0-9_-]|\\.)+|-?(?:[A-Za-z_]|\\.)(?:[A-Za-z0-9_-]|\\.)*)$/.test(property)) {
      throw new Error(`Unsupported CSS declaration property: ${property}`);
    }
    properties.push(property.toLowerCase());
  }
  return [...new Set(properties)];
}

function consumeIdentifier(source, start) {
  let index = start;
  while (index < source.length) {
    if (source[index] === '\\' && index + 1 < source.length) index += 2;
    else if (/[\w-]/.test(source[index])) index += 1;
    else break;
  }
  return index;
}

function findMatchingParen(source, openIndex) {
  let depth = 1;
  for (let index = openIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    if (source.startsWith('/*', index) || char === '"' || char === "'") {
      index = consumeStringOrComment(source, index) - 1;
      continue;
    }
    if (char === '\\') index += 1;
    else if (char === '(') depth += 1;
    else if (char === ')' && --depth === 0) return index;
  }
  throw new Error(`Unclosed functional pseudo-class at offset ${openIndex}.`);
}

function addSpecificity(left, right) {
  return left.map((value, index) => value + right[index]);
}

function maxSpecificity(values) {
  return values.reduce((maximum, value) => {
    for (let index = 0; index < 3; index += 1) {
      if (value[index] !== maximum[index]) return value[index] > maximum[index] ? value : maximum;
    }
    return maximum;
  }, [0, 0, 0]);
}

function findNthOf(argument) {
  let depth = 0;
  for (let index = 0; index < argument.length - 1; index += 1) {
    const char = argument[index];
    if (argument.startsWith('/*', index) || char === '"' || char === "'") {
      index = consumeStringOrComment(argument, index) - 1;
      continue;
    }
    if (char === '\\') index += 1;
    else if (char === '(' || char === '[') depth += 1;
    else if (char === ')' || char === ']') depth -= 1;
    else if (depth === 0 && /^of(?:\s|$)/i.test(argument.slice(index))
      && (index === 0 || /\s/.test(argument[index - 1]))) return index + 2;
  }
  return -1;
}

export function specificity(selector) {
  let result = [0, 0, 0];
  let expectType = true;
  for (let index = 0; index < selector.length;) {
    const char = selector[index];
    if (selector.startsWith('/*', index) || char === '"' || char === "'") {
      index = consumeStringOrComment(selector, index);
      continue;
    }
    if (/\s/.test(char) || /[>+~,]/.test(char)) {
      expectType = true;
      index += 1;
      continue;
    }
    if (char === '[') {
      let depth = 1;
      let end = index + 1;
      for (; end < selector.length; end += 1) {
        if (selector.startsWith('/*', end) || selector[end] === '"' || selector[end] === "'") end = consumeStringOrComment(selector, end) - 1;
        else if (selector[end] === '\\') end += 1;
        else if (selector[end] === '[') depth += 1;
        else if (selector[end] === ']' && --depth === 0) break;
      }
      if (depth) throw new Error(`Unclosed attribute selector at offset ${index}.`);
      result[1] += 1;
      index = end + 1;
      expectType = false;
      continue;
    }
    if (char === '#') {
      result[0] += 1;
      index = consumeIdentifier(selector, index + 1);
      expectType = false;
      continue;
    }
    if (char === '.') {
      result[1] += 1;
      index = consumeIdentifier(selector, index + 1);
      expectType = false;
      continue;
    }
    if (char === ':') {
      const pseudoElement = selector[index + 1] === ':';
      const nameStart = index + (pseudoElement ? 2 : 1);
      const nameEnd = consumeIdentifier(selector, nameStart);
      const name = selector.slice(nameStart, nameEnd).toLowerCase();
      if (!name) throw new Error(`Malformed pseudo selector at offset ${index}.`);
      if (pseudoElement) result[2] += 1;
      else if (selector[nameEnd] !== '(') result[1] += 1;
      if (selector[nameEnd] === '(') {
        const close = findMatchingParen(selector, nameEnd);
        const argument = selector.slice(nameEnd + 1, close);
        if (!pseudoElement && ['is', 'not', 'has'].includes(name)) {
          result = addSpecificity(result, maxSpecificity(splitSelectorList(argument).map(specificity)));
        } else if (!pseudoElement && ['nth-child', 'nth-last-child'].includes(name)) {
          result[1] += 1;
          const ofIndex = findNthOf(argument);
          if (ofIndex >= 0) result = addSpecificity(result,
            maxSpecificity(splitSelectorList(argument.slice(ofIndex).trim()).map(specificity)));
        } else if (!pseudoElement && name !== 'where') result[1] += 1;
        index = close + 1;
      } else index = nameEnd;
      expectType = false;
      continue;
    }
    if (char === '*') {
      index += 1;
      expectType = false;
      continue;
    }
    if (char === '|') {
      index += 1;
      expectType = true;
      continue;
    }
    if (expectType && (/[A-Za-z_]/.test(char) || char === '\\')) {
      result[2] += 1;
      index = consumeIdentifier(selector, index);
      expectType = false;
      continue;
    }
    index += 1;
  }
  return result;
}

function targetTokens(selector) {
  const subject = selector.trim().split(/\s+|>|\+|~/).filter(Boolean).at(-1) || '';
  return [...new Set(subject.match(/#[\w-]+|\.[\w-]+|::?[\w-]+|^[a-zA-Z][\w-]*/g) || [])];
}

export function parseCssRules(source, file) {
  const rules = [];
  let sourceOrder = 0;
  const parseRange = (start, end, conditions = []) => {
    let index = start;
    while (index < end) {
      index = skipSpaceAndComments(source, index);
      if (index >= end) break;
      const item = readPrelude(source, index, end);
      if (!item.prelude && !item.delimiter) break;
      if (item.delimiter === ';') {
        if (!item.prelude.startsWith('@')) throw new Error(`Unsupported CSS statement in ${file}: ${item.prelude}`);
        const atName = item.prelude.slice(1).split(/[\s({]/)[0].toLowerCase();
        if (!['charset', 'import', 'namespace', 'layer'].includes(atName)) {
          throw new Error(`Unsupported CSS statement at-rule @${atName} in ${file}.`);
        }
        if (!item.prelude.slice(atName.length + 1).trim()) {
          throw new Error(`Malformed CSS statement at-rule @${atName} in ${file}.`);
        }
        index = item.index + 1;
        continue;
      }
      if (item.delimiter !== '{') throw new Error(`Malformed CSS near offset ${index} in ${file}.`);
      const close = findBlockEnd(source, item.index, end);
      const body = source.slice(item.index + 1, close);
      if (item.prelude.startsWith('@')) {
        const atName = item.prelude.slice(1).split(/[\s({]/)[0].toLowerCase();
        if (['media', 'supports', 'container', 'layer', 'scope'].includes(atName)) {
          parseRange(item.index + 1, close, [...conditions, item.prelude]);
        } else if (!['font-face', 'keyframes', '-webkit-keyframes', 'property', 'page', 'view-transition'].includes(atName)) {
          throw new Error(`Unsupported CSS at-rule @${atName} in ${file}.`);
        }
      } else {
        const selectors = splitSelectorList(item.prelude);
        const properties = parseDeclarations(body);
        sourceOrder += 1;
        for (const selector of selectors) {
          rules.push({
            file,
            selector: selector.replace(/\s+/g, ' ').trim(),
            sourceOrder,
            line: source.slice(0, index).split('\n').length,
            specificity: specificity(selector),
            conditions,
            properties,
            targetTokens: targetTokens(selector),
          });
        }
      }
      index = close + 1;
    }
  };
  parseRange(0, source.length);
  return rules;
}

export function buildOwnershipSignature(overlaps) {
  return overlaps.map((item) => ({
    main: [
      item.main.selector,
      item.main.sourceOrder,
      item.main.specificity,
      item.main.conditions,
    ],
    portfolio: [
      item.portfolio.selector,
      item.portfolio.sourceOrder,
      item.portfolio.specificity,
      item.portfolio.conditions,
    ],
    properties: item.sharedProperties,
    classification: item.classification,
    owner: item.plannedOwner,
  }));
}

export function computedContractSignature(contract) {
  return createHash('sha256').update(JSON.stringify(contract)).digest('hex');
}

export function evaluateActiveCardPaintSuppression({ deck, card, cardContainedByDeck }) {
  const suppressesPaint = (target) => Boolean(target)
    && (target.display === 'none' || target.visibility === 'hidden' || target.opacity <= 0.02);
  return {
    cardContainedByDeck: cardContainedByDeck === true,
    deckSuppressesPaint: suppressesPaint(deck),
    cardSuppressesPaint: suppressesPaint(card),
    accepted: cardContainedByDeck === true && (suppressesPaint(deck) || suppressesPaint(card)),
  };
}

export async function promoteEvidenceRun({
  runDir,
  approvedDir,
  validate,
  pendingFixturePath = '',
  fixturePath = '',
}) {
  try {
    await validate(runDir);
  } catch (error) {
    await rm(runDir, { recursive: true, force: true });
    if (pendingFixturePath) await rm(pendingFixturePath, { force: true });
    throw error;
  }
  const backupDir = `${approvedDir}.backup-${process.pid}-${Date.now()}`;
  const fixtureBackupPath = fixturePath
    ? `${fixturePath}.backup-${process.pid}-${Date.now()}`
    : '';
  let hadApproved = false;
  let hadFixture = false;
  let evidencePromoted = false;
  let fixturePromoted = false;
  try {
    await rename(approvedDir, backupDir);
    hadApproved = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  try {
    if (pendingFixturePath) {
      try {
        await rename(fixturePath, fixtureBackupPath);
        hadFixture = true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    await rename(runDir, approvedDir);
    evidencePromoted = true;
    if (pendingFixturePath) {
      await rename(pendingFixturePath, fixturePath);
      fixturePromoted = true;
    }
  } catch (error) {
    if (fixturePromoted) await rm(fixturePath, { force: true });
    if (hadFixture) await rename(fixtureBackupPath, fixturePath);
    if (evidencePromoted) await rm(approvedDir, { recursive: true, force: true });
    if (hadApproved) await rename(backupDir, approvedDir);
    await rm(runDir, { recursive: true, force: true });
    if (pendingFixturePath) await rm(pendingFixturePath, { force: true });
    throw error;
  }
  if (hadApproved) await rm(backupDir, { recursive: true, force: true });
  if (hadFixture) await rm(fixtureBackupPath, { force: true });
}

export function classifyPortfolioOverlaps(mainRules, portfolioRules) {
  const relevantMain = mainRules.filter((rule) => PORTFOLIO_SURFACE_PATTERN.test(rule.selector));
  const overlaps = [];
  for (const main of relevantMain) {
    for (const portfolio of portfolioRules) {
      const exact = main.selector === portfolio.selector;
      const sharedTarget = main.targetTokens.some((token) => portfolio.targetTokens.includes(token));
      const sharedProperties = main.properties.filter((property) => portfolio.properties.includes(property));
      if (!exact && (!sharedTarget || sharedProperties.length === 0)) continue;
      const mainPortfolioSpecific = hasPositivePortfolioTarget(main.selector);
      overlaps.push({
        main,
        portfolio,
        exact,
        sharedProperties,
        classification: mainPortfolioSpecific ? 'intentional-override' : 'shell-shared',
        plannedOwner: mainPortfolioSpecific ? 'portfolio.css' : 'main.css',
      });
    }
  }
  return overlaps;
}

export function hasPositivePortfolioTarget(selector) {
  let positive = '';
  for (let index = 0; index < selector.length;) {
    if (selector.startsWith('/*', index) || selector[index] === '"' || selector[index] === "'") {
      const end = consumeStringOrComment(selector, index);
      positive += selector.slice(index, end);
      index = end;
      continue;
    }
    if (selector[index] === ':' && selector[index + 1] !== ':') {
      const nameEnd = consumeIdentifier(selector, index + 1);
      const name = selector.slice(index + 1, nameEnd).toLowerCase();
      if (name === 'not' && selector[nameEnd] === '(') {
        index = findMatchingParen(selector, nameEnd) + 1;
        continue;
      }
    }
    positive += selector[index];
    index += 1;
  }
  return /portfolio/i.test(positive);
}

export function summarizeOwnership(mainRules, portfolioRules, overlaps) {
  const relevantMain = mainRules.filter((rule) => PORTFOLIO_SURFACE_PATTERN.test(rule.selector));
  return {
    mainRuleCount: mainRules.length,
    portfolioRuleCount: portfolioRules.length,
    relevantMainRuleCount: relevantMain.length,
    overlapCount: overlaps.length,
    exactOverlapCount: overlaps.filter((item) => item.exact).length,
    intentionalOverrideCount: overlaps.filter((item) => item.classification === 'intentional-override').length,
    shellSharedCount: overlaps.filter((item) => item.classification === 'shell-shared').length,
    plannedMainOwnerCount: overlaps.filter((item) => item.plannedOwner === 'main.css').length,
    plannedPortfolioOwnerCount: overlaps.filter((item) => item.plannedOwner === 'portfolio.css').length,
  };
}
