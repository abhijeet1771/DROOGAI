# Update testDroogAI Workflow

The test workflow needs to be updated to use the new DroogAI repository URL.

## Update test.yml

In `d:/testDroogAI/.github/workflows/test.yml`, change:

```yaml
# OLD:
if git clone https://github.com/abhijeet1771/AI-reviewer.git /tmp/droog-ai 2>/dev/null; then

# NEW:
if git clone https://github.com/abhijeet1771/DROOGAI.git /tmp/droog-ai 2>/dev/null; then
```

This will fix the "DroogAI Installation Failed" error.

