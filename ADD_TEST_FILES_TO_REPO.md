# How to Add Test Files to AI-reviewer Repository

Since this directory is not a git repository, you need to add the test files to the `abhijeet1771/AI-reviewer` repository.

## Option 1: Clone the Repository and Add Files

```powershell
# Navigate to a parent directory
cd D:\

# Clone the repository (if not already cloned)
git clone https://github.com/abhijeet1771/AI-reviewer.git
cd AI-reviewer

# Copy test files from DROOG AI
Copy-Item "D:\DROOG AI\test-files" -Destination . -Recurse

# Create new branch
git checkout -b test-new-review-features

# Add and commit
git add test-files/
git commit -m "Add test files for new review features

- UserService.java: Contains magic numbers, old-style loops, duplicate code
- ProductService.java: Contains duplicate patterns, bad string comparison
- OrderProcessor.java: Contains duplicate validation, old Date API usage

These files test:
7. Better coding practices
8. Better available method or approach  
9. Duplicate code detection"

# Push
git push origin test-new-review-features
```

Then create PR on GitHub and test with:
```bash
cd "D:\DROOG AI"
npx tsx src/index.ts --repo abhijeet1771/AI-reviewer --pr <PR_NUMBER>
```

## Option 2: Use GitHub Web Interface

1. Go to https://github.com/abhijeet1771/AI-reviewer
2. Click "Add file" → "Create new file"
3. Create `test-files/UserService.java` and paste the content
4. Repeat for other files
5. Create PR from the branch

## Option 3: Manual Copy via GitHub Desktop or VS Code

1. Open the AI-reviewer repository in VS Code
2. Copy the test files from `D:\DROOG AI\test-files\` to the repository
3. Commit and push




