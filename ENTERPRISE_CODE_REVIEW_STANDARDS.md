# Enterprise Code Review Standards - Research Summary

## Research from Top Organizations

### 1. **Google** - Professional Standards

**Comment Format:**
- Use "we" language (inclusive, team-focused)
- Focus on code, not developer
- Explain WHY, not just WHAT
- Label severity: "Nit:", "Optional:", "FYI:"
- Professional tone, no emojis
- Impact-first: Explain what will break, where, why

**Example Good Comment:**
```
"This SQL query construction is vulnerable to SQL injection. 
An attacker could manipulate the userId parameter to execute 
arbitrary SQL commands, potentially accessing or modifying 
sensitive data. We should use PreparedStatement to safely 
parameterize queries."
```

**Summary Format:**
- Executive-level, concise
- Risk assessment with business impact
- Prioritized action items
- Metrics and data
- No emojis, professional language

---

### 2. **Microsoft** - Clear & Actionable

**Key Principles:**
- Constructive feedback (collaboration, not criticism)
- Specific, actionable suggestions
- Clear reasoning behind comments
- Focus on functionality and architecture
- Professional, respectful tone

**Comment Style:**
- Explain the problem clearly
- Provide specific solution
- Use inclusive language ("we", "our codebase")
- Avoid personal pronouns ("you")

---

### 3. **Meta/Facebook** - Focused & Efficient

**Key Practices:**
- Small, focused reviews (200-400 lines)
- Automated tools for style checks
- Static analysis tools (Infer, Zoncolan)
- Focus on logic and architecture
- Quick turnaround (24 hours)

**Comment Format:**
- Concise, to the point
- Focus on critical issues
- Use code snippets for clarity
- Explain impact on system

---

### 4. **Amazon/AWS** - Enterprise Standards

**Key Principles:**
- Security-first approach
- Performance considerations
- Scalability impact
- Business impact assessment
- Clear action items

**Summary Format:**
- Executive summary first
- Risk assessment
- Business impact section
- Prioritized recommendations
- Metrics and KPIs

---

### 5. **Netflix** - Quality & Testing Focus

**Key Practices:**
- Review tests and test results
- Focus on reliability
- Performance impact assessment
- Time-bound reviews
- Quality metrics

**Comment Style:**
- Explain test implications
- Performance impact
- Reliability concerns
- Clear recommendations

---

### 6. **Yelp** - Clear Guidelines

**Key Principles:**
- High-level and inline comments
- Code-focused, not developer-focused
- Clear communication
- Small, manageable changes
- 24-hour review turnaround

**Comment Format:**
- Use code snippets
- Explain reasoning
- Provide context
- Be respectful and constructive

---

### 7. **Netlify** - Feedback Ladder

**Severity Labels:**
- "Sand" - Minor issues (optional)
- "Rock" - Major issues (must fix)
- Clear priority indication
- Actionable feedback

**Comment Style:**
- Label severity clearly
- Explain priority
- Provide actionable fixes
- Focus on impact

---

### 8. **Bloomberg** - Professional Etiquette

**Key Principles:**
- Code-focused comments (not developer)
- Clear and respectful language
- Use "we" language
- Positive team culture
- Constructive feedback

**Comment Format:**
- Professional tone
- Respectful language
- Clear explanations
- Actionable suggestions

---

## Common Best Practices Across All Organizations

### **Inline Comments:**

1. **Professional Tone:**
   - No casual language ("Hey team", "Quick tip")
   - No emojis
   - Respectful, constructive
   - Use "we" language

2. **Impact-First Structure:**
   - What will break?
   - Where will it break?
   - Why does it matter?
   - How to fix it?

3. **Severity Labels:**
   - "Nit:" - Minor issue
   - "Optional:" - Suggestion
   - "FYI:" - Information
   - "Critical:" - Must fix
   - "Blocking:" - Blocks merge

4. **Code Snippets:**
   - Use code examples
   - Show before/after
   - Provide complete solutions
   - Remove imports from suggestions

5. **Clear Reasoning:**
   - Explain WHY
   - Provide context
   - Link to standards/docs
   - Reference best practices

---

### **PR Summary Format:**

1. **Executive Summary:**
   - Risk assessment (HIGH/MEDIUM/LOW)
   - Estimated impact
   - Key metrics
   - No emojis

2. **Critical Issues (Must Fix):**
   - Numbered, prioritized
   - File:line location
   - Impact description
   - Action required

3. **Performance Concerns:**
   - Performance regressions
   - Scalability issues
   - Optimization opportunities
   - Metrics and data

