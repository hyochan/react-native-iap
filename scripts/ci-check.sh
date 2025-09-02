#!/bin/bash

# Script to run all CI checks locally before committing
# This helps catch issues before they fail in CI

echo "🚀 Running CI checks locally..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any checks fail
FAILED=0

# 1. Install dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
yarn install --immutable
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Dependency installation failed${NC}"
    FAILED=1
else
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# 2. Generate Nitro code
echo -e "\n${YELLOW}⚙️ Generating Nitro code...${NC}"
yarn nitrogen
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Nitro code generation failed${NC}"
    FAILED=1
else
    echo -e "${GREEN}✅ Nitro code generated${NC}"
fi

# 3. TypeScript check
echo -e "\n${YELLOW}🔍 Running TypeScript check...${NC}"
yarn typecheck
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ TypeScript check failed${NC}"
    FAILED=1
else
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
fi

# 4. ESLint
echo -e "\n${YELLOW}🔍 Running ESLint...${NC}"
yarn lint
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ESLint check failed${NC}"
    FAILED=1
else
    echo -e "${GREEN}✅ ESLint check passed${NC}"
fi

# 5. Prettier format check
echo -e "\n${YELLOW}💅 Checking code formatting...${NC}"
yarn prettier --check "src/**/*.{ts,tsx,js,jsx}"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Code formatting issues found${NC}"
    echo -e "${YELLOW}💡 Run 'yarn prettier --write \"src/**/*.{ts,tsx,js,jsx}\"' to fix${NC}"
    FAILED=1
else
    echo -e "${GREEN}✅ Code formatting check passed${NC}"
fi

# 6. Run tests
echo -e "\n${YELLOW}🧪 Running tests...${NC}"
yarn test --passWithNoTests
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed${NC}"
    FAILED=1
else
    echo -e "${GREEN}✅ Tests passed${NC}"
fi

# Summary
echo -e "\n================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ All CI checks passed! Ready to commit.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some CI checks failed. Please fix the issues before committing.${NC}"
    exit 1
fi