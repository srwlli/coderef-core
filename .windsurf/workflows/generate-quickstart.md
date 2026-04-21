---
description: Discover project structure and generate quick-start guide
---

# /generate-quickstart

Scan any project directory to discover services, ports, dependencies, entry points, and health checks, then generate a populated quickstart.md at the project root.

## Prerequisites

- Project path exists on disk
- Node.js available to run discovery scripts

## Steps

1. **Discover project structure**

   ```bash
   node C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\SHARED\generate-quickstart\scripts\discover.js <project_path>
   ```

2. **Generate quickstart guide**

   ```bash
   node C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\SHARED\generate-quickstart\scripts\populate-template.js \
     C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\SHARED\generate-quickstart\assets\QUICK-START-TEMPLATE.md \
     <discovery_json_path> \
     <project_path>\{project_name}-quickstart.md
   ```

## See Also

- Full skill documentation: `C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\SHARED\generate-quickstart\SKILL.md`
- Discovery rules: `C:\Users\willh\Desktop\CODEREF\ASSISTANT\SKILLS\SHARED\generate-quickstart\references\DISCOVERY-RULES.md`
