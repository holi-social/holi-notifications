import {
  ChannelTypeEnum,
  GraphQLError,
  groupBy,
  Novu,
  partition,
} from "./deps.ts";
import { logger } from "./logging.ts";
import {
  NovuChannelPreferences,
  NovuGlobalPreferences,
  NovuResponse,
  NovuWorkflowPreferences,
} from "./novu_types.ts";
import {
  ChannelPreferences,
  PreferencesResponse,
  UpdatePreferencesInput,
  WorkflowGroupPreferences,
  WorkflowTemplatePreferences,
} from "./types.ts";

export interface NovuConfig {
  apiKey: string;
  apiUrl: string;
}

const CATEGORY_PREFIX = "CATEGORY_";
const CATEGORY_GLOBAL = "GLOBAL";

// Differentiate between false (channel is supported, but not enabled) and null/undefined (channel is not supported)
const determineEnabledValue = (
  valueA?: boolean | null,
  valueB?: boolean | null,
): boolean | null | undefined => {
  if (valueA === undefined || valueA === null || valueA === valueB) {
    return valueB;
  }
  if (valueB === undefined || valueA === null) {
    return valueA;
  }
  return true;
};

export const createNovuInstance = (config: NovuConfig) =>
  new Novu(config.apiKey, {
    backendUrl: config.apiUrl,
    // TODO: specify retryConfig
  });

const aggregatePreferences = (workflows: WorkflowTemplatePreferences[]) =>
  workflows.reduce(
    (preferences, workflow) => ({
      push: determineEnabledValue(preferences.push, workflow.preferences.push),
      email: determineEnabledValue(
        preferences.email,
        workflow.preferences.email,
      ),
    }),
    {} as ChannelPreferences,
  );

const aggregateGroupedWorkflowPreferences = (
  workflows: WorkflowTemplatePreferences[],
): WorkflowGroupPreferences[] =>
  Object.entries(
    groupBy(workflows, (workflow: WorkflowTemplatePreferences) => workflow.id),
  ).map(([id, workflows]) => ({
    category: workflows[0].category,
    id,
    preferences: aggregatePreferences(workflows),
  }));

const transformChannelPreferences = (
  preferences: NovuChannelPreferences,
): ChannelPreferences => {
  const {
    [ChannelTypeEnum.EMAIL]: email,
    [ChannelTypeEnum.PUSH]: push,
  } = preferences;
  return { email, push };
};

const transformWorkflowPreferences = (
  workflow: NovuWorkflowPreferences,
): WorkflowTemplatePreferences => {
  const [[category], [id]] = partition(
    workflow.template.tags,
    (tag) => tag.startsWith(CATEGORY_PREFIX),
  );
  return {
    id,
    category: category.replace(CATEGORY_PREFIX, ""),
    templateId: workflow.template._id,
    preferences: transformChannelPreferences(workflow.preference.channels),
  };
};

const createGlobalPreferences = (
  preferences: NovuGlobalPreferences,
): WorkflowTemplatePreferences => ({
  id: CATEGORY_GLOBAL,
  category: CATEGORY_GLOBAL,
  preferences: transformChannelPreferences(preferences.preference.channels),
});

const fetchGlobalPreferences = (novu: Novu, subscriberId: string) =>
  novu.subscribers.getGlobalPreference(subscriberId).then(
    ({ data }: { data: NovuResponse<NovuGlobalPreferences[]> }) =>
      createGlobalPreferences(data.data[0]),
  ).catch((error) => {
    logger.error(
      `Failed to retrieve global preferences for subscriber: ${error.message}`,
    );
    throw error;
  });

const fetchWorkflowTemplatePreferences = (
  novu: Novu,
  subscriberId: string,
) =>
  novu.subscribers.getPreference(subscriberId).then(
    ({ data }: { data: NovuResponse<NovuWorkflowPreferences[]> }) => {
      return data.data.map(transformWorkflowPreferences);
    },
  ).catch((error) => {
    logger.error(
      `Failed to retrieve workflow template preferences for subscriber: ${error.message}`,
    );
    throw error;
  });

export const fetchPreferences = async (
  novu: Novu,
  subscriberId: string | undefined,
): Promise<PreferencesResponse> => {
  if (!subscriberId) {
    throw new GraphQLError("Unauthorized", {
      extensions: { "code": "UNAUTHORIZED" },
    });
  }
  const [globalPreferences, templatePreferences] = await Promise.all([
    fetchGlobalPreferences(novu, subscriberId),
    fetchWorkflowTemplatePreferences(novu, subscriberId),
  ]);

  return aggregateGroupedWorkflowPreferences(
    [globalPreferences].concat(templatePreferences),
  );
};

const applyUpdate = async (
  novu: Novu,
  subscriberId: string,
  workflowPreferences: WorkflowTemplatePreferences,
  input: UpdatePreferencesInput,
): Promise<WorkflowTemplatePreferences> => {
  // Leave preferences unchanged if not matching or not global change
  if (!([CATEGORY_GLOBAL, workflowPreferences.id].includes(input.id))) {
    return workflowPreferences;
  }
  // Return preferences unchanged if there is nothing to change or the channel
  // is not supported
  const currentPreference = workflowPreferences.preferences[input.channel];
  if (currentPreference === undefined || currentPreference === input.enabled) {
    return workflowPreferences;
  }
  const channelPreferencesChange = {
    type: input.channel,
    enabled: input.enabled,
  };
  const updatedPreferences = {
    ...workflowPreferences,
    preferences: {
      ...workflowPreferences.preferences,
      [input.channel]: input.enabled,
    },
  };
  if (
    workflowPreferences.id === CATEGORY_GLOBAL ||
    !workflowPreferences.templateId
  ) {
    await novu.subscribers.updateGlobalPreference(subscriberId, {
      preferences: [channelPreferencesChange],
    });
    return updatedPreferences;
  }
  await novu.subscribers.updatePreference(
    subscriberId,
    workflowPreferences.templateId,
    {
      channel: channelPreferencesChange,
    },
  );
  return updatedPreferences;
};

export const updatePreferences = async (
  novu: Novu,
  subscriberId: string | undefined,
  input: UpdatePreferencesInput,
) => {
  if (!subscriberId) {
    throw new GraphQLError("Unauthorized", {
      extensions: { "code": "UNAUTHORIZED" },
    });
  }
  const [globalPreferences, templatePreferences] = await Promise.all([
    fetchGlobalPreferences(novu, subscriberId),
    fetchWorkflowTemplatePreferences(novu, subscriberId),
  ]);

  // TODO(SF) apply in parallel, possible combine in single list already
  const updatedGlobalPreferences = await applyUpdate(
    novu,
    subscriberId,
    globalPreferences,
    input,
  );
  const updatedWorkflowPreferences = await Promise.all(
    templatePreferences.map((workflowTemplate) =>
      applyUpdate(novu, subscriberId, workflowTemplate, input)
    ),
  );

  return aggregateGroupedWorkflowPreferences(
    [updatedGlobalPreferences].concat(updatedWorkflowPreferences),
  );
};
