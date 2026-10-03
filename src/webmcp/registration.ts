import type { WebMCPTool } from './tools.ts'

// Keep the experimental browser API at this boundary; no polyfill or global tool backdoor.
export type ModelContext = {
  registerTool: (tool: WebMCPTool, options: { signal: AbortSignal }) => Promise<void> | void
}

export async function registerTools(
  context: ModelContext,
  tools: WebMCPTool[],
  controller: AbortController,
): Promise<void> {
  try {
    for (const tool of tools) {
      controller.signal.throwIfAborted()
      await context.registerTool(tool, { signal: controller.signal })
    }
    controller.signal.throwIfAborted()
  } catch (error) {
    // Remove partially registered tools too, so retries and React remounts stay safe.
    controller.abort()
    throw error
  }
}
