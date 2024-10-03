import { ChannelTypeEnum } from './deps.ts'

export type ChannelPreferences = {
  [key in ChannelTypeEnum]?: boolean | null
}

export interface WorkflowTemplatePreferences {
  id: string
  category: string
  templateId?: string
  preferences: ChannelPreferences
}

export type WorkflowGroupPreferences = Omit<
  WorkflowTemplatePreferences,
  'templateId'
>

export type PreferencesResponse = WorkflowGroupPreferences[]

export interface UpdatePreferencesInput {
  id: string
  channel: ChannelTypeEnum
  enabled: boolean
}

export interface UpdatePreferencesParameters {
  input: UpdatePreferencesInput
}
