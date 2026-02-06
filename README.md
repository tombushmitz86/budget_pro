
# BudgetPro - Wealth Management Suite (Agnostic Edition)

This project is a high-fidelity wealth management dashboard, decoupled from external dependencies for maximum flexibility.

## Core Architecture
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS with custom institutional dark mode theme
- **Intelligence**: Swappable `IntelligenceService` located in `services/intelligenceService.ts`.
- **Interactions**: Framer-like CSS animations and Glassmorphism UI.

## Local Setup
1. **Clone/Download** files.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Swapping Intelligence
Currently, the app uses local deterministic logic for insights and projections. To add an LLM (like Gemini or OpenAI):
1. Modify `services/intelligenceService.ts`.
2. Implement your chosen SDK within the class methods.
3. No UI changes are required as all components depend on the `intelligence` singleton.

## Continuing with Cursor / AI IDEs
Use the **System Blueprint** exported from the Settings page. Paste the resulting JSON into your AI prompt to provide the full technical context of your current ledger and state.
