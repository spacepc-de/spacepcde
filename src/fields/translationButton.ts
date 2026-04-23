import type { Field } from 'payload'

type TranslationMode = 'slug' | 'text'

export const withTranslationButton = <TField extends Field>(
  field: TField,
  mode: TranslationMode = 'text',
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
        afterInput: [
          ...existingAfterInput,
          './components/admin/TranslateFieldButton#TranslateFieldButton',
        ],
      },
    },
    custom: {
      ...(field.custom ?? {}),
      translationMode: mode,
    },
  }
}
