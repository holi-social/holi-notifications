import { ChannelTypeEnum } from './deps.ts'

export interface NovuResponse<T> {
  data: T
}

interface NovuWorkflowTemplate {
  _id: string
  tags: string[]
}

export type NovuChannelPreferences = {
  [key in ChannelTypeEnum]?: boolean
}

interface NovuPreferences {
  enabled: boolean
  channels: NovuChannelPreferences
}

export interface NovuWorkflowPreferences {
  template: NovuWorkflowTemplate
  preference: NovuPreferences
}

export type NovuGlobalPreferences = Omit<NovuWorkflowPreferences, 'template'>
