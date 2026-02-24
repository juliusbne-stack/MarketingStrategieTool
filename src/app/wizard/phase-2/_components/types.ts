export interface Artifact {
  id: number;
  artifactKey: string;
  data: unknown;
  version: number;
  locked: boolean;
}
