import Schema from '@deepseek-ai/schemastery'
import { buildAttribution } from './attribution.js'

export const name = 'agent-attribution'
export const inject = ['systemPrompt']

export const Config = Schema.object({
  commit: Schema.string().description("Commit attribution. Omit for 'Co-Authored-By: {model} <{email}>'; '' removes the line. Placeholders: {model}, {modelId}, {email}."),
  pr: Schema.string().description("Pull request attribution. Omit for 'Generated with DeepSeek Harness ({model})'; '' removes the line."),
  email: Schema.string().default('noreply@deepseek.com').description('Email for the {email} placeholder.'),
  modelNames: Schema.dict(Schema.string()).default({}).description('Model id (exact or prefix) to display name overrides.'),
})

export function apply(ctx, config = {}) {
  const sp = ctx.systemPrompt
  // provider -> (model id -> display name) from the LLM catalog, loaded ahead of
  // assembly because section text is synchronous. Both services are optional:
  // without them the name falls back to a humanized model id.
  const catalog = new Map()
  let defaultModel
  ctx.inject(['agentDefaultModel'], (c) => {
    defaultModel = c.agentDefaultModel
    return () => { defaultModel = undefined }
  })
  ctx.inject(['llm'], (c) => {
    const refresh = async () => {
      for (const { id: provider } of c.llm.listProviders()) {
        try {
          const models = await c.llm.listModels(provider)
          catalog.set(provider, new Map(models.map((m) => [m.id, m.name])))
        } catch {}
      }
    }
    refresh()
    const off = c.on('llm/adapters-updated', refresh)
    return () => { off(); catalog.clear() }
  })
  ctx.effect(() => sp.section({
    name: 'attribution',
    order: sp.getSectionOrder('TOOL_BASH') + 5,
    interpolate: false,
    text: (assembleCtx) => {
      const agent = assembleCtx.agent
      if (!agent) return ''
      let { model: modelId, provider } = agent.options ?? {}
      if (!modelId) {
        try { ({ model: modelId, provider } = defaultModel.currentSelection()) } catch {}
      }
      const catalogName = catalog.get(provider)?.get(modelId)
      return buildAttribution({ ...config, modelId, catalogName })
    },
  }))
}
