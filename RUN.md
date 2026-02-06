# Running BudgetPro

## NPM commands

- **Development** (hot reload on port 3000):
  ```bash
  npm install
  npm run dev
  ```
- **Production build**:
  ```bash
  npm run build
  ```
- **Run production build locally**:
  ```bash
  npm run start
  ```
  Serves the built app at http://localhost:3000.

## Docker

**Build the image:**
```bash
docker build -t budgetpro .
```

**Run the container:**
```bash
docker run -p 3000:3000 budgetpro
```

Then open http://localhost:3000.

**Optional:** Pass `GEMINI_API_KEY` at build time if your app needs it for the image:
```bash
docker build --build-arg GEMINI_API_KEY=your_key -t budgetpro .
```

Or at runtime (if your app reads env at runtime):
```bash
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key budgetpro
```
