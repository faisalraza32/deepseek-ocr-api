# Testing Guide

## Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Watch mode (auto-rerun on changes)
npm run test:watch
```

## Test Statistics

- **Total Tests:** 77
- **Test Suites:** 8
- **Code Coverage:** 87.67%
- **Status:** ✅ All passing

## Test Structure

```
src/
├── common/
│   ├── filters/
│   │   └── http-exception.filter.spec.ts (7 tests)
│   └── interceptors/
│       └── logging.interceptor.spec.ts (4 tests)
├── document/services/
│   ├── document-detector.service.spec.ts (7 tests)
│   ├── pdf-processor.service.spec.ts (7 tests)
│   └── schema-extractor.service.spec.ts (9 tests)
├── ocr/
│   ├── ocr.controller.spec.ts (16 tests)
│   └── ocr.service.spec.ts (14 tests)
└── storage/
    └── storage.service.spec.ts (13 tests)
```

## What's Tested

### ✅ Controllers (16 tests)

- Single file upload
- Batch file upload
- Document type hints
- Health checks
- Supported formats API
- Error handling (no file, invalid type)

### ✅ Services (40 tests)

- File extraction pipeline
- PDF to image conversion
- Document type detection
- Schema extraction (all types)
- Batch processing
- Error recovery

### ✅ Storage (13 tests)

- File validation
- Save/delete operations
- Size limits
- Type restrictions
- Old file cleanup
- Error handling

### ✅ Common (11 tests)

- HTTP exception filtering
- Request/response logging
- Error formatting
- Performance tracking

## Running Specific Tests

### Run Single Test Suite

```bash
npm test -- ocr.controller.spec
npm test -- storage.service.spec
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="should extract"
```

### Run Tests for Changed Files

```bash
npm test -- --onlyChanged
```

### Debug Tests

```bash
npm test -- --detectOpenHandles --runInBand
```

## Coverage Thresholds

Tests fail if coverage drops below:

- **Statements:** 70%
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%

Current coverage **exceeds all thresholds** ✅

## CI/CD Integration

Tests run automatically on:

- Push to `main` or `develop`
- Pull requests
- Multiple Node versions (18.x, 20.x)

See `.github/workflows/test.yml` for configuration.

## Writing New Tests

### 1. Create Test File

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### 2. Mock Dependencies

```typescript
const mockDependency = {
  method: jest.fn().mockResolvedValue(result),
};

const module = await Test.createTestingModule({
  providers: [
    YourService,
    {
      provide: Dependency,
      useValue: mockDependency,
    },
  ],
}).compile();
```

### 3. Test Patterns

```typescript
// Arrange
const input = {
  /* test data */
};
mockDependency.method.mockResolvedValue(output);

// Act
const result = await service.method(input);

// Assert
expect(result).toEqual(expected);
expect(mockDependency.method).toHaveBeenCalledWith(input);
```

## Best Practices

### DO ✅

- Test one behavior per test
- Use descriptive test names
- Mock external dependencies
- Clean up after each test
- Test error cases
- Test edge cases

### DON'T ❌

- Test implementation details
- Share state between tests
- Make tests dependent on order
- Use real external services
- Ignore failing tests
- Skip error cases

## Common Issues

### Tests Failing?

```bash
# Clear cache
npm test -- --clearCache

# Run in band (no parallel)
npm test -- --runInBand

# Show full error output
npm test -- --verbose
```

### Coverage Not Updating?

```bash
# Remove old coverage
rm -rf coverage

# Regenerate
npm run test:cov
```

### Mock Not Working?

```typescript
// Mock BEFORE importing
jest.mock('./dependency');
import { Dependency } from './dependency';
```

## Viewing Coverage

### Terminal

```bash
npm run test:cov
```

### HTML Report

```bash
npm run test:cov
open coverage/lcov-report/index.html
```

### VS Code Coverage Gutters

Install "Coverage Gutters" extension and run:

```bash
npm run test:cov
```

Then click "Watch" in VS Code status bar.

## Performance

- **Average test time:** 10-18 seconds
- **Tests run in parallel:** Yes
- **Watch mode:** Instant feedback

## Debugging Tests

### VS Code Launch Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Breakpoints

1. Set breakpoint in test or source file
2. Run "Jest Debug" from VS Code
3. Debugger stops at breakpoint

## Resources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test Coverage Report](./TEST_COVERAGE.md)

## Next Steps

1. ✅ All unit tests passing
2. 🔄 Add integration tests (future)
3. 🔄 Add e2e tests (future)
4. 🔄 Add performance tests (future)

---

**Questions?** See [TEST_COVERAGE.md](./TEST_COVERAGE.md) for detailed coverage information.
