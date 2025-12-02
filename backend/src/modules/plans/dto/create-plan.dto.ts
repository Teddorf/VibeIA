export class CreatePlanDto {
  projectId: string;
  userId: string;
  wizardData: {
    stage1: { projectName: string; description: string };
    stage2: Record<string, string>;
    stage3: { selectedArchetypes: string[] };
  };
}