4. **Code Quality Metrics:**
   - Total issues
   - Priority breakdown
   - Confidence scores
   - Coverage stats

5. **Recommendations:**
   - Prioritized action items
   - Business impact
   - Technical debt
   - Next steps

6. **Professional Language:**
   - "May cause" instead of "will break"
   - "Potential impact" instead of "WILL FAIL"
   - "Recommendation" instead of "must fix"
   - Executive-level tone

---

## What Needs to Change in DroogAI

### **Current Issues:**

1. **Too Casual:**
   - "Hey team" → Remove
   - "Quick tip" → Remove
   - "This is a critical one!" → Professional tone

2. **Too Many Emojis:**
   - ⚠️, 🚨, ✅ → Remove all
   - Use text labels instead

3. **Language Too Strong:**
   - "WILL BREAK" → "May cause failures"
   - "WILL FAIL" → "Potential impact"
   - "Must fix" → "Recommendation"

4. **Not Executive-Level:**
   - Too detailed
   - Not strategic
   - Missing business impact
   - No clear action plan

5. **Inconsistent Tone:**
   - Mix of casual and formal
   - No consistent style
   - Missing impact context

---

### **Recommended Changes:**

#### **For Inline Comments (`src/post.ts`):**
1. Remove casual phrases
2. Add severity labels (Nit, Optional, Critical)
3. Use "we" language consistently
4. Add impact context to each comment
5. Professional tone throughout

#### **For PR Summary (`src/core/reviewer.ts`):**
1. Remove all emojis
2. Restructure as executive summary
3. Add business impact section
4. Clear action items with priorities
5. Professional language ("may cause", "potential impact")
6. More concise, less verbose
7. Metrics section with KPIs

#### **For LLM Prompt (`src/llm.ts`):**
1. Update prompt for professional tone
2. Focus on impact and business context
3. Use "we" language guidelines
4. Professional tone examples
5. Severity labeling instructions

---

## Example: Google-Level Comment

**Current (Too Casual):**
```
Hey team, this method of building a SQL query by concatenating 
user input is a classic SQL Injection vulnerability. A malicious 
actor could pass in a value for userId like '1' OR '1'='1' to 
manipulate the query...
```

**Google-Level (Professional):**
```
This SQL query construction is vulnerable to SQL injection. 
An attacker could manipulate the userId parameter to execute 
arbitrary SQL commands, potentially accessing or modifying 
sensitive data. We should use PreparedStatement to safely 
parameterize queries, which ensures user input is treated 
strictly as data and not as part of the SQL command.
```

---

## Example: Google-Level Summary

**Current (Too Casual, Too Many Emojis):**
```
# ⚠️ PR Impact Assessment

**Merge Risk**: 🔴 HIGH ⚠️

**If this PR is merged, the main branch will experience:**
- **1 feature(s)** will break
- **9 test(s)** will fail (CI blocked)
```

**Google-Level (Professional, Executive):**
```
# Code Review Summary

## Risk Assessment
- Merge Risk: HIGH
- Estimated Impact: 1 feature, 9 test failures, 1 performance regression

## Critical Issues (Must Fix Before Merge)
1. SQL Injection Vulnerability (test-files/AnotherTestFile.java:13)
   - Impact: Security breach risk, potential data exposure
   - Action: Replace string concatenation with PreparedStatement
   
2. Division by Zero (test-files/SimpleComparisonTest.java:30)
   - Impact: Runtime crashes, service unavailability
   - Action: Add input validation and error handling

## Performance Concerns
- String concatenation in loop (O(n²) complexity)
  - File: test-files/AnotherTestFile.java:10
  - Impact: Performance degradation with large inputs
  - Recommendation: Use StringBuilder or String.join()

## Code Quality Metrics
- Total Issues: 10
- High Priority: 2
- Medium Priority: 5
- Low Priority: 3
- Average Confidence: 93.4%

## Recommendations
1. Address critical security issues before merge
2. Fix performance regressions to maintain system performance
3. Consider refactoring duplicate code patterns to reduce technical debt
```

---

## Implementation Priority

1. **High Priority:**
   - Remove emojis from summary
   - Remove casual language from comments
   - Add severity labels
   - Professional tone throughout

2. **Medium Priority:**
   - Restructure summary as executive summary
   - Add business impact section
   - Clear action items
   - Use "we" language

3. **Low Priority:**
   - Add metrics section
   - Improve code snippet formatting
   - Add references to standards
   - Enhance impact explanations

