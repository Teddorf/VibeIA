import 'dotenv/config';
import { AnthropicProvider } from './src/modules/llm/providers/anthropic.provider';

async function testClaude() {
  console.log(' Testing Claude 4.5 Sonnet Plan Generation...');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(' Error: ANTHROPIC_API_KEY is missing in .env');
    return;
  }

  const provider = new AnthropicProvider();

  const mockWizardData = {
    stage1: {
      projectName: "Vibe Coding Test",
      description: "A platform for AI-assisted coding"
    },
    stage2: {
      target_users: "Developers",
      main_features: "AI Chat, Project Management"
    },
    stage3: {
      selectedArchetypes: ["auth-jwt-stateless"]
    }
  };

  try {
    console.log(' Sending request to Anthropic...');
    const startTime = Date.now();

    const response = await provider.generatePlan(mockWizardData);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n Plan Generated in ${duration}s!`);
    console.log('----------------------------------------');
    console.log(`Provider: ${response.provider}`);
    console.log(`Tokens Used: ${response.tokensUsed}`);
    console.log(`Estimated Cost: $${response.cost.toFixed(4)}`);
    console.log('----------------------------------------');
    console.log('Plan Summary:');
    console.log(`- Phases: ${response.plan.phases.length}`);
    console.log(`- Estimated Time: ${response.plan.estimatedTime} mins`);
    console.log('\nFirst Phase Tasks:');
    response.plan.phases[0].tasks.forEach((t: any) => {
      console.log(`  [ ] ${t.name} (${t.estimatedTime}m)`);
    });

  } catch (error) {
    console.error(' Generation Failed:', error);
  }
}

testClaude();