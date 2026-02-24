export interface Project {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  repositoryUrl?: string;
  githubRepoId?: string;
  status: 'active' | 'archived';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  repositoryUrl?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: string;
}

export interface ImportProjectDto {
  githubRepoFullName: string;
  branch: string;
  name: string;
  description: string;
}
