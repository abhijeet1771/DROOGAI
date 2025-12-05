# Human-Like Reviewer Implementation Plan

## Overview
Transform DroogAI into a human-like senior architect reviewer with context-aware, conversational suggestions.

---

## Phase 1: Foundation & Core Changes (Priority 1)

### 1.1 Consolidated PR Summary (Remove Per-File Summaries)
**Goal**: Single executive summary instead of per-file summaries

**Files to Modify:**
- `src/core/reviewer.ts` - `generateSummary()` method
- `src/post.ts` - Remove per-file summary posting

**Changes:**
- Remove `formatSummaryComment()` per-file summaries
- Create single PR-level summary with:
  - Impact on main branch
  - Quick stats (total issues, priority breakdown)
  - Immediate action items (top 3-5 priorities)
  - No per-file details

**Output Format:**
```
# ⚠️ PR Impact Assessment

**Merge Risk**: HIGH ⚠️

**If merged, main branch will experience:**
- 3 feature outages
- 5 test failures (CI blocked)
- 2 performance degradations

**Must fix before merge:**
1. Breaking change in UserService (8 files affected)
2. 5 failing tests need updates
3. Performance regression in PaymentService

**Quick Stats:**
- Total Issues: 12
- High Priority: 7
- Medium Priority: 3
- Low Priority: 2
```

---

### 1.2 Human-Like Comment Formatting
**Goal**: Conversational, respectful tone with impact-first structure

**Files to Modify:**
- `src/post.ts` - `formatComment()` method
- `src/llm.ts` - Comment generation prompts

**Changes:**
- Change comment format from:
  ```
  **HIGH**: Issue description
  **Suggestion**: Code
  ```
  
  To:
  ```
  I noticed [impact explanation]:
  - What will break
  - Where it will break
  - Why it matters
  
  Here's how I'd approach this:
  [Code suggestion]
  ```

**Tone Guidelines:**
- Use "I noticed", "I'd recommend", "Here's how"
- Avoid "Issue detected", "Error found", "Problem"
- Soft, respectful, helpful language
- All in English

---

## Phase 2: Code Organization & Architecture (Priority 2)

### 2.1 Code Organization Analyzer
**Goal**: Suggest better file/class locations based on naming patterns and structure

**New Files to Create:**
- `src/analysis/code-organization.ts`

**Features:**
- Detect method/class location mismatches
- Suggest based on naming patterns:
  - `CollabModal` locator → `CollabModalPage` class
  - `collab` step → `collab-steps.js` file
  - `collaboration` feature → `collaboration.feature` file
- Page Object Model detection for test code
- Separation of concerns suggestions

**Logic:**
```typescript
class CodeOrganizationAnalyzer {
  analyzeMethodLocation(method, currentClass, codebase) {
    // Check if method name suggests different class
    // e.g., "collabModal" → should be in CollabModalPage
    // Check codebase for similar patterns
    // Suggest better location
  }
  
  analyzeFileLocation(file, codebase) {
    // Check naming patterns
    // Check project structure
    // Suggest better location
  }
}
```

**Integration:**
- Add to `EnterpriseReviewer` Phase 0.21
- Generate suggestions as comments
- Include in consolidated summary

---

### 2.2 Context-Aware Intelligence
**Goal**: Understand domain and suggest accordingly

**New Files to Create:**
- `src/intelligence/context-detector.ts`
- `src/intelligence/domain-analyzer.ts`

**Features:**
- Domain detection:
  - Payment code → "Don't log credit card numbers"
  - Test code → "Use Page Object Model"
  - API code → "Add rate limiting for public endpoints"
- Team pattern learning:
  - "Your team usually puts this in `utils/` folder"
  - "This should follow your `services/` folder pattern"
- Project structure understanding:
  - Analyze existing folder structure
  - Suggest based on patterns

**Logic:**
```typescript
class ContextDetector {
  detectDomain(code, filepath) {
    // Payment: contains "payment", "card", "transaction"
    // Test: contains "test", "spec", "feature"
    // API: contains "controller", "endpoint", "api"
  }
  
  getDomainSpecificSuggestions(domain, issue) {
    // Return domain-specific recommendations
  }
}
```

---

## Phase 3: Enhanced Call Site Analysis (Priority 2)

### 3.1 Cascade Failure Analysis
**Goal**: Predict cascade failures and dependency chains

**Files to Modify:**
- `src/analysis/impact.ts` - Enhance existing

**New Features:**
- Cascade analysis:
  - "This change will break FeatureX and FeatureY"
  - "This will cause 3 microservices to fail"
- Dependency chain visualization:
  - "This change affects 10 files, 3 features down"
