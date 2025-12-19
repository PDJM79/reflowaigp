import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleOptions, buildCorsHeaders } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// CONFIGURE YOUR GPT ASSISTANT ID HERE
const CUSTOM_ASSISTANT_ID = Deno.env.get('STEP_ASSISTANT_ID') || null;

// Function to use custom GPT Assistant
async function useCustomAssistant(message: string, processName: string, stepTitle: string, stepDescription: string) {
  console.log('Using custom GPT Assistant:', CUSTOM_ASSISTANT_ID);

  // Create a thread for this conversation
  const threadResponse = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({}),
  });

  if (!threadResponse.ok) {
    const errorData = await threadResponse.json();
    console.error('Thread creation error:', errorData);
    throw new Error(`Thread creation error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const thread = await threadResponse.json();
  console.log('Created thread:', thread.id);

  // Add context message to thread
  const contextMessage = `Current GP Surgery Audit Context:

🏥 **Audit:** ${processName}
📋 **Current Step:** ${stepTitle}
📝 **Step Description:** ${stepDescription}

**User Question:** ${message}

Please provide specific, actionable guidance for completing this step in our GP practice compliance process. Focus on practical advice, evidence requirements, and best practices.`;

  const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      role: 'user',
      content: contextMessage,
    }),
  });

  if (!messageResponse.ok) {
    const errorData = await messageResponse.json();
    console.error('Message creation error:', errorData);
    throw new Error(`Message creation error: ${errorData.error?.message || 'Unknown error'}`);
  }

  // Run the assistant
  const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      assistant_id: CUSTOM_ASSISTANT_ID,
    }),
  });

  if (!runResponse.ok) {
    const errorData = await runResponse.json();
    console.error('Run creation error:', errorData);
    throw new Error(`Run creation error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const run = await runResponse.json();
  console.log('Started run:', run.id);

  // Poll for completion
  let runStatus = run;
  let attempts = 0;
  const maxAttempts = 30;

  while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
    if (attempts >= maxAttempts) {
      throw new Error('Assistant response timeout');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    if (statusResponse.ok) {
      runStatus = await statusResponse.json();
      console.log('Run status:', runStatus.status);
    }
    
    attempts++;
  }

  if (runStatus.status !== 'completed') {
    throw new Error(`Assistant run failed with status: ${runStatus.status}`);
  }

  // Get the assistant's response
  const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
  });

  if (!messagesResponse.ok) {
    const errorData = await messagesResponse.json();
    console.error('Messages retrieval error:', errorData);
    throw new Error(`Messages retrieval error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const messages = await messagesResponse.json();
  const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');
  
  if (!assistantMessage || !assistantMessage.content[0]?.text?.value) {
    throw new Error('No assistant response found');
  }

  return assistantMessage.content[0].text.value;
}

// HIW Assistant GPT simulation - specialized for GP practice management
async function useDefaultChat(message: string, processName: string, stepTitle: string, stepDescription: string, conversationHistory: any[]) {
  console.log('Using HIW Assistant GPT simulation');

  const systemPrompt = `You are the HIW Assistant, a specialized AI assistant for GP practice management and healthcare workflows. You help healthcare professionals navigate complex administrative processes, compliance requirements, and operational procedures.

**Current Context:**
- Process: ${processName || 'Unknown Process'}
- Step: ${stepTitle || 'Unknown Step'}
- Description: ${stepDescription || 'No description provided'}

**Your Expertise Areas:**
• Clinical governance and quality improvement processes
• Compliance with CQC regulations and NHS standards
• Administrative workflows and documentation requirements
• Risk management and incident reporting procedures
• Staff training and competency assessments
• Patient safety protocols and procedures
• Information governance and data protection
• Practice policies and procedure development
• Clinical audit and significant event analysis

**Response Guidelines:**
- Provide clear, actionable guidance specific to UK GP practice management
- Reference relevant healthcare standards, regulations, or best practices when applicable
- Break down complex processes into manageable, sequential steps
- Highlight any compliance, safety, or regulatory considerations
- Suggest practical tools, templates, or documentation approaches
- Include specific timeframes or deadlines where relevant
- Mention key personnel who should be involved
- Keep responses comprehensive but focused on practical implementation

Focus specifically on helping complete the current step while maintaining awareness of the broader process context and healthcare regulatory requirements. Always consider the practical realities of a busy GP practice environment.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(conversationHistory || []),
    { role: 'user', content: message }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: messages,
      max_completion_tokens: 800,
      stream: false
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleOptions(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = buildCorsHeaders(req);

  try {
    // Early validation - check if OpenAI API key is available
    if (!openAIApiKey) {
      console.error('OpenAI API key is missing from environment variables');
      throw new Error('OpenAI API key is not configured. Please check the function secrets.');
    }

    const { message, stepTitle, stepDescription, processName, conversationHistory } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing help request with context:', {
      processName,
      stepTitle,
      hasCustomAssistant: !!CUSTOM_ASSISTANT_ID,
      messageLength: message?.length || 0
    });

    let aiResponse;

    // Use custom GPT assistant if configured, otherwise use default chat
    if (CUSTOM_ASSISTANT_ID) {
      aiResponse = await useCustomAssistant(message, processName, stepTitle, stepDescription);
    } else {
      aiResponse = await useDefaultChat(message, processName, stepTitle, stepDescription, conversationHistory || []);
    }

    console.log('Received response, length:', aiResponse?.length);

    return new Response(JSON.stringify({ 
      response: aiResponse,
      assistantType: CUSTOM_ASSISTANT_ID ? 'custom_gpt' : 'default_chat'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in step-help-chat function:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'An unexpected error occurred',
      assistantType: CUSTOM_ASSISTANT_ID ? 'custom_gpt' : 'default_chat'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
