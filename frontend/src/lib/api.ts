export { ApiError, type ApiClientOptions } from './api-client/base';

import { createAuthApi } from './api-client/auth';
import { createRequestClient, type ApiClientOptions } from './api-client/base';
import { createClassroomApi } from './api-client/classrooms';
import { createDocumentApi } from './api-client/documents';
import { createGitApi } from './api-client/git';
import { createTeacherApi } from './api-client/teacher';
import { createUserApi } from './api-client/users';
import { createWorkspaceApi } from './api-client/workspace';

export function createApiClient(options: ApiClientOptions) {
  const request = createRequestClient(options);

  return {
    ...createAuthApi(request),
    ...createClassroomApi(request),
    ...createUserApi(request),
    ...createWorkspaceApi(request),
    ...createDocumentApi(request),
    ...createTeacherApi(request),
    ...createGitApi(request),
  };
}
