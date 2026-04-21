/**
 * Prompt Templates
 * P4-T1: Templates for LLM interactions in RAG system
 *
 * Defines prompts that instruct the LLM on how to:
 * - Answer questions using code context
 * - Cite sources with CodeRef tags
 * - Provide relevant metadata
 * - Suggest related questions
 */

/**
 * Variables available in prompt templates
 */
export interface PromptVariables {
  /** User's question */
  question: string;

  /** Retrieved code context (markdown) */
  context: string;

  /** Conversation history (optional) */
  conversationHistory?: string;

  /** Additional instructions (optional) */
  additionalInstructions?: string;

  /** User preferences (optional) */
  preferences?: {
    verbosity?: 'brief' | 'detailed';
    includeExamples?: boolean;
    focusArea?: string;
  };
}

/**
 * System prompt for RAG Q&A
 *
 * This is the core instruction set for the LLM
 */
export const SYSTEM_PROMPT = `You are an expert code assistant with deep knowledge of software architecture and best practices. Your role is to answer questions about a codebase using the provided code context.

## Core Responsibilities

1. **Answer Accurately**: Provide precise, factual answers based on the code context provided
2. **Cite Sources**: ALWAYS include CodeRef tags when referring to specific code elements
3. **Be Concise**: Provide clear, actionable information without unnecessary verbosity
4. **Suggest Next Steps**: Help users explore related code and concepts

## CodeRef Format

When referencing code, ALWAYS use CodeRef tags in this format:
- Functions: \`@Fn/path/file#functionName:line\`
- Classes: \`@Cl/path/file#ClassName:line\`
- Methods: \`@M/path/file#methodName:line\`
- Components: \`@C/path/file#ComponentName:line\`

## Response Structure

Your responses should follow this structure:

1. **Direct Answer**: Start with a clear, direct answer to the question
2. **Code References**: Include relevant CodeRef tags and brief explanations
3. **Context**: Provide additional context from dependencies, usage patterns, or quality metrics
4. **Related Questions**: Suggest 2-3 follow-up questions the user might find helpful

## Quality Guidelines

- If information is not in the context, say so clearly - don't make assumptions
- Highlight code quality signals (test coverage, complexity, documentation)
- Point out important relationships (what calls what, dependencies)
- Mention potential issues or concerns when relevant

## Example Response Format

**Answer**: [Direct answer to the question]

**Relevant Code**:
- \`@Fn/auth/login#authenticate:24\` - Main authentication function with 85% test coverage
- \`@Fn/utils/hash#hashPassword:12\` - Password hashing utility used by authenticate

**Dependencies**: The authenticate function depends on 3 other utilities and is used by 7 API endpoints.

**Related Questions**:
- How is session management handled after authentication?
- What are the password requirements enforced in this system?
- Where is the authentication middleware applied?

Remember: Always include CodeRef tags, be accurate, and help users navigate the codebase effectively.`;

/**
 * User prompt template for Q&A
 */
export const QA_PROMPT_TEMPLATE = `# Question

{{question}}

# Code Context

The following code elements are relevant to your question:

{{context}}

# Instructions

{{additionalInstructions}}

Please answer the question using the code context provided. Remember to:
- Include CodeRef tags when referencing specific code
- Highlight relevant quality metrics (coverage, complexity)
- Explain dependencies and relationships
- Suggest related questions for further exploration

If the context doesn't contain enough information to fully answer the question, say so and explain what information is missing.`;

/**
 * Conversational prompt template (with history)
 */
export const CONVERSATIONAL_PROMPT_TEMPLATE = `# Conversation History

{{conversationHistory}}

---

# Current Question

{{question}}

# Code Context

{{context}}

# Instructions

Continue the conversation by answering the current question. Use context from previous exchanges to provide more relevant and personalized responses. Remember to maintain CodeRef citations and suggest follow-up questions.`;

/**
 * Code explanation prompt
 */
export const CODE_EXPLANATION_PROMPT = `Explain the following code in detail:

{{context}}

Focus on:
- What the code does
- How it fits into the larger system
- Key dependencies and relationships
- Quality characteristics (coverage, complexity)
- Common usage patterns

Use CodeRef tags to reference specific elements.`;

/**
 * Code comparison prompt
 */
export const CODE_COMPARISON_PROMPT = `Compare the following code elements:

{{context}}

Analyze:
- Similarities and differences in implementation
- Different use cases or purposes
- Quality metrics comparison
- Which might be more appropriate for {{question}}

Use CodeRef tags to reference specific elements.`;

/**
 * Best practices prompt
 */
export const BEST_PRACTICES_PROMPT = `Based on the following code:

{{context}}

Provide analysis of:
- Code quality and best practices adherence
- Potential improvements or concerns
- Test coverage assessment
- Dependency management
- Documentation quality

Question: {{question}}

Use CodeRef tags to reference specific elements.`;

/**
 * Prompt template builder
 */
export class PromptTemplateBuilder {
  /**
   * Build Q&A prompt from variables
   */
  buildQAPrompt(variables: PromptVariables): string {
    let prompt = QA_PROMPT_TEMPLATE;

    // Replace variables
    prompt = prompt.replace('{{question}}', variables.question);
    prompt = prompt.replace('{{context}}', variables.context);

    // Add additional instructions if provided
    const additionalInstructions =
      variables.additionalInstructions ||
      this.buildInstructionsFromPreferences(variables.preferences);

    prompt = prompt.replace('{{additionalInstructions}}', additionalInstructions);

    return prompt;
  }

