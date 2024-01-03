import {
  afterEach,
  assertEquals,
  assertSpyCall,
  assertSpyCalls,
  beforeEach,
  describe,
  it,
  Stub,
} from "./dev_deps.ts";
import { GraphQLError } from "./deps.ts";
import {
  createGraphQLServer,
  GraphQLServer,
  HEADER_USER_ID,
} from "./server.ts";
import { PreferencesResponse, UpdatePreferencesInput } from "./types.ts";
import {
  globalUpdate,
  novuMock,
  preferencesAllEnabled,
  subscriberId,
  testConfig,
} from "./test_data.ts";
import {
  processGqlRequest,
  stubNovuGlobalPreferences,
  stubNovuUpdateGlobalPreferences,
  stubNovuUpdateWorkflowPreferences,
  stubNovuWorkflowPreferences,
} from "./test_helpers.ts";

const authorizedHeader = {
  [HEADER_USER_ID]: subscriberId,
};

const queryPreferences = (
  graphQLServer: GraphQLServer,
  headers: Record<string, unknown> = authorizedHeader,
): Promise<PreferencesResponse | GraphQLError> => {
  const query = `
  query Preferences {
    preferences {
      id
      category
      preferences {
        push
        email
      }
    }
  }`;
  return processGqlRequest(graphQLServer, query, {}, headers).then(
    (result) => result?.preferences as PreferencesResponse,
  );
};

const mutatePreferences = (
  graphQLServer: GraphQLServer,
  input: UpdatePreferencesInput,
  headers: Record<string, unknown> = authorizedHeader,
): Promise<PreferencesResponse | GraphQLError> => {
  const query = `
  mutation UpdatePreferences($input: UpdatePreferencesInput!) {
    updatePreferences(input: $input) {
      id
      category
      preferences {
        push
        email
      }
    }
  }`;
  return processGqlRequest(graphQLServer, query, { input }, headers).then(
    (result) => result?.updatePreferences as PreferencesResponse,
  );
};

describe("server", () => {
  let novuGlobalPreferenceStub: Stub;
  let novuPreferenceStub: Stub;
  let novuUpdateGlobalPreferenceStub: Stub;
  let novuUpdatePreferenceStub: Stub;

  beforeEach(() => {
    novuGlobalPreferenceStub = stubNovuGlobalPreferences();
    novuPreferenceStub = stubNovuWorkflowPreferences();
    novuUpdateGlobalPreferenceStub = stubNovuUpdateGlobalPreferences();
    novuUpdatePreferenceStub = stubNovuUpdateWorkflowPreferences();
  });

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

  describe("preferences", () => {
    it("returns aggregated response", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: preferencesAllEnabled,
        },
        {
          id: "SPACE_NEW_POST",
          category: "SPACES",
          preferences: { push: false, email: null },
        },
        {
          id: "SPACE_MEMBERSHIP_REQUEST",
          category: "SPACES",
          preferences: preferencesAllEnabled,
        },
      ];
      const graphQLServer = createGraphQLServer(novuMock, testConfig);

      const result = await queryPreferences(graphQLServer);

      assertEquals(result, expectedPreferences);
    });

    it("correctly retrieves user id from header", async () => {
      const graphQLServer = createGraphQLServer(novuMock, testConfig);

      await queryPreferences(graphQLServer);

      assertSpyCall(novuGlobalPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId],
      });
      assertSpyCall(novuPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId],
      });
    });

    it("does not fetch preferences if subscriber id is missing", async () => {
      const graphQLServer = createGraphQLServer(novuMock, testConfig);

      const result = await queryPreferences(graphQLServer, {});

      assertEquals(result, undefined);
      assertSpyCalls(novuGlobalPreferenceStub, 0);
      assertSpyCalls(novuPreferenceStub, 0);
    });
  });

  describe("updatePreferences", () => {
    it("returns aggregated response", async () => {
      const expectedPreferences = [
        {
          id: "GLOBAL",
          category: "GLOBAL",
          preferences: { push: false, email: true },
        },
        {
          id: "SPACE_NEW_POST",
          category: "SPACES",
          preferences: { push: false, email: null },
        },
        {
          id: "SPACE_MEMBERSHIP_REQUEST",
          category: "SPACES",
          preferences: { push: false, email: true },
        },
      ];
      const graphQLServer = createGraphQLServer(novuMock, testConfig);

      const result = await mutatePreferences(graphQLServer, globalUpdate);

      assertEquals(result, expectedPreferences);
    });

    it("correctly retrieves user id from header", async () => {
      const graphQLServer = createGraphQLServer(novuMock, testConfig);

      await mutatePreferences(graphQLServer, globalUpdate);

      assertSpyCall(novuGlobalPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId],
      });
      assertSpyCall(novuPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId],
      });
      assertSpyCall(novuUpdateGlobalPreferenceStub, 0, {
        self: novuMock.subscribers,
        args: [subscriberId, {
          preferences: [{ enabled: false, type: "push" }],
        }],
      });
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

    it("does not update preferences if subscriber id is missing", async () => {
      const graphQLServer = createGraphQLServer(novuMock, testConfig);

      const result = await mutatePreferences(graphQLServer, globalUpdate, {});

      assertEquals(result, undefined);
      assertSpyCalls(novuGlobalPreferenceStub, 0);
      assertSpyCalls(novuPreferenceStub, 0);
      assertSpyCalls(novuUpdateGlobalPreferenceStub, 0);
      assertSpyCalls(novuUpdatePreferenceStub, 0);
    });
  });
});
