import { defaultApiClient, type ApiClient } from "./client";
import type { ThematicBloc, ThematicBlocDetail } from "./types";

export const listThematicBlocs = (
  client: ApiClient = defaultApiClient,
) => client.request<ThematicBloc[]>("/thematic-blocs");

export const getThematicBloc = (
  blocId: string,
  client: ApiClient = defaultApiClient,
) =>
  client.request<ThematicBlocDetail>(
    `/thematic-blocs/${encodeURIComponent(blocId)}`,
  );
