import { returnsNext, stub } from "./dev_deps.ts";
import {
  NovuGlobalPreferences,
  NovuWorkflowPreferences,
} from "./novu_types.ts";
import { GraphQLServer } from "./server.ts";
import {
  novu,
  testGlobalPreferences,
  testWorkflowPreferences,
} from "./test_data.ts";

export const processGqlRequest = (
  graphQLServer: GraphQLServer,
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, unknown> = {},
): Promise<Record<string, unknown> | undefined | null> => {
  const request = new Request("http://localhost:8005/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "*/*",
      ...headers,
    },
    body: JSON.stringify({
      operationName: null,
      variables: variables,
      query: query,
      extensions: { headers },
    }),
  });
  return graphQLServer.handleRequest(request)
    // deno-lint-ignore no-explicit-any
    .then((response: any) => response.json())
    // deno-lint-ignore no-explicit-any
    .then((response: any) => response.data);
};

export const stubNovuGlobalPreferences = (
  response: NovuGlobalPreferences[] | Error = testGlobalPreferences,
) =>
  stub(
    novu.subscribers,
    "getGlobalPreference",
    // @ts-ignore: Full mock of AxiosResponse not necessary
    returnsNext([
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve({ data: { data: response } }),
    ]),
  );

export const stubNovuWorkflowPreferences = (
  response: NovuWorkflowPreferences[] | Error = testWorkflowPreferences,
) =>
  stub(
    novu.subscribers,
    "getPreference",
    // @ts-ignore: Full mock of AxiosResponse not necessary
    returnsNext([
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve({ data: { data: response } }),
    ]),
  );
