# API Keys Setup Guide

## Quick Start: Get Your API Keys

### Option 1: Gemini (FREE & Recommended) 

1. Go to: https://aistudio.google.com/apikey
2. Click "Create API Key"
3. Copy the key

**Why Gemini?**
-  Completely FREE
-  Very fast (2.0 Flash)
-  Excellent quality
-  No credit card required

### Option 2: Claude 4.5 Sonnet (Best Quality)

1. Go to: https://console.anthropic.com/
2. Sign up / Log in
3. Go to API Keys section
4. Create new key
5. Copy the key

**Pricing:**  input /  output per million tokens

### Option 3: OpenAI GPT-4 (Reliable Backup)

1. Go to: https://platform.openai.com/api-keys
2. Sign up / Log in
3. Create new secret key
4. Copy the key

**Pricing:**  input /  output per million tokens

## Setup Instructions

Once you have at least one API key:

1. Copy \ackend/.env.example\ to \ackend/.env\
2. Add your API key(s):

\\\ash
# Add at least one of these:
GEMINI_API_KEY=your-gemini-key-here
ANTHROPIC_API_KEY=your-claude-key-here
OPENAI_API_KEY=your-openai-key-here

# Configure priority (optional)
PRIMARY_LLM=gemini      # or anthropic, or openai
FALLBACK_LLM=anthropic  # or gemini, or openai
TERTIARY_LLM=openai     # or gemini, or anthropic
\\\

3. Start the backend:
\\\ash
cd backend
npm run start:dev
\\\

4. Test plan generation!

## Testing

Once configured, you can test with:

\\\ash
# From the project root
cd backend
npm run start:dev
\\\

Then use the frontend wizard or call the API directly:

\\\ash
curl -X POST http://localhost:3001/api/plans/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "test",
    "userId": "test",
    "wizardData": {
      "stage1": {
        "projectName": "Task Manager",
        "description": "A simple task management app"
      },
      "stage2": {
        "target_users": "Teams",
        "main_features": "Tasks, Projects, Collaboration"
      },
      "stage3": {
        "selectedArchetypes": ["auth-jwt-stateless"]
      }
    }
  }'
\\\

## Cost Comparison

For a typical plan generation (~2000 input tokens, ~1500 output tokens):

- **Gemini 2.0**: ~.0003 (FREE tier)
- **Claude 4.5**: ~.028
- **GPT-4 Turbo**: ~.065

**Recommendation:** Start with Gemini for development, use Claude for production quality.
