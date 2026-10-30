# dsh-agent-attribution

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that tells agents how to attribute the git commits and pull requests they create. It is modelled on Claude Code's `attribution` setting, with the model name filled in automatically.

With the defaults, agents are instructed to:

- end commit messages with a blank line and then `Co-Authored-By: <model> <noreply@deepseek.com>`
- end pull request descriptions with `Generated with DeepSeek Harness (<model>)`

The instruction is added as an `Attribution` section of the system prompt. It says that the user's own instructions about these lines (AGENTS.md, CLAUDE.md, memory rules) take precedence, and that agents must not add attribution lines the section does not list. It is sent whether or not the working directory is a git repository, as in Claude Code.

## Installation

Link the package into your profile with `plugin_manager` (`install_bundle`, target = the absolute path of this directory), or from the command line, then restart or reload the profile. To turn the instruction off, disable the plugin.

## Configuration

The plugin row is `agent-attribution` in `cordis.patch.yml`. Override its `config` in your profile patch:

```yaml
- id: agent-attribution
  config:
    pr: ''
    commit: 'Co-Authored-By: {model} <{email}>'
```

| Key | Default | Meaning |
| --- | --- | --- |
| `commit` | `Co-Authored-By: {model} <{email}>` | Commit attribution. Omit for the default, `''` to drop the line, or any text (multi-line is kept verbatim). |
| `pr` | `Generated with DeepSeek Harness ({model})` | Pull request attribution. Same rules as `commit`. |
| `email` | `noreply@deepseek.com` | Value of the `{email}` placeholder. |
| `modelNames` | `{}` | Display-name overrides keyed by model id (exact match, then longest prefix). |

Placeholders in `commit` and `pr`: `{model}` (display name), `{modelId}` and `{email}`.

If both `commit` and `pr` are `''`, the section is omitted entirely, which is what Claude Code does too. Claude Code's `sessionUrl` is not implemented.

## How the model name is chosen

1. The model the agent is actually running, which is the live model selection. This can differ from the model the agent was created with. The plugin reads the final `provider` and `model` prompt variables for this reason.
2. A `modelNames` entry from this plugin's config.
3. The `name` the provider's model catalog gives that model (for example `Claude Sonnet 5.5` from your profile's `llm-pi-ai` config).
4. The model id made readable: `deepseek/deepseek-v4.1-flash-1017[1m]` becomes `DeepSeek V4.1 Flash 1017`, and `claude-opus-5-5` becomes `Claude Opus 5.5`.
5. `DeepSeek Harness` when no model is known.

Subagents get their own model name. Changing the model mid-session changes the trailer, and the system-prompt prefix with it, so expect a prompt-cache miss at that point.

## Files

- `index.js`: the Host plugin (`Config`, section registration, assembly listener).
- `attribution.js`: pure text and model-name helpers, free of Host imports.
- `cordis.patch.yml`, `package.json`, `locale/`, `icon.svg`: bundle manifest and display metadata.

## Related

`dsh-skill-badge` is a separate, optional dsh plugin that adds a "powered by dsh" badge to pull requests. If you enable it, you may want `pr: ''` here so the two do not overlap.
