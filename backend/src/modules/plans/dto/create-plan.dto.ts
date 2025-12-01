export class CreatePlanDto {
  projectId: string;
  userId: string;
  wizardData: {
    stage1: { projectName: string; description: string };
    stage2: Record\u003cstring, string\u003e;
    stage3: { selectedArchetypes: string[] };
  };
}
