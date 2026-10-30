// Pure text builder: kept free of Host imports so it can be unit-tested in Node.
export const DEFAULT_EMAIL = 'noreply@deepseek.com'
export const FALLBACK_NAME = 'DeepSeek Harness'
const PREFIX_NAMES = { deepseek: 'DeepSeek', claude: 'Claude', gpt: 'GPT', gemini: 'Gemini', qwen: 'Qwen', glm: 'GLM', kimi: 'Kimi' }

/** Humanize a model id: `deepseek/deepseek-v4.1-flash[1m]` -> `DeepSeek V4.1 Flash`. */
export function humanizeModel(id) {
  if (!id) return undefined
  const base = String(id).split('/').pop().replace(/\[[^\]]*\]$/, '').trim()
  if (!base) return undefined
  // Merge adjacent short numeric tokens into a version: `5-5` -> `5.5`.
  const words = []
  for (const w of base.split(/[-_\s]+/).filter(Boolean)) {
    if (/^\d{1,2}$/.test(w) && /^\d+(\.\d+)*$/.test(words.at(-1) ?? '') && words.at(-1).length <= 5) words[words.length - 1] += `.${w}`
    else words.push(w)
  }
  return words
    .map((w) => PREFIX_NAMES[w.toLowerCase()] ?? (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

/** Config exact match, config longest prefix, the provider catalog's name, then a humanized id. */
export function modelDisplayName(id, modelNames = {}, catalogName) {
  if (id && Object.hasOwn(modelNames, id)) return modelNames[id]
  const prefix = Object.keys(modelNames)
    .filter((k) => id?.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  if (prefix) return modelNames[prefix]
  return catalogName || humanizeModel(id) || FALLBACK_NAME
}

function fill(template, vars) {
  return template.replace(/\{(model|modelId|email)\}/g, (_, k) => vars[k])
}

/**
 * Build the attribution section. `commit`/`pr`: undefined = default, '' = omit,
 * otherwise verbatim with placeholders. Returns '' when no line remains.
 */
export function buildAttribution({ modelId, catalogName, commit, pr, email = DEFAULT_EMAIL, modelNames = {} }) {
  const vars = { model: modelDisplayName(modelId, modelNames, catalogName), modelId: modelId ?? '', email }
  const commitText = commit ?? 'Co-Authored-By: {model} <{email}>'
  const prText = pr ?? 'Generated with DeepSeek Harness ({model})'
  const lines = []
  if (commitText !== '') lines.push(`- End git commit messages with a blank line and then:\n${fill(commitText, vars)}`)
  if (prText !== '') lines.push(`- End pull request descriptions with:\n${fill(prText, vars)}`)
  if (!lines.length) return ''
  return [
    '# Attribution',
    'Attribution for git commits and pull requests you create (instructions from the user, such as AGENTS.md, CLAUDE.md or memory rules, about these lines take precedence over this section, but do not add attribution lines this section leaves out):',
    ...lines,
  ].join('\n')
}