  /**
   * Build conversational prompt with history
   */
  buildConversationalPrompt(variables: PromptVariables): string {
    let prompt = CONVERSATIONAL_PROMPT_TEMPLATE;

    prompt = prompt.replace('{{question}}', variables.question);
    prompt = prompt.replace('{{context}}', variables.context);
    prompt = prompt.replace(
      '{{conversationHistory}}',
      variables.conversationHistory || 'No previous conversation.'
    );

    return prompt;
  }

  /**
   * Build code explanation prompt
   */
  buildExplanationPrompt(variables: PromptVariables): string {
    let prompt = CODE_EXPLANATION_PROMPT;
    prompt = prompt.replace('{{context}}', variables.context);
    return prompt;
  }

  /**
   * Build code comparison prompt
   */
  buildComparisonPrompt(variables: PromptVariables): string {
    let prompt = CODE_COMPARISON_PROMPT;
    prompt = prompt.replace('{{context}}', variables.context);
    prompt = prompt.replace('{{question}}', variables.question);
    return prompt;
  }

  /**
   * Build best practices prompt
   */
  buildBestPracticesPrompt(variables: PromptVariables): string {
    let prompt = BEST_PRACTICES_PROMPT;
    prompt = prompt.replace('{{context}}', variables.context);
    prompt = prompt.replace('{{question}}', variables.question);
    return prompt;
  }

  /**
   * Build instructions from user preferences
   */
  private buildInstructionsFromPreferences(
    preferences?: PromptVariables['preferences']
  ): string {
    if (!preferences) {
      return 'Provide a clear, detailed answer.';
    }

    const instructions: string[] = [];

    if (preferences.verbosity === 'brief') {
      instructions.push('Keep your answer concise and to the point.');
    } else if (preferences.verbosity === 'detailed') {
      instructions.push('Provide a comprehensive, detailed explanation.');
    }

    if (preferences.includeExamples) {
      instructions.push('Include code examples where relevant.');
    }

    if (preferences.focusArea) {
      instructions.push(`Focus particularly on ${preferences.focusArea}.`);
    }

    return instructions.join(' ') || 'Provide a clear, detailed answer.';
  }

  /**
   * Detect question type and select appropriate template
   */
  detectQuestionType(question: string): 'explanation' | 'comparison' | 'best-practices' | 'qa' {
    const lowerQuestion = question.toLowerCase();

    // Code explanation
    if (
      lowerQuestion.includes('how does') ||
      lowerQuestion.includes('what does') ||
      lowerQuestion.includes('explain') ||
      lowerQuestion.includes('how works')
    ) {
      return 'explanation';
    }

    // Comparison
    if (
      lowerQuestion.includes('compare') ||
      lowerQuestion.includes('difference between') ||
      lowerQuestion.includes('vs') ||
      lowerQuestion.includes('versus')
    ) {
      return 'comparison';
    }

    // Best practices
    if (
      lowerQuestion.includes('best practice') ||
      lowerQuestion.includes('should i') ||
      lowerQuestion.includes('recommend') ||
      lowerQuestion.includes('improve') ||
      lowerQuestion.includes('better')
    ) {
      return 'best-practices';
    }

    // Default to general Q&A
    return 'qa';
  }

  /**
   * Build appropriate prompt based on question type
   */
  buildPrompt(variables: PromptVariables): {
    systemPrompt: string;
    userPrompt: string;
    questionType: string;
  } {
    const questionType = this.detectQuestionType(variables.question);

    let userPrompt: string;

    switch (questionType) {
      case 'explanation':
        userPrompt = this.buildExplanationPrompt(variables);
        break;
      case 'comparison':
        userPrompt = this.buildComparisonPrompt(variables);
        break;
      case 'best-practices':
        userPrompt = this.buildBestPracticesPrompt(variables);
        break;
      default:
        userPrompt = variables.conversationHistory
          ? this.buildConversationalPrompt(variables)
          : this.buildQAPrompt(variables);
    }

    return {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      questionType
    };
  }
}

/**
 * Validation for prompt quality
 */
export class PromptValidator {
  /**
   * Validate prompt meets quality standards
   */
  validatePrompt(prompt: string): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check length
    if (prompt.length < 100) {
      warnings.push('Prompt is very short - may lack necessary context');
    }

    if (prompt.length > 32000) {
      errors.push('Prompt exceeds typical model context limits');
    }

    // Check for required elements
    if (!prompt.includes('{{context}}') && !prompt.includes('Code Context')) {
      errors.push('Prompt missing code context section');
    }

    if (!prompt.includes('{{question}}') && !prompt.includes('Question')) {
      errors.push('Prompt missing question section');
    }

    // Check for CodeRef instructions
    if (!prompt.toLowerCase().includes('coderef')) {
      warnings.push('Prompt may not emphasize CodeRef citation');
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Estimate token count for prompt
   */
  estimateTokens(prompt: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(prompt.length / 4);
  }
}
