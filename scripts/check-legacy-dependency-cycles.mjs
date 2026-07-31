#!/usr/bin/env node
import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const APP_ROOT = join(REPO_ROOT, 'react-app', 'app')
const SOURCE_ROOT = join(APP_ROOT, 'src')
const BASELINE_PATH = join(SCRIPT_DIR, 'fixtures', 'legacy-dependency-cycles.json')
const REPORT_PATH = join(REPO_ROOT, 'docs', 'development', 'LEGACY-DEPENDENCY-CYCLES.md')
const SOURCE_EXTENSIONS = ['.js', '.jsx', '.mjs']
const PRODUCTION_ENTRIES = [
  'src/entries/about.jsx',
  'src/entries/contact.jsx',
  'src/entries/index.jsx',
  'src/entries/playground.jsx',
  'src/entries/portfolio.jsx',
]
const requireFromApp = createRequire(join(APP_ROOT, 'package.json'))
let parseJavaScript = null

function fail(message) {
  throw new Error(`Legacy dependency-cycle check failed: ${message}`)
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function toAppPath(absolutePath) {
  return relative(APP_ROOT, absolutePath).split(sep).join('/')
}

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(absolutePath)
    return SOURCE_EXTENSIONS.includes(extname(entry.name)) ? [absolutePath] : []
  }).sort(compareText)
}

function literalModuleSpecifier(node) {
  if (node?.type === 'StringLiteral') return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? node.quasis[0]?.value?.raw
  }
  return null
}

function extractModuleSpecifiers(source, file) {
  if (!parseJavaScript) {
    try {
      ({ parse: parseJavaScript } = requireFromApp('@babel/parser'))
    } catch {
      fail('the app parser is unavailable. Run npm run install:all first')
    }
  }
  let tree
  try {
    tree = parseJavaScript(source, {
      sourceType: 'unambiguous',
      sourceFilename: file,
      plugins: ['jsx', 'importAttributes'],
      createImportExpressions: true,
    })
  } catch (error) {
    fail(`could not parse ${file}: ${error.message}`)
  }

  const specifiers = new Set()
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (
      node.type === 'ImportDeclaration'
      || node.type === 'ExportNamedDeclaration'
      || node.type === 'ExportAllDeclaration'
    ) {
      const value = literalModuleSpecifier(node.source)
      if (value) specifiers.add(value)
    } else if (node.type === 'ImportExpression') {
      const value = literalModuleSpecifier(node.source)
      if (value) specifiers.add(value)
    } else if (node.type === 'CallExpression' && node.callee?.type === 'Import') {
      const value = literalModuleSpecifier(node.arguments?.[0])
      if (value) specifiers.add(value)
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue
      if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value === 'object' && typeof value.type === 'string') visit(value)
    }
  }
  visit(tree.program)
  return [...specifiers].sort(compareText)
}

