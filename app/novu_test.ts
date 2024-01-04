import {
  afterEach,
  assertEquals,
  assertRejects,
  assertSpyCall,
  assertSpyCalls,
  describe,
  it,
  Stub,
} from "./dev_deps.ts";
import { ChannelTypeEnum, GraphQLError } from "./deps.ts";

import { fetchPreferences, updatePreferences } from "./novu.ts";
import {
  stubNovuGlobalPreferences,
  stubNovuUpdateGlobalPreferences,
  stubNovuUpdateWorkflowPreferences,
  stubNovuWorkflowPreferences,
} from "./test_helpers.ts";
import {
  globalUpdate,
  novuMock,
  preferencesAllEnabled,
  subscriberId,
} from "./test_data.ts";

describe("novu", () => {
  let novuGlobalPreferenceStub: Stub;
  let novuPreferenceStub: Stub;
  let novuUpdateGlobalPreferenceStub: Stub;
  let novuUpdatePreferenceStub: Stub;

  afterEach(() => {
    if (!novuGlobalPreferenceStub?.restored) {
      novuGlobalPreferenceStub?.restore();
    }
    if (!novuPreferenceStub?.restored) {
      novuPreferenceStub?.restore();
    }
    if (!novuUpdateGlobalPreferenceStub?.restored) {
      novuUpdateGlobalPreferenceStub?.restore();
    }
    if (!novuUpdatePreferenceStub?.restored) {
      novuUpdatePreferenceStub?.restore();
    }
  });

  describe("fetching preferences", () => {
    it("fetches global and workflow preferences for subscriber", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();

      await fetchPreferences(novuMock, subscriberId);

      assertSpyCall(novuGlobalPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId],
      });
      assertSpyCall(novuPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId],
      });
    });

    it("throws unauthorized error for missing subscriber id", async () => {
      await assertRejects(
        () => fetchPreferences(novuMock, undefined),
        GraphQLError,
        "Unauthorized",
      );
    });

    it("throws unauthorized error for empty subscriber id", async () => {
      await assertRejects(
        () => fetchPreferences(novuMock, ""),
        GraphQLError,
        "Unauthorized",
      );
    });

    it("transforms preferences and groups workflow templates", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: preferencesAllEnabled,
        },
        {
          id: "SPACE_NEW_POST",
          category: "SPACES",
          preferences: { push: false, email: undefined },
        },
        {
          id: "SPACE_MEMBERSHIP_REQUEST",
          category: "SPACES",
          preferences: preferencesAllEnabled,
        },
      ];
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();

      const result = await fetchPreferences(novuMock, subscriberId);

      assertEquals(result, expectedPreferences);
    });

    it("only returns global preferences if no workflows were fetched", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: preferencesAllEnabled,
        },
      ];
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences([]);

      const result = await fetchPreferences(novuMock, subscriberId);

      assertEquals(result, expectedPreferences);
    });

    it("throws error if fetching global preferences fails", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences(new Error("Test"));
      novuPreferenceStub = stubNovuWorkflowPreferences();

      await assertRejects(
        () => fetchPreferences(novuMock, subscriberId),
        Error,
        "Test",
      );
    });

    it("throws error if fetching workflow preferences fails", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences(new Error("Test"));

      await assertRejects(
        () => fetchPreferences(novuMock, subscriberId),
        Error,
        "Test",
      );
    });

    it("throws error if global preferences are invalid", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences([]);
      novuPreferenceStub = stubNovuWorkflowPreferences();

      await assertRejects(
        () => fetchPreferences(novuMock, subscriberId),
        Error,
        "Cannot read properties of undefined",
      );
    });

    it("handles workflow templates without tags", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: { push: true, email: true },
        },
        {
          id: "",
          category: "",
          preferences: { push: false, email: undefined },
        },
      ];
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences([
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
            tags: [],
          },
        },
      ]);
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      const result = await fetchPreferences(novuMock, subscriberId);

      assertEquals(result, expectedPreferences);
      assertSpyCalls(novuUpdatePreferenceStub, 0);
    });
  });

  describe("updating preferences", () => {
    it("fetches global and workflow preferences for subscriber", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await updatePreferences(novuMock, subscriberId, globalUpdate);

      assertSpyCall(novuGlobalPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId],
      });
      assertSpyCall(novuPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId],
      });
    });

    it("throws unauthorized error for missing subscriber id", async () => {
      await assertRejects(
        () => updatePreferences(novuMock, undefined, globalUpdate),
        GraphQLError,
        "Unauthorized",
      );
    });

    it("throws unauthorized error for empty subscriber id", async () => {
      await assertRejects(
        () => updatePreferences(novuMock, "", globalUpdate),
        GraphQLError,
        "Unauthorized",
      );
    });

    it("throws error if fetching global preferences fails", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences(new Error("Test"));
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await assertRejects(
        () => updatePreferences(novuMock, subscriberId, globalUpdate),
        Error,
        "Test",
      );
    });

    it("throws error if fetching workflow preferences fails", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences(new Error("Test"));
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await assertRejects(
        () => updatePreferences(novuMock, subscriberId, globalUpdate),
        Error,
        "Test",
      );
    });

    it("throws error if global preferences are invalid", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences([]);
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await assertRejects(
        () => updatePreferences(novuMock, subscriberId, globalUpdate),
        Error,
        "Cannot read properties of undefined",
      );
    });

    it("throws error if updating global preferences fails", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences(
        new Error("Test"),
      );
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await assertRejects(
        () => updatePreferences(novuMock, subscriberId, globalUpdate),
        Error,
        "Test",
      );
    });

    it("throws error if updating workflow preferences fails", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences(
        new Error("Test"),
      );

      await assertRejects(
        () => updatePreferences(novuMock, subscriberId, globalUpdate),
        Error,
        "Test",
      );
    });

    it("applies global update globally and to every workflow", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await updatePreferences(novuMock, subscriberId, globalUpdate);

      assertSpyCall(novuUpdateGlobalPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId, {
          preferences: [{ enabled: false, type: "push" }],
        }],
      });
      assertSpyCalls(novuUpdatePreferenceStub, 2);
      assertSpyCall(novuUpdatePreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId, "space-membership-request-accept", {
          channel: { enabled: false, type: "push" },
        }],
      });
      assertSpyCall(novuUpdatePreferenceStub, 1, {
        self: novuMock.subscribers,
        args: [subscriberId, "space-membership-request-decline", {
          channel: { enabled: false, type: "push" },
        }],
      });
    });

    it("only applies updates to workflows if channel is supported", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await updatePreferences(novuMock, subscriberId, {
        ...globalUpdate,
        channel: ChannelTypeEnum.EMAIL,
      });

      assertSpyCalls(novuUpdatePreferenceStub, 1);
      assertSpyCall(novuUpdatePreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId, "space-membership-request-accept", {
          channel: { enabled: false, type: "email" },
        }],
      });
    });

    it("only applies updates to workflows if preference is changed", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await updatePreferences(novuMock, subscriberId, {
        ...globalUpdate,
        enabled: true,
      });

      assertSpyCalls(novuUpdateGlobalPreferenceStub, 0);
      assertSpyCalls(novuUpdatePreferenceStub, 1);
      assertSpyCall(novuUpdatePreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId, "space-new-post", {
          channel: { enabled: true, type: "push" },
        }],
      });
    });

    it("applies workflow specific update", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await updatePreferences(novuMock, subscriberId, {
        ...globalUpdate,
        id: "SPACE_MEMBERSHIP_REQUEST",
      });

      assertSpyCalls(novuUpdateGlobalPreferenceStub, 0);
      assertSpyCalls(novuUpdatePreferenceStub, 2);
      assertSpyCall(novuUpdatePreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId, "space-membership-request-accept", {
          channel: { enabled: false, type: "push" },
        }],
      });
      assertSpyCall(novuUpdatePreferenceStub, 1, {
        self: novuMock.subscribers,
        args: [subscriberId, "space-membership-request-decline", {
          channel: { enabled: false, type: "push" },
        }],
      });
    });

    it("enables channel globally during workflow update if necessary", async () => {
      novuGlobalPreferenceStub = stubNovuGlobalPreferences([{
        preference: {
          enabled: true,
          channels: {
            "push": false,
            "email": true,
          },
        },
      }]);
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      await updatePreferences(novuMock, subscriberId, {
        id: "SPACE_NEW_POST",
        channel: ChannelTypeEnum.PUSH,
        enabled: true,
      });

      assertSpyCall(novuUpdateGlobalPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId, {
          preferences: [{ enabled: true, type: "push" }],
        }],
      });
      assertSpyCalls(novuUpdatePreferenceStub, 1);
      assertSpyCall(novuUpdatePreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId, "space-new-post", {
          channel: { enabled: true, type: "push" },
        }],
      });
    });

    it("returns aggregation of updated preferences", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: { push: false, email: true },
        },
        {
          id: "SPACE_NEW_POST",
          category: "SPACES",
          preferences: { push: false, email: undefined },
        },
        {
          id: "SPACE_MEMBERSHIP_REQUEST",
          category: "SPACES",
          preferences: { push: false, email: true },
        },
      ];
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences();
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      const result = await updatePreferences(
        novuMock,
        subscriberId,
        globalUpdate,
      );

      assertEquals(result, expectedPreferences);
    });

    it("handles empty list of workflow templates", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: { push: false, email: true },
        },
      ];
      novuGlobalPreferenceStub = stubNovuGlobalPreferences();
      novuPreferenceStub = stubNovuWorkflowPreferences([]);
      novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
      novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();

      const result = await updatePreferences(
        novuMock,
        subscriberId,
        globalUpdate,
      );

      assertEquals(result, expectedPreferences);
      assertSpyCalls(novuUpdatePreferenceStub, 0);
    });
  });
});
