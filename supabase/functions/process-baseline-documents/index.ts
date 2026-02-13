import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessDocumentsRequest {
  documentIds: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ProcessDocumentsRequest = await req.json();
    const { documentIds } = body;

    if (!documentIds || documentIds.length === 0) {
      return new Response(JSON.stringify({ error: "No document IDs provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Processing documents:", documentIds);

    // Mark documents as processing
    await serviceClient
      .from("baseline_documents")
      .update({ processing_status: "processing" })
      .in("id", documentIds);

    // Process each document (in a real implementation, this would use OCR/AI)
    const results = [];
    for (const docId of documentIds) {
      try {
        const { data: doc } = await serviceClient
          .from("baseline_documents")
          .select("*")
          .eq("id", docId)
          .single();

        if (!doc) continue;

        // Simulate document processing with AI
        // In production, this would:
        // 1. Download the file from storage
        // 2. Run OCR if needed
        // 3. Extract structured data using AI
        // 4. Compute confidence scores
        
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        let extractedData = {
          document_type: "unknown",
          date_range: null,
          metrics: [],
          confidence: 0.75,
        };
        
        // Use AI to analyze if available
        if (LOVABLE_API_KEY && doc.file_type === "application/pdf") {
          try {
            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: `You are a document analysis assistant. Analyze compliance documents and extract structured data.
                    Return a JSON object with:
                    - document_type: one of "audit_report", "temperature_log", "training_record", "policy", "incident_report", "complaint"
                    - date_range: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } if dates found
                    - metrics: array of { name, value, unit } for any quantitative data
                    - confidence: 0-1 confidence score`,
                  },
                  {
                    role: "user",
                    content: `Analyze this document: ${doc.file_name}. File type: ${doc.file_type}`,
                  },
                ],
                tools: [
                  {
                    type: "function",
                    function: {
                      name: "extract_document_data",
                      description: "Extract structured data from document",
                      parameters: {
                        type: "object",
                        properties: {
                          document_type: { type: "string" },
                          date_range: {
                            type: "object",
                            properties: {
                              start: { type: "string" },
                              end: { type: "string" },
                            },
                          },
                          metrics: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                value: { type: "number" },
                                unit: { type: "string" },
                              },
                            },
                          },
                          confidence: { type: "number" },
                        },
                        required: ["document_type", "confidence"],
                      },
                    },
                  },
                ],
                tool_choice: { type: "function", function: { name: "extract_document_data" } },
              }),
            });

            if (response.ok) {
              const aiResult = await response.json();
              const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
              if (toolCall) {
                extractedData = JSON.parse(toolCall.function.arguments);
              }
            }
          } catch (aiError) {
            console.error("AI processing error:", aiError);
          }
        }

        // Update document with extracted data
        await serviceClient
          .from("baseline_documents")
          .update({
            processing_status: "completed",
            extracted_data: extractedData,
            confidence_score: extractedData.confidence,
            document_start_date: extractedData.date_range?.start || null,
            document_end_date: extractedData.date_range?.end || null,
            processed_at: new Date().toISOString(),
          })
          .eq("id", docId);

        results.push({ id: docId, status: "completed", extractedData });
      } catch (docError) {
        console.error("Error processing document:", docId, docError);
        
        await serviceClient
          .from("baseline_documents")
          .update({
            processing_status: "failed",
            processing_error: docError.message,
            processed_at: new Date().toISOString(),
          })
          .eq("id", docId);

        results.push({ id: docId, status: "failed", error: docError.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
