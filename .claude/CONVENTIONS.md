# VibeIA - Coding Conventions

## File Naming

| Type       | Pattern                  | Example                |
| ---------- | ------------------------ | ---------------------- |
| Component  | PascalCase.tsx           | `WizardContainer.tsx`  |
| Hook       | camelCase.ts             | `useStreamingPlan.ts`  |
| Service    | kebab-case.service.ts    | `llm.service.ts`       |
| Controller | kebab-case.controller.ts | `plans.controller.ts`  |
| Module     | kebab-case.module.ts     | `auth.module.ts`       |
| Schema     | kebab-case.schema.ts     | `user.schema.ts`       |
| DTO        | kebab-case.dto.ts        | `create-plan.dto.ts`   |
| Test       | _.spec.ts / _.test.tsx   | `auth.service.spec.ts` |

## Directory Structure

### Backend

```
src/modules/{module-name}/
├── {module}.controller.ts
├── {module}.service.ts
├── {module}.module.ts
├── {module}.controller.spec.ts
├── {module}.service.spec.ts
├── dto/
│   └── {action}-{entity}.dto.ts
├── schemas/
│   └── {entity}.schema.ts
└── guards/ (optional)
```

### Frontend

```
src/components/{feature}/
├── {Component}.tsx
├── __tests__/
│   └── {Component}.test.tsx
├── hooks/
│   └── use{Feature}.ts
└── index.ts (barrel export)
```

## TypeScript Guidelines

### Strict Mode Enabled

- No `any` types (use `unknown` if needed)
- Always handle null/undefined
- Use proper return types

### Naming

```typescript
// Interfaces: I prefix (optional) or descriptive name
interface UserData { ... }
interface IUserRepository { ... }

// Types: descriptive name
type UserRole = 'admin' | 'user';

// Enums: PascalCase
enum TaskStatus {
  Pending = 'pending',
  Completed = 'completed',
}

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = process.env.API_URL;
```

## NestJS Patterns

### Controllers

```typescript
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreatePlanDto, @CurrentUser() user: User) {
    return this.plansService.create(dto, user.id);
  }
}
```

### Services

```typescript
@Injectable()
export class PlansService {
  constructor(@InjectModel(Plan.name) private planModel: Model<PlanDocument>) {}

  async create(dto: CreatePlanDto, userId: string): Promise<Plan> {
    // Validation and business logic here
    return this.planModel.create({ ...dto, userId });
  }
}
```

### DTOs with Validation

```typescript
export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

## React Patterns

### Components

```typescript
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export function WizardStep({ title, onSubmit }: Props) {
  // hooks first
  const [state, setState] = useState<string>('');
  const { data } = useQuery();

  // event handlers
  const handleSubmit = useCallback(() => {
    onSubmit({ state });
  }, [state, onSubmit]);

  // render
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

### Custom Hooks

```typescript
export function useStreamingPlan(planId: string) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // fetch logic
  }, [planId]);

  return { plan, isLoading, error };
}
```

## API Design

### Endpoints

```
GET    /api/plans          # List plans
POST   /api/plans          # Create plan
GET    /api/plans/:id      # Get plan
PATCH  /api/plans/:id      # Update plan
DELETE /api/plans/:id      # Delete plan
POST   /api/plans/:id/execute  # Execute plan
```

### Response Format

```typescript
// Success
{
  "data": { ... },
  "message": "Plan created successfully"
}

// Error
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["Name is required"]
}
```

## Git Commit Messages

### Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance

### Examples

```
feat(wizard): add streaming plan preview
fix(auth): handle expired refresh token
docs(readme): update deployment instructions
test(plans): add integration tests for create endpoint
```

## Testing

### Unit Tests

- Test one thing per test
- Use descriptive names: `should return error when user not found`
- Mock external dependencies

### Integration Tests

- Test complete flows
- Use in-memory database (mongodb-memory-server)
- Clean up after each test

### Component Tests

- Use React Testing Library
- Test user interactions, not implementation
- Prefer `getByRole` over `getByTestId`
