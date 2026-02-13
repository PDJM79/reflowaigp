import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate SHA-256 hash for cache validation
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Generate deterministic Mermaid diagram from process template
function generateBaselineMermaid(
  processName: string,
  steps: any[],
  remedials: any[],
  responsibleRole?: string
): string {
  const lines: string[] = ["flowchart TD"];
  
  // Add title as comment
  lines.push(`    %% Process: ${processName}`);
  if (responsibleRole) {
    lines.push(`    %% Responsible: ${responsibleRole}`);
  }
  
  // Start node
  lines.push(`    Start([🚀 Start])`);
  
  if (!steps || steps.length === 0) {
    lines.push(`    Start --> End([✅ Complete])`);
    return lines.join("\n");
  }
  
  // Create step nodes with proper escaping
  const escapeLabel = (text: string): string => {
    return text
      .replace(/"/g, "'")
      .replace(/\[/g, "(")
      .replace(/\]/g, ")")
      .replace(/\n/g, " ")
      .substring(0, 100); // Truncate long labels
  };
  
  steps.forEach((step, index) => {
    const stepId = `Step${index + 1}`;
    const stepText = typeof step === "string" ? step : (step.description || step.name || `Step ${index + 1}`);
    const escapedText = escapeLabel(stepText);
    
    // Check if this step has remedials
    const stepRemedials = remedials?.filter(r => 
      r.step_index === index || r.stepIndex === index
    ) || [];
    
    if (stepRemedials.length > 0) {
      // Add decision node for steps with remedials
      const decisionId = `Decision${index + 1}`;
      const remedialId = `Remedial${index + 1}`;
      const remedialText = escapeLabel(stepRemedials[0].action || stepRemedials[0].description || "Take remedial action");
      
      lines.push(`    ${stepId}["${escapedText}"]`);
      lines.push(`    ${decisionId}{Completed OK?}`);
      lines.push(`    ${remedialId}["⚠️ ${remedialText}"]`);
      
      // Connect previous to step
      if (index === 0) {
        lines.push(`    Start --> ${stepId}`);
      }
      
      // Step to decision
      lines.push(`    ${stepId} --> ${decisionId}`);
      
      // Decision branches
      lines.push(`    ${decisionId} -->|Yes| ${index === steps.length - 1 ? "End([✅ Complete])" : `Step${index + 2}`}`);
      lines.push(`    ${decisionId} -->|No| ${remedialId}`);
      lines.push(`    ${remedialId} --> ${stepId}`);
    } else {
      // Simple step without remedials
      lines.push(`    ${stepId}["${escapedText}"]`);
      
      if (index === 0) {
        lines.push(`    Start --> ${stepId}`);
      } else {
        // Check if previous step had remedials (decision node)
        const prevHasRemedials = remedials?.some(r => 
          r.step_index === index - 1 || r.stepIndex === index - 1
        );
        if (!prevHasRemedials) {
          lines.push(`    Step${index} --> ${stepId}`);
        }
      }
      
      if (index === steps.length - 1) {
        lines.push(`    ${stepId} --> End([✅ Complete])`);
      }
    }
  });
  
  // Add styling
  lines.push("");
  lines.push("    %% Styling");
  lines.push("    classDef default fill:#f9fafb,stroke:#d1d5db,stroke-width:1px");
  lines.push("    classDef start fill:#dcfce7,stroke:#16a34a,stroke-width:2px");
  lines.push("    classDef complete fill:#dbeafe,stroke:#2563eb,stroke-width:2px");
  lines.push("    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:1px");
  lines.push("    classDef remedial fill:#fee2e2,stroke:#dc2626,stroke-width:1px");
  lines.push("    class Start start");
  lines.push("    class End complete");
  
  return lines.join("\n");
}

// Enhance diagram with AI (optional)
async function enhanceWithAI(
  baselineMermaid: string,
  processName: string,
  steps: any[],
  remedials: any[],
  responsibleRole?: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log("No LOVABLE_API_KEY, skipping AI enhancement");
    return baselineMermaid;
  }

  try {
    const prompt = `You are a process flow diagram expert. Improve this Mermaid flowchart for better readability while keeping ALL steps and logic intact.

Process: ${processName}
Responsible Role: ${responsibleRole || "Not specified"}

Current Mermaid diagram:
${baselineMermaid}

Original steps: ${JSON.stringify(steps)}
Remedials: ${JSON.stringify(remedials)}

RULES:
1. Use ONLY the provided steps and remedials - do NOT add new steps
2. Improve labels to be clearer and more concise
3. Add role annotations where helpful (e.g., who does what)
4. Keep the same flowchart structure (TD direction)
5. Ensure proper Mermaid syntax
6. Return ONLY the Mermaid diagram code, no explanation

Return the improved Mermaid diagram:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a Mermaid diagram expert. Return only valid Mermaid flowchart code." },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error("AI enhancement failed:", response.status);
      return baselineMermaid;
    }

    const result = await response.json();
    const enhancedText = result.choices?.[0]?.message?.content?.trim();
    
    // Validate it starts with flowchart
    if (enhancedText && enhancedText.includes("flowchart")) {
      // Extract just the mermaid code
      const mermaidMatch = enhancedText.match(/```(?:mermaid)?\s*(flowchart[\s\S]*?)```/);
      const extractedMermaid = mermaidMatch ? mermaidMatch[1].trim() : enhancedText;
      
      // Additional validation: must have proper nodes and connections
      const hasConnections = extractedMermaid.includes("-->") || extractedMermaid.includes("---");
      const hasNodes = /\[.*\]|\(.*\)|\{.*\}/.test(extractedMermaid);
      
      if (hasConnections && hasNodes) {
        console.log("AI enhancement validated successfully");
        return extractedMermaid;
      }
      
      console.log("AI enhancement failed validation, using baseline");
    }
    
    return baselineMermaid;
  } catch (error) {
    console.error("AI enhancement error:", error);
    return baselineMermaid;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's practice
    const { data: userData, error: userDataError } = await supabase
      .from("users")
      .select("id, practice_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userDataError || !userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { process_template_id, regenerate } = await req.json();
    
    if (!process_template_id) {
      return new Response(
        JSON.stringify({ error: "process_template_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch process template
    const { data: template, error: templateError } = await supabase
      .from("process_templates")
      .select("id, name, steps, remedials, responsible_role, frequency, practice_id")
      .eq("id", process_template_id)
      .eq("practice_id", userData.practice_id)
      .single();

    if (templateError || !template) {
      return new Response(
        JSON.stringify({ error: "Process template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse steps and remedials
    const steps = Array.isArray(template.steps) ? template.steps : 
                  typeof template.steps === "string" ? JSON.parse(template.steps) : [];
    const remedials = Array.isArray(template.remedials) ? template.remedials :
                      typeof template.remedials === "string" ? JSON.parse(template.remedials) : [];

    // Generate source hash
    const sourceData = JSON.stringify({ steps, remedials });
    const sourceHash = await generateHash(sourceData);

    // Check cache (unless regenerate is requested)
    if (!regenerate) {
      const { data: cachedDiagram } = await supabase
        .from("process_diagrams")
        .select("*")
        .eq("practice_id", userData.practice_id)
        .eq("process_template_id", process_template_id)
        .eq("source_hash", sourceHash)
        .single();

      if (cachedDiagram) {
        console.log("Returning cached diagram");
        return new Response(
          JSON.stringify({
            mermaid_text: cachedDiagram.mermaid_text,
            generated_at: cachedDiagram.generated_at,
            source_hash: cachedDiagram.source_hash,
            is_ai_enhanced: cachedDiagram.is_ai_enhanced,
            cached: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate baseline diagram
    console.log("Generating baseline diagram for:", template.name);
    const baselineMermaid = generateBaselineMermaid(
      template.name,
      steps,
      remedials,
      template.responsible_role
    );

    // Try AI enhancement
    let finalMermaid = baselineMermaid;
    let isAiEnhanced = false;

    try {
      const enhanced = await enhanceWithAI(
        baselineMermaid,
        template.name,
        steps,
        remedials,
        template.responsible_role
      );
      if (enhanced !== baselineMermaid) {
        finalMermaid = enhanced;
        isAiEnhanced = true;
      }
    } catch (e) {
      console.log("AI enhancement skipped:", e);
    }

    // Cache the result (upsert)
    const { error: cacheError } = await supabase
      .from("process_diagrams")
      .upsert({
        practice_id: userData.practice_id,
        process_template_id: process_template_id,
        source_hash: sourceHash,
        mermaid_text: finalMermaid,
        generated_at: new Date().toISOString(),
        generated_by: userData.id,
        is_ai_enhanced: isAiEnhanced,
      }, {
        onConflict: "practice_id,process_template_id,source_hash",
      });

    if (cacheError) {
      console.error("Cache error:", cacheError);
    }

    return new Response(
      JSON.stringify({
        mermaid_text: finalMermaid,
        generated_at: new Date().toISOString(),
        source_hash: sourceHash,
        is_ai_enhanced: isAiEnhanced,
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
