AI Photography Coach: Intelligent Mentorship at Scale
Multi-dimensional photo analysis + AI image generation + interactive mentorship at scale - Gemini 3 Pro Vibe-Coded in Google AI Studio


Google DeepMind - Vibe Code with Gemini 3 Pro in AI Studio

Hackathon Writeup · Dec 12, 2025


item 0
item 1
item 2
item 3
item 4
item 5
item 6
item 7
Track: Education: Reimagine learning
Tech: Gemini 3 Pro (Vision, Chat, Image), React 19, Recharts

The Problem
Professional photographers spend hours providing detailed feedback on a single image—analyzing composition, lighting, technique, and creative intent. Beginners struggle to improve because they lack access to this expert mentorship. Meanwhile, generic AI tools often provide opaque feedback ("Nice shot!"), making it impossible to learn why a photo works or fails.

The Solution
AI Photography Coach is a professional-grade mentorship platform powered by Gemini 3 Pro. We use the model's native multimodality to bridge the gap between idea and reality, creating a "Glass Box" mentorship experience that analyzes not just what is in the photo, but how it was taken and how to improve it.

Core Features
System Capabilities Overview
Core Features Bento Grid
Figure 1: The 5 Pillars of the AI Photography Coach Platform

1. Instant Multi-Dimensional Analysis
Instead of vague text, the app provides structured feedback:

5 Professional Scores: Composition, Lighting, Technique, Creativity, and Subject Impact.
Spatial Critique: Unlike standard tools, Gemini 3 Pro identifies specific flaws (e.g., "Distracting trash can") and returns coordinate bounding boxes to overlay them on the image.
Estimated Settings: Infers ISO, Aperture, and Shutter Speed based purely on visual evidence.
2. The "Glass Box" Thinking Process
We leverage Gemini 3 Pro's deep reasoning capabilities to build trust. The app features an expandable Thinking Process section that reveals:

Observations: What the AI noticed first.
Reasoning Steps: The logical path it took to evaluate the shot.
Priority Fixes: A ranked list of actionable changes.
This turns the AI from a black box into a transparent teacher.
3. Interactive Mentor Chat
A context-aware chat interface where users can discuss their specific photo.

Deep Context: The chat session "knows" the image, the analysis scores, and previous turns.
Just-in-Time Learning: Users can ask, "How would I frame this differently?" and get specific advice based on the visual data.
4. AI Restoration Studio
Feedback is better when demonstrated. The app takes the text-based suggestions and feeds them into Gemini 3 Pro Image Generation to create an "Ideal Version" of the photo, displayed via a before/after slider.

Note for Judges: The Analysis, Chat, and Simulator features are fully accessible using the shared environment. However, the Restoration feature utilizes the specialized gemini-3-pro-image-preview model, which strictly requires a billing-enabled project. The app will prompt you to connect a key only if you choose to use this specific feature.

5. Economics Simulator (Context Caching)
To demonstrate enterprise viability, we built a live token simulator.

Real Cost vs. Projected: Calculates the actual cost of the session vs. projected scale cost with context caching.
Infrastructure Thinking: Demonstrates how Gemini Context Caching (caching extensive photography principles as a system prompt) would save ~95% of input costs at scale (1M+ tokens), proving the app is architected for production.
Built with Vibe Coding in Google AI Studio
This entire app was designed iteratively in Google AI Studio using Gemini 3 Pro. Rather than coding first, the architecture was "Vibe Coded" through conversation:

Phase 1: Schema & UX Co-Design

Prompt: "Design a JSON schema for analyzing a single photo with Gemini 3 Pro. Include: 5 scores, textual critique, strengths, improvements, estimated settings, and a 'thinking' object."
Result: Gemini's JSON output became the strict PhotoAnalysis TypeScript interface that drives the entire frontend. The UI was built to match this data contract.
Phase 2: "Glass Box" UI Design

Prompt: "Given this thinking structure (observations, reasoningSteps, priorityFixes), propose a UI layout that feels premium and shows AI reasoning step-by-step."
Result: Gemini suggested the collapsible "Thinking Process" card with specific color coding (Green for observations, Purple for reasoning), which was implemented verbatim in React.
Phase 3: Image-Enhancement Logic

Prompt: "I have an improvements[] list. Design a function to call Gemini 3 Pro Image to create an 'ideal version' that fixes these technical issues without changing the subject."
Result: Gemini generated the generateCorrectedImage() logic, including the specific system instructions to "Act as a photo retoucher" which ensures high-fidelity results.
Key Insight: AI Studio wasn't just a testing ground; it was the primary design tool. This approach compressed weeks of design-dev iteration into a 2-day sprint, demonstrating how Gemini 3 Pro accelerates the entire development lifecycle from schema through UI to backend logic.

Technical Architecture
System Overview
The architecture leverages Gemini 3 Pro for three distinct tasks: Vision Analysis, Chat Reasoning, and Image Generation. A custom "Context Caching Layer" simulates enterprise-scale economics by calculating projected savings.

System Architecture
Figure 2: System Flow & Token Economics

Component Hierarchy
The application uses a lifted-state architecture where App.tsx acts as the orchestrator, managing data flow between the dumb UI components and the Gemini Service layer.

Component Tree
Figure 3: React Component Structure

Key Technical Decisions:

Structured Outputs: All responses enforced via JSON schema, ensuring consistent parsing and type safety. No string parsing or regex hacks.
Thinking Process Extraction: Separate thinking field in responses exposes advanced reasoning to users. The app renders observations, reasoning steps, and priority fixes—not just the final verdict.
Context Caching Simulation: Gemini Context Caching requires a minimum of 32,768 tokens to activate. Since our system prompt (~3.5k tokens) is under this threshold, the app utilizes a Simulator Engine. It calculates the "Projected Cost" if the app were running at enterprise scale (where caching would be active), educating developers on the massive (~95%) cost savings available for high-volume RAG applications.
Graceful Error Handling: Supports shared credentials for analysis features. Fallback prompts for permission/billing errors are only triggered when premium models (Image Generation) are accessed.
Judging Criteria Met
Criterion	How AI Photography Coach Delivers
Impact (40%)	Solves a real-world educational problem by democratizing expert mentorship. Reimagines learning by moving from static text to interactive, spatial, and visual feedback loops.
Technical Depth (30%)	Utilizes Native Multimodality (Text/Image In -> JSON/Image Out). Implements deep reasoning ("Glass Box"), spatial understanding (Bounding Boxes), and enterprise architecture (Context Caching Simulation).
Creativity (20%)	Combines analysis and restoration in a unique "Feedback Loop". Uses the "Thinking" field to visualize AI logic, making the model a teacher rather than a black box.
Presentation (10%)	Premium "Dark Mode" aesthetic, interactive sliders, and "Vibe Coded" narrative showcase the power of Gemini 3 Pro.
Project Links

Live App Demo: Launch on Google AI Studio
GitHub Repository: Access the code base here:
Video Demo: Watch the Video walkthrough
Conclusion
AI Photography Coach isn't just a photo analyzer—it's an intelligent mentorship system that brings together Gemini 3 Pro's most powerful capabilities: advanced vision and reasoning, real-time image generation, and cost-optimized processing at scale.

By turning AI feedback into a "Glass Box" experience, the app transforms how photographers learn from their own work. By demonstrating how modern apps are designed collaboratively with AI in Google AI Studio, it showcases a glimpse of the future of software development itself.

The future of AI-powered education is here. 📸✨

