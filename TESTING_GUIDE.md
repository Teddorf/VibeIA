# Testing Guide - Vibe Coding Platform

## Overview
Comprehensive test suite covering backend and frontend with unit tests, integration tests, and E2E tests.

## Backend Tests (NestJS + Jest)

### Running Tests
```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

### Test Structure
- **Unit Tests**: src/**/*.spec.ts
  - LLM Service: Provider selection, fallback logic, cost estimation
  - Plans Service: Plan generation, CRUD operations
  - Plans Controller: Endpoint testing
  
- **Integration Tests**: 	est/**/*.e2e-spec.ts
  - Plans API: Full request/response cycle
  - Database integration

### Coverage Goals
- Overall: \u003e85%
- Critical paths (LLM, Plans): 100%

## Frontend Tests (React Testing Library + Jest)

### Running Tests
```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

### Test Structure
- **Component Tests**: src/components/**/__tests__/*.test.tsx
  - Stage1IntentDeclaration: Input validation, form submission
  - WizardContainer: Stage progression, data flow
  - API Client: Request/response handling

### Coverage Goals
- Components: \u003e80%
- Critical user flows: 100%

## Test Practices

### Unit Tests
- Mock external dependencies
- Test one unit at a time
- Clear, descriptive test names
- Arrange-Act-Assert pattern

### Integration Tests
- Test multiple units together
- Use test database
- Clean up after each test

### Component Tests
- Test user interactions
- Test accessibility
- Mock API calls
- Test error states

## CI/CD Integration
Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

## Writing New Tests

### Backend Example
```typescript
describe('MyService', () =\u003e {
  let service: MyService;
  
  beforeEach(async () =\u003e {
    const module = await Test.createTestingModule({
      providers: [MyService],
    }).compile();
    
    service = module.get\u003cMyService\u003e(MyService);
  });
  
  it('should do something', () =\u003e {
    expect(service.doSomething()).toBe(expected);
  });
});
```

### Frontend Example
```typescript
describe('MyComponent', () =\u003e {
  it('renders correctly', () =\u003e {
    render(\u003cMyComponent /\u003e);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
  
  it('handles user interaction', () =\u003e {
    render(\u003cMyComponent /\u003e);
    fireEvent.click(screen.getByRole('button'));
    expect(mockCallback).toHaveBeenCalled();
  });
});
```

## Troubleshooting

### Common Issues
1. **Module not found**: Check imports and module paths
2. **Timeout errors**: Increase Jest timeout for async tests
3. **Mock not working**: Ensure mocks are defined before imports

### Debug Mode
```bash
# Backend
node --inspect-brk node_modules/.bin/jest --runInBand

# Frontend
node --inspect-brk node_modules/.bin/jest --runInBand
```