- Service-level impact:
  - "PaymentService, OrderService, NotificationService will be affected"

**Enhancements:**
```typescript
// In ImpactAnalyzer
analyzeCascadeImpact(changedSymbols) {
  // Build dependency graph
  // Find all dependent services/features
  // Predict cascade failures
  // Return: "This will break X, Y, Z features"
}
```

---

### 3.2 Business Impact Mapper
**Goal**: Understand user-facing and business impact

**New Files to Create:**
- `src/analysis/business-impact.ts`

**Features:**
- User flow impact:
  - "This change will break user login flow"
  - "Users won't be able to checkout"
- Service impact:
  - "3 microservices will be affected"
  - "Payment gateway integration will fail"
- Production impact:
  - "This will slow down checkout page"
  - "This will cause 1000 req/min to fail"

**Logic:**
```typescript
class BusinessImpactAnalyzer {
  analyzeUserImpact(changes) {
    // Map code changes to user flows
    // Identify user-facing features
    // Calculate business impact
  }
  
  analyzeServiceImpact(changes) {
    // Map to microservices
    // Identify service dependencies
    // Predict service failures
  }
}
```

---

## Phase 4: Pattern Recognition & Learning (Priority 3)

### 4.1 Pattern Memory System
**Goal**: Learn from past reviews and codebase patterns

**New Files to Create:**
- `src/learning/pattern-memory.ts`
- `src/learning/historical-context.ts`

**Features:**
- Historical bug tracking:
  - "This bug was also in UserService.java last month"
  - "Similar change broke FeatureX before"
- Rejected pattern memory:
  - "This pattern was rejected by team in PR #123"
- Team preference learning:
  - "Your team prefers X pattern for Y scenarios"
  - "This approach was approved in similar PRs"

**Storage:**
- Use `.droog-patterns.json` to store:
  - Historical bugs
  - Rejected patterns
  - Team preferences
  - Approved patterns

---

### 4.2 Codebase Knowledge Engine
**Goal**: Understand existing codebase patterns and suggest reuse

**New Files to Create:**
- `src/intelligence/codebase-knowledge.ts`

**Features:**
- Method reuse detection:
  - "This method already exists in UserService, reuse it"
  - "This utility is in CommonUtils, don't duplicate"
- Pattern matching:
  - "This pattern is used in PaymentProcessor, follow same approach"
  - "Your codebase uses X pattern for Y scenarios"
- Codebase structure understanding:
  - Learn folder patterns
  - Learn naming conventions
  - Learn architectural patterns

**Logic:**
```typescript
class CodebaseKnowledgeEngine {
  findSimilarMethods(method, codebase) {
    // Search codebase for similar methods
    // Suggest reuse
  }
  
  findPatterns(code, codebase) {
    // Find similar patterns in codebase
    // Suggest following existing pattern
  }
}
```

---

## Phase 5: Risk Prioritization (Priority 3)

### 5.1 Risk Scoring Engine
**Goal**: Prioritize based on business criticality and production impact

**New Files to Create:**
- `src/analysis/risk-prioritizer.ts`

**Features:**
- Production traffic consideration:
  - "This change is high risk - 1000 req/min in production"
- Business criticality:
  - "This is payment flow - extra careful"
  - "This is user login - critical path"
- Environment impact:
  - "This will break staging environment"
  - "This will break CI/CD pipeline"

**Scoring:**
```typescript
class RiskPrioritizer {
  calculateRiskScore(change, context) {
    // Factor in:
    // - Production traffic
    // - Business criticality
    // - Environment impact
    // - User-facing impact
    return riskScore;
  }
}
```

---

## Phase 6: Cross-File Relationships (Priority 3)

### 6.1 Dependency Mapper
**Goal**: Understand cross-file dependencies and suggest updates

**New Files to Create:**
- `src/analysis/dependency-mapper.ts`

**Features:**
- Config file detection:
  - "This change requires config.properties update"
- Constant extraction:
  - "This constant is used in 5 files, extract it"
- Cross-service dependencies:
  - "This method is used by UserService and OrderService"

**Logic:**
```typescript
class DependencyMapper {
  findConfigDependencies(changes) {
    // Check if changes require config updates
  }
  
  findConstantUsage(constant, codebase) {
    // Find all usages
    // Suggest extraction if used in multiple places
  }
  
  findCrossFileDependencies(method, codebase) {
    // Find all files using this method
    // Suggest updates needed
  }
}
```

---

## Phase 7: Human-Like Explanation Engine (Priority 1)

### 7.1 Conversational Comment Generator
**Goal**: Generate human-like, conversational comments

**Files to Modify:**
- `src/llm.ts` - Update prompts for conversational tone
- `src/post.ts` - Format comments in human-like style

