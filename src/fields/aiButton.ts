import type { Field } from 'payload'

type AIAction = 'generateSeo' | 'rewriteMarkdown'

export const withAIButton = <TField extends Field>(
  field: TField,
  action: AIAction,
): TField => {
  const admin = field.admin ?? {}
  const components = (admin.components ?? {}) as Record<string, unknown>
  const existingAfterInput = ((components.afterInput as string[] | undefined) ?? []).slice()

  return {
    ...field,
    admin: {
      ...admin,
      components: {
        ...components,
        afterInput: [...existingAfterInput, './components/admin/AIFieldButton#AIFieldButton'],
      },
    },
    custom: {
      ...(field.custom ?? {}),
      aiAction: action,
    },
  }
}
