import { ChannelTypeEnum, Novu } from "./deps.ts";

export const testConfig = {
  port: 8005,
  fake: false,
  novuConfig: {
    apiKey: "TEST-API-KEY",
    apiUrl: "TEST-API-URL",
  },
  environment: "local",
};
export const subscriberId = "testSubscriberId";
type NovuSubscribers = Novu["subscribers"];
class NovuSubscribersMock implements Partial<NovuSubscribers> {}
class NovuMock implements Partial<Novu> {
  subscribers = new NovuSubscribersMock() as NovuSubscribers;
}
export const novuMock = new NovuMock() as Novu;
const novuPreferencesAllEnabled = {
  enabled: true,
  channels: {
    "push": true,
    "email": true,
    "in_app": true,
  },
};
export const testGlobalPreferences = [{
  preference: novuPreferencesAllEnabled,
}];
export const testWorkflowPreferences = [
  {
    preference: {
      enabled: true,
      channels: {
        "push": false,
        "in_app": true,
      },
    },
    template: {
      _id: "space-new-post",
      tags: ["CATEGORY_SPACES", "SPACE_NEW_POST"],
    },
  },
  {
    preference: novuPreferencesAllEnabled,
    template: {
      _id: "space-membership-request-accept",
      tags: ["CATEGORY_SPACES", "SPACE_MEMBERSHIP_REQUEST"],
    },
  },
  {
    preference: {
      enabled: true,
      channels: {
        "push": true,
        "in_app": true,
      },
    },
    template: {
      _id: "space-membership-request-decline",
      tags: ["CATEGORY_SPACES", "SPACE_MEMBERSHIP_REQUEST"],
    },
  },
];
export const preferencesAllEnabled = {
  "push": true,
  "email": true,
};
export const globalUpdate = {
  id: "GLOBAL",
  channel: ChannelTypeEnum.PUSH,
  enabled: false,
};