**Prompt Updates:**
```typescript
// Instead of:
"Review this code and find issues"

// Use:
"Review this code as a senior architect. Explain issues in a 
conversational, respectful way. Use 'I noticed', 'I'd recommend', 
'Here's how'. Focus on impact first, then suggestions."
```

**Comment Structure:**
1. Impact explanation (what/where/why)
2. Human suggestion (respectful, soft)
3. Code example (if needed)

**Tone Guidelines:**
- ✅ "I noticed this will break..."
- ✅ "I'd recommend..."
- ✅ "Here's how I'd approach this..."
- ❌ "Issue detected"
- ❌ "Error found"
- ❌ "Problem identified"

---

## Implementation Order

### Sprint 1 (Week 1): Core Changes
1. ✅ Consolidated PR summary (remove per-file)
2. ✅ Human-like comment formatting
3. ✅ Conversational tone in LLM prompts

### Sprint 2 (Week 2): Code Organization
4. ✅ Code organization analyzer
5. ✅ Context-aware intelligence
6. ✅ Domain detection

### Sprint 3 (Week 3): Enhanced Analysis
7. ✅ Cascade failure analysis
8. ✅ Business impact mapper
9. ✅ Risk prioritization

### Sprint 4 (Week 4): Learning & Intelligence
10. ✅ Pattern memory system
11. ✅ Codebase knowledge engine
12. ✅ Dependency mapper

---

## Files to Create

### New Analyzers
1. `src/analysis/code-organization.ts`
2. `src/analysis/business-impact.ts`
3. `src/analysis/risk-prioritizer.ts`
4. `src/analysis/dependency-mapper.ts`

### New Intelligence Modules
5. `src/intelligence/context-detector.ts`
6. `src/intelligence/domain-analyzer.ts`
7. `src/intelligence/codebase-knowledge.ts`

### New Learning Modules
8. `src/learning/pattern-memory.ts`
9. `src/learning/historical-context.ts`

---

## Files to Modify

### Core Changes
1. `src/core/reviewer.ts`
   - Update `generateSummary()` for consolidated summary
   - Add new analyzers to review flow
   - Integrate all new features

2. `src/post.ts`
   - Remove per-file summary posting
   - Update `formatComment()` for human-like format
   - Add impact-first structure

3. `src/llm.ts`
   - Update prompts for conversational tone
   - Add context-aware suggestions
   - Human-like comment generation

4. `src/analysis/impact.ts`
   - Enhance with cascade analysis
   - Add dependency chain visualization
   - Business impact integration

---

## Integration Points

### EnterpriseReviewer Flow
```
Phase 0.21: Code Organization Analysis
Phase 0.22: Context-Aware Intelligence
Phase 0.23: Business Impact Analysis
Phase 0.24: Pattern Recognition
Phase 0.25: Risk Prioritization
Phase 0.26: Dependency Mapping
```

### Summary Generation
- Single consolidated summary
- Impact-first structure
- Priority-based action items
- No per-file details

### Comment Posting
- Human-like format
- Impact explanation first
- Conversational tone
- Respectful suggestions

---

## Success Metrics

1. **Summary Quality:**
   - Single PR-level summary (not per-file)
   - Impact-focused (what will break)
   - Action-oriented (priority list)

2. **Comment Quality:**
   - Human-like tone (conversational)
   - Impact-first structure
   - Respectful and helpful

3. **Intelligence:**
   - Code organization suggestions
   - Context-aware recommendations
   - Pattern recognition accuracy

4. **Business Value:**
   - Accurate impact prediction
   - Risk prioritization
   - Business impact understanding

---

## Dependencies

### External
- Existing analyzers (impact, test-impact, performance)
- LLM for conversational generation
- Codebase indexer for pattern matching

### Internal
- Pattern memory storage (`.droog-patterns.json`)
- Historical context database
- Codebase knowledge cache

---

## Testing Strategy

### Test Scenarios
1. Code organization suggestions (method/class/file location)
2. Context-aware suggestions (domain-specific)
3. Cascade failure prediction
4. Business impact analysis
5. Pattern recognition
6. Human-like comment generation

### Test Files
- Use existing `testDroogAI` branch
- Add scenarios for each feature
- Verify human-like tone
- Verify consolidated summary

---

## Notes

- All comments in English
- Conversational, respectful tone
- Impact-first, suggestion-second
- Single consolidated summary
- No per-file summaries
- Context-aware intelligence
- Pattern learning from codebase

---

## Next Steps

1. Review and approve plan
2. Start with Sprint 1 (Core Changes)
3. Implement feature by feature
4. Test with real PRs
5. Iterate based on feedback