function resolveRelativeImport(importerAbsolutePath, specifier) {
  if (!specifier.startsWith('.')) return null
  const filesystemSpecifier = specifier.split(/[?#]/, 1)[0]
  const unresolved = resolve(dirname(importerAbsolutePath), filesystemSpecifier)
  const explicitExtension = extname(unresolved)
  if (explicitExtension && !SOURCE_EXTENSIONS.includes(explicitExtension)) return null
  const candidates = explicitExtension
    ? [unresolved]
    : [
        ...SOURCE_EXTENSIONS.map((extension) => `${unresolved}${extension}`),
        ...SOURCE_EXTENSIONS.map((extension) => join(unresolved, `index${extension}`)),
      ]
  const match = candidates.find((candidate) => existsSync(candidate))
  if (!match) fail(`${toAppPath(importerAbsolutePath)} has an unresolved relative import: ${specifier}`)
  const sourceRelativePath = relative(SOURCE_ROOT, match)
  if (isAbsolute(sourceRelativePath) || sourceRelativePath.startsWith(`..${sep}`)) {
    fail(`${toAppPath(importerAbsolutePath)} imports JavaScript outside src/: ${specifier}`)
  }
  return match
}

function buildCompleteGraph() {
  const files = collectSourceFiles(SOURCE_ROOT)
  const graph = new Map(files.map((file) => [toAppPath(file), new Set()]))
  for (const absolutePath of files) {
    const importer = toAppPath(absolutePath)
    const source = readFileSync(absolutePath, 'utf8')
    for (const specifier of extractModuleSpecifiers(source, importer)) {
      const dependency = resolveRelativeImport(absolutePath, specifier)
      if (dependency) graph.get(importer).add(toAppPath(dependency))
    }
  }
  return graph
}

function activeSubgraph(completeGraph, entries = PRODUCTION_ENTRIES) {
  const active = new Set()
  const pending = [...entries].sort(compareText).reverse()
  while (pending.length > 0) {
    const module = pending.pop()
    if (!completeGraph.has(module)) fail(`active entry or dependency is missing from the graph: ${module}`)
    if (active.has(module)) continue
    active.add(module)
    const dependencies = [...completeGraph.get(module)].sort(compareText).reverse()
    pending.push(...dependencies)
  }
  return new Map([...active].sort(compareText).map((module) => [
    module,
    new Set([...completeGraph.get(module)].filter((dependency) => active.has(dependency)).sort(compareText)),
  ]))
}

function stronglyConnectedComponents(graph) {
  let nextIndex = 0
  const indices = new Map()
  const lowLinks = new Map()
  const stack = []
  const onStack = new Set()
  const components = []

  const connect = (module) => {
    indices.set(module, nextIndex)
    lowLinks.set(module, nextIndex)
    nextIndex += 1
    stack.push(module)
    onStack.add(module)

    for (const dependency of [...(graph.get(module) ?? [])].sort(compareText)) {
      if (!indices.has(dependency)) {
        connect(dependency)
        lowLinks.set(module, Math.min(lowLinks.get(module), lowLinks.get(dependency)))
      } else if (onStack.has(dependency)) {
        lowLinks.set(module, Math.min(lowLinks.get(module), indices.get(dependency)))
      }
    }

    if (lowLinks.get(module) !== indices.get(module)) return
    const component = []
    let member
    do {
      member = stack.pop()
      onStack.delete(member)
      component.push(member)
    } while (member !== module)
    components.push(component.sort(compareText))
  }

  for (const module of [...graph.keys()].sort(compareText)) {
    if (!indices.has(module)) connect(module)
  }
  return components.sort((left, right) => compareText(left[0], right[0]))
}

function cyclicComponents(graph) {
  return stronglyConnectedComponents(graph)
    .filter((members) => members.length > 1 || graph.get(members[0])?.has(members[0]))
    .map((members) => {
      const memberSet = new Set(members)
      const edges = members.flatMap((from) => [...(graph.get(from) ?? [])]
        .filter((to) => memberSet.has(to))
        .sort(compareText)
        .map((to) => `${from} -> ${to}`))
        .sort(compareText)
      return { members, edges }
    })
}

function snapshot(graph) {
  return {
    version: 1,
    scope: {
      root: 'react-app/app/src',
      entries: [...PRODUCTION_ENTRIES],
      imports: 'relative static imports, re-exports, and literal dynamic imports',
    },
    components: cyclicComponents(graph),
  }
}

function validateBaseline(baseline) {
  if (baseline?.version !== 1 || !Array.isArray(baseline?.components)) {
    fail('the reviewed baseline has an unsupported shape')
  }
  if (JSON.stringify(baseline.scope) !== JSON.stringify(snapshot(new Map()).scope)) {
    fail('the reviewed baseline scope does not match the checker')
  }
  for (const component of baseline.components) {
    if (!Array.isArray(component.members) || !Array.isArray(component.edges) || component.members.length === 0) {
      fail('the reviewed baseline contains an invalid component')
    }
    if ([...component.members].sort(compareText).some((value, index) => value !== component.members[index])) {
      fail('baseline component members must stay sorted')
    }
    if ([...component.edges].sort(compareText).some((value, index) => value !== component.edges[index])) {
      fail('baseline component edges must stay sorted')
    }
  }
  const firstMembers = baseline.components.map(({ members }) => members[0])
  if ([...firstMembers].sort(compareText).some((value, index) => value !== firstMembers[index])) {
    fail('baseline components must stay sorted')
  }
}

function componentIdentity(component) {
  return component.members.join('\u0000')
}

function assertReviewedCycles(expected, actual) {
  const expectedByMembers = new Map(expected.map((component) => [componentIdentity(component), component]))
  const actualByMembers = new Map(actual.map((component) => [componentIdentity(component), component]))
  const addedOrGrown = actual.filter((component) => !expectedByMembers.has(componentIdentity(component)))
  const removedOrShrunk = expected.filter((component) => !actualByMembers.has(componentIdentity(component)))
  const edgeDrift = actual.filter((component) => {
    const reviewed = expectedByMembers.get(componentIdentity(component))
    return reviewed && JSON.stringify(reviewed.edges) !== JSON.stringify(component.edges)
  })
  if (addedOrGrown.length === 0 && removedOrShrunk.length === 0 && edgeDrift.length === 0) return

  const details = [
    ...addedOrGrown.map(({ members }) => `  unreviewed/new or grown component (${members.length}): ${members.join(', ')}`),
    ...removedOrShrunk.map(({ members }) => `  reviewed component changed or disappeared (${members.length}): ${members.join(', ')}`),
    ...edgeDrift.map(({ members }) => `  internal edge evidence changed for: ${members.join(', ')}`),
  ]
  fail(`active dependency cycles differ from the reviewed baseline. Review the graph before updating the fixture.\n${details.join('\n')}`)
}

function expectCycleFailure(label, baselineComponents, graph) {
  try {
    assertReviewedCycles(baselineComponents, cyclicComponents(graph))
  } catch {
    return
  }
  fail(`self-test did not reject ${label}`)
}

function cloneGraph(graph) {
  return new Map([...graph].map(([module, dependencies]) => [module, new Set(dependencies)]))
}

function runSelfTests(graph, baseline) {
  const newCycleGraph = cloneGraph(graph)
  newCycleGraph.set('src/legacy/__cycle-a.js', new Set(['src/legacy/__cycle-b.js']))
  newCycleGraph.set('src/legacy/__cycle-b.js', new Set(['src/legacy/__cycle-a.js']))
  expectCycleFailure('a new two-module cycle', baseline.components, newCycleGraph)

  const reviewedCycle = baseline.components.find(({ members }) => members.length > 1)
  if (!reviewedCycle) return
  const grownGraph = cloneGraph(graph)
  const probe = 'src/legacy/__cycle-member-probe.js'
  const anchor = reviewedCycle.members[0]
  grownGraph.set(probe, new Set([anchor]))
  grownGraph.get(anchor).add(probe)
  expectCycleFailure('a new member in the reviewed cycle', baseline.components, grownGraph)
}

function renderReport(graph, current) {
  const edgeCount = [...graph.values()].reduce((sum, dependencies) => sum + dependencies.size, 0)
  const sections = current.components.map((component, index) => [
    `## Cyclic component ${index + 1} (${component.members.length} modules)`,
    '',
    'Members:',
    '',
    ...component.members.map((member) => `- \`${member}\``),
    '',
    'Internal relative-import edges:',
    '',
    ...component.edges.map((edge) => `- \`${edge}\``),
  ].join('\n'))
  const status = current.components.length > 0 ? [
    '## Candidate inversion seam (evidence required)',
    '',
    'Use the recorded members and internal edges to identify the narrowest ownership boundary that can invert at least one dependency without moving frame-frequency state into React.',
    '',
    'Treat any proposed seam as a hypothesis. Characterize initialization order, disposal, route remounts, shared-state identity, reduced motion, lazy loading, and frame cost before changing production code. Proceed only when the evidence shows a concrete ownership or lifecycle-test benefit.',
    '',
    'Do not split modules to reduce line counts or cycle size alone. The active imperative runtime and its frame-frequency ownership remain production constraints.',
    '',
  ] : [
    '## Status',
    '',
    'No active relative-import dependency cycles were found in the production runtime graph.',
    '',
    'The imperative Canvas runtime and its frame-frequency ownership remain production constraints. Keep the fail-closed checker active so a later cycle cannot enter silently.',
    '',
  ]
  return [
    '# Active legacy dependency cycles',
    '',
    'This report is generated by `node scripts/check-legacy-dependency-cycles.mjs --write-report`.',
    'It covers modules reachable from the five production entry modules. It records relative static imports, re-exports, and literal dynamic imports.',
    '',
    `Active modules: ${graph.size}`,
    '',
    `Active relative-import edges: ${edgeCount}`,
    '',
    `Cyclic components: ${current.components.length}`,
    '',
    ...sections,
    '',
    ...status,
  ].join('\n')
}

try {
  const graph = activeSubgraph(buildCompleteGraph())
  const current = snapshot(graph)

  if (process.argv.includes('--update-baseline')) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`)
    console.log(`Updated ${relative(REPO_ROOT, BASELINE_PATH)} for explicit review.`)
  }
  if (!existsSync(BASELINE_PATH)) fail(`missing baseline: ${relative(REPO_ROOT, BASELINE_PATH)}`)

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  validateBaseline(baseline)
  assertReviewedCycles(baseline.components, current.components)

  if (process.argv.includes('--self-test')) runSelfTests(graph, baseline)
  if (process.argv.includes('--write-report')) {
    writeFileSync(REPORT_PATH, renderReport(graph, current))
    console.log(`Updated ${relative(REPO_ROOT, REPORT_PATH)}.`)
  }

  const edgeCount = [...graph.values()].reduce((sum, dependencies) => sum + dependencies.size, 0)
  console.log('Legacy dependency-cycle check passed.')
  console.log(`  Active modules: ${graph.size}`)
  console.log(`  Active relative-import edges: ${edgeCount}`)
  console.log(`  Reviewed cyclic components: ${current.components.length}`)
  for (const component of current.components) {
    console.log(`  Component (${component.members.length} modules, ${component.edges.length} internal edges):`)
    component.members.forEach((member) => console.log(`    ${member}`))
  }
  if (process.argv.includes('--self-test')) console.log('  Mutation self-tests: passed')
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
